import { useEffect, useState } from 'react';
import { SCHOOL } from '../config';

// Current weather at the school from Open-Meteo (free, no API key; CC BY 4.0: "Weather data by Open-Meteo.com").
// Cached for 15 minutes so every page and tab shares one request.
const CACHE_KEY = 'mindtrack.weather';
const MAX_AGE = 15 * 60000;

// WMO weather codes → the animation to show and a short label.
function describe(code, wind, isDay) {
  let kind;
  let label;
  if (code === 0) [kind, label] = ['clear', isDay ? 'Sunny' : 'Clear night'];
  else if (code === 1) [kind, label] = ['clear', isDay ? 'Mostly sunny' : 'Mostly clear'];
  else if (code === 2) [kind, label] = ['partly', 'Partly cloudy'];
  else if (code === 3) [kind, label] = ['cloudy', 'Cloudy'];
  else if (code === 45 || code === 48) [kind, label] = ['fog', 'Foggy'];
  else if (code >= 51 && code <= 57) [kind, label] = ['rain', 'Drizzle'];
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) [kind, label] = ['rain', code === 61 || code === 80 ? 'Light rain' : code === 65 || code === 82 ? 'Heavy rain' : 'Rain'];
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) [kind, label] = ['snow', 'Snow'];
  else if (code >= 95) [kind, label] = ['thunder', 'Thunderstorm'];
  else [kind, label] = ['cloudy', 'Cloudy'];
  // Strong wind takes over for dry weather.
  if (wind >= 25 && ['clear', 'partly', 'cloudy'].includes(kind)) [kind, label] = ['windy', 'Windy'];
  return { kind, label };
}

async function load() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.at < MAX_AGE) return cached.data;
  } catch {
    /* no cache */
  }
  const { lat, lon } = SCHOOL.weatherLocation;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather unavailable');
  const c = (await res.json()).current;
  const data = {
    temp: Math.round(c.temperature_2m),
    feels: Math.round(c.apparent_temperature),
    wind: Math.round(c.wind_speed_10m),
    isDay: c.is_day === 1,
    ...describe(c.weather_code, c.wind_speed_10m, c.is_day === 1),
  };
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* not cached */
  }
  return data;
}

// Current weather, refreshed every 15 minutes. null while loading or if the weather service can't be reached.
export function useWeather() {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    let alive = true;
    const update = () =>
      load()
        .then((w) => alive && setWeather(w))
        .catch(() => {});
    update();
    const t = setInterval(update, MAX_AGE);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return weather;
}
