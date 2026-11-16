import React, { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { Severity } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { SeverityIndicator } from '../common/StatusIndicators';

export const HealthAnalyzerView: React.FC = () => {
  const { analysis } = useProject();
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');

  const filtered = useMemo(() => {
    if (!analysis) return [];
    if (severityFilter === 'ALL') return analysis.healthFindings;
    return analysis.healthFindings.filter((f) => f.severity === severityFilter);
  }, [analysis, severityFilter]);

  if (!analysis) {
    return (
      <EmptyState
        title="No Project Loaded for Health Analysis"
        description="Import a Node.js project or load the demo project to verify manifest validity, lockfile synchronization, and unresolved references."
      />
    );
  }

  const counts: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };
  for (const f of analysis.healthFindings) {
    counts[f.severity]++;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
          Manifest &amp; Lockfile Health
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Structural consistency checks across <code className="font-mono text-xs">package.json</code> and lockfile metadata. SupplyLens does not claim CVEs or outdated versions without an external advisory database.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-2">
        <button
          type="button"
          onClick={() => setSeverityFilter('ALL')}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            severityFilter === 'ALL'
              ? 'bg-slate-900 dark:bg-slate-800 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          All ({analysis.healthFindings.length})
        </button>
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as Severity[]).map((sev) => (
          <button
            key={sev}
            type="button"
            onClick={() => setSeverityFilter(sev)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap tabular-nums ${
              severityFilter === sev
                ? 'bg-slate-900 dark:bg-slate-800 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {sev} ({counts[sev]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">
            No findings in this severity filter
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((finding) => (
            <article
              key={finding.id}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <SeverityIndicator severity={finding.severity} />
                  <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {finding.title}
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-slate-400">{finding.code}</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {finding.description}
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-200">Next step:</strong>{' '}
                {finding.recommendation}
              </p>

              {finding.affectedItems && finding.affectedItems.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Affected items ({finding.affectedItems.length}):
                  </p>
                  <div className="max-h-28 overflow-y-auto font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
                    {finding.affectedItems.map((item, idx) => (
                      <div key={idx}>{item}</div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
