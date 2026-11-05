import { useState } from 'react';
import { useDB } from '../../lib/store';
import { timeAgo } from '../../lib/dates';
import { deleteNotification, markAllRead, markNotificationRead } from '../../lib/actions';
import { notifGroup, notifType } from '../../lib/notifications';
import { navigate } from '../../lib/router';
import { Button, EmptyState, PageHeader, Segmented, Emoji, emojify } from '../../components/ui';

export default function Notifications({ user }) {
  const db = useDB();
  const [filter, setFilter] = useState('all');
  const all = db.notifications.filter((n) => n.user_id === user.id).sort((a, b) => b.created_at - a.created_at);
  const unread = all.filter((n) => !n.read).length;
  const list = filter === 'unread' ? all.filter((n) => !n.read) : all;

  const groups = [];
  for (const n of list) {
    const g = notifGroup(n.created_at);
    if (!groups.length || groups.at(-1).name !== g) groups.push({ name: g, items: [] });
    groups.at(-1).items.push(n);
  }

  const open = (n) => {
    if (!n.read) markNotificationRead(n.id).catch(() => {});
    if (n.link) navigate(n.link);
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={unread ? `You have ${unread} unread notification${unread > 1 ? 's' : ''}.` : 'You’re all caught up.'}
        actions={
          unread > 0 && (
            <Button variant="secondary" onClick={() => markAllRead().catch(() => {})}>
              Mark all as read
            </Button>
          )
        }
      />
      <Segmented
        label="Show"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: `All (${all.length})` },
          { value: 'unread', label: `Unread (${unread})` },
        ]}
      />
      {list.length === 0 ? (
        <EmptyState
          emoji="🔔"
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          message={filter === 'unread' ? 'You’ve read everything. Nice!' : 'Reminders and updates will appear here.'}
        />
      ) : (
        groups.map((g) => (
          <section key={g.name} className="notif-group" aria-label={g.name}>
            <h2 className="notif-group-title">{g.name}</h2>
            <ul className="notif-list">
              {g.items.map((n, i) => {
                const t = notifType(n);
                return (
                  <li key={n.id} className={`notif-card ${n.read ? '' : 'unread'}`} style={{ '--accent': t.accent, '--accent-soft': t.soft, '--i': Math.min(i, 10) }}>
                    <button type="button" className="notif-main" onClick={() => open(n)}>
                      <span className="notif-icon" aria-hidden="true">
                        <Emoji e={t.icon} />
                      </span>
                      <span className="notif-text">
                        <span className="notif-meta">
                          <span className="notif-kind">{t.label}</span>
                          <time dateTime={new Date(n.created_at).toISOString()}>{timeAgo(n.created_at)}</time>
                          {!n.read && (
                            <span className="notif-new">
                              New<span className="sr-only"> (unread)</span>
                            </span>
                          )}
                        </span>
                        <strong>{emojify(n.title)}</strong>
                        <span className="notif-msg">{emojify(n.message)}</span>
                        {n.link && <span className="notif-go">View →</span>}
                      </span>
                    </button>
                    <button type="button" className="icon-btn notif-dismiss" aria-label={`Dismiss notification: ${n.title}`} onClick={() => deleteNotification(n.id).catch(() => {})}>
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
