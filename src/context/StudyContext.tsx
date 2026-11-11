import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ViewId,
  MasteryStatus,
  FlashcardReview,
  QuizAttempt,
  CustomTopicItem,
  CustomFlashcardItem,
  ContentPack,
} from '../types';

const STORAGE_KEY = 'sysdesign_study_state_v1';

interface PersistedState {
  mastery: Record<string, MasteryStatus>;
  bookmarks: string[];
  notes: Record<string, string>;
  flashcardScores: Record<string, FlashcardReview>;
  quizHistory: QuizAttempt[];
  customTopics: CustomTopicItem[];
  customFlashcards: CustomFlashcardItem[];
  installedPacks: string[];
  lastContentSync: string;
}

const DEFAULT_PERSISTED_STATE: PersistedState = {
  mastery: {},
  bookmarks: [],
  notes: {},
  flashcardScores: {},
  quizHistory: [],
  customTopics: [],
  customFlashcards: [],
  installedPacks: [],
  lastContentSync: '2026-11-11',
};

export interface StudyContextType {
  activeView: ViewId;
  setActiveView: (view: ViewId) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  navigateToItem: (view: ViewId, itemId?: string | null) => void;
  mastery: Record<string, MasteryStatus>;
  setItemMastery: (id: string, status: MasteryStatus) => void;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  notes: Record<string, string>;
  setItemNote: (id: string, note: string) => void;
  flashcardScores: Record<string, FlashcardReview>;
  recordFlashcardReview: (id: string, rating: 'again' | 'hard' | 'good' | 'easy') => void;
  quizHistory: QuizAttempt[];
  recordQuizResult: (score: number, total: number, mode: string) => void;
  customTopics: CustomTopicItem[];
  addCustomTopic: (topic: Omit<CustomTopicItem, 'id' | 'createdAt'>) => void;
  deleteCustomTopic: (id: string) => void;
  customFlashcards: CustomFlashcardItem[];
  addCustomFlashcard: (card: Omit<CustomFlashcardItem, 'id'>) => void;
  deleteCustomFlashcard: (id: string) => void;
  installedPacks: string[];
  installContentPack: (pack: ContentPack) => { addedTopics: number; addedCards: number };
  lastContentSync: string;
  exportStudyData: () => string;
  importStudyData: (json: string) => boolean;
  resetProgress: () => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERSISTED_STATE;
    const parsed = JSON.parse(raw);
    return {
      mastery: parsed.mastery && typeof parsed.mastery === 'object' ? parsed.mastery : {},
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      flashcardScores: parsed.flashcardScores && typeof parsed.flashcardScores === 'object' ? parsed.flashcardScores : {},
      quizHistory: Array.isArray(parsed.quizHistory) ? parsed.quizHistory : [],
      customTopics: Array.isArray(parsed.customTopics) ? parsed.customTopics : [],
      customFlashcards: Array.isArray(parsed.customFlashcards) ? parsed.customFlashcards : [],
      installedPacks: Array.isArray(parsed.installedPacks) ? parsed.installedPacks : [],
      lastContentSync: typeof parsed.lastContentSync === 'string' ? parsed.lastContentSync : '2026-11-11',
    };
  } catch {
    return DEFAULT_PERSISTED_STATE;
  }
}

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);

  const [persisted, setPersisted] = useState<PersistedState>(() => loadPersistedState());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Ignore storage quota errors
    }
  }, [persisted]);

  const navigateToItem = useCallback((view: ViewId, itemId?: string | null) => {
    setActiveView(view);
    setSelectedItemId(itemId ?? null);
  }, []);

  const setItemMastery = useCallback((id: string, status: MasteryStatus) => {
    setPersisted((prev) => ({
      ...prev,
      mastery: {
        ...prev.mastery,
        [id]: status,
      },
    }));
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setPersisted((prev) => {
      const exists = prev.bookmarks.includes(id);
      return {
        ...prev,
        bookmarks: exists
          ? prev.bookmarks.filter((b) => b !== id)
          : [...prev.bookmarks, id],
      };
    });
  }, []);

  const setItemNote = useCallback((id: string, note: string) => {
    setPersisted((prev) => ({
      ...prev,
      notes: {
        ...prev.notes,
        [id]: note,
      },
    }));
  }, []);

  const recordFlashcardReview = useCallback((id: string, rating: 'again' | 'hard' | 'good' | 'easy') => {
    setPersisted((prev) => {
      const current = prev.flashcardScores[id]?.box ?? 1;
      let nextBox = current;
      if (rating === 'again') nextBox = 1;
      else if (rating === 'hard') nextBox = Math.max(1, current);
      else if (rating === 'good') nextBox = Math.min(5, current + 1);
      else if (rating === 'easy') nextBox = Math.min(5, current + 2);

      return {
        ...prev,
        flashcardScores: {
          ...prev.flashcardScores,
          [id]: {
            box: nextBox,
            lastReviewed: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  const recordQuizResult = useCallback((score: number, total: number, mode: string) => {
    setPersisted((prev) => ({
      ...prev,
      quizHistory: [
        {
          date: new Date().toISOString(),
          score,
          total,
          mode,
        },
        ...prev.quizHistory.slice(0, 49),
      ],
    }));
  }, []);

  const addCustomTopic = useCallback((topic: Omit<CustomTopicItem, 'id' | 'createdAt'>) => {
    const newTopic: CustomTopicItem = {
      ...topic,
      id: `custom-topic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setPersisted((prev) => ({
      ...prev,
      customTopics: [newTopic, ...prev.customTopics],
      lastContentSync: new Date().toISOString().slice(0, 10),
    }));
  }, []);

  const deleteCustomTopic = useCallback((id: string) => {
    setPersisted((prev) => ({
      ...prev,
      customTopics: prev.customTopics.filter((t) => t.id !== id),
    }));
  }, []);

  const addCustomFlashcard = useCallback((card: Omit<CustomFlashcardItem, 'id'>) => {
    const newCard: CustomFlashcardItem = {
      ...card,
      id: `custom-fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isCustom: true,
    };
    setPersisted((prev) => ({
      ...prev,
      customFlashcards: [newCard, ...prev.customFlashcards],
      lastContentSync: new Date().toISOString().slice(0, 10),
    }));
  }, []);

  const deleteCustomFlashcard = useCallback((id: string) => {
    setPersisted((prev) => ({
      ...prev,
      customFlashcards: prev.customFlashcards.filter((c) => c.id !== id),
    }));
  }, []);

  const installContentPack = useCallback((pack: ContentPack): { addedTopics: number; addedCards: number } => {
    const existingTopicIds = new Set(persisted.customTopics.map((t) => t.id));
    const existingCardIds = new Set(persisted.customFlashcards.map((c) => c.id));

    const newTopics = (pack.topics || []).filter((t) => !existingTopicIds.has(t.id));
    const newCards = (pack.flashcards || [])
      .filter((c) => !existingCardIds.has(c.id))
      .map((c) => ({ ...c, isCustom: true }));

    const addedTopics = newTopics.length;
    const addedCards = newCards.length;

    setPersisted((prev) => {
      const prevTopicIds = new Set(prev.customTopics.map((t) => t.id));
      const prevCardIds = new Set(prev.customFlashcards.map((c) => c.id));

      const safeNewTopics = (pack.topics || []).filter((t) => !prevTopicIds.has(t.id));
      const safeNewCards = (pack.flashcards || [])
        .filter((c) => !prevCardIds.has(c.id))
        .map((c) => ({ ...c, isCustom: true }));

      const nextPacks = prev.installedPacks.includes(pack.packId)
        ? prev.installedPacks
        : [...prev.installedPacks, pack.packId];

      return {
        ...prev,
        customTopics: [...safeNewTopics, ...prev.customTopics],
        customFlashcards: [...safeNewCards, ...prev.customFlashcards],
        installedPacks: nextPacks,
        lastContentSync: new Date().toISOString().slice(0, 10),
      };
    });

    return { addedTopics, addedCards };
  }, [persisted.customTopics, persisted.customFlashcards]);

  const exportStudyData = useCallback(() => {
    return JSON.stringify(persisted, null, 2);
  }, [persisted]);

  const importStudyData = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== 'object') return false;
      setPersisted({
        mastery: parsed.mastery && typeof parsed.mastery === 'object' ? parsed.mastery : {},
        bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
        notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
        flashcardScores: parsed.flashcardScores && typeof parsed.flashcardScores === 'object' ? parsed.flashcardScores : {},
        quizHistory: Array.isArray(parsed.quizHistory) ? parsed.quizHistory : [],
        customTopics: Array.isArray(parsed.customTopics) ? parsed.customTopics : [],
        customFlashcards: Array.isArray(parsed.customFlashcards) ? parsed.customFlashcards : [],
        installedPacks: Array.isArray(parsed.installedPacks) ? parsed.installedPacks : [],
        lastContentSync: typeof parsed.lastContentSync === 'string' ? parsed.lastContentSync : new Date().toISOString().slice(0, 10),
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const resetProgress = useCallback(() => {
    setPersisted(DEFAULT_PERSISTED_STATE);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <StudyContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedItemId,
        setSelectedItemId,
        navigateToItem,
        mastery: persisted.mastery,
        setItemMastery,
        bookmarks: persisted.bookmarks,
        toggleBookmark,
        notes: persisted.notes,
        setItemNote,
        flashcardScores: persisted.flashcardScores,
        recordFlashcardReview,
        quizHistory: persisted.quizHistory,
        recordQuizResult,
        customTopics: persisted.customTopics,
        addCustomTopic,
        deleteCustomTopic,
        customFlashcards: persisted.customFlashcards,
        addCustomFlashcard,
        deleteCustomFlashcard,
        installedPacks: persisted.installedPacks,
        installContentPack,
        lastContentSync: persisted.lastContentSync,
        exportStudyData,
        importStudyData,
        resetProgress,
        isCommandPaletteOpen,
        setCommandPaletteOpen,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
};

export function useStudy(): StudyContextType {
  const ctx = useContext(StudyContext);
  if (!ctx) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return ctx;
}
