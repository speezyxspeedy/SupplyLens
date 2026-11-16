import JSZip from 'jszip';
import { RawProjectFile, SkippedFile, UserSettings } from '../types';
import {
  DiscoveredProjectSet,
  discoverProjectFiles,
  getBaseName,
  isSupportedManifestOrLockfile,
  normalizeRelativePath,
  shouldExcludePath,
} from './fileService';

export function isUnsafeZipPath(rawPath: string): boolean {
  if (!rawPath || rawPath.includes('\0')) return true;
  if (rawPath.startsWith('/') || rawPath.startsWith('\\')) return true;
  if (/^[a-zA-Z]:/.test(rawPath)) return true;
  const normalized = rawPath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  return segments.some((seg) => seg === '..');
}

export async function extractProjectFromZip(
  data: ArrayBuffer | Uint8Array | File,
  archiveName: string,
  settings: UserSettings,
  onProgress?: (percent: number, stage: string) => void,
): Promise<DiscoveredProjectSet> {
  const maxArchiveBytes = settings.maxFileSizeMb * 1024 * 1024;
  const maxExpandedBytes = settings.maxZipExpandedSizeMb * 1024 * 1024;
  const maxEntries = settings.maxZipEntries;

  const byteSize = data instanceof File ? data.size : data.byteLength;
  if (byteSize > maxArchiveBytes) {
    return discoverProjectFiles(
      [],
      archiveName,
      'zip',
      settings,
      [{ path: archiveName, reason: `Archive exceeds ${settings.maxFileSizeMb} MB limit`, size: byteSize }],
      [`ZIP archive "${archiveName}" exceeds the maximum allowed size of ${settings.maxFileSizeMb} MB.`],
    );
  }

  onProgress?.(10, 'Validating archive structure');

  let zip: JSZip;
  try {
    const buffer = data instanceof File ? await data.arrayBuffer() : data;
    zip = await JSZip.loadAsync(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Corrupted or invalid ZIP archive';
    return discoverProjectFiles(
      [],
      archiveName,
      'zip',
      settings,
      [],
      [`Failed to open ZIP archive "${archiveName}": ${msg}`],
    );
  }

  const entryNames = Object.keys(zip.files);
  if (entryNames.length > maxEntries) {
    return discoverProjectFiles(
      [],
      archiveName,
      'zip',
      settings,
      [],
      [
        `ZIP archive contains ${entryNames.length} entries, exceeding the safety limit of ${maxEntries} entries.`,
      ],
    );
  }

  const rawFiles: RawProjectFile[] = [];
  const skippedFiles: SkippedFile[] = [];
  const errors: string[] = [];
  let expandedTotalBytes = 0;

  const fileEntries = entryNames
    .map((name) => zip.files[name])
    .filter((entry) => entry && !entry.dir);

  const totalCount = Math.max(fileEntries.length, 1);

  for (let i = 0; i < fileEntries.length; i++) {
    const entry = fileEntries[i];
    if (i % 25 === 0) {
      const pct = Math.min(90, 15 + Math.round((i / totalCount) * 75));
      onProgress?.(pct, `Inspecting archive entries (${i + 1}/${fileEntries.length})`);
    }

    const rawEntryPath = entry.unsafeOriginalName ?? entry.name;
    if (isUnsafeZipPath(rawEntryPath)) {
      skippedFiles.push({
        path: rawEntryPath,
        reason: 'Rejected unsafe path traversal attempt',
      });
      errors.push(`Blocked unsafe ZIP entry path "${rawEntryPath}" (path traversal protection).`);
      continue;
    }

    const normPath = normalizeRelativePath(entry.name);
    const baseName = getBaseName(normPath);

    const excludeReason = shouldExcludePath(
      normPath,
      settings.excludedFolders,
      settings.excludedFileNames,
    );
    if (excludeReason) {
      skippedFiles.push({ path: normPath, reason: excludeReason });
      continue;
    }

    if (!isSupportedManifestOrLockfile(baseName)) {
      rawFiles.push({
        path: normPath,
        name: baseName,
        content: '',
        size: 0,
        source: 'zip',
      });
      continue;
    }

    // Decompress supported manifest / lockfile entries with ZIP bomb size enforcement
    try {
      const bytes = await entry.async('uint8array');
      expandedTotalBytes += bytes.byteLength;

      if (expandedTotalBytes > maxExpandedBytes) {
        errors.push(
          `Aborted ZIP extraction: decompressed payload exceeded the ${settings.maxZipExpandedSizeMb} MB safety limit (ZIP bomb protection).`,
        );
        break;
      }

      const content = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      rawFiles.push({
        path: normPath,
        name: baseName,
        content,
        size: bytes.byteLength,
        source: 'zip',
      });
    } catch {
      skippedFiles.push({ path: normPath, reason: 'Failed to decompress entry' });
      errors.push(`Failed to extract "${normPath}" from ZIP archive.`);
    }
  }

  onProgress?.(100, 'Archive extraction complete');

  return discoverProjectFiles(rawFiles, archiveName, 'zip', settings, skippedFiles, errors);
}
