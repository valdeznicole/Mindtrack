import { useEffect, useRef, useState } from 'react';
import { logActivity } from '../../lib/actions';
import { Button, Segmented, Emoji } from '../../components/ui';

const PHASES = [
  { key: 'inhale', label: 'INHALE', hint: 'Breathe in slowly through your nose', secs: 4, scale: 1 },
  { key: 'hold', label: 'HOLD', hint: 'Gently hold your breath', secs: 4, scale: 1 },
  { key: 'exhale', label: 'EXHALE', hint: 'Breathe out slowly through your mouth', secs: 6, scale: 0.55 },
];
const DURATIONS = [
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
];
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const VOLUME_KEY = 'mindtrack.breathVolume';
const readVolume = () => {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return localStorage.getItem(VOLUME_KEY) != null && v >= 0 && v <= 100 ? v : 70;
  } catch {
    return 70;
  }
};

// Calm pad that swells on the inhale and fades on the exhale, plus a soft chime at each phase change.
// Chord: G3 + D4 with gentle overtones (G4, D5) so it is audible on phone and laptop speakers, which barely
// reproduce low tones. Everything runs through a volume control and a limiter, so it can be loud without distortion.
function useCalmSound(active, phase, volume) {
  const ctx = useRef(null);
  const nodes = useRef(null);
  useEffect(() => {
    if (!active) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 8;
    limiter.ratio.value = 12;
    limiter.connect(ac.destination);
    const master = ac.createGain(); // the user's volume
    master.gain.value = (volume / 100) ** 2;
    master.connect(limiter);
    const swell = ac.createGain(); // follows the breathing phases
    swell.gain.value = 0;
    swell.connect(master);
    const oscs = [
      [196, 1, 'sine'],
      [294, 0.55, 'sine'],
      [392, 0.3, 'triangle'],
      [587, 0.12, 'sine'],
    ].map(([freq, level, type]) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ac.createGain();
      g.gain.value = level;
      o.connect(g).connect(swell);
      o.start();
      return o;
    });
    ctx.current = ac;
    nodes.current = { swell, master };
    return () => {
      swell.gain.setTargetAtTime(0, ac.currentTime, 0.2);
      setTimeout(() => {
        oscs.forEach((o) => o.stop());
        ac.close();
      }, 600);
      nodes.current = null;
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active || !nodes.current) return;
    const ac = ctx.current;
    const target = phase.key === 'inhale' ? 0.32 : phase.key === 'hold' ? 0.24 : 0.1;
    nodes.current.swell.gain.setTargetAtTime(target, ac.currentTime, phase.secs / 3);
    // Soft chime marking the new phase (higher for inhale, lower for exhale).
    const t = ac.currentTime;
    const bell = ac.createOscillator();
    bell.type = 'sine';
    bell.frequency.value = phase.key === 'inhale' ? 784 : phase.key === 'hold' ? 659 : 523;
    const bg = ac.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    bell.connect(bg).connect(nodes.current.master);
    bell.start(t);
    bell.stop(t + 1.7);
  }, [active, phase]);

  useEffect(() => {
    if (!nodes.current) return;
    nodes.current.master.gain.setTargetAtTime((volume / 100) ** 2, ctx.current.currentTime, 0.05);
  }, [volume]);
}

const CYCLE = PHASES.reduce((s, p) => s + p.secs, 0);

// Phase and seconds left in it, derived from total elapsed seconds.
function phaseAt(elapsed) {
  let pos = elapsed % CYCLE;
  for (let i = 0; i < PHASES.length; i++) {
    if (pos < PHASES[i].secs) return { phase: PHASES[i], left: PHASES[i].secs - pos };
    pos -= PHASES[i].secs;
  }
  return { phase: PHASES[0], left: PHASES[0].secs };
}

export default function Breathing({ user }) {
  const [duration, setDuration] = useState(120);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [sound, setSound] = useState(false);
  const [volume, setVolume] = useState(readVolume);
  const { phase, left: phaseLeft } = phaseAt(elapsed);
  const remaining = duration - elapsed;

  useCalmSound(sound && running, phase, volume);

  const changeVolume = (v) => {
    setVolume(v);
    try {
      localStorage.setItem(VOLUME_KEY, String(v));
    } catch {
      /* not remembered */
    }
  };

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (running && remaining <= 0) finish(duration);
  }, [remaining, running]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (secs) => {
    setRunning(false);
    if (secs >= 20) {
      logActivity(user.id, 'breathing', secs).catch(() => {}); // failures are shown as a toast
      setDone(true);
    } else reset();
  };

  const reset = () => {
    setRunning(false);
    setStarted(false);
    setDone(false);
    setElapsed(0);
  };

  const start = () => {
    setStarted(true);
    setRunning(true);
  };

  const scale = started ? phase.scale : 0.55;

  return (
    <div className="immersive breathe-bg">
      <header className="immersive-top">
        <a href="#/s/wellness" className="icon-btn light" aria-label="Back to Wellness Space">
          ←
        </a>
        <h1>Guided Breathing</h1>
        <div className="breath-sound">
          {sound && (
            <label className="volume-control">
              <span className="sr-only">Volume</span>
              <input type="range" min="0" max="100" step="5" value={volume} onChange={(e) => changeVolume(Number(e.target.value))} style={{ '--fill': `${volume}%` }} />
              <span className="volume-value" aria-hidden="true">
                {volume}%
              </span>
            </label>
          )}
          <button className={`chip ${sound ? 'on' : ''}`} aria-pressed={sound} onClick={() => setSound(!sound)}>
            <Emoji e={sound ? '🔊' : '🔈'} /> {sound ? 'Sound ON' : 'Sound OFF'}
          </button>
        </div>
      </header>

      {done ? (
        <div className="immersive-center fade-in">
          <div className="done-bloom" aria-hidden="true">
            <Emoji e="🌿" />
          </div>
          <h2>Nice work.</h2>
          <p>Take a moment before continuing.</p>
          <div className="btn-row center">
            <Button onClick={reset}>Breathe again</Button>
            <a href="#/s/wellness" className="btn btn-secondary">
              Back to Wellness Space
            </a>
          </div>
        </div>
      ) : (
        <div className="immersive-center">
          <div className="breath-stage">
            <div className="breath-halo" style={{ transform: `scale(${scale * 1.18})`, transitionDuration: `${started ? phase.secs : 0.6}s` }} aria-hidden="true" />
            <div className="breath-circle" style={{ transform: `scale(${scale})`, transitionDuration: `${started ? phase.secs : 0.6}s` }} aria-hidden="true" />
            <p className="sr-only" aria-live="polite">
              {started && running ? `${phase.label}. ${phase.hint}` : ''}
            </p>
            <div className="breath-label" aria-hidden="true">
              <strong>{started ? phase.label : 'READY'}</strong>
              {started && <span>{phaseLeft}</span>}
            </div>
          </div>
          <p className="breath-hint">{started ? phase.hint : 'Find a comfortable position and relax your shoulders.'}</p>
          <p className="breath-timer" aria-label={`Time remaining ${fmt(remaining)}`}>
            {fmt(started ? remaining : duration)}
          </p>
          {!started && (
            <Segmented
              label="Session length"
              options={DURATIONS}
              value={duration}
              onChange={setDuration}
            />
          )}
          <div className="btn-row center">
            {!running ? (
              <Button size="lg" onClick={start}>
                {started ? 'Resume' : 'Start'}
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={() => setRunning(false)}>
                Pause
              </Button>
            )}
            {started && (
              <Button size="lg" variant="ghost" onClick={() => finish(duration - remaining)}>
                End
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
