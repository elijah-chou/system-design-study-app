import { describe, it, expect } from 'vitest';
import { SOFTWARE_PATTERNS } from './softwarePatterns';
import { DISTRIBUTED_PATTERNS } from './distributedPatterns';
import { SYSTEM_TRADEOFFS } from './systemTradeoffs';
import { FRAMEWORK_MATRICES } from './frameworkMatrices';
import { CASE_STUDIES } from './caseStudies';
import { FLASHCARDS, QUIZ_QUESTIONS } from './flashcardsQuizzes';

const registries = {
  SOFTWARE_PATTERNS,
  DISTRIBUTED_PATTERNS,
  SYSTEM_TRADEOFFS,
  FRAMEWORK_MATRICES,
  CASE_STUDIES,
  FLASHCARDS,
  QUIZ_QUESTIONS,
} as Record<string, { id: string }[]>;

describe('data registries', () => {
  for (const [name, items] of Object.entries(registries)) {
    it(`${name} is non-empty with unique, non-empty ids`, () => {
      expect(items.length).toBeGreaterThan(0);
      const ids = items.map((i) => i.id);
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }

  it('study item ids are globally unique across topic registries', () => {
    const ids = [
      ...SOFTWARE_PATTERNS,
      ...DISTRIBUTED_PATTERNS,
      ...SYSTEM_TRADEOFFS,
      ...FRAMEWORK_MATRICES,
      ...CASE_STUDIES,
    ].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('quiz questions have a valid correctIndex and options', () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });

  it('flashcards have front, back and takeaway', () => {
    for (const c of FLASHCARDS) {
      expect(c.front && c.back && c.keyTakeaway).toBeTruthy();
    }
  });
});
