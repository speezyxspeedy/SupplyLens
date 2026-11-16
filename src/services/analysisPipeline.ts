import {
  AnalysisResult,
  ImportSummary,
  ParsedLockfile,
  ParsedManifest,
  RawProjectFile,
} from '../types';
import { resolveDependencies } from './dependencyResolver';
import { analyzeDuplicateVersions } from './duplicateAnalyzer';
import {
  getDirectoryPath,
  parseAnyLockfile,
} from './fileService';
import { buildDependencyGraph } from './graphEngine';
import { analyzeManifestAndLockfileHealth } from './healthAnalyzer';
import { computeInsights } from './insightsEngine';
import { analyzeLicenses } from './licenseAnalyzer';
import { parsePackageManifest } from './manifestParser';

export function selectLockfileForManifest(
  manifestPath: string,
  importSummary: ImportSummary,
): string | null {
  const manifestDir = getDirectoryPath(manifestPath);

  // 1. Prefer lockfile in exact same directory (package-lock.json before npm-shrinkwrap.json)
  const sameDir = importSummary.lockfiles.filter((l) => l.dir === manifestDir);
  if (sameDir.length > 0) {
    const pkgLock = sameDir.find((l) => l.kind === 'package-lock.json');
    return (pkgLock ?? sameDir[0]).path;
  }

  // 2. Fallback to root-level lockfile for workspace manifests
  const rootManifest = importSummary.manifests.find((m) => m.isRoot);
  if (rootManifest) {
    const rootDirLock = importSummary.lockfiles.filter((l) => l.dir === rootManifest.dir);
    if (rootDirLock.length > 0) {
      const pkgLock = rootDirLock.find((l) => l.kind === 'package-lock.json');
      return (pkgLock ?? rootDirLock[0]).path;
    }
  }

  // 3. Fallback to any discovered lockfile
  if (importSummary.lockfiles.length > 0) {
    return importSummary.lockfiles[0].path;
  }

  return null;
}

export function runProjectAnalysis(params: {
  rawFiles: Map<string, RawProjectFile>;
  importSummary: ImportSummary;
  selectedManifestPath: string;
  isDemo?: boolean;
}): AnalysisResult {
  const { rawFiles, importSummary, selectedManifestPath, isDemo = false } = params;

  const manifestFile = rawFiles.get(selectedManifestPath);
  const manifest: ParsedManifest = manifestFile
    ? parsePackageManifest(manifestFile.content)
    : {
        name: '(no-manifest)',
        version: '0.0.0',
        scriptsCount: 0,
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
        bundledDependencies: [],
        workspaces: [],
        rawErrors: ['Selected package.json could not be located in imported files.'],
        hasName: false,
        isEmpty: true,
        isValidJson: false,
      };

  const lockfilePath = selectLockfileForManifest(selectedManifestPath, importSummary);
  let lockfile: ParsedLockfile | null = null;

  if (lockfilePath) {
    const lockFileObj = rawFiles.get(lockfilePath);
    if (lockFileObj) {
      const kind =
        lockFileObj.name === 'npm-shrinkwrap.json'
          ? 'npm-shrinkwrap.json'
          : 'package-lock.json';
      lockfile = parseAnyLockfile(lockFileObj.content, kind);
    }
  }

  const resolution = resolveDependencies(manifest, lockfile);
  const graph = buildDependencyGraph(resolution);
  const duplicates = analyzeDuplicateVersions(graph);
  const licenseInventory = analyzeLicenses(graph);
  const insights = computeInsights(graph, duplicates, resolution.analysisMode);
  const healthFindings = analyzeManifestAndLockfileHealth({
    manifest,
    lockfile,
    analysisMode: resolution.analysisMode,
    graph,
    duplicates,
    importSummary,
  });

  const timestamp = new Date().toISOString();
  const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    scanId,
    timestamp,
    isDemo,
    selectedManifestPath,
    selectedLockfilePath: lockfilePath,
    projectName: manifest.hasName
      ? manifest.name
      : lockfile?.projectName || importSummary.rootLabel || '(unnamed-project)',
    projectVersion: manifest.version || lockfile?.projectVersion || '0.0.0',
    analysisMode: resolution.analysisMode,
    manifest,
    lockfile,
    graph,
    duplicates,
    healthFindings,
    licenseInventory,
    insights,
    importSummary,
  };
}
