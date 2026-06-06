/* ============================================================
   Breathe — 4-7-8 breathing guide
   Vanilla JS, no build step. The session loop drives --breath every frame;
   CSS turns that into the orb scale, ring expansion, and shape life. The orbit
   animation is pure CSS (continuous), so the shapes never stop moving.
   ============================================================ */

// The 4-7-8 technique: inhale 4s, hold 7s, exhale 8s. One cycle = 19s.
const PHASES = [
  { name: 'Breathe in',  secs: 4, type: 'in'   },
  { name: 'Hold',        secs: 7, type: 'hold' },
  { name: 'Breathe out', secs: 8, type: 'out'  },
];
const MIN_MINUTES = 1;
const MAX_MINUTES = 15;
const KEY_MIN = 'breathe.minutes';
const KEY_MUTE = 'breathe.muted';

const root = document.documentElement;
const easeInOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;

// ---- DOM ----
const screens = {
  setup: document.getElementById('setup'),
  session: document.getElementById('session'),
  done: document.getElementById('done'),
};
const durMinsEl = document.getElementById('dur-mins');
const phaseLabel = document.getElementById('phase-label');
const countEl = document.getElementById('count');
const timeLeftEl = document.getElementById('time-left');
const doneSub = document.getElementById('done-sub');

// ---- State ----
let minutes = loadMinutes();
let session = null; // { totalMs, startTs, phaseIdx, phaseStartTs, rafId }

durMinsEl.textContent = minutes;
syncThemeColor();

// ---- Preferences ----
function loadMinutes() {
  const saved = parseInt(localStorage.getItem(KEY_MIN), 10);
  return Number.isFinite(saved) ? clampMinutes(saved) : 3; // default 3 minutes
}
function clampMinutes(m) { return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, m)); }
function setMinutes(m) {
  minutes = clampMinutes(m);
  durMinsEl.textContent = minutes;
  localStorage.setItem(KEY_MIN, String(minutes));
}

// ---- Listeners ----
document.getElementById('dur-up').addEventListener('click', () => setMinutes(minutes + 1));
document.getElementById('dur-down').addEventListener('click', () => setMinutes(minutes - 1));
document.getElementById('start-btn').addEventListener('click', startSession);
document.getElementById('again-btn').addEventListener('click', () => showScreen('setup'));
document.getElementById('stop-btn').addEventListener('click', () => endSession(false));
document.querySelectorAll('.mute').forEach((b) => b.addEventListener('click', toggleMute));

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
}

// ---- Mute ----
function toggleMute() {
  const muted = !root.classList.contains('muted');
  root.classList.toggle('muted', muted);
  localStorage.setItem(KEY_MUTE, muted ? '1' : '0');
  if (!muted) ensureAudio(); // unlock audio inside this click gesture
}

// ---- Set the address/status-bar colour to match the colourway ----
function syncThemeColor() {
  const meta = document.getElementById('theme-color-meta');
  if (meta && root.dataset.themeColor) meta.setAttribute('content', root.dataset.themeColor);
}

// ============================================================
// Decorative stage: 3 rings + 9 orbiting shapes (stars / motes)
// ============================================================
const RING_SPEC = [ { k: .4, of: .9 }, { k: .75, of: .62 }, { k: 1.1, of: .42 } ];
const SHAPE_SVG = {
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c.9 6.4 4.7 10.2 11.1 11.1C16.7 12 12.9 15.8 12 22.2 11.1 15.8 7.3 12 .9 11.1 7.3 10.2 11.1 6.4 12 0z"/></svg>',
  mote: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="7"/></svg>',
};

function buildStage() {
  const rings = document.getElementById('rings');
  const decor = document.getElementById('decor');
  const type = root.classList.contains('t-celeste') ? 'star' : 'mote';

  for (const s of RING_SPEC) {
    const r = document.createElement('span');
    r.className = 'ring';
    r.style.setProperty('--k', s.k);
    r.style.setProperty('--of', s.of);
    rings.appendChild(r);
  }

  const N = 9;
  for (let i = 0; i < N; i++) {
    const ringK = RING_SPEC[i % RING_SPEC.length].k; // spread evenly across rings

    const orbit = document.createElement('div');
    orbit.className = 'orbit';
    orbit.style.setProperty('--dur', (20 + Math.random() * 22).toFixed(1) + 's');
    orbit.style.setProperty('--dir', Math.random() < 0.5 ? 'normal' : 'reverse');
    orbit.style.animationDelay = '-' + (Math.random() * 40).toFixed(1) + 's'; // random start angle

    const sp = document.createElement('span');
    sp.className = 'shape' + (type === 'star' ? ' spin' : '');
    sp.style.setProperty('--ring-k', ringK);
    sp.style.setProperty('--sz', (0.05 + Math.random() * 0.035).toFixed(3)); // size as fraction of orb
    sp.style.setProperty('--so', (0.7 + Math.random() * 0.3).toFixed(2));
    sp.style.setProperty('--twdur', (12 + Math.random() * 10).toFixed(1) + 's');
    sp.innerHTML = SHAPE_SVG[type];

    orbit.appendChild(sp);
    decor.appendChild(orbit);
  }
}
buildStage(); // build the decorative stage once, now that RING_SPEC exists

// ============================================================
// Session
// ============================================================
function startSession() {
  ensureAudio(); // create/resume the AudioContext inside the click gesture
  root.style.setProperty('--breath', '0'); // start fully exhaled
  phaseLabel.textContent = 'Breathe in';
  showScreen('session');
  keepAwake();

  requestAnimationFrame((now) => {
    session = { totalMs: minutes * 60 * 1000, startTs: now, phaseIdx: -1, phaseStartTs: now, rafId: 0 };
    advancePhase(now); // enter the first phase
    tick();
  });
}

function advancePhase(now) {
  session.phaseIdx = (session.phaseIdx + 1) % PHASES.length;
  session.phaseStartTs = now;
  phaseLabel.textContent = PHASES[session.phaseIdx].name;
  ding();
  vibrate();
}

function tick() {
  const now = performance.now();
  const remaining = Math.max(0, session.totalMs - (now - session.startTs));
  timeLeftEl.textContent = formatClock(Math.ceil(remaining / 1000));

  const phase = PHASES[session.phaseIdx];
  const local = Math.min(1, (now - session.phaseStartTs) / 1000 / phase.secs);

  // Drive the breath: eased 0→1 inhaling, held at 1, eased 1→0 exhaling.
  let breath;
  if (phase.type === 'in') breath = easeInOutSine(local);
  else if (phase.type === 'hold') breath = 1;
  else breath = easeInOutSine(1 - local);
  root.style.setProperty('--breath', breath.toFixed(4));

  // Subtle per-phase countdown in the orb (seconds remaining in this phase).
  const count = String(Math.max(1, Math.ceil(phase.secs * (1 - local))));
  if (countEl.textContent !== count) countEl.textContent = count;

  if (local >= 1) {
    // End the session at a phase boundary once time is up, so we never cut off
    // mid-breath. Otherwise advance to the next phase.
    if (remaining <= 0) { endSession(true); return; }
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
  if (!root.classList.contains('muted') && navigator.vibrate) navigator.vibrate(20);
}

// ---- Audio: a soft synthesized chime on each phase change ----
// Synthesized via Web Audio (no asset file) so it stays light and works offline.
let audioCtx = null;
function ensureAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function ding() {
  if (root.classList.contains('muted') || !audioCtx) return;
  const t = audioCtx.currentTime;

  // A lowpass rolls off any harsh high edge for a soft, warm tone.
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1100;
  filter.Q.value = 0.7;
  filter.connect(audioCtx.destination);

  // Two quiet sine partials a perfect fifth apart — a calm, open chime, with a
  // slow attack (no click) and a long gentle decay.
  const partials = [ { freq: 432, peak: 0.09 }, { freq: 648, peak: 0.035 } ];
  for (const { freq, peak } of partials) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    osc.connect(gain).connect(filter);
    osc.start(t);
    osc.stop(t + 1.85);
  }
}

// ---- Keep the screen awake during a session (Chrome on Pixel) ----
let wakeLock = null;
async function keepAwake() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); }
  catch { /* non-critical */ }
}
function releaseWake() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
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
