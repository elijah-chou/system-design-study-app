import React, { useMemo } from 'react';
import {
  Cpu,
  Search,
  CheckCircle2,
  Bookmark,
  Brain,
  Trophy,
  Sparkles,
  RotateCcw,
  PackagePlus,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { SOFTWARE_PATTERNS } from '../../data/softwarePatterns';
import { DISTRIBUTED_PATTERNS } from '../../data/distributedPatterns';
import { SYSTEM_TRADEOFFS } from '../../data/systemTradeoffs';
import { FRAMEWORK_MATRICES } from '../../data/frameworkMatrices';
import { CASE_STUDIES } from '../../data/caseStudies';

export const Navbar: React.FC = () => {
  const {
    mastery,
    bookmarks,
    quizHistory,
    setCommandPaletteOpen,
    setActiveView,
    resetProgress,
  } = useStudy();

  const stats = useMemo(() => {
    const allIds = [
      ...SOFTWARE_PATTERNS.map((x) => x.id),
      ...DISTRIBUTED_PATTERNS.map((x) => x.id),
      ...SYSTEM_TRADEOFFS.map((x) => x.id),
      ...FRAMEWORK_MATRICES.map((x) => x.id),
      ...CASE_STUDIES.map((x) => x.id),
    ];
    const total = allIds.length;
    const masteredCount = allIds.filter((id) => mastery[id] === 'mastered').length;
    const learningCount = allIds.filter((id) => mastery[id] === 'learning').length;
    const pct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

    return { total, masteredCount, learningCount, pct };
  }, [mastery]);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-4">
      {/* Brand identity */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveView('dashboard')}
          className="flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">
                SysDesign <span className="text-indigo-400">Atlas</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-2.5 h-2.5" /> Staff+ Workbench
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden md:block">
              Patterns, Distributed Trade-Offs, Framework Matrices & Interactive Topologies
            </p>
          </div>
        </button>
      </div>

      {/* Command Palette Trigger */}
      <div className="flex-1 max-w-md mx-2">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all text-sm shadow-inner cursor-pointer"
        >
          <span className="flex items-center gap-2.5 truncate">
            <Search className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">Search patterns, CAP/PACELC, Kafka vs RabbitMQ, case studies...</span>
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-md shrink-0">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right Metrics Bar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mastery Pill */}
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors text-left"
          title="Overall Curriculum Mastery"
          aria-label="Overall Curriculum Mastery"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-200">
              <span>{stats.masteredCount}/{stats.total} Mastered</span>
              <span className="text-emerald-400 font-mono">({stats.pct}%)</span>
            </div>
            <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${stats.pct}%` }}
              />
            </div>
          </div>
        </button>

        {/* Bookmarks Counter */}
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
          title="Bookmarked Topics"
          aria-label="Bookmarked Topics"
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono">{bookmarks.length}</span>
        </button>

        {/* Content Studio & Updates Quick Trigger */}
        <button
          type="button"
          onClick={() => setActiveView('studio')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-xs font-medium text-teal-300 transition-colors cursor-pointer"
          title="Content Studio & Quarterly Update Packs"
          aria-label="Content Studio & Quarterly Update Packs"
        >
          <PackagePlus className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden md:inline">Updates / Studio</span>
        </button>

        {/* Active Recall Quick Trigger */}
        <button
          type="button"
          onClick={() => setActiveView('practice')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-xs font-medium text-indigo-300 transition-colors cursor-pointer"
          title="Practice Flashcards & Architectural Quizzes"
          aria-label="Practice Flashcards & Architectural Quizzes"
        >
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Active Recall</span>
          {quizHistory.length > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-indigo-500/20 rounded text-[10px] font-mono text-indigo-200">
              <Trophy className="w-2.5 h-2.5 text-amber-400" />
              {quizHistory.length}
            </span>
          )}
        </button>

        {/* Reset Progress */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Reset all local mastery progress, bookmarks, notes, and quiz scores?')) {
              resetProgress();
            }
          }}
          className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
          title="Reset All Progress"
          aria-label="Reset All Progress"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
