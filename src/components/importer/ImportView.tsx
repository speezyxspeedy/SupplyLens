import React, { useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  FileCode2,
  FolderOpen,
  Play,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const ImportView: React.FC = () => {
  const {
    importFolder,
    importZip,
    importIndividualFiles,
    importedProject,
    selectedManifestPath,
    analyzeManifest,
    loadDemo,
    resetDemoAndProject,
    isAnalyzing,
    zipProgress,
    analysisError,
    clearAnalysisError,
    settings,
    setActiveNav,
  } = useProject();

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const summary = importedProject?.importSummary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            New Local Project Analysis
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Select a local Node.js folder, upload a ZIP archive, or choose individual npm manifest and lockfiles.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isAnalyzing}
            onClick={() => void loadDemo()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
            Load Demo Project
          </button>
          {importedProject && (
            <button
              type="button"
              onClick={resetDemoAndProject}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {analysisError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Import or Parsing Issue</p>
              <p className="mt-1 text-xs opacity-90">{analysisError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearAnalysisError}
            className="text-xs font-medium underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {zipProgress && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-800 dark:text-slate-200">
            <span>{zipProgress.stage}</span>
            <span className="font-mono tabular-nums">{zipProgress.percent}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-cyan-500 transition-all duration-150"
              style={{ width: `${zipProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Three Import Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Folder Selection */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
              <FolderOpen className="h-5 w-5" />
            </div>
            <h2 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Project Folder
            </h2>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Select a local Node.js directory. Automatically skips <code className="font-mono">node_modules</code>, <code className="font-mono">.git</code>, <code className="font-mono">dist</code>, and <code className="font-mono">build</code>.
            </p>
          </div>
          <div className="mt-5">
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is standard in Chromium/Firefox/Safari folder pickers
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void importFolder(e.target.files);
                }
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => folderInputRef.current?.click()}
              className="w-full rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              Select Project Folder
            </button>
          </div>
        </div>

        {/* 2. ZIP Archive */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400">
              <FileArchive className="h-5 w-5" />
            </div>
            <h2 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              ZIP Archive
            </h2>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Extracts locally via JSZip with path-traversal protection and limits ({settings.maxFileSizeMb} MB max archive, {settings.maxZipExpandedSizeMb} MB max extracted).
            </p>
          </div>
          <div className="mt-5">
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void importZip(file);
                }
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => zipInputRef.current?.click()}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Upload ZIP Archive
            </button>
          </div>
        </div>

        {/* 3. Individual Files */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <FileCode2 className="h-5 w-5" />
            </div>
            <h2 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Individual Files
            </h2>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Pick one or more <code className="font-mono">package.json</code>, <code className="font-mono">package-lock.json</code>, or <code className="font-mono">npm-shrinkwrap.json</code> files directly.
            </p>
          </div>
          <div className="mt-5">
            <input
              ref={filesInputRef}
              type="file"
              accept=".json,application/json"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void importIndividualFiles(e.target.files);
                }
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => filesInputRef.current?.click()}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Select Manifest / Lockfiles
            </button>
          </div>
        </div>
      </div>

      {/* Security Guarantee Notice */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>
          SupplyLens never executes uploaded scripts, never runs <code className="font-mono">npm</code> commands, and never transmits files over the network.
        </span>
      </div>

      {/* Import Summary & Discovered Manifests */}
      {summary && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Import Summary: {summary.rootLabel}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  Source: {summary.sourceType.toUpperCase()} · {summary.manifests.length} manifest(s) · {summary.lockfiles.length} lockfile(s) · {formatBytes(summary.totalFileSize)} total inspected
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                  summary.parsedStatus === 'READY'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : summary.parsedStatus === 'PARTIAL'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Status: {summary.parsedStatus}
              </span>
            </div>

            {/* Discovered Manifests Selector */}
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Discovered Package Manifests ({summary.manifests.length})
              </h3>
              {summary.manifests.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  No <code className="font-mono">package.json</code> files were discovered.
                </p>
              ) : (
                <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-md">
                  {summary.manifests.map((m) => {
                    const isSelected = selectedManifestPath === m.path;
                    return (
                      <div
                        key={m.path}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-slate-900 dark:text-slate-100 truncate">
                              {m.path}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600 dark:text-slate-400">
                              {m.isRoot ? 'Root manifest' : 'Nested / Workspace'}
                            </span>
                          </div>
                          <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                            {m.parseError ? (
                              <span className="text-red-600 dark:text-red-400">{m.parseError}</span>
                            ) : (
                              <span>
                                {m.parsed?.name}@{m.parsed?.version} ·{' '}
                                {Object.keys(m.parsed?.dependencies ?? {}).length} runtime ·{' '}
                                {Object.keys(m.parsed?.devDependencies ?? {}).length} dev
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              void analyzeManifest(m.path, undefined, summary.sourceType === 'demo');
                              setActiveNav('overview');
                            }}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {isSelected ? 'Active Target' : 'Analyze Project'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Discovered Lockfiles */}
            <div className="mt-5">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Discovered Lockfiles ({summary.lockfiles.length})
              </h3>
              {summary.lockfiles.length === 0 ? (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  No <code className="font-mono">package-lock.json</code> or <code className="font-mono">npm-shrinkwrap.json</code> found. Analysis runs in Manifest Only mode.
                </p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs font-mono text-slate-700 dark:text-slate-300">
                  {summary.lockfiles.map((l) => (
                    <li key={l.path} className="flex items-center justify-between py-1">
                      <span>{l.path}</span>
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatBytes(l.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Skipped / Unsupported Files */}
            {(summary.skippedFiles.length > 0 || summary.unsupportedFiles.length > 0) && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Skipped Files ({summary.skippedFiles.length})
                  </h3>
                  {summary.skippedFiles.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">None</p>
                  ) : (
                    <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      {summary.skippedFiles.slice(0, 50).map((s, idx) => (
                        <li key={`${s.path}-${idx}`} className="flex justify-between gap-2">
                          <span className="font-mono truncate">{s.path}</span>
                          <span className="shrink-0 text-slate-500">{s.reason}</span>
                        </li>
                      ))}
                      {summary.skippedFiles.length > 50 && (
                        <li className="text-slate-500">
                          ...and {summary.skippedFiles.length - 50} more skipped entries.
                        </li>
                      )}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Non-Manifest / Unsupported Files ({summary.unsupportedFiles.length})
                  </h3>
                  {summary.unsupportedFiles.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">None</p>
                  ) : (
                    <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {summary.unsupportedFiles.slice(0, 50).map((u, idx) => (
                        <li key={`${u}-${idx}`} className="truncate">
                          {u}
                        </li>
                      ))}
                      {summary.unsupportedFiles.length > 50 && (
                        <li className="font-sans">
                          ...and {summary.unsupportedFiles.length - 50} more non-manifest files ignored.
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
