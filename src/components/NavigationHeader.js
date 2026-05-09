// ─── components/NavigationHeader.js ──────────────────────────────────────────
import React from 'react';
import { X } from 'lucide-react';

const s = {
  wrap: {
    position: 'absolute',
    top: 12, left: 12, right: 12,
    zIndex: 32,
    background: '#0f7660', borderRadius: 26,
    padding: '16px 18px', color: '#ffffff',
    boxShadow: '0 18px 36px rgba(15,23,42,0.22)',
  },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backBtn: {
    width: 52, height: 52, borderRadius: '50%',
    border: 'none', background: 'rgba(255,255,255,0.16)',
    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  },
  textWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.84)', marginBottom: 2 },
  subtitle: { fontSize: 20, fontWeight: 800, color: '#ffffff', lineHeight: 1.1 },
  meta: { fontSize: 12, color: 'rgba(255,255,255,0.84)', marginTop: 6 },
};

export default function NavigationHeader({ summary, onClose }) {
  if (!summary) return null;
  return (
    <div style={s.wrap}>
      <div style={s.row}>
        <button style={s.backBtn} onClick={onClose} aria-label="Close directions">
          <X size={26} strokeWidth={2.2} />
        </button>
        <div style={s.textWrap}>
          <div style={s.title}>Driving to parking bay</div>
          <div style={s.subtitle}>{summary.destination}</div>
          <div style={s.meta}>{summary.duration} · {summary.distance}</div>
        </div>
      </div>
    </div>
  );
}
