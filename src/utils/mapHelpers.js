// ─── utils/mapHelpers.js ──────────────────────────────────────────────────────
// Pure functions only — no React, no side-effects.

import { STATUS_COLORS } from '../constants';

// ── Bay label text ──────────────────────────────────────────────────────────
export const getBayLabel = (bay) =>
  /permit/i.test(bay.rawCost || bay.maxStay || '')
    ? 'PERMIT'
    : bay.pricePerHour === 0
    ? 'FREE'
    : `£${bay.pricePerHour.toFixed(2)}/hr`;

// ── Parse £X.XX or "£1.30 per 1/2 hour" → price per hour ──────────────────
export const parsePricePerHour = (cost) => {
  if (!cost || /permit/i.test(cost)) return 0;
  const match = cost.match(/£([\d.]+)/);
  if (!match) return 0;
  const amount = Number(match[1]);
  return /1\/2 hour|half hour/i.test(cost) ? amount * 2 : amount;
};

// ── Session end time string  ────────────────────────────────────────────────
export const getSessionEndTime = (durationMinutes) => {
  const end = new Date(Date.now() + durationMinutes * 60 * 1000);
  return end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

// ── Mid-point of a polyline path for placing price labels ──────────────────
export const getBayLabelPosition = (bay) => {
  if (bay.polygons?.length) return { lat: bay.lat, lng: bay.lng };
  const path = bay.coordinates || [{ lat: bay.lat, lng: bay.lng }];
  return path[Math.floor(path.length / 2)];
};

// ── Is any point of a bay inside the current map bounds? ──────────────────
export const isBayInBounds = (bay, bounds) => {
  if (!bounds) return true;
  const points = bay.coordinates || [{ lat: bay.lat, lng: bay.lng }];
  return points.some(
    (p) =>
      p.lat >= bounds.south &&
      p.lat <= bounds.north &&
      p.lng >= bounds.west &&
      p.lng <= bounds.east
  );
};

// ── SVG marker icons ────────────────────────────────────────────────────────
export const createMarkerIcon = (color, label = '') => {
  const svg = `
    <svg width="58" height="46" viewBox="0 0 58 46" xmlns="http://www.w3.org/2000/svg">
      <filter id="s" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000" flood-opacity="0.42"/>
      </filter>
      <g filter="url(#s)">
        <circle cx="29" cy="20" r="13" fill="${color}" stroke="#f8fafc" stroke-width="3"/>
        <path d="M29 43L21 28H37L29 43Z" fill="${color}" stroke="#f8fafc" stroke-width="3" stroke-linejoin="round"/>
      </g>
      ${label ? `<text x="29" y="23.5" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" font-weight="700" fill="#fff">${label}</text>` : ''}
    </svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}` };
};

export const createPriceLabelIcon = (bay) => {
  const label = getBayLabel(bay);
  const color = STATUS_COLORS[bay.status];
  const width = label.length > 5 ? 78 : 62;
  const svg = `
    <svg width="${width}" height="30" viewBox="0 0 ${width} 30" xmlns="http://www.w3.org/2000/svg">
      <filter id="s" x="-30%" y="-60%" width="160%" height="220%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.35"/>
      </filter>
      <rect x="2" y="3" width="${width - 4}" height="22" rx="11"
        fill="#fff" stroke="${color}" stroke-width="2" filter="url(#s)"/>
      <text x="${width / 2}" y="18" text-anchor="middle" font-size="10"
        font-family="Arial,sans-serif" font-weight="700" fill="#0f172a">${label}</text>
    </svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}` };
};

// ── Normalise a raw GeoJSON feature from INSPIRE council data ──────────────
export const normalizeImportedFeature = (feature) => {
  const props = feature.properties || {};
  const rawPolygons =
    feature.geometry?.type === 'MultiPolygon'
      ? feature.geometry.coordinates
      : [feature.geometry?.coordinates];

  const polygons = rawPolygons
    .filter(Boolean)
    .map((poly) => poly[0].map(([lng, lat]) => ({ lat, lng })));

  const points = polygons.flat();
  const sum    = points.reduce((a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }), { lat: 0, lng: 0 });
  const pricePerHour = parsePricePerHour(props.COST);

  return {
    id:             `inspire_${props.OBJECTID_12}`,
    source:         'INSPIRE',
    streetName:     `Zone ${props.ZONE}`,
    name:           `Zone ${props.ZONE}`,
    lat:            sum.lat / points.length,
    lng:            sum.lng / points.length,
    polygons,
    coordinates:    polygons[0]?.slice(0, 8) || [],
    status:         /permit/i.test(props.COST) ? 'full' : 'paid',
    confidence:     3,
    pricePerHour,
    restrictions:   `${props.DAYS || 'Controlled days'} ${props.TIME_ || ''}`.trim(),
    maxStay:        /permit/i.test(props.COST) ? 'Permit holders only' : 'See local signs',
    paymentMethods: pricePerHour > 0 ? ['PayByPhone', 'Council portal'] : [],
    zone:           props.ZONE || 'Unknown',
    lastUpdated:    'Council data',
    councilLink:    props.HYPERLINK,
    rawCost:        props.COST,
  };
};
