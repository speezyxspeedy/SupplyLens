export type NavSection =
  | 'overview'
  | 'import'
  | 'graph'
  | 'explorer'
  | 'paths'
  | 'duplicates'
  | 'insights'
  | 'health'
  | 'reports'
  | 'history'
  | 'settings';

export type AnalysisMode =
  | 'LOCKFILE_V3'
  | 'LOCKFILE_V2'
  | 'LOCKFILE_V1'
  | 'SHRINKWRAP'
  | 'MANIFEST_ONLY';

export type DependencyType =
  | 'DEPENDENCY'
  | 'DEV_DEPENDENCY'
  | 'OPTIONAL_DEPENDENCY'
  | 'PEER_DEPENDENCY'
  | 'WORKSPACE_LINK';

export type NodeType =
  | 'ROOT'
  | 'DIRECT'
  | 'TRANSITIVE'
  | 'WORKSPACE'
  | 'UNRESOLVED';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface RawProjectFile {
  path: string;
  name: string;
  content: string;
  size: number;
  source: 'folder' | 'zip' | 'file' | 'demo';
}

export interface SkippedFile {
  path: string;
  reason: string;
  size?: number;
}

export interface ParsedManifest {
  name: string;
  version: string;
  description?: string;
  license?: string;
  scriptsCount: number;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  bundledDependencies: string[];
  workspaces: string[];
  rawErrors: string[];
  hasName: boolean;
  isEmpty: boolean;
  isValidJson: boolean;
}

export interface DiscoveredManifest {
  path: string;
  dir: string;
  isRoot: boolean;
  size: number;
  parsed?: ParsedManifest;
  parseError?: string;
}

export interface DiscoveredLockfile {
  path: string;
  dir: string;
  kind: 'package-lock.json' | 'npm-shrinkwrap.json';
  size: number;
}

export interface ImportSummary {
  rootLabel: string;
  sourceType: 'folder' | 'zip' | 'file' | 'demo';
  manifests: DiscoveredManifest[];
  lockfiles: DiscoveredLockfile[];
  skippedFiles: SkippedFile[];
  unsupportedFiles: string[];
  totalFileSize: number;
  parsedStatus: 'READY' | 'PARTIAL' | 'ERROR';
  errors: string[];
}

export interface LockfilePackageRecord {
  location: string;
  name: string;
  version: string;
  resolved?: string;
  integrity?: string;
  license?: string;
  dev?: boolean;
  optional?: boolean;
  devOptional?: boolean;
  peer?: boolean;
  link?: boolean;
  resolvedTarget?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  hasMissingVersion?: boolean;
}

export interface ParsedLockfile {
  kind: 'package-lock.json' | 'npm-shrinkwrap.json';
  lockfileVersion: number;
  projectName?: string;
  projectVersion?: string;
  packages: Map<string, LockfilePackageRecord>;
  rootRecord?: LockfilePackageRecord;
  parseErrors: string[];
  warnings: string[];
  isSupported: boolean;
}

export interface PackageNode {
  id: string;
  nodeType: NodeType;
  name: string;
  version: string;
  packageLocation: string;
  license?: string;
  resolvedUrl?: string;
  integrity?: string;
  dependencyType: DependencyType;
  isDirect: boolean;
  isDevelopment: boolean;
  isOptional: boolean;
  isPeer: boolean;
  isWorkspace: boolean;
  hasUnresolvedMetadata: boolean;
  depth: number;
  parentIds: string[];
  childIds: string[];
  requestedRange?: string;
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  dependencyType: DependencyType;
  requestedRange?: string;
  resolvedLocation?: string;
  isUnresolved: boolean;
}

export interface GraphMetrics {
  totalPackageInstances: number;
  uniquePackageNames: number;
  directCount: number;
  transitiveCount: number;
  runtimeCount: number;
  devCount: number;
  optionalCount: number;
  peerCount: number;
  workspaceCount: number;
  unresolvedCount: number;
  maxDepth: number;
  rootLevelCount: number;
}

export interface DependencyGraph {
  rootId: string;
  nodes: Map<string, PackageNode>;
  nodeList: PackageNode[];
  edges: DependencyEdge[];
  metrics: GraphMetrics;
  depthDistribution: Record<number, number>;
}

export interface DuplicateInstanceInfo {
  nodeId: string;
  version: string;
  location: string;
  dependencyType: DependencyType;
  isDirect: boolean;
  parents: string[];
  samplePaths: string[][];
}

export interface DuplicateGroup {
  name: string;
  versions: string[];
  instanceCount: number;
  instances: DuplicateInstanceInfo[];
}

export interface HealthFinding {
  id: string;
  severity: Severity;
  code: string;
  title: string;
  description: string;
  recommendation: string;
  affectedItems?: string[];
}

export interface LicenseEntry {
  license: string;
  isMissing: boolean;
  count: number;
  packages: {
    id: string;
    name: string;
    version: string;
    location: string;
  }[];
}

export interface LicenseInventory {
  entries: LicenseEntry[];
  withLicenseCount: number;
  missingLicenseCount: number;
  totalEvaluated: number;
}

export interface BranchSummary {
  nodeId: string;
  name: string;
  version: string;
  dependencyType: DependencyType;
  reachableCount: number;
  maxSubDepth: number;
}

export interface InsightsData {
  composition: {
    runtime: number;
    dev: number;
    optional: number;
    peer: number;
    workspace: number;
  };
  depthDistribution: { depth: number; count: number }[];
  largestBranches: BranchSummary[];
  topDuplicates: DuplicateGroup[];
  metadataCoverage: {
    withLicense: number;
    withIntegrity: number;
    missingBoth: number;
    total: number;
  };
  unresolvedRefs: DependencyEdge[];
  analysisReadinessRatio: number;
  readinessFormula: string;
}

export interface PathStep {
  nodeId: string;
  name: string;
  version: string;
  location: string;
  dependencyType?: DependencyType;
  requestedRange?: string;
  isUnresolved: boolean;
}

export interface PathResult {
  steps: PathStep[];
  truncated: boolean;
}

export interface ScanHistoryEntry {
  scanId: string;
  projectLabel: string;
  projectVersion: string;
  scanDate: string;
  totalPackageInstances: number;
  directDependencies: number;
  transitiveDependencies: number;
  duplicatePackageCount: number;
  unresolvedReferenceCount: number;
  lockfileVersion: number | null;
  analysisMode: AnalysisMode;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  maxVisibleGraphNodes: number;
  defaultGraphDepth: number;
  excludedFolders: string[];
  excludedFileNames: string[];
  maxFileSizeMb: number;
  maxZipExpandedSizeMb: number;
  maxZipEntries: number;
  defaultFilterDirectOnly: boolean;
  defaultHideDev: boolean;
  maxHistoryEntries: number;
  maxPathResults: number;
  maxPathDepth: number;
}

export interface AnalysisResult {
  scanId: string;
  timestamp: string;
  isDemo: boolean;
  selectedManifestPath: string;
  selectedLockfilePath: string | null;
  projectName: string;
  projectVersion: string;
  analysisMode: AnalysisMode;
  manifest: ParsedManifest;
  lockfile: ParsedLockfile | null;
  graph: DependencyGraph;
  duplicates: DuplicateGroup[];
  healthFindings: HealthFinding[];
  licenseInventory: LicenseInventory;
  insights: InsightsData;
  importSummary: ImportSummary;
}
