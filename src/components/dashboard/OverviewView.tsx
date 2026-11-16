import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Copy,
  FileJson,
  FolderOpen,
  GitFork,
  Network,
  Play,
  Upload,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { SeverityIndicator } from '../common/StatusIndicators';

function formatModeLabel(mode: string): string {
  switch (mode) {
    case 'LOCKFILE_V3':
      return 'npm lockfile v3';
    case 'LOCKFILE_V2':
      return 'npm lockfile v2';
    case 'LOCKFILE_V1':
      return 'npm lockfile v1';
    case 'SHRINKWRAP':
      return 'npm-shrinkwrap.json';
    case 'MANIFEST_ONLY':
      return 'Manifest Only (No Lockfile)';
    default:
      return mode;
  }
}

export const OverviewView: React.FC = () => {
  const {
    analysis,
    importedProject,
    selectedManifestPath,
    analyzeManifest,
    setActiveNav,
    loadDemo,
    isAnalyzing,
  } = useProject();

  if (!analysis) {
    return (
      <div className="space-y-8">
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 sm:p-10">
          <div className="max-w-3xl">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Local-First npm Dependency Intelligence
            </p>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 [text-wrap:balance]">
              Understand every dependency in your project.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              SupplyLens parses your local <code className="font-mono text-xs text-slate-800 dark:text-slate-200">package.json</code> and{' '}
              <code className="font-mono text-xs text-slate-800 dark:text-slate-200">package-lock.json</code>{' '}
              directly inside your browser to map direct and transitive dependency graphs, uncover duplicate package versions, trace dependency paths, and export machine-readable component inventories.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveNav('import')}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors whitespace-nowrap"
              >
                <Upload className="h-4 w-4" />
                Select Project Folder, ZIP, or Files
              </button>
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => void loadDemo()}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <Play className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                Load Demo Project
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5">
            <FolderOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              1. Local File &amp; Lockfile Parsing
            </h2>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Import a folder, ZIP archive, or individual manifests. Supports npm lockfile v1, v2, v3, and shrinkwrap with zero external uploads.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5">
            <Network className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <h2 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              2. Graph &amp; Path Resolution
            </h2>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Resolves nested <code className="font-mono">node_modules</code> ancestor lookups, preserves separate package versions, and traces how any transitive package enters your tree.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5">
            <FileJson className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              3. Health &amp; Inventory Export
            </h2>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Inspect manifest/lockfile consistency, review declared license metadata, and export JSON, formula-safe CSV, or printable HTML inventories.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const { metrics } = analysis.graph;
  const multiVersionDuplicates = analysis.duplicates.filter((d) => d.versions.length > 1);
  const manifests = importedProject?.importSummary.manifests ?? [];

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{formatModeLabel(analysis.analysisMode)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{analysis.selectedManifestPath}</span>
            {analysis.selectedLockfilePath && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{analysis.selectedLockfilePath}</span>
              </>
            )}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            {analysis.projectName}{' '}
            <span className="font-mono text-base font-normal text-slate-500 dark:text-slate-400 tabular-nums">
              v{analysis.projectVersion}
            </span>
          </h1>
          {analysis.manifest.description && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {analysis.manifest.description}
            </p>
          )}
        </div>

        {manifests.length > 1 && (
          <div className="shrink-0">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Workspace / Manifest Target
            </label>
            <select
              value={selectedManifestPath ?? ''}
              onChange={(e) => void analyzeManifest(e.target.value, undefined, analysis.isDemo)}
              className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              {manifests.map((m) => (
                <option key={m.path} value={m.path}>
                  {m.path} {m.parsed?.name ? `(${m.parsed.name})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Manifest Only notice */}
      {analysis.analysisMode === 'MANIFEST_ONLY' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Manifest Only Mode — Resolved Tree Unavailable</p>
            <p className="mt-1 text-xs opacity-90 leading-relaxed">
              No supported lockfile was found alongside <code className="font-mono">{analysis.selectedManifestPath}</code>. SupplyLens displays declared direct dependencies and version ranges from <code className="font-mono">package.json</code> without fabricating resolved versions or transitive trees.
            </p>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Package Instances</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {metrics.totalPackageInstances}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {metrics.uniquePackageNames} unique names
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Direct Dependencies</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {metrics.directCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {metrics.runtimeCount} runtime · {metrics.devCount} dev
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Transitive Packages</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">
            {metrics.transitiveCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Max depth {metrics.maxDepth}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Duplicate Versions</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {multiVersionDuplicates.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            packages with &gt;1 version
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Unresolved Refs</p>
          <p
            className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${
              metrics.unresolvedCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {metrics.unresolvedCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {metrics.optionalCount} optional · {metrics.peerCount} peer
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">License Coverage</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {analysis.licenseInventory.totalEvaluated > 0
              ? `${Math.round(
                  (analysis.licenseInventory.withLicenseCount /
                    analysis.licenseInventory.totalEvaluated) *
                    100,
                )}%`
              : '0%'}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {analysis.licenseInventory.withLicenseCount} of {analysis.licenseInventory.totalEvaluated}
          </p>
        </div>
      </div>

      {/* Quick Actions & Top Summary Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Largest Branches */}
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Largest Direct Dependency Branches
            </h2>
            <button
              type="button"
              onClick={() => setActiveNav('graph')}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              Open Graph <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {analysis.insights.largestBranches.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              No direct dependencies resolved.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
              {analysis.insights.largestBranches.slice(0, 6).map((b) => (
                <div key={b.nodeId} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="min-w-0 pr-4">
                    <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                      {b.name}
                    </span>
                    <span className="ml-2 font-mono text-slate-500 dark:text-slate-400">
                      {b.version}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 tabular-nums text-slate-600 dark:text-slate-400">
                    <span>{b.reachableCount} transitive</span>
                    <span className="font-mono">depth {b.maxSubDepth}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Health Findings Preview */}
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Manifest &amp; Lockfile Health
            </h2>
            <button
              type="button"
              onClick={() => setActiveNav('health')}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              View All ({analysis.healthFindings.length}) <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {analysis.healthFindings.length === 0 ? (
            <p className="mt-4 text-xs text-emerald-600 dark:text-emerald-400">
              No manifest or lockfile inconsistencies detected.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
              {analysis.healthFindings.slice(0, 5).map((f) => (
                <div key={f.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                      {f.title}
                    </span>
                    <SeverityIndicator severity={f.severity} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Duplicate Versions & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Multi-Version Packages
            </h2>
            <button
              type="button"
              onClick={() => setActiveNav('duplicates')}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              Analyze Duplicates <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {multiVersionDuplicates.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              No package names appear in multiple resolved versions.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2 font-medium">Package</th>
                    <th className="py-2 font-medium">Detected Versions</th>
                    <th className="py-2 font-medium text-right">Instances</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {multiVersionDuplicates.slice(0, 5).map((dup) => (
                    <tr key={dup.name}>
                      <td className="py-2.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                        {dup.name}
                      </td>
                      <td className="py-2.5 font-mono text-cyan-700 dark:text-cyan-400">
                        {dup.versions.join(', ')}
                      </td>
                      <td className="py-2.5 font-mono text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {dup.instanceCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Workspace Shortcuts
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Jump directly to detailed inspection workflows.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setActiveNav('explorer')}
                className="w-full flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
              >
                <span>Browse Dependency Table</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => setActiveNav('paths')}
                className="w-full flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <GitFork className="h-3.5 w-3.5 text-cyan-500" />
                  Trace Dependency Paths
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => setActiveNav('duplicates')}
                className="w-full flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Copy className="h-3.5 w-3.5 text-emerald-500" />
                  Inspect Duplicate Versions
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => setActiveNav('reports')}
                className="w-full flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
              >
                <span>Export JSON / CSV / HTML Inventory</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
