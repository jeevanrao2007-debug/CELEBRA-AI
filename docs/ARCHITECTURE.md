# CelebraAI — System Architecture & Engineering Design

CelebraAI is built as a **modular monolithic architecture** designed for production reliability, strict financial accuracy, and autonomous operational resilience. It combines Generative AI ideation with deterministic validation engines to guarantee that event plans are both creative and executable.

---

## 1. Architectural Philosophy

Traditional event-planning software and generic LLM chat interfaces suffer from two failure modes:
1. **Tool Fragmentation**: Spreadsheets, documents, messaging, and floorplans live in disconnected silos.
2. **Silent Hallucinations & Drift**: LLMs hallucinate calculations, miscalculate tax and quantities, allow over-budget proposals, and fail to notice physical venue constraints.

CelebraAI resolves this through the **Generative Proposal / Deterministic Enforcement** pattern:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER EVENT REQUIREMENTS                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   GENAI GENERATION & PERSONALIZATION                   │
│   • Google Gemini 2.5 Flash API (Structured JSON Schema)               │
│   • Deterministic Offline Rule-Based Fallback Engine                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  SECURITY & SCHEMA VALIDATION LAYER                    │
│   • OWASP Multi-Vector String Sanitization (XSS Neutralization)        │
│   • Boundary Checks: Budget ceiling, headcount range, positive costs   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     7 DETERMINISTIC DOMAIN ENGINES                     │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌────────────────┐ │
│  │     Budget Engine     │ │   Timeline Engine    │ │ Vendor Engine  │ │
│  │   Exact Allocations   │ │    Delay Cascades    │ │  Standby SLAs  │ │
│  └───────────────────────┘ └──────────────────────┘ └────────────────┘ │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌────────────────┐ │
│  │    Capacity Engine    │ │    Crisis Engine     │ │ Version Engine │ │
│  │  3D Spatial Egress    │ │  Feasibility Checks  │ │ Monotonic Diff │ │
│  └───────────────────────┘ └──────────────────────┘ └────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  UNIFIED EVENT COMMAND CENTER (UI)                     │
│   • 3D Spatial Canvas (Three.js)    • Budget Ledger & Category Matrix  │
│   • Interactive Timeline Run-Sheet  • Supplier Checklist & Standby Hub │
│   • Event Crisis Simulator          • Immutable Version Rewind Matrix  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure & Modular Separation

```text
celebraai/
├── server.ts                       # Express.js API Server (CSP, Rate Limiting, Gemini API, Health)
├── vite.config.ts                  # Vite 8 / Rolldown build configuration with chunk isolation
├── tsconfig.json                   # TypeScript configuration (strict, ES2022)
├── package.json                    # Project metadata, dependencies, build/test scripts
├── .github/workflows/ci.yml        # Automated GitHub Actions continuous integration pipeline
├── src/
│   ├── main.tsx                    # React client entry point
│   ├── App.tsx                     # Top-level state synchronization & view routing
│   ├── index.css                   # Tailwind CSS v4, design tokens, WCAG 2.2 focus/motion styles
│   ├── types/
│   │   └── index.ts                # Single source of truth for domain data models & contracts
│   ├── data/
│   │   ├── demoEvents.ts           # Wedding, Birthday, and Community event presets
│   │   └── demoFestival.ts         # College Cultural Festival preset
│   ├── hooks/
│   │   └── useFocusTrap.ts         # Accessible modal focus trapping hook (WCAG 2.1 AAA)
│   ├── logic/                      # 7 Pure, testable deterministic domain engines
│   │   ├── budgetEngine.ts         # Budget calculations, category breakdowns, savings analysis
│   │   ├── capacityEngine.ts       # 3D spatial capacity calculation, boundary verification
│   │   ├── crisisEngine.ts         # 6 Incident scenarios, impact reports, feasibility checking
│   │   ├── taskEngine.ts           # Topological dependency sorting, circular cycle detection, delays
│   │   ├── validationEngine.ts     # Input validation, AI output sanitization, XSS defense
│   │   ├── vendorEngine.ts         # Supplier checklists, cancellation simulation, standby replacement
│   │   └── versionEngine.ts        # Immutable snapshots, monotonicity, version diffing, restoration
│   └── components/                 # Decoupled UI views and modals
│       ├── assistant/              # Contextual In-Workspace Strategist drawer
│       ├── budget/                 # Budget view, Category breakdown, Add expense modal
│       ├── command/                # Event command center, Share brief modal
│       ├── common/                 # LiveAnnouncer (screen-reader polite announcements)
│       ├── crisis/                 # Crisis simulator view, feasibility comparison matrix
│       ├── dashboard/              # Multi-event management dashboard
│       ├── landing/                # Hero landing page with multi-category interactive switcher
│       ├── rewind/                 # Event rewind view, revision history, deep diff comparison
│       ├── timeline/               # Timeline view, Delay cascade panel, Task edit & add modals
│       ├── vendors/                # Vendor checklist view, Add vendor modal
│       ├── venue3d/                # Three.js 3D spatial editor & procedural furniture models
│       └── wizard/                 # 3-Step event requirement collection wizard
├── tests/                          # 63 Automated unit and integration tests (19 suites)
└── docs/                           # Comprehensive technical & evaluator documentation
    ├── ARCHITECTURE.md             # This document
    ├── SECURITY.md                 # Security controls, validation, headers, rate limiting
    ├── TESTING.md                  # Test architecture, suites, execution results
    ├── ACCESSIBILITY.md            # WCAG 2.2 AA audit, keyboard navigation, focus management
    └── EVALUATION-MAP.md           # Master evaluator navigation map across all 6 parameters
```

---

## 3. The Seven Deterministic Domain Engines

### 1. Budget Engine (`src/logic/budgetEngine.ts`)
- **Responsibility**: Pure financial arithmetic, category allocation breakdowns across 9 standard expense categories (`venue`, `catering`, `decoration`, `photography`, `entertainment`, `equipment`, `transport`, `staff`, `contingency`), over-budget detection, and automated savings opportunity discovery.
- **Invariants**:
  - `plannedExpenditure` strictly equals the sum of individual expense subtotals (`quantity * unitCost`).
  - Total category allocated expenditures equal `plannedExpenditure`.
  - Over-budget status triggers instantly when `plannedExpenditure > totalBudget` with exact deficit delta.
  - Safe handling of empty expense arrays without `NaN` or division-by-zero.

### 2. Timeline & Dependency Engine (`src/logic/taskEngine.ts`)
- **Responsibility**: Task graph integrity, prerequisite dependency validation, circular dependency detection via Depth-First Search (DFS), transitive delay cascade propagation, and overdue task identification.
- **Invariants**:
  - A task cannot transition to `completed` if any prerequisite dependency is incomplete.
  - Circular dependencies (e.g., A → B → C → A) are detected and reported with exact cycle paths.
  - Transitive delay propagation accurately computes downstream slippage without duplicating affected tasks.

### 3. Vendor Engine (`src/logic/vendorEngine.ts`)
- **Responsibility**: Supplier status lifecycle (`suggested`, `user_entered`, `contacted`, `confirmed`, `cancelled`), quote commitments, capacity handling, primary vendor walkout simulation, 1-click standby partner mobilization with SLA surcharge, and automatic budget expense synchronization.
- **Invariants**:
  - Mobilizing a standby vendor transitions status to `confirmed` and applies the configured surcharge.
  - Standby cost adjustments immediately synchronize with the event's expense ledger.
  - Every demo vendor carries `isDemoEntity: true` to prevent confusing mock entries with verified real-world vendors.

### 4. Venue Capacity & Spatial Boundaries Engine (`src/logic/capacityEngine.ts`)
- **Responsibility**: Evaluates physical seating configurations across indoor and outdoor zones against venue authorized limits and expected attendance.
- **Invariants**:
  - Computes exact indoor and outdoor occupancy utilization percentages.
  - Generates safety warnings when seating exceeds venue perimeter boundaries or safe egress bounds.
  - Flags capacity deficits when configured seating is insufficient for expected headcount.

### 5. Crisis Simulation & Feasibility Engine (`src/logic/crisisEngine.ts`)
- **Responsibility**: Models 6 realistic operational incidents:
  1. `heavy_rain`: Outdoor lawn flooded, outdoor furniture damaged, outdoor schedule shifts indoor.
  2. `caterer_cancellation`: Primary caterer fails, food supply deficit, standby partner mobilization required.
  3. `attendance_surge`: Sudden +35% guest influx, seating shortage, spatial reconfiguration.
  4. `budget_cut`: -20% sponsor funding reduction, discretionary line-item reduction required.
  5. `sound_equipment_failure`: Line array blowout, acoustic failover, safety inspection.
  6. `staging_delay_cascade`: 4-hour rigging delay, downstream cue rescheduling.
- **Constraint-Based Feasibility Protocol**: Every candidate recovery plan is evaluated against hard physical and financial constraints:
  - Budget ceiling check: Does revised spend remain within authorized budget?
  - Capacity check: Can the indoor hall accommodate displaced guests without breaching safety limits?
  - Schedule buffer check: Does sufficient turnaround time exist before guest arrival?
- Infeasible recovery plans are mathematically blocked from being applied.

### 6. Event Version Engine (`src/logic/versionEngine.ts`)
- **Responsibility**: Immutable version snapshot creation, strict monotonicity enforcement, deep revision diffing, and non-destructive version rollback.
- **Invariants**:
  - Every modification, crisis recovery, or manual edit increments `currentVersionNumber` monotonically.
  - Snapshots are deep-cloned JSON copies: subsequent mutations to active event state cannot mutate past snapshots.
  - Rollback does not erase history: restoring an earlier baseline appends a new version snapshot containing the restored state.

### 7. Validation & Security Engine (`src/logic/validationEngine.ts`)
- **Responsibility**: OWASP Level 3 string sanitization, server-side API schema validation for planning and assistant routes, and untrusted AI response validation.
- **Invariants**:
  - Strips HTML elements, script tags, `javascript:` pseudoprotocols, event handlers (`onload=`, `onerror=`), and null bytes.
  - Rejects out-of-range budget numbers, invalid event categories, and negative costs.
  - Clamps assistant prompts to 1,000 characters to prevent prompt injection and Denial-of-Service.
  - Rejects corrupt or over-budget AI-generated plans before they can contaminate application state.

---

## 4. 3D Spatial Venue Visualization Architecture

Built on **Three.js** with physically based rendering (PBR):
- **Lighting & Tone Mapping**: Studio directional key lighting, ambient environmental fill, grounding soft shadows, and ACES Filmic tone mapping.
- **Procedural Composite Models**:
  - Banquet dining tables with gold linen and floral centerpieces.
  - Main stages with aluminum rigging trusses and overhead spotlights.
  - Food buffet stations with serving platters and heating lamps.
  - Line-array audio speaker towers with safety cable ramps.
  - Ceremonial welcome entrance arches.
  - Marquee canopy tents with perimeter poles.
- **Resource Lifecycle & Memory Safety**: Full recursive geometry and material disposal on scene updates or unmount to guarantee zero WebGL memory leaks.
- **Accessible Alternative**: Keyboard D-pad movement buttons and rotate controls with explicit `aria-label` attributes provide non-drag keyboard accessibility for users unable to interact via mouse orbit.

---

## 5. Technology Stack Summary

| Layer | Technologies | Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript | Strict component-driven UI with native hooks, `React.lazy`, and `<Suspense>` |
| **Styling System** | Tailwind CSS v4 | Bespoke editorial design tokens, zero runtime CSS overhead |
| **3D Visualization** | Three.js (0.186.x) | WebGL spatial layout simulation with procedural geometry |
| **Backend API Server** | Express.js, Node.js 22 | Lightweight HTTP server with tiered sliding-window rate limiters and strict security headers |
| **AI Integration** | `@google/genai` (Gemini 2.5 Flash) | Server-side structured plan generation with deterministic offline fallback |
| **Build & Bundling** | Vite 8, Rolldown, esbuild | Sub-second builds with vendor chunk splitting (`vendor-three`, `vendor-motion`, `vendor-icons`) |
| **Test Runner** | Node.js Native Test Runner (`node:test`, `tsx`) | Zero-dependency, ultra-fast test execution (63 tests in < 1.2s) |
| **CI/CD** | GitHub Actions | Automated multi-version Node.js matrix (20.x, 22.x) running lint, test, build, and audit |
