# Breathe — Claude Conventions

## Architecture
- Vanilla JS, no build step, static files served directly.
- No backend, no auth, no AI, no Dexie. Persisted state in `localStorage`:
  `breathe.minutes` (session length) and `breathe.muted` (sound on/off).
- Single `app.js` (no modules, no bundler).
- Cormorant Garamond (italic) loaded from Google Fonts; the woff2 files are cached
  by the service worker on first load, so the app works offline afterwards.

## The exercise
- 4-7-8 technique lives in the `PHASES` constant in `app.js` (inhale 4s, hold 7s,
  exhale 8s; one cycle = 19s). Treat that constant as the single source of truth.
- The session loop is driven by `requestAnimationFrame` against `performance.now()`
  timestamps — not `setInterval` — so timing stays accurate and motion is smooth.
- The session ends on the next **phase boundary** after the timer expires, so it
  never cuts off mid-breath.

## Visuals — the motion model
- Everything is driven by one CSS custom property, **`--breath`** (0 = fully
  exhaled, 1 = fully inhaled), which `tick()` sets every frame from the eased phase
  progress. CSS turns `--breath` into: the orb scale (`--orb-scale`), the ring
  expansion, and each shape's radius/scale/opacity. Don't reintroduce per-phase CSS
  transitions on the orb — the rAF-driven `--breath` is the single source.
- **Rings** (3) swell on the in-breath and contract *with* the orb on the exhale,
  tucking under it (fading) at the bottom of the breath.
- **Shapes** (9, stars or motes) ride the rings: each sits in an `.orbit` wrapper
  that spins via a *continuous* CSS animation (never restarts, so motion carries
  across phases), at a radius mirroring its ring. They fade in/grow on the inhale,
  hold full, and shrink to nothing at the bottom of the exhale.
- **Two colourways** chosen by time of day in the inline `<head>` script (Aubade
  06:00–18:00, Celeste otherwise) via a `t-aubade`/`t-celeste` class on `<html>`;
  all colours are CSS vars scoped to those classes. The shape type (star vs mote)
  and the dynamic `theme-color` meta follow the same class.
- The app icon is the **Celeste** night variant (single static `icons/icon.svg`).
- `design-prototype.html` is the standalone design playground/reference.

## Version discipline
Every commit that changes shell files must:
1. Bump the footer version in `index.html` (`<span id="version">`).
2. Bump `CACHE_VERSION` in `service-worker.js` to the same value.

Both must stay in sync so the service worker invalidates the old cache.

## Deploy
GitHub Pages → branch `main` / root (no CI). `start_url`/`scope` set to `.` so the
`/breathe/` subpath works without path configuration.
