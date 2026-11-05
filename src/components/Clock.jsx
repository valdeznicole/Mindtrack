import { useEffect, useState } from 'react';
import { useLiveStatus } from '../lib/store';
import { useWeather } from '../lib/weather';
import { SCHOOL } from '../config';
import WeatherIcon from './WeatherIcon';

// Ticks once per second, aligned to the start of each second so the display never lags.
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t;
    const tick = () => {
      setNow(new Date());
      t = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    t = setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(t);
  }, []);
  return now;
}

const pad = (n) => String(n).padStart(2, '0');

// Analog face + digital time + date + live-sync status. `compact` is the small version for the mobile top bar.
export default function Clock({ compact = false }) {
  const now = useNow();
  const { online, lastSync } = useLiveStatus();
  const weather = useWeather();
  const place = SCHOOL.weatherLocation.name;
  const weatherLabel = weather ? `${weather.label}, ${weather.temp}°C in ${place} (feels like ${weather.feels}°C, wind ${weather.wind} km/h)` : '';
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? 'PM' : 'AM';
  // Angles keep growing (instead of wrapping at 360°) so the hands never spin backwards at the top of the hour.
  const total = Math.floor(now.getTime() / 1000) - now.getTimezoneOffset() * 60;
  const secDeg = total * 6;
  const minDeg = (total / 60) * 6;
  const hourDeg = (total / 3600) * 30;
  const date = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const synced = lastSync ? Math.max(0, Math.round((now - lastSync) / 1000)) : null;
  const liveLabel = !online ? 'Reconnecting…' : synced == null ? 'Connecting…' : synced < 60 ? `Live · synced ${synced}s ago` : 'Live';

  if (compact) {
    return (
      <time
        className="clock clock-compact"
        dateTime={now.toISOString()}
        aria-label={`${hour12}:${pad(m)} ${ampm}${weather ? `, ${weatherLabel}` : ''}`}
        title={weatherLabel || undefined}
      >
        {weather ? <WeatherIcon kind={weather.kind} isDay={weather.isDay} size={24} /> : <span className={`live-dot ${online ? '' : 'off'}`} aria-hidden="true" />}
        <span className="clock-time">
          {hour12}:{pad(m)}
          <span className="clock-ampm">{ampm}</span>
        </span>
      </time>
    );
  }

  return (
    <div className="clock">
      <svg className="clock-face" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="22.5" className="face-bg" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="24" y1={i % 3 === 0 ? 4.5 : 5.5} x2="24" y2="8" className={i % 3 === 0 ? 'tick major' : 'tick'} transform={`rotate(${i * 30} 24 24)`} />
        ))}
        <line x1="24" y1="24" x2="24" y2="13" className="hand hour" style={{ transform: `rotate(${hourDeg}deg)` }} />
        <line x1="24" y1="24" x2="24" y2="8.5" className="hand minute" style={{ transform: `rotate(${minDeg}deg)` }} />
        <g className="hand second" style={{ transform: `rotate(${secDeg}deg)` }}>
          <line x1="24" y1="28" x2="24" y2="6" />
          <circle cx="24" cy="6.5" r="1.4" />
        </g>
        <circle cx="24" cy="24" r="2" className="hub" />
      </svg>
      <div className="clock-text">
        <time className="clock-time" dateTime={now.toISOString()}>
          {hour12}
          <span className="colon">:</span>
          {pad(m)}
          <span className="clock-sec" aria-hidden="true">
            {pad(s)}
          </span>
          <span className="clock-ampm">{ampm}</span>
        </time>
        <span className="clock-date">{date}</span>
      </div>
      {weather ? (
        // Today's weather at the school, with the live-updates status kept as a small dot.
        <span className={`clock-weather wx-bg-${weather.kind} ${weather.isDay ? 'day' : 'night'}`} title={`${weatherLabel} · ${liveLabel}`}>
          <WeatherIcon kind={weather.kind} isDay={weather.isDay} />
          <span className="clock-weather-text">
            <strong>{weather.temp}°</strong>
            <span>{weather.label}</span>
          </span>
          <span className={`live-dot ${online ? '' : 'off'}`} aria-hidden="true" />
          <span className="sr-only">
            {weatherLabel}. {liveLabel}
          </span>
        </span>
      ) : (
        <span className={`clock-live ${online ? '' : 'off'}`} title={liveLabel}>
          <span className="live-dot" aria-hidden="true" />
          <span>{online ? 'Live' : 'Offline'}</span>
          <span className="sr-only">{liveLabel}</span>
        </span>
      )}
    </div>
  );
}
