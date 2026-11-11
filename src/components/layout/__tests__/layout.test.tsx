import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Navbar } from '../Navbar';
import { Sidebar } from '../Sidebar';
import { CommandPalette } from '../CommandPalette';
import { StudyProvider, useStudy } from '../../../context/StudyContext';

describe('Navbar Component', () => {
  it('renders brand identity, navigates on clicks, and triggers actions', () => {
    let ctxRef: ReturnType<typeof useStudy>;
    const Probe: React.FC = () => {
      ctxRef = useStudy();
      return null;
    };

    render(
      <StudyProvider>
        <Probe />
        <Navbar />
      </StudyProvider>
    );

    // Brand click (SysDesign Atlas)
    const brandBtn = screen.getByText(/SysDesign/i).closest('button')!;
    fireEvent.click(brandBtn);
    expect(ctxRef!.activeView).toBe('dashboard');

    // Mastery pill click
    const masteryBtn = screen.getByTitle('Overall Curriculum Mastery');
    fireEvent.click(masteryBtn);
    expect(ctxRef!.activeView).toBe('dashboard');

    // Command palette trigger
    const cmdkBtn = screen.getByText(/Search patterns/i).closest('button')!;
    fireEvent.click(cmdkBtn);
    expect(ctxRef!.isCommandPaletteOpen).toBe(true);

    // Bookmarked button
    const bookmarkBtn = screen.getByTitle('Bookmarked Topics');
    fireEvent.click(bookmarkBtn);
    expect(ctxRef!.activeView).toBe('dashboard');

    // Studio button
    const studioBtn = screen.getByTitle('Content Studio & Quarterly Update Packs');
    fireEvent.click(studioBtn);
    expect(ctxRef!.activeView).toBe('studio');

    // Active Recall button
    const practiceBtn = screen.getByTitle('Practice Flashcards & Architectural Quizzes');
    fireEvent.click(practiceBtn);
    expect(ctxRef!.activeView).toBe('practice');

    // Reset button with confirm true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const resetBtn = screen.getByTitle('Reset All Progress');
    fireEvent.click(resetBtn);
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();

    // Reset button with confirm false
    const confirmSpyFalse = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(resetBtn);
    expect(confirmSpyFalse).toHaveBeenCalled();
    confirmSpyFalse.mockRestore();
  });
});

describe('Sidebar Component', () => {
  it('renders navigation modules, toggles collapse, and navigates', () => {
    render(
      <StudyProvider>
        <Sidebar />
      </StudyProvider>
    );

    expect(screen.getByText('Curriculum Modules')).toBeDefined();

    // Click collapse toggle button
    const toggleBtn = screen.getByTitle('Collapse sidebar');
    fireEvent.click(toggleBtn);
    expect(screen.getByTitle('Expand sidebar')).toBeDefined();

    // Expand sidebar back
    const expandBtn = screen.getByTitle('Expand sidebar');
    fireEvent.click(expandBtn);
    expect(screen.getByText('Curriculum Modules')).toBeDefined();

    // Click navigation items
    const patternsItem = screen.getByText('Design & Cloud Patterns').closest('button')!;
    fireEvent.click(patternsItem);
  });
});

describe('CommandPalette Component', () => {
  it('opens, searches, filters, handles keyboard navigation and selection', async () => {
    let ctxRef: ReturnType<typeof useStudy>;
    const Probe: React.FC = () => {
      ctxRef = useStudy();
      return null;
    };

    render(
      <StudyProvider>
        <Probe />
        <CommandPalette />
      </StudyProvider>
    );

    // Trigger keyboard shortcut to open
    act(() => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });
    expect(ctxRef!.isCommandPaletteOpen).toBe(true);

    const input = screen.getByPlaceholderText(/Search patterns/i) as HTMLInputElement;
    expect(input).toBeDefined();

    // Search query
    act(() => {
      fireEvent.change(input, { target: { value: 'circuit' } });
    });
    expect(input.value).toBe('circuit');

    // Clear query button
    const clearBtn = screen.getByLabelText('Clear search query');
    act(() => {
      fireEvent.click(clearBtn);
    });
    expect(input.value).toBe('');

    // Filter pills
    const patternsPill = screen.getByRole('button', { name: /^Patterns$/i });
    act(() => {
      fireEvent.click(patternsPill);
    });

    const allPill = screen.getByRole('button', { name: /^All/i });
    act(() => {
      fireEvent.click(allPill);
    });

    // Keyboard arrow down, up, and Enter
    const modal = screen.getByRole('dialog').firstElementChild!;
    act(() => {
      fireEvent.keyDown(modal, { key: 'ArrowDown' });
      fireEvent.keyDown(modal, { key: 'ArrowUp' });
      fireEvent.keyDown(modal, { key: 'Enter' });
    });
    expect(ctxRef!.isCommandPaletteOpen).toBe(false);

    // Reopen and test Escape key
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
    });
    expect(ctxRef!.isCommandPaletteOpen).toBe(true);

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(ctxRef!.isCommandPaletteOpen).toBe(false);

    // Reopen and test backdrop click & empty results
    act(() => {
      ctxRef!.setCommandPaletteOpen(true);
    });
    const searchInput = screen.getByPlaceholderText(/Search patterns/i);
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'zzznonexistentxyz' } });
    });
    expect(screen.getByText(/No matching architecture patterns/i)).toBeDefined();

    const dialog = screen.getByRole('dialog');
    act(() => {
      fireEvent.click(dialog);
    });
    expect(ctxRef!.isCommandPaletteOpen).toBe(false);
  });
});
