import { Fragment, createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { MOOD } from '../lib/moods';
import { EMOJI_RE, emojiUrl } from '../lib/emoji';

// An emoji drawn as an image (kawaii icon or Fluent Emoji), sized to the surrounding text (1em). Emoji without a bundled image fall back to text.
// Decorative by default; pass `label` when the emoji carries meaning on its own.
export function Emoji({ e, label, className = '' }) {
  const src = emojiUrl(e);
  if (!src) {
    return (
      <span className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
        {e}
      </span>
    );
  }
  return <img src={src} alt={label || ''} aria-hidden={label ? undefined : 'true'} className={`emoji ${className}`} draggable="false" decoding="async" />;
}

// Replaces emoji inside text (strings or arrays of children) with <Emoji> images; other nodes pass through.
export function emojify(node) {
  if (typeof node === 'string') {
    const parts = [];
    let last = 0;
    for (const m of node.matchAll(EMOJI_RE)) {
      if (!emojiUrl(m[0])) continue;
      if (m.index > last) parts.push(node.slice(last, m.index));
      parts.push(<Emoji key={m.index} e={m[0]} />);
      last = m.index + m[0].length;
    }
    if (!parts.length) return node;
    if (last < node.length) parts.push(node.slice(last));
    return parts;
  }
  if (Array.isArray(node)) return node.map((n, i) => (typeof n === 'string' ? <Fragment key={`t${i}`}>{emojify(n)}</Fragment> : n));
  return node;
}

export function Button({ variant = 'primary', size, className = '', loading = false, children, disabled, ...props }) {
  return (
    <button
      className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="spinner spinner-sm" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = 'primary', size, className = '', children, ...props }) {
  return (
    <a href={`#${to}`} className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`} {...props}>
      {children}
    </a>
  );
}

export function Card({ as: Tag = 'section', className = '', children, ...props }) {
  return (
    <Tag className={`card ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <header className="page-header">
      <div>
        {back && (
          <a className="back-link" href={`#${back}`}>
            ← Back
          </a>
        )}
        <h1>{emojify(title)}</h1>
        {subtitle && <p className="subtitle">{emojify(subtitle)}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, action, id }) {
  return (
    <div className="section-title">
      <h2 id={id}>{emojify(children)}</h2>
      {action}
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="spinner-wrap" role="status">
      {/* The MindTrack ribbon turning on the spot (same loader as the reload screen). */}
      <span className="ribbon-loader" aria-hidden="true">
        <img src="/loader-ribbon.webp" alt="" />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Skeleton({ height = 120, className = '' }) {
  return <div className={`skeleton ${className}`} style={{ height }} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="page-skeleton" role="status" aria-label="Loading">
      <Skeleton height={48} className="w-40" />
      <div className="grid-3">
        <Skeleton height={180} />
        <Skeleton height={180} />
        <Skeleton height={180} />
      </div>
      <Skeleton height={260} />
    </div>
  );
}

// Brief loading state on first render so screens show a realistic fetch.
export function useReady(ms = 350) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return ready;
}

export function EmptyState({ emoji = '🌱', title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-emoji" aria-hidden="true">
        <Emoji e={emoji} />
      </div>
      <h3>{emojify(title)}</h3>
      {message && <p>{emojify(message)}</p>}
      {action}
    </div>
  );
}

export function Alert({ tone = 'info', title, children, icon }) {
  const icons = { info: '💡', error: '⚠️', success: '✅', warn: '🔔' };
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="alert-icon" aria-hidden="true">
        {typeof (icon || icons[tone]) === 'string' ? <Emoji e={icon || icons[tone]} /> : icon}
      </span>
      <div>
        {title && <strong>{emojify(title)}</strong>}
        {children && <div>{emojify(children)}</div>}
      </div>
    </div>
  );
}

export function TextField({ label, error, hint, as = 'input', className = '', right, ...props }) {
  const id = useId();
  const Tag = as;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <Tag id={id} aria-invalid={!!error} aria-describedby={describedBy} {...props} />
        {right}
      </div>
      {hint && !error && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="error-text" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({ label, error, options, placeholder, ...props }) {
  const id = useId();
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <select id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="error-text" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordField(props) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      {...props}
      type={show ? 'text' : 'password'}
      right={
        <button type="button" className="input-action" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? 'Hide' : 'Show'}
        </button>
      }
    />
  );
}

export function Toggle({ checked, onChange, label, description }) {
  const id = useId();
  return (
    <div className="toggle-row">
      <div>
        <span id={id} className="toggle-label">
          {emojify(label)}
        </span>
        {description && <p className="muted small">{emojify(description)}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={id} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
        <span className="switch-knob" />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  const refs = useRef([]);
  const onKey = (e, i) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    const next = (i + dir + tabs.length) % tabs.length;
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.value}
          ref={(el) => (refs.current[i] = el)}
          role="tab"
          aria-selected={value === t.value}
          tabIndex={value === t.value ? 0 : -1}
          className={`tab ${value === t.value ? 'active' : ''}`}
          onClick={() => onChange(t.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {emojify(t.label)}
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {emojify(o.label)}
        </button>
      ))}
    </div>
  );
}

// A mood's illustration. Small sizes use the face close-up inside a ring of the mood colour so moods stay
// distinguishable; large sizes show the full portrait. Decorative by default: pass `label` when the icon
// is the only thing naming the mood.
export function MoodIcon({ mood, size = 28, label, className = '' }) {
  const m = MOOD[mood];
  if (!m) return null;
  const small = size < 64;
  return (
    <img
      src={small ? m.face : m.img}
      width={size}
      height={size}
      alt={label ? m.label : ''}
      aria-hidden={label ? undefined : 'true'}
      className={`mood-icon ${small ? 'ringed' : ''} ${className}`}
      style={{ '--ring': m.color }}
      loading="lazy"
      decoding="async"
      draggable="false"
    />
  );
}

export function MoodBadge({ mood, size }) {
  const m = MOOD[mood];
  if (!m) return <span className="pill">No mood</span>;
  return (
    <span className={`mood-badge ${size || ''}`} style={{ background: m.soft, color: m.ink }}>
      <MoodIcon mood={mood} size={size === 'lg' ? 28 : 22} /> {m.label}
    </span>
  );
}

const STATUS = {
  pending: { label: 'Pending', icon: '⏳', cls: 'pill-orange' },
  confirmed: { label: 'Confirmed', icon: '✓', cls: 'pill-green' },
  completed: { label: 'Completed', icon: '✔', cls: 'pill-blue' },
  canceled: { label: 'Canceled', icon: '✕', cls: 'pill-gray' },
  open: { label: 'Needs review', icon: '●', cls: 'pill-pink' },
  follow_up: { label: 'Follow-up', icon: '↻', cls: 'pill-lavender' },
  reviewed: { label: 'Reviewed', icon: '✓', cls: 'pill-green' },
};

export function StatusPill({ status }) {
  const s = STATUS[status] || { label: status, icon: '', cls: '' };
  return (
    <span className={`pill ${s.cls}`}>
      <span aria-hidden="true">{emojify(s.icon)}</span> {s.label}
    </span>
  );
}

export function ProgressRing({ value, max = 100, size = 150, stroke = 14, color = 'var(--sage-deep)', track = 'var(--track)', children, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          className="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function Avatar({ user, size = 40 }) {
  if (user?.photo) return <img className="avatar" src={user.photo} alt="" width={size} height={size} />;
  const i = user ? `${user.first_name[0] || ''}${user.last_name[0] || ''}` : '?';
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {i.toUpperCase()}
    </span>
  );
}

export function Modal({ open, onClose, title, children, footer, size = '' }) {
  const ref = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const el = ref.current;
    const focusables = () => [...el.querySelectorAll('button:not([disabled]),[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')];
    const first = focusables().find((f) => !f.classList.contains('modal-close')) || el;
    first.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current?.();
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <div className="modal-head">
          <h2 id={titleId}>{emojify(title)}</h2>
          <button className="icon-btn modal-close" aria-label="Close dialog" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

const FeedbackCtx = createContext(null);

const NOTICE_LOOK = {
  success: { icon: '✅', label: 'Done' },
  info: { icon: '💡', label: 'Heads up' },
  error: { icon: '⚠️', label: 'Something went wrong' },
  notification: { icon: '🔔', label: 'New notification' },
};

// Card-style notices (same look as the verification-code inbox card): action results from toast(), and live
// notifications from notice(). They dismiss themselves after a while; hovering pauses the countdown.
function NoticeCard({ item, onClose }) {
  const look = NOTICE_LOOK[item.tone] || NOTICE_LOOK.info;
  const timer = useRef(null);
  const left = useRef(item.duration);
  const startedAt = useRef(0);
  const [paused, setPaused] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const start = useCallback(() => {
    startedAt.current = Date.now();
    timer.current = setTimeout(() => closeRef.current(), left.current);
  }, []);
  const pause = () => {
    clearTimeout(timer.current);
    left.current = Math.max(800, left.current - (Date.now() - startedAt.current));
    setPaused(true);
  };
  const resume = () => {
    setPaused(false);
    start();
  };
  useEffect(() => {
    start();
    return () => clearTimeout(timer.current);
  }, [start]);

  return (
    <div
      className={`notice notice-${item.tone} ${item.tone === 'notification' ? 'notice-vfx' : ''}`}
      style={item.accent ? { '--accent': item.accent, '--accent-soft': item.soft } : undefined}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <div className="notice-head">
        <span className="notice-icon" aria-hidden="true">
          <Emoji e={item.icon || look.icon} />
          {item.tone === 'notification' && (
            <span className="notice-sparks">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <i key={i} style={{ '--a': `${i * 45 + 12}deg` }} />
              ))}
            </span>
          )}
        </span>
        <span className="notice-label">{item.label || look.label}</span>
        {item.time && <span className="notice-time">{item.time}</span>}
        <button type="button" className="icon-btn notice-close" aria-label="Dismiss" onClick={onClose}>
          ✕
        </button>
      </div>
      {item.title && <p className="notice-title">{emojify(item.title)}</p>}
      <p className="notice-message">{emojify(item.message)}</p>
      {item.action && (
        <button
          type="button"
          className="notice-action"
          onClick={() => {
            item.action.onClick();
            onClose();
          }}
        >
          {item.action.label} →
        </button>
      )}
      <span className={`notice-timer ${paused ? 'paused' : ''}`} style={{ animationDuration: `${item.duration}ms` }} aria-hidden="true" />
    </div>
  );
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((item) => {
    const id = Math.random();
    setToasts((t) => [...t.slice(-3), { id, ...item }]); // at most 4 on screen
    return id;
  }, []);
  // Short result of something the user just did.
  const toast = useCallback((message, tone = 'success') => push({ message, tone, duration: tone === 'error' ? 7000 : 4500 }), [push]);
  // A notification card: { title, message, icon, time, action: { label, onClick } }.
  const notice = useCallback((n) => push({ tone: 'notification', duration: 9000, ...n }), [push]);

  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);
  const close = (value) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  return (
    <FeedbackCtx.Provider value={{ toast, notice, confirm }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <NoticeCard key={t.id} item={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
      <Modal
        open={!!dialog}
        onClose={() => close(false)}
        title={dialog?.title}
        size="modal-sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              {dialog?.cancelLabel || 'Cancel'}
            </Button>
            <Button variant={dialog?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)}>
              {dialog?.confirmLabel || 'Confirm'}
            </Button>
          </>
        }
      >
        <p className="muted">{emojify(dialog?.message)}</p>
      </Modal>
    </FeedbackCtx.Provider>
  );
}

export const useFeedback = () => useContext(FeedbackCtx);
