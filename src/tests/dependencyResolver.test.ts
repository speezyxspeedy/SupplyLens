import { describe, expect, it } from 'vitest';
import { resolveDependencies } from '../services/dependencyResolver';
import { parseLockfileV2V3 } from '../services/lockfileV2V3Parser';
import { parsePackageManifest } from '../services/manifestParser';

describe('dependencyResolver', () => {
  it('resolves direct, transitive, nested ancestor, optional, peer, workspace, unresolved, and cyclic dependencies', () => {
    const manifest = parsePackageManifest(
      JSON.stringify({
        name: 'resolver-fixture',
        version: '1.0.0',
        dependencies: {
          'pkg-a': '^1.0.0',
          'shared-lib': '^2.0.0',
          'cycle-one': '^1.0.0',
          'ui-kit': '*',
        },
        devDependencies: {
          'test-runner': '^1.0.0',
        },
        optionalDependencies: {
          'opt-native': '^0.1.0',
        },
        peerDependencies: {
          'peer-host': '^3.0.0',
        },
      }),
    );

    const lockfile = parseLockfileV2V3(
      JSON.stringify({
        name: 'resolver-fixture',
        version: '1.0.0',
        lockfileVersion: 3,
        packages: {
          '': {
            name: 'resolver-fixture',
            version: '1.0.0',
            dependencies: {
              'pkg-a': '^1.0.0',
              'shared-lib': '^2.0.0',
              'cycle-one': '^1.0.0',
              'ui-kit': '*',
            },
            devDependencies: { 'test-runner': '^1.0.0' },
            optionalDependencies: { 'opt-native': '^0.1.0' },
            peerDependencies: { 'peer-host': '^3.0.0' },
          },
          'node_modules/pkg-a': {
            version: '1.0.0',
            dependencies: {
              'shared-lib': '^1.0.0',
              'missing-dep': '^9.9.9',
            },
          },
          'node_modules/pkg-a/node_modules/shared-lib': {
            version: '1.4.0',
          },
          'node_modules/shared-lib': {
            version: '2.5.0',
          },
          'node_modules/cycle-one': {
            version: '1.0.0',
            dependencies: { 'cycle-two': '^1.0.0' },
          },
          'node_modules/cycle-two': {
            version: '1.0.0',
            dependencies: { 'cycle-one': '^1.0.0' },
          },
          'node_modules/test-runner': {
            version: '1.2.0',
            dev: true,
          },
          'node_modules/opt-native': {
            version: '0.1.5',
            optional: true,
          },
          'node_modules/peer-host': {
            version: '3.0.2',
            peer: true,
          },
          'node_modules/ui-kit': {
            link: true,
            resolved: 'packages/ui-kit',
          },
          'packages/ui-kit': {
            name: 'ui-kit',
            version: '0.0.1',
          },
        },
      }),
    );

    const res = resolveDependencies(manifest, lockfile);
    expect(res.analysisMode).toBe('LOCKFILE_V3');

    // Nested ancestor resolution: pkg-a should resolve to nested shared-lib@1.4.0, NOT hoisted 2.5.0
    const nestedShared = res.nodes.get('pkg:node_modules/pkg-a/node_modules/shared-lib');
    const hoistedShared = res.nodes.get('pkg:node_modules/shared-lib');
    expect(nestedShared?.version).toBe('1.4.0');
    expect(hoistedShared?.version).toBe('2.5.0');

    // Edge from pkg-a must target nested shared-lib
    const pkgAToShared = res.edges.find(
      (e) =>
        e.source === 'pkg:node_modules/pkg-a' &&
        e.target === 'pkg:node_modules/pkg-a/node_modules/shared-lib',
    );
    expect(pkgAToShared).toBeDefined();

    // Workspace link resolved to packages/ui-kit
    const workspaceNode = res.nodes.get('pkg:packages/ui-kit');
    expect(workspaceNode?.isWorkspace).toBe(true);
    expect(workspaceNode?.dependencyType).toBe('WORKSPACE_LINK');

    // Optional & Peer & Dev preserved
    expect(res.nodes.get('pkg:node_modules/opt-native')?.isOptional).toBe(true);
    expect(res.nodes.get('pkg:node_modules/peer-host')?.isPeer).toBe(true);
    expect(res.nodes.get('pkg:node_modules/test-runner')?.isDevelopment).toBe(true);

    // Unresolved dependency recorded explicitly
    expect(res.unresolvedDependencies).toHaveLength(1);
    expect(res.nodes.get('unresolved:missing-dep')?.nodeType).toBe('UNRESOLVED');

    // Cycles handled safely without infinite loop
    expect(res.nodes.get('pkg:node_modules/cycle-one')).toBeDefined();
    expect(res.nodes.get('pkg:node_modules/cycle-two')).toBeDefined();
  });

  it('operates in MANIFEST_ONLY mode without fabricating resolved versions or transitives', () => {
    const manifest = parsePackageManifest(
      JSON.stringify({
        name: 'manifest-only-app',
        version: '1.0.0',
        dependencies: { express: '^4.19.0' },
      }),
    );

    const res = resolveDependencies(manifest, null);
    expect(res.analysisMode).toBe('MANIFEST_ONLY');
    const node = res.nodes.get('manifest:express');
    expect(node?.hasUnresolvedMetadata).toBe(true);
    expect(node?.requestedRange).toBe('^4.19.0');
    expect(node?.version).toContain('unresolved');
    expect(res.nodes.size).toBe(2); // root + express only
  });
});
