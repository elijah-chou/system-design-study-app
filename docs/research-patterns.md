# Software Design Patterns & Distributed Architecture Patterns — Curriculum & Feature Blueprint

## 1. Executive Summary & Pedagogical Philosophy

Traditional software engineering curricula treat **Object-Oriented Design Patterns (Gang of Four)** and **Distributed Cloud/System Architecture Patterns** as disconnected disciplines. In modern software engineering, however, they form a continuous spectrum:
- **In-Process Patterns (GoF & Enterprise Application Architecture):** Govern how code, modules, and domain boundaries are structured inside a single service or runtime (e.g., *Strategy* for pluggable rate-limiting algorithms, *Decorator* for HTTP middleware pipelines, *Observer* for reactive UI state or event loops).
- **Cross-Process / Distributed Patterns (Cloud, Microservices, & Data Systems):** Govern how independent nodes coordinate over an unreliable network with variable latency, partial failures, and independent scaling requirements (e.g., *Circuit Breaker*, *Transactional Outbox*, *Saga*, *CQRS*, *Consistent Hashing*).

### Core Pedagogical Principles for the Study Application
1. **Modern Context Over 1994 Boilerplate:** Classic GoF patterns must be taught with both their canonical OOP structure and their **modern idiomatic equivalents** (e.g., first-class functions/closures replacing verbose single-method Strategy/Command interfaces; Dependency Injection containers replacing raw global Singletons; ES/Python/TypeScript decorators and middleware pipelines).
2. **First-Class Anti-Patterns & "When NOT to Use":** Senior engineering judgment is defined by knowing when a pattern introduces unnecessary complexity ("Enterprise-itis", Anemic Domain Models, Distributed Monoliths, Dual-Write Split-Brain). Every pattern module includes explicit **Anti-Patterns & Smells** and **Decision Trees**.
3. **Quantified Distributed Trade-offs:** Every cloud and distributed pattern is analyzed across four axes:
   - **Latency Impact** (e.g., P50 vs P99 tail latency, synchronous hops vs async eventual consistency lag)
   - **Throughput & Scalability** (e.g., write amplification in Outbox, read/write scaling in CQRS)
   - **Consistency & Correctness** (e.g., ACID vs BASE, idempotency requirements, duplicate delivery)
   - **Failure Modes & Blast Radius** (e.g., thundering herds, cascading failures, compensating transaction failures, split-brain)
4. **Interactive Visual & Simulation Aids:** Rather than static text, each pattern category pairs with interactive state-machine sandboxes, side-by-side refactoring toggles ("Before: Spaghetti/Anti-Pattern" vs "After: Idiomatic Pattern"), and failure-injection simulators.

---

## 2. Part I: Classic Software Design Patterns (GoF) in Modern Engineering

The curriculum organizes the 23 Gang of Four patterns into three foundational pillars (**Creational**, **Structural**, **Behavioral**), prioritized by modern production relevance and paired with real-world framework case studies and TypeScript/Go/Python/Java code examples.

### 2.1 Creational Patterns (Object & Resource Lifecycle)

| Pattern | Core Intent | Modern Framework / Production Context | When to Use | Anti-Patterns & Modern Pitfalls |
| :--- | :--- | :--- | :--- | :--- |
| **Builder** | Separate complex object construction from its representation; step-by-step fluent assembly. | HTTP request builders (`fetch`/Axios/Java `HttpClient`), SQL/ORM Query Builders (Knex, Prisma, TypeORM), Zod schema chaining, Docker/K8s manifest builders. | Objects with >4 optional parameters, immutable config objects, or multi-step validation before instantiation. | **Telescoping Constructor Anti-Pattern** (what Builder solves); **Over-engineered Builder** when language supports named/destructuring parameters with defaults (e.g., TypeScript options object `{ timeout = 5000, retries = 3 }: ConfigOptions`). |
| **Factory Method & Abstract Factory** | Define an interface for creating an object or families of related objects without specifying concrete classes. | Cross-platform UI kits (React Native / Flutter platform renderers), Database Driver abstractions (JDBC, Prisma Adapters), Cloud Provider SDKs (S3 vs GCS vs Azure Blob storage clients). | Runtime selection of storage/transport backends; multi-tenant or cross-platform plugin architectures. | **Speculative Factory ("Enterprise-itis"):** Creating `IUserServiceFactory` and `AbstractUserFactoryImpl` when there is only 1 concrete implementation and a simple constructor or function suffices. |
| **Singleton (and DI Scoped Lifecycles)** | Ensure a class has a single shared instance and provide a global access point. | Connection pools (`pg.Pool`, Prisma Client instance), Logger instances, In-memory configuration caches. | Managing scarce shared OS/network resources (TCP connection pools, thread pools, hardware handles). | **Global Mutable State Abuse:** Classic `MyClass.getInstance()` hides dependencies, breaks parallel unit testing, and causes tight coupling. **Modern Fix:** Use **Dependency Injection (DI)** container singleton/scoped lifecycles or module-level immutable exports. |
| **Prototype** | Create new objects by cloning an existing configured instance rather than instantiating from scratch. | JavaScript/TypeScript object spread/structuredClone, deep-cloning base HTTP client configurations with pre-authenticated headers, game engine entity spawning. | When object initialization involves expensive parsing, DB lookups, or deep configuration trees. | **Shallow vs Deep Clone Bugs:** Accidentally sharing nested mutable array/object references across cloned instances, causing cross-request data leaks. |

#### Code & Architecture Example Blueprint (Creational: Builder + Functional Options vs Telescoping Constructors)
- **Before (Anti-Pattern):** `new HttpClient("https://api.example.com", 5000, true, 3, null, "Bearer xyz", false)` — unreadable boolean flags and positional fragility.
- **After (Classic Fluent Builder + Modern TypeScript/Go Functional Options):**
  ```typescript
  // Modern TypeScript Fluent & Immutable Request Builder with Compile-Time Safety
  export class ResilientClientBuilder {
    private config: ClientConfig = { timeoutMs: 3000, maxRetries: 0, circuitBreaker: false };

    withTimeout(ms: number): this {
      if (ms <= 0) throw new Error("Timeout must be positive");
      this.config = { ...this.config, timeoutMs: ms };
      return this;
    }

    withRetries(maxRetries: number, backoffMs = 200): this {
      this.config = { ...this.config, maxRetries, backoffMs };
      return this;
    }

    withCircuitBreaker(failureThreshold: number): this {
      this.config = { ...this.config, circuitBreaker: true, failureThreshold };
      return this;
    }

    build(): ResilientHttpClient {
      return new ResilientHttpClient(Object.freeze(this.config));
    }
  }
  ```

---

### 2.2 Structural Patterns (Composition, Boundaries & Wrappers)

| Pattern | Core Intent | Modern Framework / Production Context | When to Use | Anti-Patterns & Modern Pitfalls |
| :--- | :--- | :--- | :--- | :--- |
| **Adapter (Wrapper)** | Convert the interface of a class/SDK into another domain interface clients expect. | Payment gateway integrations (`PaymentProvider` interface wrapping Stripe, Adyen, PayPal SDKs), Hexagonal / Clean Architecture Ports & Adapters. | Isolating core domain logic from third-party vendor SDKs or legacy APIs with incompatible schemas. | **Leaky Abstraction Adapter:** Exposing vendor-specific exceptions or types (e.g., `StripeCardError`) through the domain port instead of translating them into domain errors. |
| **Decorator** | Attach additional responsibilities to an object dynamically without subclassing; composable wrapping. | Express/Fastify/Koa HTTP middleware (`withAuth(withRateLimit(withLogging(handler)))`), Python `@functools.lru_cache`, React Higher-Order Components, Java `InputStream` wrappers. | Adding cross-cutting concerns (logging, telemetry, caching, auth, retry) orthognally and composably. | **Decorator Onion Hell:** Deeply nested 15-layer decorators that obscure stack traces, mutate shared context unexpectedly, or depend on fragile ordering (e.g., caching before auth check!). |
| **Facade** | Provide a unified, simplified higher-level interface to a complex set of subsystems. | API Gateways, Backend-for-Frontend (BFF) services, SDK client wrappers that orchestrate auth + pagination + serialization behind one call. | Shielding callers from complex multi-step subsystem interactions or reducing coupling between modules. | **The God Facade:** Stuffing core domain business rules and state mutation directly into the Facade until it becomes a 5,000-line God Object violating Single Responsibility. |
| **Proxy** | Provide a surrogate or placeholder for another object to control access, lazy-load, or monitor it. | ES6 `Proxy` (Vue 3 reactivity, Immer immutable state), ORM Lazy Loading proxies, Reverse Proxies (NGINX, Envoy), gRPC client stubs. | Access control/RBAC guards, virtual lazy loading of expensive graphs, transparent remote RPC invocation, caching. | **N+1 Query Trap via Transparent Lazy Proxies:** ORM relation proxies firing hundreds of hidden synchronous SQL queries inside a loop because network I/O looks like a local property access. |
| **Composite & Flyweight** | **Composite:** Treat individual objects and recursive tree compositions uniformly. **Flyweight:** Share common intrinsic state across thousands of fine-grained objects. | **Composite:** React/DOM virtual trees, File System directories/files, AST nodes, UI layout containers. **Flyweight:** Text editor glyph rendering, game particle systems, string interning. | **Composite:** Hierarchical tree structures. **Flyweight:** Memory-constrained environments with millions of duplicate structural objects. | Prematurely applying Flyweight when modern V8/JVM garbage collectors and simple value objects handle memory adequately, resulting in unreadable split intrinsic/extrinsic code. |

#### Code & Architecture Example Blueprint (Structural: Composable Middleware Decorator Pipeline)
```typescript
// Composable Functional & OOP Decorator Pattern for Service Calls
export type AsyncHandler<TReq, TRes> = (req: TReq) => Promise<TRes>;

export function withTimingAndMetrics<TReq, TRes>(
  metricName: string,
  next: AsyncHandler<TReq, TRes>
): AsyncHandler<TReq, TRes> {
  return async (req: TReq): Promise<TRes> => {
    const start = performance.now();
    try {
      return await next(req);
    } finally {
      const durationMs = performance.now() - start;
      console.debug(`[Metric] ${metricName} completed in ${durationMs.toFixed(2)}ms`);
    }
  };
}
```

---

### 2.3 Behavioral Patterns (Communication, Algorithms & State Flow)

| Pattern | Core Intent | Modern Framework / Production Context | When to Use | Anti-Patterns & Modern Pitfalls |
| :--- | :--- | :--- | :--- | :--- |
| **Strategy** | Define a family of interchangeable algorithms, encapsulate each one, and make them swappable at runtime. | Pluggable Rate Limiting algorithms (Token Bucket vs Sliding Window), Auth strategies (`Passport.js` JWT vs OAuth), Compression/Sorting/Pricing engines, Load Balancing routing policies. | Eliminating sprawling `if/else` or `switch` blocks over algorithm variants; enabling open/closed extensibility and isolated unit testing. | **Class Explosion for Trivial Functions:** Creating 10 separate classes implementing `IDiscountStrategy` when a map of pure functions `Record<Tier, (price: number) => number>` is cleaner. |
| **Observer (Pub/Sub)** | Define a one-to-many dependency so that when one object changes state, all dependents are notified automatically. | RxJS observables, React/Zustand/Signals reactive state, Node.js `EventEmitter`, DOM Event Listeners, Webhook dispatchers, Kafka/Redis Pub-Sub (at system scale). | Decoupling event producers from N dynamic, independent consumers (UI updates, audit logs, notifications). | **Lapsed Listener Memory Leak:** Forgetting to unsubscribe observers (`removeEventListener` / `useEffect` cleanup), keeping dead references in memory forever. **Synchronous Cascade:** Unbounded cascading updates freezing the main thread. |
| **State** | Allow an object to alter its behavior when its internal state changes, encapsulating state-specific transitions. | XState finite state machines, Order Lifecycle (`Draft -> Paid -> Fulfilled -> Refunded`), Circuit Breaker (`Closed -> Open -> Half-Open`), TCP connection protocol states. | Entities with strict state transition rules where certain operations are illegal in certain states. | **Boolean Flag Soup:** Using `{ isPaid: boolean, isCancelled: boolean, isShipped: boolean }` instead of an explicit State machine, allowing impossible states like `isCancelled && isShipped`. |
| **Command** | Encapsulate a request/action as a standalone object containing all parameters, supporting queuing, logging, and undo/redo. | Rich text/canvas Undo/Redo stacks (Figma, ProseMirror), Redux actions, Task Queue job payloads (BullMQ, Celery), CQRS Command handlers. | Transactional undo/redo history, deferred job queue execution, audit logging of user intentions. | **Boilerplate Command Dispatchers:** Wrapping every simple method call in a Command object when no queuing, auditing, undo, or cross-boundary serialization is needed. |
| **Chain of Responsibility** | Pass requests along a dynamic chain of handlers until one handles it or short-circuits the pipeline. | HTTP Middleware chains, Validation pipelines, Exception filter chains, DOM Event Bubbling, Logging level filters. | Sequential validation, enrichment, or security checks where any stage can short-circuit or delegate forward. | **Unhandled Request Blackhole:** Failing to define a clear fallback/terminal handler when no link in the chain matches the request. |
| **Template Method & Iterator** | **Template:** Define skeleton of an algorithm in base class, deferring steps to hooks. **Iterator:** Sequentially access elements without exposing underlying storage. | **Template:** React class lifecycle / test runner hooks (`beforeEach`/`afterEach`), ETL pipeline base runners. **Iterator:** ES6 `[Symbol.iterator]` & Async Generators (`for await...of` paginated API cursors). | **Template:** Standardized framework lifecycles. **Iterator:** Streaming cursor pagination over large datasets without loading all rows into RAM. | **Fragile Base Class Problem (Template Method):** Deep inheritance hierarchies where changing the base template breaks 20 subclasses. Prefer **Composition / Strategy hooks** over deep inheritance. |

---

## 3. Part II: Enterprise & Cloud-Native Distributed Architecture Patterns

In distributed systems, patterns address the **Fallacies of Distributed Computing** (the network is not reliable, latency is not zero, bandwidth is finite, topology changes, partial failure is the norm). We organize these into four critical domains:
1. **Resilience & Fault Tolerance Patterns**
2. **Distributed Data & Consistency Patterns**
3. **Traffic Management, Scaling & Coordination Patterns**
4. **Modernization & Service Boundary Patterns (Martin Fowler & Cloud Design)**

---

### 3.1 Resilience & Fault Tolerance Patterns

#### 1. Circuit Breaker Pattern
- **Problem:** When a downstream dependency (Service B or a DB) becomes slow or unresponsive, callers (Service A) keep sending requests that block threads/connections until timeout, causing a **cascading failure** across the entire fleet.
- **Mechanism (3-State Finite State Machine):**
  1. `CLOSED` (Normal): Requests pass through. Sliding window tracks failure rate / slow-call rate. If `failureRate >= threshold` (e.g., 50% over last 20 requests), trips to `OPEN`.
  2. `OPEN` (Failing Fast): All calls immediately short-circuit (<1ms latency) and return an error or invoke a **Fallback** (cached data, degraded default response, queued retry) without touching the network. After `resetTimeout` (e.g., 15s), transitions to `HALF_OPEN`.
  3. `HALF_OPEN` (Probing): Allows a limited number of probe requests (`permittedCallsInHalfOpenState`, e.g., 3). If they succeed, resets to `CLOSED`; if any fail, immediately trips back to `OPEN`.
- **Trade-offs:**
  - *Latency:* Eliminates P99 timeout hangs (e.g., turns 10,000ms timeouts into 0.1ms fast-fails).
  - *Availability:* Enables graceful degradation rather than total outage.
  - *Risks / Failure Modes:* Misconfigured thresholds can cause **flapping** (rapid toggling between Open and Closed) or false positives during transient network blips; in multi-instance clusters, local circuit breakers may trip unevenly unless tuned per-instance.

#### 2. Bulkhead Pattern
- **Problem:** A single application calls three downstream services (Payments, Recommendations, Analytics) sharing one global thread pool or connection pool. If Analytics hangs, it exhausts 100% of threads, taking down Payments.
- **Mechanism:** Partition resources into isolated compartments ("bulkheads" on a ship):
  - **Thread-Pool Isolation:** Dedicated thread pools per downstream dependency (no shared queue overhead, hard CPU/thread isolation).
  - **Semaphore / Connection-Pool Isolation:** Limit concurrent in-flight requests per dependency or per tenant (lightweight, works well with async/non-blocking runtimes like Node.js/Go/Tokio).
  - **Cell-Based / Pod Isolation:** Partitioning infrastructure into independent cells so a noisy enterprise tenant can only impact their assigned cell.
- **Trade-offs:**
  - *Blast Radius:* Prevents noisy neighbors or non-critical dependencies from starving critical paths.
  - *Efficiency Cost:* Lower resource utilization—idle capacity in Pool A cannot be borrowed when Pool B spikes.

#### 3. Retry with Exponential Backoff & Jitter (+ Idempotency Keys)
- **Problem:** Transient network glitches or brief GC pauses cause sporadic 503/timeout errors. Naive immediate retries from 10,000 clients simultaneously create a **Retry Storm / Thundering Herd** that hammers the recovering server back into the ground.
- **Mechanism:**
  - **Exponential Backoff:** Wait time grows exponentially per attempt: $T = \min(\text{cap}, \text{base} \times 2^{\text{attempt}})$.
  - **Full Jitter (AWS Standard):** Randomize sleep time uniformly: $T_{\text{sleep}} = \text{random}(0, \min(\text{cap}, \text{base} \times 2^{\text{attempt}}))$. Desynchronizes client waves into a flat, manageable load.
  - **Idempotency Requirement:** Retrying a non-idempotent `POST /charge` when the first request actually succeeded on the server (but the response was lost over the network) causes a double-charge unless guarded by a client-generated `Idempotency-Key` stored atomically by the server.
- **Failure Modes:**
  - **Retry Amplification in Deep Call Chains:** If Service A retries 3x -> Service B retries 3x -> Service C retries 3x, a single database hiccup at the leaf causes $3^3 = 27\times$ load amplification! **Rule:** Only retry at one layer (typically the immediate caller or edge), or enforce a global **Retry Budget** (e.g., max 10% of total traffic can be retries).

---

### 3.2 Distributed Data, Messaging & Consistency Patterns

#### 4. Transactional Outbox Pattern (Solving the Dual-Write Problem)
- **Problem (The Dual-Write Anti-Pattern):** A service updates its relational database (`UPDATE orders SET status = 'PAID'`) and then publishes an event to Kafka (`kafka.send('OrderPaid')`).
  - *Failure 1:* DB commit succeeds, process crashes before `kafka.send()` -> Downstream services never know the order was paid (**inconsistent state**).
  - *Failure 2:* `kafka.send()` happens before DB commit, then DB commit rolls back -> Downstream services process a phantom order!
- **Mechanism:**
  1. Execute a **single local ACID database transaction** that both updates the `orders` table AND inserts a row into an `outbox_events` table in the same database.
  2. An asynchronous relay process (**Polling Publisher** using `SELECT ... FOR UPDATE SKIP LOCKED` or **Transaction Log Tailer / CDC** via Debezium reading PostgreSQL WAL / MySQL binlog) reads uncommitted outbox rows and publishes them to the message broker.
  3. Once broker ACKs, mark the outbox row processed (or advance CDC offset).
- **Trade-offs & Guarantees:**
  - Guarantees **At-Least-Once Delivery** (never loses an event if DB committed).
  - Because the relay can crash *after* publishing to Kafka but *before* marking the outbox row sent, downstream consumers **MUST be idempotent** (deduplicate by `event_id` in an **Inbox Table** or Redis).
  - *Throughput Cost:* Doubles local DB write I/O (mitigated by partition-dropping old outbox tables or WAL-based CDC).

#### 5. Saga Pattern (Choreography vs. Orchestration)
- **Problem:** How to execute a business workflow spanning multiple microservices (e.g., `OrderService` -> `PaymentService` -> `InventoryService` -> `ShippingService`) where each service has its own private database, without using blocking, brittle distributed Two-Phase Commit (2PC/XA) locks.
- **Mechanism:** Break the global transaction into a sequence of local ACID transactions ($T_1, T_2, \dots, T_n$). If step $T_k$ fails (e.g., inventory out of stock), execute backward **Compensating Transactions** ($C_{k-1}, \dots, C_1$) to semantically undo prior steps (e.g., refund payment, cancel order).
- **Two Coordination Topologies:**

| Dimension | Choreography (Event-Driven) | Orchestration (Central Coordinator / State Machine) |
| :--- | :--- | :--- |
| **How it works** | Services emit domain events (`OrderCreated`, `PaymentCharged`) and listen to each other's events with no central controller. | A dedicated Orchestrator service (e.g., Temporal, AWS Step Functions, Camunda) sends commands to participants and tracks state transitions. |
| **Pros** | Loose coupling, simple for 2–3 services, no central single point of logic. | Explicit visibility into workflow state, easy to handle timeouts/retries/compensations, avoids cyclic event dependencies. |
| **Cons / Failure Modes** | **"Pinball Architecture":** With >4 steps, flow becomes hard to trace, debug, or modify; risk of circular event loops. | Risk of Putting business logic into the orchestrator ("Smart Orchestrator, Dumb Services" anti-pattern). |

- **ACID vs ACD Trade-off (Lack of Isolation):** Sagas lack **I (Isolation)** in ACID—intermediate uncommitted states are visible to other concurrent reads ("dirty reads") until the saga completes or compensates. Countermeasures: **Semantic Locks** (marking state `PENDING_APPROVAL`), **Commutative Updates**, or **Pivot Transactions**.

#### 6. CQRS (Command Query Responsibility Segregation) & Event Sourcing
- **CQRS Concept:** Separate the **Write Model (Command side)**—optimized for transactional validation, normalized domain invariants, and high write integrity—from the **Read Model (Query side)**—denormalized projections tailored for fast UI queries (e.g., Elasticsearch for search, Redis/Materialized Views for dashboards).
- **Event Sourcing Concept:** Instead of mutating rows in place (`UPDATE accounts SET balance = 500`), persist an append-only, immutable log of domain events (`AccountOpened($0)`, `MoneyDeposited(+$700)`, `MoneyWithdrawn(-$200)`). Current state is folded/reconstructed from events (+ periodic **Snapshots** every $N$ events so replay remains $O(1)$ bounded).
- **Trade-offs:**
  - *Pros:* Complete time-travel audit trail, ability to build brand-new read projections retroactively from historical events, independent scaling of read-heavy (95%) vs write-heavy (5%) workloads, zero impedance mismatch for complex domains.
  - *Cons & Failure Modes:*
    - **Replication Lag / Read-Your-Own-Writes Violation:** User submits a Command, immediately refreshes page, and queries the Read Model before the async projection catches up! (Mitigated by returning updated state from Command, client optimistic UI, or passing a `version/LSN` token to read replicas).
    - **Event Schema Evolution:** Immutable events live forever; changing `OrderCreated_v1` to `v2` requires **Upcasters** and strict backward/forward schema compatibility.
    - **GDPR / Right-to-be-Forgotten:** Deleting PII from an immutable append-only log requires **Crypto-Shredding** (encrypting user PII per-user key and deleting the key).

---

### 3.3 Traffic Management, Scaling & Distributed Coordination Patterns

#### 7. Consistent Hashing & Virtual Nodes
- **Problem:** Modulo hashing (`server = hash(key) % N`) remaps $\frac{N-1}{N} \approx 90\%+$ of all keys whenever a cache or storage node joins or crashes, triggering a catastrophic cache stampede on the underlying database.
- **Mechanism:**
  - Map both node IDs and data keys onto a 32-bit or 64-bit integer hash ring ($[0, 2^{32}-1]$) using a fast uniform hash (`MurmurHash3` or `xxHash` — never slow cryptographic SHA-256 on hot paths unless needed).
  - A key belongs to the first node encountered walking clockwise on the ring (implemented as an array of sorted ring tokens searched in $O(\log V)$ via binary search).
  - **Virtual Nodes (V-Nodes):** Assign each physical node $K$ virtual tokens (e.g., $K = 100\text{–}200$) across the ring.
    - Eliminates non-uniform data skew (standard deviation of load drops to $<5\%$ at 150 v-nodes).
    - Allows **heterogeneous hardware weighting** (a 64GB RAM node gets 200 v-nodes; a 32GB node gets 100 v-nodes).
    - Spreads recovery load evenly across *all* surviving nodes when one node dies, instead of dumping 100% of the dead node's traffic onto a single clockwise neighbor.
  - **Bounded-Load Consistent Hashing:** Caps any node's load at $c \times \text{average load}$ (e.g., $1.25\times$), overflowing hot keys to the next node clockwise.

#### 8. Rate Limiting Algorithms (Deep Dive Comparison)
Essential for protecting APIs from abuse, DDoS, noisy tenants, and runaway billing.

| Algorithm | State Stored per Key | Burst Handling | Boundary Spike Vulnerability | Memory Footprint | Best Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Token Bucket** | `tokens` (float), `lastRefillTime` (timestamp) | Allows controlled bursts up to bucket capacity $B$, refilling at rate $R$/sec. | Safe (bounded by $B + R \cdot \Delta t$). | Very Low (2 numbers per key). | General API Gateways (AWS API Gateway, Stripe) where brief user bursts are natural. |
| **Leaky Bucket** | FIFO Queue or `waterLevel` + `lastLeakTime` | Smooths bursts into a strict constant outflow rate. | Safe (strict pacing). | Low. | Protecting fragile legacy downstream systems or network packet shaping. |
| **Fixed Window Counter** | `count` (int) per time bucket key (e.g., `user:123:17000001`) | Allows full quota any time within window. | **Vulnerable:** $2\times$ quota burst across window boundary (e.g., 100 reqs at `00:59` + 100 reqs at `01:01`). | Ultra Low (1 integer + TTL). | Simple coarse quotas (e.g., daily billing limits). |
| **Sliding Window Log** | Sorted Set (`ZSET`) of exact request timestamps | Exact enforcement over rolling window $[t - W, t]$. | **100% Immune** (exact rolling count). | **High** ($O(N)$ timestamps stored per user). | High-value low-volume actions (e.g., login attempts, password resets, financial transfers). |
| **Sliding Window Counter** | `prevWindowCount` + `currWindowCount` | Weighted approximation: $\text{curr} + \text{prev} \times (1 - \text{windowProgress})$. | Smooths boundary spike with >99% accuracy in practice (Cloudflare benchmark). | Very Low (2 counters). | High-scale edge rate limiting (Cloudflare, NGINX) needing accuracy + tiny RAM. |

- **Distributed Race Condition & Atomic Lua Fix:** In a distributed API Gateway backed by Redis, doing `GET count` in app code followed by `INCR count` creates a TOCTOU race condition under concurrent requests. **Solution:** Execute the check-and-decrement inside a single **atomic Redis Lua script** (or Redis 7+ functions) so read, math, and write execute atomically on the single-threaded Redis event loop.

#### 9. Leader Election, Consensus & Fencing Tokens (Split-Brain Prevention)
- **Problem:** When a primary coordinator node (e.g., job scheduler, partition master, single-writer lock holder) freezes due to a long **Stop-the-World GC pause** or network partition, the cluster elects a *new* Leader (Node 2). When Node 1 wakes up from its GC pause, it still thinks it is the leader (**Split-Brain / Zombie Leader**) and corrupts shared storage.
- **Mechanism:**
  - Use a Raft/Paxos-backed coordination service (**etcd** leases or **ZooKeeper** ephemeral sequential znodes) to elect a leader via quorum majority ($\lfloor N/2 \rfloor + 1$).
  - **Fencing Tokens (Martin Kleppmann / DDIA Standard):** Every time a lock or leadership lease is granted, the lock service increments a monotonically increasing integer `fencing_token` (e.g., Node 1 gets token `33`; after timeout, Node 2 is elected with token `34`).
  - The downstream storage resource rejects any write carrying a `fencing_token < max_seen_token` (`33 < 34` -> rejected!), guaranteeing total immunity against zombie leaders.

---

### 3.4 Modernization & Service Boundary Patterns (Martin Fowler & Cloud Design)

| Pattern | Core Problem Solved | Architectural Mechanism | Key Trade-offs & Pitfalls |
| :--- | :--- | :--- | :--- |
| **Strangler Fig** | Rewriting a massive legacy monolith from scratch ("Big Bang Rewrite") almost always fails, takes years, and freezes feature delivery. | Place an edge Routing Proxy / API Gateway in front of the monolith. Incrementally build new vertical slices as modern services and route specific URI paths/traffic percentages (canary) to the new service until the monolith shrinks away. | Requires careful shared session/auth handling and temporary data synchronization between old and new databases during transition. |
| **Anti-Corruption Layer (ACL)** | Integrating a new clean domain service with a legacy system (or external vendor) whose messy database schema and naming conventions threaten to pollute the new codebase. | Build an explicit translation boundary (Adapter + Facade + Domain Translator) that converts legacy models/events into clean Domain-Driven Design (DDD) bounded-context models. | Adds serialization/mapping latency and maintenance overhead when legacy schemas change, but preserves long-term domain integrity. |
| **Backends for Frontends (BFF)** | A single general-purpose API returns either bloated payloads for mobile clients or requires 10 chatty round-trips for complex desktop dashboards. | Create purpose-built, experience-specific facade services (e.g., `Mobile-BFF`, `Web-BFF`, `Public-Partner-API`) owned by the respective frontend teams to aggregate and tailor downstream microservice calls. | **Duplication Risk:** Business logic or auth rules accidentally duplicated across BFFs instead of staying in core domain services. |
| **Sidecar & Ambassador** | Implementing observability, mTLS, service discovery, and circuit breaking libraries in 6 different programming languages across polyglot microservices. | Deploy a co-located helper process/container (e.g., Envoy Proxy in Istio/Linkerd, Datadog agent) sharing the same Pod/localhost network namespace to handle ingress/egress ("Ambassador"), mTLS, retries, and telemetry out-of-process. | Adds ~1–2ms localhost network hop latency and per-pod CPU/RAM footprint (leading to modern debates between Sidecar vs eBPF/Sidecarless Service Mesh). |

---

## 4. Feature & Interactive Component Blueprint for the Study Application

To make the Systems Design Study Application a best-in-class active learning environment, the Pattern & Architecture module should implement the following interactive features and data structures:

### 4.1 Pattern Explorer & Multi-Dimensional Filter Matrix
Each pattern entry in the application's catalog should be structured with rich metadata so users can filter, compare, and study systematically:
- **Taxonomy Tags:** `Creational`, `Structural`, `Behavioral`, `Resilience`, `Distributed Data`, `Traffic & Scaling`, `Modernization`.
- **Scale Scope:** `In-Process (Code/Module)` vs `Cross-Process (Distributed/Cloud)`.
- **Problem Signatures ("Smells It Fixes"):** e.g., *"Telescoping constructors"*, *"Cascading timeout outages"*, *"Dual-write split-brain between DB and Kafka"*, *"Cache stampede on node scale-up"*.
- **Structured Card Schema:**
  ```typescript
  export interface DesignPatternEntry {
    id: string;
    name: string;
    category: 'gof-creational' | 'gof-structural' | 'gof-behavioral' | 'cloud-resilience' | 'distributed-data' | 'distributed-coordination' | 'enterprise-boundary';
    scaleScope: 'in-process' | 'distributed' | 'hybrid';
    difficulty: 'Foundational' | 'Intermediate' | 'Advanced';
    oneLiner: string;
    problemContext: string;
    modernRealWorldExamples: string[];
    whenToUse: string[];
    antiPatternsAndTraps: {
      name: string;
      symptom: string;
      fix: string;
    }[];
    tradeOffs: {
      latency: string;
      throughput: string;
      consistencyOrComplexity: string;
      failureModes: string[];
    };
    codeComparison: {
      antiPatternTitle: string;
      antiPatternCode: string;
      idiomaticTitle: string;
      idiomaticCode: string;
    };
    asciiOrMermaidDiagram: string;
    interviewPrompt: {
      scenario: string;
      keyTalkingPoints: string[];
      followUpTrapQuestion: string;
    };
  }
  ```

### 4.2 Interactive Sandboxes & Visual Simulators (Pattern Labs)
1. **Circuit Breaker + Retry w/ Jitter Simulator:**
   - Interactive controls for Downstream Failure Rate (0%–100%), Request Rate, Circuit Failure Threshold, Reset Timeout, and Retry Strategy (`No Jitter / Fixed Backoff` vs `Exponential Backoff + Full Jitter`).
   - Live visual state badge (`CLOSED` -> `OPEN` -> `HALF-OPEN`) and request timeline showing how Full Jitter flattens retry storms while Fixed Backoff causes synchronized spikes.
2. **Rate Limiter Algorithm Sandbox:**
   - Interactive request burst buttons ("Send 1 Request", "Send 10-Request Burst", "Boundary Edge Spike").
   - Side-by-side live visualization of **Token Bucket** vs **Fixed Window Counter** vs **Sliding Window Counter**, demonstrating how Fixed Window permits $2\times$ quota across window edges while Token Bucket and Sliding Window enforce smooth bounds.
3. **Consistent Hashing Ring Visualizer:**
   - Interactive hash ring where users can add/remove physical nodes and adjust the **Virtual Nodes ($K$) slider** ($K = 1, 5, 50, 150$).
   - Displays the percentage of keys remapped on node failure ($\approx 1/N$ vs $\approx 90\%$ in `hash % N`) and the standard deviation of key distribution across nodes.
4. **Before / After Refactoring Toggle (GoF Code Diff View):**
   - Every GoF and Enterprise pattern features a toggleable split view comparing **"Before: Naive / Anti-Pattern Code"** (e.g., 60-line nested `if/else` payment processor or dual-write DB+Kafka controller) against **"After: Idiomatic Pattern Implementation"** with inline callouts explaining *why* each change improves testability, extensibility, or fault tolerance.

### 4.3 "Spot the Anti-Pattern" Active-Recall Diagnostic Quizzes
Instead of rote memorization questions ("What are the 4 participants in the Strategy pattern?"), quizzes present **realistic production incident scenarios and code reviews**:
- *Scenario 1 (Dual-Write Bug):* "An checkout service commits an order to PostgreSQL and immediately calls `rabbitMQ.publish('order.created')`. Under high load, 0.2% of paid orders never trigger fulfillment emails, and no exceptions appear in RabbitMQ logs. Which pattern resolves this and what consumer-side guarantee does it require?" -> **Transactional Outbox + Idempotent Consumer**.
- *Scenario 2 (Retry Amplification):* "An API Gateway, an Order Service, and a Payment Service each configure `maxRetries: 4` on timeout. When the Payment DB slows down for 5 seconds, traffic to the DB spikes by $64\times$ and crashes the cluster. What architectural anti-pattern occurred, and which two patterns prevent it?" -> **Retry Storm / Cascading Retry Amplification -> Fix with Single-Layer Retry w/ Exponential Backoff + Jitter + Circuit Breaker**.
- *Scenario 3 (Zombie Leader Split-Brain):* "A distributed cron worker acquires a Redis lock with a 10s TTL, experiences a 12s JVM GC pause, and then writes to the database after another worker has already acquired the lock. How do you guarantee storage safety?" -> **Monotonic Fencing Tokens verified at the storage layer**.
- *Scenario 4 (Over-Engineering vs Idiomatic GoF):* "A developer creates `AbstractNotificationStrategyFactoryBean` for an app that only sends emails via SendGrid. What anti-pattern is this, and when would a Strategy + Factory actually be justified?" -> **Speculative Generality / Enterprise-itis; justified only when runtime routing across multiple providers (e.g., SendGrid failover to SES, or tenant-configurable SMS/Push/Email channels) is required**.
