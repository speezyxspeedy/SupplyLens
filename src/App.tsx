import React, { useState } from 'react';
import { OverviewView } from './components/dashboard/OverviewView';
import { DuplicateVersionsView } from './components/duplicates/DuplicateVersionsView';
import { DependencyExplorerView } from './components/explorer/DependencyExplorerView';
import { DependencyGraphView } from './components/graph/DependencyGraphView';
import { HealthAnalyzerView } from './components/health/HealthAnalyzerView';
import { ScanHistoryView } from './components/history/ScanHistoryView';
import { ImportView } from './components/importer/ImportView';
import { PackageInsightsView } from './components/insights/PackageInsightsView';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DependencyPathsView } from './components/paths/DependencyPathsView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { ProjectProvider, useProject } from './context/ProjectContext';

const MainShell: React.FC = () => {
  const { activeNav, isAnalyzing } = useProject();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeNav) {
      case 'overview':
        return <OverviewView />;
      case 'import':
        return <ImportView />;
      case 'graph':
        return <DependencyGraphView />;
      case 'explorer':
        return <DependencyExplorerView />;
      case 'paths':
        return <DependencyPathsView />;
      case 'duplicates':
        return <DuplicateVersionsView />;
      case 'insights':
        return <PackageInsightsView />;
      case 'health':
        return <HealthAnalyzerView />;
      case 'reports':
        return <ReportsView />;
      case 'history':
        return <ScanHistoryView />;
      case 'settings':
        return <SettingsView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {isAnalyzing && (
            <div className="mb-4 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-medium text-cyan-700 dark:text-cyan-300">
              Analyzing project manifests and lockfile relationships locally...
            </div>
          )}
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ProjectProvider>
      <MainShell />
    </ProjectProvider>
  );
}
