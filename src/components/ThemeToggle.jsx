import { setThemePref, useTheme } from '../lib/theme';
import { Segmented } from './ui';

// Quick light/dark switch for the top bars.
export function ThemeToggle({ className = '' }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={() => setThemePref(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="currentColor" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" y1="2.6" x2="12" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" transform={`rotate(${a} 12 12)`} />
          ))}
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}

// Appearance setting for Profile / Settings.
export function AppearanceSetting() {
  const { pref } = useTheme();
  return (
    <div className="appearance-setting">
      <div>
        <span className="toggle-label">Appearance</span>
        <p className="muted small">“System” follows your phone or computer’s light / dark setting.</p>
      </div>
      <Segmented
        label="Appearance"
        value={pref}
        onChange={setThemePref}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />
    </div>
  );
}
