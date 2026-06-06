/* ============================================================
   Breathe — 4-7-8 breathing guide
   Vanilla JS, no build step. Preference persisted in localStorage.
   ============================================================ */

// The 4-7-8 technique: inhale 4s, hold 7s, exhale 8s. One cycle = 19s.
// `scale` is the orb size at the END of the phase (start is the prior phase's end).
const PHASES = [
  { name: 'Breathe in', secs: 4, scale: 1.0 },
  { name: 'Hold',       secs: 7, scale: 1.0 },
  { name: 'Breathe out', secs: 8, scale: 0.55 },
];
const CYCLE_SECS = PHASES.reduce((t, p) => t + p.secs, 0); // 19
const MIN_MINUTES = 1;
const MAX_MINUTES = 15;
const STORAGE_KEY = 'breathe.minutes';

// ---- DOM ----
const screens = {
  setup: document.getElementById('setup'),
  session: document.getElementById('session'),
  done: document.getElementById('done'),
};
const durMinsEl = document.getElementById('dur-mins');
const orb = document.getElementById('orb');
const phaseLabel = document.getElementById('phase-label');
const phaseCount = document.getElementById('phase-count');
const timeLeftEl = document.getElementById('time-left');
const doneSub = document.getElementById('done-sub');

// ---- State ----
let minutes = loadMinutes();
let session = null; // { totalMs, startTs, phaseIdx, phaseStartTs, rafId }

durMinsEl.textContent = minutes;

// ---- Setup screen ----
function loadMinutes() {
  const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
  if (Number.isFinite(saved)) return clampMinutes(saved);
  return 3; // default 3 minutes
}
function clampMinutes(m) {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, m));
}
function setMinutes(m) {
  minutes = clampMinutes(m);
  durMinsEl.textContent = minutes;
  localStorage.setItem(STORAGE_KEY, String(minutes));
}

document.getElementById('dur-up').addEventListener('click', () => setMinutes(minutes + 1));
document.getElementById('dur-down').addEventListener('click', () => setMinutes(minutes - 1));
document.getElementById('start-btn').addEventListener('click', startSession);
document.getElementById('again-btn').addEventListener('click', () => showScreen('setup'));
document.getElementById('stop-btn').addEventListener('click', () => endSession(false));

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.hidden = key !== name;
  }
}

// ---- Session ----
function startSession() {
  const now = performance.now();
  session = {
    totalMs: minutes * 60 * 1000,
    startTs: now,
    phaseIdx: -1, // advancePhase() bumps this to 0
    phaseStartTs: now,
    rafId: 0,
  };
  showScreen('session');
  keepAwake();
  advancePhase(now); // enter the first phase
  tick();
}

function advancePhase(now) {
  session.phaseIdx = (session.phaseIdx + 1) % PHASES.length;
  session.phaseStartTs = now;
  const phase = PHASES[session.phaseIdx];

  // Size the orb toward this phase's target over its full duration.
  phaseLabel.textContent = phase.name;
  orb.style.transitionDuration = phase.secs + 's';
  orb.style.setProperty('--scale', phase.scale);

  vibrate();
}

function tick() {
  const now = performance.now();
  const totalElapsed = now - session.startTs;
  const remaining = Math.max(0, session.totalMs - totalElapsed);

  // Time-left clock
  timeLeftEl.textContent = formatClock(Math.ceil(remaining / 1000));

  // Phase countdown (seconds remaining in the current phase)
  const phase = PHASES[session.phaseIdx];
  const phaseElapsed = (now - session.phaseStartTs) / 1000;
  const phaseRemaining = Math.max(0, Math.ceil(phase.secs - phaseElapsed));
  phaseCount.textContent = phaseRemaining;

  if (phaseElapsed >= phase.secs) {
    // End the session at a phase boundary once time is up, so we never
    // cut off mid-breath. Otherwise move to the next phase.
    if (remaining <= 0) {
      endSession(true);
      return;
    }
    advancePhase(now);
  }

  session.rafId = requestAnimationFrame(tick);
}

function endSession(completed) {
  if (!session) return;
  cancelAnimationFrame(session.rafId);
  session = null;
  releaseWake();
  if (completed) {
    doneSub.textContent = `You finished ${minutes} minute${minutes === 1 ? '' : 's'}.`;
    showScreen('done');
  } else {
    showScreen('setup');
  }
}

// ---- Helpers ----
function formatClock(totalSecs) {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function vibrate() {
  if (navigator.vibrate) navigator.vibrate(20);
}

// Keep the screen on during a session where supported (Chrome on Pixel).
let wakeLock = null;
async function keepAwake() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch { /* ignore — non-critical */ }
}
function releaseWake() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
// Re-acquire the wake lock if the user tabs away and back mid-session.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && session && !wakeLock) keepAwake();
});

// ---- Service worker ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
