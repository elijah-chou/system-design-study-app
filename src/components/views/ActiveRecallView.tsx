import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Brain,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Sparkles,
  Layers,
  ShieldAlert,
  Trophy,
  History,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  Gauge,
  Keyboard,
  AlertTriangle,
  Package,
  Zap,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import {
  FLASHCARDS,
  QUIZ_QUESTIONS,
  FlashcardCategory,
  FlashcardItem,
} from '../../data/flashcardsQuizzes';

const LATENCY_NUMBERS_REFERENCE = [
  { metric: 'L1 / L2 CPU Cache Reference', latency: '1 ns / 4 ns', note: 'In-core register & SRAM cache lines' },
  { metric: 'Main Memory (RAM) Reference', latency: '~100 ns', note: 'Local process heap (Caffeine L1 cache)' },
  { metric: 'Redis / Memcached In-Memory Op', latency: '~0.5 ms (500 µs)', note: 'Includes VPC TCP/IP socket RTT' },
  { metric: 'NVMe SSD Random Read (4KB)', latency: '~20–100 µs (0.1 ms)', note: 'B-Tree page lookup from modern NVMe' },
  { metric: 'NVMe SSD Sequential Read (1MB)', latency: '~0.3–1 ms', note: 'LSM SSTable / Kafka log segment scan (~3 GB/s)' },
  { metric: 'Intra-Region Cross-AZ Network RTT', latency: '~0.5–1.5 ms', note: 'Synchronous Quorum / Raft replication tax' },
  { metric: 'Cross-Continent WAN RTT (US ↔ EU)', latency: '~75–150 ms', note: 'Speed-of-light fiber limit across Atlantic' },
];

const CAPACITY_MATH_SHORTCUTS = [
  { rule: 'Seconds per Day', value: '86,400 s ≈ 10^5 s', usage: '100M req/day ÷ 10^5 = 1,000 Avg QPS' },
  { rule: 'Peak QPS Multiplier', value: '2x – 3x Average QPS', usage: '1,000 Avg QPS → plan for 3,000 Peak QPS' },
  { rule: 'Powers of 2 Storage Table', value: '2^10=1KB, 2^20=1MB, 2^30=1GB, 2^40=1TB', usage: '1B rows × 1KB = 1 TB raw storage' },
  { rule: 'Single Node Throughput Ceilings', value: 'Postgres ~50k QPS | Redis Shard ~150k QPS', usage: 'Exceeding ceiling triggers sharding or L1 cache' },
];

type PracticeTab = 'flashcards' | 'quiz';
type BoxFilter = 'due' | 'all' | 'mastered';
type QuizFilter = 'all' | 'Anti-Pattern Diagnostic' | 'Trade-Off Scenario';

const CATEGORIES: ('All' | FlashcardCategory)[] = [
  'All',
  'GoF Patterns',
  'Distributed Patterns',
  'Core Trade-Offs',
  'Databases & Queues',
  'Latency & Scale Math',
  'Case Studies',
];

const DIFFICULTY_BADGE: Record<string, string> = {
  Fundamental: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Intermediate: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Advanced: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Staff+': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
};

export const ActiveRecallView: React.FC = () => {
  const {
    flashcardScores,
    recordFlashcardReview,
    quizHistory,
    recordQuizResult,
    customFlashcards: rawCustomFlashcards,
    isCommandPaletteOpen,
  } = useStudy();

  const customFlashcards: FlashcardItem[] = useMemo(() => {
    return rawCustomFlashcards.map((c) => ({
      ...c,
      isCustom: true,
    }));
  }, [rawCustomFlashcards]);

  const allFlashcards: FlashcardItem[] = useMemo(() => {
    const seen = new Set(FLASHCARDS.map((c) => c.id));
    const extras = customFlashcards.filter((c) => c && c.id && !seen.has(c.id));
    return [...FLASHCARDS, ...extras];
  }, [customFlashcards]);

  const [activeTab, setActiveTab] = useState<PracticeTab>('flashcards');
  const [showCheatSheet, setShowCheatSheet] = useState<boolean>(false);

  // --- Flashcard Deck State ---
  const [selectedCategory, setSelectedCategory] = useState<'All' | FlashcardCategory | 'Custom / Pack'>('All');
  const [boxFilter, setBoxFilter] = useState<BoxFilter>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // --- Quiz State ---
  const [quizFilter, setQuizFilter] = useState<QuizFilter>('all');
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  // Compute Leitner Box distribution across all flashcards (built-in + custom/pack)
  const boxCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allFlashcards.forEach((card) => {
      const box = (flashcardScores[card.id]?.box ?? 1) as 1 | 2 | 3 | 4 | 5;
      counts[box] = (counts[box] || 0) + 1;
    });
    return counts;
  }, [allFlashcards, flashcardScores]);

  // Filtered Flashcards
  const filteredCards = useMemo(() => {
    return allFlashcards.filter((card) => {
      const matchesCat =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Custom / Pack'
          ? Boolean(card.isCustom)
          : card.category === selectedCategory;
      const box = flashcardScores[card.id]?.box ?? 1;
      const matchesBox =
        boxFilter === 'all'
          ? true
          : boxFilter === 'due'
          ? box <= 2
          : box >= 4;
      return matchesCat && matchesBox;
    });
  }, [allFlashcards, selectedCategory, boxFilter, flashcardScores]);

  const currentCard = filteredCards[currentIndex] ?? filteredCards[0] ?? null;

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedCategory, boxFilter]);

  const handleGradeCard = useCallback(
    (rating: 'again' | 'hard' | 'good' | 'easy') => {
      if (!currentCard) return;
      recordFlashcardReview(currentCard.id, rating);
      setIsFlipped(false);
      setCurrentIndex((prev) =>
        filteredCards.length > 1 ? (prev + 1) % filteredCards.length : 0
      );
    },
    [currentCard, filteredCards.length, recordFlashcardReview]
  );

  // Filtered Quiz Questions
  const filteredQuestions = useMemo(() => {
    if (quizFilter === 'all') return QUIZ_QUESTIONS;
    return QUIZ_QUESTIONS.filter((q) => q.category === quizFilter);
  }, [quizFilter]);

  const currentQuestion = filteredQuestions[quizIndex] ?? filteredQuestions[0] ?? null;
  const currentSelectedOption = currentQuestion
    ? selectedAnswers[currentQuestion.id]
    : undefined;

  const answeredCount = useMemo(
    () => filteredQuestions.filter((q) => selectedAnswers[q.id] !== undefined).length,
    [filteredQuestions, selectedAnswers]
  );

  const currentScore = useMemo(
    () =>
      filteredQuestions.reduce(
        (acc, q) => (selectedAnswers[q.id] === q.correctIndex ? acc + 1 : acc),
        0
      ),
    [filteredQuestions, selectedAnswers]
  );

  const handleSelectOption = useCallback(
    (optionIdx: number) => {
      if (!currentQuestion || selectedAnswers[currentQuestion.id] !== undefined) return;
      const updated = { ...selectedAnswers, [currentQuestion.id]: optionIdx };
      setSelectedAnswers(updated);

      const allAnswered = filteredQuestions.every((q) => updated[q.id] !== undefined);
      if (allAnswered && !quizCompleted) {
        const finalScore = filteredQuestions.reduce(
          (acc, q) => (updated[q.id] === q.correctIndex ? acc + 1 : acc),
          0
        );
        recordQuizResult(finalScore, filteredQuestions.length, quizFilter);
        setQuizCompleted(true);
      }
    },
    [currentQuestion, selectedAnswers, filteredQuestions, quizCompleted, recordQuizResult, quizFilter]
  );

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setQuizIndex(0);
    setQuizCompleted(false);
  };

  // Keyboard shortcuts for both modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCommandPaletteOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (activeTab === 'flashcards' && currentCard) {
        if (e.code === 'Space') {
          if (target && target.tagName === 'BUTTON') return;
          e.preventDefault();
          setIsFlipped((prev) => !prev);
        } else if (isFlipped) {
          if (e.key === '1') handleGradeCard('again');
          else if (e.key === '2') handleGradeCard('hard');
          else if (e.key === '3') handleGradeCard('good');
          else if (e.key === '4') handleGradeCard('easy');
        }
        if (e.key === 'ArrowRight') {
          setIsFlipped(false);
          setCurrentIndex((prev) => (prev + 1) % Math.max(1, filteredCards.length));
        } else if (e.key === 'ArrowLeft') {
          setIsFlipped(false);
          setCurrentIndex((prev) =>
            prev > 0 ? prev - 1 : Math.max(0, filteredCards.length - 1)
          );
        }
      } else if (activeTab === 'quiz' && currentQuestion) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < currentQuestion.options.length) {
            handleSelectOption(idx);
          }
        } else if (e.key === 'ArrowRight') {
          setQuizIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1));
        } else if (e.key === 'ArrowLeft') {
          setQuizIndex((prev) => Math.max(0, prev - 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCommandPaletteOpen,
    activeTab,
    currentCard,
    isFlipped,
    filteredCards.length,
    handleGradeCard,
    currentQuestion,
    handleSelectOption,
    filteredQuestions.length,
  ]);

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Brain className="w-4 h-4" />
            Active Recall & Production Diagnostics
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            Spaced Repetition & Staff Scenario Simulator
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Reinforce mental models with Leitner Box flashcards and diagnose real-world production anti-patterns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setShowCheatSheet((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
              showCheatSheet
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-indigo-300 hover:border-indigo-500/40'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Latency &amp; Capacity Cheat Sheet</span>
            {showCheatSheet ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'flashcards'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              Leitner Flashcards ({allFlashcards.length})
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Scenario &amp; Anti-Pattern Quiz ({QUIZ_QUESTIONS.length})
            </button>
          </div>
        </div>
      </div>

      {/* Toggleable Latency & Capacity Numbers Cheat Sheet Drawer */}
      {showCheatSheet && (
        <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                Back-of-the-Envelope Latency &amp; Capacity Numbers Cheat Sheet
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Memorize orders of magnitude (ns vs µs vs ms)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Hardware & Network Latency Hierarchy */}
            <div className="lg:col-span-7 space-y-2">
              <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">
                Latency Hierarchy (L1 Cache → Global WAN)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LATENCY_NUMBERS_REFERENCE.map((item) => (
                  <div
                    key={item.metric}
                    className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-2.5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-200">{item.metric}</span>
                      <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                        {item.latency}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1">{item.note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Capacity & QPS Estimation Rules */}
            <div className="lg:col-span-5 space-y-2">
              <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                Powers of 2 &amp; QPS Conversion Rules
              </div>
              <div className="space-y-2">
                {CAPACITY_MATH_SHORTCUTS.map((rule) => (
                  <div
                    key={rule.rule}
                    className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-200">{rule.rule}</span>
                      <span className="text-xs font-mono font-bold text-amber-300">{rule.value}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{rule.usage}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'flashcards' ? (
        <div className="space-y-6">
          {/* Leitner Box 1-5 Mastery Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { box: 1, label: 'Box 1 • New / Again', color: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
              { box: 2, label: 'Box 2 • Learning', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
              { box: 3, label: 'Box 3 • Reviewing', color: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
              { box: 4, label: 'Box 4 • Proficient', color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' },
              { box: 5, label: 'Box 5 • Mastered', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
            ].map(({ box, label, color }) => (
              <div
                key={box}
                className={`border rounded-xl p-3.5 flex flex-col justify-between ${color}`}
              >
                <span className="text-xs font-medium opacity-85">{label}</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold">
                    {boxCounts[box as 1 | 2 | 3 | 4 | 5]}
                  </span>
                  <span className="text-xs opacity-75">
                    {Math.round((boxCounts[box as 1 | 2 | 3 | 4 | 5] / Math.max(1, allFlashcards.length)) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {cat}
                </button>
              ))}
              {customFlashcards.length > 0 && (
                <button
                  onClick={() => setSelectedCategory('Custom / Pack')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                    selectedCategory === 'Custom / Pack'
                      ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                      : 'bg-slate-800/60 text-fuchsia-300/80 hover:text-fuchsia-200 border border-fuchsia-500/20'
                  }`}
                >
                  <Package className="w-3 h-3" />
                  Custom / Pack ({customFlashcards.length})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(
                [
                  { id: 'due', label: 'Due / Box 1–2' },
                  { id: 'all', label: 'All Cards' },
                  { id: 'mastered', label: 'Mastered Box 4–5' },
                ] as { id: BoxFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setBoxFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    boxFilter === f.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Flashcard */}
          {currentCard ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Card <strong className="text-slate-200">{currentIndex + 1}</strong> of{' '}
                  <strong className="text-slate-200">{filteredCards.length}</strong> ({currentCard.category})
                </span>
                <span className="flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">Space</kbd> to flip, <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">1–4</kbd> to grade</span>
                </span>
              </div>

              <div
                onClick={() => setIsFlipped((prev) => !prev)}
                className="cursor-pointer select-none bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-7 min-h-[290px] flex flex-col justify-between transition-all shadow-xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300">
                      {currentCard.category}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        DIFFICULTY_BADGE[currentCard.difficulty] || DIFFICULTY_BADGE.Intermediate
                      }`}
                    >
                      {currentCard.difficulty}
                    </span>
                    {currentCard.isCustom && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
                        <Package className="w-3 h-3" />
                        Custom / Pack
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Leitner Box {flashcardScores[currentCard.id]?.box ?? 1} / 5
                  </span>
                </div>

                {!isFlipped ? (
                  <div className="my-8 text-center space-y-4">
                    <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-indigo-400 font-semibold">
                      <Sparkles className="w-3.5 h-3.5" /> Prompt (Click or Space to Reveal)
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 leading-relaxed max-w-2xl mx-auto">
                      {currentCard.front}
                    </h2>
                  </div>
                ) : (
                  <div className="my-6 space-y-4">
                    <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                      Architectural Breakdown
                    </div>
                    <div className="text-slate-200 text-sm sm:text-base whitespace-pre-line leading-relaxed bg-slate-950/70 border border-slate-800/90 rounded-xl p-4">
                      {currentCard.back}
                    </div>
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3.5 flex items-start gap-2.5">
                      <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-sm text-indigo-200">
                        <strong className="text-indigo-300">Staff Key Takeaway: </strong>
                        {currentCard.keyTakeaway}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                  <div className="flex flex-wrap gap-1.5">
                    {currentCard.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">
                    {isFlipped ? 'Select confidence below' : 'Tap card or press Space'}
                  </span>
                </div>
              </div>

              {/* Navigation & Self-Grading Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentIndex((prev) =>
                        prev > 0 ? prev - 1 : Math.max(0, filteredCards.length - 1)
                      );
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
                    title="Previous Card (Left Arrow)"
                    aria-label="Previous Card"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFlipped((prev) => !prev)}
                    className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-800"
                  >
                    {isFlipped ? 'Show Question' : 'Flip Card [Space]'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentIndex((prev) => (prev + 1) % Math.max(1, filteredCards.length));
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
                    title="Next Card (Right Arrow)"
                    aria-label="Next Card"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleGradeCard('again')}
                    className="px-3 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
                  >
                    Again [1]
                    <span className="block text-[10px] font-normal opacity-75">Reset Box 1</span>
                  </button>
                  <button
                    onClick={() => handleGradeCard('hard')}
                    className="px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors"
                  >
                    Hard [2]
                    <span className="block text-[10px] font-normal opacity-75">Hold Box</span>
                  </button>
                  <button
                    onClick={() => handleGradeCard('good')}
                    className="px-3 py-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-colors"
                  >
                    Good [3]
                    <span className="block text-[10px] font-normal opacity-75">+1 Box</span>
                  </button>
                  <button
                    onClick={() => handleGradeCard('easy')}
                    className="px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
                  >
                    Easy [4]
                    <span className="block text-[10px] font-normal opacity-75">+2 Boxes</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-10 text-center space-y-3">
              <p className="text-slate-300 font-medium">No flashcards match the current filter.</p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setBoxFilter('all');
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        /* --- QUIZ MODE --- */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Quiz Filter & Progress */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'all', label: 'All Scenarios' },
                    { id: 'Anti-Pattern Diagnostic', label: 'Spot the Anti-Pattern' },
                    { id: 'Trade-Off Scenario', label: 'Trade-Off Diagnostics' },
                  ] as { id: QuizFilter; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setQuizFilter(tab.id);
                      setQuizIndex(0);
                      setQuizCompleted(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      quizFilter === tab.id
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">
                  Score:{' '}
                  <strong className="text-emerald-400">
                    {currentScore} / {answeredCount}
                  </strong>{' '}
                  ({filteredQuestions.length} total)
                </span>
                <button
                  onClick={handleResetQuiz}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </div>

            {currentQuestion && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                      Scenario {quizIndex + 1} of {filteredQuestions.length}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded border ${
                        DIFFICULTY_BADGE[currentQuestion.difficulty]
                      }`}
                    >
                      {currentQuestion.difficulty}
                    </span>
                    {currentQuestion.antiPatternName && (
                      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {currentQuestion.antiPatternName}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-100">
                    {currentQuestion.scenarioTitle}
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                    {currentQuestion.prompt}
                  </p>
                </div>

                {currentQuestion.codeOrDiagramHint && (
                  <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-indigo-300 overflow-x-auto">
                    {currentQuestion.codeOrDiagramHint}
                  </pre>
                )}

                {/* Options */}
                <div className="space-y-2.5">
                  {currentQuestion.options.map((option, idx) => {
                    const isAnswered = currentSelectedOption !== undefined;
                    const isSelected = currentSelectedOption === idx;
                    const isCorrect = idx === currentQuestion.correctIndex;

                    let btnStyle =
                      'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-indigo-500/50 hover:bg-slate-900';
                    if (isAnswered) {
                      if (isCorrect) {
                        btnStyle =
                          'bg-emerald-500/15 border-emerald-500/50 text-emerald-200';
                      } else if (isSelected) {
                        btnStyle = 'bg-rose-500/15 border-rose-500/50 text-rose-200';
                      } else {
                        btnStyle = 'bg-slate-950/40 border-slate-800/60 text-slate-500';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        disabled={isAnswered}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${btnStyle}`}
                      >
                        <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-sm flex-1 leading-relaxed">{option}</span>
                        {isAnswered && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        {isAnswered && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Instant Architectural Rationale */}
                {currentSelectedOption !== undefined && (
                  <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Production Architectural Rationale
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}

                {/* Question Stepper */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setQuizIndex((prev) => Math.max(0, prev - 1))}
                    disabled={quizIndex === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-xs font-medium text-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <span className="text-xs text-slate-400">
                    Use keys <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">1–4</kbd> to answer
                  </span>
                  <button
                    onClick={() =>
                      setQuizIndex((prev) =>
                        Math.min(filteredQuestions.length - 1, prev + 1)
                      )
                    }
                    disabled={quizIndex === filteredQuestions.length - 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-medium text-white"
                  >
                    Next Scenario <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Question Navigator & Historical Attempt Log */}
          <div className="space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Scenario Navigator
                </h3>
                {answeredCount === filteredQuestions.length && !quizCompleted && (
                  <button
                    onClick={() => {
                      recordQuizResult(currentScore, filteredQuestions.length, quizFilter);
                      setQuizCompleted(true);
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-emerald-600 text-white font-medium"
                  >
                    Save Attempt
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {filteredQuestions.map((q, idx) => {
                  const ans = selectedAnswers[q.id];
                  const isCurrent = idx === quizIndex;
                  let pillClass = 'bg-slate-950 border-slate-800 text-slate-400';
                  if (ans !== undefined) {
                    pillClass =
                      ans === q.correctIndex
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-300';
                  }
                  return (
                    <button
                      key={q.id}
                      onClick={() => setQuizIndex(idx)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${pillClass} ${
                        isCurrent ? 'ring-2 ring-indigo-500' : ''
                      }`}
                    >
                      #{idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Historical Attempt Log
              </h3>
              {quizHistory.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Complete all questions in a scenario set to log your diagnostic score.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {quizHistory.slice(0, 10).map((attempt, i) => {
                    const pct = Math.round((attempt.score / Math.max(1, attempt.total)) * 100);
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5"
                      >
                        <div>
                          <span className="font-medium text-slate-200 block">
                            {attempt.mode === 'all' ? 'All Scenarios' : attempt.mode}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {new Date(attempt.date).toLocaleDateString()}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            pct >= 80
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : pct >= 60
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-rose-500/15 text-rose-300'
                          }`}
                        >
                          {attempt.score}/{attempt.total} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
