import {
  AnalysisMode,
  BranchSummary,
  DependencyGraph,
  DuplicateGroup,
  InsightsData,
} from '../types';

export function computeInsights(
  graph: DependencyGraph,
  duplicates: DuplicateGroup[],
  analysisMode: AnalysisMode,
): InsightsData {
  const resolvedNodes = graph.nodeList.filter(
    (n) => n.nodeType !== 'ROOT' && n.nodeType !== 'UNRESOLVED',
  );

  // Depth distribution
  const depthDistribution = Object.entries(graph.depthDistribution)
    .map(([d, count]) => ({ depth: Number(d), count }))
    .sort((a, b) => a.depth - b.depth);

  // Largest reachable dependency branches from direct dependencies
  const directNodes = resolvedNodes.filter((n) => n.isDirect);
  const largestBranches: BranchSummary[] = [];

  for (const dirNode of directNodes) {
    const visited = new Set<string>([dirNode.id]);
    const queue: { id: string; subDepth: number }[] = [{ id: dirNode.id, subDepth: 0 }];
    let qIdx = 0;
    let maxSubDepth = 0;

    while (qIdx < queue.length) {
      const curr = queue[qIdx++];
      if (curr.subDepth > maxSubDepth) maxSubDepth = curr.subDepth;
      const node = graph.nodes.get(curr.id);
      if (!node) continue;

      for (const childId of node.childIds) {
        const child = graph.nodes.get(childId);
        if (!child || child.nodeType === 'UNRESOLVED') continue;
        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push({ id: childId, subDepth: curr.subDepth + 1 });
        }
      }
    }

    largestBranches.push({
      nodeId: dirNode.id,
      name: dirNode.name,
      version: dirNode.version,
      dependencyType: dirNode.dependencyType,
      reachableCount: visited.size - 1, // transitive packages reachable under this direct dependency
      maxSubDepth,
    });
  }

  largestBranches.sort((a, b) => {
    if (b.reachableCount !== a.reachableCount) return b.reachableCount - a.reachableCount;
    return a.name.localeCompare(b.name);
  });

  // Metadata coverage
  let withLicense = 0;
  let withIntegrity = 0;
  let missingBoth = 0;

  for (const node of resolvedNodes) {
    const hasLic = Boolean(node.license);
    const hasInt = Boolean(node.integrity);
    if (hasLic) withLicense++;
    if (hasInt) withIntegrity++;
    if (!hasLic && !hasInt) missingBoth++;
  }

  const totalEdges = graph.edges.length;
  const unresolvedRefs = graph.edges.filter((e) => e.isUnresolved);
  const resolvedEdges = totalEdges - unresolvedRefs.length;

  const totalPkg = resolvedNodes.length;
  const lockfileFactor = analysisMode === 'MANIFEST_ONLY' ? 0 : 1;
  const edgeRatio = totalEdges > 0 ? resolvedEdges / totalEdges : 1;
  const integrityRatio = totalPkg > 0 ? withIntegrity / totalPkg : 0;
  const licenseRatio = totalPkg > 0 ? withLicense / totalPkg : 0;

  // Transparent Metadata & Resolution Coverage Indicator (not a security score)
  const analysisReadinessRatio =
    analysisMode === 'MANIFEST_ONLY'
      ? Math.round(edgeRatio * 25)
      : Math.round(
          lockfileFactor * 25 + edgeRatio * 35 + integrityRatio * 20 + licenseRatio * 20,
        );

  const readinessFormula =
    '25% Lockfile Present + 35% Resolved Edge Ratio + 20% Integrity Metadata Coverage + 20% License Metadata Coverage (Project Analysis Indicator — not a security rating)';

  return {
    composition: {
      runtime: graph.metrics.runtimeCount,
      dev: graph.metrics.devCount,
      optional: graph.metrics.optionalCount,
      peer: graph.metrics.peerCount,
      workspace: graph.metrics.workspaceCount,
    },
    depthDistribution,
    largestBranches: largestBranches.slice(0, 12),
    topDuplicates: duplicates.filter((d) => d.versions.length > 1).slice(0, 10),
    metadataCoverage: {
      withLicense,
      withIntegrity,
      missingBoth,
      total: totalPkg,
    },
    unresolvedRefs,
    analysisReadinessRatio,
    readinessFormula,
  };
}
