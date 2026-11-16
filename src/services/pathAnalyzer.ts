import {
  DependencyEdge,
  DependencyGraph,
  PackageNode,
  PathResult,
  PathStep,
} from '../types';

function findEdgeBetween(
  graph: DependencyGraph,
  sourceId: string,
  targetId: string,
): DependencyEdge | undefined {
  return graph.edges.find((e) => e.source === sourceId && e.target === targetId);
}

function buildSteps(graph: DependencyGraph, nodeIds: string[]): PathStep[] {
  const steps: PathStep[] = [];
  for (let i = 0; i < nodeIds.length; i++) {
    const id = nodeIds[i];
    const node = graph.nodes.get(id);
    if (!node) continue;
    const prevEdge = i > 0 ? findEdgeBetween(graph, nodeIds[i - 1], id) : undefined;
    steps.push({
      nodeId: node.id,
      name: node.name,
      version: node.version,
      location: node.packageLocation || '(root)',
      dependencyType: prevEdge?.dependencyType,
      requestedRange: prevEdge?.requestedRange,
      isUnresolved: node.nodeType === 'UNRESOLVED',
    });
  }
  return steps;
}

export function findShortestPath(
  graph: DependencyGraph,
  targetNodeId: string,
): PathResult | null {
  if (!graph.nodes.has(targetNodeId)) return null;
  if (targetNodeId === graph.rootId) {
    return { steps: buildSteps(graph, [graph.rootId]), truncated: false };
  }

  const parentPointer = new Map<string, string>();
  const visited = new Set<string>([graph.rootId]);
  const queue: string[] = [graph.rootId];
  let idx = 0;

  while (idx < queue.length) {
    const curr = queue[idx++];
    const node = graph.nodes.get(curr);
    if (!node) continue;

    for (const childId of node.childIds) {
      if (visited.has(childId)) continue;
      visited.add(childId);
      parentPointer.set(childId, curr);
      if (childId === targetNodeId) {
        // Reconstruct path
        const pathIds: string[] = [targetNodeId];
        let walk = targetNodeId;
        while (parentPointer.has(walk)) {
          walk = parentPointer.get(walk)!;
          pathIds.push(walk);
        }
        pathIds.reverse();
        return { steps: buildSteps(graph, pathIds), truncated: false };
      }
      queue.push(childId);
    }
  }

  return null;
}

export function findAllParentPaths(
  graph: DependencyGraph,
  targetNodeId: string,
  maxPaths = 20,
  maxDepth = 12,
): { paths: PathResult[]; hitLimit: boolean } {
  if (!graph.nodes.has(targetNodeId)) {
    return { paths: [], hitLimit: false };
  }
  if (targetNodeId === graph.rootId) {
    return {
      paths: [{ steps: buildSteps(graph, [graph.rootId]), truncated: false }],
      hitLimit: false,
    };
  }

  const results: PathResult[] = [];
  let hitLimit = false;

  // Walk backwards from targetNodeId via parentIds up to rootId with cycle prevention
  const currentReversed: string[] = [targetNodeId];
  const inPath = new Set<string>([targetNodeId]);

  function dfsUp(nodeId: string, depth: number) {
    if (results.length >= maxPaths) {
      hitLimit = true;
      return;
    }

    if (nodeId === graph.rootId) {
      const forwardIds = [...currentReversed].reverse();
      results.push({
        steps: buildSteps(graph, forwardIds),
        truncated: false,
      });
      return;
    }

    if (depth >= maxDepth) {
      hitLimit = true;
      return;
    }

    const node = graph.nodes.get(nodeId);
    if (!node) return;

    for (const parentId of node.parentIds) {
      if (results.length >= maxPaths) {
        hitLimit = true;
        break;
      }
      if (inPath.has(parentId)) {
        // Cycle detected on upward traversal; skip cleanly
        continue;
      }
      inPath.add(parentId);
      currentReversed.push(parentId);
      dfsUp(parentId, depth + 1);
      currentReversed.pop();
      inPath.delete(parentId);
    }
  }

  dfsUp(targetNodeId, 0);

  // Sort shortest paths first
  results.sort((a, b) => a.steps.length - b.steps.length);

  return { paths: results, hitLimit };
}

export interface DownstreamTreeNode {
  node: PackageNode;
  edge?: DependencyEdge;
  isCycleRef: boolean;
  children: DownstreamTreeNode[];
}

export function buildDownstreamTree(
  graph: DependencyGraph,
  startNodeId: string,
  maxDepth = 4,
): DownstreamTreeNode | null {
  const startNode = graph.nodes.get(startNodeId);
  if (!startNode) return null;

  const ancestorPath = new Set<string>([startNodeId]);

  function buildSubtree(
    nodeId: string,
    depth: number,
    viaEdge?: DependencyEdge,
  ): DownstreamTreeNode {
    const node = graph.nodes.get(nodeId)!;
    if (depth >= maxDepth) {
      return { node, edge: viaEdge, isCycleRef: false, children: [] };
    }

    const children: DownstreamTreeNode[] = [];
    for (const childId of node.childIds) {
      const childNode = graph.nodes.get(childId);
      if (!childNode) continue;
      const edge = findEdgeBetween(graph, nodeId, childId);

      if (ancestorPath.has(childId)) {
        children.push({
          node: childNode,
          edge,
          isCycleRef: true,
          children: [],
        });
        continue;
      }

      ancestorPath.add(childId);
      children.push(buildSubtree(childId, depth + 1, edge));
      ancestorPath.delete(childId);
    }

    return {
      node,
      edge: viaEdge,
      isCycleRef: false,
      children,
    };
  }

  return buildSubtree(startNodeId, 0);
}
