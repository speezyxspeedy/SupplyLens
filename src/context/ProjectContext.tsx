import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { runProjectAnalysis } from '../services/analysisPipeline';
import { getDemoProjectFiles } from '../services/demoProject';
import {
  DEFAULT_SETTINGS,
  DiscoveredProjectSet,
  discoverProjectFiles,
  readBrowserFiles,
} from '../services/fileService';
import {
  clearScanHistory,
  deleteScanHistoryEntry,
  loadScanHistory,
  loadUserSettings,
  saveScanHistoryEntry,
  saveUserSettings,
} from '../services/historyService';
import { extractProjectFromZip } from '../services/zipService';
import {
  AnalysisResult,
  NavSection,
  ScanHistoryEntry,
  UserSettings,
} from '../types';
import type { WorkerRequestMessage, WorkerResponseMessage } from '../workers/analysisWorker';

interface ProjectContextValue {
  activeNav: NavSection;
  setActiveNav: (nav: NavSection) => void;
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSettings: () => void;
  history: ScanHistoryEntry[];
  deleteHistoryItem: (scanId: string) => void;
  clearAllHistory: () => void;
  importedProject: DiscoveredProjectSet | null;
  analysis: AnalysisResult | null;
  selectedManifestPath: string | null;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  isAnalyzing: boolean;
  zipProgress: { percent: number; stage: string } | null;
  analysisError: string | null;
  clearAnalysisError: () => void;
  importFolder: (files: FileList) => Promise<void>;
  importIndividualFiles: (files: FileList) => Promise<void>;
  importZip: (file: File) => Promise<void>;
  analyzeManifest: (manifestPath: string, projectSet?: DiscoveredProjectSet, isDemo?: boolean) => Promise<void>;
  loadDemo: () => Promise<void>;
  resetDemoAndProject: () => void;
  inspectPackageInView: (nodeId: string, targetView: NavSection) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

async function runAnalysisInWorkerOrSync(params: {
  projectSet: DiscoveredProjectSet;
  manifestPath: string;
  isDemo: boolean;
}): Promise<AnalysisResult> {
  const { projectSet, manifestPath, isDemo } = params;

  if (typeof Worker !== 'undefined') {
    try {
      const workerResult = await new Promise<AnalysisResult>((resolve, reject) => {
        const worker = new Worker(
          new URL('../workers/analysisWorker.ts', import.meta.url),
          { type: 'module' },
        );
        const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const timeout = window.setTimeout(() => {
          worker.terminate();
          reject(new Error('Worker timeout'));
        }, 30000);

        worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
          if (event.data.requestId !== requestId) return;
          window.clearTimeout(timeout);
          worker.terminate();
          if (!event.data.ok || !event.data.payload) {
            reject(new Error(event.data.error || 'Worker analysis failed'));
            return;
          }
          const p = event.data.payload;
          const lockfile = p.lockfile
            ? {
                kind: p.lockfile.kind,
                lockfileVersion: p.lockfile.lockfileVersion,
                projectName: p.lockfile.projectName,
                projectVersion: p.lockfile.projectVersion,
                rootRecord: p.lockfile.rootRecord,
                parseErrors: p.lockfile.parseErrors,
                warnings: p.lockfile.warnings,
                isSupported: p.lockfile.isSupported,
                packages: new Map(p.lockfile.packagesEntries),
              }
            : null;
          const graph = {
            rootId: p.graph.rootId,
            nodeList: p.graph.nodeList,
            edges: p.graph.edges,
            metrics: p.graph.metrics,
            depthDistribution: p.graph.depthDistribution,
            nodes: new Map(p.graph.nodesEntries),
          };
          resolve({
            scanId: p.scanId,
            timestamp: p.timestamp,
            isDemo: p.isDemo,
            selectedManifestPath: p.selectedManifestPath,
            selectedLockfilePath: p.selectedLockfilePath,
            projectName: p.projectName,
            projectVersion: p.projectVersion,
            analysisMode: p.analysisMode,
            manifest: p.manifest,
            lockfile,
            graph,
            duplicates: p.duplicates,
            healthFindings: p.healthFindings,
            licenseInventory: p.licenseInventory,
            insights: p.insights,
            importSummary: p.importSummary,
          });
        };

        worker.onerror = () => {
          window.clearTimeout(timeout);
          worker.terminate();
          reject(new Error('Web Worker execution failed'));
        };

        const msg: WorkerRequestMessage = {
          requestId,
          rawFilesEntries: Array.from(projectSet.rawFilesMap.entries()),
          importSummary: projectSet.importSummary,
          selectedManifestPath: manifestPath,
          isDemo,
        };
        worker.postMessage(msg);
      });
      return workerResult;
    } catch {
      // Fallback safely to synchronous pipeline if worker cannot load
    }
  }

  return runProjectAnalysis({
    rawFiles: projectSet.rawFilesMap,
    importSummary: projectSet.importSummary,
    selectedManifestPath: manifestPath,
    isDemo,
  });
}

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeNav, setActiveNav] = useState<NavSection>('overview');
  const [settings, setSettings] = useState<UserSettings>(() => loadUserSettings());
  const [history, setHistory] = useState<ScanHistoryEntry[]>(() => loadScanHistory());
  const [importedProject, setImportedProject] = useState<DiscoveredProjectSet | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedManifestPath, setSelectedManifestPath] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ percent: number; stage: string } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const isDark = settings.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.body.className = isDark
      ? 'bg-slate-950 text-slate-100 antialiased'
      : 'bg-slate-50 text-slate-900 antialiased';
    saveUserSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const deleteHistoryItem = useCallback((scanId: string) => {
    setHistory(deleteScanHistoryEntry(scanId));
  }, []);

  const clearAllHistory = useCallback(() => {
    setHistory(clearScanHistory());
  }, []);

  const analyzeManifest = useCallback(
    async (
      manifestPath: string,
      projectSetOverride?: DiscoveredProjectSet,
      isDemo = false,
    ) => {
      const targetSet = projectSetOverride ?? importedProject;
      if (!targetSet) return;

      setIsAnalyzing(true);
      setAnalysisError(null);
      try {
        const result = await runAnalysisInWorkerOrSync({
          projectSet: targetSet,
          manifestPath,
          isDemo,
        });
        setSelectedManifestPath(manifestPath);
        setAnalysis(result);
        setSelectedNodeId(null);
        setHistory(saveScanHistoryEntry(result, settings.maxHistoryEntries));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unexpected analysis error.';
        setAnalysisError(msg);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [importedProject, settings.maxHistoryEntries],
  );

  const handleDiscoveredSet = useCallback(
    async (discovered: DiscoveredProjectSet, isDemo = false) => {
      setImportedProject(discovered);
      if (discovered.importSummary.manifests.length === 0) {
        setAnalysis(null);
        setSelectedManifestPath(null);
        if (discovered.importSummary.errors.length > 0) {
          setAnalysisError(discovered.importSummary.errors[0]);
        } else {
          setAnalysisError('No package.json manifest was found in the imported project.');
        }
        return;
      }

      const rootManifest =
        discovered.importSummary.manifests.find((m) => m.isRoot) ??
        discovered.importSummary.manifests[0];
      await analyzeManifest(rootManifest.path, discovered, isDemo);
    },
    [analyzeManifest],
  );

  const importFolder = useCallback(
    async (files: FileList) => {
      if (!files || files.length === 0) {
        setAnalysisError('No files were selected from the folder.');
        return;
      }
      setIsAnalyzing(true);
      setAnalysisError(null);
      try {
        const discovered = await readBrowserFiles(files, 'folder', settings);
        await handleDiscoveredSet(discovered, false);
        if (discovered.importSummary.manifests.length === 1) {
          setActiveNav('overview');
        }
      } catch (err) {
        setAnalysisError(err instanceof Error ? err.message : 'Failed to read folder.');
      } finally {
        setIsAnalyzing(false);
      }
    },
    [handleDiscoveredSet, settings],
  );

  const importIndividualFiles = useCallback(
    async (files: FileList) => {
      if (!files || files.length === 0) {
        setAnalysisError('No files were selected.');
        return;
      }
      setIsAnalyzing(true);
      setAnalysisError(null);
      try {
        const discovered = await readBrowserFiles(files, 'file', settings);
        await handleDiscoveredSet(discovered, false);
        if (discovered.importSummary.manifests.length === 1) {
          setActiveNav('overview');
        }
      } catch (err) {
        setAnalysisError(err instanceof Error ? err.message : 'Failed to read selected files.');
      } finally {
        setIsAnalyzing(false);
      }
    },
    [handleDiscoveredSet, settings],
  );

  const importZip = useCallback(
    async (file: File) => {
      if (!file) {
        setAnalysisError('No ZIP archive was selected.');
        return;
      }
      setIsAnalyzing(true);
      setAnalysisError(null);
      setZipProgress({ percent: 5, stage: 'Reading archive' });
      try {
        const discovered = await extractProjectFromZip(
          file,
          file.name,
          settings,
          (percent, stage) => setZipProgress({ percent, stage }),
        );
        await handleDiscoveredSet(discovered, false);
        if (discovered.importSummary.manifests.length === 1) {
          setActiveNav('overview');
        }
      } catch (err) {
        setAnalysisError(err instanceof Error ? err.message : 'Failed to extract ZIP archive.');
      } finally {
        setZipProgress(null);
        setIsAnalyzing(false);
      }
    },
    [handleDiscoveredSet, settings],
  );

  const loadDemo = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const demoFiles = getDemoProjectFiles();
      const discovered = discoverProjectFiles(
        demoFiles,
        'orbit-telemetry-cli (Demo)',
        'demo',
        settings,
      );
      await handleDiscoveredSet(discovered, true);
      setActiveNav('overview');
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Failed to load demo project.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [handleDiscoveredSet, settings]);

  const resetDemoAndProject = useCallback(() => {
    setImportedProject(null);
    setAnalysis(null);
    setSelectedManifestPath(null);
    setSelectedNodeId(null);
    setAnalysisError(null);
    setZipProgress(null);
  }, []);

  const inspectPackageInView = useCallback((nodeId: string, targetView: NavSection) => {
    setSelectedNodeId(nodeId);
    setActiveNav(targetView);
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        activeNav,
        setActiveNav,
        settings,
        updateSettings,
        resetSettings,
        history,
        deleteHistoryItem,
        clearAllHistory,
        importedProject,
        analysis,
        selectedManifestPath,
        selectedNodeId,
        setSelectedNodeId,
        globalSearch,
        setGlobalSearch,
        isAnalyzing,
        zipProgress,
        analysisError,
        clearAnalysisError: () => setAnalysisError(null),
        importFolder,
        importIndividualFiles,
        importZip,
        analyzeManifest,
        loadDemo,
        resetDemoAndProject,
        inspectPackageInView,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used inside ProjectProvider');
  }
  return ctx;
}
