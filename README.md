# Bharwana Estates

Next.js marketplace and admin panel for Bharwana Estates — property listings,
map browse, seller desks (individual / dealer), and a permissioned admin CMS
backed by Firebase Auth, Firestore, and Storage.

## Tech stack

- **Next.js 14** (App Router) + React 18 + TypeScript
- **Firebase** Auth, Firestore, Storage (`firebase` client + `firebase-admin` for staff APIs)
- **Tailwind CSS** + Radix UI + Framer Motion
- **Maps:** Google Maps JS (`@react-google-maps/api`) with Places Autocomplete + Geocoding for address search
- Forms: react-hook-form + Zod; images: browser-image-compression + Next `<Image>`

## Folder structure

| Path | Role |
|------|------|
| `app/(public)/` | Marketing + marketplace (home, properties, map, property detail, account, saved) |
| `app/(auth)/` | Login / register / password reset |
| `app/owner/` · `app/dealer/` · `app/sales/` | Role desks |
| `app/admin/` | Admin panel (submissions, properties, dealers, staff, reports, …) |
| `app/api/` | Phone-registered check, admin staff Admin SDK routes |
| `components/` | UI by domain (`properties`, `map`, `auth`, `admin`, …) |
| `lib/` | Auth, Firestore modules, domain helpers, types |
| `firestore.rules` / `storage.rules` | Security rules |

## Run locally

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Fill `.env.local`:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_*` | Required for live Auth / Firestore / Storage |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `/map` and map pickers — enable Maps JavaScript, Places, and Geocoding APIs |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | Google sign-in web client |
| `FIREBASE_ADMIN_*` | Server-only staff Admin SDK APIs |

Without Firebase env vars the app falls back to seed/localStorage data.

```bash
npm run lint
npm run build
npm run admin:grant          # grant panel access
npm run phone-auth:diagnose
```

Deploy rules from the repo when they change:

```bash
firebase deploy --only firestore:rules,storage
```

## Architecture

### Auth (two systems on purpose)

1. **Marketplace** — `lib/mock-auth.tsx` / `useMockAuth`  
   Name is historical. When Firebase is configured this is **real** Firebase Auth
   (email/password, Google, phone OTP). Profiles live in `users/{uid}`.

2. **Admin panel** — `lib/admin-auth.tsx` / `useAdminAuth`  
   Separate session. Sign-in checks `admins/{uid}` (super_admin | staff + module
   permissions), with legacy fallback `users.role === ADMIN`. Admin session does
   **not** become a marketplace `user`.

Provider order (`components/providers.tsx`):

`MockAuthProvider` → `AdminAuthProvider` → `MockStoreProvider` → …

### Roles & routes

| Role | Desk |
|------|------|
| `INDIVIDUAL` (legacy `BUYER` / `HOUSE_OWNER` normalize here) | `/owner` |
| `DEALER` | `/dealer` (agency profile in `developers`) |
| `SALES_REP` | `/sales` |
| Admin panel | `/admin/*` via AdminAuth |

### Firestore collections

| Collection | Purpose |
|------------|---------|
| `users` | Marketplace profiles |
| `admins` | Panel allow-list (client write denied) |
| `properties` | Listings (public read; status-scoped client subscriptions) |
| `developers` | Dealer/agency profiles |
| `inquiries` | Buyer leads |
| `teamMembers` | About / team page |
| `transactions` | Commission records (rules exist; UI still partly seed-backed) |
| `contactMessages` / `newsletterSignups` / `deletionRequests` | Ops |

### Property data loading

- **Public marketplace:** `PUBLISHED` + `RESERVED` only (capped at 250).
- **Logged-in seller:** those + own listings of any status.
- **Admin session:** full collection.

Listing photos are client-compressed (~250KB JPEG) before Storage upload
(`lib/compress-listing-image.ts`).

## Hosting notes

Client Firebase keys (`NEXT_PUBLIC_*`) are public by design. Protect data with
**Firestore / Storage security rules**, not by hiding the API key.
