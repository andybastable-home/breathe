/* ============================================================
   Breathe — 4-7-8 breathing guide
   Vanilla JS, no build step. Preference persisted in localStorage.
   ============================================================ */

// The 4-7-8 technique: inhale 4s, hold 7s, exhale 8s. One cycle = 19s.
// `scale` is the orb size at the END of the phase (start is the prior phase's end).
// `c1`/`c2` are the orb gradient colours and `glow` its halo for that phase.
const PHASES = [
  { name: 'Breathe in',  secs: 4, scale: 1.0,  c1: '#6fd3c7', c2: '#4a9ed8', glow: 'rgba(111,211,199,.55)' },
  { name: 'Hold',        secs: 7, scale: 1.0,  c1: '#9d8cf0', c2: '#6a5acd', glow: 'rgba(157,140,240,.55)' },
  { name: 'Breathe out', secs: 8, scale: 0.55, c1: '#f6b07a', c2: '#ec7c8f', glow: 'rgba(246,176,122,.50)' },
];
const EXHALED_SCALE = PHASES[PHASES.length - 1].scale; // orb size at rest (fully exhaled)
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
  ensureAudio(); // create/resume the AudioContext inside the click gesture
  showScreen('session');
  phaseLabel.textContent = 'Breathe in';
  phaseCount.textContent = '';
  keepAwake();

  // Snap the orb to its fully exhaled size with no animation first. Going from
  // display:none to visible and changing --scale in the same frame would skip
  // the transition, so the first breath-in would pop to full size instead of
  // visibly growing. Reset + force a reflow, then animate on the next frame.
  orb.style.transition = 'none';
  orb.style.setProperty('--scale', EXHALED_SCALE);
  void orb.offsetWidth; // force reflow so the reset takes hold immediately
  orb.style.transition = ''; // restore the CSS transition (transform linear)

  requestAnimationFrame((now) => {
    session = {
      totalMs: minutes * 60 * 1000,
      startTs: now,
      phaseIdx: -1, // advancePhase() bumps this to 0
      phaseStartTs: now,
      rafId: 0,
    };
    advancePhase(now); // enter the first phase
    tick();
  });
}

function advancePhase(now) {
  session.phaseIdx = (session.phaseIdx + 1) % PHASES.length;
  session.phaseStartTs = now;
  const phase = PHASES[session.phaseIdx];

  // Size the orb toward this phase's target over its full duration. The two
  // durations map to the CSS transition properties in order: transform (full
  // phase) then box-shadow (a quick 600ms glow cross-fade).
  phaseLabel.textContent = phase.name;
  orb.style.transitionDuration = phase.secs + 's, 600ms';
  orb.style.setProperty('--scale', phase.scale);

  // Recolour the orb for this phase.
  orb.style.setProperty('--orb-1', phase.c1);
  orb.style.setProperty('--orb-2', phase.c2);
  orb.style.setProperty('--glow', phase.glow);

  ding();
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

// ---- Audio: a soft synthesized "ding" on each phase change ----
// Synthesized via Web Audio (no asset file) so it stays light and works offline.
let audioCtx = null;
function ensureAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function ding() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880; // gentle bell-ish pitch
  // Quick soft attack, long gentle decay.
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.13, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.85);
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
  if (document.visibilityState === 'visible' && session) {
    if (!wakeLock) keepAwake();
    ensureAudio(); // the AudioContext can suspend while backgrounded
  }
});

// ---- Service worker ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
