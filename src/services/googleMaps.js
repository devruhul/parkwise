// ─── services/googleMaps.js ───────────────────────────────────────────────────
// All Google Maps configuration lives here.
// Set REACT_APP_GOOGLE_MAPS_API_KEY in your .env file.

export const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

export const londonCenter = { lat: 51.5194, lng: -0.0617 };

export const googleMapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
  ],
};

export const googleMapsLibraries = ['places'];

export const hasConfiguredGoogleMapsKey = () => Boolean(googleMapsApiKey);
