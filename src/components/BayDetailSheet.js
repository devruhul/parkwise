import React, { useState } from 'react';
import { STATUS_CONFIG } from '../data/parkingData';

const s = {
  overlay: {
    position: 'absolute', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%',
    background: '#161b22',
    borderRadius: '24px 24px 0 0',
    padding: '16px 20px 32px',
    border: '1px solid rgba(255,255,255,0.08)',
    animation: 'slideUp 0.3s ease',
  },
  handle: {
    width: 36, height: 4,
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 2, margin: '0 auto 20px',
  },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  streetName: { fontSize: 20, fontWeight: 700, color: '#e6edf3' },
  zone: { fontSize: 12, color: '#8b949e', fontFamily: "'Space Mono', monospace" },
  priceWrap: { display: 'flex', alignItems: 'baseline', gap: 4, margin: '10px 0 6px' },
  price: { fontSize: 32, fontWeight: 700 },
  perHour: { fontSize: 14, color: '#8b949e' },
  badgeRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  badge: {
    padding: '4px 10px', borderRadius: 20,
    fontSize: 12, fontWeight: 500,
  },
  section: { marginBottom: 14 },
  sectionLabel: { fontSize: 11, color: '#484f58', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontFamily: "'Space Mono', monospace" },
  payRow: { display: 'flex', gap: 8 },
  payBtn: {
    flex: 1, padding: '10px', borderRadius: 12,
    background: '#21262d', border: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'center', fontSize: 13, fontWeight: 600,
    color: '#60a5fa', cursor: 'pointer',
  },
  availBar: {
    padding: '10px 14px', borderRadius: 12, marginBottom: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  availLabel: { fontSize: 14, fontWeight: 600 },
  confidence: { fontSize: 12, color: '#8b949e' },
  actionRow: { display: 'flex', gap: 8 },
  actionBtn: {
    flex: 1, padding: '12px 8px', borderRadius: 14,
    border: 'none', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', textAlign: 'center',
    transition: 'opacity 0.15s',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 20,
    width: 30, height: 30, borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: 'none', color: '#8b949e',
    fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  toast: {
    position: 'absolute', top: 20, left: '50%',
    transform: 'translateX(-50%)',
    background: '#22c55e', color: '#052e16',
    padding: '8px 18px', borderRadius: 20,
    fontSize: 13, fontWeight: 600,
    zIndex: 200, whiteSpace: 'nowrap',
    animation: 'fadeIn 0.2s ease',
  },
};

export default function BayDetailSheet({ bay, onClose, onReport }) {
  const [toast, setToast] = useState(null);
  const [localStatus, setLocalStatus] = useState(bay.status);

  const cfg = STATUS_CONFIG[localStatus];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleLeaving = () => {
    setLocalStatus('free');
    showToast('✓ Thanks! Bay marked as free');
  };

  const handleFull = () => {
    setLocalStatus('full');
    showToast('✓ Reported as full — thanks!');
  };

  const handleWarden = () => {
    showToast('🚓 Warden alert sent to nearby drivers');
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {toast && <div style={s.toast}>{toast}</div>}

      <div style={s.sheet}>
        <button style={s.closeBtn} onClick={onClose}>×</button>
        <div style={s.handle} />

        <div style={s.row}>
          <div style={s.streetName}>{bay.name}</div>
          <div style={s.zone}>Zone {bay.zone}</div>
        </div>

        <div style={s.priceWrap}>
          <span style={{ ...s.price, color: bay.pricePerHour === 0 ? '#22c55e' : '#e6edf3' }}>
            {bay.pricePerHour === 0 ? 'FREE' : `£${bay.pricePerHour.toFixed(2)}`}
          </span>
          {bay.pricePerHour > 0 && <span style={s.perHour}>/ hour</span>}
        </div>

        <div style={s.badgeRow}>
          <span style={{ ...s.badge, background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
            🕐 {bay.restrictions}
          </span>
          <span style={{ ...s.badge, background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
            ⏱ {bay.maxStay}
          </span>
        </div>

        {bay.paymentMethods.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionLabel}>Pay with</div>
            <div style={s.payRow}>
              {bay.paymentMethods.map(m => (
                <div key={m} style={s.payBtn}>{m}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ ...s.availBar, background: cfg.bg, border: `1px solid ${cfg.color}22` }}>
          <span style={{ ...s.availLabel, color: cfg.color }}>
            {localStatus === 'free' ? '🟢' : localStatus === 'full' ? '🔴' : '🔵'} {cfg.label}
          </span>
          <span style={s.confidence}>
            {bay.confidence} reports · {bay.lastUpdated}
          </span>
        </div>

        <div style={s.actionRow}>
          <button
            style={{ ...s.actionBtn, background: '#052e16', color: '#22c55e', border: '1px solid #15803d' }}
            onClick={handleLeaving}
          >
            I'm Leaving 🟢
          </button>
          <button
            style={{ ...s.actionBtn, background: '#450a0a', color: '#ef4444', border: '1px solid #7f1d1d' }}
            onClick={handleFull}
          >
            It's Full 🔴
          </button>
          <button
            style={{ ...s.actionBtn, background: '#422006', color: '#fbbf24', border: '1px solid #854f0b' }}
            onClick={handleWarden}
          >
            Warden 🚓
          </button>
        </div>
      </div>
    </div>
  );
}
