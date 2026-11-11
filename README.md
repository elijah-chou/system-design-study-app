# Systems Design & Architecture Workbench

An interactive, local-first **Systems Design, Software Architecture Patterns & Distributed Engineering Study Workbench** built for Senior, Staff, and Principal engineering preparation.

Designed around **active trade-off reasoning** rather than passive reading, the workbench combines **50+ deep-dive architectural modules**, **8+ interactive visual simulators**, **7 multi-dimensional framework comparison matrices**, **7 end-to-end production case studies**, a **Leitner 5-box spaced-repetition flashcard engine**, **diagnostic scenario quizzes**, and an **in-app Content Studio** for periodic curriculum updates.

---

## Why a Local-First Interactive Web Application?

When evaluating application forms for mastering software design patterns, distributed system trade-offs, and infrastructure frameworks (Static Docs vs. CLI/TUI vs. Desktop Electron vs. Local-First SPA), a **Local-First Interactive Single-Page Web Application** (**React 19 + TypeScript 5.7 + Vite 6 + Tailwind CSS v4**) provides the highest pedagogical leverage:

1. **Interactive State & Queueing Simulators Over Static Diagrams**: Distributed systems fail dynamically—under network partitions, skewed hot keys, metastable retry storms, and tail-latency queueing (`p99` amplification as utilization $\rho \to 1$). Interactive SVG canvases let you inject node outages, tune Dynamo `N/W/R` quorums, compare rate-limiting algorithms, and drag QPS sliders in real time.
2. **Multi-Dimensional Trade-Off Comparison**: Choosing between PostgreSQL, Cassandra, DynamoDB, and Spanner—or Kafka, RabbitMQ, and Redis Streams—requires evaluating 6+ competing axes simultaneously. Sticky side-by-side matrices, 1v1 diff modes, 6-axis SVG radar charts, and decision wizards make trade-offs immediately scannable.
3. **Zero-Friction Local Persistence (`localStorage` + JSON Portability)**: Every mastery rating (`Not Started`, `Reviewing`, `Mastered`), bookmark, personal Markdown engineering note, Leitner flashcard box (`1–5`), quiz attempt, and custom-authored topic persists automatically in `localStorage` (`sysdesign_study_state_v1`) with one-click JSON export/import and zero backend or database setup.
4. **Keyboard-First Developer Ergonomics**: Global `Ctrl+K` / `Cmd+K` fuzzy Command Palette across all 93+ built-in and custom entities, plus `Space` and `1–4` hotkeys for rapid active-recall grading.

---

## Quickstart

### Prerequisites
- **Node.js** `>= 18.0.0` (Node 20+ recommended)
- **npm** `>= 9.0.0`

### Installation & Commands

```bash
# 1. Install dependencies
npm install

# 2. Start the interactive development server (http://localhost:5173)
npm run dev

# 3. Run automated curriculum schema, ID uniqueness & referential integrity validation
npm run validate:content

# 4. Typecheck and build the production bundle into dist/
npm run build

# 5. Preview the production build locally
npm run preview
```

---

## The 7 Interactive Modules

### 1. Executive Study Dashboard (`DashboardView`)
- **Domain Mastery Telemetry**: Real-time progress bars across Software Patterns, Distributed Patterns, System Trade-Offs, Framework Matrices, and Case Studies.
- **Leitner Spaced-Repetition Queue**: Displays flashcards due for review across Boxes 1–5 and recent diagnostic quiz accuracy.
- **Quick-Launch Simulator & Curriculum Cards**: Direct deep-links to interactive labs, bookmarked items, and installed 2026 curriculum packs.

### 2. Software & Distributed Design Patterns Catalog (`PatternsCatalogView`)
- **15 Classic GoF Software Design Patterns** (`SOFTWARE_PATTERNS`):
  - *Creational (5)*: Factory Method, Abstract Factory, Builder (Fluent / Functional Options), Prototype, Singleton & DI Scoped Lifecycles.
  - *Structural (5)*: Adapter (Ports & Adapters / Hexagonal), Decorator (Middleware Pipelines), Facade, Proxy (Lazy / Caching / Rate-Limiting), Composite.
  - *Behavioral (5)*: Strategy, Observer (Pub-Sub / Reactive Streams), Command, State (Finite State Machines), Chain of Responsibility & Template Method.
  - Includes **Before (Anti-Pattern)** vs. **After (Idiomatic TypeScript)** side-by-side code comparisons, modern framework equivalents, and explicit anti-patterns (*Enterprise-itis*, leaky abstractions, N+1 proxies).
- **13 Cloud & Distributed Architecture Patterns** (`DISTRIBUTED_PATTERNS`):
  - Circuit Breaker, Bulkhead Isolation, Retry with Exponential Backoff & Full Jitter, Rate Limiting & Load Shedding, Saga Pattern (Choreography vs. Orchestration), Transactional Outbox & CDC, CQRS, Event Sourcing, Consistent Hashing with Virtual Nodes, Leader Election & Split-Brain Fencing Tokens, Strangler Fig Migration, Sidecar / Ambassador, and Backpressure & Load Control.

### 3. Core System Trade-Offs Explorer (`TradeoffsExplorerView`)
- **8 Fundamental Distributed Systems Spectrums** (`SYSTEM_TRADEOFFS`):
  1. `cap-pacelc`: CAP Theorem & PACELC (`PC/EC` vs. `PA/EL`)
  2. `latency-throughput`: Latency vs. Throughput, Little's Law & Tail Latency (`p50`/`p99`/`p99.9`)
  3. `consistency-models`: Linearizability, Sequential, Causal & Eventual Consistency (`N/W/R` Quorums)
  4. `isolation-levels`: ACID Isolation Levels & Concurrency Anomalies (`Read Committed`, `Snapshot Isolation`, `SSI`)
  5. `caching-strategies`: Cache-Aside, Read/Write-Through, Write-Behind & Stampede Mitigation
  6. `replication-topologies`: Single-Leader, Multi-Leader & Leaderless Dynamo-Style Replication
  7. `sharding-partitioning`: Range vs. Hash Sharding, Secondary Indexes & Hot-Spot Salting
  8. `load-balancing`: L4 vs. L7 Load Balancing, Anycast DNS & Power-of-Two-Choices (`P2C`)

### 4. Systems & Framework Head-to-Head Matrices (`MatrixComparisonView`)
- **7 Multi-Column Comparison Matrices** (`FRAMEWORK_MATRICES`) with **Full Matrix View**, **1v1 Head-to-Head Diff Mode**, **6-Axis SVG Radar & Grouped Bar Charts**, and **Workload Decision Wizards**:
  1. `databases-storage`: **PostgreSQL** vs. **MongoDB** vs. **Apache Cassandra** vs. **Amazon DynamoDB** vs. **CockroachDB / Spanner**
  2. `messaging-streaming`: **Apache Kafka** vs. **RabbitMQ** vs. **Redis Streams** vs. **Amazon SQS + SNS**
  3. `api-protocols`: **REST (HTTP/2 JSON)** vs. **gRPC (Protobuf)** vs. **GraphQL** vs. **WebSockets** vs. **Server-Sent Events (SSE)**
  4. `caching-engines`: **Redis / Valkey** vs. **Memcached** vs. **Local In-Process L1 (Caffeine)**
  5. `macro-architectures`: **Traditional Monolith** vs. **Modular Monolith** vs. **Microservices** vs. **Serverless (FaaS)**
  6. `web-rendering`: **CSR / SPA** vs. **Server-Side Rendering (SSR)** vs. **Static & ISR** vs. **Hybrid React Server Components (RSC)**
  7. `vector-search-olap`: **pgvector (PostgreSQL HNSW)** vs. **Qdrant / Pinecone** vs. **Elasticsearch / OpenSearch** vs. **ClickHouse**

### 5. Real-World System Design Case Studies & Mock Interview Timer (`CaseStudiesView`)
- **7 End-to-End Production Architectures** (`CASE_STUDIES`):
  1. `url-shortener`: High-Scale URL Shortener (TinyURL / Bitly — KGS, Base62, 301 vs. 302 analytics, Bloom Filters)
  2. `distributed-rate-limiter`: Global API Rate Limiter (Stripe / Cloudflare — Token Bucket + Sliding Window Lua scripts, fail-open edge degradation)
  3. `realtime-chat`: Real-Time Chat & Presence System (WhatsApp / Discord — Stateful WebSocket Gateways, Redis Session Registry, Cassandra LSM storage)
  4. `news-feed`: Hybrid Fan-Out Social News Feed (Twitter/X — Push Fan-Out-on-Write vs. Pull Fan-Out-on-Read for celebrity accounts)
  5. `notification-system`: Multi-Channel Notification Pipeline (Bulkhead Priority Kafka Topics `P0/P1/P2`, Idempotency Ledger, Dead-Letter Queues)
  6. `distributed-kv-store`: Dynamo-Style Distributed Key-Value Store (Consistent Hashing vnodes, Tunable Quorum, Sloppy Quorum + Hinted Handoff, Merkle Trees, LSM + SSTables)
  7. `llm-rag-gateway`: Enterprise AI / LLM Inference Gateway & Hybrid RAG Pipeline (Two-Phase TPM/RPM Token Bucket reservation, Semantic Cache, Hybrid BM25 + HNSW + RRF + Cross-Encoder Reranking, HNSW ACL Pre-Filtering)
- **Interactive 45-Minute Mock Interview Timer & Staff Rubric**: Built-in 45:00 countdown with 4 clickable interview pacing phases (*0–5m Requirements & Math*, *5–15m High-Level Topology*, *15–35m Deep Dives & Storage*, *35–45m Failure Modes & Bottlenecks*) and a 6-point Staff+ self-assessment rubric.

### 6. Active Recall: Leitner Flashcards & Diagnostic Quizzes (`ActiveRecallView`)
- **27 Built-In Flashcards + Custom/Pack Deck** (`FLASHCARDS`): 5-Box Leitner spaced-repetition system with keyboard flipping (`Space`) and grading (`1: Again`, `2: Hard`, `3: Good`, `4: Easy`).
- **16 Architectural Scenario Diagnostic Quizzes** (`QUIZ_QUESTIONS`): Staff-level root-cause and trade-off questions with instant explanations for every option.
- **Latency & Capacity Numbers Cheat Sheet Drawer**: Interactive reference table for L1/L2 cache, RAM, Redis, NVMe I/O, Intra-AZ RTT, Cross-Continent WAN RTT, and QPS/storage rules of thumb.

### 7. In-App Content Studio & Periodic Updates (`ContentStudioView`)
- **One-Click 2026 Periodic Curriculum Packs**:
  - `pack-2026-q1-ai`: *Pack 2026.Q1 — AI & LLM Systems Infrastructure* (Semantic Caching, Token-Aware Rate Limiting, vLLM PagedAttention & Continuous Batching)
  - `pack-2026-q2-ebpf`: *Pack 2026.Q2 — Modern Cloud-Native & eBPF Primitives* (eBPF Sidecarless Service Mesh / Cilium, Durable Execution / Temporal, Zero-Copy Tiered Kafka Storage)
  - `pack-2026-q3-outages`: *Pack 2026.Q3 — Real-World Outage Postmortems Pack* (Control-Plane Blast Radius, Discord Trillion-Message ScyllaDB Migration, Stripe Idempotency Ledger)
- **Custom Topic & Flashcard Studio**: Author standalone system design topics (indexed automatically in `Ctrl+K`) and custom active-recall flashcards.
- **JSON Content Pack Importer / Exporter**: Share or import external `.json` curriculum packs without touching source code.

---

## Interactive Simulators & Visual Laboratories

| Simulator Module | Component File | Interactive Capabilities |
| :--- | :--- | :--- |
| **Circuit Breaker & Retry Jitter Lab** | `src/components/diagrams/PatternSimulators.tsx` | Toggle downstream outage rates, trip `CLOSED -> OPEN -> HALF_OPEN` transitions, and compare synchronized retry thundering herds vs. Exponential Backoff + Full Jitter. |
| **4-Algorithm Rate Limiter Sandbox** | `src/components/diagrams/PatternSimulators.tsx` | Fire burst traffic against **Token Bucket**, **Leaky Bucket**, **Fixed Window Counter** (2x boundary spike), and **Sliding Window Log**. |
| **Consistent Hashing Ring & Vnodes** | `src/components/diagrams/PatternSimulators.tsx` | Add/remove physical nodes and adjust virtual node (`vnode`) count to observe key redistribution variance on the SVG ring. |
| **CAP / PACELC Network Partition Lab** | `src/components/diagrams/TradeoffSimulators.tsx` | Sever the inter-node replication link and compare `PC/EC` (quorum reject / linearizable) vs. `PA/EL` (split-brain write acceptance / conflict resolution). |
| **M/M/1 Queueing & Tail Latency Curve** | `src/components/diagrams/TradeoffSimulators.tsx` | Adjust arrival rate $\lambda$, service capacity $\mu$, and fan-out degree to visualize hockey-stick `p50`/`p95`/`p99` latency explosions and tail amplification. |
| **Dynamo `N/W/R` Quorum Tuner** | `src/components/diagrams/TradeoffSimulators.tsx` | Configure replication factor $N$, write quorum $W$, and read quorum $R$ to inspect quorum overlap ($W + R > N$) and tolerated node failures. |
| **ACID Isolation Anomaly Timeline** | `src/components/diagrams/TradeoffSimulators.tsx` | Step through concurrent transaction schedules for **Dirty Read**, **Lost Update**, and **Write Skew** across `Read Committed`, `Snapshot Isolation`, and `Serializable (SSI)`. |
| **Cache Stampede & Hot-Shard Salting** | `src/components/diagrams/TradeoffSimulators.tsx` | Simulate TTL expiration stampedes mitigated via **Singleflight Request Coalescing + Probabilistic Early Expiration** and celebrity key salting (`key#0..N`). |
| **6-Axis Trade-Off Radar & Bar Chart** | `src/components/diagrams/TradeoffRadar.tsx` | Toggle contenders on an SVG hexagonal radar polygon and grouped quantitative bar chart with axis tooltips. |
| **Layered Architecture Topology & Outage Simulator** | `src/components/diagrams/ArchitectureVisualizer.tsx` | Inspect 5-tier system topologies (`client -> edge -> compute -> messaging -> storage`), highlight **Read Path** / **Write Path** packet flows, and click any node in **Simulate Node Outage** mode to inspect blast radius & failover mitigations. |

---

## Periodic Content Update Workflow

As documented in [`docs/content-update-plan.md`](docs/content-update-plan.md), the curriculum stays current via a **3-Tier Update Cadence**:

1. **Weekly Micro-Updates**: Convert new engineering postmortems (Cloudflare, AWS, Stripe, Discord, Uber) into 2–4 active-recall flashcards and 1–2 diagnostic quiz scenarios.
2. **Monthly Curriculum Packs (`ContentPack` JSON)**: Package emerging infrastructure primitives (AI/LLM gateways, eBPF networking, durable execution) as versioned `.json` bundles installable via **Content Studio & Updates**.
3. **Quarterly Matrix Re-Calibration**: Audit database, broker, and cache release benchmarks (`src/data/frameworkMatrices.ts`) and hardware latency baselines.
4. **Automated Validation Gate (`npm run validate:content`)**: Runs [`scripts/validate-content.mjs`](scripts/validate-content.mjs) to verify all 7 curriculum exports, required schema fields, global ID uniqueness, and cross-reference integrity (`relatedPatternIds`, case study `edges -> nodes`, and matrix `decisionScenarios -> contenders`).

---

## Project Structure

```text
system-design-study-app/
├── docs/
│   ├── code-review-report.md     # Comprehensive pre-release code review & QA report
│   ├── content-update-plan.md    # Prototype audit & 3-tier periodic content update strategy
│   ├── research-patterns.md      # GoF & Distributed Architecture patterns curriculum spec
│   └── research-systems.md       # Distributed systems trade-offs, matrices & case studies spec
├── scripts/
│   └── validate-content.mjs      # Automated CLI schema, ID uniqueness & referential validator
├── src/
│   ├── components/
│   │   ├── diagrams/
│   │   │   ├── ArchitectureVisualizer.tsx  # 5-tier SVG topology & outage blast-radius simulator
│   │   │   ├── PatternSimulators.tsx       # Circuit Breaker, Rate Limiter & Consistent Hash Ring
│   │   │   ├── TradeoffRadar.tsx           # 6-axis SVG radar & quantitative score bar chart
│   │   │   └── TradeoffSimulators.tsx      # CAP/PACELC, M/M/1 Queue, Quorum, Isolation & Cache labs
│   │   ├── layout/
│   │   │   ├── CommandPalette.tsx          # Global Ctrl+K / Cmd+K fuzzy search & deep-link modal
│   │   │   ├── Navbar.tsx                  # Mastery progress, search trigger & JSON export/import
│   │   │   └── Sidebar.tsx                 # 7-module navigation & domain mastery badges
│   │   └── views/
│   │       ├── ActiveRecallView.tsx        # Leitner 5-box flashcards, quizzes & latency cheat sheet
│   │       ├── CaseStudiesView.tsx         # 7 case studies, capacity sliders & 45m interview timer
│   │       ├── ContentStudioView.tsx       # 2026 update packs, custom authoring & JSON pack I/O
│   │       ├── DashboardView.tsx           # Executive overview, telemetry & simulator quick-launch
│   │       ├── MatrixComparisonView.tsx    # 7 head-to-head matrices, 1v1 diff & decision wizard
│   │       ├── PatternsCatalogView.tsx     # 28 GoF + Distributed patterns & anti-pattern diffs
│   │       └── TradeoffsExplorerView.tsx   # 8 core trade-off spectrums & embedded simulators
│   ├── context/
│   │   └── StudyContext.tsx      # Local-first state provider (localStorage + custom packs)
│   ├── data/
│   │   ├── caseStudies.ts        # 7 end-to-end production system design case studies
│   │   ├── distributedPatterns.ts# 13 cloud & distributed architecture patterns
│   │   ├── flashcardsQuizzes.ts  # 27 active-recall flashcards & 16 scenario quiz questions
│   │   ├── frameworkMatrices.ts  # 7 head-to-head infrastructure comparison matrices
│   │   ├── softwarePatterns.ts   # 15 classic Gang of Four patterns in modern TypeScript
│   │   └── systemTradeoffs.ts    # 8 core distributed system trade-off models
│   ├── types/
│   │   └── index.ts              # Strict TypeScript interfaces for all curriculum domains
│   ├── App.tsx                   # Root view router & global keyboard shortcut orchestration
│   ├── index.css                 # Tailwind CSS v4 theme & custom dark-mode scrollbar styling
│   └── main.tsx                  # React 19 application entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## CI/CD

- **CI** (`.github/workflows/ci.yml`, push/PR to `main`): `tsc --noEmit`, `validate:content`, `test:coverage` (Vitest + v8, coverage uploaded to Codecov), `build`.
- **Deploy** (`.github/workflows/deploy.yml`, push to `main`): runs CI as a gate, then deploys to Vercel production via the Vercel CLI (the project has no Git integration).
- Required repository secrets: `CODECOV_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- Local: `npm test`, `npm run test:coverage`.
