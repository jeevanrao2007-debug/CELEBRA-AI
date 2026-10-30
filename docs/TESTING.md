# CelebraAI — Automated Test Strategy & Verification Suite

CelebraAI utilizes a high-velocity, deterministic testing strategy built on the **Node.js Native Test Runner** (`node:test` and `node:assert/strict`) executed through `tsx`.

---

## 1. Test Architecture & Principles

1. **Zero External Flakiness**: Tests never depend on live network connections or unpredictable LLM responses. Deterministic mocks and schema validators simulate AI responses, ensuring reproducible, offline-capable test runs in sub-second execution times.
2. **Mathematical Invariant Verification**: Tests assert strict algebraic invariants (e.g. sum of category expenses equals total planned spend, budget delta monotonicity, DAG acyclicity).
3. **Deep State Isolation**: Tests verify that mutating active events does not retrospectively pollute past version snapshots.
4. **End-to-End Lifecycle Validation**: Integration tests exercise the full user journey across all functional engines rather than merely checking React component rendering.

---

## 2. Test Execution Commands

```bash
# Execute entire test suite
npm run test

# Run a specific test suite
npx tsx --test tests/community_preset.test.ts

# Run with verbose reporting
npx tsx --test --test-reporter=spec tests/**/*.test.ts
```

---

## 3. Coverage Areas & Test Suites

The test suite contains **63 automated tests across 19 suites**:

| Suite Name | Test File | Test Count | Key Invariants Verified |
| :--- | :--- | :---: | :--- |
| **Server API Contract & Route Protection** | `tests/api_server.test.ts` | 5 | Health check response contract, 400 validation error formatting, 3-category input validation, assistant prompt size ceiling (1000 chars), sliding-window rate limiter logic |
| **Community Event Preset Invariants** | `tests/community_preset.test.ts` | 5 | Problem statement community category conformance, budget limit preservation, capacity compliance, DAG acyclicity, demo vendor data quality |
| **Deterministic Budget Engine** | `tests/deterministic_engine.test.ts` | 2 | Expenditure summation, category allocation accuracy, over-budget detection |
| **Task Dependency Engine** | `tests/deterministic_engine.test.ts` | 3 | Prerequisite completion blocking, independent task execution, circular dependency detection |
| **Venue Capacity & Spatial Boundaries** | `tests/deterministic_engine.test.ts` | 3 | Headcount seating shortage detection, perimeter boundary enforcement, seating row contribution |
| **Crisis Simulation & Feasibility Engine** | `tests/deterministic_engine.test.ts` | 4 | Heavy rainstorm zone analysis, candidate plan generation, feasible plan state transition, infeasible plan blocking |
| **Event Rewind Engine** | `tests/deterministic_engine.test.ts` | 2 | Non-destructive rollback, differential version comparison |
| **Delay Cascade Propagation Engine** | `tests/deterministic_engine.test.ts` | 2 | Transitive slippage propagation, zero-downstream risk evaluation |
| **Savings Opportunities Engine** | `tests/deterministic_engine.test.ts` | 1 | Catering/decor savings discovery from expense distribution |
| **Multi-Category Event Presets** | `tests/deterministic_engine.test.ts` | 2 | Royal Wedding preset integrity, Milestone 50th Birthday preset integrity |
| **End-to-End Autonomous Event Lifecycle** | `tests/end_to_end_journey.test.ts` | 1 | Complete 7-stage event journey: creation → task delay cascade → vendor dropout → standby replacement → rain crisis → recovery plan → version 1 rewind |
| **Financial & Mathematical Invariants** | `tests/financial_invariants.test.ts` | 4 | Empty expense array safety, 1-unit deficit boundary flipping, category sum invariant, currency locale formatting |
| **Security Hardening & Injection Defense** | `tests/security_hardening.test.ts` | 4 | Multi-vector XSS sanitization, plan input script stripping, budget overflow rejection, AI output script sanitization |
| **State Persistence & Serialization** | `tests/storage_and_state.test.ts` | 3 | All 4 presets JSON round-trip serialization, corrupted storage resilience, deep snapshot isolation |
| **Task Cascade & Multi-Branch Dependency** | `tests/task_cascade.test.ts` | 7 | Diamond dependency graph propagation, orphaned dependency detection, 3-node cycle detection, overdue tasks, completion rate calculation |
| **Vendor Management & Standby Replacement** | `tests/vendor_and_security.test.ts` | 5 | Dropout simulation, standby mobilization with 10% SLA surcharge, vendor disruption rate calculation, data quality checks, budget sync |
| **Server-Side Input Validation & Security** | `tests/vendor_and_security.test.ts` | 3 | Compliant payload acceptance, out-of-range budget/attendance rejection, assistant context clamping |
| **Untrusted AI Response Sanitization** | `tests/vendor_and_security.test.ts` | 3 | Subtotal recalculation, >5% budget hallucination rejection, empty output rejection |
| **Version Monotonicity & Rollback Invariants**| `tests/version_invariants.test.ts` | 4 | Strict monotonic version incrementation, non-destructive history preservation, non-existent version error handling, deep snapshot diffing |

---

## 4. Actual Test Execution Output

```text
> celebraai@1.0.0 test
> tsx --test tests/**/*.test.ts

▶ CelebraAI Server API Contract & Route Protection Invariants
  ✔ health check contract delivers expected status, version, and uptime metadata (2.50ms)
  ✔ POST /api/plan rejects missing required fields and returns descriptive error list (1.91ms)
  ✔ POST /api/plan strictly validates all 3 problem statement categories: wedding, birthday, community (0.35ms)
  ✔ POST /api/assistant enforces strict prompt size ceiling (1000 chars) and grounds context (0.32ms)
  ✔ sliding-window rate limiter logic blocks burst excess and computes correct Retry-After (0.18ms)
✔ CelebraAI Server API Contract & Route Protection Invariants (6.83ms)

▶ CelebraAI Problem Statement: Community Event Preset Invariants
  ✔ creates a fully formed community event satisfying the core problem statement (3.27ms)
  ✔ community preset budget remains strictly within approved limit with contingency reserve (2.26ms)
  ✔ community venue capacity satisfies or exceeds expected attendance (1.53ms)
  ✔ community task dependency graph is acyclic and free of missing parent IDs (4.18ms)
  ✔ community vendors are all marked as demo entities and satisfy data constraints (0.66ms)
✔ CelebraAI Problem Statement: Community Event Preset Invariants (16.19ms)

▶ CelebraAI Deterministic Budget Engine
  ✔ correctly calculates total planned expenditure, category allocations, and remaining reserve (2.04ms)
  ✔ detects over-budget conditions accurately without silent truncation (1.52ms)
✔ CelebraAI Deterministic Budget Engine (7.35ms)

▶ CelebraAI Task Dependency Engine
  ✔ allows task completion when prerequisite is completed (2.67ms)
  ✔ blocks task completion if prerequisite is incomplete (0.36ms)
  ✔ detects circular dependencies in task graphs (0.69ms)
✔ CelebraAI Task Dependency Engine (4.40ms)

▶ CelebraAI Venue Capacity & Spatial Boundaries
  ✔ evaluates compliant seating and warns on capacity deficit (1.46ms)
  ✔ enforces spatial boundaries inside venue perimeter (0.44ms)
  ✔ evaluates seating_row objects as contributing to total venue capacity (0.27ms)
✔ CelebraAI Venue Capacity & Spatial Boundaries (2.64ms)

▶ CelebraAI Crisis Simulation & Feasibility Engine
  ✔ analyzes impact of heavy rain storm on outdoor zone (3.79ms)
  ✔ generates both feasible and infeasible candidate recovery plans (61.77ms)
  ✔ applying a feasible recovery plan transitions event state immutably and increments version (1.46ms)
  ✔ applying an infeasible recovery plan throws an error and is blocked (1.22ms)
✔ CelebraAI Crisis Simulation & Feasibility Engine (68.69ms)

▶ CelebraAI Event Rewind Engine
  ✔ restoring an earlier snapshot appends a new version without deleting history (1.46ms)
  ✔ compares differences between two versions accurately (1.80ms)
✔ CelebraAI Event Rewind Engine (3.51ms)

▶ CelebraAI Delay Cascade Propagation Engine
  ✔ propagates delay through transitive dependency chains (2.77ms)
  ✔ evaluates minor risk when no downstream tasks depend on the delayed item (0.57ms)
✔ CelebraAI Delay Cascade Propagation Engine (3.60ms)

▶ CelebraAI Savings Opportunities Engine
  ✔ identifies catering, decor, and equipment savings opportunities from expense distribution (4.32ms)
✔ CelebraAI Savings Opportunities Engine (4.46ms)

▶ CelebraAI Multi-Category Event Presets
  ✔ creates a valid Royal Wedding preset with complete venue, expenses, tasks, and schedule (1.42ms)
  ✔ creates a valid Milestone 50th Birthday preset with glasshouse venue layout (0.76ms)
✔ CelebraAI Multi-Category Event Presets (2.40ms)

▶ CelebraAI End-to-End Autonomous Event Lifecycle Journey
  ✔ executes complete 7-stage event journey with strict invariant preservation (86.38ms)
✔ CelebraAI End-to-End Autonomous Event Lifecycle Journey (87.68ms)

▶ CelebraAI Financial & Mathematical Invariants Engine
  ✔ handles empty expenses array safely without NaN or division by zero (1.86ms)
  ✔ boundary test: exactly 1 unit over budget flips isOverBudget with exact delta (0.42ms)
  ✔ sum of all category allocated expenditures strictly equals plannedExpenditure (0.50ms)
  ✔ currency formatter generates proper locale symbols and handles boundary amounts (116.82ms)
✔ CelebraAI Financial & Mathematical Invariants Engine (121.27ms)

▶ CelebraAI Security Hardening & Injection Defense Suite
  ✔ sanitizeString strips script tags, html elements, event handlers, and null bytes (1.93ms)
  ✔ validatePlanInput neutralizes script injection in event name and theme fields (1.19ms)
  ✔ validatePlanInput strictly rejects negative, NaN, and extreme overflow budgets (4.19ms)
  ✔ validateGeneratedAiPlan sanitizes negative unit costs and script tags in AI outputs (1.67ms)
✔ CelebraAI Security Hardening & Injection Defense Suite (13.30ms)

▶ CelebraAI State Persistence & Serialization Invariants
  ✔ all 4 event presets serialize and deserialize without loss of data integrity (7.28ms)
  ✔ resilience against corrupted or invalid storage data (1.57ms)
  ✔ version snapshots are fully isolated deep copies (5.47ms)
✔ CelebraAI State Persistence & Serialization Invariants (16.74ms)

▶ CelebraAI Task Cascade & Multi-Branch Dependency Propagation
  ✔ propagates delay through diamond dependency graph without duplicating affected tasks (1.79ms)
  ✔ detects orphaned dependencies when tasks reference non-existent parent IDs (0.67ms)
  ✔ detects complex 3-node circular dependency cycle (0.36ms)
  ✔ correctly identifies overdue tasks relative to reference date (1.90ms)
  ✔ computes accurate task completion rate across all status categories (0.57ms)
  ✔ canCompleteTask allows independent tasks without dependencies to complete immediately (0.38ms)
  ✔ canCompleteTask handles non-existent task ID gracefully (1.58ms)
✔ CelebraAI Task Cascade & Multi-Branch Dependency Propagation (9.97ms)

▶ CelebraAI Vendor Management & Standby Replacement Engine
  ✔ simulates vendor dropout with disruption reason and cancelled status (1.53ms)
  ✔ mobilizes standby partner with 10% SLA surcharge and confirmed status (0.28ms)
  ✔ calculates accurate aggregate vendor financials and disruption rate (0.29ms)
  ✔ validates vendor record data quality constraints (0.33ms)
  ✔ synchronizes vendor pricing adjustments into budget expense records (0.27ms)
✔ CelebraAI Vendor Management & Standby Replacement Engine (5.36ms)

▶ CelebraAI Server-Side Input Validation & Security Engine
  ✔ validates and sanitizes compliant event planning requests (0.48ms)
  ✔ rejects out-of-range budget, invalid category, and impossible attendance (3.90ms)
  ✔ validates contextual assistant input and clamps oversized prompts (0.74ms)
✔ CelebraAI Server-Side Input Validation & Security Engine (5.56ms)

▶ CelebraAI Untrusted AI Response Sanitization Engine
  ✔ accepts structured AI response and sanitizes expense subtotals (0.68ms)
  ✔ rejects AI output that exceeds total budget by >5% (0.30ms)
  ✔ rejects empty or corrupt AI output missing expenses (0.13ms)
✔ CelebraAI Untrusted AI Response Sanitization Engine (1.32ms)

▶ CelebraAI Version Monotonicity & Rollback Invariants
  ✔ creates immutable snapshots with strict version monotonicity (5.36ms)
  ✔ restoring an earlier snapshot appends a new version without deleting history (1.97ms)
  ✔ throws descriptive error when attempting to restore non-existent version ID (1.19ms)
  ✔ computes deep differential comparison accurately between two version snapshots (21.60ms)
✔ CelebraAI Version Monotonicity & Rollback Invariants (32.04ms)

ℹ tests 63
ℹ suites 19
ℹ pass 63
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1265.1391
```

---

## 5. Known Testing Limits & Future Work

1. **Headless Browser WebGL Testing**:
   Three.js canvas rendering is verified via unit evaluations in `tests/deterministic_engine.test.ts` (bounds checks, coordinate calculations, seating capacities). Automated headless Chromium screenshot regression testing (via Puppeteer/Playwright) is not currently part of the unit test run to keep local and CI execution sub-second without requiring GPU emulation packages.
2. **Live Gemini Quota Testing**:
   Live calls to `gemini-2.5-flash` are tested interactively and manually during development, but automated CI tests mock the Gemini response using `validateGeneratedAiPlan` to guarantee zero test flakiness and zero API cost during automated commits.
