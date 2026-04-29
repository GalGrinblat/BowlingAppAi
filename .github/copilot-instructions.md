# CLAUDE.md — Bowling League Management System

> **Sync note**: This file is mirrored in [CLAUDE.md](../.claude/CLAUDE.md) for GitHub Copilot. When updating either file, update the other to keep them in sync.

## Tech Stack

- **React 19** + **TypeScript** (strict mode, no `any`)
- **Vite 7** — dev server on `http://localhost:5173`
- **Tailwind CSS 4** — utility-first, RTL support for Hebrew
- **Supabase** — PostgreSQL backend + auth
- **Jest** + **React Testing Library** — test suite in `tests/`
- **React Router v7** — URL-based routing with `createBrowserRouter`
- **vite-plugin-pwa** — PWA support, service worker, installable app

## Essential Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build (Vite → dist/)
npm test          # Run Jest test suite
npm run check     # Start-of-day health checks (lint, audit, sizes)
```

## Environment Setup

Create `.env.local` (copy from `.env.example`):
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Project Structure

```
src/
  components/
    admin/        # Admin dashboard, league/season/player/game management
    player/       # Player dashboard & stats views
    board/        # Public scoreboards (no auth required)
    score/        # Public score entry (no auth required)
    common/       # Header, Login, ErrorBoundary, Pagination
  router/
    index.tsx     # React Router v7 — createBrowserRouter, route guards, lazy loading
  services/api/   # Supabase API layer (organizationApi, playersApi, leaguesApi, seasonsApi, teamsApi, gamesApi, usersApi, boardApi)
  contexts/       # AuthContext (roles), LanguageContext (en/he), AdminDataContext
  hooks/          # Custom React hooks
  utils/          # Pure business logic — matchUtils, standingsUtils, scheduleUtils, statsUtils, etc.
  models/         # Data creators & default values
  types/          # Full TypeScript definitions (types/index.ts)
  constants/      # Bowling rules & limits (constants/bowling.ts)
  translations/   # i18n strings (English + Hebrew)
  lib/supabase.ts # Supabase client init
tests/
  unit/           # Utils and API layer
  component/      # React component tests
  integration/    # Full flow tests (scoringFlow, seasonFlow)
docs/
  admin/          # Admin-facing feature docs (GENERAL, leagues, seasons, print, users, settings)
  player/         # Player-facing feature docs (GENERAL, dashboard)
  public/         # Public feature docs (GENERAL, board, score entry)
  tech/           # Technical docs (routing, PWA, testing, Supabase setup, issues)
```

## Data Model Hierarchy

```
Organization
└── Player Registry (shared across leagues)
└── Leagues
    └── Seasons
        ├── Teams (players assigned from registry)
        ├── Games (multi-match scoring)
        └── Standings (calculated)
```

**Supabase tables**: `organization`, `players`, `leagues`, `seasons`, `teams`, `games`, `users`

**Key ENUMs**: `user_role` (admin/player), `season_status` (setup/active/completed), `game_status` (pending/in-progress/completed)

## Critical Business Logic

### Handicap
- Formula: `Math.floor((basis - average) * (percentage / 100))`
- Dynamic: recalculates before each game using completed season averages
- Config per league: `useHandicap`, `handicapBasis` (default 160), `handicapPercentage` (default 100%)
- Key files: [SeasonGame](../src/components/admin/game/SeasonGame.tsx), [standingsUtils](../src/utils/standingsUtils.ts)

### Scoring (multi-layer, all values configurable per league/season)
1. **Individual match points** — player vs player comparison with handicap (`playerMatchPointsPerWin`, default 1)
2. **Bonus points** — configurable thresholds vs player average (default: +1 if ≥ avg+50, +2 if ≥ avg+70)
3. **Match winner points** — team with higher total wins (`teamMatchPointsPerWin`, default 1)
4. **Grand total points** — team with highest combined pins across all matches (`teamGamePointsPerWin`, default 2)
- Draws always award 50% of the respective win points
- Key file: [matchUtils](../src/utils/matchUtils.ts)

### Scheduling
- Round-robin: each round = every team plays every other team once
- Split into match days (no team plays twice same day)
- Match days numbered continuously across rounds
- Odd team count: bye system
- Key file: [scheduleUtils](../src/utils/scheduleUtils.ts)

### Absent Players
- Score = average − 10
- Both players absent in a matchup → always a draw (each gets 50% of `playerMatchPointsPerWin`)

## Navigation & Routing

React Router v7 — `createBrowserRouter` in `src/router/index.tsx`, `RouterProvider` in `src/main.tsx`. All navigation state is in URL params.

```
Admin routes (RequireAdmin guard):
  /admin                              → AdminDashboard
  /admin/players                      → PlayerRegistry
  /admin/leagues                      → LeagueManagement
  /admin/leagues/:leagueId            → LeagueDetail
  /admin/leagues/:leagueId/seasons/new → SeasonCreator
  /admin/seasons/:seasonId            → SeasonDetail
  /admin/seasons/:seasonId/teams      → TeamManagement
  /admin/games/:gameId/play           → SeasonGame
  /admin/games/:gameId                → CompletedGameView
  /admin/settings                     → Settings
  /admin/users                        → UserManagement

Player routes (RequirePlayer guard):
  /player                             → PlayerDashboard
  /player/games/:gameId               → CompletedGameView

Public routes (no auth):
  /board                              → BoardHome
  /board/leagues/:leagueId            → BoardLeague
  /board/seasons/:seasonId            → BoardSeason
  /board/games/:gameId                → BoardGame
  /score/:gameId                      → PlayerScoreEntry (score entry for players)
```

All page components are lazy-loaded (`React.lazy` + `Suspense`). Use `useNavigate()` and `<Link>` for navigation.

## When Adding Features

| Task | Location |
|------|----------|
| New API entity | `src/services/api/` — follow existing pattern |
| New data model | `src/models/index.ts` |
| New admin view | `src/components/admin/` + route in `src/router/index.tsx` |
| New statistic | `src/utils/standingsUtils.ts` |
| Scoring change | `src/utils/matchUtils.ts` — test thoroughly |
| Schedule change | `src/utils/scheduleUtils.ts` |
| Head-to-head stats | `src/utils/headToHeadUtils.ts` |
| Player statistics | `src/utils/statsUtils.ts` |
| Pagination | Use `src/components/common/Pagination.tsx` |
| Public board feature | `src/components/public/board/` + `src/services/api/boardApi.ts` |
| Player score entry | `src/components/public/score/` + `src/components/admin/game/PendingSubmissionPanel.tsx` |

## Testing Conventions

- **All tests in** `tests/` (unit/, component/, integration/)
- Framework: Jest + ts-jest + @testing-library/react
- Coverage goals: 100% for business logic utils
- Run a single file: `npx jest tests/unit/utils/matchUtils.test.ts`
- Coverage report: `npx jest --coverage` → output in `coverage/`

## Code Conventions

- TypeScript strict mode — no `any`, no unused vars/params
- Path alias `@/*` maps to `src/*`
- Tailwind for all styling (no separate component CSS files)
- RTL support via Tailwind `dir:` variants for Hebrew
- i18n via `LanguageContext` + `translations/` — all user-facing strings should be translated

## User Roles

- **Admin**: full CRUD on all entities, records games
- **Player**: read-only standings, record own game scores, view personal stats

## Known Edge Cases

- Empty pin strings → treated as 0, excluded from calculations until fully entered
- Grand total points only awarded when **all** match scores are entered
- Players can appear in multiple leagues/seasons simultaneously
- Deleting a league/season requires no active games
- Roster substitutions tracked in `team.rosterChanges[]` with full history
