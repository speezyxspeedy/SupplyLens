import { describe, expect, it } from 'vitest';
import { runProjectAnalysis } from '../services/analysisPipeline';
import { getDemoProjectFiles } from '../services/demoProject';
import { DEFAULT_SETTINGS, discoverProjectFiles } from '../services/fileService';
import { resolveDependencies } from '../services/dependencyResolver';
import { buildDependencyGraph } from '../services/graphEngine';
import { parseLockfileV2V3 } from '../services/lockfileV2V3Parser';
import { parsePackageManifest } from '../services/manifestParser';

describe('graphEngine', () => {
  it('computes accurate node counts, edge counts, depths, and separates duplicate versions without counting root', () => {
    const manifest = parsePackageManifest(
      JSON.stringify({
        name: 'my-root-project',
        version: '1.0.0',
        dependencies: { a: '^1.0.0', semver: '^7.6.0' },
      }),
    );
    const lockfile = parseLockfileV2V3(
      JSON.stringify({
        name: 'my-root-project',
        version: '1.0.0',
        lockfileVersion: 3,
        packages: {
          '': {
            name: 'my-root-project',
            version: '1.0.0',
            dependencies: { a: '^1.0.0', semver: '^7.6.0' },
          },
          'node_modules/a': {
            version: '1.0.0',
            dependencies: { semver: '^6.3.1' },
          },
          'node_modules/a/node_modules/semver': {
            version: '6.3.1',
          },
          'node_modules/semver': {
            version: '7.6.0',
          },
        },
      }),
    );

    const graph = buildDependencyGraph(resolveDependencies(manifest, lockfile));

    // Root excluded from installed third-party package count: a, semver@7.6.0, semver@6.3.1 = 3
    expect(graph.metrics.totalPackageInstances).toBe(3);
    expect(graph.metrics.uniquePackageNames).toBe(2); // "a" and "semver"
    expect(graph.metrics.directCount).toBe(2);
    expect(graph.metrics.transitiveCount).toBe(1);
    expect(graph.metrics.maxDepth).toBe(2);
    expect(graph.edges).toHaveLength(3); // root->a, root->semver@7.6.0, a->semver@6.3.1
    expect(graph.nodes.get(graph.rootId)?.depth).toBe(0);
    expect(graph.nodes.get('pkg:node_modules/a/node_modules/semver')?.depth).toBe(2);
  });

  it('runs the full demo project through the real parsing, resolution, graph, duplicate, and insights pipeline', () => {
    const demoFiles = getDemoProjectFiles();
    const discovered = discoverProjectFiles(
      demoFiles,
      'orbit-telemetry-cli',
      'demo',
      DEFAULT_SETTINGS,
    );
    const rootManifest = discovered.importSummary.manifests.find((m) => m.isRoot)!;
    const result = runProjectAnalysis({
      rawFiles: discovered.rawFilesMap,
      importSummary: discovered.importSummary,
      selectedManifestPath: rootManifest.path,
      isDemo: true,
    });

    expect(result.projectName).toBe('@acme-fictional/orbit-telemetry-cli');
    expect(result.analysisMode).toBe('LOCKFILE_V3');
    expect(result.graph.metrics.totalPackageInstances).toBeGreaterThan(15);
    expect(result.graph.metrics.unresolvedCount).toBe(1);
    expect(result.duplicates.some((d) => d.name === 'semver' && d.versions.length === 3)).toBe(true);
    expect(result.duplicates.some((d) => d.name === 'lru-cache-mini' && d.versions.length === 2)).toBe(true);
    expect(result.licenseInventory.missingLicenseCount).toBe(1);
  });
});
