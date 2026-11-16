import {
  AnalysisMode,
  DependencyGraph,
  DuplicateGroup,
  HealthFinding,
  ImportSummary,
  InsightsData,
  LicenseInventory,
  LockfilePackageRecord,
  PackageNode,
  ParsedLockfile,
  ParsedManifest,
  RawProjectFile,
} from '../types';
import { runProjectAnalysis } from '../services/analysisPipeline';

export interface WorkerRequestMessage {
  requestId: string;
  rawFilesEntries: [string, RawProjectFile][];
  importSummary: ImportSummary;
  selectedManifestPath: string;
  isDemo: boolean;
}

export interface SerializedLockfile extends Omit<ParsedLockfile, 'packages'> {
  packagesEntries: [string, LockfilePackageRecord][];
}

export interface SerializedGraph extends Omit<DependencyGraph, 'nodes'> {
  nodesEntries: [string, PackageNode][];
}

export interface WorkerResponseMessage {
  requestId: string;
  ok: boolean;
  error?: string;
  payload?: {
    scanId: string;
    timestamp: string;
    isDemo: boolean;
    selectedManifestPath: string;
    selectedLockfilePath: string | null;
    projectName: string;
    projectVersion: string;
    analysisMode: AnalysisMode;
    manifest: ParsedManifest;
    lockfile: SerializedLockfile | null;
    graph: SerializedGraph;
    duplicates: DuplicateGroup[];
    healthFindings: HealthFinding[];
    licenseInventory: LicenseInventory;
    insights: InsightsData;
    importSummary: ImportSummary;
  };
}

self.onmessage = (event: MessageEvent<WorkerRequestMessage>) => {
  const { requestId, rawFilesEntries, importSummary, selectedManifestPath, isDemo } = event.data;
  try {
    const rawFiles = new Map<string, RawProjectFile>(rawFilesEntries);
    const result = runProjectAnalysis({
      rawFiles,
      importSummary,
      selectedManifestPath,
      isDemo,
    });

    const lockfileSerialized: SerializedLockfile | null = result.lockfile
      ? {
          kind: result.lockfile.kind,
          lockfileVersion: result.lockfile.lockfileVersion,
          projectName: result.lockfile.projectName,
          projectVersion: result.lockfile.projectVersion,
          rootRecord: result.lockfile.rootRecord,
          parseErrors: result.lockfile.parseErrors,
          warnings: result.lockfile.warnings,
          isSupported: result.lockfile.isSupported,
          packagesEntries: Array.from(result.lockfile.packages.entries()),
        }
      : null;

    const graphSerialized: SerializedGraph = {
      rootId: result.graph.rootId,
      nodeList: result.graph.nodeList,
      edges: result.graph.edges,
      metrics: result.graph.metrics,
      depthDistribution: result.graph.depthDistribution,
      nodesEntries: Array.from(result.graph.nodes.entries()),
    };

    const response: WorkerResponseMessage = {
      requestId,
      ok: true,
      payload: {
        scanId: result.scanId,
        timestamp: result.timestamp,
        isDemo: result.isDemo,
        selectedManifestPath: result.selectedManifestPath,
        selectedLockfilePath: result.selectedLockfilePath,
        projectName: result.projectName,
        projectVersion: result.projectVersion,
        analysisMode: result.analysisMode,
        manifest: result.manifest,
        lockfile: lockfileSerialized,
        graph: graphSerialized,
        duplicates: result.duplicates,
        healthFindings: result.healthFindings,
        licenseInventory: result.licenseInventory,
        insights: result.insights,
        importSummary: result.importSummary,
      },
    };

    self.postMessage(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Worker analysis failed';
    const response: WorkerResponseMessage = {
      requestId,
      ok: false,
      error: message,
    };
    self.postMessage(response);
  }
};
