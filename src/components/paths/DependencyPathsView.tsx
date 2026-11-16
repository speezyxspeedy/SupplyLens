import React, { useMemo, useState } from 'react';
import { ArrowRight, GitFork, Search } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  buildDownstreamTree,
  DownstreamTreeNode,
  findAllParentPaths,
  findShortestPath,
} from '../../services/pathAnalyzer';
import { EmptyState } from '../common/EmptyState';
import { formatDepTypeLabel, getDepTypeTextClass } from '../common/StatusIndicators';

const DownstreamBranch: React.FC<{ tree: DownstreamTreeNode; depth?: number }> = ({
  tree,
  depth = 0,
}) => {
  return (
    <div className={depth > 0 ? 'ml-5 border-l border-slate-200 dark:border-slate-800 pl-3' : ''}>
      <div className="flex flex-wrap items-center gap-2 py-1 text-xs">
        <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
          {tree.node.name}
        </span>
        <span className="font-mono text-slate-500 dark:text-slate-400">
          v{tree.node.version}
        </span>
        {tree.edge && (
          <span className={`text-[11px] ${getDepTypeTextClass(tree.edge.dependencyType)}`}>
            {formatDepTypeLabel(tree.edge.dependencyType)}
          </span>
        )}
        {tree.isCycleRef && (
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
            (cycle reference)
          </span>
        )}
      </div>
      {tree.children.map((child, idx) => (
        <DownstreamBranch key={`${child.node.id}-${idx}`} tree={child} depth={depth + 1} />
      ))}
    </div>
  );
};

export const DependencyPathsView: React.FC = () => {
  const { analysis, selectedNodeId, setSelectedNodeId, settings } = useProject();
  const [pkgFilter, setPkgFilter] = useState('');

  const selectablePackages = useMemo(() => {
    if (!analysis) return [];
    const q = pkgFilter.trim().toLowerCase();
    return analysis.graph.nodeList
      .filter((n) => n.nodeType !== 'ROOT')
      .filter((n) =>
        q ? `${n.name} ${n.version} ${n.packageLocation}`.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [analysis, pkgFilter]);

  const targetId = useMemo(() => {
    if (!analysis) return null;
    if (
      selectedNodeId &&
      analysis.graph.nodes.has(selectedNodeId) &&
      analysis.graph.nodes.get(selectedNodeId)?.nodeType !== 'ROOT'
    ) {
      return selectedNodeId;
    }
    // Prefer a depth >= 2 package by default so path tracing is immediately informative
    const transitive = analysis.graph.nodeList.find((n) => n.depth >= 2);
    return (transitive ?? selectablePackages[0])?.id ?? null;
  }, [analysis, selectedNodeId, selectablePackages]);

  const pathAnalysis = useMemo(() => {
    if (!analysis || !targetId) return null;
    const targetNode = analysis.graph.nodes.get(targetId);
    if (!targetNode) return null;

    const shortest = findShortestPath(analysis.graph, targetId);
    const allPaths = findAllParentPaths(
      analysis.graph,
      targetId,
      settings.maxPathResults,
      settings.maxPathDepth,
    );
    const downstream = buildDownstreamTree(analysis.graph, targetId, 4);
    const incomingEdges = analysis.graph.edges.filter((e) => e.target === targetId);

    return {
      targetNode,
      shortest,
      allPaths,
      downstream,
      incomingEdges,
    };
  }, [analysis, targetId, settings.maxPathResults, settings.maxPathDepth]);

  if (!analysis) {
    return (
      <EmptyState
        title="No Project Loaded for Path Tracing"
        description="Import a Node.js project or load the demo project to trace shortest paths and parent chains from root."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
          Dependency Path Explorer
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Select any installed package instance to inspect how it enters your project (bounded to {settings.maxPathResults} paths and depth {settings.maxPathDepth} with cycle protection).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        {/* Package Picker */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              value={pkgFilter}
              onChange={(e) => setPkgFilter(e.target.value)}
              placeholder="Select package..."
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
            {selectablePackages.map((pkg) => {
              const active = pkg.id === targetId;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedNodeId(pkg.id)}
                  className={`w-full px-2.5 py-2 text-left text-xs transition-colors ${
                    active
                      ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-medium truncate">{pkg.name}</span>
                    <span className="font-mono text-[11px] text-slate-500 shrink-0">
                      {pkg.version}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400 truncate">
                    {pkg.packageLocation || '(workspace)'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paths Display */}
        <div className="lg:col-span-3 space-y-5">
          {pathAnalysis ? (
            <>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100">
                      {pathAnalysis.targetNode.name}@{pathAnalysis.targetNode.version}
                    </h2>
                    <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {pathAnalysis.targetNode.packageLocation} · Depth {pathAnalysis.targetNode.depth}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                    <GitFork className="h-3.5 w-3.5 text-emerald-500" />
                    {pathAnalysis.allPaths.paths.length} parent path(s) found
                  </span>
                </div>
              </div>

              {/* Shortest Path */}
              {pathAnalysis.shortest && (
                <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Shortest Path from Root
                  </h3>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {pathAnalysis.shortest.steps.map((step, idx) => (
                      <React.Fragment key={`${step.nodeId}-${idx}`}>
                        {idx > 0 && (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <ArrowRight className="h-3.5 w-3.5" />
                            {step.requestedRange && (
                              <span className="font-mono text-[10px] text-slate-500">
                                ({step.requestedRange})
                              </span>
                            )}
                          </span>
                        )}
                        <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5">
                          <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                            {step.name}
                          </span>
                          <span className="ml-1.5 font-mono text-[11px] text-slate-500">
                            v{step.version}
                          </span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </section>
              )}

              {/* All Parent Paths */}
              <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    All Resolved Parent Paths ({pathAnalysis.allPaths.paths.length})
                  </h3>
                  {pathAnalysis.allPaths.hitLimit && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Result cap reached ({settings.maxPathResults} paths)
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-3">
                  {pathAnalysis.allPaths.paths.map((path, pIdx) => (
                    <div
                      key={pIdx}
                      className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3 space-y-1.5"
                    >
                      {path.steps.map((step, sIdx) => (
                        <div
                          key={`${step.nodeId}-${sIdx}`}
                          style={{ paddingLeft: `${sIdx * 16}px` }}
                          className="flex flex-wrap items-center gap-2 text-xs"
                        >
                          <span className="text-slate-400">{sIdx === 0 ? '●' : '↳'}</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                            {step.name}
                          </span>
                          <span className="font-mono text-slate-500">v{step.version}</span>
                          {step.dependencyType && (
                            <span className={`text-[11px] ${getDepTypeTextClass(step.dependencyType)}`}>
                              {formatDepTypeLabel(step.dependencyType)}
                            </span>
                          )}
                          {step.requestedRange && (
                            <span className="font-mono text-[11px] text-slate-500">
                              req {step.requestedRange}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              {/* Incoming & Downstream */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Direct Incoming Dependents ({pathAnalysis.incomingEdges.length})
                  </h3>
                  <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
                    {pathAnalysis.incomingEdges.map((edge) => {
                      const src = analysis.graph.nodes.get(edge.source);
                      return (
                        <div key={edge.id} className="py-2 text-xs flex items-center justify-between gap-2">
                          <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                            {src ? `${src.name}@${src.version}` : edge.source}
                          </span>
                          <span className="font-mono text-slate-500 shrink-0">
                            {edge.requestedRange || formatDepTypeLabel(edge.dependencyType)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Downstream Dependency Subtree
                  </h3>
                  <div className="mt-3 max-h-64 overflow-y-auto">
                    {pathAnalysis.downstream && pathAnalysis.downstream.children.length > 0 ? (
                      <DownstreamBranch tree={pathAnalysis.downstream} />
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Leaf package — no downstream dependencies.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Select a package to trace its paths.</p>
          )}
        </div>
      </div>
    </div>
  );
};
