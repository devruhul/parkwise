import React, { useState } from 'react';

const REPORT_OPTIONS = [
  { id: 'free',     icon: '🟢', label: 'Spot Free',      color: '#22c55e', bg: '#052e16' },
  { id: 'full',     icon: '🔴', label: 'No Space',       color: '#ef4444', bg: '#450a0a' },
  { id: 'warden',   icon: '🚓', label: 'Warden Nearby',  color: '#fbbf24', bg: '#422006' },
  { id: 'blocked',  icon: '⚠️', label: 'Bay Blocked',    color: '#f97316', bg: '#431407' },
  { id: 'works',    icon: '🚧', label: 'Roadworks',      color: '#a78bfa', bg: '#2e1065' },
  { id: 'accident', icon: '🚨', label: 'Accident',       color: '#ef4444', bg: '#450a0a' },
];

const s = {
  overlay: {
    position: 'absolute', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%',
    background: '#161b22',
    borderRadius: '24px 24px 0 0',
    padding: '16px 20px 40px',
    animation: 'slideUp 0.3s ease',
  },
  handle: {
    width: 36, height: 4,
    background: 'rgba(255,255,255,0.12)',
    borderRadius: 2, margin: '0 auto 20px',
  },
  heading: { fontSize: 20, fontWeight: 700, color: '#e6edf3', marginBottom: 4 },
  subhead: { fontSize: 13, color: '#8b949e', marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 },
  reportBtn: {
    padding: '18px 12px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.06)',
    background: '#1c2333',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'transform 0.12s',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  icon: { fontSize: 28 },
  label: { fontSize: 13, fontWeight: 600, color: '#c9d1d9' },
  cancelBtn: {
    width: '100%', padding: '14px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14, color: '#8b949e',
    fontSize: 15, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  successMsg: {
    padding: '14px 16px', borderRadius: 14,
    marginBottom: 16, textAlign: 'center',
    fontSize: 15, fontWeight: 600,
  },
};

export default function ReportScreen({ onClose }) {
  const [submitted, setSubmitted] = useState(null);

  const handleReport = (option) => {
    setSubmitted(option);
    setTimeout(onClose, 1800);
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      <div style={s.sheet}>
        <div style={s.handle} />
        <div style={s.heading}>Report</div>
        <div style={s.subhead}>Tap to send an alert to nearby drivers</div>

        {submitted ? (
          <div style={{ ...s.successMsg, background: submitted.bg, color: submitted.color, border: `1px solid ${submitted.color}33` }}>
            {submitted.icon} {submitted.label} reported — thanks! 🙌
          </div>
        ) : (
          <div style={s.grid}>
            {REPORT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                style={s.reportBtn}
                onClick={() => handleReport(opt)}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={s.icon}>{opt.icon}</span>
                <span style={s.label}>{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
