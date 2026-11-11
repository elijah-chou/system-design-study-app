import React from 'react';
import { useStudy } from './context/StudyContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/layout/CommandPalette';
import { DashboardView } from './components/views/DashboardView';
import { PatternsCatalogView } from './components/views/PatternsCatalogView';
import { TradeoffsExplorerView } from './components/views/TradeoffsExplorerView';
import { MatrixComparisonView } from './components/views/MatrixComparisonView';
import { CaseStudiesView } from './components/views/CaseStudiesView';
import { ActiveRecallView } from './components/views/ActiveRecallView';
import { ContentStudioView } from './components/views/ContentStudioView';

export const App: React.FC = () => {
  const { activeView } = useStudy();

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'patterns':
        return <PatternsCatalogView />;
      case 'tradeoffs':
        return <TradeoffsExplorerView />;
      case 'matrices':
        return <MatrixComparisonView />;
      case 'cases':
        return <CaseStudiesView />;
      case 'practice':
        return <ActiveRecallView />;
      case 'studio':
        return <ContentStudioView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 bg-grid-pattern">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderActiveView()}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
};

export default App;
