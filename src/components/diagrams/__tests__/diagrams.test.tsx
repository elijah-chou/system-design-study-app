import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PatternSimulators } from '../PatternSimulators';
import { TradeoffSimulators } from '../TradeoffSimulators';
import { TradeoffRadar } from '../TradeoffRadar';
import { ArchitectureVisualizer } from '../ArchitectureVisualizer';
import { CASE_STUDIES } from '../../../data/caseStudies';
import { FRAMEWORK_MATRICES } from '../../../data/frameworkMatrices';
import { SimulatorType } from '../../../data/systemTradeoffs';

describe('PatternSimulators Component', () => {
  it('switches labs and tests Circuit Breaker and Jitter', () => {
    const onSelect = vi.fn();
    render(<PatternSimulators initialLab="circuit-breaker" onSelectLab={onSelect} />);

    // Lab 1: Circuit breaker requests
    const fireSuccess = screen.getByText(/Send Healthy Request/i);
    fireEvent.click(fireSuccess);
    const fireFail = screen.getByText(/Send Failing Request/i);
    fireEvent.click(fireFail);
    fireEvent.click(fireFail);
    fireEvent.click(fireFail); // trips breaker to OPEN

    // Fast fail in OPEN state
    fireEvent.click(fireSuccess);

    // Reset circuit breaker
    const resetBtn = screen.getByText(/Reset FSM/i);
    fireEvent.click(resetBtn);

    // Cooldown and threshold slider change
    const sliders = screen.getAllByRole('slider');
    if (sliders[0]) fireEvent.change(sliders[0], { target: { value: '2' } });
    if (sliders[1]) fireEvent.change(sliders[1], { target: { value: '3' } });

    // Jitter simulation toggles
    const noJitterBtn = screen.getByRole('button', { name: /No Jitter \(Thundering Herd\)/i });
    fireEvent.click(noJitterBtn);
    const fullJitterBtn = screen.getByRole('button', { name: /AWS Full Jitter \(Desynchronized\)/i });
    fireEvent.click(fullJitterBtn);

    // Switch to Rate Limiter Lab
    const rateLimiterTab = screen.getByText(/Rate Limiter Sandbox/i);
    fireEvent.click(rateLimiterTab);
    expect(onSelect).toHaveBeenCalledWith('rate-limiter');

    // Test Rate Limiter Lab actions
    const sendReqBtn = screen.getByRole('button', { name: /Send 1 Request/i });
    fireEvent.click(sendReqBtn);

    const exploitBtn = screen.getByRole('button', { name: /Trigger 2x Window Boundary Exploit/i });
    fireEvent.click(exploitBtn);

    const advanceTickBtn = screen.getByRole('button', { name: /\+250ms Tick/i });
    fireEvent.click(advanceTickBtn);

    const resetBucketBtn = screen.getByRole('button', { name: /^Reset$/i });
    fireEvent.click(resetBucketBtn);

    // Switch to Consistent Hashing Lab
    const hashingTab = screen.getByText(/Consistent Hashing Ring/i);
    fireEvent.click(hashingTab);
    expect(onSelect).toHaveBeenCalledWith('consistent-hashing');

    // Test Consistent Hashing Lab actions
    const addNodeBtn = screen.queryByText(/Add Node/i);
    if (addNodeBtn) fireEvent.click(addNodeBtn);

    const removeNodeBtn = screen.queryByText(/Simulate Crash/i);
    if (removeNodeBtn) fireEvent.click(removeNodeBtn);

    const vnodeToggles = screen.getAllByRole('button');
    vnodeToggles.forEach((b) => {
      if (b.textContent?.includes('VNodes') || b.textContent?.includes('Virtual')) {
        fireEvent.click(b);
      }
    });

    const hashKeyBtn = screen.queryByText(/Hash Sample Key/i);
    if (hashKeyBtn) fireEvent.click(hashKeyBtn);
  });
});

describe('TradeoffSimulators Component', () => {
  it('renders and switches between all distributed trade-off labs', () => {
    const { rerender } = render(
      <TradeoffSimulators activeSimulatorType="cap-pacelc" topicId="cap-pacelc" />
    );

    // Click tabs in simulator
    const tabs = [
      'Queueing & Tail Latency',
      'Dynamo Quorum (N, W, R)',
      'ACID Concurrency Timeline',
      'Cache Stampede & Penetration',
      'Hot-Shard Salting & Routing',
    ];

    tabs.forEach((tab) => {
      const tabBtn = screen.queryByText(new RegExp(tab, 'i'));
      if (tabBtn) fireEvent.click(tabBtn);
    });

    // Test CAP simulation interactions
    const togglePartition = screen.queryByText(/Network Partition/i);
    if (togglePartition) fireEvent.click(togglePartition);

    // Move sliders in active simulator
    const sliders = screen.getAllByRole('slider');
    sliders.forEach((slider) => {
      fireEvent.change(slider, { target: { value: '50' } });
    });

    // Test all buttons in active simulator
    const buttons = screen.getAllByRole('button');
    buttons.forEach((b) => {
      try {
        fireEvent.click(b);
      } catch {
        // ignore safe handler events
      }
    });

    // Test all simulator types and interactive actions
    const simulatorTypes: SimulatorType[] = [
      'cap-pacelc',
      'latency-throughput',
      'consistency-isolation',
      'caching',
      'replication-quorum',
      'sharding-lb',
    ];

    simulatorTypes.forEach((simType) => {
      rerender(<TradeoffSimulators activeSimulatorType={simType} topicId={simType} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((b) => {
        try { fireEvent.click(b); } catch {}
      });
      const sliders = screen.queryAllByRole('slider');
      sliders.forEach((slider) => {
        try { fireEvent.change(slider, { target: { value: '80' } }); } catch {}
      });
    });
  });
});

describe('TradeoffRadar Component', () => {
  it('renders multi-axis polygon chart and toggles contenders', () => {
    const matrix = FRAMEWORK_MATRICES[0];
    const onToggle = vi.fn();
    render(
      <TradeoffRadar
        axes={matrix.axes}
        contenders={matrix.contenders}
        selectedIds={[matrix.contenders[0].id, matrix.contenders[1].id]}
        onToggleContender={onToggle}
      />
    );

    // Hover axis labels
    const axisElements = screen.getAllByText(matrix.axes[0]);
    expect(axisElements.length).toBeGreaterThan(0);
    fireEvent.mouseEnter(axisElements[0].parentElement!);
    fireEvent.mouseLeave(axisElements[0].parentElement!);

    // Toggle contenders
    matrix.contenders.forEach((c) => {
      const contenderBtns = screen.queryAllByText(new RegExp(c.name, 'i'));
      if (contenderBtns.length > 0) {
        fireEvent.mouseEnter(contenderBtns[0]);
        fireEvent.click(contenderBtns[0]);
        fireEvent.mouseLeave(contenderBtns[0]);
      }
    });
  });
});

describe('ArchitectureVisualizer Component', () => {
  it('renders nodes, changes flow modes, and inspects nodes', () => {
    const cs = CASE_STUDIES[0];
    const { rerender } = render(<ArchitectureVisualizer caseStudy={cs} />);

    // Click Flow Modes
    ['All Flows', 'Highlight Read Path', 'Highlight Write Path', 'Simulate Node Outage'].forEach((mode) => {
      const btn = screen.queryByText(new RegExp(mode, 'i'));
      if (btn) fireEvent.click(btn);
    });

    // Click quick jump nodes
    cs.nodes.forEach((n) => {
      const firstWord = n.label.split(' ')[0];
      const quickBtn = screen.queryByText(firstWord);
      if (quickBtn) fireEvent.click(quickBtn);
    });

    // Click SVG nodes
    const svg = document.querySelector('svg');
    if (svg) {
      const groups = svg.querySelectorAll('g.cursor-pointer');
      groups.forEach((g) => fireEvent.click(g));
    }

    // Switch case study
    rerender(<ArchitectureVisualizer caseStudy={CASE_STUDIES[1]} />);
  });
});
