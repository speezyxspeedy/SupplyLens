import { RawProjectFile } from '../types';

export function getDemoProjectFiles(): RawProjectFile[] {
  const manifestObj = {
    name: '@acme-fictional/orbit-telemetry-cli',
    version: '1.4.2',
    description: 'Fictional local telemetry CLI demo project for SupplyLens parser verification.',
    license: 'MIT',
    scripts: {
      build: 'ts-bundle-kit build',
      test: 'vitest-lite run',
      lint: 'ts-bundle-kit check',
    },
    dependencies: {
      'aurora-http': '^2.3.0',
      'velox-router': '^4.1.0',
      'tiny-yaml-parse': '^1.2.0',
      semver: '^7.6.0',
      'graph-walker-a': '^1.0.0',
    },
    devDependencies: {
      'vitest-lite': '^3.1.0',
      'ts-bundle-kit': '^5.0.2',
    },
    optionalDependencies: {
      'fsevents-shim': '^2.1.0',
    },
    peerDependencies: {
      '@acme-fictional/plugin-core': '^1.0.0',
    },
  };

  const lockfileObj = {
    name: '@acme-fictional/orbit-telemetry-cli',
    version: '1.4.2',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: '@acme-fictional/orbit-telemetry-cli',
        version: '1.4.2',
        license: 'MIT',
        dependencies: {
          'aurora-http': '^2.3.0',
          'velox-router': '^4.1.0',
          'tiny-yaml-parse': '^1.2.0',
          semver: '^7.6.0',
          'graph-walker-a': '^1.0.0',
        },
        devDependencies: {
          'vitest-lite': '^3.1.0',
          'ts-bundle-kit': '^5.0.2',
        },
        optionalDependencies: {
          'fsevents-shim': '^2.1.0',
        },
        peerDependencies: {
          '@acme-fictional/plugin-core': '^1.0.0',
        },
      },
      'node_modules/@acme-fictional/plugin-core': {
        version: '1.0.4',
        resolved: 'https://registry.example.invalid/@acme-fictional/plugin-core/-/plugin-core-1.0.4.tgz',
        integrity: 'sha512-demoCore10400000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'Apache-2.0',
        peer: true,
      },
      'node_modules/aurora-http': {
        version: '2.3.4',
        resolved: 'https://registry.example.invalid/aurora-http/-/aurora-http-2.3.4.tgz',
        integrity: 'sha512-demoAurora234000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'MIT',
        dependencies: {
          'undici-mini': '^6.2.0',
          'lru-cache-mini': '^10.2.0',
          semver: '^7.5.4',
        },
      },
      'node_modules/aurora-http/node_modules/semver': {
        version: '7.5.4',
        resolved: 'https://registry.example.invalid/semver/-/semver-7.5.4.tgz',
        integrity: 'sha512-demoSemver754000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'ISC',
      },
      'node_modules/undici-mini': {
        version: '6.2.1',
        resolved: 'https://registry.example.invalid/undici-mini/-/undici-mini-6.2.1.tgz',
        integrity: 'sha512-demoUndici621000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'MIT',
        dependencies: {
          'busboy-stream': '^1.6.0',
        },
      },
      'node_modules/busboy-stream': {
        version: '1.6.0',
        resolved: 'https://registry.example.invalid/busboy-stream/-/busboy-stream-1.6.0.tgz',
        integrity: 'sha512-demoBusboy160000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'MIT',
        dependencies: {
          'stream-slice': '^0.3.2',
        },
      },
      'node_modules/stream-slice': {
        version: '0.3.2',
        resolved: 'https://registry.example.invalid/stream-slice/-/stream-slice-0.3.2.tgz',
        integrity: 'sha512-demoStream032000000000000000000000000000000000000000000000000000000000000000000000000==',
        // Intentionally omit license metadata on one transitive package to show honest missing metadata reporting
      },
      'node_modules/velox-router': {
        version: '4.1.2',
        resolved: 'https://registry.example.invalid/velox-router/-/velox-router-4.1.2.tgz',
        integrity: 'sha512-demoVelox4120000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'MIT',
        dependencies: {
          'path-match-lite': '^2.0.0',
          'lru-cache-mini': '^6.0.0',
        },
      },
      'node_modules/velox-router/node_modules/lru-cache-mini': {
        version: '6.0.0',
        resolved: 'https://registry.example.invalid/lru-cache-mini/-/lru-cache-mini-6.0.0.tgz',
        integrity: 'sha512-demoLru600000000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'ISC',
        dependencies: {
          'yallist-mini': '^4.0.0',
        },
      },
      'node_modules/yallist-mini': {
        version: '4.0.0',
        resolved: 'https://registry.example.invalid/yallist-mini/-/yallist-mini-4.0.0.tgz',
        integrity: 'sha512-demoYallist400000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'ISC',
      },
      'node_modules/path-match-lite': {
        version: '2.0.1',
        resolved: 'https://registry.example.invalid/path-match-lite/-/path-match-lite-2.0.1.tgz',
        integrity: 'sha512-demoPathMatch201000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'BSD-3-Clause',
      },
      'node_modules/tiny-yaml-parse': {
        version: '1.2.3',
        resolved: 'https://registry.example.invalid/tiny-yaml-parse/-/tiny-yaml-parse-1.2.3.tgz',
        integrity: 'sha512-demoYaml12300000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'ISC',
        dependencies: {
          semver: '^6.3.1',
        },
      },
      'node_modules/tiny-yaml-parse/node_modules/semver': {
        version: '6.3.1',
        resolved: 'https://registry.example.invalid/semver/-/semver-6.3.1.tgz',
        integrity: 'sha512-demoSemver631000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'ISC',
      },
      'node_modules/semver': {
        version: '7.6.0',
        resolved: 'https://registry.example.invalid/semver/-/semver-7.6.0.tgz',
        integrity: 'sha512-demoSemver760000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'ISC',
      },
      'node_modules/lru-cache-mini': {
        version: '10.2.0',
        resolved: 'https://registry.example.invalid/lru-cache-mini/-/lru-cache-mini-10.2.0.tgz',
        integrity: 'sha512-demoLru102000000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'ISC',
      },
      'node_modules/graph-walker-a': {
        version: '1.0.0',
        resolved: 'https://registry.example.invalid/graph-walker-a/-/graph-walker-a-1.0.0.tgz',
        integrity: 'sha512-demoWalkerA10000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'MIT',
        dependencies: {
          'graph-walker-b': '^1.0.0',
        },
      },
      'node_modules/graph-walker-b': {
        version: '1.0.0',
        resolved: 'https://registry.example.invalid/graph-walker-b/-/graph-walker-b-1.0.0.tgz',
        integrity: 'sha512-demoWalkerB10000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'MIT',
        dependencies: {
          'graph-walker-a': '^1.0.0',
        },
      },
      'node_modules/vitest-lite': {
        version: '3.1.2',
        resolved: 'https://registry.example.invalid/vitest-lite/-/vitest-lite-3.1.2.tgz',
        integrity: 'sha512-demoVitest312000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'MIT',
        dev: true,
        dependencies: {
          'tiny-assert': '^2.0.0',
          'ansi-tint': '^4.1.0',
        },
      },
      'node_modules/tiny-assert': {
        version: '2.0.1',
        resolved: 'https://registry.example.invalid/tiny-assert/-/tiny-assert-2.0.1.tgz',
        integrity: 'sha512-demoAssert201000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'MIT',
        dev: true,
      },
      'node_modules/ansi-tint': {
        version: '4.1.0',
        resolved: 'https://registry.example.invalid/ansi-tint/-/ansi-tint-4.1.0.tgz',
        integrity: 'sha512-demoAnsi41000000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'MIT',
        dev: true,
      },
      'node_modules/ts-bundle-kit': {
        version: '5.0.2',
        resolved: 'https://registry.example.invalid/ts-bundle-kit/-/ts-bundle-kit-5.0.2.tgz',
        integrity: 'sha512-demoBundle502000000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'Apache-2.0',
        dev: true,
        dependencies: {
          'esbuild-shim': '^0.24.0',
          semver: '^7.6.0',
        },
      },
      'node_modules/esbuild-shim': {
        version: '0.24.2',
        resolved: 'https://registry.example.invalid/esbuild-shim/-/esbuild-shim-0.24.2.tgz',
        integrity: 'sha512-demoEsbuild02420000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'MIT',
        dev: true,
        optionalDependencies: {
          'native-addon-optional': '^0.24.2',
        },
      },
      'node_modules/fsevents-shim': {
        version: '2.1.3',
        resolved: 'https://registry.example.invalid/fsevents-shim/-/fsevents-shim-2.1.3.tgz',
        integrity: 'sha512-demoFsevents2130000000000000000000000000000000000000000000000000000000000000000000000==',
        license: 'MIT',
        optional: true,
      },
    },
  };

  const pkgContent = JSON.stringify(manifestObj, null, 2);
  const lockContent = JSON.stringify(lockfileObj, null, 2);

  return [
    {
      path: 'orbit-telemetry-cli/package.json',
      name: 'package.json',
      content: pkgContent,
      size: pkgContent.length,
      source: 'demo',
    },
    {
      path: 'orbit-telemetry-cli/package-lock.json',
      name: 'package-lock.json',
      content: lockContent,
      size: lockContent.length,
      source: 'demo',
    },
  ];
}
