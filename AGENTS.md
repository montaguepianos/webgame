# AGENTS.md

> This repository contains a Phaser 3 + TypeScript game (“Melody Dash”) with an optional Express/Firestore API. Agents (Codex/Cursor) must follow these instructions exactly.

## Repository layout (target)
- `game/` – Vite + TypeScript + Phaser 3 client
- `server/` – Express API for high scores (optional; behind feature flag)
- `shared/` – Types shared between client and server
- `assets/` – Audio, images, fonts (placeholders OK)
- `scripts/` – CI and helper scripts
- `docs/` – PRD and design notes

## Tooling
- Node 20 LTS
- pnpm 9.x
- TypeScript strict
- Lint: eslint + prettier (JS/TS), markdownlint
- Tests: Vitest (client), Jest (server)
- Coverage target: 85% lines

## Setup commands (Mac)
- Install pnpm: `corepack enable && corepack prepare pnpm@latest --activate`
- Install deps (workspace): `pnpm install`
- Copy env files:
  - `cp server/.env.example server/.env` (only if server used)
- Dev servers:
  - Client: `pnpm --filter game dev` (hot reload at http://localhost:5173)
  - Server: `pnpm --filter server dev` (http://localhost:8080)

## Unified scripts (run from repo root)
- `pnpm setup` – bootstrap workspace (install, prepare husky hooks)
- `pnpm build` – typecheck + build all packages
- `pnpm test` – run unit tests (client + server)
- `pnpm lint` – eslint + markdownlint
- `pnpm format` – prettier write
- `pnpm ci` – lint → typecheck → tests → build
- `pnpm start` – serve built client via Node in `server/` or a static server if server disabled

## Agent rules
- Read this file and `docs/PRD.md` before coding.
- Scaffold a **pnpm workspace** with `game`, `server`, and `shared`.
- Implement the game in `game/` using Phaser 3 scenes: `Boot`, `Preload`, `Menu`, `Play`, `GameOver`.
- Include responsive scaling, touch + keyboard input, pause/mute, and a framerate-safe main loop.
- Add basic audio manager using WebAudio; ship placeholder piano samples (generated or free).
- Add a settings modal (volume, reduced motion).
- Implement “scores” feature behind an env flag `VITE_ENABLE_SCORES`. When true, POST scores to `/api/scores`.
- If `server/` exists: Express with rate limiting, CORS, and Firestore. Provide endpoints:
  - `POST /api/scores` { name, score, seed, ts }
  - `GET /api/scores/top?limit=20`
- Tests: provide unit tests for scoring logic, scene transitions, and API validation.
- Performance: ensure sprite atlases, texture reuse, and capped particle counts.
- Accessibility: focus ring for buttons; reduced-motion toggles animations to fade/slide.

## Git and PR process
- Branches: `feat/*`, `fix/*`, `chore/*`.
- Commits: Conventional Commits.
- PRs must pass `pnpm ci`. If red, the agent must iterate until green.
- PR description must include a checklist plan and a short demo GIF/screenshot.

## Deployment (Cloud Run)
- Build container in CI for `server/` which serves both the **built client** (static) and the API.
- Expose port 8080.
- Use GitHub Actions workflow `.github/workflows/deploy.yml`:
  - On push to `main`: run `pnpm ci`; if green, build and push image to Artifact Registry, deploy to Cloud Run.
  - Secrets required:
    - `GCP_PROJECT_ID`
    - `GCP_REGION` (e.g. `europe-west2`)
    - `GCP_SA_JSON` (base64 of service account key with deploy + Firestore permissions)
- Output the live URL as a workflow summary.
- Provide an `embed.html` (thin wrapper) with an iframe pointing at `/` so Lee can copy-paste into the website.

## Security & secrets
- Never commit raw audio licensed content; start with placeholders.
- Don’t commit `.env`; provide `.env.example` with documented keys.
- Validate API payloads with `zod` and rate limit to deter spam.

## Definition of Done (agent checklist)
- [ ] Game loop complete with scoring and end screen.
- [ ] Audio implemented (SFX + loop), with mute/volume control.
- [ ] Mobile touch controls and desktop keyboard controls.
- [ ] Lighthouse perf budgets met; bundle size reported in PR.
- [ ] Tests ≥ 85% coverage on scoring and scene transitions.
- [ ] CI green; app deployed to Cloud Run; URL printed.
- [ ] `docs/EMBED.md` added with copy-paste snippet for iframe usage.