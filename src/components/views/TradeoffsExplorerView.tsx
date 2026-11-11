import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Scale,
  Bookmark,
  CheckCircle2,
  Clock,
  Circle,
  AlertOctagon,
  ShieldAlert,
  Lightbulb,
  Sparkles,
  Search,
  Copy,
  Check,
  Layers,
  Cpu,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { SYSTEM_TRADEOFFS, SystemTradeoffItem } from '../../data/systemTradeoffs';
import { TradeoffSimulators } from '../diagrams/TradeoffSimulators';
import { MasteryStatus } from '../../types';

const DIFFICULTY_STYLES: Record<string, string> = {
  Fundamental: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Intermediate: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Advanced: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Staff+': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
};

export const TradeoffsExplorerView: React.FC = () => {
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

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeId, setActiveId] = useState<string>(() => {
    if (selectedItemId && SYSTEM_TRADEOFFS.some((t) => t.id === selectedItemId)) {
      return selectedItemId;
    }
    return SYSTEM_TRADEOFFS[0].id;
  });
  const [copiedDefense, setCopiedDefense] = useState<boolean>(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Sync when CommandPalette or Dashboard navigates with selectedItemId
  useEffect(() => {
    if (selectedItemId && SYSTEM_TRADEOFFS.some((t) => t.id === selectedItemId)) {
      setActiveId(selectedItemId);
      setSelectedCategory('All');
      setSearchQuery('');
    }
  }, [selectedItemId]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(SYSTEM_TRADEOFFS.map((t) => t.category)));
    return ['All', ...unique];
  }, []);

  const filteredTopics = useMemo(() => {
    return SYSTEM_TRADEOFFS.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCat;
      const matchesSearch =
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const activeTopic: SystemTradeoffItem = useMemo(() => {
    return (
      SYSTEM_TRADEOFFS.find((t) => t.id === activeId) ??
      filteredTopics[0] ??
      SYSTEM_TRADEOFFS[0]
    );
  }, [activeId, filteredTopics]);

  const currentMastery: MasteryStatus = mastery[activeTopic.id] ?? 'unstarted';
  const isBookmarked = bookmarks.includes(activeTopic.id);
  const currentNote = notes[activeTopic.id] ?? '';

  const handleSelectTopic = (id: string) => {
    setActiveId(id);
    setSelectedItemId(id);
  };

  const handleCopyDefense = () => {
    navigator.clipboard?.writeText(activeTopic.interviewDefenseTemplate);
    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    setCopiedDefense(true);
    copyTimeoutRef.current = window.setTimeout(() => {
      setCopiedDefense(false);
      copyTimeoutRef.current = null;
    }, 2000);
  };

  const masteredCount = useMemo(
    () => SYSTEM_TRADEOFFS.filter((t) => mastery[t.id] === 'mastered').length,
    [mastery]
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Module Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              Distributed Systems Trade-Offs &amp; Interactive Simulators
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
              Master the foundational laws of distributed systems—from CAP/PACELC and M/M/1 queueing tail latency to ACID isolation anomalies, tunable quorums, caching topologies, and sharding.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-xl">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Trade-Offs Mastery
            </div>
            <div className="text-sm font-bold text-indigo-300">
              {masteredCount} / {SYSTEM_TRADEOFFS.length} Mastered
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300">
            {Math.round((masteredCount / SYSTEM_TRADEOFFS.length) * 100)}%
          </div>
        </div>
      </div>

      {/* Main Two-Column Workbench: Left Topic Selector + Right Deep-Dive & Simulator */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Column (4 cols on XL) */}
        <div className="xl:col-span-4 space-y-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter trade-offs, tags (e.g. PACELC, p99, SSI)..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                  selectedCategory === cat
                    ? 'bg-indigo-600/25 text-indigo-300 border-indigo-500/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Topic Cards List */}
          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {filteredTopics.map((topic, index) => {
              const isSelected = topic.id === activeTopic.id;
              const status = mastery[topic.id] ?? 'unstarted';
              const bookmarked = bookmarks.includes(topic.id);

              return (
                <button
                  key={topic.id}
                  onClick={() => handleSelectTopic(topic.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all group ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/70 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        0{index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {topic.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {bookmarked && (
                        <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      )}
                      {status === 'mastered' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      {status === 'learning' && <Clock className="w-4 h-4 text-amber-400" />}
                      {status === 'unstarted' && <Circle className="w-4 h-4 text-slate-600" />}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                    {topic.summary}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] font-medium text-slate-400">
                      {topic.category}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        DIFFICULTY_STYLES[topic.difficulty] ?? DIFFICULTY_STYLES.Intermediate
                      }`}
                    >
                      {topic.difficulty}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Column (8 cols on XL) */}
        <div className="xl:col-span-8 space-y-6">
          {/* Topic Overview & Mastery Controls Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    {activeTopic.category}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      DIFFICULTY_STYLES[activeTopic.difficulty]
                    }`}
                  >
                    {activeTopic.difficulty}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-100">{activeTopic.title}</h2>
              </div>

              {/* Bookmark & Mastery Action Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => toggleBookmark(activeTopic.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isBookmarked
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`}
                  />
                  {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>

                <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                  {(
                    [
                      { id: 'unstarted', label: 'Unstarted' },
                      { id: 'learning', label: 'Learning' },
                      { id: 'mastered', label: 'Mastered' },
                    ] as { id: MasteryStatus; label: string }[]
                  ).map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setItemMastery(activeTopic.id, st.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        currentMastery === st.id
                          ? st.id === 'mastered'
                            ? 'bg-emerald-600 text-white'
                            : st.id === 'learning'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-200'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{activeTopic.summary}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {activeTopic.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-slate-950 text-slate-300 border border-slate-800"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Core Architectural Tension & Mental Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-indigo-950/25 border border-indigo-500/30">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Core Architectural Tension
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {activeTopic.coreTension}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2">
                  <Lightbulb className="w-4 h-4 text-cyan-400" />
                  Intuitive Mental Model
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {activeTopic.mentalModel}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Visual Simulator Panel */}
          <TradeoffSimulators
            activeSimulatorType={activeTopic.simulatorType}
            topicId={activeTopic.id}
          />

          {/* Competing Strategies / Spectrum Comparison Cards */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Spectrum &amp; Competing Strategies Breakdown
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {activeTopic.spectrumOrStrategies.length} Architectural Strategies
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTopic.spectrumOrStrategies.map((strat) => (
                <div
                  key={strat.name}
                  className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-indigo-300">{strat.name}</h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{strat.description}</p>

                    {/* Latency & Consistency Badges */}
                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      <div className="text-[11px] bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-400 font-semibold">Latency Profile: </span>
                        <span className="text-cyan-300 font-mono">{strat.latencyProfile}</span>
                      </div>
                      <div className="text-[11px] bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-400 font-semibold">Consistency: </span>
                        <span className="text-emerald-300 font-mono">
                          {strat.consistencyProfile}
                        </span>
                      </div>
                    </div>

                    {/* Pros & Cons */}
                    <div className="space-y-2 pt-1">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                          Strengths / What You Gain
                        </div>
                        <ul className="space-y-1">
                          {strat.pros.map((pro, i) => (
                            <li
                              key={i}
                              className="text-xs text-slate-300 flex items-start gap-1.5 leading-snug"
                            >
                              <span className="text-emerald-400 font-bold mt-0.5">+</span>
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 mb-1">
                          Trade-Offs / What You Sacrifice
                        </div>
                        <ul className="space-y-1">
                          {strat.cons.map((con, i) => (
                            <li
                              key={i}
                              className="text-xs text-slate-300 flex items-start gap-1.5 leading-snug"
                            >
                              <span className="text-rose-400 font-bold mt-0.5">−</span>
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Footer: Best For & Real-World Systems */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="text-xs text-slate-300">
                      <strong className="text-slate-100">Best For: </strong>
                      {strat.bestFor}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-500 mr-0.5" />
                      {strat.realWorldSystems.map((sys) => (
                        <span
                          key={sys}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25"
                        >
                          {sys}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Failure Modes & Production Mitigations Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-bold text-slate-100">
                Production Failure Modes &amp; Engineering Mitigations
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4 w-1/4">Failure Mode</th>
                    <th className="py-3 px-4 w-3/8">Root Cause &amp; Failure Mechanism</th>
                    <th className="py-3 px-4 w-3/8">Staff-Level Production Mitigation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {activeTopic.failureModes.map((fm) => (
                    <tr key={fm.name} className="hover:bg-slate-950/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-rose-300 align-top">
                        {fm.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 leading-relaxed align-top">
                        {fm.mechanism}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-300/95 leading-relaxed align-top">
                        <div className="flex items-start gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{fm.mitigation}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interview Trap & Staff-Level Defense Template Callout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Common Interview Trap to Avoid
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {activeTopic.interviewTrap}
              </p>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-2xl p-5 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Staff-Level Trade-Off Defense Template
                  </span>
                  <button
                    onClick={handleCopyDefense}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                  >
                    {copiedDefense ? (
                      <>
                        <Check className="w-3 h-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Script
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs italic text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-emerald-500/20">
                  {activeTopic.interviewDefenseTemplate}
                </p>
              </div>
            </div>
          </div>

          {/* Personal Study Notes (Persisted in LocalStorage) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-slate-200">
                  Personal Study Notes — {activeTopic.title}
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">Auto-saved locally</span>
            </div>
            <textarea
              rows={3}
              value={currentNote}
              onChange={(e) => setItemNote(activeTopic.id, e.target.value)}
              placeholder="Write your own architectural notes, latency rules of thumb, or past production outage takeaways for this topic..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
