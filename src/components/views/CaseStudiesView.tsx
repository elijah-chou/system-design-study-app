import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardCheck,
  Clock,
  Cpu,
  Database,
  FileText,
  Gauge,
  GitBranch,
  HardDrive,
  Layers,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Timer,
  Zap
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { CASE_STUDIES, CaseStudyItem, CaseStudyScaleDefaults } from '../../data/caseStudies';
import { ArchitectureVisualizer } from '../diagrams/ArchitectureVisualizer';
import { MasteryStatus } from '../../types';

type WalkthroughStep = 1 | 2 | 3 | 4;

const INTERVIEW_TOTAL_SECONDS = 45 * 60; // 45:00

interface InterviewPhase {
  id: string;
  label: string;
  rangeLabel: string;
  startMin: number;
  endMin: number;
  recommendedStep: WalkthroughStep;
}

const INTERVIEW_PHASES: InterviewPhase[] = [
  { id: 'req-math', label: 'Requirements & Math', rangeLabel: '0–5m', startMin: 0, endMin: 5, recommendedStep: 1 },
  { id: 'topology', label: 'High-Level Topology', rangeLabel: '5–15m', startMin: 5, endMin: 15, recommendedStep: 2 },
  { id: 'deep-dives', label: 'Deep Dives & Storage', rangeLabel: '15–35m', startMin: 15, endMin: 35, recommendedStep: 3 },
  { id: 'failures', label: 'Failure Modes & Bottlenecks', rangeLabel: '35–45m', startMin: 35, endMin: 45, recommendedStep: 4 }
];

const STAFF_RUBRIC_ITEMS: { id: string; phase: string; text: string }[] = [
  { id: 'rubric-1', phase: '0–5m', text: 'Clarified functional scope & explicit CAP/latency/availability SLAs before drawing boxes' },
  { id: 'rubric-2', phase: '0–5m', text: 'Computed Average & Peak Read/Write QPS, storage growth (TB), and Pareto hot-cache RAM' },
  { id: 'rubric-3', phase: '5–15m', text: 'Drew end-to-end Client → Edge → Compute → Async Bus → Storage topology with protocol labels' },
  { id: 'rubric-4', phase: '15–35m', text: 'Specified partition/sharding keys, index structures (B-Tree vs LSM vs HNSW), and caching strategy' },
  { id: 'rubric-5', phase: '15–35m', text: 'Traced both Write Path and Read/Cache-Miss Path step-by-step including idempotency & ordering' },
  { id: 'rubric-6', phase: '35–45m', text: 'Proactively identified single points of failure, hot keys, thundering herds, and explicit trade-offs' }
];

const DIFFICULTY_BADGE: Record<CaseStudyItem['difficulty'], string> = {
  Fundamental: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Intermediate: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Advanced: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Staff+': 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30'
};

export const CaseStudiesView: React.FC = () => {
  const {
    selectedItemId,
    setSelectedItemId,
    mastery,
    setItemMastery,
    bookmarks,
    toggleBookmark,
    notes,
    setItemNote
  } = useStudy();

  const [activeCaseId, setActiveCaseId] = useState<string>(() => {
    if (selectedItemId && CASE_STUDIES.some((c) => c.id === selectedItemId)) {
      return selectedItemId;
    }
    return CASE_STUDIES[0].id;
  });

  const [activeStep, setActiveStep] = useState<WalkthroughStep>(1);

  // --- 45-Minute Mock Interview Timer & Staff Rubric State ---
  const [secondsLeft, setSecondsLeft] = useState<number>(INTERVIEW_TOTAL_SECONDS);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [showRubricDrawer, setShowRubricDrawer] = useState<boolean>(false);
  const [checkedRubricByCase, setCheckedRubricByCase] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (secondsLeft === 0 && timerRunning) {
      setTimerRunning(false);
    }
  }, [secondsLeft, timerRunning]);

  const elapsedMinutes = (INTERVIEW_TOTAL_SECONDS - secondsLeft) / 60;
  const currentPhase = useMemo(() => {
    return (
      INTERVIEW_PHASES.find((p) => elapsedMinutes >= p.startMin && elapsedMinutes < p.endMin) ??
      INTERVIEW_PHASES[INTERVIEW_PHASES.length - 1]
    );
  }, [elapsedMinutes]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleRubricItem = (caseId: string, rubricId: string) => {
    setCheckedRubricByCase((prev) => {
      const current = prev[caseId] ?? [];
      const exists = current.includes(rubricId);
      return {
        ...prev,
        [caseId]: exists ? current.filter((id) => id !== rubricId) : [...current, rubricId]
      };
    });
  };

  // Sync when global command palette or dashboard selects a specific case study
  useEffect(() => {
    if (selectedItemId && CASE_STUDIES.some((c) => c.id === selectedItemId)) {
      setActiveCaseId(selectedItemId);
    }
  }, [selectedItemId]);

  const activeCase = useMemo(
    () => CASE_STUDIES.find((c) => c.id === activeCaseId) ?? CASE_STUDIES[0],
    [activeCaseId]
  );

  // Interactive Scale Estimator state initialized to active case study defaults
  const [scaleParams, setScaleParams] = useState<CaseStudyScaleDefaults>(activeCase.scaleDefaults);
  const [peakMultiplier, setPeakMultiplier] = useState<number>(3);

  useEffect(() => {
    setScaleParams(activeCase.scaleDefaults);
    setPeakMultiplier(3);
  }, [activeCase]);

  // Back-of-the-envelope live calculations (86,400 seconds/day ≈ 10^5 for mental math, exact 86400 here)
  const scaleMetrics = useMemo(() => {
    const dau = scaleParams.dauMillions * 1_000_000;
    const totalReadsPerDay = dau * scaleParams.readsPerUserDay;
    const totalWritesPerDay = dau * scaleParams.writesPerUserDay;

    const avgReadQps = Math.round(totalReadsPerDay / 86400);
    const peakReadQps = Math.round(avgReadQps * peakMultiplier);
    const avgWriteQps = Math.round(totalWritesPerDay / 86400);
    const peakWriteQps = Math.round(avgWriteQps * peakMultiplier);

    const readBandwidthMBps = ((avgReadQps * scaleParams.avgPayloadBytes) / (1024 * 1024)).toFixed(2);
    const writeBandwidthMBps = ((avgWriteQps * scaleParams.avgPayloadBytes) / (1024 * 1024)).toFixed(2);

    const bytesPerDay = totalWritesPerDay * scaleParams.avgPayloadBytes;
    const totalStorageTB = (
      (bytesPerDay * 365 * scaleParams.retentionYears) /
      Math.pow(1024, 4)
    ).toFixed(2);

    // Estimate Redis cache RAM (assuming 20% of daily active read working set cached for 1 year of hot writes)
    const hotCacheGB = Math.max(
      1,
      Math.round((bytesPerDay * 365 * 0.2) / Math.pow(1024, 3))
    );

    return {
      avgReadQps,
      peakReadQps,
      avgWriteQps,
      peakWriteQps,
      readBandwidthMBps,
      writeBandwidthMBps,
      totalStorageTB,
      hotCacheGB
    };
  }, [scaleParams, peakMultiplier]);

  const currentMastery: MasteryStatus = mastery[activeCase.id] ?? 'unstarted';
  const isBookmarked = bookmarks.includes(activeCase.id);
  const currentNote = notes[activeCase.id] ?? '';

  const handleSelectCase = (id: string) => {
    setActiveCaseId(id);
    setSelectedItemId(id);
  };

  return (
    <div className="space-y-6">
      {/* Header & Case Study Selector Strip */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
              <Layers className="w-4 h-4" />
              End-to-End Production Case Studies
            </div>
            <h1 className="text-2xl font-bold text-slate-100">
              Real-World System Design Walkthroughs
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Practice the 4-step staff interview framework: Requirements &amp; Capacity Math → Interactive Topology → Packet Lifecycles → Trade-Off Defense.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {(['unstarted', 'learning', 'mastered'] as MasteryStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setItemMastery(activeCase.id, status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize flex items-center gap-1.5 border transition-all ${
                  currentMastery === status
                    ? status === 'mastered'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : status === 'learning'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800 text-slate-200 border-slate-600'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {status === 'mastered' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : status === 'learning' ? (
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-500" />
                )}
                {status}
              </button>
            ))}

            <button
              type="button"
              onClick={() => toggleBookmark(activeCase.id)}
              title="Toggle Bookmark"
              aria-label={isBookmarked ? 'Remove Bookmark' : 'Bookmark Case Study'}
              className={`p-2 rounded-lg border transition-colors ${
                isBookmarked
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* 6 Case Study Pill Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {CASE_STUDIES.map((cs) => {
            const isSelected = cs.id === activeCase.id;
            const csMastery = mastery[cs.id] ?? 'unstarted';
            return (
              <button
                key={cs.id}
                type="button"
                onClick={() => handleSelectCase(cs.id)}
                className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-500/15 border-indigo-500/50 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-xs text-slate-100 leading-snug">
                    {cs.title}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded border shrink-0 ${
                      DIFFICULTY_BADGE[cs.difficulty]
                    }`}
                  >
                    {cs.difficulty}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>{cs.category}</span>
                  <span
                    className={`font-medium ${
                      csMastery === 'mastered'
                        ? 'text-emerald-400'
                        : csMastery === 'learning'
                        ? 'text-amber-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {csMastery === 'mastered' ? '★ Mastered' : csMastery === 'learning' ? '● Learning' : '○ Unstarted'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive 45-Minute Mock Interview Timer & Staff Rubric Self-Check */}
      <div className="bg-gradient-to-r from-slate-900/95 via-indigo-950/30 to-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Timer Readout & Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2">
              <Timer className={`w-4 h-4 ${timerRunning ? 'text-emerald-400 animate-pulse' : 'text-indigo-400'}`} />
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  45m Mock Interview Clock
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-mono font-bold text-slate-100">
                    {formatTimer(secondsLeft)}
                  </span>
                  <span className="text-[11px] font-medium text-indigo-300">
                    Phase: {currentPhase.rangeLabel} {currentPhase.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTimerRunning((r) => !r)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  timerRunning
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                }`}
              >
                {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {timerRunning ? 'Pause' : secondsLeft < INTERVIEW_TOTAL_SECONDS ? 'Resume' : 'Start 45:00'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setSecondsLeft(INTERVIEW_TOTAL_SECONDS);
                }}
                className="px-2.5 py-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1"
                title="Reset 45:00 Timer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>

          {/* 4-Phase Pacing Markers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1 max-w-2xl">
            {INTERVIEW_PHASES.map((phase) => {
              const isCurrent = currentPhase.id === phase.id;
              const isPassed = elapsedMinutes >= phase.endMin;
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => {
                    setSecondsLeft((45 - phase.startMin) * 60);
                    setActiveStep(phase.recommendedStep);
                  }}
                  title={`Jump timer to ${phase.rangeLabel} & open Step ${phase.recommendedStep}`}
                  className={`px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                    isCurrent
                      ? 'bg-indigo-500/25 border-indigo-400/60 text-slate-100 shadow-sm'
                      : isPassed
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300/80'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold text-indigo-300 flex items-center justify-between">
                    <span>{phase.rangeLabel}</span>
                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </div>
                  <div className="text-[11px] font-medium truncate">{phase.label}</div>
                </button>
              );
            })}
          </div>

          {/* Staff Rubric Self-Check Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowRubricDrawer((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 self-start lg:self-auto transition-all ${
              showRubricDrawer
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-950/80 text-indigo-300 border-indigo-500/40 hover:bg-indigo-950/50'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>
              Staff Rubric ({(checkedRubricByCase[activeCase.id] ?? []).length}/{STAFF_RUBRIC_ITEMS.length})
            </span>
            {showRubricDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Staff Rubric Self-Evaluation Checklist */}
        {showRubricDrawer && (
          <div className="mt-4 pt-4 border-t border-slate-800/90 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Staff+ System Design Self-Evaluation Rubric — Check off signals you articulated out loud:
              </div>
              <button
                type="button"
                onClick={() => setCheckedRubricByCase((prev) => ({ ...prev, [activeCase.id]: [] }))}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                Clear Rubric Checks
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {STAFF_RUBRIC_ITEMS.map((item) => {
                const isChecked = (checkedRubricByCase[activeCase.id] ?? []).includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleRubricItem(activeCase.id, item.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      isChecked
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isChecked ? 'text-emerald-400' : 'text-slate-600'
                      }`}
                    />
                    <div className="text-xs leading-snug">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 mr-1.5">
                        {item.phase}
                      </span>
                      {item.text}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active Case Study Overview Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${DIFFICULTY_BADGE[activeCase.difficulty]}`}>
            {activeCase.difficulty}
          </span>
          <span className="text-xs text-slate-400 font-medium">{activeCase.category}</span>
          <div className="flex flex-wrap gap-1.5 ml-auto">
            {activeCase.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[11px] rounded bg-slate-800 text-slate-300 border border-slate-700/60"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-100 mb-1.5">{activeCase.title}</h2>
        <p className="text-sm text-slate-300 leading-relaxed">{activeCase.summary}</p>

        {/* 4-Step Interview Walkthrough Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-5 pt-4 border-t border-slate-800/80">
          {[
            { step: 1 as WalkthroughStep, title: '1. Requirements & Scale Math', sub: 'SLA bounds & live QPS sliders', icon: Sliders },
            { step: 2 as WalkthroughStep, title: '2. Architecture Topology', sub: 'Interactive SVG & chaos mode', icon: Cpu },
            { step: 3 as WalkthroughStep, title: '3. Read / Write Lifecycles', sub: 'Step-by-step packet trace', icon: GitBranch },
            { step: 4 as WalkthroughStep, title: '4. Staff Deep Dives & Notes', sub: 'Trade-offs & interview defense', icon: ShieldCheck }
          ].map(({ step, title, sub, icon: Icon }) => (
            <button
              key={step}
              type="button"
              onClick={() => setActiveStep(step)}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                activeStep === step
                  ? 'bg-indigo-500/20 border-indigo-500/60 text-slate-100 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${activeStep === step ? 'text-indigo-400' : 'text-slate-500'}`} />
              <div>
                <div className="text-xs font-bold">{title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: Requirements & Interactive Scale Estimator */}
      {activeStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Functional & Non-Functional Requirements */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Functional Requirements
              </h3>
              <ul className="space-y-2.5">
                {activeCase.functionalReqs.map((req, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                    <span className="text-emerald-400 font-bold mt-0.5">0{i + 1}.</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Gauge className="w-4 h-4" /> Non-Functional &amp; SLA Constraints
              </h3>
              <ul className="space-y-2.5">
                {activeCase.nonFunctionalReqs.map((req, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                    <span className="text-amber-400 font-bold mt-0.5">SLA {i + 1}.</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Interactive Back-of-the-Envelope Scale Calculator */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4" /> Interactive Back-of-the-Envelope Estimator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Drag sliders to see how DAU, read/write asymmetry, and payload size drive sharding &amp; cache sizing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setScaleParams(activeCase.scaleDefaults);
                  setPeakMultiplier(3);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset Defaults
              </button>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Daily Active Users (DAU)</span>
                  <span className="font-mono font-bold text-indigo-300">{scaleParams.dauMillions}M</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={500}
                  step={5}
                  value={scaleParams.dauMillions}
                  onChange={(e) => setScaleParams((p) => ({ ...p, dauMillions: Number(e.target.value) }))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Reads / User / Day</span>
                  <span className="font-mono font-bold text-sky-300">{scaleParams.readsPerUserDay}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={200}
                  step={1}
                  value={scaleParams.readsPerUserDay}
                  onChange={(e) => setScaleParams((p) => ({ ...p, readsPerUserDay: Number(e.target.value) }))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Writes / User / Day</span>
                  <span className="font-mono font-bold text-emerald-300">{scaleParams.writesPerUserDay}</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={scaleParams.writesPerUserDay}
                  onChange={(e) => setScaleParams((p) => ({ ...p, writesPerUserDay: Number(e.target.value) }))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Avg Payload Size (Bytes)</span>
                  <span className="font-mono font-bold text-amber-300">{scaleParams.avgPayloadBytes} B</span>
                </div>
                <input
                  type="range"
                  min={64}
                  max={4096}
                  step={64}
                  value={scaleParams.avgPayloadBytes}
                  onChange={(e) => setScaleParams((p) => ({ ...p, avgPayloadBytes: Number(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Retention Horizon (Years)</span>
                  <span className="font-mono font-bold text-fuchsia-300">{scaleParams.retentionYears} yrs</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={scaleParams.retentionYears}
                  onChange={(e) => setScaleParams((p) => ({ ...p, retentionYears: Number(e.target.value) }))}
                  className="w-full accent-fuchsia-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Peak Traffic Multiplier</span>
                  <span className="font-mono font-bold text-rose-300">{peakMultiplier}x Avg</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={10}
                  step={1}
                  value={peakMultiplier}
                  onChange={(e) => setPeakMultiplier(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>

            {/* Live Computed Output Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-sky-400" /> Avg / Peak Read QPS
                </div>
                <div className="text-base font-mono font-bold text-slate-100 mt-1">
                  {scaleMetrics.avgReadQps.toLocaleString()} <span className="text-xs text-sky-400">/ {scaleMetrics.peakReadQps.toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">req/sec (86,400s/day)</div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" /> Avg / Peak Write QPS
                </div>
                <div className="text-base font-mono font-bold text-slate-100 mt-1">
                  {scaleMetrics.avgWriteQps.toLocaleString()} <span className="text-xs text-emerald-400">/ {scaleMetrics.peakWriteQps.toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">mutations/sec</div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" /> Network Throughput
                </div>
                <div className="text-base font-mono font-bold text-slate-100 mt-1">
                  {scaleMetrics.readBandwidthMBps} <span className="text-xs text-amber-300">MB/s R</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Write: {scaleMetrics.writeBandwidthMBps} MB/s</div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-fuchsia-400" /> {scaleParams.retentionYears}-Yr Durable Storage
                </div>
                <div className="text-base font-mono font-bold text-fuchsia-300 mt-1">
                  {scaleMetrics.totalStorageTB} TB
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Before 3x replication factor</div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-indigo-400" /> 20% Pareto Hot Cache
                </div>
                <div className="text-base font-mono font-bold text-indigo-300 mt-1">
                  ~{scaleMetrics.hotCacheGB.toLocaleString()} GB RAM
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Redis Cluster working set</div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Read : Write Ratio
                </div>
                <div className="text-base font-mono font-bold text-slate-100 mt-1">
                  {(scaleParams.readsPerUserDay / Math.max(0.01, scaleParams.writesPerUserDay)).toFixed(1)} : 1
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Dictates caching &amp; indexing</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Interactive Architecture Topology */}
      {activeStep === 2 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <ArchitectureVisualizer caseStudy={activeCase} />
        </div>
      )}

      {/* STEP 3: Read & Write Packet Lifecycles */}
      {activeStep === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Write Path Packet Lifecycle
            </h3>
            <ol className="space-y-3">
              {activeCase.writePathSteps.map((step, idx) => (
                <li
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-start gap-3"
                >
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-300 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Read Path &amp; Async Recovery Lifecycle
            </h3>
            <ol className="space-y-3">
              {activeCase.readPathSteps.map((step, idx) => (
                <li
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-start gap-3"
                >
                  <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* STEP 4: Staff-Level Deep Dives, Trade-Off Defenses & Personal Study Notes */}
      {activeStep === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {activeCase.deepDives.map((dd, idx) => (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Deep Dive #{idx + 1}
                  </span>
                  <h3 className="text-base font-bold text-slate-100">{dd.title}</h3>
                </div>

                <div className="grid grid-cols-1 gap-2.5 text-xs">
                  <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-3">
                    <div className="font-semibold text-emerald-300 mb-1">
                      ✓ Production Decision Chosen
                    </div>
                    <p className="text-slate-200 leading-relaxed">{dd.decision}</p>
                  </div>

                  <div className="bg-rose-950/25 border border-rose-500/30 rounded-xl p-3">
                    <div className="font-semibold text-rose-300 mb-1">
                      ✕ Naive Alternative Rejected
                    </div>
                    <p className="text-slate-300 leading-relaxed">{dd.alternativeRejected}</p>
                  </div>

                  <div className="bg-amber-950/25 border border-amber-500/30 rounded-xl p-3">
                    <div className="font-semibold text-amber-300 mb-1">
                      ⚖ Explicit Trade-Off Accepted
                    </div>
                    <p className="text-slate-200 leading-relaxed">{dd.tradeoffAccepted}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Personal Study Notes */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Personal Interview Notes ({activeCase.title})
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Jot down whiteboard talking points, follow-up questions, or custom failure scenarios. Auto-saved to local storage.
            </p>
            <textarea
              value={currentNote}
              onChange={(e) => setItemNote(activeCase.id, e.target.value)}
              placeholder="Write your key takeaway numbers, failure modes, and interview defense notes for this system..."
              rows={10}
              className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-y"
            />
          </div>
        </div>
      )}
    </div>
  );
};
