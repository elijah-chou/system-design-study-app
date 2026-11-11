import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Activity,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Gauge,
  Server,
  Plus,
  Trash2,
  Play,
  Sliders,
  ArrowRight,
  Flame,
} from 'lucide-react';

export type SimulatorLabId = 'circuit-breaker' | 'rate-limiter' | 'consistent-hashing';

interface PatternSimulatorsProps {
  initialLab?: SimulatorLabId;
  onSelectLab?: (lab: SimulatorLabId) => void;
}

// ============================================================================
// LAB 1: CIRCUIT BREAKER & EXPONENTIAL BACKOFF + FULL JITTER SIMULATOR
// ============================================================================
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface RequestLogEntry {
  id: number;
  time: string;
  outcome: 'SUCCESS_200' | 'FAIL_503' | 'FAST_FAIL_OPEN' | 'PROBE_SUCCESS' | 'PROBE_FAIL';
  latencyMs: number;
  stateAfter: CircuitState;
}

const CircuitBreakerLab: React.FC = () => {
  const [state, setState] = useState<CircuitState>('CLOSED');
  const [failureCount, setFailureCount] = useState(0);
  const [halfOpenSuccesses, setHalfOpenSuccesses] = useState(0);
  const [failureThreshold, setFailureThreshold] = useState(3);
  const [cooldownSeconds, setCooldownSeconds] = useState(6);
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [reqCounter, setReqCounter] = useState(1);

  // Jitter simulation state
  const [jitterMode, setJitterMode] = useState<'none' | 'full'>('full');
  const [jitterSeed, setJitterSeed] = useState(1);

  // Countdown timer when OPEN -> transitions to HALF_OPEN
  useEffect(() => {
    if (state !== 'OPEN') return;
    if (remainingCooldown <= 0) {
      setState('HALF_OPEN');
      setHalfOpenSuccesses(0);
      return;
    }
    const timer = setTimeout(() => {
      setRemainingCooldown((prev) => Math.max(0, Number((prev - 0.5).toFixed(1))));
    }, 500);
    return () => clearTimeout(timer);
  }, [state, remainingCooldown]);

  const appendLog = (
    outcome: RequestLogEntry['outcome'],
    latencyMs: number,
    stateAfter: CircuitState
  ) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setLogs((prev) => [
      { id: reqCounter, time: timeStr, outcome, latencyMs, stateAfter },
      ...prev.slice(0, 9),
    ]);
    setReqCounter((c) => c + 1);
  };

  const sendRequest = (shouldSucceed: boolean) => {
    if (state === 'OPEN') {
      // Fast-fail in <1ms without touching network!
      appendLog('FAST_FAIL_OPEN', 0.2, 'OPEN');
      return;
    }

    if (state === 'HALF_OPEN') {
      if (shouldSucceed) {
        const nextSuccess = halfOpenSuccesses + 1;
        if (nextSuccess >= 2) {
          setState('CLOSED');
          setFailureCount(0);
          setHalfOpenSuccesses(0);
          appendLog('PROBE_SUCCESS', 42, 'CLOSED');
        } else {
          setHalfOpenSuccesses(nextSuccess);
          appendLog('PROBE_SUCCESS', 45, 'HALF_OPEN');
        }
      } else {
        // Any failure in HALF_OPEN immediately trips back to OPEN!
        setState('OPEN');
        setRemainingCooldown(cooldownSeconds);
        setHalfOpenSuccesses(0);
        appendLog('PROBE_FAIL', 1200, 'OPEN');
      }
      return;
    }

    // CLOSED state
    if (shouldSucceed) {
      setFailureCount(0);
      appendLog('SUCCESS_200', 38, 'CLOSED');
    } else {
      const nextFailures = failureCount + 1;
      setFailureCount(nextFailures);
      if (nextFailures >= failureThreshold) {
        setState('OPEN');
        setRemainingCooldown(cooldownSeconds);
        appendLog('FAIL_503', 2500, 'OPEN');
      } else {
        appendLog('FAIL_503', 2500, 'CLOSED');
      }
    }
  };

  const resetBreaker = () => {
    setState('CLOSED');
    setFailureCount(0);
    setHalfOpenSuccesses(0);
    setRemainingCooldown(0);
    setLogs([]);
  };

  // Compute retry timeline across 20 buckets (0ms .. 1000ms in 50ms buckets) for 24 concurrent clients
  const retryBuckets = useMemo(() => {
    const buckets = Array.from({ length: 16 }, (_, i) => ({
      timeRange: `${i * 50}ms`,
      load: 0,
    }));
    const clientCount = 24;
    // Deterministic pseudo-random generator seeded by jitterSeed
    let s = jitterSeed * 9301 + 49297;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    // 3 retry waves: base=100ms -> 100ms, 200ms, 400ms
    const waveCeilings = [100, 200, 400, 700];
    for (let c = 0; c < clientCount; c++) {
      for (const ceiling of waveCeilings) {
        if (jitterMode === 'none') {
          const idx = Math.min(buckets.length - 1, Math.floor(ceiling / 50));
          buckets[idx].load += 1;
        } else {
          // AWS Full Jitter: random(0, base * 2^attempt)
          const delay = Math.floor(rand() * ceiling);
          const idx = Math.min(buckets.length - 1, Math.floor(delay / 50));
          buckets[idx].load += 1;
        }
      }
    }
    return buckets;
  }, [jitterMode, jitterSeed]);

  const maxBucketLoad = Math.max(...retryBuckets.map((b) => b.load), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive State Machine Diagram & Controls */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                3-State Circuit Breaker Finite State Machine
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Inject healthy 200 OK or failing 503 timeouts to observe fast-fail protection and probe recovery.
              </p>
            </div>
            <button
              onClick={resetBreaker}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset FSM
            </button>
          </div>

          {/* Visual SVG State Machine */}
          <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-4">
            <svg viewBox="0 0 600 185" className="w-full h-44">
              <defs>
                <marker id="arrow-slate" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#64748b" />
                </marker>
              </defs>

              {/* Edges */}
              {/* CLOSED -> OPEN */}
              <path
                d="M 165 65 Q 300 15 435 65"
                fill="none"
                stroke={state === 'OPEN' ? '#f43f5e' : '#475569'}
                strokeWidth="2"
                markerEnd="url(#arrow-slate)"
              />
              <text x="300" y="28" textAnchor="middle" className="fill-slate-400 text-[10px]">
                failures ({failureCount}/{failureThreshold}) &gt;= threshold
              </text>

              {/* OPEN -> HALF_OPEN */}
              <path
                d="M 475 110 L 365 150"
                fill="none"
                stroke={state === 'HALF_OPEN' ? '#f59e0b' : '#475569'}
                strokeWidth="2"
                markerEnd="url(#arrow-slate)"
              />
              <text x="465" y="145" textAnchor="middle" className="fill-slate-400 text-[10px]">
                cooldown ({cooldownSeconds}s) expires
              </text>

              {/* HALF_OPEN -> OPEN (Probe Fails) */}
              <path
                d="M 355 135 L 445 98"
                fill="none"
                stroke="#64748b"
                strokeDasharray="4 3"
                strokeWidth="1.5"
                markerEnd="url(#arrow-slate)"
              />
              <text x="378" y="106" textAnchor="middle" className="fill-rose-400 text-[9px]">
                1 probe fails
              </text>

              {/* HALF_OPEN -> CLOSED (Probes Succeed) */}
              <path
                d="M 235 150 L 125 110"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                markerEnd="url(#arrow-slate)"
              />
              <text x="140" y="145" textAnchor="middle" className="fill-emerald-400 text-[10px]">
                2/2 probes succeed
              </text>

              {/* Node 1: CLOSED */}
              <g transform="translate(45, 50)">
                <rect
                  width="120"
                  height="56"
                  rx="10"
                  fill={state === 'CLOSED' ? 'rgba(16, 185, 129, 0.18)' : '#0f172a'}
                  stroke={state === 'CLOSED' ? '#10b981' : '#334155'}
                  strokeWidth={state === 'CLOSED' ? '2.5' : '1.5'}
                />
                <text x="60" y="25" textAnchor="middle" className="fill-emerald-400 font-bold text-xs">
                  CLOSED
                </text>
                <text x="60" y="42" textAnchor="middle" className="fill-slate-400 text-[10px]">
                  Failures: {failureCount}/{failureThreshold}
                </text>
              </g>

              {/* Node 2: OPEN */}
              <g transform="translate(435, 50)">
                <rect
                  width="120"
                  height="56"
                  rx="10"
                  fill={state === 'OPEN' ? 'rgba(244, 63, 94, 0.2)' : '#0f172a'}
                  stroke={state === 'OPEN' ? '#f43f5e' : '#334155'}
                  strokeWidth={state === 'OPEN' ? '2.5' : '1.5'}
                />
                <text x="60" y="25" textAnchor="middle" className="fill-rose-400 font-bold text-xs">
                  OPEN (Fast-Fail)
                </text>
                <text x="60" y="42" textAnchor="middle" className="fill-slate-300 text-[10px]">
                  {state === 'OPEN' ? `Cooldown: ${remainingCooldown}s` : '0.2ms Short-Circuit'}
                </text>
              </g>

              {/* Node 3: HALF_OPEN */}
              <g transform="translate(240, 122)">
                <rect
                  width="120"
                  height="54"
                  rx="10"
                  fill={state === 'HALF_OPEN' ? 'rgba(245, 158, 11, 0.2)' : '#0f172a'}
                  stroke={state === 'HALF_OPEN' ? '#f59e0b' : '#334155'}
                  strokeWidth={state === 'HALF_OPEN' ? '2.5' : '1.5'}
                />
                <text x="60" y="24" textAnchor="middle" className="fill-amber-400 font-bold text-xs">
                  HALF_OPEN
                </text>
                <text x="60" y="40" textAnchor="middle" className="fill-slate-300 text-[10px]">
                  Probes: {halfOpenSuccesses}/2 OK
                </text>
              </g>
            </svg>
          </div>

          {/* Action Buttons & Threshold Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => sendRequest(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-medium text-xs transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Send Healthy Request (200 OK)
            </button>
            <button
              onClick={() => sendRequest(false)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-medium text-xs transition cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              Send Failing Request (503 Timeout)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Failure Threshold to Trip:</span>
                <span className="text-cyan-400 font-mono font-semibold">{failureThreshold} consecutive fails</span>
              </div>
              <input
                type="range"
                min={2}
                max={6}
                value={failureThreshold}
                onChange={(e) => {
                  const nextThreshold = Number(e.target.value);
                  setFailureThreshold(nextThreshold);
                  if (state === 'CLOSED' && failureCount >= nextThreshold) {
                    setState('OPEN');
                    setRemainingCooldown(cooldownSeconds);
                  }
                }}
                className="w-full accent-cyan-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Open Reset Cooldown:</span>
                <span className="text-amber-400 font-mono font-semibold">{cooldownSeconds}s</span>
              </div>
              <input
                type="range"
                min={3}
                max={12}
                value={cooldownSeconds}
                onChange={(e) => {
                  const nextCooldown = Number(e.target.value);
                  setCooldownSeconds(nextCooldown);
                  setRemainingCooldown((prev) => Math.min(prev, nextCooldown));
                }}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Right: Live Telemetry Feed & Latency Savings */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live Circuit Execution Log
              </h4>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
                  state === 'CLOSED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : state === 'OPEN'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                STATE: {state}
              </span>
            </div>

            {logs.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center border border-dashed border-slate-800 rounded-lg p-4 text-slate-500 text-xs">
                Click &ldquo;Send Failing Request&rdquo; {failureThreshold} times to trip the Circuit Breaker OPEN, then try sending more requests while it is OPEN.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {logs.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono">#{entry.id}</span>
                      <span
                        className={`font-medium ${
                          entry.outcome.includes('SUCCESS')
                            ? 'text-emerald-400'
                            : entry.outcome === 'FAST_FAIL_OPEN'
                            ? 'text-amber-300'
                            : 'text-rose-400'
                        }`}
                      >
                        {entry.outcome === 'FAST_FAIL_OPEN'
                          ? 'SHORT-CIRCUIT (Fallback)'
                          : entry.outcome}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono ${
                          entry.latencyMs < 1
                            ? 'text-cyan-300 font-semibold'
                            : entry.latencyMs > 1000
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {entry.latencyMs}ms
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        &rarr; {entry.stateAfter}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs text-slate-300">
            <span className="font-semibold text-cyan-300">Why this matters in interviews:</span> A hanging downstream takes <span className="text-rose-300 font-mono">2,500ms</span> to time out, tying up worker threads. Once tripped <span className="text-rose-300 font-mono">OPEN</span>, requests fail-fast in <span className="text-cyan-300 font-mono">0.2ms</span> (12,500x faster!), preserving upstream thread pools.
          </div>
        </div>
      </div>

      {/* Bottom Panel: Exponential Backoff with No Jitter vs Full Jitter */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              Retry Storm Visualizer: Exponential Backoff (No Jitter) vs. AWS Full Jitter
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulating 24 concurrent clients retrying 4 times after a transient brownout: <code className="text-cyan-300">sleep = random(0, base * 2^attempt)</code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setJitterMode('none')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                jitterMode === 'none'
                  ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              No Jitter (Thundering Herd)
            </button>
            <button
              onClick={() => setJitterMode('full')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                jitterMode === 'full'
                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              AWS Full Jitter (Desynchronized)
            </button>
            {jitterMode === 'full' && (
              <button
                onClick={() => setJitterSeed((s) => s + 1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
                title="Re-roll random jitter distribution"
              >
                Re-sample
              </button>
            )}
          </div>
        </div>

        {/* Bar chart of retry concurrency over time */}
        <div
          style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
          className="grid gap-1.5 items-end h-32 pt-4 px-3 bg-slate-950/90 border border-slate-800/80 rounded-lg"
        >
          {retryBuckets.map((b, i) => {
            const heightPct = Math.round((b.load / 24) * 100);
            const isOverload = b.load >= 15;
            return (
              <div key={i} className="flex flex-col items-center justify-end h-full">
                <span className="text-[10px] font-mono text-slate-400 mb-1">
                  {b.load > 0 ? b.load : ''}
                </span>
                <div
                  style={{ height: `${Math.max(heightPct, b.load > 0 ? 8 : 2)}%` }}
                  className={`w-full rounded-t transition-all duration-300 ${
                    b.load === 0
                      ? 'bg-slate-800/40'
                      : isOverload
                      ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                      : 'bg-emerald-500/80'
                  }`}
                />
                <span className="text-[9px] font-mono text-slate-500 mt-1.5 truncate">
                  {b.timeRange}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div>
            Peak Simultaneous Server Load:{' '}
            <span className={`font-mono font-bold ${maxBucketLoad >= 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {maxBucketLoad} reqs/tick
            </span>{' '}
            {jitterMode === 'none'
              ? '(All 24 clients hammer the server at identical 100ms, 200ms, 400ms ticks!)'
              : '(Uniformly spread across the time window — server recovers smoothly)'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LAB 2: RATE LIMITER ALGORITHM SANDBOX (4 ALGORITHMS + 2X BOUNDARY EXPLOIT)
// ============================================================================
const RateLimiterLab: React.FC = () => {
  const quotaPerWindow = 5;
  // Token Bucket State
  const [tokens, setTokens] = useState<number>(5);
  // Leaky Bucket Queue Level
  const [leakyWater, setLeakyWater] = useState<number>(0);
  // Fixed Window vs Sliding Window Counter
  const [prevWindowCount, setPrevWindowCount] = useState<number>(0);
  const [currWindowCount, setCurrWindowCount] = useState<number>(0);
  const [windowProgressPct, setWindowProgressPct] = useState<number>(30); // 0..100% into current window

  const [comparisonLog, setComparisonLog] = useState<
    {
      id: number;
      scenario: string;
      tokenBucketAllowed: boolean;
      leakyAllowed: boolean;
      fixedWindowAllowed: boolean;
      slidingWindowAllowed: boolean;
      slidingWeighted: string;
    }[]
  >([]);
  const [eventId, setEventId] = useState(1);

  // Compute Sliding Window Counter weighted count: curr + prev * (1 - progress)
  const slidingWeightedCount = Number(
    (currWindowCount + prevWindowCount * (1 - windowProgressPct / 100)).toFixed(2)
  );

  const fireSingleRequest = (label = 'Single Request') => {
    const tbAllowed = tokens >= 1;
    const lbAllowed = leakyWater < quotaPerWindow;
    const fwAllowed = currWindowCount < quotaPerWindow;
    const swAllowed = slidingWeightedCount + 1 <= quotaPerWindow;

    if (tbAllowed) setTokens((t) => Math.max(0, Number((t - 1).toFixed(1))));
    if (lbAllowed) setLeakyWater((w) => Math.min(quotaPerWindow, w + 1));
    if (fwAllowed) setCurrWindowCount((c) => c + 1);

    setComparisonLog((prev) => [
      {
        id: eventId,
        scenario: label,
        tokenBucketAllowed: tbAllowed,
        leakyAllowed: lbAllowed,
        fixedWindowAllowed: fwAllowed,
        slidingWindowAllowed: swAllowed,
        slidingWeighted: `${slidingWeightedCount} / ${quotaPerWindow}`,
      },
      ...prev.slice(0, 7),
    ]);
    setEventId((id) => id + 1);
  };

  const simulateBoundaryExploit = () => {
    // Demonstrate the classic Fixed Window 2x Boundary Spike:
    // 5 requests arrived at 00:59 (end of previous window -> prevWindowCount = 5)
    // Clock ticks to 01:01 (20% into new window -> windowProgressPct = 20%, currWindowCount = 0)
    // Now attacker sends a burst at 01:01!
    setPrevWindowCount(5);
    setCurrWindowCount(3);
    setWindowProgressPct(20);
    setTokens(1);
    setLeakyWater(4);

    const weightedAt20Pct = Number((3 + 5 * (1 - 0.2)).toFixed(2)); // 3 + 4.0 = 7.0 (> 5 quota!)
    setComparisonLog((prev) => [
      {
        id: eventId,
        scenario: '2x Boundary Burst (5 reqs @ 00:59 + burst @ 01:01)',
        tokenBucketAllowed: false,
        leakyAllowed: false,
        fixedWindowAllowed: true, // Fixed window blindly allows another 5 reqs (2x spike!)
        slidingWindowAllowed: false, // Sliding window catches it: 3 + 5*(0.8) = 7.0 > 5!
        slidingWeighted: `${weightedAt20Pct} / ${quotaPerWindow}`,
      },
      ...prev.slice(0, 7),
    ]);
    setEventId((id) => id + 1);
  };

  const advanceTimeTick = () => {
    // Refill 1.5 tokens, leak 1 water unit, advance window progress by 25%
    setTokens((t) => Math.min(quotaPerWindow, Number((t + 1.5).toFixed(1))));
    setLeakyWater((w) => Math.max(0, w - 1));
    const nextPct = windowProgressPct + 25;
    if (nextPct >= 100) {
      setPrevWindowCount(currWindowCount);
      setCurrWindowCount(0);
      setWindowProgressPct(nextPct % 100);
    } else {
      setWindowProgressPct(nextPct);
    }
  };

  const resetAll = () => {
    setTokens(quotaPerWindow);
    setLeakyWater(0);
    setPrevWindowCount(0);
    setCurrWindowCount(0);
    setWindowProgressPct(30);
    setComparisonLog([]);
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-cyan-400" />
              Multi-Algorithm Rate Limiter Sandbox (Quota = {quotaPerWindow} reqs / window)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare how Token Bucket, Leaky Bucket, Fixed Window, and Sliding Window Counter handle bursts and window edges.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fireSingleRequest('Incoming API Request')}
              className="px-3.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Play className="w-3.5 h-3.5" />
              Send 1 Request
            </button>
            <button
              onClick={simulateBoundaryExploit}
              className="px-3.5 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Zap className="w-3.5 h-3.5" />
              Trigger 2x Window Boundary Exploit
            </button>
            <button
              onClick={advanceTimeTick}
              className="px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium cursor-pointer transition"
            >
              +250ms Tick (Refill / Leak)
            </button>
            <button
              onClick={resetAll}
              className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer transition"
            >
              Reset
            </button>
          </div>
        </div>

        {/* 4 Algorithm Live Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* 1. Token Bucket */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  1. Token Bucket
                </span>
                <span className="text-xs font-mono text-slate-300">
                  {tokens} / {quotaPerWindow} tokens
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Allows legitimate bursts up to bucket capacity, refilling steadily at rate R.
              </p>
              <div className="flex items-center gap-1.5 my-4">
                {Array.from({ length: quotaPerWindow }).map((_, idx) => {
                  const filled = idx < Math.floor(tokens);
                  return (
                    <div
                      key={idx}
                      className={`h-8 flex-1 rounded-md border transition-all ${
                        filled
                          ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.25)]'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2">
              State: <span className="text-slate-200">2 floats (tokens, lastRefill)</span>
            </div>
          </div>

          {/* 2. Leaky Bucket */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  2. Leaky Bucket
                </span>
                <span className="text-xs font-mono text-slate-300">
                  Queue: {leakyWater} / {quotaPerWindow}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Smooths bursts into a strict constant outflow rate; drops if FIFO queue is full.
              </p>
              <div className="w-full bg-slate-900 h-8 rounded-md border border-slate-800 overflow-hidden my-4 flex">
                <div
                  style={{ width: `${(leakyWater / quotaPerWindow) * 100}%` }}
                  className="bg-indigo-500/50 border-r border-indigo-400 transition-all duration-300"
                />
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2">
              Best for: <span className="text-slate-200">Protecting fragile legacy DBs</span>
            </div>
          </div>

          {/* 3. Fixed Window Counter */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  3. Fixed Window
                </span>
                <span className="text-xs font-mono text-slate-300">
                  Count: {currWindowCount} / {quotaPerWindow}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Simple integer counter per time bucket, but vulnerable to <span className="text-rose-400 font-semibold">2x boundary spikes</span>!
              </p>
              <div className="my-4 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Prev Window (00:00–01:00):</span>
                  <span className="text-slate-200">{prevWindowCount} reqs</span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Curr Window (01:00–02:00):</span>
                  <span>{currWindowCount} reqs (Ignores prev!)</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] font-mono text-rose-400 border-t border-slate-800/80 pt-2">
              Trap: Allows {quotaPerWindow * 2} reqs across 00:59 &rarr; 01:01!
            </div>
          </div>

          {/* 4. Sliding Window Counter */}
          <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  4. Sliding Window Counter
                </span>
                <span
                  className={`text-xs font-mono font-bold ${
                    slidingWeightedCount >= quotaPerWindow ? 'text-rose-400' : 'text-emerald-300'
                  }`}
                >
                  Est: {slidingWeightedCount} / {quotaPerWindow}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Cloudflare standard: weighted average of previous &amp; current windows.
              </p>
              <div className="my-3 p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                <div>
                  weight = 1 - ({windowProgressPct}% / 100) = {(1 - windowProgressPct / 100).toFixed(2)}
                </div>
                <div className="text-emerald-300 mt-0.5">
                  est = {currWindowCount} + ({prevWindowCount} &times; {(1 - windowProgressPct / 100).toFixed(2)}) ={' '}
                  <span className="font-bold">{slidingWeightedCount}</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] font-mono text-emerald-400 border-t border-slate-800/80 pt-2">
              Stops 2x boundary spike with only 2 integers!
            </div>
          </div>
        </div>
      </div>

      {/* Decision Matrix Log */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Side-by-Side Admission Decision Log (200 OK vs 429 Too Many Requests)
        </h4>
        {comparisonLog.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
            Click &ldquo;Send 1 Request&rdquo; or &ldquo;Trigger 2x Window Boundary Exploit&rdquo; above to compare algorithm decisions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 px-3">Scenario</th>
                  <th className="py-2 px-3">Token Bucket</th>
                  <th className="py-2 px-3">Leaky Bucket</th>
                  <th className="py-2 px-3">Fixed Window</th>
                  <th className="py-2 px-3">Sliding Window Counter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {comparisonLog.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/30">
                    <td className="py-2 pr-3 font-mono text-slate-500">#{row.id}</td>
                    <td className="py-2 px-3 font-medium text-slate-200">{row.scenario}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                          row.tokenBucketAllowed
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {row.tokenBucketAllowed ? '200 OK' : '429 REJECT'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                          row.leakyAllowed
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {row.leakyAllowed ? '200 QUEUED' : '429 DROP'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                          row.fixedWindowAllowed
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {row.fixedWindowAllowed ? '200 OK (ALLOWED)' : '429 REJECT'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                          row.slidingWindowAllowed
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300 font-semibold'
                        }`}
                      >
                        {row.slidingWindowAllowed ? '200 OK' : `429 BLOCKED (${row.slidingWeighted})`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// LAB 3: CONSISTENT HASHING RING VISUALIZER (VNODES vs MODULO SHARDING)
// ============================================================================
interface PhysicalNode {
  id: string;
  color: string;
}

const NODE_PALETTE: PhysicalNode[] = [
  { id: 'shard-alpha', color: '#22d3ee' }, // cyan
  { id: 'shard-beta', color: '#a855f7' },  // purple
  { id: 'shard-gamma', color: '#10b981' }, // emerald
  { id: 'shard-delta', color: '#f59e0b' }, // amber
  { id: 'shard-omega', color: '#f43f5e' }, // rose
];

const INITIAL_KEYS = [
  'user:1001',
  'user:2048',
  'session:99a',
  'cart:771b',
  'order:5502',
  'profile:88c',
  'feed:3104',
  'token:661f',
  'invoice:901',
  'cache:4410',
  'metric:192',
  'lock:7731',
];

function hashAngle(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 3600) / 10; // 0.0 .. 359.9 degrees
}

const ConsistentHashingLab: React.FC = () => {
  const [activeNodes, setActiveNodes] = useState<PhysicalNode[]>(NODE_PALETTE.slice(0, 3));
  const [vnodeCount, setVnodeCount] = useState<1 | 4>(4);
  const [keys, setKeys] = useState<string[]>(INITIAL_KEYS);
  const [customKeyInput, setCustomKeyInput] = useState('');

  // Generate sorted ring of virtual node tokens (angle 0..360)
  const ringTokens = useMemo(() => {
    const tokens: { angle: number; nodeId: string; color: string; label: string }[] = [];
    for (const node of activeNodes) {
      for (let v = 0; v < vnodeCount; v++) {
        const angle = hashAngle(`${node.id}#vnode-${v}`);
        tokens.push({
          angle,
          nodeId: node.id,
          color: node.color,
          label: `${node.id}#${v}`,
        });
      }
    }
    return tokens.sort((a, b) => a.angle - b.angle);
  }, [activeNodes, vnodeCount]);

  // Map each key to its clockwise owner on the ring
  const keyPlacements = useMemo(() => {
    if (ringTokens.length === 0) return [];
    return keys.map((key) => {
      const keyAngle = hashAngle(`key:${key}`);
      // First vnode with angle >= keyAngle, or wrap around toringTokens[0]
      const owner =
        ringTokens.find((t) => t.angle >= keyAngle) ?? ringTokens[0];
      return {
        key,
        angle: keyAngle,
        ownerId: owner.nodeId,
        ownerColor: owner.color,
        vnodeAngle: owner.angle,
      };
    });
  }, [keys, ringTokens]);

  // Calculate what happens if the last active node crashes (Consistent Hashing vs Modulo hash % N)
  const migrationStats = useMemo(() => {
    if (activeNodes.length <= 1) {
      return { consistentRemappedPct: 0, moduloRemappedPct: 0, droppedNode: 'N/A' };
    }
    const survivingNodes = activeNodes.slice(0, activeNodes.length - 1);
    const droppedNode = activeNodes[activeNodes.length - 1].id;

    // Surviving ring
    const survivingTokens: { angle: number; nodeId: string }[] = [];
    for (const node of survivingNodes) {
      for (let v = 0; v < vnodeCount; v++) {
        survivingTokens.push({
          angle: hashAngle(`${node.id}#vnode-${v}`),
          nodeId: node.id,
        });
      }
    }
    survivingTokens.sort((a, b) => a.angle - b.angle);

    let consistentMoved = 0;
    let moduloMoved = 0;

    keys.forEach((k) => {
      const kAngle = hashAngle(`key:${k}`);
      const beforeOwner = (ringTokens.find((t) => t.angle >= kAngle) ?? ringTokens[0]).nodeId;
      const afterOwner = (survivingTokens.find((t) => t.angle >= kAngle) ?? survivingTokens[0]).nodeId;
      if (beforeOwner !== afterOwner) consistentMoved++;

      const intHash = Math.floor(kAngle * 10);
      const modBefore = intHash % activeNodes.length;
      const modAfter = intHash % survivingNodes.length;
      if (modBefore !== modAfter) moduloMoved++;
    });

    const totalKeys = Math.max(keys.length, 1);
    return {
      droppedNode,
      consistentRemappedPct: Math.round((consistentMoved / totalKeys) * 100),
      moduloRemappedPct: Math.round((moduloMoved / totalKeys) * 100),
    };
  }, [activeNodes, vnodeCount, keys, ringTokens]);

  const addPhysicalNode = () => {
    if (activeNodes.length >= NODE_PALETTE.length) return;
    setActiveNodes(NODE_PALETTE.slice(0, activeNodes.length + 1));
  };

  const removePhysicalNode = () => {
    if (activeNodes.length <= 2) return;
    setActiveNodes(activeNodes.slice(0, activeNodes.length - 1));
  };

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customKeyInput.trim();
    if (!trimmed || keys.includes(trimmed)) return;
    setKeys((prev) => [...prev, trimmed]);
    setCustomKeyInput('');
  };

  // Polar to SVG cartesian coordinates (center = 160, 160, radius = 115)
  const polarToXY = (angleDeg: number, radius: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: 160 + radius * Math.cos(rad),
      y: 160 + radius * Math.sin(rad),
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Interactive SVG Hash Ring */}
      <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col items-center">
        <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              32-Bit Consistent Hash Ring ([0, 2&sup3;&sup2;-1])
            </h3>
            <p className="text-xs text-slate-400">
              Keys walk clockwise to the first Virtual Node token on the ring.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setVnodeCount(1)}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                vnodeCount === 1
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1 VNode (Skewed)
            </button>
            <button
              onClick={() => setVnodeCount(4)}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                vnodeCount === 4
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              4 VNodes (Balanced)
            </button>
          </div>
        </div>

        {/* SVG Ring */}
        <svg viewBox="0 0 320 320" className="w-72 h-72 my-1">
          {/* Outer Ring Circle */}
          <circle
            cx="160"
            cy="160"
            r="115"
            fill="none"
            stroke="#1e293b"
            strokeWidth="10"
          />
          <circle
            cx="160"
            cy="160"
            r="115"
            fill="none"
            stroke="#334155"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Center telemetry label */}
          <text x="160" y="148" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">
            {activeNodes.length} Physical Nodes
          </text>
          <text x="160" y="165" textAnchor="middle" className="fill-white text-xs font-bold">
            {ringTokens.length} Ring VNodes
          </text>
          <text x="160" y="180" textAnchor="middle" className="fill-cyan-400 text-[10px] font-mono">
            {keys.length} Mapped Keys
          </text>

          {/* Lines from each key (inner circle r=82) to its clockwise VNode (r=115) */}
          {keyPlacements.map((kp) => {
            const keyPos = polarToXY(kp.angle, 82);
            const vnodePos = polarToXY(kp.vnodeAngle, 115);
            return (
              <g key={kp.key}>
                <line
                  x1={keyPos.x}
                  y1={keyPos.y}
                  x2={vnodePos.x}
                  y2={vnodePos.y}
                  stroke={kp.ownerColor}
                  strokeOpacity="0.45"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={keyPos.x}
                  cy={keyPos.y}
                  r="4"
                  fill={kp.ownerColor}
                />
              </g>
            );
          })}

          {/* VNode tokens on the ring (r=115) */}
          {ringTokens.map((t) => {
            const pos = polarToXY(t.angle, 115);
            return (
              <g key={t.label}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="7"
                  fill="#0f172a"
                  stroke={t.color}
                  strokeWidth="3"
                />
              </g>
            );
          })}
        </svg>

        {/* Add / Remove Physical Node Controls */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <button
            onClick={addPhysicalNode}
            disabled={activeNodes.length >= NODE_PALETTE.length}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Scale Up (+1 Node)
          </button>
          <button
            onClick={removePhysicalNode}
            disabled={activeNodes.length <= 2}
            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Simulate Node Crash (-1 Node)
          </button>
        </div>
      </div>

      {/* Right: Load Distribution & Cache Stampede Comparison */}
      <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-5">
        <div>
          <h4 className="text-sm font-semibold text-white mb-1">
            Per-Shard Key Load Balance &amp; Ownership
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            Toggle between <span className="text-amber-300">1 VNode</span> and <span className="text-cyan-300">4 VNodes</span> to see how Virtual Nodes eliminate shard hot-spotting.
          </p>

          <div className="space-y-3">
            {activeNodes.map((node) => {
              const ownedKeys = keyPlacements.filter((k) => k.ownerId === node.id);
              const pct = Math.round((ownedKeys.length / Math.max(keys.length, 1)) * 100);
              return (
                <div key={node.id} className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: node.color }}
                      />
                      <span className="font-mono font-semibold text-white">{node.id}</span>
                    </div>
                    <span className="font-mono text-slate-300">
                      {ownedKeys.length} keys ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: node.color }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ownedKeys.map((k) => (
                      <span
                        key={k.key}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300"
                      >
                        {k.key}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Key Injector */}
        <form onSubmit={handleAddKey} className="flex gap-2">
          <input
            type="text"
            value={customKeyInput}
            onChange={(e) => setCustomKeyInput(e.target.value)}
            placeholder="Inject custom key (e.g., tenant:acme)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-medium cursor-pointer"
          >
            Hash Key
          </button>
        </form>

        {/* Cache Stampede Comparison Box */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Blast Radius if <code className="text-rose-400">{migrationStats.droppedNode}</code> Crashes Right Now:
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-[11px] text-slate-400">Consistent Hashing (1/N)</div>
              <div className="text-lg font-mono font-bold text-emerald-400">
                {migrationStats.consistentRemappedPct}% keys move
              </div>
              <div className="text-[10px] text-emerald-300/80">
                Only keys on dead shard migrate; cache stays warm!
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <div className="text-[11px] text-slate-400">Modulo: hash(key) % N</div>
              <div className="text-lg font-mono font-bold text-rose-400">
                {migrationStats.moduloRemappedPct}% keys move
              </div>
              <div className="text-[10px] text-rose-300/80">
                Massive cache miss stampede hits the database!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN EXPORTED WRAPPER COMPONENT
// ============================================================================
export const PatternSimulators: React.FC<PatternSimulatorsProps> = ({
  initialLab = 'circuit-breaker',
  onSelectLab,
}) => {
  const [activeLab, setActiveLab] = useState<SimulatorLabId>(initialLab);

  useEffect(() => {
    setActiveLab(initialLab);
  }, [initialLab]);

  const handleLabChange = (lab: SimulatorLabId) => {
    setActiveLab(lab);
    onSelectLab?.(lab);
  };

  return (
    <div className="space-y-6">
      {/* Lab Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Interactive Distributed Pattern Laboratories
            </h2>
            <p className="text-xs text-slate-400">
              Test state transitions, burst edge-cases, and ring topology changes in real time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleLabChange('circuit-breaker')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeLab === 'circuit-breaker'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            1. Circuit Breaker &amp; Full Jitter
          </button>
          <button
            onClick={() => handleLabChange('rate-limiter')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeLab === 'rate-limiter'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Gauge className="w-4 h-4" />
            2. Rate Limiter Sandbox
          </button>
          <button
            onClick={() => handleLabChange('consistent-hashing')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeLab === 'consistent-hashing'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Server className="w-4 h-4" />
            3. Consistent Hashing Ring
          </button>
        </div>
      </div>

      {/* Active Laboratory Body */}
      {activeLab === 'circuit-breaker' && <CircuitBreakerLab />}
      {activeLab === 'rate-limiter' && <RateLimiterLab />}
      {activeLab === 'consistent-hashing' && <ConsistentHashingLab />}
    </div>
  );
};
