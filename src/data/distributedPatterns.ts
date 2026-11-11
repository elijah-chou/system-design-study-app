export interface DistributedPattern {
  id: string;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  difficulty: 'Fundamental' | 'Intermediate' | 'Advanced' | 'Staff+';
  group: 'Resilience' | 'Data & Consistency' | 'Scalability & Routing' | 'Modernization';
  problem: string;
  solutionMechanics: string;
  architectureSteps: string[];
  failureModes: {
    scenario: string;
    impact: string;
    mitigation: string;
  }[];
  tradeoffs: {
    latency: string;
    throughput: string;
    consistency: string;
    complexity: string;
  };
  codeOrConfigSnippet: {
    title: string;
    language: string;
    code: string;
  };
  whenToUse: string[];
  antiPatterns: string[];
  simulatorId?: 'circuit-breaker' | 'rate-limiter' | 'consistent-hashing';
}

export const DISTRIBUTED_PATTERNS: DistributedPattern[] = [
  // ==========================================
  // RESILIENCE PATTERNS
  // ==========================================
  {
    id: 'dist-circuit-breaker',
    title: 'Circuit Breaker State Machine',
    category: 'Resilience & Fault Tolerance',
    group: 'Resilience',
    difficulty: 'Intermediate',
    summary: 'Prevents cascading fleet-wide outages by tripping open when a downstream dependency exceeds failure or slow-call thresholds.',
    tags: ['Resilience', 'Cascading Failures', 'State Machine', 'Fallbacks', 'Tail Latency'],
    simulatorId: 'circuit-breaker',
    problem: 'When a downstream service or database degrades and takes 10 seconds to time out, upstream callers block worker threads, exhaust connection pools, and trigger a domino-effect cascading failure across the entire microservice fleet.',
    solutionMechanics: 'Wrap outbound network calls in a 3-state finite state machine (CLOSED -> OPEN -> HALF_OPEN). Track failure and slow-call rates over a sliding window. When failures exceed the threshold, trip OPEN to fail fast (<0.1ms) or serve a degraded fallback, probing recovery periodically in HALF_OPEN.',
    architectureSteps: [
      '1. CLOSED State: Calls pass through normally while a sliding window (count-based or time-based) tracks error responses (5xx/timeouts) and slow calls (>P99 threshold).',
      '2. Trip to OPEN: If failureRate >= 50% (with a minimum call volume, e.g., 20 requests), the breaker trips OPEN and starts a cooldown timer (e.g., 15 seconds).',
      '3. Fast-Fail / Fallback: While OPEN, zero network packets are sent to the struggling downstream; callers immediately receive a fallback (stale cache, default recommendation, or queued retry).',
      '4. Transition to HALF_OPEN: After cooldown expires, allow a small number of probe requests (e.g., 3 concurrent test calls) through to test downstream health.',
      '5. Recovery or Re-Trip: If all probe requests succeed, reset to CLOSED; if any probe fails, immediately trip back to OPEN for another cooldown cycle.'
    ],
    failureModes: [
      {
        scenario: 'Low-Traffic False Positive Trip',
        impact: 'At 3 AM, 2 out of 2 requests fail due to a transient blip (100% failure rate), tripping the breaker open unnecessarily.',
        mitigation: 'Always configure minimumNumberOfCalls (e.g., >= 20 calls in window) before evaluating the failure percentage threshold.'
      },
      {
        scenario: 'Tripping on Client 4xx Errors',
        impact: 'A malicious client sends a burst of 400 Bad Request / 404 Not Found payloads, tripping the circuit breaker for all legitimate users.',
        mitigation: 'Whitelist 4xx client errors (except 429 Too Many Requests) so only 5xx server errors, network timeouts, and TCP resets count as circuit failures.'
      },
      {
        scenario: 'Half-Open Recovery Stampede',
        impact: 'When cooldown expires, 500 concurrent requests rush through during the transition window, crushing the warming-up downstream service.',
        mitigation: 'Strictly cap permittedNumberOfCallsInHalfOpenState (e.g., 3 probes) using an atomic CAS counter or semaphore.'
      }
    ],
    tradeoffs: {
      latency: 'Replaces 10,000ms timeout hangs with <0.1ms fast-fail or fallback execution during outages.',
      throughput: 'Preserves upstream thread pools and event loops for healthy endpoints.',
      consistency: 'Fallback responses may return stale cached data or degraded feature sets.',
      complexity: 'Requires per-endpoint tuning of failure thresholds, slow-call cutoffs, and minimum volume guards.'
    },
    codeOrConfigSnippet: {
      title: 'Production Sliding-Window Circuit Breaker (TypeScript)',
      language: 'typescript',
      code: `export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private halfOpenSuccesses = 0;
  private halfOpenInFlight = 0;
  private openedAt = 0;

  constructor(
    private readonly failureThreshold = 5,
    private readonly cooldownMs = 10_000,
    private readonly halfOpenProbes = 2
  ) {}

  async execute<T>(action: () => Promise<T>, fallback?: () => T): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt >= this.cooldownMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenSuccesses = 0;
        this.halfOpenInFlight = 0;
      } else {
        if (fallback) return fallback();
        throw new Error('CircuitBreakerOpenError: Fast-failing downstream call');
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenInFlight >= this.halfOpenProbes) {
      if (fallback) return fallback();
      throw new Error('CircuitBreakerHalfOpenBusy: Probe limit reached');
    }

    if (this.state === 'HALF_OPEN') this.halfOpenInFlight++;

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) return fallback();
      throw err;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.halfOpenProbes) {
        this.state = 'CLOSED';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure() {
    this.failures++;
    if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }
}`
    },
    whenToUse: [
      'Calling synchronous remote dependencies over HTTP/gRPC where degraded fallbacks exist',
      'Protecting shared API Gateways or BFF layers from slow third-party vendor APIs',
      'Preventing database connection pool exhaustion during replica brownouts'
    ],
    antiPatterns: [
      'Sharing a single Circuit Breaker instance across unrelated downstream endpoints (e.g., /search and /checkout)',
      'Retrying inside a tripped circuit breaker or letting retries multiply before the breaker sees the failure'
    ]
  },
  {
    id: 'dist-bulkhead',
    title: 'Bulkhead Isolation (Pool & Cell Partitioning)',
    category: 'Resilience & Fault Tolerance',
    group: 'Resilience',
    difficulty: 'Intermediate',
    summary: 'Partitions connection pools, semaphores, and compute cells into watertight compartments so a slow dependency or noisy tenant cannot sink the whole ship.',
    tags: ['Resilience', 'Blast Radius', 'Multi-Tenancy', 'Concurrency', 'Cell Architecture'],
    problem: 'An application service calls three downstream backends (Checkout, Recommendations, Analytics) using one shared connection pool or worker pool. When Analytics experiences a latency spike, its in-flight requests consume 100% of available workers/connections, starving Checkout and causing a total outage.',
    solutionMechanics: 'Inspired by watertight compartments in a ship’s hull, partition resources along dependency or tenant boundaries using Semaphore/Thread-Pool Bulkheads in-process and Cell-Based / Shuffle-Sharding architectures at the infrastructure layer.',
    architectureSteps: [
      '1. Dependency Partitioning: Assign dedicated connection pools and concurrency semaphores per downstream service (e.g., max 50 concurrent calls to Checkout, max 15 to Analytics).',
      '2. Bounded Queue Rejection: Attach a small bounded wait queue per bulkhead; if both active slots and queue are full, reject immediately with 429/503 Load Shedding.',
      '3. Priority Queue Bulkheads: Separate Kafka/Worker topics by criticality (P0 Transactional OTP vs P2 Marketing Digests) with dedicated consumer groups.',
      '4. Shuffle Sharding (Multi-Tenant Isolation): Assign each tenant to a unique random subset of k-out-of-N worker nodes so a noisy tenant only degrades the small combinatorial overlap with other tenants.'
    ],
    failureModes: [
      {
        scenario: 'Unbounded Queue in Front of Bounded Pool',
        impact: 'Even though concurrency is capped at 20, the waiting queue grows to 100,000 requests, causing OOM crashes and multi-minute queueing latency.',
        mitigation: 'Always pair concurrency limits with a tiny bounded queue (or zero queue) and CoDel (Controlled Delay) queue timeout shedding.'
      },
      {
        scenario: 'Over-Fragmented Resource Starvation',
        impact: 'Splitting 100 DB connections across 20 tiny bulkheads leaves each compartment with only 5 connections, causing rejections during normal traffic bursts.',
        mitigation: 'Group low-volume non-critical dependencies into a shared "Tier-2" bulkhead while giving Tier-0 critical paths dedicated capacity.'
      }
    ],
    tradeoffs: {
      latency: 'Prevents head-of-line blocking from slow endpoints affecting fast endpoints.',
      throughput: 'Slightly lower peak resource utilization because idle capacity in Bulkhead A cannot be borrowed by Bulkhead B.',
      consistency: 'No impact on data consistency; strictly governs compute/connection availability.',
      complexity: 'Requires capacity planning and tuning semaphore/pool limits per downstream dependency.'
    },
    codeOrConfigSnippet: {
      title: 'Bounded Semaphore Bulkhead with Fast Load Shedding',
      language: 'typescript',
      code: `export class SemaphoreBulkhead {
  private activeCount = 0;
  private readonly waitQueue: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

  constructor(
    public readonly name: string,
    private readonly maxConcurrent: number,
    private readonly maxWaitQueue: number,
    private readonly queueTimeoutMs = 250
  ) {}

  async runIsolated<T>(task: () => Promise<T>): Promise<T> {
    await this.acquireSlot();
    try {
      return await task();
    } finally {
      this.releaseSlot();
    }
  }

  private acquireSlot(): Promise<void> {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return Promise.resolve();
    }
    if (this.waitQueue.length >= this.maxWaitQueue) {
      return Promise.reject(
        new Error(\`BulkheadRejectedError [\${this.name}]: Compartment saturated (\${this.activeCount} active)\`)
      );
    }
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waitQueue.findIndex((item) => item.resolve === resolve);
        if (idx !== -1) this.waitQueue.splice(idx, 1);
        reject(new Error(\`BulkheadQueueTimeout [\${this.name}]: Waited > \${this.queueTimeoutMs}ms\`));
      }, this.queueTimeoutMs);

      this.waitQueue.push({ resolve, reject, timer });
    });
  }

  private releaseSlot(): void {
    const next = this.waitQueue.shift();
    if (next) {
      clearTimeout(next.timer);
      next.resolve();
    } else {
      this.activeCount--;
    }
  }
}`
    },
    whenToUse: [
      'Isolating Tier-0 critical flows (Auth, Checkout) from Tier-2 non-critical flows (Recommendations, Analytics)',
      'Preventing noisy enterprise tenants from exhausting shared multi-tenant worker fleets',
      'Separating high-priority transactional notifications (2FA codes) from bulk marketing broadcasts'
    ],
    antiPatterns: [
      'Using a single global HTTP Agent or DB pool without per-route concurrency caps',
      'Placing an unbounded in-memory queue in front of a bulkhead semaphore'
    ]
  },
  {
    id: 'dist-retry-backoff-jitter',
    title: 'Retry with Exponential Backoff & Full Jitter',
    category: 'Resilience & Fault Tolerance',
    group: 'Resilience',
    difficulty: 'Fundamental',
    summary: 'Recovers transparently from transient network blips while using randomized Full Jitter and Retry Budgets to prevent synchronized retry storms.',
    tags: ['Resilience', 'Thundering Herd', 'Jitter', 'Idempotency', 'AWS Architecture'],
    simulatorId: 'circuit-breaker',
    problem: 'When a downstream service experiences a brief 2-second brownout, 10,000 clients fail simultaneously. If all clients retry on a fixed 1-second timer or pure exponential backoff (1s, 2s, 4s), they fire in synchronized waves—creating a Thundering Herd retry storm that repeatedly crashes the recovering server.',
    solutionMechanics: 'Combine Exponential Backoff (doubling the cap window per attempt) with Full Jitter: sleep = random(0, min(maxCap, base * 2^attempt)). Pair every retryable mutation with an Idempotency-Key and enforce a process-wide Retry Budget (max 10% extra traffic).',
    architectureSteps: [
      '1. Classify Retryability: Only retry transient network errors (ECONNRESET, 502, 503, 504, 429). Never retry 400, 401, 403, 404, or deterministic business validation failures.',
      '2. Attach Idempotency Key: Generate a UUID v4 Idempotency-Key header before attempt #1 so that if the server committed the write before the response packet dropped, attempt #2 safely returns the cached receipt.',
      '3. Compute Full Jitter Delay: Calculate ceiling = min(capMs, baseMs * 2^attempt), then draw a uniform random delay in [0, ceiling] to desynchronize client waves.',
      '4. Check Retry Budget & Circuit Breaker: Abort retries immediately if the local Retry Budget (<10% of normal request volume) is exhausted or the Circuit Breaker is OPEN.'
    ],
    failureModes: [
      {
        scenario: 'Multi-Layer Retry Amplification (3 x 3 x 3 = 27x)',
        impact: 'Browser retries 3x -> API Gateway retries 3x -> Order Service retries 3x -> Payment Service retries 3x. A single database hiccup triggers 3^4 = 81x traffic amplification!',
        mitigation: 'Retry at only ONE layer in the call stack (typically the immediate caller with a Retry Budget), and propagate a remaining-deadline header (grpc-timeout) down the chain.'
      },
      {
        scenario: 'Retrying Non-Idempotent Mutations Without Idempotency Key',
        impact: 'A timeout occurs after the payment gateway already charged the card; retrying charges the customer twice.',
        mitigation: 'Mandate atomic server-side Idempotency-Key deduplication before enabling retries on POST/PATCH endpoints.'
      }
    ],
    tradeoffs: {
      latency: 'Masks transient packet loss at the cost of higher P99 tail latency when retries occur.',
      throughput: 'Full Jitter spreads retry load into a flat, sustainable rate instead of synchronized spikes.',
      consistency: 'Requires strict idempotency on the receiver to prevent duplicate side effects.',
      complexity: 'Low; must be paired with deadline propagation and retry budgets.'
    },
    codeOrConfigSnippet: {
      title: 'AWS-Standard Full Jitter Retry with Token Retry Budget',
      language: 'typescript',
      code: `export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxCapMs: number;
}

// AWS Architecture Blog Formula: Full Jitter = random(0, min(cap, base * 2^attempt))
export function computeFullJitterDelayMs(attempt: number, cfg: RetryConfig): number {
  const exponentialCeiling = Math.min(cfg.maxCapMs, cfg.baseDelayMs * Math.pow(2, attempt));
  return Math.floor(Math.random() * exponentialCeiling);
}

export async function executeWithRetryBudget<T>(
  operation: (idempotencyKey: string, attempt: number) => Promise<T>,
  isRetryable: (err: unknown) => boolean,
  cfg: RetryConfig = { maxAttempts: 4, baseDelayMs: 100, maxCapMs: 5000 }
): Promise<T> {
  const idempotencyKey = crypto.randomUUID();
  let lastError: unknown;

  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    try {
      return await operation(idempotencyKey, attempt);
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === cfg.maxAttempts - 1;
      if (isLastAttempt || !isRetryable(err)) {
        throw err;
      }
      const sleepMs = computeFullJitterDelayMs(attempt, cfg);
      await new Promise((res) => setTimeout(res, sleepMs));
    }
  }
  throw lastError;
}`
    },
    whenToUse: [
      'Mitigating transient network packet loss, DNS blips, or brief load-balancer connection resets',
      'Handling HTTP 429 Too Many Requests (respecting Retry-After header when present, falling back to Full Jitter)',
      'Cloud SDK calls (S3, DynamoDB, KMS) over shared multi-tenant networks'
    ],
    antiPatterns: [
      'Immediate tight-loop retry (while(!success) call()) with zero backoff',
      'Retrying at every microservice hop simultaneously (Cascading Retry Amplification)'
    ]
  },

  // ==========================================
  // DATA & CONSISTENCY PATTERNS
  // ==========================================
  {
    id: 'dist-transactional-outbox',
    title: 'Transactional Outbox & Idempotent Inbox',
    category: 'Distributed Data & Messaging',
    group: 'Data & Consistency',
    difficulty: 'Advanced',
    summary: 'Eliminates the Dual-Write split-brain bug between a service’s database and message broker by committing domain state and outbox events in a single local ACID transaction.',
    tags: ['Consistency', 'Dual-Write Problem', 'Kafka', 'CDC', 'Debezium', 'Idempotency'],
    problem: 'A service updates its PostgreSQL database (UPDATE orders SET status = "PAID") and then publishes an event to Kafka. If the process crashes after the DB commit but before Kafka ACKs, downstream services never learn the order was paid. Conversely, publishing to Kafka before committing the DB risks emitting phantom events if the DB transaction rolls back.',
    solutionMechanics: 'Write both the domain entity mutation (orders table) and the outbound event payload (outbox_events table) inside the SAME local ACID database transaction. A background relay (Transaction Log CDC via Debezium or a SKIP LOCKED polling worker) streams committed outbox rows to Kafka with At-Least-Once guarantees, paired with an Idempotent Inbox table on consumers.',
    architectureSteps: [
      '1. Atomic Local Commit: Inside BEGIN ... COMMIT, insert/update the business row in orders AND insert the serialized event into outbox_events.',
      '2. Outbox Relay / CDC Capture: Either tail the PostgreSQL Write-Ahead Log (WAL) via Debezium or poll SELECT * FROM outbox_events WHERE published_at IS NULL FOR UPDATE SKIP LOCKED LIMIT 100.',
      '3. Broker Publish & Mark: Publish the batch to Kafka with acks=all, then mark outbox rows published_at = NOW() (or delete/drop partitions).',
      '4. Consumer Idempotent Inbox: Because the relay can crash after publishing to Kafka but before marking published_at, the consumer inserts message_id into an inbox_processed table (PRIMARY KEY) inside its own local transaction to guarantee Effectively-Once processing.'
    ],
    failureModes: [
      {
        scenario: 'Relay Crashes After Kafka ACK Before Outbox Update',
        impact: 'Upon restart, the relay re-reads the uncommitted outbox row and publishes the exact same event to Kafka a second time.',
        mitigation: 'Downstream consumers MUST implement an Idempotent Inbox (INSERT INTO processed_events (event_id) ... ON CONFLICT DO NOTHING) inside their processing transaction.'
      },
      {
        scenario: 'Outbox Table Bloat & VACUUM Degradation',
        impact: 'Inserting and deleting 50M rows/day in outbox_events causes massive PostgreSQL dead-tuple bloat and index degradation.',
        mitigation: 'Partition the outbox table by day/hour and DROP old partitions instantly, or use Debezium logical replication messages (pg_logical_emit_message) which write directly to WAL without table bloat!'
      }
    ],
    tradeoffs: {
      latency: 'Adds ~10ms–200ms async relay lag between DB commit and Kafka visibility.',
      throughput: 'Doubles local DB write IOPS (1 domain write + 1 outbox insert per transaction).',
      consistency: 'Upgrades unreliable dual-writes into guaranteed At-Least-Once eventual consistency.',
      complexity: 'Requires running a CDC connector (Debezium) or polling worker fleet plus consumer deduplication.'
    },
    codeOrConfigSnippet: {
      title: 'Atomic Outbox Producer + Idempotent Inbox Consumer SQL Pattern',
      language: 'sql',
      code: `-- 1. PRODUCER: Single Atomic ACID Transaction (Orders + Outbox)
BEGIN TRANSACTION;

INSERT INTO orders (order_id, customer_id, amount_cents, status)
VALUES ('ord_9912', 'usr_42', 14900, 'PAID');

INSERT INTO outbox_events (event_id, aggregate_type, aggregate_id, event_type, payload_json)
VALUES (
  'evt_7781a',
  'Order',
  'ord_9912',
  'OrderPaid.v1',
  '{"orderId":"ord_9912","customerId":"usr_42","amountCents":14900}'
);

COMMIT;

-- 2. RELAY WORKER: Concurrent-Safe Polling without Lock Contention
WITH batch AS (
  SELECT event_id, aggregate_id, event_type, payload_json
  FROM outbox_events
  WHERE processed_at IS NULL
  ORDER BY created_at ASC
  LIMIT 100
  FOR UPDATE SKIP LOCKED
)
UPDATE outbox_events o
SET processed_at = NOW()
FROM batch
WHERE o.event_id = batch.event_id
RETURNING batch.*;

-- 3. CONSUMER: Atomic Idempotent Inbox Deduplication
BEGIN TRANSACTION;
-- Fails/No-ops immediately if evt_7781a was already processed!
INSERT INTO inbox_processed_events (event_id, processed_at)
VALUES ('evt_7781a', NOW());

UPDATE inventory_stock SET reserved_qty = reserved_qty + 1 WHERE sku = 'SKU_101';
COMMIT;`
    },
    whenToUse: [
      'Any microservice that needs to update its local database AND notify other services via Kafka, RabbitMQ, or SQS',
      'Event-driven architectures where lost or phantom domain events would cause financial or inventory drift',
      'Feeding reliable Change Data Capture (CDC) pipelines into search indexes (Elasticsearch) or data warehouses'
    ],
    antiPatterns: [
      'Calling await kafkaProducer.send() directly inside or right after a database transaction block (Dual-Write Anti-Pattern)',
      'Polling the outbox table from multiple pods without FOR UPDATE SKIP LOCKED (causing duplicate sends and lock contention)'
    ]
  },
  {
    id: 'dist-saga-pattern',
    title: 'Saga Pattern (Choreography vs. Orchestration)',
    category: 'Distributed Data & Messaging',
    group: 'Data & Consistency',
    difficulty: 'Advanced',
    summary: 'Coordinates multi-service distributed workflows via local ACID transactions and backward semantic compensating actions instead of blocking 2PC locks.',
    tags: ['Saga', 'Distributed Transactions', 'Compensating Actions', 'Temporal', 'Microservices'],
    problem: 'An e-commerce checkout spans OrderService, PaymentService, InventoryService, and ShippingService, each with its own isolated database. Traditional Two-Phase Commit (2PC/XA) holds cross-network row locks across all services—destroying throughput and turning any single node hiccup into a global availability outage.',
    solutionMechanics: 'Decompose the workflow into a sequence of local ACID transactions (T1 -> T2 -> T3). Since global isolation is absent, if step Tk fails (e.g., Inventory out of stock), execute backward Compensating Transactions (Ck-1 -> ... -> C1) in reverse order (e.g., refund Payment, mark Order cancelled) to achieve eventual semantic consistency.',
    architectureSteps: [
      '1. Forward Local Steps (T1..Tn): Each participant commits its local database change immediately, using Semantic Locks (e.g., status = RESERVE_PENDING) to signal in-flight state.',
      '2. Pivot Transaction: Identify the critical step (e.g., charging the card or committing non-refundable stock) that determines whether the Saga rolls forward or compensates.',
      '3. Backward Compensation (Ck..C1): If a step prior to or at the pivot fails permanently, trigger idempotent compensating commands in reverse order to undo committed work.',
      '4. Choose Coordination Mode: Use Event Choreography for simple 2-3 service flows, or a Stateful Orchestrator (Temporal / AWS Step Functions / State Machine) for complex >3 step workflows.'
    ],
    failureModes: [
      {
        scenario: 'Dirty Read / Lack of Isolation Anomaly (ACID without I)',
        impact: 'User starts Saga A (reserving $100 credit), and before Saga A fails and compensates, concurrent Saga B sees $0 balance and rejects a valid purchase.',
        mitigation: 'Implement Semantic Locks (explicit PENDING_RESERVATION states visible to readers) and design updates to be commutative.'
      },
      {
        scenario: 'Compensating Transaction Fails Midway',
        impact: 'Inventory fails, triggering RefundPayment(C1), but the payment gateway is temporarily down—leaving the customer charged with no order!',
        mitigation: 'Compensating transactions MUST be retried indefinitely with exponential backoff until they succeed, escalating to a human-in-the-loop Dead Letter Queue (DLQ) alert if broken.'
      },
      {
        scenario: 'Pinball / Cyclic Event Choreography',
        impact: 'With 6 microservices listening to each other’s events, nobody can tell where a stuck order is, and an error event triggers an infinite loop.',
        mitigation: 'Switch from Choreography to a Central Saga Orchestrator whenever a workflow exceeds 3 steps or has complex branching.'
      }
    ],
    tradeoffs: {
      latency: 'Higher end-to-end workflow completion latency than single-DB ACID, but zero cross-service lock waiting.',
      throughput: 'High scalability because each database lock is held only for milliseconds during its local transaction.',
      consistency: 'ACD (Atomicity via compensation, Consistency, Durability) but lacks Isolation (eventual consistency).',
      complexity: 'High: every forward mutation requires writing, testing, and maintaining an idempotent compensating action.'
    },
    codeOrConfigSnippet: {
      title: 'Deterministic Saga Orchestrator Engine with Reverse Compensation',
      language: 'typescript',
      code: `export interface SagaStep<TContext> {
  readonly name: string;
  execute(ctx: TContext): Promise<void>;
  compensate(ctx: TContext): Promise<void>;
}

export class SagaOrchestrator<TContext> {
  constructor(private readonly steps: readonly SagaStep<TContext>[]) {}

  async run(ctx: TContext): Promise<{ status: 'COMPLETED' | 'COMPENSATED'; failedStep?: string }> {
    const completedSteps: SagaStep<TContext>[] = [];

    for (const step of this.steps) {
      try {
        await step.execute(ctx);
        completedSteps.push(step);
      } catch (forwardErr) {
        // Roll back completed steps in strict LIFO reverse order
        for (const doneStep of [...completedSteps].reverse()) {
          await this.retryCompensationUntilSuccess(doneStep, ctx);
        }
        return { status: 'COMPENSATED', failedStep: step.name };
      }
    }
    return { status: 'COMPLETED' };
  }

  private async retryCompensationUntilSuccess(step: SagaStep<TContext>, ctx: TContext) {
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await step.compensate(ctx);
        return;
      } catch (compErr) {
        if (attempt === 5) throw new Error(\`CRITICAL: Compensation failed for \${step.name}\`);
        await new Promise((r) => setTimeout(r, attempt * 200));
      }
    }
  }
}`
    },
    whenToUse: [
      'Cross-service business workflows (Order Checkout, Travel Booking: Flight + Hotel + Car, Cross-Bank Wire Transfers)',
      'Integrating external third-party APIs (Stripe, FedEx) that cannot participate in database 2PC transactions',
      'Long-running workflows lasting seconds to days (using durable execution engines like Temporal)'
    ],
    antiPatterns: [
      'Using distributed Two-Phase Commit (XA transactions) across microservices over HTTP/WAN',
      'Forgetting to make both forward and compensating Saga commands idempotent'
    ]
  },
  {
    id: 'dist-cqrs-event-sourcing',
    title: 'CQRS & Event Sourcing',
    category: 'Distributed Data & Messaging',
    group: 'Data & Consistency',
    difficulty: 'Staff+',
    summary: 'Segregates write validation models from denormalized read projections, optionally persisting state as an immutable append-only log of domain events.',
    tags: ['CQRS', 'Event Sourcing', 'Projections', 'Audit Trail', 'Eventual Consistency'],
    problem: 'In high-scale domains with 95% reads and 5% complex writes, a single normalized 3NF relational schema either suffers from slow 12-table JOIN queries on reads or slow lock contention when updating denormalized views on writes—while destructive UPDATE statements overwrite historical audit context.',
    solutionMechanics: 'CQRS splits the system into a Command Model (validating business invariants and persisting state transitions) and one or more asynchronous Read Projections (denormalized Postgres views, Redis timelines, or Elasticsearch indexes). Event Sourcing stores every state change as an immutable sequence of Domain Events (AccountOpened, FundsCredited) folded with periodic Snapshots.',
    architectureSteps: [
      '1. Command Validation & Append: Command handler loads aggregate state (from latest Snapshot + trailing events), validates invariants, and appends new event with Optimistic Concurrency Control (WHERE version = expected_version).',
      '2. Snapshot Compaction: Every N events (e.g., 100), persist a serialized state snapshot so aggregate hydration stays O(1) bounded instead of replaying 50,000 old events.',
      '3. Asynchronous Read Projections: Event stream consumers project events into purpose-built Read Models (Elasticsearch for full-text search, Redis for sub-millisecond profile reads).',
      '4. Read-Your-Own-Writes Guard: Return the new aggregate version token to the client so the UI can either update optimistically or wait until the read replica catches up to >= version.'
    ],
    failureModes: [
      {
        scenario: 'Replication Lag / Read-Your-Own-Writes Anomaly',
        impact: 'User submits an order, gets redirected to /orders, and doesn’t see their newly placed order because the async read projection is 400ms behind.',
        mitigation: 'Return the mutated state directly from the Command response for immediate UI rendering, or pass a min_version LSN token when querying the Read Model.'
      },
      {
        scenario: 'Immutable Event Schema Evolution Breakage',
        impact: 'Three years later, OrderCreated_v1 events in the immutable log lack a required currency field, crashing new projection code during replay.',
        mitigation: 'Never mutate historical events in place; register a chain of pure Upcaster functions (v1 -> v2 -> v3) that transform old event schemas on read.'
      },
      {
        scenario: 'GDPR Right-to-be-Forgotten in Immutable Event Log',
        impact: 'Deleting a customer’s PII is legally required, but the event store is strictly append-only.',
        mitigation: 'Use Crypto-Shredding: encrypt all PII fields inside events using a per-user encryption key stored in a separate KMS vault; delete the user’s key to render historical PII permanently unreadable.'
      }
    ],
    tradeoffs: {
      latency: 'Write appends are fast O(1) sequential writes; read queries hit pre-joined projections in <2ms (with async projection lag).',
      throughput: 'Allows independent horizontal scaling of Read replicas/caches (100x) and Write shards.',
      consistency: 'Strong consistency per Aggregate on the Command side; Eventual Consistency on the Query projections.',
      complexity: 'Very High: requires event versioning upcasters, snapshotting, idempotent projectors, and lag handling.'
    },
    codeOrConfigSnippet: {
      title: 'Event-Sourced Aggregate with Optimistic Concurrency & Snapshots',
      language: 'typescript',
      code: `export type LedgerEvent =
  | { version: number; type: 'ACCOUNT_OPENED'; ownerId: string }
  | { version: number; type: 'FUNDS_CREDITED'; amountCents: number }
  | { version: number; type: 'FUNDS_DEBITED'; amountCents: number };

export interface LedgerSnapshot {
  version: number;
  balanceCents: number;
  active: boolean;
}

export class WalletAggregate {
  public version = 0;
  public balanceCents = 0;
  public active = false;

  static rehydrate(snapshot: LedgerSnapshot | null, trailingEvents: LedgerEvent[]): WalletAggregate {
    const wallet = new WalletAggregate();
    if (snapshot) {
      wallet.version = snapshot.version;
      wallet.balanceCents = snapshot.balanceCents;
      wallet.active = snapshot.active;
    }
    for (const ev of trailingEvents) {
      wallet.apply(ev);
    }
    return wallet;
  }

  debit(amountCents: number): LedgerEvent {
    if (!this.active) throw new Error('Account is not active');
    if (this.balanceCents < amountCents) throw new Error('Insufficient funds');
    const event: LedgerEvent = {
      version: this.version + 1,
      type: 'FUNDS_DEBITED',
      amountCents,
    };
    this.apply(event);
    return event;
  }

  private apply(event: LedgerEvent): void {
    switch (event.type) {
      case 'ACCOUNT_OPENED':
        this.active = true;
        break;
      case 'FUNDS_CREDITED':
        this.balanceCents += event.amountCents;
        break;
      case 'FUNDS_DEBITED':
        this.balanceCents -= event.amountCents;
        break;
    }
    this.version = event.version;
  }
}`
    },
    whenToUse: [
      'Financial ledgers, accounting systems, and regulatory domains requiring a 100% tamper-evident audit log',
      'Systems with extreme read/write asymmetry (e.g., 50,000 reads/sec vs 200 writes/sec) needing specialized read views',
      'Collaborative domains where retroactive temporal queries ("what was the state at 14:02 UTC?") or new projections are needed'
    ],
    antiPatterns: [
      'Applying full CQRS + Event Sourcing to simple CRUD back-office forms with low traffic',
      'Sharing mutable domain events across microservice boundaries as public integration contracts without an ACL'
    ]
  },

  // ==========================================
  // SCALABILITY & ROUTING PATTERNS
  // ==========================================
  {
    id: 'dist-consistent-hashing',
    title: 'Consistent Hashing with Virtual Nodes',
    category: 'Scalability & Coordination',
    group: 'Scalability & Routing',
    difficulty: 'Intermediate',
    summary: 'Maps storage/cache nodes and keys onto a 32-bit hash ring with Virtual Nodes so scaling or node failure only remaps 1/N of keys.',
    tags: ['Sharding', 'Caching', 'Consistent Hashing', 'Virtual Nodes', 'Dynamo', 'Cassandra'],
    simulatorId: 'consistent-hashing',
    problem: 'With naive modulo sharding (nodeIndex = hash(key) % N), adding a 10th cache node or losing 1 crashed node changes N—remapping ~90% ((N-1)/N) of all keys simultaneously and triggering a catastrophic Cache Stampede on the database.',
    solutionMechanics: 'Arrange the output space of a fast uniform hash function (MurmurHash3 / xxHash, [0, 2^32 - 1]) into a circular ring. Assign each physical node K Virtual Nodes (vnodes, e.g., K=150) distributed around the ring. Each key is owned by the first vnode encountered moving clockwise (found in O(log V) via binary search).',
    architectureSteps: [
      '1. Ring Construction: Hash each physical server ID with K virtual suffixes (e.g., "node-A#0" .. "node-A#149") using MurmurHash3 and sort the resulting token integers in an array.',
      '2. Clockwise Key Lookup: To route key K, compute token = murmur3(K) and binary-search the sorted ring for the smallest vnode token >= token (wrapping around to index 0 if past the end).',
      '3. Fault-Tolerant Replication: To replicate a key with Replication Factor R=3, walk clockwise from the primary vnode and pick the first 3 distinct physical nodes.',
      '4. Bounded-Load Overflow: Track in-flight load per node; if a hot key pushes a node above 1.25x average load, overflow to the next clockwise node.'
    ],
    failureModes: [
      {
        scenario: 'Non-Uniform Key Skew with Too Few Virtual Nodes (K=1)',
        impact: 'With only 1 token per physical node on the ring, random spacing leaves one node owning 55% of the ring arc while another owns 5%.',
        mitigation: 'Configure 100 to 200 Virtual Nodes (vnodes) per physical node to drive load standard deviation below 5%.'
      },
      {
        scenario: 'Cascading Overload on Clockwise Neighbor After Node Crash',
        impact: 'Without virtual nodes, 100% of a crashed node’s traffic shifts onto its single immediate clockwise neighbor, overloading and crashing it next.',
        mitigation: 'Virtual nodes scatter a crashed node’s 150 arcs evenly across ALL surviving physical nodes in the cluster.'
      },
      {
        scenario: 'Celebrity Hot-Key Pinning a Single Shard',
        impact: 'Even with a perfectly balanced ring, a single viral key ("celebrity_tweet_99") hashes to one point on the ring, saturating that replica set.',
        mitigation: 'Use Bounded-Load Consistent Hashing, L1 local client caching, or append a random salting suffix (key#0..9) for known hot keys.'
      }
    ],
    tradeoffs: {
      latency: 'O(log(N * K)) in-memory binary search takes <200 nanoseconds per routing lookup.',
      throughput: 'Eliminates cluster-wide rehash storms; only 1/N keys migrate when a node joins or leaves.',
      consistency: 'During topology transitions, nodes must use Gossip/etcd membership views to prevent temporary split routing.',
      complexity: 'Moderate: requires maintaining sorted vnode arrays and handling replica placement across distinct racks/AZs.'
    },
    codeOrConfigSnippet: {
      title: 'Consistent Hash Ring with Virtual Nodes & Binary Search Lookup',
      language: 'typescript',
      code: `export class ConsistentHashRing {
  private ring: { token: number; physicalNode: string }[] = [];
  private readonly nodes = new Set<string>();

  constructor(private readonly vnodesPerNode = 100) {}

  private hash32(input: string): number {
    // FNV-1a 32-bit fast uniform non-cryptographic hash
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0; // unsigned 32-bit [0, 2^32 - 1]
  }

  addNode(physicalNode: string): void {
    if (this.nodes.has(physicalNode)) return;
    this.nodes.add(physicalNode);
    for (let v = 0; v < this.vnodesPerNode; v++) {
      this.ring.push({
        token: this.hash32(\`\${physicalNode}#vnode-\${v}\`),
        physicalNode,
      });
    }
    this.ring.sort((a, b) => a.token - b.token);
  }

  removeNode(physicalNode: string): void {
    this.nodes.delete(physicalNode);
    this.ring = this.ring.filter((entry) => entry.physicalNode !== physicalNode);
  }

  getNodeForKey(key: string): string | null {
    if (this.ring.length === 0) return null;
    const keyToken = this.hash32(key);

    // Binary search for first vnode with token >= keyToken
    let low = 0;
    let high = this.ring.length - 1;
    let idx = 0; // Wrap around to 0 if keyToken > max ring token

    while (low <= high) {
      const mid = (low + high) >>> 1;
      if (this.ring[mid].token >= keyToken) {
        idx = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return this.ring[idx].physicalNode;
  }
}`
    },
    whenToUse: [
      'Sharding distributed caches (Memcached, Redis Cluster pools) and stateful WebSocket/gaming servers',
      'Partitioning storage engines (Amazon DynamoDB, Apache Cassandra, Riak, Chord DHT)',
      'L7 Load Balancing with sticky cache affinity (Envoy Ring Hash / Maglev)'
    ],
    antiPatterns: [
      'Using modulo hashing (hash(key) % N) for stateful caches where nodes autoscale dynamically',
      'Using slow cryptographic hashes (bcrypt/SHA-512) instead of fast uniform MurmurHash3/xxHash on the hot routing path'
    ]
  },
  {
    id: 'dist-rate-limiting',
    title: 'Distributed Rate Limiting Algorithms',
    category: 'Scalability & Coordination',
    group: 'Scalability & Routing',
    difficulty: 'Intermediate',
    summary: 'Enforces tenant and IP traffic quotas at the edge using Token Bucket, Leaky Bucket, or Sliding Window Counters backed by atomic Redis Lua scripts.',
    tags: ['Rate Limiting', 'Token Bucket', 'Sliding Window', 'Redis Lua', 'API Gateway'],
    simulatorId: 'rate-limiter',
    problem: 'Without rate limiting, a buggy client script, credential-stuffing botnet, or noisy enterprise tenant can flood an API with 50,000 req/s—exhausting database CPU, inflating cloud egress bills, and causing a denial-of-service outage for all other customers.',
    solutionMechanics: 'Evaluate incoming requests at the API Gateway against per-tenant/IP quotas using an algorithm matched to workload semantics (Token Bucket for burst-friendly APIs, Leaky Bucket for smooth constant outflow, Sliding Window Counter for low-memory boundary-safe quotas) executed atomically in Redis.',
    architectureSteps: [
      '1. Identifier Extraction: Extract the rate-limit key from verified JWT tenantId, API Key, or client IP subnet (/24 IPv4 or /64 IPv6).',
      '2. Algorithm Selection: Use Token Bucket when brief bursts are legitimate; use Sliding Window Counter (weighted previous + current window) to prevent the 2x Fixed-Window boundary spike with only 2 integers in RAM.',
      '3. Atomic Redis Evaluation: Execute the read-compute-write check inside a single Redis EVALSHA Lua script so concurrent gateway pods cannot trigger a Time-of-Check to Time-of-Use (TOCTOU) race condition.',
      '4. Standard Response Headers: Return X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, and HTTP 429 with Retry-After so well-behaved SDKs back off automatically.'
    ],
    failureModes: [
      {
        scenario: 'Fixed Window 2x Boundary Burst Exploit',
        impact: 'With a 100 req/min limit, a client sends 100 requests at 12:00:59 and another 100 requests at 12:01:01—200 requests in 2 seconds (2x overload)!',
        mitigation: 'Replace Fixed Window Counter with Sliding Window Counter: count = currWindow + prevWindow * (1 - elapsedFraction).'
      },
      {
        scenario: 'Non-Atomic GET + INCR Race Condition Across Gateway Pods',
        impact: '20 concurrent requests read count = 99 from Redis simultaneously, all pass the < 100 check, and all increment to 119.',
        mitigation: 'Always execute check-and-decrement inside a single atomic Redis Lua script.'
      },
      {
        scenario: 'Redis Cluster Outage Taking Down the Entire API Gateway',
        impact: 'When the rate-limiter Redis cluster has a network blip, every API call fails with 500 Internal Server Error.',
        mitigation: 'Implement a Fail-Open fallback (or degrade to local in-memory Token Bucket per gateway pod) when Redis latency exceeds 15ms.'
      }
    ],
    tradeoffs: {
      latency: 'Adds ~0.5ms–1.5ms for a pipelined Redis Lua call (or 0ms with local batch token pre-fetching).',
      throughput: 'Single Redis shard handles ~100k+ Lua ops/sec; sharded Redis Cluster scales linearly.',
      consistency: 'Strict atomic accuracy via Redis Lua vs eventual accuracy with local batch syncing.',
      complexity: 'Low-to-Moderate: requires choosing between Fail-Open (availability) vs Fail-Closed (security).'
    },
    codeOrConfigSnippet: {
      title: 'Atomic Redis Lua Token Bucket & Sliding Window Counter Formula',
      language: 'lua',
      code: `-- Atomic Redis Lua Script: Token Bucket Rate Limiter
-- KEYS[1] = bucket_key (e.g. "rl:tenant:acme")
-- ARGV[1] = capacity (e.g. 50), ARGV[2] = refill_rate_per_ms, ARGV[3] = now_ms, ARGV[4] = requested_tokens
local bucket = redis.call("HMGET", KEYS[1], "tokens", "last_refill")
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now_ms = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  last_refill = now_ms
else
  local elapsed = math.max(0, now_ms - last_refill)
  tokens = math.min(capacity, tokens + (elapsed * refill_rate))
  last_refill = now_ms
end

if tokens >= requested then
  tokens = tokens - requested
  redis.call("HMSET", KEYS[1], "tokens", tokens, "last_refill", last_refill)
  redis.call("PEXPIRE", KEYS[1], math.ceil(capacity / refill_rate) * 2)
  return {1, math.floor(tokens)} -- Allowed, Remaining
else
  redis.call("HMSET", KEYS[1], "tokens", tokens, "last_refill", last_refill)
  return {0, math.floor(tokens)} -- Rejected (429), Remaining
end`
    },
    whenToUse: [
      'Protecting public REST/GraphQL APIs from DDoS, scraping, and runaway client loops',
      'Enforcing tiered SaaS billing quotas (Free: 10 req/s, Pro: 100 req/s, Enterprise: 2000 req/s)',
      'Rate-limiting sensitive authentication endpoints (Login, OTP, Password Reset) via strict Sliding Window Log'
    ],
    antiPatterns: [
      'Using Fixed Window Counters on latency-sensitive backends vulnerable to 2x boundary spikes',
      'Storing Sliding Window Logs (every timestamp in a ZSET) for high-volume users (10,000 req/min causes Redis RAM explosion)'
    ]
  },
  {
    id: 'dist-leader-election-fencing',
    title: 'Leader Election & Monotonic Fencing Tokens',
    category: 'Scalability & Coordination',
    group: 'Scalability & Routing',
    difficulty: 'Staff+',
    summary: 'Elects a single active coordinator via Raft/Paxos leases while using monotonic Fencing Tokens at the storage layer to eliminate Zombie Leader split-brain corruption.',
    tags: ['Consensus', 'Leader Election', 'Fencing Tokens', 'Split-Brain', 'etcd', 'DDIA'],
    problem: 'A distributed cluster elects Node 1 as Leader using a 10-second lease to coordinate partition writes or cron jobs. Node 1 experiences a 15-second Stop-the-World JVM GC pause (or network delay). The lease expires, and Node 2 is elected Leader. When Node 1 wakes up from its GC pause, it still believes it holds the lock and writes stale data—corrupting shared storage (Split-Brain / Zombie Leader).',
    solutionMechanics: 'Acquire leadership leases through a linearizable Raft/Zab consensus store (etcd or ZooKeeper). Crucially, pair every lease acquisition with a strictly monotonically increasing integer (fencing_token = 33, then 34). The downstream storage server checks the token on every write and rejects any request with fencing_token < max_seen_token.',
    architectureSteps: [
      '1. Consensus Lease Acquisition: Candidate nodes attempt to create an ephemeral key/lease in etcd (or ZooKeeper) backed by a Raft quorum majority (floor(N/2) + 1).',
      '2. Monotonic Token Generation: The lock service returns the etcd revision / zxid as a strictly increasing integer fencingToken (e.g., Node 1 receives token 33).',
      '3. Heartbeat Lease Renewal: The active Leader periodically renews its TTL lease before expiration while stepping down immediately if quorum connectivity is lost.',
      '4. Storage-Layer Token Verification: Every write sent to the storage engine or database includes fencingToken; storage atomically enforces WHERE fencing_token >= current_max_token.'
    ],
    failureModes: [
      {
        scenario: 'Zombie Leader Waking from GC Pause Without Fencing Tokens',
        impact: 'Even with a mathematically correct Raft lock service, an un-fenced paused process sends delayed packets that arrive after the new leader’s writes, silently corrupting files/rows.',
        mitigation: 'Never rely on client-side wall-clock TTL checks alone; always verify monotonic Fencing Tokens on the target storage resource.'
      },
      {
        scenario: 'Using Non-Linearizable Redis Redlock for Safety-Critical Locks',
        impact: 'Clock jumps (NTP adjustments) or async primary-replica failover in Redis allows two clients to hold the same lock simultaneously.',
        mitigation: 'As analyzed by Martin Kleppmann (DDIA): use Redis locks only for efficiency (avoiding duplicate work), never for correctness; use etcd/ZooKeeper + Fencing Tokens for correctness.'
      }
    ],
    tradeoffs: {
      latency: 'Lease acquisition and renewal require Raft quorum round-trips (~2ms–10ms within region).',
      throughput: 'A single leader serializes coordination decisions; keep data-plane traffic off the leader when possible.',
      consistency: 'Guarantees 100% Linearizable safety against split-brain when storage verifies Fencing Tokens.',
      complexity: 'High: requires operating a 3- or 5-node consensus cluster and passing fencing tokens through storage APIs.'
    },
    codeOrConfigSnippet: {
      title: 'Fenced Storage Guard Rejecting Zombie Leader Writes',
      language: 'typescript',
      code: `export class FencedStorageResource {
  private highestFencingToken = 0;
  private readonly dataStore = new Map<string, string>();

  writeWithFencingToken(key: string, value: string, fencingToken: number): void {
    // Reject any Zombie Leader whose lease expired during a GC pause or network delay!
    if (fencingToken < this.highestFencingToken) {
      throw new Error(
        \`StaleFencingTokenRejected: Token \${fencingToken} < current max token \${this.highestFencingToken} (Zombie Leader detected!)\`
      );
    }

    this.highestFencingToken = fencingToken;
    this.dataStore.set(key, value);
  }
}

// Example Scenario:
// 1. Node A acquires lease with fencingToken = 33, then hits a 15s GC pause.
// 2. Lease expires; Node B acquires lease with fencingToken = 34 and writes to storage (max = 34).
// 3. Node A wakes up and sends delayed write with token 33 -> REJECTED safely!`
    },
    whenToUse: [
      'Electing a single active partition controller, database primary, or distributed cron scheduler',
      'Preventing concurrent workers from double-executing non-idempotent external side effects',
      'Coordinating schema migrations or shard reassignments in distributed storage engines'
    ],
    antiPatterns: [
      'Assuming a lock TTL is safe because "our code only takes 50ms and the TTL is 10 seconds" (ignoring GC pauses and network delays)',
      'Deploying an even number of consensus nodes (e.g., 2 or 4 etcd nodes, which tolerate fewer failures than 3 or 5)'
    ]
  },

  // ==========================================
  // MODERNIZATION & BOUNDARY PATTERNS
  // ==========================================
  {
    id: 'dist-strangler-fig',
    title: 'Strangler Fig Migration Pattern',
    category: 'Modernization & Boundaries',
    group: 'Modernization',
    difficulty: 'Intermediate',
    summary: 'Incrementally replaces a legacy monolith by placing an edge routing proxy in front and migrating vertical slices one route/canary percentage at a time.',
    tags: ['Modernization', 'Migration', 'API Gateway', 'Canary', 'Martin Fowler'],
    problem: 'Attempting a "Big Bang Rewrite" of a 10-year-old legacy monolith from scratch takes 18–24 months, freezes new business feature delivery, diverges from ongoing production bug fixes, and carries a catastrophic cutover risk on launch day.',
    solutionMechanics: 'Place an L7 Routing Proxy / API Gateway at the edge in front of the legacy monolith. Extract one cohesive vertical domain slice at a time into a modern service. Use the proxy to shadow-test and gradually shift traffic (1% -> 10% -> 100%) for that URI path to the new service until the legacy monolith shrinks away.',
    architectureSteps: [
      '1. Introduce Edge Routing Seam: Deploy an L7 Reverse Proxy (Envoy, NGINX, Kong) in front of the monolith so 100% of client traffic passes through a controllable routing layer.',
      '2. Extract High-Value Vertical Slice: Build the new bounded context (e.g., /api/v2/catalog) with an Anti-Corruption Layer syncing any needed legacy tables via CDC.',
      '3. Dark Launch & Shadow Traffic: Mirror production read requests asynchronously to the new service and compare response diffs without affecting live users.',
      '4. Canary Traffic Shift & Decommission: Shift 5% -> 50% -> 100% of live traffic to the new service, keep an instant rollback switch at the proxy, and delete the dead code from the monolith.'
    ],
    failureModes: [
      {
        scenario: 'Bidirectional Database Trigger Sync Loops',
        impact: 'During transition, both the legacy monolith and new service write to synced tables, triggering an infinite ping-pong CDC update loop.',
        mitigation: 'Establish a single source of truth for writes per entity at any point in time, tagging CDC replication transactions with an origin source marker.'
      },
      {
        scenario: 'Half-Strangled Permanent Hybrid Debt',
        impact: 'Team migrates 30% of routes and abandons the migration, leaving operations to maintain both the legacy stack and new stack forever.',
        mitigation: 'Migrate complete vertical bounded contexts and enforce a strict DoD: delete the legacy monolith tables and code paths as soon as 100% cutover holds for 14 days.'
      }
    ],
    tradeoffs: {
      latency: 'Adds ~1ms L7 proxy routing hop; eliminates legacy bottleneck latency slice by slice.',
      throughput: 'Allows hot domain slices (e.g., Search/Checkout) to scale independently right away.',
      consistency: 'Requires temporary CDC or dual-read reconciliation while old and new schemas coexist.',
      complexity: 'Moderate: requires shared authentication/session translation at the edge proxy.'
    },
    codeOrConfigSnippet: {
      title: 'Edge Strangler Proxy Canary & Dark-Shadow Router',
      language: 'typescript',
      code: `export interface StranglerRouteRule {
  pathPrefix: string;
  canaryWeightPercent: number; // 0..100 routed to modern service
  shadowTraffic: boolean;      // Mirror traffic asynchronously when hitting legacy
}

export async function routeStranglerRequest(
  req: { path: string; requestId: string; payload: unknown },
  rules: readonly StranglerRouteRule[],
  callLegacyMonolith: (req: any) => Promise<any>,
  callModernService: (req: any) => Promise<any>
) {
  const matched = rules.find((r) => req.path.startsWith(r.pathPrefix));
  if (!matched) {
    return callLegacyMonolith(req);
  }

  // Deterministic bucket 0..99 based on requestId
  const bucket = Math.abs(
    req.requestId.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0)
  ) % 100;

  if (bucket < matched.canaryWeightPercent) {
    return callModernService(req);
  }

  // Serve from legacy, optionally fire-and-forget shadow request to modern service
  if (matched.shadowTraffic) {
    callModernService(req).catch((err) =>
      console.warn('[ShadowDiffError] Modern service diverged:', err)
    );
  }
  return callLegacyMonolith(req);
}`
    },
    whenToUse: [
      'Modernizing legacy monoliths without freezing feature velocity or risking a Big Bang cutover',
      'Migrating between cloud providers or database engines using shadow traffic verification',
      'Decomposing a monolithic frontend into micro-frontends or incremental Next.js routes'
    ],
    antiPatterns: [
      'The 2-Year "Big Bang Rewrite" on a separate feature branch with a single all-or-nothing cutover date',
      'Having the new microservice read and write directly to the legacy monolith’s 300-table database without an ACL'
    ]
  },
  {
    id: 'dist-anti-corruption-layer',
    title: 'Anti-Corruption Layer (ACL)',
    category: 'Modernization & Boundaries',
    group: 'Modernization',
    difficulty: 'Intermediate',
    summary: 'Protects a clean Domain-Driven Design (DDD) bounded context from being polluted by cryptic legacy schemas or third-party vendor models.',
    tags: ['DDD', 'Bounded Context', 'Modernization', 'Hexagonal', 'Domain Modeling'],
    problem: 'A modern Order microservice needs customer credit data from a 1998 ERP mainframe where columns are named CUST_FLG_09 = "Y" and dates are stored as Julian integers. If those legacy DTOs leak directly into the new service, the modern codebase becomes just as unreadable and brittle as the legacy system.',
    solutionMechanics: 'Construct a dedicated translation boundary (combining Facade, Adapter, and Translator) between the two Bounded Contexts. The ACL speaks the clean Ubiquitous Language of the modern domain on the inside and handles all protocol conversion, field mapping, and semantic normalization of the legacy system on the outside.',
    architectureSteps: [
      '1. Define Pure Domain Contract: Model the ideal domain interface and value objects using the new Bounded Context’s Ubiquitous Language.',
      '2. Isolate Legacy Wire Client: Encapsulate SOAP/XML/RPC transport quirks, retries, and pagination inside a quarantined client module.',
      '3. Pure Semantic Translator: Map legacy status bitmasks, currency units, and error codes into strongly-typed domain enums and Result types with 100% unit test coverage.',
      '4. Schema Drift Contract Tests: Run automated Consumer-Driven Contract (CDC) tests against the ACL so legacy upstream changes fail fast at the boundary.'
    ],
    failureModes: [
      {
        scenario: 'Pass-Through DTO Leakage',
        impact: 'Developers take a shortcut and pass raw ERP JSON objects past the ACL into domain entities, defeating the boundary.',
        mitigation: 'Enforce strict TypeScript package visibility so legacy wire types are private to the ACL directory.'
      },
      {
        scenario: 'Silent Semantic Misinterpretation',
        impact: 'Legacy ERP returns status code "04" (Suspended for Fraud), which an incomplete ACL switch statement defaults to "ACTIVE".',
        mitigation: 'Never default unknown external enum values to a permissive state; fail closed or map to an explicit UNKNOWN_REQUIRES_REVIEW state.'
      }
    ],
    tradeoffs: {
      latency: 'Negligible (<0.1ms in-memory DTO mapping overhead).',
      throughput: 'No throughput penalty; ACL can also cache translated domain objects to shield slow legacy mainframes.',
      consistency: 'Enforces strong domain invariant validation at the ingress boundary.',
      complexity: 'Low-to-Moderate: adds translation classes and mapping unit tests.'
    },
    codeOrConfigSnippet: {
      title: 'Anti-Corruption Layer Translating Legacy Mainframe Record to Domain Model',
      language: 'typescript',
      code: `// Quarantined Legacy ERP Wire Payload (Never exported outside ACL!)
interface LegacyErpCustomerRow {
  CUST_NO_PK: string;
  CR_LIM_DEC: string; // e.g. "000500000" in cents
  STAT_CD: '01' | '02' | '99' | string;
}

// Clean Modern Bounded Context Domain Model
export interface CustomerCreditProfile {
  readonly customerId: string;
  readonly creditLimitCents: number;
  readonly status: 'GOOD_STANDING' | 'CREDIT_HOLD' | 'CLOSED';
}

export class ErpCreditAntiCorruptionLayer {
  translateToDomain(raw: LegacyErpCustomerRow): CustomerCreditProfile {
    const creditLimitCents = Number.parseInt(raw.CR_LIM_DEC, 10);
    if (Number.isNaN(creditLimitCents) || creditLimitCents < 0) {
      throw new Error(\`ACL Validation Error: Invalid CR_LIM_DEC "\${raw.CR_LIM_DEC}"\`);
    }

    let status: CustomerCreditProfile['status'];
    switch (raw.STAT_CD) {
      case '01':
        status = 'GOOD_STANDING';
        break;
      case '02':
        status = 'CREDIT_HOLD';
        break;
      case '99':
        status = 'CLOSED';
        break;
      default:
        // Fail-safe: unknown legacy codes default to protective CREDIT_HOLD, never GOOD_STANDING
        status = 'CREDIT_HOLD';
    }

    return Object.freeze({
      customerId: raw.CUST_NO_PK.trim(),
      creditLimitCents,
      status,
    });
  }
}`
    },
    whenToUse: [
      'Pairing with Strangler Fig when a new microservice must communicate with the remaining legacy monolith',
      'Integrating complex third-party enterprise systems (SAP, Salesforce, legacy banking cores)',
      'Bridging two separate Bounded Contexts owned by different engineering organizations'
    ],
    antiPatterns: [
      'Generating domain models directly from an external vendor’s OpenAPI/SOAP schema and using them across your core business logic',
      'Putting core domain pricing or business state machines inside the ACL translator'
    ]
  },
  {
    id: 'dist-bff',
    title: 'Backend for Frontend (BFF)',
    category: 'Modernization & Boundaries',
    group: 'Modernization',
    difficulty: 'Fundamental',
    summary: 'Provides client-specific aggregation facades (Mobile BFF vs Web Dashboard BFF) to eliminate over-fetching and chatty mobile round-trips.',
    tags: ['BFF', 'API Gateway', 'GraphQL', 'Mobile Optimization', 'Aggregation'],
    problem: 'A single general-purpose REST API struggles to serve both a high-bandwidth 4K Web Admin Dashboard (needing 40 fields from 6 microservices) and a cellular Mobile App or Smartwatch (needing 4 compact fields in a single round-trip). The mobile app either suffers from 6 sequential high-latency radio round-trips or downloads bloated 500KB JSON payloads.',
    solutionMechanics: 'Deploy dedicated experience-specific Backend-for-Frontend (BFF) services—such as a Mobile BFF, Web BFF, and Public Partner API—owned by the respective frontend/client teams. Each BFF aggregates downstream microservice calls in parallel over the fast internal datacenter network (gRPC) and returns a payload tailored to that client’s exact screen.',
    architectureSteps: [
      '1. Client-Aligned Ownership: Align each BFF service with a specific user experience (iOS/Android Mobile BFF vs Desktop Web BFF) owned by the frontend/product team.',
      '2. Parallel Fan-Out & Partial Degradation: The BFF calls UserService, OrderService, and PromoService concurrently via Promise.allSettled() over internal gRPC.',
      '3. Graceful Partial Fallback: If PromoService times out, the Mobile BFF still returns the User and Order data with promos: [] rather than failing the whole screen.',
      '4. Payload Projection & Compression: Strip internal fields and format currencies/dates specifically for the target device viewport.'
    ],
    failureModes: [
      {
        scenario: 'Duplicating Core Domain Business Logic Across BFFs',
        impact: 'Tax calculation or discount eligibility rules are copy-pasted into both Web-BFF and Mobile-BFF, causing a user to see $95 on Web and $102 on Mobile!',
        mitigation: 'BFFs must ONLY perform presentation aggregation, payload shaping, and protocol translation—all domain business rules must stay in downstream domain services.'
      },
      {
        scenario: 'All-or-Nothing Fan-Out Failure (Promise.all Trap)',
        impact: 'A BFF screen aggregates 5 services using Promise.all(); when the non-critical Avatar badge service is down, the entire home screen returns 500.',
        mitigation: 'Use Promise.allSettled() with per-call timeouts so non-critical widgets degrade gracefully while critical data renders.'
      }
    ],
    tradeoffs: {
      latency: 'Replaces 5 sequential mobile cellular round-trips (5 x 80ms = 400ms) with 1 edge call + parallel 5ms internal fan-out (~90ms total).',
      throughput: 'Reduces mobile bandwidth consumption by 70–90% by stripping unused fields.',
      consistency: 'Stateless presentation layer; reflects downstream service consistency.',
      complexity: 'Adds deployable BFF services or federated GraphQL subgraphs to manage.'
    },
    codeOrConfigSnippet: {
      title: 'Resilient Mobile BFF Aggregator with Partial Degradation (Promise.allSettled)',
      language: 'typescript',
      code: `export interface MobileHomeScreenResponse {
  userSummary: { name: string; tier: string };
  recentOrders: { id: string; status: string }[];
  loyaltyPoints: number | null; // Nullable for graceful partial degradation
  degradedWidgets: string[];
}

export async function buildMobileHomeScreenBff(
  userId: string,
  services: {
    fetchUser: (id: string) => Promise<{ name: string; tier: string; internalAuditLog: any[] }>;
    fetchOrders: (id: string) => Promise<{ id: string; status: string; warehouseRawXml: string }[]>;
    fetchLoyalty: (id: string) => Promise<{ points: number }>;
  }
): Promise<MobileHomeScreenResponse> {
  // Execute all downstream calls in parallel over low-latency internal network
  const [userRes, ordersRes, loyaltyRes] = await Promise.allSettled([
    services.fetchUser(userId),
    services.fetchOrders(userId),
    services.fetchLoyalty(userId),
  ]);

  // User profile is Tier-0 required for home screen
  if (userRes.status === 'rejected') {
    throw new Error('503 Unavailable: Core User Service failed');
  }

  const degradedWidgets: string[] = [];
  const recentOrders =
    ordersRes.status === 'fulfilled'
      ? ordersRes.value.slice(0, 3).map((o) => ({ id: o.id, status: o.status }))
      : (degradedWidgets.push('recentOrders'), []);

  const loyaltyPoints =
    loyaltyRes.status === 'fulfilled'
      ? loyaltyRes.value.points
      : (degradedWidgets.push('loyaltyPoints'), null);

  return {
    userSummary: { name: userRes.value.name, tier: userRes.value.tier },
    recentOrders,
    loyaltyPoints,
    degradedWidgets,
  };
}`
    },
    whenToUse: [
      'Supporting multi-platform clients (iOS/Android Mobile, Web SPA, Smart TV, Public CLI) with vastly different payload and latency budgets',
      'Aggregating data from multiple fine-grained microservices into screen-specific view models',
      'Decoupling frontend release cycles from backend domain service schema changes'
    ],
    antiPatterns: [
      'Building a single monolithic "One-BFF-To-Rule-Them-All" shared by Mobile, Web, and Third-Party Partners',
      'Embedding database queries or domain state machines inside the BFF layer'
    ]
  },
  {
    id: 'dist-sidecar-ambassador',
    title: 'Sidecar & Ambassador (Service Mesh)',
    category: 'Modernization & Boundaries',
    group: 'Modernization',
    difficulty: 'Advanced',
    summary: 'Offloads cross-cutting networking concerns (mTLS, Envoy circuit breaking, telemetry, service discovery) into a co-located localhost proxy container.',
    tags: ['Sidecar', 'Service Mesh', 'Envoy', 'Istio', 'mTLS', 'Kubernetes'],
    problem: 'An organization runs polyglot microservices in Go, TypeScript, Python, Java, and Rust. Implementing and upgrading consistent mTLS certificate rotation, distributed tracing, circuit breaking, and load balancing SDK libraries across 5 different programming languages leads to version drift and security gaps.',
    solutionMechanics: 'Deploy a lightweight co-located proxy process (e.g., Envoy Sidecar in Kubernetes) inside the same Pod sharing the localhost network namespace. Inbound and outbound traffic is transparently intercepted via iptables/eBPF; the Sidecar/Ambassador handles mTLS handshakes, retries, telemetry, and L7 routing completely out-of-process.',
    architectureSteps: [
      '1. Shared Pod Network Namespace: Attach the Sidecar container to the same Kubernetes Pod as the application container so they communicate over loopback (127.0.0.1) with sub-millisecond latency.',
      '2. Transparent Traffic Interception: Configure iptables or eBPF socket redirection so outbound app calls to http://payments-svc are transparently routed through the local Envoy Ambassador proxy.',
      '3. Zero-Trust mTLS & SPIFFE Identity: The Sidecar automatically negotiates mutual TLS and rotates short-lived X.509 workload certificates without the app code touching TLS keys.',
      '4. Control Plane Config Push: A central Control Plane (Istio / Linkerd) pushes dynamic routing weights, circuit breaker thresholds, and fault-injection rules to all sidecars via xDS APIs.'
    ],
    failureModes: [
      {
        scenario: 'Sidecar Startup Race Condition in Kubernetes',
        impact: 'The application container starts in 100ms and immediately attempts to connect to Postgres before the Envoy sidecar has finished initializing, crashing the Pod on boot.',
        mitigation: 'Use Kubernetes Native Sidecar Containers (restartPolicy: Always in initContainers, K8s 1.28+) so the kubelet guarantees the sidecar is healthy before starting the main app container.'
      },
      {
        scenario: 'Sidecar Memory & Tail-Latency Tax at Scale',
        impact: 'Running 2,000 Pods with an Envoy sidecar per Pod consumes 200GB+ of cluster RAM and adds ~1.5ms P99 latency per hop.',
        mitigation: 'Scope Envoy egress discovery using Sidecar CRD visibility limits, or evaluate ambient/sidecarless eBPF per-node proxies for ultra-dense clusters.'
      }
    ],
    tradeoffs: {
      latency: 'Adds ~0.5ms–1.5ms localhost loopback + proxy parsing latency per network hop.',
      throughput: 'High (C++/Rust proxies like Envoy/Linkerd2-proxy handle tens of thousands of RPS per core).',
      consistency: 'Guarantees 100% uniform mTLS, retry, and telemetry behavior across all programming languages.',
      complexity: 'High operational complexity: requires managing a Service Mesh control plane and debugging proxy xDS configs.'
    },
    codeOrConfigSnippet: {
      title: 'Envoy Ambassador Outbound Cluster Config with Circuit Breaking & mTLS',
      language: 'yaml',
      code: `# Envoy / Istio DestinationRule configuring Sidecar Ambassador resilience
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payments-service-ambassador
spec:
  host: payments.prod.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL # Automatic zero-trust mTLS with SPIFFE cert rotation
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 10
    outlierDetection:    # Passive Circuit Breaker at the Sidecar layer
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50`
    },
    whenToUse: [
      'Polyglot microservice fleets (Go + Python + Node + Java) requiring uniform mTLS, tracing, and traffic routing',
      'Enforcing zero-trust network encryption and service-to-service RBAC authorization policies',
      'Injecting chaos/faults (delays, 503 aborts) or running canary traffic splits without changing application code'
    ],
    antiPatterns: [
      'Adopting a full Service Mesh for a 3-service deployment where an ingress gateway suffices',
      'Enabling retries in BOTH the application SDK and the Envoy Sidecar simultaneously (causing multiplicative retry storms)'
    ]
  }
];
