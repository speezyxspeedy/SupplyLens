import { AnalysisResult } from '../types';

export const INVENTORY_DISCLAIMER =
  'This is a locally generated dependency inventory. It is not automatically a certified CycloneDX or SPDX document.';

/**
 * Neutralizes spreadsheet formula injection (OWASP CSV Injection defense)
 * and applies RFC 4180 CSV quoting.
 */
export function sanitizeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const needsFormulaGuard = /^[=+\-@\t\r]/.test(raw) || /^\s+[=+\-@]/.test(raw);
  const safeValue = needsFormulaGuard ? `'${raw}` : raw;
  const escaped = safeValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function escapeHtml(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface JsonInventoryReport {
  generator: string;
  disclaimer: string;
  projectName: string;
  projectVersion: string;
  analysisMode: string;
  lockfileVersion: number | null;
  scanTimestamp: string;
  summary: {
    totalPackageInstances: number;
    uniquePackageNames: number;
    directDependencyCount: number;
    transitiveDependencyCount: number;
    duplicatePackageGroupCount: number;
    unresolvedReferenceCount: number;
    maxDepth: number;
  };
  packages: {
    name: string;
    resolvedVersion: string;
    packageLocation: string;
    dependencyType: string;
    classification: 'direct' | 'transitive' | 'workspace' | 'unresolved';
    licenseMetadata: string | null;
    integrityMetadata: string | null;
    resolvedStatus: 'resolved' | 'manifest-only' | 'unresolved';
  }[];
  dependencyRelationships: {
    source: string;
    target: string;
    dependencyType: string;
    requestedRange: string | null;
    resolvedLocation: string | null;
    isUnresolved: boolean;
  }[];
  duplicatePackageGroups: {
    name: string;
    versions: string[];
    instanceCount: number;
    locations: string[];
  }[];
  unresolvedReferences: {
    source: string;
    target: string;
    dependencyType: string;
    requestedRange: string | null;
  }[];
  manifestHealthFindings: {
    severity: string;
    code: string;
    title: string;
    description: string;
  }[];
}

export function buildJsonInventoryObject(result: AnalysisResult): JsonInventoryReport {
  const packageNodes = result.graph.nodeList.filter((n) => n.nodeType !== 'ROOT');

  const packages = packageNodes.map((n) => ({
    name: n.name,
    resolvedVersion: n.version,
    packageLocation: n.packageLocation,
    dependencyType: n.dependencyType,
    classification: (n.nodeType === 'UNRESOLVED'
      ? 'unresolved'
      : n.isWorkspace
        ? 'workspace'
        : n.isDirect
          ? 'direct'
          : 'transitive') as 'direct' | 'transitive' | 'workspace' | 'unresolved',
    licenseMetadata: n.license ?? null,
    integrityMetadata: n.integrity ?? null,
    resolvedStatus: (n.nodeType === 'UNRESOLVED'
      ? 'unresolved'
      : result.analysisMode === 'MANIFEST_ONLY'
        ? 'manifest-only'
        : 'resolved') as 'resolved' | 'manifest-only' | 'unresolved',
  }));

  const dependencyRelationships = result.graph.edges.map((e) => {
    const src = result.graph.nodes.get(e.source);
    const tgt = result.graph.nodes.get(e.target);
    return {
      source: src ? `${src.name}@${src.version}` : e.source,
      target: tgt ? `${tgt.name}@${tgt.version}` : e.target,
      dependencyType: e.dependencyType,
      requestedRange: e.requestedRange ?? null,
      resolvedLocation: e.resolvedLocation ?? null,
      isUnresolved: e.isUnresolved,
    };
  });

  const duplicatePackageGroups = result.duplicates.map((d) => ({
    name: d.name,
    versions: d.versions,
    instanceCount: d.instanceCount,
    locations: d.instances.map((i) => i.location),
  }));

  const unresolvedReferences = result.graph.edges
    .filter((e) => e.isUnresolved)
    .map((e) => {
      const src = result.graph.nodes.get(e.source);
      const tgt = result.graph.nodes.get(e.target);
      return {
        source: src ? `${src.name}@${src.version}` : e.source,
        target: tgt ? tgt.name : e.target,
        dependencyType: e.dependencyType,
        requestedRange: e.requestedRange ?? null,
      };
    });

  return {
    generator: 'SupplyLens (Local Browser Dependency Intelligence)',
    disclaimer: INVENTORY_DISCLAIMER,
    projectName: result.projectName,
    projectVersion: result.projectVersion,
    analysisMode: result.analysisMode,
    lockfileVersion: result.lockfile ? result.lockfile.lockfileVersion : null,
    scanTimestamp: result.timestamp,
    summary: {
      totalPackageInstances: result.graph.metrics.totalPackageInstances,
      uniquePackageNames: result.graph.metrics.uniquePackageNames,
      directDependencyCount: result.graph.metrics.directCount,
      transitiveDependencyCount: result.graph.metrics.transitiveCount,
      duplicatePackageGroupCount: result.duplicates.filter((d) => d.versions.length > 1).length,
      unresolvedReferenceCount: result.graph.metrics.unresolvedCount,
      maxDepth: result.graph.metrics.maxDepth,
    },
    packages,
    dependencyRelationships,
    duplicatePackageGroups,
    unresolvedReferences,
    manifestHealthFindings: result.healthFindings.map((f) => ({
      severity: f.severity,
      code: f.code,
      title: f.title,
      description: f.description,
    })),
  };
}

export function generateJsonReport(result: AnalysisResult): string {
  return JSON.stringify(buildJsonInventoryObject(result), null, 2);
}

export function generateCsvReport(result: AnalysisResult): string {
  const headers = [
    'Package Name',
    'Resolved Version',
    'Package Location',
    'Dependency Type',
    'Classification',
    'Depth',
    'License Metadata',
    'Integrity Metadata',
    'Resolution Status',
    'Requested Range',
  ];

  const rows: string[] = [headers.map(sanitizeCsvCell).join(',')];

  const nodes = result.graph.nodeList
    .filter((n) => n.nodeType !== 'ROOT')
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const node of nodes) {
    const classification =
      node.nodeType === 'UNRESOLVED'
        ? 'Unresolved'
        : node.isWorkspace
          ? 'Workspace'
          : node.isDirect
            ? 'Direct'
            : 'Transitive';

    const status =
      node.nodeType === 'UNRESOLVED'
        ? 'Unresolved'
        : result.analysisMode === 'MANIFEST_ONLY'
          ? 'Manifest Only'
          : 'Resolved';

    const row = [
      node.name,
      node.version,
      node.packageLocation,
      node.dependencyType,
      classification,
      node.depth,
      node.license ?? 'Unknown / Missing metadata',
      node.integrity ?? '',
      status,
      node.requestedRange ?? '',
    ];

    rows.push(row.map(sanitizeCsvCell).join(','));
  }

  return rows.join('\r\n');
}

export function generatePrintableHtmlReport(result: AnalysisResult): string {
  const nodes = result.graph.nodeList
    .filter((n) => n.nodeType !== 'ROOT')
    .sort((a, b) => a.name.localeCompare(b.name));

  const packageRows = nodes
    .map((n) => {
      const classification =
        n.nodeType === 'UNRESOLVED'
          ? 'Unresolved'
          : n.isWorkspace
            ? 'Workspace'
            : n.isDirect
              ? 'Direct'
              : 'Transitive';
      return `<tr>
        <td>${escapeHtml(n.name)}</td>
        <td class="mono">${escapeHtml(n.version)}</td>
        <td>${escapeHtml(n.dependencyType)}</td>
        <td>${escapeHtml(classification)}</td>
        <td class="mono">${escapeHtml(n.packageLocation)}</td>
        <td>${escapeHtml(n.license ?? 'Missing metadata')}</td>
      </tr>`;
    })
    .join('\n');

  const duplicateRows = result.duplicates
    .filter((d) => d.versions.length > 1)
    .map(
      (d) => `<tr>
        <td>${escapeHtml(d.name)}</td>
        <td class="mono">${escapeHtml(d.versions.join(', '))}</td>
        <td class="mono">${escapeHtml(d.instanceCount)}</td>
      </tr>`,
    )
    .join('\n');

  const findingRows = result.healthFindings
    .map(
      (f) => `<tr>
        <td><strong>${escapeHtml(f.severity)}</strong></td>
        <td>${escapeHtml(f.title)}</td>
        <td>${escapeHtml(f.description)}</td>
      </tr>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SupplyLens Dependency Inventory — ${escapeHtml(result.projectName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; margin: 32px; line-height: 1.5; }
    h1 { font-size: 22px; margin: 0 0 4px 0; }
    h2 { font-size: 16px; margin: 28px 0 10px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    .meta { color: #475569; font-size: 13px; margin-bottom: 16px; }
    .disclaimer { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 14px; font-size: 12px; color: #334155; margin-bottom: 20px; border-radius: 4px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi { border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 4px; }
    .kpi-label { font-size: 11px; color: #64748b; }
    .kpi-val { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 600; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>SupplyLens Dependency Inventory: ${escapeHtml(result.projectName)}</h1>
  <div class="meta">
    Version: ${escapeHtml(result.projectVersion)} &middot;
    Mode: ${escapeHtml(result.analysisMode)} &middot;
    Lockfile Version: ${escapeHtml(result.lockfile ? result.lockfile.lockfileVersion : 'None')} &middot;
    Generated: ${escapeHtml(result.timestamp)}
  </div>
  <div class="disclaimer">${escapeHtml(INVENTORY_DISCLAIMER)}</div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Package Instances</div><div class="kpi-val">${escapeHtml(result.graph.metrics.totalPackageInstances)}</div></div>
    <div class="kpi"><div class="kpi-label">Direct Dependencies</div><div class="kpi-val">${escapeHtml(result.graph.metrics.directCount)}</div></div>
    <div class="kpi"><div class="kpi-label">Transitive Dependencies</div><div class="kpi-val">${escapeHtml(result.graph.metrics.transitiveCount)}</div></div>
    <div class="kpi"><div class="kpi-label">Unresolved References</div><div class="kpi-val">${escapeHtml(result.graph.metrics.unresolvedCount)}</div></div>
  </div>
  <h2>Package Inventory (${escapeHtml(nodes.length)})</h2>
  <table>
    <thead>
      <tr>
        <th>Package</th><th>Version</th><th>Type</th><th>Classification</th><th>Location</th><th>License Metadata</th>
      </tr>
    </thead>
    <tbody>${packageRows}</tbody>
  </table>
  <h2>Duplicate Versions</h2>
  ${
    duplicateRows
      ? `<table><thead><tr><th>Package</th><th>Detected Versions</th><th>Instances</th></tr></thead><tbody>${duplicateRows}</tbody></table>`
      : '<p>No multi-version duplicate packages detected.</p>'
  }
  <h2>Manifest &amp; Lockfile Health Findings</h2>
  <table>
    <thead><tr><th>Severity</th><th>Finding</th><th>Details</th></tr></thead>
    <tbody>${findingRows}</tbody>
  </table>
</body>
</html>`;
}
