import { describe, expect, it } from 'vitest';
import { parsePackageManifest } from '../services/manifestParser';

describe('manifestParser', () => {
  it('parses a valid package.json with all dependency categories', () => {
    const json = JSON.stringify({
      name: '@acme-fictional/web-app',
      version: '2.1.0',
      description: 'Test application',
      license: 'MIT',
      scripts: { dev: 'vite', build: 'vite build', test: 'vitest' },
      dependencies: { react: '^19.0.0', 'lucide-react': '^0.546.0' },
      devDependencies: { typescript: '^5.0.0', vite: '^6.0.0' },
      optionalDependencies: { fsevents: '^2.3.3' },
      peerDependencies: { 'react-dom': '^19.0.0' },
      bundledDependencies: ['local-helper'],
    });

    const parsed = parsePackageManifest(json);
    expect(parsed.isValidJson).toBe(true);
    expect(parsed.name).toBe('@acme-fictional/web-app');
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.license).toBe('MIT');
    expect(parsed.scriptsCount).toBe(3);
    expect(parsed.dependencies).toEqual({ react: '^19.0.0', 'lucide-react': '^0.546.0' });
    expect(parsed.devDependencies).toEqual({ typescript: '^5.0.0', vite: '^6.0.0' });
    expect(parsed.optionalDependencies).toEqual({ fsevents: '^2.3.3' });
    expect(parsed.peerDependencies).toEqual({ 'react-dom': '^19.0.0' });
    expect(parsed.bundledDependencies).toEqual(['local-helper']);
    expect(parsed.rawErrors).toHaveLength(0);
  });

  it('handles missing dependency sections gracefully', () => {
    const parsed = parsePackageManifest(JSON.stringify({ name: 'minimal-pkg', version: '1.0.0' }));
    expect(parsed.isValidJson).toBe(true);
    expect(parsed.dependencies).toEqual({});
    expect(parsed.devDependencies).toEqual({});
    expect(parsed.optionalDependencies).toEqual({});
    expect(parsed.peerDependencies).toEqual({});
    expect(parsed.workspaces).toEqual([]);
  });

  it('handles invalid JSON and empty manifest safely', () => {
    const emptyRes = parsePackageManifest('   ');
    expect(emptyRes.isEmpty).toBe(true);
    expect(emptyRes.isValidJson).toBe(false);

    const invalidRes = parsePackageManifest('{ "name": "broken", ');
    expect(invalidRes.isValidJson).toBe(false);
    expect(invalidRes.rawErrors[0]).toContain('Invalid JSON');
  });

  it('extracts array and object workspace declarations', () => {
    const arrManifest = parsePackageManifest(
      JSON.stringify({ name: 'mono-a', workspaces: ['packages/*', 'apps/web'] }),
    );
    expect(arrManifest.workspaces).toEqual(['packages/*', 'apps/web']);

    const objManifest = parsePackageManifest(
      JSON.stringify({ name: 'mono-b', workspaces: { packages: ['libs/*'] } }),
    );
    expect(objManifest.workspaces).toEqual(['libs/*']);
  });

  it('handles incorrect field types without crashing', () => {
    const parsed = parsePackageManifest(
      JSON.stringify({
        name: 123,
        dependencies: 'not-an-object',
        devDependencies: { ok: '^1.0.0', bad: 42 },
      }),
    );
    expect(parsed.isValidJson).toBe(true);
    expect(parsed.hasName).toBe(false);
    expect(parsed.dependencies).toEqual({});
    expect(parsed.devDependencies).toEqual({ ok: '^1.0.0' });
    expect(parsed.rawErrors.length).toBeGreaterThanOrEqual(2);
  });
});
