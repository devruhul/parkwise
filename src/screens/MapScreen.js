import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, CircleF, DirectionsRenderer, GoogleMap, LoadScript, MarkerF, PolygonF, PolylineF } from '@react-google-maps/api';
import { Bell, Car, LocateFixed, MapPin, Search, TriangleAlert, UserRound, X } from 'lucide-react';
import { PARKING_BAYS, REPORTS } from '../data/parkingData';
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
  free: '#22c55e',
  paid: '#3b82f6',
  full: '#ef4444',
};

const REPORT_COLORS = {
  free: '#22c55e',
  full: '#ef4444',
  warden: '#fbbf24',
  blocked: '#f97316',
  works: '#a78bfa',
  accident: '#ef4444',
};

const REPORT_LABELS = {
  free: 'Spot free',
  full: 'No space',
  warden: 'Warden nearby',
  blocked: 'Bay blocked',
  works: 'Roadworks',
  accident: 'Accident',
};

const REPORT_COOLDOWN_MS = 15000;
const ALL_BAYS_PADDING = 52;

const getStoredReports = () => {
  try {
    return JSON.parse(window.localStorage.getItem('parkwise_reports') || '[]');
  } catch {
    return [];
  }
};

const saveStoredReports = (reports) => {
  try {
    window.localStorage.setItem('parkwise_reports', JSON.stringify(reports.slice(-50)));
  } catch {
    // Local persistence is best-effort while the app is still mock-data backed.
  }
};

const getSessionEndTime = (durationMinutes) => {
  const end = new Date(Date.now() + durationMinutes * 60 * 1000);
  return end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const getBayLabel = (bay) => (
  /permit/i.test(bay.rawCost || bay.maxStay || '')
    ? 'PERMIT'
    : bay.pricePerHour === 0 ? 'FREE' : `£${bay.pricePerHour.toFixed(2)}/hr`
);

const parsePricePerHour = (cost) => {
  if (!cost || /permit/i.test(cost)) return 0;
  const match = cost.match(/£([\d.]+)/);
  if (!match) return 0;
  const amount = Number(match[1]);
  return /1\/2 hour|half hour/i.test(cost) ? amount * 2 : amount;
};

const normalizeImportedFeature = (feature) => {
  const properties = feature.properties || {};
  const rawPolygons = feature.geometry?.type === 'MultiPolygon'
    ? feature.geometry.coordinates
    : [feature.geometry?.coordinates];

  const polygons = rawPolygons
    .filter(Boolean)
    .map((polygon) => (
      polygon[0].map(([lng, lat]) => ({ lat, lng }))
    ));

  const points = polygons.flat();
  const center = points.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    { lat: 0, lng: 0 }
  );
  const pricePerHour = parsePricePerHour(properties.COST);
  const status = /permit/i.test(properties.COST) ? 'full' : 'paid';

  return {
    id: `inspire_${properties.OBJECTID_12}`,
    source: 'INSPIRE',
    streetName: `Zone ${properties.ZONE}`,
    name: `Zone ${properties.ZONE}`,
    lat: center.lat / points.length,
    lng: center.lng / points.length,
    polygons,
    coordinates: polygons[0]?.slice(0, 8) || [],
    status,
    confidence: 3,
    pricePerHour,
    restrictions: `${properties.DAYS || 'Controlled days'} ${properties.TIME_ || ''}`.trim(),
    maxStay: /permit/i.test(properties.COST) ? 'Permit holders only' : 'See local signs',
    paymentMethods: pricePerHour > 0 ? ['PayByPhone', 'Council portal'] : [],
    zone: properties.ZONE || 'Unknown',
    lastUpdated: 'Council data',
    councilLink: properties.HYPERLINK,
    rawCost: properties.COST,
  };
};

const getBayLabelPosition = (bay) => {
  if (bay.polygons?.length) {
    return { lat: bay.lat, lng: bay.lng };
  }
  const path = bay.coordinates || [{ lat: bay.lat, lng: bay.lng }];
  return path[Math.floor(path.length / 2)];
};

const isBayInBounds = (bay, bounds) => {
  if (!bounds) return true;

  const points = bay.coordinates || [{ lat: bay.lat, lng: bay.lng }];
  return points.some((point) => (
    point.lat >= bounds.south &&
    point.lat <= bounds.north &&
    point.lng >= bounds.west &&
    point.lng <= bounds.east
  ));
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

const createPriceLabelIcon = (bay) => {
  const label = getBayLabel(bay);
  const color = STATUS_COLORS[bay.status];
  const width = label.length > 5 ? 78 : 62;
  const svg = `
    <svg width="${width}" height="30" viewBox="0 0 ${width} 30" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-30%" y="-60%" width="160%" height="220%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
      <rect x="2" y="3" width="${width - 4}" height="22" rx="11" fill="#ffffff" stroke="${color}" stroke-width="2" filter="url(#shadow)"/>
      <text x="${width / 2}" y="18" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">${label}</text>
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
  };
};

const s = {
  phone: {
    width: 390,
    height: 844,
    background: '#ffffff',
    borderRadius: 44,
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid rgba(15,23,42,0.08)',
    boxShadow: '0 30px 70px rgba(15,23,42,0.16)',
    display: 'flex',
    flexDirection: 'column',
  },
  statusBar: {
    padding: '12px 24px 0',
    display: 'flex',
    justifyContent: 'space-between',
    zIndex: 30,
    background: 'rgba(255,255,255,0.94)',
    backdropFilter: 'blur(10px)',
  },
  statusText: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  mapWrap: { flex: 1, position: 'relative' },
  searchBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 24,
    background: 'rgba(255,255,255,0.96)',
    borderRadius: 18,
    padding: '11px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: '1px solid rgba(15,23,42,0.10)',
    boxShadow: '0 12px 30px rgba(15,23,42,0.12)',
    backdropFilter: 'blur(10px)',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
  },
  searchText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: 600,
  },
  searchStatus: {
    position: 'absolute',
    top: 68,
    left: 18,
    right: 18,
    zIndex: 25,
    borderRadius: 14,
    padding: '9px 12px',
    background: '#ffffff',
    border: '1px solid rgba(15,23,42,0.10)',
    color: '#475569',
    fontSize: 12,
    fontWeight: 700,
    boxShadow: '0 10px 22px rgba(15,23,42,0.12)',
  },
  navHeader: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 32,
    background: '#0f7660',
    borderRadius: 26,
    padding: '16px 18px',
    color: '#ffffff',
    boxShadow: '0 18px 36px rgba(15,23,42,0.22)',
  },
  navHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  navBackBtn: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.16)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  navTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  navTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.84)',
    marginBottom: 2,
  },
  navSubtitle: {
    fontSize: 20,
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1.1,
  },
  navMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.84)',
    marginTop: 6,
  },
  livePill: {
    position: 'absolute',
    top: 114,
    left: 12,
    zIndex: 22,
    padding: '7px 11px',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.94)',
    border: '1px solid rgba(15,23,42,0.10)',
    fontSize: 11,
    color: '#64748b',
    fontWeight: 700,
    backdropFilter: 'blur(8px)',
  },
  mapModeRow: {
    position: 'absolute',
    top: 146,
    left: 12,
    zIndex: 22,
    display: 'flex',
    gap: 6,
  },
  mapModeBtn: {
    minHeight: 36,
    borderRadius: 18,
    border: '1px solid rgba(15,23,42,0.10)',
    background: 'rgba(255,255,255,0.94)',
    color: '#334155',
    padding: '0 11px',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 8px 18px rgba(15,23,42,0.10)',
  },
  mapLabelPill: {
    position: 'absolute',
    bottom: 212,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#2563eb',
    color: '#ffffff',
    borderRadius: 16,
    padding: '8px 14px',
    fontSize: 14,
    fontWeight: 800,
    boxShadow: '0 10px 22px rgba(37,99,235,0.25)',
    zIndex: 28,
  },
  legendRow: {
    position: 'absolute',
    bottom: 160,
    left: 12,
    zIndex: 20,
    display: 'flex',
    gap: 6,
  },
  legendPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 10px',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.94)',
    border: '1px solid rgba(15,23,42,0.10)',
    fontSize: 11,
    fontWeight: 700,
    color: '#0f172a',
    boxShadow: '0 8px 18px rgba(15,23,42,0.10)',
  },
  legendDot: { width: 8, height: 8, borderRadius: '50%' },
  locateBtn: {
    position: 'absolute',
    bottom: 184,
    right: 16,
    zIndex: 24,
    width: 54,
    height: 54,
    borderRadius: '50%',
    background: '#ffffff',
    border: '1px solid rgba(15,23,42,0.12)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0f172a',
    boxShadow: '0 10px 24px rgba(15,23,42,0.15)',
  },
  reportPill: {
    position: 'absolute',
    bottom: 118,
    right: 16,
    zIndex: 24,
    height: 56,
    padding: '0 16px',
    borderRadius: 28,
    background: '#ffffff',
    border: '1px solid rgba(15,23,42,0.10)',
    boxShadow: '0 10px 24px rgba(15,23,42,0.16)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: '#374151',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  sessionCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 244,
    zIndex: 24,
    borderRadius: 18,
    background: '#0f172a',
    color: '#ffffff',
    padding: 14,
    boxShadow: '0 16px 36px rgba(15,23,42,0.28)',
  },
  sessionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sessionTitle: { fontSize: 13, color: 'rgba(255,255,255,0.72)', fontWeight: 700 },
  sessionStreet: { fontSize: 16, fontWeight: 800, marginTop: 2 },
  sessionMeta: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 6 },
  sessionBtn: {
    minHeight: 44,
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.10)',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 800,
    padding: '0 12px',
    cursor: 'pointer',
  },
  tabBar: {
    height: 64,
    background: 'rgba(255,255,255,0.98)',
    borderTop: '1px solid rgba(15,23,42,0.08)',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    alignItems: 'center',
    zIndex: 36,
  },
  tabBtn: {
    minHeight: 56,
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    fontSize: 10,
    fontWeight: 800,
    cursor: 'pointer',
  },
  bottomBar: {
    background: 'rgba(255,255,255,0.96)',
    backdropFilter: 'blur(10px)',
    padding: '12px 20px 40px',
    borderTop: '1px solid rgba(15,23,42,0.08)',
    zIndex: 26,
  },
  bottomHandle: {
    width: 38,
    height: 5,
    borderRadius: 999,
    background: '#9ca3af',
    margin: '0 auto 8px',
  },
  routeSummary: {
    textAlign: 'center',
    marginBottom: 12,
  },
  routeTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: '#d97706',
    marginBottom: 4,
  },
  routeSub: {
    fontSize: 13,
    color: '#64748b',
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  bottomInfo: {
    flex: 1,
  },
  areaLabel: { fontSize: 13, fontWeight: 800, color: '#0f172a' },
  timeLabel: { fontSize: 11, color: '#64748b' },
  endRouteBtn: {
    border: 'none',
    borderRadius: 14,
    background: '#0f172a',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 800,
    padding: '12px 16px',
    cursor: 'pointer',
  },
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
    background: 'rgba(255,255,255,0.96)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 44,
    zIndex: 120,
  },
  navPill: {
    width: 54,
    height: 5,
    borderRadius: 999,
    background: '#9ca3af',
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
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

export default function MapScreen() {
  const [parkingBays, setParkingBays] = useState(PARKING_BAYS);
  const [importedZones, setImportedZones] = useState([]);
  const [reports, setReports] = useState(() => [...REPORTS, ...getStoredReports()]);
  const [selectedBay, setSelectedBay] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [visibleBounds, setVisibleBounds] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState('Tap locate to follow');
  const [activeRouteBay, setActiveRouteBay] = useState(null);
  const [directions, setDirections] = useState(null);
  const [routeSummary, setRouteSummary] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [showAllBays, setShowAllBays] = useState(true);
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastReportAtRef = useRef(0);
  const autocompleteRef = useRef(null);

  const visibleBays = useMemo(
    () => (
      showAllBays
        ? [...parkingBays, ...importedZones]
        : [...parkingBays, ...importedZones].filter((bay) => isBayInBounds(bay, visibleBounds))
    ),
    [importedZones, parkingBays, showAllBays, visibleBounds]
  );

  useEffect(() => {
    fetch('/data/INSPIRE.geojson')
      .then((response) => (response.ok ? response.json() : null))
      .then((geojson) => {
        if (!geojson?.features) return;
        setImportedZones(geojson.features.map(normalizeImportedFeature));
        setSearchMessage(`Imported ${geojson.features.length} council parking zones`);
      })
      .catch(() => {
        setSearchMessage('Council parking file could not be loaded');
      });
  }, []);

  const fitAllBays = useCallback(() => {
    const allBays = [...parkingBays, ...importedZones];
    if (!window.google?.maps || !mapRef.current || allBays.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    allBays.forEach((bay) => {
      (bay.polygons?.flat() || bay.coordinates || [{ lat: bay.lat, lng: bay.lng }]).forEach((point) => {
        bounds.extend(point);
      });
    });
    mapRef.current.fitBounds(bounds, ALL_BAYS_PADDING);
  }, [importedZones, parkingBays]);

  useEffect(() => {
    if (showAllBays && importedZones.length > 0) {
      window.setTimeout(fitAllBays, 150);
    }
  }, [fitAllBays, importedZones.length, showAllBays]);

  const updateVisibleBounds = () => {
    const map = mapRef.current;
    const bounds = map?.getBounds();
    if (!bounds) return;

    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();
    setVisibleBounds({
      north: northEast.lat(),
      east: northEast.lng(),
      south: southWest.lat(),
      west: southWest.lng(),
    });
  };

  const stopFollowing = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  useEffect(() => stopFollowing, []);

  const startLocationWatch = (followRoute = false) => {
    if (!navigator.geolocation) {
      setLocationMessage('Location unavailable');
      return;
    }

    stopFollowing();
    setLocationMessage(followRoute ? 'Starting directions...' : 'Finding you...');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(nextLocation);
        setLocationMessage(`Live · ±${Math.round(position.coords.accuracy)}m`);

        if (mapRef.current) {
          mapRef.current.panTo(nextLocation);
          if (followRoute && mapRef.current.getZoom() < 17) {
            mapRef.current.setZoom(17);
          }
        }
      },
      () => {
        setLocationMessage('Location blocked');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );
  };

  const handleMapLoad = (map) => {
    mapRef.current = map;
    updateVisibleBounds();
    window.setTimeout(fitAllBays, 150);
  };

  const moveMapToPlace = (place) => {
    const location = place?.geometry?.location;
    if (!location || !mapRef.current) {
      setSearchMessage('Choose a place from the search results');
      return;
    }

    const nextCenter = { lat: location.lat(), lng: location.lng() };
    mapRef.current.panTo(nextCenter);
    mapRef.current.setZoom(17);
    setSearchText(place.formatted_address || place.name || '');
    setSearchMessage(`Showing parking near ${place.name || 'selected location'}`);
  };

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    moveMapToPlace(place);
  };

  const handleSearchSubmit = (event) => {
    if (event.key !== 'Enter' || !window.google?.maps || !searchText.trim()) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      {
        address: searchText,
        componentRestrictions: { country: 'GB' },
      },
      (results, status) => {
        if (status !== 'OK' || !results?.[0]) {
          setSearchMessage('No matching place found');
          return;
        }

        moveMapToPlace(results[0]);
      }
    );
  };

  const handleBayClick = (bay) => {
    setSelectedBay(bay);
  };

  const updateBayAvailability = (bayId, status) => {
    const lastUpdated = 'Just now';

    setParkingBays((currentBays) => (
      currentBays.map((bay) => (
        bay.id === bayId
          ? {
              ...bay,
              status,
              confidence: Math.min(5, bay.confidence + 1),
              lastUpdated,
            }
          : bay
      ))
    ));

    setSelectedBay((currentBay) => (
      currentBay?.id === bayId
        ? {
            ...currentBay,
            status,
            confidence: Math.min(5, currentBay.confidence + 1),
            lastUpdated,
          }
        : currentBay
    ));
  };

  const getMapCenterPoint = () => {
    const center = mapRef.current?.getCenter();
    if (!center) return londonCenter;
    return { lat: center.lat(), lng: center.lng() };
  };

  const addReport = (type, bay = selectedBay, target = 'selected-bay') => {
    const nowMs = Date.now();
    if (nowMs - lastReportAtRef.current < REPORT_COOLDOWN_MS) {
      return false;
    }

    const hasBayTarget = target === 'selected-bay' && bay;
    const reportPoint = hasBayTarget
      ? getBayLabelPosition(bay)
      : target === 'user-location' && userLocation
        ? userLocation
        : getMapCenterPoint();
    const report = {
      id: `local_${nowMs}`,
      type,
      label: REPORT_LABELS[type] || 'Parking report',
      lat: reportPoint.lat,
      lng: reportPoint.lng,
      time: 'Just now',
      bayId: hasBayTarget ? bay.id : undefined,
    };

    lastReportAtRef.current = nowMs;
    setReports((currentReports) => {
      const nextReports = [...currentReports, report];
      saveStoredReports(nextReports.filter((item) => item.id.startsWith('local_')));
      return nextReports;
    });

    if ((type === 'free' || type === 'full') && hasBayTarget) {
      updateBayAvailability(bay.id, type === 'free' ? 'free' : 'full');
    }

    return true;
  };

  const handleReportSubmit = (option, target) => {
    return addReport(option.id, selectedBay, target);
  };

  const handleStartSession = ({ bay, durationMinutes, total }) => {
    setActiveSession({
      bay,
      durationMinutes,
      total,
      startedAt: Date.now(),
      endsAt: getSessionEndTime(durationMinutes),
    });
  };

  const handleStartDirections = (bay) => {
    if (!window.google?.maps) return;

    const origin = userLocation || londonCenter;
    const destination = { lat: bay.lat, lng: bay.lng };
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status !== window.google.maps.DirectionsStatus.OK || !result?.routes?.length) {
          setLocationMessage('Route not found');
          return;
        }

        const leg = result.routes[0].legs[0];
        setDirections(result);
        setActiveRouteBay(bay);
        setRouteSummary({
          duration: leg.duration?.text,
          distance: leg.distance?.text,
          destination: bay.name,
        });
        setSelectedBay(null);
        startLocationWatch(true);

        if (result.routes[0].bounds && mapRef.current) {
          mapRef.current.fitBounds(result.routes[0].bounds);
        }
      }
    );
  };

  const handleEndRoute = () => {
    setDirections(null);
    setActiveRouteBay(null);
    setRouteSummary(null);
    setLocationMessage('Route closed');
  };

  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={s.phone}>
      <div style={s.statusBar}>
        <span style={s.statusText}>{now}</span>
        <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 800 }}>{routeSummary ? 'NAV' : 'LIVE'}</span>
      </div>

      <div style={s.mapWrap}>
        {routeSummary ? (
          <div style={s.navHeader}>
            <div style={s.navHeaderRow}>
              <button style={s.navBackBtn} onClick={handleEndRoute} title="Close directions" aria-label="Close directions">
                <X size={26} strokeWidth={2.2} />
              </button>
              <div style={s.navTextWrap}>
                <div style={s.navTitle}>Driving to parking bay</div>
                <div style={s.navSubtitle}>{routeSummary.destination}</div>
                <div style={s.navMeta}>
                  {routeSummary.duration} · {routeSummary.distance}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {hasConfiguredGoogleMapsKey() ? (
          <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={googleMapsLibraries}>
            {!routeSummary && (
              <>
                <div style={s.searchBar}>
                  <Search size={18} color="#64748b" aria-hidden="true" />
                  <Autocomplete
                    onLoad={(autocomplete) => {
                      autocompleteRef.current = autocomplete;
                    }}
                    onPlaceChanged={handlePlaceChanged}
                    options={{
                      componentRestrictions: { country: 'gb' },
                      fields: ['formatted_address', 'geometry', 'name'],
                    }}
                  >
                    <input
                      style={s.searchInput}
                      value={searchText}
                      aria-label="Search street, place, or postcode"
                      placeholder="Search street or postcode"
                      onChange={(event) => setSearchText(event.target.value)}
                      onKeyDown={handleSearchSubmit}
                    />
                  </Autocomplete>
                </div>
                {searchMessage && (
                  <div style={s.searchStatus} role="status" aria-live="polite">
                    {searchMessage}
                  </div>
                )}
              </>
            )}
            <GoogleMap
              center={londonCenter}
              zoom={15}
              mapContainerStyle={{ width: '100%', height: '100%' }}
              options={{
                ...googleMapOptions,
                mapTypeId: directions ? 'hybrid' : 'roadmap',
                tilt: directions ? 45 : 0,
              }}
              onLoad={handleMapLoad}
              onIdle={updateVisibleBounds}
            >
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: false,
                    preserveViewport: true,
                    polylineOptions: {
                      strokeColor: '#1d4ed8',
                      strokeOpacity: 0.92,
                      strokeWeight: 7,
                    },
                  }}
                />
              )}

              {visibleBays.map((bay) => (
                <React.Fragment key={bay.id}>
                  {bay.polygons ? (
                    bay.polygons.map((polygonPath, index) => (
                      <PolygonF
                        key={`${bay.id}_${index}`}
                        paths={polygonPath}
                        options={{
                          fillColor: STATUS_COLORS[bay.status],
                          fillOpacity: activeRouteBay?.id === bay.id ? 0.26 : 0.13,
                          strokeColor: STATUS_COLORS[bay.status],
                          strokeOpacity: 0.82,
                          strokeWeight: activeRouteBay?.id === bay.id ? 4 : 2,
                          clickable: true,
                          zIndex: activeRouteBay?.id === bay.id ? 35 : 18,
                        }}
                        onClick={() => handleBayClick(bay)}
                      />
                    ))
                  ) : (
                    <PolylineF
                      path={bay.coordinates}
                      options={{
                        strokeColor: STATUS_COLORS[bay.status],
                        strokeOpacity: 0.96,
                        strokeWeight: activeRouteBay?.id === bay.id ? 11 : 8,
                        clickable: true,
                        zIndex: activeRouteBay?.id === bay.id ? 40 : 30,
                      }}
                      onClick={() => handleBayClick(bay)}
                    />
                  )}
                  <MarkerF
                    position={getBayLabelPosition(bay)}
                    icon={createPriceLabelIcon(bay)}
                    title={`${bay.streetName || bay.name} · ${bay.restrictions}`}
                    onClick={() => handleBayClick(bay)}
                  />
                </React.Fragment>
              ))}

              {userLocation && (
                <CircleF
                  center={userLocation}
                  radius={28}
                  options={{
                    fillColor: '#60a5fa',
                    fillOpacity: 0.26,
                    strokeColor: '#bfdbfe',
                    strokeOpacity: 0.92,
                    strokeWeight: 2,
                    clickable: false,
                    zIndex: 30,
                  }}
                />
              )}

              {userLocation && (
                <MarkerF
                  position={userLocation}
                  icon={createMarkerIcon('#2563eb', 'YOU')}
                  title="Your location"
                />
              )}

              {reports.map((report) => (
                <MarkerF
                  key={report.id}
                  position={{ lat: report.lat, lng: report.lng }}
                  icon={createMarkerIcon(REPORT_COLORS[report.type] || '#f97316')}
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

        <div style={s.livePill}>
          {locationMessage} · {visibleBays.length} bays in view
        </div>

        <div style={s.mapModeRow} role="group" aria-label="Bay display mode">
          <button
            type="button"
            style={{
              ...s.mapModeBtn,
              background: showAllBays ? '#0f172a' : 'rgba(255,255,255,0.94)',
              color: showAllBays ? '#ffffff' : '#334155',
            }}
            aria-pressed={showAllBays}
            onClick={() => {
              setShowAllBays(true);
              fitAllBays();
            }}
          >
            All bays
          </button>
          <button
            type="button"
            style={{
              ...s.mapModeBtn,
              background: !showAllBays ? '#0f172a' : 'rgba(255,255,255,0.94)',
              color: !showAllBays ? '#ffffff' : '#334155',
            }}
            aria-pressed={!showAllBays}
            onClick={() => setShowAllBays(false)}
          >
            Nearby
          </button>
        </div>

        {activeRouteBay && (
          <div style={s.mapLabelPill}>{activeRouteBay.name}</div>
        )}

        {activeSession && (
          <div style={s.sessionCard} role="status" aria-live="polite">
            <div style={s.sessionRow}>
              <div>
                <div style={s.sessionTitle}>Active parking</div>
                <div style={s.sessionStreet}>{activeSession.bay.streetName || activeSession.bay.name}</div>
                <div style={s.sessionMeta}>
                  Ends {activeSession.endsAt} · £{activeSession.total.toFixed(2)}
                </div>
              </div>
              <button
                type="button"
                style={s.sessionBtn}
                onClick={() => setActiveSession(null)}
                aria-label="End active parking session"
              >
                End
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          style={s.locateBtn}
          onClick={() => startLocationWatch(Boolean(directions))}
          title="Find my location"
          aria-label="Find my location"
        >
          <LocateFixed size={28} strokeWidth={2.2} />
        </button>

        <button
          type="button"
          style={s.reportPill}
          onClick={() => setShowReport(true)}
          title="Report incident"
          aria-label="Report parking update or incident"
        >
          <TriangleAlert size={30} color="#d97706" strokeWidth={2.2} />
          <span>Report</span>
        </button>

        {selectedBay && (
          <BayDetailSheet
            bay={selectedBay}
            onClose={() => setSelectedBay(null)}
            onNavigate={handleStartDirections}
            onBayReport={addReport}
            onBayStatusChange={updateBayAvailability}
            onStartSession={handleStartSession}
          />
        )}

        {showReport && (
          <ReportScreen
            onClose={() => setShowReport(false)}
            onSubmit={handleReportSubmit}
            selectedBay={selectedBay}
            hasUserLocation={Boolean(userLocation)}
          />
        )}
      </div>

      <div style={s.bottomBar}>
        <div style={s.bottomHandle} />
        <div style={s.routeSummary}>
          <div style={s.routeTitle}>
            {routeSummary ? routeSummary.duration : activeSession ? 'Parking active' : 'Find parking'}
          </div>
          <div style={s.routeSub}>
            {routeSummary
              ? `${routeSummary.distance} · ${routeSummary.destination}`
              : activeSession
                ? `${activeSession.bay.streetName || activeSession.bay.name} · ends ${activeSession.endsAt}`
                : 'Search a street or tap a bay to open details.'}
          </div>
        </div>
        <div style={s.bottomRow}>
          <div style={s.bottomInfo}>
            
            <div style={s.timeLabel}>
              {routeSummary && 'Map follows your phone while routing'}
            </div>
          </div>
          {routeSummary && (
            <button type="button" style={s.endRouteBtn} onClick={handleEndRoute}>
              End route
            </button>
          )}
        </div>
      </div>

      <div style={s.tabBar} role="navigation" aria-label="Main">
        <button type="button" style={{ ...s.tabBtn, color: '#1d4ed8' }} aria-current="page">
          <MapPin size={19} strokeWidth={2.3} />
          <span>Map</span>
        </button>
        <button type="button" style={s.tabBtn} onClick={() => setShowReport(true)}>
          <Bell size={19} strokeWidth={2.3} />
          <span>Reports</span>
        </button>
        <button type="button" style={s.tabBtn} onClick={() => setSearchMessage('Saved bays are coming next')}>
          <Car size={19} strokeWidth={2.3} />
          <span>Saved</span>
        </button>
        <button type="button" style={s.tabBtn} onClick={() => setSearchMessage('Account and vehicles are coming next')}>
          <UserRound size={19} strokeWidth={2.3} />
          <span>Account</span>
        </button>
      </div>
    </div>
  );
}
