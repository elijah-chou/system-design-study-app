import React, { useState, useEffect, useRef } from 'react';
import {
  PackagePlus,
  PenTool,
  FileJson,
  CheckCircle2,
  Trash2,
  Plus,
  Download,
  Upload,
  Sparkles,
  BookOpen,
  BrainCircuit,
  CalendarClock,
  Terminal,
  Eye,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { ContentPack, CustomTopicItem, CustomFlashcardItem } from '../../types';

const BUILTIN_PERIODIC_PACKS: ContentPack[] = [
  {
    packId: 'pack-2026-q1-ai-infra',
    title: 'Pack 2026.Q1 — AI & LLM Systems Infrastructure',
    version: '2026.1.0',
    publishedAt: '2026-03-15',
    description:
      'Staff+ patterns for high-throughput LLM serving: Semantic Vector Caching, Dual-Dimension TPM/RPM Rate Limiting, and GPU Continuous Batching with PagedAttention.',
    topics: [
      {
        id: 'pack-topic-semantic-caching',
        title: 'Semantic Vector Caching & Embedding Gateways',
        category: 'AI Systems Infrastructure',
        domain: 'patterns',
        difficulty: 'Staff+',
        createdAt: '2026-03-15',
        summary:
          'Intercept LLM queries with HNSW cosine-similarity lookup over prompt embeddings to cut GPU inference costs by 35–60% on recurring intent.',
        tags: ['llm-infra', 'semantic-cache', 'hnsw', 'vector-db'],
        keyTakeaways: [
          'Use a fast local embedding model (<8ms) + Redis/Qdrant HNSW index with strict similarity threshold (e.g. cosine >= 0.94) to prevent false-positive hallucinations.',
          'Partition semantic cache namespaces by tenant, system prompt hash, and temperature.',
        ],
        architecturalNotes:
          'False cache hits on context-dependent prompts are catastrophic; always bypass semantic cache when tool-call state or user-specific RAG context changes.',
      },
      {
        id: 'pack-topic-gpu-continuous-batching',
        title: 'vLLM PagedAttention & Continuous Iteration Batching',
        category: 'AI Systems Infrastructure',
        domain: 'cases',
        difficulty: 'Staff+',
        createdAt: '2026-03-15',
        summary:
          'Eliminate GPU KV-cache memory fragmentation using OS-inspired virtual memory paging and iteration-level scheduling.',
        tags: ['gpu-serving', 'kv-cache', 'paged-attention', 'batching'],
        keyTakeaways: [
          'Static batching stalls fast requests until the longest sequence finishes generating.',
          'Iteration-level batching injects new prefill requests at every decode step while PagedAttention allocates non-contiguous KV blocks.',
        ],
        architecturalNotes:
          'Separate prefill (compute-bound) and decode (memory-bandwidth-bound) pools onto disaggregated GPU workers to protect Time-To-First-Token (TTFT) SLOs.',
      },
    ],
    flashcards: [
      {
        id: 'pack-fc-llm-rate-limit',
        category: 'Distributed Patterns',
        difficulty: 'Staff+',
        front: 'Why does standard HTTP Request-Per-Minute (RPM) rate limiting fail for LLM APIs, and how do you design a Token-Aware limiter?',
        back: 'A single LLM request can consume 50 or 128,000 tokens. You must enforce dual Token Bucket counters in Redis Lua: one for RPM and one for Tokens-Per-Minute (TPM), pre-deducting estimated max_tokens on admission and refunding unused tokens post-stream.',
        keyTakeaway: 'LLM gateways require dual atomic RPM + TPM token buckets with post-completion token reconciliation.',
        tags: ['llm-gateway', 'rate-limiting', 'redis-lua'],
        isCustom: true,
      },
      {
        id: 'pack-fc-paged-attention',
        category: 'Latency & Scale Math',
        difficulty: 'Advanced',
        front: 'What is the primary bottleneck during the autoregressive Decode phase of LLM inference: GPU FLOPs or HBM Memory Bandwidth?',
        back: 'HBM Memory Bandwidth. Decode generates 1 token at a time per sequence, requiring the entire model weights + KV cache to be streamed from HBM to SRAM for minimal arithmetic intensity.',
        keyTakeaway: 'Prefill is compute-bound (matrix-matrix); Decode is memory-bandwidth-bound (matrix-vector).',
        tags: ['gpu', 'kv-cache', 'inference'],
        isCustom: true,
      },
    ],
  },
  {
    packId: 'pack-2026-q2-cloud-ebpf',
    title: 'Pack 2026.Q2 — Modern Cloud-Native & eBPF Primitives',
    version: '2026.2.0',
    publishedAt: '2026-06-20',
    description:
      'Kernel-level eBPF sidecarless service meshes, Durable Execution Engines (Temporal), and Zero-Copy Tiered Object Storage for Kafka.',
    topics: [
      {
        id: 'pack-topic-ebpf-service-mesh',
        title: 'eBPF Sidecarless Service Mesh (Cilium vs Envoy Sidecars)',
        category: 'Cloud-Native Networking',
        domain: 'matrices',
        difficulty: 'Staff+',
        createdAt: '2026-06-20',
        summary:
          'Bypass TCP/IP loopback traversal and per-pod Envoy memory overhead by attaching eBPF programs directly to socket operations in the Linux kernel.',
        tags: ['ebpf', 'cilium', 'service-mesh', 'networking'],
        keyTakeaways: [
          'Traditional sidecars intercept traffic via iptables, traversing the kernel TCP stack twice per hop.',
          'eBPF sockmap short-circuits local pod-to-pod sockets directly in kernel space and runs L7 proxies per-node rather than per-pod.',
        ],
        architecturalNotes:
          'Choose Cilium/eBPF for high-density Kubernetes clusters where Envoy sidecar memory (50-100MB x thousands of pods) and p99 loopback latency dominate.',
      },
      {
        id: 'pack-topic-durable-execution',
        title: 'Durable Execution Engines (Temporal / Restate)',
        category: 'Distributed Workflow',
        domain: 'patterns',
        difficulty: 'Advanced',
        createdAt: '2026-06-20',
        summary:
          'Write distributed sagas and long-running state machines as deterministic event-sourced code without manual state tables or polling.',
        tags: ['temporal', 'saga', 'event-sourcing', 'workflows'],
        keyTakeaways: [
          'Workflow functions must be 100% deterministic; all side effects (RPCs, clocks, UUIDs) execute inside recorded Activities.',
          'When a worker crashes mid-execution, a new worker replays the append-only event history to reconstruct exact local variable state in milliseconds.',
        ],
        architecturalNotes:
          'Eliminates ad-hoc cron reconcilers and half-completed distributed state bugs across payment and provisioning pipelines.',
      },
    ],
    flashcards: [
      {
        id: 'pack-fc-kafka-tiered-storage',
        category: 'Databases & Queues',
        difficulty: 'Advanced',
        front: 'How does Kafka Tiered Storage decouple compute brokers from retention capacity?',
        back: 'Closed log segments are offloaded asynchronously to S3/GCS while brokers keep only the active hot segment on local NVMe. Rebalancing a broker takes minutes instead of hours because historical TB segments stay in object storage.',
        keyTakeaway: 'Tiered storage turns stateless broker scaling into a metadata operation rather than multi-terabyte disk replication.',
        tags: ['kafka', 'tiered-storage', 's3'],
        isCustom: true,
      },
    ],
  },
  {
    packId: 'pack-2026-q3-outage-postmortems',
    title: 'Pack 2026.Q3 — Real-World Outage Postmortems Pack',
    version: '2026.3.0',
    publishedAt: '2026-09-30',
    description:
      'Battle-tested architectural lessons from production postmortems: Control/Data Plane Blast Radius, ScyllaDB Tail-Latency Migrations, and Ledger Idempotency.',
    topics: [
      {
        id: 'pack-topic-control-data-plane',
        title: 'Control Plane vs Data Plane Blast Radius Isolation',
        category: 'Reliability Engineering',
        domain: 'tradeoffs',
        difficulty: 'Staff+',
        createdAt: '2026-09-30',
        summary:
          'Ensure edge data planes continue routing traffic with last-known-good snapshots even when the central configuration control plane suffers total outage.',
        tags: ['postmortem', 'blast-radius', 'control-plane', 'resilience'],
        keyTakeaways: [
          'Never push unvalidated global configuration changes to 100% of PoPs simultaneously; enforce progressive cellular canary waves.',
          'Data planes must cache static fallback state locally and survive indefinite control plane disconnection (Static Stability).',
        ],
        architecturalNotes:
          'Inspired by major global CDN and cloud IAM outages where a single bad regex or BGP policy update bricked global control-plane reachability.',
      },
    ],
    flashcards: [
      {
        id: 'pack-fc-discord-scylladb',
        category: 'Case Studies',
        difficulty: 'Staff+',
        front: 'In Discord’s migration from Cassandra to ScyllaDB + Rust Data Services, how did Request Coalescing solve hot-partition reads?',
        back: 'When 50,000 users in a popular channel fetch the same message page simultaneously, the Rust intermediary coalesces concurrent identical reads into a single inflight ScyllaDB query and fans out the result to all waiting callers.',
        keyTakeaway: 'Singleflight / Request Coalescing in the stateless service tier shields storage nodes from hot-channel thundering herds.',
        tags: ['discord', 'scylladb', 'singleflight', 'postmortem'],
        isCustom: true,
      },
    ],
  },
];

export const ContentStudioView: React.FC = () => {
  const {
    selectedItemId,
    customTopics,
    addCustomTopic,
    deleteCustomTopic,
    customFlashcards,
    addCustomFlashcard,
    deleteCustomFlashcard,
    installedPacks,
    installContentPack,
    lastContentSync,
    mastery,
    setItemMastery,
    setActiveView,
  } = useStudy();

  const [activeTab, setActiveTab] = useState<'catalog' | 'author' | 'import' | 'library'>(() => {
    if (selectedItemId && customTopics.some((t) => t.id === selectedItemId)) {
      return 'library';
    }
    return 'catalog';
  });
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [inspectedPackId, setInspectedPackId] = useState<string | null>(null);
  const bannerTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current !== null) {
        window.clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  // Synchronize activeTab when navigating to a custom/pack topic from CommandPalette or Dashboard
  useEffect(() => {
    if (selectedItemId && customTopics.some((t) => t.id === selectedItemId)) {
      setActiveTab('library');
    }
  }, [selectedItemId, customTopics]);

  // Topic Authoring Form State
  const [topicTitle, setTopicTitle] = useState('');
  const [topicCategory, setTopicCategory] = useState('Distributed Resilience');
  const [topicDomain, setTopicDomain] = useState<'patterns' | 'tradeoffs' | 'matrices' | 'cases'>('patterns');
  const [topicDifficulty, setTopicDifficulty] = useState<'Fundamental' | 'Intermediate' | 'Advanced' | 'Staff+'>('Advanced');
  const [topicSummary, setTopicSummary] = useState('');
  const [topicTakeaways, setTopicTakeaways] = useState('');
  const [topicNotes, setTopicNotes] = useState('');
  const [topicTags, setTopicTags] = useState('distributed, staff-plus');

  // Flashcard Authoring Form State
  const [fcCategory, setFcCategory] = useState<CustomFlashcardItem['category']>('Distributed Patterns');
  const [fcDifficulty, setFcDifficulty] = useState<CustomFlashcardItem['difficulty']>('Advanced');
  const [fcFront, setFcFront] = useState('');
  const [fcBack, setFcBack] = useState('');
  const [fcTakeaway, setFcTakeaway] = useState('');
  const [fcTags, setFcTags] = useState('interview, active-recall');

  // External Pack JSON State
  const [externalPackJson, setExternalPackJson] = useState('');

  const notify = (msg: string) => {
    if (bannerTimeoutRef.current !== null) {
      window.clearTimeout(bannerTimeoutRef.current);
    }
    setStatusBanner(msg);
    bannerTimeoutRef.current = window.setTimeout(() => {
      setStatusBanner(null);
      bannerTimeoutRef.current = null;
    }, 4000);
  };

  const handleInstallPack = (pack: ContentPack) => {
    const res = installContentPack(pack);
    notify(`Installed "${pack.title}" (+${res.addedTopics} topics, +${res.addedCards} flashcards synced to workspace).`);
  };

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim() || !topicSummary.trim()) return;
    addCustomTopic({
      title: topicTitle.trim(),
      category: topicCategory.trim() || 'Custom Architecture',
      domain: topicDomain,
      difficulty: topicDifficulty,
      summary: topicSummary.trim(),
      keyTakeaways: topicTakeaways
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      architecturalNotes: topicNotes.trim(),
      tags: topicTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setTopicTitle('');
    setTopicSummary('');
    setTopicTakeaways('');
    setTopicNotes('');
    notify('Custom System Design Topic added and indexed in Command Palette (Ctrl+K)!');
  };

  const handleCreateFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcFront.trim() || !fcBack.trim()) return;
    addCustomFlashcard({
      category: fcCategory,
      difficulty: fcDifficulty,
      front: fcFront.trim(),
      back: fcBack.trim(),
      keyTakeaway: fcTakeaway.trim() || 'Review core trade-off boundaries.',
      tags: fcTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setFcFront('');
    setFcBack('');
    setFcTakeaway('');
    notify('Custom Flashcard added to your Active Recall Leitner Deck!');
  };

  const handleExportCustomPack = () => {
    const pack: ContentPack = {
      packId: `custom-pack-${new Date().toISOString().slice(0, 10)}`,
      title: 'User-Authored Systems Design Curriculum Pack',
      version: '1.0.0',
      publishedAt: new Date().toISOString().slice(0, 10),
      description: 'Exported custom topics and active recall flashcards.',
      topics: customTopics,
      flashcards: customFlashcards,
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pack.packId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported Custom Curriculum Content Pack (.json)!');
  };

  const handleImportExternalPack = () => {
    try {
      const parsed = JSON.parse(externalPackJson) as ContentPack;
      if (!parsed || (!Array.isArray(parsed.topics) && !Array.isArray(parsed.flashcards))) {
        notify('Invalid ContentPack JSON: must contain "topics" or "flashcards" arrays.');
        return;
      }
      const res = installContentPack({
        packId: parsed.packId || `imported-${Date.now()}`,
        title: parsed.title || 'Imported Content Pack',
        version: parsed.version || '1.0',
        publishedAt: parsed.publishedAt || new Date().toISOString().slice(0, 10),
        description: parsed.description || '',
        topics: parsed.topics || [],
        flashcards: parsed.flashcards || [],
      });
      setExternalPackJson('');
      notify(`Imported external pack (+${res.addedTopics} topics, +${res.addedCards} flashcards)!`);
    } catch {
      notify('Failed to parse Content Pack JSON. Check syntax.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/50 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono mb-2">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Continuous Curriculum Engine · Last Sync: {lastContentSync}</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Content Studio & Periodic Curriculum Updates
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Keep your Systems Design workbench evergreen. Install quarterly architecture packs, author custom patterns & flashcards, or sync JSON curriculum bundles.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-center">
              <div className="text-[10px] font-mono uppercase text-slate-400">Installed Packs</div>
              <div className="text-lg font-bold text-indigo-400 font-mono">{installedPacks.length}</div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-center">
              <div className="text-[10px] font-mono uppercase text-slate-400">Custom Topics</div>
              <div className="text-lg font-bold text-cyan-400 font-mono">{customTopics.length}</div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-center">
              <div className="text-[10px] font-mono uppercase text-slate-400">Custom Cards</div>
              <div className="text-lg font-bold text-rose-400 font-mono">{customFlashcards.length}</div>
            </div>
          </div>
        </div>

        {statusBanner && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusBanner}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto">
          {[
            { id: 'catalog', label: '1. Quarterly Update Packs (2026)', icon: PackagePlus },
            { id: 'library', label: `2. Installed & Custom Library (${customTopics.length + customFlashcards.length})`, icon: BookOpen },
            { id: 'author', label: '3. Author Topic / Flashcard', icon: PenTool },
            { id: 'import', label: '4. JSON Pack Sync & CLI Guide', icon: FileJson },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  activeTab === t.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: Built-In Periodic Content Packs */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {BUILTIN_PERIODIC_PACKS.map((pack) => {
            const isInstalled = installedPacks.includes(pack.packId);
            const isInspected = inspectedPackId === pack.packId;
            return (
              <div
                key={pack.packId}
                className="rounded-2xl bg-slate-900/85 border border-slate-800 p-5 flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      v{pack.version} · {pack.publishedAt}
                    </span>
                    {isInstalled && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Installed
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">{pack.title}</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{pack.description}</p>

                  <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-mono uppercase text-slate-400">
                      Included in Bundle ({pack.topics.length} Topics · {pack.flashcards.length} Cards)
                    </div>
                    {pack.topics.map((t) => (
                      <div key={t.id} className="text-xs text-cyan-300 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {pack.flashcards.map((f) => (
                      <div key={f.id} className="text-xs text-rose-300 flex items-center gap-1.5">
                        <BrainCircuit className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{f.front}</span>
                      </div>
                    ))}
                  </div>

                  {isInspected && (
                    <pre className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 max-h-48 overflow-auto">
                      {JSON.stringify(pack, null, 2)}
                    </pre>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => handleInstallPack(pack)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isInstalled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    <span>{isInstalled ? 'Re-Sync Pack' : 'Install Pack'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectedPackId(isInspected ? null : pack.packId)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                    title="Inspect Pack JSON"
                    aria-label="Inspect Pack JSON"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Installed & Custom Library */}
      {activeTab === 'library' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase font-mono text-cyan-400">
                Installed & Custom Study Topics ({customTopics.length})
              </h3>
              <button
                onClick={() => setActiveTab('author')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                + Add Topic
              </button>
            </div>
            {customTopics.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No custom or pack topics installed yet. Install a 2026 Quarterly Pack in Tab 1 or author your own!
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {customTopics.map((t: CustomTopicItem) => {
                  const isHighlighted = selectedItemId === t.id;
                  return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl bg-slate-950 border space-y-2 transition-colors ${
                      isHighlighted
                        ? 'border-cyan-500/70 ring-1 ring-cyan-500/30'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                          {t.category} · {t.difficulty || 'Advanced'}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1">{t.title}</h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setItemMastery(t.id, mastery[t.id] === 'mastered' ? 'learning' : 'mastered')
                          }
                          className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer ${
                            mastery[t.id] === 'mastered'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {mastery[t.id] === 'mastered' ? 'Mastered' : 'Mark Mastered'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomTopic(t.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                          title="Delete topic"
                          aria-label={`Delete topic ${t.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{t.summary}</p>
                    {t.keyTakeaways?.length > 0 && (
                      <ul className="space-y-1 pl-4 list-disc text-xs text-slate-400">
                        {t.keyTakeaways.map((k, idx) => (
                          <li key={idx}>{k}</li>
                        ))}
                      </ul>
                    )}
                    {t.architecturalNotes && (
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-amber-300">
                        <strong>Staff Note:</strong> {t.architecturalNotes}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase font-mono text-rose-400">
                Installed & Custom Flashcards ({customFlashcards.length})
              </h3>
              <button
                onClick={() => setActiveView('practice')}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
              >
                Practice in Active Recall →
              </button>
            </div>
            {customFlashcards.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No custom flashcards yet. Install a pack or author cards to drill them in Active Recall.
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {customFlashcards.map((c: CustomFlashcardItem) => (
                  <div key={c.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300">
                        {c.category} · {c.difficulty}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteCustomFlashcard(c.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Delete flashcard"
                        aria-label="Delete flashcard"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-white">Q: {c.front}</p>
                    <p className="text-xs text-slate-400">A: {c.back}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Author Custom Topic & Flashcard */}
      {activeTab === 'author' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleCreateTopic} className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3.5">
            <h3 className="text-sm font-bold uppercase font-mono text-cyan-400 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Author Custom System Design Topic
            </h3>
            <input
              type="text"
              required
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder="Topic Title (e.g., Stripe Idempotent Ledger Keys)"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={topicCategory}
                onChange={(e) => setTopicCategory(e.target.value)}
                placeholder="Category"
                className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
              />
              <select
                value={topicDomain}
                onChange={(e) => setTopicDomain(e.target.value as typeof topicDomain)}
                className="rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-2 text-xs text-white"
              >
                <option value="patterns">Patterns</option>
                <option value="tradeoffs">Trade-Offs</option>
                <option value="matrices">Matrices</option>
                <option value="cases">Case Studies</option>
              </select>
              <select
                value={topicDifficulty}
                onChange={(e) => setTopicDifficulty(e.target.value as typeof topicDifficulty)}
                className="rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-2 text-xs text-white"
              >
                <option value="Fundamental">Fundamental</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Staff+">Staff+</option>
              </select>
            </div>
            <textarea
              required
              rows={2}
              value={topicSummary}
              onChange={(e) => setTopicSummary(e.target.value)}
              placeholder="Core architectural summary..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white"
            />
            <textarea
              rows={3}
              value={topicTakeaways}
              onChange={(e) => setTopicTakeaways(e.target.value)}
              placeholder="Key Takeaways (one per line)..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white"
            />
            <textarea
              rows={2}
              value={topicNotes}
              onChange={(e) => setTopicNotes(e.target.value)}
              placeholder="Staff-level trade-off & failure mode notes..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white"
            />
            <input
              type="text"
              value={topicTags}
              onChange={(e) => setTopicTags(e.target.value)}
              placeholder="Comma-separated tags (e.g. idempotency, payments, raft)"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
            >
              Save Topic to Curriculum
            </button>
          </form>

          <form onSubmit={handleCreateFlashcard} className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3.5">
            <h3 className="text-sm font-bold uppercase font-mono text-rose-400 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Author Custom Active-Recall Flashcard
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={fcCategory}
                onChange={(e) => setFcCategory(e.target.value as CustomFlashcardItem['category'])}
                className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
              >
                <option value="GoF Patterns">GoF Patterns</option>
                <option value="Distributed Patterns">Distributed Patterns</option>
                <option value="Core Trade-Offs">Core Trade-Offs</option>
                <option value="Databases & Queues">Databases & Queues</option>
                <option value="Latency & Scale Math">Latency & Scale Math</option>
                <option value="Case Studies">Case Studies</option>
              </select>
              <select
                value={fcDifficulty}
                onChange={(e) => setFcDifficulty(e.target.value as CustomFlashcardItem['difficulty'])}
                className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
              >
                <option value="Fundamental">Fundamental</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Staff+">Staff+</option>
              </select>
            </div>
            <textarea
              required
              rows={3}
              value={fcFront}
              onChange={(e) => setFcFront(e.target.value)}
              placeholder="Front Question (e.g. When does Read-Repair cause stale reads in Dynamo quorum systems?)"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white"
            />
            <textarea
              required
              rows={3}
              value={fcBack}
              onChange={(e) => setFcBack(e.target.value)}
              placeholder="Back Answer & Architectural Defense..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white"
            />
            <input
              type="text"
              value={fcTakeaway}
              onChange={(e) => setFcTakeaway(e.target.value)}
              placeholder="One-line Key Takeaway"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              value={fcTags}
              onChange={(e) => setFcTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
            >
              Add Flashcard to Leitner Deck
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: JSON Pack Import/Export & Periodic Maintenance Guide */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase font-mono text-emerald-400">
              Import / Export Shareable Content Packs (.JSON)
            </h3>
            <p className="text-xs text-slate-400">
              Paste a team or periodic curriculum pack JSON payload to merge its topics and flashcards without overwriting your mastery scores.
            </p>
            <textarea
              rows={6}
              value={externalPackJson}
              onChange={(e) => setExternalPackJson(e.target.value)}
              placeholder='{"packId": "team-pack-1", "title": "Payment Systems Pack", "topics": [...], "flashcards": [...]}'
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-slate-200"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleImportExternalPack}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Merge JSON Content Pack
              </button>
              <button
                onClick={handleExportCustomPack}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export Custom Pack
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold uppercase font-mono text-indigo-400 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Automated Curriculum Validation & Cadence
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This repository includes a zero-dependency schema & freshness verifier so periodic curriculum updates never introduce broken cross-references or duplicate IDs.
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 space-y-1">
              <div>$ npm run validate:content</div>
              <div className="text-slate-500"># Audits all 6 data modules, cross-links & Leitner deck integrity</div>
            </div>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
              <li><strong>Monthly:</strong> Author flashcards from recent engineering postmortems in Tab 3.</li>
              <li><strong>Quarterly:</strong> Install or author a new <code>ContentPack</code> covering emerging infrastructure primitives.</li>
              <li><strong>Pre-Commit:</strong> Run <code>npm run validate:content</code> and <code>npm run build</code>.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
