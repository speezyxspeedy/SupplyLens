import React, { useState } from 'react';
import { GitCompare, History, Trash2 } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { ConfirmModal } from '../common/ConfirmModal';

export const ScanHistoryView: React.FC = () => {
  const { history, deleteHistoryItem, clearAllHistory, setActiveNav } = useProject();
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const toggleCompare = (scanId: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(scanId)) return prev.filter((id) => id !== scanId);
      if (prev.length >= 2) return [prev[1], scanId];
      return [...prev, scanId];
    });
  };

  const entryA = history.find((h) => h.scanId === selectedForCompare[0]);
  const entryB = history.find((h) => h.scanId === selectedForCompare[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Local Scan History
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Stores scan summary metadata only in browser LocalStorage. Source files and manifests are never persisted.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-12 text-center">
          <History className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            No Scan History Recorded
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Analyze a project or load the demo project to record local scan summaries.
          </p>
          <button
            type="button"
            onClick={() => setActiveNav('import')}
            className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500"
          >
            Start Analysis
          </button>
        </div>
      ) : (
        <>
          {/* Compare Two Scans */}
          {entryA && entryB && (
            <section className="rounded-lg border border-cyan-500/30 bg-white dark:bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-cyan-500" />
                <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Scan Summary Comparison
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2 font-medium">Metric</th>
                      <th className="py-2 font-medium font-mono">
                        {entryA.projectLabel} ({new Date(entryA.scanDate).toLocaleDateString()})
                      </th>
                      <th className="py-2 font-medium font-mono">
                        {entryB.projectLabel} ({new Date(entryB.scanDate).toLocaleDateString()})
                      </th>
                      <th className="py-2 font-medium text-right">Delta (B − A)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                    {[
                      {
                        label: 'Total Package Instances',
                        a: entryA.totalPackageInstances,
                        b: entryB.totalPackageInstances,
                      },
                      {
                        label: 'Direct Dependencies',
                        a: entryA.directDependencies,
                        b: entryB.directDependencies,
                      },
                      {
                        label: 'Transitive Dependencies',
                        a: entryA.transitiveDependencies,
                        b: entryB.transitiveDependencies,
                      },
                      {
                        label: 'Multi-Version Packages',
                        a: entryA.duplicatePackageCount,
                        b: entryB.duplicatePackageCount,
                      },
                      {
                        label: 'Unresolved References',
                        a: entryA.unresolvedReferenceCount,
                        b: entryB.unresolvedReferenceCount,
                      },
                    ].map((row) => {
                      const diff = row.b - row.a;
                      return (
                        <tr key={row.label}>
                          <td className="py-2 font-sans text-slate-700 dark:text-slate-300">
                            {row.label}
                          </td>
                          <td className="py-2 text-slate-900 dark:text-slate-100">{row.a}</td>
                          <td className="py-2 text-slate-900 dark:text-slate-100">{row.b}</td>
                          <td
                            className={`py-2 text-right font-semibold ${
                              diff > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : diff < 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-500'
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* History Table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              Select any two rows to compare scan summaries.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Compare</th>
                    <th className="py-2.5 px-3 font-medium">Project</th>
                    <th className="py-2.5 px-3 font-medium">Date</th>
                    <th className="py-2.5 px-3 font-medium">Mode</th>
                    <th className="py-2.5 px-3 font-medium text-right">Packages</th>
                    <th className="py-2.5 px-3 font-medium text-right">Direct</th>
                    <th className="py-2.5 px-3 font-medium text-right">Duplicates</th>
                    <th className="py-2.5 px-3 font-medium text-right">Unresolved</th>
                    <th className="py-2.5 px-3 font-medium text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {history.map((item) => {
                    const checked = selectedForCompare.includes(item.scanId);
                    return (
                      <tr key={item.scanId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCompare(item.scanId)}
                            aria-label={`Select ${item.projectLabel} for comparison`}
                            className="accent-emerald-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                          {item.projectLabel}@{item.projectVersion}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                          {new Date(item.scanDate).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {item.analysisMode}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums text-slate-900 dark:text-slate-100">
                          {item.totalPackageInstances}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {item.directDependencies}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {item.duplicatePackageCount}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {item.unresolvedReferenceCount}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteHistoryItem(item.scanId)}
                            aria-label={`Delete scan ${item.projectLabel}`}
                            className="rounded p-1 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        open={confirmClearOpen}
        title="Clear All Scan History"
        message="This removes all locally stored scan summary metadata from your browser. Active project data currently loaded in memory is not affected."
        confirmLabel="Clear History"
        onConfirm={() => {
          clearAllHistory();
          setSelectedForCompare([]);
          setConfirmClearOpen(false);
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
};
