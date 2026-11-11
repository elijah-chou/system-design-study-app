import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { StudyProvider, useStudy } from './StudyContext';
import type { ContentPack } from '../types';

const STORAGE_KEY = 'sysdesign_study_state_v1';
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StudyProvider>{children}</StudyProvider>
);

const pack: ContentPack = {
  packId: 'p1',
  title: 'Pack',
  version: '1.0.0',
  publishedAt: '2026-01-01',
  description: 'd',
  topics: [
    {
      id: 't1',
      title: 'T',
      category: 'c',
      summary: 's',
      tags: [],
      createdAt: '2026-01-01',
      domain: 'patterns',
      keyTakeaways: [],
      architecturalNotes: '',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      category: 'GoF Patterns',
      difficulty: 'Fundamental',
      front: 'q',
      back: 'a',
      keyTakeaway: 'k',
      tags: [],
    },
  ],
};

describe('StudyContext', () => {
  it('throws outside provider', () => {
    expect(() => renderHook(() => useStudy())).toThrow();
  });

  it('persists mastery, bookmarks and notes to localStorage', () => {
    const { result } = renderHook(() => useStudy(), { wrapper });
    act(() => {
      result.current.setItemMastery('x', 'mastered');
      result.current.toggleBookmark('x');
      result.current.setItemNote('x', 'hello');
    });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.mastery.x).toBe('mastered');
    expect(saved.bookmarks).toEqual(['x']);
    expect(saved.notes.x).toBe('hello');
    act(() => result.current.toggleBookmark('x'));
    expect(result.current.bookmarks).toEqual([]);
  });

  it('hydrates from localStorage and tolerates corrupt data', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bookmarks: ['a'], mastery: 5 }));
    const { result, unmount } = renderHook(() => useStudy(), { wrapper });
    expect(result.current.bookmarks).toEqual(['a']);
    expect(result.current.mastery).toEqual({});
    unmount();
    localStorage.setItem(STORAGE_KEY, '{not json');
    const again = renderHook(() => useStudy(), { wrapper });
    expect(again.result.current.bookmarks).toEqual([]);
  });

  it('navigates and records reviews and quizzes', () => {
    const { result } = renderHook(() => useStudy(), { wrapper });
    act(() => result.current.navigateToItem('patterns', 'abc'));
    expect(result.current.activeView).toBe('patterns');
    expect(result.current.selectedItemId).toBe('abc');
    act(() => {
      result.current.recordFlashcardReview('c1', 'good');
      result.current.recordQuizResult(3, 5, 'mixed');
    });
    expect(result.current.flashcardScores.c1).toBeDefined();
    expect(result.current.quizHistory).toHaveLength(1);
  });

  it('installContentPack adds items once and is idempotent', () => {
    const { result } = renderHook(() => useStudy(), { wrapper });
    let r!: { addedTopics: number; addedCards: number };
    act(() => {
      r = result.current.installContentPack(pack);
    });
    expect(r).toEqual({ addedTopics: 1, addedCards: 1 });
    expect(result.current.customTopics).toHaveLength(1);
    expect(result.current.customFlashcards[0].isCustom).toBe(true);
    act(() => {
      r = result.current.installContentPack(pack);
    });
    expect(r).toEqual({ addedTopics: 0, addedCards: 0 });
    expect(result.current.customTopics).toHaveLength(1);
  });

  it('adds/deletes custom topics and cards', () => {
    const { result } = renderHook(() => useStudy(), { wrapper });
    act(() => {
      result.current.addCustomTopic({ ...pack.topics[0] });
      result.current.addCustomFlashcard({ ...pack.flashcards[0] });
    });
    expect(result.current.customTopics).toHaveLength(1);
    expect(result.current.customFlashcards).toHaveLength(1);
    act(() => {
      result.current.deleteCustomTopic(result.current.customTopics[0].id);
      result.current.deleteCustomFlashcard(result.current.customFlashcards[0].id);
    });
    expect(result.current.customTopics).toHaveLength(0);
    expect(result.current.customFlashcards).toHaveLength(0);
  });

  it('exports, imports and resets', () => {
    const { result } = renderHook(() => useStudy(), { wrapper });
    act(() => result.current.setItemMastery('z', 'learning'));
    const json = result.current.exportStudyData();
    act(() => result.current.resetProgress());
    expect(result.current.mastery).toEqual({});
    let ok = false;
    act(() => {
      ok = result.current.importStudyData(json);
    });
    expect(ok).toBe(true);
    expect(result.current.mastery.z).toBe('learning');
    act(() => {
      ok = result.current.importStudyData('nope');
    });
    expect(ok).toBe(false);
  });
});
