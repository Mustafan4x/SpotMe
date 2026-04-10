# SpotMe - Fitness Workout Tracker

## Overview

Mobile-first fitness tracking application that lets users create custom workout routines, log sets/reps/RIR per exercise, and visualize their progress over time through charts, graphs, and trend analysis. Built as a Progressive Web App (PWA) deployed on Vercel so it installs and behaves like a native iPhone app — home screen icon, full-screen mode, no browser chrome.

Designed for a small user base (up to 10 people), each with their own account, multiple routines, and persistent workout history.

## Target Users

- Small group of friends (under 10 users)
- Mixed fitness experience levels
- Primary device: iPhone (all models)
- Varying scientific literacy — the app must present data in a way that anyone can understand without needing to know exercise science terminology

## Core Features

### 1. User Accounts
- Simple email/password authentication via Supabase Auth
- Each user has their own isolated data
- Login persists across sessions (no re-login on app reopen)
- No social features, no sharing, no public profiles

### 2. Workout Routines
- Users can create multiple named routines (e.g., "Push Day", "Full Body", "Leg Day")
- Each routine contains an ordered list of exercises
- Exercises can be added, removed, reordered within a routine
- Routines can be duplicated, renamed, or deleted
- No limit on number of routines per user

### 3. Exercise Library
- Users can add custom exercises with a name and optional muscle group tag
- Pre-populated library of common exercises (bench press, squat, deadlift, overhead press, barbell row, pull-up, etc.)
- Exercises are reusable across multiple routines
- Exercise names are searchable when adding to a routine

### 4. Workout Logging
Each time a user performs a routine, they create a workout log entry:

| Field | Type | Description |
|-------|------|-------------|
| Date | datetime | Auto-filled, editable |
| Exercise | reference | From the routine's exercise list |
| Set number | integer | 1, 2, 3, ... |
| Reps | integer | Number of repetitions performed |
| Weight | decimal | Weight used (lbs) |
| RIR | integer | Reps In Reserve (0-5). Displayed with plain-language labels: 0 = "Nothing left", 1 = "Maybe 1 more", 2 = "Could do 2 more", 3 = "Comfortable", 4 = "Easy", 5 = "Very easy" |

- Users tap through exercises in order, logging each set
- Previous workout's numbers are shown as reference ("Last time: 135 lbs x 8 reps")
- Quick-fill: tap to copy last session's weight/reps as starting point
- Add extra sets beyond the routine's default
- Skip exercises if needed
- Save partial workouts (don't lose data if app is closed mid-workout)

### 5. Progress Visualization

All charts must be simple and intuitive — no jargon, clear labels, plain-language explanations.

#### Per-Exercise Charts
- **Weight over time** — line chart showing max weight used per session, with trend line
- **Volume over time** — bar chart showing total volume (sets x reps x weight) per session
- **Rep progression** — line chart showing reps at a given weight over time
- **Estimated 1RM trend** — line chart with simple label: "Estimated max you could lift once"

#### Per-Routine Charts
- **Session frequency** — calendar heatmap or bar chart showing how often the routine was performed
- **Total volume per session** — stacked bar chart broken down by exercise

#### Dashboard (Home Screen)
- **Weekly summary** — total workouts this week, total sets, total volume
- **Streak counter** — consecutive weeks with at least one workout
- **Recent workouts** — last 5 sessions with routine name, date, and quick stats
- **Progress highlights** — auto-detected PRs (personal records) called out plainly: "New best! Bench Press: 185 lbs x 5"

#### Progress Indicators
Every chart includes a simple, color-coded indicator:
- Green arrow up: "You're improving"
- Yellow dash: "Holding steady"
- Red arrow down: "Trending down"

Trend is calculated from the last 4 sessions using simple linear regression. The label shown to the user is always plain language, never a number or coefficient.

### 6. Data Persistence
- All data stored in Supabase (PostgreSQL)
- Offline support: workouts can be logged without internet, synced when connection returns
- Data persists across app closes, phone restarts, and device changes (tied to account)
- No data loss on app update

## Data Model

### Tables

```
users (managed by Supabase Auth)
  id: uuid (PK)
  email: text
  created_at: timestamp

routines
  id: uuid (PK)
  user_id: uuid (FK -> users)
  name: text
  created_at: timestamp
  updated_at: timestamp

exercises
  id: uuid (PK)
  user_id: uuid (FK -> users)
  name: text
  muscle_group: text (optional)
  is_default: boolean (true for pre-populated exercises)

routine_exercises
  id: uuid (PK)
  routine_id: uuid (FK -> routines)
  exercise_id: uuid (FK -> exercises)
  order_index: integer
  default_sets: integer (default: 3)

workout_sessions
  id: uuid (PK)
  user_id: uuid (FK -> users)
  routine_id: uuid (FK -> routines)
  started_at: timestamp
  completed_at: timestamp (nullable — null if in progress)

workout_sets
  id: uuid (PK)
  session_id: uuid (FK -> workout_sessions)
  exercise_id: uuid (FK -> exercises)
  set_number: integer
  reps: integer
  weight: decimal
  rir: integer (0-5)
  logged_at: timestamp
```

### Row Level Security
- All tables enforce RLS: users can only read/write their own data
- Supabase Auth JWT used for all API calls

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (App Router) | PWA support, fast, Vercel-native |
| UI Library | Tailwind CSS | Rapid mobile-first styling |
| Charts | Recharts | Lightweight, React-native, responsive |
| State Management | React Context + SWR | Simple, no extra deps for this scale |
| Backend/Database | Supabase (PostgreSQL + Auth + Realtime) | Free tier covers 10 users forever |
| Hosting | Vercel | Free, global CDN, zero-config deploys |
| Offline Storage | IndexedDB (via idb) | Cache workouts locally for offline use |

## PWA Requirements

The app must be installable on iPhone and behave like a native app:

- `manifest.json` with app name, icons (192x192, 512x512), theme color, `display: standalone`
- Service worker for offline caching (static assets + API responses)
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- Apple touch icons for all iPhone models
- Splash screens for all iPhone screen sizes
- No horizontal scroll, no pinch-to-zoom issues
- Safe area insets respected (notch, home indicator)
- Touch targets minimum 44x44px (Apple HIG)
- Smooth scrolling, no janky animations
- App loads instantly from home screen (cached shell)

## UI/UX Guidelines

- **Dark mode by default** with optional light mode toggle
- **No emojis anywhere in the UI** — use icons (Lucide or Heroicons) instead
- Clean, minimal aesthetic — generous whitespace, clear hierarchy
- Bottom tab navigation (Home, Routines, Log Workout, Progress, Settings)
- Large, tappable buttons — designed for one-handed use
- Numbers and stats displayed in large, bold fonts
- Charts are interactive (tap a data point to see details)
- Loading states for all async operations (skeleton screens, not spinners)
- Error states are friendly and actionable ("Couldn't save. Tap to retry.")
- All text is readable without zooming on any iPhone screen size

## Design Reference

The frontend design should be based on the image file `design.*` (to be added). This file serves as the visual direction for colors, layout, spacing, and component styling. The implementation should match this design as closely as possible.

## Configuration

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Setup
- Create project at supabase.com (free tier)
- Enable Email/Password auth
- Run migration SQL to create tables + RLS policies
- No additional server-side config needed

## Project Structure

```
~/src/SpotMe/
  SPEC.md                          # this file
  TASKS.md                         # agent task assignments
  design.*                         # visual design reference (to be added)
  package.json
  next.config.js
  tailwind.config.js
  tsconfig.json
  manifest.json                    # PWA manifest
  public/
    icons/                         # PWA icons (192, 512)
    splash/                        # Apple splash screens
    sw.js                          # Service worker
  src/
    app/
      layout.tsx                   # Root layout (PWA meta, Supabase provider)
      page.tsx                     # Home / Dashboard
      routines/
        page.tsx                   # Routine list
        [id]/page.tsx              # Routine detail / edit
      log/
        page.tsx                   # Active workout logging
      progress/
        page.tsx                   # Charts and analytics
      settings/
        page.tsx                   # User settings
      login/
        page.tsx                   # Auth page
    components/
      ui/                          # Reusable UI primitives (Button, Card, Input, etc.)
      charts/                      # Chart components (WeightOverTime, VolumeChart, etc.)
      workout/                     # Workout-specific components (SetRow, ExerciseCard, etc.)
      layout/                      # Navigation, Header, BottomTabs
    lib/
      supabase.ts                  # Supabase client init
      database.ts                  # Database query functions
      offline.ts                   # IndexedDB offline sync logic
      calculations.ts              # 1RM estimation, trend analysis, volume calculations
      types.ts                     # TypeScript interfaces for all data models
    hooks/
      useAuth.ts                   # Auth state hook
      useWorkout.ts                # Active workout state
      useProgress.ts               # Chart data fetching
      useOffline.ts                # Offline detection + sync

  supabase/
    migrations/
      001_initial_schema.sql       # Tables, indexes, RLS policies
    seed.sql                       # Default exercises

  .gitignore
  .env.local                       # Supabase keys (gitignored)
```

## Usage

### Development
```bash
cd ~/src/SpotMe
npm install
npm run dev          # starts Next.js dev server at localhost:3000
```

### Deploy
```bash
# Connect repo to Vercel, push to main — auto-deploys
# Or manually:
npx vercel --prod
```

### Database Setup
```bash
# Run migrations against Supabase
npx supabase db push
# Seed default exercises
npx supabase db seed
```

## Phase 2 (Future)

- Workout templates shared between users
- Rest timer with configurable durations
- Body weight tracking
- Progress photos (stored in Supabase Storage)
- Export data as CSV
- Apple Watch integration (if demand exists)
