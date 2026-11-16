import {
  AnalysisMode,
  DependencyEdge,
  DependencyType,
  LockfilePackageRecord,
  PackageNode,
  ParsedLockfile,
  ParsedManifest,
} from '../types';

export interface ResolutionOutput {
  analysisMode: AnalysisMode;
  rootId: string;
  nodes: Map<string, PackageNode>;
  edges: DependencyEdge[];
  unresolvedDependencies: DependencyEdge[];
}

/**
 * Resolves a package name from a given parent location using npm's ancestor
 * node_modules lookup algorithm.
 */
export function resolveAncestorLocation(
  parentLocation: string,
  depName: string,
  packages: Map<string, LockfilePackageRecord>,
): string | null {
  // 1. Check direct child node_modules under parentLocation
  if (parentLocation) {
    const directCandidate = `${parentLocation}/node_modules/${depName}`;
    if (packages.has(directCandidate)) {
      return directCandidate;
    }

    // 2. Walk up ancestor node_modules segments
    // e.g. "node_modules/a/node_modules/b" -> try "node_modules/a/node_modules/<depName>"
    let cursor = parentLocation;
    while (true) {
      const idx = cursor.lastIndexOf('/node_modules/');
      if (idx === -1) break;
      const ancestorPrefix = cursor.slice(0, idx);
      const candidate = ancestorPrefix
        ? `${ancestorPrefix}/node_modules/${depName}`
        : `node_modules/${depName}`;
      if (packages.has(candidate)) {
        return candidate;
      }
      cursor = ancestorPrefix;
    }
  }

  // 3. Fallback to top-level hoisted node_modules/<depName>
  const topCandidate = `node_modules/${depName}`;
  if (packages.has(topCandidate)) {
    return topCandidate;
  }

  return null;
}

function getAnalysisMode(lockfile: ParsedLockfile | null): AnalysisMode {
  if (!lockfile || !lockfile.isSupported) {
    return 'MANIFEST_ONLY';
  }
  if (lockfile.kind === 'npm-shrinkwrap.json') {
    return 'SHRINKWRAP';
  }
  if (lockfile.lockfileVersion === 3) return 'LOCKFILE_V3';
  if (lockfile.lockfileVersion === 2) return 'LOCKFILE_V2';
  return 'LOCKFILE_V1';
}

export function resolveDependencies(
  manifest: ParsedManifest,
  lockfile: ParsedLockfile | null,
): ResolutionOutput {
  const analysisMode = getAnalysisMode(lockfile);
  const rootId = 'root';
  const nodes = new Map<string, PackageNode>();
  const edges: DependencyEdge[] = [];
  const unresolvedDependencies: DependencyEdge[] = [];

  const rootNode: PackageNode = {
    id: rootId,
    nodeType: 'ROOT',
    name: manifest.name,
    version: manifest.version,
    packageLocation: '',
    license: manifest.license,
    dependencyType: 'DEPENDENCY',
    isDirect: false,
    isDevelopment: false,
    isOptional: false,
    isPeer: false,
    isWorkspace: false,
    hasUnresolvedMetadata: false,
    depth: 0,
    parentIds: [],
    childIds: [],
  };
  nodes.set(rootId, rootNode);

  // Collect declared direct dependencies in deterministic priority order
  const directSpecs: { name: string; range: string; type: DependencyType }[] = [];
  const seenDirect = new Set<string>();

  const pushSpecs = (map: Record<string, string>, type: DependencyType) => {
    for (const [name, range] of Object.entries(map)) {
      if (!seenDirect.has(name)) {
        seenDirect.add(name);
        directSpecs.push({ name, range, type });
      }
    }
  };

  pushSpecs(manifest.dependencies, 'DEPENDENCY');
  pushSpecs(manifest.optionalDependencies, 'OPTIONAL_DEPENDENCY');
  pushSpecs(manifest.peerDependencies, 'PEER_DEPENDENCY');
  pushSpecs(manifest.devDependencies, 'DEV_DEPENDENCY');

  // MANIFEST_ONLY mode: do not fabricate resolved versions or transitive trees
  if (analysisMode === 'MANIFEST_ONLY' || !lockfile || !lockfile.isSupported) {
    for (const spec of directSpecs) {
      const nodeId = `manifest:${spec.name}`;
      const node: PackageNode = {
        id: nodeId,
        nodeType: 'DIRECT',
        name: spec.name,
        version: 'unresolved (manifest only)',
        packageLocation: '(no lockfile)',
        dependencyType: spec.type,
        isDirect: true,
        isDevelopment: spec.type === 'DEV_DEPENDENCY',
        isOptional: spec.type === 'OPTIONAL_DEPENDENCY',
        isPeer: spec.type === 'PEER_DEPENDENCY',
        isWorkspace: false,
        hasUnresolvedMetadata: true,
        depth: 1,
        parentIds: [],
        childIds: [],
        requestedRange: spec.range,
      };
      nodes.set(nodeId, node);
      edges.push({
        id: `edge:${rootId}->${nodeId}:${spec.type}`,
        source: rootId,
        target: nodeId,
        dependencyType: spec.type,
        requestedRange: spec.range,
        isUnresolved: false,
      });
    }

    return {
      analysisMode: 'MANIFEST_ONLY',
      rootId,
      nodes,
      edges,
      unresolvedDependencies,
    };
  }

  // Also include any direct entries on lockfile rootRecord not already listed in manifest
  if (lockfile.rootRecord) {
    pushSpecs(lockfile.rootRecord.dependencies, 'DEPENDENCY');
    pushSpecs(lockfile.rootRecord.optionalDependencies, 'OPTIONAL_DEPENDENCY');
    pushSpecs(lockfile.rootRecord.peerDependencies, 'PEER_DEPENDENCY');
    pushSpecs(lockfile.rootRecord.devDependencies, 'DEV_DEPENDENCY');
  }

  const edgeKeys = new Set<string>();
  const expandedLocations = new Set<string>();

  interface QueueItem {
    nodeId: string;
    location: string;
  }
  const queue: QueueItem[] = [];

  function resolveTargetRecord(
    parentLocation: string,
    depName: string,
  ): { record: LockfilePackageRecord; location: string; isWorkspaceLink: boolean } | null {
    const initialLoc = resolveAncestorLocation(parentLocation, depName, lockfile!.packages);
    if (!initialLoc) return null;

    const initialRec = lockfile!.packages.get(initialLoc);
    if (!initialRec) return null;

    if (initialRec.link && initialRec.resolvedTarget) {
      const linkedRec = lockfile!.packages.get(initialRec.resolvedTarget);
      if (linkedRec) {
        return {
          record: linkedRec,
          location: initialRec.resolvedTarget,
          isWorkspaceLink: true,
        };
      }
      return {
        record: initialRec,
        location: initialLoc,
        isWorkspaceLink: true,
      };
    }

    return {
      record: initialRec,
      location: initialLoc,
      isWorkspaceLink: !initialLoc.startsWith('node_modules/') && initialLoc !== '',
    };
  }

  function ensurePackageNode(
    record: LockfilePackageRecord,
    location: string,
    isDirect: boolean,
    depType: DependencyType,
    isWorkspaceLink: boolean,
    requestedRange?: string,
  ): PackageNode {
    const nodeId = `pkg:${location}`;
    const existing = nodes.get(nodeId);
    if (existing) {
      if (isDirect) {
        existing.isDirect = true;
        if (existing.nodeType === 'TRANSITIVE') {
          existing.nodeType = isWorkspaceLink ? 'WORKSPACE' : 'DIRECT';
        }
        if (requestedRange && !existing.requestedRange) {
          existing.requestedRange = requestedRange;
        }
      }
      if (depType === 'DEPENDENCY' && existing.dependencyType !== 'WORKSPACE_LINK') {
        existing.dependencyType = 'DEPENDENCY';
        existing.isDevelopment = false;
      }
      return existing;
    }

    const effectiveType: DependencyType = isWorkspaceLink ? 'WORKSPACE_LINK' : depType;
    const node: PackageNode = {
      id: nodeId,
      nodeType: isWorkspaceLink ? 'WORKSPACE' : isDirect ? 'DIRECT' : 'TRANSITIVE',
      name: record.name,
      version: record.version,
      packageLocation: location,
      license: record.license,
      resolvedUrl: record.resolved,
      integrity: record.integrity,
      dependencyType: effectiveType,
      isDirect,
      isDevelopment: record.dev === true || effectiveType === 'DEV_DEPENDENCY',
      isOptional: record.optional === true || effectiveType === 'OPTIONAL_DEPENDENCY',
      isPeer: record.peer === true || effectiveType === 'PEER_DEPENDENCY',
      isWorkspace: isWorkspaceLink,
      hasUnresolvedMetadata: Boolean(record.hasMissingVersion),
      depth: isDirect ? 1 : 2,
      parentIds: [],
      childIds: [],
      requestedRange,
    };
    nodes.set(nodeId, node);
    return node;
  }

  function addEdge(
    sourceId: string,
    targetId: string,
    depType: DependencyType,
    requestedRange: string | undefined,
    resolvedLocation: string | undefined,
    isUnresolved: boolean,
  ) {
    const key = `${sourceId}->${targetId}:${depType}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);

    const edge: DependencyEdge = {
      id: `edge:${key}`,
      source: sourceId,
      target: targetId,
      dependencyType: depType,
      requestedRange,
      resolvedLocation,
      isUnresolved,
    };
    edges.push(edge);
    if (isUnresolved) {
      unresolvedDependencies.push(edge);
    }
  }

  function recordUnresolved(
    sourceId: string,
    depName: string,
    depType: DependencyType,
    requestedRange?: string,
  ) {
    const unresId = `unresolved:${depName}`;
    if (!nodes.has(unresId)) {
      nodes.set(unresId, {
        id: unresId,
        nodeType: 'UNRESOLVED',
        name: depName,
        version: 'unresolved',
        packageLocation: '(not found in lockfile)',
        dependencyType: depType,
        isDirect: sourceId === rootId,
        isDevelopment: depType === 'DEV_DEPENDENCY',
        isOptional: depType === 'OPTIONAL_DEPENDENCY',
        isPeer: depType === 'PEER_DEPENDENCY',
        isWorkspace: false,
        hasUnresolvedMetadata: true,
        depth: sourceId === rootId ? 1 : 2,
        parentIds: [],
        childIds: [],
        requestedRange,
      });
    }
    addEdge(sourceId, unresId, depType, requestedRange, undefined, true);
  }

  // Step 1: Resolve direct dependencies from root
  for (const spec of directSpecs) {
    const resolved = resolveTargetRecord('', spec.name);
    if (!resolved) {
      recordUnresolved(rootId, spec.name, spec.type, spec.range);
      continue;
    }

    const effectiveType: DependencyType = resolved.isWorkspaceLink ? 'WORKSPACE_LINK' : spec.type;
    const node = ensurePackageNode(
      resolved.record,
      resolved.location,
      true,
      effectiveType,
      resolved.isWorkspaceLink,
      spec.range,
    );

    addEdge(rootId, node.id, effectiveType, spec.range, resolved.location, false);

    if (!expandedLocations.has(resolved.location)) {
      expandedLocations.add(resolved.location);
      queue.push({ nodeId: node.id, location: resolved.location });
    }
  }

  // Step 2: Breadth-first transitive resolution with cycle protection
  let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor++];
    const currentRecord = lockfile.packages.get(current.location);
    if (!currentRecord) continue;

    const outgoing: { name: string; range: string; type: DependencyType }[] = [];
    const seenOutgoing = new Set<string>();

    const addOutgoing = (map: Record<string, string>, type: DependencyType) => {
      for (const [depName, reqRange] of Object.entries(map)) {
        if (!seenOutgoing.has(depName)) {
          seenOutgoing.add(depName);
          outgoing.push({ name: depName, range: reqRange, type });
        }
      }
    };

    addOutgoing(currentRecord.dependencies, 'DEPENDENCY');
    addOutgoing(currentRecord.optionalDependencies, 'OPTIONAL_DEPENDENCY');
    addOutgoing(currentRecord.peerDependencies, 'PEER_DEPENDENCY');

    for (const dep of outgoing) {
      const resolved = resolveTargetRecord(current.location, dep.name);
      if (!resolved) {
        recordUnresolved(current.nodeId, dep.name, dep.type, dep.range);
        continue;
      }

      const effectiveType: DependencyType = resolved.isWorkspaceLink ? 'WORKSPACE_LINK' : dep.type;
      const targetNode = ensurePackageNode(
        resolved.record,
        resolved.location,
        false,
        effectiveType,
        resolved.isWorkspaceLink,
        dep.range,
      );

      addEdge(current.nodeId, targetNode.id, effectiveType, dep.range, resolved.location, false);

      if (!expandedLocations.has(resolved.location)) {
        expandedLocations.add(resolved.location);
        queue.push({ nodeId: targetNode.id, location: resolved.location });
      }
    }
  }

  return {
    analysisMode,
    rootId,
    nodes,
    edges,
    unresolvedDependencies,
  };
}
