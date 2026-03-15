# Zero Human Company — Frontend Blueprint

> **For Gemini CLI/Claude Code:** This document governs every frontend decision. Read it completely before writing a single line of UI code. The design direction, component behavior, animation specs, color system, typography, and interaction model are all defined here. Do not substitute generic component libraries or default styling. Every screen must feel intentional, crafted, and alive.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Aesthetic Direction](#2-aesthetic-direction)
3. [Design System](#3-design-system)
4. [Page 1 — Incorporation](#4-page-1--incorporation)
5. [Incorporation Loader](#5-incorporation-loader)
6. [Page 2 — The Dashboard](#6-page-2--the-dashboard)
7. [Component Specs](#7-component-specs)
8. [Animation System](#8-animation-system)
9. [WebSocket & State](#9-websocket--state)
10. [Tech Stack](#10-tech-stack)
11. [File Structure](#11-file-structure)
12. [Critical Rules — Never Violate](#12-critical-rules--never-violate)

---

## 1. Design Philosophy

### The User Is a God Looking Down

The board of directors does not operate the company. They **observe** it. They issue one directive and watch an entire organization come to life. The UI must communicate this power dynamic at every moment.

- The incorporation page feels like **signing articles of incorporation** — weighty, deliberate, significant
- The loader feels like **a company being born** — not a generic spinner, a ceremony
- The dashboard feels like a **mission control center** — every screen pixel is information, every animation is meaningful

### The Live Feed Is the Product

Everything the system does — every agent decision, every message, every hire, every piece of code written — surfaces in real time. The user should feel like they can see inside the company's mind. **The wow moment is not the UI itself — it is watching the agents work.**

### Restraint Over Decoration

Every animation has a functional reason. Every visual element communicates state. Nothing is decorative. Nothing is generic. No:

- Purple gradients on white backgrounds
- Floating cards with drop shadows
- Generic sans-serif type at default sizes
- Loading spinners that could belong to any app

---

## 2. Aesthetic Direction

### The Vibe: **Dark Operations Center**

Think Bloomberg Terminal meets Minority Report command center. Dark, data-dense, purposeful. Colors communicate meaning. Type is monospaced for data, grotesque for headers. The feeling is that you are looking at something real — a company running — not a mockup.

### Not This

- Generic dark mode with blue accents (every SaaS app)
- Card-based layouts with rounded corners and shadows
- Colorful gradients and glassmorphism
- Playful or rounded typography

### Exactly This

- Near-black backgrounds with subtle grid or noise texture
- Monochrome base with high-contrast color accents for signal (not decoration)
- Sharp edges, 2px borders, tight spacing
- Monospace body text (data, logs, code)
- Geometric grotesque display text (headers only)
- Color = meaning: each agent role has exactly one color, used consistently everywhere
- Animations are fast (150–300ms), purposeful, never looping without reason

---

## 3. Design System

### 3.1 Color Palette

```css
/* Background layers */
--bg-base: #07070d; /* page background */
--bg-surface: #0c0c16; /* panels, cards */
--bg-raised: #111120; /* input fields, code blocks */
--bg-overlay: #181828; /* tooltips, modals */

/* Borders */
--border-dim: #1a1a2e; /* subtle dividers */
--border-mid: #252540; /* panel borders */
--border-bright: #363660; /* active/focus borders */

/* Text */
--text-primary: #e8e8f8; /* main content */
--text-secondary: #8080a8; /* labels, metadata */
--text-dim: #404060; /* placeholders, disabled */
--text-code: #60809f; /* monospace data */

/* Agent Role Colors — these are the ONLY colors in the system */
--color-ceo: #ffd700; /* gold */
--color-cto: #4a9eff; /* blue */
--color-cmo: #00d4aa; /* teal */
--color-hr: #00ff94; /* green */
--color-cfo: #ff9900; /* amber */
--color-worker: #9090c0; /* slate */
--color-board: #ffffff; /* white — the board/user */

/* System signal colors */
--color-success: #00ff94;
--color-warning: #ff9900;
--color-error: #ff4444;
--color-info: #4a9eff;

/* Neutrals */
--color-white: #ffffff;
--color-dim: #252540;
```

### 3.2 Typography

```css
/* Display font — headers only */
@import: 'Space Grotesk' weights 400, 600, 700

/* Body + data font — everything else */
@import: 'IBM Plex Mono' weights 300, 400, 500, 600

/* Scale */
--text-xs:   10px / 1.4   /* badges, metadata */
--text-sm:   11px / 1.6   /* body text, labels */
--text-base: 13px / 1.6   /* main content */
--text-md:   15px / 1.4   /* subheadings */
--text-lg:   20px / 1.2   /* section headers */
--text-xl:   28px / 1.1   /* page titles */
--text-2xl:  40px / 1.0   /* display */
--text-3xl:  56px / 0.95; /* hero */

/* Rules */
/* - IBM Plex Mono for: event feed text, agent states, metrics, code, timestamps */
/* - Space Grotesk for: company name, page titles, section headers, agent names */
/* - NEVER mix fonts within a single UI element */
/* - NEVER use system fonts or Inter */
```

### 3.3 Spacing

```
Base unit: 4px
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
Never use arbitrary values. Always multiples of 4.
```

### 3.4 Agent Role → Color Mapping

This mapping is used **consistently everywhere**: event feed rows, org chart nodes, badges, message threads, budget bars.

```typescript
export const ROLE_COLORS: Record<string, string> = {
	ceo: "#FFD700",
	cto: "#4A9EFF",
	cmo: "#00D4AA",
	hr: "#00FF94",
	cfo: "#FF9900",
	developer: "#9090C0",
	researcher: "#9090C0",
	analyst: "#9090C0",
	devops: "#9090C0",
	board: "#FFFFFF",
};

export const ROLE_LABELS: Record<string, string> = {
	ceo: "CEO",
	cto: "CTO",
	cmo: "CMO",
	hr: "HR",
	cfo: "CFO",
	developer: "DEV",
	researcher: "RES",
	analyst: "ANL",
	devops: "OPS",
	board: "BOARD",
};
```

### 3.5 Event Type Icons

```typescript
export const EVENT_ICONS: Record<string, string> = {
	STATE_CHANGE: "◉",
	TASK_ASSIGN: "→",
	TASK_ACKNOWLEDGED: "✓",
	TASK_COMPLETE: "✦",
	HIRE_REQUEST: "+",
	AGENT_HIRED: "◈",
	AGENT_RELEASED: "◇",
	BROADCAST: "◎",
	BUDGET_ALERT: "⚠",
	HEARTBEAT: "·",
	DEAD_LETTER: "✕",
	REPORT: "▣",
	THINKING: "…",
};
```

---

## 4. Page 1 — Incorporation

### 4.1 Intent

This is the first screen the user sees. It must communicate: **you are about to create something real.** The feeling is closer to signing a legal document than filling out a web form. Minimal, weighty, precise.

### 4.2 Layout

Full-screen dark canvas. Content centered both vertically and horizontally. Single column. No sidebars, no navigation, no header.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│                    ZERO HUMAN COMPANY                           │
│                    ──────────────────                           │
│              Incorporate your autonomous company                │
│                                                                 │
│                                                                 │
│    COMPANY NAME                                                 │
│    ┌────────────────────────────────────────────────┐           │
│    │ Acme Corp                                      │           │
│    └────────────────────────────────────────────────┘           │
│                                                                 │
│    MISSION  (what you do)                                       │
│    ┌────────────────────────────────────────────────┐           │
│    │ Build the world's best...                      │           │
│    └────────────────────────────────────────────────┘           │
│                                                                 │
│    VISION  (where you're going)                                 │
│    ┌────────────────────────────────────────────────┐           │
│    │ A world where...                               │           │
│    └────────────────────────────────────────────────┘           │
│                                                                 │
│    FIRST DIRECTIVE  (initial task for the CEO)                  │
│    ┌────────────────────────────────────────────────┐           │
│    │ Research our top 3 competitors and build a     │           │
│    │ landing page for our product                   │           │
│    └────────────────────────────────────────────────┘           │
│                                                                 │
│                 [ INCORPORATE ]                                 │
│                                                                 │
│                                                                 │
│    9 agents  ·  2 models  ·  fully autonomous                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Background

Subtle animated grid — very faint `#1A1A2E` lines on `#07070D`, 40px grid cells. The grid is static (no movement) except for a very slow radial gradient pulse centered on the form — expands from 600px to 800px radius over 8 seconds, opacity 0.03 to 0.06 to 0.03. Nearly invisible but gives the page a breathing quality.

```css
/* Grid via SVG background */
background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%231A1A2E' stroke-width='0.5'/%3E%3C/svg%3E");
```

### 4.4 Header Treatment

```
ZERO HUMAN COMPANY
```

- Font: Space Grotesk, 13px, weight 400, letter-spacing 0.25em, color `#252540`
- ALL CAPS
- Below it: `──────────────────` (actual em-dashes, 18 of them), color `#1A1A2E`
- Below that: subtitle in IBM Plex Mono 11px, color `#383858`

This is NOT a logo. It is a system identifier — small, precise, like a terminal header.

### 4.5 Form Fields

```css
/* Field label */
font: IBM Plex Mono, 9px, weight 600, letter-spacing 0.2em, color #404060, uppercase

/* Input */
background: #0C0C16
border: 1px solid #1A1A2E
border-radius: 2px                /* sharp, not rounded */
padding: 12px 16px
font: IBM Plex Mono, 13px, color #C0C0E0
caret-color: #FFD700               /* gold cursor */
transition: border-color 150ms

/* Input focus */
border-color: #252540
outline: none
box-shadow: 0 0 0 1px #252540     /* subtle double border on focus */

/* Textarea (Mission, Vision, Directive) */
min-height: 80px
resize: vertical
```

**Field order:**

1. Company Name — `<input>` single line
2. Mission — `<textarea>` 2 rows — placeholder: _"What problem does your company solve?"_
3. Vision — `<textarea>` 2 rows — placeholder: _"What does success look like in 10 years?"_
4. First Directive — `<textarea>` 3 rows — placeholder: _"The first task you're giving your CEO. Be specific."_

**Validation:**

- All fields required
- Show inline error in IBM Plex Mono 10px color `#FF4444` below the field
- Error appears on blur, not on keystroke
- No red borders — only the text error message

### 4.6 INCORPORATE Button

```css
/* Default state */
display: block
width: 100%
max-width: 480px
margin: 32px auto 0
padding: 16px
background: transparent
border: 1px solid #252540
font: IBM Plex Mono, 11px, weight 600, letter-spacing 0.25em, color #606080
text-transform: uppercase
cursor: pointer
transition: all 200ms

/* Hover state */
border-color: #FFD700
color: #FFD700
box-shadow: 0 0 20px #FFD70015    /* very subtle gold glow */

/* Active/press state */
transform: scale(0.99)

/* Disabled state (if validation fails) */
opacity: 0.3
cursor: not-allowed
```

### 4.7 Footer Line

Below the button:

```
9 agents  ·  2 models  ·  fully autonomous
```

IBM Plex Mono, 10px, color `#252540`, centered. This is a quiet reminder of what's about to happen.

### 4.8 Entry Animation

When the page first loads:

1. Grid background appears instantly
2. After 100ms: header fades up from 8px below (opacity 0→1, translateY 8px→0, 400ms ease-out)
3. After 200ms: each form field fades up staggered (every 80ms, same animation, 300ms)
4. After 600ms: button fades in (300ms)
5. After 700ms: footer line fades in (300ms)

Use CSS `animation-fill-mode: both` so nothing is visible before its animation starts.

---

## 5. Incorporation Loader

### 5.1 Intent

This is not a generic loading screen. This is a **company being born**. The user has just submitted their company details. The backend is:

1. Creating the company record
2. Initializing the agent pool (9 agents)
3. Starting the agent run loops
4. CEO receiving the first directive

Every one of these steps should be visible and feel significant.

### 5.2 Full-Screen Takeover

The incorporation form dissolves (opacity 1→0 over 400ms). The loader takes over the full screen with the same dark grid background.

### 5.3 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              INCORPORATING  ACME CORP                           │
│                                                                 │
│         ████████████████████████░░░░░░░░░░  67%                 │
│                                                                 │
│  ✦  Company record created                                      │
│  ✦  C-Suite initialized                                         │
│  →  Briefing CEO...                                             │
│  ·  Assembling worker pool                                      │
│  ·  Opening boardroom                                           │
│                                                                 │
│                                                                 │
│         ZERO HUMAN COMPANY                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Company Name Display

```
INCORPORATING  ACME CORP
```

- "INCORPORATING" in IBM Plex Mono 11px, weight 400, color `#404060`, letter-spacing 0.2em
- Space, then the actual company name in Space Grotesk 20px, weight 600, color `#E8E8F8`
- The company name types in character by character with a 40ms interval and `#FFD700` cursor — like a typewriter
- This is the first time the company name appears styled — it feels like it's being inscribed

### 5.5 Progress Bar

```css
/* Track */
width: 320px
height: 2px
background: #1A1A2E
margin: 24px auto

/* Fill */
height: 2px
background: linear-gradient(90deg, #FFD70080, #FFD700)
transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1)
box-shadow: 0 0 8px #FFD70040
```

Progress is driven by actual backend steps, not fake timers. Each step completion moves the bar to a defined percentage:

- Company created: 15%
- CEO initialized: 30%
- CTO initialized: 45%
- CMO initialized: 55%
- HR initialized: 65%
- CFO initialized: 75%
- Worker pool ready: 88%
- CEO briefed with directive: 96%
- Dashboard ready: 100%

### 5.6 Step List

Each step is a line of text. Three states:

**Pending (not started):**

```
·  Assembling worker pool
```

IBM Plex Mono 11px, color `#252540`, `·` icon

**Active (in progress):**

```
→  Briefing CEO...
```

IBM Plex Mono 11px, color `#8080A8`, `→` icon, trailing `...` blinks (opacity 0.3↔1.0 every 600ms)

**Complete:**

```
✦  Company record created
```

IBM Plex Mono 11px, color `#404060`, `✦` icon — completed steps dim slightly, not removed

When a step completes: the `→` icon morphs to `✦`, color transitions from `#8080A8` to `#404060`, a brief `#FFD700` flash (150ms on, then fades 300ms). The next step activates.

### 5.7 Loading Messages

These are additional flavor lines that appear below the step list, cycling every 2.5 seconds. They add narrative and personality. Shown in IBM Plex Mono 10px, color `#252535`, centered. They fade in/out (400ms cross-fade).

```typescript
const LOADING_MESSAGES = [
	"Agents do not sleep. Agents do not tire.",
	"Calibrating strategic reasoning...",
	"No meetings required.",
	"Spinning up the org chart...",
	"CEO is reading your directive.",
	"Worker pool standing by.",
	"The boardroom is yours.",
	"No Slack messages were sent in the making of this company.",
	"Establishing chain of command...",
	"Human oversight: you. Human involvement: none.",
	"Compiling your vision into executable tasks...",
	"The board has one seat. It's yours.",
];
```

### 5.8 Final Transition to Dashboard

When progress hits 100%:

1. Progress bar completes, fills gold, glows briefly
2. Step list all show `✦` completed
3. 800ms pause — let it land
4. Everything fades out (500ms)
5. Dashboard fades in (600ms)
6. On dashboard entry: a subtle "company is live" banner appears at top for 3 seconds then auto-dismisses

---

## 6. Page 2 — The Dashboard

### 6.1 Intent

The user is the board of directors. They are watching their company work in real time. The dashboard must:

- Feel like a **command center**, not an app
- Surface information at a glance — agent states, task progress, budget burn
- Make the **live feed feel alive** — events streaming in, agents changing state, workers being hired
- Give the board **one clear action**: submit a new directive

### 6.2 Layout — Three-Panel Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER: Company name · status badge · token counter · time running     │
├──────────────────────┬─────────────────────────┬───────────────────────┤
│                      │                         │                       │
│   LIVE FEED          │   ORG CHART             │   BOARD PANEL         │
│                      │                         │                       │
│   Real-time stream   │   Agent hierarchy       │   - Directive input   │
│   of all events      │   animated nodes        │   - Latest report     │
│   color-coded by     │   showing state         │   - Budget gauge      │
│   agent role         │   + message paths       │                       │
│                      │                         │                       │
│   (scrolling,        │   (center of screen,    │   TASK TREE           │
│    newest at top)    │    most visual)         │   (expandable)        │
│                      │                         │                       │
│                      │                         │   BRAIN INSPECTOR     │
│                      │                         │   (collapsible)       │
│                      │                         │                       │
├──────────────────────┴─────────────────────────┴───────────────────────┤
│  STATUS BAR: agent count · active tasks · total tokens · uptime        │
└─────────────────────────────────────────────────────────────────────────┘

Panel widths: Live Feed 28% · Org Chart 42% · Board Panel 30%
```

### 6.3 Header Bar

Height: 48px. Full width. Sticky.

```
[  ACME CORP  ]  ●  LIVE  ·  04:32 running  ·  47,231 tokens used  ·  $0.84
```

- Company name: Space Grotesk 14px weight 600, color `#E8E8F8`
- `●  LIVE`: pulsing green dot (CSS animation: scale 1→1.4→1 over 2s, opacity 0.6→1→0.6) + IBM Plex Mono 10px color `#00FF94`
- Time running: IBM Plex Mono 10px, color `#404060`, updates every second
- Token counter: IBM Plex Mono 10px, color `#404060`, updates on each budget event
- Cost: IBM Plex Mono 10px, color `#606080`
- All separated by `·`
- Right side: `[ NEW DIRECTIVE ]` button — same style as Incorporate button but smaller (10px font, 8px 16px padding)

Header background: `#0A0A14`, border-bottom `1px solid #161626`

### 6.4 Status Bar

Height: 32px. Bottom of screen. Sticky.

```
9 agents active  ·  3 tasks running  ·  2 workers idle  ·  CEO: WORKING  ·  CTO: WORKING  ·  Last event: 0.3s ago
```

IBM Plex Mono 9px, color `#303050`. Updates live. Agent states show their role color when not IDLE.

---

## 7. Component Specs

### 7.1 Live Feed

**The heartbeat of the dashboard.** Every event the system emits appears here.

**Layout:**

- Full height of center column, scrollable
- Newest events at the **top** (reverse chronological)
- Auto-scrolls to top on new event unless user has manually scrolled down (pause auto-scroll if user scrolls, resume button appears)

**Event Row anatomy:**

```
[TIMESTAMP]  [ROLE_BADGE]  [ICON]  [MESSAGE]                    [THREAD]
  04:32.441    CEO          →       Delegating to CTO: tech...   #a3f2
```

```css
/* Event row */
display: grid
grid-template-columns: 52px 36px 16px 1fr 40px
align-items: center
gap: 8px
padding: 5px 12px
border-bottom: 1px solid #0D0D18
font: IBM Plex Mono, 10.5px
transition: background 150ms

/* Hover */
background: #0C0C18

/* New event entry animation */
animation: slideDown 200ms ease-out
/* slideDown: from translateY(-4px) opacity 0 → to translateY(0) opacity 1 */
```

**Timestamp:** `#303050`, format `MM:SS.mmm` (minutes:seconds.milliseconds since company started)

**Role Badge:**

```css
/* 32px wide, 16px tall */
background: {ROLE_COLOR}15        /* 8% opacity color fill */
border: 1px solid {ROLE_COLOR}30  /* 18% opacity border */
border-radius: 1px
font-size: 8px
font-weight: 700
letter-spacing: 0.1em
color: {ROLE_COLOR}
text-align: center
```

**Icon:** 12px, color `{ROLE_COLOR}60` (60% opacity)

**Message:** `#707090`, truncated with ellipsis, expandable on click

**Thread ID:** `#202035`, 4 chars of thread_id, monospace 9px

**Special event types get distinct treatment:**

`TASK_COMPLETE`:

- Background: `#0A140A` (very dark green tint)
- Message color: `#606080` → brightens to `#9090B0` briefly (300ms) when it appears

`BUDGET_ALERT`:

- Background: `#14100A` (very dark amber tint)
- Icon: `⚠` in `#FF9900`

`DEAD_LETTER`:

- Background: `#140A0A` (very dark red tint)
- Message color: `#FF444460`

`AGENT_HIRED`:

- A thin `{ROLE_COLOR}` left border (2px) on the row

**Thread grouping:**
When multiple events share a `thread_id`, they can be collapsed into a thread group. Show the first event + a `[+4 more]` expand control. Expanded view indents child events 12px.

**Filter bar** (above the feed, 28px height):

```
[ ALL ]  [ CEO ]  [ CTO ]  [ CMO ]  [ HR ]  [ CFO ]  [ WORKERS ]
```

Small pill buttons. Active pill: `background: {ROLE_COLOR}20, border: {ROLE_COLOR}40, color: {ROLE_COLOR}`
Inactive: `background: transparent, border: #161626, color: #303050`

### 7.2 Org Chart

**The visual heart of the dashboard.** Animated agent nodes showing the live company hierarchy.

**Layout:**
SVG-based force-directed or fixed hierarchical layout. Not a third-party graph library — custom SVG drawn from the OrgChart data.

Fixed hierarchy positions (not force-directed — too chaotic for a hierarchy):

```
             BOARD
               |
              CEO
         _____|_____
        |     |     |
       CTO   CMO    HR   CFO
      __|__  __|
     |     ||   |
    DEV  OPS RES ANL
```

**Node anatomy:**

```
     ╭──────────────╮
     │  CEO  ●      │   ← role label + state dot
     │  WORKING     │   ← state text
     │  "Briefing…" │   ← current task (truncated)
     ╰──────────────╯
```

```css
/* Node base */
width: 90px (C-suite) / 72px (workers)
background: #0C0C16
border: 1px solid #1A1A2E
border-radius: 3px
padding: 8px 10px
font: IBM Plex Mono

/* Role label */
font-size: 10px
font-weight: 700
color: {ROLE_COLOR}
letter-spacing: 0.1em

/* State dot */
width: 7px, height: 7px, border-radius: 50%
display: inline-block
margin-left: 6px
```

**Node states — visual treatment:**

`IDLE`:

- Border: `#1A1A2E` (default, dim)
- State dot: `#252540` (dark, barely visible)
- Overall opacity: 0.6

`WORKING`:

- Border: `{ROLE_COLOR}50`
- State dot: `{ROLE_COLOR}` + CSS animation: `pulse 2s infinite` (scale 1→1.3→1, opacity 1→0.6→1)
- Box shadow: `0 0 12px {ROLE_COLOR}20`
- Overall opacity: 1.0

`ACKNOWLEDGED`:

- Border: `{ROLE_COLOR}30`
- State dot: `{ROLE_COLOR}60`
- Overall opacity: 0.8

`BLOCKED`:

- Border: `#FF990050`
- State dot: `#FF9900` blinking (opacity 1→0 every 800ms)
- Box shadow: `0 0 10px #FF990015`

`REPORTING`:

- Border: `#00FF9450`
- State dot: `#00FF94`
- Brief: node brightens fully for 400ms on transition

**Connection lines (SVG paths between nodes):**

- Default: `stroke: #1A1A2E, stroke-width: 1`
- When a message travels between two nodes: animated dash traverses the path
  ```
  stroke-dasharray: 4 4
  animation: dash 600ms linear forwards
  stroke: {SENDER_ROLE_COLOR}
  opacity: fades from 1 to 0 over 600ms
  ```
- The path from CEO→CTO lights up when CEO delegates to CTO, etc.

**New worker hired animation:**

1. Node appears at 0 scale at its position
2. Springs to full size (scale 0→1.1→1.0, 400ms spring easing)
3. A brief glow pulse
4. Connection line from HR to the new node draws itself (stroke-dashoffset animation)

**Worker released animation:**

1. Node fades + shrinks (scale 1→0, opacity 1→0, 300ms)
2. Connection line fades simultaneously

### 7.3 Board Panel (Right Column)

Three stacked sections, vertically arranged.

**Section 1: Directive Input**

```
SUBMIT DIRECTIVE TO CEO
────────────────────────

┌──────────────────────────────────┐
│ What should your company do      │
│ next?                            │
│                                  │
└──────────────────────────────────┘
[ SUBMIT →  ]

Last directive: "Research competitors..."
Submitted: 04:12 ago
```

- Textarea: same styling as Incorporation form
- Submit button: same style, but on hover shows `→` animating right 4px
- Below: shows last directive submitted (truncated to one line, dimmed)
- Directive submission triggers brief flash on CEO node in org chart

**Section 2: Latest Board Report**

Appears when CEO produces a `BoardReport`. Initially shows:

```
AWAITING FIRST REPORT
No report yet — CEO is working.
```

When report arrives (WebSocket event `REPORT` from CEO):

- Section brightens momentarily
- Report content fades in
- A `NEW` badge appears for 5 seconds then fades

Report display:

```
BOARD REPORT  ·  04:31
────────────────────────
SUMMARY
[CEO synthesis text — max 4 lines, truncated with expand]

DECISIONS  (2)
→ Proceeding with React + FastAPI stack
→ Targeting SMB market segment

BLOCKERS  (1)
! Developer hit budget limit on task #3

NEXT STEPS
· Expand Developer pool to 3 instances
· Begin UI prototype this session
```

All in IBM Plex Mono. Sections separated by single-line `────` dividers.

**Section 3: Budget Gauge**

```
BUDGET
────────────────────────
Total:   100,000 tokens

CEO    ██████░░░░░░  47%   32,110
CTO    ████░░░░░░░░  32%   21,840
CMO    ██░░░░░░░░░░  18%    9,200
HR     █░░░░░░░░░░░   8%    4,100
CFO    ░░░░░░░░░░░░   2%    1,020
DEVS   ████░░░░░░░░  38%   24,810

TOTAL USED  ■■■■■■■■░░  62%
RUNWAY  ~2.4hrs at current burn
```

Each bar: 8px height, `background: #111120`, filled portion `background: {ROLE_COLOR}60`
Numbers: IBM Plex Mono 10px, `#505070`
On `BUDGET_ALERT` event: the relevant agent's bar pulses amber (`#FF990030` background flash)

Below bars: `[ + ADD BUDGET ]` button — opens a minimal modal:

```
ADD TOKEN BUDGET
────────────────
Amount: [_______] tokens
[ CONFIRM ]
```

### 7.4 Task Tree

Collapsible section below Board Panel (or in a separate drawer).

```
TASKS  (7 active · 3 complete)
────────────────────────────────
▼ Research competitor landscape  [CEO]  IN_PROGRESS
  ▼ Market analysis              [CMO]  WORKING
    → Web search: "top CRM tools 2026"  [RES]  WORKING
    · Analyze pricing data              [ANL]  PENDING
  · Technical feasibility              [CTO]  PENDING

▼ Build landing page prototype   [CEO]  PENDING
  · Design component structure   [CTO]  PENDING

▶ Define brand voice             [CEO]  COMPLETE  ✦
```

- Tree lines use IBM Plex Mono box-drawing adjacent characters
- Status badges: same pill style as event feed role badges
- `WORKING` tasks have their status badge pulsing
- `COMPLETE` tasks are dimmed (opacity 0.5)
- Click any task → expands to show full payload and output (if complete)

### 7.5 Brain Inspector

Collapsible panel. Shows company brain KV store. Board can observe but not edit.

```
COMPANY BRAIN  [12 keys]
────────────────────────
company.strategic_plan     [updated 2:14]
company.org_chart          [updated 0:03]
agent.ceo.context          [updated 0:01]
agent.cto.context          [updated 0:08]
task.proj-001.output       [updated 1:44]
workspace.file_manifest    [updated 0:32]
...

[ EXPAND ALL ]
```

Click any key → inline JSON viewer expands below the row, formatted with syntax highlighting (keys in `#4A9EFF`, strings in `#00D4AA`, numbers in `#FFD700`).

---

## 8. Animation System

### 8.1 Core Principles

- **Never animate without purpose.** Every animation communicates a state change.
- **Fast in, slow out.** Entry animations are snappy (150–250ms). Exit animations are slightly slower (200–350ms).
- **Spring for organic feel.** Use `cubic-bezier(0.34, 1.56, 0.64, 1)` for "spring" (slight overshoot) on node appearances.
- **No looping animations except heartbeats.** The only looping animations are the LIVE pulse dot and WORKING state dots.

### 8.2 Keyframe Reference

```css
@keyframes fadeSlideDown {
	from {
		opacity: 0;
		transform: translateY(-6px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes fadeSlideUp {
	from {
		opacity: 0;
		transform: translateY(6px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes nodeAppear {
	0% {
		opacity: 0;
		transform: scale(0);
	}
	70% {
		transform: scale(1.08);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}

@keyframes nodeDisappear {
	from {
		opacity: 1;
		transform: scale(1);
	}
	to {
		opacity: 0;
		transform: scale(0.8);
	}
}

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
		transform: scale(1);
	}
	50% {
		opacity: 0.5;
		transform: scale(1.3);
	}
}

@keyframes blink {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.2;
	}
}

@keyframes messagePath {
	from {
		stroke-dashoffset: 100;
		opacity: 1;
	}
	to {
		stroke-dashoffset: 0;
		opacity: 0;
	}
}

@keyframes flashGold {
	0% {
		background: transparent;
	}
	20% {
		background: #ffd70015;
	}
	100% {
		background: transparent;
	}
}

@keyframes typeChar {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
```

### 8.3 Event Feed Entry

Every new event row:

```css
animation: fadeSlideDown 200ms ease-out both;
```

Stagger if multiple events arrive within the same 100ms window: add `animation-delay: {index * 50}ms`

### 8.4 Dashboard Initial Load

Sequence when dashboard first appears after loader:

1. Header slides down from -48px (300ms ease-out)
2. Left panel fades in (400ms, delay 100ms)
3. Center panel fades in (400ms, delay 200ms)
4. Right panel fades in (400ms, delay 300ms)
5. Status bar slides up from bottom (300ms, delay 400ms)
6. Org chart nodes appear one by one staggered 60ms each, using `nodeAppear` keyframe
7. Connection lines draw themselves after all nodes appear

### 8.5 "Company Is Live" Banner

After dashboard loads, a thin banner appears at the top of the Live Feed:

```
◎  ACME CORP IS LIVE  ·  CEO has received your directive
```

- IBM Plex Mono 10px, centered
- Background: `#0A140A`, border: `1px solid #00FF9420`
- Appears with `fadeSlideDown`, auto-dismisses after 4 seconds with fade out
- Not closeable manually — it goes away on its own

---

## 9. WebSocket & State

### 9.1 Connection Management

```typescript
// Single WebSocket, reconnects automatically
class CompanySocket {
	private ws: WebSocket | null = null;
	private reconnectDelay = 1000;
	private maxDelay = 30000;
	private companyId: string;

	connect() {
		this.ws = new WebSocket(`ws://localhost:8000/ws/${this.companyId}`);
		this.ws.onmessage = (e) => this.handleEvent(JSON.parse(e.data));
		this.ws.onclose = () => this.scheduleReconnect();
		this.ws.onerror = () => this.ws?.close();
	}

	private scheduleReconnect() {
		setTimeout(() => {
			this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
			this.connect();
		}, this.reconnectDelay);
	}

	private handleEvent(event: Event) {
		// Dispatch to Zustand stores by event type
		useEventStore.getState().addEvent(event);
		useAgentStore.getState().processEvent(event);
		useBudgetStore.getState().processEvent(event);
		useTaskStore.getState().processEvent(event);
	}
}
```

### 9.2 Zustand Stores

```typescript
// store/events.ts
interface EventsStore {
	events: Event[]; // newest first, max 500 kept
	paused: boolean; // user scrolled down — pause auto-scroll
	addEvent: (event: Event) => void;
	setPaused: (paused: boolean) => void;
	filteredByRole: (role: string | null) => Event[];
}

// store/agents.ts
interface AgentsStore {
	agents: Record<string, AgentRecord>; // keyed by agent_id
	orgChart: OrgChart | null;
	processEvent: (event: Event) => void; // updates agent states from events
}

// store/budget.ts
interface BudgetStore {
	report: BudgetReport | null;
	totalTokens: number;
	processEvent: (event: Event) => void;
	injectBudget: (amount: number) => Promise<void>;
}

// store/tasks.ts
interface TasksStore {
	tasks: Record<string, Task>; // keyed by task_id
	taskTree: TaskNode[]; // hierarchical structure
	processEvent: (event: Event) => void;
}

// store/company.ts
interface CompanyStore {
	company: Company | null;
	startTime: Date | null;
	elapsedSeconds: number; // updated every second
	setCompany: (c: Company) => void;
}
```

### 9.3 Event → Store Routing

```typescript
function routeEvent(event: Event) {
	switch (event.type) {
		case "STATE_CHANGE":
			useAgentStore
				.getState()
				.updateAgentState(event.agent_id, event.payload.state);
			break;
		case "TASK_ASSIGN":
		case "TASK_ACKNOWLEDGED":
		case "TASK_COMPLETE":
			useTaskStore.getState().processEvent(event);
			break;
		case "AGENT_HIRED":
			useAgentStore.getState().addAgent(event.payload);
			break;
		case "AGENT_RELEASED":
			useAgentStore.getState().removeAgent(event.agent_id);
			break;
		case "BUDGET_ALERT":
		case "BUDGET_UPDATE":
			useBudgetStore.getState().processEvent(event);
			break;
		case "REPORT":
			if (event.role === "ceo")
				useBoardStore.getState().setReport(event.payload);
			break;
	}
	// ALL events go to the feed regardless of type
	useEventStore.getState().addEvent(event);
}
```

---

## 10. Tech Stack

```
React 18 (TypeScript)
Vite 5
Zustand — state management (no Redux, no Context for global state)
Framer Motion — animations (preferred over CSS-only for complex sequences)
Recharts — budget visualization
IBM Plex Mono — body/data font (Google Fonts)
Space Grotesk — display font (Google Fonts)
Tailwind CSS — utility classes (configured to match design system)
```

**Tailwind config — extend with design system:**

```typescript
// tailwind.config.ts
export default {
	theme: {
		extend: {
			colors: {
				bg: { base: "#07070D", surface: "#0C0C16", raised: "#111120" },
				border: { dim: "#1A1A2E", mid: "#252540", bright: "#363660" },
				role: {
					ceo: "#FFD700",
					cto: "#4A9EFF",
					cmo: "#00D4AA",
					hr: "#00FF94",
					cfo: "#FF9900",
					worker: "#9090C0",
				},
			},
			fontFamily: {
				mono: ['"IBM Plex Mono"', "monospace"],
				display: ['"Space Grotesk"', "sans-serif"],
			},
		},
	},
};
```

**Do NOT use:**

- Any component library (MUI, Chakra, shadcn, Ant Design) — every component is custom
- Recharts for anything except budget bars — custom SVG for org chart
- Default browser styles anywhere — full CSS reset

---

## 11. File Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx                     # App entry, font imports
    ├── App.tsx                      # Router: Incorporation | Dashboard
    ├── socket.ts                    # WebSocket singleton + event router
    │
    ├── design/
    │   ├── colors.ts                # ROLE_COLORS, EVENT_ICONS, all constants
    │   ├── tokens.css               # CSS custom properties (design system)
    │   └── animations.css           # All @keyframes defined once
    │
    ├── store/
    │   ├── events.ts
    │   ├── agents.ts
    │   ├── budget.ts
    │   ├── tasks.ts
    │   └── company.ts
    │
    ├── pages/
    │   ├── Incorporation.tsx        # Page 1: the form
    │   └── Dashboard.tsx            # Page 2: three-panel layout
    │
    ├── components/
    │   ├── incorporation/
    │   │   ├── IncorporationForm.tsx
    │   │   └── IncorporationLoader.tsx
    │   │
    │   ├── dashboard/
    │   │   ├── Header.tsx           # Top bar: company name, LIVE, tokens
    │   │   └── StatusBar.tsx        # Bottom bar: agent count, task count
    │   │
    │   ├── feed/
    │   │   ├── LiveFeed.tsx         # Scrollable event list container
    │   │   ├── EventRow.tsx         # Single event row
    │   │   ├── FeedFilter.tsx       # Role filter pills
    │   │   └── ThreadGroup.tsx      # Collapsed thread with expand
    │   │
    │   ├── orgchart/
    │   │   ├── OrgChart.tsx         # SVG container + layout
    │   │   ├── AgentNode.tsx        # Individual agent node
    │   │   ├── ConnectionLine.tsx   # SVG path between nodes
    │   │   └── MessagePulse.tsx     # Animated message traversal
    │   │
    │   ├── board/
    │   │   ├── BoardPanel.tsx       # Right column container
    │   │   ├── DirectiveInput.tsx   # Textarea + submit
    │   │   ├── BoardReport.tsx      # Latest CEO report display
    │   │   ├── BudgetGauge.tsx      # Token usage bars
    │   │   └── AddBudgetModal.tsx   # Budget injection modal
    │   │
    │   ├── tasks/
    │   │   ├── TaskTree.tsx         # Collapsible task hierarchy
    │   │   ├── TaskNode.tsx         # Individual task row
    │   │   └── TaskOutput.tsx       # Expanded task output viewer
    │   │
    │   └── brain/
    │       ├── BrainInspector.tsx   # KV store browser
    │       └── JsonViewer.tsx       # Syntax-highlighted JSON
    │
    └── types/
        ├── events.ts                # Frontend Event type
        ├── agents.ts                # AgentRecord, OrgChart types
        ├── tasks.ts                 # Task, TaskNode types
        └── api.ts                   # API request/response types
```

---

## 12. Critical Rules — Never Violate

These exist because they protect the intended experience. Every one of them has a reason.

1. **Never use a component library.** Every component is custom. MUI/shadcn/Chakra will make this look like every other app. The entire point is that it doesn't look like any other app.

2. **Never use Inter, Roboto, or system fonts.** IBM Plex Mono for data. Space Grotesk for display. No exceptions.

3. **Never use rounded corners > 3px.** This is a precision operations tool, not a consumer app. Sharp edges are intentional.

4. **Never add color that isn't in the design system.** The only colors in the UI are the 7 role colors + the signal colors. No gradients. No random accents. Color = meaning.

5. **Never loop an animation that doesn't represent a live state.** Only the LIVE dot and WORKING state dots loop. Everything else animates once on state change.

6. **Never use fake progress in the loader.** Progress bar advances only when the backend confirms each step. No fake timers advancing progress artificially.

7. **Never let the live feed scroll silently.** If the user has scrolled down and new events arrive, show a `↑ 12 new events` pill at the top. Clicking it scrolls to top and re-enables auto-scroll.

8. **Never use `alert()`, `confirm()`, or browser dialogs.** All feedback is inline — error messages below fields, status in the event feed, reports in the board panel.

9. **Never render the dashboard until the WebSocket is connected.** Show a connection state (`Connecting to company...`) overlay if the WS drops. The dashboard showing stale data is worse than showing nothing.

10. **Never display raw UUIDs to the user.** Thread IDs shown as 4-char truncated. Task IDs shown as `#` + 4 chars. Agent IDs shown as their role name. UUIDs are for the system, not the board.

11. **The Org Chart is SVG, not a third-party graph library.** D3-force, react-flow, etc. will fight the design system. Custom SVG with fixed hierarchical positions is the right approach for a stable, predictable org chart.

12. **Every agent state change in the org chart must animate.** A node going from IDLE to WORKING without visual feedback is a missed moment. These transitions are the product.
