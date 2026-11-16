import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Crosshair,
  Expand,
  EyeOff,
  GitFork,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { DependencyEdge, DependencyType, PackageNode } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { formatDepTypeLabel, getDepTypeTextClass } from '../common/StatusIndicators';

interface PositionedNode {
  node: PackageNode;
  x: number;
  y: number;
  width: number;
  height: number;
  hasHiddenChildren: boolean;
}

const NODE_W = 196;
const NODE_H = 54;
const COL_GAP = 270;
const ROW_GAP = 72;

function getEdgeStrokeColor(type: DependencyType, isUnresolved: boolean): string {
  if (isUnresolved) return '#f59e0b';
  switch (type) {
    case 'DEPENDENCY':
      return '#10b981';
    case 'DEV_DEPENDENCY':
      return '#06b6d4';
    case 'OPTIONAL_DEPENDENCY':
      return '#eab308';
    case 'PEER_DEPENDENCY':
      return '#6366f1';
    case 'WORKSPACE_LINK':
      return '#14b8a6';
  }
}

export const DependencyGraphView: React.FC = () => {
  const {
    analysis,
    settings,
    selectedNodeId,
    setSelectedNodeId,
    inspectPackageInView,
  } = useProject();

  const [maxDepth, setMaxDepth] = useState<number>(settings.defaultGraphDepth);
  const [maxNodes, setMaxNodes] = useState<number>(settings.maxVisibleGraphNodes);
  const [hideDev, setHideDev] = useState<boolean>(settings.defaultHideDev);
  const [enabledTypes, setEnabledTypes] = useState<Record<DependencyType, boolean>>({
    DEPENDENCY: true,
    DEV_DEPENDENCY: true,
    OPTIONAL_DEPENDENCY: true,
    PEER_DEPENDENCY: true,
    WORKSPACE_LINK: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [focusSubtreeRoot, setFocusSubtreeRoot] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<DependencyEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{
    node: PackageNode;
    clientX: number;
    clientY: number;
  } | null>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMaxDepth(settings.defaultGraphDepth);
    setMaxNodes(settings.maxVisibleGraphNodes);
  }, [settings.defaultGraphDepth, settings.maxVisibleGraphNodes]);

  // Reset local collapse/focus when switching projects
  useEffect(() => {
    setCollapsedIds(new Set());
    setFocusSubtreeRoot(null);
    setSelectedEdge(null);
  }, [analysis?.scanId]);

  const layout = useMemo(() => {
    if (!analysis) {
      return {
        positionedNodes: [] as PositionedNode[],
        visibleEdges: [] as DependencyEdge[],
        visibleNodeMap: new Map<string, PositionedNode>(),
        wasTruncated: false,
        totalMatchingCount: 0,
        canvasWidth: 900,
        canvasHeight: 500,
      };
    }

    const { graph } = analysis;
    const startId =
      focusSubtreeRoot && graph.nodes.has(focusSubtreeRoot) ? focusSubtreeRoot : graph.rootId;

    // BFS with filter rules, depth limit, collapse set, and node cap
    const visibleIds = new Set<string>([startId]);
    const nodeRelDepth = new Map<string, number>([[startId, 0]]);
    const bfsQueue: string[] = [startId];
    let totalReachableEstimate = 1;
    let wasTruncated = false;

    const isEdgeAllowed = (edge: DependencyEdge) => {
      if (!enabledTypes[edge.dependencyType]) return false;
      if (hideDev && edge.dependencyType === 'DEV_DEPENDENCY') return false;
      const target = graph.nodes.get(edge.target);
      if (hideDev && target?.isDevelopment) return false;
      return true;
    };

    let qIdx = 0;
    while (qIdx < bfsQueue.length) {
      const currId = bfsQueue[qIdx++];
      const currDepth = nodeRelDepth.get(currId) ?? 0;
      if (currDepth >= maxDepth || collapsedIds.has(currId)) continue;

      const outgoing = graph.edges.filter((e) => e.source === currId && isEdgeAllowed(e));
      for (const edge of outgoing) {
        if (!visibleIds.has(edge.target)) {
          totalReachableEstimate++;
          if (visibleIds.size >= maxNodes) {
            wasTruncated = true;
            continue;
          }
          visibleIds.add(edge.target);
          nodeRelDepth.set(edge.target, currDepth + 1);
          bfsQueue.push(edge.target);
        }
      }
    }

    // Group by relative depth column for clean hierarchical layout
    const columns = new Map<number, PackageNode[]>();
    for (const id of visibleIds) {
      const n = graph.nodes.get(id);
      if (!n) continue;
      const d = nodeRelDepth.get(id) ?? 0;
      if (!columns.has(d)) columns.set(d, []);
      columns.get(d)!.push(n);
    }

    // Sort nodes inside each column deterministically by parent y-order or name
    const positionedNodes: PositionedNode[] = [];
    const visibleNodeMap = new Map<string, PositionedNode>();
    let maxRows = 1;
    const sortedDepths = Array.from(columns.keys()).sort((a, b) => a - b);

    for (const d of sortedDepths) {
      const list = columns.get(d)!;
      list.sort((a, b) => a.name.localeCompare(b.name));
      if (list.length > maxRows) maxRows = list.length;
    }

    const totalHeight = Math.max(480, maxRows * ROW_GAP + 80);

    for (const d of sortedDepths) {
      const list = columns.get(d)!;
      const colHeight = list.length * ROW_GAP;
      const startY = Math.max(40, (totalHeight - colHeight) / 2);

      list.forEach((node, idx) => {
        const x = 40 + d * COL_GAP;
        const y = startY + idx * ROW_GAP;
        const hasChildrenInGraph = graph.edges.some(
          (e) => e.source === node.id && isEdgeAllowed(e),
        );
        const allChildrenVisible = graph.edges
          .filter((e) => e.source === node.id && isEdgeAllowed(e))
          .every((e) => visibleIds.has(e.target));

        const pNode: PositionedNode = {
          node,
          x,
          y,
          width: NODE_W,
          height: NODE_H,
          hasHiddenChildren: hasChildrenInGraph && !allChildrenVisible,
        };
        positionedNodes.push(pNode);
        visibleNodeMap.set(node.id, pNode);
      });
    }

    const visibleEdges = graph.edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target) && isEdgeAllowed(e),
    );

    const maxCol = sortedDepths.length > 0 ? sortedDepths[sortedDepths.length - 1] : 0;
    const canvasWidth = Math.max(820, (maxCol + 1) * COL_GAP + 140);

    return {
      positionedNodes,
      visibleEdges,
      visibleNodeMap,
      wasTruncated,
      totalMatchingCount: totalReachableEstimate,
      canvasWidth,
      canvasHeight: totalHeight,
    };
  }, [analysis, maxDepth, maxNodes, hideDev, enabledTypes, collapsedIds, focusSubtreeRoot]);

  // Ancestor path highlighting for selectedNodeId
  const highlightedIds = useMemo(() => {
    const nodeSet = new Set<string>();
    const edgeSet = new Set<string>();
    if (!analysis || !selectedNodeId || !layout.visibleNodeMap.has(selectedNodeId)) {
      return { nodeSet, edgeSet };
    }

    nodeSet.add(selectedNodeId);
    const queue: string[] = [selectedNodeId];
    const visited = new Set<string>([selectedNodeId]);
    let idx = 0;

    while (idx < queue.length) {
      const curr = queue[idx++];
      for (const edge of layout.visibleEdges) {
        if (edge.target === curr) {
          edgeSet.add(edge.id);
          if (!visited.has(edge.source)) {
            visited.add(edge.source);
            nodeSet.add(edge.source);
            queue.push(edge.source);
          }
        }
      }
    }
    return { nodeSet, edgeSet };
  }, [analysis, selectedNodeId, layout]);

  if (!analysis) {
    return (
      <EmptyState
        title="No Project Loaded for Dependency Graph"
        description="Import a Node.js project or load the built-in demo project to explore interactive direct and transitive dependency relationships."
      />
    );
  }

  const selectedNode = selectedNodeId ? analysis.graph.nodes.get(selectedNodeId) ?? null : null;
  const searchLower = searchTerm.trim().toLowerCase();

  const handleFitScreen = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = (rect.width - 40) / layout.canvasWidth;
    const scaleY = (rect.height - 40) / layout.canvasHeight;
    const fitZoom = Math.max(0.3, Math.min(1.15, Math.min(scaleX, scaleY)));
    setZoom(Number(fitZoom.toFixed(2)));
    setPan({ x: 20, y: 20 });
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 30, y: 30 });
    setFocusSubtreeRoot(null);
    setCollapsedIds(new Set());
  };

  const toggleCollapseNode = (nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const toggleType = (type: DependencyType) => {
    setEnabledTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Highlight package..."
                className="w-44 sm:w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3 text-xs">
              <label htmlFor="graph-depth-range" className="text-slate-600 dark:text-slate-400">
                Depth:
              </label>
              <input
                id="graph-depth-range"
                type="range"
                min={1}
                max={Math.max(2, analysis.graph.metrics.maxDepth || 4)}
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="w-20 accent-emerald-500"
              />
              <span className="font-mono w-4 text-slate-900 dark:text-slate-100 tabular-nums">
                {maxDepth}
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3 text-xs">
              <label htmlFor="graph-max-nodes" className="text-slate-600 dark:text-slate-400">
                Max nodes:
              </label>
              <select
                id="graph-max-nodes"
                value={maxNodes}
                onChange={(e) => setMaxNodes(Number(e.target.value))}
                className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 font-mono text-xs text-slate-900 dark:text-slate-100"
              >
                <option value={50}>50</option>
                <option value={120}>120</option>
                <option value={250}>250</option>
                <option value={400}>400</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
              aria-label="Zoom in"
              className="rounded border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="font-mono text-xs w-11 text-center text-slate-600 dark:text-slate-300 tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.25, Number((z - 0.15).toFixed(2))))}
              aria-label="Zoom out"
              className="rounded border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleFitScreen}
              className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Fit
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Dependency Type Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                'DEPENDENCY',
                'DEV_DEPENDENCY',
                'OPTIONAL_DEPENDENCY',
                'PEER_DEPENDENCY',
                'WORKSPACE_LINK',
              ] as DependencyType[]
            ).map((type) => {
              const active = enabledTypes[type] && !(hideDev && type === 'DEV_DEPENDENCY');
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors border whitespace-nowrap ${
                    active
                      ? 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: getEdgeStrokeColor(type, false) }}
                  />
                  {formatDepTypeLabel(type)}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setHideDev((h) => !h)}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium border transition-colors whitespace-nowrap ${
                hideDev
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <EyeOff className="h-3 w-3" />
              {hideDev ? 'Dev Hidden' : 'Hide Dev'}
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Rendering {layout.positionedNodes.length} nodes · {layout.visibleEdges.length} edges
            {focusSubtreeRoot && (
              <button
                type="button"
                onClick={() => setFocusSubtreeRoot(null)}
                className="ml-3 text-emerald-600 dark:text-emerald-400 underline"
              >
                Exit Subtree Focus
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Large graph / truncation notice */}
      {layout.wasTruncated && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              Graph bounded to {maxNodes} visible nodes for smooth rendering ({analysis.graph.metrics.totalPackageInstances} total resolved packages in project). Reduce depth, collapse branches, or focus a specific node subtree to inspect deeper layers.
            </span>
          </div>
        </div>
      )}

      {/* Main Graph Viewport + Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div
          ref={containerRef}
          className={`xl:col-span-3 relative h-[560px] lg:h-[640px] rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden select-none ${
            settings.theme === 'dark'
              ? 'bg-slate-950 graph-grid-dark'
              : 'bg-slate-50 graph-grid-light'
          } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest('[data-graph-interactive="true"]')) return;
            setIsDragging(true);
            dragOrigin.current = {
              x: e.clientX,
              y: e.clientY,
              panX: pan.x,
              panY: pan.y,
            };
          }}
          onMouseMove={(e) => {
            if (!isDragging || !dragOrigin.current) return;
            const dx = e.clientX - dragOrigin.current.x;
            const dy = e.clientY - dragOrigin.current.y;
            setPan({
              x: dragOrigin.current.panX + dx,
              y: dragOrigin.current.panY + dy,
            });
          }}
          onMouseUp={() => {
            setIsDragging(false);
            dragOrigin.current = null;
          }}
          onMouseLeave={() => {
            setIsDragging(false);
            dragOrigin.current = null;
          }}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.1 : -0.1;
              setZoom((z) => Math.max(0.25, Math.min(2, Number((z + delta).toFixed(2)))));
            }
          }}
        >
          <svg className="w-full h-full">
            <defs>
              <marker
                id="arrow-default"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
              </marker>
              <marker
                id="arrow-highlight"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
              </marker>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {layout.visibleEdges.map((edge) => {
                const src = layout.visibleNodeMap.get(edge.source);
                const tgt = layout.visibleNodeMap.get(edge.target);
                if (!src || !tgt) return null;

                const x1 = src.x + src.width;
                const y1 = src.y + src.height / 2;
                const x2 = tgt.x;
                const y2 = tgt.y + tgt.height / 2;
                const midX = (x1 + x2) / 2;
                const pathD = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

                const isHighlighted =
                  highlightedIds.edgeSet.has(edge.id) || selectedEdge?.id === edge.id;
                const isDimmed =
                  selectedNodeId &&
                  layout.visibleNodeMap.has(selectedNodeId) &&
                  !isHighlighted;

                return (
                  <g
                    key={edge.id}
                    data-graph-interactive="true"
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedEdge(edge);
                    }}
                  >
                    {/* Wider transparent hit target */}
                    <path d={pathD} fill="none" stroke="transparent" strokeWidth={12} />
                    <path
                      d={pathD}
                      fill="none"
                      stroke={getEdgeStrokeColor(edge.dependencyType, edge.isUnresolved)}
                      strokeWidth={isHighlighted ? 2.4 : 1.3}
                      strokeDasharray={edge.isUnresolved ? '5 4' : undefined}
                      strokeOpacity={isDimmed ? 0.16 : isHighlighted ? 1 : 0.55}
                      markerEnd={isHighlighted ? 'url(#arrow-highlight)' : 'url(#arrow-default)'}
                    />
                  </g>
                );
              })}

              {/* Nodes */}
              {layout.positionedNodes.map((p) => {
                const { node } = p;
                const isSelected = selectedNodeId === node.id;
                const isMatch =
                  searchLower.length > 0 && node.name.toLowerCase().includes(searchLower);
                const isInPath = highlightedIds.nodeSet.has(node.id);
                const isDimmed =
                  (searchLower.length > 0 && !isMatch) ||
                  (selectedNodeId &&
                    layout.visibleNodeMap.has(selectedNodeId) &&
                    !isInPath &&
                    !isMatch);

                const isCollapsed = collapsedIds.has(node.id);

                let borderColor = '#334155';
                if (node.nodeType === 'ROOT') borderColor = '#10b981';
                else if (node.nodeType === 'UNRESOLVED') borderColor = '#f59e0b';
                else if (isSelected || isMatch) borderColor = '#22d3ee';
                else if (node.isDirect) borderColor = '#10b981';

                const fillBg =
                  settings.theme === 'dark'
                    ? isSelected
                      ? '#0f2933'
                      : '#0f172a'
                    : isSelected
                      ? '#ecfeff'
                      : '#ffffff';

                const titleColor = settings.theme === 'dark' ? '#f1f5f9' : '#0f172a';
                const subColor = settings.theme === 'dark' ? '#94a3b8' : '#475569';

                return (
                  <g
                    key={node.id}
                    transform={`translate(${p.x}, ${p.y})`}
                    data-graph-interactive="true"
                    className="cursor-pointer"
                    opacity={isDimmed ? 0.25 : 1}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      setSelectedEdge(null);
                    }}
                    onMouseEnter={(e) =>
                      setHoveredNode({ node, clientX: e.clientX, clientY: e.clientY })
                    }
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <rect
                      width={p.width}
                      height={p.height}
                      rx={6}
                      fill={fillBg}
                      stroke={borderColor}
                      strokeWidth={isSelected || isMatch ? 2 : 1.2}
                    />
                    {/* Top accent indicator bar inside node */}
                    <rect
                      x={1}
                      y={1}
                      width={4}
                      height={p.height - 2}
                      rx={2}
                      fill={getEdgeStrokeColor(
                        node.dependencyType,
                        node.nodeType === 'UNRESOLVED',
                      )}
                    />
                    <text
                      x={14}
                      y={22}
                      fontSize={11.5}
                      fontWeight={600}
                      fontFamily="JetBrains Mono, monospace"
                      fill={titleColor}
                    >
                      {node.name.length > 20 ? `${node.name.slice(0, 19)}…` : node.name}
                    </text>
                    <text
                      x={14}
                      y={39}
                      fontSize={10}
                      fontFamily="JetBrains Mono, monospace"
                      fill={subColor}
                    >
                      {node.nodeType === 'ROOT'
                        ? `root · v${node.version}`
                        : node.nodeType === 'UNRESOLVED'
                          ? `unresolved (${node.requestedRange || '*'})`
                          : `v${node.version} · d${node.depth}`}
                    </text>

                    {(node.childIds.length > 0 || p.hasHiddenChildren) && (
                      <g
                        transform={`translate(${p.width - 18}, ${p.height / 2 - 9})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollapseNode(node.id);
                        }}
                      >
                        <rect
                          width={16}
                          height={18}
                          rx={3}
                          fill={settings.theme === 'dark' ? '#1e293b' : '#f1f5f9'}
                          stroke={settings.theme === 'dark' ? '#475569' : '#cbd5e1'}
                        />
                        <text
                          x={8}
                          y={13}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={700}
                          fill={titleColor}
                        >
                          {isCollapsed || p.hasHiddenChildren ? '+' : '−'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Hover Tooltip */}
          {hoveredNode && (
            <div
              className="pointer-events-none fixed z-50 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs shadow-lg"
              style={{
                left: Math.min(window.innerWidth - 260, hoveredNode.clientX + 14),
                top: Math.min(window.innerHeight - 120, hoveredNode.clientY + 14),
              }}
            >
              <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {hoveredNode.node.name}@{hoveredNode.node.version}
              </p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                {formatDepTypeLabel(hoveredNode.node.dependencyType)} · Depth {hoveredNode.node.depth}
              </p>
              {hoveredNode.node.packageLocation && (
                <p className="mt-0.5 font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[230px]">
                  {hoveredNode.node.packageLocation}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Inspector Panel */}
        <aside className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 flex flex-col justify-between">
          {selectedEdge ? (
            <div className="space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
                  Selected Relationship
                </p>
                <h2 className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Dependency Edge
                </h2>
              </div>
              <dl className="space-y-3 text-xs">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Source</dt>
                  <dd className="mt-0.5 font-mono text-slate-900 dark:text-slate-100 break-all">
                    {analysis.graph.nodes.get(selectedEdge.source)?.name ?? selectedEdge.source}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Target</dt>
                  <dd className="mt-0.5 font-mono text-slate-900 dark:text-slate-100 break-all">
                    {analysis.graph.nodes.get(selectedEdge.target)?.name ?? selectedEdge.target}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Dependency Type</dt>
                  <dd className={`mt-0.5 font-medium ${getDepTypeTextClass(selectedEdge.dependencyType)}`}>
                    {formatDepTypeLabel(selectedEdge.dependencyType)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Requested Range</dt>
                  <dd className="mt-0.5 font-mono text-slate-900 dark:text-slate-100">
                    {selectedEdge.requestedRange || 'Not specified'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Resolved Location</dt>
                  <dd className="mt-0.5 font-mono text-slate-700 dark:text-slate-300 break-all">
                    {selectedEdge.resolvedLocation || (selectedEdge.isUnresolved ? 'Unresolved' : '—')}
                  </dd>
                </div>
              </dl>
            </div>
          ) : selectedNode ? (
            <div className="space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedNode.nodeType} · Depth {selectedNode.depth}
                </p>
                <h2 className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 break-all">
                  {selectedNode.name}
                </h2>
                <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  v{selectedNode.version}
                </p>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Type</dt>
                  <dd className={`mt-0.5 font-medium ${getDepTypeTextClass(selectedNode.dependencyType)}`}>
                    {formatDepTypeLabel(selectedNode.dependencyType)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Location</dt>
                  <dd className="mt-0.5 font-mono text-slate-800 dark:text-slate-200 break-all">
                    {selectedNode.packageLocation || '(project root)'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">License Metadata</dt>
                  <dd className="mt-0.5 font-mono text-slate-800 dark:text-slate-200">
                    {selectedNode.license ?? 'Unknown / Missing metadata'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Parents / Children</dt>
                  <dd className="mt-0.5 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {selectedNode.parentIds.length} parent(s) · {selectedNode.childIds.length} child(ren)
                  </dd>
                </div>
              </dl>

              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setFocusSubtreeRoot(
                      focusSubtreeRoot === selectedNode.id ? null : selectedNode.id,
                    )
                  }
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Crosshair className="h-3.5 w-3.5 text-cyan-500" />
                  {focusSubtreeRoot === selectedNode.id ? 'Show Full Graph' : 'Focus Node Subtree'}
                </button>
                {selectedNode.childIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleCollapseNode(selectedNode.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {collapsedIds.has(selectedNode.id) ? (
                      <>
                        <Expand className="h-3.5 w-3.5" /> Expand Branch
                      </>
                    ) : (
                      <>
                        <Minimize2 className="h-3.5 w-3.5" /> Collapse Branch
                      </>
                    )}
                  </button>
                )}
                {selectedNode.nodeType !== 'ROOT' && (
                  <>
                    <button
                      type="button"
                      onClick={() => inspectPackageInView(selectedNode.id, 'paths')}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      <GitFork className="h-3.5 w-3.5" />
                      Trace Dependency Paths
                    </button>
                    <button
                      type="button"
                      onClick={() => inspectPackageInView(selectedNode.id, 'explorer')}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Open in Explorer <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Graph Inspector
              </p>
              <p className="leading-relaxed">
                Click any package node or dependency edge in the SVG canvas to inspect its resolved metadata, highlight upstream paths from the project root, or collapse/expand branches.
              </p>
              <p className="leading-relaxed">
                Drag canvas to pan. Hold <code className="font-mono">Ctrl</code> + scroll or use the toolbar to zoom.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
