import React, { useEffect, useMemo, useState } from 'react';
import { STATUS_CONFIG } from '../data/parkingData';

const DURATION_OPTIONS = [30, 60, 90, 120, 180];

const getRestrictionSummary = (bay) => {
  if (bay.pricePerHour === 0) return 'No payment needed right now';
  if (bay.status === 'full') return 'Usually paid, currently reported full';
  return 'Payment required during control hours';
};

const getNextFreeText = (bay) => {
  const match = bay.restrictions.match(/after\s+(\d{1,2}:?\d{0,2})/i);
  if (match) return `Free after ${match[1]}`;
  return bay.pricePerHour === 0 ? 'Free now' : 'Check signs before leaving vehicle';
};

const s = {
  overlay: {
    position: 'absolute', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%',
    background: '#ffffff',
    borderRadius: '22px 22px 0 0',
    padding: '14px 18px 30px',
    border: '1px solid rgba(15,23,42,0.08)',
    animation: 'slideUp 0.3s ease',
    boxShadow: '0 -18px 44px rgba(15,23,42,0.18)',
  },
  handle: {
    width: 36, height: 4,
    background: 'rgba(15,23,42,0.15)',
    borderRadius: 2, margin: '0 auto 20px',
  },
  row: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  streetName: { fontSize: 20, fontWeight: 800, color: '#0f172a' },
  zone: { fontSize: 12, color: '#64748b', fontFamily: "'Space Mono', monospace" },
  statusChip: {
    borderRadius: 999,
    padding: '7px 10px',
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  priceCard: {
    borderRadius: 16,
    border: '1px solid rgba(15,23,42,0.08)',
    background: '#f8fafc',
    padding: 14,
    marginBottom: 12,
  },
  priceWrap: { display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 },
  price: { fontSize: 32, fontWeight: 700 },
  perHour: { fontSize: 14, color: '#64748b' },
  priceMeta: { fontSize: 13, color: '#475569', fontWeight: 700 },
  badgeRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  badge: {
    padding: '4px 10px', borderRadius: 20,
    fontSize: 12, fontWeight: 500,
  },
  section: { marginBottom: 14 },
  sectionLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontFamily: "'Space Mono', monospace" },
  payRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  payBtn: {
    minHeight: 44,
    padding: '10px 12px', borderRadius: 12,
    background: '#f1f5f9', border: '1px solid rgba(15,23,42,0.08)',
    textAlign: 'center', fontSize: 13, fontWeight: 600,
    color: '#1d4ed8',
  },
  availBar: {
    padding: '10px 14px', borderRadius: 12, marginBottom: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  availLabel: { fontSize: 14, fontWeight: 600 },
  confidence: { fontSize: 12, color: '#64748b' },
  durationRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 6,
    marginBottom: 10,
  },
  durationBtn: {
    minHeight: 40,
    borderRadius: 12,
    border: '1px solid rgba(15,23,42,0.10)',
    background: '#ffffff',
    color: '#334155',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  sessionTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: 14,
    background: '#ecfeff',
    color: '#155e75',
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 12,
  },
  actionRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  actionBtn: {
    minHeight: 44,
    padding: '10px 8px', borderRadius: 12,
    border: 'none', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', textAlign: 'center',
    transition: 'opacity 0.15s',
  },
  primaryBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
    border: 'none',
    background: '#0f172a',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 20,
    width: 30, height: 30, borderRadius: '50%',
    background: '#f1f5f9',
    border: 'none', color: '#64748b',
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

export default function BayDetailSheet({ bay, onClose, onNavigate, onBayReport, onBayStatusChange, onStartSession }) {
  const [toast, setToast] = useState(null);
  const [localStatus, setLocalStatus] = useState(bay.status);
  const [duration, setDuration] = useState(60);

  const cfg = STATUS_CONFIG[localStatus];
  const total = useMemo(() => (
    bay.pricePerHour > 0 ? (bay.pricePerHour * duration) / 60 : 0
  ), [bay.pricePerHour, duration]);

  useEffect(() => {
    setLocalStatus(bay.status);
  }, [bay.id, bay.status]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleLeaving = () => {
    setLocalStatus('free');
    onBayStatusChange?.(bay.id, 'free');
    showToast('Thanks! Bay marked as free');
  };

  const handlePaid = () => {
    setLocalStatus('paid');
    onBayStatusChange?.(bay.id, 'paid');
    showToast('Bay marked as paid');
  };

  const handleFull = () => {
    setLocalStatus('full');
    onBayStatusChange?.(bay.id, 'full');
    showToast('Reported as full. Thanks!');
  };

  const handleWarden = () => {
    onBayReport?.('warden', bay);
    showToast('Warden alert sent nearby');
  };

  const handleStartParking = () => {
    onStartSession?.({ bay, durationMinutes: duration, total });
    showToast(`Parking started for ${duration} min`);
  };

  return (
    <div
      style={s.overlay}
      onClick={e => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {toast && <div style={s.toast} role="status" aria-live="polite">{toast}</div>}

      <div style={s.sheet} role="dialog" aria-modal="true" aria-labelledby="bay-sheet-title">
        <button style={s.closeBtn} onClick={onClose} aria-label="Close parking details">×</button>
        <div style={s.handle} aria-hidden="true" />

        <div style={s.row}>
          <div>
            <div id="bay-sheet-title" style={s.streetName}>{bay.streetName || bay.name}</div>
            <div style={s.zone}>Bay {bay.id} · Zone {bay.zone}</div>
          </div>
          <div style={{ ...s.statusChip, background: `${cfg.color}18`, color: cfg.color }}>
            {cfg.label}
          </div>
        </div>

        <div style={s.priceCard}>
          <div style={s.priceWrap}>
            <span style={{ ...s.price, color: bay.pricePerHour === 0 ? '#15803d' : '#0f172a' }}>
              {bay.pricePerHour === 0 ? 'FREE' : `£${bay.pricePerHour.toFixed(2)}`}
            </span>
            {bay.pricePerHour > 0 && <span style={s.perHour}>/ hour</span>}
          </div>
          <div style={s.priceMeta}>{getRestrictionSummary(bay)} · {getNextFreeText(bay)}</div>
        </div>

        <div style={s.badgeRow}>
          <span style={{ ...s.badge, background: 'rgba(29,78,216,0.12)', color: '#1d4ed8' }}>
            {bay.restrictions}
          </span>
          <span style={{ ...s.badge, background: 'rgba(180,83,9,0.14)', color: '#92400e' }}>
            Max {bay.maxStay}
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

        <div style={{ ...s.availBar, background: `${cfg.color}12`, border: `1px solid ${cfg.color}24` }}>
          <span style={{ ...s.availLabel, color: cfg.color }}>
            {cfg.label}
          </span>
          <span style={s.confidence}>
            Confidence {bay.confidence}/5 · {bay.lastUpdated}
          </span>
        </div>

        {bay.pricePerHour > 0 && (
          <div style={s.section}>
            <div style={s.sectionLabel}>Start parking</div>
            <div style={s.durationRow} role="group" aria-label="Choose parking duration">
              {DURATION_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  style={{
                    ...s.durationBtn,
                    background: duration === minutes ? '#0f172a' : '#ffffff',
                    color: duration === minutes ? '#ffffff' : '#334155',
                  }}
                  aria-pressed={duration === minutes}
                  onClick={() => setDuration(minutes)}
                >
                  {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}
                </button>
              ))}
            </div>
            <div style={s.sessionTotal}>
              <span>{duration} minutes</span>
              <span>£{total.toFixed(2)}</span>
            </div>
            <button style={s.primaryBtn} onClick={handleStartParking}>
              Start parking
            </button>
          </div>
        )}

        <button
          style={{ ...s.primaryBtn, background: '#1d4ed8' }}
          onClick={() => onNavigate?.(bay)}
        >
          Directions
        </button>

        <div style={s.actionRow}>
          <button
            style={{ ...s.actionBtn, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
            onClick={handleLeaving}
          >
            I'm Leaving
          </button>
          <button
            style={{ ...s.actionBtn, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
            onClick={handlePaid}
          >
            Paid
          </button>
          <button
            style={{ ...s.actionBtn, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}
            onClick={handleFull}
          >
            It's Full
          </button>
          <button
            style={{ ...s.actionBtn, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}
            onClick={handleWarden}
          >
            Warden alert
          </button>
        </div>
      </div>
    </div>
  );
}
