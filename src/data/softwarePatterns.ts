export interface SoftwarePattern {
  id: string;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  difficulty: 'Fundamental' | 'Intermediate' | 'Advanced' | 'Staff+';
  group: 'Creational' | 'Structural' | 'Behavioral';
  intent: string;
  modernContext: string;
  whenToUse: string[];
  antiPatterns: {
    name: string;
    symptom: string;
    fix: string;
  }[];
  tradeoffs: {
    pros: string[];
    cons: string[];
  };
  codeComparison: {
    badTitle: string;
    badCode: string;
    goodTitle: string;
    goodCode: string;
    explanation: string;
  };
  realWorldUsages: string[];
  relatedPatternIds: string[];
}

export const SOFTWARE_PATTERNS: SoftwarePattern[] = [
  // ==========================================
  // CREATIONAL PATTERNS
  // ==========================================
  {
    id: 'pattern-builder',
    title: 'Builder & Functional Options',
    category: 'GoF Creational',
    group: 'Creational',
    difficulty: 'Fundamental',
    summary: 'Separates step-by-step construction of complex, validated, immutable objects from their underlying representation.',
    tags: ['Creational', 'Immutability', 'Fluent API', 'TypeScript', 'GoF'],
    intent: 'Separate the construction of a complex object from its representation so that the same step-by-step assembly process can enforce invariants and produce immutable configurations.',
    modernContext: 'In languages with named parameters or object destructuring (TypeScript/Python), simple config bags replace trivial Builders. However, Fluent Builders remain essential for multi-stage query builders (Prisma/Knex), validation pipelines (Zod), and immutable SDK clients where parameters have cross-field invariants.',
    whenToUse: [
      'Constructing objects with >4 optional parameters or combinatorially complex configurations',
      'Enforcing cross-field validation invariants before an immutable instance is materialized',
      'Building fluent Domain-Specific Languages (DSLs) like SQL query builders, HTTP request pipelines, or test data factories'
    ],
    antiPatterns: [
      {
        name: 'Telescoping Constructor',
        symptom: 'Calling new HttpClient("https://api.io", 5000, true, 3, null, "Bearer xyz", false) where positional boolean and number flags are unreadable and error-prone.',
        fix: 'Replace positional parameters with a Fluent Builder or a typed Options object with sensible defaults.'
      },
      {
        name: 'Over-Engineered Ceremony Builder',
        symptom: 'Writing a 100-line Builder class for a plain data transfer object (DTO) with 3 simple fields and zero validation rules.',
        fix: 'Use TypeScript interface destructuring with default parameter values ({ timeoutMs = 3000, retries = 2 }: ClientOptions = {}).'
      },
      {
        name: 'Mutable Half-Baked Product',
        symptom: 'Exposing getters on a partially built object or allowing mutations to the Builder to retroactively mutate already-built instances.',
        fix: 'Clone and Object.freeze() the internal configuration snapshot inside build().'
      }
    ],
    tradeoffs: {
      pros: [
        'Eliminates positional argument errors and boolean flag confusion',
        'Centralizes cross-field invariant validation inside the terminal build() step',
        'Enables reusable partial templates (e.g., base staging vs production client builders)'
      ],
      cons: [
        'Increases boilerplate code compared to plain object literals',
        'Can defer missing required field errors from compile-time to runtime unless TypeState generics are used'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Telescoping Constructor & Unvalidated Mutation',
      badCode: `// Fragile positional args & boolean trap
export class HttpClient {
  constructor(
    public baseUrl: string,
    public timeoutMs: number,
    public retryEnabled: boolean,
    public maxRetries: number,
    public circuitBreaker: boolean,
    public failureThreshold: number,
    public authToken: string | null
  ) {
    // Wait: what if retryEnabled is false but maxRetries is 5?
    // Caller must remember exact order of 7 parameters!
  }
}

const client = new HttpClient(
  'https://payments.internal',
  3000,
  true,
  3,
  false,
  0,
  'Bearer secret'
);`,
      goodTitle: 'Idiomatic: Immutable Fluent Builder with Invariant Enforcement',
      goodCode: `export interface ClientConfig {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly backoffMs: number;
  readonly circuitFailureThreshold?: number;
  readonly headers: Readonly<Record<string, string>>;
}

export class ResilientClientBuilder {
  private config: ClientConfig;

  constructor(baseUrl: string) {
    if (!baseUrl.startsWith('http')) {
      throw new Error('baseUrl must include protocol scheme');
    }
    this.config = {
      baseUrl,
      timeoutMs: 3000,
      maxRetries: 0,
      backoffMs: 200,
      headers: {},
    };
  }

  withTimeout(timeoutMs: number): this {
    if (timeoutMs <= 0) throw new Error('Timeout must be > 0ms');
    this.config = { ...this.config, timeoutMs };
    return this;
  }

  withRetries(maxRetries: number, backoffMs = 200): this {
    if (maxRetries < 0 || maxRetries > 10) {
      throw new Error('maxRetries must be between 0 and 10');
    }
    this.config = { ...this.config, maxRetries, backoffMs };
    return this;
  }

  withBearerToken(token: string): this {
    this.config = {
      ...this.config,
      headers: { ...this.config.headers, Authorization: \`Bearer \${token}\` },
    };
    return this;
  }

  build(): ClientConfig {
    return Object.freeze({
      ...this.config,
      headers: Object.freeze({ ...this.config.headers }),
    });
  }
}`,
      explanation: 'The Fluent Builder guarantees that invalid states (such as negative timeouts or runaway retry counts) are caught immediately, while cloning and freezing inside build() prevents shared-reference mutation bugs.'
    },
    realWorldUsages: [
      'Zod / Yup schema definition pipelines (z.string().email().min(5))',
      'Knex.js, Prisma, and TypeORM SQL Query Builders',
      'Java HttpClient.newBuilder() & Go Functional Options (WithTimeout(5*time.Second))',
      'Test data builders (Object Mother / Factory Bot patterns) in unit test suites'
    ],
    relatedPatternIds: ['pattern-factory-method', 'pattern-prototype']
  },
  {
    id: 'pattern-factory-method',
    title: 'Factory Method & Abstract Factory',
    category: 'GoF Creational',
    group: 'Creational',
    difficulty: 'Fundamental',
    summary: 'Delegates instantiation logic to specialized creator functions or abstract interfaces to decouple callers from concrete implementations.',
    tags: ['Creational', 'Decoupling', 'Dependency Injection', 'Polymorphism', 'GoF'],
    intent: 'Define an interface or function contract for creating an object (or families of cohesive objects), letting runtime configuration or environment determine which concrete implementation to instantiate.',
    modernContext: 'In modern TypeScript, Go, and Rust, Factory Methods are often implemented as higher-order factory functions or Dependency Injection (DI) provider bindings rather than deep inheritance hierarchies of Creator subclasses.',
    whenToUse: [
      'Selecting infrastructure backends at runtime based on environment or tenant tier (e.g., S3 vs GCS vs Local Disk blob storage)',
      'Creating cohesive families of related dependencies (Abstract Factory: e.g., PostgresTransaction + PostgresOutboxRepo vs InMemory equivalents)',
      'Encapsulating asynchronous initialization or connection handshake steps that cannot run inside a synchronous class constructor'
    ],
    antiPatterns: [
      {
        name: 'Speculative Enterprise-itis (IUserServiceFactoryImpl)',
        symptom: 'Creating AbstractFactory, FactoryInterface, and FactoryProvider classes when there is only a single concrete implementation in the entire codebase.',
        fix: 'Follow YAGNI: use a direct constructor or simple function until a second concrete implementation or test double actually exists.'
      },
      {
        name: 'Service Locator Hidings',
        symptom: 'Passing a giant global Factory/Container into every domain entity so entities instantiate their own infrastructure dependencies secretly.',
        fix: 'Inject the already-created interface (or a narrow factory function) explicitly via constructor Dependency Injection.'
      }
    ],
    tradeoffs: {
      pros: [
        'Decouples domain business logic from concrete third-party vendor SDKs',
        'Allows async resource warm-up before returning a ready-to-use client',
        'Makes swapping in-memory fakes for integration testing effortless'
      ],
      cons: [
        'Adds indirection when navigating from caller to concrete implementation',
        'Abstract Factory interfaces require updating all families if a new product type is added'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Hardcoded Vendor Instantiation Scattered Across Domain Services',
      badCode: `import { S3Client } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';

export class InvoiceService {
  async archiveInvoice(tenantCloud: string, id: string, pdf: Uint8Array) {
    // Violates Open/Closed & Single Responsibility:
    // Every service repeats this switch statement and imports every cloud SDK!
    if (tenantCloud === 'aws') {
      const s3 = new S3Client({ region: process.env.AWS_REGION });
      // AWS-specific upload logic...
    } else if (tenantCloud === 'gcp') {
      const gcs = new Storage({ projectId: process.env.GCP_PROJECT });
      // GCP-specific upload logic...
    } else {
      throw new Error('Unsupported cloud provider');
    }
  }
}`,
      goodTitle: 'Idiomatic: Registry-Backed Factory Function Returning a Domain Port',
      goodCode: `export interface BlobStoragePort {
  putObject(key: string, payload: Uint8Array): Promise<{ url: string }>;
  getObject(key: string): Promise<Uint8Array | null>;
}

export type StorageProviderType = 's3' | 'gcs' | 'memory';

export interface StorageConfig {
  provider: StorageProviderType;
  bucketName: string;
  region?: string;
}

const providerConstructors: Record<
  StorageProviderType,
  (cfg: StorageConfig) => BlobStoragePort
> = {
  s3: (cfg) => new S3BlobAdapter(cfg.bucketName, cfg.region ?? 'us-east-1'),
  gcs: (cfg) => new GcsBlobAdapter(cfg.bucketName),
  memory: () => new InMemoryBlobAdapter(),
};

export function createBlobStorage(config: StorageConfig): BlobStoragePort {
  const creator = providerConstructors[config.provider];
  if (!creator) {
    throw new Error(\`Unknown storage provider: \${config.provider}\`);
  }
  return creator(config);
}`,
      explanation: 'Instead of polluting domain services with vendor SDK imports and conditional branches, a typed factory registry maps runtime configuration to a clean BlobStoragePort interface.'
    },
    realWorldUsages: [
      'Database driver connection factories (JDBC DriverManager, Prisma Driver Adapters)',
      'React.createElement / JSX factory functions and cross-platform UI renderers',
      'Payment provider factories routing transactions to Stripe, Adyen, or Braintree by currency/region'
    ],
    relatedPatternIds: ['pattern-adapter', 'pattern-strategy', 'pattern-singleton-di']
  },
  {
    id: 'pattern-singleton-di',
    title: 'Singleton vs. DI Scoped Lifecycles',
    category: 'GoF Creational',
    group: 'Creational',
    difficulty: 'Intermediate',
    summary: 'Manages shared resource lifecycles (TCP connection pools, caches, loggers) safely via Dependency Injection rather than global mutable state.',
    tags: ['Creational', 'Dependency Injection', 'Connection Pooling', 'Concurrency', 'Testing'],
    intent: 'Ensure scarce, expensive resources (database connection pools, telemetry exporters, hardware handles) are instantiated once per process while keeping consumers decoupled and testable.',
    modernContext: 'The classic 1994 GoF MyClass.getInstance() static Singleton is universally considered an anti-pattern in modern backend engineering because it introduces hidden global state and breaks parallel test isolation. Modern systems replace static Singletons with Dependency Injection (DI) Container Lifecycles (Singleton, Request-Scoped, Transient).',
    whenToUse: [
      'Managing TCP connection pools (PostgreSQL pg.Pool, Redis client cluster connections) to prevent socket exhaustion',
      'Sharing read-only configuration registries or compiled regex/schema caches across requests',
      'Using Request-Scoped DI lifecycles to propagate correlation IDs (traceId, tenantId) safely across async call trees'
    ],
    antiPatterns: [
      {
        name: 'Static getInstance() Global Mutable State',
        symptom: 'Calling Database.getInstance().query() directly inside domain functions, making parallel unit tests overwrite each other’s state.',
        fix: 'Pass the database interface via constructor/parameter injection and let the application composition root manage the single instance.'
      },
      {
        name: 'Captive Dependency Bug (Singleton Capturing Request-Scoped Service)',
        symptom: 'A Singleton service holds a reference to a Request-Scoped UserContext, leaking User A’s auth session into User B’s concurrent HTTP request.',
        fix: 'Never inject a shorter-lived (Request-Scoped) dependency into a longer-lived (Singleton) service; use AsyncLocalStorage or pass context per method call.'
      },
      {
        name: 'Serverless Cold-Start Connection Leak',
        symptom: 'Creating a new PrismaClient() or pg.Pool() inside an AWS Lambda/Next.js handler on every invocation instead of caching at module scope.',
        fix: 'Cache the connection pool on globalThis or module scope and pair with an external connection pooler (PgBouncer / RDS Proxy).'
      }
    ],
    tradeoffs: {
      pros: [
        'Prevents socket and memory exhaustion by reusing heavyweight TCP/TLS connection pools',
        'DI-managed singletons preserve 100% unit testability via interface mocking',
        'Request-scoped lifetimes isolate per-request tenant and trace state'
      ],
      cons: [
        'Shared mutable state across concurrent requests can cause race conditions or cross-tenant data leaks',
        'Order of initialization and graceful shutdown (draining pools on SIGTERM) must be orchestrated carefully'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Static Global Singleton + Captive Tenant State Leak',
      badCode: `// DANGER: Global mutable singleton hides dependencies & leaks tenant state!
export class DbConnectionSingleton {
  private static instance: DbConnectionSingleton;
  public currentTenantId: string = 'default'; // Race condition across concurrent requests!

  private constructor() {}

  public static getInstance(): DbConnectionSingleton {
    if (!DbConnectionSingleton.instance) {
      DbConnectionSingleton.instance = new DbConnectionSingleton();
    }
    return DbConnectionSingleton.instance;
  }

  async query(sql: string) {
    // If Request A sets currentTenantId = 'acme' and awaits IO,
    // Request B overwrites currentTenantId = 'globex' before Request A finishes!
    return \`[Tenant: \${this.currentTenantId}] Executing: \${sql}\`;
  }
}`,
      goodTitle: 'Idiomatic: Composition Root Singleton Pool + Per-Request Context Scope',
      goodCode: `import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  readonly traceId: string;
  readonly tenantId: string;
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();

export interface DatabasePool {
  query<T>(sql: string, params: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

// Instantiated ONCE in main.ts (Composition Root) and injected into repositories
export class TenantAwareRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findOrdersByCurrentTenant() {
    const ctx = requestContextStore.getStore();
    if (!ctx) {
      throw new Error('Missing request context scope');
    }
    // Safe: pool is shared Singleton, but tenantId is isolated per async execution chain
    return this.pool.query(
      'SELECT * FROM orders WHERE tenant_id = $1',
      [ctx.tenantId]
    );
  }
}`,
      explanation: 'The heavyweight connection pool is instantiated once at the application root and injected via constructor, while request-specific state (tenantId, traceId) lives in AsyncLocalStorage or explicit request context parameters.'
    },
    realWorldUsages: [
      'NestJS / Spring Boot / ASP.NET Core DI Lifecycles (Singleton, Scoped, Transient)',
      'Node.js AsyncLocalStorage for OpenTelemetry distributed trace propagation',
      'PrismaClient globalThis caching pattern in Next.js / Serverless environments'
    ],
    relatedPatternIds: ['pattern-factory-method', 'pattern-proxy']
  },
  {
    id: 'pattern-prototype',
    title: 'Prototype & Structural Cloning',
    category: 'GoF Creational',
    group: 'Creational',
    difficulty: 'Fundamental',
    summary: 'Creates new objects by deep-cloning pre-configured baseline instances, avoiding expensive re-initialization or cross-request mutation.',
    tags: ['Creational', 'Cloning', 'Immutability', 'Performance', 'GoF'],
    intent: 'Specify the kinds of objects to create using a prototypical instance, and create new objects by copying this prototype rather than re-running expensive parsing or setup.',
    modernContext: 'JavaScript itself is a prototype-based language, and modern runtimes provide native structuredClone(). In systems engineering, Prototype is heavily used for cloning base HTTP/gRPC client contexts (with pre-parsed TLS certs and auth headers) or immutable state trees.',
    whenToUse: [
      'Forking a pre-configured request/client instance per downstream call (e.g., axiosInstance.create() or Go req.Clone(ctx))',
      'Isolating in-memory cached objects so callers cannot mutate the shared cache entry via reference',
      'Snapshotting complex document/canvas AST trees for undo/redo history'
    ],
    antiPatterns: [
      {
        name: 'Shallow Spread Mutation Leak ({ ...obj })',
        symptom: 'Using object spread ({ ...baseConfig }) when baseConfig contains nested objects or arrays (like headers or permissions), causing one request to mutate another request’s headers.',
        fix: 'Use deep cloning (structuredClone) or structural sharing (Immer) for nested reference structures.'
      },
      {
        name: 'Cloning Non-Cloneable OS Resources',
        symptom: 'Attempting to deep-clone an object that holds active TCP sockets, file descriptors, or database transactions.',
        fix: 'Separate pure configuration state (cloneable) from stateful runtime handles (shared or pooled via reference).'
      }
    ],
    tradeoffs: {
      pros: [
        'Bypasses expensive cold initialization (schema compilation, AST parsing, template loading)',
        'Prevents shared-reference cache poisoning when returning in-memory cached objects'
      ],
      cons: [
        'Deep cloning large object graphs on hot paths creates GC pressure',
        'Circular references or class methods can break naive JSON.parse(JSON.stringify()) clones'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Shallow Spread Causing Cross-Tenant Header Leak',
      badCode: `const baseRequestTemplate = {
  timeout: 2000,
  retries: 3,
  headers: {
    'X-Service-Name': 'checkout-api',
  } as Record<string, string>,
};

export function createRequestForTenant(tenantSecret: string) {
  // BUG: Shallow spread copies the reference to baseRequestTemplate.headers!
  const req = { ...baseRequestTemplate };
  req.headers['X-Tenant-Key'] = tenantSecret; // Mutates shared baseRequestTemplate!
  return req;
}`,
      goodTitle: 'Idiomatic: Explicit Prototype with Safe Deep Cloning',
      goodCode: `export interface RequestPrototypeConfig {
  timeout: number;
  retries: number;
  headers: Record<string, string>;
  tags: string[];
}

export class RequestTemplatePrototype {
  private readonly baseConfig: RequestPrototypeConfig;

  constructor(initial: RequestPrototypeConfig) {
    this.baseConfig = structuredClone(initial);
  }

  cloneWithOverrides(overrides: {
    tenantKey?: string;
    extraTag?: string;
    timeout?: number;
  }): RequestPrototypeConfig {
    // Native structuredClone safely deep-copies nested maps, arrays, and dates
    const cloned = structuredClone(this.baseConfig);
    if (overrides.timeout !== undefined) {
      cloned.timeout = overrides.timeout;
    }
    if (overrides.tenantKey) {
      cloned.headers['X-Tenant-Key'] = overrides.tenantKey;
    }
    if (overrides.extraTag) {
      cloned.tags.push(overrides.extraTag);
    }
    return cloned;
  }
}`,
      explanation: 'Using structuredClone() guarantees that nested headers and arrays are isolated per cloned instance, completely eliminating cross-request state contamination.'
    },
    realWorldUsages: [
      'Web Fetch API Request.clone() and Response.clone() for reading stream bodies twice',
      'Go http.Request.Clone(ctx) in middleware pipelines',
      'In-memory local caches cloning entries on read to prevent caller mutation of cached data'
    ],
    relatedPatternIds: ['pattern-builder', 'pattern-singleton-di']
  },

  // ==========================================
  // STRUCTURAL PATTERNS
  // ==========================================
  {
    id: 'pattern-adapter',
    title: 'Adapter (Hexagonal Ports & Adapters)',
    category: 'GoF Structural',
    group: 'Structural',
    difficulty: 'Fundamental',
    summary: 'Translates incompatible external vendor SDKs or legacy interfaces into clean, domain-owned ports.',
    tags: ['Structural', 'Hexagonal Architecture', 'Clean Architecture', 'DDD', 'GoF'],
    intent: 'Convert the interface of an external class or third-party SDK into a domain-specific interface that core business logic expects, preventing vendor lock-in.',
    modernContext: 'In Hexagonal Architecture (Ports & Adapters), the Domain defines an outbound Port interface (e.g., PaymentGatewayPort), and concrete Adapters wrap Stripe, Adyen, or PayPal SDKs—translating both data payloads and vendor-specific exceptions into domain types.',
    whenToUse: [
      'Integrating third-party APIs (Stripe, Twilio, SendGrid, AWS SDK) without leaking vendor types into core domain services',
      'Supporting multiple providers simultaneously (e.g., failing over from Stripe to Adyen during an outage)',
      'Wrapping legacy SOAP/XML or snake_case RPC payloads into modern typed domain models'
    ],
    antiPatterns: [
      {
        name: 'Leaky Abstraction Adapter',
        symptom: 'An Adapter implements PaymentPort, but its method signature returns Stripe.PaymentIntent or throws raw StripeCardError up into the domain layer.',
        fix: 'Translate both input/output DTOs AND vendor exceptions into domain-owned value objects and error types inside the Adapter.'
      },
      {
        name: 'Business Logic in the Adapter',
        symptom: 'Putting tax calculation, discount rules, or database state transitions inside the StripeAdapter instead of the Domain Service.',
        fix: 'Keep Adapters thin: strictly data mapping, protocol translation, and error normalization.'
      }
    ],
    tradeoffs: {
      pros: [
        'Total isolation of domain logic from third-party SDK breaking changes',
        'Enables fast, deterministic unit tests using an InMemoryAdapter without mocking complex SDK internals',
        'Simplifies multi-vendor routing or provider migration'
      ],
      cons: [
        'Requires writing mapping boilerplate between domain models and vendor DTOs',
        'Lowest-common-denominator interfaces can hide unique high-value features of a specific vendor'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Leaky Vendor SDK Types & Exceptions in Domain Layer',
      badCode: `import Stripe from 'stripe';

export class CheckoutDomainService {
  private stripe = new Stripe(process.env.STRIPE_KEY!);

  async processOrder(amountDollars: number, token: string) {
    try {
      // Domain is tightly coupled to Stripe's cents math, SDK options, and error codes!
      const intent = await this.stripe.paymentIntents.create({
        amount: Math.round(amountDollars * 100),
        currency: 'usd',
        payment_method: token,
        confirm: true,
      });
      return intent.id;
    } catch (err: any) {
      if (err.type === 'StripeCardError') {
        throw new Error('Card declined');
      }
      throw err;
    }
  }
}`,
      goodTitle: 'Idiomatic: Hexagonal Domain Port + Exception-Translating Adapter',
      goodCode: `// 1. Domain-Owned Port (Zero vendor imports!)
export type PaymentFailureReason = 'CARD_DECLINED' | 'RATE_LIMITED' | 'PROVIDER_DOWN';

export type ChargeResult =
  | { ok: true; transactionId: string }
  | { ok: false; reason: PaymentFailureReason; retryable: boolean };

export interface PaymentGatewayPort {
  charge(params: {
    idempotencyKey: string;
    amountCents: number;
    currency: 'USD' | 'EUR';
    paymentToken: string;
  }): Promise<ChargeResult>;
}

// 2. Infrastructure Adapter wrapping external SDK
export class StripePaymentAdapter implements PaymentGatewayPort {
  constructor(private readonly stripeSdk: { createIntent: (req: any) => Promise<any> }) {}

  async charge(params: {
    idempotencyKey: string;
    amountCents: number;
    currency: 'USD' | 'EUR';
    paymentToken: string;
  }): Promise<ChargeResult> {
    try {
      const res = await this.stripeSdk.createIntent({
        amount: params.amountCents,
        currency: params.currency.toLowerCase(),
        payment_method: params.paymentToken,
        idempotencyKey: params.idempotencyKey,
      });
      return { ok: true, transactionId: res.id };
    } catch (err: any) {
      // Translate vendor error codes into domain semantics
      if (err.code === 'card_declined') {
        return { ok: false, reason: 'CARD_DECLINED', retryable: false };
      }
      if (err.statusCode === 429) {
        return { ok: false, reason: 'RATE_LIMITED', retryable: true };
      }
      return { ok: false, reason: 'PROVIDER_DOWN', retryable: true };
    }
  }
}`,
      explanation: 'The domain layer depends solely on PaymentGatewayPort and ChargeResult. If Stripe is replaced by Adyen or tested with a fake, zero lines of domain code change.'
    },
    realWorldUsages: [
      'Hexagonal / Clean Architecture outbound repository and gateway ports',
      'Prisma / TypeORM database driver adapters',
      'Winston / Pino log transport adapters (Console, Datadog, CloudWatch)'
    ],
    relatedPatternIds: ['pattern-facade', 'pattern-strategy', 'pattern-factory-method']
  },
  {
    id: 'pattern-decorator',
    title: 'Decorator & Composable Middleware',
    category: 'GoF Structural',
    group: 'Structural',
    difficulty: 'Intermediate',
    summary: 'Wraps services or handlers dynamically to layer cross-cutting concerns like caching, telemetry, retries, and auth.',
    tags: ['Structural', 'Middleware', 'Observability', 'Caching', 'Open-Closed Principle'],
    intent: 'Attach additional responsibilities to an object or function dynamically and transparently, providing a flexible, composable alternative to subclassing.',
    modernContext: 'In modern TypeScript, Go, and Python, Decorators appear both as higher-order function wrappers (withLogging(withRetry(withCache(handler)))) and as class/method wraps implementing the same domain interface (e.g., CachedUserRepository wrapping PostgresUserRepository).',
    whenToUse: [
      'Adding cross-cutting observability (OpenTelemetry spans, latency histograms, structured audit logs) without polluting core business logic',
      'Layering Cache-Aside read/write logic around an existing Database Repository implementation',
      'Composing HTTP/gRPC middleware pipelines (Auth -> RateLimit -> Compression -> Handler)'
    ],
    antiPatterns: [
      {
        name: 'Decorator Ordering Trap (Caching Before Auth)',
        symptom: 'Wrapping withCache(withAuth(handler)) in the wrong order so cached responses are served to unauthenticated callers bypassing withAuth!',
        fix: 'Enforce strict pipeline ordering: Authentication & Authorization must always execute outside (before) Caching Decorators.'
      },
      {
        name: '15-Layer Decorator Onion Hell',
        symptom: 'Deeply nested decorator chains that obscure stack traces, swallow error types, or mutate hidden request properties implicitly.',
        fix: 'Keep decorators pure, preserve original error causes (new Error("...", { cause: err })), and compose via an explicit pipeline helper.'
      }
    ],
    tradeoffs: {
      pros: [
        'Adheres strictly to Single Responsibility and Open/Closed Principles',
        'Cross-cutting behaviors can be toggled, reordered, or tested in complete isolation',
        'Core business service remains 100% free of metrics/caching/retry boilerplate'
      ],
      cons: [
        'Execution order matters critically (e.g., Retry inside Circuit Breaker vs outside)',
        'Can complicate debugging stack traces if wrappers are anonymous functions'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Tangled Cross-Cutting Concerns Inside Domain Method',
      badCode: `export class UserProfileService {
  constructor(private db: any, private redis: any, private metrics: any) {}

  async getUserProfile(userId: string) {
    const start = performance.now();
    this.metrics.increment('user_profile.requests');
    try {
      // Caching, logging, metrics, and DB queries all mixed together!
      const cached = await this.redis.get(\`user:\${userId}\`);
      if (cached) {
        this.metrics.increment('user_profile.cache_hit');
        return JSON.parse(cached);
      }
      const user = await this.db.query('SELECT * FROM users WHERE id = $1', [userId]);
      await this.redis.set(\`user:\${userId}\`, JSON.stringify(user), 'EX', 60);
      return user;
    } catch (err) {
      this.metrics.increment('user_profile.errors');
      throw err;
    } finally {
      this.metrics.timing('user_profile.latency', performance.now() - start);
    }
  }
}`,
      goodTitle: 'Idiomatic: Composable Repository Decorators (Cache + Telemetry)',
      goodCode: `export interface UserRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

// 1. Pure Core Implementation (Only knows SQL)
export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: { queryOne: (id: string) => Promise<any> }) {}
  async findById(id: string) {
    return this.db.queryOne(id);
  }
}

// 2. Caching Decorator (Implements identical UserRepository interface)
export class CachedUserRepositoryDecorator implements UserRepository {
  constructor(
    private readonly inner: UserRepository,
    private readonly cache: Map<string, { value: any; expiresAt: number }>,
    private readonly ttlMs = 60_000
  ) {}

  async findById(id: string) {
    const hit = this.cache.get(id);
    if (hit && hit.expiresAt > Date.now()) return hit.value;

    const fresh = await this.inner.findById(id);
    if (fresh) {
      this.cache.set(id, { value: fresh, expiresAt: Date.now() + this.ttlMs });
    }
    return fresh;
  }
}

// 3. Telemetry Decorator (Implements identical UserRepository interface)
export class TelemetryUserRepositoryDecorator implements UserRepository {
  constructor(
    private readonly inner: UserRepository,
    private readonly onMetric: (durationMs: number, success: boolean) => void
  ) {}

  async findById(id: string) {
    const start = performance.now();
    try {
      const res = await this.inner.findById(id);
      this.onMetric(performance.now() - start, true);
      return res;
    } catch (err) {
      this.onMetric(performance.now() - start, false);
      throw err;
    }
  }
}`,
      explanation: 'Each decorator implements UserRepository and wraps an inner UserRepository. At startup, you compose new TelemetryUserRepositoryDecorator(new CachedUserRepositoryDecorator(new PostgresUserRepository(db))).'
    },
    realWorldUsages: [
      'Express / Fastify / Koa / Next.js HTTP middleware chains',
      'gRPC Client and Server Interceptors for auth, tracing, and retries',
      'Java I/O streams (BufferedInputStream wrapping FileInputStream) & Python @functools.lru_cache'
    ],
    relatedPatternIds: ['pattern-proxy', 'pattern-chain-of-responsibility', 'pattern-adapter']
  },
  {
    id: 'pattern-facade',
    title: 'Facade & Sub-System Orchestration',
    category: 'GoF Structural',
    group: 'Structural',
    difficulty: 'Fundamental',
    summary: 'Provides a simplified, high-level entry point that shields callers from complex multi-subsystem workflows.',
    tags: ['Structural', 'Modular Monolith', 'API Design', 'Encapsulation', 'GoF'],
    intent: 'Provide a unified, coarse-grained interface to a set of fine-grained interfaces in a subsystem, reducing coupling between independent modules.',
    modernContext: 'In Modular Monoliths and SDK design, each bounded context exposes a single public Facade (e.g., BillingModuleFacade) while keeping its internal entities, repositories, and helper services module-private.',
    whenToUse: [
      'Defining clean public boundaries between modules in a Modular Monolith',
      'Wrapping chatty multi-step SDK workflows (e.g., Auth + Token Refresh + Multipart Chunk Upload + Checksum Verification) behind a single uploadFile() call',
      'Demarcating a clean seam around tangled legacy subsystems before extracting a microservice'
    ],
    antiPatterns: [
      {
        name: 'The God Facade (Anemic Subsystems)',
        symptom: 'Stuffing thousands of lines of core domain calculations, SQL queries, and validation rules directly inside the Facade class.',
        fix: 'A Facade should orchestrate and delegate to focused domain objects, never absorb their internal logic.'
      },
      {
        name: 'Bypassing the Module Facade',
        symptom: 'External modules importing internal repositories or tables of the Billing subsystem directly instead of going through BillingFacade.',
        fix: 'Enforce module boundary lint rules (eslint-plugin-boundaries or Nx module boundaries) and export only the Facade from index.ts.'
      }
    ],
    tradeoffs: {
      pros: [
        'Dramatically reduces cognitive load for callers and SDK consumers',
        'Prevents tight coupling to internal subsystem classes, allowing internal refactoring without breaking callers',
        'Eliminates chatty back-and-forth calls across module boundaries'
      ],
      cons: [
        'Can become a dumping ground ("God Class") if developers add ad-hoc logic instead of delegating',
        'Coarse methods may fetch more data than a specialized power-user caller needs'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Caller Tightly Coupled to 5 Internal Subsystem Classes',
      badCode: `// OrderController knows every intimate detail of Inventory, Tax, Fraud, and Ledger!
export class OrderController {
  async checkout(req: any) {
    const fraudScore = await this.fraudEngine.scoreIp(req.ip, req.userId);
    if (fraudScore > 0.85) throw new Error('Fraud detected');

    const taxRate = await this.taxService.lookupNexus(req.zipCode, req.items);
    const Reservation = await this.warehouseLock.reserveSkuList(req.items, 300);
    try {
      const charge = await this.stripeGateway.capture(req.total * (1 + taxRate));
      await this.ledgerJournal.recordDoubleEntry(req.userId, charge.id, req.total);
      await this.warehouseLock.commitReservation(Reservation.id);
    } catch (e) {
      await this.warehouseLock.releaseReservation(Reservation.id);
      throw e;
    }
  }
}`,
      goodTitle: 'Idiomatic: Coarse-Grained Checkout Subsystem Facade',
      goodCode: `export interface CheckoutRequest {
  userId: string;
  clientIp: string;
  shippingZip: string;
  items: { sku: string; qty: number; priceCents: number }[];
}

export interface CheckoutReceipt {
  orderId: string;
  chargedCents: number;
  taxCents: number;
}

// Single public entry point exported by the Checkout Bounded Context
export class CheckoutSubsystemFacade {
  constructor(
    private readonly fraudGuard: { assertSafe: (ip: string, uid: string) => Promise<void> },
    private readonly taxCalculator: { computeTaxCents: (zip: string, subtotal: number) => Promise<number> },
    private readonly inventory: { withReservation: <T>(items: any[], fn: () => Promise<T>) => Promise<T> },
    private readonly ledger: { chargeAndRecord: (uid: string, totalCents: number) => Promise<string> }
  ) {}

  async executeCheckout(req: CheckoutRequest): Promise<CheckoutReceipt> {
    await this.fraudGuard.assertSafe(req.clientIp, req.userId);

    const subtotal = req.items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
    const taxCents = await this.taxCalculator.computeTaxCents(req.shippingZip, subtotal);
    const totalCents = subtotal + taxCents;

    const orderId = await this.inventory.withReservation(req.items, async () => {
      return this.ledger.chargeAndRecord(req.userId, totalCents);
    });

    return { orderId, chargedCents: totalCents, taxCents };
  }
}`,
      explanation: 'Callers interact solely with CheckoutSubsystemFacade.executeCheckout(). Internal reservation cleanup, tax calculation, and double-entry ledger logic remain encapsulated inside the subsystem.'
    },
    realWorldUsages: [
      'Modular Monolith public module APIs (Spring Modulith / Nx libraries)',
      'AWS SDK High-Level Upload (@aws-sdk/lib-storage Upload facade orchestrating multipart S3 uploads)',
      'Web Audio API / Canvas high-level drawing libraries'
    ],
    relatedPatternIds: ['pattern-adapter', 'pattern-proxy', 'pattern-decorator']
  },
  {
    id: 'pattern-proxy',
    title: 'Proxy (Virtual, Protection & Caching)',
    category: 'GoF Structural',
    group: 'Structural',
    difficulty: 'Intermediate',
    summary: 'Interposes a surrogate placeholder in front of a target object to control access, defer heavy initialization, or intercept operations.',
    tags: ['Structural', 'Lazy Loading', 'Access Control', 'ES6 Proxy', 'GoF'],
    intent: 'Provide a surrogate or placeholder for another object to control access to it—enabling lazy initialization (Virtual Proxy), RBAC security checks (Protection Proxy), or change tracking.',
    modernContext: 'ES6 introduced native JavaScript Proxy objects, which power Vue 3 reactivity, Immer immutable state structural sharing, and RPC client stubs (tRPC / gRPC). At the infrastructure layer, Envoy and NGINX act as out-of-process Reverse Proxies.',
    whenToUse: [
      'Deferring expensive resource initialization (e.g., loading a 500MB ML model or opening a DB connection) until the first actual method invocation (Virtual Proxy)',
      'Enforcing fine-grained Role-Based Access Control (RBAC) or tenant ownership checks transparently before delegating to a domain service (Protection Proxy)',
      'Building type-safe RPC client stubs or reactive state trackers using ES6 Proxy'
    ],
    antiPatterns: [
      {
        name: 'ORM Lazy-Loading N+1 Query Trap',
        symptom: 'Accessing user.orders[i].items inside a loop triggers hundreds of hidden synchronous/sequential SQL queries because ORM Virtual Proxies make network I/O look like local property access.',
        fix: 'Disable implicit lazy-loading proxies on hot paths; use explicit eager batch fetching (DataLoader / SQL JOIN / WHERE id IN (...)).'
      },
      {
        name: 'Leaky Identity Equality (proxy !== target)',
        symptom: 'Comparing a proxied object with === against the raw target inside a Set or WeakMap fails silently.',
        fix: 'Keep proxies behind interfaces or track raw-to-proxy mappings in a WeakMap.'
      }
    ],
    tradeoffs: {
      pros: [
        'Zero startup cost for expensive dependencies that may not be used on every code path',
        'Separates RBAC authorization and audit interception from core business logic',
        'Can coalesce duplicate in-flight requests (Singleflight / Request Coalescing Proxy)'
      ],
      cons: [
        'Hiding network I/O behind transparent property access can mask latency spikes',
        'ES6 Proxy traps add minor V8 property-access overhead if used in tight inner loops'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Eager Heavy Initialization + Missing Request Coalescing',
      badCode: `export class EmbeddingsClient {
  private modelWeights: Float32Array;

  constructor() {
    // Blocks application startup loading 500MB even for healthcheck endpoints!
    this.modelWeights = this.loadHeavyModelSync();
  }

  private loadHeavyModelSync(): Float32Array {
    return new Float32Array(10_000_000);
  }

  async embed(text: string): Promise<number[]> {
    return [text.length];
  }
}`,
      goodTitle: 'Idiomatic: Lazy Virtual + Singleflight Coalescing Proxy',
      goodCode: `export interface EmbeddingsEngine {
  embed(text: string): Promise<number[]>;
}

export class LazyProtectedEmbeddingsProxy implements EmbeddingsEngine {
  private instancePromise: Promise<EmbeddingsEngine> | null = null;

  constructor(
    private readonly factory: () => Promise<EmbeddingsEngine>,
    private readonly hasPermission: () => boolean
  ) {}

  async embed(text: string): Promise<number[]> {
    // 1. Protection Proxy check
    if (!this.hasPermission()) {
      throw new Error('403 Forbidden: Missing AI_EMBEDDINGS_READ permission');
    }

    // 2. Virtual Proxy with Singleflight initialization (prevents stampede on cold start)
    if (!this.instancePromise) {
      this.instancePromise = this.factory().catch((err) => {
        this.instancePromise = null; // Reset on init failure so next call can retry
        throw err;
      });
    }

    const engine = await this.instancePromise;
    return engine.embed(text);
  }
}`,
      explanation: 'The proxy combines Protection (checking RBAC permissions before touching the engine) and Virtual Lazy Initialization with Singleflight promise caching (so 50 concurrent cold requests only initialize the heavy engine once).'
    },
    realWorldUsages: [
      'Vue 3 Reactivity (reactive()) and Immer produce() state mutation tracking via ES6 Proxy',
      'tRPC / gRPC client stubs translating method calls into network RPC payloads',
      'GraphQL DataLoader batching and caching proxy to eliminate N+1 queries'
    ],
    relatedPatternIds: ['pattern-decorator', 'pattern-singleton-di', 'pattern-facade']
  },
  {
    id: 'pattern-composite',
    title: 'Composite & Flyweight Trees',
    category: 'GoF Structural',
    group: 'Structural',
    difficulty: 'Intermediate',
    summary: 'Treats individual leaf items and recursive tree compositions uniformly using a shared interface.',
    tags: ['Structural', 'Trees', 'Recursion', 'AST', 'Policy Engine'],
    intent: 'Compose objects into tree structures to represent part-whole hierarchies, allowing clients to treat individual leaf objects and composite groups uniformly without type-checking.',
    modernContext: 'Composite is the backbone of UI component trees (React VDOM), file systems, Abstract Syntax Trees (ASTs), and boolean authorization/filtering rule engines (AND/OR composite predicates).',
    whenToUse: [
      'Building boolean policy/permission engines where a Rule can be a single Condition (Leaf) or an AND/OR group of Rules (Composite)',
      'Representing organizational hierarchies, file/folder directories, or nested bill-of-materials pricing',
      'Evaluating AST expressions, query filters, or UI layout trees uniformly'
    ],
    antiPatterns: [
      {
        name: 'instanceof Type-Checking Scattered in Client Code',
        symptom: 'Writing if (node instanceof Folder) { ... } else if (node instanceof File) { ... } in every caller instead of defining polymorphic operations on the shared interface.',
        fix: 'Move the operation (e.g., getSizeBytes(), evaluate(ctx)) onto the common Component interface so Leaves and Composites handle recursion internally.'
      },
      {
        name: 'Cyclic Graph Infinite Recursion',
        symptom: 'Adding a parent Composite as a child of its own descendant, causing stack overflow during tree traversal.',
        fix: 'Enforce DAG/Tree cycle detection on addChild() or use immutable bottom-up construction.'
      }
    ],
    tradeoffs: {
      pros: [
        'Eliminates conditional instanceof branching when traversing complex nested hierarchies',
        'New Leaf or Composite node types can be added without modifying traversal code (Open/Closed)',
        'Pairs naturally with Flyweight to share immutable leaf nodes across trees'
      ],
      cons: [
        'Deeply nested trees can risk call-stack overflow if traversed recursively without depth bounds',
        'Making the shared interface fit both Leaf and Composite can sometimes feel overly general'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Fragile Nested if/else & instanceof Tree Evaluation',
      badCode: `// Caller has to manually inspect node types and handle recursion ad-hoc
export function evaluateAccessRule(node: any, user: any): boolean {
  if (node.type === 'role_check') {
    return user.roles.includes(node.requiredRole);
  } else if (node.type === 'mfa_check') {
    return user.mfaVerified === true;
  } else if (node.type === 'group') {
    if (node.operator === 'AND') {
      for (const child of node.children) {
        if (!evaluateAccessRule(child, user)) return false;
      }
      return true;
    } else if (node.operator === 'OR') {
      for (const child of node.children) {
        if (evaluateAccessRule(child, user)) return true;
      }
      return false;
    }
  }
  throw new Error('Unknown rule node');
}`,
      goodTitle: 'Idiomatic: Polymorphic Composite Policy Engine with Explainability',
      goodCode: `export interface AuthContext {
  userId: string;
  roles: Set<string>;
  mfaVerified: boolean;
  ipCountry: string;
}

// Shared Component Interface for both Leaves and Composites
export interface AccessPolicyNode {
  evaluate(ctx: AuthContext): { allowed: boolean; reason: string };
}

// Leaf 1: Role Requirement
export class RoleLeafPolicy implements AccessPolicyNode {
  constructor(private readonly requiredRole: string) {}
  evaluate(ctx: AuthContext) {
    const allowed = ctx.roles.has(this.requiredRole);
    return {
      allowed,
      reason: allowed ? \`Has role \${this.requiredRole}\` : \`Missing role \${this.requiredRole}\`,
    };
  }
}

// Leaf 2: MFA Requirement
export class MfaLeafPolicy implements AccessPolicyNode {
  evaluate(ctx: AuthContext) {
    return {
      allowed: ctx.mfaVerified,
      reason: ctx.mfaVerified ? 'MFA verified' : 'MFA required',
    };
  }
}

// Composite: Logical AND / OR Policy Group
export class CompositePolicyGroup implements AccessPolicyNode {
  constructor(
    private readonly mode: 'ALL_OF' | 'ANY_OF',
    private readonly children: readonly AccessPolicyNode[]
  ) {}

  evaluate(ctx: AuthContext) {
    const results = this.children.map((c) => c.evaluate(ctx));
    const allowed =
      this.mode === 'ALL_OF'
        ? results.every((r) => r.allowed)
        : results.some((r) => r.allowed);

    return {
      allowed,
      reason: \`\${this.mode}(\${results.map((r) => r.reason).join(', ')})\`,
    };
  }
}`,
      explanation: 'Both single rules (RoleLeafPolicy, MfaLeafPolicy) and arbitrarily nested boolean groups (CompositePolicyGroup) implement AccessPolicyNode, enabling composable RBAC/ABAC policy trees with built-in audit explanations.'
    },
    realWorldUsages: [
      'AWS IAM Policy evaluation trees & OPA (Open Policy Agent) rule ASTs',
      'React Virtual DOM & browser DOM Node hierarchies',
      'SQL WHERE clause AST builders (AndExpression / OrExpression / ComparisonLeaf)'
    ],
    relatedPatternIds: ['pattern-decorator', 'pattern-chain-of-responsibility']
  },

  // ==========================================
  // BEHAVIORAL PATTERNS
  // ==========================================
  {
    id: 'pattern-strategy',
    title: 'Strategy (Pluggable Algorithms)',
    category: 'GoF Behavioral',
    group: 'Behavioral',
    difficulty: 'Fundamental',
    summary: 'Encapsulates interchangeable algorithms behind a common contract so policies can be swapped at runtime.',
    tags: ['Behavioral', 'Open-Closed Principle', 'Polymorphism', 'Functional', 'GoF'],
    intent: 'Define a family of algorithms, encapsulate each one behind a consistent interface or function signature, and make them interchangeable at runtime without modifying the calling context.',
    modernContext: 'Because modern languages (TypeScript, Go, Python, Rust) support first-class functions, lightweight Strategies are often implemented as typed functions or strategy lookup maps rather than heavyweight single-method classes—unless the strategy maintains internal state or dependencies.',
    whenToUse: [
      'Replacing sprawling switch / if-else blocks that branch on pricing tier, fraud scoring model, shipping carrier, or compression algorithm',
      'Swapping runtime algorithms via feature flags or tenant configuration (e.g., Token Bucket vs Sliding Window rate limiting)',
      'Isolating complex domain math so each algorithm can be unit-tested independently without booting the host service'
    ],
    antiPatterns: [
      {
        name: 'Class Explosion for One-Liner Pure Functions',
        symptom: 'Creating 12 separate files and classes implementing IDiscountStrategy for simple 1-line arithmetic formulas.',
        fix: 'Use a typed Record<DiscountTier, (amount: number) => number> map of pure functions when strategies are stateless.'
      },
      {
        name: 'Leaky Strategy Context Inspection',
        symptom: 'The host service still checks if (this.strategy instanceof VipPricingStrategy) to pass special arguments.',
        fix: 'Design a cohesive strategy input context so all strategies can operate uniformly through the shared contract.'
      }
    ],
    tradeoffs: {
      pros: [
        'Eliminates cyclomatic complexity from giant conditional switch statements',
        'Allows hot-swapping algorithms at runtime (e.g., via LaunchDarkly feature flags or A/B tests)',
        'Makes unit testing each algorithm trivial and deterministic'
      ],
      cons: [
        'Callers or factories must know how to select and wire the appropriate strategy',
        'Can introduce unnecessary indirection if there are only 2 static branches that never change'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Sprawling Conditional Switch Violating Open/Closed Principle',
      badCode: `export class LoadBalancerRouter {
  private rrIndex = 0;

  selectBackend(algorithm: string, backends: { id: string; activeConns: number; weight: number }[], clientIp: string) {
    if (algorithm === 'round-robin') {
      const chosen = backends[this.rrIndex % backends.length];
      this.rrIndex++;
      return chosen;
    } else if (algorithm === 'least-connections') {
      return [...backends].sort((a, b) => a.activeConns - b.activeConns)[0];
    } else if (algorithm === 'ip-hash') {
      let hash = 0;
      for (let i = 0; i < clientIp.length; i++) hash = (hash * 31 + clientIp.charCodeAt(i)) | 0;
      return backends[Math.abs(hash) % backends.length];
    }
    // Every new routing policy requires modifying this class!
    throw new Error('Unknown algorithm');
  }
}`,
      goodTitle: 'Idiomatic: Pluggable Load Balancing Strategy Contract',
      goodCode: `export interface BackendNode {
  readonly id: string;
  readonly activeConnections: number;
  readonly weight: number;
  readonly healthy: boolean;
}

export interface RoutingContext {
  readonly clientIp: string;
  readonly requestPath: string;
}

export type LoadBalancingStrategy = (
  healthyNodes: readonly BackendNode[],
  ctx: RoutingContext
) => BackendNode;

export const createRoundRobinStrategy = (): LoadBalancingStrategy => {
  let cursor = 0;
  return (nodes) => {
    const node = nodes[cursor % nodes.length];
    cursor = (cursor + 1) % nodes.length;
    return node;
  };
};

export const leastConnectionsStrategy: LoadBalancingStrategy = (nodes) => {
  return nodes.reduce((min, curr) =>
    curr.activeConnections < min.activeConnections ? curr : min
  );
};

export class ReverseProxyRouter {
  constructor(private strategy: LoadBalancingStrategy) {}

  setStrategy(nextStrategy: LoadBalancingStrategy): void {
    this.strategy = nextStrategy;
  }

  route(allNodes: readonly BackendNode[], ctx: RoutingContext): BackendNode {
    const healthy = allNodes.filter((n) => n.healthy);
    if (healthy.length === 0) throw new Error('503 Service Unavailable: No healthy nodes');
    return this.strategy(healthy, ctx);
  }
}`,
      explanation: 'Stateless strategies (leastConnectionsStrategy) are simple functions, while stateful strategies (createRoundRobinStrategy) use closures. ReverseProxyRouter can hot-swap strategies at runtime with zero conditional branching.'
    },
    realWorldUsages: [
      'Passport.js authentication strategies (JWT, OAuth2, SAML, WebAuthn)',
      'NGINX / Envoy load balancing policies (Round Robin, Least Request, Ring Hash, Maglev)',
      'Compression & serialization pluggability in Kafka/gRPC (Snappy, Zstd, LZ4, Gzip)'
    ],
    relatedPatternIds: ['pattern-factory-method', 'pattern-state-machine', 'pattern-template-method']
  },
  {
    id: 'pattern-observer',
    title: 'Observer & Reactive Event Streams',
    category: 'GoF Behavioral',
    group: 'Behavioral',
    difficulty: 'Intermediate',
    summary: 'Decouples state producers from N dynamic subscribers through typed event subscriptions and cleanup disposers.',
    tags: ['Behavioral', 'Pub/Sub', 'Event-Driven', 'Reactivity', 'Memory Leaks'],
    intent: 'Define a one-to-many dependency between objects so that when one subject changes state or emits a domain event, all registered observers are notified automatically without coupling the producer to concrete listeners.',
    modernContext: 'In-process Observer powers React state managers (Zustand, Signals), RxJS streams, and Node.js EventEmitters. Cross-process, it scales into Distributed Pub/Sub (Kafka, Redis Streams, SNS/SQS).',
    whenToUse: [
      'Triggering side-effects (audit logging, analytics tracking, cache invalidation, webhook notifications) after a core domain state change without coupling the domain service to every downstream module',
      'Synchronizing reactive UI components with a shared state store',
      'Streaming real-time telemetry, stock ticks, or health check status transitions to multiple consumers'
    ],
    antiPatterns: [
      {
        name: 'The Lapsed Listener Memory Leak',
        symptom: 'Short-lived components subscribe to a long-lived singleton EventBus and forget to unsubscribe on unmount/destroy, pinning thousands of dead closures in RAM.',
        fix: 'Return an explicit unsubscribe() disposer function (or accept an AbortSignal) on subscribe(), and call it in cleanup hooks.'
      },
      {
        name: 'Synchronous Observer Failure Cascade',
        symptom: 'A non-critical analytics observer throws an unhandled exception or blocks for 5 seconds, crashing or stalling the primary user checkout flow.',
        fix: 'Isolate observer execution with try/catch error boundaries or dispatch asynchronously via queueMicrotask / transactional outbox.'
      }
    ],
    tradeoffs: {
      pros: [
        'Producers emit events without knowing how many (0, 1, or 50) consumers exist',
        'New event listeners can be attached at runtime without touching the publisher',
        'Cleanly separates primary domain mutations from secondary side-effects'
      ],
      cons: [
        'Harder to trace the full execution flow statically in an IDE ("who listens to this event?")',
        'Risk of memory leaks if subscriptions are not disposed, or infinite loops if Observer A triggers Subject B which triggers Observer A'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Memory-Leaking Untyped EventBus with Synchronous Crash Risk',
      badCode: `export class NaiveEventBus {
  private listeners: Record<string, Function[]> = {};

  on(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
    // BUG 1: No easy unsubscribe returned -> Lapsed Listener memory leak!
  }

  emit(event: string, payload: any) {
    for (const fn of this.listeners[event] || []) {
      // BUG 2: If listener #1 throws, listeners #2 and #3 never run AND caller crashes!
      fn(payload);
    }
  }
}`,
      goodTitle: 'Idiomatic: Type-Safe Isolated Domain Event Bus with Disposer & AbortSignal',
      goodCode: `export interface DomainEventMap {
  'order.paid': { orderId: string; amountCents: number; timestamp: number };
  'circuit.state_changed': { service: string; from: string; to: string };
}

export type Unsubscribe = () => void;

export class TypedEventBus<TMap extends Record<string, any>> {
  private readonly handlers = new Map<keyof TMap, Set<(payload: any) => void | Promise<void>>>();

  subscribe<K extends keyof TMap>(
    event: K,
    handler: (payload: TMap[K]) => void | Promise<void>,
    options?: { signal?: AbortSignal }
  ): Unsubscribe {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    set.add(handler);

    const unsubscribe = () => {
      set.delete(handler);
    };

    // Automatic cleanup when AbortController aborts!
    options?.signal?.addEventListener('abort', unsubscribe, { once: true });
    return unsubscribe;
  }

  async publishIsolated<K extends keyof TMap>(
    event: K,
    payload: TMap[K],
    onError?: (err: unknown) => void
  ): Promise<void> {
    const set = this.handlers.get(event);
    if (!set || set.size === 0) return;

    // Snapshot listeners and isolate failures so one bad observer never breaks others
    const results = await Promise.allSettled(
      Array.from(set).map((fn) => Promise.resolve().then(() => fn(payload)))
    );

    for (const res of results) {
      if (res.status === 'rejected' && onError) {
        onError(res.reason);
      }
    }
  }
}`,
      explanation: 'This implementation enforces compile-time event payload types via TypeScript generics, returns an explicit Unsubscribe function (plus AbortSignal support) to prevent Lapsed Listener memory leaks, and uses Promise.allSettled() so a failing observer never crashes the publisher.'
    },
    realWorldUsages: [
      'RxJS Observables, TC39 Signals, and Zustand/Redux store subscriptions',
      'DOM addEventListener with { signal: abortController.signal } cleanup',
      'Kubernetes Watch API & Node.js EventEmitter streams'
    ],
    relatedPatternIds: ['pattern-command', 'pattern-state-machine']
  },
  {
    id: 'pattern-state-machine',
    title: 'State (Finite State Machines)',
    category: 'GoF Behavioral',
    group: 'Behavioral',
    difficulty: 'Intermediate',
    summary: 'Models explicit lifecycle states and legal transitions so impossible states become unrepresentable.',
    tags: ['Behavioral', 'State Machine', 'Domain Modeling', 'Type Safety', 'GoF'],
    intent: 'Allow an entity to alter its behavior when its internal state changes, enforcing strict state transition invariants and eliminating illegal operations.',
    modernContext: 'Modern TypeScript leverages Discriminated Unions (type State = { status: "DRAFT" } | { status: "PAID"; paidAt: Date }) and libraries like XState to enforce valid state transitions both at compile time and runtime.',
    whenToUse: [
      'Modeling domain lifecycles with strict transition rules (Order: Draft -> PaymentPending -> Paid -> Shipped | Refunded)',
      'Implementing network protocol or resilience state machines (Circuit Breaker: Closed -> Open -> Half-Open)',
      'Replacing clusters of correlated boolean flags (isLoading, isError, isSuccess, isRetrying) in UI or backend workflows'
    ],
    antiPatterns: [
      {
        name: 'Boolean Flag Soup (2^N Impossible States)',
        symptom: 'An Order object has { isPaid: boolean, isCancelled: boolean, isShipped: boolean, isRefunded: boolean }—allowing bugs where isCancelled && isShipped are both true simultaneously!',
        fix: 'Replace multiple boolean flags with an explicit State union or State Machine transition table.'
      },
      {
        name: 'Unchecked Direct Status Mutation',
        symptom: 'Allowing arbitrary code to run order.status = "SHIPPED" even when order.status was "CANCELLED".',
        fix: 'Encapsulate state transitions behind explicit transition methods or a pure reducer that validates allowed source states.'
      }
    ],
    tradeoffs: {
      pros: [
        'Makes impossible states unrepresentable at compile time and runtime',
        'Self-documents the exact legal lifecycle of a domain entity or protocol',
        'Centralizes transition guards and side-effects in one auditable place'
      ],
      cons: [
        'Classic GoF OOP State pattern (1 class per state) can be verbose in small domains compared to a transition table + discriminated union'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Boolean Flag Soup Allowing Corrupt Impossible States',
      badCode: `export class NaiveOrder {
  public isPaid = false;
  public isShipped = false;
  public isCancelled = false;
  public trackingNumber: string | null = null;

  shipOrder(tracking: string) {
    // Forgot to check if isCancelled is true or isPaid is false!
    this.isShipped = true;
    this.trackingNumber = tracking;
  }

  cancelOrder() {
    // Can accidentally cancel an already-shipped order!
    this.isCancelled = true;
  }
}`,
      goodTitle: 'Idiomatic: Discriminated Union + Validated Finite State Machine',
      goodCode: `export type OrderState =
  | { readonly status: 'PENDING_PAYMENT'; readonly createdAt: number }
  | { readonly status: 'PAID'; readonly transactionId: string; readonly paidAt: number }
  | { readonly status: 'SHIPPED'; readonly transactionId: string; readonly trackingCode: string }
  | { readonly status: 'CANCELLED'; readonly reason: string; readonly cancelledAt: number };

export type OrderEvent =
  | { type: 'RECORD_PAYMENT'; transactionId: string }
  | { type: 'DISPATCH_SHIPMENT'; trackingCode: string }
  | { type: 'CANCEL'; reason: string };

export function transitionOrderState(current: OrderState, event: OrderEvent): OrderState {
  switch (current.status) {
    case 'PENDING_PAYMENT':
      if (event.type === 'RECORD_PAYMENT') {
        return { status: 'PAID', transactionId: event.transactionId, paidAt: Date.now() };
      }
      if (event.type === 'CANCEL') {
        return { status: 'CANCELLED', reason: event.reason, cancelledAt: Date.now() };
      }
      break;

    case 'PAID':
      if (event.type === 'DISPATCH_SHIPMENT') {
        return {
          status: 'SHIPPED',
          transactionId: current.transactionId,
          trackingCode: event.trackingCode,
        };
      }
      if (event.type === 'CANCEL') {
        return { status: 'CANCELLED', reason: \`Refunded (\${event.reason})\`, cancelledAt: Date.now() };
      }
      break;

    case 'SHIPPED':
    case 'CANCELLED':
      // Terminal states reject further transitions
      break;
  }

  throw new Error(
    \`Illegal state transition: cannot apply [\${event.type}] when order is in [\${current.status}] state\`
  );
}`,
      explanation: 'Using a TypeScript Discriminated Union paired with a pure state-machine transition function guarantees that trackingCode only exists in SHIPPED state, and shipping an unpaid or cancelled order throws an explicit invariant error.'
    },
    realWorldUsages: [
      'Circuit Breaker resilience state machines (Closed <-> Open <-> Half-Open)',
      'XState / Temporal workflow state machines',
      'TCP Connection state machine (SYN_SENT, ESTABLISHED, FIN_WAIT, TIME_WAIT) & Stripe PaymentIntent statuses'
    ],
    relatedPatternIds: ['pattern-strategy', 'pattern-command']
  },
  {
    id: 'pattern-command',
    title: 'Command (Serializable Actions & Undo/Redo)',
    category: 'GoF Behavioral',
    group: 'Behavioral',
    difficulty: 'Intermediate',
    summary: 'Reifies a method invocation into a standalone object supporting queuing, audit logging, retries, and undo/redo.',
    tags: ['Behavioral', 'Undo/Redo', 'Job Queues', 'CQRS', 'Audit Log'],
    intent: 'Encapsulate a request or mutation as a standalone object containing all necessary parameters, enabling parameterization, queueing, audit logging, and reversible (undo/redo) operations.',
    modernContext: 'Command is the foundation of collaborative editors (Figma/ProseMirror Undo/Redo stacks), asynchronous background job queues (BullMQ/Temporal payloads), and the write side of CQRS architectures.',
    whenToUse: [
      'Implementing transactional Undo / Redo history stacks in editors, CAD tools, or financial adjustment ledgers',
      'Serializing intentions as JSON messages to be executed asynchronously by background worker queues (BullMQ, SQS, Celery)',
      'Creating an immutable audit trail of every user mutation with replay capability'
    ],
    antiPatterns: [
      {
        name: 'Command Boilerplate for Trivial Synchronous Calls',
        symptom: 'Wrapping every simple CRUD getter/setter in a Command class and CommandBus when no undo, queueing, or cross-boundary decoupling is needed.',
        fix: 'Only introduce Command objects when you genuinely need queuing, undo/redo, audit serialization, or middleware interception.'
      },
      {
        name: 'Impure Non-Deterministic Undo',
        symptom: 'An undo() method re-fetches external mutable data or generates random IDs instead of restoring the exact captured pre-mutation snapshot.',
        fix: 'Capture the exact inverse delta or previous value snapshot inside the Command instance during execute().'
      }
    ],
    tradeoffs: {
      pros: [
        'Decouples the invoker (UI button / API controller / Queue consumer) from the execution logic',
        'Makes Undo/Redo and macro recording (Composite Commands) straightforward',
        'Commands can be serialized over the network for delayed or retryable background execution'
      ],
      cons: [
        'Increases the number of small command classes/types in the codebase',
        'In-memory Undo stacks must cap history depth to prevent unbounded memory growth'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Direct Irreversible Mutation Without Audit or Undo',
      badCode: `export class PricingConfigStore {
  public prices = new Map<string, number>();

  updatePrice(sku: string, newPrice: number) {
    // Previous price is overwritten and lost forever!
    // No way to undo a fat-fingered bulk price change.
    this.prices.set(sku, newPrice);
  }
}`,
      goodTitle: 'Idiomatic: Reversible Command with Bounded Undo/Redo History Stack',
      goodCode: `export interface ReversibleCommand {
  readonly description: string;
  execute(): void;
  undo(): void;
}

export class UpdateSkuPriceCommand implements ReversibleCommand {
  private previousPrice: number | undefined;
  public readonly description: string;

  constructor(
    private readonly catalog: Map<string, number>,
    private readonly sku: string,
    private readonly nextPrice: number
  ) {
    this.description = \`Set \${sku} price to $\${nextPrice}\`;
  }

  execute(): void {
    this.previousPrice = this.catalog.get(this.sku);
    this.catalog.set(this.sku, this.nextPrice);
  }

  undo(): void {
    if (this.previousPrice === undefined) {
      this.catalog.delete(this.sku);
    } else {
      this.catalog.set(this.sku, this.previousPrice);
    }
  }
}

export class CommandHistoryManager {
  private undoStack: ReversibleCommand[] = [];
  private redoStack: ReversibleCommand[] = [];

  constructor(private readonly maxHistory = 100) {}

  dispatch(cmd: ReversibleCommand): void {
    cmd.execute();
    this.undoStack.push(cmd);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // New mutation invalidates redo branch
  }

  undoLast(): string | null {
    const cmd = this.undoStack.pop();
    if (!cmd) return null;
    cmd.undo();
    this.redoStack.push(cmd);
    return cmd.description;
  }

  redoLast(): string | null {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    cmd.execute();
    this.undoStack.push(cmd);
    return cmd.description;
  }
}`,
      explanation: 'Each UpdateSkuPriceCommand captures the exact pre-execution snapshot (previousPrice) when execute() runs, allowing CommandHistoryManager to deterministically undo and redo operations.'
    },
    realWorldUsages: [
      'Figma, VS Code, and ProseMirror Undo/Redo command stacks',
      'Database Migration runners (up() and down() reversible schema commands)',
      'Distributed Saga Orchestrators pairing forward Commands with Compensating Commands'
    ],
    relatedPatternIds: ['pattern-state-machine', 'pattern-observer']
  },
  {
    id: 'pattern-chain-of-responsibility',
    title: 'Chain of Responsibility (Interceptor Pipelines)',
    category: 'GoF Behavioral',
    group: 'Behavioral',
    difficulty: 'Intermediate',
    summary: 'Passes requests along a dynamic pipeline of handlers where each stage can enrich, validate, short-circuit, or delegate forward.',
    tags: ['Behavioral', 'Middleware', 'Validation', 'Pipeline', 'GoF'],
    intent: 'Avoid coupling the sender of a request to its receiver by giving a chain of handler objects the opportunity to process, transform, or short-circuit the request.',
    modernContext: 'Chain of Responsibility is ubiquitous in modern web frameworks as HTTP Middleware pipelines (Express, Koa, Hono, ASP.NET Core), multi-tier cache lookup chains (L1 In-Memory -> L2 Redis -> L3 Postgres), and security admission controllers (Kubernetes ValidatingAdmissionWebhooks).',
    whenToUse: [
      'Executing sequential request guards (IP Blocklist -> Rate Limit -> JWT Auth -> Schema Validation -> Business Handler) where any stage can reject early',
      'Building multi-tier fallback chains (check L1 memory cache; on miss delegate to L2 Redis; on miss delegate to DB)',
      'Routing customer support tickets, alerts, or exceptions through escalating severity handlers'
    ],
    antiPatterns: [
      {
        name: 'Silent Blackhole (Forgetting to Call next())',
        symptom: 'A middleware handler neither returns a response nor invokes await next(), causing the HTTP request to hang until client timeout.',
        fix: 'Use typed functional pipelines where every handler must return a Result or explicitly return next(context).'
      },
      {
        name: 'Implicit Context Bag Mutation',
        symptom: 'Handlers attach untyped properties onto req.locals.foo that downstream handlers secretly depend on, crashing if pipeline order changes.',
        fix: 'Type the pipeline context explicitly or use typed dependency tokens.'
      }
    ],
    tradeoffs: {
      pros: [
        'Each validation or security rule lives in a tiny, single-purpose, easily testable handler',
        'Pipeline stages can be dynamically reordered or conditionally enabled per route',
        'Early short-circuiting saves downstream CPU and database load'
      ],
      cons: [
        'Deep chains can make debugging request flow harder if logging is absent',
        'Requires a terminal fallback handler in case no stage handles the request'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Monolithic God Validator Method',
      badCode: `export async function handleApiRequest(req: any) {
  // Every security check, rate limit, and business rule jammed into 1 giant function
  if (blockedIps.has(req.ip)) {
    return { status: 403, body: 'Blocked IP' };
  }
  if (!req.headers['authorization']) {
    return { status: 401, body: 'Missing token' };
  }
  if (req.body.amount > 10000 && !req.headers['x-mfa-token']) {
    return { status: 403, body: 'High value transfer requires MFA' };
  }
  return { status: 200, body: 'Success' };
}`,
      goodTitle: 'Idiomatic: Composable Typed Middleware Chain (Koa / Hono Style)',
      goodCode: `export interface HttpContext {
  readonly ip: string;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly amountCents: number;
  principalId?: string;
}

export interface HttpResponse {
  status: number;
  body: string;
}

export type NextFn = () => Promise<HttpResponse>;
export type Middleware = (ctx: HttpContext, next: NextFn) => Promise<HttpResponse>;

export function composePipeline(
  middlewares: readonly Middleware[],
  terminalHandler: (ctx: HttpContext) => Promise<HttpResponse>
): (ctx: HttpContext) => Promise<HttpResponse> {
  return function execute(ctx: HttpContext): Promise<HttpResponse> {
    let index = -1;
    function dispatch(i: number): Promise<HttpResponse> {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times in same middleware'));
      }
      index = i;
      const fn = i === middlewares.length ? terminalHandler : middlewares[i];
      return fn(ctx, () => dispatch(i + 1));
    }
    return dispatch(0);
  };
}

// Modular, independently testable links in the chain:
export const ipBlocklistMiddleware: Middleware = async (ctx, next) => {
  if (ctx.ip === '192.0.2.99') return { status: 403, body: 'IP Blocked' };
  return next();
};

export const highValueMfaMiddleware: Middleware = async (ctx, next) => {
  if (ctx.amountCents > 1_000_000 && !ctx.headers['x-mfa-verified']) {
    return { status: 403, body: 'Step-up MFA required for transfers > $10,000' };
  }
  return next();
};`,
      explanation: 'composePipeline weaves independent Middleware functions into a deterministic execution chain with protection against calling next() twice, allowing any link to short-circuit early or wrap downstream execution.'
    },
    realWorldUsages: [
      'Koa / Hono / Express / ASP.NET Core HTTP middleware pipelines',
      'Kubernetes Admission Controllers (MutatingAdmissionWebhook -> ValidatingAdmissionWebhook)',
      'Multi-Tier Cache lookup chains (L1 Caffeine/Memory -> L2 Redis -> L3 Database)'
    ],
    relatedPatternIds: ['pattern-decorator', 'pattern-composite']
  },
  {
    id: 'pattern-template-method',
    title: 'Template Method & Async Iterators',
    category: 'GoF Behavioral',
    group: 'Behavioral',
    difficulty: 'Intermediate',
    summary: 'Defines the invariant skeleton of a multi-step workflow or streaming cursor while deferring customizable hooks.',
    tags: ['Behavioral', 'Async Generators', 'ETL Pipelines', 'Hooks', 'GoF'],
    intent: 'Define the skeleton of an algorithm (such as an ETL data ingestion job or paginated cursor stream) in a base runner, deferring specific steps to pluggable hooks without allowing callers to break the lifecycle order.',
    modernContext: 'Classic GoF Template Method relied on abstract class inheritance, which often led to the Fragile Base Class anti-pattern. Modern engineering prefers Hook Composition (passing typed lifecycle callbacks) and ES2018 Async Generators (async function* / for await...of) for streaming pagination.',
    whenToUse: [
      'Standardizing ETL / Webhook ingestion pipelines (Validate Signature -> Parse -> Idempotency Check -> Execute Hook -> Record Audit)',
      'Streaming millions of paginated API records or database rows in bounded memory using Async Iterators (Symbol.asyncIterator)',
      'Enforcing resource cleanup lifecycles (acquire lock -> run user hook -> release lock in finally)'
    ],
    antiPatterns: [
      {
        name: 'Fragile 5-Level Inheritance Hierarchy',
        symptom: 'BaseJob -> AbstractSqlJob -> RetryingSqlJob -> TenantSqlJob -> DailyBillingJob where changing a protected variable in BaseJob breaks 15 subclasses.',
        fix: 'Replace deep class inheritance with a single Pipeline Runner function that accepts a typed Hooks interface (Composition over Inheritance).'
      },
      {
        name: 'Unbounded Array Accumulation in Pagination',
        symptom: 'Fetching all 500 pages of a remote API into a giant in-memory array before returning, causing Node.js Out-Of-Memory (OOM) crashes.',
        fix: 'Use an Async Generator (async function*) Iterator so consumers process one page/item at a time with natural backpressure.'
      }
    ],
    tradeoffs: {
      pros: [
        'Guarantees invariant steps (idempotency, metrics, transaction commit/rollback) are never skipped by developers',
        'Async Iterator generators provide lazy pull-based backpressure with clean for-await-of syntax',
        'Hook composition avoids fragile inheritance hierarchies'
      ],
      cons: [
        'Can constrain flexibility if a specialized workflow genuinely needs a different step ordering',
        'Debugging across generator yields or lifecycle hooks requires clear error wrapping'
      ]
    },
    codeComparison: {
      badTitle: 'Anti-Pattern: Loading All Paginated Pages into RAM (OOM Crash)',
      badCode: `export async function fetchAllStripeCustomers(api: any) {
  const allCustomers: any[] = [];
  let cursor: string | null = null;

  // DANGER: If tenant has 2,000,000 customers, allCustomers[] blows up V8 heap!
  do {
    const page = await api.listCustomers({ starting_after: cursor, limit: 100 });
    allCustomers.push(...page.data);
    cursor = page.has_more ? page.data[page.data.length - 1].id : null;
  } while (cursor !== null);

  return allCustomers;
}`,
      goodTitle: 'Idiomatic: Template Runner + Lazy Async Generator Iterator (Bounded O(1) RAM)',
      goodCode: `export interface PageResponse<T> {
  items: T[];
  nextCursor: string | null;
}

// 1. Lazy Async Iterator Pattern: Streams items on-demand with natural backpressure
export async function* createPaginatedAsyncIterator<T>(
  fetchPage: (cursor: string | null) => Promise<PageResponse<T>>
): AsyncGenerator<T, void, unknown> {
  let cursor: string | null = null;
  do {
    const page = await fetchPage(cursor);
    for (const item of page.items) {
      // Execution pauses here until the consumer's loop requests the next item!
      yield item;
    }
    cursor = page.nextCursor;
  } while (cursor !== null);
}

// 2. Modern Composition-Based Template Method for Safe Webhook Processing
export interface WebhookProcessorHooks<TPayload, TResult> {
  verifySignature(rawBody: string, signature: string): boolean;
  parsePayload(rawBody: string): TPayload;
  extractIdempotencyKey(payload: TPayload): string;
  handleDomainAction(payload: TPayload): Promise<TResult>;
}

export async function runWebhookTemplate<TPayload, TResult>(
  rawBody: string,
  signature: string,
  processedKeys: Set<string>,
  hooks: WebhookProcessorHooks<TPayload, TResult>
): Promise<{ status: 'PROCESSED' | 'DUPLICATE_SKIPPED'; result?: TResult }> {
  // Invariant Step 1: Security check cannot be bypassed
  if (!hooks.verifySignature(rawBody, signature)) {
    throw new Error('401 Invalid Webhook HMAC Signature');
  }

  // Invariant Step 2: Parse & Deduplicate
  const payload = hooks.parsePayload(rawBody);
  const key = hooks.extractIdempotencyKey(payload);
  if (processedKeys.has(key)) {
    return { status: 'DUPLICATE_SKIPPED' };
  }

  // Customizable Step 3: Domain hook execution
  const result = await hooks.handleDomainAction(payload);
  processedKeys.add(key);
  return { status: 'PROCESSED', result };
}`,
      explanation: 'createPaginatedAsyncIterator uses ES2018 async generators to stream arbitrarily large datasets in O(page_size) memory, while runWebhookTemplate enforces invariant HMAC verification and idempotency checks via hook composition instead of fragile inheritance.'
    },
    realWorldUsages: [
      'AWS SDK v3 Paginators (paginateListObjectsV2 using for await...of)',
      'Test framework lifecycle runners (Vitest/Jest beforeEach -> test -> afterEach)',
      'Stripe / GitHub Webhook ingestion templates enforcing HMAC verification + idempotency'
    ],
    relatedPatternIds: ['pattern-strategy', 'pattern-chain-of-responsibility']
  }
];
