import React from 'react';
import { FolderSearch, Play, Upload } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

interface EmptyStateProps {
  title: string;
  description: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description }) => {
  const { setActiveNav, loadDemo, isAnalyzing } = useProject();

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
        <FolderSearch className="h-6 w-6" />
      </div>
      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setActiveNav('import')}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          <Upload className="h-4 w-4" />
          Import Project Files
        </button>
        <button
          type="button"
          disabled={isAnalyzing}
          onClick={() => void loadDemo()}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
        >
          <Play className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          Load Demo Project
        </button>
      </div>
      <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
        All parsing runs locally in your browser. Project files never leave your machine.
      </p>
    </div>
  );
};
