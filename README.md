# Bharwana Estates Developer

Next.js 14 real-estate frontend with Firestore for **team** and **properties**. Admin login is still mock (email/password in `lib/mock-data/admin-users.ts`) until Firebase Auth is added.

## 1. Local setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` (Mapbox optional for maps; Firebase required for live data):

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk....
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

```bash
npm run dev
```

### Firebase console checklist

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Add a **Web** app → copy config into `.env.local`.
3. Enable **Firestore** and **Storage**.
4. Deploy rules (dev-open rules are in the repo — tighten before production):

```bash
# optional CLI
npm i -g firebase-tools
firebase login
firebase init firestore storage   # or paste rules from firestore.rules / storage.rules in Console
```

Or in Console → Firestore → Rules / Storage → Rules, paste `firestore.rules` and `storage.rules`.

5. Sign in to Admin → `/admin/login` → **Seed Firestore** on the dashboard (writes `teamMembers` + `properties` if empty).
6. Edit team at `/admin/team` — changes sync to `/about` via Firestore.

Without Firebase env vars the app still runs on local seed/mock data.

Demo admin: `admin@bharwana.example` / `admin123`

---

## 2. Put the repo on GitHub

In the project folder:

```bash
# if git is already initialized (it is)
git add .
git status   # confirm .env.local is NOT listed (it is gitignored)

git commit -m "$(cat <<'EOF'
Add Bharwana Estates frontend with Firestore team and properties sync.

EOF
)"
```

Create an empty GitHub repo (no README), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/bharwana-estates.git
git branch -M main
git push -u origin main
```

Or with GitHub CLI:

```bash
gh repo create bharwana-estates --private --source=. --remote=origin --push
```

Never commit `.env.local`.

---

## 3. Host on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the GitHub repo.
2. Framework: **Next.js** (auto-detected).
3. **Environment Variables** — add the same keys as `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_*` (all six)
   - `NEXT_PUBLIC_MAPBOX_TOKEN` (optional)
4. Deploy.
5. After deploy, open your Vercel URL → `/admin` → Seed Firestore once (same Firebase project as local).

### Custom domain (optional)

Vercel → Project → Settings → Domains → add `www.yourdomain.com`.

### Firebase + Vercel note

Client Firebase keys (`NEXT_PUBLIC_*`) are public by design. Protect data with **Firestore/Storage security rules** (and later Firebase Auth), not by hiding the API key.

---

## Collections

| Collection     | Used by                          |
|----------------|----------------------------------|
| `teamMembers`  | `/about`, `/admin/team`          |
| `properties`   | listings, map, admin properties  |

Photo uploads from Admin go to Storage path `team/{id}.jpg|png`.
