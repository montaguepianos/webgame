# Montague Pianos – “Melody Dash” (working title)

## Vision

A colourful, musical browser game themed to Montague Pianos — engaging for 1–3 minutes per session,
easy to embed on the website via iframe, with charming motion, crisp sound, and an addictive “just
one more go” loop.

## Core loop

- Player controls a lively piano character gliding along a staff.
- Notes and modifiers (sharp/flat tokens, rests, pedals) float in.
- Collect good notes to build a tune; avoid “sour” notes and dust bunnies from the workshop.
- Streaks build a simple backing chord progression; combo increases tempo and lights.
- End condition: timer runs out or 3 mistakes; show score and a short motif “composed” from collected notes.

## Montague flavour

- Palette: deep ebony, ivory, warm brass, pops of royal red & teal (colourful, not garish).
- Subtle shop details (e.g., “Est. 1879” badge; soft workshop background).
- Optional end-screen line linking to shop: “Play on a real one? Visit Montague Pianos.”

## Audio

- SFX: individual piano note samples (A3–C5) for pickups; soft thud for misses; magical twinkle for streaks.
- Music: a light 8–16 bar loop at 90–110 BPM, ducked under SFX.
- Volume slider and mute toggle.

## Stretch (nice-to-haves)

- Daily challenge seed.
- Global high-score table (Firestore).
- Accessibility: reduced motion setting; visual note captions.

## Technical

- Client: Phaser 3 + TypeScript + Vite.
- Server (optional, for scores): Node/Express + Firestore on Cloud Run.
- Test: Vitest for client; Jest for server.
- CI: GitHub Actions → build, lint, test; deploy on main.
- Embedding: responsive iframe 16:9; fallback to 4:3. Lightweight loader with brand.

## Definition of Done

- Smooth 60fps on modern laptops/mobiles.
- Lighthouse Perf ≥ 85 on desktop, ≥ 75 on mobile.
- Keyboard and touch input supported.
- All commands in AGENTS.md pass locally and in CI.
- Deployed URL returned and embeddable via `<iframe>`.
