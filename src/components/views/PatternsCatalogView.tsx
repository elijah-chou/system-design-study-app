import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  CloudCog,
  FlaskConical,
  Search,
  Bookmark,
  CheckCircle2,
  BookOpen,
  CircleDot,
  AlertOctagon,
  Code2,
  Sparkles,
  ArrowRight,
  Layers,
  ShieldAlert,
  StickyNote,
  SplitSquareVertical,
  Check,
  Terminal,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { MasteryStatus } from '../../types';
import { SOFTWARE_PATTERNS, SoftwarePattern } from '../../data/softwarePatterns';
import { DISTRIBUTED_PATTERNS, DistributedPattern } from '../../data/distributedPatterns';
import { PatternSimulators, SimulatorLabId } from '../diagrams/PatternSimulators';

type CatalogTab = 'software' | 'distributed' | 'labs';
type CodeViewMode = 'split' | 'bad' | 'good';

const DIFFICULTY_STYLES: Record<string, string> = {
  Fundamental: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Intermediate: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  Advanced: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Staff+': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
};

export const PatternsCatalogView: React.FC = () => {
  const {
    selectedItemId,
    setSelectedItemId,
    mastery,
    setItemMastery,
    bookmarks,
    toggleBookmark,
    notes,
    setItemNote,
  } = useStudy();

  const [activeTab, setActiveTab] = useState<CatalogTab>('software');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
  const [selectedSwId, setSelectedSwId] = useState<string>(SOFTWARE_PATTERNS[0].id);
  const [selectedDistId, setSelectedDistId] = useState<string>(DISTRIBUTED_PATTERNS[0].id);
  const [codeViewMode, setCodeViewMode] = useState<CodeViewMode>('split');
  const [showNotesDrawer, setShowNotesDrawer] = useState<boolean>(false);
  const [activeSimulatorLab, setActiveSimulatorLab] = useState<SimulatorLabId>('circuit-breaker');

  // Synchronize when deep-linked from Command Palette or Dashboard
  useEffect(() => {
    if (!selectedItemId) return;
    const foundSw = SOFTWARE_PATTERNS.find((p) => p.id === selectedItemId);
    if (foundSw) {
      setActiveTab('software');
      setSelectedSwId(foundSw.id);
      setGroupFilter('ALL');
      setDifficultyFilter('ALL');
      setSearchQuery('');
      return;
    }
    const foundDist = DISTRIBUTED_PATTERNS.find((p) => p.id === selectedItemId);
    if (foundDist) {
      setActiveTab('distributed');
      setSelectedDistId(foundDist.id);
      setGroupFilter('ALL');
      setDifficultyFilter('ALL');
      setSearchQuery('');
      return;
    }
    if (
      selectedItemId === 'circuit-breaker' ||
      selectedItemId === 'rate-limiter' ||
      selectedItemId === 'consistent-hashing'
    ) {
      setActiveTab('labs');
      setActiveSimulatorLab(selectedItemId);
    }
  }, [selectedItemId]);

  const handleTabSwitch = (tab: CatalogTab) => {
    setActiveTab(tab);
    setGroupFilter('ALL');
  };

  // Filtered Software Patterns
  const filteredSoftwarePatterns = useMemo(() => {
    return SOFTWARE_PATTERNS.filter((p) => {
      if (groupFilter !== 'ALL' && p.group !== groupFilter) return false;
      if (difficultyFilter !== 'ALL' && p.difficulty !== difficultyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchSummary = p.summary.toLowerCase().includes(q);
        const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
        return matchTitle || matchSummary || matchTags;
      }
      return true;
    });
  }, [groupFilter, difficultyFilter, searchQuery]);

  // Filtered Distributed Patterns
  const filteredDistributedPatterns = useMemo(() => {
    return DISTRIBUTED_PATTERNS.filter((p) => {
      if (groupFilter !== 'ALL' && p.group !== groupFilter) return false;
      if (difficultyFilter !== 'ALL' && p.difficulty !== difficultyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchSummary = p.summary.toLowerCase().includes(q);
        const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
        return matchTitle || matchSummary || matchTags;
      }
      return true;
    });
  }, [groupFilter, difficultyFilter, searchQuery]);

  const activeSwPattern: SoftwarePattern = useMemo(() => {
    return (
      SOFTWARE_PATTERNS.find((p) => p.id === selectedSwId) ||
      filteredSoftwarePatterns[0] ||
      SOFTWARE_PATTERNS[0]
    );
  }, [selectedSwId, filteredSoftwarePatterns]);

  const activeDistPattern: DistributedPattern = useMemo(() => {
    return (
      DISTRIBUTED_PATTERNS.find((p) => p.id === selectedDistId) ||
      filteredDistributedPatterns[0] ||
      DISTRIBUTED_PATTERNS[0]
    );
  }, [selectedDistId, filteredDistributedPatterns]);

  const currentItem = activeTab === 'software' ? activeSwPattern : activeDistPattern;
  const currentMastery: MasteryStatus = mastery[currentItem.id] || 'unstarted';
  const isBookmarked = bookmarks.includes(currentItem.id);
  const currentNote = notes[currentItem.id] || '';

  // Progress statistics across all 26 patterns
  const totalPatternsCount = SOFTWARE_PATTERNS.length + DISTRIBUTED_PATTERNS.length;
  const masteredPatternsCount = useMemo(() => {
    return [...SOFTWARE_PATTERNS, ...DISTRIBUTED_PATTERNS].filter(
      (p) => mastery[p.id] === 'mastered'
    ).length;
  }, [mastery]);

  const launchLabForPattern = (labId: SimulatorLabId) => {
    setActiveSimulatorLab(labId);
    setActiveTab('labs');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Module Switcher Tabs */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
              <Layers className="w-4 h-4" />
              Software &amp; Distributed Architecture Patterns
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Design Patterns &amp; Resilience Engineering Catalog
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Master in-process GoF abstractions alongside cross-process cloud resilience, consistency, and sharding patterns.
            </p>
          </div>

          {/* Mastery Progress Pill */}
          <div className="flex items-center gap-4 bg-slate-950/90 border border-slate-800 px-4 py-2.5 rounded-xl self-start lg:self-auto">
            <div>
              <div className="text-[11px] text-slate-400">Pattern Mastery</div>
              <div className="text-sm font-bold text-white font-mono">
                {masteredPatternsCount} / {totalPatternsCount} Mastered
              </div>
            </div>
            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                style={{
                  width: `${Math.round((masteredPatternsCount / totalPatternsCount) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 3 Primary Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => handleTabSwitch('software')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'software'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Classic Software Patterns (GoF)
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono ${
                activeTab === 'software' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {SOFTWARE_PATTERNS.length}
            </span>
          </button>

          <button
            onClick={() => handleTabSwitch('distributed')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'distributed'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CloudCog className="w-4 h-4" />
            Distributed &amp; Cloud Patterns
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono ${
                activeTab === 'distributed' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {DISTRIBUTED_PATTERNS.length}
            </span>
          </button>

          <button
            onClick={() => handleTabSwitch('labs')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'labs'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            Interactive Pattern Labs (3 Simulators)
          </button>
        </div>
      </div>

      {/* TAB 3: INTERACTIVE PATTERN SIMULATOR LABS */}
      {activeTab === 'labs' ? (
        <PatternSimulators
          initialLab={activeSimulatorLab}
          onSelectLab={(lab) => setActiveSimulatorLab(lab)}
        />
      ) : (
        /* TABS 1 & 2: CATALOG EXPLORER + DETAIL WORKSPACE */
        <div className="space-y-5">
          {/* Filter & Search Bar */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'software'
                    ? 'Search GoF patterns, anti-patterns, tags (e.g., Middleware, Proxy)...'
                    : 'Search distributed patterns (e.g., Outbox, Saga, Consistent Hashing)...'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Category Group Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(activeTab === 'software'
                ? ['ALL', 'Creational', 'Structural', 'Behavioral']
                : ['ALL', 'Resilience', 'Data & Consistency', 'Scalability & Routing', 'Modernization']
              ).map((grp) => (
                <button
                  key={grp}
                  onClick={() => setGroupFilter(grp)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    groupFilter === grp
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {grp === 'ALL' ? 'All Groups' : grp}
                </button>
              ))}
            </div>

            {/* Difficulty Filter */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Difficulties</option>
              <option value="Fundamental">Fundamental</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Staff+">Staff+</option>
            </select>
          </div>

          {/* Main Master-Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar: Pattern Roster List */}
            <div className="lg:col-span-4 space-y-2 max-h-[780px] overflow-y-auto pr-1">
              {(activeTab === 'software' ? filteredSoftwarePatterns : filteredDistributedPatterns)
                .length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400">
                  No patterns match your current filter criteria.
                </div>
              ) : (
                (activeTab === 'software'
                  ? filteredSoftwarePatterns
                  : filteredDistributedPatterns
                ).map((item) => {
                  const isSelected = item.id === currentItem.id;
                  const itemMastery = mastery[item.id] || 'unstarted';
                  const itemBookmarked = bookmarks.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (activeTab === 'software') setSelectedSwId(item.id);
                        else setSelectedDistId(item.id);
                        setSelectedItemId(item.id);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-slate-800/95 border-cyan-500/60 shadow-md'
                          : 'bg-slate-900/70 border-slate-800/90 hover:bg-slate-800/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm text-white leading-snug">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {itemBookmarked && (
                            <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          )}
                          {itemMastery === 'mastered' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                          {itemMastery === 'learning' && (
                            <BookOpen className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2">{item.summary}</p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                          {item.group}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                            DIFFICULTY_STYLES[item.difficulty] || DIFFICULTY_STYLES.Intermediate
                          }`}
                        >
                          {item.difficulty}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Right Workspace: Deep-Dive Pattern Details */}
            <div className="lg:col-span-8 space-y-6">
              {/* Top Card: Title, Mastery Controls, Bookmark, Notes Trigger */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {currentItem.category} &bull; {currentItem.group}
                      </span>
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-md border ${
                          DIFFICULTY_STYLES[currentItem.difficulty]
                        }`}
                      >
                        {currentItem.difficulty}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {currentItem.title}
                    </h2>
                  </div>

                  {/* Action Controls: Bookmark, Notes, Mastery Status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => toggleBookmark(currentItem.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                        isBookmarked
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Bookmark
                        className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`}
                      />
                      {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                    </button>

                    <button
                      onClick={() => setShowNotesDrawer((s) => !s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                        showNotesDrawer || currentNote.trim().length > 0
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                      {currentNote.trim().length > 0 ? 'Edit Study Notes' : 'Add Note'}
                    </button>
                  </div>
                </div>

                {/* Mastery Selector Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 mr-1">Mastery Status:</span>
                    {(
                      [
                        { id: 'unstarted', label: 'Unstarted', icon: CircleDot },
                        { id: 'learning', label: 'Learning', icon: BookOpen },
                        { id: 'mastered', label: 'Mastered', icon: CheckCircle2 },
                      ] as const
                    ).map((st) => {
                      const Icon = st.icon;
                      const active = currentMastery === st.id;
                      return (
                        <button
                          key={st.id}
                          onClick={() => setItemMastery(currentItem.id, st.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                            active
                              ? st.id === 'mastered'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : st.id === 'learning'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-700 text-white'
                              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {st.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {currentItem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Collapsible Personal Study Notes Drawer */}
                {showNotesDrawer && (
                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5" />
                        Personal Interview &amp; Architecture Notes (Auto-Saved to LocalStorage)
                      </label>
                      <button
                        onClick={() => setShowNotesDrawer(false)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Close
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={currentNote}
                      onChange={(e) => setItemNote(currentItem.id, e.target.value)}
                      placeholder="Jot down key talking points, production anecdotes, or trade-offs for this pattern..."
                      className="w-full bg-slate-950/90 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                )}

                {/* ==========================================================
                    VIEW A: CLASSIC SOFTWARE PATTERN (GoF) DETAILS
                   ========================================================== */}
                {activeTab === 'software' && (
                  <div className="space-y-6 pt-2">
                    {/* Core Intent & Modern Engineering Context */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                        <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1.5">
                          Canonical GoF Intent
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                          {activeSwPattern.intent}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Modern Production Context
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                          {activeSwPattern.modernContext}
                        </p>
                      </div>
                    </div>

                    {/* When To Use & Real-World Framework Usages */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
                          When to Use This Pattern
                        </h3>
                        <ul className="space-y-2 text-xs text-slate-300">
                          {activeSwPattern.whenToUse.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
                          Real-World Framework &amp; SDK Examples
                        </h3>
                        <ul className="space-y-2 text-xs text-slate-300">
                          {activeSwPattern.realWorldUsages.map((usage, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                              <span>{usage}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Interactive Before / After Code Comparison Toggle */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Before vs. After Refactoring Comparison
                          </span>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                          <button
                            onClick={() => setCodeViewMode('split')}
                            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition ${
                              codeViewMode === 'split'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <SplitSquareVertical className="w-3.5 h-3.5" />
                            Side-by-Side
                          </button>
                          <button
                            onClick={() => setCodeViewMode('bad')}
                            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                              codeViewMode === 'bad'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Before (Anti-Pattern)
                          </button>
                          <button
                            onClick={() => setCodeViewMode('good')}
                            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                              codeViewMode === 'good'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            After (Idiomatic Pattern)
                          </button>
                        </div>
                      </div>

                      <div
                        className={`grid gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 ${
                          codeViewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
                        }`}
                      >
                        {(codeViewMode === 'split' || codeViewMode === 'bad') && (
                          <div className="p-4 overflow-x-auto">
                            <div className="text-xs font-semibold text-rose-400 mb-2 flex items-center gap-1.5">
                              <AlertOctagon className="w-3.5 h-3.5" />
                              {activeSwPattern.codeComparison.badTitle}
                            </div>
                            <pre className="text-[11px] leading-relaxed font-mono text-slate-300 overflow-x-auto">
                              <code>{activeSwPattern.codeComparison.badCode}</code>
                            </pre>
                          </div>
                        )}

                        {(codeViewMode === 'split' || codeViewMode === 'good') && (
                          <div className="p-4 overflow-x-auto bg-emerald-950/5">
                            <div className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {activeSwPattern.codeComparison.goodTitle}
                            </div>
                            <pre className="text-[11px] leading-relaxed font-mono text-emerald-100 overflow-x-auto">
                              <code>{activeSwPattern.codeComparison.goodCode}</code>
                            </pre>
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-3 bg-slate-900/70 border-t border-slate-800 text-xs text-slate-300">
                        <span className="font-semibold text-cyan-300">Architectural Takeaway: </span>
                        {activeSwPattern.codeComparison.explanation}
                      </div>
                    </div>

                    {/* Anti-Patterns & Production Traps Table */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4" />
                        Production Anti-Patterns &amp; Smells to Avoid
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="py-2 pr-3">Anti-Pattern Name</th>
                              <th className="py-2 px-3">Codebase Symptom</th>
                              <th className="py-2 pl-3">Idiomatic Fix</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/70">
                            {activeSwPattern.antiPatterns.map((ap, i) => (
                              <tr key={i}>
                                <td className="py-2.5 pr-3 font-semibold text-rose-300 whitespace-nowrap align-top">
                                  {ap.name}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300 align-top">
                                  {ap.symptom}
                                </td>
                                <td className="py-2.5 pl-3 text-emerald-300 align-top">
                                  {ap.fix}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pros & Cons + Related Patterns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-500/25">
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                          Architectural Strengths (Pros)
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                          {activeSwPattern.tradeoffs.pros.map((pro, i) => (
                            <li key={i}>{pro}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 rounded-xl bg-amber-950/15 border border-amber-500/25">
                        <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                          Costs &amp; Liabilities (Cons)
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                          {activeSwPattern.tradeoffs.cons.map((con, i) => (
                            <li key={i}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* ==========================================================
                    VIEW B: DISTRIBUTED & CLOUD ARCHITECTURE PATTERN DETAILS
                   ========================================================== */}
                {activeTab === 'distributed' && (
                  <div className="space-y-6 pt-2">
                    {/* Optional Interactive Simulator Launch Banner */}
                    {activeDistPattern.simulatorId && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-emerald-950/50 border border-cyan-500/40 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300">
                            <FlaskConical className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                              Interactive Visual Sandbox Available
                            </div>
                            <div className="text-xs text-slate-300">
                              Experiment with live state transitions and failure injection for{' '}
                              <span className="font-semibold text-white">{activeDistPattern.title}</span>.
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => launchLabForPattern(activeDistPattern.simulatorId!)}
                          className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow"
                        >
                          Launch Interactive Lab
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Problem Context vs Solution Mechanics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-rose-950/15 border border-rose-500/30">
                        <div className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-1.5">
                          Distributed Failure Problem
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                          {activeDistPattern.problem}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-500/30">
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                          Solution Mechanics
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                          {activeDistPattern.solutionMechanics}
                        </p>
                      </div>
                    </div>

                    {/* Step-by-Step Architectural Execution Flow */}
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">
                        Step-by-Step Architectural Mechanics
                      </h3>
                      <div className="space-y-2">
                        {activeDistPattern.architectureSteps.map((step, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs text-slate-200 leading-relaxed"
                          >
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4-Axis Quantified Distributed Trade-Offs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-[11px] font-bold uppercase text-cyan-400 mb-1">
                          Latency Impact
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {activeDistPattern.tradeoffs.latency}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-[11px] font-bold uppercase text-emerald-400 mb-1">
                          Throughput &amp; Scale
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {activeDistPattern.tradeoffs.throughput}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-[11px] font-bold uppercase text-amber-400 mb-1">
                          Consistency Model
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {activeDistPattern.tradeoffs.consistency}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-[11px] font-bold uppercase text-purple-400 mb-1">
                          Operational Complexity
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {activeDistPattern.tradeoffs.complexity}
                        </p>
                      </div>
                    </div>

                    {/* Failure Modes & Production Mitigations Table */}
                    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" />
                        Edge-Case Failure Modes &amp; Staff-Level Mitigations
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="py-2 pr-3">Failure Scenario</th>
                              <th className="py-2 px-3">Blast Radius / Impact</th>
                              <th className="py-2 pl-3">Production Mitigation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/70">
                            {activeDistPattern.failureModes.map((fm, i) => (
                              <tr key={i}>
                                <td className="py-2.5 pr-3 font-semibold text-amber-300 align-top">
                                  {fm.scenario}
                                </td>
                                <td className="py-2.5 px-3 text-rose-200/90 align-top">
                                  {fm.impact}
                                </td>
                                <td className="py-2.5 pl-3 text-emerald-300 align-top">
                                  {fm.mitigation}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Production Reference Implementation / Config Snippet */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-cyan-400" />
                          {activeDistPattern.codeOrConfigSnippet.title}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                          {activeDistPattern.codeOrConfigSnippet.language}
                        </span>
                      </div>
                      <pre className="p-4 text-[11px] leading-relaxed font-mono text-slate-200 overflow-x-auto">
                        <code>{activeDistPattern.codeOrConfigSnippet.code}</code>
                      </pre>
                    </div>

                    {/* When To Use vs Anti-Patterns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-500/25">
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                          When to Use in System Design Interviews
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                          {activeDistPattern.whenToUse.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 rounded-xl bg-rose-950/15 border border-rose-500/25">
                        <div className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">
                          Common Anti-Patterns &amp; Traps
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                          {activeDistPattern.antiPatterns.map((ap, i) => (
                            <li key={i}>{ap}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
