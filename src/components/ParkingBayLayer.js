import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { LINE_TYPE_CONFIG } from '../data/parkingData';

// ─────────────────────────────────────────────────────────────────────────────
// Coordinate helpers
// ─────────────────────────────────────────────────────────────────────────────

// Metres per degree (approximate for London latitude)
const LAT_DEG_PER_METER = 1 / 111320;
const LNG_DEG_PER_METER = 1 / (111320 * Math.cos(51.52 * Math.PI / 180));

// Move a point by dx metres east, dy metres north
function offsetPoint([lat, lng], dx, dy) {
  return [lat + dy * LAT_DEG_PER_METER, lng + dx * LNG_DEG_PER_METER];
}

// Rotate a 2D vector [x,y] by angle degrees clockwise
function rotate([x, y], angleDeg) {
  const r = (angleDeg * Math.PI) / 180;
  return [
    x * Math.cos(r) - y * Math.sin(r),
    x * Math.sin(r) + y * Math.cos(r),
  ];
}

// Build the 4 corners of a bay rectangle
// bearing = direction the road runs (degrees clockwise from North)
// width   = size along the road  (metres)
// depth   = size perpendicular   (metres, into the kerb)
function bayCorners(center, bearing, width = 10, depth = 4) {
  // Half sizes in road-axis coordinates
  const hw = width / 2;   // half-width along road
  const hd = depth / 2;   // half-depth across road

  // 4 corners in local [along, across] space
  const local = [
    [-hw, -hd],  // back-left
    [ hw, -hd],  // back-right
    [ hw,  hd],  // front-right
    [-hw,  hd],  // front-left
  ];

  // Rotate each corner by the road bearing, then translate to world coords
  return local.map(([a, b]) => {
    const [rx, ry] = rotate([a, b], bearing);
    return offsetPoint(center, rx, ry);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon builders
// ─────────────────────────────────────────────────────────────────────────────

function buildCheckIcon(color) {
  return L.divIcon({
    className: '',
    iconAnchor: [14, 14],
    html: `
      <div style="
        width:28px;height:28px;
        border-radius:50%;
        background:${color};
        border:2px solid #fff;
        display:flex;align-items:center;justify-content:center;
        font-size:15px;color:#fff;font-weight:900;
        box-shadow:0 2px 8px rgba(0,0,0,0.45);
        line-height:1;
      ">✓</div>
    `,
  });
}

function buildCrossIcon() {
  return L.divIcon({
    className: '',
    iconAnchor: [14, 14],
    html: `
      <div style="
        width:28px;height:28px;
        border-radius:50%;
        background:#ef4444;
        border:2px solid #fff;
        display:flex;align-items:center;justify-content:center;
        font-size:14px;color:#fff;font-weight:900;
        box-shadow:0 2px 8px rgba(0,0,0,0.45);
        line-height:1;
      ">✕</div>
    `,
  });
}

function buildQuestionIcon() {
  return L.divIcon({
    className: '',
    iconAnchor: [14, 14],
    html: `
      <div style="
        width:28px;height:28px;
        border-radius:50%;
        background:#6b7280;
        border:2px solid #fff;
        display:flex;align-items:center;justify-content:center;
        font-size:14px;color:#fff;font-weight:900;
        box-shadow:0 2px 8px rgba(0,0,0,0.45);
        line-height:1;
      ">?</div>
    `,
  });
}

function buildPriceIcon(bay) {
  const ltc = LINE_TYPE_CONFIG[bay.lineType];
  const price = bay.pricePerHour === 0
    ? (bay.lineType === 'double_yellow' ? 'No parking' : 'FREE')
    : `£ ${bay.pricePerHour.toFixed(2)}`;

  const bg = bay.lineType === 'double_yellow'
    ? '#dc2626'
    : bay.lineType === 'single_yellow'
    ? '#ca8a04'
    : '#1d4ed8';

  return L.divIcon({
    className: '',
    iconAnchor: [0, 28],
    html: `
      <div style="
        display:inline-flex;
        align-items:center;
        background:${bg};
        color:#fff;
        font-family:'DM Sans',sans-serif;
        font-size:11px;
        font-weight:700;
        padding:4px 10px;
        border-radius:20px;
        white-space:nowrap;
        box-shadow:0 2px 10px rgba(0,0,0,0.5);
        pointer-events:none;
        border:1.5px solid rgba(255,255,255,0.25);
      ">${price}</div>
    `,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ParkingBayLayer({ bays, onBayClick }) {
  const map = useMap();
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
    } else {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    bays.forEach(bay => {
      const ltc = LINE_TYPE_CONFIG[bay.lineType];
      const corners = bayCorners(bay.center, bay.bearing, 10, 4);

      // ── 1. Bay rectangle polygon ────────────────────────────────────────
      const poly = L.polygon(corners, {
        color: ltc.stroke,
        fillColor: ltc.fill,
        fillOpacity: 1,
        weight: 2.5,
        opacity: 1,
      });

      // ── 2. Status icon (✓ / ✕ / ?) in centre ───────────────────────────
      let statusIcon;
      if (bay.status === 'free') {
        const col = bay.lineType === 'free' ? '#16a34a'
          : bay.lineType === 'single_yellow' ? '#ca8a04'
          : '#1d4ed8';
        statusIcon = buildCheckIcon(col);
      } else if (bay.status === 'full') {
        statusIcon = buildCrossIcon();
      } else {
        statusIcon = buildQuestionIcon();
      }

      const statusMarker = L.marker(bay.center, {
        icon: statusIcon,
        zIndexOffset: 500,
        interactive: true,
      });

      // ── 3. Price bubble above the bay ───────────────────────────────────
      // Offset it slightly north (above the bay)
      const pricePos = offsetPoint(bay.center, 0, 7);
      const priceMarker = L.marker(pricePos, {
        icon: buildPriceIcon(bay),
        zIndexOffset: 600,
        interactive: true,
      });

      // ── Click handlers ─────────────────────────────────────────────────
      const onClick = () => onBayClick(bay);
      poly.on('click', onClick);
      statusMarker.on('click', onClick);
      priceMarker.on('click', onClick);

      // Hover
      poly.on('mouseover', () => poly.setStyle({ weight: 4, fillOpacity: 1 }));
      poly.on('mouseout',  () => poly.setStyle({ weight: 2.5, fillOpacity: 1 }));

      // ── Add all layers ─────────────────────────────────────────────────
      layerGroupRef.current.addLayer(poly);
      layerGroupRef.current.addLayer(statusMarker);
      layerGroupRef.current.addLayer(priceMarker);
    });

    return () => layerGroupRef.current?.clearLayers();
  }, [bays, map, onBayClick]);

  return null;
}
