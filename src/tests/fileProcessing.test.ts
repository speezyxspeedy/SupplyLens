import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, discoverProjectFiles } from '../services/fileService';
import { extractProjectFromZip, isUnsafeZipPath } from '../services/zipService';
import { RawProjectFile } from '../types';

describe('fileProcessing and zipService', () => {
  it('excludes node_modules, .git, dist, and non-manifest files during folder discovery', () => {
    const files: RawProjectFile[] = [
      {
        path: 'my-app/package.json',
        name: 'package.json',
        content: JSON.stringify({ name: 'my-app', version: '1.0.0' }),
        size: 40,
        source: 'folder',
      },
      {
        path: 'my-app/node_modules/dep/package.json',
        name: 'package.json',
        content: JSON.stringify({ name: 'dep', version: '1.0.0' }),
        size: 40,
        source: 'folder',
      },
      {
        path: 'my-app/.git/config',
        name: 'config',
        content: '',
        size: 10,
        source: 'folder',
      },
      {
        path: 'my-app/src/index.ts',
        name: 'index.ts',
        content: 'console.log(1)',
        size: 14,
        source: 'folder',
      },
    ];

    const discovered = discoverProjectFiles(files, 'my-app', 'folder', DEFAULT_SETTINGS);
    expect(discovered.importSummary.manifests).toHaveLength(1);
    expect(discovered.importSummary.manifests[0].path).toBe('my-app/package.json');
    expect(discovered.importSummary.skippedFiles).toHaveLength(2);
    expect(discovered.importSummary.unsupportedFiles).toEqual(['my-app/src/index.ts']);
  });

  it('rejects oversized files cleanly', () => {
    const settings = { ...DEFAULT_SETTINGS, maxFileSizeMb: 1 };
    const files: RawProjectFile[] = [
      {
        path: 'big/package-lock.json',
        name: 'package-lock.json',
        content: '{}',
        size: 2 * 1024 * 1024,
        source: 'file',
      },
    ];
    const discovered = discoverProjectFiles(files, 'big', 'file', settings);
    expect(discovered.importSummary.lockfiles).toHaveLength(0);
    expect(discovered.importSummary.skippedFiles[0].reason).toContain('Exceeds max file size');
  });

  it('extracts valid ZIP archive and rejects ZIP path traversal entries', async () => {
    expect(isUnsafeZipPath('../../etc/passwd')).toBe(true);
    expect(isUnsafeZipPath('/absolute/path.json')).toBe(true);
    expect(isUnsafeZipPath('C:\\windows\\system32')).toBe(true);
    expect(isUnsafeZipPath('project/package.json')).toBe(false);

    const zip = new JSZip();
    zip.file('sample/package.json', JSON.stringify({ name: 'zip-app', version: '1.0.0' }));
    zip.file('sample/node_modules/ignored/package.json', '{}');
    zip.file('aa/bb/evil/package.json', '{"name":"evil"}');

    const buffer = await zip.generateAsync({ type: 'uint8array' });
    // Replace 'aa/bb/' with '../../' (same byte length) in ZIP headers to simulate a real traversal archive
    const needle = new TextEncoder().encode('aa/bb/evil/package.json');
    const replacement = new TextEncoder().encode('../../evil/package.json');
    for (let i = 0; i <= buffer.length - needle.length; i++) {
      let match = true;
      for (let j = 0; j < needle.length; j++) {
        if (buffer[i + j] !== needle[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        buffer.set(replacement, i);
      }
    }

    const discovered = await extractProjectFromZip(buffer, 'sample.zip', DEFAULT_SETTINGS);

    expect(discovered.importSummary.manifests).toHaveLength(1);
    expect(discovered.importSummary.manifests[0].parsed?.name).toBe('zip-app');
    expect(discovered.importSummary.errors.some((e) => e.includes('path traversal'))).toBe(true);
  });

  it('handles malformed ZIP archives gracefully', async () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7]);
    const discovered = await extractProjectFromZip(garbage, 'corrupt.zip', DEFAULT_SETTINGS);
    expect(discovered.importSummary.parsedStatus).toBe('ERROR');
    expect(discovered.importSummary.errors[0]).toContain('Failed to open ZIP archive');
  });
});
