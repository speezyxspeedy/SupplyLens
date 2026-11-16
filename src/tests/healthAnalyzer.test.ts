import { describe, expect, it } from 'vitest';
import { runProjectAnalysis } from '../services/analysisPipeline';
import { DEFAULT_SETTINGS, discoverProjectFiles } from '../services/fileService';
import { RawProjectFile } from '../types';

function analyzeRawPair(pkgContent: string, lockContent?: string) {
  const files: RawProjectFile[] = [
    {
      path: 'proj/package.json',
      name: 'package.json',
      content: pkgContent,
      size: pkgContent.length,
      source: 'file',
    },
  ];
  if (lockContent !== undefined) {
    files.push({
      path: 'proj/package-lock.json',
      name: 'package-lock.json',
      content: lockContent,
      size: lockContent.length,
      source: 'file',
    });
  }
  const discovered = discoverProjectFiles(files, 'proj', 'file', DEFAULT_SETTINGS);
  return runProjectAnalysis({
    rawFiles: discovered.rawFilesMap,
    importSummary: discovered.importSummary,
    selectedManifestPath: 'proj/package.json',
  });
}

describe('healthAnalyzer', () => {
  it('flags missing lockfile as INFO Manifest Only', () => {
    const res = analyzeRawPair(JSON.stringify({ name: 'no-lock', version: '1.0.0' }));
    expect(res.analysisMode).toBe('MANIFEST_ONLY');
    expect(
      res.healthFindings.some((f) => f.severity === 'INFO' && f.code === 'MANIFEST_ONLY_MODE'),
    ).toBe(true);
  });

  it('flags unsupported lockfile version as HIGH', () => {
    const res = analyzeRawPair(
      JSON.stringify({ name: 'bad-lock', version: '1.0.0' }),
      JSON.stringify({ name: 'bad-lock', lockfileVersion: 7 }),
    );
    expect(
      res.healthFindings.some(
        (f) => f.severity === 'HIGH' && f.code === 'LOCKFILE_INVALID_OR_UNSUPPORTED',
      ),
    ).toBe(true);
  });

  it('flags manifest-lockfile mismatch and unresolved dependencies as MEDIUM, and duplicates as LOW', () => {
    const res = analyzeRawPair(
      JSON.stringify({
        name: 'app-a',
        version: '2.0.0',
        dependencies: { foo: '^1.0.0', missing: '^1.0.0' },
      }),
      JSON.stringify({
        name: 'app-a',
        version: '1.0.0',
        lockfileVersion: 3,
        packages: {
          '': {
            name: 'app-a',
            version: '1.0.0',
            dependencies: { foo: '^1.0.0' },
          },
          'node_modules/foo': {
            version: '1.0.0',
            dependencies: { bar: '^1.0.0' },
          },
          'node_modules/foo/node_modules/bar': {
            version: '1.0.0',
          },
          'node_modules/bar': {
            version: '2.0.0',
          },
        },
      }),
    );

    const codes = res.healthFindings.map((f) => `${f.severity}:${f.code}`);
    expect(codes).toContain('MEDIUM:MANIFEST_LOCKFILE_METADATA_MISMATCH');
    expect(codes).toContain('MEDIUM:DIRECT_DEPENDENCY_MISMATCH');
    expect(codes).toContain('MEDIUM:UNRESOLVED_DEPENDENCIES');
  });

  it('classifies duplicate versions as LOW observation', () => {
    const res = analyzeRawPair(
      JSON.stringify({
        name: 'dup-app',
        version: '1.0.0',
        dependencies: { a: '^1.0.0', semver: '^7.0.0' },
      }),
      JSON.stringify({
        name: 'dup-app',
        version: '1.0.0',
        lockfileVersion: 3,
        packages: {
          '': {
            name: 'dup-app',
            version: '1.0.0',
            dependencies: { a: '^1.0.0', semver: '^7.0.0' },
          },
          'node_modules/a': {
            version: '1.0.0',
            dependencies: { semver: '^6.0.0' },
          },
          'node_modules/a/node_modules/semver': { version: '6.3.1', license: 'ISC' },
          'node_modules/semver': { version: '7.6.0', license: 'ISC' },
        },
      }),
    );

    const dupFinding = res.healthFindings.find((f) => f.code === 'DUPLICATE_VERSIONS_OBSERVED');
    expect(dupFinding?.severity).toBe('LOW');
  });
});
