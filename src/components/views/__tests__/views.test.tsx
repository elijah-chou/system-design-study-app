import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StudyProvider, useStudy } from '../../../context/StudyContext';
import { DashboardView } from '../DashboardView';
import { PatternsCatalogView } from '../PatternsCatalogView';
import { TradeoffsExplorerView } from '../TradeoffsExplorerView';
import { MatrixComparisonView } from '../MatrixComparisonView';
import { CaseStudiesView } from '../CaseStudiesView';
import { ActiveRecallView } from '../ActiveRecallView';
import { ContentStudioView } from '../ContentStudioView';

const ContextSeeder: React.FC<{
  onInit?: (ctx: ReturnType<typeof useStudy>) => void;
}> = ({ onInit }) => {
  const ctx = useStudy();
  React.useEffect(() => {
    onInit?.(ctx);
  }, []);
  return null;
};

describe('DashboardView Component', () => {
  it('handles recommendations, shuffling, mastery toggles, backup actions, and quick launches', () => {
    let ctxRef: ReturnType<typeof useStudy>;
    render(
      <StudyProvider>
        <ContextSeeder onInit={(c) => (ctxRef = c)} />
        <DashboardView />
      </StudyProvider>
    );

    // Shuffle recommendation
    const shuffleBtn = screen.getByText(/Shuffle/i);
    fireEvent.click(shuffleBtn);

    // Launch Deep Dive button
    const launchBtn = screen.getByText(/Launch Deep Dive/i);
    fireEvent.click(launchBtn);

    // Toggle mastery from recommendation card
    const markBtn = screen.getByRole('button', { name: /Mark Mastered|Mark Learning/i });
    fireEvent.click(markBtn);

    // Interactive Labs quick launch buttons
    const labButtons = screen.getAllByRole('button');
    labButtons.forEach((b) => {
      if (b.textContent?.includes('Lab') || b.textContent?.includes('Radar')) {
        fireEvent.click(b);
      }
    });

    // Module cards clicks
    const moduleCards = screen.getAllByText(/Open Module/i);
    moduleCards.forEach((c) => fireEvent.click(c));

    // Active Recall card click
    const startPractice = screen.getByText(/Start Practice Session/i);
    fireEvent.click(startPractice);

    // Content Studio banner button
    const studioBtn = screen.getByText(/Open Content Studio/i);
    fireEvent.click(studioBtn);

    // Backup actions: copy, download, toggle restore, import
    const copySpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    const copyBackupBtn = screen.queryByText(/Copy JSON/i) || screen.queryByTitle(/Copy/i);
    if (copyBackupBtn) fireEvent.click(copyBackupBtn);

    const toggleRestoreBtn = screen.getByText(/Import JSON|Hide Restore/i);
    fireEvent.click(toggleRestoreBtn);

    const textarea = screen.getByPlaceholderText(/Paste exported study state/i);
    fireEvent.change(textarea, { target: { value: '{"invalid": "json"' } });
    const restoreBtn = screen.queryByText(/Restore Progress|Import/i);
    if (restoreBtn) fireEvent.click(restoreBtn);

    fireEvent.change(textarea, { target: { value: JSON.stringify({ mastery: {}, bookmarks: [] }) } });
    if (restoreBtn) fireEvent.click(restoreBtn);

    copySpy.mockRestore();
  });
});

describe('PatternsCatalogView Component', () => {
  it('switches between tabs, filters by search, and changes code views', () => {
    render(
      <StudyProvider>
        <PatternsCatalogView />
      </StudyProvider>
    );

    // Switch between GoF, Distributed, and Pattern Labs tabs
    const distTab = screen.getByText(/Distributed & Cloud Patterns/i);
    fireEvent.click(distTab);

    const labsTab = screen.getByText(/Interactive Pattern Labs/i);
    fireEvent.click(labsTab);

    const gofTab = screen.getByText(/Classic Software Patterns \(GoF\)/i);
    fireEvent.click(gofTab);

    // Filter by search
    const searchInputs = screen.getAllByPlaceholderText(/Search/i);
    if (searchInputs[0]) {
      fireEvent.change(searchInputs[0], { target: { value: 'builder' } });
      fireEvent.change(searchInputs[0], { target: { value: '' } });
    }

    // Code comparison modes (Side-by-side, Before, After)
    const sideBySideBtn = screen.queryByText(/Side-by-Side/i);
    if (sideBySideBtn) fireEvent.click(sideBySideBtn);

    const beforeBtn = screen.queryByText(/Before \(Anti-Pattern\)/i);
    if (beforeBtn) fireEvent.click(beforeBtn);

    const afterBtn = screen.queryByText(/After \(Idiomatic Pattern\)/i);
    if (afterBtn) fireEvent.click(afterBtn);

    // Toggle bookmark and mastery
    const bookmarkBtn = screen.queryByTitle(/Bookmark/i);
    if (bookmarkBtn) fireEvent.click(bookmarkBtn);

    // Test note input
    const noteArea = screen.queryByPlaceholderText(/Write your own architectural notes/i);
    if (noteArea) fireEvent.change(noteArea, { target: { value: 'Test personal note' } });
  });
});

describe('TradeoffsExplorerView Component', () => {
  it('selects topics, changes filters, and writes notes', () => {
    render(
      <StudyProvider>
        <TradeoffsExplorerView />
      </StudyProvider>
    );

    // Search filter
    const searchInput = screen.getByPlaceholderText(/Filter trade-offs/i);
    fireEvent.change(searchInput, { target: { value: 'cap' } });
    fireEvent.change(searchInput, { target: { value: '' } });

    // Category pills
    const allButtons = screen.getAllByRole('button');
    allButtons.forEach((b) => {
      if (b.textContent?.includes('Theorems') || b.textContent?.includes('Storage')) {
        fireEvent.click(b);
      }
    });

    // Copy interview defense template
    const copySpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    const copyDefenseBtn = screen.queryByText(/Copy Defense/i);
    if (copyDefenseBtn) fireEvent.click(copyDefenseBtn);
    copySpy.mockRestore();

    // Notes
    const noteArea = screen.queryByPlaceholderText(/Write your own architectural notes/i);
    if (noteArea) fireEvent.change(noteArea, { target: { value: 'CAP theorem defense note' } });
  });
});

describe('MatrixComparisonView Component', () => {
  it('switches modes between Table, 1v1 Diff, and Decision Wizard', () => {
    render(
      <StudyProvider>
        <MatrixComparisonView />
      </StudyProvider>
    );

    // Switch to 1v1 Head-to-Head Diff Mode
    const diffModeBtn = screen.getByRole('button', { name: /1v1 Head-to-Head Diff/i });
    fireEvent.click(diffModeBtn);

    // Switch contender selects in 1v1 Diff
    const selects = screen.getAllByRole('combobox');
    if (selects[0]) fireEvent.change(selects[0], { target: { value: 'mongodb' } });
    if (selects[1]) fireEvent.change(selects[1], { target: { value: 'cassandra' } });

    // Switch to Decision Wizard Mode
    const wizardModeBtn = screen.getByRole('button', { name: /Workload Decision Wizard/i });
    fireEvent.click(wizardModeBtn);

    // Click scenario items
    const scenarios = screen.getAllByText(/Scenario #/i);
    scenarios.forEach((s) => fireEvent.click(s));

    // Switch back to Full Matrix Mode
    const tableModeBtn = screen.getByRole('button', { name: /Full Multi-Column Matrix/i });
    fireEvent.click(tableModeBtn);
  });
});

describe('CaseStudiesView Component', () => {
  it('navigates walkthrough steps, controls 45m interview timer, adjusts scale sliders, and checks rubric', () => {
    render(
      <StudyProvider>
        <CaseStudiesView />
      </StudyProvider>
    );

    // 45m Timer start / pause / reset
    const startTimerBtn = screen.getByRole('button', { name: /Start 45:00|Pause|Resume/i });
    fireEvent.click(startTimerBtn);
    fireEvent.click(startTimerBtn); // Pause

    const resetTimerBtn = screen.getByTitle(/Reset 45:00 Timer/i);
    fireEvent.click(resetTimerBtn);

    // Jump timer phases
    ['0–5m', '5–15m', '15–35m', '35–45m'].forEach((phase) => {
      const phaseBtn = screen.queryByTitle(new RegExp(phase, 'i'));
      if (phaseBtn) fireEvent.click(phaseBtn);
    });

    // Staff rubric drawer toggle & check items
    const rubricToggle = screen.getByText(/Staff Rubric/i);
    fireEvent.click(rubricToggle);

    const rubricButtons = screen.getAllByText(/Clarified functional|Drew end-to-end|Computed Average/i);
    rubricButtons.forEach((rb) => fireEvent.click(rb));

    const clearRubric = screen.queryByText(/Clear Rubric Checks/i);
    if (clearRubric) fireEvent.click(clearRubric);

    // Step-by-Step walkthrough tabs
    ['4. Staff Deep Dives & Notes', '3. Read / Write Lifecycles', '2. Architecture Topology', '1. Requirements & Scale Math'].forEach((step) => {
      const stepBtn = screen.queryByText(new RegExp(step, 'i'));
      if (stepBtn) fireEvent.click(stepBtn);
    });

    // Reset Scale defaults
    const resetScaleBtn = screen.queryByText(/Reset Defaults/i);
    if (resetScaleBtn) fireEvent.click(resetScaleBtn);

    // Adjust scale sliders
    const sliders = screen.getAllByRole('slider');
    sliders.forEach((s) => fireEvent.change(s, { target: { value: '50' } }));

    // Switch case studies
    const caseStudyButtons = screen.getAllByRole('button');
    caseStudyButtons.forEach((b) => {
      if (b.textContent?.includes('Rate Limiter') || b.textContent?.includes('Chat')) {
        fireEvent.click(b);
      }
    });

    // Write interview notes
    const noteArea = screen.queryByPlaceholderText(/Write your key takeaway numbers/i);
    if (noteArea) fireEvent.change(noteArea, { target: { value: 'Rate limiter redis lua notes' } });
  });
});

describe('ActiveRecallView Component', () => {
  it('flips flashcards, self-grades with buttons and keys, takes quizzes, and toggles cheatsheet', () => {
    let ctxRef: ReturnType<typeof useStudy>;
    render(
      <StudyProvider>
        <ContextSeeder onInit={(c) => (ctxRef = c)} />
        <ActiveRecallView />
      </StudyProvider>
    );

    // Toggle Latency Cheat Sheet drawer
    const cheatSheetBtn = screen.getByText(/Latency & Capacity Cheat Sheet/i);
    fireEvent.click(cheatSheetBtn);
    fireEvent.click(cheatSheetBtn);

    // Flip flashcard via click and Space key
    const flipBtn = screen.queryByText(/Click or press Space to flip/i);
    if (flipBtn) fireEvent.click(flipBtn);

    fireEvent.keyDown(window, { code: 'Space', key: ' ' });

    // Arrow navigation
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    // Confidence ratings (Again 1, Hard 2, Good 3, Easy 4)
    ['Again', 'Hard', 'Good', 'Easy'].forEach((rating, idx) => {
      const rateBtn = screen.queryAllByText(new RegExp(rating, 'i')).find((el) => el.closest('button'));
      if (rateBtn) fireEvent.click(rateBtn);
      fireEvent.keyDown(window, { key: String(idx + 1) });
    });

    // Flashcard category and box filters
    const filterPills = screen.getAllByRole('button');
    filterPills.forEach((p) => {
      if (p.textContent?.includes('Due') || p.textContent?.includes('All Cards') || p.textContent?.includes('Mastered')) {
        fireEvent.click(p);
      }
    });

    // Switch to Quiz Tab
    const quizTab = screen.getByText(/Scenario & Anti-Pattern Quiz/i);
    fireEvent.click(quizTab);

    // Answer quiz options & navigate questions
    const qButtons = screen.getAllByRole('button');
    qButtons.forEach((b) => {
      if (b.textContent?.match(/^#\d+$/)) {
        fireEvent.click(b);
      }
    });

    for (let i = 0; i < 4; i++) {
      fireEvent.keyDown(window, { key: String(i + 1) });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    }

    // Save quiz attempt
    const saveBtn = screen.queryByText(/Save Attempt/i);
    if (saveBtn) fireEvent.click(saveBtn);
  });
});

describe('ContentStudioView Component', () => {
  it('installs packs, inspects JSON, authors topics/flashcards, and handles exports', () => {
    render(
      <StudyProvider>
        <ContentStudioView />
      </StudyProvider>
    );

    // Tab 1: Install Pack & Inspect Pack JSON
    const inspectButtons = screen.getAllByTitle(/Inspect Pack JSON/i);
    if (inspectButtons[0]) fireEvent.click(inspectButtons[0]);

    const installButtons = screen.getAllByText(/Install Pack|Re-Sync Pack/i);
    if (installButtons[0]) fireEvent.click(installButtons[0]);

    // Tab 2: Installed & Custom Library
    const libraryTab = screen.getByText(/Installed & Custom Library/i);
    fireEvent.click(libraryTab);

    // Tab 3: Author Custom Topic & Flashcard
    const authorTab = screen.getByText(/3\. Author Topic \/ Flashcard/i);
    fireEvent.click(authorTab);

    // Fill and submit custom topic form
    const topicTitleInput = screen.getByPlaceholderText(/Topic Title/i);
    fireEvent.change(topicTitleInput, { target: { value: 'Test Custom Topic' } });
    const summaryInput = screen.getByPlaceholderText(/Core architectural summary/i);
    fireEvent.change(summaryInput, { target: { value: 'Custom topic summary for testing' } });
    const saveTopicBtn = screen.getByText(/Save Topic to Curriculum/i);
    fireEvent.click(saveTopicBtn);

    // Fill and submit custom flashcard form
    const fcFrontInput = screen.getByPlaceholderText(/Front Question/i);
    fireEvent.change(fcFrontInput, { target: { value: 'What is Read-Repair?' } });
    const fcBackInput = screen.getByPlaceholderText(/Back Answer/i);
    fireEvent.change(fcBackInput, { target: { value: 'Background replica sync mechanism.' } });
    const saveFcBtn = screen.getByText(/Add Flashcard to Leitner Deck/i);
    fireEvent.click(saveFcBtn);

    // Tab 4: JSON Pack Import/Export
    const importTab = screen.getByText(/4\. JSON Pack Sync & CLI Guide/i);
    fireEvent.click(importTab);

    const exportBtn = screen.getByText(/Export Custom Pack/i);
    fireEvent.click(exportBtn);

    const jsonTextarea = screen.getByPlaceholderText(/team-pack-1/i);
    fireEvent.change(jsonTextarea, {
      target: {
        value: JSON.stringify({
          packId: 'test-pack',
          title: 'Test Pack',
          topics: [],
          flashcards: [],
        }),
      },
    });
    const mergeBtn = screen.getByText(/Merge JSON Content Pack/i);
    fireEvent.click(mergeBtn);

    // Switch back to Library and delete authored items
    fireEvent.click(libraryTab);
    const deleteBtns = screen.queryAllByTitle(/Delete/i);
    deleteBtns.forEach((db) => fireEvent.click(db));
  });
});
