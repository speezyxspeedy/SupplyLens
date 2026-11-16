import React from 'react';
import { Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

interface TopBarProps {
  onOpenMobileNav: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileNav }) => {
  const {
    analysis,
    globalSearch,
    setGlobalSearch,
    setActiveNav,
    settings,
    updateSettings,
  } = useProject();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (analysis) {
      setActiveNav('explorer');
    }
  };

  const formattedTimestamp = analysis
    ? new Date(analysis.timestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 px-4 lg:px-6 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="lg:hidden rounded-md p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="lg:hidden font-display text-sm font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
              SupplyLens
            </span>
            {analysis ? (
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px] sm:max-w-[260px]">
                  {analysis.projectName}
                </span>
                <span className="hidden sm:inline text-slate-400" aria-hidden="true">
                  /
                </span>
                <span className="hidden sm:inline font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                  v{analysis.projectVersion}
                </span>
                {analysis.isDemo && (
                  <>
                    <span className="hidden md:inline text-slate-400" aria-hidden="true">
                      ·
                    </span>
                    <span className="hidden md:inline text-xs font-medium text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                      Demo Project
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
                Understand every dependency in your project
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <form onSubmit={handleSearchSubmit} className="hidden md:block relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Find package..."
              aria-label="Search packages in active project"
              className="w-48 lg:w-60 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </form>

          {formattedTimestamp && (
            <span className="hidden xl:inline text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
              Analyzed {formattedTimestamp}
            </span>
          )}

          <button
            type="button"
            onClick={() =>
              updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
            }
            aria-label={settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="rounded-md border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {settings.theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('import')}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            New Analysis
          </button>
        </div>
      </div>
    </header>
  );
};
