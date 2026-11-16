import { ParsedManifest } from '../types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractDependencyMap(
  raw: unknown,
  sectionName: string,
  errors: string[],
): Record<string, string> {
  if (raw === undefined) {
    return {};
  }
  if (!isPlainObject(raw)) {
    errors.push(`"${sectionName}" in package.json must be an object; ignored invalid value.`);
    return {};
  }
  const result: Record<string, string> = {};
  for (const [pkg, versionRange] of Object.entries(raw)) {
    if (typeof versionRange === 'string') {
      result[pkg] = versionRange;
    } else {
      errors.push(
        `Dependency "${pkg}" in "${sectionName}" has a non-string version specification; skipped.`,
      );
    }
  }
  return result;
}

function extractWorkspaces(raw: unknown, errors: string[]): string[] {
  if (raw === undefined) {
    return [];
  }
  if (Array.isArray(raw)) {
    const valid = raw.filter((item): item is string => typeof item === 'string');
    if (valid.length !== raw.length) {
      errors.push('Some entries in "workspaces" array are not strings and were ignored.');
    }
    return valid;
  }
  if (isPlainObject(raw) && Array.isArray(raw.packages)) {
    const valid = raw.packages.filter((item): item is string => typeof item === 'string');
    if (valid.length !== raw.packages.length) {
      errors.push('Some entries in "workspaces.packages" are not strings and were ignored.');
    }
    return valid;
  }
  errors.push('"workspaces" field has an unsupported type; expected array or { packages: string[] }.');
  return [];
}

function extractBundledDependencies(
  parsedObj: Record<string, unknown>,
  errors: string[],
): string[] {
  const raw = parsedObj.bundledDependencies ?? parsedObj.bundleDependencies;
  if (raw === undefined) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string');
  }
  if (typeof raw === 'boolean') {
    return [];
  }
  errors.push('"bundledDependencies" has an invalid type; expected an array of package names.');
  return [];
}

export function parsePackageManifest(content: string): ParsedManifest {
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    return {
      name: '(empty-manifest)',
      version: '0.0.0',
      scriptsCount: 0,
      dependencies: {},
      devDependencies: {},
      optionalDependencies: {},
      peerDependencies: {},
      bundledDependencies: [],
      workspaces: [],
      rawErrors: ['package.json is empty.'],
      hasName: false,
      isEmpty: true,
      isValidJson: false,
    };
  }

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown JSON syntax error';
    return {
      name: '(invalid-manifest)',
      version: '0.0.0',
      scriptsCount: 0,
      dependencies: {},
      devDependencies: {},
      optionalDependencies: {},
      peerDependencies: {},
      bundledDependencies: [],
      workspaces: [],
      rawErrors: [`Invalid JSON in package.json: ${msg}`],
      hasName: false,
      isEmpty: false,
      isValidJson: false,
    };
  }

  if (!isPlainObject(parsedUnknown)) {
    return {
      name: '(invalid-manifest)',
      version: '0.0.0',
      scriptsCount: 0,
      dependencies: {},
      devDependencies: {},
      optionalDependencies: {},
      peerDependencies: {},
      bundledDependencies: [],
      workspaces: [],
      rawErrors: ['package.json root value must be a JSON object.'],
      hasName: false,
      isEmpty: false,
      isValidJson: false,
    };
  }

  const hasName = typeof parsedUnknown.name === 'string' && parsedUnknown.name.trim().length > 0;
  const name = hasName ? (parsedUnknown.name as string).trim() : '(unnamed-project)';
  if (!hasName) {
    errors.push('Manifest does not declare a valid "name" field.');
  }

  const version =
    typeof parsedUnknown.version === 'string' && parsedUnknown.version.trim().length > 0
      ? parsedUnknown.version.trim()
      : '0.0.0';

  const description =
    typeof parsedUnknown.description === 'string' ? parsedUnknown.description : undefined;

  let license: string | undefined;
  if (typeof parsedUnknown.license === 'string') {
    license = parsedUnknown.license.trim() || undefined;
  } else if (isPlainObject(parsedUnknown.license) && typeof parsedUnknown.license.type === 'string') {
    license = parsedUnknown.license.type.trim() || undefined;
  }

  let scriptsCount = 0;
  if (parsedUnknown.scripts !== undefined) {
    if (isPlainObject(parsedUnknown.scripts)) {
      scriptsCount = Object.keys(parsedUnknown.scripts).length;
    } else {
      errors.push('"scripts" field in package.json is not an object.');
    }
  }

  const dependencies = extractDependencyMap(parsedUnknown.dependencies, 'dependencies', errors);
  const devDependencies = extractDependencyMap(
    parsedUnknown.devDependencies,
    'devDependencies',
    errors,
  );
  const optionalDependencies = extractDependencyMap(
    parsedUnknown.optionalDependencies,
    'optionalDependencies',
    errors,
  );
  const peerDependencies = extractDependencyMap(
    parsedUnknown.peerDependencies,
    'peerDependencies',
    errors,
  );
  const bundledDependencies = extractBundledDependencies(parsedUnknown, errors);
  const workspaces = extractWorkspaces(parsedUnknown.workspaces, errors);

  return {
    name,
    version,
    description,
    license,
    scriptsCount,
    dependencies,
    devDependencies,
    optionalDependencies,
    peerDependencies,
    bundledDependencies,
    workspaces,
    rawErrors: errors,
    hasName,
    isEmpty: false,
    isValidJson: true,
  };
}
