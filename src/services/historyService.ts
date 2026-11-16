import { AnalysisResult, ScanHistoryEntry, UserSettings } from '../types';
import { DEFAULT_SETTINGS } from './fileService';

const HISTORY_KEY = 'supplylens_scan_history_v1';
const SETTINGS_KEY = 'supplylens_settings_v1';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadUserSettings(): UserSettings {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      excludedFolders: Array.isArray(parsed.excludedFolders)
        ? parsed.excludedFolders.filter((x): x is string => typeof x === 'string')
        : [...DEFAULT_SETTINGS.excludedFolders],
      excludedFileNames: Array.isArray(parsed.excludedFileNames)
        ? parsed.excludedFileNames.filter((x): x is string => typeof x === 'string')
        : [...DEFAULT_SETTINGS.excludedFileNames],
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveUserSettings(settings: UserSettings): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors silently
  }
}

export function loadScanHistory(): ScanHistoryEntry[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScanHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveScanHistoryEntry(
  result: AnalysisResult,
  maxEntries = 30,
): ScanHistoryEntry[] {
  const entry: ScanHistoryEntry = {
    scanId: result.scanId,
    projectLabel: result.projectName,
    projectVersion: result.projectVersion,
    scanDate: result.timestamp,
    totalPackageInstances: result.graph.metrics.totalPackageInstances,
    directDependencies: result.graph.metrics.directCount,
    transitiveDependencies: result.graph.metrics.transitiveCount,
    duplicatePackageCount: result.duplicates.filter((d) => d.versions.length > 1).length,
    unresolvedReferenceCount: result.graph.metrics.unresolvedCount,
    lockfileVersion: result.lockfile ? result.lockfile.lockfileVersion : null,
    analysisMode: result.analysisMode,
  };

  const existing = loadScanHistory().filter((item) => item.scanId !== entry.scanId);
  const updated = [entry, ...existing].slice(0, Math.max(1, maxEntries));
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
  }
  return updated;
}

export function deleteScanHistoryEntry(scanId: string): ScanHistoryEntry[] {
  const updated = loadScanHistory().filter((item) => item.scanId !== scanId);
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }
  return updated;
}

export function clearScanHistory(): ScanHistoryEntry[] {
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(HISTORY_KEY);
    } catch {
      // Ignore
    }
  }
  return [];
}
