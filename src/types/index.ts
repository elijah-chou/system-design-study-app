export type ViewId = 'dashboard' | 'patterns' | 'tradeoffs' | 'matrices' | 'cases' | 'practice' | 'studio';

export type MasteryStatus = 'unstarted' | 'learning' | 'mastered';

export interface BaseStudyItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  difficulty?: 'Fundamental' | 'Intermediate' | 'Advanced' | 'Staff+';
}

export interface CustomTopicItem extends BaseStudyItem {
  createdAt: string;
  domain: 'patterns' | 'tradeoffs' | 'matrices' | 'cases';
  keyTakeaways: string[];
  architecturalNotes: string;
}

export interface CustomFlashcardItem {
  id: string;
  category: 'GoF Patterns' | 'Distributed Patterns' | 'Core Trade-Offs' | 'Databases & Queues' | 'Latency & Scale Math' | 'Case Studies';
  difficulty: 'Fundamental' | 'Intermediate' | 'Advanced' | 'Staff+';
  front: string;
  back: string;
  keyTakeaway: string;
  tags: string[];
  isCustom?: boolean;
}

export interface ContentPack {
  packId: string;
  title: string;
  version: string;
  publishedAt: string;
  description: string;
  topics: CustomTopicItem[];
  flashcards: CustomFlashcardItem[];
}

export interface FlashcardReview {
  box: number;
  lastReviewed: string;
}

export interface QuizAttempt {
  date: string;
  score: number;
  total: number;
  mode: string;
}
