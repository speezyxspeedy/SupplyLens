import {
  DiscoveredLockfile,
  DiscoveredManifest,
  ImportSummary,
  ParsedLockfile,
  RawProjectFile,
  SkippedFile,
  UserSettings,
} from '../types';
import { parseLockfileV1 } from './lockfileV1Parser';
import { parseLockfileV2V3 } from './lockfileV2V3Parser';
import { parsePackageManifest } from './manifestParser';

export const DEFAULT_EXCLUDED_FOLDERS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  'vendor',
];

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  maxVisibleGraphNodes: 120,
  defaultGraphDepth: 3,
  excludedFolders: [...DEFAULT_EXCLUDED_FOLDERS],
  excludedFileNames: ['.DS_Store', 'Thumbs.db'],
  maxFileSizeMb: 25,
  maxZipExpandedSizeMb: 50,
  maxZipEntries: 5000,
  defaultFilterDirectOnly: false,
  defaultHideDev: false,
  maxHistoryEntries: 30,
  maxPathResults: 25,
  maxPathDepth: 12,
};

export function normalizeRelativePath(rawPath: string): string {
  return rawPath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

export function getDirectoryPath(filePath: string): string {
  const norm = normalizeRelativePath(filePath);
  const idx = norm.lastIndexOf('/');
  return idx === -1 ? '' : norm.slice(0, idx);
}

export function getBaseName(filePath: string): string {
  const norm = normalizeRelativePath(filePath);
  const idx = norm.lastIndexOf('/');
  return idx === -1 ? norm : norm.slice(idx + 1);
}

export function shouldExcludePath(
  relativePath: string,
  excludedFolders: string[],
  excludedFileNames: string[],
): string | null {
  const norm = normalizeRelativePath(relativePath);
  const segments = norm.split('/').filter(Boolean);
  const baseName = segments[segments.length - 1] ?? '';

  if (excludedFileNames.includes(baseName)) {
    return `Excluded filename (${baseName})`;
  }

  // Check directory segments (exclude the filename itself)
  const dirSegments = segments.slice(0, -1);
  for (const seg of dirSegments) {
    if (excludedFolders.includes(seg)) {
      return `Excluded directory (${seg})`;
    }
  }
  return null;
}

export function isSupportedManifestOrLockfile(fileName: string): boolean {
  return (
    fileName === 'package.json' ||
    fileName === 'package-lock.json' ||
    fileName === 'npm-shrinkwrap.json'
  );
}

export function parseAnyLockfile(
  content: string,
  kind: 'package-lock.json' | 'npm-shrinkwrap.json',
): ParsedLockfile {
  if (!content || content.trim().length === 0) {
    return {
      kind,
      lockfileVersion: 0,
      packages: new Map(),
      parseErrors: [`${kind} is empty.`],
      warnings: [],
      isSupported: false,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown syntax error';
    return {
      kind,
      lockfileVersion: 0,
      packages: new Map(),
      parseErrors: [`Invalid JSON in ${kind}: ${msg}`],
      warnings: [],
      isSupported: false,
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      kind,
      lockfileVersion: 0,
      packages: new Map(),
      parseErrors: [`${kind} root must be a JSON object.`],
      warnings: [],
      isSupported: false,
    };
  }

  const version = (parsed as Record<string, unknown>).lockfileVersion;
  if (version === 2 || version === 3) {
    return parseLockfileV2V3(content, kind);
  }
  if (version === 1) {
    return parseLockfileV1(content, kind);
  }

  return {
    kind,
    lockfileVersion: typeof version === 'number' ? version : 0,
    projectName:
      typeof (parsed as Record<string, unknown>).name === 'string'
        ? ((parsed as Record<string, unknown>).name as string)
        : undefined,
    projectVersion:
      typeof (parsed as Record<string, unknown>).version === 'string'
        ? ((parsed as Record<string, unknown>).version as string)
        : undefined,
    packages: new Map(),
    parseErrors: [
      typeof version !== 'number'
        ? `${kind} does not declare a numeric lockfileVersion.`
        : `Unsupported lockfileVersion ${version}. Supported versions are 1, 2, and 3.`,
    ],
    warnings: [],
    isSupported: false,
  };
}

export interface DiscoveredProjectSet {
  rawFilesMap: Map<string, RawProjectFile>;
  importSummary: ImportSummary;
}

export function discoverProjectFiles(
  files: RawProjectFile[],
  rootLabel: string,
  sourceType: 'folder' | 'zip' | 'file' | 'demo',
  settings: UserSettings,
  preSkipped: SkippedFile[] = [],
  preErrors: string[] = [],
): DiscoveredProjectSet {
  const maxFileBytes = settings.maxFileSizeMb * 1024 * 1024;
  const skippedFiles: SkippedFile[] = [...preSkipped];
  const unsupportedFiles: string[] = [];
  const rawFilesMap = new Map<string, RawProjectFile>();
  const manifests: DiscoveredManifest[] = [];
  const lockfiles: DiscoveredLockfile[] = [];
  const errors: string[] = [...preErrors];
  let totalFileSize = 0;

  for (const file of files) {
    const normPath = normalizeRelativePath(file.path);
    const baseName = getBaseName(normPath);
    totalFileSize += file.size;

    const excludeReason = shouldExcludePath(
      normPath,
      settings.excludedFolders,
      settings.excludedFileNames,
    );
    if (excludeReason) {
      skippedFiles.push({ path: normPath, reason: excludeReason, size: file.size });
      continue;
    }

    if (!isSupportedManifestOrLockfile(baseName)) {
      unsupportedFiles.push(normPath);
      continue;
    }

    if (file.size > maxFileBytes) {
      skippedFiles.push({
        path: normPath,
        reason: `Exceeds max file size limit (${settings.maxFileSizeMb} MB)`,
        size: file.size,
      });
      errors.push(`Skipped oversized file "${normPath}" (${(file.size / 1024 / 1024).toFixed(2)} MB).`);
      continue;
    }

    const normalizedFile: RawProjectFile = {
      ...file,
      path: normPath,
      name: baseName,
    };
    rawFilesMap.set(normPath, normalizedFile);

    if (baseName === 'package.json') {
      const parsed = parsePackageManifest(file.content);
      manifests.push({
        path: normPath,
        dir: getDirectoryPath(normPath),
        isRoot: false,
        size: file.size,
        parsed,
        parseError: parsed.isValidJson ? undefined : parsed.rawErrors[0],
      });
    } else if (baseName === 'package-lock.json' || baseName === 'npm-shrinkwrap.json') {
      lockfiles.push({
        path: normPath,
        dir: getDirectoryPath(normPath),
        kind: baseName,
        size: file.size,
      });
    }
  }

  // Determine root manifest (shallowest directory depth, preferring one with workspaces or matching lockfile dir)
  if (manifests.length > 0) {
    manifests.sort((a, b) => {
      const depthA = a.dir === '' ? 0 : a.dir.split('/').length;
      const depthB = b.dir === '' ? 0 : b.dir.split('/').length;
      if (depthA !== depthB) return depthA - depthB;
      return a.path.localeCompare(b.path);
    });
    manifests[0].isRoot = true;
  } else if (lockfiles.length === 0 && errors.length === 0) {
    errors.push('No package.json or npm lockfiles were discovered in the selected files.');
  }

  const parsedStatus =
    errors.length > 0 && manifests.length === 0
      ? 'ERROR'
      : errors.length > 0 || manifests.some((m) => Boolean(m.parseError))
        ? 'PARTIAL'
        : 'READY';

  return {
    rawFilesMap,
    importSummary: {
      rootLabel,
      sourceType,
      manifests,
      lockfiles,
      skippedFiles,
      unsupportedFiles,
      totalFileSize,
      parsedStatus,
      errors,
    },
  };
}

export async function readBrowserFiles(
  fileList: FileList | File[],
  source: 'folder' | 'file',
  settings: UserSettings,
): Promise<DiscoveredProjectSet> {
  const filesArray = Array.from(fileList);
  const maxFileBytes = settings.maxFileSizeMb * 1024 * 1024;
  const rawFiles: RawProjectFile[] = [];
  const preSkipped: SkippedFile[] = [];
  const preErrors: string[] = [];

  let rootLabel = source === 'file' ? 'Individual Files' : 'Selected Project';
  if (source === 'folder' && filesArray.length > 0) {
    const firstRel = (filesArray[0] as File & { webkitRelativePath?: string }).webkitRelativePath;
    if (firstRel && firstRel.includes('/')) {
      rootLabel = firstRel.split('/')[0];
    }
  }

  for (const file of filesArray) {
    const relPath = normalizeRelativePath(
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    );
    const baseName = getBaseName(relPath);

    const excludeReason = shouldExcludePath(
      relPath,
      settings.excludedFolders,
      settings.excludedFileNames,
    );
    if (excludeReason) {
      preSkipped.push({ path: relPath, reason: excludeReason, size: file.size });
      continue;
    }

    if (!isSupportedManifestOrLockfile(baseName)) {
      rawFiles.push({
        path: relPath,
        name: baseName,
        content: '',
        size: file.size,
        source,
      });
      continue;
    }

    if (file.size > maxFileBytes) {
      preSkipped.push({
        path: relPath,
        reason: `Exceeds max file size (${settings.maxFileSizeMb} MB)`,
        size: file.size,
      });
      preErrors.push(`Skipped oversized file "${relPath}".`);
      continue;
    }

    try {
      const content = await file.text();
      rawFiles.push({
        path: relPath,
        name: baseName,
        content,
        size: file.size,
        source,
      });
    } catch {
      preErrors.push(`Failed to read file "${relPath}".`);
    }
  }

  return discoverProjectFiles(rawFiles, rootLabel, source, settings, preSkipped, preErrors);
}
