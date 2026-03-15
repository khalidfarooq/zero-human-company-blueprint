# Zero Human Company — Engineering Blueprint v1.0

> **For Gemini CLI/Claude Code:** This document is the single source of truth for all architectural decisions, patterns, conventions, and implementation details. Read this entire file before writing any code. Every decision here was made deliberately — do not deviate without a strong reason. When in doubt, refer back to this document.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [Repository Structure](#3-repository-structure)
4. [Technology Stack](#4-technology-stack)
5. [Shared Package](#5-shared-package)
6. [Database Layer](#6-database-layer)
7. [Agent Engine](#7-agent-engine)
8. [C-Suite Agents](#8-c-suite-agents)
9. [Worker Pool & Tools](#9-worker-pool--tools)
10. [API & Backend](#10-api--backend)
11. [Frontend Dashboard](#11-frontend-dashboard)
12. [Observability](#12-observability)
13. [Resilience & Error Handling](#13-resilience--error-handling)
14. [Testing Strategy](#14-testing-strategy)
15. [Build Order](#15-build-order)
16. [Models & Configuration](#16-models--configuration)
17. [Redis Migration Path](#17-redis-migration-path)
18. [Critical Rules — Never Violate](#18-critical-rules--never-violate)

---

## 1. Project Overview

Zero Human Company is a fully autonomous AI company simulation. The human acts as the **Board of Directors** — setting direction once, then watching the company execute autonomously. All work is done by AI agents organized in a corporate hierarchy.

```
BOARD (Human)
└── CEO  [gemini-3.1-pro-preview]
    ├── CTO  [gemini-3.1-pro-preview]
    │   ├── Developer  [gemini-3-flash-preview]
    │   ├── DevOps     [gemini-3-flash-preview]
    │   └── (more workers on demand)
    ├── CMO  [gemini-3-flash-preview]
    │   ├── Researcher  [gemini-3-flash-preview]
    │   └── Analyst     [gemini-3-flash-preview]
    ├── HR   [gemini-3-flash-preview]  ← manages worker pool
    └── CFO  [gemini-3-flash-preview]  ← advisory + anomaly detection
```

**What agents actually produce:**

- Real runnable code files
- Research reports with sources
- Technical specifications
- Market analysis
- Board-level synthesis reports

**The live feed IS the product.** Every agent action streams to the board dashboard in real time via WebSocket.

---

## 2. Architecture Principles

These 8 principles govern every decision. When you face an implementation choice, apply these first.

### P1 — Board is God

The board sets direction once via a directive. They never micromanage. They observe via the live feed. The only board→system interface is `POST /companies/{id}/directive`. Everything else is read-only from the board's perspective.

### P2 — asyncio.Queue Drives Scheduling

Every agent has exactly one `asyncio.Queue[Message]`. This is how agents receive work. **No database polling. No sleep loops. No 500ms timers.** When the board submits a directive, it gets enqueued to the CEO's queue directly. When HR assigns a worker, it enqueues to that worker's queue. Push only, never pull.

### P3 — AgentTools Drives Delegation

When CEO needs CTO to do work _within CEO's own execution_, CEO invokes CTO as an `AgentTool` — a synchronous call within the async task. CEO gets the typed result back, reasons over it, and synthesizes. This keeps CEO in the loop.

**These two patterns are NOT competing.** Queue = outer scheduling layer (WHEN invoked). AgentTools = inner delegation layer (HOW it delegates WITHIN its execution). They operate at different levels.

```
asyncio.Queue  →  wakes the agent, delivers the task envelope
AgentTools     →  CEO calls CTO.run_task(spec) and waits for TechnicalSpec
```

### P4 — SQLite is the Single Source of Truth

ADK manages its own internal session state. **Treat ADK session as an ephemeral execution cache only.** On every agent startup, hydrate state from SQLite. If ADK session and SQLite ever conflict, SQLite wins. Always. No exceptions.

### P5 — Pydantic Everywhere

Every message envelope, every agent output, every config value, every tool input/output, every API request/response body is a typed Pydantic v2 model. **No untyped dicts. No bare strings as message types. No magic numbers.** If it crosses a boundary, it has a type.

### P6 — Errors Are Architecture

The exception hierarchy is not an afterthought — it maps every failure mode to a specific recovery strategy. **No bare `except Exception` clauses. No string matching on error messages.** Catch specific typed exceptions and handle them deterministically.

### P7 — BudgetGuard is Middleware, CFO is Advisory

Hard budget enforcement is a `@budget_guard` Python decorator applied at the `BaseAgent` level. It wraps every ADK model call deterministically — no LLM reasoning, zero latency, always fires. The CFO LLM agent handles advisory work: anomaly detection, escalation drafting, board reporting. Both exist and do fundamentally different jobs.

### P8 — Observability is First-Class

`structlog` for structured JSON logs. OpenTelemetry spans per agent execution. Every agent action is traceable. `trace_id` propagated across agent boundaries via `thread_id`. **This is not optional — it is how you debug a 9-agent concurrent system.**

---

## 3. Repository Structure

```
zero-human-company/
├── shared/                          # Shared between backend + agents — NO external deps beyond pydantic
│   ├── __init__.py
│   ├── models.py                    # All core Pydantic models
│   ├── outputs.py                   # Typed agent output contracts
│   ├── exceptions.py                # Full typed exception hierarchy
│   └── config.py                    # CompanyConfig (pydantic-settings)
│
├── backend/
│   ├── main.py                      # FastAPI app, lifespan, router registration
│   ├── database/
│   │   ├── __init__.py
│   │   ├── schema.sql               # Canonical schema — Alembic generates from this
│   │   ├── store.py                 # CompanyStore abstract base (fully typed)
│   │   ├── sqlite_store.py          # SQLiteStore — WAL mode, atomic transactions
│   │   └── redis_store.py           # RedisStore stub — interface only in v1
│   └── api/
│       ├── __init__.py
│       ├── companies.py             # POST /companies, POST /companies/{id}/directive
│       ├── agents.py                # GET /companies/{id}/agents
│       ├── tasks.py                 # GET /companies/{id}/tasks
│       ├── budget.py                # GET/POST /companies/{id}/budget
│       ├── brain.py                 # GET /companies/{id}/brain
│       └── ws.py                    # WebSocket /ws/{company_id}
│
├── agents/
│   ├── __init__.py
│   ├── config.py                    # MODELS dict + AGENT_MODELS — single source of truth
│   ├── base_agent.py                # BaseAgent: ADK + state machine + queue + heartbeat
│   ├── context.py                   # Context compiler: per-role views, TTL, versioning
│   ├── pool.py                      # WorkerPool: assign, release, scale_up, watchdog
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── budget_guard.py          # @budget_guard decorator — deterministic enforcement
│   ├── observability.py             # structlog + OTel setup + span helpers
│   ├── csuite/
│   │   ├── __init__.py
│   │   ├── ceo.py
│   │   ├── cto.py
│   │   ├── cmo.py
│   │   ├── hr.py
│   │   └── cfo.py
│   ├── workers/
│   │   ├── __init__.py
│   │   ├── developer.py
│   │   ├── researcher.py
│   │   ├── analyst.py
│   │   └── devops.py
│   └── tools/
│       ├── __init__.py
│       ├── search.py                # google_search → list[SearchResult]
│       ├── code_exec.py             # code_exec → CodeExecResult (sandboxed)
│       ├── file_tools.py            # file_read / file_write → typed results
│       └── memory_tools.py          # memory_read / memory_write → versioned
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── store/
│       │   ├── company.ts           # Zustand: company state
│       │   ├── agents.ts            # Zustand: org chart, agent states
│       │   ├── events.ts            # Zustand: live feed events
│       │   └── budget.ts            # Zustand: budget ledger
│       ├── pages/
│       │   ├── Onboarding.tsx
│       │   └── Dashboard.tsx
│       └── components/
│           ├── LiveFeed.tsx
│           ├── OrgChart.tsx
│           ├── BoardPanel.tsx
│           ├── BudgetPanel.tsx
│           ├── TaskTree.tsx
│           └── BrainInspector.tsx
│
├── tests/
│   ├── conftest.py                  # Shared fixtures: in-memory SQLite, mock agents
│   ├── unit/
│   │   ├── test_store.py
│   │   ├── test_state_machine.py
│   │   ├── test_budget_guard.py
│   │   └── test_context.py
│   ├── integration/
│   │   └── test_full_cycle.py
│   └── race_conditions/
│       └── test_concurrent.py       # hypothesis property-based tests
│
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
├── pyproject.toml                   # uv managed — all Python deps + tool config
├── docker-compose.yml
├── .env.example
└── BLUEPRINT.md                     # This file
```

---

## 4. Technology Stack

### Python Stack

| Package                                 | Version | Purpose                                               |
| --------------------------------------- | ------- | ----------------------------------------------------- |
| `google-adk`                            | latest  | Agent framework — LlmAgent, AgentTools, tool registry |
| `pydantic`                              | v2      | Type system — all models, validation                  |
| `pydantic-settings`                     | v2      | CompanyConfig — typed env config                      |
| `fastapi`                               | latest  | Backend API + WebSocket                               |
| `uvicorn`                               | latest  | ASGI server                                           |
| `aiosqlite`                             | latest  | Async SQLite access                                   |
| `alembic`                               | latest  | Database migrations                                   |
| `structlog`                             | latest  | Structured JSON logging                               |
| `opentelemetry-sdk`                     | latest  | Distributed tracing                                   |
| `opentelemetry-instrumentation-fastapi` | latest  | Auto-instrument HTTP                                  |
| `pytest`                                | latest  | Test runner                                           |
| `pytest-asyncio`                        | latest  | Async test support                                    |
| `hypothesis`                            | latest  | Property-based testing for race conditions            |
| `uv`                                    | latest  | Dependency management (replaces pip)                  |

### Frontend Stack

| Package       | Version | Purpose                      |
| ------------- | ------- | ---------------------------- |
| `react`       | 18      | UI framework                 |
| `typescript`  | 5+      | Type safety                  |
| `zustand`     | latest  | Lightweight state management |
| `recharts`    | latest  | Budget/token usage charts    |
| `vite`        | latest  | Build tool                   |
| `tailwindcss` | latest  | Styling                      |

### Infrastructure

| Tool                   | Purpose                                                 |
| ---------------------- | ------------------------------------------------------- |
| SQLite (WAL mode)      | Canonical data store — v1                               |
| Redis + Docker         | Future: replace asyncio.Queue for cross-process scaling |
| ADK Dev UI (`adk web`) | Agent debugging during development — not for board UI   |

---

## 5. Shared Package

> **Rule:** `/shared` has zero external dependencies except `pydantic` and `pydantic-settings`. Both `backend` and `agents` import from it. Never import from `backend` or `agents` into `shared`.

### 5.1 `shared/models.py`

```python
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Any
import uuid

class AgentRole(str, Enum):
    CEO = "ceo"
    CTO = "cto"
    CMO = "cmo"
    HR = "hr"
    CFO = "cfo"
    DEVELOPER = "developer"
    RESEARCHER = "researcher"
    ANALYST = "analyst"
    DEVOPS = "devops"

class AgentState(str, Enum):
    IDLE = "idle"
    ACKNOWLEDGED = "acknowledged"
    WORKING = "working"
    BLOCKED = "blocked"
    REPORTING = "reporting"

class MessageType(str, Enum):
    TASK_ASSIGN = "task_assign"
    TASK_UPDATE = "task_update"
    TASK_COMPLETE = "task_complete"
    HIRE_REQUEST = "hire_request"
    BROADCAST = "broadcast"
    REPORT = "report"
    BUDGET_ALERT = "budget_alert"
    DEAD_LETTER = "dead_letter"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETE = "complete"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_role: AgentRole
    to_role: AgentRole
    type: MessageType
    priority: int = 5          # 1=highest, 10=lowest
    content: dict[str, Any]    # typed by MessageType — never raw strings
    thread_id: str             # groups related messages across agents
    sequence_number: int = 0   # ordering within thread
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    trace_id: str | None = None

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    creator: AgentRole
    assignee: AgentRole
    status: TaskStatus = TaskStatus.PENDING
    type: str
    payload: dict[str, Any]
    priority: int = 5
    thread_id: str
    dedup_fingerprint: str     # hash(type + assignee + goal + parent_task_id)
    retry_count: int = 0
    parent_task_id: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AgentRecord(BaseModel):
    id: str
    company_id: str
    role: AgentRole
    model: str
    state: AgentState = AgentState.IDLE
    current_task_id: str | None = None
    token_budget: int
    tokens_used: int = 0

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    agent_id: str
    role: AgentRole
    type: str
    payload: dict[str, Any]
    trace_id: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class HireRequest(BaseModel):
    role: AgentRole
    requesting_agent: AgentRole
    task_context: str
    priority: int = 5

class OrgChart(BaseModel):
    agents: list[AgentRecord]
    pool_utilization: dict[str, float]  # role → utilization 0.0–1.0
    updated_at: datetime
```

### 5.2 `shared/outputs.py`

All output models are **frozen** (`model_config = ConfigDict(frozen=True)`). Once produced, they are immutable.

```python
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class CodeFile(BaseModel):
    path: str
    content: str
    language: str

class TestResult(BaseModel):
    name: str
    passed: bool
    output: str

class CodeOutput(BaseModel):
    model_config = ConfigDict(frozen=True)
    language: str
    files: list[CodeFile]
    tests: list[TestResult]
    lint_score: float          # 0.0–10.0
    notes: str

class Source(BaseModel):
    url: str
    title: str
    summary: str
    confidence: float          # 0.0–1.0

class ResearchReport(BaseModel):
    model_config = ConfigDict(frozen=True)
    query: str
    sources: list[Source]
    synthesis: str
    confidence: float
    searched_at: datetime

class StackItem(BaseModel):
    name: str
    version: str | None
    rationale: str

class Risk(BaseModel):
    description: str
    severity: str              # low | medium | high | critical
    mitigation: str

class TechnicalSpec(BaseModel):
    model_config = ConfigDict(frozen=True)
    overview: str
    architecture: str
    stack: list[StackItem]
    risks: list[Risk]
    estimated_tokens: int

class Competitor(BaseModel):
    name: str
    description: str
    strengths: list[str]
    weaknesses: list[str]

class MarketReport(BaseModel):
    model_config = ConfigDict(frozen=True)
    query: str
    competitors: list[Competitor]
    market_size: str
    recommendations: list[str]
    confidence: float

class Finding(BaseModel):
    insight: str
    supporting_data: str
    confidence: float

class AnalysisReport(BaseModel):
    model_config = ConfigDict(frozen=True)
    data_summary: str
    findings: list[Finding]
    confidence: float

class Decision(BaseModel):
    description: str
    rationale: str
    made_by: str

class Blocker(BaseModel):
    description: str
    blocking_agent: str
    severity: str

class BoardReport(BaseModel):
    model_config = ConfigDict(frozen=True)
    summary: str
    decisions: list[Decision]
    blockers: list[Blocker]
    next_steps: list[str]
    budget_used: int
    budget_remaining: int

class BudgetReport(BaseModel):
    model_config = ConfigDict(frozen=True)
    total_budget: int
    total_used: int
    burn_rate_per_hour: float
    per_agent: dict[str, int]   # role → tokens used
    anomalies: list[str]
    projected_runway_hours: float
```

### 5.3 `shared/exceptions.py`

```python
class ZeroHumanError(Exception):
    """Base for all Zero Human Company errors."""
    def __init__(self, message: str, **context):
        super().__init__(message)
        self.context = context  # structured context for structlog

class AgentError(ZeroHumanError):
    """Base for agent-level failures."""
    pass

class TaskClaimError(AgentError):
    """Task already claimed by another agent.
    Recovery: discard — another agent is handling it."""
    pass

class InvalidStateTransitionError(AgentError):
    """Illegal agent state machine transition.
    Recovery: log, keep current state, emit error event."""
    pass

class ContextStalenessError(AgentError):
    """Compiled context exceeded TTL — must recompile before executing.
    Recovery: recompile context, then retry execution."""
    pass

class PoolExhaustedError(AgentError):
    """No idle worker of requested role, pool at max cap.
    Recovery: CEO notified — re-scope task or wait and retry."""
    pass

class ConcurrencyError(ZeroHumanError):
    """Optimistic concurrency violation on company brain write.
    Recovery: re-read latest version, merge changes, retry write."""
    pass

class BudgetExceededError(ZeroHumanError):
    """Agent exceeded token budget for this task.
    Recovery: agent BLOCKED, CEO notified, board can inject budget."""
    pass

class DuplicateTaskError(ZeroHumanError):
    """Task fingerprint already exists — dedup collision.
    Recovery: return existing task, do not create duplicate."""
    def __init__(self, message: str, existing_task_id: str, **context):
        super().__init__(message, **context)
        self.existing_task_id = existing_task_id

class DeadLetterError(ZeroHumanError):
    """Task has failed max retry attempts.
    Recovery: escalate to CEO for re-decomposition or board report."""
    pass
```

### 5.4 `shared/config.py`

```python
from pydantic_settings import BaseSettings
from pydantic import Field
from shared.models import AgentRole

class CompanyConfig(BaseSettings):
    # ── Models ────────────────────────────────────────────────────────────────
    # SINGLE SOURCE OF TRUTH — change these two strings when models are updated
    MODEL_PRO: str = "gemini-3.1-pro-preview"
    MODEL_FLASH: str = "gemini-3-flash-preview"

    @property
    def AGENT_MODELS(self) -> dict[AgentRole, str]:
        return {
            AgentRole.CEO:        self.MODEL_PRO,
            AgentRole.CTO:        self.MODEL_PRO,
            AgentRole.CMO:        self.MODEL_FLASH,
            AgentRole.HR:         self.MODEL_FLASH,
            AgentRole.CFO:        self.MODEL_FLASH,
            AgentRole.DEVELOPER:  self.MODEL_FLASH,
            AgentRole.RESEARCHER: self.MODEL_FLASH,
            AgentRole.ANALYST:    self.MODEL_FLASH,
            AgentRole.DEVOPS:     self.MODEL_FLASH,
        }

    # ── Pool ──────────────────────────────────────────────────────────────────
    POOL_SIZES: dict[str, int] = Field(default={
        "developer": 2, "researcher": 2, "analyst": 1, "devops": 1
    })
    POOL_MAX: dict[str, int] = Field(default={
        "developer": 5, "researcher": 4, "analyst": 3, "devops": 2
    })

    # ── Token Budgets (per agent per task) ────────────────────────────────────
    TOKEN_BUDGETS: dict[str, int] = Field(default={
        "ceo": 32000, "cto": 32000, "cmo": 16000,
        "hr": 8000, "cfo": 8000,
        "developer": 16000, "researcher": 12000, "analyst": 12000, "devops": 8000
    })

    # ── Context Compilation ───────────────────────────────────────────────────
    CONTEXT_TTL_SECONDS: int = 30
    CONTEXT_TOKEN_LIMITS: dict[str, int] = Field(default={
        "ceo": 8000, "csuite": 4000, "worker": 2000
    })

    # ── Timing & Retries ──────────────────────────────────────────────────────
    WORKER_IDLE_TTL_SECONDS: int = 300
    WORKER_HEARTBEAT_INTERVAL: int = 30
    WORKER_SILENCE_TIMEOUT: int = 60
    LOCK_TTL_SECONDS: int = 30
    TASK_RETRY_MAX: int = 3
    RETRY_BACKOFF: list[int] = Field(default=[2, 8, 32])
    WATCHDOG_INTERVAL: int = 30

    # ── Budget Guard ──────────────────────────────────────────────────────────
    BUDGET_ALERT_THRESHOLD: float = 0.8   # CFO alerted at 80% of budget used
    BUDGET_HARD_LIMIT: float = 1.0        # BudgetGuard blocks at 100%

    # ── Backend ───────────────────────────────────────────────────────────────
    BACKEND: str = "sqlite"               # "sqlite" | "redis" — feature flag
    DATABASE_URL: str = "sqlite+aiosqlite:///./zero_human.db"
    REDIS_URL: str = "redis://localhost:6379"

    # ── API Keys ──────────────────────────────────────────────────────────────
    GOOGLE_API_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

config = CompanyConfig()
```

---

## 6. Database Layer

### 6.1 Schema

Enable WAL mode on connection: `PRAGMA journal_mode=WAL;`

```sql
CREATE TABLE companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mission TEXT NOT NULL,
    vision TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    role TEXT NOT NULL,
    model TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'idle',
    current_task_id TEXT,
    token_budget INTEGER NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    creator_id TEXT NOT NULL,
    assignee_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    type TEXT NOT NULL,
    payload TEXT NOT NULL,              -- JSON
    priority INTEGER NOT NULL DEFAULT 5,
    thread_id TEXT NOT NULL,
    dedup_fingerprint TEXT UNIQUE,      -- UNIQUE enforces dedup at DB level
    retry_count INTEGER NOT NULL DEFAULT 0,
    parent_task_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    agent_id TEXT NOT NULL,
    role TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,              -- JSON
    trace_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_events_company_timestamp ON events(company_id, timestamp DESC);

CREATE TABLE locks (
    resource_id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE budget_ledger (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    tokens_in INTEGER NOT NULL,
    tokens_out INTEGER NOT NULL,
    cost_usd REAL NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agent_context (
    agent_id TEXT PRIMARY KEY,
    compiled_view TEXT NOT NULL,        -- JSON
    version INTEGER NOT NULL DEFAULT 1,
    compiled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE processed_msgs (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    msg_id TEXT NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, msg_id)
);

CREATE TABLE dead_letters (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    failure_reason TEXT NOT NULL,
    retry_count INTEGER NOT NULL,
    escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    from_role TEXT NOT NULL,
    to_role TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,              -- JSON
    thread_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL DEFAULT 0,
    trace_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_messages_thread ON messages(thread_id, sequence_number);
```

### 6.2 CompanyStore Interface

```python
# backend/database/store.py
from abc import ABC, abstractmethod
from shared.models import Task, Event, AgentRecord, Message
from shared.outputs import BoardReport, BudgetReport, OrgChart

class CompanyStore(ABC):

    @abstractmethod
    async def claim_task(self, task_id: str, agent_id: str) -> Task:
        """Atomically claim a pending task. Raises TaskClaimError if already claimed."""
        ...

    @abstractmethod
    async def create_task(self, task: Task) -> Task:
        """Create task or return existing if dedup_fingerprint collides.
        Raises DuplicateTaskError with existing_task_id if collision."""
        ...

    @abstractmethod
    async def publish_event(self, event: Event) -> None:
        """Persist event to DB AND fan out to all connected WebSocket clients."""
        ...

    @abstractmethod
    async def get_compiled_context(self, agent_id: str) -> dict:
        """Return compiled context view. Raises ContextStalenessError if expired."""
        ...

    @abstractmethod
    async def set_compiled_context(self, agent_id: str, view: dict, version: int) -> None:
        """Write compiled context with optimistic concurrency. Raises ConcurrencyError on version mismatch."""
        ...

    @abstractmethod
    async def update_budget(self, agent_id: str, task_id: str, tokens_in: int, tokens_out: int) -> None:
        """Record token usage. Raises BudgetExceededError if cumulative usage exceeds budget."""
        ...

    @abstractmethod
    async def get_agent(self, agent_id: str) -> AgentRecord:
        ...

    @abstractmethod
    async def update_agent_state(self, agent_id: str, state: str, current_task_id: str | None = None) -> None:
        ...

    @abstractmethod
    async def retry_task(self, task_id: str) -> Task:
        """Increment retry_count and reset status to pending. Raises DeadLetterError if at max."""
        ...

    @abstractmethod
    async def move_to_dead_letter(self, task_id: str, reason: str) -> None:
        ...

    @abstractmethod
    async def get_org_chart(self, company_id: str) -> OrgChart:
        ...

    @abstractmethod
    async def get_budget_report(self, company_id: str) -> BudgetReport:
        ...

    @abstractmethod
    async def is_message_processed(self, agent_id: str, msg_id: str) -> bool:
        ...

    @abstractmethod
    async def mark_message_processed(self, agent_id: str, msg_id: str) -> None:
        ...
```

---

## 7. Agent Engine

### 7.1 BaseAgent

```python
# agents/base_agent.py
import asyncio
from google.adk.agents import LlmAgent
from shared.models import AgentRole, AgentState, Message, MessageType
from shared.exceptions import InvalidStateTransitionError, ContextStalenessError
from agents.middleware.budget_guard import budget_guard
from agents.observability import get_tracer, get_logger

# Valid state transitions — any other transition raises InvalidStateTransitionError
STATE_TRANSITIONS: dict[AgentState, set[AgentState]] = {
    AgentState.IDLE:         {AgentState.ACKNOWLEDGED},
    AgentState.ACKNOWLEDGED: {AgentState.WORKING},
    AgentState.WORKING:      {AgentState.BLOCKED, AgentState.REPORTING},
    AgentState.BLOCKED:      {AgentState.WORKING},
    AgentState.REPORTING:    {AgentState.IDLE},
}

class BaseAgent(LlmAgent):
    def __init__(self, agent_id: str, role: AgentRole, model: str, store, config):
        super().__init__(model=model)
        self.agent_id = agent_id
        self.role = role
        self.store = store
        self.config = config
        self.queue: asyncio.Queue[Message] = asyncio.Queue()
        self._state = AgentState.IDLE
        self._task_queue: list[Message] = []   # pending tasks while WORKING
        self.logger = get_logger().bind(agent_id=agent_id, role=role.value)
        self.tracer = get_tracer()

    async def transition(self, new_state: AgentState) -> None:
        if new_state not in STATE_TRANSITIONS[self._state]:
            raise InvalidStateTransitionError(
                f"Invalid transition {self._state} → {new_state}",
                agent_id=self.agent_id,
                from_state=self._state.value,
                to_state=new_state.value,
            )
        self._state = new_state
        await self.store.update_agent_state(self.agent_id, new_state.value)
        await self.store.publish_event(self._make_event("STATE_CHANGE", {"state": new_state.value}))

    async def run(self) -> None:
        """Main agent loop — runs forever until cancelled."""
        asyncio.create_task(self._heartbeat_loop())
        while True:
            msg = await self.queue.get()
            await self._handle_message(msg)

    async def _handle_message(self, msg: Message) -> None:
        # Idempotency check
        if await self.store.is_message_processed(self.agent_id, msg.id):
            return
        await self.store.mark_message_processed(self.agent_id, msg.id)

        if msg.type == MessageType.TASK_ASSIGN:
            if self._state == AgentState.WORKING:
                # Acknowledge and queue — never interrupt
                pos = len(self._task_queue) + 1
                self._task_queue.append(msg)
                await self._acknowledge(msg, queue_position=pos)
            else:
                await self._execute_task(msg)

    @budget_guard
    async def _execute_task(self, msg: Message) -> None:
        with self.tracer.start_as_current_span(f"{self.role.value}.execute") as span:
            span.set_attribute("task_id", msg.content.get("task_id", ""))
            span.set_attribute("thread_id", msg.thread_id)
            try:
                task = await self.store.claim_task(msg.content["task_id"], self.agent_id)
                await self.transition(AgentState.ACKNOWLEDGED)
                context = await self._get_context()
                await self.transition(AgentState.WORKING)
                result = await self.execute(task, context)
                await self.transition(AgentState.REPORTING)
                await self._report(task, result)
                await self.transition(AgentState.IDLE)
                # Pick up next queued task if any
                if self._task_queue:
                    next_msg = self._task_queue.pop(0)
                    await self._execute_task(next_msg)
            except Exception as e:
                self.logger.error("task_failed", error=str(e), task_id=msg.content.get("task_id"))
                raise

    async def _get_context(self) -> dict:
        try:
            return await self.store.get_compiled_context(self.agent_id)
        except ContextStalenessError:
            fresh = await self._compile_context()
            await self.store.set_compiled_context(self.agent_id, fresh, version=1)
            return fresh

    async def _heartbeat_loop(self) -> None:
        while True:
            await asyncio.sleep(self.config.WORKER_HEARTBEAT_INTERVAL)
            if self._state == AgentState.WORKING:
                await self.store.publish_event(self._make_event("HEARTBEAT", {"state": "alive"}))

    async def execute(self, task, context: dict):
        """Override in each agent subclass."""
        raise NotImplementedError

    async def _compile_context(self) -> dict:
        """Override in each agent subclass for role-specific context."""
        raise NotImplementedError

    async def _acknowledge(self, msg: Message, queue_position: int) -> None:
        await self.store.publish_event(self._make_event(
            "TASK_ACKNOWLEDGED",
            {"task_id": msg.content.get("task_id"), "queue_position": queue_position}
        ))

    async def _report(self, task, result) -> None:
        await self.store.publish_event(self._make_event(
            "TASK_COMPLETE",
            {"task_id": task.id, "output": result.model_dump() if hasattr(result, 'model_dump') else result}
        ))
```

### 7.2 BudgetGuard Middleware

```python
# agents/middleware/budget_guard.py
import functools
from shared.exceptions import BudgetExceededError
from shared.config import config

def budget_guard(func):
    """Decorator applied to BaseAgent._execute_task.
    Checks budget BEFORE execution. Records usage AFTER.
    This is deterministic — no LLM reasoning involved."""
    @functools.wraps(func)
    async def wrapper(self, *args, **kwargs):
        agent = await self.store.get_agent(self.agent_id)
        budget = config.TOKEN_BUDGETS.get(self.role.value, 8000)

        # Hard limit check
        if agent.tokens_used >= budget * config.BUDGET_HARD_LIMIT:
            raise BudgetExceededError(
                f"Agent {self.agent_id} ({self.role.value}) has exhausted token budget",
                agent_id=self.agent_id,
                tokens_used=agent.tokens_used,
                budget=budget,
            )

        # Alert threshold — notify CFO (non-blocking)
        if agent.tokens_used >= budget * config.BUDGET_ALERT_THRESHOLD:
            await self.store.publish_event(self._make_event(
                "BUDGET_ALERT",
                {"tokens_used": agent.tokens_used, "budget": budget, "threshold": config.BUDGET_ALERT_THRESHOLD}
            ))

        result = await func(self, *args, **kwargs)

        # Record actual usage after execution
        # ADK provides token counts via session/response metadata
        # Extract from ADK response and call store.update_budget()
        return result
    return wrapper
```

### 7.3 Context Compiler

```python
# agents/context.py
# Context token limits by role tier
CONTEXT_LIMITS = {
    "ceo":    8000,
    "csuite": 4000,   # CTO, CMO, HR, CFO
    "worker": 2000,   # Developer, Researcher, Analyst, DevOps
}

ROLE_TIER = {
    AgentRole.CEO:        "ceo",
    AgentRole.CTO:        "csuite",
    AgentRole.CMO:        "csuite",
    AgentRole.HR:         "csuite",
    AgentRole.CFO:        "csuite",
    AgentRole.DEVELOPER:  "worker",
    AgentRole.RESEARCHER: "worker",
    AgentRole.ANALYST:    "worker",
    AgentRole.DEVOPS:     "worker",
}
```

**CEO context includes:** strategic plan summary + C-suite agent states + active thread IDs + budget overview

**C-suite context includes:** own task payload + assigned worker states + their last outputs + reporting chain

**Worker context includes:** single task payload + tools manifest + reporting_to agent + /workspace file list

---

## 8. C-Suite Agents

### 8.1 CEO — `gemini-3.1-pro-preview`

**Responsibilities:**

- Receives board directive → writes `StrategicPlan` to company brain
- Delegates via `AgentTools`: invokes CTO tool + CMO tool as parallel calls
- Gets typed results back (`TechnicalSpec`, `MarketReport`), reasons over them
- Synthesizes → produces `BoardReport` → emits to board via WebSocket
- Handles `DeadLetterError` escalations: re-decomposes or reports to board
- Handles `BudgetExceededError` from BudgetGuard: re-scopes or escalates to board
- Handles `PoolExhaustedError` from HR: re-scopes task or queues with delay

**AgentTools pattern for CEO:**

```python
# CEO delegates to CTO and CMO as tools — both called in parallel
# CEO STAYS IN THE LOOP — it gets results back and synthesizes them
# This is different from ADK sub-agent transfer (which would lose CEO)
cto_tool = AgentTool(agent=cto_agent)
cmo_tool = AgentTool(agent=cmo_agent)
# CEO's system prompt instructs it to call these tools with structured inputs
# and synthesize typed outputs into BoardReport
```

### 8.2 CTO — `gemini-3.1-pro-preview`

**Responsibilities:**

- Receives task from CEO → produces `TechnicalSpec`
- Calls Developer / DevOps as AgentTools (parallel where independent)
- Code review: validates `CodeOutput` (lint score ≥7.0, tests pass, spec compliance)
- Owns `/workspace` — maintains file manifest in company brain, arbitrates conflicts
- Reports `TechnicalStatus` to CEO
- Escalates: 3 consecutive worker failures on same task → directly notifies CEO

### 8.3 CMO — `gemini-3-flash-preview`

**Responsibilities:**

- Receives research/market task from CEO → produces `MarketReport`
- Calls Researcher + Analyst as AgentTools
- Has `google_search` tool registered in ADK tool registry
- Returns `MarketReport` with confidence scores per source

### 8.4 HR — `gemini-3-flash-preview`

**Responsibilities:**

- Listens for `HireRequest` messages
- Pool-first: always check for idle worker before growing pool
- Pool growth: only if under `POOL_MAX` — otherwise raise `PoolExhaustedError`
- Worker TTL watchdog: `asyncio` task checks idle workers every `WATCHDOG_INTERVAL` seconds
- Heartbeat monitor: worker silent > `WORKER_SILENCE_TIMEOUT` while `WORKING` → mark `FAILED`, re-queue task
- Maintains `OrgChart` in company brain on every pool change

### 8.5 CFO — `gemini-3-flash-preview` (Advisory only)

**Critical distinction:** CFO does NOT enforce budgets. `BudgetGuard` middleware does. CFO handles:

- Listens for `BUDGET_ALERT` events (emitted by BudgetGuard at 80% threshold)
- Anomaly detection: "Developer burned 60% of budget on one tool call" → flag + advise CEO
- Proactive recommendations: re-scope, reassign, reallocate
- Board reporting: produces `BudgetReport`
- Emergency escalation: company-wide budget critically low → drafts board escalation

---

## 9. Worker Pool & Tools

### 9.1 WorkerPool

```python
# agents/pool.py
class WorkerPool:
    """
    Pre-typed worker instances. HR routes to idle workers.
    Workers are NOT cold-spawned at runtime — they exist from company creation.
    ADK session per worker is ephemeral — rebuilt from task payload on assignment.
    """
    def __init__(self, config: CompanyConfig, store: CompanyStore):
        self._pool: dict[AgentRole, list[BaseAgent]] = {}
        # Initialized at company creation with POOL_SIZES instances per role

    async def assign(self, role: AgentRole, task: Task) -> BaseAgent:
        """Find idle worker of role and enqueue task. Raises PoolExhaustedError if none available."""
        ...

    async def release(self, worker_id: str) -> None:
        """Mark worker IDLE, start TTL countdown."""
        ...

    async def scale_up(self, role: AgentRole) -> BaseAgent:
        """Add new pre-typed instance if under POOL_MAX. Raises PoolExhaustedError if at cap."""
        ...

    async def status(self) -> dict[AgentRole, dict]:
        """Returns utilization per role."""
        ...
```

### 9.2 Tool Signatures

All tools are typed Pydantic function signatures — ADK function calling uses these types directly.

```python
# All tools wrapped in OTel child spans

async def google_search(query: str, max_results: int = 5) -> list[SearchResult]:
    """ADK built-in — returns typed SearchResult list."""

async def code_exec(language: str, code: str, timeout: int = 30) -> CodeExecResult:
    """Sandboxed subprocess execution. Returns stdout, stderr, exit_code."""

async def file_write(path: str, content: str) -> FileWriteResult:
    """Write to /workspace. Emits FILE_WRITE event. Requires file lock from CTO."""

async def file_read(path: str) -> FileReadResult:
    """Read from /workspace. Returns content + size."""

async def memory_read(key: str) -> MemoryValue:
    """Read from company brain (agent_context / company brain KV)."""

async def memory_write(key: str, value: Any, version: int) -> MemoryWriteResult:
    """Write to company brain with optimistic concurrency. Raises ConcurrencyError on stale version."""
```

### 9.3 Worker Types

| Worker     | Model                  | Tools                                         | Output Type    |
| ---------- | ---------------------- | --------------------------------------------- | -------------- |
| Developer  | gemini-3-flash-preview | code_exec, file_write, file_read, memory_read | CodeOutput     |
| Researcher | gemini-3-flash-preview | google_search, memory_write, memory_read      | ResearchReport |
| Analyst    | gemini-3-flash-preview | memory_read, file_read, code_exec             | AnalysisReport |
| DevOps     | gemini-3-flash-preview | file_write, file_read, code_exec              | InfraSpec      |

---

## 10. API & Backend

### 10.1 FastAPI Application

```python
# backend/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init DB, enable WAL, run migrations
    # Startup: init CompanyStore
    # Startup: start background watchdog tasks
    yield
    # Shutdown: graceful agent shutdown

app = FastAPI(title="Zero Human Company API", lifespan=lifespan)
```

### 10.2 Endpoints

All request/response bodies are typed Pydantic models — OpenAPI docs auto-generated at `/docs`.

```
POST   /companies                          → CompanyResponse
POST   /companies/{id}/directive           → DirectiveAck
GET    /companies/{id}/agents              → OrgChart
GET    /companies/{id}/tasks               → TaskTree
GET    /companies/{id}/budget              → BudgetReport
POST   /companies/{id}/budget              → BudgetInjectResponse
GET    /companies/{id}/brain               → BrainSnapshot
GET    /companies/{id}/brain/{key}         → MemoryValue
WS     /ws/{company_id}                    → Event stream (JSON)
```

### 10.3 WebSocket Event Stream

```python
# Every CompanyStore.publish_event() call fans out to all connected WS clients
# Events are persisted to DB first, then fan-out
# Client reconnect: replay last 50 events from events table

# Event structure matches shared.models.Event — typed Pydantic, serialized as JSON
# Frontend subscribes and dispatches to Zustand stores by event.type
```

### 10.4 CompanyStore Dependency Injection

```python
from fastapi import Depends

def get_store() -> CompanyStore:
    return app.state.store   # set during lifespan startup

@router.post("/companies/{id}/directive")
async def submit_directive(
    id: str,
    body: DirectiveRequest,
    store: CompanyStore = Depends(get_store)
):
    ...
```

---

## 11. Frontend Dashboard

### 11.1 Zustand Store Structure

```typescript
// store/events.ts — live feed
interface EventsStore {
	events: Event[];
	addEvent: (event: Event) => void;
	filterByRole: (role: string) => Event[];
	filterByThread: (threadId: string) => Event[];
}

// store/agents.ts — org chart
interface AgentsStore {
	orgChart: OrgChart | null;
	updateFromEvent: (event: Event) => void;
}

// store/budget.ts — budget panel
interface BudgetStore {
	report: BudgetReport | null;
	injectBudget: (amount: number) => Promise<void>;
}
```

### 11.2 WebSocket Connection

```typescript
// Single WebSocket connection per company, managed at App level
// On message: parse Event JSON → dispatch to relevant Zustand store
// On disconnect: reconnect with exponential backoff, request event replay
```

### 11.3 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  LIVE FEED (scrolling)  │  ORG CHART  │  BOARD PANEL        │
│                         │             │  - Directive input  │
│  [CEO] Strategic plan   │  CEO ●      │  - BoardReport      │
│  [CTO] Tech spec done   │  ├─ CTO ●   │  - Budget gauge     │
│  [HR] Developer hired   │  ├─ CMO ●   │                     │
│  [DEV] Code output      │  ├─ HR  ●   │  TASK TREE          │
│  ...                    │  └─ CFO ●   │  BUDGET PANEL       │
│                         │  Workers... │  BRAIN INSPECTOR    │
└─────────────────────────────────────────────────────────────┘
```

**Color coding by role:**

- CEO → `#FFD700` (gold)
- CTO → `#4A9EFF` (blue)
- CMO → `#00D4AA` (teal)
- HR → `#00FF94` (green)
- CFO → `#FF9900` (orange)
- Workers → `#9090B0` (gray)

**Org chart node states:**

- `IDLE` → dim, pulse animation
- `WORKING` → bright, spinner
- `BLOCKED` → amber, alert icon
- `REPORTING` → green flash

---

## 12. Observability

### 12.1 structlog Configuration

```python
# agents/observability.py
import structlog

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        # Dev: pretty print. Prod: JSON
        structlog.dev.ConsoleRenderer() if DEV else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

# Every log entry MUST include: agent_id, role, task_id, trace_id
# Bind these in BaseAgent.__init__ and pass as structlog context
```

### 12.2 OpenTelemetry Spans

```python
# One span per agent execution
with tracer.start_as_current_span(f"{role}.execute") as span:
    span.set_attribute("agent.id", agent_id)
    span.set_attribute("agent.role", role)
    span.set_attribute("agent.model", model)
    span.set_attribute("task.id", task_id)
    span.set_attribute("task.type", task_type)
    span.set_attribute("thread.id", thread_id)

    # Child spans for sub-operations:
    with tracer.start_as_current_span("context.compile"): ...
    with tracer.start_as_current_span("tool.google_search"): ...
    with tracer.start_as_current_span("tool.code_exec"): ...
    with tracer.start_as_current_span("state.transition"): ...
```

**Dev output:** formatted trace trees to stdout. No collector needed.  
**Prod:** OTLP exporter — plug in Jaeger, Honeycomb, or any OTel-compatible backend.

**trace_id on every Event:** Every `publish_event()` call attaches the current OTel `trace_id`. The board can correlate dashboard events to full traces.

---

## 13. Resilience & Error Handling

### 13.1 Failure Modes and Recovery

| Failure                    | Detection                               | Recovery                                                   |
| -------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| Agent crashes mid-task     | `locks.expires_at` TTL                  | Watchdog re-queues orphaned task every `WATCHDOG_INTERVAL` |
| Task fails (non-crash)     | Exception in `execute()`                | Retry with backoff: 2s, 8s, 32s                            |
| Max retries exceeded       | `retry_count >= TASK_RETRY_MAX`         | `DeadLetterError` → CEO escalation                         |
| Worker silent too long     | No heartbeat > `WORKER_SILENCE_TIMEOUT` | HR marks FAILED, re-queues task                            |
| Budget exceeded            | BudgetGuard fires                       | Agent BLOCKED, CEO notified, board can inject              |
| Pool exhausted             | `PoolExhaustedError`                    | CEO notified, re-scope or wait + retry                     |
| Stale context              | `ContextStalenessError`                 | Recompile before execution                                 |
| Concurrent write collision | `ConcurrencyError`                      | Re-read, merge, retry (max 3×)                             |
| Duplicate task             | `DuplicateTaskError`                    | Return existing task, discard new request                  |

### 13.2 CEO Dead Letter Handling

When CEO receives a `DeadLetterError`:

1. Read the original task payload
2. Attempt re-decomposition: break into smaller sub-tasks
3. Assign to different worker type if role-specific failure
4. If re-decomposition also fails: add to `BoardReport.blockers` and notify board

### 13.3 SQLite WAL Mode

Enable on every connection:

```python
async with aiosqlite.connect(DATABASE_URL) as db:
    await db.execute("PRAGMA journal_mode=WAL;")
    await db.execute("PRAGMA synchronous=NORMAL;")
```

WAL mode: concurrent reads never block writes. Essential for multi-agent access patterns.

---

## 14. Testing Strategy

### 14.1 Unit Tests

```python
# tests/unit/test_store.py
# - claim_task: verify atomic claim, verify TaskClaimError on double-claim
# - create_task: verify dedup fingerprint, verify DuplicateTaskError returns existing
# - update_budget: verify BudgetExceededError at hard limit, verify alert at threshold

# tests/unit/test_state_machine.py
# - All valid transitions succeed
# - All invalid transitions raise InvalidStateTransitionError
# - Verify state persisted to SQLite on transition

# tests/unit/test_budget_guard.py
# - Blocks at BUDGET_HARD_LIMIT
# - Emits BUDGET_ALERT event at BUDGET_ALERT_THRESHOLD
# - Does NOT block below threshold

# tests/unit/test_context.py
# - Raises ContextStalenessError when compiled_at > CONTEXT_TTL_SECONDS
# - ConcurrencyError on stale version write
# - Token limit enforced at compile time
```

### 14.2 Integration Tests

```python
# tests/integration/test_full_cycle.py
# Full board→CEO→CTO→Developer→BoardReport cycle
# Uses real ADK agents with real model calls
# Verifies: BoardReport produced, all events emitted, budget recorded
```

### 14.3 Race Condition Tests

```python
# tests/race_conditions/test_concurrent.py
from hypothesis import given, strategies as st

@given(st.integers(min_value=2, max_value=20))
async def test_only_one_winner_claims_task(n_concurrent: int):
    """n agents simultaneously claim same task — exactly one wins."""
    ...

@given(st.integers(min_value=2, max_value=5))
async def test_hire_request_no_duplicate_assignment(n_requests: int):
    """n concurrent hire requests for same role — no worker double-assigned."""
    ...
```

### 14.4 Running Tests

```bash
# All tests
uv run pytest

# Unit only (fast, no model calls)
uv run pytest tests/unit/

# With coverage
uv run pytest --cov=agents --cov=backend --cov-report=html

# Race conditions (hypothesis — runs many examples)
uv run pytest tests/race_conditions/ --hypothesis-seed=0
```

---

## 15. Build Order

Build in this exact order. Do not build P4 frontend before P1–P3 agents are working.

| Day | Work                                                                                 | Phase |
| --- | ------------------------------------------------------------------------------------ | ----- |
| 1   | `/shared`: Pydantic models, exception hierarchy, CompanyConfig                       | P0    |
| 2   | SQLite schema + Alembic migrations + CompanyStore interface + SQLiteStore            | P0    |
| 3   | FastAPI skeleton + WebSocket event stream + all typed API endpoints (empty handlers) | P4    |
| 4   | BaseAgent: ADK extension, state machine, asyncio.Queue, heartbeat                    | P1    |
| 5   | BudgetGuard middleware + context compiler + race condition guards                    | P1    |
| 6   | structlog config + OTel tracer + span helpers — wired into BaseAgent                 | P1    |
| 7   | CEO agent: AgentTools pattern, strategic plan, board report synthesis                | P2    |
| 8   | CTO agent: technical spec, AgentTools delegation, code review                        | P2    |
| 9   | HR agent: WorkerPool, assign/release/scale, TTL watchdog, heartbeat monitor          | P2    |
| 10  | CMO + CFO agents: research aggregation, budget advisory, anomaly detection           | P2    |
| 11  | Tool registry: google_search, code_exec (sandbox), file_tools, memory_tools          | P3    |
| 12  | Worker agents: Developer + Researcher + Analyst + DevOps — typed outputs             | P3    |
| 13  | **USE ADK Dev UI (`adk web`)** — debug full CEO→CTO→Developer cycle, fix all issues  | P3    |
| 14  | First full end-to-end run: board directive → all agents → BoardReport → board        | P3    |
| 15  | Frontend: Onboarding + Dashboard layout + LiveFeed WebSocket                         | P4    |
| 16  | Frontend: OrgChart animated nodes + TaskTree + BudgetPanel (Recharts)                | P4    |
| 17  | Frontend: BoardPanel + BrainInspector + full dashboard integration                   | P4    |
| 18  | Failure handling: lock TTL watchdog, retry backoff, dead letter escalation           | P5    |
| 19  | Conflict resolution: optimistic concurrency, file manifest, context staleness        | P5    |
| 20  | Test suite: unit (store, state machine, budget guard) + integration                  | P5    |
| 21  | Race condition tests (hypothesis) + resilience tests + Redis migration stub          | P5    |

> **Day 13 is mandatory:** Do not start frontend work until you have used ADK Dev UI to verify the agent graph is correct and the full CEO→CTO→Developer→report chain works. This will surface ADK-specific issues that are much harder to debug once the frontend is in the way.

---

## 16. Models & Configuration

### 16.1 Model Assignment

| Agent      | Model                    | Rationale                                                              |
| ---------- | ------------------------ | ---------------------------------------------------------------------- |
| CEO        | `gemini-3.1-pro-preview` | Deep strategic reasoning, parallel AgentTools orchestration, synthesis |
| CTO        | `gemini-3.1-pro-preview` | Architecture decisions, code review — software engineering optimized   |
| CMO        | `gemini-3-flash-preview` | Research synthesis — frontier speed, high throughput                   |
| HR         | `gemini-3-flash-preview` | Pool routing — simple decisions, high call frequency                   |
| CFO        | `gemini-3-flash-preview` | Budget advisory — no deep reasoning needed                             |
| Developer  | `gemini-3-flash-preview` | Code gen — Flash is strong for coding at volume                        |
| Researcher | `gemini-3-flash-preview` | Web search + summarize — speed over depth                              |
| Analyst    | `gemini-3-flash-preview` | Data processing, structured reports — volume task                      |
| DevOps     | `gemini-3-flash-preview` | Infra specs, config — deterministic output                             |

### 16.2 Deprecation Mitigation

Both preview models confirmed live March 2026. Preview models can be deprecated with ~2 weeks notice.

**Protection:** All model strings live in `shared/config.py` `CompanyConfig.MODEL_PRO` and `CompanyConfig.MODEL_FLASH`. Change two strings → every agent in the system updates. **Never hardcode model name strings inside agent class files.**

---

## 17. Redis Migration Path

When you need cross-process agents or horizontal scaling:

1. Implement `RedisStore(CompanyStore)` — same interface, different backend:
   - Locks → `SET NX EX` (atomic, TTL-based)
   - Events → Pub/Sub (fan-out to WebSocket clients)
   - Messages → Redis Streams (ordered, persistent, consumer groups)

2. Replace `asyncio.Queue` per agent with Redis Stream consumer — agents can now run in separate processes

3. A2A-compatible Pydantic message envelopes already transport-agnostic — drop into Redis Streams unchanged

4. Feature-flag via `CompanyConfig.BACKEND = "redis"` — `SQLiteStore` stays as fallback

5. `docker-compose.yml` adds Redis service — `backend + agents + frontend + redis` in one `docker-compose up`

**Zero agent code changes required.** The `CompanyStore` interface abstraction makes this a configuration change.

---

## 18. Critical Rules — Never Violate

These are non-negotiable. They exist because violating them has been reasoned through and found to be wrong.

1. **Never poll a database from an agent.** Use `asyncio.Queue`. If you find yourself writing `await asyncio.sleep(0.5)` in an agent loop, you have made a mistake.

2. **Never use ADK sub-agent transfer for CEO→CTO delegation.** Use `AgentTool`. Sub-agent transfer removes CEO from the loop. CEO must get results back to synthesize a `BoardReport`.

3. **Never put budget enforcement logic inside the CFO LLM agent.** `BudgetGuard` is the enforcer. CFO is advisory. An LLM deciding whether to enforce a hard limit is non-deterministic and dangerous.

4. **Never treat ADK session as the source of truth.** SQLite is truth. Always hydrate from SQLite on agent startup. ADK session is ephemeral.

5. **Never use untyped dicts for messages between agents.** Every message is a `Message` Pydantic model. Every output is a typed output model from `shared/outputs.py`.

6. **Never hardcode model name strings inside agent class files.** All model strings come from `CompanyConfig.AGENT_MODELS[role]`.

7. **Never write `except Exception` without re-raising or logging with full structured context.** Silent failures in a multi-agent system are catastrophic to debug.

8. **Never skip the idempotency check in `_handle_message`.** The event bus can deliver messages more than once. Always check `processed_msgs` before execution.

9. **Never start building the frontend before Day 13's ADK Dev UI debugging session.** The frontend will mask agent-layer bugs that are cheap to fix in isolation and expensive to fix through the UI.

10. **Never write directly to `/workspace` without requesting a file lock through CTO.** File conflicts are real and silent overwrites destroy work.

---

_Blueprint v1.0 — Zero Human Company_
_Last updated: March 2026_
_This document supersedes all previous versions._
