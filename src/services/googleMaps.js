export const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

export const londonCenter = {
  lat: 51.5074,
  lng: -0.1278,
};

export const googleMapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
};

export const googleMapsLibraries = ["places"];

export const hasConfiguredGoogleMapsKey = () => {
  return !!googleMapsApiKey;
};
