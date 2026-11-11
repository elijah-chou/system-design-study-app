import { BaseStudyItem } from '../types';

export type ArchitectureTier = 'client' | 'edge' | 'compute' | 'messaging' | 'storage';

export interface ArchitectureNode {
  id: string;
  label: string;
  tier: ArchitectureTier;
  role: string;
  scalingStrategy: string;
  failureImpact: string;
  mitigation: string;
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label: string;
  protocol: string;
  pathType: 'read' | 'write' | 'both' | 'async';
}

export interface CaseStudyDeepDive {
  title: string;
  decision: string;
  alternativeRejected: string;
  tradeoffAccepted: string;
}

export interface CaseStudyScaleDefaults {
  dauMillions: number;
  readsPerUserDay: number;
  writesPerUserDay: number;
  avgPayloadBytes: number;
  retentionYears: number;
}

export interface CaseStudyItem extends BaseStudyItem {
  difficulty: 'Fundamental' | 'Intermediate' | 'Advanced' | 'Staff+';
  functionalReqs: string[];
  nonFunctionalReqs: string[];
  scaleDefaults: CaseStudyScaleDefaults;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  writePathSteps: string[];
  readPathSteps: string[];
  deepDives: CaseStudyDeepDive[];
}

export const CASE_STUDIES: CaseStudyItem[] = [
  {
    id: 'url-shortener',
    title: 'URL Shortener (TinyURL / Bitly)',
    category: 'Read-Heavy Web Systems',
    difficulty: 'Fundamental',
    summary: 'Design a high-throughput URL redirection and analytics service handling 100:1 read-to-write asymmetry with sub-10ms P99 redirects and collision-free 7-character Base62 tokens.',
    tags: ['Base62', 'Key Generation Service', 'Redis Cache-Aside', 'Bloom Filter', '301 vs 302'],
    functionalReqs: [
      'Generate unique 7-character Base62 ([0-9a-zA-Z]) short aliases for arbitrary long URLs.',
      'Support optional custom aliases and configurable link expiration TTLs.',
      'Redirect short URLs with minimal latency while capturing asynchronous click telemetry.'
    ],
    nonFunctionalReqs: [
      '99.99% redirect availability with P99 latency < 15ms globally.',
      'Zero token collision guarantee under concurrent write spikes (3.5T Base62 keyspace).',
      'Protect storage tier against cache-penetration attacks on non-existent short codes.'
    ],
    scaleDefaults: {
      dauMillions: 50,
      readsPerUserDay: 20,
      writesPerUserDay: 0.2,
      avgPayloadBytes: 500,
      retentionYears: 5
    },
    nodes: [
      { id: 'client', label: 'Web / Mobile Client', tier: 'client', role: 'Issues short-link creation POSTs and follows HTTP 301/302 redirects.', scalingStrategy: 'N/A (External caller)', failureImpact: 'Client-side DNS caching under 301 can skew analytics.', mitigation: 'Use HTTP 302 when real-time click analytics are required.' },
      { id: 'cdn-waf', label: 'Anycast Edge & Bloom Filter', tier: 'edge', role: 'Terminates TLS, blocks abusive IPs, and checks Bloom filter for known short codes.', scalingStrategy: 'Global Anycast PoPs with periodic Bloom filter sync.', failureImpact: 'Cache-miss storm hits origin API.', mitigation: 'Fallback to L7 API Gateway rate limiter.' },
      { id: 'redirect-svc', label: 'Redirect & Write API', tier: 'compute', role: 'Stateless service resolving short codes on read and minting URLs on write.', scalingStrategy: 'Horizontal auto-scaling on CPU/RPS.', failureImpact: 'Instance crash drops in-flight HTTP requests.', mitigation: 'Multi-AZ ALB health checks + zero-downtime rolling deploys.' },
      { id: 'kgs', label: 'Key Generation Service (KGS)', tier: 'compute', role: 'Pre-generates random 7-char Base62 ranges in etcd/DB and hands batches to API workers.', scalingStrategy: 'In-memory token batch leases (10k keys/worker).', failureImpact: 'Worker restart loses up to 10k unused keys (negligible in 3.5T space).', mitigation: 'Standby KGS replica with atomic range-claim locking.' },
      { id: 'redis-cache', label: 'Redis Cluster (L2 Cache)', tier: 'storage', role: 'Stores hot shortCode -> longUrl mappings (80/20 Pareto working set).', scalingStrategy: 'Consistent-hashed Redis Cluster shards with read replicas.', failureImpact: 'Shard failure spikes DB read QPS by 10x.', mitigation: 'Singleflight request coalescing + replica auto-promotion.' },
      { id: 'kafka-clicks', label: 'Kafka Click Stream', tier: 'messaging', role: 'Buffers redirect click events (GeoIP, Referrer, User-Agent) off the hot path.', scalingStrategy: 'Partitioned by shortCode hash.', failureImpact: 'Broker lag delays analytics dashboard updates.', mitigation: 'Async fire-and-forget producer with local ring buffer.' },
      { id: 'url-db', label: 'Sharded NoSQL / Postgres', tier: 'storage', role: 'Durable source of truth for shortCode -> longUrl mappings and metadata.', scalingStrategy: 'Hash-sharded by shortCode across independent nodes.', failureImpact: 'Primary shard outage blocks new writes to that hash range.', mitigation: 'Multi-AZ synchronous standby + read replicas.' }
    ],
    edges: [
      { from: 'client', to: 'cdn-waf', label: 'GET /:code / POST /urls', protocol: 'HTTPS', pathType: 'both' },
      { from: 'cdn-waf', to: 'redirect-svc', label: 'Validated Request', protocol: 'HTTP/2', pathType: 'both' },
      { from: 'redirect-svc', to: 'kgs', label: 'Lease Base62 Batch', protocol: 'gRPC', pathType: 'write' },
      { from: 'redirect-svc', to: 'redis-cache', label: 'GET / SETEX shortCode', protocol: 'RESP', pathType: 'both' },
      { from: 'redirect-svc', to: 'url-db', label: 'Insert / Cache-Miss Read', protocol: 'TCP', pathType: 'both' },
      { from: 'redirect-svc', to: 'kafka-clicks', label: 'Emit Click Event', protocol: 'Kafka', pathType: 'async' }
    ],
    writePathSteps: [
      'Client sends POST /api/v1/urls with longUrl and optional customAlias.',
      'Redirect & Write API leases a pre-generated 7-char Base62 token from local KGS memory buffer.',
      'API persists { shortCode, longUrl, createdAt, expiresAt } to Sharded URL DB.',
      'API warms Redis Cluster with SETEX(shortCode, TTL, longUrl) and updates Edge Bloom Filter.',
      'Returns 201 Created with https://sho.rt/aB9xYz1.'
    ],
    readPathSteps: [
      'Client requests GET https://sho.rt/aB9xYz1; Edge checks Bloom filter to reject bogus keys immediately.',
      'Redirect Service queries Redis Cluster (95%+ hit rate, <1ms latency).',
      'On cache miss, service uses singleflight lock to query Sharded DB once and populate Redis.',
      'Service asynchronously publishes click telemetry event to Kafka Click Stream.',
      'Returns HTTP 302 Found (analytics enabled) or 301 Moved Permanently with Location header.'
    ],
    deepDives: [
      {
        title: 'Pre-Generated KGS vs MD5/SHA256 Truncation',
        decision: 'Use a dedicated Key Generation Service (KGS) that pre-populates random 7-char Base62 tokens and leases blocks of 10,000 keys to API servers in memory.',
        alternativeRejected: 'Hashing longUrl with MD5/SHA-256 and taking the first 7 Base62 characters.',
        tradeoffAccepted: 'Wastes up to 10k keys if an API pod crashes, which is 0.0000003% of the 62^7 (3.52 trillion) keyspace, in exchange for zero DB collision checks on writes.'
      },
      {
        title: 'HTTP 301 (Permanent) vs HTTP 302 (Temporary) Redirects',
        decision: 'Default to HTTP 302 Found for analytics-tracked links, and offer HTTP 301 Moved Permanently as an opt-in performance mode.',
        alternativeRejected: 'Always returning HTTP 301 to minimize server load.',
        tradeoffAccepted: 'Higher edge/origin read QPS because browsers do not permanently cache 302 redirects locally, preserving accurate click-through attribution.'
      }
    ]
  },
  {
    id: 'distributed-rate-limiter',
    title: 'Distributed Rate Limiter (Stripe / Cloudflare)',
    category: 'Edge & Traffic Control',
    difficulty: 'Intermediate',
    summary: 'Design a low-latency distributed L7 traffic governor enforcing per-tenant quotas and burst limits across global API gateways without becoming a synchronous bottleneck.',
    tags: ['Token Bucket', 'Sliding Window', 'Redis Lua', 'Fail-Open', 'HTTP 429'],
    functionalReqs: [
      'Enforce configurable rate rules per API key, IP, route, and tenant tier (e.g., 100 req/sec, burst 200).',
      'Return standard rate-limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After) and HTTP 429.',
      'Support dynamic rule hot-reloading without restarting gateway proxies.'
    ],
    nonFunctionalReqs: [
      'Add < 2ms P99 overhead to the API gateway request critical path.',
      'Prevent race conditions ("check-then-act" drift) under concurrent multi-gateway bursts.',
      'Degrade gracefully (configurable Fail-Open vs Fail-Closed) if the state store is unreachable.'
    ],
    scaleDefaults: {
      dauMillions: 100,
      readsPerUserDay: 50,
      writesPerUserDay: 50,
      avgPayloadBytes: 128,
      retentionYears: 1
    },
    nodes: [
      { id: 'api-client', label: 'SDK / API Caller', tier: 'client', role: 'Sends authenticated API requests and honors Retry-After backoff headers.', scalingStrategy: 'Exponential backoff with full jitter on 429.', failureImpact: 'Retry storms amplify outage if client lacks jitter.', mitigation: 'Enforce strict edge token-bucket drop before TLS.' },
      { id: 'envoy-edge', label: 'Envoy L7 API Gateway', tier: 'edge', role: 'Intercepts requests, checks local L1 quota batch, or invokes rate-limit filter.', scalingStrategy: 'Stateless Anycast edge fleet.', failureImpact: 'Gateway overload drops all ingress traffic.', mitigation: 'Circuit breaker with Fail-Open fallback on Redis timeout (>5ms).' },
      { id: 'rl-service', label: 'Rate Limiter gRPC Service', tier: 'compute', role: 'Evaluates matching tenant rules and executes atomic Lua scripts against Redis.', scalingStrategy: 'Horizontal Kubernetes pods with gRPC keepalives.', failureImpact: 'Pod failure triggers Envoy circuit breaker.', mitigation: 'Local token batching + multi-AZ pod anti-affinity.' },
      { id: 'rule-config', label: 'Config Control Plane (etcd)', tier: 'compute', role: 'Pushes rate-limit policy diffs (tenant tiers, emergency blocks) to gateways.', scalingStrategy: 'Watch-stream push to in-memory gateway caches.', failureImpact: 'Stale rules persist briefly during control plane partition.', mitigation: 'Last-known-good local snapshot on disk.' },
      { id: 'redis-rl', label: 'Redis Cluster (Lua State)', tier: 'storage', role: 'Holds active token buckets and sliding-window counters in RAM with short TTLs.', scalingStrategy: 'Hash-slot sharding by tenantId/IP.', failureImpact: 'Hot tenant key can saturate a single Redis CPU core.', mitigation: 'Local L1 token pre-reservation for ultra-high-volume keys.' },
      { id: 'metrics-sink', label: 'Prometheus / ClickHouse', tier: 'messaging', role: 'Collects asynchronous throttle telemetry and abuse alerts.', scalingStrategy: 'Batched async metric flushing.', failureImpact: 'Delayed visibility into throttling spikes.', mitigation: 'Drop non-critical telemetry under memory pressure.' }
    ],
    edges: [
      { from: 'api-client', to: 'envoy-edge', label: 'API Request', protocol: 'HTTPS', pathType: 'both' },
      { from: 'envoy-edge', to: 'rl-service', label: 'ShouldRateLimit()', protocol: 'gRPC', pathType: 'both' },
      { from: 'rule-config', to: 'rl-service', label: 'Watch Policy Rules', protocol: 'gRPC', pathType: 'read' },
      { from: 'rl-service', to: 'redis-rl', label: 'EVALSHA TokenBucket.lua', protocol: 'RESP', pathType: 'write' },
      { from: 'rl-service', to: 'metrics-sink', label: 'Async 429 Telemetry', protocol: 'UDP/HTTP', pathType: 'async' }
    ],
    writePathSteps: [
      'Envoy Gateway receives request, extracts (tenantId, route, IP), and calls Rate Limiter Service over gRPC.',
      'Rate Limiter executes pre-loaded Redis EVALSHA Lua script passing key, capacity, refillRate, and current timestamp.',
      'Inside single-threaded Redis Lua: calculates elapsed time since last_refill, adds accrued tokens (capped at capacity), and decrements 1 token.',
      'Redis atomically updates { tokens, last_refill } with PSETEX TTL and returns [allowed, remaining, retryAfterMs].'
    ],
    readPathSteps: [
      'Rate Limiter Service receives atomic tuple [allowed=1, remaining=42, retryAfter=0] from Redis.',
      'If allowed, Envoy injects X-RateLimit-Remaining header and forwards request to upstream microservice.',
      'If rejected (allowed=0), Envoy short-circuits immediately with HTTP 429 Too Many Requests and Retry-After header.',
      'Async telemetry worker logs throttled tenant counters to ClickHouse/Prometheus.'
    ],
    deepDives: [
      {
        title: 'Atomic Redis Lua Script vs Application Read-Modify-Write',
        decision: 'Execute token bucket refill and decrement inside a single Redis EVALSHA Lua script (or Sliding Window Counter approximation).',
        alternativeRejected: 'Issuing GET in application code, computing remaining tokens, and issuing SET.',
        tradeoffAccepted: 'Couples rate-limit logic to Redis Lua engine, but completely eliminates race conditions under concurrent bursts and halves network RTTs.'
      },
      {
        title: 'Fail-Open vs Fail-Closed Circuit Breaking',
        decision: 'Default to Fail-Open with a strict 5ms circuit-breaker timeout on Redis calls for general APIs, while enabling local in-memory fallback limits.',
        alternativeRejected: 'Fail-Closed (rejecting all traffic with 503/429 whenever Redis experiences a network blip).',
        tradeoffAccepted: 'Briefly allows minor quota overages during Redis failovers rather than turning a cache blip into a 100% platform-wide outage.'
      }
    ]
  },
  {
    id: 'realtime-chat',
    title: 'Real-Time Chat (WhatsApp / Discord)',
    category: 'Stateful & Messaging Systems',
    difficulty: 'Advanced',
    summary: 'Design a stateful low-latency messaging platform supporting 1:1 chats, large group channels, online presence heartbeats, and multi-device message synchronization.',
    tags: ['WebSockets', 'Stateful Gateway', 'Cassandra LSM', 'Snowflake ID', 'Presence Fan-Out'],
    functionalReqs: [
      'Deliver 1:1 and group chat messages in real time (<100ms) with Sent, Delivered, and Read receipts.',
      'Persist chat history indefinitely and sync missed messages when offline devices reconnect.',
      'Track and broadcast online/offline user presence status with minimal battery and network drain.'
    ],
    nonFunctionalReqs: [
      'Strict per-channel chronological message ordering using time-sortable IDs.',
      'At-least-once delivery with client-side idempotency deduplication.',
      'Support millions of concurrent long-lived TCP/WebSocket connections across stateful gateways.'
    ],
    scaleDefaults: {
      dauMillions: 100,
      readsPerUserDay: 80,
      writesPerUserDay: 40,
      avgPayloadBytes: 400,
      retentionYears: 5
    },
    nodes: [
      { id: 'chat-client', label: 'Mobile / Desktop App', tier: 'client', role: 'Maintains persistent WebSocket connection and local SQLite message cache.', scalingStrategy: 'Client-side cursor sync + idempotency key generation.', failureImpact: 'Network drop stalls live delivery.', mitigation: 'Fallback to APNs/FCM push notification when socket closes.' },
      { id: 'ws-gateway', label: 'Stateful WebSocket Gateway', tier: 'edge', role: 'Holds 100k+ open TCP sockets per node and routes frames to/from connected users.', scalingStrategy: 'L4 NLB connection balancing + ephemeral port tuning.', failureImpact: 'Node crash disconnects 100k active sockets simultaneously.', mitigation: 'Jittered client reconnect backoff to prevent thundering herd.' },
      { id: 'chat-router', label: 'Chat Routing & Group Service', tier: 'compute', role: 'Assigns Snowflake IDs, persists messages, resolves recipient gateways, and fans out.', scalingStrategy: 'Stateless horizontal worker fleet.', failureImpact: 'Failed worker retries via client ACK timeout.', mitigation: 'Idempotent message_id deduplication.' },
      { id: 'session-redis', label: 'Redis Session & Presence Cluster', tier: 'storage', role: 'Maps userId -> active gatewayNodeId and tracks heartbeat TTLs.', scalingStrategy: 'Sharded Redis Cluster with Pub/Sub channel per gateway.', failureImpact: 'Lost session map prevents real-time push routing.', mitigation: 'Gateway re-registers active sockets via heartbeat.' },
      { id: 'kafka-push', label: 'Kafka Fan-Out & Push Bus', tier: 'messaging', role: 'Decouples large group fan-out and offline APNs/FCM push notifications.', scalingStrategy: 'Partitioned by channelId.', failureImpact: 'Delayed push notifications for offline users.', mitigation: 'Dedicated priority partitions for 1:1 vs mega-groups.' },
      { id: 'cassandra-msg', label: 'Cassandra / ScyllaDB Cluster', tier: 'storage', role: 'Stores immutable chat history partitioned by (channel_id, bucket_id) sorted by message_id.', scalingStrategy: 'LSM-tree write-optimized ring with tunable quorum.', failureImpact: 'Wide-partition hotspotting on huge Discord servers.', mitigation: 'Time-bucketed partition keys (channel_id + day_bucket).' }
    ],
    edges: [
      { from: 'chat-client', to: 'ws-gateway', label: 'WSS Frame / Heartbeat', protocol: 'WebSocket', pathType: 'both' },
      { from: 'ws-gateway', to: 'chat-router', label: 'Forward Message / Sync', protocol: 'gRPC', pathType: 'both' },
      { from: 'chat-router', to: 'session-redis', label: 'Lookup Recipient Gateway', protocol: 'RESP', pathType: 'both' },
      { from: 'chat-router', to: 'cassandra-msg', label: 'Write / Cursor Fetch', protocol: 'CQL', pathType: 'both' },
      { from: 'chat-router', to: 'kafka-push', label: 'Offline Push / Group Fanout', protocol: 'Kafka', pathType: 'async' }
    ],
    writePathSteps: [
      'Sender transmits message frame with client_msg_id over persistent WebSocket to WS Gateway A.',
      'Chat Routing Service generates a time-ordered 64-bit Snowflake message_id and writes to Cassandra partition (channel_id, bucket_id).',
      'Service queries Redis Session Registry to look up recipient userId -> WS Gateway B.',
      'If recipient is online, routes frame directly to WS Gateway B via internal gRPC/Redis PubSub and pushes to recipient socket.',
      'If recipient is offline, publishes payload to Kafka Push Bus for APNs/FCM delivery.'
    ],
    readPathSteps: [
      'Reconnecting client sends last_seen_message_id cursor over WebSocket.',
      'Chat Service queries Cassandra clustering range WHERE channel_id = ? AND bucket_id = ? AND message_id > last_seen.',
      'Streams missing message batch back to client local SQLite store.',
      'Presence pull/subscribe checks Redis TTL keys only for active viewport friends.'
    ],
    deepDives: [
      {
        title: 'Cassandra Time-Bucketed LSM Partitions vs B+Tree RDBMS',
        decision: 'Store messages in Cassandra/ScyllaDB with composite partition key ((channel_id, time_bucket), message_id DESC).',
        alternativeRejected: 'Single-key partitioning by channel_id alone or unsharded PostgreSQL B+Tree indexes.',
        tradeoffAccepted: 'Cross-bucket pagination requires querying consecutive buckets, but avoids unbounded partition growth (>100MB limit) in active channels and sustains sequential LSM append throughput.'
      },
      {
        title: 'Viewport-Scoped Presence vs Global Friend-List Broadcast',
        decision: 'Update user heartbeat in Redis with a 30s TTL and only push presence changes to active DM partners or visible channel viewports.',
        alternativeRejected: 'Broadcasting every online/offline transition to all 1,000+ friends/server members immediately.',
        tradeoffAccepted: 'Presence status in background tabs may lag by up to 30s, eliminating the O(N^2) presence heartbeat amplification storm.'
      }
    ]
  },
  {
    id: 'news-feed',
    title: 'Social Media News Feed (Twitter / X)',
    category: 'Read-Heavy Web Systems',
    difficulty: 'Advanced',
    summary: 'Design a real-time social home timeline combining sub-50ms feed reads with resilient fan-out across normal users and 50M-follower celebrity accounts.',
    tags: ['Hybrid Fan-Out', 'Celebrity Problem', 'Redis ZSET', 'Two-Tier Cache', 'Cursor Pagination'],
    functionalReqs: [
      'Users can publish posts (text/media references) and view a ranked or chronological home timeline.',
      'Support following/unfollowing accounts of any scale (from 10 to 100M+ followers).',
      'Support fast cursor-based infinite scrolling with live engagement counts (likes, reposts).'
    ],
    nonFunctionalReqs: [
      'Home timeline P99 read latency < 150ms at 300k+ read QPS.',
      'New posts appear in followers timelines within < 5 seconds (eventual consistency).',
      'Prevent hot-key celebrity tweets from causing backpressure across background fan-out queues.'
    ],
    scaleDefaults: {
      dauMillions: 200,
      readsPerUserDay: 25,
      writesPerUserDay: 1.5,
      avgPayloadBytes: 1024,
      retentionYears: 5
    },
    nodes: [
      { id: 'feed-client', label: 'Mobile / Web Client', tier: 'client', role: 'Renders hydrated feed items and paginates via max_post_id cursor.', scalingStrategy: 'Client-side viewport prefetching.', failureImpact: 'Stale engagement counters if cached locally.', mitigation: 'Short TTL on counter hydration.' },
      { id: 'api-gw', label: 'API Gateway & Edge CDN', tier: 'edge', role: 'Serves static media from CDN and routes API calls to Post or Timeline services.', scalingStrategy: 'Global edge caching for media blobs.', failureImpact: 'Origin saturation on viral media.', mitigation: 'Origin shield + signed CDN URLs.' },
      { id: 'post-fanout', label: 'Post & Hybrid Fan-Out Workers', tier: 'compute', role: 'Writes post, checks follower threshold (<50k), and pushes postId to active follower caches.', scalingStrategy: 'Autoscaled Kafka consumer groups.', failureImpact: 'Fan-out lag delays feed delivery.', mitigation: 'Skip push for celebrity accounts (>50k followers) and inactive users.' },
      { id: 'timeline-svc', label: 'Timeline Mixer & Ranker', tier: 'compute', role: 'Merges pre-computed Redis ZSET timeline with pulled celebrity posts and hydrates objects.', scalingStrategy: 'Stateless compute fleet.', failureImpact: 'Ranking timeout slows feed load.', mitigation: 'Fallback to chronological unranked Redis ZSET slice.' },
      { id: 'kafka-feed', label: 'Kafka Post Event Stream', tier: 'messaging', role: 'Buffers post creation events for asynchronous fan-out-on-write workers.', scalingStrategy: 'Partitioned by authorId.', failureImpact: 'Viral burst builds consumer lag.', mitigation: 'Separate fast-lane topics for normal vs high-follower authors.' },
      { id: 'redis-timeline', label: 'Redis Timeline & Post Cache', tier: 'storage', role: 'Two-tier cache: ZSET(userId -> [postId, score]) capped at 800 IDs + Hash(postId -> payload).', scalingStrategy: 'Sharded Redis Cluster in RAM.', failureImpact: 'Cold cache requires expensive DB reconstruction.', mitigation: 'Only cache timelines for users active within the last 14 days.' },
      { id: 'social-graph-db', label: 'Social Graph & Post DB', tier: 'storage', role: 'Stores follower edges (FlockDB/Cassandra) and durable post entities.', scalingStrategy: 'Sharded by userId and postId.', failureImpact: 'Shard slow-down impacts cold-user feed generation.', mitigation: 'Read replicas + graph adjacency caching.' }
    ],
    edges: [
      { from: 'feed-client', to: 'api-gw', label: 'GET /feed / POST /tweet', protocol: 'HTTPS', pathType: 'both' },
      { from: 'api-gw', to: 'post-fanout', label: 'Create Post', protocol: 'gRPC', pathType: 'write' },
      { from: 'post-fanout', to: 'kafka-feed', label: 'Publish PostCreated', protocol: 'Kafka', pathType: 'async' },
      { from: 'post-fanout', to: 'social-graph-db', label: 'Persist Post & Read Followers', protocol: 'CQL/SQL', pathType: 'write' },
      { from: 'post-fanout', to: 'redis-timeline', label: 'ZADD Follower Timelines', protocol: 'RESP', pathType: 'write' },
      { from: 'api-gw', to: 'timeline-svc', label: 'Fetch Home Feed', protocol: 'gRPC', pathType: 'read' },
      { from: 'timeline-svc', to: 'redis-timeline', label: 'ZREVRANGE + MGET Hydrate', protocol: 'RESP', pathType: 'read' }
    ],
    writePathSteps: [
      'Author submits post; Post Service persists entity to Post DB, caches it in Redis Post Cache, and emits event to Kafka.',
      'Fan-Out Worker checks author follower count in Social Graph cache.',
      'If author has < 50,000 followers (Push path): worker fetches active follower IDs and pipelines ZADD user_feed:{followerId} {timestamp} {postId} (capped at 800 IDs via ZREMRANGEBYRANK).',
      'If author has >= 50,000 followers (Celebrity Pull path): worker only appends postId to author_feed:{celebId} and skips follower fan-out.'
    ],
    readPathSteps: [
      'User requests home feed; Timeline Service fetches pre-computed postId list from Redis ZSET user_feed:{userId}.',
      'Service checks user followed-celebrities list and pulls recent postIds from each author_feed:{celebId} ZSET.',
      'Timeline Mixer merges, deduplicates, and ranks top N postIds in memory.',
      'Executes single batched MGET against Redis Post Cache + Counter Cache to hydrate full JSON objects and returns response.'
    ],
    deepDives: [
      {
        title: 'Hybrid Fan-Out (Push + Pull) vs Pure Fan-Out-on-Write',
        decision: 'Push post IDs on write for normal accounts (<50k followers), but pull on read for high-follower celebrity accounts.',
        alternativeRejected: 'Pure fan-out-on-write for all users regardless of follower count.',
        tradeoffAccepted: 'Slightly more complex read path (merging pushed ZSET with pulled celebrity ZSETs), eliminating the 50M-write celebrity fan-out lag spike.'
      },
      {
        title: 'Two-Tier Pointer Cache (IDs Only) vs Full-Object Timeline Cache',
        decision: 'Store only 8-byte {postId, timestamp} pointers in per-user Redis ZSETs and hydrate normalized post payloads via MGET from a shared Post Cache.',
        alternativeRejected: 'Duplicating full 1KB JSON post objects inside every follower timeline list.',
        tradeoffAccepted: 'Requires an extra MGET round-trip on read, but reduces Redis RAM footprint by >90% and makes post edits/deletions/like-count updates O(1).'
      }
    ]
  },
  {
    id: 'notification-system',
    title: 'Multi-Channel Notification System',
    category: 'Stateful & Messaging Systems',
    difficulty: 'Intermediate',
    summary: 'Design a high-throughput multi-channel delivery pipeline (APNs, FCM, SMS, Email) with priority lane isolation, idempotency deduplication, and third-party vendor resilience.',
    tags: ['Bulkhead Queues', 'Idempotency', 'Kafka Priority Lanes', 'Dead Letter Queue', 'Exponential Backoff'],
    functionalReqs: [
      'Deliver transactional and marketing notifications across iOS (APNs), Android (FCM), SMS (Twilio), and Email (SES).',
      'Enforce user opt-out preferences, quiet hours, and per-user daily frequency caps.',
      'Prevent duplicate notifications when upstream callers or internal workers retry.'
    ],
    nonFunctionalReqs: [
      'Strict SLA isolation: P0 security OTPs must deliver in < 2s even during a 50M-user P2 marketing blast.',
      'At-least-once delivery with 99.9%+ deduplication accuracy.',
      'Resilient retry handling with exponential backoff, jitter, and Dead Letter Queues (DLQ) during vendor outages.'
    ],
    scaleDefaults: {
      dauMillions: 80,
      readsPerUserDay: 5,
      writesPerUserDay: 15,
      avgPayloadBytes: 600,
      retentionYears: 1
    },
    nodes: [
      { id: 'caller-svc', label: 'Upstream Microservices', tier: 'client', role: 'Auth, Billing, and Marketing services emitting notification requests with idempotency_key.', scalingStrategy: 'Async SDK client with retry policy.', failureImpact: 'Caller timeout causes duplicate retry requests.', mitigation: 'Mandatory UUID idempotency_key header.' },
      { id: 'ingest-api', label: 'Notification Ingestion API', tier: 'edge', role: 'Validates schema, checks idempotency store, verifies user opt-in, and routes to priority topic.', scalingStrategy: 'Stateless autoscaled API pods.', failureImpact: 'Ingestion bottleneck blocks upstream callers.', mitigation: 'Fast schema validation + immediate Kafka enqueue.' },
      { id: 'dedup-redis', label: 'Redis Idempotency & Quota Store', tier: 'storage', role: 'Enforces SET key NX EX 86400 deduplication and per-user daily rate caps.', scalingStrategy: 'Redis Cluster sharded by userId.', failureImpact: 'Cache miss risks rare duplicate send.', mitigation: 'Fallback check against Cassandra delivery log.' },
      { id: 'kafka-lanes', label: 'Priority Kafka Topics (P0/P1/P2)', tier: 'messaging', role: 'Isolates P0 (OTP/Fraud), P1 (Transactional), and P2 (Promotional) workloads per channel.', scalingStrategy: 'Separate topics + dedicated consumer groups.', failureImpact: 'P2 backlog grows to millions during campaign.', mitigation: 'Bulkhead isolation keeps P0 consumer lag at zero.' },
      { id: 'channel-workers', label: 'Channel Workers & Retry Engine', tier: 'compute', role: 'Renders templates, governs vendor rate limits, and dispatches to APNs/FCM/Twilio/SES.', scalingStrategy: 'Independent worker pools per (channel, priority).', failureImpact: '3rd-party SMS vendor outage stalls SMS workers.', mitigation: 'Circuit breaker switches to secondary vendor + Retry Topic / DLQ.' },
      { id: 'audit-db', label: 'Device Registry & Delivery Log DB', tier: 'storage', role: 'Stores user device tokens, preferences, and delivery state transitions (PENDING -> SENT -> DELIVERED).', scalingStrategy: 'Read-replicated Postgres for prefs + Cassandra for logs.', failureImpact: 'Stale device tokens cause high bounce rate.', mitigation: 'Webhook processor prunes invalid APNs/FCM tokens.' }
    ],
    edges: [
      { from: 'caller-svc', to: 'ingest-api', label: 'POST /notify (idempotency_key)', protocol: 'HTTPS/gRPC', pathType: 'write' },
      { from: 'ingest-api', to: 'dedup-redis', label: 'SET NX Dedup + Check Cap', protocol: 'RESP', pathType: 'both' },
      { from: 'ingest-api', to: 'audit-db', label: 'Read Prefs & Device Tokens', protocol: 'SQL/CQL', pathType: 'read' },
      { from: 'ingest-api', to: 'kafka-lanes', label: 'Enqueue to P0 / P1 / P2 Topic', protocol: 'Kafka', pathType: 'async' },
      { from: 'kafka-lanes', to: 'channel-workers', label: 'Consume by Priority & Channel', protocol: 'Kafka', pathType: 'async' },
      { from: 'channel-workers', to: 'audit-db', label: 'Update Delivery Status / Webhook', protocol: 'CQL', pathType: 'write' }
    ],
    writePathSteps: [
      'Caller invokes POST /v1/notify with idempotency_key, userId, priority (P0/P1/P2), and template params.',
      'Ingestion API executes atomic Redis SET dedup:{idempotency_key} NX EX 86400; if key exists, returns 202 Accepted immediately.',
      'API fetches cached user preferences and device tokens, filtering out opted-out channels or users over daily frequency caps.',
      'Enqueues enriched payload to channel-specific Priority Kafka Topic (e.g., sms.p0.critical vs push.p2.promo).',
      'Dedicated Channel Worker consumes message, renders localized template, dispatches to external vendor, and logs status.'
    ],
    readPathSteps: [
      'External vendor (Twilio/SES/FCM) sends delivery receipt or bounce webhook to Webhook Receiver.',
      'Receiver updates notification state to DELIVERED or BOUNCED in Delivery Log DB.',
      'On transient 5xx/429 vendor error, worker publishes message to tiered retry topics (1m, 5m, 30m backoff) before routing to DLQ.',
      'User opening in-app notification drawer reads recent records from Delivery Log DB.'
    ],
    deepDives: [
      {
        title: 'Bulkhead Priority Topic Isolation (P0/P1/P2) vs Single FIFO Queue',
        decision: 'Physically separate Kafka topics and worker pools by both priority tier (P0 Critical, P1 Transactional, P2 Promotional) and delivery channel.',
        alternativeRejected: 'A single unified notification topic shared by all message types and channels.',
        tradeoffAccepted: 'Higher operational topic/worker count, but guarantees a 50-million-message marketing blast or an Email vendor outage never delays a P0 2FA login code.'
      },
      {
        title: 'Two-Stage Idempotency & Outbox Deduplication',
        decision: 'Enforce atomic Redis SET NX at ingestion AND pass deterministic provider message IDs to downstream vendors.',
        alternativeRejected: 'Relying solely on Kafka at-least-once consumer offsets without application deduplication.',
        tradeoffAccepted: 'Extra Redis memory for 24h key retention, preventing users from receiving duplicate SMS charges or repeated push alerts during worker rebalances.'
      }
    ]
  },
  {
    id: 'distributed-kv-store',
    title: 'Distributed Key-Value Store (Dynamo / Cassandra)',
    category: 'Storage & Consensus Engines',
    difficulty: 'Staff+',
    summary: 'Design a leaderless, highly available distributed storage engine using consistent hashing with virtual nodes, tunable quorum, vector clocks, and LSM-tree storage.',
    tags: ['Consistent Hashing', 'Tunable Quorum', 'Hinted Handoff', 'Merkle Trees', 'LSM-Tree', 'Gossip Protocol'],
    functionalReqs: [
      'Expose fast get(key) and put(key, value, context) APIs hashed across a cluster of commodity storage nodes.',
      'Allow per-request tunable consistency levels (ONE, QUORUM, ALL) via N, R, and W parameters.',
      'Automatically rebalance partitions when nodes join or leave the cluster with minimal data movement.'
    ],
    nonFunctionalReqs: [
      'No Single Point of Failure (leaderless peer-to-peer ring architecture).',
      'Always-writable availability option under network partitions via Sloppy Quorum and Hinted Handoff.',
      'High sequential write throughput using CommitLog + MemTable + immutable SSTables with Bloom filters.'
    ],
    scaleDefaults: {
      dauMillions: 100,
      readsPerUserDay: 100,
      writesPerUserDay: 50,
      avgPayloadBytes: 2048,
      retentionYears: 3
    },
    nodes: [
      { id: 'kv-client', label: 'Smart SDK Client', tier: 'client', role: 'Hashes key using ring topology map and routes request to any coordinator node.', scalingStrategy: 'Token-aware client routing.', failureImpact: 'Stale ring map adds 1 extra hop.', mitigation: 'Piggyback topology gossip updates on responses.' },
      { id: 'coordinator', label: 'Coordinator Node (Any Peer)', tier: 'edge', role: 'Acts as request proxy for key k, fanning out reads/writes to N preference-list replicas.', scalingStrategy: 'Every storage node acts as coordinator.', failureImpact: 'Coordinator crash fails single in-flight call.', mitigation: 'Client retries against next replica in preference list.' },
      { id: 'gossip-ring', label: 'Gossip & Accrual Failure Detector', tier: 'compute', role: 'Exchanges ring membership and Phi-accrual health scores with random peers every 1s.', scalingStrategy: 'Decentralized O(log N) epidemic dissemination.', failureImpact: 'Temporary split view of downed nodes.', mitigation: 'Sloppy quorum routes writes to healthy handoff nodes.' },
      { id: 'replica-nodes', label: 'Preference List Replicas (N=3)', tier: 'compute', role: 'Executes quorum reads/writes and detects concurrent version conflicts via Vector Clocks / LWW.', scalingStrategy: '256 Virtual Nodes (vnodes) per physical machine.', failureImpact: 'Single replica outage reduces redundancy to N-1.', mitigation: 'Tunable Quorum (R=2, W=2) masks 1 failed node seamlessly.' },
      { id: 'anti-entropy', label: 'Hinted Handoff & Merkle Repair', tier: 'messaging', role: 'Replays hinted handoff logs when downed nodes recover and compares Merkle hash trees in background.', scalingStrategy: 'Throttled background streaming.', failureImpact: 'Long partition causes Merkle tree divergence.', mitigation: 'Scheduled incremental anti-entropy repair + Read Repair.' },
      { id: 'lsm-engine', label: 'Local LSM Storage (WAL + SSTable)', tier: 'storage', role: 'Appends to disk CommitLog, buffers in RAM MemTable, and flushes immutable SSTables with Bloom filters.', scalingStrategy: 'Leveled / Size-Tiered background compaction.', failureImpact: 'Compaction I/O spike increases read tail latency.', mitigation: 'Per-SSTable Bloom filters + compaction I/O throttling.' }
    ],
    edges: [
      { from: 'kv-client', to: 'coordinator', label: 'PUT / GET(key, R, W)', protocol: 'gRPC/Custom TCP', pathType: 'both' },
      { from: 'coordinator', to: 'gossip-ring', label: 'Resolve Token Ring & Health', protocol: 'UDP Gossip', pathType: 'both' },
      { from: 'coordinator', to: 'replica-nodes', label: 'Fan-out to N=3 Replicas', protocol: 'Internal RPC', pathType: 'both' },
      { from: 'replica-nodes', to: 'lsm-engine', label: 'CommitLog Append + MemTable / SSTable', protocol: 'Disk I/O', pathType: 'both' },
      { from: 'replica-nodes', to: 'anti-entropy', label: 'Read Repair & Merkle Sync', protocol: 'Background RPC', pathType: 'async' }
    ],
    writePathSteps: [
      'Client sends PUT(key, value) to Coordinator; Coordinator hashes key via SHA-1/Murmur3 onto Consistent Hash Ring to find N=3 healthy vnode replicas.',
      'Coordinator sends parallel write RPCs to all N=3 replicas (or writes a Hinted Handoff locally if a target replica is unreachable under Sloppy Quorum).',
      'Each replica appends mutation sequentially to disk CommitLog (for crash durability) and inserts into in-memory Red-Black/SkipList MemTable.',
      'Once W=2 replicas acknowledge success, Coordinator returns 200 OK to client; remaining replica completes asynchronously.',
      'When MemTable fills, replica flushes immutable sorted SSTable + Bloom filter to disk and compacts segments in the background.'
    ],
    readPathSteps: [
      'Client sends GET(key) to Coordinator; Coordinator sends read requests (or 1 full data read + R-1 digest hash reads) to N=3 replicas.',
      'Each replica checks in-memory MemTable first; if not found, checks per-SSTable Bloom filters in RAM to skip SSTables that do not contain key.',
      'Coordinator waits for R=2 responses; if digests match, returns value immediately to client.',
      'If version timestamps / vector clocks diverge, Coordinator returns latest/merged value and triggers asynchronous Read Repair to update stale replica.'
    ],
    deepDives: [
      {
        title: 'Leaderless Tunable Quorum (R + W > N) vs Raft/Paxos Single-Leader',
        decision: 'Use a leaderless Dynamo ring with tunable per-request consistency (N=3, W=2, R=2 for strong overlap; W=1 for ultra-fast writes).',
        alternativeRejected: 'Single-leader Raft/Paxos replication per shard.',
        tradeoffAccepted: 'Must resolve concurrent write conflicts via Last-Write-Wins (LWW) or Vector Clocks, in exchange for zero leader-election downtime and multi-region write availability.'
      },
      {
        title: 'LSM-Tree + Bloom Filters vs In-Place B+Tree Storage',
        decision: 'Use an append-only Log-Structured Merge (LSM) tree (CommitLog + MemTable + immutable SSTables) augmented with in-memory Bloom filters.',
        alternativeRejected: 'B+Tree storage engine performing random in-place page overwrites.',
        tradeoffAccepted: 'Read amplification across multiple SSTables and background compaction CPU/IO overhead, traded for 10x higher sequential write throughput without disk fragmentation.'
      }
    ]
  },
  {
    id: 'llm-rag-gateway',
    title: 'Enterprise AI / LLM Inference Gateway & RAG Pipeline',
    category: 'AI Infrastructure & Search',
    difficulty: 'Staff+',
    summary: 'Design a multi-tenant AI Inference Gateway and Hybrid RAG retrieval pipeline featuring Token-Aware Rate Limiting (TPM/RPM), Semantic Vector Caching, Hybrid BM25 + HNSW Retrieval with Cross-Encoder Reranking, SSE Token Streaming, and Multi-Provider Circuit Breaker Failover.',
    tags: ['LLM Gateway', 'Hybrid RAG', 'Semantic Cache', 'TPM Rate Limit', 'HNSW + BM25', 'SSE Streaming', 'Circuit Breaker'],
    functionalReqs: [
      'Expose a unified streaming `/v1/chat/completions` endpoint that routes across primary and fallback LLM providers (e.g., OpenAI, Anthropic, self-hosted vLLM) with automatic failover.',
      'Enforce dual-dimensional tenant rate limits: Requests Per Minute (RPM) and Tokens Per Minute (TPM) accounting for prompt + streamed completion tokens.',
      'Retrieve ACL-filtered enterprise context via Hybrid Search (BM25 lexical + HNSW dense vectors + Cross-Encoder Reranker) and stream citations + markdown tokens via SSE.'
    ],
    nonFunctionalReqs: [
      'Time-To-First-Token (TTFT) P95 < 650ms (or < 45ms on Semantic Cache hit) with zero head-of-line blocking across concurrent SSE streams.',
      '99.99% gateway availability via hedged/circuit-broken multi-provider fallback when primary GPU clusters return HTTP 429 or 5xx.',
      'Zero cross-tenant data leakage in both Semantic Cache lookups and RAG vector retrieval (strict RBAC/tenant_id namespace isolation).'
    ],
    scaleDefaults: {
      dauMillions: 25,
      readsPerUserDay: 15,
      writesPerUserDay: 2,
      avgPayloadBytes: 3072,
      retentionYears: 2
    },
    nodes: [
      { id: 'ai-client', label: 'Web / IDE Copilot Client', tier: 'client', role: 'Opens HTTP/2 SSE stream (`text/event-stream`) and renders incremental token deltas + source citations.', scalingStrategy: 'AbortController cancellation + Last-Event-ID resume.', failureImpact: 'Dropped Wi-Fi mid-generation loses partial stream.', mitigation: 'Gateway caches in-flight token buffer in Redis Stream by request_id.' },
      { id: 'ai-gateway', label: 'AI Inference Gateway & TPM Limiter', tier: 'edge', role: 'Authenticates tenant, pre-estimates prompt tokens via tiktoken, enforces Redis Lua RPM/TPM buckets, and streams SSE.', scalingStrategy: 'Stateless Rust/Go async event-loop proxies.', failureImpact: 'Unbounded token bursts exhaust enterprise provider quota.', mitigation: 'Pre-reserve estimated max_tokens in Redis Lua; refund unused tokens on stream close.' },
      { id: 'semantic-cache', label: 'Redis Vector Semantic Cache', tier: 'storage', role: 'Caches `(tenant_id, model, prompt_embedding) -> completion` and serves hits when cosine similarity >= 0.96.', scalingStrategy: 'Tenant-namespaced HNSW index in RAM with TTL eviction.', failureImpact: 'False-positive cache hit returns stale/wrong answer.', mitigation: 'Strict cosine threshold (0.96+) + tenant/RBAC scope hash + bypass flag for time-sensitive queries.' },
      { id: 'rag-orchestrator', label: 'Hybrid RAG & Cross-Encoder Reranker', tier: 'compute', role: 'Embeds query, runs parallel BM25 + HNSW vector search with ACL pre-filters, fuses via RRF, and reranks top-50 -> top-8 chunks.', scalingStrategy: 'Autoscaled ONNX/TensorRT inference pods for embedding & reranking.', failureImpact: 'Reranker latency spike increases Time-To-First-Token.', mitigation: 'Strict 120ms deadline budget; fallback to raw RRF order if reranker times out.' },
      { id: 'vector-hybrid-db', label: 'Qdrant / OpenSearch Hybrid Index', tier: 'storage', role: 'Stores chunked enterprise documents with HNSW dense vectors (1536d), BM25 inverted index, and ACL metadata.', scalingStrategy: 'Sharded by tenant_id with scalar quantization (SQ8).', failureImpact: 'Unfiltered post-search ACL check yields 0 results.', mitigation: 'Payload-aware HNSW pre-filtering ensures top-K always satisfies user ACLs.' },
      { id: 'llm-router', label: 'Provider Router & Circuit Breaker', tier: 'compute', role: 'Dispatches augmented prompt to primary LLM cluster (vLLM / OpenAI) and fails over to secondary region/provider on 429/503.', scalingStrategy: 'Sliding-window health score + TTFT latency-aware load balancing.', failureImpact: 'Primary LLM provider outage stalls all completions.', mitigation: 'Open circuit after 5% 5xx/429 window; immediately route to secondary provider with prompt adapter.' },
      { id: 'kafka-ingest', label: 'Kafka Document CDC & Token Audit Bus', tier: 'messaging', role: 'Streams enterprise doc updates for async chunking/embedding and logs token usage to ClickHouse for billing.', scalingStrategy: 'Partitioned by tenant_id.', failureImpact: 'Embedding backlog delays newly edited docs appearing in RAG.', mitigation: 'Priority lane for incremental doc diffs + content-hash deduplication.' }
    ],
    edges: [
      { from: 'ai-client', to: 'ai-gateway', label: 'POST /chat (Accept: text/event-stream)', protocol: 'HTTPS / SSE', pathType: 'both' },
      { from: 'ai-gateway', to: 'semantic-cache', label: 'Check / Store Semantic Hit (cos >= 0.96)', protocol: 'RESP3', pathType: 'both' },
      { from: 'ai-gateway', to: 'rag-orchestrator', label: 'Retrieve Context (Query + ACLs)', protocol: 'gRPC', pathType: 'read' },
      { from: 'rag-orchestrator', to: 'vector-hybrid-db', label: 'Parallel BM25 + HNSW Pre-Filtered Search', protocol: 'gRPC/HTTP', pathType: 'read' },
      { from: 'ai-gateway', to: 'llm-router', label: 'Stream Augmented Prompt', protocol: 'gRPC Stream', pathType: 'read' },
      { from: 'llm-router', to: 'kafka-ingest', label: 'Emit Token Billing & Doc CDC', protocol: 'Kafka', pathType: 'async' },
      { from: 'kafka-ingest', to: 'vector-hybrid-db', label: 'Upsert Chunk Embeddings', protocol: 'Batch gRPC', pathType: 'write' }
    ],
    writePathSteps: [
      'Enterprise document is created/edited in Notion/Drive/Confluence; webhook or CDC connector publishes change event to Kafka Document Bus.',
      'Ingestion Worker performs structure-aware semantic chunking (e.g., 512 tokens with 10% sliding overlap, preserving markdown tables and headers).',
      'Worker computes SHA-256 content hash per chunk to skip unchanged paragraphs, saving 70%+ embedding GPU cost on minor edits.',
      'Batch Embedding Worker generates dense vectors (e.g., 1536d fp16) and sparse lexical weights, attaching `tenant_id` and `allowed_group_ids` ACL payload.',
      'Upserts vectors and BM25 terms atomically into Hybrid Vector Index and invalidates any stale Semantic Cache entries linked to that document ID.'
    ],
    readPathSteps: [
      'Client sends POST `/v1/chat/completions`; AI Gateway authenticates JWT, counts prompt tokens, and reserves `prompt_tokens + estimated_completion_tokens` in Redis Lua TPM bucket.',
      'Gateway computes query embedding (~12ms) and checks Redis Semantic Cache scoped to `(tenant_id, acl_hash)`; if cosine similarity >= 0.96, streams cached response immediately (<40ms TTFT).',
      'On cache miss, RAG Orchestrator executes parallel BM25 keyword search + HNSW ANN vector search (top 50 each) with mandatory `tenant_id` & `acl_groups` pre-filtering.',
      'Orchestrator merges candidates via Reciprocal Rank Fusion (RRF), runs a lightweight Cross-Encoder Reranker to select the top 8 chunks, and injects grounded citations into the system prompt.',
      'Provider Router streams SSE token deltas from primary LLM (or fails over to backup provider if TTFT > 2.5s or HTTP 429), reconciles exact output tokens in Redis TPM bucket, and logs telemetry to Kafka/ClickHouse.'
    ],
    deepDives: [
      {
        title: 'Two-Phase Token Rate Limiting (Reservation + Reconciliation) vs Request-Count Limiting',
        decision: 'Enforce dual RPM + TPM token buckets in Redis Lua using upfront token reservation (`prompt_tokens + reserved_budget`) followed by exact reconciliation when the SSE stream finishes.',
        alternativeRejected: 'Rate limiting strictly by HTTP Requests Per Minute (RPM) or deducting tokens only after completion finishes.',
        tradeoffAccepted: 'Slightly conservative quota locking while a stream is in-flight, preventing a single tenant sending 100k-token context prompts from exhausting shared GPU KV-cache memory.'
      },
      {
        title: 'Hybrid BM25 + HNSW + RRF + Cross-Encoder Reranking vs Pure Dense Vector Search',
        decision: 'Combine lexical BM25 and dense HNSW retrieval (top 50) via Reciprocal Rank Fusion (RRF), then score the top 50 with a Cross-Encoder Reranker down to top 8 chunks.',
        alternativeRejected: 'Retrieving top-8 chunks using pure dense cosine similarity alone.',
        tradeoffAccepted: 'Adds ~60–90ms of retrieval/reranking compute before LLM prefill, but boosts retrieval recall on exact product SKUs, error codes, and acronyms while shrinking LLM prompt token cost.'
      },
      {
        title: 'ACL Pre-Filtering in HNSW Graph vs Post-Filtering After kNN',
        decision: 'Enforce tenant and RBAC permission bitsets during HNSW graph traversal (Single-Stage / Iterative Filtered ANN).',
        alternativeRejected: 'Fetching global top-K nearest vectors first and filtering out unauthorized documents in application code (Post-Filtering).',
        tradeoffAccepted: 'Requires payload-indexed HNSW links in the vector store, avoiding the "Zero-Result Recall Collapse" when a user only has access to 1% of company documents.'
      }
    ]
  }
];
