import { useCallback, useEffect, useRef, useState } from 'react';
import { logActivity } from '../../lib/actions';
import { Emoji } from '../../components/ui';

// Bubble Wrap: a sheet of bubbles to pop, one satisfying pop at a time. Popping every bubble brings a fresh
// sheet (next level). Pop sounds are synthesised with the Web Audio API, so there are no audio files.

const ROWS = 12; // rows alternate 6 and 5 bubbles, offset like real bubble wrap
const rowSize = (r) => (r % 2 === 0 ? 6 : 5);
const TOTAL = Array.from({ length: ROWS }, (_, r) => rowSize(r)).reduce((a, b) => a + b, 0);
const SOUND_KEY = 'mindtrack.bubbleSound';

// ---------- Pop sound ----------
let audio = null;
let noise = null;
function playPop() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    if (!noise) {
      const len = Math.floor(audio.sampleRate * 0.08);
      noise = audio.createBuffer(1, len, audio.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    const t = audio.currentTime;
    // The "snap": a short burst of filtered noise, pitched a little differently every time.
    const src = audio.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.85 + Math.random() * 0.35;
    const band = audio.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1200 + Math.random() * 1000;
    band.Q.value = 1.1;
    const g = audio.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    src.connect(band).connect(g).connect(audio.destination);
    src.start(t);
    // The soft "thump" underneath.
    const osc = audio.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190 + Math.random() * 80, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
    const og = audio.createGain();
    og.gain.setValueAtTime(0.28, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(og).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  } catch {
    /* audio unavailable: popping still works silently */
  }
}

const readSound = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
};

// Popped bubbles get one of a few crinkle patterns at a random angle, so the sheet looks naturally used.
const CRINKLES = [
  'M18 34c8-6 14 4 22-3s14 5 22-2M22 50c10-4 16 5 26-1M30 22c6 5 14-2 20 4',
  'M16 40c10 2 12-10 24-6s14-6 24-2M26 26c4 8 14 4 18 12s12 2 16 8M24 54c8-3 12 3 20-2',
  'M20 28c10 8 18-6 28 2M18 46c6-6 16 2 22-4s12 4 20-2M34 58c4-6 10-2 14-8',
];
const newSheet = () => Array.from({ length: TOTAL }, () => ({ popped: false, crinkle: Math.floor(Math.random() * CRINKLES.length), turn: Math.floor(Math.random() * 360) }));

export default function BubblePop({ user }) {
  const [sheet, setSheet] = useState(newSheet);
  const [level, setLevel] = useState(1);
  const [total, setTotal] = useState(0);
  const [sound, setSound] = useState(readSound);
  const [cleared, setCleared] = useState(false);
  const startedAt = useRef(Date.now());
  const logged = useRef(false);
  const totalRef = useRef(0);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  // Counts toward wellness activities once per visit: after the first full sheet, or on leaving after a good break.
  const logBreak = useCallback(() => {
    if (logged.current) return;
    logged.current = true;
    const secs = Math.min(3600, Math.round((Date.now() - startedAt.current) / 1000));
    logActivity(user.id, 'bubble_pop', secs).catch(() => {}); // failures are shown as a toast
  }, [user.id]);
  useEffect(() => () => totalRef.current >= 20 && logBreak(), [logBreak]);

  const left = sheet.filter((b) => !b.popped).length;

  const pop = (i) => {
    if (sheet[i].popped || cleared) return;
    if (soundRef.current) playPop();
    navigator.vibrate?.(8);
    totalRef.current += 1;
    setTotal(totalRef.current);
    const next = sheet.map((b, j) => (j === i ? { ...b, popped: true } : b));
    setSheet(next);
    if (next.every((b) => b.popped)) {
      logBreak();
      setCleared(true);
      setTimeout(() => {
        setSheet(newSheet());
        setLevel((l) => l + 1);
        setCleared(false);
      }, 1400);
    }
  };

  const restart = () => {
    setSheet(newSheet());
    setCleared(false);
  };

  const toggleSound = () => {
    const v = !sound;
    setSound(v);
    try {
      localStorage.setItem(SOUND_KEY, v ? 'on' : 'off');
    } catch {
      /* not remembered */
    }
    if (v) playPop();
  };

  let i = 0;
  const rows = Array.from({ length: ROWS }, (_, r) => Array.from({ length: rowSize(r) }, () => i++));

  return (
    <div className="immersive wrap-bg">
      <header className="wrap-top">
        <a href="#/s/wellness" className="wrap-pill">
          ← Menu
        </a>
        <div className="wrap-title">
          <h1>Bubble Wrap</h1>
          <p>
            Level {level} · {left} left
          </p>
        </div>
        <div className="wrap-actions">
          <button type="button" className="wrap-pill icon" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? 'Sound on' : 'Sound off'} title={sound ? 'Sound on' : 'Sound off'}>
            <Emoji e={sound ? '🔊' : '🔈'} />
          </button>
          <button type="button" className="wrap-pill" onClick={restart}>
            Restart
          </button>
        </div>
      </header>

      <p className="wrap-hint">Pop each bubble. Take your time, there’s no timer. Popped so far: {total}</p>

      <div className={`wrap-sheet ${cleared ? 'cleared' : ''}`} key={level} role="group" aria-label={`Bubble wrap sheet, level ${level}. ${left} bubbles left.`}>
        {rows.map((row, r) => (
          <div className="wrap-row" key={r}>
            {row.map((n) => {
              const b = sheet[n];
              return (
                <button
                  key={n}
                  type="button"
                  className={`wrap-bubble ${b.popped ? 'popped' : ''}`}
                  aria-label={b.popped ? 'Popped' : 'Pop bubble'}
                  disabled={b.popped}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    pop(n);
                  }}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && e.buttons === 1 && pop(n)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pop(n))}
                >
                  {b.popped && (
                    <svg viewBox="0 0 80 80" aria-hidden="true" style={{ transform: `rotate(${b.turn}deg)` }}>
                      <path d={CRINKLES[b.crinkle]} />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        ))}
        {cleared && (
          <div className="wrap-cleared" role="status">
            <Emoji e="✨" />
            <strong>Sheet popped!</strong>
            <span>Here comes a fresh one…</span>
          </div>
        )}
      </div>
    </div>
  );
}
