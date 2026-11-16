import React, { useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { EmptyState } from '../common/EmptyState';
import { formatDepTypeLabel } from '../common/StatusIndicators';

export const PackageInsightsView: React.FC = () => {
  const { analysis, inspectPackageInView } = useProject();
  const [expandedLicense, setExpandedLicense] = useState<string | null>(null);

  if (!analysis) {
    return (
      <EmptyState
        title="No Project Loaded for Package Insights"
        description="Import a Node.js project or load the demo project to inspect dependency composition, depth distribution, metadata coverage, and license inventory."
      />
    );
  }

  const { insights, licenseInventory } = analysis;
  const maxDepthCount = Math.max(
    1,
    ...insights.depthDistribution.map((d) => d.count),
  );
  const totalComp = Math.max(
    1,
    insights.composition.runtime +
      insights.composition.dev +
      insights.composition.optional +
      insights.composition.peer +
      insights.composition.workspace,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Package Insights &amp; License Inventory
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Structural composition, depth telemetry, and locally recorded metadata coverage.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-2.5 text-right">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Project Analysis Indicator
          </p>
          <p className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {insights.analysisReadinessRatio}%
          </p>
        </div>
      </div>

      {/* Formula explanation */}
      <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
        <Info className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-800 dark:text-slate-200">Indicator Formula:</strong>{' '}
          {insights.readinessFormula}
        </span>
      </div>

      {/* Composition & Depth Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Dependency Composition
          </h2>
          <div className="mt-4 space-y-3 text-xs">
            {[
              { label: 'Runtime Dependencies', count: insights.composition.runtime, color: 'bg-emerald-500' },
              { label: 'Development Dependencies', count: insights.composition.dev, color: 'bg-cyan-500' },
              { label: 'Optional Dependencies', count: insights.composition.optional, color: 'bg-amber-500' },
              { label: 'Peer Dependencies', count: insights.composition.peer, color: 'bg-indigo-500' },
              { label: 'Workspace Packages', count: insights.composition.workspace, color: 'bg-teal-500' },
            ].map((item) => {
              const pct = Math.round((item.count / totalComp) * 100);
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Dependency Depth Distribution
          </h2>
          {insights.depthDistribution.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">No resolved packages.</p>
          ) : (
            <div className="mt-4 space-y-2.5 text-xs">
              {insights.depthDistribution.map((row) => {
                const widthPct = Math.max(4, Math.round((row.count / maxDepthCount) * 100));
                return (
                  <div key={row.depth} className="flex items-center gap-3">
                    <span className="w-16 font-mono text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                      Depth {row.depth}
                    </span>
                    <div className="flex-1 h-5 rounded bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                      <div
                        className="h-full bg-cyan-500/80"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                      {row.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Metadata Coverage & Unresolved References */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Metadata Coverage ({insights.metadataCoverage.total} Packages)
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">With License</p>
              <p className="mt-1 font-mono text-xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {insights.metadataCoverage.withLicense}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">With Integrity</p>
              <p className="mt-1 font-mono text-xl font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">
                {insights.metadataCoverage.withIntegrity}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Missing Both</p>
              <p className="mt-1 font-mono text-xl font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                {insights.metadataCoverage.missingBoth}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Unresolved Relationships ({insights.unresolvedRefs.length})
          </h2>
          {insights.unresolvedRefs.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              All declared relationships in the lockfile resolved to installed records.
            </p>
          ) : (
            <div className="mt-3 max-h-44 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {insights.unresolvedRefs.map((edge) => {
                const src = analysis.graph.nodes.get(edge.source);
                const tgt = analysis.graph.nodes.get(edge.target);
                return (
                  <div key={edge.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {src?.name}
                      </span>
                      <span className="mx-1.5 text-slate-400">→</span>
                      <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                        {tgt?.name}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 shrink-0">
                      {formatDepTypeLabel(edge.dependencyType)} {edge.requestedRange || ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Largest Branches */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
          Largest Direct Dependency Branches
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2 font-medium">Direct Package</th>
                <th className="py-2 font-medium">Version</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium text-right">Reachable Transitives</th>
                <th className="py-2 font-medium text-right">Max Branch Depth</th>
                <th className="py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {insights.largestBranches.map((b) => (
                <tr key={b.nodeId}>
                  <td className="py-2.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                    {b.name}
                  </td>
                  <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">
                    {b.version}
                  </td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-400">
                    {formatDepTypeLabel(b.dependencyType)}
                  </td>
                  <td className="py-2.5 font-mono text-right tabular-nums text-slate-900 dark:text-slate-100">
                    {b.reachableCount}
                  </td>
                  <td className="py-2.5 font-mono text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {b.maxSubDepth}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => inspectPackageInView(b.nodeId, 'graph')}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* License Inventory */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-4">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            License Metadata Inventory
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Extracted strictly from local lockfile <code className="font-mono">license</code> fields. SupplyLens does not infer licenses from package names or provide legal compatibility conclusions. Missing metadata is distinct from an unlicensed package.
          </p>
        </div>

        <div className="flex flex-wrap gap-6 text-xs tabular-nums">
          <span>
            Packages with metadata:{' '}
            <strong className="font-mono text-emerald-600 dark:text-emerald-400">
              {licenseInventory.withLicenseCount}
            </strong>
          </span>
          <span>
            Missing license metadata:{' '}
            <strong className="font-mono text-amber-600 dark:text-amber-400">
              {licenseInventory.missingLicenseCount}
            </strong>
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-md">
          {licenseInventory.entries.map((entry) => {
            const isOpen = expandedLicense === entry.license;
            return (
              <div key={entry.license} className="text-xs">
                <button
                  type="button"
                  onClick={() => setExpandedLicense(isOpen ? null : entry.license)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <span className="inline-flex items-center gap-2 font-mono font-medium text-slate-900 dark:text-slate-100">
                    {entry.isMissing && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                    {entry.license}
                  </span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {entry.count} package(s)
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3.5 py-2.5 max-h-48 overflow-y-auto space-y-1">
                    {entry.packages.map((p) => (
                      <div key={p.id} className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-slate-800 dark:text-slate-200">
                          {p.name}@{p.version}
                        </span>
                        <span className="text-slate-500 truncate max-w-[260px]">{p.location}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
