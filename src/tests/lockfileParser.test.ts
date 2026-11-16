import { describe, expect, it } from 'vitest';
import { parseAnyLockfile } from '../services/fileService';
import { parseLockfileV1 } from '../services/lockfileV1Parser';
import { extractPackageNameFromLocation, parseLockfileV2V3 } from '../services/lockfileV2V3Parser';

describe('lockfileParser', () => {
  it('extracts scoped and nested package names from v2/v3 locations', () => {
    expect(extractPackageNameFromLocation('node_modules/react')).toBe('react');
    expect(extractPackageNameFromLocation('node_modules/@types/node')).toBe('@types/node');
    expect(
      extractPackageNameFromLocation('node_modules/vite/node_modules/@tanstack/react-query'),
    ).toBe('@tanstack/react-query');
  });

  it('parses lockfile v3 with scoped packages, nested locations, and missing metadata', () => {
    const lockV3 = JSON.stringify({
      name: 'demo-app',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {
        '': {
          name: 'demo-app',
          version: '1.0.0',
          dependencies: { '@tanstack/react-query': '^5.0.0' },
        },
        'node_modules/@tanstack/react-query': {
          version: '5.50.0',
          license: 'MIT',
          integrity: 'sha512-abc',
          dependencies: { semver: '^7.6.0' },
        },
        'node_modules/@tanstack/react-query/node_modules/semver': {
          // Intentionally omit version and license to verify handling of missing metadata
          resolved: 'https://registry.example.invalid/semver.tgz',
        },
      },
    });

    const parsed = parseLockfileV2V3(lockV3);
    expect(parsed.isSupported).toBe(true);
    expect(parsed.lockfileVersion).toBe(3);
    expect(parsed.packages.size).toBe(3);

    const rq = parsed.packages.get('node_modules/@tanstack/react-query');
    expect(rq?.name).toBe('@tanstack/react-query');
    expect(rq?.version).toBe('5.50.0');
    expect(rq?.license).toBe('MIT');

    const nestedSemver = parsed.packages.get(
      'node_modules/@tanstack/react-query/node_modules/semver',
    );
    expect(nestedSemver?.name).toBe('semver');
    expect(nestedSemver?.hasMissingVersion).toBe(true);
    expect(nestedSemver?.license).toBeUndefined();
    expect(parsed.warnings.length).toBeGreaterThan(0);
  });

  it('parses lockfile v2 and npm-shrinkwrap.json', () => {
    const shrinkwrap = JSON.stringify({
      name: 'cli-tool',
      version: '0.5.0',
      lockfileVersion: 2,
      packages: {
        '': { name: 'cli-tool', version: '0.5.0', dependencies: { picocolors: '^1.0.0' } },
        'node_modules/picocolors': { version: '1.0.1', license: 'ISC' },
      },
    });

    const parsed = parseAnyLockfile(shrinkwrap, 'npm-shrinkwrap.json');
    expect(parsed.isSupported).toBe(true);
    expect(parsed.kind).toBe('npm-shrinkwrap.json');
    expect(parsed.lockfileVersion).toBe(2);
    expect(parsed.packages.get('node_modules/picocolors')?.version).toBe('1.0.1');
  });

  it('parses lockfile v1 recursively preserving nested dependencies', () => {
    const lockV1 = JSON.stringify({
      name: 'legacy-app',
      version: '1.0.0',
      lockfileVersion: 1,
      dependencies: {
        'alpha-pkg': {
          version: '1.2.0',
          requires: { 'beta-pkg': '^2.0.0' },
          dependencies: {
            'beta-pkg': {
              version: '2.1.0',
            },
          },
        },
      },
    });

    const parsed = parseLockfileV1(lockV1);
    expect(parsed.isSupported).toBe(true);
    expect(parsed.lockfileVersion).toBe(1);
    expect(parsed.packages.get('node_modules/alpha-pkg')?.version).toBe('1.2.0');
    expect(
      parsed.packages.get('node_modules/alpha-pkg/node_modules/beta-pkg')?.version,
    ).toBe('2.1.0');
  });

  it('rejects invalid JSON and unsupported lockfile versions cleanly', () => {
    const badJson = parseAnyLockfile('{ bad json', 'package-lock.json');
    expect(badJson.isSupported).toBe(false);
    expect(badJson.parseErrors[0]).toContain('Invalid JSON');

    const v99 = parseAnyLockfile(JSON.stringify({ lockfileVersion: 99 }), 'package-lock.json');
    expect(v99.isSupported).toBe(false);
    expect(v99.parseErrors[0]).toContain('Unsupported lockfileVersion 99');
  });
});
