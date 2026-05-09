// ─── screens/MapScreen.js ─────────────────────────────────────────────────────
//
// This file is intentionally thin — it just wires together hooks and components.
// Business logic lives in: hooks/  utils/  constants/
// UI pieces live in:       components/
//
import React, { useCallback, useRef, useState } from 'react';
import {
  CircleF,
  DirectionsRenderer,
  GoogleMap,
  LoadScript,
  MarkerF,
  PolygonF,
  PolylineF,
} from '@react-google-maps/api';
import { Bell, Car, LocateFixed, MapPin, TriangleAlert, UserRound } from 'lucide-react';

import {
  googleMapOptions,
  googleMapsApiKey,
  googleMapsLibraries,
  hasConfiguredGoogleMapsKey,
  londonCenter,
} from '../services/googleMaps';

import { STATUS_COLORS, REPORT_COLORS } from '../constants';
import { createMarkerIcon, createPriceLabelIcon, getBayLabelPosition } from '../utils/mapHelpers';
import { getSessionEndTime } from '../utils/mapHelpers';

import useParkingBays   from '../hooks/useParkingBays';
import useUserLocation  from '../hooks/useUserLocation';
import useDirections    from '../hooks/useDirections';
import useReports       from '../hooks/useReports';

import BayDetailSheet    from '../components/BayDetailSheet';
import ReportScreen      from '../components/ReportScreen';
import SearchBar         from '../components/SearchBar';
import SessionCard       from '../components/SessionCard';
import NavigationHeader  from '../components/NavigationHeader';
import MapFallback       from '../components/MapFallback';

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  phone: {
    width: 390, height: 844,
    background: '#ffffff',
    borderRadius: 44, overflow: 'hidden',
    position: 'relative',
    border: '1px solid rgba(15,23,42,0.08)',
    boxShadow: '0 30px 70px rgba(15,23,42,0.16)',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'DM Sans', sans-serif",
  },
  statusBar: {
    padding: '12px 24px 0',
    display: 'flex', justifyContent: 'space-between',
    zIndex: 30,
    background: 'rgba(255,255,255,0.94)',
    backdropFilter: 'blur(10px)',
    flexShrink: 0,
  },
  statusText: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  mapWrap: { flex: 1, position: 'relative', minHeight: 0 },

  livePill: {
    position: 'absolute', top: 114, left: 12, zIndex: 22,
    padding: '7px 11px', borderRadius: 20,
    background: 'rgba(255,255,255,0.94)',
    border: '1px solid rgba(15,23,42,0.10)',
    fontSize: 11, color: '#64748b', fontWeight: 700,
    backdropFilter: 'blur(8px)',
  },
  mapModeRow: {
    position: 'absolute', top: 146, left: 12, zIndex: 22,
    display: 'flex', gap: 6,
  },
  mapModeBtn: {
    minHeight: 36, borderRadius: 18,
    border: '1px solid rgba(15,23,42,0.10)',
    background: 'rgba(255,255,255,0.94)',
    color: '#334155', padding: '0 11px',
    fontSize: 11, fontWeight: 800, cursor: 'pointer',
    boxShadow: '0 8px 18px rgba(15,23,42,0.10)',
  },
  mapLabelPill: {
    position: 'absolute', bottom: 212,
    left: '50%', transform: 'translateX(-50%)',
    background: '#2563eb', color: '#ffffff',
    borderRadius: 16, padding: '8px 14px',
    fontSize: 14, fontWeight: 800,
    boxShadow: '0 10px 22px rgba(37,99,235,0.25)', zIndex: 28,
  },
  legendRow: {
    position: 'absolute', bottom: 160, left: 12, zIndex: 20, display: 'flex', gap: 6,
  },
  legendPill: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 10px', borderRadius: 20,
    background: 'rgba(255,255,255,0.94)',
    border: '1px solid rgba(15,23,42,0.10)',
    fontSize: 11, fontWeight: 700, color: '#0f172a',
    boxShadow: '0 8px 18px rgba(15,23,42,0.10)',
  },
  legendDot: { width: 8, height: 8, borderRadius: '50%' },
  locateBtn: {
    position: 'absolute', bottom: 184, right: 16, zIndex: 24,
    width: 54, height: 54, borderRadius: '50%',
    background: '#ffffff', border: '1px solid rgba(15,23,42,0.12)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#0f172a', boxShadow: '0 10px 24px rgba(15,23,42,0.15)',
  },
  reportPill: {
    position: 'absolute', bottom: 118, right: 16, zIndex: 24,
    height: 56, padding: '0 16px', borderRadius: 28,
    background: '#ffffff', border: '1px solid rgba(15,23,42,0.10)',
    boxShadow: '0 10px 24px rgba(15,23,42,0.16)',
    display: 'flex', alignItems: 'center', gap: 12,
    color: '#374151', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  bottomBar: {
    background: 'rgba(255,255,255,0.96)',
    backdropFilter: 'blur(10px)',
    padding: '12px 20px 40px',
    borderTop: '1px solid rgba(15,23,42,0.08)',
    zIndex: 26, flexShrink: 0,
  },
  bottomHandle: {
    width: 38, height: 5, borderRadius: 999,
    background: '#9ca3af', margin: '0 auto 8px',
  },
  routeSummary: { textAlign: 'center', marginBottom: 12 },
  routeTitle:   { fontSize: 28, fontWeight: 800, color: '#d97706', marginBottom: 4 },
  routeSub:     { fontSize: 13, color: '#64748b' },
  bottomRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  endRouteBtn:  {
    border: 'none', borderRadius: 14,
    background: '#0f172a', color: '#ffffff',
    fontSize: 13, fontWeight: 800, padding: '12px 16px', cursor: 'pointer',
  },
  tabBar: {
    height: 64,
    background: 'rgba(255,255,255,0.98)',
    borderTop: '1px solid rgba(15,23,42,0.08)',
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    alignItems: 'center', zIndex: 36, flexShrink: 0,
  },
  tabBtn: {
    minHeight: 56, border: 'none', background: 'transparent',
    color: '#64748b', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 3, fontSize: 10, fontWeight: 800, cursor: 'pointer',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function MapScreen() {
  const mapRef          = useRef(null);

  // ── All state now in focused hooks ──────────────────────────────────────
  const bays            = useParkingBays(mapRef);
  const loc             = useUserLocation(mapRef);
  const nav             = useDirections(mapRef, loc.userLocation, () => loc.startWatch(true));
  const { reports, addReport } = useReports(mapRef, loc.userLocation, bays.updateBayStatus);

  const [selectedBay,   setSelectedBay]   = useState(null);
  const [showReport,    setShowReport]     = useState(false);
  const [activeSession, setActiveSession]  = useState(null);
  const [statusMessage, setStatusMessage]  = useState('');

  // ── Map load ─────────────────────────────────────────────────────────────
  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;
    bays.updateVisibleBounds();
    window.setTimeout(bays.fitAllBays, 150);
  }, [bays]);

  // ── Search ───────────────────────────────────────────────────────────────
  const handlePlaceSelected = useCallback((place) => {
    const location = place?.geometry?.location;
    if (!location || !mapRef.current) return;
    mapRef.current.panTo({ lat: location.lat(), lng: location.lng() });
    mapRef.current.setZoom(17);
  }, []);

  // ── Session ──────────────────────────────────────────────────────────────
  const handleStartSession = useCallback(({ bay, durationMinutes, total }) => {
    setActiveSession({
      bay, durationMinutes, total,
      startedAt: Date.now(),
      endsAt: getSessionEndTime(durationMinutes),
    });
  }, []);

  // ── Report submit ────────────────────────────────────────────────────────
  const handleReportSubmit = useCallback(
    (option, target) => addReport(option.id, selectedBay, target),
    [addReport, selectedBay]
  );

  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={s.phone}>
      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div style={s.statusBar}>
        <span style={s.statusText}>{now}</span>
        <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 800 }}>
          {nav.routeSummary ? 'NAV' : 'LIVE'}
        </span>
      </div>

      {/* ── Map area ─────────────────────────────────────────────────────── */}
      <div style={s.mapWrap}>
        <NavigationHeader summary={nav.routeSummary} onClose={nav.endRoute} />

        {hasConfiguredGoogleMapsKey() ? (
          <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={googleMapsLibraries}>
            {/* Search bar — hidden during navigation */}
            {!nav.routeSummary && (
              <SearchBar
                onPlaceSelected={handlePlaceSelected}
                onMessage={setStatusMessage}
              />
            )}

            {statusMessage && (
              <div style={s.livePill} role="status" aria-live="polite">
                {statusMessage}
              </div>
            )}

            <GoogleMap
              center={londonCenter}
              zoom={15}
              mapContainerStyle={{ width: '100%', height: '100%' }}
              options={{
                ...googleMapOptions,
                mapTypeId: nav.directions ? 'hybrid' : 'roadmap',
                tilt: nav.directions ? 45 : 0,
              }}
              onLoad={handleMapLoad}
              onIdle={bays.updateVisibleBounds}
            >
              {/* Directions overlay */}
              {nav.directions && (
                <DirectionsRenderer
                  directions={nav.directions}
                  options={{
                    suppressMarkers: false,
                    preserveViewport: true,
                    polylineOptions: { strokeColor: '#1d4ed8', strokeOpacity: 0.92, strokeWeight: 7 },
                  }}
                />
              )}

              {/* Parking bays */}
              {bays.visibleBays.map((bay) => (
                <React.Fragment key={bay.id}>
                  {bay.polygons ? (
                    bay.polygons.map((path, i) => (
                      <PolygonF
                        key={`${bay.id}_${i}`}
                        paths={path}
                        options={{
                          fillColor:    STATUS_COLORS[bay.status],
                          fillOpacity:  nav.activeRouteBay?.id === bay.id ? 0.26 : 0.13,
                          strokeColor:  STATUS_COLORS[bay.status],
                          strokeOpacity: 0.82,
                          strokeWeight: nav.activeRouteBay?.id === bay.id ? 4 : 2,
                          clickable: true,
                          zIndex: nav.activeRouteBay?.id === bay.id ? 35 : 18,
                        }}
                        onClick={() => setSelectedBay(bay)}
                      />
                    ))
                  ) : (
                    <PolylineF
                      path={bay.coordinates}
                      options={{
                        strokeColor:   STATUS_COLORS[bay.status],
                        strokeOpacity: 0.96,
                        strokeWeight:  nav.activeRouteBay?.id === bay.id ? 11 : 8,
                        clickable: true,
                        zIndex: nav.activeRouteBay?.id === bay.id ? 40 : 30,
                      }}
                      onClick={() => setSelectedBay(bay)}
                    />
                  )}
                  <MarkerF
                    position={getBayLabelPosition(bay)}
                    icon={createPriceLabelIcon(bay)}
                    title={`${bay.streetName || bay.name} · ${bay.restrictions}`}
                    onClick={() => setSelectedBay(bay)}
                  />
                </React.Fragment>
              ))}

              {/* User location */}
              {loc.userLocation && (
                <>
                  <CircleF
                    center={loc.userLocation}
                    radius={28}
                    options={{
                      fillColor: '#60a5fa', fillOpacity: 0.26,
                      strokeColor: '#bfdbfe', strokeOpacity: 0.92,
                      strokeWeight: 2, clickable: false, zIndex: 30,
                    }}
                  />
                  <MarkerF
                    position={loc.userLocation}
                    icon={createMarkerIcon('#2563eb', 'YOU')}
                    title="Your location"
                  />
                </>
              )}

              {/* Community reports */}
              {reports.map((r) => (
                <MarkerF
                  key={r.id}
                  position={{ lat: r.lat, lng: r.lng }}
                  icon={createMarkerIcon(REPORT_COLORS[r.type] || '#f97316')}
                  title={`${r.label} · ${r.time}`}
                />
              ))}
            </GoogleMap>
          </LoadScript>
        ) : (
          <MapFallback />
        )}

        {/* ── Overlay pills / buttons ───────────────────────────────────── */}
        {!statusMessage && (
          <div style={s.livePill}>
            {loc.locationMessage} · {bays.visibleBays.length} bays
          </div>
        )}

        {/* All bays / Nearby toggle */}
        <div style={s.mapModeRow} role="group" aria-label="Bay display mode">
          {[
            { label: 'All bays', val: true },
            { label: 'Nearby',   val: false },
          ].map(({ label, val }) => (
            <button
              key={label}
              type="button"
              style={{
                ...s.mapModeBtn,
                background: bays.showAllBays === val ? '#0f172a' : 'rgba(255,255,255,0.94)',
                color:      bays.showAllBays === val ? '#ffffff' : '#334155',
              }}
              aria-pressed={bays.showAllBays === val}
              onClick={() => {
                bays.setShowAllBays(val);
                if (val) bays.fitAllBays();
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {nav.activeRouteBay && (
          <div style={s.mapLabelPill}>{nav.activeRouteBay.name}</div>
        )}

        {/* Legend */}
        <div style={s.legendRow}>
          {[
            { color: '#22c55e', label: 'Free' },
            { color: '#3b82f6', label: 'Paid' },
            { color: '#ef4444', label: 'Full' },
          ].map((l) => (
            <div key={l.label} style={s.legendPill}>
              <div style={{ ...s.legendDot, background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Active parking session card */}
        <SessionCard session={activeSession} onEnd={() => setActiveSession(null)} />

        {/* Locate me */}
        <button
          type="button"
          style={s.locateBtn}
          onClick={() => loc.startWatch(Boolean(nav.directions))}
          aria-label="Find my location"
        >
          <LocateFixed size={28} strokeWidth={2.2} />
        </button>

        {/* Report button */}
        <button
          type="button"
          style={s.reportPill}
          onClick={() => setShowReport(true)}
          aria-label="Report parking update"
        >
          <TriangleAlert size={30} color="#d97706" strokeWidth={2.2} />
          <span>Report</span>
        </button>

        {/* ── Overlays ─────────────────────────────────────────────────── */}
        {selectedBay && (
          <BayDetailSheet
            bay={selectedBay}
            onClose={() => setSelectedBay(null)}
            onNavigate={nav.startDirections}
            onBayReport={addReport}
            onBayStatusChange={bays.updateBayStatus}
            onStartSession={handleStartSession}
          />
        )}

        {showReport && (
          <ReportScreen
            onClose={() => setShowReport(false)}
            onSubmit={handleReportSubmit}
            selectedBay={selectedBay}
            hasUserLocation={Boolean(loc.userLocation)}
          />
        )}
      </div>

      {/* ── Bottom summary bar ───────────────────────────────────────────── */}
      <div style={s.bottomBar}>
        <div style={s.bottomHandle} />
        <div style={s.routeSummary}>
          <div style={s.routeTitle}>
            {nav.routeSummary
              ? nav.routeSummary.duration
              : activeSession
              ? 'Parking active'
              : 'Find parking'}
          </div>
          <div style={s.routeSub}>
            {nav.routeSummary
              ? `${nav.routeSummary.distance} · ${nav.routeSummary.destination}`
              : activeSession
              ? `${activeSession.bay.streetName} · ends ${activeSession.endsAt}`
              : 'Search a street or tap a bay to view details.'}
          </div>
        </div>
        <div style={s.bottomRow}>
          <div />
          {nav.routeSummary && (
            <button type="button" style={s.endRouteBtn} onClick={nav.endRoute}>
              End route
            </button>
          )}
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div style={s.tabBar} role="navigation" aria-label="Main navigation">
        <button type="button" style={{ ...s.tabBtn, color: '#1d4ed8' }} aria-current="page">
          <MapPin size={19} strokeWidth={2.3} /><span>Map</span>
        </button>
        <button type="button" style={s.tabBtn} onClick={() => setShowReport(true)}>
          <Bell size={19} strokeWidth={2.3} /><span>Reports</span>
        </button>
        <button type="button" style={s.tabBtn}>
          <Car size={19} strokeWidth={2.3} /><span>Saved</span>
        </button>
        <button type="button" style={s.tabBtn}>
          <UserRound size={19} strokeWidth={2.3} /><span>Account</span>
        </button>
      </div>
    </div>
  );
}
