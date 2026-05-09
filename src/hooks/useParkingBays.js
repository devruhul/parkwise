// ─── hooks/useParkingBays.js ──────────────────────────────────────────────────
// Bay state management: seed data + INSPIRE council import + viewport filter.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ALL_BAYS_PADDING } from '../constants';
import { PARKING_BAYS } from '../data/parkingData';
import { isBayInBounds, normalizeImportedFeature } from '../utils/mapHelpers';

export default function useParkingBays(mapRef) {
  const [parkingBays,    setParkingBays]    = useState(PARKING_BAYS);
  const [importedZones,  setImportedZones]  = useState([]);
  const [visibleBounds,  setVisibleBounds]  = useState(null);
  const [showAllBays,    setShowAllBays]    = useState(true);
  const [importMessage,  setImportMessage]  = useState('');

  // Try to load optional INSPIRE GeoJSON placed at /public/data/INSPIRE.geojson
  useEffect(() => {
    fetch('/data/INSPIRE.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((geojson) => {
        if (!geojson?.features) return;
        setImportedZones(geojson.features.map(normalizeImportedFeature));
        setImportMessage(`Loaded ${geojson.features.length} council zones`);
      })
      .catch(() => setImportMessage(''));
  }, []);

  const allBays = useMemo(
    () => [...parkingBays, ...importedZones],
    [parkingBays, importedZones]
  );

  const visibleBays = useMemo(
    () => (showAllBays ? allBays : allBays.filter((b) => isBayInBounds(b, visibleBounds))),
    [allBays, showAllBays, visibleBounds]
  );

  // Fit map to show all bays
  const fitAllBays = useCallback(() => {
    if (!window.google?.maps || !mapRef.current || allBays.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    allBays.forEach((bay) =>
      (bay.polygons?.flat() || bay.coordinates || [{ lat: bay.lat, lng: bay.lng }]).forEach((p) =>
        bounds.extend(p)
      )
    );
    mapRef.current.fitBounds(bounds, ALL_BAYS_PADDING);
  }, [allBays, mapRef]);

  useEffect(() => {
    if (showAllBays && importedZones.length > 0) {
      window.setTimeout(fitAllBays, 150);
    }
  }, [fitAllBays, importedZones.length, showAllBays]);

  // Called by map's onIdle event
  const updateVisibleBounds = useCallback(() => {
    const bounds = mapRef.current?.getBounds();
    if (!bounds) return;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    setVisibleBounds({ north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() });
  }, [mapRef]);

  // Update a single bay's status (from a community report)
  const updateBayStatus = useCallback((bayId, status) => {
    const patch = { status, confidence: undefined, lastUpdated: 'Just now' };

    setParkingBays((prev) =>
      prev.map((b) =>
        b.id === bayId
          ? { ...b, ...patch, confidence: Math.min(5, b.confidence + 1) }
          : b
      )
    );
  }, []);

  return {
    parkingBays,
    visibleBays,
    allBays,
    showAllBays,
    setShowAllBays,
    importMessage,
    updateBayStatus,
    fitAllBays,
    updateVisibleBounds,
  };
}
