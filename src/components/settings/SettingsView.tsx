import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useProject();
  const [foldersInput, setFoldersInput] = useState(settings.excludedFolders.join(', '));
  const [filesInput, setFilesInput] = useState(settings.excludedFileNames.join(', '));

  const handleSaveExclusions = () => {
    const folders = foldersInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const files = filesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateSettings({ excludedFolders: folders, excludedFileNames: files });
  };

  const handleReset = () => {
    resetSettings();
    setFoldersInput('node_modules, .git, dist, build, coverage, .next, vendor');
    setFilesInput('.DS_Store, Thumbs.db');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Settings &amp; Preferences
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Non-sensitive preferences stored locally in your browser.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Defaults
        </button>
      </div>

      {/* Appearance */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-4">
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
          Appearance
        </h2>
        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">Interface Theme</p>
            <p className="text-slate-500 dark:text-slate-400">
              Dark Graphite is optimized for dense dependency graphs.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-950 p-1">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateSettings({ theme: t })}
                className={`rounded px-3 py-1.5 text-xs font-medium capitalize ${
                  settings.theme === t
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Graph & Path Limits */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-4">
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
          Graph &amp; Traversal Limits
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Graph Maximum Visible Nodes
            </label>
            <input
              type="number"
              min={20}
              max={600}
              value={settings.maxVisibleGraphNodes}
              onChange={(e) =>
                updateSettings({ maxVisibleGraphNodes: Math.max(20, Number(e.target.value) || 120) })
              }
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Default Graph Depth
            </label>
            <input
              type="number"
              min={1}
              max={15}
              value={settings.defaultGraphDepth}
              onChange={(e) =>
                updateSettings({ defaultGraphDepth: Math.max(1, Number(e.target.value) || 3) })
              }
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Max Path Results
            </label>
            <input
              type="number"
              min={5}
              max={100}
              value={settings.maxPathResults}
              onChange={(e) =>
                updateSettings({ maxPathResults: Math.max(5, Number(e.target.value) || 25) })
              }
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Scan History Retention (Entries)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.maxHistoryEntries}
              onChange={(e) =>
                updateSettings({ maxHistoryEntries: Math.max(1, Number(e.target.value) || 30) })
              }
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </section>

      {/* File & ZIP Safety Limits */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-4">
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
          Import Safety &amp; Exclusions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Maximum File / Archive Size (MB)
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={settings.maxFileSizeMb}
              onChange={(e) =>
                updateSettings({ maxFileSizeMb: Math.max(1, Number(e.target.value) || 25) })
              }
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Maximum ZIP Expanded Size (MB)
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={settings.maxZipExpandedSizeMb}
              onChange={(e) =>
                updateSettings({ maxZipExpandedSizeMb: Math.max(1, Number(e.target.value) || 50) })
              }
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Excluded Directories (comma-separated)
            </label>
            <input
              type="text"
              value={foldersInput}
              onChange={(e) => setFoldersInput(e.target.value)}
              onBlur={handleSaveExclusions}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Excluded File Names (comma-separated)
            </label>
            <input
              type="text"
              value={filesInput}
              onChange={(e) => setFilesInput(e.target.value)}
              onBlur={handleSaveExclusions}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </section>

      {/* Default Filters */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-3">
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
          Default View Filters
        </h2>
        <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.defaultHideDev}
            onChange={(e) => updateSettings({ defaultHideDev: e.target.checked })}
            className="accent-emerald-500"
          />
          Hide development dependencies by default in Dependency Graph
        </label>
        <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.defaultFilterDirectOnly}
            onChange={(e) => updateSettings({ defaultFilterDirectOnly: e.target.checked })}
            className="accent-emerald-500"
          />
          Show direct dependencies only by default in Dependency Explorer
        </label>
      </section>
    </div>
  );
};
