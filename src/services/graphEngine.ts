import {
  DependencyGraph,
  GraphMetrics,
  PackageNode,
} from '../types';
import { ResolutionOutput } from './dependencyResolver';

export function buildDependencyGraph(resolution: ResolutionOutput): DependencyGraph {
  const { rootId, nodes, edges } = resolution;

  // Reset adjacency lists before populating cleanly from edges
  for (const node of nodes.values()) {
    node.parentIds = [];
    node.childIds = [];
  }

  const parentSets = new Map<string, Set<string>>();
  const childSets = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) continue;

    if (!childSets.has(edge.source)) childSets.set(edge.source, new Set());
    childSets.get(edge.source)!.add(edge.target);

    if (!parentSets.has(edge.target)) parentSets.set(edge.target, new Set());
    parentSets.get(edge.target)!.add(edge.source);
  }

  for (const [id, node] of nodes.entries()) {
    node.parentIds = Array.from(parentSets.get(id) ?? []);
    node.childIds = Array.from(childSets.get(id) ?? []);
  }

  // BFS from root to compute exact shortest depth for every node (cycle-safe)
  const depths = new Map<string, number>();
  depths.set(rootId, 0);
  const bfsQueue: string[] = [rootId];
  let qIdx = 0;

  while (qIdx < bfsQueue.length) {
    const currId = bfsQueue[qIdx++];
    const currDepth = depths.get(currId) ?? 0;
    const currNode = nodes.get(currId);
    if (!currNode) continue;

    for (const childId of currNode.childIds) {
      if (!depths.has(childId)) {
        depths.set(childId, currDepth + 1);
        bfsQueue.push(childId);
      }
    }
  }

  for (const [id, node] of nodes.entries()) {
    node.depth = depths.get(id) ?? (id === rootId ? 0 : 1);
  }

  const nodeList: PackageNode[] = Array.from(nodes.values());

  // Third-party resolved package instances (exclude ROOT and UNRESOLVED placeholders)
  const resolvedPackages = nodeList.filter(
    (n) => n.nodeType !== 'ROOT' && n.nodeType !== 'UNRESOLVED',
  );

  const uniqueNames = new Set(resolvedPackages.map((n) => n.name));
  const rootNode = nodes.get(rootId);
  const rootLevelCount = rootNode
    ? rootNode.childIds.filter((cid) => nodes.get(cid)?.nodeType !== 'UNRESOLVED').length
    : 0;

  let directCount = 0;
  let transitiveCount = 0;
  let runtimeCount = 0;
  let devCount = 0;
  let optionalCount = 0;
  let peerCount = 0;
  let workspaceCount = 0;
  let maxDepth = 0;

  const depthDistribution: Record<number, number> = {};

  for (const pkg of resolvedPackages) {
    if (pkg.isDirect) directCount++;
    else transitiveCount++;

    if (pkg.isWorkspace) workspaceCount++;
    if (pkg.isDevelopment) devCount++;
    else if (pkg.isOptional) optionalCount++;
    else if (pkg.isPeer) peerCount++;
    else runtimeCount++;

    if (pkg.depth > maxDepth) maxDepth = pkg.depth;
    depthDistribution[pkg.depth] = (depthDistribution[pkg.depth] ?? 0) + 1;
  }

  const unresolvedEdgeCount = edges.filter((e) => e.isUnresolved).length;

  const metrics: GraphMetrics = {
    totalPackageInstances: resolvedPackages.length,
    uniquePackageNames: uniqueNames.size,
    directCount,
    transitiveCount,
    runtimeCount,
    devCount,
    optionalCount,
    peerCount,
    workspaceCount,
    unresolvedCount: unresolvedEdgeCount,
    maxDepth,
    rootLevelCount,
  };

  return {
    rootId,
    nodes,
    nodeList,
    edges,
    metrics,
    depthDistribution,
  };
}
