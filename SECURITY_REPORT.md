# Bharwana Estates — Security Audit Report (Phase 1)

**Branch:** `security-hardening`  
**Date:** 2026-10-11  
**Scope:** Static audit of the Next.js + Firebase codebase (no production Firebase Auth console / IAM / backup settings accessed).  
**Phase status:** Phase 1 complete — **no code changes applied**. Awaiting approval before Phase 2.

**Rules followed:** No secret values printed in full (masked to first 4 characters). `adminActive()` “missing `active` counts as true” is reported, not changed.

---

## Executive summary

The app has a real server-side admin gate for `/api/admin/*` (Bearer Firebase ID token + Admin SDK + `admins/{uid}`), and Firestore rules block client writes to `admins`. Several production risks remain:

1. **Public Firestore reads** expose all property documents (including `contactPhone`) and all dealer documents.
2. **Dealers can write their own `status`** (including `ACTIVE`) via rules — privilege escalation.
3. **Open unauthenticated create** on `contactMessages` / weak newsletter validation; **no app rate limits**.
4. **Debug error exposure** left on (`EXPOSE_STAFF_API_ERROR_DETAILS = true`) and Admin auth errors leak env var names / SDK messages.
5. **Unknown `admins.role` → `super_admin`** on both client and server (deny-by-default missing).
6. **No security headers / CSP**, no middleware, no `server-only` package, Storage allows **SVG**.
7. **Mock/localStorage auth with plaintext passwords** if Firebase env is missing in a misconfigured deploy.
8. **Meta Lead Ads webhook / `metaLeads` permission:** not present in this repo (cannot verify).

---

## Severity legend

| Level | Meaning |
|-------|---------|
| **Critical** | Direct privilege escalation, secret exposure, or public access to private customer data |
| **High** | Auth/authz bypass, abuse with real customer impact, or production misconfig that enables those |
| **Medium** | Defense-in-depth gap, information leak, or abuse that needs chaining |
| **Low** | Hardening / hygiene |

---

## Findings by checklist category

### 1. Secrets and environment variables

| ID | Severity | Finding | Location | Proposed fix |
|----|----------|---------|----------|--------------|
| S1 | **High** | `.gitignore` ignores only `.env*.local`, not `.env` / `.env.production` / service-account JSON patterns | `.gitignore:29-30` | Ignore `.env`, `.env.*` (keep `!.env.example` / `!.env.local.example`), `*firebase-adminsdk*.json`, `*serviceAccount*.json`, `credentials*.json`, `scripts/output/` |
| S2 | **Medium** | `server-only` package not used; Admin + Resend modules can theoretically be pulled into a client bundle | `lib/firebase/admin.ts` (entire); `lib/email/resend.ts` (entire); `package.json` | Add `server-only` dependency; `import "server-only"` at top of those modules; verify with build + search of `.next/static` |
| S3 | **Low** | Admin init error strings name `FIREBASE_ADMIN_*` env vars (helps attackers map config) | `lib/firebase/admin.ts:58-59`, `72-74`; also returned via API helpers | Generic client errors; keep detail in server logs only |
| S4 | **Info / OK** | Firebase Admin credentials are read from env vars only (no JSON file path in repo) | `lib/firebase/admin.ts:26-43` | Keep as-is; never commit SA JSON |
| S5 | **Info / OK** | No hardcoded live PEM / Resend keys in source; `.env.example` documents Admin + Resend with empty values | `.env.example` | Keep examples empty; document script-only vars separately |
| S6 | **Medium** | Local `.env.local` holds live `NEXT_PUBLIC_*` keys (expected); gitleaks filesystem scan also finds them inside **`.next` build cache** | `.env.local` (gitignored); `.next/cache/**` | Ensure `.next` never committed (already ignored); do not archive `.next` |
| S7 | **Low** | Docs drift: `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` unused by code | `.env.local.example`, `.env.example:13-14` | Remove or wire up; document script vars (`FIREBASE_TOKEN`, etc.) |

#### Env var inventory (code)

| Variable | Class | Used in |
|----------|-------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public | `lib/firebase/client.ts`, `lib/firebase/identity-toolkit.ts` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Public | `lib/firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Public | `lib/firebase/client.ts`, `next.config.mjs`, Admin fallback |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Public | `lib/firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Public | `lib/firebase/client.ts` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Public | `lib/firebase/client.ts` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public (by design) | `lib/map.ts` |
| `NEXT_PUBLIC_SITE_URL` | Public | `lib/auth-reset.ts`, `lib/email/resend.ts` |
| `FIREBASE_ADMIN_PROJECT_ID` | Server-only | `lib/firebase/admin.ts` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Server-only | `lib/firebase/admin.ts` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | **Secret** | `lib/firebase/admin.ts` |
| `RESEND_API_KEY` | **Secret** | `lib/email/resend.ts` |
| `RESEND_FROM_EMAIL` | Server | `lib/email/resend.ts` |
| `RESEND_REJECTION_BCC` | Server | `lib/email/resend.ts` |
| `FIRESTORE_PREFER_REST` | Server | `lib/firebase/admin.ts:6-7` |
| `VERCEL_PROJECT_PRODUCTION_URL` | Platform | `lib/email/resend.ts` |
| `NODE_ENV` | Runtime | various |
| `FIREBASE_TOKEN`, `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `EXPECTED_FIREBASE_EMAIL` | Scripts only | `scripts/configure-phone-auth.mjs`, `diagnose-phone-auth.mjs` |

**No secret carries a `NEXT_PUBLIC_` prefix** in current code (good).

#### Google Maps key — restrictions you must set (manual)

Code assumes browser Maps JS + Places (`lib/map.ts:7`, `17-27`) with `authReferrerPolicy: "origin"`.

In Google Cloud Console for this key:

1. **Application restrictions:** HTTP referrers — allow `https://bharwanaestates.com/*`, `https://*.vercel.app/*` (if needed), `http://localhost:3000/*` for local only.
2. **API restrictions:** Maps JavaScript API, Places API, Geocoding API only (whatever the app actually calls).
3. **Quotas / budgets** on those APIs to limit abuse if the key leaks (it will be visible in the browser).
4. Do not commit a different unrestricted key into git history.

---

### 2. Authentication and admin routes

| ID | Severity | Finding | Location | Proposed fix |
|----|----------|---------|----------|--------------|
| A1 | **High** | `verifyIdToken` without `checkRevoked: true` on all `/api/admin/*` | `lib/admin/require-super-admin.ts:125` | `verifyIdToken(token, true)`; revoke refresh tokens on staff deactivate / password / role change |
| A2 | **High** | Unknown / missing `admins.role` treated as **`super_admin`** (deny-by-default missing) | Client: `lib/firestore/admin-access.ts:66-67`; Server: `lib/admin/require-super-admin.ts:64-66` | Explicit allow-list: only `"super_admin"` or `"staff"`; anything else → deny |
| A3 | **High** | `EXPOSE_STAFF_API_ERROR_DETAILS = true` returns Firebase error messages/codes to browsers | `lib/admin/staff-api-error.ts:3-4`, `73-84` | Set `false` in production (or remove flag); generic client errors |
| A4 | **High** | Auth failure responses leak env var names + exception text | `lib/admin/require-super-admin.ts:109-115`, `130-168` | Opaque 401/503 messages; log details server-side only |
| A5 | **Medium** | No `middleware.ts`; `/admin/*` UI gated only by client `AdminAuth` + `RequireModule` | No middleware file; `components/admin/require-module.tsx`; `lib/admin-auth.tsx` | Keep API checks; add edge middleware for cookie/session later if adopted; never rely on UI alone (APIs already check — good) |
| A6 | **Medium** | No Firebase **session cookies** (`createSessionCookie` / `verifySessionCookie`); admin uses Bearer ID token + **localStorage** session cache | `lib/admin-auth.tsx` (cache key `bharwana_admin_session_v2`); `lib/admin/admin-api.ts` | Prefer HttpOnly `Secure; SameSite=Lax` session cookies for mutating admin APIs, or keep Bearer + Origin checks + short-lived tokens + `checkRevoked` |
| A7 | **Medium** | Staff deactivate sets Auth `disabled` but does **not** `revokeRefreshTokens` | `app/api/admin/staff/[uid]/route.ts` (PATCH deactivate) | Call `revokeRefreshTokens(uid)` on deactivate / permission demotion / password reset |
| A8 | **Medium** | Legacy `users.role === "ADMIN"` grants full super_admin without `admins` doc / `active` | `lib/firestore/admin-access.ts:86-94`; `lib/admin/require-super-admin.ts:87-94`; `firestore.rules:41-53` | Migrate remaining legacy admins to `admins/{uid}`; then remove legacy path (after verification) |
| A9 | **Info** | `featured` permission: UI gated via `RequireModule`; Firestore write on `siteSettings` also allows `properties` / `canManageProperties` — so **featured is not exclusive** | `components/admin/require-module.tsx:17`; `firestore.rules:207-212`; save via client `lib/firestore/featured.ts:85-100` (no `/api/admin` route) | If exclusive featured needed: tighten rules + optional server API with `requireAdminModule(..., "featured")` |
| A10 | **Info** | **`metaLeads` permission / Meta Lead Ads webhook: not in codebase** | Searched `metaLeads`, webhook, `X-Hub-Signature` — zero hits; `lib/admin/modules.ts` has no `metaLeads` | Confirm product status; if required, implement webhook with signature + idempotency + server permission |

#### How `resolveAdminAuthorization` is used

- **Client AdminAuth** (`lib/admin-auth.tsx`) — decides who can open `/admin` UI and caches result in localStorage.
- **Client mock-auth** (`lib/mock-auth.tsx`) — detects admin UIDs to adjust marketplace property subscriptions.
- **Server** uses parallel logic in `loadAdminCaller` (`lib/admin/require-super-admin.ts`), not the client helper — same deny-default bug (unknown role → super_admin).

#### API route map (who may call)

| Route | Methods | Auth today |
|-------|---------|------------|
| `/api/admin/staff` | GET, POST | Super admin (`requireSuperAdmin`) |
| `/api/admin/staff/[uid]` | PATCH, DELETE | Super admin |
| `/api/admin/users` | POST | Module: users **or** properties **or** submissions **or** dealers |
| `/api/admin/properties` | PUT | Module: properties **or** submissions **or** reports |
| `/api/admin/properties/[id]/reject` | POST | Module: submissions **or** properties |
| `/api/admin/developers/[id]/reject` | POST | Module: dealers |
| `/api/admin/deletion/purge` | POST | Module: deletion |
| `/api/auth/phone-registered` | POST | **Public** |
| `/api/auth/phone/send-code` | POST | **Public** (reCAPTCHA token required) |
| `/api/auth/phone/verify-code` | POST | **Public** (sessionInfo + OTP) |
| `/api/auth/phone/recaptcha-params` | GET | **Public** |
| `/api/auth/phone-reset-password` | POST | ID token in body + `checkRevoked: true` + fresh `auth_time` |

---

### 3. Authorization / IDOR

| ID | Severity | Finding | Location | Proposed fix |
|----|----------|---------|----------|--------------|
| Z1 | **Critical** | `match /properties/{id} { allow read: if true; }` — **any client can read every listing**, including `PENDING_APPROVAL` / `DRAFT` / `REJECTED`, and fields like **`contactPhone`** | `firestore.rules:153-154`; field written in `lib/firestore/properties.ts:135`, `340` | Public read only when `status in ['PUBLISHED','RESERVED']`; owners/admins read own/all; strip or move seller phone to a private subcollection |
| Z2 | **Critical** | Dealer self-update may change **`status`** (and history fields) — can set `ACTIVE` | `firestore.rules:259-277` | Remove `status` / `statusHistory` / rejection fields from dealer self-update allowlist; only admin/SDK may change status |
| Z3 | **High** | `match /developers/{id} { allow read: if true; }` — dealer company/contact/registration public | `firestore.rules:243-244` | Public read only safe marketing fields, or only `ACTIVE` dealers; keep private fields admin-only |
| Z4 | **High** | `contactMessages` create open with **no field validation** | `firestore.rules:216-218` | Validate keys/types/sizes; rate-limit; or move to authenticated/API + Turnstile |
| Z5 | **High** | Owner listing create trusts client `status` as long as it is `DRAFT` or `PENDING_APPROVAL` — cannot publish (good), but **no field allowlist / length / image-host rules** | `firestore.rules:156-176` | Add `hasOnly([...])`, type/size checks; force `status == 'PENDING_APPROVAL'` for non-admin creates (no DRAFT publish path abuse) |
| Z6 | **High** | Purge API accepts any `uid`; does not delete Auth user; no guard against purging admins | `app/api/admin/deletion/purge/route.ts:12-78` | Refuse admin/staff UIDs; delete Auth user only with explicit confirmation; verify deletion-request existence |
| Z7 | **Medium** | Admin users POST: client-chosen document `id`; weak email check | `app/api/admin/users/route.ts:40-69` | Zod email; ensure Auth UID exists / matches |
| Z8 | **Medium** | `adminActive()` missing `active` ⇒ true (intentional; leave as-is per instructions) | `firestore.rules:30-37` | **Report only:** ensure every new staff doc sets `active: true|false` explicitly; migrate legacy docs |
| Z9 | **Low** | Storage `isAdmin()` treats any non-false `admins.active` like rules (missing active = admin) | `storage.rules:15-18` | Align with explicit allow-list roles after A2 |

#### Authorization matrix (current behaviour — static analysis)

Legend: ✅ allowed · ❌ denied · ⚠️ overly broad / unintended · 🔧 Admin SDK bypasses rules

| Resource / action | Unauth | User | Owner | Dealer | Staff w/o perm | Staff w/ perm | Super admin |
|-------------------|--------|------|-------|--------|----------------|---------------|-------------|
| Read published property | ✅ (all props!) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read pending property + `contactPhone` | ⚠️ via rules | ⚠️ | ✅ intended | ⚠️ | ⚠️ | ✅ | ✅ |
| Create listing as self | ❌ | ✅ status DRAFT/PENDING | ✅ | ✅ | ❌ client | 🔧 API | 🔧 API |
| Publish listing | ❌ | ❌ rules | ❌ rules | ❌ rules | ❌ | 🔧 if module | 🔧 |
| Write `siteSettings/featured` | ❌ | ❌ | ❌ | ❌ | ❌ unless other perms | ✅ featured **or** properties | ✅ |
| Read `users/{other}` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ users/reports/… | ✅ |
| Write `admins/*` (client) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (API only) |
| `/api/admin/*` | ❌ 401 | ❌ 403 | ❌ 403 | ❌ 403 | ❌ 403 | ✅ module | ✅ |
| Create newsletter | ✅ weak | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create contactMessages | ⚠️ open | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ read | ✅ |
| Read inquiries | ❌ | own | — | — | ❌ | ✅ inquiries | ✅ |
| Read metaLeads | N/A — **not implemented** | | | | | | |

**Phase 3 will re-test with live unauthenticated requests; matrix above is code-derived, not yet runtime-verified.**

---

### 4. Input validation, sanitization, XSS

| ID | Severity | Finding | Location | Proposed fix |
|----|----------|---------|----------|--------------|
| X1 | **High** | Storage allows any `image/*` including **SVG** | `storage.rules:22-25` | Allow only `image/jpeg`, `image/png`, `image/webp` (optional `image/heic`); deny SVG |
| X2 | **High** | Team `linkedinUrl` rendered as `href` without `https:` allowlist | `components/team/team-pages.tsx:120-127` | Allowlist `https:` + linkedin host; reject `javascript:` / `data:` |
| X3 | **High** | No Zod on API routes; hand-rolled validation only | All `app/api/**` | Shared Zod schemas; `.strict()`; length/enum/array caps |
| X4 | **Medium** | Admin property images: any `http(s)` URL | `app/api/admin/properties/route.ts:21-29` | Reuse persisted image host allowlist |
| X5 | **Medium** | `returnTo` only checks starts with `/` and not `//` | `lib/auth-redirect.ts:8-10`; auth forms | Reject `\`, control chars; optional path allowlist |
| X6 | **Medium** | EXIF/GPS may survive fallback upload paths | `lib/compress-listing-image.ts` | Always canvas re-encode or strip EXIF server-side |
| X7 | **Low** | No `dangerouslySetInnerHTML` / JSON-LD found (good) | repo | Keep React text rendering; escape if JSON-LD added |
| X8 | **Info** | No CSV export (PDF only) — formula injection N/A today | `lib/admin/report-pdf.ts` | If CSV added later, neutralize `=+-@` |
| X9 | **Low** | Rejection email HTML escapes body fields (good); subjects embed raw title | `lib/email/resend.ts` | Sanitize CR/LF in subjects |

---

### 5. Rate limiting and abuse

| ID | Severity | Finding | Location | Proposed fix |
|----|----------|---------|----------|--------------|
| R1 | **High** | No app-level rate limits on phone SMS / register check / verify / newsletter / inquiries / listing create | `app/api/auth/**`; client Firestore creates | **Recommend Upstash Redis** `@upstash/ratelimit` + `@upstash/redis` (works across Vercel isolates). Env: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Return **429 + Retry-After**. Alternative: Vercel Firewall rules in dashboard (no code) — tell me if you prefer dashboard-only. |
| R2 | **High** | `phone-registered` returns `{ registered: true\|false }` — email/phone enumeration | `app/api/auth/phone-registered/route.ts:24,31` | Constant-time generic response + rate limit; align signup UX |
| R3 | **Medium** | No honeypot / Turnstile / reCAPTCHA v3 on newsletter, inquiries, contact (phone flow has Firebase reCAPTCHA) | footer newsletter; inquiry modal | Add Turnstile (or reCAPTCHA v3) + server verify on public forms |
| R4 | **Medium** | Login/reset enumeration mostly mitigated for email/password (“Invalid email or password”) — keep + rate limit | `lib/mock-auth.tsx:755-762` | Add Upstash limits around Identity Toolkit / login UI |

**Phase 2 choice (pending your approval):** Upstash Redis rate limiting in API routes + optional Vercel WAF for `/api/*`.

---

### 6. API endpoint security

| ID | Severity | Finding | Location | Proposed fix |
|----|----------|---------|----------|--------------|
| P1 | **High** | See A3/A4 — production error leakage | staff-api-error + require-super-admin | Fail closed, generic errors |
| P2 | **Medium** | No Origin/Host check on mutating requests | all POST/PUT/PATCH/DELETE APIs | Reject cross-origin when `Origin` present and not allowlisted |
| P3 | **Medium** | No explicit body size limits on routes | API routes | Configure Next body size / reject oversized JSON |
| P4 | **Info** | Meta webhook N/A (not implemented) | — | When added: raw-body HMAC, timing-safe compare, idempotent writes |
| P5 | **Low** | Ops scripts (`grant-admin`, `clear-firestore-properties`, etc.) are CLI-only, not HTTP-reachable | `scripts/*` | Keep out of `app/`; never commit passwords; ask before deleting |

---

### 7. CORS

| ID | Severity | Finding | Location | Proposed fix |
|----|----------|---------|----------|--------------|
| C1 | **Info / OK** | No `Access-Control-Allow-*` headers found — APIs are same-origin | repo | Keep none unless a real cross-origin client appears |
| C2 | **Medium** | Firebase Storage bucket CORS not defined in repo | — | Provide `cors.json` + `gsutil cors set` for `https://bharwanaestates.com` and localhost (Phase 2, ask before apply) |

---

### 8. Security headers

| ID | Severity | Finding | Location | Proposed fix |
|----|----------|---------|----------|--------------|
| H1 | **High** | `headers()` returns `[]` — no CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors | `next.config.mjs:30-34` | Add headers per your checklist; CSP **Report-Only first** |
| H2 | **Medium** | `poweredByHeader` not disabled | `next.config.mjs` | `poweredByHeader: false` |
| H3 | **Medium** | No `X-Robots-Tag: noindex` for `/admin` and `/api` | — | Add via `headers()` source matchers |
| H4 | **Low** | Comment warns COOP breaks Firebase popup — use `same-origin-allow-popups` carefully | `next.config.mjs:31-32` | Set COOP to `same-origin-allow-popups` after testing Google/Facebook popup sign-in |

CSP must allow: Maps (`maps.googleapis.com`, `maps.gstatic.com`, tiles), Firebase Auth/Firestore/Storage, YouTube nocookie + `i.ytimg.com`, `data:`/`blob:` for previews, Google Fonts if used. Prefer nonces; avoid `unsafe-eval`.

---

### 9. Debug mode and information leaks

| ID | Severity | Finding | Location | Proposed fix |
|----|----------|---------|----------|--------------|
| D1 | **High** | Phone auth errors log E.164 + hang object on `window.__BHARWANA_LAST_PHONE_AUTH_ERROR__` | `lib/phone-auth-errors.ts:64-114` | Strip in production; never attach PII to `window` |
| D2 | **High** | Offline register stores **plaintext password** in localStorage when Firebase missing | `lib/mock-auth.tsx:1520-1528` | **Fail closed** in production if Firebase not configured; disable register/`loginAs` |
| D3 | **Medium** | `loginAs` / Preview access impersonation helpers | `lib/mock-auth.tsx:702-714`; `dashboard-shell.tsx` | Dev-only or remove from production builds |
| D4 | **Medium** | Server logs recipient emails on Resend / dealer reject | `lib/email/resend.ts:94-98`; developers reject route | Hash or omit PII in logs |
| D5 | **Low** | Listing form `console.error` on submit failures | `property-form.tsx` ~1293+ | Guard with `NODE_ENV === "development"` |
| D6 | **Info / OK** | `productionBrowserSourceMaps` defaults false | Next defaults | Confirm stays false |

---

### 10. Dependencies

| ID | Severity | Finding | Proposed fix |
|----|----------|---------|--------------|
| Dep1 | **Critical** (advisory) | `npm audit`: **22** issues — **1 critical, 16 high, 4 moderate, 1 low**. Critical on **`next`** (Image Optimizer DoS / HTTP request issues per advisory titles). Installed: **Next 14.2.35** | Apply `npm audit fix` for non-breaking; **ask before** Next 15/16 major. Confirm patched 14.x or approved major. |
| Dep2 | **High** | `@grpc/grpc-js` via `firebase` (auth context cert issue) | Bump `firebase` / `firebase-admin` patch/minor (`12.18.0` → wanted `12.19.0`; admin `14.4.0` → `14.5.0`) after tests |
| Dep3 | **Medium** | No Dependabot / secret scanning config in repo | Enable Dependabot + GitHub secret scanning + push protection (manual) |
| Dep4 | **Low** | No `typecheck` script; only `test:youtube` | Add `tsc --noEmit` script for Phase 3 |
| Dep5 | **Info** | Unused-deps cleanup (`depcheck`/`knip`) not run in Phase 1 | Phase 2: list candidates, ask before delete |

---

### 11. Remove what we don’t need (candidates — **ask before delete**)

| Candidate | Why |
|-----------|-----|
| `scripts/clear-firestore-properties.mjs`, `reset-demo-properties.mjs` | Destructive ops scripts |
| `scripts/grant-admin.mjs`, migrate/backfill/diagnose/configure | Ops; keep offline, ensure no secrets |
| `lib/mock-data/*` seed catalogs | OK for offline UI; ensure production fail-closed |
| Unused env docs (`NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`, measurement id) | Docs drift |
| `EXPOSE_STAFF_API_ERROR_DETAILS` debug path | Should die in production |

No deletions in Phase 1.

---

### 12. Exposed files

| ID | Severity | Finding | Proposed fix |
|----|----------|---------|--------------|
| E1 | **Info / OK** | `public/` contains only images/icons — no `.env`, SQL, SA JSON | Keep clean |
| E2 | **Medium** | Phase 1 did **not** run `next build && next start` 404 probes | Phase 3: verify 404 for `/.env`, `/.git/config`, `/package.json`, `/firestore.rules`, `/*.map`, `/scripts/*` |
| E3 | **Low** | Auth helper rewrites expose `/__/auth/*` to Firebase hosting (intentional) | `next.config.mjs:35-47` — keep; ensure authorized domains locked down |

---

### 13. Database security (Firestore / Storage / Auth)

| ID | Severity | Finding | Location | Proposed fix |
|----|----------|---------|----------|--------------|
| DB1 | **Critical** | Public property read + `contactPhone` (Z1) | `firestore.rules:153-154` | Restrict reads; relocate PII |
| DB2 | **Critical** | Dealer self-status (Z2) | `firestore.rules:259-277` | Field allowlist without status |
| DB3 | **High** | Public developers read (Z3) | `firestore.rules:243-244` | Tighten |
| DB4 | **High** | Open `contactMessages` (Z4) | `firestore.rules:216-218` | Validate / close |
| DB5 | **High** | Storage SVG (X1); `image/.*` | `storage.rules:22-25` | MIME allowlist |
| DB6 | **Medium** | Newsletter email rule weak (`size() > 3`) | `firestore.rules:221-229` | Regex / API-only |
| DB7 | **Medium** | `isSuperAdmin` treats any non-`staff` admin role as super (mirrors A2) | `firestore.rules:45-53` | Explicit `role == 'super_admin'` (show diff for your deploy) |
| DB8 | **Info** | `admins` client write denied (good) | `firestore.rules:144-149` | Keep |
| DB9 | **Info** | Admin SDK bypasses rules — server auth is the real gate for `/api/admin/*` | — | Fix A1–A4 |
| DB10 | **Unverified** | Firebase Auth authorized domains, unused providers, email enumeration protection, password policy in console | — | **You must check** Firebase Console; code password policy exists in `lib/password-policy.ts` |
| DB11 | **Unverified** | Firestore backup schedule; SA IAM least privilege | `.env.example` suggests Datastore User + Auth Admin + Token Creator | Confirm in GCP IAM; enable scheduled exports |
| DB12 | **Unverified** | Rules emulator matrix | — | Phase 3 / with your approval run emulator tests; **will not deploy rules** |

**`adminActive()` default:** Reported as designed risk — missing `active` ⇒ active. Do not change without explicit approval.

---

### 14. Passwords

| ID | Severity | Finding | Location | Proposed fix |
|----|----------|---------|----------|--------------|
| PW1 | **High** | Offline mock accounts store **plaintext passwords** in localStorage | `lib/mock-auth.tsx:94`, `1520-1528` | Fail closed in production |
| PW2 | **Info / OK** | Firebase Auth hashes passwords; no custom hashing | — | Keep |
| PW3 | **Info / OK** | Email/password login uses generic error string | `lib/mock-auth.tsx:755-762` | Keep + rate limit |
| PW4 | **Medium** | Staff create password only `length >= 8`, not full `passwordMeetsPolicy` | `app/api/admin/staff/route.ts:61` | Reuse `passwordMeetsPolicy` |
| PW5 | **Medium** | No `revokeRefreshTokens` after password change (except phone-reset sets password via Admin SDK — verify revoke) | phone-reset + staff flows | Revoke on password change |
| PW6 | **Recommendation** | **MFA for admin accounts** | — | Enable Google / TOTP MFA in Firebase Auth for users in `admins`; enforce before `/admin` (custom claims or Admin SDK check). Requires Firebase MFA setup + UI challenge. |

Grep: password fields appear in forms/API for Auth only; `StoredAccount.password` is the offline mock concern. No passwords found in Firestore property models.

---

### 15. Git history

| Tool | Result |
|------|--------|
| `gitleaks detect --log-opts="--all"` | **3 findings** (see below) |
| Filesystem gitleaks (excl. noise) | `.env.local` keys (gitignored, expected); `.next` cache embeds public API keys after local build |

#### Git history findings (masked)

| Commit | File | Rule | Masked | Assessment |
|--------|------|------|--------|------------|
| `2495d559…` | `lib/firebase/admin.ts` | private-key | `----****` | **False positive** — PEM header string checks / logging metadata, not a real key blob |
| `9622f756…` | `lib/firebase/admin.ts` | private-key | `----****` | **False positive** — same |
| `f7c8beb3…` | `lib/mock-store.tsx` | generic-api-key | `bhar****` | **False positive** — localStorage key name `bharwana_properties_v1` |

**No verified committed service-account private key or `.env.local` in git history** from this scan.

**Still treat as compromised if they ever left your machine:**

1. Rotate Firebase **web API key** restrictions (not necessarily the key string) and Maps key restrictions/quotas.
2. Rotate **Firebase Admin** service account key in GCP if it was ever pasted into chat, screenshots, or Vercel logs.
3. Rotate **Resend** API key if ever exposed.
4. Do **not** rewrite git history without explicit approval (`git filter-repo` + force-push impacts Vercel/GitHub/PRs).

---

## Positive controls observed

- `/api/admin/*` verifies Bearer ID token and loads role/permissions from Firestore via Admin SDK (does not trust client-claimed permissions).
- Client writes to `admins/{uid}` denied by rules.
- Phone password reset uses `checkRevoked: true` + fresh `auth_time` + PK phone claim.
- No `dangerouslySetInnerHTML` for user HTML.
- YouTube stores ID only, not raw URLs.
- Rejection email HTML escapes user-controlled fields.
- Listing form forces non-admin status to `PENDING_APPROVAL` in UI (`property-form.tsx:1261-1264`) — **must still be enforced in rules/API**.
- `public/` has no secrets.
- Admin credentials loaded from env, not a repo JSON file.

---

## Manual actions required from you (cannot verify from code alone)

1. Google Cloud: Maps key HTTP referrer + API restrictions + quotas.
2. Firebase Console: authorized domains; disable unused providers; email enumeration protection; password policy; MFA for admins.
3. GCP IAM: confirm Admin SA least privilege; rotate if uncertain.
4. Firestore scheduled backups / exports.
5. Storage CORS (`gsutil`) after approving `cors.json`.
6. Vercel: fair-use / billing unblock; env vars present; no secrets in build logs.
7. GitHub: Dependabot + secret scanning + push protection.
8. Confirm whether **Meta Lead Ads** is still in scope (not in repo).
9. Approve Upstash vs Vercel Firewall for rate limits (env vars vs dashboard).

---

## Phase 2 proposal (awaiting your approval)

Suggested commit order (one commit per category), after you approve each block:

1. Secrets/gitignore/`server-only`/env example  
2. Auth admin allow-list + `checkRevoked` + error leakage + revoke tokens  
3. Authorization rules diff (show first; **you deploy**) + purge hardening  
4. Zod validation + XSS URL allowlists + Storage MIME  
5. Upstash rate limits + bot protection  
6. API CSRF Origin + safe errors  
7. Headers CSP-Report-Only → later enforce  
8. Debug/fail-closed mock paths  
9. Dependency patch/minor updates (ask before majors)  
10. Removals only after you approve the candidate list  

**Will not:** push to `main`, deploy to Vercel, deploy Firestore/Storage rules, rewrite git history, or change `adminActive()` default without explicit ask.

---

## Phase 3 (after fixes) — verification plan

- `npm run lint`, `tsc --noEmit`, `build`, `test:youtube`; `npm audit`; gitleaks clean or listed  
- Production headers on `/`, `/properties`, property detail, `/admin`, sample API  
- CSP Report-Only violation pass on main flows  
- Auth matrix runtime: unauth `/api/admin/*` → 401/403  
- Rules emulator results (with your approval to run)  
- Rate limit 429 test  
- Smoke: landing, Places search, detail+video, map, listing+upload, sign-in/out, admin Properties/Featured/Add Property  
- Update this report with commit IDs, remaining gaps, manual leftovers  

---

## What could not be verified in Phase 1

- Live Firebase Auth console settings, IAM role bindings, backup jobs  
- Runtime 404 / header / CSP / rate-limit tests (no Phase 2 code yet; production currently blocked by Vercel fair-use earlier)  
- Meta Lead Ads (absent from repo)  
- Whether any real Admin private key ever appeared outside git (chat/Vercel UI)  
- End-to-end IDOR against production Firestore with a non-admin SDK client (static rules review only)  

---

**STOP — Phase 1 complete. Reply with which findings (by ID) you approve for Phase 2, and any you want deferred or handled differently.**
