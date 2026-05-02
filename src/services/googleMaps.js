export const googleMapsApiKey =
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY';

export const googleMapsLibraries = ['places'];

export const londonCenter = {
  lat: 51.521,
  lng: -0.048,
};

export const googleMapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#17202c' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#d7dee8' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#10151d' }] },
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#263243' }],
    },
    {
      featureType: 'road.arterial',
      elementType: 'geometry',
      stylers: [{ color: '#314156' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#3c4f67' }],
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#243044' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#0f2a3f' }],
    },
  ],
};

export function hasConfiguredGoogleMapsKey() {
  return Boolean(googleMapsApiKey && googleMapsApiKey !== 'YOUR_API_KEY');
}
