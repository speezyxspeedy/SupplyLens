import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Info, Search } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { EmptyState } from '../common/EmptyState';
import { formatDepTypeLabel } from '../common/StatusIndicators';

export const DuplicateVersionsView: React.FC = () => {
  const { analysis, inspectPackageInView } = useProject();
  const [search, setSearch] = useState('');
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);

  const multiVersionGroups = useMemo(() => {
    if (!analysis) return [];
    const q = search.trim().toLowerCase();
    return analysis.duplicates
      .filter((d) => d.versions.length > 1)
      .filter((d) => (q ? d.name.toLowerCase().includes(q) : true));
  }, [analysis, search]);

  const multiLocationSameVersion = useMemo(() => {
    if (!analysis) return [];
    const q = search.trim().toLowerCase();
    return analysis.duplicates
      .filter((d) => d.versions.length === 1 && d.instanceCount > 1)
      .filter((d) => (q ? d.name.toLowerCase().includes(q) : true));
  }, [analysis, search]);

  if (!analysis) {
    return (
      <EmptyState
        title="No Project Loaded for Duplicate Analysis"
        description="Import a Node.js project or load the demo project to detect packages installed across multiple versions or nested locations."
      />
    );
  }

  const totalDuplicateInstances = multiVersionGroups.reduce((acc, g) => acc + g.instanceCount, 0);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
          Duplicate Version Detection
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Identifies package names installed in multiple resolved versions or nested <code className="font-mono text-xs">node_modules</code> paths.
        </p>
      </div>

      {/* Honest Observation Disclaimer */}
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-xs text-slate-600 dark:text-slate-300">
        <Info className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          A duplicate package version is a structural observation, not automatically a vulnerability or defect. Different parent packages frequently declare incompatible semantic version ranges that npm legitimately satisfies by nesting separate versions.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Packages with Multiple Versions</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {multiVersionGroups.length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Multi-Version Instances</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">
            {totalDuplicateInstances}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Most Duplicated Package</p>
          <p className="mt-1.5 font-mono text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            {multiVersionGroups[0]
              ? `${multiVersionGroups[0].name} (${multiVersionGroups[0].versions.length} versions)`
              : 'None'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter duplicated packages..."
          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Multi-Version Groups */}
      <div className="space-y-3">
        {multiVersionGroups.length === 0 ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No multi-version duplicate packages detected in this analysis.
          </div>
        ) : (
          multiVersionGroups.map((group) => {
            const isOpen = expandedPkg === group.name || multiVersionGroups.length <= 3;
            return (
              <div
                key={group.name}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedPkg(isOpen ? null : group.name)}
                  className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {group.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
                    <span className="font-mono text-cyan-700 dark:text-cyan-400">
                      {group.versions.join(', ')}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {group.instanceCount} installed instances
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                    {group.instances.map((inst) => (
                      <div key={inst.nodeId} className="p-4 text-xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              v{inst.version}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {inst.location}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {inst.isDirect ? 'Direct' : 'Transitive'} ({formatDepTypeLabel(inst.dependencyType)})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => inspectPackageInView(inst.nodeId, 'paths')}
                            className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                          >
                            Trace Paths
                          </button>
                        </div>

                        {inst.parents.length > 0 && (
                          <div className="text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Parents:</span>{' '}
                            <span className="font-mono">{inst.parents.join(', ')}</span>
                          </div>
                        )}

                        {inst.samplePaths.length > 0 && (
                          <div className="space-y-1">
                            {inst.samplePaths.map((p, idx) => (
                              <div
                                key={idx}
                                className="font-mono text-[11px] text-slate-500 dark:text-slate-400"
                              >
                                Path {idx + 1}: {p.join(' → ')}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Same version in multiple nested paths (if any) */}
      {multiLocationSameVersion.length > 0 && (
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Same Version Installed in Multiple Locations ({multiLocationSameVersion.length})
          </h2>
          <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {multiLocationSameVersion.map((g) => (
              <div key={g.name} className="py-2.5 flex items-center justify-between gap-4">
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  {g.name}@{g.versions[0]}
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {g.instanceCount} locations
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
