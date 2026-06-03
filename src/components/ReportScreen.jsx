// ─── components/ReportScreen.js ──────────────────────────────────────────────
import React, { useMemo, useState } from 'react';

const REPORT_OPTIONS = [
  { id: 'free',     label: 'Spot Free',      color: '#22c55e', bg: '#052e16' },
  { id: 'full',     label: 'No Space',       color: '#ef4444', bg: '#450a0a' },
  { id: 'warden',   label: 'Warden Nearby',  color: '#fbbf24', bg: '#422006' },
  { id: 'blocked',  label: 'Bay Blocked',    color: '#f97316', bg: '#431407' },
  { id: 'works',    label: 'Roadworks',      color: '#a78bfa', bg: '#2e1065' },
  { id: 'accident', label: 'Accident',       color: '#ef4444', bg: '#450a0a' },
];

const s = {
  overlay: {
    position: 'absolute', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%', background: '#ffffff',
    borderRadius: '22px 22px 0 0',
    padding: '16px 20px 40px',
    animation: 'slideUp 0.3s ease',
    boxShadow: '0 -18px 44px rgba(15,23,42,0.22)',
  },
  handle: {
    width: 36, height: 4, background: 'rgba(15,23,42,0.14)',
    borderRadius: 2, margin: '0 auto 20px',
  },
  heading: { fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 4 },
  subhead: { fontSize: 13, color: '#64748b', marginBottom: 14 },
  targetRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 },
  targetBtn: {
    minHeight: 38, borderRadius: 12,
    border: '1px solid rgba(15,23,42,0.10)',
    fontSize: 11, fontWeight: 800, cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  reportBtn: {
    minHeight: 74, padding: '12px 10px', borderRadius: 12,
    border: '1px solid rgba(15,23,42,0.08)', background: '#f8fafc',
    cursor: 'pointer', textAlign: 'center',
    transition: 'transform 0.12s',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  dot:    { width: 16, height: 16, borderRadius: '50%' },
  label:  { fontSize: 12, fontWeight: 700, color: '#0f172a' },
  cancel: {
    width: '100%', minHeight: 48, padding: '14px',
    background: 'transparent', border: '1px solid rgba(15,23,42,0.12)',
    borderRadius: 14, color: '#64748b',
    fontSize: 15, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  successMsg: {
    padding: '14px 16px', borderRadius: 14,
    marginBottom: 16, textAlign: 'center',
    fontSize: 15, fontWeight: 600,
  },
};

export default function ReportScreen({ onClose, onSubmit, selectedBay, hasUserLocation }) {
  const [submitted, setSubmitted] = useState(null);
  const [blocked,   setBlocked]   = useState(false);
  const [target,    setTarget]    = useState(selectedBay ? 'selected-bay' : 'map-center');

  const heading = useMemo(
    () => selectedBay ? `Report ${selectedBay.streetName || selectedBay.name}` : 'Report',
    [selectedBay]
  );

  const targetOptions = useMemo(() => [
    ...(selectedBay ? [{ id: 'selected-bay', label: 'This bay' }] : []),
    { id: 'user-location', label: 'Where I am', disabled: !hasUserLocation },
    { id: 'map-center',    label: 'Map centre' },
  ], [hasUserLocation, selectedBay]);

  const handleReport = (opt) => {
    if (blocked) return;
    const accepted = onSubmit?.(opt, target) !== false;
    if (!accepted) {
      setBlocked(true);
      setSubmitted({ ...opt, label: 'Please wait before reporting again', color: '#64748b', bg: '#f1f5f9' });
      setTimeout(() => { setSubmitted(null); setBlocked(false); }, 1800);
      return;
    }
    setSubmitted(opt);
    setTimeout(onClose, 1800);
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>{`@keyframes slideUp { from{transform:translateY(100%)}to{transform:translateY(0)} }`}</style>
      <div style={s.sheet} role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div style={s.handle} aria-hidden />
        <div id="report-title" style={s.heading}>{heading}</div>
        <div style={s.subhead}>Tap to send an alert to nearby drivers</div>

        {!submitted && (
          <div style={s.targetRow} role="group" aria-label="Report location">
            {targetOptions.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={t.disabled}
                style={{
                  ...s.targetBtn,
                  background: target === t.id ? '#0f172a' : '#ffffff',
                  color:      target === t.id ? '#ffffff' : '#334155',
                  opacity:    t.disabled ? 0.48 : 1,
                }}
                aria-pressed={target === t.id}
                onClick={() => !t.disabled && setTarget(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {submitted ? (
          <div
            style={{ ...s.successMsg, background: submitted.bg, color: submitted.color, border:`1px solid ${submitted.color}33` }}
            role="status" aria-live="polite"
          >
            {submitted.label} — thanks!
          </div>
        ) : (
          <div style={s.grid} role="group" aria-label="Report type">
            {REPORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                style={s.reportBtn}
                aria-label={`Report ${opt.label.toLowerCase()}`}
                onClick={() => handleReport(opt)}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={{ ...s.dot, background: opt.color }} />
                <span style={s.label}>{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        <button type="button" style={s.cancel} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
