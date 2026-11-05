import { useId, useLayoutEffect, useRef, useState } from 'react';
import { MOOD } from '../lib/moods';
import { emojiUrl } from '../lib/emoji';
import { MoodIcon } from './ui';

function useWidth(initial = 600) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || initial);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [initial]);
  return [ref, width];
}

// Catmull-Rom → cubic Bézier, with control points clamped to the plot area.
function smoothPath(pts, top, bottom) {
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const cy = (y) => Math.max(top, Math.min(bottom, y));
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, cy(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, cy(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/**
 * Smooth pastel area chart. Missing values (null) break the line instead of dropping to zero.
 * data: [{ label, value }]
 */
export function AreaChart({ data, min = 1, max = 5, height = 220, color = '#6FA487', yTicks = [], ariaLabel, formatValue = (v) => v, tooltipLabel }) {
  const [ref, width] = useWidth();
  const gid = useId().replace(/:/g, '');
  const [hover, setHover] = useState(null);
  const faceTicks = yTicks.some((t) => t.mood);
  const pad = { l: faceTicks ? 58 : yTicks.length ? 40 : 12, r: 20, t: 20, b: 28 };
  const w = Math.max(width, 200);
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const x = (i) => pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v) => pad.t + ih - ((v - min) / (max - min)) * ih;

  const segments = [];
  let cur = [];
  data.forEach((d, i) => {
    if (d.value == null) {
      if (cur.length) segments.push(cur);
      cur = [];
    } else cur.push([x(i), y(d.value)]);
  });
  if (cur.length) segments.push(cur);

  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(iw / 70))));
  const hasData = data.some((d) => d.value != null);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    data.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    setHover(best);
  };

  return (
    <div className="chart" ref={ref}>
      <svg width={w} height={height} role="img" aria-label={ariaLabel} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`g${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((t) => (
          <g key={t.value}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t.value)} y2={y(t.value)} className="grid-line" />
            {t.mood ? (
              <MoodFace mood={t.mood} cx={pad.l - 36} cy={y(t.value)} r={14} />
            ) : (
              <text x={pad.l - 10} y={y(t.value) + 5} textAnchor="end" className="axis-label">
                {t.label}
              </text>
            )}
          </g>
        ))}
        {segments.map((seg, i) => (
          <g key={i}>
            {seg.length > 1 && (
              <path d={`${smoothPath(seg, pad.t, pad.t + ih)} L${seg.at(-1)[0]},${pad.t + ih} L${seg[0][0]},${pad.t + ih} Z`} fill={`url(#g${gid})`} />
            )}
            <path d={smoothPath(seg, pad.t, pad.t + ih)} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" className="chart-line" />
          </g>
        ))}
        {data.map((d, i) => {
          if (d.value == null) return null;
          // Short ranges show each day's mood face on the line; long ranges keep small dots.
          if (d.mood && MOOD[d.mood] && data.length <= 14) return <MoodFace key={i} mood={d.mood} cx={x(i)} cy={y(d.value)} r={hover === i ? 17 : 14} />;
          return <circle key={i} cx={x(i)} cy={y(d.value)} r={hover === i ? 6 : data.length > 40 ? 0 : 3.5} fill="#fff" stroke={color} strokeWidth="2.5" />;
        })}
        {data.map((d, i) =>
          // Skip a regular label that would collide with the always-shown last one.
          (i % labelEvery === 0 && x(data.length - 1) - x(i) >= 60) || i === data.length - 1 ? (
            <text key={`l${i}`} x={x(i)} y={height - 6} textAnchor={i === data.length - 1 && data.length > 1 ? 'end' : i === 0 && data.length > 1 && !yTicks.length ? 'start' : 'middle'} className="axis-label">
              {d.label}
            </text>
          ) : null,
        )}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} className="hover-line" />}
      </svg>
      {!hasData && <div className="chart-empty">No check-ins in this period yet</div>}
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(x(hover), 70), w - 70) }}>
          <strong>{data[hover].label}</strong>
          <span>{data[hover].value == null ? 'No check-in' : tooltipLabel ? tooltipLabel(data[hover]) : MOOD[data[hover].mood]?.label || formatValue(data[hover].value)}</span>
        </div>
      )}
    </div>
  );
}

export function BarChart({ data, height = 200, max, ariaLabel, formatValue = (v) => v, color = '#A7C8B5' }) {
  const [ref, width] = useWidth();
  const w = Math.max(width, 200);
  const pad = { t: 22, b: 28, l: 6, r: 6 };
  const ih = height - pad.t - pad.b;
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  const slot = (w - pad.l - pad.r) / data.length;
  const bw = Math.min(46, slot * 0.62);
  return (
    <div className="chart" ref={ref}>
      <svg width={w} height={height} role="img" aria-label={ariaLabel}>
        {data.map((d, i) => {
          const h = (d.value / top) * ih;
          const cx = pad.l + slot * i + slot / 2;
          return (
            <g key={d.label}>
              <rect x={cx - bw / 2} y={pad.t + ih - h} width={bw} height={Math.max(h, 2)} rx={Math.min(10, bw / 2)} fill={d.color || color} className="bar" />
              <text x={cx} y={pad.t + ih - h - 6} textAnchor="middle" className="bar-value">
                {formatValue(d.value)}
              </text>
              {emojiUrl(d.label) ? (
                <image href={emojiUrl(d.label)} x={cx - 11} y={height - 25} width="22" height="22" />
              ) : (
                <text x={cx} y={height - 8} textAnchor="middle" className="axis-label">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Donut({ data, size = 190, thickness = 28, center, ariaLabel }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={ariaLabel}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={thickness} />
        {data.map((d) => {
          const len = (d.value / total) * c;
          const el = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {center && <div className="donut-center">{center}</div>}
    </div>
  );
}

export function HBars({ items, max }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="hbars">
      {items.map((i) => (
        <li key={i.label}>
          <span className="hbar-label">
            {i.mood && <MoodIcon mood={i.mood} size={22} />}
            {i.label}
          </span>
          <span className="hbar-track">
            <span className="hbar-fill" style={{ width: `${(i.value / top) * 100}%`, background: i.color }} />
          </span>
          <span className="hbar-value">{i.display ?? i.value}</span>
        </li>
      ))}
    </ul>
  );
}

// A mood face inside the chart's SVG: the face close-up on a disc of the mood colour.
function MoodFace({ mood, cx, cy, r }) {
  const m = MOOD[mood];
  const s = (r - 3) * 2;
  return (
    <g className="chart-face" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill={m.color} stroke="#fff" strokeWidth="2" />
      <image href={m.face} x={cx - s / 2} y={cy - s / 2} width={s} height={s} />
    </g>
  );
}

// Level 2 is shared by Stressed and Sad; the axis shows the Stressed face for it.
export const MOOD_TICKS = [
  { value: 5, mood: 'very_good' },
  { value: 4, mood: 'good' },
  { value: 3, mood: 'okay' },
  { value: 2, mood: 'stressed' },
  { value: 1, mood: 'overwhelmed' },
];

export const moodValueLabel = (v) => {
  if (v >= 4.5) return 'Very Good';
  if (v >= 3.5) return 'Good';
  if (v >= 2.5) return 'Okay';
  if (v >= 1.5) return 'Stressed / Sad';
  return 'Overwhelmed';
};
