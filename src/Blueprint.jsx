import { useState } from "react";

// ─── ZERO HUMAN COMPANY · BLUEPRINT v1.0 ─────────────────────────────────────
// Clean architecture plan. No patch history. Just the right decisions.
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
	P0: "#00FF94",
	P1: "#FF6B35",
	P2: "#7B61FF",
	P3: "#FFD700",
	P4: "#00C8FF",
	P5: "#FF3CAC",
};

const principles = [
	{
		icon: "◈",
		title: "Board is God",
		desc: "Sets direction once. Never micromanages. The live feed is the only interface between Board and company.",
	},
	{
		icon: "⟳",
		title: "Async Queues Drive Scheduling",
		desc: "asyncio.Queue per agent replaces all DB polling. Zero latency, zero wasted compute. Events pushed, never pulled.",
	},
	{
		icon: "⊙",
		title: "AgentTools Drive Delegation",
		desc: "CEO calls CTO/CMO as AgentTools within its own execution — synchronous within the async task. CEO stays in the loop, gets results back, synthesizes. Two layers, not competing.",
	},
	{
		icon: "⊛",
		title: "SQLite is Truth",
		desc: "ADK session is an ephemeral execution cache — reconstructable at any time. SQLite is the single canonical source of truth. If they ever conflict, SQLite wins. Always.",
	},
	{
		icon: "◎",
		title: "Pydantic Everywhere",
		desc: "Every message, every output, every config value, every agent state transition is a typed Pydantic model. No untyped dicts. No magic strings. Ever.",
	},
	{
		icon: "⟡",
		title: "Errors are Architecture",
		desc: "Typed exception hierarchy maps every failure mode to a recovery strategy. No bare except clauses. No string matching on error messages.",
	},
	{
		icon: "◉",
		title: "BudgetGuard is Middleware",
		desc: "Hard budget enforcement is a Python decorator wrapping every ADK call — deterministic, zero latency, 100% reliable. CFO LLM handles advisory, negotiation, and anomaly reasoning separately.",
	},
	{
		icon: "◬",
		title: "Observability is First-Class",
		desc: "structlog for structured logs. OpenTelemetry spans per agent call. Every agent action is a traceable, queryable event. You can reconstruct exactly what happened and why.",
	},
];

const phases = [
	{
		id: "P0",
		title: "Foundation",
		subtitle: "Monorepo, schema, config, type system",
		duration: "Week 1",
		color: COLORS.P0,
		tasks: [
			{
				title: "Monorepo Structure",
				details: [
					"zero-human-company/ → /backend, /frontend, /agents, /shared",
					"/shared contains: Pydantic models, exception hierarchy, config — imported by both backend and agents",
					"Python 3.12+, uv for dependency management (faster than pip), pyproject.toml",
					"backend: FastAPI + aiosqlite + alembic + structlog + opentelemetry-sdk",
					"agents: google-adk + pydantic + pydantic-settings + pytest-asyncio",
					"frontend: React 18 + Tailwind + Zustand (state) + Recharts (budget viz)",
				],
			},
			{
				title: "Pydantic Type System  (/shared/models.py)",
				details: [
					"AgentRole: Enum — CEO | CTO | CMO | HR | CFO | DEVELOPER | RESEARCHER | ANALYST | DEVOPS",
					"AgentState: Enum — IDLE | ACKNOWLEDGED | WORKING | BLOCKED | REPORTING",
					"MessageType: Enum — TASK_ASSIGN | TASK_UPDATE | TASK_COMPLETE | HIRE_REQUEST | BROADCAST | REPORT | BUDGET_ALERT",
					"Message: BaseModel — id, from_role, to_role, type, priority, content, thread_id, timestamp, version",
					"Task: BaseModel — id, company_id, creator, assignee, status, type, payload, priority, thread_id, dedup_fingerprint",
					"All output types: CodeOutput | ResearchReport | TechnicalSpec | DesignDoc | BoardReport — each a typed BaseModel",
					"CompanyConfig: pydantic-settings BaseSettings — all tunable values in one validated object",
				],
			},
			{
				title: "CompanyConfig  (/shared/config.py)",
				details: [
					"MODELS: dict — pro='gemini-3.1-pro-preview', flash='gemini-3-flash-preview' — single source of truth",
					"AGENT_MODELS: dict[AgentRole, str] — maps every role to its model string",
					"POOL_SIZES: dict[AgentRole, int] — initial pool sizes per worker role",
					"POOL_MAX: dict[AgentRole, int] — maximum pool cap per role",
					"BUDGET: dict[AgentRole, int] — token budget per agent per task",
					"CONTEXT_TTL_SECONDS: int = 30 — compiled context staleness threshold",
					"WORKER_IDLE_TTL_SECONDS: int = 300 — worker release after idle",
					"TASK_RETRY_MAX: int = 3 — max retry attempts before dead letter",
					"RETRY_BACKOFF: list[int] = [2, 8, 32] — exponential backoff seconds",
					"LOCK_TTL_SECONDS: int = 30 — auto-expire lock if agent crashes mid-task",
				],
			},
			{
				title: "Typed Exception Hierarchy  (/shared/exceptions.py)",
				details: [
					"ZeroHumanError(Exception) — base for all system errors",
					"AgentError(ZeroHumanError) — base for agent-level failures",
					"TaskClaimError(AgentError) — task already claimed by another agent",
					"InvalidStateTransitionError(AgentError) — illegal state machine move",
					"ContextStalenessError(AgentError) — compiled context expired, must refresh",
					"PoolExhaustedError(AgentError) — no idle worker of requested role, at max cap",
					"BudgetExceededError(ZeroHumanError) — hard budget limit hit, task blocked",
					"DuplicateTaskError(ZeroHumanError) — fingerprint collision, return existing",
					"DeadLetterError(ZeroHumanError) — task failed max retries, escalate to CEO",
					"Each exception carries structured context: agent_id, task_id, detail — loggable by structlog",
				],
			},
			{
				title: "Database Schema  (SQLite canonical truth)",
				details: [
					"companies: id, name, mission, vision, created_at",
					"agents: id, company_id, role, model, state, current_task_id, token_budget, tokens_used, created_at",
					"tasks: id, company_id, creator_id, assignee_id, status, type, payload, priority, thread_id, dedup_fingerprint UNIQUE, retry_count, created_at, updated_at",
					"events: id, company_id, agent_id, type, payload (JSON), trace_id, timestamp — dashboard feed + OTel correlation",
					"locks: resource_id, owner_id, acquired_at, expires_at",
					"budget_ledger: id, agent_id, task_id, tokens_in, tokens_out, cost_usd, timestamp",
					"agent_context: agent_id, compiled_view, version, compiled_at — invalidated after CONTEXT_TTL_SECONDS",
					"processed_msgs: id, agent_id, msg_id, processed_at — idempotency guard",
					"dead_letters: id, task_id, failure_reason, retry_count, escalated_at",
				],
			},
			{
				title: "CompanyStore Interface  (/backend/database/store.py)",
				details: [
					"Abstract base with full type signatures — all methods typed with Pydantic models",
					"claim_task(task_id, agent_id) → Task | raises TaskClaimError",
					"create_task(task: Task) → Task | raises DuplicateTaskError (returns existing)",
					"publish_event(event: Event) → None",
					"get_compiled_context(agent_id) → CompiledContext | raises ContextStalenessError",
					"update_budget(agent_id, tokens_in, tokens_out) → BudgetLedgerEntry | raises BudgetExceededError",
					"SQLiteStore: concrete implementation — all writes in atomic transactions via aiosqlite",
					"RedisStore: stub interface only in v1 — fills in later with zero agent code changes",
				],
			},
		],
	},
	{
		id: "P1",
		title: "Agent Engine",
		subtitle: "BaseAgent, state machine, async queue scheduling, observability",
		duration: "Week 1–2",
		color: COLORS.P1,
		tasks: [
			{
				title: "BaseAgent  (/agents/base_agent.py)",
				details: [
					"Extends ADK LlmAgent — ADK handles model invocation, tool dispatch, session",
					"ADK session = ephemeral execution cache. On startup: hydrate state from SQLite, never trust stale ADK session",
					"asyncio.Queue[Message] per agent instance — the scheduling backbone. Zero polling. Zero latency.",
					"AgentState enum enforced via transition table — invalid moves raise InvalidStateTransitionError",
					"Valid transitions: IDLE→ACKNOWLEDGED, ACKNOWLEDGED→WORKING, WORKING→BLOCKED, WORKING→REPORTING, BLOCKED→WORKING, REPORTING→IDLE",
					"async run() loop: await queue.get() → claim_task → compile_context → execute → report → IDLE",
					"On task arrival while WORKING: ACKNOWLEDGE immediately ('Got it, queued at position N'), enqueue — never interrupt active work",
					"Heartbeat: emit ALIVE event every 30s while WORKING — silence triggers HR watchdog",
				],
			},
			{
				title: "Two-Layer Communication Model",
				details: [
					"LAYER 1 — Scheduling (asyncio.Queue): drives WHEN an agent gets invoked. Board→CEO, HR→Worker assignments all go through queues. Async, non-blocking, push-based.",
					"LAYER 2 — Delegation (AgentTools): drives HOW an agent calls another WITHIN its own execution. CEO invokes CTO as a tool call — synchronous within the async task, CEO stays in loop.",
					"These are NOT competing patterns. Queue = outer scheduling loop. AgentTools = inner execution delegation.",
					"Message envelopes are A2A-compatible Pydantic models — same structure as A2A protocol, zero SDK dependency. Transport swap later costs nothing.",
					"All messages persisted to SQLite messages table for audit trail + replay",
				],
			},
			{
				title: "BudgetGuard Middleware  (/agents/middleware/budget_guard.py)",
				details: [
					"@budget_guard decorator wraps every ADK model call — applied at BaseAgent level",
					"Before call: check tokens_used + estimated_tokens against budget — raises BudgetExceededError if exceeded",
					"After call: record actual tokens_in + tokens_out to budget_ledger via CompanyStore.update_budget()",
					"BudgetExceededError triggers: agent state → BLOCKED, event emitted, CEO notified via queue",
					"Deterministic enforcement — no LLM reasoning involved. Always fires. Zero latency.",
					"Separate from CFO agent which handles advisory reasoning, anomaly detection, and escalation",
				],
			},
			{
				title: "Observability Layer  (/agents/observability.py)",
				details: [
					"structlog configured globally — every log entry is structured JSON with agent_id, role, task_id, trace_id",
					"OpenTelemetry tracer: one span per agent execution — attributes: role, model, task_type, token_count",
					"Child spans for: tool calls, memory reads/writes, context compilation, state transitions",
					"Span context propagated across agent boundaries via thread_id → trace_id correlation",
					"Dev: traces emitted to stdout as formatted JSON. Prod: OTLP exporter (Jaeger/Honeycomb/etc)",
					"Every exception logged with full structured context before re-raising — no silent failures",
					"Event emission via CompanyStore.publish_event() also attaches trace_id for dashboard correlation",
				],
			},
			{
				title: "Race Condition Guards",
				details: [
					"Task claim: atomic SQLite UPDATE WHERE status='pending' — enforced by CompanyStore, raises TaskClaimError on collision",
					"Task dedup: UNIQUE constraint on dedup_fingerprint — DuplicateTaskError returns existing task, never creates duplicate",
					"State transition: written inside transaction — concurrent transition attempt = one succeeds, one raises InvalidStateTransitionError",
					"Idempotent inbox: processed_msgs checked before execution — duplicate message delivery silently discarded",
					"Lock TTL: expires_at on locks table — crashed agent's lock auto-expires, task re-queued by watchdog",
					"Worker pool lock: HR acquires role-scoped lock before assignment — prevents double-assignment of same worker",
				],
			},
			{
				title: "Compiled Context Views  (/agents/context.py)",
				details: [
					"Context compiler builds lean per-agent view before every invocation — never raw company brain dump",
					"CEO view: strategic plan summary + C-suite agent states + active thread IDs + budget overview",
					"C-suite view: own task payload + assigned worker states + their latest outputs + reporting chain",
					"Worker view: single task payload + tool manifest + reporting_to + workspace file list",
					"Token budgets: CEO ≤8k tokens, C-suite ≤4k tokens, Workers ≤2k tokens — enforced at compile time",
					"Staleness TTL: ContextStalenessError raised if compiled_at > CONTEXT_TTL_SECONDS — forces recompile",
					"Version field on agent_context: optimistic concurrency prevents stale context overwrites",
				],
			},
		],
	},
	{
		id: "P2",
		title: "C-Suite Agents",
		subtitle:
			"CEO, CTO, CMO, HR, CFO — each with defined responsibilities and clear output contracts",
		duration: "Week 2",
		color: COLORS.P2,
		tasks: [
			{
				title: "CEO  ·  gemini-3.1-pro-preview",
				details: [
					"Receives board directive via queue → writes strategic plan to company brain (typed StrategicPlan model)",
					"Delegates via AgentTools: invokes CTO tool + CMO tool as parallel tool calls within own execution",
					"CEO stays in the loop — AgentTools returns typed results (TechnicalSpec, MarketReport) CEO can reason over",
					"Synthesizes all C-suite results → produces BoardReport (typed Pydantic model) → emits to board via WebSocket",
					"Can override CFO budget block: escalates to board or re-scopes task to fit within budget",
					"Handles DeadLetterError escalations: re-decomposes failed tasks, reassigns, or reports blocker to board",
					"Broadcasts StrategicUpdate to all agents when company direction changes",
				],
			},
			{
				title: "CTO  ·  gemini-3.1-pro-preview",
				details: [
					"Receives task from CEO (via AgentTools call or direct queue message) → produces TechnicalSpec",
					"Calls Developer / DevOps / Architect as AgentTools — parallel where tasks are independent",
					"Code review: validates CodeOutput from Developer before accepting (lint score, test pass, spec compliance)",
					"Owns /workspace — arbitrates file conflicts between workers, maintains file manifest in company brain",
					"Reports TechnicalStatus (typed) to CEO: completed work, blockers, worker utilization",
					"Escalates critical failures (3 consecutive worker failures on same task) directly to CEO",
				],
			},
			{
				title: "CMO  ·  gemini-3-flash-preview",
				details: [
					"Receives research/market task from CEO → produces MarketReport (typed Pydantic model)",
					"Calls Researcher + Analyst as AgentTools — aggregates their outputs into synthesis",
					"Has google_search tool natively registered in ADK tool registry",
					"Compiles competitive analysis, market sizing, content strategy — structured outputs only",
					"Reports MarketReport to CEO with confidence scores per source",
				],
			},
			{
				title: "HR  ·  gemini-3-flash-preview",
				details: [
					"Listens for HireRequest messages on queue — typed Pydantic model with role + requesting_agent + context",
					"Pool-first: check for idle worker of requested role before considering pool growth",
					"Pool growth: if all instances at cap → raise PoolExhaustedError → CEO notified to re-scope or wait",
					"Pool growth under cap: instantiate new pre-typed worker, add to pool, assign task",
					"Worker TTL watchdog: asyncio task checks idle workers every 60s — releases if idle > WORKER_IDLE_TTL_SECONDS",
					"Heartbeat monitor: if worker silent > 60s while WORKING → mark FAILED, re-queue task, emit event",
					"Maintains live OrgChart model in company brain — updated on every pool change",
				],
			},
			{
				title: "CFO  ·  gemini-3-flash-preview  (Advisory + Anomaly)",
				details: [
					"IMPORTANT: Hard enforcement is NOT CFO's job — that's BudgetGuard middleware. CFO handles reasoning.",
					"Listens for BudgetAlert events (emitted by BudgetGuard when agent hits >80% of budget)",
					"Anomaly detection: flags unusual spend patterns ('Developer burned 60% of budget on one tool call')",
					"Proactive advice: recommends task re-scoping, worker re-assignment, or budget reallocation to CEO",
					"Board reporting: produces BudgetReport (typed) — per-agent spend, burn rate, projected runway",
					"Emergency budget requests: drafts escalation to board when company-wide budget is critically low",
					"Does NOT make enforcement decisions — BudgetGuard is the enforcer, CFO is the analyst",
				],
			},
		],
	},
	{
		id: "P3",
		title: "Worker Pool & Tools",
		subtitle: "Pre-typed pool, tool registry, typed output contracts",
		duration: "Week 2–3",
		color: COLORS.P3,
		tasks: [
			{
				title: "Worker Pool  (/agents/pool.py)",
				details: [
					"WorkerPool initialized at company creation — pre-typed LlmAgent instances per role",
					"Default pool: 2× Developer, 2× Researcher, 1× DevOps, 1× Analyst (configured via CompanyConfig.POOL_SIZES)",
					"All workers: gemini-3-flash-preview — volume tasks, frontier-class performance",
					"HR calls pool.assign(role, task) → Worker | raises PoolExhaustedError",
					"pool.release(worker_id) → marks IDLE, starts TTL countdown",
					"pool.scale_up(role) → adds new pre-typed instance if under POOL_MAX cap",
					"pool.status() → typed PoolStatus model — utilization per role, idle counts, active tasks",
					"ADK session for each worker is ephemeral — reconstructed from task payload + role prompt on assignment",
				],
			},
			{
				title: "Tool Registry  (/agents/tools/)",
				details: [
					"google_search(query, max_results) → list[SearchResult] — ADK built-in, typed output",
					"code_exec(language: str, code: str, timeout: int) → CodeExecResult — sandboxed subprocess, typed",
					"file_write(path: str, content: str) → FileWriteResult — writes to /workspace, emits event",
					"file_read(path: str) → FileReadResult — reads from /workspace",
					"memory_read(key: str) → MemoryValue — typed company brain read",
					"memory_write(key: str, value: Any, version: int) → MemoryWriteResult | raises ConcurrencyError",
					"All tools are typed Pydantic function signatures — ADK function calling uses these types directly",
					"All tool calls are wrapped in OTel child spans — traceable, measurable latency per tool",
				],
			},
			{
				title: "Worker Agent Types  (/agents/workers/)",
				details: [
					"Developer: code_exec + file_write + file_read + memory_read — produces CodeOutput",
					"Researcher: google_search + memory_write + memory_read — produces ResearchReport",
					"Analyst: memory_read + file_read + code_exec (for data scripts) — produces AnalysisReport",
					"DevOps: file_write + file_read + code_exec (for infra scripts) — produces InfraSpec",
					"Each worker has a role-specific system prompt emphasizing: output format, quality bar, escalation criteria",
					"Workers report typed output + trace_id back to assigning C-suite agent via queue message",
				],
			},
			{
				title: "Typed Output Contracts  (/shared/outputs.py)",
				details: [
					"CodeOutput: language, files: list[CodeFile], tests: list[TestResult], lint_score: float, notes: str",
					"ResearchReport: query, sources: list[Source], synthesis: str, confidence: float, searched_at: datetime",
					"TechnicalSpec: overview, architecture, stack: list[StackItem], risks: list[Risk], estimated_tokens: int",
					"MarketReport: query, competitors: list[Competitor], market_size: str, recommendations: list[str]",
					"AnalysisReport: data_summary, findings: list[Finding], charts: list[ChartSpec], confidence: float",
					"BoardReport: summary, decisions: list[Decision], blockers: list[Blocker], next_steps: list[str], budget_used: int",
					"OrgChart: agents: list[AgentStatus], pool_utilization: dict[str, float], updated_at: datetime",
					"All output types: model_config = ConfigDict(frozen=True) — immutable once produced",
				],
			},
		],
	},
	{
		id: "P4",
		title: "API & Dashboard",
		subtitle: "FastAPI backend, WebSocket event stream, board UI",
		duration: "Week 3",
		color: COLORS.P4,
		tasks: [
			{
				title: "FastAPI Backend  (/backend/api/)",
				details: [
					"POST /companies — create company, init agent pool, return CompanyResponse",
					"POST /companies/{id}/directive — board submits directive → enqueued to CEO, returns DirectiveAck",
					"GET /companies/{id}/agents — live OrgChart snapshot from company brain",
					"GET /companies/{id}/tasks — TaskTree with full hierarchy, statuses, output references",
					"GET /companies/{id}/budget — BudgetReport from CFO ledger",
					"GET /companies/{id}/brain — company brain key-value browser (board inspector)",
					"WebSocket /ws/{company_id} — push all Event objects as typed JSON to dashboard",
					"All request/response bodies are typed Pydantic models — auto-generates OpenAPI docs",
					"Dependency injection: CompanyStore injected via FastAPI Depends — testable, swappable",
				],
			},
			{
				title: "WebSocket Event Stream",
				details: [
					"Every CompanyStore.publish_event() call fans out to all connected WebSocket clients for that company",
					"Event payload: {id, company_id, agent_id, role, type, content, trace_id, timestamp} — typed",
					"Frontend receives typed events — no polling, no refresh, pure push",
					"Event types drive UI updates: AGENT_STATE_CHANGE updates org chart, TASK_COMPLETE updates task tree",
					"Reconnect logic: client reconnects on drop, backend replays last 50 events from SQLite events table",
					"Trace ID on every event — board can click any event and see its full OTel trace in dev",
				],
			},
			{
				title: "Board Dashboard  (/frontend/)",
				details: [
					"Onboarding: company name, mission, vision, initial token budget — POST /companies",
					"Dashboard layout: Live Feed (left) + Org Chart (center) + Board Panel (right)",
					"Live Feed: real-time event stream, color-coded by role, thread-grouped, filterable",
					"Org Chart: animated agent nodes showing state (IDLE/WORKING/BLOCKED) + current task + model badge",
					"Board Panel: directive input, latest BoardReport, budget burn gauge",
					"Task Tree: hierarchical expand/collapse — each task shows status, assignee, output preview",
					"Budget Panel: per-agent spend bars (Recharts), burn rate sparkline, inject budget button",
					"Company Brain Inspector: key-value browser of all shared memory — read-only for board",
				],
			},
			{
				title: "Dev Tooling",
				details: [
					"ADK Dev UI (adk web): use during agent development — visual agent graph, session inspector, request/response tabs",
					"Custom dashboard is board-facing UX only — not a debugging tool",
					"structlog output in dev: pretty-printed colored JSON to stdout — readable, not noisy",
					"OTel traces in dev: printed to stdout as formatted trace trees — no collector needed locally",
					"FastAPI auto-docs at /docs — full OpenAPI spec generated from Pydantic models automatically",
					"pytest-asyncio test suite: unit tests for CompanyStore + state machine + race conditions",
				],
			},
		],
	},
	{
		id: "P5",
		title: "Resilience & Production",
		subtitle: "Failure handling, conflict resolution, production hardening",
		duration: "Week 4",
		color: COLORS.P5,
		tasks: [
			{
				title: "Failure Handling",
				details: [
					"Lock TTL: locks.expires_at auto-expires crashed agent's lock — watchdog re-queues orphaned tasks every 30s",
					"Task retry: CompanyStore.retry_task() — increments retry_count, re-queues with backoff (2s, 8s, 32s)",
					"DeadLetterError: raised when retry_count >= TASK_RETRY_MAX — task moved to dead_letters table, CEO notified",
					"CEO handles DeadLetterError: re-decomposes task differently, assigns different worker type, or reports blocker to board",
					"Worker heartbeat: HR watchdog fires worker if silent > 60s while WORKING — task re-queued to pool",
					"BudgetExceededError: agent BLOCKED, CEO notified via queue, board can inject budget or CEO can re-scope task",
					"PoolExhaustedError: CEO notified, can wait (re-queue with delay), re-scope task to use fewer workers, or request board to increase cap",
				],
			},
			{
				title: "Conflict Resolution",
				details: [
					"Company brain writes: version field + optimistic concurrency — ConcurrencyError on stale write, agent re-reads and retries",
					"/workspace file conflicts: file manifest in company brain — CTO arbitrates, workers must request file lock before writing",
					"Context staleness: ContextStalenessError forces recompile before next execution — never acts on stale context",
					"A2A message ordering: sequence_number per thread — out-of-order messages buffered until gap fills",
					"SQLite WAL mode enabled: concurrent reads never block writes — optimal for multi-agent access pattern",
				],
			},
			{
				title: "Testing Strategy",
				details: [
					"pytest-asyncio for all async tests — no sync wrappers, no event loop hacks",
					"Unit: CompanyStore (all methods), BaseAgent state machine (all transitions + invalid transitions), context compiler",
					"Unit: BudgetGuard (enforcement fires correctly), exception hierarchy (each type carries correct context)",
					"Integration: full board→CEO→CTO→Developer→report cycle — real ADK agents, real model calls",
					"Race condition: hypothesis property-based testing — 10 concurrent task claims, verify exactly one winner",
					"Budget: BudgetGuard blocks at correct threshold, CFO receives alert, CEO receives escalation",
					"Pool: PoolExhaustedError fires correctly at cap, scale-up works under cap",
					"Resilience: simulate agent crash (kill queue), verify lock expires and task re-queues correctly",
				],
			},
			{
				title: "Redis Migration Path",
				details: [
					"CompanyStore interface: all agent code is already backend-agnostic — zero changes needed to agents",
					"RedisStore implementation: locks → SET NX EX, events → Pub/Sub, queues → Redis Streams (ordered, persistent)",
					"asyncio.Queue → Redis Streams: cross-process agents now possible, topology scales horizontally",
					"A2A message envelopes are already transport-agnostic Pydantic models — drop into Redis Streams unchanged",
					"Docker Compose: backend + frontend + Redis in single docker-compose up",
					"Migration is additive — SQLiteStore stays as fallback, feature-flagged via CompanyConfig.BACKEND",
				],
			},
		],
	},
];

const techStack = [
	{
		layer: "Agent Framework",
		tech: "Google ADK",
		tier: "core",
		note: "LlmAgent, AgentTools, tool registry, session management",
	},
	{
		layer: "CEO / CTO",
		tech: "gemini-3.1-pro-preview",
		tier: "model",
		note: "Best thinking, agentic tool use, software engineering optimized",
	},
	{
		layer: "All Others",
		tech: "gemini-3-flash-preview",
		tier: "model",
		note: "Frontier-class speed, fraction of pro cost — all C-suite/workers",
	},
	{
		layer: "Model Config",
		tech: "agents/config.py",
		tier: "core",
		note: "MODELS dict — single source of truth, two strings to update on deprecation",
	},
	{
		layer: "Type System",
		tech: "Pydantic v2",
		tier: "core",
		note: "All messages, outputs, config, exceptions — typed, validated, documented",
	},
	{
		layer: "Budget Enforcement",
		tech: "BudgetGuard middleware",
		tier: "core",
		note: "Python decorator on every ADK call — deterministic, zero latency",
	},
	{
		layer: "Async Scheduling",
		tech: "asyncio.Queue",
		tier: "core",
		note: "Per-agent queue — zero polling, zero latency, pure push",
	},
	{
		layer: "Agent Delegation",
		tech: "AgentTools pattern",
		tier: "core",
		note: "Within-execution delegation — CEO stays in loop, gets typed results back",
	},
	{
		layer: "Message Format",
		tech: "A2A-compatible Pydantic",
		tier: "core",
		note: "A2A envelope structure, no SDK dependency — transport swap costs nothing",
	},
	{
		layer: "Backend",
		tech: "FastAPI + Python 3.12",
		tier: "infra",
		note: "Async native, Pydantic request/response, auto OpenAPI docs",
	},
	{
		layer: "Database",
		tech: "SQLite + aiosqlite",
		tier: "infra",
		note: "Canonical source of truth. WAL mode. Zero setup.",
	},
	{
		layer: "Migrations",
		tech: "Alembic",
		tier: "infra",
		note: "Schema versioning, reproducible migrations",
	},
	{
		layer: "Dep Management",
		tech: "uv",
		tier: "infra",
		note: "Faster than pip, lockfile-based, reproducible installs",
	},
	{
		layer: "Structured Logs",
		tech: "structlog",
		tier: "obs",
		note: "Every log is typed JSON: agent_id, role, task_id, trace_id",
	},
	{
		layer: "Tracing",
		tech: "OpenTelemetry SDK",
		tier: "obs",
		note: "Span per agent execution, child spans per tool call — stdout in dev",
	},
	{
		layer: "Real-time",
		tech: "WebSocket (FastAPI)",
		tier: "infra",
		note: "Push-based event stream to board dashboard",
	},
	{
		layer: "Frontend State",
		tech: "React 18 + Zustand",
		tier: "frontend",
		note: "Lightweight state, no Redux overhead",
	},
	{
		layer: "Frontend Charts",
		tech: "Recharts",
		tier: "frontend",
		note: "Budget burn, token usage visualization",
	},
	{
		layer: "Testing",
		tech: "pytest-asyncio + hypothesis",
		tier: "infra",
		note: "Async tests + property-based race condition testing",
	},
	{
		layer: "Dev Debug UI",
		tech: "ADK Dev UI (adk web)",
		tier: "infra",
		note: "Built-in agent graph + session inspector — use during dev",
	},
	{
		layer: "Future: Queues",
		tech: "Redis + Docker Compose",
		tier: "future",
		note: "CompanyStore swap — zero agent code changes",
	},
];

const fileStructure = `zero-human-company/
├── shared/                          # Imported by both backend + agents
│   ├── models.py                    # All Pydantic models: Message, Task, Agent, Event
│   ├── outputs.py                   # Typed output contracts: CodeOutput, ResearchReport, BoardReport...
│   ├── exceptions.py                # Typed exception hierarchy: ZeroHumanError → all subtypes
│   └── config.py                    # CompanyConfig (pydantic-settings): models, budgets, pool sizes, TTLs
│
├── backend/
│   ├── main.py                      # FastAPI app, lifespan, router registration
│   ├── database/
│   │   ├── models.py                # SQLAlchemy table definitions
│   │   ├── store.py                 # CompanyStore abstract interface (fully typed)
│   │   ├── sqlite_store.py          # SQLite implementation — WAL mode, atomic transactions
│   │   └── redis_store.py           # Redis stub — interface only in v1
│   └── api/
│       ├── companies.py             # POST /companies, POST /companies/{id}/directive
│       ├── agents.py                # GET /companies/{id}/agents (OrgChart)
│       ├── tasks.py                 # GET /companies/{id}/tasks (TaskTree)
│       ├── budget.py                # GET /companies/{id}/budget, POST .../budget
│       ├── brain.py                 # GET /companies/{id}/brain (inspector)
│       └── ws.py                    # WebSocket /ws/{company_id} event stream
│
├── agents/
│   ├── config.py                    # MODELS dict + AGENT_MODELS assignment
│   ├── base_agent.py                # BaseAgent: ADK extend, state machine, asyncio.Queue, heartbeat
│   ├── context.py                   # Context compiler: per-role compiled views, TTL, versioning
│   ├── pool.py                      # WorkerPool: assign, release, scale_up, status, TTL watchdog
│   ├── middleware/
│   │   └── budget_guard.py          # @budget_guard decorator — hard enforcement before/after ADK calls
│   ├── observability.py             # structlog config + OTel tracer setup + span helpers
│   ├── csuite/
│   │   ├── ceo.py                   # gemini-3.1-pro-preview — AgentTools delegation, synthesis
│   │   ├── cto.py                   # gemini-3.1-pro-preview — technical spec, code review
│   │   ├── cmo.py                   # gemini-3-flash-preview — research, market analysis
│   │   ├── hr.py                    # gemini-3-flash-preview — pool management, watchdog
│   │   └── cfo.py                   # gemini-3-flash-preview — budget advisory, anomaly detection
│   ├── workers/
│   │   ├── developer.py             # gemini-3-flash-preview + code_exec + file tools
│   │   ├── researcher.py            # gemini-3-flash-preview + google_search
│   │   ├── analyst.py               # gemini-3-flash-preview + code_exec (data) + memory
│   │   └── devops.py                # gemini-3-flash-preview + file tools + code_exec (infra)
│   └── tools/
│       ├── search.py                # google_search → list[SearchResult]
│       ├── code_exec.py             # code_exec → CodeExecResult (sandboxed)
│       ├── file_tools.py            # file_read/write → typed results
│       └── memory_tools.py          # memory_read/write → typed + versioned
│
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── store/                   # Zustand stores: company, agents, events, budget
│       ├── pages/
│       │   ├── Onboarding.jsx
│       │   └── Dashboard.jsx
│       └── components/
│           ├── LiveFeed.jsx          # WebSocket event stream, threaded, filterable
│           ├── OrgChart.jsx          # Animated agent nodes, state badges, model labels
│           ├── BoardPanel.jsx        # Directive input + BoardReport display
│           ├── BudgetPanel.jsx       # Recharts burn rate + per-agent spend + inject
│           ├── TaskTree.jsx          # Hierarchical task view + output previews
│           └── BrainInspector.jsx    # Company brain key-value browser
│
├── tests/
│   ├── unit/
│   │   ├── test_store.py            # CompanyStore: all methods, error cases
│   │   ├── test_state_machine.py    # All valid + invalid transitions
│   │   ├── test_budget_guard.py     # Enforcement thresholds, BudgetExceededError
│   │   └── test_context.py          # Compiler, TTL staleness, version conflicts
│   ├── integration/
│   │   └── test_full_cycle.py       # board→CEO→CTO→Developer→report end-to-end
│   └── race_conditions/
│       └── test_concurrent.py       # hypothesis: 10 concurrent claims, pool contention
│
├── pyproject.toml                   # uv managed — all deps + tool config
├── alembic.ini
├── docker-compose.yml               # backend + frontend (+ redis stub)
└── .env.example`;

const modelMatrix = [
	{
		agent: "CEO",
		model: "gemini-3.1-pro-preview",
		tier: "pro",
		why: "Strategic decomp, parallel AgentTools delegation, synthesis — needs deepest reasoning",
	},
	{
		agent: "CTO",
		model: "gemini-3.1-pro-preview",
		tier: "pro",
		why: "Architecture decisions, code review, technical judgment — software engineering optimized",
	},
	{
		agent: "CMO",
		model: "gemini-3-flash-preview",
		tier: "flash",
		why: "Research synthesis, market analysis — frontier speed, high throughput",
	},
	{
		agent: "HR",
		model: "gemini-3-flash-preview",
		tier: "flash",
		why: "Pool routing, assignment decisions — simple logic, high call frequency",
	},
	{
		agent: "CFO",
		model: "gemini-3-flash-preview",
		tier: "flash",
		why: "Budget advisory, anomaly reasoning — no deep reasoning, hard enforcement is middleware",
	},
	{
		agent: "Developer",
		model: "gemini-3-flash-preview",
		tier: "flash",
		why: "Code gen — Flash is strong for coding, high volume output expected",
	},
	{
		agent: "Researcher",
		model: "gemini-3-flash-preview",
		tier: "flash",
		why: "Web search + synthesis — speed over depth, many parallel calls",
	},
	{
		agent: "Analyst",
		model: "gemini-3-flash-preview",
		tier: "flash",
		why: "Data processing, structured reports — volume task",
	},
	{
		agent: "DevOps",
		model: "gemini-3-flash-preview",
		tier: "flash",
		why: "Infra specs, config files — deterministic output, flash sufficient",
	},
];

const buildOrder = [
	{
		day: "Day 1",
		task: "/shared: Pydantic models, exception hierarchy, CompanyConfig (pydantic-settings)",
		phase: "P0",
	},
	{
		day: "Day 2",
		task: "SQLite schema + Alembic migrations + CompanyStore interface + SQLiteStore implementation",
		phase: "P0",
	},
	{
		day: "Day 3",
		task: "FastAPI skeleton + WebSocket event stream + all typed API endpoints (empty handlers)",
		phase: "P4",
	},
	{
		day: "Day 4",
		task: "BaseAgent: ADK extension, state machine, asyncio.Queue, heartbeat, observability hooks",
		phase: "P1",
	},
	{
		day: "Day 5",
		task: "BudgetGuard middleware decorator + context compiler + race condition guards",
		phase: "P1",
	},
	{
		day: "Day 6",
		task: "structlog config + OTel tracer setup + span helpers — wired into BaseAgent",
		phase: "P1",
	},
	{
		day: "Day 7",
		task: "CEO agent: AgentTools pattern, strategic plan, board report synthesis — first real LLM call",
		phase: "P2",
	},
	{
		day: "Day 8",
		task: "CTO agent: technical spec, AgentTools delegation to workers, code review logic",
		phase: "P2",
	},
	{
		day: "Day 9",
		task: "HR agent: WorkerPool, assign/release/scale, TTL watchdog, heartbeat monitor",
		phase: "P2",
	},
	{
		day: "Day 10",
		task: "CMO + CFO agents: research aggregation, budget advisory, anomaly detection",
		phase: "P2",
	},
	{
		day: "Day 11",
		task: "Tool registry: google_search, code_exec (sandbox), file_tools, memory_tools — all typed",
		phase: "P3",
	},
	{
		day: "Day 12",
		task: "Worker agents: Developer + Researcher + Analyst + DevOps — typed output contracts",
		phase: "P3",
	},
	{
		day: "Day 13",
		task: "USE ADK Dev UI — debug full board→CEO→CTO→Developer cycle, fix all issues",
		phase: "P3",
	},
	{
		day: "Day 14",
		task: "First full end-to-end run: board directive → all agents → BoardReport → back to board",
		phase: "P3",
	},
	{
		day: "Day 15",
		task: "Frontend: Onboarding + Dashboard layout + LiveFeed WebSocket stream",
		phase: "P4",
	},
	{
		day: "Day 16",
		task: "Frontend: OrgChart animated nodes + TaskTree + BudgetPanel (Recharts)",
		phase: "P4",
	},
	{
		day: "Day 17",
		task: "Frontend: BoardPanel directive input + BrainInspector + full dashboard integration",
		phase: "P4",
	},
	{
		day: "Day 18",
		task: "Failure handling: lock TTL watchdog, retry with backoff, dead letter → CEO escalation",
		phase: "P5",
	},
	{
		day: "Day 19",
		task: "Conflict resolution: optimistic concurrency, file manifest, context staleness handling",
		phase: "P5",
	},
	{
		day: "Day 20",
		task: "Test suite: unit (store, state machine, budget guard) + integration (full cycle)",
		phase: "P5",
	},
	{
		day: "Day 21",
		task: "Race condition tests (hypothesis) + resilience tests + demo polish + Redis migration stub",
		phase: "P5",
	},
];

const tierColors = {
	core: "#00FF94",
	model: "#7B61FF",
	infra: "#FF6B35",
	obs: "#00C8FF",
	frontend: "#FFD700",
	future: "#404060",
};

export default function Blueprint() {
	const [activeTab, setActiveTab] = useState("principles");
	const [activePhase, setActivePhase] = useState(null);

	return (
		<div
			style={{
				minHeight: "100vh",
				background: "#09090F",
				color: "#E0E0F0",
				fontFamily: "'IBM Plex Mono', monospace",
			}}
		>
			<style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .tab { padding: 8px 16px; background: transparent; border: 1px solid #1C1C2E; color: #484868; cursor: pointer; font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; transition: all 0.15s; }
        .tab.on { background: #181828; color: #C0C0E0; border-color: #363656; }
        .tab:hover:not(.on) { border-color: #2A2A44; color: #7070A0; }
        .phase-row { border: 1px solid #161626; border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
        .phase-hd { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; cursor: pointer; transition: background 0.15s; gap: 12px; flex-wrap: wrap; }
        .phase-hd:hover { background: rgba(255,255,255,0.015); }
        .task-card { border: 1px solid #141424; border-radius: 2px; margin-bottom: 8px; overflow: hidden; }
        .task-hd { padding: 10px 14px; background: #0D0D1A; font-size: 11px; font-weight: 600; color: #8888B0; display: flex; align-items: center; gap: 8px; }
        .task-body { background: #070710; }
        .tdi { display: flex; gap: 8px; align-items: flex-start; padding: 4px 14px 4px 28px; font-size: 10.5px; color: #484868; line-height: 1.65; border-bottom: 1px solid #0E0E1C; }
        .tdi:before { content: '→'; color: #202035; flex-shrink: 0; margin-top: 2px; }
        .badge { display: inline-block; padding: 2px 7px; border-radius: 2px; font-size: 9px; font-weight: 700; letter-spacing: 0.08em; }
        .stack-row { display: grid; grid-template-columns: 170px 200px 80px 1fr; padding: 9px 16px; border-bottom: 1px solid #111120; font-size: 10.5px; align-items: center; gap: 10px; }
        .principle-card { border: 1px solid #141424; border-radius: 3px; padding: 16px; background: #07070F; }
        pre { background: #050508; border: 1px solid #161626; border-radius: 3px; padding: 20px; font-size: 10px; line-height: 1.8; color: #405060; overflow-x: auto; white-space: pre; }
        pre::-webkit-scrollbar { height: 3px; } pre::-webkit-scrollbar-thumb { background: #1A2030; }
        .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media(max-width: 720px) { .g2 { grid-template-columns: 1fr; } .stack-row { grid-template-columns: 1fr 1fr; } }
        .label { font-size: 9px; letter-spacing: 0.18em; color: #282840; text-transform: uppercase; margin-bottom: 16px; }
      `}</style>

			{/* Header */}
			<div
				style={{
					borderBottom: "1px solid #161626",
					padding: "28px 36px 22px",
					background: "linear-gradient(180deg,#0C0C18 0%,#09090F 100%)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
						flexWrap: "wrap",
						gap: 16,
					}}
				>
					<div>
						<div
							style={{
								fontSize: 9,
								letterSpacing: "0.22em",
								color: "#252540",
								marginBottom: 10,
								textTransform: "uppercase",
							}}
						>
							Engineering Blueprint · v1.0 · March 2026
						</div>
						<h1
							style={{
								fontFamily: "'Space Grotesk', sans-serif",
								fontSize: "clamp(28px,5vw,46px)",
								fontWeight: 700,
								letterSpacing: "-0.025em",
								color: "#FFF",
								lineHeight: 1.05,
							}}
						>
							ZERO HUMAN
							<br />
							<span
								style={{
									color: "#00FF94",
									fontWeight: 300,
									textShadow: "0 0 40px #00FF9450",
								}}
							>
								COMPANY
							</span>
						</h1>
						<div
							style={{
								marginTop: 10,
								fontSize: 11,
								color: "#383858",
								maxWidth: 520,
								lineHeight: 1.7,
							}}
						>
							Fully autonomous AI company. Board sets direction. ADK agents
							execute. asyncio queues for scheduling. AgentTools for delegation.
							Pydantic everywhere. Engineering masterpiece.
						</div>
					</div>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 5,
							alignItems: "flex-end",
						}}
					>
						{[
							["Phases", "6"],
							["Agents", "9"],
							["Pro Model", "gemini-3.1-pro-preview"],
							["Flash Model", "gemini-3-flash-preview"],
							["Pro Agents", "CEO · CTO"],
							["Flash Agents", "CMO · HR · CFO · Workers"],
						].map(([l, v]) => (
							<div key={l} style={{ textAlign: "right" }}>
								<span
									style={{
										fontSize: 9,
										color: "#1E1E36",
										letterSpacing: "0.1em",
										textTransform: "uppercase",
										marginRight: 10,
									}}
								>
									{l}
								</span>
								<span
									style={{ fontSize: 10, color: "#606090", fontWeight: 600 }}
								>
									{v}
								</span>
							</div>
						))}
					</div>
				</div>
				<div
					style={{ display: "flex", marginTop: 22, flexWrap: "wrap", gap: 0 }}
				>
					{[
						"principles",
						"phases",
						"models",
						"tech stack",
						"file structure",
						"build order",
					].map((t) => (
						<button
							key={t}
							className={`tab ${activeTab === t ? "on" : ""}`}
							onClick={() => setActiveTab(t)}
						>
							{t}
						</button>
					))}
				</div>
			</div>

			<div style={{ padding: "28px 36px", maxWidth: 1100 }}>
				{/* PRINCIPLES */}
				{activeTab === "principles" && (
					<div>
						<div className="label">
							8 Architectural Principles — Every Decision Follows From These
						</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
								gap: 10,
								marginBottom: 32,
							}}
						>
							{principles.map((p) => (
								<div key={p.title} className="principle-card">
									<div
										style={{ fontSize: 18, color: "#1E1E38", marginBottom: 10 }}
									>
										{p.icon}
									</div>
									<div
										style={{
											fontSize: 12,
											fontWeight: 700,
											color: "#9090C0",
											marginBottom: 6,
											letterSpacing: "0.02em",
										}}
									>
										{p.title}
									</div>
									<div
										style={{
											fontSize: 10.5,
											color: "#404060",
											lineHeight: 1.7,
										}}
									>
										{p.desc}
									</div>
								</div>
							))}
						</div>

						<div className="label">Key Architecture Decisions — Explained</div>
						<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
							{[
								{
									q: "Why asyncio.Queue AND AgentTools — aren't these the same thing?",
									a: "No — they operate at different layers. asyncio.Queue drives WHEN an agent gets invoked: Board→CEO, HR→Worker assignments all go through queues — async, non-blocking, push-based, zero polling. AgentTools drives HOW an agent calls another WITHIN its own execution: CEO invokes CTO as a tool call synchronously inside its own async task, gets typed results back, reasons over them before synthesizing. Queue = outer scheduling loop. AgentTools = inner delegation mechanism. They are complementary.",
								},
								{
									q: "Why is CFO both an LLM agent AND backed by BudgetGuard middleware?",
									a: "Because they do fundamentally different things. BudgetGuard is a Python decorator on every ADK call — deterministic, zero latency, always fires. It enforces hard limits. CFO LLM agent handles the reasoning layer: anomaly detection ('Developer burned 60% budget on one call'), advisory recommendations to CEO, escalation drafting, board reporting. You need both: deterministic enforcement so limits are always respected, and LLM reasoning so the system can respond intelligently to budget situations.",
								},
								{
									q: "Why Pydantic for everything — isn't that over-engineering?",
									a: "In a system with 9 concurrent agents passing messages to each other, untyped dicts are a debugging nightmare. You cannot trace which agent produced a malformed payload. Pydantic models mean: every message is validated at the boundary, every output has a contract, every config value is documented and range-checked. This is what makes the codebase maintainable when you come back to it in 3 months.",
								},
								{
									q: "Why A2A-compatible envelopes without the A2A SDK?",
									a: "All agents live in one Python process in v1. The A2A SDK adds external dependencies, HTTP transport overhead, and service discovery complexity you don't need yet. But structuring messages to match the A2A envelope format now means when you do want cross-system agent collaboration, it's a transport swap — not a message redesign. Zero cost, maximum future optionality.",
								},
							].map((item, i) => (
								<div
									key={i}
									style={{
										border: "1px solid #141424",
										borderRadius: 3,
										overflow: "hidden",
									}}
								>
									<div
										style={{
											padding: "12px 16px",
											background: "#0C0C1A",
											fontSize: 11,
											color: "#7070A0",
											fontWeight: 600,
										}}
									>
										Q: {item.q}
									</div>
									<div
										style={{
											padding: "12px 16px 14px",
											background: "#07070F",
											fontSize: 10.5,
											color: "#484868",
											lineHeight: 1.75,
										}}
									>
										{item.a}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* PHASES */}
				{activeTab === "phases" && (
					<div>
						<div
							style={{
								display: "flex",
								gap: 4,
								marginBottom: 20,
								flexWrap: "wrap",
								alignItems: "center",
							}}
						>
							{phases.map((p) => (
								<div
									key={p.id}
									onClick={() =>
										setActivePhase(activePhase === p.id ? null : p.id)
									}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 5,
										padding: "5px 11px",
										border: `1px solid ${activePhase === p.id ? p.color : "#161626"}`,
										borderRadius: 2,
										cursor: "pointer",
										background:
											activePhase === p.id ? `${p.color}10` : "transparent",
										transition: "all 0.15s",
									}}
								>
									<div
										style={{
											width: 6,
											height: 6,
											borderRadius: "50%",
											background: p.color,
										}}
									/>
									<span
										style={{
											fontSize: 9,
											color: activePhase === p.id ? p.color : "#383858",
											fontWeight: 700,
											letterSpacing: "0.1em",
										}}
									>
										{p.id}
									</span>
								</div>
							))}
							<span
								style={{ fontSize: 9, color: "#1E1E36", marginLeft: "auto" }}
							>
								CLICK PHASE TO EXPAND
							</span>
						</div>

						{phases.map((phase) => (
							<div
								key={phase.id}
								className="phase-row"
								style={{
									borderColor:
										activePhase === phase.id ? `${phase.color}30` : "#161626",
								}}
							>
								<div
									className="phase-hd"
									style={{
										background:
											activePhase === phase.id ? "#0A0A14" : "transparent",
									}}
									onClick={() =>
										setActivePhase(activePhase === phase.id ? null : phase.id)
									}
								>
									<div
										style={{ display: "flex", alignItems: "center", gap: 14 }}
									>
										<span
											style={{
												fontFamily: "'Space Grotesk'",
												fontSize: 11,
												fontWeight: 700,
												color: phase.color,
												opacity: 0.6,
												letterSpacing: "0.1em",
												minWidth: 28,
											}}
										>
											{phase.id}
										</span>
										<div>
											<div
												style={{
													fontFamily: "'Space Grotesk'",
													fontSize: 14,
													fontWeight: 600,
													color: "#C8C8E8",
												}}
											>
												{phase.title}
											</div>
											<div
												style={{ fontSize: 10, color: "#383858", marginTop: 2 }}
											>
												{phase.subtitle}
											</div>
										</div>
									</div>
									<div
										style={{ display: "flex", gap: 6, alignItems: "center" }}
									>
										<span
											className="badge"
											style={{
												background: `${phase.color}15`,
												color: phase.color,
												border: `1px solid ${phase.color}30`,
											}}
										>
											{phase.duration}
										</span>
										<span
											className="badge"
											style={{ background: "#111120", color: "#2A2A44" }}
										>
											{phase.tasks.length} modules
										</span>
										<span
											style={{ fontSize: 10, color: "#202035", marginLeft: 4 }}
										>
											{activePhase === phase.id ? "▲" : "▼"}
										</span>
									</div>
								</div>
								{activePhase === phase.id && (
									<div
										style={{
											padding: "14px",
											background: "#06060C",
											borderTop: `1px solid ${phase.color}18`,
										}}
									>
										<div className="g2">
											{phase.tasks.map((task, ti) => (
												<div key={ti} className="task-card">
													<div className="task-hd">
														<div
															style={{
																width: 15,
																height: 15,
																borderRadius: "50%",
																background: `${phase.color}15`,
																border: `1px solid ${phase.color}35`,
																display: "flex",
																alignItems: "center",
																justifyContent: "center",
																fontSize: 8,
																color: phase.color,
																flexShrink: 0,
															}}
														>
															{ti + 1}
														</div>
														{task.title}
													</div>
													<div className="task-body">
														{task.details.map((d, di) => (
															<div key={di} className="tdi">
																{d}
															</div>
														))}
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				)}

				{/* MODELS */}
				{activeTab === "models" && (
					<div>
						<div className="label">Model Assignment Matrix</div>
						<div className="g2" style={{ marginBottom: 24 }}>
							{[
								{
									model: "gemini-3.1-pro-preview",
									agents: "CEO · CTO",
									color: "#00FF94",
									desc: "Latest Gemini 3.1 Pro — refined thinking, improved token efficiency, explicitly optimized for software engineering behavior and agentic workflows with precise tool use and reliable multi-step execution. Reserved for the two agents that need to reason deeply and orchestrate others.",
								},
								{
									model: "gemini-3-flash-preview",
									agents:
										"CMO · HR · CFO · Developer · Researcher · Analyst · DevOps",
									color: "#7B61FF",
									desc: "Gemini 3 Flash — frontier-class performance rivaling larger models at a fraction of the cost. Fast, strong at code gen, research synthesis, data analysis, and routing logic. The right choice for all 7 high-volume execution agents.",
								},
							].map((m) => (
								<div
									key={m.model}
									style={{
										border: `1px solid ${m.color}20`,
										borderRadius: 3,
										padding: "18px",
										background: "#07070F",
									}}
								>
									<div
										style={{
											fontSize: 9,
											color: `${m.color}60`,
											letterSpacing: "0.15em",
											textTransform: "uppercase",
											marginBottom: 8,
										}}
									>
										Model
									</div>
									<div
										style={{
											fontFamily: "'Space Grotesk'",
											fontSize: 15,
											fontWeight: 700,
											color: m.color,
											marginBottom: 6,
										}}
									>
										{m.model}
									</div>
									<div
										style={{
											fontSize: 11,
											color: "#6868A0",
											marginBottom: 10,
											fontWeight: 600,
										}}
									>
										{m.agents}
									</div>
									<div
										style={{
											fontSize: 10.5,
											color: "#383858",
											lineHeight: 1.75,
										}}
									>
										{m.desc}
									</div>
								</div>
							))}
						</div>

						<div
							style={{
								border: "1px solid #141424",
								borderRadius: 3,
								overflow: "hidden",
								marginBottom: 24,
							}}
						>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "100px 200px 70px 1fr",
									padding: "8px 16px",
									background: "#0C0C18",
									gap: 10,
								}}
							>
								{["Agent", "Model", "Tier", "Why"].map((h) => (
									<div
										key={h}
										style={{
											fontSize: 9,
											color: "#252540",
											letterSpacing: "0.15em",
											textTransform: "uppercase",
										}}
									>
										{h}
									</div>
								))}
							</div>
							{modelMatrix.map((r, i) => (
								<div
									key={r.agent}
									style={{
										display: "grid",
										gridTemplateColumns: "100px 200px 70px 1fr",
										padding: "9px 16px",
										background: i % 2 === 0 ? "#07070E" : "#09090F",
										borderBottom: "1px solid #0F0F1C",
										gap: 10,
										alignItems: "center",
									}}
								>
									<div
										style={{ fontSize: 11, color: "#6868A0", fontWeight: 600 }}
									>
										{r.agent}
									</div>
									<div>
										<span
											className="badge"
											style={{
												background: `${r.tier === "pro" ? "#00FF94" : "#7B61FF"}12`,
												color: r.tier === "pro" ? "#00FF94" : "#7B61FF",
												border: `1px solid ${r.tier === "pro" ? "#00FF94" : "#7B61FF"}25`,
											}}
										>
											{r.model}
										</span>
									</div>
									<div>
										<span
											className="badge"
											style={{
												background: "#111120",
												color: r.tier === "pro" ? "#00FF9460" : "#7B61FF60",
											}}
										>
											{r.tier.toUpperCase()}
										</span>
									</div>
									<div style={{ fontSize: 10, color: "#383858" }}>{r.why}</div>
								</div>
							))}
						</div>

						<div
							style={{
								border: "1px solid #141424",
								borderRadius: 3,
								padding: "16px 18px",
								background: "#07070F",
							}}
						>
							<div
								style={{
									fontSize: 9,
									color: "#252540",
									letterSpacing: "0.15em",
									textTransform: "uppercase",
									marginBottom: 10,
								}}
							>
								Deprecation Risk Mitigation
							</div>
							<div style={{ fontSize: 11, color: "#404060", lineHeight: 1.8 }}>
								Both preview models confirmed live March 2026. Preview models
								can be deprecated with ~2 weeks notice. All model strings live
								in{" "}
								<span style={{ color: "#7070A0" }}>
									agents/config.py MODELS dict
								</span>{" "}
								— single source of truth. When Google releases a new version:
								change two strings in one file, every agent in the system
								updates. Never hardcode model names inside agent classes.
							</div>
						</div>
					</div>
				)}

				{/* TECH STACK */}
				{activeTab === "tech stack" && (
					<div>
						<div className="label">Full Technology Stack</div>
						<div
							style={{
								display: "flex",
								gap: 6,
								marginBottom: 16,
								flexWrap: "wrap",
							}}
						>
							{Object.entries(tierColors).map(([tier, color]) => (
								<div
									key={tier}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 5,
										fontSize: 9,
										color: "#383858",
									}}
								>
									<div
										style={{
											width: 8,
											height: 8,
											borderRadius: 1,
											background: color,
											opacity: 0.6,
										}}
									/>
									{tier.toUpperCase()}
								</div>
							))}
						</div>
						<div
							style={{
								border: "1px solid #141424",
								borderRadius: 3,
								overflow: "hidden",
								marginBottom: 28,
							}}
						>
							<div className="stack-row" style={{ background: "#0C0C18" }}>
								{[
									"Layer",
									"Technology",
									"Tier",
									"Purpose / Decision Rationale",
								].map((h) => (
									<div
										key={h}
										style={{
											fontSize: 9,
											color: "#252540",
											letterSpacing: "0.12em",
											textTransform: "uppercase",
										}}
									>
										{h}
									</div>
								))}
							</div>
							{techStack.map((row, i) => (
								<div
									key={i}
									className="stack-row"
									style={{ background: i % 2 === 0 ? "#07070E" : "#09090F" }}
								>
									<div style={{ fontSize: 10, color: "#383858" }}>
										{row.layer}
									</div>
									<div>
										<span
											className="badge"
											style={{
												background: "#111120",
												color: "#6060A0",
												border: "1px solid #1C1C30",
											}}
										>
											{row.tech}
										</span>
									</div>
									<div>
										<span
											className="badge"
											style={{
												background: `${tierColors[row.tier]}12`,
												color: tierColors[row.tier],
												border: `1px solid ${tierColors[row.tier]}25`,
												opacity: 0.85,
											}}
										>
											{row.tier}
										</span>
									</div>
									<div style={{ fontSize: 10, color: "#383858" }}>
										{row.note}
									</div>
								</div>
							))}
						</div>

						<div className="label">Communication Architecture</div>
						<div
							style={{
								border: "1px solid #141424",
								borderRadius: 3,
								padding: "18px",
								background: "#07070F",
							}}
						>
							{[
								{
									from: "Board",
									to: "CEO",
									via: "HTTP POST /directive → CEO asyncio.Queue",
									color: "#00FF94",
								},
								{
									from: "CEO",
									to: "CTO / CMO",
									via: "AgentTools parallel call (within CEO execution, CEO stays in loop)",
									color: "#7B61FF",
								},
								{
									from: "C-Suite",
									to: "HR",
									via: "HireRequest Pydantic message → HR asyncio.Queue",
									color: "#FF6B35",
								},
								{
									from: "HR",
									to: "Worker Pool",
									via: "pool.assign(role, task) → idle worker asyncio.Queue",
									color: "#FFD700",
								},
								{
									from: "BudgetGuard",
									to: "All Agents",
									via: "@budget_guard decorator wraps every ADK call (enforcement)",
									color: "#FF9900",
								},
								{
									from: "CFO",
									to: "CEO",
									via: "BudgetAlert → CEO queue (advisory + anomaly reasoning)",
									color: "#FF9900",
								},
								{
									from: "Workers",
									to: "C-Suite",
									via: "Typed output (CodeOutput, ResearchReport...) → manager queue",
									color: "#00C8FF",
								},
								{
									from: "All Agents",
									to: "Dashboard",
									via: "publish_event(Event) → WebSocket fan-out + OTel trace_id",
									color: "#FF3CAC",
								},
							].map((f, i) => (
								<div
									key={i}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										padding: "7px 0",
										borderBottom: "1px solid #0D0D1C",
										flexWrap: "wrap",
									}}
								>
									<div
										style={{
											minWidth: 115,
											fontSize: 10.5,
											color: "#585880",
											fontWeight: 600,
										}}
									>
										{f.from}
									</div>
									<div style={{ fontSize: 11, color: "#1C1C30" }}>→</div>
									<div
										style={{
											minWidth: 100,
											fontSize: 10.5,
											color: "#585880",
											fontWeight: 600,
										}}
									>
										{f.to}
									</div>
									<div
										style={{
											fontSize: 10,
											color: f.color,
											opacity: 0.6,
											flex: 1,
										}}
									>
										{f.via}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* FILE STRUCTURE */}
				{activeTab === "file structure" && (
					<div>
						<div className="label">Project File Structure</div>
						<pre>{fileStructure}</pre>
					</div>
				)}

				{/* BUILD ORDER */}
				{activeTab === "build order" && (
					<div>
						<div className="label">Day-by-Day Build Order — 21 Days</div>
						<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
							{buildOrder.map((item, i) => {
								const color = COLORS[item.phase];
								return (
									<div
										key={i}
										style={{
											display: "flex",
											gap: 12,
											padding: "9px 14px",
											border: "1px solid #111120",
											borderRadius: 2,
											background: i % 2 === 0 ? "#07070E" : "#09090F",
											alignItems: "center",
											flexWrap: "wrap",
										}}
									>
										<div
											style={{
												fontSize: 9,
												color: "#252540",
												minWidth: 48,
												fontWeight: 700,
											}}
										>
											{item.day}
										</div>
										<div
											style={{
												flex: 1,
												fontSize: 10.5,
												color: "#505070",
												lineHeight: 1.5,
											}}
										>
											{item.task}
										</div>
										<span
											className="badge"
											style={{
												background: `${color}12`,
												color,
												border: `1px solid ${color}25`,
											}}
										>
											{item.phase}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>

			<div
				style={{
					borderTop: "1px solid #111120",
					padding: "14px 36px",
					display: "flex",
					justifyContent: "space-between",
					fontSize: 9,
					color: "#1C1C30",
					letterSpacing: "0.08em",
					flexWrap: "wrap",
					gap: 8,
				}}
			>
				<span>ZERO HUMAN COMPANY · BLUEPRINT v1.0</span>
				<span>
					ADK · ASYNCIO QUEUES · AGENTTOOLS · PYDANTIC · STRUCTLOG · OTEL ·
					SQLITE · GEMINI 3.1 PRO + 3 FLASH
				</span>
			</div>
		</div>
	);
}
