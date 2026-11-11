import React, { useState, useMemo } from 'react';
import {
  Wifi,
  WifiOff,
  Activity,
  Database,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Layers,
  GitMerge,
  Server,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { SimulatorType } from '../../data/systemTradeoffs';

interface TradeoffSimulatorsProps {
  activeSimulatorType: SimulatorType;
  topicId?: string;
}

// ============================================================================
// 1. CAP & PACELC INTERACTIVE PARTITION SIMULATOR
// ============================================================================
type PacelcProfileKey = 'PC/EC' | 'PA/EL' | 'PA/EC' | 'PC/EL';

interface PacelcProfile {
  key: PacelcProfileKey;
  name: string;
  systems: string;
  normalBehavior: {
    writeLatency: string;
    readBehavior: string;
    consistency: string;
    replicationMode: string;
  };
  partitionBehavior: {
    majorityWrite: string;
    minorityWrite: string;
    minorityRead: string;
    statusBadge: 'Consistent (CP)' | 'Available (AP)';
    explanation: string;
  };
}

const PACELC_PROFILES: Record<PacelcProfileKey, PacelcProfile> = {
  'PC/EC': {
    key: 'PC/EC',
    name: 'PC / EC — Strict Quorum Consensus',
    systems: 'Google Cloud Spanner, CockroachDB, etcd, HBase',
    normalBehavior: {
      writeLatency: '65ms (Waits for cross-region Raft/Paxos Quorum ACK)',
      readBehavior: 'Linearizable (Leader lease or ReadIndex verification)',
      consistency: 'Strong Linearizable / External Consistency',
      replicationMode: 'Synchronous Majority Quorum (2 of 3 nodes)',
    },
    partitionBehavior: {
      majorityWrite: 'ACCEPTED (2/3 nodes in Region A form quorum → v2 committed)',
      minorityWrite: 'REJECTED (HTTP 503: Region B has 1/3 nodes, cannot form quorum)',
      minorityRead: 'REJECTED or Stale-Only (Linearizable read blocked on minority)',
      statusBadge: 'Consistent (CP)',
      explanation:
        'During a partition, Region B (1 node) refuses writes and linearizable reads to guarantee zero split-brain divergence. Even when healthy (Else), it pays WAN RTT for synchronous consistency.',
    },
  },
  'PA/EL': {
    key: 'PA/EL',
    name: 'PA / EL — Always-Writable & Low Latency',
    systems: 'Apache Cassandra (LOCAL_ONE), DynamoDB (Default), Riak',
    normalBehavior: {
      writeLatency: '2ms (Immediate local coordinator ACK; async WAN replication)',
      readBehavior: '2ms local read (may return ~50ms stale value during async flight)',
      consistency: 'Eventual / Tunable Consistency',
      replicationMode: 'Asynchronous peer-to-peer ring / Gossip',
    },
    partitionBehavior: {
      majorityWrite: 'ACCEPTED (2ms local write → v2a)',
      minorityWrite: 'ACCEPTED (2ms local write via Sloppy Quorum / Hinted Handoff → v2b)',
      minorityRead: 'ALLOWED (Returns local v2b or stale v1; diverges from Region A!)',
      statusBadge: 'Available (AP)',
      explanation:
        'Both sides of the severed network continue accepting writes at 2ms latency! Once the fiber link heals, conflicting versions (v2a vs v2b) must be resolved via Last-Write-Wins (LWW), Vector Clocks, or CRDTs.',
    },
  },
  'PA/EC': {
    key: 'PA/EC',
    name: 'PA / EC — Consistent Normal, Available Fallback',
    systems: 'MongoDB (Configured w:majority with fallback), Couchbase',
    normalBehavior: {
      writeLatency: '45ms (Waits for primary + majority replica ack in normal mode)',
      readBehavior: 'Routed to Primary or causally consistent session replica',
      consistency: 'Strong / Causal in Normal Operation',
      replicationMode: 'Synchronous Majority when healthy',
    },
    partitionBehavior: {
      majorityWrite: 'ACCEPTED (New Primary elected in Region A majority)',
      minorityWrite: 'ACCEPTED (Fallback local write or transient unwrapped primary window)',
      minorityRead: 'ALLOWED (Serves isolated replica state; risks rollback on heal)',
      statusBadge: 'Available (AP)',
      explanation:
        'When the network is healthy (Else), the system enforces strong consistency. During a partition, isolated nodes fall back to serving local reads/writes, requiring reconciliation or rollback when healed.',
    },
  },
  'PC/EL': {
    key: 'PC/EL',
    name: 'PC / EL — Partition-Safe Writes, Fast Local Reads',
    systems: 'PostgreSQL (Patroni Raft Primary + Async Read Replicas), PNUTS',
    normalBehavior: {
      writeLatency: '12ms (Primary local commit; async streaming to remote replicas)',
      readBehavior: '1.5ms (Served from nearest local async Read Replica)',
      consistency: 'Timeline Consistent Writes + Bounded-Staleness Reads',
      replicationMode: 'Single-Leader with Async Follower Reads',
    },
    partitionBehavior: {
      majorityWrite: 'ACCEPTED (Primary in Region A continues accepting writes)',
      minorityWrite: 'REJECTED (Fencing token blocks minority node from becoming primary)',
      minorityRead: 'REJECTED (Fenced replica stops serving once lease expires)',
      statusBadge: 'Consistent (CP)',
      explanation:
        'Prevents split-brain during partitions by fencing minority nodes (PC), but optimizes for low read/write latency during normal operation by serving local async replicas (EL).',
    },
  },
};

const CapPacelcSimulator: React.FC = () => {
  const [partitionActive, setPartitionActive] = useState<boolean>(true);
  const [selectedProfile, setSelectedProfile] = useState<PacelcProfileKey>('PC/EC');
  const [lastActionLog, setLastActionLog] = useState<string>(
    'Try toggling the Network Partition or simulating client writes to Region A (Majority) vs Region B (Isolated Minority).'
  );

  const profile = PACELC_PROFILES[selectedProfile];

  const handleSimulateAction = (action: 'writeA' | 'writeB' | 'readB') => {
    if (!partitionActive) {
      if (action === 'writeA' || action === 'writeB') {
        setLastActionLog(
          `[NORMAL MODE • ${selectedProfile}] Client write succeeded in ${profile.normalBehavior.writeLatency}. Replicated across all 3 nodes.`
        );
      } else {
        setLastActionLog(
          `[NORMAL MODE • ${selectedProfile}] Client read from Region B succeeded (${profile.normalBehavior.readBehavior}).`
        );
      }
      return;
    }

    if (action === 'writeA') {
      setLastActionLog(`[PARTITION ACTIVE • Region A Majority] ${profile.partitionBehavior.majorityWrite}`);
    } else if (action === 'writeB') {
      setLastActionLog(`[PARTITION ACTIVE • Region B Minority] ${profile.partitionBehavior.minorityWrite}`);
    } else {
      setLastActionLog(`[PARTITION ACTIVE • Region B Minority Read] ${profile.partitionBehavior.minorityRead}`);
    }
  };

  const isMinorityBlocked =
    partitionActive && (selectedProfile === 'PC/EC' || selectedProfile === 'PC/EL');

  return (
    <div className="space-y-5">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(PACELC_PROFILES) as PacelcProfileKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedProfile(key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                selectedProfile === key
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/60 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <button
          onClick={() => setPartitionActive((prev) => !prev)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
            partitionActive
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
          }`}
        >
          {partitionActive ? (
            <>
              <WifiOff className="w-4 h-4 text-rose-400" />
              Network Partition: ACTIVE (P)
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 text-emerald-400" />
              Network Healthy: ELSE (E)
            </>
          )}
        </button>
      </div>

      {/* Visual SVG Topology across Region A and Region B */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {profile.name}
            </span>
            <p className="text-xs text-slate-400 mt-0.5">Representative Engines: {profile.systems}</p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              profile.partitionBehavior.statusBadge === 'Consistent (CP)'
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
            }`}
          >
            {partitionActive
              ? `Partition Mode: ${profile.partitionBehavior.statusBadge}`
              : `Normal Mode (Else): ${selectedProfile.split('/')[1] === 'EC' ? 'Consistency First (EC)' : 'Latency First (EL)'}`}
          </span>
        </div>

        <svg viewBox="0 0 760 220" className="w-full h-auto max-h-60 select-none">
          {/* Region A Box */}
          <rect
            x="20"
            y="20"
            width="310"
            height="180"
            rx="12"
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="1.5"
          />
          <text x="36" y="44" fill="#94a3b8" fontSize="12" fontWeight="700">
            REGION A (US-East • Majority Quorum 2/3)
          </text>

          {/* Node 1 */}
          <rect
            x="45"
            y="65"
            width="120"
            height="85"
            rx="8"
            fill="#1e293b"
            stroke="#6366f1"
            strokeWidth="2"
          />
          <text x="105" y="92" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="700">
            Node A1 (Leader)
          </text>
          <text x="105" y="114" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">
            State: v2 (Fresh)
          </text>
          <text x="105" y="134" textAnchor="middle" fill="#94a3b8" fontSize="10">
            Accepting Writes
          </text>

          {/* Node 2 */}
          <rect
            x="190"
            y="65"
            width="120"
            height="85"
            rx="8"
            fill="#1e293b"
            stroke="#6366f1"
            strokeWidth="2"
          />
          <text x="250" y="92" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="700">
            Node A2 (Replica)
          </text>
          <text x="250" y="114" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="600">
            State: v2 (Synced)
          </text>
          <text x="250" y="134" textAnchor="middle" fill="#94a3b8" fontSize="10">
            Quorum ACK Ready
          </text>

          {/* Link between A1 and A2 */}
          <line x1="165" y1="108" x2="190" y2="108" stroke="#6366f1" strokeWidth="2.5" />

          {/* Cross-Region WAN Link */}
          <line
            x1="310"
            y1="108"
            x2="495"
            y2="108"
            stroke={partitionActive ? '#f43f5e' : '#10b981'}
            strokeWidth="3"
            strokeDasharray={partitionActive ? '7,6' : 'none'}
          />

          {/* Partition Cut Badge */}
          {partitionActive ? (
            <g>
              <rect
                x="350"
                y="82"
                width="105"
                height="50"
                rx="8"
                fill="#4c0519"
                stroke="#f43f5e"
                strokeWidth="1.5"
              />
              <text x="402" y="104" textAnchor="middle" fill="#fda4af" fontSize="11" fontWeight="700">
                ✂ WAN SEVERED
              </text>
              <text x="402" y="121" textAnchor="middle" fill="#fb7185" fontSize="9.5">
                100% Packet Loss
              </text>
            </g>
          ) : (
            <g>
              <rect
                x="348"
                y="84"
                width="110"
                height="46"
                rx="8"
                fill="#064e3b"
                stroke="#10b981"
                strokeWidth="1.5"
              />
              <text x="403" y="104" textAnchor="middle" fill="#6ee7b7" fontSize="10.5" fontWeight="700">
                WAN HEALTHY
              </text>
              <text x="403" y="120" textAnchor="middle" fill="#a7f3d0" fontSize="9.5">
                {selectedProfile.endsWith('EC') ? 'Sync Quorum' : 'Async Stream'}
              </text>
            </g>
          )}

          {/* Region B Box */}
          <rect
            x="470"
            y="20"
            width="270"
            height="180"
            rx="12"
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="1.5"
          />
          <text x="486" y="44" fill="#94a3b8" fontSize="12" fontWeight="700">
            REGION B (EU-West • Minority 1/3)
          </text>

          {/* Node 3 */}
          <rect
            x="495"
            y="65"
            width="220"
            height="85"
            rx="8"
            fill="#1e293b"
            stroke={isMinorityBlocked ? '#f43f5e' : partitionActive ? '#f59e0b' : '#10b981'}
            strokeWidth="2"
          />
          <text x="605" y="90" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="700">
            Node B1 (Isolated Replica)
          </text>
          <text
            x="605"
            y="112"
            textAnchor="middle"
            fill={isMinorityBlocked ? '#fda4af' : partitionActive ? '#fcd34d' : '#34d399'}
            fontSize="11"
            fontWeight="600"
          >
            {partitionActive
              ? isMinorityBlocked
                ? 'State: v1 (Fenced / Read-Only Block)'
                : 'State: v2b (Divergent Local Writes!)'
              : 'State: v2 (Replicated)'}
          </text>
          <text x="605" y="133" textAnchor="middle" fill="#94a3b8" fontSize="10">
            {partitionActive
              ? isMinorityBlocked
                ? 'Rejects Writes (HTTP 503) to Save C'
                : 'Accepts Writes (Sloppy Quorum / LWW)'
              : 'Serving Normal Traffic'}
          </text>
        </svg>

        {/* Interactive Test Packet Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 mt-3 pt-3 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium mr-1">Test Client Request:</span>
          <button
            onClick={() => handleSimulateAction('writeA')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors"
          >
            Write to Region A (Majority)
          </button>
          <button
            onClick={() => handleSimulateAction('writeB')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
          >
            Write to Region B (Minority)
          </button>
          <button
            onClick={() => handleSimulateAction('readB')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors"
          >
            Read from Region B
          </button>
        </div>

        {/* Live Action Console */}
        <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200">
          {lastActionLog}
        </div>
      </div>

      {/* Side-by-Side P vs E Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`p-4 rounded-xl border transition-all ${
            partitionActive
              ? 'bg-rose-950/20 border-rose-500/50'
              : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">
              1. When Partitioned (P → {selectedProfile.split('/')[0]})
            </h4>
            {partitionActive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                ACTIVE NOW
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-2">
            {profile.partitionBehavior.explanation}
          </p>
          <div className="space-y-1 text-xs text-slate-400">
            <div>
              <strong className="text-slate-200">Majority Side:</strong>{' '}
              {profile.partitionBehavior.majorityWrite}
            </div>
            <div>
              <strong className="text-slate-200">Minority Side:</strong>{' '}
              {profile.partitionBehavior.minorityWrite}
            </div>
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border transition-all ${
            !partitionActive
              ? 'bg-emerald-950/20 border-emerald-500/50'
              : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              2. Else / Healthy Network (E → {selectedProfile.split('/')[1]})
            </h4>
            {!partitionActive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                ACTIVE NOW
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div>
              <strong className="text-slate-200">Write Latency:</strong>{' '}
              {profile.normalBehavior.writeLatency}
            </div>
            <div>
              <strong className="text-slate-200">Read Behavior:</strong>{' '}
              {profile.normalBehavior.readBehavior}
            </div>
            <div>
              <strong className="text-slate-200">Replication Mechanics:</strong>{' '}
              {profile.normalBehavior.replicationMode}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. QUEUEING THEORY & FAN-OUT TAIL LATENCY CALCULATOR
// ============================================================================
const LatencyThroughputSimulator: React.FC = () => {
  const [utilizationPct, setUtilizationPct] = useState<number>(75); // 10 to 98%
  const [baseServiceMs, setBaseServiceMs] = useState<number>(4); // Base service time S
  const [fanoutCount, setFanoutCount] = useState<number>(15); // 1 to 50 parallel microservices
  const [hedgingEnabled, setHedgingEnabled] = useState<boolean>(false);

  const metrics = useMemo(() => {
    const rho = Math.min(0.99, Math.max(0.01, utilizationPct / 100));
    const safeServiceMs = Math.max(0.1, baseServiceMs);
    // M/M/1 Queueing formula: Total response time R = S / (1 - rho)
    const expectedMeanLatency = safeServiceMs / (1 - rho);
    const queueWaitTime = expectedMeanLatency - safeServiceMs;
    // Approximate p99 in M/M/1 exponential distribution: -ln(1 - 0.99) * R ≈ 4.605 * R
    const singleHopP99 = expectedMeanLatency * 4.605;
    const effectiveSingleP99 = hedgingEnabled ? singleHopP99 * 0.42 : singleHopP99;

    // Probability that at least 1 out of N parallel calls hits a slow p99 spike:
    // If hedging is enabled, effective tail probability drops from 1% to ~0.04%
    const singleTailProb = hedgingEnabled ? 0.0015 : 0.01;
    const fanoutTailProbPct = (1 - Math.pow(1 - singleTailProb, fanoutCount)) * 100;

    // Little's Law: L = lambda * W (Assuming server max capacity mu = 1000 / baseServiceMs RPS)
    const maxCapacityRps = Math.round(1000 / safeServiceMs);
    const arrivalRateLambda = Math.round(rho * maxCapacityRps);
    const inFlightConcurrencyL = (arrivalRateLambda * (expectedMeanLatency / 1000)).toFixed(1);

    return {
      expectedMeanLatency,
      queueWaitTime,
      singleHopP99: effectiveSingleP99,
      fanoutTailProbPct,
      maxCapacityRps,
      arrivalRateLambda,
      inFlightConcurrencyL,
    };
  }, [utilizationPct, baseServiceMs, fanoutCount, hedgingEnabled]);

  // Generate SVG polyline points for the Hockey-Stick curve (rho from 10% to 98%)
  const curvePoints = useMemo(() => {
    const pts: string[] = [];
    for (let u = 10; u <= 98; u += 2) {
      const r = u / 100;
      const mult = 1 / (1 - r); // ranges from 1.11 to 50
      const x = 50 + ((u - 10) / 88) * 650;
      const y = 185 - Math.min(mult / 50, 1) * 155;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, []);

  const currentMarker = useMemo(() => {
    const r = utilizationPct / 100;
    const mult = 1 / (1 - r);
    const x = 50 + ((utilizationPct - 10) / 88) * 650;
    const y = 185 - Math.min(mult / 50, 1) * 155;
    return { x, y, mult };
  }, [utilizationPct]);

  return (
    <div className="space-y-5">
      {/* Sliders Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Server Utilization (ρ)</span>
            <span
              className={`font-mono font-bold ${
                utilizationPct >= 85
                  ? 'text-rose-400'
                  : utilizationPct >= 70
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {utilizationPct}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={98}
            value={utilizationPct}
            onChange={(e) => setUtilizationPct(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>10% (Idle)</span>
            <span>70% (Sweet Spot)</span>
            <span>98% (Meltdown)</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Base Service Time (S)</span>
            <span className="font-mono font-bold text-indigo-400">{baseServiceMs} ms</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={baseServiceMs}
            onChange={(e) => setBaseServiceMs(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>1ms (Cache)</span>
            <span>10ms (DB Query)</span>
            <span>20ms (Compute)</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Parallel Fan-Out Calls (N)</span>
            <span className="font-mono font-bold text-cyan-400">{fanoutCount} services</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={fanoutCount}
            onChange={(e) => setFanoutCount(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>1 (Monolith)</span>
            <span>20 (Feed)</span>
            <span>50 (Deep Mesh)</span>
          </div>
        </div>
      </div>

      {/* Hockey-Stick Queueing Curve SVG */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              M/M/1 Queueing Hockey-Stick Curve: Wait Multiplier = 1 / (1 − ρ)
            </h4>
            <p className="text-xs text-slate-400">
              Above 80% utilization, tiny traffic bursts cause exponential queue depth growth.
            </p>
          </div>
          <button
            onClick={() => setHedgingEnabled((h) => !h)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              hedgingEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {hedgingEnabled ? '✓ Hedged Requests @ p95 ON' : 'Enable Hedged Requests Defense'}
          </button>
        </div>

        <svg viewBox="0 0 740 215" className="w-full h-auto max-h-56 select-none">
          {/* Danger Zone >80% */}
          <rect x="567" y="25" width="133" height="160" fill="#f43f5e" fillOpacity="0.08" />
          <line
            x1="567"
            y1="25"
            x2="567"
            y2="185"
            stroke="#f43f5e"
            strokeDasharray="4,4"
            strokeWidth="1.5"
          />
          <text x="633" y="42" textAnchor="middle" fill="#fda4af" fontSize="10" fontWeight="700">
            Saturation Zone (&gt;80%)
          </text>

          {/* Axes */}
          <line x1="50" y1="185" x2="705" y2="185" stroke="#475569" strokeWidth="1.5" />
          <line x1="50" y1="25" x2="50" y2="185" stroke="#475569" strokeWidth="1.5" />

          {/* Axis Labels */}
          <text x="50" y="202" textAnchor="middle" fill="#94a3b8" fontSize="10">
            10%
          </text>
          <text x="272" y="202" textAnchor="middle" fill="#94a3b8" fontSize="10">
            40%
          </text>
          <text x="493" y="202" textAnchor="middle" fill="#94a3b8" fontSize="10">
            70%
          </text>
          <text x="567" y="202" textAnchor="middle" fill="#fda4af" fontSize="10" fontWeight="700">
            80%
          </text>
          <text x="700" y="202" textAnchor="middle" fill="#94a3b8" fontSize="10">
            98%
          </text>

          {/* Hockey Stick Curve */}
          <polyline
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            points={curvePoints}
          />

          {/* Current Utilization Marker */}
          <circle
            cx={currentMarker.x}
            cy={currentMarker.y}
            r="7"
            fill={utilizationPct >= 80 ? '#f43f5e' : '#38bdf8'}
            stroke="#0f172a"
            strokeWidth="2"
          />
          <text
            x={Math.min(currentMarker.x, 635)}
            y={Math.max(currentMarker.y - 12, 38)}
            textAnchor="middle"
            fill="#f8fafc"
            fontSize="11"
            fontWeight="700"
          >
            {currentMarker.mult.toFixed(1)}x Latency ({metrics.expectedMeanLatency.toFixed(1)}ms)
          </text>
        </svg>
      </div>

      {/* Quantitative Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="text-[11px] text-slate-400">Mean Response (S + Wq)</div>
          <div className="text-lg font-bold font-mono text-slate-100 mt-1">
            {metrics.expectedMeanLatency.toFixed(1)} ms
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Queue wait: +{metrics.queueWaitTime.toFixed(1)} ms
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="text-[11px] text-slate-400">Single-Hop p99 Tail</div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1">
            {metrics.singleHopP99.toFixed(1)} ms
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {hedgingEnabled ? 'Compressed via p95 Hedging' : '4.6x Exponential Tail'}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="text-[11px] text-slate-400">
            {fanoutCount}-Way Fan-Out p99 Hit Prob
          </div>
          <div
            className={`text-lg font-bold font-mono mt-1 ${
              metrics.fanoutTailProbPct > 25 ? 'text-rose-400' : 'text-cyan-400'
            }`}
          >
            {metrics.fanoutTailProbPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Formula: 1 − (1 − p)^N
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="text-[11px] text-slate-400">Little&apos;s Law (L = λ × W)</div>
          <div className="text-lg font-bold font-mono text-indigo-400 mt-1">
            {metrics.inFlightConcurrencyL} threads
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            At λ = {metrics.arrivalRateLambda} RPS
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. DYNAMO LEADERLESS QUORUM TUNER (N, W, R)
// ============================================================================
const ReplicationQuorumSimulator: React.FC = () => {
  const [nReplicas, setNReplicas] = useState<number>(5);
  const [wQuorum, setWQuorum] = useState<number>(3);
  const [rQuorum, setRQuorum] = useState<number>(3);
  const [sloppyQuorum, setSloppyQuorum] = useState<boolean>(false);

  const safeW = Math.min(wQuorum, nReplicas);
  const safeR = Math.min(rQuorum, nReplicas);
  const isStrongOverlap = safeW + safeR > nReplicas && !sloppyQuorum;
  const overlapCount = Math.max(0, safeW + safeR - nReplicas);
  const maxWriteFailuresTolerated = nReplicas - safeW;
  const maxReadFailuresTolerated = nReplicas - safeR;

  const applyPreset = (n: number, w: number, r: number, sloppy = false) => {
    setNReplicas(n);
    setWQuorum(w);
    setRQuorum(r);
    setSloppyQuorum(sloppy);
  };

  return (
    <div className="space-y-5">
      {/* Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1">Presets:</span>
          <button
            onClick={() => applyPreset(3, 2, 2, false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25"
          >
            Standard Quorum (N=3, W=2, R=2)
          </button>
          <button
            onClick={() => applyPreset(5, 3, 3, false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25"
          >
            5-Node Raft/Quorum (N=5, W=3, R=3)
          </button>
          <button
            onClick={() => applyPreset(3, 1, 1, false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
          >
            Fast Eventual (N=3, W=1, R=1)
          </button>
          <button
            onClick={() => applyPreset(3, 3, 1, false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25"
          >
            Read-Heavy (N=3, W=3, R=1)
          </button>
        </div>

        <button
          onClick={() => setSloppyQuorum((s) => !s)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            sloppyQuorum
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {sloppyQuorum ? 'Sloppy Quorum + Hinted Handoff: ON' : 'Strict Ring Quorum'}
        </button>
      </div>

      {/* Sliders for N, W, R */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Replication Factor (N)</span>
            <span className="font-mono font-bold text-slate-100">{nReplicas} nodes</span>
          </div>
          <input
            type="range"
            min={3}
            max={7}
            value={nReplicas}
            onChange={(e) => {
              const nextN = Number(e.target.value);
              setNReplicas(nextN);
              if (wQuorum > nextN) setWQuorum(nextN);
              if (rQuorum > nextN) setRQuorum(nextN);
            }}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-indigo-300">Write Quorum (W)</span>
            <span className="font-mono font-bold text-indigo-400">{safeW} nodes</span>
          </div>
          <input
            type="range"
            min={1}
            max={nReplicas}
            value={safeW}
            onChange={(e) => setWQuorum(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-cyan-300">Read Quorum (R)</span>
            <span className="font-mono font-bold text-cyan-400">{safeR} nodes</span>
          </div>
          <input
            type="range"
            min={1}
            max={nReplicas}
            value={safeR}
            onChange={(e) => setRQuorum(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Visual Replica Overlap Inspector */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            {isStrongOverlap ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
            <span className="text-sm font-bold text-slate-100">
              Formula Check: W ({safeW}) + R ({safeR}) = {safeW + safeR}{' '}
              {safeW + safeR > nReplicas ? `> N (${nReplicas})` : `≤ N (${nReplicas})`}
            </span>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              isStrongOverlap
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
            }`}
          >
            {isStrongOverlap
              ? `Strong Quorum Overlap (${overlapCount} shared node${overlapCount > 1 ? 's' : ''})`
              : sloppyQuorum
              ? 'Sloppy Quorum (AP Eventual — Hints on Standbys)'
              : 'Eventual Consistency (Zero Guaranteed Overlap — Stale Read Risk)'}
          </span>
        </div>

        {/* Visual Node Cards showing Write Set (1..W) and Read Set (N-R+1..N) */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
          {Array.from({ length: nReplicas }, (_, idx) => {
            const inWriteSet = idx < safeW;
            const inReadSet = idx >= nReplicas - safeR;
            const isOverlap = inWriteSet && inReadSet && !sloppyQuorum;

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isOverlap
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/50'
                    : inWriteSet
                    ? 'bg-indigo-950/30 border-indigo-500/50'
                    : inReadSet
                    ? 'bg-cyan-950/30 border-cyan-500/50'
                    : 'bg-slate-900/50 border-slate-800 opacity-60'
                }`}
              >
                <Server
                  className={`w-5 h-5 mx-auto mb-1.5 ${
                    isOverlap
                      ? 'text-emerald-400'
                      : inWriteSet
                      ? 'text-indigo-400'
                      : inReadSet
                      ? 'text-cyan-400'
                      : 'text-slate-500'
                  }`}
                />
                <div className="text-xs font-bold text-slate-200">Replica {idx + 1}</div>
                <div className="mt-1.5 space-y-1">
                  {inWriteSet && (
                    <div className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      Write v2
                    </div>
                  )}
                  {inReadSet && (
                    <div className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      Read Query
                    </div>
                  )}
                  {isOverlap && (
                    <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300">
                      ★ OVERLAP
                    </div>
                  )}
                  {!inWriteSet && !inReadSet && (
                    <div className="text-[10px] text-slate-500">Async Lag (v1)</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Fault Tolerance & Latency Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800">
          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
            <div className="text-[11px] text-slate-400">Write Fault Tolerance (N − W)</div>
            <div className="text-sm font-bold text-slate-100 mt-0.5">
              Survives {maxWriteFailuresTolerated} dead node{maxWriteFailuresTolerated === 1 ? '' : 's'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
            <div className="text-[11px] text-slate-400">Read Fault Tolerance (N − R)</div>
            <div className="text-sm font-bold text-slate-100 mt-0.5">
              Survives {maxReadFailuresTolerated} dead node{maxReadFailuresTolerated === 1 ? '' : 's'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
            <div className="text-[11px] text-slate-400">Read Repair &amp; Conflict Check</div>
            <div className="text-xs text-slate-300 mt-0.5">
              {isStrongOverlap
                ? 'Coordinator picks highest version timestamp from R responses & repairs stale nodes.'
                : 'Reader may only contact nodes with v1 and miss v2 completely!'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. ACID ISOLATION ANOMALY TIMELINE INSPECTOR
// ============================================================================
type AnomalyScenarioKey = 'write-skew' | 'lost-update' | 'dirty-read';

interface IsolationScenario {
  key: AnomalyScenarioKey;
  title: string;
  subtitle: string;
  invariant: string;
  steps: {
    step: number;
    actor: 'T1' | 'T2' | 'DB';
    sql: string;
    stateNote: string;
  }[];
  levelOutcomes: {
    level: 'Read Uncommitted' | 'Read Committed' | 'Repeatable Read (Snapshot)' | 'Serializable (SSI / 2PL)';
    prevented: boolean;
    behavior: string;
  }[];
}

const ISOLATION_SCENARIOS: Record<AnomalyScenarioKey, IsolationScenario> = {
  'write-skew': {
    key: 'write-skew',
    title: 'Write Skew (Disjoint Row Invariant Violation)',
    subtitle: 'Two doctors (Alice & Bob) simultaneously request to go off-call during the same hospital shift.',
    invariant: 'Business Rule: At least 1 doctor MUST remain on_call = true for Shift #10.',
    steps: [
      {
        step: 1,
        actor: 'T1',
        sql: "BEGIN; SELECT count(*) FROM shift WHERE on_call = true; -- Returns 2 (Alice & Bob)",
        stateNote: 'T1 takes MVCC snapshot: sees 2 doctors on call.',
      },
      {
        step: 2,
        actor: 'T2',
        sql: "BEGIN; SELECT count(*) FROM shift WHERE on_call = true; -- Returns 2 (Alice & Bob)",
        stateNote: 'T2 takes MVCC snapshot: also sees 2 doctors on call!',
      },
      {
        step: 3,
        actor: 'T1',
        sql: "UPDATE shift SET on_call = false WHERE doctor = 'Alice'; COMMIT;",
        stateNote: 'T1 modifies Alice row and commits cleanly.',
      },
      {
        step: 4,
        actor: 'T2',
        sql: "UPDATE shift SET on_call = false WHERE doctor = 'Bob'; COMMIT;",
        stateNote: 'T2 modifies Bob row (different row from Alice!). Under Snapshot Isolation, commit succeeds → 0 doctors on call!',
      },
    ],
    levelOutcomes: [
      {
        level: 'Read Uncommitted',
        prevented: false,
        behavior: 'VULNERABLE: Both transactions commit; hospital left with 0 on-call doctors.',
      },
      {
        level: 'Read Committed',
        prevented: false,
        behavior: 'VULNERABLE: Statement snapshots see 2 doctors before either commit completes.',
      },
      {
        level: 'Repeatable Read (Snapshot)',
        prevented: false,
        behavior:
          'VULNERABLE! Because T1 updates Alice and T2 updates Bob (disjoint rows), first-committer-wins row conflict check does NOT trigger!',
      },
      {
        level: 'Serializable (SSI / 2PL)',
        prevented: true,
        behavior:
          'PREVENTED: SSI detects rw-antidependency cycle between T1 & T2 predicate reads and aborts T2 with SQLSTATE 40001.',
      },
    ],
  },
  'lost-update': {
    key: 'lost-update',
    title: 'Lost Update (Concurrent Read-Modify-Write)',
    subtitle: 'Two concurrent API requests increment a wallet balance or promo usage counter in application code.',
    invariant: 'Initial Balance = $100. T1 adds $50, T2 adds $30. Final Balance MUST be $180.',
    steps: [
      {
        step: 1,
        actor: 'T1',
        sql: 'BEGIN; SELECT balance FROM wallets WHERE id = 1; -- Reads $100 into app variable',
        stateNote: 'App server 1 computes newBalance = 100 + 50 = $150.',
      },
      {
        step: 2,
        actor: 'T2',
        sql: 'BEGIN; SELECT balance FROM wallets WHERE id = 1; -- Reads $100 into app variable',
        stateNote: 'App server 2 computes newBalance = 100 + 30 = $130.',
      },
      {
        step: 3,
        actor: 'T1',
        sql: 'UPDATE wallets SET balance = 150 WHERE id = 1; COMMIT;',
        stateNote: 'Wallet row in DB is now $150.',
      },
      {
        step: 4,
        actor: 'T2',
        sql: 'UPDATE wallets SET balance = 130 WHERE id = 1; COMMIT;',
        stateNote: 'Under Read Committed, T2 overwrites $150 with $130! T1’s $50 deposit vanishes.',
      },
    ],
    levelOutcomes: [
      {
        level: 'Read Uncommitted',
        prevented: false,
        behavior: 'VULNERABLE: T2 overwrites T1’s deposit.',
      },
      {
        level: 'Read Committed',
        prevented: false,
        behavior:
          'VULNERABLE (Default in Postgres/Oracle!): Unless you use atomic `SET balance = balance + 30` or `SELECT FOR UPDATE`.',
      },
      {
        level: 'Repeatable Read (Snapshot)',
        prevented: true,
        behavior:
          'PREVENTED (in PostgreSQL SI): First-committer-wins detects that row `id=1` changed since T2’s snapshot began and aborts T2.',
      },
      {
        level: 'Serializable (SSI / 2PL)',
        prevented: true,
        behavior: 'PREVENTED: T2 is aborted and retried safely.',
      },
    ],
  },
  'dirty-read': {
    key: 'dirty-read',
    title: 'Dirty Read (Reading Uncommitted Rollback State)',
    subtitle: 'T1 transfers money temporarily then crashes and rolls back, while T2 reads the phantom balance.',
    invariant: 'No transaction may act upon data written by an uncommitted transaction that later aborts.',
    steps: [
      {
        step: 1,
        actor: 'T1',
        sql: 'BEGIN; UPDATE accounts SET balance = 1000000 WHERE user_id = 9;',
        stateNote: 'T1 writes $1,000,000 to buffer pool (uncommitted).',
      },
      {
        step: 2,
        actor: 'T2',
        sql: 'SELECT balance FROM accounts WHERE user_id = 9;',
        stateNote: 'Under Read Uncommitted, T2 sees $1,000,000 and approves wire transfer!',
      },
      {
        step: 3,
        actor: 'T1',
        sql: 'ROLLBACK; -- Fraud check failed in T1!',
        stateNote: 'T1 aborts; $1,000,000 never existed, but T2 already acted on it.',
      },
    ],
    levelOutcomes: [
      {
        level: 'Read Uncommitted',
        prevented: false,
        behavior: 'VULNERABLE: Reads uncommitted tuple directly from page.',
      },
      {
        level: 'Read Committed',
        prevented: true,
        behavior: 'PREVENTED: MVCC visibility rules hide uncommitted `xmin` tuples.',
      },
      {
        level: 'Repeatable Read (Snapshot)',
        prevented: true,
        behavior: 'PREVENTED: Snapshot only includes transactions committed prior to `BEGIN`.',
      },
      {
        level: 'Serializable (SSI / 2PL)',
        prevented: true,
        behavior: 'PREVENTED: Strict isolation blocks dirty reads.',
      },
    ],
  },
};

const ConsistencyIsolationSimulator: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<AnomalyScenarioKey>('write-skew');
  const scenario = ISOLATION_SCENARIOS[selectedScenario];

  return (
    <div className="space-y-5">
      {/* Scenario Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(ISOLATION_SCENARIOS) as AnomalyScenarioKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedScenario(key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                selectedScenario === key
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/60'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              {ISOLATION_SCENARIOS[key].title.split(' (')[0]}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded">
          {scenario.invariant}
        </span>
      </div>

      {/* Concurrent Timeline Execution */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="text-xs text-slate-300 font-medium">{scenario.subtitle}</div>
        <div className="space-y-2.5">
          {scenario.steps.map((s) => (
            <div
              key={s.step}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-slate-900/90 border border-slate-800"
            >
              <div className="flex items-start sm:items-center gap-3">
                <span className="text-[11px] font-mono text-slate-500">t={s.step}</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                    s.actor === 'T1'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  }`}
                >
                  {s.actor}
                </span>
                <code className="text-xs font-mono text-slate-200">{s.sql}</code>
              </div>
              <span className="text-xs text-amber-300/90 sm:text-right">{s.stateNote}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Isolation Level Protection Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {scenario.levelOutcomes.map((outcome) => (
          <div
            key={outcome.level}
            className={`p-3.5 rounded-xl border ${
              outcome.prevented
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-rose-950/20 border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-100">{outcome.level}</span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                  outcome.prevented
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {outcome.prevented ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Safe
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" /> Anomaly Occurs
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{outcome.behavior}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 5. CACHING STAMPEDE & HOT-KEY DEFENSE SIMULATOR
// ============================================================================
const CachingDefenseSimulator: React.FC = () => {
  const [concurrentRequests, setConcurrentRequests] = useState<number>(2000);
  const [singleflightOn, setSingleflightOn] = useState<boolean>(true);
  const [l1CacheOn, setL1CacheOn] = useState<boolean>(false);
  const [bloomFilterOn, setBloomFilterOn] = useState<boolean>(true);
  const [invalidTrafficPct, setInvalidTrafficPct] = useState<number>(20);

  const stats = useMemo(() => {
    const validRequests = Math.round(concurrentRequests * (1 - invalidTrafficPct / 100));
    const invalidRequests = concurrentRequests - validRequests;

    // Penetration load hitting DB
    const dbPenetrationQueries = bloomFilterOn ? 0 : invalidRequests;

    // Stampede load on cache expiry across 10 app pods
    const appPods = 10;
    const stampedeDbQueries = singleflightOn ? appPods : validRequests;

    // Redis shard QPS under hot key
    const redisHotKeyQps = l1CacheOn ? Math.round(validRequests * 0.05) : validRequests;

    const totalDbQueriesOnExpiry = dbPenetrationQueries + stampedeDbQueries;

    return {
      validRequests,
      invalidRequests,
      dbPenetrationQueries,
      stampedeDbQueries,
      redisHotKeyQps,
      totalDbQueriesOnExpiry,
    };
  }, [concurrentRequests, singleflightOn, l1CacheOn, bloomFilterOn, invalidTrafficPct]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-semibold">Concurrent Spike QPS on Expiry</span>
            <span className="font-mono font-bold text-indigo-400">{concurrentRequests} req/s</span>
          </div>
          <input
            type="range"
            min={100}
            max={10000}
            step={100}
            value={concurrentRequests}
            onChange={(e) => setConcurrentRequests(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-semibold">Non-Existent ID Attack Traffic</span>
            <span className="font-mono font-bold text-rose-400">{invalidTrafficPct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            value={invalidTrafficPct}
            onChange={(e) => setInvalidTrafficPct(Number(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Defense Toggles */}
      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={() => setSingleflightOn((v) => !v)}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
            singleflightOn
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {singleflightOn ? '✓ Singleflight Coalescing: ON' : 'Singleflight Coalescing: OFF'}
        </button>
        <button
          onClick={() => setBloomFilterOn((v) => !v)}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
            bloomFilterOn
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {bloomFilterOn ? '✓ Bloom Filter (Penetration Guard): ON' : 'Bloom Filter: OFF'}
        </button>
        <button
          onClick={() => setL1CacheOn((v) => !v)}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
            l1CacheOn
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {l1CacheOn ? '✓ Local 2s L1 In-Memory Cache: ON' : 'Local L1 Hot-Key Cache: OFF'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
          <div className="text-xs text-slate-400">Redis Hot-Shard Load</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {stats.redisHotKeyQps} QPS
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {l1CacheOn ? '95% absorbed by pod L1 RAM' : '100% hits single Redis shard'}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
          <div className="text-xs text-slate-400">Cache Penetration Queries to DB</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              stats.dbPenetrationQueries > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {stats.dbPenetrationQueries} QPS
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {bloomFilterOn ? 'Blocked in O(1) by Bloom bit array' : 'Every fake ID misses Redis & hits disk!'}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
          <div className="text-xs text-slate-400">Total Postgres Queries on TTL Expiry</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              stats.totalDbQueriesOnExpiry > 200 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {stats.totalDbQueriesOnExpiry} queries
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.totalDbQueriesOnExpiry > 500
              ? '⚠️ DB Connection Pool Exhausted (Stampede!)'
              : '✓ Database Protected (1 query per pod)'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. SHARDING SALTING & L4/L7 ROUTING SIMULATOR
// ============================================================================
const ShardingLbSimulator: React.FC = () => {
  const [saltFactor, setSaltFactor] = useState<number>(1); // 1 (no salt) to 8
  const [celebrityWriteQps, setCelebrityWriteQps] = useState<number>(24000);
  const [baselineClusterQps] = useState<number>(8000); // 1000 per shard across 8 shards

  const shardLoads = useMemo(() => {
    const numShards = 8;
    const safeSalt = Math.max(1, saltFactor);
    const basePerShard = baselineClusterQps / numShards;
    return Array.from({ length: numShards }, (_, idx) => {
      const receivesCelebritySlice = idx < safeSalt;
      const celebSlice = receivesCelebritySlice ? celebrityWriteQps / safeSalt : 0;
      const total = Math.round(basePerShard + celebSlice);
      return {
        shardId: idx + 1,
        totalQps: total,
        overloaded: total > 6000,
      };
    });
  }, [saltFactor, celebrityWriteQps, baselineClusterQps]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-semibold">
              Hot Celebrity Partition Salting Factor (K)
            </span>
            <span className="font-mono font-bold text-indigo-400">
              {saltFactor === 1 ? '1 (Unsalted — Hot Spot!)' : `${saltFactor} Sub-Keys (key#0..${saltFactor - 1})`}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={8}
            value={saltFactor}
            onChange={(e) => setSaltFactor(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-semibold">Viral Event Write Traffic</span>
            <span className="font-mono font-bold text-amber-400">{celebrityWriteQps} writes/s</span>
          </div>
          <input
            type="range"
            min={4000}
            max={32000}
            step={2000}
            value={celebrityWriteQps}
            onChange={(e) => setCelebrityWriteQps(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>
      </div>

      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            8-Shard Cluster Load Distribution (Max Capacity = 6,000 WCU/shard)
          </span>
          <span className="text-xs text-slate-400">
            Read Amplification: <strong className="text-indigo-300">{saltFactor}x fan-out</strong> on read
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {shardLoads.map((s) => {
            const pct = Math.min(100, Math.round((s.totalQps / 8000) * 100));
            return (
              <div
                key={s.shardId}
                className={`p-3 rounded-xl border text-center ${
                  s.overloaded
                    ? 'bg-rose-950/40 border-rose-500'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="text-xs font-bold text-slate-200">Shard #{s.shardId}</div>
                <div className="h-20 w-full bg-slate-950 rounded-lg my-2 flex items-end p-1 border border-slate-800">
                  <div
                    style={{ height: `${pct}%` }}
                    className={`w-full rounded transition-all ${
                      s.overloaded ? 'bg-rose-500' : 'bg-indigo-500'
                    }`}
                  />
                </div>
                <div
                  className={`text-xs font-mono font-bold ${
                    s.overloaded ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {s.totalQps} QPS
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {s.overloaded ? 'THROTTLED!' : 'Healthy'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN EXPORTED WRAPPER COMPONENT
// ============================================================================
const SIMULATOR_TABS: { id: SimulatorType; label: string; icon: React.ReactNode }[] = [
  { id: 'cap-pacelc', label: 'CAP & PACELC Partition Lab', icon: <WifiOff className="w-3.5 h-3.5" /> },
  {
    id: 'latency-throughput',
    label: 'Queueing & Tail Latency',
    icon: <Activity className="w-3.5 h-3.5" />,
  },
  {
    id: 'replication-quorum',
    label: 'Dynamo Quorum (N, W, R)',
    icon: <GitMerge className="w-3.5 h-3.5" />,
  },
  {
    id: 'consistency-isolation',
    label: 'ACID Isolation Anomalies',
    icon: <Database className="w-3.5 h-3.5" />,
  },
  {
    id: 'caching',
    label: 'Cache Stampede & Penetration',
    icon: <Zap className="w-3.5 h-3.5" />,
  },
  {
    id: 'sharding-lb',
    label: 'Hot-Shard Salting & Routing',
    icon: <Layers className="w-3.5 h-3.5" />,
  },
];

export const TradeoffSimulators: React.FC<TradeoffSimulatorsProps> = ({
  activeSimulatorType,
  topicId,
}) => {
  const [overrideTab, setOverrideTab] = useState<SimulatorType | null>(null);
  const currentTab = overrideTab ?? activeSimulatorType;

  // Reset manual tab override whenever the parent topic changes its default simulatorType or topicId
  React.useEffect(() => {
    setOverrideTab(null);
  }, [activeSimulatorType, topicId]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Interactive Simulator
            </span>
            <h3 className="text-base font-bold text-slate-100">
              Distributed Systems Trade-Off Laboratory
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manipulate network partitions, utilization curves, quorum parameters, and concurrency timelines in real time.
          </p>
        </div>

        {/* Simulator Mode Switcher */}
        <div className="flex flex-wrap gap-1.5">
          {SIMULATOR_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setOverrideTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                currentTab === tab.id
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-slate-800/70 text-slate-400 border-slate-700/70 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {currentTab === 'cap-pacelc' && <CapPacelcSimulator />}
      {currentTab === 'latency-throughput' && <LatencyThroughputSimulator />}
      {currentTab === 'replication-quorum' && <ReplicationQuorumSimulator />}
      {currentTab === 'consistency-isolation' && <ConsistencyIsolationSimulator />}
      {currentTab === 'caching' && <CachingDefenseSimulator />}
      {currentTab === 'sharding-lb' && <ShardingLbSimulator />}
    </div>
  );
};
