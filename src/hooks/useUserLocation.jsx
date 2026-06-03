// ─── hooks/useUserLocation.js ─────────────────────────────────────────────────
// Encapsulates navigator.geolocation.watchPosition lifecycle.
// Returns { userLocation, locationMessage, startWatch, stopWatch }

import { useCallback, useEffect, useRef, useState } from 'react';

export default function useUserLocation(mapRef) {
  const [userLocation, setUserLocation]     = useState(null);
  const [locationMessage, setLocationMessage] = useState('Tap locate to follow');
  const watchIdRef = useRef(null);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => stopWatch, [stopWatch]);

  const startWatch = useCallback(
    (followRoute = false) => {
      if (!navigator.geolocation) {
        setLocationMessage('Location unavailable');
        return;
      }

      stopWatch();
      setLocationMessage(followRoute ? 'Starting directions…' : 'Finding you…');

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(next);
          setLocationMessage(`Live · ±${Math.round(pos.coords.accuracy)}m`);

          if (mapRef.current) {
            mapRef.current.panTo(next);
            if (followRoute && mapRef.current.getZoom() < 17) {
              mapRef.current.setZoom(17);
            }
          }
        },
        () => setLocationMessage('Location blocked'),
        { enableHighAccuracy: true, maximumAge: 3_000, timeout: 10_000 }
      );
    },
    [mapRef, stopWatch]
  );

  return { userLocation, locationMessage, startWatch, stopWatch };
}
