import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Layers,
  Scale,
  Table2,
  Server,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Sparkles,
  PackagePlus,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { ViewId } from '../../types';
import { SOFTWARE_PATTERNS } from '../../data/softwarePatterns';
import { DISTRIBUTED_PATTERNS } from '../../data/distributedPatterns';
import { SYSTEM_TRADEOFFS } from '../../data/systemTradeoffs';
import { FRAMEWORK_MATRICES } from '../../data/frameworkMatrices';
import { CASE_STUDIES } from '../../data/caseStudies';
import { FLASHCARDS, QUIZ_QUESTIONS } from '../../data/flashcardsQuizzes';

interface NavModule {
  id: ViewId;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  itemIds: string[];
  badgeText?: string;
  accentColor: string;
}

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, mastery, customTopics, customFlashcards, installedPacks } = useStudy();
  const [collapsed, setCollapsed] = useState(false);

  const modules: NavModule[] = useMemo(() => {
    const patternIds = [
      ...SOFTWARE_PATTERNS.map((p) => p.id),
      ...DISTRIBUTED_PATTERNS.map((p) => p.id),
    ];
    const tradeoffIds = SYSTEM_TRADEOFFS.map((t) => t.id);
    const matrixIds = FRAMEWORK_MATRICES.map((m) => m.id);
    const caseIds = CASE_STUDIES.map((c) => c.id);
    const customIds = customTopics.map((t) => t.id);
    const allIds = [...patternIds, ...tradeoffIds, ...matrixIds, ...caseIds, ...customIds];

    return [
      {
        id: 'dashboard',
        label: 'Study Dashboard',
        shortLabel: 'Dashboard',
        subtitle: 'Roadmap, stats & backups',
        icon: LayoutDashboard,
        itemIds: allIds,
        accentColor: 'text-indigo-400',
      },
      {
        id: 'patterns',
        label: 'Design & Cloud Patterns',
        shortLabel: 'Patterns',
        subtitle: 'GoF + Distributed Catalog',
        icon: Layers,
        itemIds: patternIds,
        accentColor: 'text-cyan-400',
      },
      {
        id: 'tradeoffs',
        label: 'Core System Trade-Offs',
        shortLabel: 'Trade-Offs',
        subtitle: 'CAP, PACELC & Simulators',
        icon: Scale,
        itemIds: tradeoffIds,
        accentColor: 'text-amber-400',
      },
      {
        id: 'matrices',
        label: 'Framework Matrices',
        shortLabel: 'Matrices',
        subtitle: 'DBs, Brokers, RPC & Macro',
        icon: Table2,
        itemIds: matrixIds,
        accentColor: 'text-emerald-400',
      },
      {
        id: 'cases',
        label: 'Real-World Case Studies',
        shortLabel: 'Case Studies',
        subtitle: 'Topologies & Scale Math',
        icon: Server,
        itemIds: caseIds,
        accentColor: 'text-violet-400',
      },
      {
        id: 'practice',
        label: 'Active Recall & Quizzes',
        shortLabel: 'Practice',
        subtitle: 'Leitner Deck & Scenarios',
        icon: BrainCircuit,
        itemIds: [],
        badgeText: `${FLASHCARDS.length + customFlashcards.length}F · ${QUIZ_QUESTIONS.length}Q`,
        accentColor: 'text-rose-400',
      },
      {
        id: 'studio',
        label: 'Content Studio & Updates',
        shortLabel: 'Studio',
        subtitle: '2026 Packs & Custom Builder',
        icon: PackagePlus,
        itemIds: customIds,
        badgeText: `${installedPacks.length}P · ${customTopics.length}T`,
        accentColor: 'text-teal-400',
      },
    ];
  }, [customTopics, customFlashcards, installedPacks]);

  return (
    <aside
      className={`${
        collapsed ? 'w-18' : 'w-68'
      } shrink-0 border-r border-slate-800/80 bg-slate-950/75 flex flex-col justify-between transition-all duration-200 select-none`}
    >
      {/* Navigation items */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between px-2 py-1.5 mb-1">
          {!collapsed && (
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
              Curriculum Modules
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors cursor-pointer ml-auto"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {modules.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeView === mod.id;
          const masteredCount = mod.itemIds.filter((id) => mastery[id] === 'mastered').length;
          const totalCount = mod.itemIds.length;

          return (
            <button
              key={mod.id}
              onClick={() => setActiveView(mod.id)}
              title={collapsed ? `${mod.label} — ${mod.subtitle}` : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                isActive
                  ? 'bg-indigo-500/15 text-white border border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70 border border-transparent'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 transition-colors ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-slate-900/90 text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-300' : mod.accentColor}`} />
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium truncate">{mod.label}</span>
                    {mod.badgeText ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                        {mod.badgeText}
                      </span>
                    ) : totalCount > 0 && mod.id !== 'dashboard' ? (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                          masteredCount === totalCount
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {masteredCount}/{totalCount}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{mod.subtitle}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Keyboard Shortcuts / Local-First Status Card */}
      {!collapsed && (
        <div className="p-3 m-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Keyboard-First Controls</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center justify-between">
              <span>Command Palette</span>
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-950 border border-slate-800 rounded text-slate-300">
                Ctrl+K
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Flip Flashcard</span>
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-950 border border-slate-800 rounded text-slate-300">
                Space
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Grade Recall</span>
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-950 border border-slate-800 rounded text-slate-300">
                1 - 4
              </kbd>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-emerald-400/90 font-mono">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>Local-First Persistence Active</span>
          </div>
        </div>
      )}
    </aside>
  );
};
