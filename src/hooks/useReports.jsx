// ─── hooks/useReports.js ──────────────────────────────────────────────────────
// Community report state + cooldown logic.

import { useCallback, useRef, useState } from 'react';
import { REPORT_COOLDOWN_MS, REPORT_LABELS } from '../constants';
import { getBayLabelPosition } from '../utils/mapHelpers';
import { getStoredReports, saveStoredReports } from '../utils/storage';

export default function useReports(mapRef, userLocation, onBayStatusChange) {
  const [reports, setReports] = useState(() => getStoredReports());
  const lastReportAtRef = useRef(0);

  const getMapCenter = useCallback(() => {
    const c = mapRef.current?.getCenter();
    return c ? { lat: c.lat(), lng: c.lng() } : { lat: 51.52, lng: -0.06 };
  }, [mapRef]);

  /**
   * Add a report.
   * @param {string}  type        - one of REPORT_LABELS keys
   * @param {object}  bay         - selected bay (optional)
   * @param {string}  target      - 'selected-bay' | 'user-location' | 'map-center'
   * @returns {boolean} false if rate-limited
   */
  const addReport = useCallback(
    (type, bay, target = 'selected-bay') => {
      const now = Date.now();
      if (now - lastReportAtRef.current < REPORT_COOLDOWN_MS) return false;

      const hasBay    = target === 'selected-bay' && bay;
      const hasUser   = target === 'user-location' && userLocation;
      const point     = hasBay
        ? getBayLabelPosition(bay)
        : hasUser
        ? userLocation
        : getMapCenter();

      const report = {
        id:    `local_${now}`,
        type,
        label: REPORT_LABELS[type] || 'Report',
        lat:   point.lat,
        lng:   point.lng,
        time:  'Just now',
        bayId: hasBay ? bay.id : undefined,
      };

      lastReportAtRef.current = now;

      setReports((prev) => {
        const next = [...prev, report];
        saveStoredReports(next.filter((r) => r.id.startsWith('local_')));
        return next;
      });

      // Side-effect: update bay availability for 'free' / 'full' reports
      if ((type === 'free' || type === 'full') && hasBay) {
        onBayStatusChange?.(bay.id, type === 'free' ? 'free' : 'full');
      }

      return true;
    },
    [getMapCenter, onBayStatusChange, userLocation]
  );

  return { reports, addReport };
}
