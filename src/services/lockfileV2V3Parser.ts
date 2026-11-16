import { LockfilePackageRecord, ParsedLockfile } from '../types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Extracts package name from a lockfile v2/v3 package location path.
 * Handles scoped packages and nested node_modules, e.g.:
 * - "node_modules/react" -> "react"
 * - "node_modules/@types/node" -> "@types/node"
 * - "node_modules/vite/node_modules/@esbuild/linux-x64" -> "@esbuild/linux-x64"
 */
export function extractPackageNameFromLocation(location: string): string {
  if (!location) return '';
  const marker = 'node_modules/';
  const lastIdx = location.lastIndexOf(marker);
  if (lastIdx === -1) {
    return location;
  }
  const rest = location.slice(lastIdx + marker.length);
  if (!rest) return '';
  if (rest.startsWith('@')) {
    const parts = rest.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : rest;
  }
  const slashIdx = rest.indexOf('/');
  return slashIdx === -1 ? rest : rest.slice(0, slashIdx);
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

function readLicense(raw: unknown): string | undefined {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (isPlainObject(raw) && typeof raw.type === 'string') {
    const trimmed = raw.type.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

export function parseLockfileV2V3(
  content: string,
  kind: 'package-lock.json' | 'npm-shrinkwrap.json' = 'package-lock.json',
): ParsedLockfile {
  const parseErrors: string[] = [];
  const warnings: string[] = [];
  const packages = new Map<string, LockfilePackageRecord>();

  if (!content || content.trim().length === 0) {
    return {
      kind,
      lockfileVersion: 0,
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
      lockfileVersion: 0,
      packages,
      parseErrors: [`Invalid JSON in ${kind}: ${msg}`],
      warnings,
      isSupported: false,
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      kind,
      lockfileVersion: 0,
      packages,
      parseErrors: [`${kind} root must be a JSON object.`],
      warnings,
      isSupported: false,
    };
  }

  const lockfileVersion =
    typeof parsed.lockfileVersion === 'number' ? parsed.lockfileVersion : 0;

  if (lockfileVersion !== 2 && lockfileVersion !== 3) {
    return {
      kind,
      lockfileVersion,
      projectName: typeof parsed.name === 'string' ? parsed.name : undefined,
      projectVersion: typeof parsed.version === 'string' ? parsed.version : undefined,
      packages,
      parseErrors: [
        lockfileVersion === 0
          ? `${kind} is missing a numeric "lockfileVersion" field.`
          : `Lockfile version ${lockfileVersion} is not a v2/v3 structure.`,
      ],
      warnings,
      isSupported: false,
    };
  }

  if (!isPlainObject(parsed.packages)) {
    return {
      kind,
      lockfileVersion,
      projectName: typeof parsed.name === 'string' ? parsed.name : undefined,
      projectVersion: typeof parsed.version === 'string' ? parsed.version : undefined,
      packages,
      parseErrors: [`${kind} v${lockfileVersion} is missing a valid "packages" object.`],
      warnings,
      isSupported: false,
    };
  }

  let rootRecord: LockfilePackageRecord | undefined;

  for (const [rawLocation, rawEntry] of Object.entries(parsed.packages)) {
    if (!isPlainObject(rawEntry)) {
      warnings.push(`Skipped malformed package record at "${rawLocation}".`);
      continue;
    }

    const isRoot = rawLocation === '';
    const inferredName = isRoot
      ? typeof rawEntry.name === 'string'
        ? rawEntry.name
        : typeof parsed.name === 'string'
          ? parsed.name
          : '(root)'
      : typeof rawEntry.name === 'string' && rawEntry.name.trim().length > 0
        ? rawEntry.name.trim()
        : extractPackageNameFromLocation(rawLocation);

    const isLink = rawEntry.link === true;
    const rawVersion = typeof rawEntry.version === 'string' ? rawEntry.version.trim() : '';
    const hasMissingVersion = !isRoot && !isLink && rawVersion.length === 0;
    const version = rawVersion || (isLink ? 'workspace-link' : isRoot ? '0.0.0' : 'unknown');

    if (hasMissingVersion) {
      warnings.push(`Package record "${rawLocation}" (${inferredName}) is missing a "version" field.`);
    }

    const record: LockfilePackageRecord = {
      location: rawLocation,
      name: inferredName,
      version,
      resolved: typeof rawEntry.resolved === 'string' ? rawEntry.resolved : undefined,
      integrity: typeof rawEntry.integrity === 'string' ? rawEntry.integrity : undefined,
      license: readLicense(rawEntry.license),
      dev: rawEntry.dev === true,
      optional: rawEntry.optional === true,
      devOptional: rawEntry.devOptional === true,
      peer: rawEntry.peer === true,
      link: isLink,
      resolvedTarget: isLink && typeof rawEntry.resolved === 'string' ? rawEntry.resolved : undefined,
      dependencies: readStringMap(rawEntry.dependencies),
      devDependencies: readStringMap(rawEntry.devDependencies),
      optionalDependencies: readStringMap(rawEntry.optionalDependencies),
      peerDependencies: readStringMap(rawEntry.peerDependencies),
      hasMissingVersion,
    };

    if (isRoot) {
      rootRecord = record;
    }
    packages.set(rawLocation, record);
  }

  if (!rootRecord) {
    warnings.push(
      `${kind} does not include an explicit root "" entry in "packages"; direct dependency resolution will fall back to package.json declarations.`,
    );
  }

  return {
    kind,
    lockfileVersion,
    projectName:
      typeof parsed.name === 'string' ? parsed.name : rootRecord?.name,
    projectVersion:
      typeof parsed.version === 'string' ? parsed.version : rootRecord?.version,
    packages,
    rootRecord,
    parseErrors,
    warnings,
    isSupported: true,
  };
}
