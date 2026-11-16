import { DependencyGraph, LicenseEntry, LicenseInventory } from '../types';

export function analyzeLicenses(graph: DependencyGraph): LicenseInventory {
  const resolvedNodes = graph.nodeList.filter(
    (n) => n.nodeType !== 'ROOT' && n.nodeType !== 'UNRESOLVED',
  );

  const groups = new Map<string, LicenseEntry>();
  let withLicenseCount = 0;
  let missingLicenseCount = 0;

  for (const node of resolvedNodes) {
    const hasLicense = Boolean(node.license && node.license.trim().length > 0);
    const key = hasLicense ? node.license!.trim() : '__MISSING_METADATA__';

    if (hasLicense) withLicenseCount++;
    else missingLicenseCount++;

    if (!groups.has(key)) {
      groups.set(key, {
        license: hasLicense ? key : 'Unknown / Missing metadata',
        isMissing: !hasLicense,
        count: 0,
        packages: [],
      });
    }

    const entry = groups.get(key)!;
    entry.count++;
    entry.packages.push({
      id: node.id,
      name: node.name,
      version: node.version,
      location: node.packageLocation || '(workspace)',
    });
  }

  const entries = Array.from(groups.values()).sort((a, b) => {
    if (a.isMissing !== b.isMissing) return a.isMissing ? 1 : -1;
    if (b.count !== a.count) return b.count - a.count;
    return a.license.localeCompare(b.license);
  });

  return {
    entries,
    withLicenseCount,
    missingLicenseCount,
    totalEvaluated: resolvedNodes.length,
  };
}
