# Breathe — Claude Conventions

## Architecture
- Vanilla JS, no build step, static files served directly.
- No backend, no auth, no AI, no Dexie. The only persisted state is the chosen
  session length in `localStorage` (`breathe.minutes`).
- Single `app.js` (no modules, no bundler).

## The exercise
- 4-7-8 technique lives in the `PHASES` constant in `app.js` (inhale 4s, hold 7s,
  exhale 8s; one cycle = 19s). Treat that constant as the single source of truth.
- The session loop is driven by `requestAnimationFrame` against `performance.now()`
  timestamps — not `setInterval` — so timing stays accurate and the orb animation
  is smooth.
- The session ends on the next **phase boundary** after the timer expires, so it
  never cuts off mid-breath.

## Visuals
- Calm, Headspace-ish: indigo gradient canvas, a single glowing teal→blue orb that
  scales between exhaled (0.55) and inhaled (1.0). Phase text is a fixed-size overlay
  (`.orb-text`) so it doesn't scale with the orb.
- The orb's CSS transition *duration* is set per-phase from JS so the easing matches
  each phase length. Visual polish is intentionally a first pass — refine later.

## Version discipline
Every commit that changes shell files must:
1. Bump the footer version in `index.html` (`<span id="version">`).
2. Bump `CACHE_VERSION` in `service-worker.js` to the same value.

Both must stay in sync so the service worker invalidates the old cache.

## Deploy
GitHub Pages → branch `main` / root (no CI). `start_url`/`scope` set to `.` so the
`/breathe/` subpath works without path configuration.
