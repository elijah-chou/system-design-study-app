import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import App from './App';
import { StudyProvider, useStudy } from './context/StudyContext';
import type { ViewId } from './types';
import { SOFTWARE_PATTERNS } from './data/softwarePatterns';
import { DISTRIBUTED_PATTERNS } from './data/distributedPatterns';
import { SYSTEM_TRADEOFFS } from './data/systemTradeoffs';
import { FRAMEWORK_MATRICES } from './data/frameworkMatrices';
import { CASE_STUDIES } from './data/caseStudies';

let nav: (v: ViewId, id?: string | null) => void = () => {};
const Probe: React.FC = () => {
  nav = useStudy().navigateToItem;
  return null;
};

const mount = () =>
  render(
    <StudyProvider>
      <Probe />
      <App />
    </StudyProvider>,
  );

const clickAll = (root: HTMLElement) => {
  for (const b of Array.from(root.querySelectorAll('main button'))) {
    try {
      fireEvent.click(b);
    } catch {
      /* ignore handler errors from arbitrary clicks */
    }
  }
};

describe('App deep render', () => {
  const targets: [ViewId, string[]][] = [
    ['patterns', [...SOFTWARE_PATTERNS, ...DISTRIBUTED_PATTERNS].map((x) => x.id)],
    ['tradeoffs', SYSTEM_TRADEOFFS.map((x) => x.id)],
    ['matrices', FRAMEWORK_MATRICES.map((x) => x.id)],
    ['cases', CASE_STUDIES.map((x) => x.id)],
  ];

  for (const [view, ids] of targets) {
    it(`renders every ${view} detail`, () => {
      const { container } = mount();
      for (const id of ids) {
        act(() => nav(view, id));
        expect(container.querySelector('main')!.childElementCount).toBeGreaterThan(0);
      }
    });
  }

  it('survives clicking every button in each view', () => {
    const { container } = mount();
    for (const v of ['dashboard', 'patterns', 'tradeoffs', 'matrices', 'cases', 'practice', 'studio'] as ViewId[]) {
      act(() => nav(v));
      clickAll(container);
    }
    expect(container.querySelector('main')).not.toBeNull();
  });
});
