// ─── hooks/useDirections.js ───────────────────────────────────────────────────
// Wraps Google Maps DirectionsService.
// Returns { directions, routeSummary, activeRouteBay, startDirections, endRoute }

import { useCallback, useState } from 'react';
import { londonCenter } from '../services/googleMaps';

export default function useDirections(mapRef, userLocation, onRouteStart) {
  const [directions,     setDirections]     = useState(null);
  const [routeSummary,   setRouteSummary]   = useState(null);
  const [activeRouteBay, setActiveRouteBay] = useState(null);

  const startDirections = useCallback(
    (bay) => {
      if (!window.google?.maps) return;

      const origin      = userLocation || londonCenter;
      const destination = { lat: bay.lat, lng: bay.lng };
      const service     = new window.google.maps.DirectionsService();

      service.route(
        { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status !== window.google.maps.DirectionsStatus.OK || !result?.routes?.length) return;

          const leg = result.routes[0].legs[0];
          setDirections(result);
          setActiveRouteBay(bay);
          setRouteSummary({
            duration:    leg.duration?.text,
            distance:    leg.distance?.text,
            destination: bay.name,
          });

          if (result.routes[0].bounds && mapRef.current) {
            mapRef.current.fitBounds(result.routes[0].bounds);
          }

          onRouteStart?.();
        }
      );
    },
    [mapRef, onRouteStart, userLocation]
  );

  const endRoute = useCallback(() => {
    setDirections(null);
    setActiveRouteBay(null);
    setRouteSummary(null);
  }, []);

  return { directions, routeSummary, activeRouteBay, startDirections, endRoute };
}
