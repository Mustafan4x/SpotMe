# SpotMe - Fitness Workout Tracker

A mobile-first fitness tracking Progressive Web App (PWA) built with Next.js, Supabase, and Tailwind CSS. Create custom workout routines, log sets/reps/RIR per exercise, and visualize your progress over time through charts and trend analysis.

Designed for a small group of users (up to 10), each with their own account, multiple routines, and persistent workout history. Installs on your iPhone home screen and works like a native app.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Charts:** Recharts
- **Backend/Database:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Offline Storage:** IndexedDB via `idb`
- **Hosting:** Vercel
- **Icons:** Lucide React

## Prerequisites

- Node.js 18+
- npm 9+
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account (for deployment)

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/Mustafan4x/SpotMe.git
cd SpotMe
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project (free tier)
2. Enable **Email/Password** authentication in Authentication > Providers
3. Go to the SQL Editor and run the migration files in order:

```bash
# Copy and paste the contents of these files into the Supabase SQL Editor:
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_hardening.sql
supabase/seed.sql
```

4. Go to Settings > API and copy your **Project URL** and **anon/public key**

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploying to Vercel

### Option A: Auto-deploy via GitHub

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com), import the repo
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in Vercel project settings
4. Deploy -- Vercel auto-builds on every push to `main`

### Option B: Manual deploy

```bash
npx vercel --prod
```

## Installing on Your iPhone

SpotMe is a PWA (Progressive Web App). Once deployed to Vercel, you can install it on your iPhone and it will look and feel like a native app:

1. **Open Safari** on your iPhone (must be Safari, not Chrome)
2. Navigate to your Vercel deployment URL (e.g., `https://spotme-yourname.vercel.app`)
3. Tap the **Share button** (the square with the upward arrow at the bottom of Safari)
4. Scroll down and tap **"Add to Home Screen"**
5. Name it "SpotMe" (or leave the default) and tap **Add**
6. SpotMe now appears on your home screen with its own icon
7. Open it from the home screen -- it runs in full-screen mode with no browser chrome

The app will:
- Open instantly from the home screen (cached shell)
- Work offline (workouts sync when you're back online)
- Persist your login across sessions
- Look and feel like a native iOS app

## Features

- **User Accounts** -- Email/password auth with Supabase, isolated data per user
- **Custom Routines** -- Create, edit, duplicate, delete workout routines
- **Exercise Library** -- 30 pre-loaded exercises + create your own
- **Workout Logging** -- Log sets, reps, weight, and RIR with "last time" reference data
- **Progress Charts** -- Weight over time, volume, rep progression, estimated 1RM
- **Dashboard** -- Weekly summary, streak counter, PR highlights
- **Offline Support** -- Log workouts without internet, auto-sync when back online
- **Dark Mode** -- Default dark theme with light mode toggle
- **Mobile-First** -- Designed for iPhone (375px-430px), 44px+ touch targets

## Project Structure

```
SpotMe/
  src/
    app/              # Next.js App Router pages
    components/
      ui/             # Reusable UI primitives (Button, Card, Input, Modal, etc.)
      charts/         # Recharts components (WeightOverTime, VolumeChart, etc.)
      workout/        # Workout logging components (SetRow, ExerciseCard)
      layout/         # Navigation, Header, BottomTabs, PWA components
    lib/
      supabase.ts     # Supabase client
      database.ts     # All database CRUD operations
      types.ts        # TypeScript interfaces
      calculations.ts # 1RM, volume, trend analysis, PR detection
      offline.ts      # IndexedDB offline storage + sync
      validation.ts   # Input validation functions
      auth-utils.ts   # Auth helper functions
    hooks/            # React hooks (useAuth, useWorkout, useProgress, useOffline)
  supabase/
    migrations/       # SQL schema + RLS policies
    seed.sql          # Default exercise data
  public/
    sw.js             # Service worker
    manifest.json     # PWA manifest
    icons/            # App icons
  __tests__/          # Vitest test suites
```

## Running Tests

```bash
npx vitest run
```

136 tests across 4 suites: calculations, database queries, offline storage, and input validation.

## Build Stats

This application was built end-to-end using 14 parallel AI agents across 3 waves:

| Metric | Value |
|--------|-------|
| Total tokens | ~700,000 |
| Agent dispatches | 14 |
| Tool invocations | 365+ |
| Agent compute time | 55 minutes |
| Test suites | 4 (136 tests) |
| Routes | 8 |
| Components | 30+ |

## License

MIT
