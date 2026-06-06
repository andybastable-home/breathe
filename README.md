# Breathe

A tiny Progressive Web App that guides paced breathing with the **4-7-8 technique**
(inhale 4s, hold 7s, exhale 8s). Pick a session length, hit Start, and follow the orb.

Built for installing on a phone home screen — works offline once loaded.

## How it works

- One breath cycle is 19 seconds (4 + 7 + 8).
- Set the session length (default **3 minutes**, range 1–15) with the +/− steppers,
  then tap **Begin**.
- A glowing orb grows on the in-breath, holds, and shrinks on the out-breath, ringed
  by concentric circles and orbiting stars that sweep wide as you breathe in and
  settle as you breathe out. The phase name shows below.
- Two colourways follow the clock: **Aubade** (warm dawn) through the day and
  **Celeste** (night sky) in the evening, switching at 6pm.
- A soft chime marks each phase change; tap the speaker icon to mute (remembered).
- The session ends cleanly on the next phase boundary once your time is up, so it
  never cuts off mid-breath.
- Your chosen length and mute preference are remembered (localStorage). No accounts,
  no backend; works offline once loaded.

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
