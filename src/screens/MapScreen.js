import React, { useState } from 'react';
import { GoogleMap, LoadScript, MarkerF } from '@react-google-maps/api';
import { PARKING_BAYS, REPORTS, STATUS_CONFIG } from '../data/parkingData';
import {
  googleMapOptions,
  googleMapsApiKey,
  googleMapsLibraries,
  hasConfiguredGoogleMapsKey,
  londonCenter,
} from '../services/googleMaps';
import BayDetailSheet from '../components/BayDetailSheet';
import ReportScreen from '../components/ReportScreen';

const STATUS_COLORS = {
  free:    '#22c55e',
  paid:    '#3b82f6',
  full:    '#ef4444',
};

const REPORT_COLORS = {
  warden:   '#fbbf24',
  blocked:  '#f97316',
  accident: '#ef4444',
};

const REPORT_ICONS = {
  warden: '🚓',
  blocked: '⚠️',
  accident: '🚨',
};

const createMarkerIcon = (color, label = '') => {
  const svg = `
    <svg width="58" height="46" viewBox="0 0 58 46" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.42"/>
      </filter>
      <g filter="url(#shadow)">
        <circle cx="29" cy="20" r="13" fill="${color}" stroke="#f8fafc" stroke-width="3"/>
        <path d="M29 43L21 28H37L29 43Z" fill="${color}" stroke="#f8fafc" stroke-width="3" stroke-linejoin="round"/>
      </g>
      ${
        label
          ? `<text x="29" y="23.5" text-anchor="middle" font-size="8" font-family="Arial, sans-serif" font-weight="700" fill="#ffffff">${label}</text>`
          : ''
      }
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
  };
};

const s = {
  phone: {
    width: 390, height: 844,
    background: '#0d1117',
    borderRadius: 44, overflow: 'hidden',
    position: 'relative',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
    display: 'flex', flexDirection: 'column',
  },
  statusBar: {
    padding: '12px 24px 0',
    display: 'flex', justifyContent: 'space-between',
    zIndex: 10, background: 'rgba(13,17,23,0.9)',
    backdropFilter: 'blur(10px)',
  },
  statusText: { fontSize: 14, fontWeight: 600, color: '#e6edf3' },
  mapWrap: { flex: 1, position: 'relative' },
  searchBar: {
    position: 'absolute', top: 12, left: 12, right: 12, zIndex: 20,
    background: 'rgba(22,27,34,0.95)',
    borderRadius: 16,
    padding: '10px 14px',
    display: 'flex', alignItems: 'center', gap: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
  },
  searchInput: {
    flex: 1, background: 'transparent',
    border: 'none', outline: 'none',
    color: '#e6edf3', fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
  },
  mapFallback: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: '#111827',
  },
  mapFallbackCard: {
    width: '100%',
    borderRadius: 18,
    background: 'rgba(22,27,34,0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: 18,
    color: '#e6edf3',
  },
  mapFallbackTitle: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  mapFallbackText: { fontSize: 13, lineHeight: 1.5, color: '#8b949e' },
  code: {
    display: 'block',
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 10,
    background: '#0d1117',
    color: '#60a5fa',
    fontSize: 12,
    fontFamily: "'Space Mono', monospace",
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  legendRow: {
    position: 'absolute', bottom: 12, left: 12, zIndex: 20,
    display: 'flex', gap: 6,
  },
  legendPill: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 10px', borderRadius: 20,
    background: 'rgba(22,27,34,0.92)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: 11, fontWeight: 600, color: '#e6edf3',
    backdropFilter: 'blur(8px)',
  },
  legendDot: { width: 8, height: 8, borderRadius: '50%' },
  fabBtn: {
    position: 'absolute', bottom: 12, right: 12, zIndex: 20,
    width: 48, height: 48, borderRadius: '50%',
    background: '#22c55e',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, color: '#052e16', fontWeight: 700,
    boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
    transition: 'transform 0.15s',
  },
  bottomBar: {
    background: 'rgba(13,17,23,0.95)',
    backdropFilter: 'blur(10px)',
    padding: '12px 20px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    zIndex: 10,
  },
  bottomRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  areaLabel: { fontSize: 13, fontWeight: 700, color: '#e6edf3' },
  timeLabel: { fontSize: 11, color: '#484f58', fontFamily: "'Space Mono', monospace" },
  statsRow: { display: 'flex', gap: 8 },
  statCard: {
    flex: 1, padding: '8px 10px', borderRadius: 12,
    background: '#1c2333', border: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center',
  },
  statNum: { fontSize: 18, fontWeight: 700 },
  statLabel: { fontSize: 10, color: '#8b949e', marginTop: 2 },
  profileBtn: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'rgba(34,197,94,0.15)',
    border: '1px solid rgba(34,197,94,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, cursor: 'pointer',
  },
};

export default function MapScreen() {
  const [selectedBay, setSelectedBay] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [bays] = useState(PARKING_BAYS);
  const [points, setPoints] = useState(120);

  const freeBays  = bays.filter(b => b.status === 'free').length;
  const paidBays  = bays.filter(b => b.status === 'paid').length;
  const fullBays  = bays.filter(b => b.status === 'full').length;

  const handleBayClick = (bay) => {
    setSelectedBay(bay);
  };

  const handleCloseSheet = () => {
    setSelectedBay(null);
    setPoints(p => p + 5);
  };

  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={s.phone}>
      {/* Status bar */}
      <div style={s.statusBar}>
        <span style={s.statusText}>{now}</span>
        <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
          ⭐ {points} pts
        </span>
      </div>

      {/* Map */}
      <div style={s.mapWrap}>
        {/* Search bar */}
        <div style={s.searchBar}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            style={s.searchInput}
            placeholder="Search postcode or street..."
          />
          <span style={{ fontSize: 16, cursor: 'pointer' }}>⚙️</span>
        </div>

        {hasConfiguredGoogleMapsKey() ? (
          <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={googleMapsLibraries}>
            <GoogleMap
              center={londonCenter}
              zoom={14}
              mapContainerStyle={{ width: '100%', height: '100%' }}
              options={googleMapOptions}
            >
              {bays.map(bay => (
                <MarkerF
                  key={bay.id}
                  position={{ lat: bay.lat, lng: bay.lng }}
                  icon={createMarkerIcon(
                    STATUS_COLORS[bay.status],
                    bay.pricePerHour === 0 ? 'FREE' : `£${bay.pricePerHour.toFixed(0)}`
                  )}
                  title={`${bay.name} · ${STATUS_CONFIG[bay.status].label}`}
                  onClick={() => handleBayClick(bay)}
                />
              ))}

              {REPORTS.map(report => (
                <MarkerF
                  key={report.id}
                  position={{ lat: report.lat, lng: report.lng }}
                  icon={createMarkerIcon(REPORT_COLORS[report.type] || '#f97316', REPORT_ICONS[report.type])}
                  title={`${report.label} · ${report.time}`}
                />
              ))}
            </GoogleMap>
          </LoadScript>
        ) : (
          <div style={s.mapFallback}>
            <div style={s.mapFallbackCard}>
              <div style={s.mapFallbackTitle}>Google Maps key needed</div>
              <div style={s.mapFallbackText}>
                Add your Maps JavaScript API key to a local .env file, then restart the dev server.
              </div>
              <code style={s.code}>REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_API_KEY</code>
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={s.legendRow}>
          <div style={s.legendPill}><div style={{ ...s.legendDot, background: '#22c55e' }} />Free</div>
          <div style={s.legendPill}><div style={{ ...s.legendDot, background: '#3b82f6' }} />Paid</div>
          <div style={s.legendPill}><div style={{ ...s.legendDot, background: '#ef4444' }} />Full</div>
        </div>

        {/* Report FAB */}
        <button
          style={s.fabBtn}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          onClick={() => setShowReport(true)}
        >
          +
        </button>

        {/* Bay detail popup */}
        {selectedBay && (
          <BayDetailSheet
            bay={selectedBay}
            onClose={handleCloseSheet}
          />
        )}

        {/* Report screen */}
        {showReport && (
          <ReportScreen onClose={() => { setShowReport(false); setPoints(p => p + 10); }} />
        )}
      </div>

      {/* Bottom bar */}
      <div style={s.bottomBar}>
        <div style={s.bottomRow}>
          <div>
            <div style={s.areaLabel}>Tower Hamlets · E1–E3</div>
            <div style={s.timeLabel}>Live data · updated now</div>
          </div>
          <div style={s.profileBtn}>👤</div>
        </div>
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: '#22c55e' }}>{freeBays}</div>
            <div style={s.statLabel}>Free</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: '#3b82f6' }}>{paidBays}</div>
            <div style={s.statLabel}>Paid</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: '#ef4444' }}>{fullBays}</div>
            <div style={s.statLabel}>Full</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: '#fbbf24' }}>{REPORTS.length}</div>
            <div style={s.statLabel}>Active alerts</div>
          </div>
        </div>
      </div>
    </div>
  );
}
