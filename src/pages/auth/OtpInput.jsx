import { useRef } from 'react';

export default function OtpInput({ value, onChange, error, disabled }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  const setAt = (i, d) => {
    const arr = value.padEnd(6, ' ').split('');
    arr[i] = d || ' ';
    onChange(arr.join('').replace(/\s+$/, ''));
  };

  const onInput = (i, e) => {
    const typed = e.target.value.replace(/\D/g, '');
    // Autofill or a pasted/typed full code landing in one box: spread it across the boxes.
    if (typed.length > 1 && (typed.length >= 6 || i === 0)) {
      const full = typed.slice(0, 6);
      onChange(full);
      refs.current[Math.min(full.length, 5)]?.focus();
      return;
    }
    const d = typed.slice(-1);
    setAt(i, d);
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i].trim() && i > 0) {
      setAt(i - 1, '');
      refs.current[i - 1]?.focus();
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const onPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  return (
    <fieldset className={`otp ${error ? 'has-error' : ''}`}>
      <legend>6-digit verification code</legend>
      <div className="otp-boxes" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={i === 0 ? 6 : 1}
            value={d.trim()}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of 6`}
            aria-invalid={!!error}
            onChange={(e) => onInput(i, e)}
            onKeyDown={(e) => onKey(i, e)}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>
      {error && <p className="error-text">{error}</p>}
    </fieldset>
  );
}
