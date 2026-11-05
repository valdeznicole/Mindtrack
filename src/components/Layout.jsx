import { useEffect, useRef, useState } from 'react';
import { useDB } from '../lib/store';
import { activeFlags, unreadCount } from '../lib/selectors';
import { Logo } from './brand';
import { Avatar, Emoji, useFeedback } from './ui';
import { markNotificationRead } from '../lib/actions';
import { navigate } from '../lib/router';
import { timeAgo } from '../lib/dates';
import { notifType } from '../lib/notifications';
import { SupportButton } from './common';
import { useAuth } from '../App';
import Clock from './Clock';
import { ThemeToggle } from './ThemeToggle';

// Counselors can hide the sidebar to give dashboards the full width. Remembered per browser.
const NAV_KEY = 'mindtrack.navHidden';
const readNavHidden = () => {
  try {
    return localStorage.getItem(NAV_KEY) === '1';
  } catch {
    return false;
  }
};

const STUDENT_NAV = [
  { to: '/s/home', label: 'Home', icon: '🏠' },
  { to: '/s/mood', label: 'Daily Mood', icon: '💚' },
  { to: '/s/wellness', label: 'Wellness', icon: '🧠' },
  { to: '/s/progress', label: 'My Progress', icon: '📊' },
  { to: '/s/journal', label: 'Journal', icon: '📝' },
  { to: '/s/appointments', label: 'Appointments', icon: '📅' },
  { to: '/s/notifications', label: 'Notifications', icon: '🔔', badge: true },
  { to: '/s/profile', label: 'Profile', icon: '👤' },
];

const STUDENT_MOBILE = [
  { to: '/s/home', label: 'Home', icon: '🏠' },
  { to: '/s/mood', label: 'Mood', icon: '💚' },
  { to: '/s/wellness', label: 'Wellness', icon: '🧠' },
  { to: '/s/journal', label: 'Journal', icon: '📝' },
  { to: '/s/appointments', label: 'Appointments', icon: '📅' },
];

const COUNSELOR_NAV = [
  { to: '/c/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/c/students', label: 'Students', icon: '👥' },
  { to: '/c/mood', label: 'Daily Mood', icon: '💚' },
  { to: '/c/wellness', label: 'Wellness', icon: '📊' },
  { to: '/c/wellness-check', label: 'Wellness Check', icon: '📋' },
  { to: '/c/review', label: 'Needs Review', icon: '🚩', count: 'flags' },
  { to: '/c/appointments', label: 'Appointments', icon: '📅', count: 'pending' },
  { to: '/c/journals', label: 'Shared Journals', icon: '📝' },
  { to: '/c/activities', label: 'Wellness Activities', icon: '🎯' },
  { to: '/c/notifications', label: 'Notifications', icon: '🔔', badge: true },
  { to: '/c/staff', label: 'Staff', icon: '🧑‍💼', superOnly: true },
  { to: '/c/settings', label: 'Settings', icon: '⚙️' },
];

const isActive = (path, to) => path === to || path.startsWith(`${to}/`);

// Pops up notifications that arrive while the person is using the app (via live updates) as notice cards.
// Notifications that already existed when they signed in are not shown again.
function NotificationPopups({ user, path }) {
  const db = useDB();
  const { notice } = useFeedback();
  const seen = useRef(null);
  const mine = db.notifications.filter((n) => n.user_id === user.id);
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(mine.map((n) => n.id));
      return;
    }
    const onInbox = path.endsWith('/notifications');
    for (const n of [...mine].reverse()) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (n.read || onInbox) continue;
      const t = notifType(n);
      notice({
        icon: t.icon,
        label: t.label,
        accent: t.accent,
        soft: t.soft,
        title: n.title,
        message: n.message,
        time: timeAgo(n.created_at),
        action: {
          label: n.link ? 'View' : 'Mark as read',
          onClick: () => {
            markNotificationRead(n.id).catch(() => {});
            if (n.link) navigate(n.link);
          },
        },
      });
    }
  }, [mine.map((n) => n.id).join(','), path]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function Layout({ path, children }) {
  const db = useDB();
  const { user, requestLogout } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const student = user.role === 'student';
  const [navHidden, setNavHidden] = useState(readNavHidden);
  const hidden = !student && navHidden;
  const toggleNav = () => {
    setNavHidden((v) => {
      try {
        localStorage.setItem(NAV_KEY, v ? '0' : '1');
      } catch {
        /* not remembered, still works for this visit */
      }
      return !v;
    });
  };
  const nav = student ? STUDENT_NAV : COUNSELOR_NAV.filter((n) => !n.superOnly || user.is_super);
  const unread = unreadCount(db, user.id);
  // When the unread count goes up, the bell rings and the badges pop for a moment.
  const lastUnread = useRef(unread);
  const [ringing, setRinging] = useState(false);
  useEffect(() => {
    const more = unread > lastUnread.current;
    lastUnread.current = unread;
    if (!more) return;
    setRinging(true);
    const t = setTimeout(() => setRinging(false), 1600);
    return () => clearTimeout(t);
  }, [unread]);
  const counts = {
    flags: activeFlags(db).filter((f) => f.status === 'open').length,
    pending: db.appointments.filter((a) => a.status === 'pending').length,
  };

  useEffect(() => setDrawer(false), [path]);

  const skip = () => document.getElementById('main')?.focus();
  const home = student ? '/s/home' : '/c/dashboard';

  return (
    <div className={`shell ${student ? 'is-student' : 'is-counselor'} ${hidden ? 'nav-hidden' : ''}`}>
      <button className="skip-link" onClick={skip}>
        Skip to main content
      </button>

      <aside className={`sidebar ${drawer ? 'open' : ''}`} aria-label="Main navigation" id="sidebar">
        <a href={`#${home}`} className="sidebar-logo" aria-label="MindTrack home">
          <Logo />
        </a>
        {!student && <p className="role-chip">Counselor Portal</p>}
        <nav>
          <ul className="nav-list">
            {nav.map((n) => {
              const badge = n.badge ? unread : n.count ? counts[n.count] : 0;
              return (
                <li key={n.to}>
                  <a href={`#${n.to}`} className={`nav-item ${isActive(path, n.to) ? 'active' : ''}`} aria-current={isActive(path, n.to) ? 'page' : undefined}>
                    <span className={`nav-icon ${n.badge && ringing ? 'ring' : ''}`} aria-hidden="true">
                      <Emoji e={n.icon} />
                    </span>
                    <span>{n.label}</span>
                    {badge > 0 && (
                      <span className={`nav-badge ${n.badge ? 'is-unread' : ''} ${n.badge && ringing ? 'pop' : ''}`}>
                        {badge}
                        <span className="sr-only"> {n.badge ? 'unread' : 'items'}</span>
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="sidebar-foot">
          {student && <SupportButton />}
          <div className="sidebar-user">
            <Avatar user={user} size={38} />
            <div>
              <strong>
                {user.first_name} {user.last_name}
              </strong>
              <span>{student ? user.section : user.is_super ? 'Superadmin' : 'Admin'}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-block" onClick={requestLogout}>
            ↩ Log out
          </button>
        </div>
      </aside>
      {drawer && <div className="drawer-overlay" onClick={() => setDrawer(false)} aria-hidden="true" />}

      <div className="main-col">
        <header className="topbar">
          {!student && (
            <button className="icon-btn" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}>
              ☰
            </button>
          )}
          <a href={`#${home}`} aria-label="MindTrack home">
            <Logo size={32} />
          </a>
          <div className="topbar-actions">
            <Clock compact />
            <ThemeToggle />
            <a href={`#${student ? '/s/notifications' : '/c/notifications'}`} className={`icon-btn bell ${ringing ? 'ring' : ''}`} aria-label={`Notifications, ${unread} unread`}>
              <Emoji e="🔔" />{unread > 0 && <span className={`dot-badge ${ringing ? 'pop' : ''}`}>{unread}</span>}
            </a>
            {student && (
              <a href="#/s/profile" aria-label="Profile">
                <Avatar user={user} size={36} />
              </a>
            )}
          </div>
        </header>
        <div className="deskbar">
          {!student && (
            <button
              type="button"
              className="nav-toggle"
              onClick={toggleNav}
              aria-controls="sidebar"
              aria-expanded={!hidden}
              title={hidden ? 'Show menu' : 'Hide menu'}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <line x1="9.5" y1="4" x2="9.5" y2="20" stroke="currentColor" strokeWidth="1.8" />
                <path d={hidden ? 'M13.5 9.5l2.5 2.5-2.5 2.5' : 'M16 9.5L13.5 12l2.5 2.5'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{hidden ? 'Show menu' : 'Hide menu'}</span>
            </button>
          )}
          <ThemeToggle className="desk" />
          <Clock />
        </div>
        <NotificationPopups user={user} path={path} />
        <main id="main" tabIndex={-1} className="main">
          <div className="page" key={path}>
            {children}
          </div>
        </main>
      </div>

      {student && (
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {STUDENT_MOBILE.map((n) => (
            <a key={n.to} href={`#${n.to}`} className={isActive(path, n.to) ? 'active' : ''} aria-current={isActive(path, n.to) ? 'page' : undefined}>
              <span aria-hidden="true"><Emoji e={n.icon} /></span>
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
