const DEFAULT_NPP_BASE_URL = "https://staging-api.npp.org.uk/v4/parking";

const nppBaseUrl = (
  process.env.REACT_APP_NPP_API_BASE_URL || DEFAULT_NPP_BASE_URL
).replace(/\/$/, "");

const nppAccessToken = process.env.REACT_APP_NPP_ACCESS_TOKEN || "";
const nppApiKey = process.env.REACT_APP_NPP_API_KEY || "";
const nppOperator = process.env.REACT_APP_NPP_OPERATOR || "";

const textFromMultilingual = (value, fallback = "") => {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const english = value.find((item) => item?.language === "en") || value[0];
    return english?.string || english?.text || english?.value || fallback;
  }
  return value.string || value.text || value.value || fallback;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getId = (value, fallback = "") => {
  if (!value) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return String(value.id || value.identifier || value.value || fallback);
};

const flatten = (value) => (Array.isArray(value) ? value.flat(Infinity) : []);

const pointFromCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates)) return null;
  if (coordinates.length >= 2 && coordinates.every((item) => typeof item === "number")) {
    return { lat: coordinates[1], lng: coordinates[0] };
  }

  const firstPair = flatten(coordinates).reduce((acc, item, index, arr) => {
    if (acc) return acc;
    if (typeof item === "number" && typeof arr[index + 1] === "number") {
      return [item, arr[index + 1]];
    }
    return null;
  }, null);

  return firstPair ? { lat: firstPair[1], lng: firstPair[0] } : null;
};

const geometryPoints = (geometry) => {
  if (!geometry) return [];
  if (geometry.type === "Point") {
    const point = pointFromCoordinates(geometry.coordinates);
    return point ? [point] : [];
  }
  if (geometry.type === "LineString") {
    return (geometry.coordinates || []).map(pointFromCoordinates).filter(Boolean);
  }
  if (geometry.type === "MultiLineString") {
    return (geometry.coordinates || []).flatMap((line) =>
      line.map(pointFromCoordinates).filter(Boolean),
    );
  }
  if (geometry.type === "Polygon") {
    return (geometry.coordinates?.[0] || []).map(pointFromCoordinates).filter(Boolean);
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates || []).flatMap((poly) =>
      (poly?.[0] || []).map(pointFromCoordinates).filter(Boolean),
    );
  }
  return [];
};

const polygonPaths = (geometry) => {
  if (geometry?.type === "Polygon") {
    return [(geometry.coordinates?.[0] || []).map(pointFromCoordinates).filter(Boolean)];
  }
  if (geometry?.type === "MultiPolygon") {
    return (geometry.coordinates || [])
      .map((poly) => (poly?.[0] || []).map(pointFromCoordinates).filter(Boolean))
      .filter((path) => path.length > 0);
  }
  return null;
};

const midpoint = (points) => {
  if (!points.length) return { lat: 51.5194, lng: -0.0617 };
  const total = points.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: total.lat / points.length, lng: total.lng / points.length };
};

const addressFromPlace = (place) => {
  const address = place.streetAddress || place.address || place.placeAddress || {};
  const lines = address.addressLines || address.addressLine || address.lines || [];
  const lineText = Array.isArray(lines)
    ? lines.map((line) => textFromMultilingual(line?.text || line?.value || line)).filter(Boolean)
    : [];

  return [
    ...lineText,
    textFromMultilingual(address.streetName || address.roadName || place.roadName),
    textFromMultilingual(address.town || address.city || address.locality),
  ]
    .filter(Boolean)
    .join(", ");
};

const getGeometry = (place) =>
  place.location?.geometry ||
  place.geometry ||
  place.areaLocation?.geometry ||
  place.pointLocation?.geometry ||
  place.placeLocation?.geometry ||
  place.geoJsonGeometry;

const getRightSpecs = (place) =>
  place.rightSpecifications ||
  place.rightSpecification ||
  place.applicableRightSpecifications ||
  place.rights ||
  [];

const getOpeningTimes = (place) =>
  place.openingTimes ||
  place.operatingTimes ||
  place.operatingTime ||
  place.accessAndEgress?.operatingTimes ||
  [];

const getRate = (place, rightSpecs) => {
  const direct =
    place.rate ||
    place.rates?.[0] ||
    place.rateTables?.[0] ||
    rightSpecs?.[0]?.rate ||
    rightSpecs?.[0]?.rates?.[0] ||
    rightSpecs?.[0]?.rateTables?.[0];
  const amount =
    direct?.amount ||
    direct?.value ||
    direct?.price ||
    direct?.monetaryValue?.amount ||
    direct?.rateLines?.[0]?.amount?.amount ||
    direct?.rateLines?.[0]?.price?.amount;
  return toNumber(amount) || 0;
};

const getMaxStay = (rightSpecs) => {
  const duration =
    rightSpecs?.[0]?.maximumDuration ||
    rightSpecs?.[0]?.maxDuration ||
    rightSpecs?.[0]?.validity?.duration ||
    rightSpecs?.[0]?.rightPool?.relativeValidity?.duration;

  if (!duration) return "See local signs";
  if (typeof duration === "string") {
    const hours = duration.match(/T?(\d+)H/);
    const minutes = duration.match(/(\d+)M/);
    return [hours ? `${hours[1]}h` : "", minutes ? `${minutes[1]}m` : ""]
      .filter(Boolean)
      .join(" ") || duration;
  }
  return textFromMultilingual(duration, "See local signs");
};

const getRestrictionText = (place, rightSpecs, openingTimes) => {
  const candidates = [
    place.restrictions,
    place.operatingRestrictions,
    place.operatingRestriction,
    rightSpecs?.[0]?.eligibility,
    rightSpecs?.[0]?.validity,
    openingTimes?.[0],
  ];

  return (
    candidates
      .map((candidate) => {
        if (!candidate) return "";
        if (typeof candidate === "string") return candidate;
        if (candidate.description) return textFromMultilingual(candidate.description);
        if (candidate.name) return textFromMultilingual(candidate.name);
        if (candidate.timesOfDay?.[0]) {
          const time = candidate.timesOfDay[0];
          return `${time.startTime || time.from || "00:00"}-${time.endTime || time.to || "23:59"}`;
        }
        return "";
      })
      .find(Boolean) || "Check local signs"
  );
};

const getStatus = (place, pricePerHour, openingTimes) => {
  const occupancy =
    place.occupancy?.occupancyLevel ||
    place.occupancy?.status ||
    place.supply?.occupancyLevel ||
    place.availability;
  const occupancyText = String(textFromMultilingual(occupancy)).toLowerCase();

  if (/full|unavailable|closed|no[_ -]?spaces/.test(occupancyText)) return "full";
  if (pricePerHour > 0) return "paid";
  return openingTimes?.length ? "free" : "unknown";
};

export const normalizeNppPlace = (place) => {
  const geometry = getGeometry(place);
  const points = geometryPoints(geometry);
  const center = midpoint(points);
  const rightSpecs = getRightSpecs(place);
  const openingTimes = getOpeningTimes(place);
  const pricePerHour = getRate(place, rightSpecs);
  const address = addressFromPlace(place);
  const name =
    textFromMultilingual(place.name) ||
    textFromMultilingual(place.description) ||
    address ||
    `NPP place ${getId(place.id, "unknown")}`;

  return {
    id: `npp_${getId(place.id || place.identifier || place.placeId, crypto.randomUUID?.() || Date.now())}`,
    nppId: getId(place.id || place.identifier || place.placeId),
    source: "npp",
    sourceName: "National Parking Platform",
    streetName: address || name,
    name,
    lat: center.lat,
    lng: center.lng,
    coordinates: points.length ? points : [center],
    polygons: polygonPaths(geometry),
    status: getStatus(place, pricePerHour, openingTimes),
    baseStatus: getStatus(place, pricePerHour, openingTimes),
    confidence: 5,
    pricePerHour,
    restrictions: getRestrictionText(place, rightSpecs, openingTimes),
    maxStay: getMaxStay(rightSpecs),
    paymentMethods: pricePerHour > 0 ? ["NPP", "Card", "Google Pay"] : [],
    zone: textFromMultilingual(place.zone || place.operator || place.operatorId, "NPP"),
    lastUpdated: "NPP live",
    locationId: getId(place.id || place.identifier || place.placeId),
    openingTimes,
    rightSpecifications: rightSpecs,
    rawNpp: place,
  };
};

export const isNppConfigured = () => Boolean(nppAccessToken || nppApiKey);

export const fetchNppPlaces = async ({ signal, pageSize = 200 } = {}) => {
  if (!isNppConfigured()) {
    throw new Error("NPP credentials are missing. Add REACT_APP_NPP_ACCESS_TOKEN or REACT_APP_NPP_API_KEY.");
  }

  const params = new URLSearchParams({
    expand: "all,rightSpecifications,occupancy,openingTimes,streetAddress",
    pageSize: String(pageSize),
  });

  if (nppOperator) params.set("operator", nppOperator);

  const response = await fetch(`${nppBaseUrl}/places?${params.toString()}`, {
    signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(nppAccessToken ? { Authorization: `Bearer ${nppAccessToken}` } : {}),
      ...(nppApiKey ? { "x-api-key": nppApiKey } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`NPP places request failed with ${response.status}`);
  }

  const payload = await response.json();
  const records = payload.data || payload.places || payload.items || payload;
  return (Array.isArray(records) ? records : []).map(normalizeNppPlace);
};
