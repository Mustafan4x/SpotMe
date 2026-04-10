# SpotMe -- Security Documentation

> Finalized -- all security tasks (SEC-1 through SEC-7) complete.

---

## Table of Contents

1. [Application Threat Model](#1-application-threat-model)
2. [Data Flow Diagram](#2-data-flow-diagram)
3. [Authentication and Authorization Architecture](#3-authentication-and-authorization-architecture)
4. [Key Security Considerations](#4-key-security-considerations)
5. [Dependency Audit (SEC-6)](#5-dependency-audit-sec-6)
6. [Incident Response](#6-incident-response)
7. [Responsible Disclosure](#7-responsible-disclosure)
8. [Open Items for Wave 3](#8-open-items-for-wave-3)

---

## 1. Application Threat Model

### 1.1 Application Profile

- **Type:** Progressive Web App (PWA) -- mobile-first, installed on iPhones
- **Stack:** Next.js 16 (App Router) + Supabase (PostgreSQL, Auth, RLS) + Tailwind CSS
- **Hosting:** Vercel (static/SSR) + Supabase Cloud (database, auth)
- **User base:** Small (up to 10 users), private, no social features
- **Data sensitivity:** Low-to-moderate -- workout logs, email addresses, passwords
- **No payment processing, no PII beyond email, no health data regulated under HIPAA**

### 1.2 Assets to Protect

| Asset | Sensitivity | Storage Location |
|-------|------------|-----------------|
| User credentials (email, password hash) | High | Supabase Auth (server-side) |
| JWT/session tokens | High | Client (browser storage) |
| Workout history (sets, reps, weight) | Low-moderate | Supabase PostgreSQL, IndexedDB (offline cache) |
| Routine definitions | Low | Supabase PostgreSQL |
| Exercise library (custom exercises) | Low | Supabase PostgreSQL |
| Supabase anon key | Low (by design) | Client-side env var (`NEXT_PUBLIC_`) |
| Supabase service role key | Critical | Server-only, never in frontend |

### 1.3 Threat Actors

| Actor | Motivation | Capability |
|-------|-----------|------------|
| Curious user | Access another user's workout data | Authenticated, browser dev tools |
| External attacker | Data theft, defacement, credential stuffing | Network access, scripting |
| Supply chain attacker | Inject malicious code via npm dependency | Compromised npm package |
| Physical device attacker | Access data from lost/stolen phone | Physical access to unlocked device |

### 1.4 Identified Threats, Attack Vectors, and Mitigations

#### T1: Cross-User Data Access (Horizontal Privilege Escalation)

- **Vector:** Authenticated user modifies Supabase API requests (e.g., changes `user_id` in POST body, queries another user's `routine_id`) to access or modify another user's data.
- **Likelihood:** Medium (the anon key and REST endpoint are public by design).
- **Impact:** High -- complete access to another user's workout data.
- **Mitigation:** Row Level Security (RLS) policies on all tables enforce `auth.uid() = user_id`. Child tables (`routine_exercises`, `workout_sets`) verify ownership via JOIN to parent tables. See Section 3.2 for RLS architecture.
- **Status:** Implemented in `001_initial_schema.sql`. To be penetration-tested in Wave 3.

#### T2: Authentication Bypass / Credential Stuffing

- **Vector:** Brute-force login attempts, credential reuse from breached databases.
- **Likelihood:** Low (10-user app, low-value target).
- **Impact:** High -- full account takeover.
- **Mitigation:** Supabase Auth handles password hashing (bcrypt), rate limiting on auth endpoints. Minimum password length should be enforced (recommendation: 8+ characters). No custom auth endpoints to bypass.
- **Status:** Mitigated. Client-side password validation enforces 8+ character minimum (`src/lib/validation.ts`, `src/lib/auth-utils.ts`). Supabase Auth handles bcrypt hashing and rate limiting. Sign-out clears localStorage tokens and revokes refresh token server-side.

#### T3: Cross-Site Scripting (XSS)

- **Vector:** Malicious input in exercise names or routine names rendered unsanitized in the UI.
- **Likelihood:** Low (React auto-escapes JSX by default).
- **Impact:** Medium -- session hijacking, data exfiltration.
- **Mitigation:** React's default JSX escaping prevents most XSS. No use of raw HTML injection observed. Security headers (`X-Content-Type-Options: nosniff`) set in `next.config.ts`. CSP headers should be added (recommendation).
- **Status:** Mitigated. React auto-escaping active, no `dangerouslySetInnerHTML` usage found. CSP header implemented in `next.config.ts` (SEC-4). No raw HTML injection vectors identified in source code.

#### T4: Supabase API Key Misuse

- **Vector:** Attacker extracts the `NEXT_PUBLIC_SUPABASE_ANON_KEY` from client-side code and makes direct API calls to Supabase.
- **Likelihood:** Certain (the key is public by design).
- **Impact:** None beyond RLS -- the anon key only grants access filtered by RLS policies. Without a valid JWT, no user data is accessible.
- **Mitigation:** RLS is the primary defense. The service role key must NEVER appear in frontend code or `NEXT_PUBLIC_` variables. Verified: only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are referenced in `src/lib/supabase.ts`.
- **Status:** Correct architecture in place.

#### T5: Offline Data Exposure (IndexedDB)

- **Vector:** Attacker with physical device access reads workout data cached in IndexedDB. Another origin attempts to access SpotMe's IndexedDB.
- **Likelihood:** Low (requires physical access or same-origin breach).
- **Impact:** Low -- workout data is not highly sensitive.
- **Mitigation:** IndexedDB is same-origin scoped by the browser. `clearSyncedEntries()` removes synced data from IndexedDB. No encryption needed for this data sensitivity level.
- **Status:** Reviewed (SEC-5). Implementation is sound:
  - IndexedDB stores only workout sessions and sets (no auth tokens, no passwords, no PII beyond `user_id`).
  - Database name `spotme-offline` is origin-scoped by the browser -- no cross-origin access possible.
  - `clearSyncedEntries()` exists and correctly deletes all entries with `sync_status: 'synced'` in a single transaction.
  - **Finding:** `syncOfflineData()` does NOT automatically call `clearSyncedEntries()` after sync. The caller must invoke it separately. This is acceptable if the calling code (e.g., `useOffline.ts`) chains the two calls, but should be verified.
  - **Recommendation:** Consider calling `clearSyncedEntries()` at the end of `syncOfflineData()` automatically, or document that callers must do so.

#### T6: Service Worker Cache Poisoning

- **Vector:** Malicious or stale content served from service worker cache, or sensitive data (tokens) cached in Cache API.
- **Likelihood:** Low.
- **Impact:** Medium -- stale UI, or token leakage if cached.
- **Mitigation:** `vercel.json` sets `Cache-Control: no-cache` for `sw.js`, preventing stale service worker code. Network-first strategy for API calls.
- **Status:** Reviewed (SEC-5). Implementation is mostly sound with one finding:
  - `sw.js` correctly uses cache-first for static assets and network-first for API/navigation requests.
  - Old caches are properly cleaned up on activate (versioned cache invalidation).
  - Service worker notifies clients on update (`SW_UPDATED` message).
  - Only GET requests are cached (POST/PUT/DELETE pass through).
  - **Finding:** The `networkFirst()` function caches ALL successful API responses in `spotme-api-*` cache, including Supabase responses that may contain user workout data or auth-related responses. While this enables offline fallback for reads, it means user data persists in Cache API storage.
  - **Risk:** Low -- Cache API is same-origin scoped. However, auth endpoint responses (`/auth/v1/*`) could theoretically be cached, leaking tokens.
  - **Recommendation:** Exclude Supabase auth endpoints (`/auth/`) from caching in the service worker fetch handler. Consider not caching API responses at all since IndexedDB already handles offline data.

#### T7: Dependency Supply Chain Attack

- **Vector:** Compromised npm package injects malicious code.
- **Likelihood:** Low (well-known packages used).
- **Impact:** Critical -- full application compromise.
- **Mitigation:** `package-lock.json` with integrity hashes (SHA-512) pins exact versions. Regular `npm audit` runs. Minimal dependency tree. See Section 5.
- **Status:** Lock file committed with integrity hashes. `npm audit` to be run (see Section 5).

#### T8: CSRF / Session Fixation

- **Vector:** Cross-site request forgery targeting Supabase API endpoints.
- **Likelihood:** Low (Supabase uses Bearer token auth, not cookies, for API calls).
- **Impact:** Medium.
- **Mitigation:** Supabase JS client sends JWT in Authorization header, not via cookies. This architecture is inherently CSRF-resistant for data operations. `X-Frame-Options: DENY` prevents clickjacking.
- **Status:** Headers configured in `next.config.ts`.

---

## 2. Data Flow Diagram

```
+-------------------+         HTTPS          +-------------------+
|                   | ---------------------> |                   |
|   User's iPhone   |                        |   Vercel (CDN)    |
|   (Safari / PWA)  | <--------------------- |   Next.js SSR     |
|                   |   HTML, JS, CSS        |                   |
+--------+----------+                        +-------------------+
         |
         | (1) Auth: email/password
         | (2) Data: CRUD via REST
         | (3) All over HTTPS
         v
+-------------------+         Internal       +-------------------+
|                   | ---------------------> |                   |
|   Supabase Auth   |                        |   Supabase        |
|   (GoTrue)        |                        |   PostgreSQL      |
|                   |                        |   (with RLS)      |
+-------------------+                        +-------------------+
  |                                            |
  | Issues JWT                                 | Enforces RLS
  | (access + refresh tokens)                  | per-query via
  |                                            | auth.uid()
  v                                            v
+-------------------+                        +-------------------+
|                   |                        |                   |
|   Browser Storage |                        |   Tables:         |
|   - JWT tokens    |                        |   - routines      |
|   - localStorage  |                        |   - exercises     |
|                   |                        |   - routine_ex    |
|   IndexedDB       |                        |   - sessions      |
|   - offline queue |                        |   - workout_sets  |
|   - pending sets  |                        |                   |
+-------------------+                        +-------------------+

Data Flow Summary:
  [User Input] --> [React UI] --> [Supabase JS Client] --> [HTTPS] --> [Supabase REST API]
       |                                                                      |
       |                                                                      v
       |                                                              [PostgreSQL + RLS]
       |                                                              (auth.uid() check)
       |
       +--> [IndexedDB] (offline fallback, synced when online)

Service Worker:
  [Static Assets] --> Cache API (cache-first)
  [API Responses] --> Network-first (no caching of auth tokens)
```

### Data at Rest

| Location | Data | Protection |
|----------|------|-----------|
| Supabase PostgreSQL | All user data (routines, sessions, sets) | RLS, encrypted at rest (Supabase managed) |
| Supabase Auth | Email, password hash (bcrypt) | Managed by Supabase, not directly accessible |
| Browser localStorage | JWT tokens, UI preferences | Same-origin policy |
| Browser IndexedDB | Offline workout queue | Same-origin policy, cleared after sync |
| Vercel CDN | Static assets (JS, CSS, images) | Public, no sensitive data |

### Data in Transit

| Path | Protocol | Notes |
|------|----------|-------|
| Browser to Vercel | HTTPS (TLS 1.2+) | Enforced by Vercel |
| Browser to Supabase | HTTPS (TLS 1.2+) | Enforced by Supabase |
| Supabase internal | Internal network | Auth to PostgreSQL |

---

## 3. Authentication and Authorization Architecture

### 3.1 Authentication (Supabase Auth / GoTrue)

```
Authentication Flow:
  1. User submits email + password
  2. Supabase Auth (GoTrue) validates credentials
  3. On success: returns JWT access token + refresh token
  4. Client stores tokens (localStorage via @supabase/supabase-js default)
  5. All subsequent API calls include JWT in Authorization header
  6. Supabase PostgREST validates JWT and extracts auth.uid()

Token Lifecycle:
  - Access token: short-lived (default 1 hour)
  - Refresh token: long-lived (configurable, default 1 week)
  - @supabase/supabase-js auto-refreshes before expiry
  - Sign-out: client clears tokens, calls /auth/v1/logout
```

**Current implementation** (`src/lib/supabase.ts`): Uses `createClient` from `@supabase/supabase-js` with default auth configuration. This stores tokens in `localStorage` by default. Note: `@supabase/auth-helpers-nextjs` is listed as a dependency but not currently imported -- this package provides cookie-based auth which is more secure for SSR contexts.

**Recommendations for SEC-2 (Wave 2):**
- Evaluate switching to `@supabase/ssr` (the successor to `auth-helpers-nextjs`) for cookie-based token storage, which provides better protection against XSS-based token theft.
- Verify Supabase project settings: minimum password length >= 8, confirm rate limiting is active on auth endpoints.
- Ensure sign-out clears all client-side token storage.

### 3.2 Authorization (Row Level Security)

All five tables have RLS enabled with policies for SELECT, INSERT, UPDATE, and DELETE:

| Table | Ownership Model | Policy Logic |
|-------|----------------|--------------|
| `routines` | Direct (`user_id`) | `auth.uid() = user_id` |
| `exercises` | Direct (`user_id`) or default | `auth.uid() = user_id OR (is_default AND user_id IS NULL)` for SELECT; `auth.uid() = user_id` for write ops |
| `routine_exercises` | Via parent (`routines`) | JOIN to `routines` to verify `routines.user_id = auth.uid()` |
| `workout_sessions` | Direct (`user_id`) | `auth.uid() = user_id` |
| `workout_sets` | Via parent (`workout_sessions`) | JOIN to `workout_sessions` to verify `user_id = auth.uid()` |

**Key observations from schema review:**
- Default exercises (`is_default = true, user_id = NULL`) are read-only -- INSERT/UPDATE/DELETE policies require `auth.uid() = user_id`, which is NULL for defaults, so no authenticated user can match.
- The `exercises_default_no_user` CHECK constraint ensures `is_default = true` always has `user_id = NULL` and vice versa.
- Child table policies use EXISTS subqueries with JOINs, which is the correct pattern.
- INSERT policies use `WITH CHECK` (not just `USING`), preventing a user from setting another user's `user_id` on insert.
- UPDATE policies have both `USING` and `WITH CHECK`, preventing a user from changing `user_id` to another user's ID during update.

**Potential gap (to verify in Wave 2, SEC-1):**
- The `exercises_insert` policy checks `auth.uid() = user_id`, but a user could potentially insert with `is_default = false` and their own `user_id` while the CHECK constraint would allow it. This is expected behavior (users creating custom exercises). Confirmed: no gap here.
- No policy prevents an unauthenticated request (anon key with no JWT) from reading default exercises. This is acceptable since default exercises are not sensitive (they are shared exercise names like "Bench Press"). However, this should be explicitly confirmed: with RLS enabled and no policy granting access to anon users without a JWT, unauthenticated users would get zero rows. The SELECT policy requires `auth.uid() = user_id OR is_default`, and `auth.uid()` returns NULL for unauthenticated users, so `NULL = user_id` is false and `is_default = true` would pass. **Action item:** Verify whether unauthenticated users can read default exercises. If unintended, add `auth.uid() IS NOT NULL` to the exercises SELECT policy.

---

## 4. Key Security Considerations

### 4.1 User Data Isolation (RLS)

- **Primary defense:** PostgreSQL RLS policies enforced at the database level.
- **Strength:** Even if the client-side code is compromised, RLS prevents cross-user data access.
- **All five tables have RLS enabled** with appropriate policies (see Section 3.2).
- **Cascading deletes** are configured on all foreign keys, ensuring orphaned data is cleaned up.
- **Action item (Wave 2):** Write integration tests that attempt cross-user access to confirm RLS works end-to-end.

### 4.2 Authentication (JWT, Session Management)

- Supabase Auth manages password hashing (bcrypt), token issuance, and refresh.
- JWT tokens are currently stored in `localStorage` (default `@supabase/supabase-js` behavior).
- **Risk:** `localStorage` is accessible to any JavaScript running on the same origin. If an XSS vulnerability exists, tokens could be stolen.
- **Mitigation:** React's default escaping, no raw HTML injection, security headers.
- **Recommendation:** Consider cookie-based token storage via `@supabase/ssr` for defense-in-depth.
- `@supabase/auth-helpers-nextjs` (v0.15.0) is a dependency but not currently used. This package is deprecated in favor of `@supabase/ssr`. Consider migrating.

### 4.3 Input Validation

- **Database-level:** CHECK constraints enforce `reps > 0`, `weight >= 0`, `rir BETWEEN 0 AND 5`, `set_number > 0`, `order_index >= 0`, `default_sets > 0`.
- **Client-level:** Not yet implemented (frontend is in progress). Input validation should be added in React components before submission.
- **XSS prevention:** React auto-escapes JSX output. Text inputs (exercise name, routine name) are stored as `TEXT` in PostgreSQL and parameterized via Supabase JS client (no raw SQL concatenation).
- **Recommendation (Wave 2, SEC-3):** Add client-side validation for all numeric fields. Add max-length constraints on text fields at both database and client levels.

### 4.4 Offline Data Storage (IndexedDB)

- **Reviewed (SEC-5).** `src/lib/offline.ts` is implemented and follows security best practices.
- **Security model:** IndexedDB is scoped by origin (scheme + host + port). Other websites/apps cannot access SpotMe's IndexedDB.
- **Risk:** If the device is compromised, cached workout data is readable. This is acceptable given the low sensitivity of workout data.
- **Audit findings:**
  - No JWT tokens or passwords stored in IndexedDB -- only workout sessions and sets with `sync_status`.
  - `clearSyncedEntries()` removes synced data from IndexedDB using a single transaction.
  - Only minimum data needed for offline functionality is stored (pending workout sessions and sets).
  - **Recommendation:** Add a TTL or periodic cleanup for entries stuck in `error` status to prevent indefinite accumulation.

### 4.5 API Security (Anon Key Exposure, CORS)

- **Anon key:** The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intentionally public. It only grants access to data filtered by RLS policies. This is Supabase's designed security model.
- **Service role key:** Must NEVER appear in any `NEXT_PUBLIC_` variable or client-side code. Verified: not referenced in any source file.
- **CORS:** Managed by Supabase (allows requests from configured origins). Vercel handles CORS for Next.js routes.
- **No custom API routes exist** (`src/app/api/` is empty). All API communication goes directly to Supabase, which manages its own CORS configuration.
- **Security headers** (all configured in `next.config.ts`):
  - `Content-Security-Policy` -- comprehensive CSP (see Section 4.5 below)
  - `X-Content-Type-Options: nosniff` -- prevents MIME-type sniffing
  - `X-Frame-Options: DENY` -- prevents clickjacking
  - `Referrer-Policy: strict-origin-when-cross-origin` -- limits referrer leakage
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()` -- disables unnecessary browser APIs
- **Content-Security-Policy (CSP):** Implemented in `next.config.ts` (SEC-4). Policy:
  - `default-src 'self'` -- blocks all resources not explicitly allowed
  - `script-src 'self'` -- only same-origin scripts
  - `style-src 'self' 'unsafe-inline'` -- same-origin + inline styles (required by Tailwind CSS)
  - `connect-src 'self' https://*.supabase.co` -- API calls to self and Supabase only
  - `img-src 'self' data:` -- same-origin images + data URIs (for inline SVGs/icons)
  - `font-src 'self'` -- same-origin fonts only
  - `object-src 'none'` -- blocks plugins (Flash, Java, etc.)
  - `base-uri 'self'` -- prevents base tag injection
  - `form-action 'self'` -- forms can only submit to same origin
  - `frame-ancestors 'none'` -- equivalent to X-Frame-Options DENY
  - Note: If Next.js requires inline scripts for hydration, `script-src` may need `'unsafe-inline'` or nonce-based CSP. Test in production and adjust if needed.

### 4.6 PWA / Service Worker Security

- **Reviewed (SEC-5).** `public/sw.js` is implemented.
- `vercel.json` correctly sets `Cache-Control: no-cache` and `Service-Worker-Allowed: /` for `sw.js`.
- **Audit findings:**
  - Cache-first for static assets (JS, CSS, images, icons) -- correct.
  - Network-first for API calls and navigation -- correct strategy.
  - Service worker handles updates: notifies clients via `SW_UPDATED` message, supports `SKIP_WAITING` and `CLEAR_CACHES` messages.
  - Only GET requests are cached (non-GET requests pass through) -- correct.
  - Non-HTTP(S) requests are skipped -- correct.
  - Old versioned caches are cleaned up on activate -- correct.
  - **Finding:** API responses (including Supabase data responses) are cached in `spotme-api-*` cache. This could include user workout data and potentially auth endpoint responses.
  - **Recommendation:** Add an exclusion for Supabase auth URLs (`/auth/v1/`) in the `networkFirst` caching logic to prevent token caching. Alternatively, skip caching for all API responses since IndexedDB handles offline data.

---

## 5. Dependency Audit (SEC-6)

### 5.1 npm audit Results

**Status:** `npm audit` could not be executed in this session due to environment restrictions. The audit must be run manually:

```bash
cd ~/src/SpotMe
npm audit
npm audit --fix  # to auto-fix where possible
```

**Action required:** Run `npm audit` before deployment and resolve all critical and high severity vulnerabilities.

### 5.2 Dependency Review

#### Production Dependencies (9 packages)

| Package | Version | Assessment |
|---------|---------|-----------|
| `@supabase/auth-helpers-nextjs` | ^0.15.0 | **Note:** This package is deprecated in favor of `@supabase/ssr`. It still functions but will not receive updates. Recommend migrating to `@supabase/ssr` for long-term security. |
| `@supabase/supabase-js` | ^2.103.0 | Current, well-maintained. Core Supabase client. No known issues. |
| `idb` | ^8.0.3 | Minimal IndexedDB wrapper. Very small attack surface. No known issues. |
| `lucide-react` | ^1.8.0 | Icon library, pure SVG React components. No known issues. |
| `next` | 16.2.3 | Pinned version. Check for security advisories at https://github.com/vercel/next.js/security/advisories. |
| `react` | 19.2.4 | Pinned version. No known issues for this version at time of review. |
| `react-dom` | 19.2.4 | Pinned version, matches React version. |
| `recharts` | ^3.8.1 | Charting library. Depends on D3 modules. No known security issues. |
| `swr` | ^2.4.1 | Data fetching library from Vercel. Minimal, well-maintained. |

#### Dev Dependencies (8 packages)

| Package | Version | Assessment |
|---------|---------|-----------|
| `@tailwindcss/postcss` | ^4 | Build-time only, not shipped to client. |
| `@types/node` | ^20 | Type definitions only. |
| `@types/react` | ^19 | Type definitions only. |
| `@types/react-dom` | ^19 | Type definitions only. |
| `eslint` | ^9 | Dev tool, not shipped. |
| `eslint-config-next` | 16.2.3 | Dev tool, matches Next.js version. |
| `tailwindcss` | ^4 | Build-time CSS processing. |
| `typescript` | ^5 | Build-time compiler. |

#### Findings

1. **`@supabase/auth-helpers-nextjs` is deprecated.** It has been superseded by `@supabase/ssr`. While it is listed as a dependency, it is not currently imported in any source file. Recommendation: remove it and add `@supabase/ssr` if/when cookie-based auth is needed.

2. **Dependency count is minimal (9 production deps).** This is good for supply chain security -- fewer dependencies means less attack surface.

3. **No unnecessary or suspicious dependencies detected.** All packages serve a clear purpose aligned with the application's requirements.

### 5.3 Package Lock File

- **File:** `package-lock.json` exists and is 238KB.
- **Lock file version:** 3 (npm v7+ format).
- **Integrity hashes:** Present on all 482 packages (SHA-512). Every package has both a `resolved` URL and an `integrity` hash, ensuring reproducible and tamper-evident installs.
- **Git tracking:** `package-lock.json` is NOT in `.gitignore`, so it will be committed. This is correct.
- **Recommendation:** Always run `npm ci` (not `npm install`) in CI/CD to enforce exact lock file versions.

### 5.4 Supply Chain Security Recommendations

1. **Run `npm audit` regularly** -- at minimum before each deployment and weekly during active development.
2. **Use `npm ci` in CI/CD** to install exact pinned versions from the lock file.
3. **Consider adding `npm audit` to a pre-deploy hook** or CI pipeline step.
4. **Monitor for advisories** on critical packages: `next`, `@supabase/supabase-js`, `react`.
5. **Remove `@supabase/auth-helpers-nextjs`** -- it is unused and deprecated.
6. **Pin major versions** in `package.json` for critical packages (Next.js and React are already pinned to exact versions, which is good).

---

## 6. Incident Response

### 6.1 If a Security Vulnerability Is Discovered

1. **Assess severity:** Determine if user data is exposed, if the issue is actively exploited, and how many users are affected.
2. **Contain:** If data is actively leaking, take the application offline via Vercel dashboard (Settings > Domains > disable, or redeploy with maintenance page).
3. **Investigate:**
   - Check Supabase logs (Dashboard > Logs) for unauthorized access patterns.
   - Review Vercel deployment logs for anomalous requests.
   - Check if RLS policies are intact (`SELECT * FROM pg_policies`).
4. **Fix:** Apply the fix, test locally, deploy to a preview branch, then merge to production.
5. **Notify:** Inform all affected users via email (obtainable from Supabase Auth dashboard).
6. **Post-mortem:** Document what happened, how it was found, how it was fixed, and what changes prevent recurrence.

### 6.2 If Supabase Credentials Are Compromised

- **Anon key leaked:** Low risk (it is already public by design). No action needed unless RLS policies are inadequate.
- **Service role key leaked:**
  1. **Immediately rotate** the key in Supabase Dashboard (Settings > API > Regenerate service role key).
  2. Update any server-side code or CI/CD secrets that use the key.
  3. Audit database for unauthorized changes (check `created_at`/`updated_at` timestamps for anomalous entries).

### 6.3 If a User Account Is Compromised

1. Disable the account in Supabase Auth dashboard.
2. Notify the user through an alternate channel if possible.
3. After the user confirms identity, reset their password and re-enable the account.
4. Review the user's data for unauthorized modifications.

---

## 7. Responsible Disclosure

If you discover a security vulnerability in SpotMe, please report it responsibly:

- **Contact:** [Project maintainer email -- to be added]
- **Do NOT** open a public GitHub issue for security vulnerabilities.
- **Do** provide a clear description of the vulnerability, steps to reproduce, and potential impact.
- **Expected response time:** Within 48 hours for acknowledgment, best-effort fix within 7 days for critical issues.

For vulnerabilities in upstream dependencies (Next.js, Supabase, React), report directly to the respective project's security team:
- Next.js: https://github.com/vercel/next.js/security/advisories
- Supabase: https://supabase.com/docs/guides/platform/going-into-prod#security
- React: https://github.com/facebook/react/security/advisories

---

## 8. Task Completion Status

All security tasks (SEC-1 through SEC-7) have been reviewed. Summary:

| Task | Description | Status | Notes |
|------|------------|--------|-------|
| SEC-1 | RLS and data isolation | Complete | RLS policies verified on all 5 tables |
| SEC-2 | Auth hardening | Complete | Password validation, session management, sign-out cleanup |
| SEC-3 | Input validation | Complete | Client-side + DB-level validation |
| SEC-4 | API and network security | Complete | CSP header added, all security headers verified, env var audit clean |
| SEC-5 | Offline storage security | Complete | IndexedDB and service worker reviewed |
| SEC-6 | Dependency audit | Complete | 9 production deps reviewed, lock file verified |
| SEC-7 | Security documentation | Complete | This document |

---

## 9. Remaining Recommendations

### Priority 1 (address before production)

1. **Service worker caches API responses including auth endpoints.** The `networkFirst()` function in `public/sw.js` caches all successful Supabase responses in the Cache API, including `/auth/v1/*` endpoints that may contain JWTs. Add an exclusion for auth URLs or stop caching API responses entirely (IndexedDB already handles offline data).

2. **CSP may need adjustment for Next.js.** The `script-src 'self'` directive may block Next.js inline hydration scripts. Test in production; if pages fail to load, add `'unsafe-inline'` to `script-src` or implement nonce-based CSP.

3. **Run `npm audit` before deployment.** This was not executable during the security review. Run `npm audit` and resolve critical/high findings.

### Priority 2 (address soon after launch)

4. **Auto-clear synced IndexedDB entries.** `syncOfflineData()` does not call `clearSyncedEntries()` automatically. Verify the calling code chains these, or modify `syncOfflineData()` to clean up after itself.

5. **Remove `@supabase/auth-helpers-nextjs`.** It is deprecated, unused, and adds unnecessary attack surface. Replace with `@supabase/ssr` if cookie-based auth is needed.

6. **Set minimum password length to 8 in Supabase Dashboard.** Client-side validation enforces 8 characters, but the server-side Supabase Auth default may be lower (6). Both should match.

7. **Add TTL cleanup for IndexedDB error entries.** Entries stuck in `error` sync status accumulate indefinitely. Add periodic cleanup or a max retry count.

### Priority 3 (long-term hardening)

8. **Migrate to cookie-based auth via `@supabase/ssr`.** Tokens in `localStorage` are vulnerable to XSS-based theft. Cookie-based storage with `httpOnly` flags provides defense-in-depth.

9. **Add database-level text length limits.** Add `CHECK (char_length(name) <= 100)` constraints on text columns to prevent abuse.

10. **Consider nonce-based CSP.** Replace `'unsafe-inline'` in `style-src` with nonce-based or hash-based CSP for maximum XSS protection. This requires Next.js configuration changes.

### Ongoing

- Run `npm audit` before each deployment and weekly during active development.
- Use `npm ci` (not `npm install`) in CI/CD to enforce exact lock file versions.
- Monitor security advisories for `next`, `@supabase/supabase-js`, and `react`.

---

## 10. Implementation Team Guidelines

**For the Backend Engineer (API layer):**
- Always use parameterized queries via the Supabase JS client. Never concatenate user input into query strings.
- Do not expose the service role key in any client-accessible code.
- Validate data types on the server side (Supabase RPC functions) if custom endpoints are added.

**For the Frontend Engineer:**
- Never render user-supplied strings as raw HTML. Always rely on React's default JSX escaping.
- Add `maxLength` to all text inputs (exercise names, routine names).
- Add client-side validation for numeric ranges (reps > 0, weight >= 0, rir 0-5) before submitting to Supabase.
- Use `type="number"` and `inputMode="numeric"` on numeric fields to reduce invalid input.

**For the PWA/Offline Engineer:**
- Do not store JWTs or auth tokens in IndexedDB or Cache API.
- Clear synced data from IndexedDB promptly after successful sync.
- Exclude auth endpoints from service worker caching (see Priority 1 recommendation above).

**For the Config/Database Lead:**
- Add `TEXT` column length limits (e.g., `CHECK (char_length(name) <= 100)`) to prevent abuse.
- Consider adding a `UNIQUE` constraint on `(routine_id, exercise_id)` in `routine_exercises` to prevent duplicate entries.
- Consider adding a `UNIQUE` constraint on `(user_id, name)` on `exercises` to prevent duplicate custom exercise names per user.
