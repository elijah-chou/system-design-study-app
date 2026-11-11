import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import App from './App';
import { StudyProvider, useStudy } from './context/StudyContext';
import type { ViewId } from './types';

const VIEWS: ViewId[] = ['dashboard', 'patterns', 'tradeoffs', 'matrices', 'cases', 'practice', 'studio'];

let setView: (v: ViewId) => void = () => {};
const Probe: React.FC = () => {
  setView = useStudy().setActiveView;
  return null;
};

describe('App', () => {
  it('renders the shell and every view without crashing', () => {
    const { container } = render(
      <StudyProvider>
        <Probe />
        <App />
      </StudyProvider>,
    );
    expect(container.querySelector('main')).not.toBeNull();
    for (const v of VIEWS) {
      act(() => setView(v));
      expect(container.querySelector('main')!.childElementCount).toBeGreaterThan(0);
    }
  });
});

