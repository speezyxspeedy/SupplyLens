import {
  AnalysisMode,
  DependencyGraph,
  DuplicateGroup,
  HealthFinding,
  ImportSummary,
  ParsedLockfile,
  ParsedManifest,
} from '../types';

export function analyzeManifestAndLockfileHealth(params: {
  manifest: ParsedManifest;
  lockfile: ParsedLockfile | null;
  analysisMode: AnalysisMode;
  graph: DependencyGraph;
  duplicates: DuplicateGroup[];
  importSummary: ImportSummary;
}): HealthFinding[] {
  const { manifest, lockfile, analysisMode, graph, duplicates, importSummary } = params;
  const findings: HealthFinding[] = [];

  // 1. Check package.json existence and validity
  if (importSummary.manifests.length === 0) {
    findings.push({
      id: 'missing-manifest',
      severity: 'CRITICAL',
      code: 'MANIFEST_MISSING',
      title: 'No package.json manifest discovered',
      description: 'SupplyLens requires a valid package.json file to identify the project root and declared dependencies.',
      recommendation: 'Include package.json when selecting your project folder, ZIP archive, or individual files.',
    });
  } else if (!manifest.isValidJson) {
    findings.push({
      id: 'invalid-manifest-json',
      severity: 'CRITICAL',
      code: 'MANIFEST_INVALID_JSON',
      title: 'package.json contains invalid JSON or is empty',
      description: manifest.rawErrors.join(' '),
      recommendation: 'Fix syntax errors in package.json and re-run the analysis.',
    });
  }

  if (manifest.rawErrors.length > 0 && manifest.isValidJson) {
    findings.push({
      id: 'manifest-field-warnings',
      severity: 'LOW',
      code: 'MANIFEST_METADATA_WARNINGS',
      title: 'Manifest metadata warnings detected',
      description: manifest.rawErrors.join(' '),
      recommendation: 'Review the flagged fields in package.json to ensure clean package metadata.',
    });
  }

  // 2. Lockfile existence & parsing checks
  if (!lockfile) {
    findings.push({
      id: 'lockfile-missing',
      severity: 'INFO',
      code: 'MANIFEST_ONLY_MODE',
      title: 'No lockfile present — operating in Manifest Only mode',
      description:
        'Neither package-lock.json nor npm-shrinkwrap.json was found for this project. SupplyLens shows declared direct dependency ranges only and does not fabricate resolved versions or transitive trees.',
      recommendation: 'Include package-lock.json or npm-shrinkwrap.json to analyze the full resolved dependency graph.',
    });
  } else {
    if (!lockfile.isSupported) {
      findings.push({
        id: 'lockfile-unsupported',
        severity: 'HIGH',
        code: 'LOCKFILE_INVALID_OR_UNSUPPORTED',
        title: `${lockfile.kind} could not be parsed as a supported lockfile`,
        description: lockfile.parseErrors.join(' ') || `Unsupported lockfileVersion (${lockfile.lockfileVersion}).`,
        recommendation: 'Ensure package-lock.json uses npm lockfileVersion 1, 2, or 3 and valid JSON.',
      });
    } else if (lockfile.parseErrors.length > 0) {
      findings.push({
        id: 'lockfile-parse-errors',
        severity: 'HIGH',
        code: 'LOCKFILE_PARSE_ERRORS',
        title: `Errors encountered while parsing ${lockfile.kind}`,
        description: lockfile.parseErrors.join(' '),
        recommendation: 'Regenerate or inspect the lockfile JSON structure.',
      });
    }

    if (lockfile.warnings.length > 0) {
      findings.push({
        id: 'lockfile-warnings',
        severity: 'LOW',
        code: 'LOCKFILE_WARNINGS',
        title: `Warnings in ${lockfile.kind} metadata`,
        description: lockfile.warnings.slice(0, 4).join(' '),
        recommendation: 'Review lockfile warnings if exact metadata completeness is required.',
        affectedItems: lockfile.warnings,
      });
    }

    // 5. Root manifest name/version vs lockfile metadata
    if (lockfile.isSupported) {
      const nameMismatch =
        lockfile.projectName && manifest.hasName && lockfile.projectName !== manifest.name;
      const versionMismatch =
        lockfile.projectVersion && lockfile.projectVersion !== manifest.version;

      if (nameMismatch || versionMismatch) {
        const diffs: string[] = [];
        if (nameMismatch) {
          diffs.push(`name ("${manifest.name}" in manifest vs "${lockfile.projectName}" in lockfile)`);
        }
        if (versionMismatch) {
          diffs.push(`version ("${manifest.version}" in manifest vs "${lockfile.projectVersion}" in lockfile)`);
        }
        findings.push({
          id: 'root-metadata-mismatch',
          severity: 'MEDIUM',
          code: 'MANIFEST_LOCKFILE_METADATA_MISMATCH',
          title: 'Root manifest metadata differs from lockfile metadata',
          description: `Detected mismatch in ${diffs.join(' and ')}. This typically occurs when package.json was edited without refreshing the lockfile.`,
          recommendation: 'Run your local package manager lockfile update in your development environment and re-import.',
        });
      }

      // 6. Direct dependency declarations vs root lockfile records
      if (lockfile.rootRecord) {
        const manifestDeps = {
          ...manifest.dependencies,
          ...manifest.devDependencies,
          ...manifest.optionalDependencies,
          ...manifest.peerDependencies,
        };
        const lockRootDeps = {
          ...lockfile.rootRecord.dependencies,
          ...lockfile.rootRecord.devDependencies,
          ...lockfile.rootRecord.optionalDependencies,
          ...lockfile.rootRecord.peerDependencies,
        };

        const missingInLockRoot: string[] = [];
        const rangeDiffs: string[] = [];

        for (const [depName, range] of Object.entries(manifestDeps)) {
          if (!(depName in lockRootDeps)) {
            missingInLockRoot.push(depName);
          } else if (
            lockfile.lockfileVersion >= 2 &&
            lockRootDeps[depName] !== range
          ) {
            rangeDiffs.push(`${depName} (manifest: ${range}, lockfile: ${lockRootDeps[depName]})`);
          }
        }

        if (missingInLockRoot.length > 0 || rangeDiffs.length > 0) {
          const details: string[] = [];
          if (missingInLockRoot.length > 0) {
            details.push(`Missing from lockfile root record: ${missingInLockRoot.join(', ')}.`);
          }
          if (rangeDiffs.length > 0) {
            details.push(`Declared range differences: ${rangeDiffs.join('; ')}.`);
          }
          findings.push({
            id: 'direct-dep-drift',
            severity: 'MEDIUM',
            code: 'DIRECT_DEPENDENCY_MISMATCH',
            title: 'Direct dependency declarations differ from lockfile root record',
            description: details.join(' '),
            recommendation: 'Verify that package.json and package-lock.json are synchronized.',
            affectedItems: [...missingInLockRoot, ...rangeDiffs],
          });
        }
      }
    }
  }

  // 7. Unresolved package relationships
  if (analysisMode !== 'MANIFEST_ONLY' && graph.metrics.unresolvedCount > 0) {
    const unresolvedEdges = graph.edges.filter((e) => e.isUnresolved);
    const affected = Array.from(
      new Set(
        unresolvedEdges.map((e) => {
          const target = graph.nodes.get(e.target);
          return target ? `${target.name}${e.requestedRange ? ` (${e.requestedRange})` : ''}` : e.target;
        }),
      ),
    );
    findings.push({
      id: 'unresolved-relationships',
      severity: 'MEDIUM',
      code: 'UNRESOLVED_DEPENDENCIES',
      title: `${graph.metrics.unresolvedCount} unresolved dependency relationship(s)`,
      description:
        'Some dependency references declared by packages in the lockfile could not be matched to an installed package record (common with platform-specific optional dependencies or unmet peer dependencies).',
      recommendation: 'Inspect the unresolved references in Dependency Explorer or Package Insights to confirm whether they are expected platform-specific optionals or missing peer dependencies.',
      affectedItems: affected,
    });
  }

  // 8. Duplicate package versions (LOW observation, NOT a security warning)
  const multiVersionGroups = duplicates.filter((d) => d.versions.length > 1);
  if (multiVersionGroups.length > 0) {
    findings.push({
      id: 'duplicate-versions',
      severity: 'LOW',
      code: 'DUPLICATE_VERSIONS_OBSERVED',
      title: `${multiVersionGroups.length} package(s) installed in multiple versions`,
      description:
        'Multiple versions of the same package name exist in the dependency tree. This is a normal outcome when different parent packages require incompatible semver ranges and is not automatically an error or vulnerability.',
      recommendation: 'Review the Duplicate Versions view if you wish to understand which parent chains introduce separate versions.',
      affectedItems: multiVersionGroups.map((g) => `${g.name} (${g.versions.join(', ')})`),
    });
  }

  // 9. Missing package versions
  const missingVersionNodes = graph.nodeList.filter(
    (n) => n.nodeType !== 'ROOT' && n.nodeType !== 'UNRESOLVED' && n.hasUnresolvedMetadata,
  );
  if (analysisMode !== 'MANIFEST_ONLY' && missingVersionNodes.length > 0) {
    findings.push({
      id: 'missing-package-versions',
      severity: 'LOW',
      code: 'MISSING_PACKAGE_VERSIONS',
      title: `${missingVersionNodes.length} lockfile record(s) lack explicit version metadata`,
      description: 'Some entries in the lockfile do not specify a resolved version string.',
      recommendation: 'Check the affected records in Dependency Explorer.',
      affectedItems: missingVersionNodes.map((n) => `${n.name} (${n.packageLocation})`),
    });
  }

  // 10. Missing optional license metadata
  const resolvedNodes = graph.nodeList.filter(
    (n) => n.nodeType !== 'ROOT' && n.nodeType !== 'UNRESOLVED',
  );
  const missingLicenseCount = resolvedNodes.filter((n) => !n.license).length;
  if (analysisMode !== 'MANIFEST_ONLY' && missingLicenseCount > 0) {
    findings.push({
      id: 'missing-license-metadata',
      severity: 'LOW',
      code: 'MISSING_LICENSE_METADATA',
      title: `${missingLicenseCount} package(s) have no license field in lockfile metadata`,
      description:
        'Lockfiles (especially v1 or certain transitive entries) may omit license strings. Missing metadata does not imply a package is unlicensed.',
      recommendation: 'Inspect local package.json files inside installed packages if full license inventory coverage is required.',
    });
  }

  // 11. Workspace declarations without corresponding resolvable package entries
  if (manifest.workspaces.length > 0 && lockfile && lockfile.isSupported) {
    const workspaceNodes = graph.nodeList.filter((n) => n.isWorkspace);
    const hasWorkspaceLocs = Array.from(lockfile.packages.keys()).some(
      (loc) => loc !== '' && !loc.startsWith('node_modules/'),
    );
    if (workspaceNodes.length === 0 && !hasWorkspaceLocs) {
      findings.push({
        id: 'workspaces-unlinked',
        severity: 'INFO',
        code: 'WORKSPACES_MANUAL_REVIEW',
        title: 'Workspace patterns declared without linked lockfile workspace entries',
        description: `manifest declares workspaces (${manifest.workspaces.join(', ')}), but no linked workspace records were found in the lockfile.`,
        recommendation: 'If analyzing a monorepo, select the root lockfile or choose a specific workspace manifest in New Analysis.',
        affectedItems: manifest.workspaces,
      });
    }
  }

  // Sort by severity priority
  const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return findings;
}
