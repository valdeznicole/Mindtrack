// Small animated weather icons (SVG + CSS). Animations are switched off by prefers-reduced-motion.
const CLOUD = 'M13 35h22a8 8 0 0 0 0.6-16A11 11 0 0 0 14.4 21 7 7 0 0 0 13 35z';

function Cloud({ className = '', fill = '#EEF3F6', stroke = '#B9C8D0', transform }) {
  return <path className={className} d={CLOUD} fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" transform={transform} />;
}

function Sun({ cx = 24, cy = 24, r = 8.5, rays = true }) {
  return (
    <g>
      {rays && (
        <g className="wx-rays" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1={cx} y1={cy - r - 3} x2={cx} y2={cy - r - 6.5} stroke="#F6A623" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${a} ${cx} ${cy})`} />
          ))}
        </g>
      )}
      <circle cx={cx} cy={cy} r={r} fill="#FDC43F" stroke="#F6A623" strokeWidth="1.4" />
    </g>
  );
}

function Moon() {
  return (
    <g>
      <path d="M29 9a13 13 0 1 0 10 21A11 11 0 0 1 29 9z" fill="#F3D27A" stroke="#D9B04F" strokeWidth="1.2" />
      <circle className="wx-twinkle" cx="12" cy="12" r="1.4" fill="#F3D27A" />
      <circle className="wx-twinkle d2" cx="8" cy="22" r="1" fill="#F3D27A" />
      <circle className="wx-twinkle d3" cx="16" cy="6" r="0.9" fill="#F3D27A" />
    </g>
  );
}

export default function WeatherIcon({ kind, isDay = true, size = 34 }) {
  return (
    <svg className={`wx wx-${kind}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {kind === 'clear' && (isDay ? <Sun /> : <Moon />)}

      {kind === 'partly' && (
        <>
          {isDay ? <Sun cx={17} cy={17} r={7} /> : <path d="M22 6a10 10 0 1 0 8 16A8.5 8.5 0 0 1 22 6z" fill="#F3D27A" stroke="#D9B04F" strokeWidth="1.2" />}
          <Cloud className="wx-drift" transform="translate(4 4)" />
        </>
      )}

      {kind === 'cloudy' && (
        <>
          <Cloud className="wx-drift slow" fill="#D5E0E6" stroke="#A9BAC4" transform="translate(-6 -6) scale(0.85)" />
          <Cloud className="wx-drift" transform="translate(2 3)" />
        </>
      )}

      {(kind === 'rain' || kind === 'thunder') && (
        <>
          {[14, 22, 30].map((x, i) => (
            <line key={x} className={`wx-drop d${i + 1}`} x1={x} y1="36" x2={x - 2} y2="42" stroke="#4A90D9" strokeWidth="2.2" strokeLinecap="round" />
          ))}
          <Cloud fill={kind === 'thunder' ? '#C4CFD6' : '#E3EAEE'} stroke={kind === 'thunder' ? '#8A9AA4' : '#A9BAC4'} transform="translate(0 -4)" />
          {kind === 'thunder' && <path className="wx-bolt" d="M25 25l-5 9h5l-3 8 8-11h-5l3-6z" fill="#FDC43F" stroke="#E0A21B" strokeWidth="1" strokeLinejoin="round" />}
        </>
      )}

      {kind === 'snow' && (
        <>
          {[14, 22, 30].map((x, i) => (
            <circle key={x} className={`wx-flake d${i + 1}`} cx={x} cy="38" r="1.8" fill="#FFFFFF" stroke="#A9C3D6" strokeWidth="0.8" />
          ))}
          <Cloud transform="translate(0 -4)" />
        </>
      )}

      {kind === 'fog' && (
        <>
          <Cloud fill="#E3EAEE" transform="translate(0 -6)" />
          {[33, 38, 43].map((y, i) => (
            <line key={y} className={`wx-fog d${i + 1}`} x1="9" y1={y} x2="39" y2={y} stroke="#A9BAC4" strokeWidth="2.2" strokeLinecap="round" />
          ))}
        </>
      )}

      {kind === 'windy' && (
        <g fill="none" stroke="#6FA8B8" strokeWidth="2.4" strokeLinecap="round">
          <path className="wx-gust d1" d="M6 18h22a5 5 0 1 0-5-5" />
          <path className="wx-gust d2" d="M4 26h32a5 5 0 1 1-5 5" />
          <path className="wx-gust d3" d="M8 34h14" />
        </g>
      )}
    </svg>
  );
}
