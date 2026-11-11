import { BaseStudyItem } from '../types';

export type SimulatorType =
  | 'cap-pacelc'
  | 'latency-throughput'
  | 'consistency-isolation'
  | 'caching'
  | 'replication-quorum'
  | 'sharding-lb';

export interface TradeoffStrategy {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  realWorldSystems: string[];
  latencyProfile: string;
  consistencyProfile: string;
}

export interface TradeoffFailureMode {
  name: string;
  mechanism: string;
  mitigation: string;
}

export interface SystemTradeoffItem extends BaseStudyItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  difficulty: 'Fundamental' | 'Intermediate' | 'Advanced' | 'Staff+';
  coreTension: string;
  mentalModel: string;
  spectrumOrStrategies: TradeoffStrategy[];
  failureModes: TradeoffFailureMode[];
  interviewTrap: string;
  interviewDefenseTemplate: string;
  simulatorType: SimulatorType;
}

export const SYSTEM_TRADEOFFS: SystemTradeoffItem[] = [
  {
    id: 'cap-pacelc',
    title: 'CAP & PACELC Theorems',
    category: 'Foundational Laws',
    summary:
      'Governs how distributed data stores choose between Consistency and Availability during a network Partition (P), and Else (E) between Latency and Consistency during normal operation.',
    tags: ['CAP', 'PACELC', 'Consensus', 'Linearizability', 'Availability', 'Quorum'],
    difficulty: 'Fundamental',
    coreTension:
      'If a network partition (P) severs communication between nodes, a distributed store must either reject/block writes on the minority side to preserve linearizable Consistency (C) or accept diverging writes on both sides to preserve Availability (A). Even when healthy (Else), replicating synchronously for Consistency costs round-trip network Latency.',
    mentalModel:
      'Think of two bank branches whose phone line is cut. If a customer tries to withdraw $500 at Branch B, either the teller refuses until the phone line is restored (CP — account never goes negative), or the teller dispenses cash and reconciles overdrafts later (AP — customer is never turned away). When the phone line works (Else), calling the other branch before dispensing cash adds latency (EC) vs dispensing immediately and faxing the receipt asynchronously (EL).',
    spectrumOrStrategies: [
      {
        name: 'PC/EC (Strict Consensus)',
        description:
          'Prioritizes strong consistency both during network partitions and during normal operation via synchronous Raft/Paxos quorum commits.',
        pros: [
          'Zero stale reads or lost writes; linearizable or serializable guarantees',
          'Eliminates application-level conflict resolution logic',
          'Safe for financial ledgers, inventory deduction, and distributed locks',
        ],
        cons: [
          'Minority partition becomes completely unavailable for writes (and linearizable reads)',
          'Normal-operation write latency is bounded by quorum WAN RTT (often 10–150ms cross-region)',
          'Leader failover introduces brief unavailability windows (1–10s)',
        ],
        bestFor:
          'Financial balances, billing ledgers, metadata control planes, seat reservation & inventory systems.',
        realWorldSystems: ['Google Cloud Spanner', 'CockroachDB', 'etcd', 'ZooKeeper', 'HBase'],
        latencyProfile: 'Medium-High Write Latency (1 RTT to Quorum); Fast Follower/Lease Reads',
        consistencyProfile: 'Linearizable / External Consistency (PC/EC)',
      },
      {
        name: 'PA/EL (Always-Writable / Low-Latency)',
        description:
          'Prioritizes write availability during network splits and ultra-low local latency during normal operation via asynchronous replication or sloppy quorums.',
        pros: [
          'Sub-millisecond or single-digit ms write/read latency within local AZ/region',
          'Survives AZ/region partitions without dropping user writes (Hinted Handoff)',
          'Linear horizontal scale without single-leader coordination bottlenecks',
        ],
        cons: [
          'Reads may return stale data (replication lag window)',
          'Concurrent updates to the same key across partitions cause write conflicts',
          'Requires Last-Write-Wins (LWW), Vector Clocks, or CRDTs to merge siblings',
        ],
        bestFor:
          'Shopping carts, IoT sensor ingestion, user activity feeds, real-time presence, DNS.',
        realWorldSystems: [
          'Apache Cassandra (ONE/LOCAL_ONE)',
          'Amazon DynamoDB (Default Eventual)',
          'Riak KV',
          'Voldemort',
        ],
        latencyProfile: 'Ultra-Low (<2–5ms local coordinator ack)',
        consistencyProfile: 'Eventual / Tunable Quorum (PA/EL)',
      },
      {
        name: 'PA/EC (Available under Partition, Consistent when Healthy)',
        description:
          'Maintains synchronous or primary-routed consistency in normal operation, but allows fallback reads/writes on isolated replicas during partitions.',
        pros: [
          'Strong read-your-writes consistency under normal conditions (99.9% of the time)',
          'Graceful degradation during severe network splits instead of total outage',
        ],
        cons: [
          'Complex reconciliation when partition heals (rollback of uncommitted primary writes)',
          'Higher normal-operation latency than pure PA/EL systems',
        ],
        bestFor:
          'Document catalogs and user profile stores that want strong consistency normally but can tolerate degraded availability during rare split events.',
        realWorldSystems: ['MongoDB (Tunable w:majority + secondary read fallback)', 'Couchbase'],
        latencyProfile: 'Moderate (Synchronous primary/majority in normal state)',
        consistencyProfile: 'Causal / Strong in Normal State; Divergent under Partition',
      },
      {
        name: 'PC/EL (Partition-Safe, Latency-Optimized Normal Mode)',
        description:
          'Refuses writes in minority partitions to prevent split-brain, but relaxes read consistency in normal operation to serve local replicas with low latency.',
        pros: [
          'Prevents split-brain write divergence during network partitions',
          'Fast local replica reads during normal operation without quorum read tax',
        ],
        cons: [
          'Clients reading from followers may observe brief staleness',
          'Still loses write availability on isolated minority nodes',
        ],
        bestFor:
          'Read-heavy relational clusters where writes must never split-brain, but analytics/feed reads can tolerate 50ms of follower lag.',
        realWorldSystems: [
          'PostgreSQL with Patroni/Raft + Async Read Replicas',
          'MySQL Group Replication (Single-Primary + Follower Reads)',
          'PNUTS (Yahoo)',
        ],
        latencyProfile: 'Low Read Latency (Local Replica); Moderate Write Latency',
        consistencyProfile: 'Single-Timeline Writes (PC) + Bounded-Staleness Reads (EL)',
      },
    ],
    failureModes: [
      {
        name: 'Asymmetric Network Partition (Grey Failure)',
        mechanism:
          'Node A can send packets to Node B, but Node B drops packets to C while C can still talk to A. Naive heartbeats flap continuously, causing leader election storms.',
        mitigation:
          'Use Raft Pre-Vote extensions, quorum leases, and bidirectional connectivity checks before triggering term increments.',
      },
      {
        name: 'Split-Brain Zombie Leader',
        mechanism:
          'An old primary is isolated by a network partition or long JVM GC pause, does not realize a new leader was elected, and continues serving stale reads or accepting conflicting writes.',
        mitigation:
          'Enforce monotonic Fencing Tokens validated by storage nodes and require ReadIndex / Leader Lease heartbeats before serving linearizable reads.',
      },
      {
        name: 'Post-Partition Rollback Data Loss',
        mechanism:
          'A primary accepts `w:1` writes just before being partitioned; a new primary is elected on the majority side. When the old primary rejoins, its unreplicated writes are rolled back.',
        mitigation:
          'Require `w: "majority"` (quorum acknowledgment) before confirming critical writes to the client, and route rolled-back documents to a dead-letter recovery log.',
      },
    ],
    interviewTrap:
      'Never describe a distributed database as a "CA system" (Consistent + Available without Partition Tolerance). In any real network across physical machines, network partitions (P) are physical inevitabilities—switches fail, fiber is cut, GC pauses mimic partitions. You cannot opt out of P; you only choose C or A when P occurs.',
    interviewDefenseTemplate:
      '"For our [Order Ledger] service, we select a PC/EC storage architecture (e.g., CockroachDB/Postgres with synchronous quorum) because double-spending inventory is unacceptable; we explicitly trade away write availability in isolated minority AZs and accept ~10ms cross-AZ quorum write latency. Conversely, for [Product View Telemetry], we use a PA/EL store (Cassandra) so writes never block on WAN round-trips."',
    simulatorType: 'cap-pacelc',
  },
  {
    id: 'latency-throughput',
    title: "Latency vs. Throughput, Little's Law & Tail Latency",
    category: 'Performance Engineering',
    summary:
      "Explores the tension between individual request speed (p50/p99 latency) and aggregate volume (ops/sec), M/M/1 queueing theory hockey-stick saturation, and microservice fan-out tail amplification.",
    tags: ['Latency', 'Throughput', 'Littles Law', 'p99', 'Tail Latency', 'Queueing Theory', 'Batching'],
    difficulty: 'Intermediate',
    coreTension:
      'Maximizing throughput requires batching payloads, amortizing I/O syscalls, and running servers at high utilization. However, batching adds waiting delay (latency), and pushing CPU/thread utilization above ~75–80% causes queueing delay to explode exponentially ($W_q \\propto \\frac{\\rho}{1 - \\rho}$).',
    mentalModel:
      'Compare a Ferrari vs. a Freight Train. A Ferrari carries 1 packet at 200 mph (ultra-low latency, tiny throughput). A freight train waits 15 minutes to fill 100 cars and moves at 50 mph (higher latency for the first passenger, massive throughput). And on a highway, at 50% capacity traffic flows at 65 mph; at 95% capacity, a single tap of the brakes creates a mile-long standstill (M/M/1 Queueing Hockey Stick).',
    spectrumOrStrategies: [
      {
        name: 'Unbatched Immediate Execution (Latency-First)',
        description:
          'Processes and flushes every incoming RPC or event immediately upon arrival without waiting to coalesce requests.',
        pros: [
          'Minimum possible p50 latency when system utilization is low (<50%)',
          'Simple mental model with zero batch-window timer complexity',
        ],
        cons: [
          'High per-request syscall, context-switch, and network packet header overhead',
          'Saturates CPU and IOPS at much lower total QPS',
        ],
        bestFor:
          'Interactive user-facing RPCs, in-memory cache lookups (Redis GET), real-time bidding, high-frequency trading.',
        realWorldSystems: ['Redis', 'gRPC Unary Low-Latency Calls', 'Memcached'],
        latencyProfile: 'Sub-ms to 2ms p50 (Spikes sharply if QPS saturates worker pool)',
        consistencyProfile: 'Immediate per-request execution',
      },
      {
        name: 'Adaptive Micro-Batching / Group Commit (Balanced)',
        description:
          'Accumulates requests for a tiny bounded window (e.g., `linger.ms = 2ms` or `max_batch = 64`) or flushes immediately whenever a disk/network write completes.',
        pros: [
          'Increases throughput 5x–20x by amortizing fsync and network framing across dozens of requests',
          'Caps worst-case waiting latency to a few milliseconds',
        ],
        cons: [
          'Adds `linger.ms` baseline floor to p50 latency under very light load',
          'Requires careful tuning of batch size vs. timeout thresholds',
        ],
        bestFor:
          'Database WAL commits, high-throughput event streaming, GraphQL DataLoader N+1 coalescing, GPU inference batching.',
        realWorldSystems: [
          'PostgreSQL WAL Group Commit',
          'Apache Kafka Producer (linger.ms)',
          'vLLM Continuous Batching',
          'Facebook DataLoader',
        ],
        latencyProfile: '2–10ms p50; Much flatter p99 under heavy load',
        consistencyProfile: 'Atomic per-batch durability when paired with WAL fsync',
      },
      {
        name: 'Hedged Requests & Speculative Execution (Tail-Latency Defense)',
        description:
          'When a client request exceeds the p95 latency threshold (e.g., 15ms), the client fires a duplicate secondary request to another replica and takes whichever responds first.',
        pros: [
          'Drastically cuts p99 and p99.9 tail latency caused by noisy neighbors, GC pauses, or slow disks',
          'Prevents a single slow shard in a 50-way fan-out from stalling the entire user response',
        ],
        cons: [
          'Increases total cluster load by ~2–5% (can trigger retry storms if not token-throttled)',
          'Requires idempotent read/write operations',
        ],
        bestFor:
          'High-fan-out search aggregators, distributed storage reads, feed assembly pipelines.',
        realWorldSystems: ['Google Bigtable Client', 'Amazon DynamoDB Adaptive Retries', 'Envoy Hedging'],
        latencyProfile: 'Compresses p999 close to p95 at +5% throughput cost',
        consistencyProfile: 'Identical to underlying replica read model',
      },
      {
        name: 'Load Shedding & Bounded Queues (Little’s Law Protection)',
        description:
          "Enforces strict queue depth limits (Little's Law $L = \\lambda W$) and drops/degrades excess requests immediately (HTTP 429/503) using CoDel or LIFO scheduling before saturation occurs.",
        pros: [
          'Prevents unbounded queue buildup where every request times out after 30 seconds',
          'Keeps serving 100% of nominal capacity at healthy latency during traffic spikes',
        ],
        cons: [
          'Explicitly drops or serves degraded fallback to excess traffic during overload',
        ],
        bestFor:
          'API Gateways, checkout services, payment processors protecting downstream databases.',
        realWorldSystems: ['Netflix Zuul / Envoy Adaptive Concurrency', 'AWS API Gateway', 'Stripe Load Shedder'],
        latencyProfile: 'Bounded p99 even at 300% traffic overload (via fast rejection)',
        consistencyProfile: 'Preserves downstream transactional stability',
      },
    ],
    failureModes: [
      {
        name: 'Fan-Out Tail Latency Amplification',
        mechanism:
          'An API Gateway fans out a request in parallel to $N = 50$ microservices, each with a 1% chance of a p99 spike (500ms). The probability that at least one call hits p99 is $1 - (0.99)^{50} = 39.5\\%$, making the gateway p60 as slow as a single service’s p99!',
        mitigation:
          'Reduce synchronous fan-out depth, pre-compute materialized views (CQRS), use hedged requests at p95, and set strict deadline propagation with graceful fallback.',
      },
      {
        name: 'Unbounded Queue Death Spiral (Metastable Failure)',
        mechanism:
          'Utilization hits 95%, queue wait time rises above client timeout (5s). Clients retry, doubling arrival rate $\\lambda$, while workers waste CPU processing requests whose clients already hung up.',
        mitigation:
          'Enforce bounded queues, propagate gRPC/HTTP deadline budgets across hops so expired requests are aborted immediately, and use LIFO queuing during spikes.',
      },
      {
        name: 'Head-of-Line (HoL) Blocking',
        mechanism:
          'A single expensive query (e.g., scanning 100k keys) occupies a worker thread or HTTP/1.1 connection, stalling 1,000 tiny 1ms requests queued behind it.',
        mitigation:
          'Isolate heavy vs. light workloads into separate worker pools (Bulkhead pattern), use HTTP/2 stream multiplexing, and paginate large scans.',
      },
    ],
    interviewTrap:
      'Candidates often quote average (mean) latency or assume 95% server CPU utilization is efficient. In system design interviews, always reason in percentiles (p50, p95, p99, p99.9) and explain that M/M/1 queueing delay scales as $\\rho / (1 - \\rho)$—meaning 95% utilization multiplies wait time by 19x! Target 60–70% steady-state utilization for latency-sensitive fleets.',
    interviewDefenseTemplate:
      '"Because our Home Feed aggregates data from 20 downstream shards, naive parallel fan-out would suffer a $1 - 0.99^{20} = 18.2\\%$ chance of hitting p99 tail latency on every page load. We mitigate this by capping shard utilization at 65%, issuing hedged read requests after 12ms, and serving cached fallback blocks if any non-critical shard exceeds its 40ms deadline budget."',
    simulatorType: 'latency-throughput',
  },
  {
    id: 'consistency-models',
    title: 'Consistency Spectrum (Linearizability to Eventual)',
    category: 'Foundational Laws',
    summary:
      'Defines the contract between a distributed storage system and its clients regarding when and in what order concurrent updates become visible across replicas.',
    tags: ['Linearizability', 'Sequential', 'Causal', 'Read-Your-Writes', 'Eventual Consistency', 'Wan Replication'],
    difficulty: 'Advanced',
    coreTension:
      'Linearizability makes a distributed cluster behave like a single atomic register in real time, but requires cross-replica consensus on every operation (bounded by speed-of-light WAN latency). Relaxing consistency to Causal or Eventual allows instant local reads/writes, but exposes ordering anomalies to the application.',
    mentalModel:
      'Imagine a live sports broadcast. Linearizability means everyone in the stadium and watching on TV sees the ball cross the goal line at the exact same physical nanosecond. Sequential Consistency means everyone sees the same play-by-play sequence, even if TV viewers are 5 seconds behind. Causal Consistency means you never hear the crowd cheer before seeing the goal, though two unrelated games on different channels might appear in different orders. Eventual Consistency means highlights arrive out of order, and only the final box score matches.',
    spectrumOrStrategies: [
      {
        name: 'Linearizability (Strong / Atomic Consistency)',
        description:
          'Every operation appears to take effect atomically at a single point in real physical time between its invocation and completion. Once any client reads `v2`, no subsequent read anywhere can ever return `v1`.',
        pros: [
          'Strongest possible single-object guarantee; matches single-threaded RAM semantics',
          'Prevents stale reads, split-brain lock acquisition, and double-allocation',
        ],
        cons: [
          'Requires Raft/Paxos quorum round-trip or synchronized atomic clocks (TrueTime) on reads and writes',
          'High cross-region latency (50–150ms WAN RTT)',
        ],
        bestFor:
          'Distributed locks, leader election, uniqueness constraints (username registration), financial account debits.',
        realWorldSystems: ['Google Cloud Spanner (TrueTime)', 'etcd (Raft ReadIndex)', 'ZooKeeper (sync + read)', 'CockroachDB'],
        latencyProfile: 'High across WAN (1 Quorum RTT); Fast with local Leader Leases',
        consistencyProfile: 'Real-Time Total Order (Linearizable)',
      },
      {
        name: 'Sequential Consistency',
        description:
          'All nodes observe operations in the exact same total order, and each client’s own operations appear in program order, but that order does not have to match real-time wall clocks across independent clients.',
        pros: [
          'Allows local follower reads from a replicated state machine log without contacting the leader on every read',
          'Preserves deterministic state machine ordering across all replicas',
        ],
        cons: [
          'A client reading from a lagging replica may see an older point in the global timeline than another client',
        ],
        bestFor:
          'Ordered event logs, chat channel message sequences, state machine replication where followers serve local reads.',
        realWorldSystems: ['ZooKeeper (Default Reads)', 'Kafka Partition Log', 'Primary-Replica Ordered Log'],
        latencyProfile: 'Low Read Latency (Local Replica); Quorum Write Latency',
        consistencyProfile: 'Global Total Order without Real-Time Bounds',
      },
      {
        name: 'Causal Consistency',
        description:
          'Operations that are causally related (e.g., B reads A’s post and replies to it) are seen in the same order by every node in the cluster. Concurrent, causally unrelated writes may be observed in different orders.',
        pros: [
          'Strongest consistency model achievable that remains fully available during network partitions!',
          'Eliminates nonsensical UI states (e.g., seeing a comment reply before the parent post exists)',
        ],
        cons: [
          'Requires tracking causal dependency metadata (Vector Clocks, Lamport Timestamps, or Hybrid Logical Clocks)',
          'Cannot enforce global uniqueness constraints across concurrent branches without coordination',
        ],
        bestFor:
          'Threaded comments, collaborative document editing, social media feeds, multi-region chat.',
        realWorldSystems: ['MongoDB Causal Sessions', 'CockroachDB HLC tracking', 'AntidoteDB', 'COPS'],
        latencyProfile: 'Low (Local AZ/Region execution with dependency token)',
        consistencyProfile: 'Partial Order preserving Happens-Before ($A \\rightarrow B$)',
      },
      {
        name: 'Session Guarantees (Read-Your-Writes & Monotonic Reads)',
        description:
          'Client-centric consistency: a user always sees their own submitted updates immediately (Read-Your-Writes) and never sees time go backward when refreshing (Monotonic Reads).',
        pros: [
          'Solves 90% of user-visible "my update disappeared!" bugs at a fraction of linearizability’s cost',
          'Easily implemented via sticky routing or tracking `last_write_lsn` in the user’s session token',
        ],
        cons: [
          'Other users may still see stale data for a few hundred milliseconds',
        ],
        bestFor:
          'User profile edits, e-commerce order confirmation pages, settings dashboards, CMS publishing.',
        realWorldSystems: [
          'PostgreSQL Primary + Read Replicas with LSN Cookie Routing',
          'Aurora Reader Endpoint with Session Pinning',
        ],
        latencyProfile: 'Low (Leader read for writer; Local replica read for everyone else)',
        consistencyProfile: 'Per-Session Monotonic & Read-Your-Writes',
      },
      {
        name: 'Eventual Consistency (BASE)',
        description:
          'If no new updates are made to an item, all replicas will eventually converge to the same value via async replication, gossip, or anti-entropy repair.',
        pros: [
          'Maximum availability and lowest possible read/write latency worldwide',
          'Zero cross-region coordination overhead on the hot path',
        ],
        cons: [
          'Clients can experience stale reads, out-of-order updates, and temporary phantom deletions',
        ],
        bestFor:
          'Video view counters, like counts, DNS propagation, product recommendations, CDN asset caching.',
        realWorldSystems: ['Amazon DynamoDB (Default)', 'Apache Cassandra', 'AWS S3 (Historical) / CloudFront', 'DNS'],
        latencyProfile: 'Ultra-Low (<5ms anywhere on globe)',
        consistencyProfile: 'Convergence Only (No ordering or recency guarantee)',
      },
    ],
    failureModes: [
      {
        name: 'Causal Violation ("Reply Before Question" Anomaly)',
        mechanism:
          'User A posts a question (replicated async). User B in the same region sees it and posts an answer. User C in Europe receives the answer replica packet before the question replica packet.',
        mitigation:
          'Attach causal dependency IDs (parent message ID or Hybrid Logical Clock timestamp) to writes so replicas buffer the child until the parent is applied.',
      },
      {
        name: 'Non-Monotonic Time Travel on Load-Balanced Replicas',
        mechanism:
          'A user refreshes a page twice. Request 1 hits Replica 1 (at LSN 500, showing a new comment). Request 2 is load-balanced to lagging Replica 2 (at LSN 490), and the comment vanishes.',
        mitigation:
          'Hash `user_id` to a sticky replica (Consistent Hashing) or pass the client’s highest seen `LSN` in request headers so lagging replicas wait or proxy to the primary.',
      },
      {
        name: 'TrueTime / NTP Clock Skew Violation',
        mechanism:
          'Systems relying on physical wall-clock timestamps (e.g., naive Last-Write-Wins) suffer silent data loss when a server’s NTP clock drifts 100ms ahead, causing its writes to overwrite subsequent writes.',
        mitigation:
          'Use Hybrid Logical Clocks (HLC) or bounded uncertainty intervals (Google TrueTime GPS + Atomic clocks) that wait out the $\\epsilon$ uncertainty window before committing.',
      },
    ],
    interviewTrap:
      'Do not treat consistency as a binary "Strong vs. Eventual" switch. Senior/Staff interviewers expect you to apply **tiered consistency within the same system**: e.g., Linearizable for auth/payment, Read-Your-Writes + Monotonic Reads for the author’s own profile/posts (via LSN session cookies), and Eventual for public follower timelines.',
    interviewDefenseTemplate:
      '"Full cluster linearizability across 3 continents would add 120ms WAN quorum latency to every profile view. Instead, we use Read-Your-Writes session consistency: when a user updates their bio, we store the Postgres WAL LSN in their JWT cookie and route their own reads to the primary (or a caught-up replica with `lsn >= token.lsn`), while other viewers read from fast local async replicas."',
    simulatorType: 'consistency-isolation',
  },
  {
    id: 'isolation-levels',
    title: 'ACID Transaction Isolation Levels & Anomalies',
    category: 'Foundational Laws',
    summary:
      'Controls how concurrent database transactions interact on shared rows, trading off protection against Dirty Reads, Non-Repeatable Reads, Phantoms, and Write Skew against lock contention and abort rates.',
    tags: ['ACID', 'Isolation', 'MVCC', 'Write Skew', 'Snapshot Isolation', 'Serializable', '2PL', 'SSI'],
    difficulty: 'Staff+',
    coreTension:
      'Executing transactions truly one-at-a-time (strict serial execution) destroys multi-core concurrency when transactions wait on network or disk I/O. Weak isolation levels maximize throughput via lock-free MVCC reads, but expose subtle race conditions like Lost Updates and Write Skew that can corrupt business invariants.',
    mentalModel:
      'Think of two editors working on a shared budget spreadsheet. Read Committed means you only see cells the other person has saved, though totals can change mid-calculation if they save while you are summing. Repeatable Read (Snapshot) gives you a photocopy of the sheet at 9:00 AM—your sums are internally consistent, even if the other editor simultaneously approves an expense that pushes the combined budget below zero (Write Skew). Serializable checks at save time whether your two parallel edits violated any spreadsheet formula.',
    spectrumOrStrategies: [
      {
        name: 'Read Uncommitted',
        description:
          'Transactions can read uncommitted modifications made by other concurrent running transactions (Dirty Reads allowed).',
        pros: ['Zero read lock overhead'],
        cons: [
          'Exposes Dirty Reads—reading data from a transaction that later aborts and never existed',
          'Almost never safe for business logic (PostgreSQL treats Read Uncommitted as Read Committed)',
        ],
        bestFor: 'Approximate debugging counts over massive tables where dirty data is acceptable.',
        realWorldSystems: ['MySQL InnoDB (Optional)', 'SQL Server (NOLOCK hint)'],
        latencyProfile: 'Fastest (No read locks)',
        consistencyProfile: 'Allows Dirty Reads, Non-Repeatable Reads, Phantoms, Write Skew',
      },
      {
        name: 'Read Committed (Industry Default)',
        description:
          'Queries only see data committed before the individual SQL statement began, and row-level write locks prevent Dirty Writes.',
        pros: [
          'Readers never block writers, and writers never block readers (via MVCC tuple snapshots per statement)',
          'Low lock contention and zero serialization abort retries required for simple OLTP',
        ],
        cons: [
          'Suffers from Non-Repeatable Reads (reading the same row twice in one transaction returns different values)',
          'Vulnerable to Lost Updates (`read-modify-write` in app code) and Write Skew',
        ],
        bestFor:
          'General CRUD web workloads when combined with atomic `UPDATE ... SET bal = bal - 10` or explicit `SELECT FOR UPDATE` on critical rows.',
        realWorldSystems: ['PostgreSQL (Default)', 'Oracle DB (Default)', 'SQL Server (RCSI)', 'CockroachDB Read Committed'],
        latencyProfile: 'Low Latency, High Concurrency (Statement-level MVCC)',
        consistencyProfile: 'Prevents Dirty Reads/Writes; Allows Non-Repeatable Reads & Write Skew',
      },
      {
        name: 'Repeatable Read / Snapshot Isolation (MVCC)',
        description:
          'Each transaction reads from a consistent point-in-time MVCC snapshot taken when the transaction started. Concurrent writes to the exact same row trigger a first-committer-wins conflict.',
        pros: [
          'Guarantees consistent multi-query reports, backups, and analytics within a transaction',
          'Automatically detects Lost Updates on the same row in PostgreSQL (`Repeatable Read`)',
        ],
        cons: [
          'Vulnerable to **Write Skew**: two transactions read overlapping sets of rows, verify an invariant holds, and modify disjoint rows—breaking the invariant upon commit!',
        ],
        bestFor:
          'Financial reporting queries, multi-step point-in-time ledger audits, long-running read transactions.',
        realWorldSystems: [
          'PostgreSQL (Repeatable Read = Snapshot Isolation)',
          'MySQL InnoDB (Default Repeatable Read)',
          'TiDB',
        ],
        latencyProfile: 'Low Latency (Lock-free MVCC reads; retries on same-row write conflict)',
        consistencyProfile: 'Prevents Non-Repeatable Reads & Lost Updates; Allows Write Skew',
      },
      {
        name: 'Serializable (2PL vs. Serializable Snapshot Isolation - SSI)',
        description:
          'Guarantees that the outcome of concurrent transactions is identical to some serial (one-after-another) execution order. Implemented via Pessimistic Two-Phase Locking (2PL) or Optimistic SSI dependency cycle detection.',
        pros: [
          'Eliminates all concurrency anomalies including Phantom Reads and Write Skew',
          'Developers do not need to manually reason about subtle `SELECT FOR UPDATE` lock ordering',
        ],
        cons: [
          '2PL suffers from predicate lock contention and deadlocks',
          'SSI (PostgreSQL/CockroachDB) requires client retry loops when `40001 serialization_failure` aborts occur under high contention',
        ],
        bestFor:
          'Double-entry accounting ledgers, on-call scheduling invariants, booking systems preventing double-allocation.',
        realWorldSystems: [
          'PostgreSQL (SSI)',
          'CockroachDB (Default Serializable)',
          'Google Cloud Spanner (2PL + TrueTime)',
          'FoundationDB',
        ],
        latencyProfile: 'Higher Contention / Retry Overhead on Hot Keys',
        consistencyProfile: 'Strict / Full Serializability (Zero Anomalies)',
      },
    ],
    failureModes: [
      {
        name: 'Lost Update Anomaly (Read-Modify-Write)',
        mechanism:
          'Transaction T1 and T2 both read `counter = 100` in application memory, increment to `101`, and execute `UPDATE ... SET counter = 101`. One increment is silently overwritten.',
        mitigation:
          'Use atomic SQL increments (`SET counter = counter + 1`), Compare-And-Swap (`WHERE version = 5`), or `SELECT ... FOR UPDATE` pessimistic row locks.',
      },
      {
        name: 'Write Skew (Disjoint Row Invariant Violation)',
        mechanism:
          'Hospital requires $\\ge 1$ doctor on call. Alice and Bob are both on call. Under Snapshot Isolation, T1 and T2 both count `2 doctors on call`, and T1 updates Alice’s row to `off_call` while T2 updates Bob’s row to `off_call`. Both commit because they touched different rows—leaving 0 doctors on call!',
        mitigation:
          'Upgrade to `SERIALIZABLE` isolation (SSI detects the `rw-antidependency` cycle) or materialize a lock target (`SELECT * FROM doctors WHERE shift_id = 1 FOR UPDATE`).',
      },
      {
        name: 'Long-Running Transaction MVCC Bloat',
        mechanism:
          'An idle transaction open for 4 hours holds back the MVCC snapshot horizon (`xmin`), preventing PostgreSQL `VACUUM` from reclaiming millions of dead row versions and degrading index scans.',
        mitigation:
          'Set strict `idle_in_transaction_session_timeout` (e.g., 15s) and route long analytical queries to a read replica or OLAP warehouse.',
      },
    ],
    interviewTrap:
      'Many candidates assume `Repeatable Read` (Snapshot Isolation) is fully free of race conditions. In Staff-level interviews, demonstrating the **Write Skew** anomaly (two transactions reading an overlapping predicate and updating disjoint rows) and showing how either `SELECT FOR UPDATE` or `SSI Serializable` solves it immediately sets you apart.',
    interviewDefenseTemplate:
      '"In our seat-booking service, standard `Read Committed` with application-level checks would allow double-booking via Lost Updates, and even `Repeatable Read` permits Write Skew if a user books against a group quota across disjoint rows. We run on `Read Committed` for low overhead but enforce pessimistic `SELECT ... FOR UPDATE NOWAIT` on the target seat row inside a short transaction—with zero external HTTP calls while holding the lock."',
    simulatorType: 'consistency-isolation',
  },
  {
    id: 'caching-strategies',
    title: 'Caching Strategies & Invalidation Topologies',
    category: 'Data Scaling & Storage',
    summary:
      'Balances read acceleration, write amplification, cache-database consistency, and resilience against Thundering Herd stampedes, Hot Keys, and Cache Penetration.',
    tags: ['Caching', 'Redis', 'Cache-Aside', 'Write-Through', 'Write-Behind', 'Stampede', 'Bloom Filter'],
    difficulty: 'Intermediate',
    coreTension:
      'Caching replicates data into fast volatile RAM to cut read latency from 10ms (disk DB) to 0.5ms (Redis) and shield database IOPS. However, maintaining dual state between cache and database introduces race conditions on concurrent updates, cold-cache stampedes on expiry, and data loss risks if writes are buffered in memory.',
    mentalModel:
      'A cache is like a chef’s countertop prep station in front of a walk-in freezer (the database). Cache-Aside means the chef checks the counter first, walks to the freezer on a miss, and puts extra portions on the counter. Write-Through means every delivery goes on the counter and into the freezer simultaneously. Write-Behind means jotting orders on a notepad on the counter and updating the freezer inventory once an hour.',
    spectrumOrStrategies: [
      {
        name: 'Cache-Aside (Lazy Loading)',
        description:
          'Application checks Redis first; on a miss, it queries the DB, populates Redis with a TTL, and returns. On a write, the application updates the DB and **deletes (invalidates)** the cache key.',
        pros: [
          'Resilient to cache failure (if Redis dies, requests fall back to DB—albeit slower)',
          'Only requested data is cached, preventing cache pollution from cold writes',
          'Invalidating (`DEL`) on write avoids most concurrent dual-write ordering bugs',
        ],
        cons: [
          'First request for any key suffers a 3-hop cache miss penalty',
          'Subtle race condition if a slow read miss populates stale data after a concurrent write + delete (mitigated by leases or short TTLs)',
        ],
        bestFor:
          '90% of read-heavy web services: user profiles, product catalogs, article payloads.',
        realWorldSystems: ['Redis + PostgreSQL (Standard Web Stack)', 'Memcached + MySQL (Meta TAO/McRouter)'],
        latencyProfile: 'Hit: <1ms | Miss: 10–30ms | Write: DB latency + 1ms DEL',
        consistencyProfile: 'Eventual (Bounded by TTL + invalidation propagation)',
      },
      {
        name: 'Read-Through / Write-Through',
        description:
          'Application talks strictly to the cache abstraction. On writes, the cache synchronously writes to the backing DB before returning success to the caller.',
        pros: [
          'Cache is always fresh on writes; zero cold-miss penalty for newly written items',
          'Clean separation of concerns—application code treats cache as the primary data store',
        ],
        cons: [
          'Every write pays the latency of both Redis and the synchronous DB write',
          'Pollutes cache memory with write-once data that may never be read again (unless paired with TTL/LRU)',
        ],
        bestFor:
          'Workloads where newly written records are immediately read back (e.g., active user sessions, recent social posts).',
        realWorldSystems: ['Amazon DynamoDB Accelerator (DAX)', 'NCache', 'Hazelcast'],
        latencyProfile: 'Hit: <1ms | Write: High (Cache + DB synchronous)',
        consistencyProfile: 'Strong Cache-DB Alignment (if atomic per key)',
      },
      {
        name: 'Write-Behind (Write-Back)',
        description:
          'Application writes only to the in-memory cache and receives an immediate ack. A background worker coalesces and flushes dirty keys to the database asynchronously in batches.',
        pros: [
          'Absorbs massive write spikes (100k+ writes/sec) at sub-millisecond latency',
          'Coalesces 1,000 increments to the same counter into a single DB `UPDATE`',
        ],
        cons: [
          'Risk of permanent data loss if the cache node crashes before flushing dirty keys to disk',
          'Secondary DB queries bypass the cache and see stale data until flush completes',
        ],
        bestFor:
          'High-frequency counters (video views, likes), gaming player telemetry, rate-limiter buckets.',
        realWorldSystems: ['Redis + Kafka/Worker Flush', 'CPU L1/L2 Hardware Caches', 'Linux Page Cache'],
        latencyProfile: 'Hit: <1ms | Write: <1ms (Async DB batching)',
        consistencyProfile: 'Eventual with Durability Window Risk',
      },
      {
        name: 'Write-Around',
        description:
          'Writes go directly to the permanent database, completely bypassing the cache. Only subsequent reads pull the data into the cache.',
        pros: [
          'Prevents flood of write-heavy logs or bulk imports from evicting hot read keys out of RAM',
        ],
        cons: [
          'Immediate read after write always suffers a cache miss (and stale read if cache held old value unless invalidated)',
        ],
        bestFor:
          'Bulk data ingestion, audit logs, cold archival writes rarely read immediately.',
        realWorldSystems: ['Storage SAN caches', 'Bulk ETL + Redis read layers'],
        latencyProfile: 'Hit: <1ms | First Read after Write: Miss Penalty',
        consistencyProfile: 'Requires invalidation if key is mutable',
      },
    ],
    failureModes: [
      {
        name: 'Cache Stampede / Thundering Herd',
        mechanism:
          'A popular cache key (e.g., homepage hero banner at 50k QPS) expires at `t = 60.00s`. All 5,000 concurrent app threads get a cache miss simultaneously and hammer PostgreSQL with the exact same heavy query, crashing the DB.',
        mitigation:
          'Use **Request Coalescing (`singleflight`)** per app node + distributed Redis mutex lock (`SET lock NX PX 3000`) so only 1 worker recomputes the value, or use **Probabilistic Early Expiration (XFetch)** to refresh before TTL hits zero.',
      },
      {
        name: 'Hot Key Bottleneck (Celebrity Key)',
        mechanism:
          'Even in a 50-node Redis Cluster, a single key (`celebrity_live_stream:99`) hashes to 1 specific shard. When 2M users read that key simultaneously, that single Redis CPU core hits 100% and drops packets.',
        mitigation:
          'Add a short-lived (1–2s TTL) **In-Process L1 Local Cache** (Caffeine/LRU) inside the stateless app servers, or replicate the key across $K$ salted shards (`key#1` .. `key#10`) and pick randomly on read.',
      },
      {
        name: 'Cache Penetration (Malicious Non-Existent Keys)',
        mechanism:
          'An attacker or buggy client requests `GET /users/id=-999999` with random non-existent UUIDs. Every request misses Redis and hits the database disk index.',
        mitigation:
          'Place a **Bloom Filter** in front of the cache to reject keys guaranteed not to exist in $O(1)$ memory, and cache negative results (`NULL` sentinel) with a short 30–60s TTL.',
      },
      {
        name: 'Cache Avalanche (Synchronized Mass Expiry)',
        mechanism:
          'A batch job warms 1 million product keys at midnight with an exact `TTL = 3600s`. At 1:00 AM, all 1 million keys expire in the same second, shifting 100% of traffic to the database.',
        mitigation:
          'Always add random **TTL Jitter** (`base_ttl + random(0, 300s)`) when writing cache entries so expirations spread smoothly over time.',
      },
    ],
    interviewTrap:
      'On Cache-Aside writes, candidates frequently say "Update the database, then update the cache." Explain why **Delete (Invalidate) the cache** (`Update DB -> DEL cache`) is strongly preferred: if two concurrent writers update DB in order (A then B) but their network packets to Redis arrive out of order (B then A), updating the cache leaves stale value A in Redis forever until TTL expires!',
    interviewDefenseTemplate:
      '"We use a Two-Tier Cache-Aside architecture: a 2-second in-memory L1 LRU cache on each API pod to absorb celebrity hot keys, backed by a Redis Cluster L2 cache with jittered TTLs (`300s ± 45s`). To prevent cache stampedes on expensive feed aggregations, our data access layer wraps cache misses in Go `singleflight` request coalescing and a Redis lease token."',
    simulatorType: 'caching',
  },
  {
    id: 'replication-topologies',
    title: 'Replication Topologies & Quorum Consensus',
    category: 'Data Scaling & Storage',
    summary:
      'Compares Single-Leader, Multi-Leader (Active-Active), and Leaderless Dynamo-style Quorum ($W + R > N$) replication across failover resiliency, write latency, and conflict resolution.',
    tags: ['Replication', 'Single-Leader', 'Multi-Leader', 'Leaderless', 'Quorum', 'CRDT', 'Vector Clocks', 'Fencing'],
    difficulty: 'Advanced',
    coreTension:
      'Routing all writes through a Single Leader makes ordering and conflict prevention trivial, but creates a single write bottleneck and cross-continent write latency. Allowing writes on multiple leaders or any node (Leaderless) enables low-latency local writes and zero-downtime failover, but forces the system to detect and merge concurrent conflicting writes.',
    mentalModel:
      'Single-Leader is a classroom where only the teacher can write on the master whiteboard while students copy it into their notebooks. Multi-Leader is two classrooms in New York and London each with their own teacher who email changes to each other at the end of the hour. Leaderless Quorum ($N=3, W=2, R=2$) is shouting your update to 3 scribes: as long as at least 2 hear the write and any reader asks at least 2 scribes, at least 1 scribe in the overlap knows the latest version.',
    spectrumOrStrategies: [
      {
        name: 'Single-Leader (Primary-Replica)',
        description:
          'A single designated Primary node accepts all writes and streams a replication log (WAL / binlog) to one or more read-only Replicas synchronously or asynchronously.',
        pros: [
          'Zero write-write conflicts; supports full ACID constraints, unique indexes, and foreign keys',
          'Read throughput scales horizontally by adding read replicas',
        ],
        cons: [
          'Write throughput is vertically bounded by the single primary node',
          'Leader failover requires consensus election and risks split-brain or lost async writes',
          'Global users far from the primary region pay full WAN RTT on every write',
        ],
        bestFor:
          'Transactional OLTP systems, relational schemas, applications with moderate write volume (<50k writes/sec per shard).',
        realWorldSystems: ['PostgreSQL', 'MySQL / Aurora', 'MongoDB Replica Sets', 'Redis Sentinel', 'Kafka Partitions'],
        latencyProfile: 'Local Reads (<2ms); Writes bound to Primary Region location',
        consistencyProfile: 'Linearizable on Primary; Eventual/Bounded on Async Replicas',
      },
      {
        name: 'Multi-Leader (Active-Active Multi-Region)',
        description:
          'Each datacenter/region has its own Leader that accepts local writes and asynchronously replicates changes to leaders in other regions.',
        pros: [
          'Users in US, EU, and APAC all experience fast local write latency (<10ms)',
          'Each region can operate independently if transatlantic fiber cables are severed',
        ],
        cons: [
          'Concurrent edits to the same record in two regions create write conflicts that must be resolved',
          'Auto-incrementing keys, uniqueness constraints, and inventory counters break without coordination',
        ],
        bestFor:
          'Global collaborative apps, multi-region deployments where users predominantly edit their own regional data, offline-first mobile sync.',
        realWorldSystems: [
          'CockroachDB Regional by Row',
          'DynamoDB Global Tables',
          'PostgreSQL BDR',
          'CouchDB / PouchDB Offline Sync',
        ],
        latencyProfile: 'Low Write & Read Latency in every region (<10ms local)',
        consistencyProfile: 'Per-Region Strong; Cross-Region Eventual with Conflict Resolution (LWW / CRDT)',
      },
      {
        name: 'Leaderless (Dynamo-Style Tunable Quorum)',
        description:
          'Any node can act as a coordinator. A client write is sent to all $N$ replicas for that key’s hash range and succeeds as soon as $W$ replicas acknowledge; reads query $R$ replicas in parallel.',
        pros: [
          'Zero leader failover downtime—there is no leader to elect or fail!',
          'Tunable per-request trade-off: set $W + R > N$ (e.g., $N=3, W=2, R=2$) for strong quorum overlap, or $W=1, R=1$ for extreme speed',
          'Sloppy Quorums + Hinted Handoff keep writes succeeding even when primary ring nodes are down',
        ],
        cons: [
          'Even with $W + R > N$, partial failed writes or sloppy quorums can break strict linearizability without consensus',
          'Requires Read Repair and background Merkle Tree anti-entropy to heal diverged replicas',
        ],
        bestFor:
          'High-availability, write-intensive key-value and wide-column workloads (chat logs, IoT, shopping carts).',
        realWorldSystems: ['Apache Cassandra', 'ScyllaDB', 'Amazon Dynamo (Original)', 'Riak KV'],
        latencyProfile: 'Tunable: p(W-th fastest replica) for writes; p(R-th fastest) for reads',
        consistencyProfile: 'Tunable Quorum ($W + R > N$) or Eventual ($W + R \\le N$)',
      },
    ],
    failureModes: [
      {
        name: 'Last-Write-Wins (LWW) Silent Data Loss',
        mechanism:
          'In Multi-Leader or Cassandra LWW conflict resolution, Node 1 (clock skewed +50ms ahead) writes `v1` at `t=100.050`. 10ms later in real time, Node 2 (accurate clock) writes `v2` at `t=100.010`. Cassandra discards `v2` forever because `100.010 < 100.050`.',
        mitigation:
          'Use Conflict-Free Replicated Data Types (**CRDTs** like OR-Set, PN-Counter), **Vector Clocks** that surface sibling versions to the application, or Hybrid Logical Clocks.',
      },
      {
        name: 'Asynchronous Replication Failover Write Loss',
        mechanism:
          'Primary accepts 500 writes and acknowledges them to users, then suffers a power outage before streaming those 500 WAL entries to the async standby. The standby is promoted, and 500 committed orders vanish.',
        mitigation:
          'Use **Semi-Synchronous Replication** (wait for at least 1 in-region standby ACK before committing) so at least one surviving node holds every committed transaction.',
      },
      {
        name: 'Replication Lag Induced Causality Bugs',
        mechanism:
          'A user uploads an avatar to the Primary (stored in S3 + DB row), then their browser immediately fetches `GET /profile` which hits an async Replica that hasn’t received the row yet—returning `404 Avatar Not Found`.',
        mitigation:
          'Pin the user to the Primary for 5 seconds after any write, or include the Primary’s WAL LSN in the response so the replica waits until its replay LSN catches up.',
      },
    ],
    interviewTrap:
      'Do not claim "$W + R > N$ guarantees strict Linearizability." While $W + R > N$ guarantees your read set overlaps with at least one replica from the latest completed write, concurrent reads during an ongoing write (or failed partial writes where only 1 node applied the mutation without rollback) can still expose non-linearizable anomalies unless Read Repair completes synchronously before returning!',
    interviewDefenseTemplate:
      '"For our global messaging store, we use a Leaderless Cassandra ring with replication factor $N = 3$ per region and `LOCAL_QUORUM` ($W = 2, R = 2$). Because $2 + 2 > 3$, every read is guaranteed to overlap with at least one replica holding the latest acknowledged message, while tolerating $3 - 2 = 1$ full Availability Zone outage with zero leader-election pause."',
    simulatorType: 'replication-quorum',
  },
  {
    id: 'sharding-partitioning',
    title: 'Sharding, Partitioning & Hot-Spot Mitigation',
    category: 'Data Scaling & Storage',
    summary:
      'Divides massive datasets across independent storage nodes using Key-Range, Consistent Hash, or Directory routing while managing celebrity hot partitions, rebalancing, and secondary index scatter-gather.',
    tags: ['Sharding', 'Partitioning', 'Consistent Hashing', 'Hot Partition', 'Secondary Indexes', 'Scatter-Gather'],
    difficulty: 'Advanced',
    coreTension:
      'Hash partitioning spreads load uniformly across shards, but destroys the ability to run efficient range scans (`WHERE created_at BETWEEN X AND Y`). Key-Range partitioning preserves range scans, but concentrates all time-series writes onto a single "today" shard. Both struggle with celebrity keys and cross-shard secondary queries.',
    mentalModel:
      'Think of organizing a 26-volume encyclopedia. Key-Range Partitioning puts A–C in Volume 1, D–F in Volume 2—great for browsing alphabetically, terrible if 50% of English words start with S (Volume S overflows). Hash Partitioning computes a checksum of every word’s title and places it in Volume `hash % 26`—every volume has the exact same thickness, but finding all words between "Solar" and "System" requires opening all 26 volumes (Scatter-Gather).',
    spectrumOrStrategies: [
      {
        name: 'Hash Partitioning (Consistent Hashing + Virtual Nodes)',
        description:
          'Applies a cryptographic/uniform hash function (`MurmurHash3` / `xxHash`) to the Partition Key and assigns hash token ranges around a ring using Virtual Nodes (`vnodes`).',
        pros: [
          'Distributes keys uniformly across shards, preventing sequential ID / timestamp write hotspots',
          'Adding or removing a node in Consistent Hashing moves only $O(K/N)$ keys instead of rehashing everything',
        ],
        cons: [
          'Range queries on the partition key require a full-cluster Scatter-Gather scan',
          'Single-key skew (e.g., 10M users commenting on 1 celebrity post) still overloads the single shard owning that hash',
        ],
        bestFor:
          'Key-value lookups, user-id partitioned data, high-throughput write ingestion.',
        realWorldSystems: ['Amazon DynamoDB', 'Apache Cassandra', 'Redis Cluster (16,384 Hash Slots)'],
        latencyProfile: 'Single-key: $O(1)$ 1-hop routing | Range query: High p99 (Scatter-Gather)',
        consistencyProfile: 'Per-Shard Atomic; Cross-Shard requires 2PC or Saga',
      },
      {
        name: 'Compound Key (Hash Partition + Sorted Clustering Key)',
        description:
          'Combines both worlds: hashes the first key component (`user_id` or `channel_id`) to pick the shard, and sorts rows on disk within that shard by a second key (`timestamp` or `message_id`).',
        pros: [
          'Uniform distribution across the cluster via the Partition Key hash',
          'Ultra-fast sequential disk range scans for a specific entity (e.g., "fetch last 50 messages in channel X")',
        ],
        cons: [
          'Cannot efficiently run global range queries across all users without scatter-gather',
          'Unbounded partition growth if a single partition key accumulates billions of rows without time-bucketing',
        ],
        bestFor:
          'Chat histories (`(channel_id, bucket), message_id`), IoT sensor streams (`(device_id, date), ts`), user order histories.',
        realWorldSystems: [
          'Cassandra (Partition Key + Clustering Key)',
          'DynamoDB (Partition Key + Sort Key)',
          'Google Cloud Bigtable',
        ],
        latencyProfile: '1-hop fast point & entity-range queries (<5ms)',
        consistencyProfile: 'Row/Partition-local atomicity',
      },
      {
        name: 'Key-Range Partitioning (Dynamic Splitting)',
        description:
          'Assigns contiguous sorted key ranges (e.g., `["a", "f")`, `["f", "m")`) to shards and automatically splits/merges ranges as data grows.',
        pros: [
          'Supports arbitrary range scans (`BETWEEN`, `ORDER BY`, prefix scans) across adjacent keys efficiently',
        ],
        cons: [
          'Monotonically increasing keys (auto-increment IDs or `NOW()` timestamps) direct 100% of writes to the last range shard!',
        ],
        bestFor:
          'Distributed SQL databases, lexicographical indexes, time-series with salted/composite prefixes.',
        realWorldSystems: ['CockroachDB (64MB Ranges)', 'Google Spanner', 'TiKV', 'HBase Regions', 'MongoDB Range Sharding'],
        latencyProfile: 'Fast range scans across contiguous shards',
        consistencyProfile: 'Often paired with per-range Raft consensus',
      },
      {
        name: 'Key Salting & Write Sharding (Celebrity Mitigation)',
        description:
          'Appends a deterministic or random shard suffix `0..K-1` (e.g., `post_8842#3`) to hot keys on write so a single logical entity spreads across $K$ physical shards, and aggregates across all $K$ sub-keys on read.',
        pros: [
          'Multiplies write throughput for a single hot key or time bucket by $K\\times$',
          'Prevents a single celebrity event or viral post from melting one storage node',
        ],
        cons: [
          'Reads for that salted key must fan out to all $K$ sub-keys and merge results ($K\\times$ read amplification)',
          'Should be applied selectively to flagged hot keys rather than every normal key',
        ],
        bestFor:
          'Viral social media posts, flash-sale inventory pools, global per-minute metrics buckets.',
        realWorldSystems: ['Custom Application Sharding Layer', 'Bigtable Time-Series Salting', 'DynamoDB Write Sharding'],
        latencyProfile: 'Write: $O(1)$ distributed | Read: $K$-way parallel fan-out',
        consistencyProfile: 'Eventual aggregation across $K$ sub-shards',
      },
    ],
    failureModes: [
      {
        name: 'Scatter-Gather Local Secondary Index Tail Latency',
        mechanism:
          'A table is sharded by `user_id`, but a query searches `WHERE email = "alice@example.com"` using a Local Secondary Index (Document-Partitioned). The coordinator must query all 64 shards in parallel; the query is as slow as the slowest of the 64 shards.',
        mitigation:
          'Use a **Global Secondary Index (Term-Partitioned)** where the index itself is sharded by `hash(email)`. Point lookups by email become a fast 1-shard hop (at the cost of async index updates on writes).',
      },
      {
        name: 'Monotonic Timestamp Hot Shard',
        mechanism:
          'An engineer chooses `created_date` as the partition key for an analytics table. Every single write at `2025-05-01` lands on Shard 12 while Shards 1–11 sit at 0% CPU.',
        mitigation:
          'Use a compound partition key prefixed by a high-cardinality entity `(tenant_id, created_date)` or hash-salt suffix.',
      },
      {
        name: 'Unbounded Wide Partition OOM',
        mechanism:
          'A single IoT sensor writes 1,000 events/sec into partition `sensor_id = "S1"` for 3 years without time bucketing. The single partition grows to 400 GB, crashing compaction and exceeding the 100MB/10GB partition limit.',
        mitigation:
          'Always include a **Time Bucket** in the partition key for unbounded streams: `partition_key = (sensor_id, "2025-W18")` so each partition closes cleanly every week.',
      },
    ],
    interviewTrap:
      'When asked "How do you shard this table?", never pick a shard key without first listing the **top 3 read/write access patterns**. If you shard a chat table by `message_id`, fetching a conversation requires querying every shard in the cluster! Always shard by the primary access grouping entity (`channel_id` or `user_id`) + time bucket.',
    interviewDefenseTemplate:
      '"We partition the `messages` table by a composite partition key `(channel_id, bucket_yyyymm)` and cluster by `snowflake_message_id DESC`. Hashing `(channel_id, bucket)` spreads load evenly across our Cassandra ring and caps partition size to one month of messages, while the clustering key keeps recent messages physically contiguous in the SSTable for single-seek pagination."',
    simulatorType: 'sharding-lb',
  },
  {
    id: 'load-balancing',
    title: 'Load Balancing Layers (L4 vs. L7) & Routing Algorithms',
    category: 'Traffic & Edge Architecture',
    summary:
      'Contrasts OSI Layer 4 (TCP/UDP Transport) and Layer 7 (HTTP/gRPC Application) load balancers alongside routing algorithms like Least Connections, Power of Two Choices, and Consistent Hashing.',
    tags: ['Load Balancing', 'L4', 'L7', 'Envoy', 'Consistent Hashing', 'Power of Two Choices', 'Anycast'],
    difficulty: 'Fundamental',
    coreTension:
      'Layer 4 load balancers forward raw TCP/UDP packets at millions of connections per second with negligible CPU overhead, but are blind to HTTP paths, headers, and gRPC multiplexed frames. Layer 7 load balancers terminate TLS and inspect application payloads for smart routing, auth, and rate limiting, at the cost of higher CPU/memory and an extra userspace proxy hop.',
    mentalModel:
      'An L4 Load Balancer is a postal sorting machine that only glances at the ZIP code on the outside of the sealed envelope and flings it onto a conveyor belt at lightning speed. An L7 Load Balancer opens the envelope, reads the letter inside, verifies the signature, translates it from JSON to gRPC, and hands billing letters to the Finance desk and chat letters to the Support desk.',
    spectrumOrStrategies: [
      {
        name: 'Layer 4 Transport Load Balancer (TCP/UDP)',
        description:
          'Operates at the transport layer (IP + Port + Protocol). Uses NAT or Direct Server Return (DSR) to map a single TCP flow to a backend server without inspecting application payload.',
        pros: [
          'Extreme throughput (millions of packets/sec) and ultra-low latency (~microseconds via eBPF/IPVS)',
          'Protocol-agnostic: works for raw TCP databases, custom binary protocols, UDP gaming, and TLS passthrough',
          'Direct Server Return (DSR) allows backend servers to send large video/file responses directly to the client IP, bypassing the LB on egress',
        ],
        cons: [
          'Cannot route based on URL path (`/api/v1` vs `/static`), HTTP headers, or JWT claims',
          'Breaks on HTTP/2 & gRPC connection multiplexing: 1 TCP connection carrying 1,000 RPC/sec gets pinned to a single backend server!',
        ],
        bestFor:
          'Edge ingress front-ending an L7 fleet, TCP database proxies, DNS/UDP servers, high-bandwidth video egress (DSR).',
        realWorldSystems: ['AWS Network Load Balancer (NLB)', 'Linux IPVS / eBPF XDP', 'Google Maglev', 'Cloudflare Unimog'],
        latencyProfile: 'Microseconds (<0.1ms overhead)',
        consistencyProfile: '4-Tuple Flow Affinity `(src_ip, src_port, dst_ip, dst_port)`',
      },
      {
        name: 'Layer 7 Application Load Balancer / API Gateway',
        description:
          'Terminates the client TCP/TLS connection, parses HTTP/1.1, HTTP/2, gRPC, or WebSocket frames, applies routing/security policies, and forwards requests over pooled backend connections.',
        pros: [
          'Smart content-based routing (by path, host, header, cookie, canary weight)',
          'Properly load-balances individual HTTP/2 and gRPC streams across multiple backend pods',
          'Centralizes TLS termination, WAF, JWT authentication, rate limiting, and connection pooling',
        ],
        cons: [
          'Higher CPU and memory consumption (two TCP buffers per connection + TLS decryption)',
          'Adds ~0.5–2ms proxy hop latency',
        ],
        bestFor:
          'Microservice API gateways, gRPC service meshes, WebSocket termination, canary deployments.',
        realWorldSystems: ['Envoy Proxy', 'NGINX / HAProxy (HTTP mode)', 'AWS ALB', 'Traefik'],
        latencyProfile: '0.5–2ms proxy processing overhead',
        consistencyProfile: 'Per-Request or Sticky Cookie / Header Affinity',
      },
      {
        name: 'Power of Two Random Choices (P2C) & Least Connections',
        description:
          'Instead of blind Round Robin, P2C picks 2 random backend servers and sends the request to whichever has fewer active in-flight requests (weighted by recent EWMA latency).',
        pros: [
          'Avoids queuing behind a backend node experiencing a GC pause or slow query',
          'Works across distributed multiple load balancers without global state synchronization (avoids "herd behavior" where 10 LBs all dump traffic onto the same newly added empty server)',
        ],
        cons: [
          'Does not preserve cache locality across requests for the same tenant/key',
        ],
        bestFor:
          'Stateless compute fleets with variable request execution times (search, LLM inference, dynamic APIs).',
        realWorldSystems: ['Envoy P2C Load Balancer', 'Finagle (Twitter)', 'gRPC Client-Side LB', 'Linkerd'],
        latencyProfile: 'Dramatically reduces p99 tail latency vs Round Robin',
        consistencyProfile: 'Stateless Load-Aware Routing',
      },
      {
        name: 'Consistent Hashing / Bounded-Load Ring Routing',
        description:
          'L7 proxy hashes a request attribute (`tenant_id`, `document_id`, `session_id`) onto a consistent hash ring to route identical keys to the same stateful or local-caching backend pod.',
        pros: [
          'Maximizes in-memory L1 cache hit rates (80–95%) on backend workers without duplicating data across every pod’s RAM',
          'Consistent Hashing with Bounded Load caps any single node at $1.25\\times$ average load before spilling to the next ring neighbor',
        ],
        cons: [
          'Requires L7 inspection of the routing key header/path',
        ],
        bestFor:
          'Collaborative document servers (Figma/Docs), stateful WebSocket rooms, sharded in-memory search caches.',
        realWorldSystems: ['Envoy Ring Hash / Maglev', 'Varnish CDN', 'Orleans Virtual Actors'],
        latencyProfile: 'High Backend L1 Cache Hit Rate (<1ms)',
        consistencyProfile: 'Soft Affinity per Key with Bounded Overflow',
      },
    ],
    failureModes: [
      {
        name: 'gRPC / HTTP/2 L4 Pinning Skew',
        mechanism:
          'Service A talks to Service B over gRPC using a Kubernetes `ClusterIP` (L4 iptables/IPVS). Because gRPC multiplexes all RPCs over a single persistent TCP connection, L4 routes 100% of Service A’s traffic to 1 pod of Service B while the other 9 pods sit idle.',
        mitigation:
          'Use an L7 proxy (Envoy sidecar/gateway) or gRPC client-side load balancing with headless DNS so individual HTTP/2 streams are balanced per RPC.',
      },
      {
        name: 'Passive Health Check Blackhole',
        mechanism:
          'A backend pod’s database connection pool breaks, causing it to return `HTTP 500` in 0.2ms while `/healthz` still returns `200 OK`. Under "Least Connections" or "Lowest Latency", the load balancer sees this broken pod as the fastest server in the cluster and sends 90% of traffic to it!',
        mitigation:
          'Configure **Outlier Detection (Passive Health Checks)** in Envoy/ALB to automatically eject any host whose consecutive `5xx` error rate exceeds threshold for a 30s penalty window.',
      },
      {
        name: 'WebSocket Reconnection Thundering Herd',
        mechanism:
          'An L7 gateway node holding 100,000 active WebSocket connections is terminated during a deploy. All 100,000 mobile clients immediately reconnect in the same millisecond, overwhelming TLS handshake CPU and auth databases.',
        mitigation:
          'Drain connections gradually during rolling deploys, use client-side **Exponential Backoff with Full Jitter** on reconnect, and offload TLS resumption via session tickets.',
      },
    ],
    interviewTrap:
      'Production architectures rarely choose "L4 OR L7"—they **layer L4 in front of L7**: Global Anycast DNS -> Tier-1 L4 Load Balancers (ECMP + IPVS/Maglev for raw packet scale and DDoS absorption) -> Tier-2 L7 Envoy/NGINX Fleet (for TLS termination, HTTP/2 demultiplexing, auth, and microservice routing).',
    interviewDefenseTemplate:
      '"At the edge, we deploy a two-tier load balancing topology: stateless L4 IPVS/NLB nodes distribute TCP flows via ECMP across a horizontally autoscaled fleet of L7 Envoy proxies. Envoy terminates TLS, enforces per-user token-bucket rate limits, and uses Power-of-Two-Choices (P2C) with outlier ejection to route gRPC streams to healthy backend pods."',
    simulatorType: 'sharding-lb',
  },
];
