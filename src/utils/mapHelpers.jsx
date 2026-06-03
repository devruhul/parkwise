// ─── utils/mapHelpers.js ──────────────────────────────────────────────────────
// Pure functions only — no React, no side-effects.

import { STATUS_COLORS } from '../constants';

// ── Bay label text ──────────────────────────────────────────────────────────
export const getBayLabel = (bay) =>
  bay.liveState === 'blocked'
    ? 'BLOCK'
    : /permit/i.test(bay.rawCost || bay.maxStay || '')
    ? 'PERMIT'
    : bay.pricePerHour === 0
    ? 'FREE'
    : `£${bay.pricePerHour.toFixed(2)}/hr`;

const dayName = (date) =>
  date.toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase();

const timeToMinutes = (time) => {
  if (!time || typeof time !== 'string') return null;
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const normaliseDay = (day) => String(day || '').toLowerCase().slice(0, 3);

const periodAppliesToday = (period, date) => {
  const today = normaliseDay(dayName(date));
  const rawDays =
    period.daysOfWeek ||
    period.dayOfWeek ||
    period.days ||
    period.applicableDays ||
    period.dayWeekMonth?.daysOfWeek ||
    [];

  if (!rawDays || (Array.isArray(rawDays) && rawDays.length === 0)) return true;

  const days = (Array.isArray(rawDays) ? rawDays : [rawDays]).map(normaliseDay);
  return days.some((day) => today.startsWith(day) || day.startsWith(today));
};

const periodTimes = (period) => {
  const source =
    period.timesOfDay?.[0] ||
    period.timePeriodOfDay ||
    period.periodOfDay ||
    period.operatingTime ||
    period;

  return {
    start:
      source.startTime ||
      source.start ||
      source.from ||
      source.openTime ||
      source.entranceOpenTime?.startTime ||
      '00:00',
    end:
      source.endTime ||
      source.end ||
      source.to ||
      source.closeTime ||
      source.exitOpenTime?.endTime ||
      '23:59',
  };
};

const getStructuredPeriods = (bay) => {
  const openingTimes = Array.isArray(bay.openingTimes)
    ? bay.openingTimes
    : bay.openingTimes
    ? [bay.openingTimes]
    : [];
  const rightPeriods = (bay.rightSpecifications || []).flatMap((right) =>
    [
      right.validity?.periods,
      right.validity?.period,
      right.periods,
      right.period,
      right.operatingTimes,
      right.openingTimes,
    ].filter(Boolean),
  );

  return [...openingTimes, ...rightPeriods].flat(Infinity).filter(Boolean);
};

const isStructuredOpenNow = (bay, date) => {
  const periods = getStructuredPeriods(bay);
  if (!periods.length) return null;

  const now = date.getHours() * 60 + date.getMinutes();
  return periods.some((period) => {
    if (!periodAppliesToday(period, date)) return false;
    const { start, end } = periodTimes(period);
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    if (startMinutes == null || endMinutes == null) return false;
    return startMinutes <= endMinutes
      ? now >= startMinutes && now <= endMinutes
      : now >= startMinutes || now <= endMinutes;
  });
};

const isRestrictionTextOpenNow = (text, date) => {
  const restriction = String(text || '');
  const match = restriction.match(/(\d{1,2}:?\d{2})\s*[–-]\s*(\d{1,2}:?\d{2})/);
  if (!match) return null;
  const start = timeToMinutes(match[1].includes(':') ? match[1] : `${match[1].slice(0, -2)}:${match[1].slice(-2)}`);
  const end = timeToMinutes(match[2].includes(':') ? match[2] : `${match[2].slice(0, -2)}:${match[2].slice(-2)}`);
  const now = date.getHours() * 60 + date.getMinutes();
  if (start == null || end == null) return null;
  return start <= end ? now >= start && now <= end : now >= start || now <= end;
};

export const isBayOpenNow = (bay, date = new Date()) => {
  const structured = isStructuredOpenNow(bay, date);
  if (structured !== null) return structured;
  const textResult = isRestrictionTextOpenNow(bay.restrictions, date);
  if (textResult !== null) return textResult;
  return bay.status !== 'full';
};

export const deriveLiveBayState = (bay, date = new Date()) => {
  const openNow = isBayOpenNow(bay, date);
  const liveState = bay.status === 'full' || !openNow ? 'blocked' : 'available';
  return {
    ...bay,
    isOpenNow: openNow,
    liveState,
    status: liveState === 'blocked' ? 'full' : bay.baseStatus || bay.status,
  };
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

export const createAppyBayMarkerIcon = (bay, zoom = 15) => {
  const blocked = bay.liveState === 'blocked' || bay.status === 'full';
  const size = zoom >= 17 ? 58 : 42;
  const radius = size / 2 - 4;
  const color = blocked ? '#8f8f8f' : '#008d0a';
  const symbol = blocked
    ? `<path d="M17 ${size - 17}L${size - 17} 17M${size - 17} ${size - 17}L17 17" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`
    : `<path d="M14 ${size / 2 + 2}l8 8 17-20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const svg = `
    <svg width="${size}" height="${size + 10}" viewBox="0 0 ${size} ${size + 10}" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.28"/>
      </filter>
      <g filter="url(#shadow)">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="${color}" stroke="#fff" stroke-width="3"/>
        ${symbol}
      </g>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: window.google?.maps ? new window.google.maps.Size(size, size + 10) : undefined,
    anchor: window.google?.maps ? new window.google.maps.Point(size / 2, size / 2) : undefined,
  };
};
