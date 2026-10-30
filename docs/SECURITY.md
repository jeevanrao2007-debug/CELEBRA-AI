# CelebraAI — Security Architecture & Hardening Report

This document details the implemented security controls, input validation mechanisms, defense-in-depth posture, and independent verification procedures across the CelebraAI codebase.

---

## 1. Implemented Security Controls

### A. Server-Side Secret Handling & Zero Client Leakage
- **Mechanism**: The Gemini API key (`GEMINI_API_KEY`) is strictly confined to server-side Node.js execution in [`server.ts`](../server.ts).
- **Enforcement**:
  - The client application bundle contains zero references to API keys or secrets.
  - `.env` is explicitly ignored in [`.gitignore`](../.gitignore).
  - [`.env.example`](../.env.example) contains only non-sensitive placeholder variables.
  - Client components communicate exclusively with `/api/plan` and `/api/assistant` endpoints hosted on the server.

### B. Comprehensive HTTP Security Headers
Every HTTP response issued by [`server.ts`](../server.ts) applies strict security headers:
- `Content-Security-Policy`: Restricts scripts to `'self'` and `'unsafe-inline'`; restricts connect destinations to `'self'` and Google Generative Language API; restricts styles to Google Fonts; restricts objects (`object-src 'none'`).
- `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing attacks.
- `X-Frame-Options: SAMEORIGIN`: Protects against clickjacking and frame embedding.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`: Enforces HTTPS for all client connections.
- `Referrer-Policy: strict-origin-when-cross-origin`: Restricts referrer data leakage across origins.
- `Cross-Origin-Opener-Policy: same-origin`: Isolates the browsing context.
- `Cross-Origin-Resource-Policy: same-origin`: Blocks cross-origin resource reads.
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`: Completely disables unneeded browser APIs.

### C. Tiered Sliding-Window Rate Limiting
Implemented in [`server.ts`](../server.ts) via `createRateLimiter`:
- **General API Limiter**: Enforces a maximum of 60 requests per minute per IP on all `/api/*` endpoints.
- **AI Plan Generation Limiter**: Enforces a strict limit of 10 requests per minute per IP on `/api/plan` to prevent API quota depletion and abuse.
- **429 Handling**: Automatically computes and transmits the `Retry-After` response header indicating seconds remaining in the sliding window.

### D. Input Validation & OWASP Sanitization
Implemented in [`src/logic/validationEngine.ts`](../src/logic/validationEngine.ts):
- **String Sanitization (`sanitizeString`)**:
  - Strips HTML tags (`<...>` regex).
  - Neutralizes `<script>` tags and executable scripts.
  - Strips `javascript:` pseudo-protocols.
  - Strips DOM inline event handlers (`onload=`, `onerror=`, `onclick=`).
  - Strips null byte injections (`\0`).
  - Enforces field-specific maximum character lengths.
- **Plan Input Validation (`validatePlanInput`)**:
  - Validates event category against allowed whitelist (`wedding`, `birthday`, `community`, `college_fest`).
  - Validates attendance strictly between 1 and 50,000 guests.
  - Validates total budget strictly between ₹1,000 and ₹100,000,000.
  - Validates currency against allowed whitelist (`INR`, `USD`, `EUR`, `GBP`).
- **Contextual Assistant Validation (`validateAssistantInput`)**:
  - Clamps user prompts to a hard maximum of 1,000 characters.
  - Sanitizes all bounded context parameters passed from the client.

### E. Untrusted AI Output Sanitization
Implemented in [`validateGeneratedAiPlan`](../src/logic/validationEngine.ts):
- AI outputs are treated as untrusted data.
- Enforces array structure for expenses, layout objects, and tasks.
- Recalculates subtotal (`quantity * unitCost`) deterministically on the server.
- Guards against hallucinated expenses exceeding the authorized budget ceiling by more than 5%.
- Assigns deterministic fallback IDs and status values if omitted.

### F. Sanitized Error Logging
In [`server.ts`](../server.ts):
- Unhandled errors and AI API failures log only `err instanceof Error ? err.message : String(err)`.
- Client request bodies, authorization tokens, or internal stack traces are never dumped into server logs.
- Express body parser enforces a strict request body size limit of 512KB (`express.json({ limit: '512kb' })`), returning `413 Payload Too Large` to prevent memory exhaustion.

---

## 2. Source Code References

| Control | Implementation File | Function / Middleware |
| :--- | :--- | :--- |
| Security Headers | [`server.ts`](../server.ts#L32-L48) | Express middleware |
| Rate Limiting | [`server.ts`](../server.ts#L59-L101) | `createRateLimiter`, `generalApiLimiter`, `planApiLimiter` |
| Health Probe | [`server.ts`](../server.ts#L103-L115) | `GET /api/health` |
| String Sanitization | [`src/logic/validationEngine.ts`](../src/logic/validationEngine.ts#L57-L67) | `sanitizeString()` |
| Plan Input Validation | [`src/logic/validationEngine.ts`](../src/logic/validationEngine.ts#L72-L150) | `validatePlanInput()` |
| Assistant Prompt Clamping | [`src/logic/validationEngine.ts`](../src/logic/validationEngine.ts#L158-L203) | `validateAssistantInput()` |
| AI Output Validation | [`src/logic/validationEngine.ts`](../src/logic/validationEngine.ts#L247-L380) | `validateGeneratedAiPlan()` |
| Safe Error Logging | [`server.ts`](../server.ts#L220-L290) | Express error handler & route try/catch |

---

## 3. Related Automated Tests

The following test suites verify security controls:

1. **`tests/security_hardening.test.ts`**:
   - `sanitizeString strips script tags, html elements, event handlers, and null bytes`
   - `validatePlanInput neutralizes script injection in event name and theme fields`
   - `validatePlanInput strictly rejects negative, NaN, and extreme overflow budgets`
   - `validateGeneratedAiPlan sanitizes negative unit costs and script tags in AI outputs`

2. **`tests/api_server.test.ts`**:
   - `health check contract delivers expected status, version, and uptime metadata`
   - `POST /api/plan rejects missing required fields and returns descriptive error list`
   - `POST /api/plan strictly validates all 3 problem statement categories: wedding, birthday, community`
   - `POST /api/assistant enforces strict prompt size ceiling (1000 chars) and grounds context`
   - `sliding-window rate limiter logic blocks burst excess and computes correct Retry-After`

3. **`tests/vendor_and_security.test.ts`**:
   - `validates and sanitizes compliant event planning requests`
   - `rejects out-of-range budget, invalid category, and impossible attendance`
   - `validates contextual assistant input and clamps oversized prompts`
   - `rejects AI output that exceeds total budget by >5%`

---

## 4. Verification Commands & Actual Results

### Dependency Vulnerability Audit
```powershell
npm audit
```
**Actual Result**:
```text
found 0 vulnerabilities
```

### Static TypeScript Analysis
```powershell
npm run lint
```
**Actual Result**:
```text
> celebraai@1.0.0 lint
> tsc --noEmit
# Exit code: 0
```

### Security Test Suites Execution
```powershell
npx tsx --test tests/security_hardening.test.ts tests/api_server.test.ts
```
**Actual Result**:
```text
✔ CelebraAI Security Hardening & Injection Defense Suite (8.73ms)
✔ CelebraAI Server API Contract & Route Protection Invariants (6.82ms)
ℹ tests 9
ℹ suites 2
ℹ pass 9
ℹ fail 0
```

---

## 5. Transparent Risk Assessment & Remaining Considerations

1. **Single-Node In-Memory Rate Limiting**:
   - The rate limiter uses an in-memory `Map`. For multi-container autoscaling deployments (e.g. multiple Cloud Run instances behind a load balancer), rate-limiting state should be moved to an external Redis or Upstash store. For single-instance web services (such as Render), the current in-memory implementation is fully effective.
2. **Local Client State Storage**:
   - Client event states are cached in `localStorage` under the key `celebraai_events_store_v1`. While convenient for zero-login multi-session planning, `localStorage` is accessible to browser scripts. The strict Content Security Policy mitigates the risk of unauthorized third-party script execution.
3. **Deterministic Fallback vs Live AI Availability**:
   - When no `GEMINI_API_KEY` is configured or when network connectivity to Google Generative Language API is lost, the server cleanly returns fallback notices and the client switches to deterministic procedural plan generation. This is by design to ensure the application never hard-fails or crashes during demonstrations.
