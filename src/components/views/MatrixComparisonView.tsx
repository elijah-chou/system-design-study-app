import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Swords,
  Compass,
  Bookmark,
  CheckCircle2,
  Clock,
  Circle,
  Search,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  StickyNote,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { MasteryStatus } from '../../types';
import { FRAMEWORK_MATRICES, FrameworkMatrix } from '../../data/frameworkMatrices';
import { TradeoffRadar } from '../diagrams/TradeoffRadar';

type ViewMode = 'matrix' | 'diff' | 'wizard';

export const MatrixComparisonView: React.FC = () => {
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

  const [activeMatrixId, setActiveMatrixId] = useState<string>(() => {
    if (selectedItemId && FRAMEWORK_MATRICES.some((m) => m.id === selectedItemId)) {
      return selectedItemId;
    }
    return FRAMEWORK_MATRICES[0].id;
  });

  const [mode, setMode] = useState<ViewMode>('matrix');
  const [attributeFilter, setAttributeFilter] = useState<string>('');
  const [selectedRadarIds, setSelectedRadarIds] = useState<string[]>([]);
  const [contenderAId, setContenderAId] = useState<string>('');
  const [contenderBId, setContenderBId] = useState<string>('');
  const [activeScenarioIdx, setActiveScenarioIdx] = useState<number>(0);
  const [showNotes, setShowNotes] = useState<boolean>(false);

  // Sync with global selectedItemId from CommandPalette or Dashboard
  useEffect(() => {
    if (selectedItemId && FRAMEWORK_MATRICES.some((m) => m.id === selectedItemId)) {
      setActiveMatrixId(selectedItemId);
    }
  }, [selectedItemId]);

  const currentMatrix: FrameworkMatrix = useMemo(() => {
    return (
      FRAMEWORK_MATRICES.find((m) => m.id === activeMatrixId) || FRAMEWORK_MATRICES[0]
    );
  }, [activeMatrixId]);

  // Reset contenders & scenario index when switching matrix category
  useEffect(() => {
    const ids = currentMatrix.contenders.map((c) => c.id);
    setSelectedRadarIds(ids);
    setContenderAId(ids[0] || '');
    setContenderBId(ids[1] || ids[0] || '');
    setActiveScenarioIdx(0);
    setAttributeFilter('');
  }, [currentMatrix]);

  const handleSelectMatrix = (id: string) => {
    setActiveMatrixId(id);
    setSelectedItemId(id);
  };

  const handleToggleRadarContender = (id: string) => {
    setSelectedRadarIds((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((item) => item !== id) : prev;
      }
      return [...prev, id];
    });
  };

  const currentMastery: MasteryStatus = mastery[currentMatrix.id] || 'unstarted';
  const isBookmarked = bookmarks.includes(currentMatrix.id);
  const currentNote = notes[currentMatrix.id] || '';

  const filteredDimensions = useMemo(() => {
    if (!attributeFilter.trim()) return currentMatrix.dimensions;
    const q = attributeFilter.toLowerCase();
    return currentMatrix.dimensions.filter(
      (dim) =>
        dim.attributeName.toLowerCase().includes(q) ||
        Object.values(dim.values).some((v) => v.toLowerCase().includes(q))
    );
  }, [currentMatrix, attributeFilter]);

  const contenderA =
    currentMatrix.contenders.find((c) => c.id === contenderAId) ||
    currentMatrix.contenders[0];
  const contenderB =
    currentMatrix.contenders.find((c) => c.id === contenderBId) ||
    currentMatrix.contenders[1] ||
    currentMatrix.contenders[0];

  const activeScenario =
    currentMatrix.decisionScenarios[activeScenarioIdx] ||
    currentMatrix.decisionScenarios[0];
  const recommendedContender = currentMatrix.contenders.find(
    (c) => c.id === activeScenario?.recommendedId
  );
  const runnerUpContender = currentMatrix.contenders.find(
    (c) => c.id === activeScenario?.runnerUpId
  );

  return (
    <div className="space-y-6">
      {/* Top Category Tabs */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              Systems &amp; Framework Comparison Matrices
            </h1>
            <p className="text-xs text-slate-400">
              Inspect multi-column architectural internals, run 1v1 head-to-head diffs, or test workload decision scenarios
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mastery Status Controls */}
            {(['unstarted', 'learning', 'mastered'] as MasteryStatus[]).map((status) => {
              const active = currentMastery === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setItemMastery(currentMatrix.id, status)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium capitalize border transition-all ${
                    active
                      ? status === 'mastered'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : status === 'learning'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-800 text-slate-200 border-slate-600'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {status === 'mastered' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {status === 'learning' && <Clock className="w-3.5 h-3.5" />}
                  {status === 'unstarted' && <Circle className="w-3.5 h-3.5" />}
                  <span>{status}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => toggleBookmark(currentMatrix.id)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isBookmarked
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Bookmark"
              aria-label={isBookmarked ? 'Remove Bookmark' : 'Bookmark Matrix'}
            >
              <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>

            <button
              type="button"
              onClick={() => setShowNotes((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showNotes || currentNote
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>
          </div>
        </div>

        {/* 6 Matrix Selector Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {FRAMEWORK_MATRICES.map((matrix) => {
            const isSelected = matrix.id === currentMatrix.id;
            const status = mastery[matrix.id] || 'unstarted';
            return (
              <button
                key={matrix.id}
                type="button"
                onClick={() => handleSelectMatrix(matrix.id)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-indigo-600/15 border-indigo-500/60 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-100 truncate">
                    {matrix.title}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      status === 'mastered'
                        ? 'bg-emerald-400'
                        : status === 'learning'
                        ? 'bg-amber-400'
                        : 'bg-slate-700'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">
                  {matrix.contenders.map((c) => c.name).join(' vs ')}
                </p>
              </button>
            );
          })}
        </div>

        {/* Optional Personal Study Notes Drawer */}
        {showNotes && (
          <div className="mt-4 pt-3 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Personal Interview Notes for {currentMatrix.title}
            </label>
            <textarea
              value={currentNote}
              onChange={(e) => setItemNote(currentMatrix.id, e.target.value)}
              rows={3}
              placeholder="Write your custom trade-off mnemonics or project stories here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('matrix')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'matrix'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>1. Full Multi-Column Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('diff')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'diff'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>2. 1v1 Head-to-Head Diff</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('wizard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'wizard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>3. Workload Decision Wizard</span>
          </button>
        </div>

        {mode === 'matrix' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={attributeFilter}
              onChange={(e) => setAttributeFilter(e.target.value)}
              placeholder="Filter internals, CAP, failure modes..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* MODE 1: Full Multi-Column Matrix + Radar Chart */}
      {mode === 'matrix' && (
        <div className="space-y-6">
          <TradeoffRadar
            axes={currentMatrix.axes}
            contenders={currentMatrix.contenders}
            selectedIds={selectedRadarIds}
            onToggleContender={handleToggleRadarContender}
          />

          {/* Sticky Multi-Column Comparison Table */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="bg-slate-950/90 border-b border-slate-800">
                    <th className="sticky left-0 z-10 bg-slate-950 p-3.5 text-xs font-semibold text-slate-300 w-44 border-r border-slate-800">
                      Architecture Dimension
                    </th>
                    {currentMatrix.contenders.map((contender) => (
                      <th
                        key={contender.id}
                        className="p-3.5 align-top border-r border-slate-800/60 last:border-r-0 min-w-[200px]"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: contender.color }}
                          />
                          <span className="text-sm font-bold text-slate-100">
                            {contender.name}
                          </span>
                        </div>
                        <p className="text-[11px] font-normal text-slate-400">
                          {contender.tagline}
                        </p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {/* Architecture Summary Row */}
                  <tr className="bg-slate-900/40">
                    <td className="sticky left-0 z-10 bg-slate-900 p-3.5 font-semibold text-indigo-300 border-r border-slate-800">
                      Core Architecture Summary
                    </td>
                    {currentMatrix.contenders.map((contender) => (
                      <td
                        key={contender.id}
                        className="p-3.5 text-slate-300 leading-relaxed border-r border-slate-800/60 last:border-r-0"
                      >
                        {contender.architectureSummary}
                      </td>
                    ))}
                  </tr>

                  {/* Dynamic Dimension Rows */}
                  {filteredDimensions.map((dim) => (
                    <tr key={dim.attributeName} className="hover:bg-slate-800/30">
                      <td className="sticky left-0 z-10 bg-slate-900 p-3.5 font-semibold text-slate-200 border-r border-slate-800">
                        <div>{dim.attributeName}</div>
                        {dim.winnerNote && (
                          <div className="mt-1 text-[10px] font-normal text-amber-400/90">
                            ★ {dim.winnerNote}
                          </div>
                        )}
                      </td>
                      {currentMatrix.contenders.map((contender) => (
                        <td
                          key={contender.id}
                          className="p-3.5 text-slate-300 leading-relaxed border-r border-slate-800/60 last:border-r-0"
                        >
                          {dim.values[contender.id] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Best For Row */}
                  <tr className="bg-emerald-950/10">
                    <td className="sticky left-0 z-10 bg-slate-900 p-3.5 font-semibold text-emerald-400 border-r border-slate-800">
                      Best For (Sweet Spot)
                    </td>
                    {currentMatrix.contenders.map((contender) => (
                      <td
                        key={contender.id}
                        className="p-3.5 text-slate-300 border-r border-slate-800/60 last:border-r-0"
                      >
                        <ul className="space-y-1 list-disc list-inside text-[11px]">
                          {contender.bestFor.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>

                  {/* Avoid When Row */}
                  <tr className="bg-rose-950/10">
                    <td className="sticky left-0 z-10 bg-slate-900 p-3.5 font-semibold text-rose-400 border-r border-slate-800">
                      Avoid When (Anti-Fit)
                    </td>
                    {currentMatrix.contenders.map((contender) => (
                      <td
                        key={contender.id}
                        className="p-3.5 text-slate-300 border-r border-slate-800/60 last:border-r-0"
                      >
                        <ul className="space-y-1 list-disc list-inside text-[11px]">
                          {contender.avoidWhen.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: 1v1 Head-to-Head Diff Mode */}
      {mode === 'diff' && contenderA && contenderB && (
        <div className="space-y-6">
          {/* Contender Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Contender A
              </label>
              <select
                value={contenderA.id}
                onChange={(e) => setContenderAId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {currentMatrix.contenders.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.tagline}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Contender B
              </label>
              <select
                value={contenderB.id}
                onChange={(e) => setContenderBId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {currentMatrix.contenders.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.tagline}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 1v1 Radar Overlay */}
          <TradeoffRadar
            axes={currentMatrix.axes}
            contenders={currentMatrix.contenders}
            selectedIds={Array.from(new Set([contenderA.id, contenderB.id]))}
          />

          {/* Side-by-Side "Why Choose A over B" Defense Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { primary: contenderA, other: contenderB },
              { primary: contenderB, other: contenderA },
            ].map(({ primary, other }, idx) => {
              const winningAxes = currentMatrix.axes.filter(
                (ax) => (primary.scores[ax] ?? 0) > (other.scores[ax] ?? 0)
              );
              const sacrificedAxes = currentMatrix.axes.filter(
                (ax) => (primary.scores[ax] ?? 0) < (other.scores[ax] ?? 0)
              );
              return (
                <div
                  key={`${primary.id}-${idx}`}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4"
                >
                  <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: primary.color }}
                    />
                    <div>
                      <h3 className="text-base font-bold text-slate-100">
                        Why Choose {primary.name} over {other.name}
                      </h3>
                      <p className="text-xs text-slate-400">{primary.tagline}</p>
                    </div>
                  </div>

                  <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 mb-1">
                      Staff Interview Soundbite
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      &ldquo;{primary.interviewPitch}&rdquo;
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-emerald-400 mb-1.5">
                      Quantitative Advantages vs {other.name}
                    </h4>
                    {winningAxes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {winningAxes.map((ax) => (
                          <span
                            key={ax}
                            className="px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300"
                          >
                            {ax} (+{(primary.scores[ax] ?? 0) - (other.scores[ax] ?? 0)})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Select two distinct systems above to compute score deltas.
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-amber-400 mb-1.5">
                      What You Sacrifice (Trade-Off Accepted)
                    </h4>
                    {sacrificedAxes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {sacrificedAxes.map((ax) => (
                          <span
                            key={ax}
                            className="px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-300"
                          >
                            Lower {ax} ({primary.scores[ax]} vs {other.scores[ax]})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">—</p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    {currentMatrix.dimensions.map((dim) => (
                      <div key={dim.attributeName} className="text-xs">
                        <span className="font-semibold text-slate-300">
                          {dim.attributeName}:{' '}
                        </span>
                        <span className="text-slate-400">
                          {dim.values[primary.id]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 3: Interactive Workload Decision Wizard */}
      {mode === 'wizard' && activeScenario && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Workload Scenario Selector */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">
              Select a Production Workload Scenario
            </h3>
            {currentMatrix.decisionScenarios.map((scenario, idx) => {
              const isSelected = idx === activeScenarioIdx;
              return (
                <button
                  key={scenario.prompt}
                  type="button"
                  onClick={() => setActiveScenarioIdx(idx)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-slate-100 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-300 mb-1">
                    <span>Scenario #{idx + 1}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs leading-relaxed">{scenario.prompt}</p>
                </button>
              );
            })}
          </div>

          {/* Right: Recommended Choice & Architectural Defense */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <span>Staff-Level Architectural Recommendation</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">Workload Prompt</div>
              <p className="text-sm font-medium text-slate-100">
                {activeScenario.prompt}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recommendedContender && (
                <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/40">
                  <div className="text-[11px] font-bold uppercase text-emerald-400 mb-1">
                    Primary Recommendation
                  </div>
                  <div className="text-lg font-bold text-slate-100">
                    {recommendedContender.name}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {recommendedContender.tagline}
                  </p>
                </div>
              )}

              {runnerUpContender && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Strong Runner-Up Alternative
                  </div>
                  <div className="text-lg font-bold text-slate-200">
                    {runnerUpContender.name}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {runnerUpContender.tagline}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-indigo-950/25 border border-indigo-500/30">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-1">
                  Why This Architecture Wins (Defense Script)
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {activeScenario.reasoning}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Trade-Off Explicitly Accepted</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {activeScenario.tradeoffAccepted}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
