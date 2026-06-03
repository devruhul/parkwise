// ─── components/MapFallback.js ────────────────────────────────────────────────
import React from 'react';

const s = {
  wrap: {
    height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, background: '#111827',
  },
  card: {
    width: '100%', borderRadius: 18,
    background: 'rgba(22,27,34,0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: 18, color: '#e6edf3',
  },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  body: { fontSize: 13, lineHeight: 1.6, color: '#8b949e' },
  code: {
    display: 'block', marginTop: 12, padding: '10px 12px',
    borderRadius: 10, background: '#0d1117',
    color: '#60a5fa', fontSize: 12,
  },
};

export default function MapFallback() {
  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.title}>🗺️ Google Maps key needed</div>
        <div style={s.body}>
          Create a <strong>.env</strong> file in the project root and add your Maps JavaScript API key,
          then restart the dev server.
        </div>
        <code style={s.code}>REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE</code>
      </div>
    </div>
  );
}
