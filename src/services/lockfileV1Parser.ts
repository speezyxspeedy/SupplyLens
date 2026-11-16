import { LockfilePackageRecord, ParsedLockfile } from '../types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringMap(raw: unknown): Record<string, string> {
  if (!isPlainObject(raw)) return {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') {
      result[k] = v;
    }
  }
  return result;
}

export function parseLockfileV1(
  content: string,
  kind: 'package-lock.json' | 'npm-shrinkwrap.json' = 'package-lock.json',
): ParsedLockfile {
  const parseErrors: string[] = [];
  const warnings: string[] = [];
  const packages = new Map<string, LockfilePackageRecord>();

  if (!content || content.trim().length === 0) {
    return {
      kind,
      lockfileVersion: 1,
      packages,
      parseErrors: [`${kind} is empty.`],
      warnings,
      isSupported: false,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown syntax error';
    return {
      kind,
      lockfileVersion: 1,
      packages,
      parseErrors: [`Invalid JSON in ${kind}: ${msg}`],
      warnings,
      isSupported: false,
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      kind,
      lockfileVersion: 1,
      packages,
      parseErrors: [`${kind} root must be a JSON object.`],
      warnings,
      isSupported: false,
    };
  }

  const lockfileVersion =
    typeof parsed.lockfileVersion === 'number' ? parsed.lockfileVersion : 1;

  if (lockfileVersion !== 1) {
    return {
      kind,
      lockfileVersion,
      packages,
      parseErrors: [`Expected lockfileVersion 1, found ${lockfileVersion}.`],
      warnings,
      isSupported: false,
    };
  }

  const projectName = typeof parsed.name === 'string' ? parsed.name : undefined;
  const projectVersion = typeof parsed.version === 'string' ? parsed.version : undefined;

  const topDependencies = isPlainObject(parsed.dependencies) ? parsed.dependencies : {};
  if (!isPlainObject(parsed.dependencies)) {
    warnings.push(`${kind} v1 does not contain a "dependencies" object.`);
  }

  const rootDependencies: Record<string, string> = {};
  const visitedObjects = new WeakSet<object>();

  function walkDependencies(
    depsObj: Record<string, unknown>,
    parentLocation: string,
    depth: number,
  ) {
    if (depth > 40) {
      warnings.push('Lockfile v1 nesting exceeded 40 levels; deeper branches were truncated.');
      return;
    }

    for (const [pkgName, rawEntry] of Object.entries(depsObj)) {
      if (!isPlainObject(rawEntry)) {
        warnings.push(`Skipped malformed v1 dependency entry for "${pkgName}".`);
        continue;
      }
      if (visitedObjects.has(rawEntry)) {
        continue;
      }
      visitedObjects.add(rawEntry);

      const location = parentLocation
        ? `${parentLocation}/node_modules/${pkgName}`
        : `node_modules/${pkgName}`;

      const rawVersion = typeof rawEntry.version === 'string' ? rawEntry.version.trim() : '';
      const hasMissingVersion = rawVersion.length === 0;
      const version = rawVersion || 'unknown';
      if (hasMissingVersion) {
        warnings.push(`Lockfile v1 entry "${pkgName}" at "${location}" is missing a version.`);
      }

      const requires = readStringMap(rawEntry.requires);
      // Merge nested dependency names into requires map if not explicitly listed in requires
      const nestedDeps = isPlainObject(rawEntry.dependencies) ? rawEntry.dependencies : undefined;
      if (nestedDeps) {
        for (const [nestedName, nestedVal] of Object.entries(nestedDeps)) {
          if (!requires[nestedName] && isPlainObject(nestedVal) && typeof nestedVal.version === 'string') {
            requires[nestedName] = nestedVal.version;
          }
        }
      }

      if (!parentLocation) {
        rootDependencies[pkgName] = version;
      }

      const record: LockfilePackageRecord = {
        location,
        name: pkgName,
        version,
        resolved: typeof rawEntry.resolved === 'string' ? rawEntry.resolved : undefined,
        integrity: typeof rawEntry.integrity === 'string' ? rawEntry.integrity : undefined,
        dev: rawEntry.dev === true,
        optional: rawEntry.optional === true,
        dependencies: requires,
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
        hasMissingVersion,
      };

      packages.set(location, record);

      if (nestedDeps) {
        walkDependencies(nestedDeps, location, depth + 1);
      }
    }
  }

  walkDependencies(topDependencies, '', 0);

  const rootRecord: LockfilePackageRecord = {
    location: '',
    name: projectName ?? '(root)',
    version: projectVersion ?? '0.0.0',
    dependencies: rootDependencies,
    devDependencies: {},
    optionalDependencies: {},
    peerDependencies: {},
  };
  packages.set('', rootRecord);

  warnings.push(
    'Lockfile v1 does not embed license metadata or distinguish devDependencies vs dependencies on the root record; package.json declarations are used for direct dependency classification.',
  );

  return {
    kind,
    lockfileVersion: 1,
    projectName,
    projectVersion,
    packages,
    rootRecord,
    parseErrors,
    warnings,
    isSupported: true,
  };
}

export function parseLockfileAuto(
  content: string,
  kind: 'package-lock.json' | 'npm-shrinkwrap.json' = 'package-lock.json',
): ParsedLockfile {
  if (!content || content.trim().length === 0) {
    return {
      kind,
      lockfileVersion: 0,
      packages: new Map(),
      parseErrors: [`${kind} is empty.`],
      warnings: [],
      isSupported: false,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown syntax error';
    return {
      kind,
      lockfileVersion: 0,
      packages: new Map(),
      parseErrors: [`Invalid JSON in ${kind}: ${msg}`],
      warnings: [],
      isSupported: false,
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      kind,
      lockfileVersion: 0,
      packages: new Map(),
      parseErrors: [`${kind} root must be a JSON object.`],
      warnings: [],
      isSupported: false,
    };
  }

  const version = typeof parsed.lockfileVersion === 'number' ? parsed.lockfileVersion : 0;

  if (version === 2 || version === 3) {
    // Pass raw content to v2/v3 parser
    // Dynamic import avoided; we call parseLockfileV2V3 directly via circular-free import if needed,
    // or import parseLockfileV2V3 at top level. Let's keep lockfileV2V3Parser separate and combine in a helper!
    return {
      kind,
      lockfileVersion: version,
      packages: new Map(),
      parseErrors: ['Use parseLockfileV2V3 for lockfile v2/v3.'],
      warnings: [],
      isSupported: false,
    };
  }

  if (version === 1) {
    return parseLockfileV1(content, kind);
  }

  return {
    kind,
    lockfileVersion: version,
    projectName: typeof parsed.name === 'string' ? parsed.name : undefined,
    projectVersion: typeof parsed.version === 'string' ? parsed.version : undefined,
    packages: new Map(),
    parseErrors: [
      version === 0
        ? `${kind} does not declare a recognized lockfileVersion.`
        : `Unsupported lockfileVersion ${version}. SupplyLens supports npm lockfile versions 1, 2, and 3.`,
    ],
    warnings: [],
    isSupported: false,
  };
}
