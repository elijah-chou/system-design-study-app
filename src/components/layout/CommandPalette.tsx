import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Layers,
  Scale,
  Table2,
  Server,
  BrainCircuit,
  CornerDownLeft,
  CheckCircle2,
  Clock,
  Bookmark,
  X,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { ViewId } from '../../types';
import { SOFTWARE_PATTERNS } from '../../data/softwarePatterns';
import { DISTRIBUTED_PATTERNS } from '../../data/distributedPatterns';
import { SYSTEM_TRADEOFFS } from '../../data/systemTradeoffs';
import { FRAMEWORK_MATRICES } from '../../data/frameworkMatrices';
import { CASE_STUDIES } from '../../data/caseStudies';

interface SearchableEntry {
  id: string;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  difficulty?: string;
  view: ViewId;
  moduleLabel: string;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    navigateToItem,
    mastery,
    bookmarks,
    customTopics,
  } = useStudy();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | ViewId>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const allEntries: SearchableEntry[] = useMemo(() => {
    const entries: SearchableEntry[] = [];

    customTopics.forEach((item) => {
      entries.push({
        id: item.id,
        title: item.title,
        category: item.category,
        summary: item.summary,
        tags: item.tags || [],
        difficulty: item.difficulty,
        view: 'studio',
        moduleLabel: 'Custom / Pack Topic',
      });
    });

    SOFTWARE_PATTERNS.forEach((item) => {
      entries.push({
        id: item.id,
        title: item.title,
        category: item.category,
        summary: item.summary,
        tags: item.tags || [],
        difficulty: item.difficulty,
        view: 'patterns',
        moduleLabel: 'GoF Pattern',
      });
    });

    DISTRIBUTED_PATTERNS.forEach((item) => {
      entries.push({
        id: item.id,
        title: item.title,
        category: item.category,
        summary: item.summary,
        tags: item.tags || [],
        difficulty: item.difficulty,
        view: 'patterns',
        moduleLabel: 'Distributed Pattern',
      });
    });

    SYSTEM_TRADEOFFS.forEach((item) => {
      entries.push({
        id: item.id,
        title: item.title,
        category: item.category,
        summary: item.summary,
        tags: item.tags || [],
        difficulty: item.difficulty,
        view: 'tradeoffs',
        moduleLabel: 'System Trade-Off',
      });
    });

    FRAMEWORK_MATRICES.forEach((item) => {
      entries.push({
        id: item.id,
        title: item.title,
        category: item.category,
        summary: item.summary,
        tags: item.tags || [],
        difficulty: item.difficulty,
        view: 'matrices',
        moduleLabel: 'Comparison Matrix',
      });
    });

    CASE_STUDIES.forEach((item) => {
      entries.push({
        id: item.id,
        title: item.title,
        category: item.category,
        summary: item.summary,
        tags: item.tags || [],
        difficulty: item.difficulty,
        view: 'cases',
        moduleLabel: 'Case Study',
      });
    });

    return entries;
  }, [customTopics]);

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter((entry) => {
      if (activeFilter !== 'all' && entry.view !== activeFilter) return false;
      if (!q) return true;
      const inTitle = entry.title.toLowerCase().includes(q);
      const inCategory = entry.category.toLowerCase().includes(q);
      const inSummary = entry.summary.toLowerCase().includes(q);
      const inTags = entry.tags.some((t) => t.toLowerCase().includes(q));
      const inModule = entry.moduleLabel.toLowerCase().includes(q);
      return inTitle || inCategory || inSummary || inTags || inModule;
    });
  }, [allEntries, query, activeFilter]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeFilter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        e.preventDefault();
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (!isCommandPaletteOpen) return;
    setQuery('');
    setSelectedIndex(0);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(timer);
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const handleSelect = (entry: SearchableEntry) => {
    navigateToItem(entry.view, entry.id);
    setCommandPaletteOpen(false);
  };

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredEntries.length > 0 ? (prev + 1) % filteredEntries.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredEntries.length > 0
          ? (prev - 1 + filteredEntries.length) % filteredEntries.length
          : 0
      );
    } else if (e.key === 'Enter' && filteredEntries[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredEntries[selectedIndex]);
    }
  };

  const getViewIcon = (view: ViewId) => {
    switch (view) {
      case 'patterns':
        return <Layers className="w-4 h-4 text-cyan-400" />;
      case 'tradeoffs':
        return <Scale className="w-4 h-4 text-amber-400" />;
      case 'matrices':
        return <Table2 className="w-4 h-4 text-emerald-400" />;
      case 'cases':
        return <Server className="w-4 h-4 text-violet-400" />;
      default:
        return <BrainCircuit className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette Search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/70 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleModalKeyDown}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patterns, CAP/PACELC, Kafka vs RabbitMQ, case studies..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
              aria-label="Clear search query"
              title="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Module Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-950/50 border-b border-slate-800/80 overflow-x-auto">
          {[
            { id: 'all', label: `All (${allEntries.length})` },
            { id: 'patterns', label: 'Patterns' },
            { id: 'tradeoffs', label: 'Trade-Offs' },
            { id: 'matrices', label: 'Matrices' },
            { id: 'cases', label: 'Case Studies' },
            ...(customTopics.length > 0
              ? [{ id: 'studio', label: `Custom / Packs (${customTopics.length})` }]
              : []),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as 'all' | ViewId)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                activeFilter === tab.id
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No matching architecture patterns, trade-offs, or case studies found for "{query}".
            </div>
          ) : (
            filteredEntries.map((entry, idx) => {
              const isSelected = idx === selectedIndex;
              const status = mastery[entry.id] || 'unstarted';
              const isBookmarked = bookmarks.includes(entry.id);

              return (
                <button
                  key={`${entry.view}-${entry.id}`}
                  onClick={() => handleSelect(entry)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-start justify-between gap-3 p-3 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-indigo-500/15 border border-indigo-500/30' : 'hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                      {getViewIcon(entry.view)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-100">
                          {entry.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {entry.moduleLabel}
                        </span>
                        {entry.difficulty && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {entry.difficulty}
                          </span>
                        )}
                        {isBookmarked && (
                          <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        )}
                        {status === 'mastered' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        {status === 'learning' && (
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-1">
                        {entry.summary}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        {entry.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-mono text-slate-400 bg-slate-950/90 px-1.5 py-0.5 rounded border border-slate-800/80"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0 self-center">
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 font-mono bg-slate-900 border border-slate-800 rounded">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 font-mono bg-slate-900 border border-slate-800 rounded">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 font-mono bg-slate-900 border border-slate-800 rounded">Enter</kbd> to jump
            </span>
          </div>
          <span className="font-mono text-slate-500">
            {filteredEntries.length} results
          </span>
        </div>
      </div>
    </div>
  );
};
