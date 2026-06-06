# Breathe

A tiny Progressive Web App that guides paced breathing with the **4-7-8 technique**
(inhale 4s, hold 7s, exhale 8s). Pick a session length, hit Start, and follow the orb.

Built for installing on a phone home screen — works offline once loaded.

## How it works

- One breath cycle is 19 seconds (4 + 7 + 8).
- Set the session length (default **3 minutes**, range 1–15) with the +/− steppers.
- The orb grows on the in-breath, holds, and shrinks on the out-breath, with the
  phase name and a per-phase countdown in the centre.
- The session ends cleanly on the next phase boundary once your time is up, so it
  never cuts off mid-breath.
- Your chosen length is remembered (localStorage). No accounts, no backend.

## Run locally

```sh
npx serve .
# or
python -m http.server 8000
```

Open http://localhost:8000 in Chrome.

## Deploy

GitHub Pages → Settings → Pages → Deploy from branch → `main` / root.

`start_url` and `scope` in `manifest.json` are set to `.` so the app works under the
`/breathe/` subpath without extra configuration.

## Install on a phone

Open the deployed URL in Chrome on Android → menu → **Add to Home screen**.
It launches standalone (no browser chrome) and keeps the screen awake during a session.
