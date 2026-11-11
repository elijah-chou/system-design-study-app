import { BaseStudyItem } from '../types';

export interface MatrixContender {
  id: string;
  name: string;
  tagline: string;
  color: string;
  architectureSummary: string;
  scores: Record<string, number>;
  bestFor: string[];
  avoidWhen: string[];
  interviewPitch: string;
}

export interface MatrixDimension {
  attributeName: string;
  values: Record<string, string>;
  winnerNote?: string;
}

export interface DecisionScenario {
  prompt: string;
  recommendedId: string;
  runnerUpId: string;
  reasoning: string;
  tradeoffAccepted: string;
}

export interface FrameworkMatrix extends BaseStudyItem {
  axes: string[];
  contenders: MatrixContender[];
  dimensions: MatrixDimension[];
  decisionScenarios: DecisionScenario[];
}

export const FRAMEWORK_MATRICES: FrameworkMatrix[] = [
  {
    id: 'databases-storage',
    title: 'Databases & Storage Engines',
    category: 'Data Storage',
    difficulty: 'Staff+',
    summary: 'Head-to-head comparison of B-Tree RDBMS, Document stores, LSM-Tree wide-column rings, Managed KV, and NewSQL distributed SQL engines.',
    tags: ['PostgreSQL', 'MongoDB', 'Cassandra', 'DynamoDB', 'CockroachDB', 'B-Tree', 'LSM-Tree', 'ACID'],
    axes: ['Write Throughput', 'Read Latency', 'Query Flexibility', 'Ops Simplicity', 'Horizontal Scale', 'Consistency Strength'],
    contenders: [
      {
        id: 'postgresql',
        name: 'PostgreSQL',
        tagline: 'ACID Relational Engine (Heap + B-Tree + MVCC)',
        color: '#3b82f6',
        architectureSummary: 'Single-leader ACID relational database using 8KB heap pages, B-Tree/GIN/GiST indexes, WAL durability, and tuple-versioned MVCC requiring periodic Autovacuum.',
        scores: { 'Write Throughput': 65, 'Read Latency': 85, 'Query Flexibility': 98, 'Ops Simplicity': 80, 'Horizontal Scale': 50, 'Consistency Strength': 96 },
        bestFor: ['Financial ledgers & OLTP transactions', 'Complex joins, CTEs & window queries', 'Strict relational integrity + JSONB flexibility (<50k writes/sec)'],
        avoidWhen: ['Multi-region active-active writes without sharding', 'Sustained >200k random writes/sec on a single node (B-Tree page splits + vacuum lag)'],
        interviewPitch: 'Default choice for OLTP and strict ACID invariants until write QPS or multi-TB storage forces horizontal sharding.'
      },
      {
        id: 'mongodb',
        name: 'MongoDB',
        tagline: 'Distributed BSON Document Store (WiredTiger)',
        color: '#10b981',
        architectureSummary: 'Replica-set primary-secondary architecture with native range/hash sharding via mongos routers and WiredTiger B-Tree engine with document-level locking.',
        scores: { 'Write Throughput': 75, 'Read Latency': 84, 'Query Flexibility': 85, 'Ops Simplicity': 78, 'Horizontal Scale': 80, 'Consistency Strength': 78 },
        bestFor: ['Product catalogs with polymorphic attributes', 'Hierarchical aggregates loaded together by ID', 'Rapid schema iteration with rich secondary indexes'],
        avoidWhen: ['Highly normalized relational graphs requiring multi-table joins', 'Heavy cross-shard multi-document ACID transactions'],
        interviewPitch: 'Ideal when your aggregate root maps cleanly to a self-contained JSON document and avoids relational impedance mismatch.'
      },
      {
        id: 'cassandra',
        name: 'Apache Cassandra',
        tagline: 'Masterless LSM-Tree Wide-Column Ring',
        color: '#a855f7',
        architectureSummary: 'Peer-to-peer consistent hashing ring using append-only CommitLog + Memtable + immutable SSTables with tunable quorum (R + W > N) and multi-DC active-active.',
        scores: { 'Write Throughput': 98, 'Read Latency': 76, 'Query Flexibility': 38, 'Ops Simplicity': 48, 'Horizontal Scale': 98, 'Consistency Strength': 62 },
        bestFor: ['Massive write-heavy streams (IoT, chat messages, activity logs)', 'Multi-datacenter active-active high availability (PA/EL)', 'Sequential time-series reads by partition + clustering key'],
        avoidWhen: ['Ad-hoc filtering without partition key (ALLOW FILTERING is fatal)', 'Frequent in-place deletes causing SSTable tombstone compaction storms'],
        interviewPitch: 'Choose Cassandra when write throughput and zero-SPOF multi-region availability dominate and every query is known upfront.'
      },
      {
        id: 'dynamodb',
        name: 'Amazon DynamoDB',
        tagline: 'Managed Serverless Key-Value & Document Store',
        color: '#f59e0b',
        architectureSummary: 'Fully managed auto-partitioned storage using Paxos replica groups per 10GB partition, SSD B-Trees + replication logs, and Global Tables.',
        scores: { 'Write Throughput': 92, 'Read Latency': 94, 'Query Flexibility': 45, 'Ops Simplicity': 98, 'Horizontal Scale': 95, 'Consistency Strength': 75 },
        bestFor: ['Serverless & AWS microservices needing predictable <5ms latency', 'Zero-ops elastic scale with Partition Key + Sort Key lookups', 'Shopping carts, session stores, and high-QPS metadata'],
        avoidWhen: ['Complex analytical aggregations, multi-table joins, or >400KB payloads', 'Hot keys exceeding 1,000 WCU or 3,000 RCU on a single partition key'],
        interviewPitch: 'Best for predictable single-digit millisecond latency at massive scale with zero operational overhead when access patterns fit PK + SK.'
      },
      {
        id: 'cockroachdb',
        name: 'CockroachDB / Spanner',
        tagline: 'Distributed NewSQL (Raft/Paxos + Serializable ACID)',
        color: '#ec4899',
        architectureSummary: 'Distributed SQL layer over Pebble/RocksDB key-value ranges replicated via per-range Raft consensus (or TrueTime atomic clocks in Spanner).',
        scores: { 'Write Throughput': 78, 'Read Latency': 72, 'Query Flexibility': 90, 'Ops Simplicity': 72, 'Horizontal Scale': 92, 'Consistency Strength': 100 },
        bestFor: ['Global financial ledgers outgrowing single-node Postgres', 'Multi-region strong consistency (PC/EC) with SQL semantics', 'Auto-sharded horizontal scale without giving up Serializable ACID'],
        avoidWhen: ['Ultra-low sub-millisecond write latency across WAN regions (Raft quorum RTT penalty)'],
        interviewPitch: 'Reach for NewSQL when you outgrow a single Postgres primary (>50k writes/sec or multi-TB) but cannot compromise on ACID SQL.'
      }
    ],
    dimensions: [
      {
        attributeName: 'Storage Engine Internals',
        values: {
          postgresql: 'Heap files + B-Tree/GIN/GiST indexes; MVCC tuple versions + VACUUM.',
          mongodb: 'WiredTiger B-Tree (default) with Snappy/Zstd compression & doc locking.',
          cassandra: 'LSM-Tree: CommitLog -> Memtable -> Immutable SSTables + Bloom Filters.',
          dynamodb: 'Proprietary SSD B-Tree + Paxos replication log per 10GB storage partition.',
          cockroachdb: 'RocksDB/Pebble LSM key-value engine split into 64MB Raft-replicated ranges.'
        },
        winnerNote: 'LSM-Trees (Cassandra) win on sequential write I/O; B-Trees (Postgres/DynamoDB) win on predictable point-read latency.'
      },
      {
        attributeName: 'CAP / PACELC Profile',
        values: {
          postgresql: 'PC/EC (Single-leader synchronous/async standby).',
          mongodb: 'PC/EC default (Replica Set primary with w: "majority").',
          cassandra: 'PA/EL (Masterless ring; tunable ONE, QUORUM, LOCAL_QUORUM).',
          dynamodb: 'PA/EL default (Eventual reads) or PC/EC opt-in (ConsistentRead=true).',
          cockroachdb: 'PC/EC (Strict Serializable ACID via Raft range consensus).'
        }
      },
      {
        attributeName: 'Write Path & Horizontal Scaling',
        values: {
          postgresql: 'Vertical primary scaling; horizontal requires Citus or manual app sharding.',
          mongodb: 'Auto-sharding via mongos router (Hash or Range shard keys).',
          cassandra: 'Linear scale: any node coordinates append-only writes with zero lock contention.',
          dynamodb: 'Auto-splits partitions; capped at 1,000 WCU / 3,000 RCU per physical partition.',
          cockroachdb: 'Auto-splits and rebalances 64MB Raft ranges across nodes seamlessly.'
        }
      },
      {
        attributeName: 'Primary Production Failure Mode',
        values: {
          postgresql: 'Transaction ID wraparound / MVCC bloat if Autovacuum falls behind.',
          mongodb: 'Jumbo chunks & scatter-gather queries across mongos when shard key is omitted.',
          cassandra: 'Tombstone OOM crashes during range scans & GC pauses during SSTable compaction.',
          dynamodb: 'Hot partition throttling (ProvisionedThroughputExceeded) on celebrity keys.',
          cockroachdb: 'Cross-region Raft quorum write latency spikes (50-150ms) and transaction retries.'
        }
      },
      {
        attributeName: 'Staff-Level Interview Rule',
        values: {
          postgresql: 'Start here for 80% of relational/OLTP designs; add read replicas + Redis first.',
          mongodb: 'Choose for self-contained hierarchical documents with evolving schemas.',
          cassandra: 'Choose for high-velocity time-series/chat writes with fixed partition queries.',
          dynamodb: 'Choose for serverless AWS key-value access needing <10ms SLA at any scale.',
          cockroachdb: 'Choose when Postgres hits vertical write limits but business requires strict ACID.'
        }
      }
    ],
    decisionScenarios: [
      {
        prompt: 'Discord/WhatsApp chat message history storing 100B messages/day queried strictly by (channel_id, message_id DESC).',
        recommendedId: 'cassandra',
        runnerUpId: 'dynamodb',
        reasoning: 'LSM-Tree append-only writes absorb massive write bursts without random B-Tree page split amplification, and Partition Key (channel_id) + Clustering Key (message_id) colocates messages sequentially on disk.',
        tradeoffAccepted: 'Sacrifices ad-hoc SQL joins and requires careful tombstone avoidance on message deletes.'
      },
      {
        prompt: 'Global double-entry payment ledger requiring zero lost transfers, multi-table constraints, and horizontal scale beyond 100k TPS.',
        recommendedId: 'cockroachdb',
        runnerUpId: 'postgresql',
        reasoning: 'Provides Serializable ACID isolation across distributed shards via Raft consensus without brittle application-level cross-shard two-phase commit.',
        tradeoffAccepted: 'Accepts higher write latency (Raft quorum network round-trip) compared to single-node local commits.'
      },
      {
        prompt: 'E-commerce user shopping cart and session state on AWS requiring <5ms p99 latency during Black Friday traffic spikes with zero DBA ops.',
        recommendedId: 'dynamodb',
        runnerUpId: 'mongodb',
        reasoning: 'Cart lookups are pure Partition Key (user_id) operations with bounded item size (<400KB), letting DynamoDB auto-partition seamlessly.',
        tradeoffAccepted: 'Cannot run analytical SQL queries directly on DynamoDB without streaming via DynamoDB Streams to S3/Redshift.'
      }
    ]
  },
  {
    id: 'messaging-streaming',
    title: 'Messaging & Event Streaming',
    category: 'Messaging & Async',
    difficulty: 'Advanced',
    summary: 'Comparison of distributed commit logs (Kafka), AMQP smart brokers (RabbitMQ), in-memory streams (Redis), and managed cloud queues (SQS).',
    tags: ['Kafka', 'RabbitMQ', 'Redis Streams', 'Amazon SQS', 'Event Sourcing', 'Pub/Sub'],
    axes: ['Write Throughput', 'End-to-End Latency', 'Routing Flexibility', 'Replay & Retention', 'Ops Simplicity', 'Ordering Guarantees'],
    contenders: [
      {
        id: 'kafka',
        name: 'Apache Kafka',
        tagline: 'Distributed Append-Only Partitioned Commit Log',
        color: '#3b82f6',
        architectureSummary: 'Sequential disk commit log using OS pagecache and zero-copy sendfile. Dumb broker / smart consumer model where consumer groups track offsets independently.',
        scores: { 'Write Throughput': 99, 'End-to-End Latency': 78, 'Routing Flexibility': 55, 'Replay & Retention': 100, 'Ops Simplicity': 55, 'Ordering Guarantees': 94 },
        bestFor: ['High-throughput event streaming (100k-1M+ msgs/sec)', 'Event sourcing, CDC pipelines, and multi-consumer log replay', 'Strict ordering per partition key (e.g., user_id or account_id)'],
        avoidWhen: ['Per-message priority queues or individual message ack/retry out-of-order', 'Thousands of dynamic ephemeral queues'],
        interviewPitch: 'Use Kafka when events are a durable system of record that multiple independent services must consume and replay at their own pace.'
      },
      {
        id: 'rabbitmq',
        name: 'RabbitMQ',
        tagline: 'Smart AMQP Broker (Exchanges -> Bindings -> Queues)',
        color: '#f97316',
        architectureSummary: 'Push-based message broker with flexible Exchange routing (direct, topic, fanout, headers), consumer prefetch limits, per-message ACKs, and Dead-Letter Exchanges.',
        scores: { 'Write Throughput': 68, 'End-to-End Latency': 90, 'Routing Flexibility': 98, 'Replay & Retention': 25, 'Ops Simplicity': 75, 'Ordering Guarantees': 60 },
        bestFor: ['Task/job queues requiring individual message retries and DLQs', 'Complex wildcard topic/header routing and priority queues', 'Low-latency push delivery to competing worker pools'],
        avoidWhen: ['Replaying historical events after consumption (messages delete on ACK)', 'Million-msg/sec log ingestion or massive unconsumed backlog retention'],
        interviewPitch: 'Choose RabbitMQ for traditional background job queues where complex routing, priority queues, and per-message retries matter more than log replay.'
      },
      {
        id: 'redis-streams',
        name: 'Redis Streams',
        tagline: 'In-Memory Radix-Tree Append Log',
        color: '#ef4444',
        architectureSummary: 'Memory-backed radix-tree stream supporting Consumer Groups (XREADGROUP), Pending Entry Lists (PEL) for unacknowledged messages, and sub-millisecond delivery.',
        scores: { 'Write Throughput': 92, 'End-to-End Latency': 99, 'Routing Flexibility': 62, 'Replay & Retention': 50, 'Ops Simplicity': 88, 'Ordering Guarantees': 90 },
        bestFor: ['Sub-millisecond real-time feeds and lightweight consumer groups', 'Stacks already running Redis wanting Kafka-like consumer groups without JVM ops', 'Transient high-speed pipelines trimmed via MAXLEN'],
        avoidWhen: ['Multi-terabyte retention (RAM-bound cost)', 'Strict zero-data-loss durability (AOF fsync windows can lose 1s of writes on failover)'],
        interviewPitch: 'Ideal when you want Kafka-style consumer groups with sub-ms latency and already operate Redis, provided retention fits in RAM.'
      },
      {
        id: 'sqs-sns',
        name: 'Amazon SQS + SNS',
        tagline: 'Serverless Cloud Queue & Fan-Out Pub/Sub',
        color: '#eab308',
        architectureSummary: 'Fully managed HTTP pull queue (SQS) with Visibility Timeouts and Dead-Letter Queues, paired with SNS topics for pub/sub fan-out across microservices.',
        scores: { 'Write Throughput': 90, 'End-to-End Latency': 65, 'Routing Flexibility': 78, 'Replay & Retention': 40, 'Ops Simplicity': 100, 'Ordering Guarantees': 82 },
        bestFor: ['Zero-ops serverless decoupling on AWS', 'SNS -> SQS Fan-Out where each downstream service gets an isolated queue', 'Auto-scaling worker fleets polling via 20s long-polling'],
        avoidWhen: ['Sub-5ms latency requirements', 'Multi-consumer offset replay on the same log without duplicating queues'],
        interviewPitch: 'Default choice on AWS for decoupling asynchronous workers with zero broker provisioning and built-in Dead-Letter Queue isolation.'
      }
    ],
    dimensions: [
      {
        attributeName: 'Consumption & ACK Mechanics',
        values: {
          kafka: 'Pull-based offset pointer; commits offset sequentially per partition.',
          rabbitmq: 'Push-based with basic.qos prefetch; per-message ACK/NACK deletes message.',
          'redis-streams': 'Pull via XREADGROUP; tracks pending messages in PEL until XACK.',
          'sqs-sns': 'HTTP long-polling; Visibility Timeout hides message until DeleteMessage.'
        }
      },
      {
        attributeName: 'Ordering & Parallelism Limit',
        values: {
          kafka: 'Strict order per partition; max active consumers in a group = partition count.',
          rabbitmq: 'Competing consumers break order on retry; strict order requires 1 consumer.',
          'redis-streams': 'Strict chronological <ms>-<seq> order; PEL distributes across consumers.',
          'sqs-sns': 'Standard: best-effort. FIFO: strict per MessageGroupId (up to 70k TPS).'
        }
      },
      {
        attributeName: 'Retention & Replayability',
        values: {
          kafka: 'Disk/S3 Tiered Storage (days to forever); rewind offset anytime.',
          rabbitmq: 'Transient; deleted immediately on ACK (Streams plugin optional).',
          'redis-streams': 'RAM-bounded ring buffer capped via MAXLEN ~ N.',
          'sqs-sns': '1 minute to 14 days max; deleted permanently once processed.'
        }
      }
    ],
    decisionScenarios: [
      {
        prompt: 'Order Placed event must be consumed independently by Billing, Inventory, Fraud Detection, and Data Warehouse with ability to replay 30 days of history.',
        recommendedId: 'kafka',
        runnerUpId: 'sqs-sns',
        reasoning: 'Kafka retains the immutable event log on disk and lets 4 separate Consumer Groups read at their own speed and rewind offsets for backfills.',
        tradeoffAccepted: 'Head-of-line blocking within a partition if a single poison-pill message stalls offset advancement.'
      },
      {
        prompt: 'Video transcoding worker pool where individual jobs take 5 seconds to 10 minutes, may fail and retry 3 times with backoff, and require priority lanes.',
        recommendedId: 'rabbitmq',
        runnerUpId: 'sqs-sns',
        reasoning: 'Per-message ACK + prefetch=1 prevents slow jobs from blocking fast jobs, and native priority queues + Dead-Letter Exchanges handle retries cleanly.',
        tradeoffAccepted: 'No historical event replay once a job message is acknowledged.'
      }
    ]
  },
  {
    id: 'api-protocols',
    title: 'API & Communication Protocols',
    category: 'Networking & APIs',
    difficulty: 'Intermediate',
    summary: 'Trade-offs between REST, binary gRPC (HTTP/2 + Protobuf), GraphQL BFF schemas, full-duplex WebSockets, and unidirectional Server-Sent Events (SSE).',
    tags: ['REST', 'gRPC', 'GraphQL', 'WebSockets', 'SSE', 'HTTP/2', 'Protobuf'],
    axes: ['Serialization Speed', 'Browser Compatibility', 'Schema Strictness', 'Real-Time Push', 'CDN Cacheability', 'Bandwidth Efficiency'],
    contenders: [
      {
        id: 'rest',
        name: 'REST (HTTP/2 JSON)',
        tagline: 'Resource-Oriented HTTP + JSON Standard',
        color: '#3b82f6',
        architectureSummary: 'Stateless resource URLs using standard HTTP verbs (GET/POST/PUT/DELETE), JSON payloads, native CDN/browser ETag caching, and OpenAPI specs.',
        scores: { 'Serialization Speed': 65, 'Browser Compatibility': 100, 'Schema Strictness': 60, 'Real-Time Push': 20, 'CDN Cacheability': 98, 'Bandwidth Efficiency': 60 },
        bestFor: ['Public external developer APIs & webhooks', 'Cache-heavy read endpoints leveraging CDN Cache-Control/ETags', 'Simple CRUD microservices with universal tooling'],
        avoidWhen: ['High-frequency internal service mesh calls (>50k RPS CPU serialization tax)', 'Deeply nested mobile views suffering from over/under-fetching'],
        interviewPitch: 'Use REST at the public API edge for universal client compatibility and native HTTP caching.'
      },
      {
        id: 'grpc',
        name: 'gRPC (Protobuf)',
        tagline: 'High-Performance Binary RPC over HTTP/2',
        color: '#10b981',
        architectureSummary: 'Contract-first .proto schema compiling to strongly-typed polyglot stubs over multiplexed HTTP/2 streams with binary Protocol Buffers serialization.',
        scores: { 'Serialization Speed': 98, 'Browser Compatibility': 50, 'Schema Strictness': 99, 'Real-Time Push': 88, 'CDN Cacheability': 25, 'Bandwidth Efficiency': 96 },
        bestFor: ['Internal East-West microservice-to-microservice communication', 'Polyglot backends (Go, Java, Rust, Python) sharing strict .proto contracts', 'Bidirectional streaming between backend services'],
        avoidWhen: ['Direct browser clients without Envoy gRPC-Web proxy', 'Public APIs where human readability in curl/DevTools is prioritized'],
        interviewPitch: 'Standard for internal East-West microservice RPC: 5-10x smaller payloads and faster CPU serialization than JSON over multiplexed HTTP/2.'
      },
      {
        id: 'graphql',
        name: 'GraphQL',
        tagline: 'Client-Driven Typed Query AST for BFFs',
        color: '#ec4899',
        architectureSummary: 'Single HTTP POST endpoint executing strongly-typed Schema Definition Language (SDL) queries, allowing clients to request exact nested fields.',
        scores: { 'Serialization Speed': 58, 'Browser Compatibility': 95, 'Schema Strictness': 92, 'Real-Time Push': 65, 'CDN Cacheability': 35, 'Bandwidth Efficiency': 82 },
        bestFor: ['Backend-for-Frontend (BFF) aggregating 10+ microservices for Mobile/Web', 'Eliminating over-fetching and multiple round-trips on slow mobile networks', 'Rapid frontend iteration without backend endpoint changes'],
        avoidWhen: ['Simple CRUD APIs', 'Unbounded recursive queries without DataLoader (N+1 DB query explosion) or query depth limiting'],
        interviewPitch: 'Place GraphQL at the BFF layer when mobile/web clients need flexible graph traversal across many microservices in a single round-trip.'
      },
      {
        id: 'websockets',
        name: 'WebSockets',
        tagline: 'Persistent Full-Duplex TCP Channel',
        color: '#a855f7',
        architectureSummary: 'HTTP 101 Switching Protocols upgrade to a persistent stateful bidirectional TCP socket supporting low-overhead binary or text frames.',
        scores: { 'Serialization Speed': 90, 'Browser Compatibility': 94, 'Schema Strictness': 35, 'Real-Time Push': 100, 'CDN Cacheability': 10, 'Bandwidth Efficiency': 92 },
        bestFor: ['Real-time bidirectional chat (WhatsApp/Slack)', 'Multiplayer games & collaborative canvas apps (Figma/Google Docs)', 'High-frequency client-to-server AND server-to-client messaging'],
        avoidWhen: ['One-way server notifications where SSE suffices', 'Stateless serverless architectures without a connection gateway'],
        interviewPitch: 'Use WebSockets only when you need true full-duplex bidirectional traffic; otherwise prefer SSE to avoid stateful socket gateway headaches.'
      },
      {
        id: 'sse',
        name: 'Server-Sent Events (SSE)',
        tagline: 'Unidirectional HTTP text/event-stream Push',
        color: '#f59e0b',
        architectureSummary: 'Standard long-lived HTTP response (Content-Type: text/event-stream) with automatic browser EventSource reconnection and Last-Event-ID resume.',
        scores: { 'Serialization Speed': 75, 'Browser Compatibility': 96, 'Schema Strictness': 50, 'Real-Time Push': 85, 'CDN Cacheability': 30, 'Bandwidth Efficiency': 80 },
        bestFor: ['LLM token streaming (ChatGPT/Claude responses)', 'Live stock tickers, sports scores, and CI build log streaming', 'One-way server-to-client push through standard HTTP/2 load balancers'],
        avoidWhen: ['High-frequency client-to-server upstream messages', 'Binary payload streaming without Base64 encoding overhead'],
        interviewPitch: 'The secret weapon for one-way real-time updates (like AI token streaming): works over standard HTTP/2 with built-in auto-reconnect.'
      }
    ],
    dimensions: [
      {
        attributeName: 'Transport & Directionality',
        values: {
          rest: 'HTTP/1.1 or HTTP/2 Unary Request-Response.',
          grpc: 'HTTP/2 Multiplexed Streams (Unary, Client/Server/Bidi Streaming).',
          graphql: 'HTTP POST Unary (Subscriptions tunnel over WebSockets/SSE).',
          websockets: 'Upgraded raw TCP Full-Duplex Bidirectional socket.',
          sse: 'Standard HTTP Unidirectional (Server -> Client) stream.'
        }
      },
      {
        attributeName: 'Primary Production Pitfall',
        values: {
          rest: 'Over-fetching payloads & waterfall round-trips on mobile.',
          grpc: 'L4 load balancers pin HTTP/2 connections to 1 pod; requires L7 Envoy LB.',
          graphql: 'N+1 resolver database queries (fix with DataLoader) & POST cache bypass.',
          websockets: 'Stateful LB draining, zombie connections, and reconnect thundering herds.',
          sse: 'HTTP/1.1 6-connection browser limit per domain (solved by HTTP/2).'
        }
      }
    ],
    decisionScenarios: [
      {
        prompt: 'Streaming live AI assistant markdown tokens from backend inference workers to web browsers with minimal firewall issues.',
        recommendedId: 'sse',
        runnerUpId: 'websockets',
        reasoning: 'Prompt submission is a single HTTP request followed by unidirectional token streaming. SSE runs over standard HTTP/2, traverses corporate proxies, and has native Last-Event-ID retry.',
        tradeoffAccepted: 'Unidirectional only; client cancellation or new prompts use separate HTTP requests.'
      },
      {
        prompt: 'Internal Order Service calling Inventory, Pricing, and Fraud services synchronously with a strict 15ms p99 latency budget.',
        recommendedId: 'grpc',
        runnerUpId: 'rest',
        reasoning: 'Protobuf binary encoding + HTTP/2 persistent stream multiplexing eliminates JSON parsing overhead and TCP handshake latency.',
        tradeoffAccepted: 'Requires .proto build pipeline and L7 gRPC-aware load balancing (Envoy).'
      }
    ]
  },
  {
    id: 'caching-engines',
    title: 'In-Memory Caching & State Engines',
    category: 'Data Storage',
    difficulty: 'Intermediate',
    summary: 'Comparing Redis (rich data structures & Lua atomicity), Memcached (multi-threaded slab allocator), and Local L1 In-Process Caches (Caffeine).',
    tags: ['Redis', 'Memcached', 'Caffeine', 'L1 Cache', 'ZSET', 'Slab Allocator'],
    axes: ['Raw Read Latency', 'Data Structure Richness', 'Multi-Core Vertical Scale', 'Memory Efficiency', 'Durability & HA', 'Cross-Node Consistency'],
    contenders: [
      {
        id: 'redis',
        name: 'Redis',
        tagline: 'Single-Threaded Data Structure Server + Cluster',
        color: '#ef4444',
        architectureSummary: 'In-memory data structure engine using a single-threaded command loop (zero lock contention, atomic Lua scripts), 16,384 hash-slot Cluster sharding, and RDB/AOF persistence.',
        scores: { 'Raw Read Latency': 90, 'Data Structure Richness': 100, 'Multi-Core Vertical Scale': 65, 'Memory Efficiency': 75, 'Durability & HA': 92, 'Cross-Node Consistency': 88 },
        bestFor: ['Leaderboards (ZSET), Rate Limiters (Atomic Lua), and Distributed Locks', 'Session stores, Pub/Sub, Geospatial indexes, and HyperLogLog counters', 'Caches needing warm restarts via RDB snapshots + AOF logs'],
        avoidWhen: ['Single gigantic node with 64 CPU cores where vertical multi-threading is preferred over Redis Cluster sharding'],
        interviewPitch: 'Default choice in 95% of interviews because native ZSET, Hashes, Streams, and atomic Lua scripts solve rate limiting, leaderboards, and locking.'
      },
      {
        id: 'memcached',
        name: 'Memcached',
        tagline: 'Multi-Threaded Slab-Allocated Volatile KV Cache',
        color: '#3b82f6',
        architectureSummary: 'Pure volatile in-memory key-value string store (<1MB values) using pthreads multi-threading and a pre-allocated Slab Allocator that eliminates memory fragmentation.',
        scores: { 'Raw Read Latency': 92, 'Data Structure Richness': 20, 'Multi-Core Vertical Scale': 98, 'Memory Efficiency': 96, 'Durability & HA': 15, 'Cross-Node Consistency': 82 },
        bestFor: ['Massive-scale pure string/serialized object caching across multi-core servers', 'Predictable memory footprint with zero jemalloc fragmentation', 'Simple horizontal client-side consistent hashing'],
        avoidWhen: ['Needing server-side list mutations, sorted sets, persistence, or native failover'],
        interviewPitch: 'Choose Memcached over Redis only when caching simple serialized blobs at massive scale where multi-threaded CPU utilization and zero memory fragmentation are critical.'
      },
      {
        id: 'local-l1',
        name: 'Local In-Process L1 (Caffeine)',
        tagline: 'Zero-Network-Hop Application Heap Cache (W-TinyLFU)',
        color: '#10b981',
        architectureSummary: 'Embedded in-memory cache inside each application server process using Window-TinyLFU eviction, reading directly from RAM in ~50 nanoseconds without network serialization.',
        scores: { 'Raw Read Latency': 100, 'Data Structure Richness': 70, 'Multi-Core Vertical Scale': 95, 'Memory Efficiency': 65, 'Durability & HA': 10, 'Cross-Node Consistency': 30 },
        bestFor: ['Shielding Redis from Celebrity Hot Keys (1M RPS on a single key)', 'Immutable reference data, feature flags, and public crypto keys', 'Two-tier L1 (Caffeine) + L2 (Redis) hybrid caching'],
        avoidWhen: ['Large datasets exceeding app heap limits', 'Strict immediate cross-server read-your-writes consistency without pub/sub invalidation'],
        interviewPitch: 'Always pair a short-TTL (1-5s) Local L1 cache in front of Redis when defending against hot-key bottlenecks that would saturate a single Redis shard.'
      }
    ],
    dimensions: [
      {
        attributeName: 'Threading & Memory Allocator',
        values: {
          redis: 'Single-threaded command execution + multi-threaded network I/O; jemalloc.',
          memcached: 'Multi-threaded (pthreads) lock-per-bucket; Slab Allocator prevents fragmentation.',
          'local-l1': 'Concurrent in-process hash table on JVM/V8/Go heap; zero serialization.'
        }
      },
      {
        attributeName: 'Latency & Bottleneck Ceiling',
        values: {
          redis: '~0.5ms network RTT; single shard caps around ~100k-150k ops/sec.',
          memcached: '~0.5ms network RTT; scales linearly with CPU cores up to NIC bandwidth.',
          'local-l1': '~50-100 nanoseconds (10,000x faster than network cache); zero network I/O.'
        }
      }
    ],
    decisionScenarios: [
      {
        prompt: 'A viral celebrity tweet receives 800,000 reads/sec, overloading the single Redis Cluster shard that owns that post_id hash slot.',
        recommendedId: 'local-l1',
        runnerUpId: 'redis',
        reasoning: 'Even Redis hits a single-core ceiling (~150k ops/sec) on a single hot key. Adding an in-process L1 cache with a 2-second TTL on API servers absorbs 99.9% of reads in RAM.',
        tradeoffAccepted: 'Stale reads up to 2 seconds across stateless API servers.'
      },
      {
        prompt: 'Real-time gaming leaderboard tracking 50M players with atomic score increments and top-100 rank lookups.',
        recommendedId: 'redis',
        runnerUpId: 'memcached',
        reasoning: 'Redis ZSET (Skip List + Hash Table) executes ZINCRBY and ZREVRANGE in O(log N) server-side without pulling the whole list to the client.',
        tradeoffAccepted: 'Higher memory overhead per entry than flat binary arrays.'
      }
    ]
  },
  {
    id: 'macro-architectures',
    title: 'Application Macro-Architectures',
    category: 'Architecture & Topology',
    difficulty: 'Staff+',
    summary: 'Evaluating Traditional Monoliths, Modular Monoliths, Distributed Microservices, and Event-Driven Serverless (FaaS) across team scale and operational tax.',
    tags: ['Monolith', 'Modular Monolith', 'Microservices', 'Serverless', 'DDD', 'Saga'],
    axes: ['Initial Dev Velocity', 'Operational Simplicity', 'Independent Team Scale', 'Fault Isolation', 'Data Consistency Ease', 'Elastic Cost Efficiency'],
    contenders: [
      {
        id: 'monolith',
        name: 'Traditional Monolith',
        tagline: 'Single Deployable Unit & Shared Database',
        color: '#64748b',
        architectureSummary: 'Unified codebase, single build/deploy artifact, in-process function calls, and a single shared ACID relational database.',
        scores: { 'Initial Dev Velocity': 96, 'Operational Simplicity': 95, 'Independent Team Scale': 30, 'Fault Isolation': 25, 'Data Consistency Ease': 98, 'Elastic Cost Efficiency': 65 },
        bestFor: ['Early-stage startups finding product-market fit (<15 engineers)', 'Domains requiring tight cross-entity ACID transactions', 'Zero network serialization or distributed tracing overhead'],
        avoidWhen: ['100+ engineers merging into one tightly coupled deployment train', 'Subsystems with wildly divergent CPU/GPU/memory scaling profiles'],
        interviewPitch: 'Best for early teams: zero network tax and simple ACID transactions, though unguarded table joins eventually create a Big Ball of Mud.'
      },
      {
        id: 'modular-monolith',
        name: 'Modular Monolith',
        tagline: 'Single Deployment + Strict Bounded Context Modules',
        color: '#10b981',
        architectureSummary: 'Single deployable binary split into strict domain modules with compile-time boundary enforcement, public module APIs, and isolated database schemas.',
        scores: { 'Initial Dev Velocity': 90, 'Operational Simplicity': 88, 'Independent Team Scale': 72, 'Fault Isolation': 55, 'Data Consistency Ease': 88, 'Elastic Cost Efficiency': 75 },
        bestFor: ['Pragmatic default for growing engineering orgs (Shopify / GitHub style)', 'Preserving clean DDD domain boundaries without network RPC latency', 'Enabling easy extraction of a single hot module into a microservice later'],
        avoidWhen: ['Teams needing completely independent deployment cadences or polyglot runtimes'],
        interviewPitch: 'The Staff-level pragmatic default: gives you 80% of microservice domain decoupling with 0% of the distributed network/Saga tax.'
      },
      {
        id: 'microservices',
        name: 'Microservices',
        tagline: 'Independently Deployed Services + Database-per-Service',
        color: '#3b82f6',
        architectureSummary: 'Decomposed services owning private datastores, communicating via gRPC/REST and Kafka events, orchestrated on Kubernetes with Service Mesh and Distributed Tracing.',
        scores: { 'Initial Dev Velocity': 45, 'Operational Simplicity': 30, 'Independent Team Scale': 98, 'Fault Isolation': 92, 'Data Consistency Ease': 35, 'Elastic Cost Efficiency': 82 },
        bestFor: ['Large engineering orgs (50-500+ devs) needing independent team autonomy', 'Isolating hot compute bottlenecks (e.g., Video Encoding vs User Auth)', 'Strict fault isolation with Circuit Breakers and Bulkheads'],
        avoidWhen: ['Small teams lacking dedicated platform/SRE tooling', 'Shared database anti-pattern ("Distributed Monolith")'],
        interviewPitch: 'Microservices solve organizational scaling and independent deployment, not code cleanliness—you trade local ACID for network latency and Sagas.'
      },
      {
        id: 'serverless',
        name: 'Serverless (FaaS)',
        tagline: 'Event-Triggered Ephemeral Stateless Functions',
        color: '#f59e0b',
        architectureSummary: 'Managed functions (AWS Lambda, Cloudflare Workers) scaling from zero to thousands of concurrent executions per event with pay-per-ms billing.',
        scores: { 'Initial Dev Velocity': 85, 'Operational Simplicity': 82, 'Independent Team Scale': 80, 'Fault Isolation': 90, 'Data Consistency Ease': 50, 'Elastic Cost Efficiency': 94 },
        bestFor: ['Spiky, unpredictable, or bursty event-driven workloads (webhooks, image resize)', 'Edge compute routing and cron data pipelines', 'Zero idle server cost when traffic drops to zero'],
        avoidWhen: ['Sustained high-throughput baseline traffic (24/7 Lambda costs 3-5x more than containers)', 'Ultra-low p99 latency intolerant of cold starts or DB connection pool exhaustion'],
        interviewPitch: 'Unbeatable for spiky asynchronous pipelines and scale-to-zero workloads, but beware cold starts and database connection storms.'
      }
    ],
    dimensions: [
      {
        attributeName: 'Invocation Latency & Transactions',
        values: {
          monolith: 'Nanosecond in-memory calls; single local ACID transaction.',
          'modular-monolith': 'Nanosecond interface calls; module-scoped ACID + in-memory domain events.',
          microservices: 'Millisecond network RPC; eventual consistency via Saga + Transactional Outbox.',
          serverless: '10ms-1000ms cold start; stateless execution requiring RDS Proxy / DynamoDB.'
        }
      },
      {
        attributeName: 'Worst Anti-Pattern Trap',
        values: {
          monolith: 'Spaghetti cross-domain SQL joins turning schema migrations into landmines.',
          'modular-monolith': 'Bypassing module interfaces to join another module\'s tables directly.',
          microservices: 'Distributed Monolith: synchronous RPC chains of 8 services sharing one DB.',
          serverless: 'Lambda pinball: synchronous function-calling-function chains double-billing wait time.'
        }
      }
    ],
    decisionScenarios: [
      {
        prompt: 'A 25-engineer fintech startup building a new core banking platform with strict compliance, evolving domain boundaries, and 2,000 RPS.',
        recommendedId: 'modular-monolith',
        runnerUpId: 'microservices',
        reasoning: '2,000 RPS fits comfortably on a single cluster, and a Modular Monolith enforces bounded contexts while keeping ledger transactions ACID without prematurely paying Kubernetes/Saga overhead.',
        tradeoffAccepted: 'All modules deploy together in one CI/CD artifact until a specific module requires extraction.'
      },
      {
        prompt: 'An e-commerce receipt OCR pipeline that processes 0 requests most hours, then bursts to 15,000 uploads in 3 minutes after flash sales.',
        recommendedId: 'serverless',
        runnerUpId: 'microservices',
        reasoning: 'S3 upload events trigger Lambda functions that burst horizontally in seconds and cost $0 when idle.',
        tradeoffAccepted: 'Cold start latency (100-500ms) on initial burst invocations.'
      }
    ]
  },
  {
    id: 'web-rendering',
    title: 'Frontend & Web Rendering Architectures',
    category: 'Networking & APIs',
    difficulty: 'Intermediate',
    summary: 'Comparing Client-Side SPA, Server-Side Rendering (SSR), Static/Incremental Static Regeneration (SSG/ISR), and Hybrid React Server Components (RSC).',
    tags: ['CSR', 'SPA', 'SSR', 'SSG', 'ISR', 'React Server Components', 'CDN'],
    axes: ['First Paint (FCP) Speed', 'SEO & Social Previews', 'Rich Client Interactivity', 'CDN Edge Cacheability', 'Server Cost Efficiency', 'Offline / Local-First Fit'],
    contenders: [
      {
        id: 'csr-spa',
        name: 'CSR / SPA (Vite / React)',
        tagline: 'Client-Side Rendered Single-Page Application',
        color: '#3b82f6',
        architectureSummary: 'CDN serves a static HTML shell + JS bundle; the browser boots the app, manages routing locally, and fetches JSON APIs or reads IndexedDB/localStorage.',
        scores: { 'First Paint (FCP) Speed': 55, 'SEO & Social Previews': 30, 'Rich Client Interactivity': 98, 'CDN Edge Cacheability': 98, 'Server Cost Efficiency': 98, 'Offline / Local-First Fit': 100 },
        bestFor: ['Authenticated SaaS workbenches (Figma, Linear, Notion, this Study App)', 'Offline-capable local-first PWA apps using localStorage/IndexedDB', 'Zero compute server cost (hosted entirely on static CDN)'],
        avoidWhen: ['Public content sites relying on organic search SEO and dynamic OpenGraph social cards', 'Low-end mobile devices on 3G networks choked by 2MB JS bundles'],
        interviewPitch: 'Choose CSR/SPA for authenticated, highly interactive productivity apps where SEO is irrelevant and instant in-session state transitions dominate.'
      },
      {
        id: 'ssr',
        name: 'Server-Side Rendering (SSR)',
        tagline: 'Dynamic Request-Time Server HTML + Client Hydration',
        color: '#f59e0b',
        architectureSummary: 'Node/Edge server fetches backend data and renders full HTML on every request, streaming it to the browser before hydrating interactive React listeners.',
        scores: { 'First Paint (FCP) Speed': 86, 'SEO & Social Previews': 98, 'Rich Client Interactivity': 85, 'CDN Edge Cacheability': 45, 'Server Cost Efficiency': 45, 'Offline / Local-First Fit': 35 },
        bestFor: ['Personalized e-commerce feeds, live news sites, and social timelines', 'Pages needing both dynamic request-time data AND instant SEO/OpenGraph tags'],
        avoidWhen: ['Static content that could be cached at the CDN edge', 'Heavy client-only canvases where server rendering wastes CPU'],
        interviewPitch: 'Use SSR when pages are both public/SEO-critical and dynamically personalized per request.'
      },
      {
        id: 'ssg-isr',
        name: 'Static & ISR (Incremental Static)',
        tagline: 'CDN-Cached HTML with Background Stale-While-Revalidate',
        color: '#10b981',
        architectureSummary: 'Pre-renders HTML at build time or on-demand, serves instantly from global CDN PoPs, and regenerates stale pages asynchronously via TTL or webhook.',
        scores: { 'First Paint (FCP) Speed': 99, 'SEO & Social Previews': 100, 'Rich Client Interactivity': 75, 'CDN Edge Cacheability': 100, 'Server Cost Efficiency': 94, 'Offline / Local-First Fit': 60 },
        bestFor: ['High-traffic e-commerce product pages, docs, blogs, and marketing sites', 'Protecting origin databases from viral traffic spikes via CDN absorption'],
        avoidWhen: ['Per-user private dashboards or sub-second live stock prices'],
        interviewPitch: 'ISR gives you static CDN speed and SEO with dynamic freshness via stale-while-revalidate background regeneration.'
      },
      {
        id: 'hybrid-rsc',
        name: 'Hybrid RSC (Server Components)',
        tagline: 'Streaming Server Trees + Granular Client Islands',
        color: '#a855f7',
        architectureSummary: 'Server Components execute exclusively on the server (0KB client JS bundle cost for heavy libraries) and stream UI via HTTP Suspense alongside interactive Client Components.',
        scores: { 'First Paint (FCP) Speed': 92, 'SEO & Social Previews': 98, 'Rich Client Interactivity': 92, 'CDN Edge Cacheability': 78, 'Server Cost Efficiency': 72, 'Offline / Local-First Fit': 40 },
        bestFor: ['Large full-stack consumer web apps (e.g., E-commerce + Interactive Checkout)', 'Keeping client JS bundles small while querying databases/APIs close to the server'],
        avoidWhen: ['Pure offline local-first apps with no server runtime'],
        interviewPitch: 'RSC eliminates client waterfall fetches and strips heavy formatting libraries from the browser bundle while preserving interactive client islands.'
      }
    ],
    dimensions: [
      {
        attributeName: 'TTFB vs First Contentful Paint (FCP)',
        values: {
          'csr-spa': 'Fast TTFB (empty shell), slower initial FCP until JS downloads & runs.',
          ssr: 'Slower TTFB (blocked on server data fetch), fast FCP once HTML arrives.',
          'ssg-isr': 'Ultra-fast TTFB & FCP (<30ms from nearest CDN edge location).',
          'hybrid-rsc': 'Fast TTFB + progressive FCP via HTTP streaming and Suspense boundaries.'
        }
      },
      {
        attributeName: 'Hydration & Bundle Cost',
        values: {
          'csr-spa': 'Full app JS shipped to client; zero server hydration mismatch.',
          ssr: 'Double data tax: HTML + serialized JSON hydration payload shipped to browser.',
          'ssg-isr': 'Static HTML + page JS bundle hydrated on client.',
          'hybrid-rsc': 'Server components ship zero JS to client; only "use client" islands hydrate.'
        }
      }
    ],
    decisionScenarios: [
      {
        prompt: 'Building a keyboard-first, local-first System Design Study Workbench that persists user progress in localStorage and runs offline with zero backend.',
        recommendedId: 'csr-spa',
        runnerUpId: 'ssg-isr',
        reasoning: 'All state transitions (simulators, radar charts, flashcards, Cmd+K palette) happen instantaneously in browser memory backed by localStorage with zero server dependency.',
        tradeoffAccepted: 'Initial bundle loads once, after which every view switch is 0ms local memory routing.'
      },
      {
        prompt: 'Global marketplace with 5M product listing pages where SEO drives 70% of revenue and prices update every few minutes.',
        recommendedId: 'ssg-isr',
        runnerUpId: 'hybrid-rsc',
        reasoning: 'Pre-building 5M pages at deploy time is too slow, and pure SSR hammers the origin DB. On-demand ISR caches pages at the CDN edge and revalidates in the background.',
        tradeoffAccepted: 'Users may briefly see a price cached for a few seconds until background revalidation completes.'
      }
    ]
  },
  {
    id: 'vector-search-olap',
    title: 'AI Vector Search, Full-Text & Real-Time OLAP Engines',
    category: 'Data Storage',
    difficulty: 'Staff+',
    summary: 'Head-to-head comparison of pgvector (Relational HNSW), Dedicated Vector Databases (Qdrant/Pinecone), Hybrid Search Engines (Elasticsearch/OpenSearch BM25 + Vector), and Columnar OLAP (ClickHouse).',
    tags: ['pgvector', 'Qdrant', 'Pinecone', 'Elasticsearch', 'ClickHouse', 'HNSW', 'IVF-PQ', 'BM25', 'RAG'],
    axes: ['ANN Vector Recall & Speed', 'Lexical & Hybrid Filtering', 'Analytical Aggregations', 'Write Ingestion Rate', 'Ops & Stack Simplicity', 'Transactional Join Integrity'],
    contenders: [
      {
        id: 'pgvector',
        name: 'pgvector (PostgreSQL HNSW)',
        tagline: 'Relational ACID + Embedded HNSW / IVFFlat Vector Index',
        color: '#3b82f6',
        architectureSummary: 'PostgreSQL extension storing float32/halfvec/binary embeddings directly alongside relational tables, supporting HNSW and IVFFlat indexes with iterative index scans for filtered vector queries.',
        scores: { 'ANN Vector Recall & Speed': 76, 'Lexical & Hybrid Filtering': 82, 'Analytical Aggregations': 65, 'Write Ingestion Rate': 62, 'Ops & Stack Simplicity': 98, 'Transactional Join Integrity': 100 },
        bestFor: ['RAG apps with <10M–50M vectors already using PostgreSQL as primary OLTP DB', 'Strict ACID joins between embeddings, user permissions (RBAC), and relational metadata', 'Avoiding dual-write synchronization lag between OLTP database and external vector store'],
        avoidWhen: ['Billion-scale vector collections requiring distributed horizontal memory sharding', 'Heavy concurrent embedding re-indexing saturating Postgres WAL and RAM buffer pool'],
        interviewPitch: 'Start with pgvector (HNSW + halfvec quantization) until you exceed ~50M vectors; eliminating dual-write sync bugs between Postgres and a separate Vector DB is a massive operational win.'
      },
      {
        id: 'qdrant-pinecone',
        name: 'Qdrant / Pinecone',
        tagline: 'Purpose-Built Distributed Vector Engine (HNSW + Scalar/Product Quantization)',
        color: '#a855f7',
        architectureSummary: 'Cloud-native Rust/C++ vector search engine using custom HNSW graphs with payload-aware filterable edges, Scalar (SQ8) / Binary / Product Quantization (PQ), and mmap disk-backed segments.',
        scores: { 'ANN Vector Recall & Speed': 99, 'Lexical & Hybrid Filtering': 84, 'Analytical Aggregations': 30, 'Write Ingestion Rate': 86, 'Ops & Stack Simplicity': 85, 'Transactional Join Integrity': 25 },
        bestFor: ['100M to 1B+ high-dimensional embeddings (768d–3072d) requiring <15ms p99 ANN latency', 'High-compression Scalar/Product Quantization (4x–32x RAM reduction) with minimal recall loss', 'Multi-tenant RAG namespaces with metadata pre-filtering integrated into HNSW graph traversal'],
        avoidWhen: ['Workloads needing complex relational SQL joins or group-by analytical rollups', 'Simple small-scale CRUD apps where an extra database synchronization pipeline is overkill'],
        interviewPitch: 'Choose a dedicated Vector DB when embedding volume crosses 50M–100M+ vectors and you need filterable HNSW + Product Quantization to keep RAM costs under control.'
      },
      {
        id: 'elasticsearch',
        name: 'Elasticsearch / OpenSearch',
        tagline: 'Distributed Inverted Index (BM25) + Lucene HNSW Hybrid Engine',
        color: '#f59e0b',
        architectureSummary: 'Sharded Apache Lucene segments combining immutable inverted indexes (BM25 lexical scoring, stemming, fuzzy matching, facets) with dense HNSW vector fields and Reciprocal Rank Fusion (RRF).',
        scores: { 'ANN Vector Recall & Speed': 84, 'Lexical & Hybrid Filtering': 100, 'Analytical Aggregations': 80, 'Write Ingestion Rate': 78, 'Ops & Stack Simplicity': 60, 'Transactional Join Integrity': 35 },
        bestFor: ['Enterprise Hybrid RAG combining exact keyword match (SKUs, error codes, legal terms) with dense semantic vectors', 'E-commerce product discovery needing faceted aggregations, geo-queries, and typo tolerance', 'Single-query Reciprocal Rank Fusion (RRF) without stitching two separate search backends'],
        avoidWhen: ['Using as a primary system of record (segment refresh lag + JVM GC pauses)', 'Ultra-dense billion-vector workloads where JVM heap overhead becomes prohibitive'],
        interviewPitch: 'Pure vector search fails on exact part numbers, acronyms, and proper nouns; Elasticsearch/OpenSearch is the gold standard when Hybrid BM25 + Vector RRF is required in one engine.'
      },
      {
        id: 'clickhouse',
        name: 'ClickHouse',
        tagline: 'Vectorized Columnar OLAP Engine with Sparse Primary Indexes',
        color: '#10b981',
        architectureSummary: 'Shared-nothing columnar storage using MergeTree parts, ZSTD/LZ4 compression (10x–20x), SIMD vectorized query execution, and brute-force/approximate cosine distance scans at 100GB/s memory bandwidth.',
        scores: { 'ANN Vector Recall & Speed': 70, 'Lexical & Hybrid Filtering': 75, 'Analytical Aggregations': 100, 'Write Ingestion Rate': 98, 'Ops & Stack Simplicity': 76, 'Transactional Join Integrity': 40 },
        bestFor: ['Real-time observability, LLM token telemetry, clickstreams, and billion-row sub-second GROUP BY dashboards', 'High-velocity append-only ingestion (millions of events/sec) with 10x columnar disk compression', 'Hybrid analytical + vector queries (e.g., cosine distance over a narrow time-partitioned window)'],
        avoidWhen: ['High-QPS point updates/deletes by single row ID (mutations rewrite whole MergeTree parts)', 'Ultra-low-latency (<5ms) high-concurrency pure ANN lookups across unpartitioned graphs'],
        interviewPitch: 'Use ClickHouse whenever the workload is real-time analytics, observability, or time-series rollups over billions of events—never for row-level OLTP mutations.'
      }
    ],
    dimensions: [
      {
        attributeName: 'Core Index & Search Internals',
        values: {
          pgvector: 'HNSW multi-layer navigable small-world graph or IVFFlat centroids stored in 8KB Postgres pages.',
          'qdrant-pinecone': 'Custom Rust/C++ HNSW with filterable payload links + Scalar/Product Quantization (SQ8/PQ).',
          elasticsearch: 'Lucene immutable segments: Inverted Index (Posting Lists + FST) + Lucene HNSW vector graph.',
          clickhouse: 'Columnar MergeTree files + Sparse Primary Index (every 8,192 rows) + SIMD AVX-512 scans.'
        },
        winnerNote: 'Qdrant/Pinecone win on pure high-dimensional ANN memory efficiency; Elasticsearch wins on BM25+Vector hybrid; ClickHouse wins on billion-row aggregations.'
      },
      {
        attributeName: 'Filtered Vector Search Problem (Pre vs Post Filtering)',
        values: {
          pgvector: 'PostgreSQL 0.8+ iterative HNSW index scans automatically continue graph traversal until LIMIT matches WHERE predicates.',
          'qdrant-pinecone': 'Filterable HNSW / Single-Stage filtering injects extra graph links per metadata facet to avoid disconnected graphs.',
          elasticsearch: 'Bitset pre-filtering over Lucene inverted index combined with HNSW graph search or exact kNN fallback.',
          clickhouse: 'Partition/primary-key pruning narrows granules first, then executes parallel SIMD L2/Cosine distance scan.'
        }
      },
      {
        attributeName: 'Memory Footprint for 100M x 1536d Float32 Vectors',
        values: {
          pgvector: '~600GB raw float32 + ~250GB HNSW graph overhead (can halve with halfvec fp16 or bit binary quantization).',
          'qdrant-pinecone': '~600GB raw reduced to ~150GB (SQ8) or ~20–40GB in RAM via Product Quantization + Disk-backed HNSW (mmap).',
          elasticsearch: 'High JVM off-heap memory requirement; supports int8/int4 scalar quantization in modern Lucene segments.',
          clickhouse: 'Compressed on disk via ZSTD + float16/bfloat16 codecs; streams columns from disk/OS pagecache without full-graph RAM lock.'
        }
      },
      {
        attributeName: 'Primary Production Failure Mode',
        values: {
          pgvector: 'HNSW index build memory spikes (maintenance_work_mem) and WAL write amplification hurting OLTP latency.',
          'qdrant-pinecone': 'Dual-write drift where source documents are deleted/updated in Postgres but orphan vectors remain in the Vector DB.',
          elasticsearch: 'JVM Heap OOM / Stop-the-World GC pauses and segment merge I/O storms under heavy concurrent re-indexing.',
          clickhouse: '"Too many parts" exception if clients issue small single-row INSERTs instead of micro-batched (1k–100k row) writes.'
        }
      }
    ],
    decisionScenarios: [
      {
        prompt: 'Enterprise AI Copilot indexing 8M internal knowledge-base chunks where strict per-user ACL permissions stored in PostgreSQL must filter every RAG retrieval.',
        recommendedId: 'pgvector',
        runnerUpId: 'qdrant-pinecone',
        reasoning: 'At 8M vectors (using halfvec fp16 + HNSW), a single beefy PostgreSQL instance holds the index in RAM while joining ACL permission tables transactionally with zero sync lag.',
        tradeoffAccepted: 'Vertical scaling ceiling on index build CPU/RAM if embeddings grow past ~50M–100M vectors.'
      },
      {
        prompt: 'Customer support & legal search engine across 80M documents where users search exact contract clauses, error hex codes ("0x80070005"), AND semantic natural language questions.',
        recommendedId: 'elasticsearch',
        runnerUpId: 'qdrant-pinecone',
        reasoning: 'Dense embeddings alone miss exact alphanumeric identifiers like "0x80070005". Elasticsearch executes BM25 lexical search + HNSW dense vector search in parallel and merges results via Reciprocal Rank Fusion (RRF).',
        tradeoffAccepted: 'Higher cluster operational complexity and ~1s Near-Real-Time (NRT) segment refresh delay.'
      },
      {
        prompt: 'AI Gateway telemetry platform ingesting 500,000 LLM prompt/completion audit events per second and powering live p95 latency, token cost, and tenant quota dashboards over 90 days.',
        recommendedId: 'clickhouse',
        runnerUpId: 'elasticsearch',
        reasoning: 'ClickHouse MergeTree ingests batched event streams at millions of rows/sec with 15x columnar compression and computes multi-billion-row p95/sum aggregations in <100ms via SIMD.',
        tradeoffAccepted: 'Cannot perform fast single-row transactional updates; data must be ingested in append-only batches.'
      }
    ]
  }
];
