import { DependencyGraph, DuplicateGroup, DuplicateInstanceInfo } from '../types';
import { findAllParentPaths } from './pathAnalyzer';

export function analyzeDuplicateVersions(graph: DependencyGraph): DuplicateGroup[] {
  const byName = new Map<string, DuplicateInstanceInfo[]>();

  for (const node of graph.nodeList) {
    if (node.nodeType === 'ROOT' || node.nodeType === 'UNRESOLVED') continue;

    const parents = node.parentIds
      .map((pid) => {
        const p = graph.nodes.get(pid);
        return p ? `${p.name}@${p.version}` : pid;
      });

    const { paths } = findAllParentPaths(graph, node.id, 3, 10);
    const samplePaths = paths.map((p) =>
      p.steps.map((s) => `${s.name}${s.version && s.version !== '0.0.0' ? `@${s.version}` : ''}`),
    );

    const info: DuplicateInstanceInfo = {
      nodeId: node.id,
      version: node.version,
      location: node.packageLocation,
      dependencyType: node.dependencyType,
      isDirect: node.isDirect,
      parents,
      samplePaths,
    };

    if (!byName.has(node.name)) {
      byName.set(node.name, []);
    }
    byName.get(node.name)!.push(info);
  }

  const duplicates: DuplicateGroup[] = [];

  for (const [name, instances] of byName.entries()) {
    const uniqueVersions = Array.from(new Set(instances.map((i) => i.version))).sort();
    // Flag packages that appear in multiple versions OR multiple distinct installed locations
    if (uniqueVersions.length > 1 || instances.length > 1) {
      duplicates.push({
        name,
        versions: uniqueVersions,
        instanceCount: instances.length,
        instances: [...instances].sort((a, b) => a.version.localeCompare(b.version)),
      });
    }
  }

  // Sort primarily by number of distinct versions desc, then instance count desc, then name
  duplicates.sort((a, b) => {
    if (b.versions.length !== a.versions.length) return b.versions.length - a.versions.length;
    if (b.instanceCount !== a.instanceCount) return b.instanceCount - a.instanceCount;
    return a.name.localeCompare(b.name);
  });

  return duplicates;
}
