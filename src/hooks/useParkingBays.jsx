import { useCallback, useEffect, useMemo, useState } from "react";
import { ALL_BAYS_PADDING } from "../constants";
import { fetchNppPlaces, isNppConfigured } from "../services/nppApi";
import {
  deriveLiveBayState,
  isBayInBounds,
} from "../utils/mapHelpers";

export default function useParkingBays(mapRef) {
  const [parkingBays, setParkingBays] = useState([]);
  const [visibleBounds, setVisibleBounds] = useState(null);
  const [showAllBays, setShowAllBays] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadNppPlaces = async () => {
      if (!isNppConfigured()) {
        setParkingBays([]);
        setImportMessage("Add NPP credentials to load live parking bays");
        return;
      }

      setIsLoading(true);
      setImportMessage("Loading NPP parking bays...");

      try {
        const places = await fetchNppPlaces({ signal: controller.signal });
        const livePlaces = places.map(deriveLiveBayState);
        setParkingBays(livePlaces);
        setImportMessage(
          livePlaces.length
            ? `Loaded ${livePlaces.length} live NPP parking bays`
            : "NPP returned no parking bays for this account",
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setParkingBays([]);
        setImportMessage(error.message || "Could not load NPP parking bays");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadNppPlaces();
    return () => controller.abort();
  }, []);

  const allBays = useMemo(
    () => parkingBays.map(deriveLiveBayState),
    [parkingBays],
  );

  const visibleBays = useMemo(() => {
    if (showAllBays) return allBays.slice(0, 800);
    if (!visibleBounds) return [];
    return allBays.filter((bay) => isBayInBounds(bay, visibleBounds)).slice(0, 400);
  }, [allBays, showAllBays, visibleBounds]);

  const fitAllBays = useCallback(() => {
    if (!window.google?.maps || !mapRef.current || allBays.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    allBays.forEach((bay) =>
      (bay.polygons?.flat() || bay.coordinates || [{ lat: bay.lat, lng: bay.lng }]).forEach((point) =>
        bounds.extend(point),
      ),
    );
    mapRef.current.fitBounds(bounds, ALL_BAYS_PADDING);
  }, [allBays, mapRef]);

  const updateVisibleBounds = useCallback(() => {
    const bounds = mapRef.current?.getBounds();
    if (!bounds) return;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    setVisibleBounds({
      north: ne.lat(),
      east: ne.lng(),
      south: sw.lat(),
      west: sw.lng(),
    });
  }, [mapRef]);

  const updateBayStatus = useCallback((bayId, status) => {
    setParkingBays((prev) =>
      prev.map((bay) =>
        bay.id === bayId
          ? {
              ...bay,
              status,
              baseStatus: status,
              confidence: Math.min(5, (bay.confidence || 1) + 1),
              lastUpdated: "Just now",
            }
          : bay,
      ),
    );
  }, []);

  return {
    parkingBays,
    visibleBays,
    allBays,
    showAllBays,
    setShowAllBays,
    importMessage,
    isLoading,
    updateBayStatus,
    fitAllBays,
    updateVisibleBounds,
  };
}
