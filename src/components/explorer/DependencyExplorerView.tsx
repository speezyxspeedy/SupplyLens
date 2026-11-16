import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, GitFork, Network, Search } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { DependencyType, PackageNode } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { formatDepTypeLabel, getDepTypeTextClass } from '../common/StatusIndicators';

type SortField = 'name' | 'version' | 'depth' | 'children' | 'location';
type ScopeFilter = 'all' | 'direct' | 'transitive' | 'workspace' | 'unresolved';

export const DependencyExplorerView: React.FC = () => {
  const {
    analysis,
    globalSearch,
    selectedNodeId,
    setSelectedNodeId,
    inspectPackageInView,
    settings,
  } = useProject();

  const [query, setQuery] = useState(globalSearch);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(
    settings.defaultFilterDirectOnly ? 'direct' : 'all',
  );
  const [typeFilter, setTypeFilter] = useState<'ALL' | DependencyType>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    if (globalSearch) {
      setQuery(globalSearch);
    }
  }, [globalSearch]);

  const rows = useMemo(() => {
    if (!analysis) return [];
    const q = query.trim().toLowerCase();

    const filtered = analysis.graph.nodeList.filter((n) => {
      if (n.nodeType === 'ROOT') return false;
      if (scopeFilter === 'direct' && !n.isDirect) return false;
      if (scopeFilter === 'transitive' && (n.isDirect || n.nodeType === 'UNRESOLVED')) return false;
      if (scopeFilter === 'workspace' && !n.isWorkspace) return false;
      if (scopeFilter === 'unresolved' && n.nodeType !== 'UNRESOLVED') return false;
      if (typeFilter !== 'ALL' && n.dependencyType !== typeFilter) return false;

      if (q) {
        const hay = `${n.name} ${n.version} ${n.packageLocation} ${n.license ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'version':
          cmp = a.version.localeCompare(b.version);
          break;
        case 'depth':
          cmp = a.depth - b.depth;
          break;
        case 'children':
          cmp = a.childIds.length - b.childIds.length;
          break;
        case 'location':
          cmp = a.packageLocation.localeCompare(b.packageLocation);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  }, [analysis, query, scopeFilter, typeFilter, sortField, sortAsc]);

  if (!analysis) {
    return (
      <EmptyState
        title="No Dependency Data to Explore"
        description="Import a project or load the demo project to search, filter, and inspect every resolved package instance."
      />
    );
  }

  const activeNode: PackageNode | null =
    selectedNodeId && analysis.graph.nodes.get(selectedNodeId)?.nodeType !== 'ROOT'
      ? analysis.graph.nodes.get(selectedNodeId) ?? null
      : rows[0] ?? null;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((a) => !a);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Dependency Explorer
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Showing {rows.length} of {analysis.graph.nodeList.length - 1} package entries (each version/location is listed separately)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name, version, path..."
              className="w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-950 p-1">
            {(['all', 'direct', 'transitive', 'workspace', 'unresolved'] as ScopeFilter[]).map(
              (scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setScopeFilter(scope)}
                  className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                    scopeFilter === scope
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {scope}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="explorer-type-filter" className="text-slate-500 dark:text-slate-400">
            Type:
          </label>
          <select
            id="explorer-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | DependencyType)}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">All types</option>
            <option value="DEPENDENCY">Runtime</option>
            <option value="DEV_DEPENDENCY">Development</option>
            <option value="OPTIONAL_DEPENDENCY">Optional</option>
            <option value="PEER_DEPENDENCY">Peer</option>
            <option value="WORKSPACE_LINK">Workspace</option>
          </select>
        </div>
      </div>

      {/* Table + Detail Split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto max-h-[620px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Package <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort('version')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Version <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-medium">Type</th>
                  <th className="py-2.5 px-3 font-medium">Scope</th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('depth')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Depth <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('children')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Deps <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-medium">License</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500 dark:text-slate-400">
                      No packages match your current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((pkg) => {
                    const isSelected = activeNode?.id === pkg.id;
                    const firstParent =
                      pkg.parentIds.length > 0
                        ? analysis.graph.nodes.get(pkg.parentIds[0])?.name
                        : undefined;
                    return (
                      <tr
                        key={pkg.id}
                        onClick={() => setSelectedNodeId(pkg.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/10'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-medium text-slate-900 dark:text-slate-100">
                            {pkg.name}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                            {pkg.packageLocation || firstParent || '—'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {pkg.version}
                        </td>
                        <td className={`py-2.5 px-3 whitespace-nowrap font-medium ${getDepTypeTextClass(pkg.dependencyType)}`}>
                          {formatDepTypeLabel(pkg.dependencyType)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {pkg.nodeType === 'UNRESOLVED'
                            ? 'Unresolved'
                            : pkg.isWorkspace
                              ? 'Workspace'
                              : pkg.isDirect
                                ? 'Direct'
                                : 'Transitive'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {pkg.depth}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {pkg.childIds.length}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {pkg.license ?? 'Missing'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        <aside className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-4">
          {activeNode ? (
            <>
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeNode.isDirect ? 'Direct Dependency' : 'Transitive Package'} · Depth{' '}
                  {activeNode.depth}
                </p>
                <h2 className="mt-1 font-mono text-base font-semibold text-slate-900 dark:text-slate-100 break-all">
                  {activeNode.name}
                </h2>
                <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  {activeNode.version}
                </p>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Package Location</dt>
                  <dd className="mt-0.5 font-mono text-slate-800 dark:text-slate-200 break-all">
                    {activeNode.packageLocation || '—'}
                  </dd>
                </div>
                {activeNode.requestedRange && (
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Requested Version Range</dt>
                    <dd className="mt-0.5 font-mono text-slate-800 dark:text-slate-200">
                      {activeNode.requestedRange}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Resolution Status</dt>
                  <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                    {activeNode.nodeType === 'UNRESOLVED'
                      ? 'Unresolved in lockfile'
                      : analysis.analysisMode === 'MANIFEST_ONLY'
                        ? 'Declared only (no lockfile)'
                        : 'Resolved from lockfile'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">License Metadata</dt>
                  <dd className="mt-0.5 font-mono text-slate-800 dark:text-slate-200">
                    {activeNode.license ?? 'Unknown / Missing metadata'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Integrity Hash</dt>
                  <dd className="mt-0.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
                    {activeNode.integrity ?? 'Not recorded in lockfile'}
                  </dd>
                </div>
              </dl>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Parent Packages ({activeNode.parentIds.length})
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {activeNode.parentIds.map((pid) => {
                    const p = analysis.graph.nodes.get(pid);
                    if (!p) return null;
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => {
                          if (p.nodeType !== 'ROOT') setSelectedNodeId(p.id);
                        }}
                        className="block w-full text-left font-mono text-[11px] text-cyan-700 dark:text-cyan-400 hover:underline truncate"
                      >
                        ← {p.name}@{p.version}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Outgoing Dependencies ({activeNode.childIds.length})
                </p>
                {activeNode.childIds.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">None</p>
                ) : (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {activeNode.childIds.map((cid) => {
                      const c = analysis.graph.nodes.get(cid);
                      if (!c) return null;
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => setSelectedNodeId(c.id)}
                          className="block w-full text-left font-mono text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline truncate"
                        >
                          → {c.name}@{c.version}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => inspectPackageInView(activeNode.id, 'paths')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 whitespace-nowrap"
                >
                  <GitFork className="h-3.5 w-3.5" />
                  Trace Paths
                </button>
                <button
                  type="button"
                  onClick={() => inspectPackageInView(activeNode.id, 'graph')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <Network className="h-3.5 w-3.5" />
                  View in Graph
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a package row to inspect its relationships and metadata.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};
