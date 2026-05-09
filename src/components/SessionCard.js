// ─── components/SessionCard.js ────────────────────────────────────────────────
import React from 'react';

const s = {
  card: {
    position: 'absolute',
    left: 12, right: 12, bottom: 244,
    zIndex: 24, borderRadius: 18,
    background: '#0f172a', color: '#ffffff',
    padding: 14,
    boxShadow: '0 16px 36px rgba(15,23,42,0.28)',
  },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 13, color: 'rgba(255,255,255,0.72)', fontWeight: 700 },
  street: { fontSize: 16, fontWeight: 800, marginTop: 2 },
  meta: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 6 },
  endBtn: {
    minHeight: 44, borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.10)',
    color: '#ffffff', fontSize: 12, fontWeight: 800,
    padding: '0 12px', cursor: 'pointer',
  },
};

export default function SessionCard({ session, onEnd }) {
  if (!session) return null;
  return (
    <div style={s.card} role="status" aria-live="polite">
      <div style={s.row}>
        <div>
          <div style={s.title}>Active parking</div>
          <div style={s.street}>{session.bay.streetName || session.bay.name}</div>
          <div style={s.meta}>
            Ends {session.endsAt} · £{session.total.toFixed(2)}
          </div>
        </div>
        <button type="button" style={s.endBtn} onClick={onEnd} aria-label="End parking session">
          End
        </button>
      </div>
    </div>
  );
}
