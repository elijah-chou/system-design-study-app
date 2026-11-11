import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Layers,
  Scale,
  Table2,
  Server,
  BrainCircuit,
  Sparkles,
  CheckCircle2,
  Clock,
  Circle,
  Bookmark,
  ArrowRight,
  Shuffle,
  Download,
  Upload,
  Trophy,
  Flame,
  Cpu,
  Activity,
  FileJson,
  Check,
  AlertCircle,
  PackagePlus,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { ViewId, BaseStudyItem } from '../../types';
import { SOFTWARE_PATTERNS } from '../../data/softwarePatterns';
import { DISTRIBUTED_PATTERNS } from '../../data/distributedPatterns';
import { SYSTEM_TRADEOFFS } from '../../data/systemTradeoffs';
import { FRAMEWORK_MATRICES } from '../../data/frameworkMatrices';
import { CASE_STUDIES } from '../../data/caseStudies';
import { FLASHCARDS, QUIZ_QUESTIONS } from '../../data/flashcardsQuizzes';

interface EnrichedCurriculumItem extends BaseStudyItem {
  view: ViewId;
  domainTitle: string;
}

export const DashboardView: React.FC = () => {
  const {
    mastery,
    setItemMastery,
    bookmarks,
    toggleBookmark,
    flashcardScores,
    quizHistory,
    customTopics,
    customFlashcards,
    installedPacks,
    lastContentSync,
    navigateToItem,
    setActiveView,
    exportStudyData,
    importStudyData,
  } = useStudy();

  const [recommendationSeed, setRecommendationSeed] = useState(0);
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const backupTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (backupTimeoutRef.current !== null) {
        window.clearTimeout(backupTimeoutRef.current);
      }
    };
  }, []);

  const allItems: EnrichedCurriculumItem[] = useMemo(() => {
    const list: EnrichedCurriculumItem[] = [];
    SOFTWARE_PATTERNS.forEach((x) =>
      list.push({ ...x, view: 'patterns', domainTitle: 'Software Design Patterns (GoF)' })
    );
    DISTRIBUTED_PATTERNS.forEach((x) =>
      list.push({ ...x, view: 'patterns', domainTitle: 'Distributed & Cloud Patterns' })
    );
    SYSTEM_TRADEOFFS.forEach((x) =>
      list.push({ ...x, view: 'tradeoffs', domainTitle: 'Core System Trade-Offs' })
    );
    FRAMEWORK_MATRICES.forEach((x) =>
      list.push({ ...x, view: 'matrices', domainTitle: 'Framework Comparison Matrices' })
    );
    CASE_STUDIES.forEach((x) =>
      list.push({ ...x, view: 'cases', domainTitle: 'Real-World Case Studies' })
    );
    return list;
  }, []);

  const overallStats = useMemo(() => {
    const total = allItems.length;
    let masteredCount = 0;
    let learningCount = 0;
    allItems.forEach((item) => {
      const st = mastery[item.id];
      if (st === 'mastered') masteredCount++;
      else if (st === 'learning') learningCount++;
    });
    const unstartedCount = total - masteredCount - learningCount;
    const masteredPct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
    const learningPct = total > 0 ? Math.round((learningCount / total) * 100) : 0;

    return {
      total,
      masteredCount,
      learningCount,
      unstartedCount,
      masteredPct,
      learningPct,
    };
  }, [allItems, mastery]);

  const domainCards = useMemo(() => {
    const computeDomain = (items: BaseStudyItem[]) => {
      const total = items.length;
      const masteredCount = items.filter((i) => mastery[i.id] === 'mastered').length;
      const learningCount = items.filter((i) => mastery[i.id] === 'learning').length;
      const pct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
      return { total, masteredCount, learningCount, pct };
    };

    return [
      {
        id: 'patterns-gof',
        view: 'patterns' as ViewId,
        firstItemId: SOFTWARE_PATTERNS[0]?.id,
        title: 'Classic Software Design Patterns',
        subtitle: 'Creational, Structural & Behavioral GoF in modern TypeScript',
        icon: Layers,
        accent: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300',
        barColor: 'bg-cyan-400',
        stats: computeDomain(SOFTWARE_PATTERNS),
        highlights: ['Fluent Builder & Scoped DI', 'Ports & Adapters / Middleware', 'Strategy, Reactive Observer & FSM'],
      },
      {
        id: 'patterns-dist',
        view: 'patterns' as ViewId,
        firstItemId: DISTRIBUTED_PATTERNS[0]?.id,
        title: 'Distributed & Cloud Architecture Patterns',
        subtitle: 'Resilience, data consistency, scalability & modernization',
        icon: Cpu,
        accent: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/30 text-indigo-300',
        barColor: 'bg-indigo-400',
        stats: computeDomain(DISTRIBUTED_PATTERNS),
        highlights: ['Circuit Breaker, Bulkhead & Jitter', 'Transactional Outbox, Saga & CQRS', 'Consistent Hashing & Fencing Tokens'],
      },
      {
        id: 'tradeoffs',
        view: 'tradeoffs' as ViewId,
        firstItemId: SYSTEM_TRADEOFFS[0]?.id,
        title: 'Core System Design Trade-Offs',
        subtitle: 'Foundational laws, consistency models & interactive simulators',
        icon: Scale,
        accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300',
        barColor: 'bg-amber-400',
        stats: computeDomain(SYSTEM_TRADEOFFS),
        highlights: ['CAP & PACELC Interactive Lab', 'Latency vs Throughput & Little’s Law', 'ACID Isolation, Caching & Sharding'],
      },
      {
        id: 'matrices',
        view: 'matrices' as ViewId,
        firstItemId: FRAMEWORK_MATRICES[0]?.id,
        title: 'Systems & Framework Matrices',
        subtitle: 'Head-to-head internals, radar overlays & decision wizard',
        icon: Table2,
        accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300',
        barColor: 'bg-emerald-400',
        stats: computeDomain(FRAMEWORK_MATRICES),
        highlights: ['Postgres vs Mongo vs Cassandra vs Dynamo', 'Kafka vs RabbitMQ vs Redis Streams vs SQS', 'REST vs gRPC vs GraphQL vs WebSockets'],
      },
      {
        id: 'cases',
        view: 'cases' as ViewId,
        firstItemId: CASE_STUDIES[0]?.id,
        title: 'End-to-End System Case Studies',
        subtitle: '4-step interview breakdowns, scale sliders & topology SVG',
        icon: Server,
        accent: 'from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-300',
        barColor: 'bg-violet-400',
        stats: computeDomain(CASE_STUDIES),
        highlights: ['URL Shortener & Distributed Rate Limiter', 'Real-Time Chat & Hybrid News Feed', 'Multi-Channel Notifications & Dynamo KV'],
      },
    ];
  }, [mastery]);

  const recommendedItem = useMemo(() => {
    const candidates = allItems.filter((item) => mastery[item.id] !== 'mastered');
    const pool = candidates.length > 0 ? candidates : allItems;
    if (pool.length === 0) return null;
    const idx = recommendationSeed % pool.length;
    return pool[idx];
  }, [allItems, mastery, recommendationSeed]);

  const bookmarkedItems = useMemo(() => {
    const customEnriched: EnrichedCurriculumItem[] = customTopics.map((t) => ({
      ...t,
      view: 'studio',
      domainTitle: 'Custom / Pack Topic',
    }));
    return [...allItems, ...customEnriched].filter((item) => bookmarks.includes(item.id));
  }, [allItems, customTopics, bookmarks]);

  const flashcardStats = useMemo(() => {
    const seenIds = new Set(FLASHCARDS.map((c) => c.id));
    const uniqueCustomCount = customFlashcards.filter((c) => c && c.id && !seenIds.has(c.id)).length;
    const totalCards = FLASHCARDS.length + uniqueCustomCount;
    const reviewedIds = Object.keys(flashcardScores);
    const masteredCards = reviewedIds.filter((id) => (flashcardScores[id]?.box ?? 1) >= 4).length;
    const avgQuizPct =
      quizHistory.length > 0
        ? Math.round(
            (quizHistory.reduce((acc, q) => acc + (q.total > 0 ? q.score / q.total : 0), 0) /
              quizHistory.length) *
              100
          )
        : null;
    return { totalCards, reviewedCount: reviewedIds.length, masteredCards, avgQuizPct };
  }, [flashcardScores, quizHistory, customFlashcards]);

  const showTimedBackupMessage = (msg: { type: 'success' | 'error'; text: string }, durationMs: number) => {
    if (backupTimeoutRef.current !== null) {
      window.clearTimeout(backupTimeoutRef.current);
    }
    setBackupMessage(msg);
    backupTimeoutRef.current = window.setTimeout(() => {
      setBackupMessage(null);
      backupTimeoutRef.current = null;
    }, durationMs);
  };

  const handleCopyBackup = () => {
    const data = exportStudyData();
    navigator.clipboard.writeText(data);
    showTimedBackupMessage({ type: 'success', text: 'Study progress JSON copied to clipboard!' }, 3500);
  };

  const handleDownloadBackup = () => {
    const data = exportStudyData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sysdesign-atlas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = () => {
    if (!importJsonText.trim()) return;
    const ok = importStudyData(importJsonText);
    if (ok) {
      showTimedBackupMessage({ type: 'success', text: 'Successfully restored study state from JSON!' }, 4000);
      setImportJsonText('');
    } else {
      showTimedBackupMessage({ type: 'error', text: 'Invalid JSON format. Please check your backup payload.' }, 4000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Hero Banner + Recommended Topic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Overall Progress & Welcome */}
        <div className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-indigo-950/40 border border-slate-800 p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Local-First Systems Architecture Workbench</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Master Software Patterns, Distributed Systems & Trade-Offs
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Transition from passive reading to active architectural defense. Simulate CAP/PACELC partitions, inspect B-Tree vs. LSM-Tree internals side-by-side, stress-test consistent hashing rings, and drill spaced-repetition flashcards.
            </p>
          </div>

          {/* Mastery Progress Bar */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-200 uppercase tracking-wider font-mono">
                Overall Curriculum Mastery
              </span>
              <div className="flex items-center gap-4 font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {overallStats.masteredCount} Mastered ({overallStats.masteredPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  {overallStats.learningCount} In Progress
                </span>
                <span className="hidden sm:flex items-center gap-1.5 text-slate-400">
                  <Circle className="w-3 h-3" />
                  {overallStats.unstartedCount} Remaining
                </span>
              </div>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${overallStats.masteredPct}%` }}
                title={`Mastered: ${overallStats.masteredCount}`}
              />
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${overallStats.learningPct}%` }}
                title={`Learning: ${overallStats.learningCount}`}
              />
            </div>
          </div>
        </div>

        {/* Right 5 cols: Recommended Next Topic Card */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4" /> Recommended Next Topic
              </span>
              <button
                onClick={() => setRecommendationSeed((s) => s + 1)}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/70 transition-colors cursor-pointer"
                title="Pick another unmastered topic"
              >
                <Shuffle className="w-3 h-3" /> Shuffle
              </button>
            </div>

            {recommendedItem && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {recommendedItem.domainTitle}
                  </span>
                  {recommendedItem.difficulty && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {recommendedItem.difficulty}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white">{recommendedItem.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {recommendedItem.summary}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {recommendedItem.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {recommendedItem && (
            <div className="mt-4 flex items-center gap-2.5">
              <button
                onClick={() => navigateToItem(recommendedItem.view, recommendedItem.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <span>Launch Deep Dive</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setItemMastery(
                    recommendedItem.id,
                    mastery[recommendedItem.id] === 'learning' ? 'mastered' : 'learning'
                  )
                }
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                {mastery[recommendedItem.id] === 'learning' ? 'Mark Mastered' : 'Mark Learning'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Laboratories Quick-Launch Bar */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/90 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-200">
              Interactive Visual Simulators & Sandbox Labs
            </h2>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Hands-on state machines, queueing curves, topologies & radar matrices
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => navigateToItem('patterns', 'dist-circuit-breaker')}
            className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="text-xs font-mono text-cyan-400 mb-1 flex items-center justify-between">
              <span>Pattern Simulator Lab</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="font-semibold text-sm text-white">
              Circuit Breaker, Rate Limiter & Consistent Hashing Ring
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Trip CLOSED/OPEN states, test 2x fixed-window bursts, and rebalance vnodes.
            </p>
          </button>

          <button
            onClick={() => navigateToItem('tradeoffs', 'cap-pacelc')}
            className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="text-xs font-mono text-amber-400 mb-1 flex items-center justify-between">
              <span>Distributed Laws Lab</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="font-semibold text-sm text-white">
              CAP/PACELC, Little’s Law p99 Curve & Quorum R+W&gt;N
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Simulate network partitions, utilization tail latency spikes, and ACID write skew.
            </p>
          </button>

          <button
            onClick={() => navigateToItem('matrices', 'databases-storage')}
            className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="text-xs font-mono text-emerald-400 mb-1 flex items-center justify-between">
              <span>Decision Engine & Radar</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="font-semibold text-sm text-white">
              1v1 Framework Radar Diff & Workload Wizard
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Overlay 6-axis trade-off polygons for DBs, Kafka vs RabbitMQ, and gRPC vs REST.
            </p>
          </button>

          <button
            onClick={() => navigateToItem('cases', 'url-shortener')}
            className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-violet-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="text-xs font-mono text-violet-400 mb-1 flex items-center justify-between">
              <span>Topology & Capacity Lab</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="font-semibold text-sm text-white">
              Interactive Topology Packet Flow & Scale Sliders
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Animate Read/Write paths, inject node failures, and tune DAU/QPS math live.
            </p>
          </button>
        </div>
      </div>

      {/* 6 Domain Breakdown Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Curriculum Modules & Domain Progress</h2>
          <span className="text-xs font-mono text-slate-400">
            {overallStats.total} Total Deep-Dive Topics + {FLASHCARDS.length} Flashcards + {QUIZ_QUESTIONS.length} Quiz Scenarios
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {domainCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => navigateToItem(card.view, card.firstItemId)}
                className="rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 flex flex-col justify-between transition-all group cursor-pointer shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br border ${card.accent}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                      {card.stats.masteredCount}/{card.stats.total} Mastered ({card.stats.pct}%)
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>

                  <ul className="mt-4 space-y-1.5">
                    {card.highlights.map((h) => (
                      <li key={h} className="text-xs text-slate-300 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${card.barColor}`} />
                        <span className="truncate">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80">
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mb-2.5">
                    <div
                      className={`h-full ${card.barColor} transition-all duration-300`}
                      style={{ width: `${card.stats.pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium text-indigo-400 group-hover:text-indigo-300">
                    <span>Open Module</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}

          {/* 6th Card: Active Recall & Scenario Quizzes */}
          <div
            onClick={() => setActiveView('practice')}
            className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/30 hover:to-rose-950/50 border border-slate-800 hover:border-rose-500/40 p-5 flex flex-col justify-between transition-all group cursor-pointer shadow-lg"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/10 border border-rose-500/30 text-rose-300">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-rose-300">
                  {flashcardStats.reviewedCount}/{flashcardStats.totalCards} Reviewed
                </span>
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                Active Recall & Scenario Quizzes
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Leitner spaced-repetition flashcards & Staff-level anti-pattern quizzes
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Box 4-5 Mastered</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {flashcardStats.masteredCards} Cards
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Quiz Accuracy</div>
                  <div className="text-base font-bold text-amber-400 font-mono mt-0.5 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    {flashcardStats.avgQuizPct !== null ? `${flashcardStats.avgQuizPct}%` : 'Ready'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-rose-400 group-hover:text-rose-300">
              <span>Start Practice Session</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Studio & Periodic Updates Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-indigo-950/40 border border-teal-500/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 shrink-0">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">
                Content Studio & 2026 Periodic Curriculum Updates
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                Last Sync: {lastContentSync}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Keep your study workbench fresh with one-click 2026 quarterly architecture packs (LLM Infra, eBPF Service Meshes, Outage Postmortems) or author your own custom topics & flashcards.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden md:block">
            <div className="text-xs font-mono text-teal-300">
              {installedPacks.length} Packs · {customTopics.length} Custom Topics · {customFlashcards.length} Cards
            </div>
            <div className="text-[10px] text-slate-400">Indexed in Ctrl+K & Leitner Deck</div>
          </div>
          <button
            onClick={() => setActiveView('studio')}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-teal-600/20 cursor-pointer"
          >
            <span>Open Content Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bookmarks + Backup/Restore Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bookmarked Items Quick Launch (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/70 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Bookmarked Study Queue ({bookmarkedItems.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400">Pinned for rapid pre-interview review</span>
          </div>

          {bookmarkedItems.length === 0 ? (
            <div className="py-8 px-4 rounded-xl bg-slate-950/60 border border-slate-800/70 text-center">
              <p className="text-xs text-slate-400">
                No bookmarked topics yet. Click the bookmark icon on any pattern, trade-off, comparison matrix, or case study to pin it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {bookmarkedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-amber-500/40 flex items-start justify-between gap-2 transition-colors"
                >
                  <button
                    onClick={() => navigateToItem(item.view, item.id)}
                    className="text-left min-w-0 flex-1 cursor-pointer"
                  >
                    <span className="text-[10px] font-mono text-indigo-400 block truncate">
                      {item.domainTitle}
                    </span>
                    <span className="text-sm font-semibold text-slate-100 hover:text-indigo-300 truncate block mt-0.5">
                      {item.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBookmark(item.id)}
                    className="p-1 text-amber-400 hover:text-slate-400 cursor-pointer shrink-0"
                    title="Remove Bookmark"
                    aria-label={`Remove ${item.title} from bookmarks`}
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-amber-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Local-First JSON Backup & Restore (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/70 border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Local-First State & JSON Backup
                </h3>
              </div>
              <button
                onClick={() => setShowBackupPanel((v) => !v)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                {showBackupPanel ? 'Hide Restore' : 'Import JSON'}
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              All mastery statuses, personal engineering notes, Leitner flashcard boxes, and quiz scores are stored automatically in <code className="text-slate-300">localStorage</code>. Export a snapshot anytime.
            </p>

            {backupMessage && (
              <div
                className={`mt-3 p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                  backupMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {backupMessage.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{backupMessage.text}</span>
              </div>
            )}

            {showBackupPanel && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="Paste exported study state JSON here..."
                  rows={3}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleImportBackup}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Restore State from JSON
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2.5">
            <button
              onClick={handleDownloadBackup}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Download .JSON</span>
            </button>
            <button
              onClick={handleCopyBackup}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copy JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
