import React from 'react';
import {
  Activity,
  BarChart3,
  Copy,
  FilePlus2,
  FileSpreadsheet,
  GitFork,
  History,
  LayoutDashboard,
  Lock,
  Network,
  Play,
  RotateCcw,
  Settings,
  Table2,
  X,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { NavSection } from '../../types';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'import', label: 'New Analysis', icon: FilePlus2 },
  { id: 'graph', label: 'Dependency Graph', icon: Network },
  { id: 'explorer', label: 'Dependency Explorer', icon: Table2 },
  { id: 'paths', label: 'Dependency Paths', icon: GitFork },
  { id: 'duplicates', label: 'Duplicate Versions', icon: Copy },
  { id: 'insights', label: 'Package Insights', icon: BarChart3 },
  { id: 'health', label: 'Manifest & Lockfile Health', icon: Activity },
  { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  { id: 'history', label: 'Scan History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activeNav, setActiveNav, analysis, loadDemo, resetDemoAndProject, isAnalyzing } =
    useProject();

  const handleSelect = (id: NavSection) => {
    setActiveNav(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <svg
              viewBox="0 0 28 28"
              className="h-6 w-6 shrink-0"
              aria-hidden="true"
            >
              <rect
                x="2"
                y="2"
                width="24"
                height="24"
                rx="6"
                className="fill-emerald-600/15 stroke-emerald-500"
                strokeWidth="1.5"
              />
              <circle cx="9.5" cy="9.5" r="2.2" className="fill-emerald-500" />
              <circle cx="18.5" cy="9.5" r="2.2" className="fill-cyan-400" />
              <circle cx="14" cy="18.5" r="2.5" className="fill-emerald-400" />
              <path
                d="M11 11 L13.2 16.4 M17 11 L14.8 16.4 M11.7 9.5 L16.3 9.5"
                className="stroke-slate-400 dark:stroke-slate-400"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
              SupplyLens
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="px-2.5 py-3 space-y-0.5" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-3">
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={isAnalyzing}
            onClick={() => {
              void loadDemo();
              onCloseMobile();
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            Load Demo Project
          </button>
          {analysis && (
            <button
              type="button"
              onClick={() => {
                resetDemoAndProject();
                onCloseMobile();
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              Reset Project
            </button>
          )}
        </div>

        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-2.5">
          <div className="flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-snug font-medium text-slate-700 dark:text-slate-300">
              LOCAL ANALYSIS — YOUR PROJECT FILES STAY IN YOUR BROWSER.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] h-full">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
