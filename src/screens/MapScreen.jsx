import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CircleF,
  DirectionsRenderer,
  GoogleMap,
  LoadScript,
  MarkerF,
  PolygonF,
  PolylineF,
} from "@react-google-maps/api";
import {
  ChevronDown,
  ChevronRight,
  Compass,
  Crosshair,
  ListFilter,
  MapPin,
  Menu,
  Navigation,
  ParkingSquare,
  Search,
  Settings2,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  googleMapOptions,
  googleMapsApiKey,
  googleMapsLibraries,
  hasConfiguredGoogleMapsKey,
  londonCenter,
} from "../services/googleMaps";

import { REPORT_COLORS, STATUS_COLORS } from "../constants";
import {
  createMarkerIcon,
  createAppyBayMarkerIcon,
  createPriceLabelIcon,
  getBayLabelPosition,
  getSessionEndTime,
} from "../utils/mapHelpers";
import {
  getStoredRecentBays,
  getStoredSavedBays,
  getStoredSession,
  saveStoredRecentBays,
  saveStoredSavedBays,
  saveStoredSession,
} from "../utils/storage";

import useDirections from "../hooks/useDirections";
import useParkingBays from "../hooks/useParkingBays";
import useReports from "../hooks/useReports";
import useUserLocation from "../hooks/useUserLocation";

import BayDetailSheet from "../components/BayDetailSheet";
import MapFallback from "../components/MapFallback";
import ReportScreen from "../components/ReportScreen";
import SearchBar from "../components/SearchBar";
import SessionCard from "../components/SessionCard";

const blue = "#2946d8";

const getBayStatusLabel = (bay) => {
  if (bay.pricePerHour === 0 || bay.status === "free") return "Park for free";
  if (bay.status === "full") return "No parking";
  return "Pay to park";
};

const getBayType = (bay) => {
  if (/resident|permit/i.test(`${bay.restrictions} ${bay.maxStay} ${bay.rawCost || ""}`)) {
    return "Resident bay";
  }
  if (/red route/i.test(`${bay.streetName} ${bay.restrictions}`)) return "Red route bay";
  if (bay.pricePerHour === 0) return "Single yellow line";
  return "Paid parking bay";
};

const getNotice = (bay) => {
  if (bay.pricePerHour > 0) return `Paid controls ${bay.restrictions}`;
  const match = bay.restrictions?.match(/(?:after|until)\s+([\d:]+)/i);
  return match ? `No parking after ${match[1]} tomorrow` : "No parking after 08:30 tomorrow";
};

export default function MapScreen() {
  const mapRef = useRef(null);

  const bays = useParkingBays(mapRef);
  const loc = useUserLocation(mapRef);
  const nav = useDirections(mapRef, loc.userLocation, () => loc.startWatch(true));
  const { reports, addReport } = useReports(
    mapRef,
    loc.userLocation,
    bays.updateBayStatus,
  );

  const [selectedBay, setSelectedBay] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [activeSession, setActiveSession] = useState(() => getStoredSession());
  const [statusMessage, setStatusMessage] = useState("");
  const [viewMode, setViewMode] = useState("Bay view");
  const [panelMode, setPanelMode] = useState("actions");
  const [savedBays, setSavedBays] = useState(() => getStoredSavedBays());
  const [, setRecentBays] = useState(() => getStoredRecentBays());
  const [zoomLevel, setZoomLevel] = useState(15);

  useEffect(() => {
    saveStoredSession(activeSession);
  }, [activeSession]);

  const handleMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      setZoomLevel(map.getZoom() || 15);
      bays.updateVisibleBounds();
    },
    [bays],
  );

  const handlePlaceSelected = useCallback(
    (place) => {
      const location = place?.geometry?.location;
      if (!location || !mapRef.current) return;
      bays.setShowAllBays(false);
      setPanelMode("actions");
      mapRef.current.panTo({ lat: location.lat(), lng: location.lng() });
      mapRef.current.setZoom(16);
      window.setTimeout(() => bays.updateVisibleBounds(), 150);
    },
    [bays],
  );

  const handleStartSession = useCallback(({ bay, durationMinutes, total }) => {
    setActiveSession({
      bay,
      durationMinutes,
      total,
      startedAt: Date.now(),
      endsAtMs: Date.now() + durationMinutes * 60 * 1000,
      endsAt: getSessionEndTime(durationMinutes),
    });
    setPanelMode("actions");
  }, []);

  const pushRecentBay = useCallback((bay) => {
    setRecentBays((prev) => {
      const next = [
        {
          id: bay.id,
          streetName: bay.streetName || bay.name,
          pricePerHour: bay.pricePerHour,
          status: bay.status,
          zone: bay.zone,
        },
        ...prev.filter((item) => item.id !== bay.id),
      ].slice(0, 10);
      saveStoredRecentBays(next);
      return next;
    });
  }, []);

  const toggleSavedBay = useCallback((bay) => {
    setSavedBays((prev) => {
      const exists = prev.some((item) => item.id === bay.id);
      const next = exists
        ? prev.filter((item) => item.id !== bay.id)
        : [
            {
              id: bay.id,
              streetName: bay.streetName || bay.name,
              pricePerHour: bay.pricePerHour,
              status: bay.status,
              zone: bay.zone,
            },
            ...prev,
          ].slice(0, 20);
      saveStoredSavedBays(next);
      return next;
    });
  }, []);

  const handleReportSubmit = useCallback(
    (option, target) => addReport(option.id, selectedBay, target),
    [addReport, selectedBay],
  );

  const shownBays = useMemo(
    () => (bays.visibleBays.length ? bays.visibleBays : bays.allBays).slice(0, 12),
    [bays.allBays, bays.visibleBays],
  );

  const now = new Date();
  const nowLabel = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  const openBay = (bay) => {
    setSelectedBay(bay);
    setPanelMode("actions");
    pushRecentBay(bay);
  };

  return (
    <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[38px] border border-black/10 bg-white font-sans text-[#12092f] shadow-[0_30px_70px_rgba(15,23,42,0.18)]">
      <div className="flex h-[34px] shrink-0 items-center justify-between bg-black px-5 text-white">
        <span className="text-[15px] font-bold">{nowLabel}</span>
        <span className="text-[13px] font-bold tracking-wide">LTE WIFI 76%</span>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col bg-white">
        <div className="absolute left-0 right-0 top-0 z-30 bg-[#f6f6fb]/95 px-3.5 pb-3 pt-3 shadow-[0_2px_12px_rgba(18,9,47,0.08)] backdrop-blur">
          <div className="mb-2 grid grid-cols-[1fr_0.96fr] gap-2">
            <button
              type="button"
              className="flex min-h-[52px] items-center gap-2 rounded-md border border-[#e2e3ef] bg-white px-3 text-left text-[16px] font-bold shadow-sm"
              onClick={() => setPanelMode("search")}
            >
              <Search size={24} color={blue} strokeWidth={3} />
              <span className="truncate">Search destination</span>
            </button>
            <button
              type="button"
              className="flex min-h-[52px] items-center justify-center rounded-md border border-[#e2e3ef] bg-white px-3 text-[15px] font-bold shadow-sm"
            >
              {nowLabel}<span className="px-1.5 text-[#9aa0bd]">→</span>1h <span className="pl-1 text-[#9aa0bd]">{dateLabel}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 rounded-md border border-[#e5e6f1] bg-white p-0.5 text-[15px] font-bold">
            {["Zone view", "Bay view", "List view"].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`min-h-[43px] rounded-md transition ${
                  viewMode === mode ? "bg-[#969de9] text-white" : "text-[#12092f]"
                }`}
                onClick={() => {
                  setViewMode(mode);
                  setPanelMode(mode === "List view" ? "list" : "actions");
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#ece9e4]">
          {hasConfiguredGoogleMapsKey() ? (
            <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={googleMapsLibraries}>
              <SearchBar
                className="hidden"
                onPlaceSelected={handlePlaceSelected}
                onMessage={setStatusMessage}
              />
              <GoogleMap
                center={londonCenter}
                zoom={15}
                mapContainerStyle={{ width: "100%", height: "100%" }}
                options={{
                  ...googleMapOptions,
                  mapTypeId: nav.directions ? "hybrid" : "roadmap",
                  tilt: nav.directions ? 45 : 0,
                }}
                onLoad={handleMapLoad}
                onIdle={bays.updateVisibleBounds}
                onZoomChanged={() => {
                  const zoom = mapRef.current?.getZoom();
                  if (zoom) setZoomLevel(zoom);
                }}
              >
                {nav.directions && (
                  <DirectionsRenderer
                    directions={nav.directions}
                    options={{
                      suppressMarkers: false,
                      preserveViewport: true,
                      polylineOptions: {
                        strokeColor: blue,
                        strokeOpacity: 0.92,
                        strokeWeight: 7,
                      },
                    }}
                  />
                )}

                {bays.visibleBays.map((bay) => (
                  <React.Fragment key={bay.id}>
                    {zoomLevel >= 16 && (
                      bay.polygons?.length ? (
                        bay.polygons.map((path, i) => (
                          <PolygonF
                            key={`${bay.id}_${i}`}
                            paths={path}
                            options={{
                              fillColor: STATUS_COLORS[bay.status] || "#8f8f8f",
                              fillOpacity: bay.liveState === "blocked" ? 0.16 : 0.22,
                              strokeColor: STATUS_COLORS[bay.status] || "#8f8f8f",
                              strokeOpacity: 0.9,
                              strokeWeight: nav.activeRouteBay?.id === bay.id ? 4 : 2,
                              clickable: true,
                              zIndex: nav.activeRouteBay?.id === bay.id ? 35 : 18,
                            }}
                            onClick={() => openBay(bay)}
                          />
                        ))
                      ) : (
                        <PolylineF
                          path={bay.coordinates}
                          options={{
                            strokeColor: STATUS_COLORS[bay.status] || "#8f8f8f",
                            strokeOpacity: 0.96,
                            strokeWeight: nav.activeRouteBay?.id === bay.id ? 11 : 8,
                            clickable: true,
                            zIndex: nav.activeRouteBay?.id === bay.id ? 40 : 30,
                          }}
                          onClick={() => openBay(bay)}
                        />
                      )
                    )}
                    <MarkerF
                      position={getBayLabelPosition(bay)}
                      icon={
                        zoomLevel >= 15
                          ? createAppyBayMarkerIcon(bay, zoomLevel)
                          : createPriceLabelIcon(bay)
                      }
                      title={`${bay.streetName || bay.name} · ${bay.restrictions}`}
                      onClick={() => openBay(bay)}
                    />
                  </React.Fragment>
                ))}

                {loc.userLocation && (
                  <>
                    <CircleF
                      center={loc.userLocation}
                      radius={28}
                      options={{
                        fillColor: "#3155dd",
                        fillOpacity: 0.2,
                        strokeColor: "#ffffff",
                        strokeOpacity: 0.95,
                        strokeWeight: 3,
                        clickable: false,
                        zIndex: 30,
                      }}
                    />
                    <MarkerF
                      position={loc.userLocation}
                      icon={createMarkerIcon("#3155dd", "")}
                      title="Your location"
                    />
                  </>
                )}

                {reports.map((r) => (
                  <MarkerF
                    key={r.id}
                    position={{ lat: r.lat, lng: r.lng }}
                    icon={createMarkerIcon(REPORT_COLORS[r.type] || "#9ca3af")}
                    title={`${r.label} · ${r.time}`}
                  />
                ))}
              </GoogleMap>
            </LoadScript>
          ) : (
            <MapFallback />
          )}

          <button
            type="button"
            className="absolute left-3.5 top-[150px] z-20 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white text-[#3155dd] shadow-[0_5px_14px_rgba(18,9,47,0.2)]"
            aria-label="Open menu"
            onClick={() => setPanelMode("list")}
          >
            <Menu size={30} strokeWidth={3} />
          </button>

          <button
            type="button"
            className="absolute right-3.5 top-[150px] z-20 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white text-[#3155dd] shadow-[0_5px_14px_rgba(18,9,47,0.2)]"
            aria-label="Filter bays"
            onClick={() => {
              bays.setShowAllBays(!bays.showAllBays);
              if (!bays.showAllBays) bays.fitAllBays();
            }}
          >
            <Settings2 size={30} strokeWidth={2.5} />
          </button>

          <div className="absolute right-4 top-[60%] z-20 grid gap-3">
            <button
              type="button"
              className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white text-[#3155dd] shadow-[0_5px_14px_rgba(18,9,47,0.2)]"
              onClick={() => loc.startWatch(Boolean(nav.directions))}
              aria-label="Find my location"
            >
              <Crosshair size={30} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              className="h-[54px] w-[54px] rounded-full bg-white text-[24px] font-extrabold text-[#3155dd] shadow-[0_5px_14px_rgba(18,9,47,0.2)]"
            >
              3D
            </button>
          </div>

          <button
            type="button"
            className="absolute bottom-[230px] left-4 z-20 flex min-h-[52px] items-center gap-2 rounded-full bg-white px-5 text-[18px] font-bold text-[#12092f] shadow-[0_5px_14px_rgba(18,9,47,0.18)]"
          >
            <MapPin size={22} color="#f4b640" fill="#f4b640" />
            Street view
          </button>

          {statusMessage && (
            <div className="absolute left-4 right-4 top-[216px] z-20 rounded-full bg-white px-4 py-2 text-center text-xs font-bold text-[#3155dd] shadow">
              {statusMessage}
            </div>
          )}

          {!bays.isLoading && bays.allBays.length === 0 && (
            <div className="absolute left-4 right-4 top-[216px] z-20 rounded-md border border-[#e6e7f1] bg-white px-4 py-3 text-center text-sm font-bold text-[#12092f] shadow">
              {bays.importMessage || "NPP bays are not available yet"}
            </div>
          )}

          <SessionCard session={activeSession} />

          {panelMode === "list" && !selectedBay && (
            <div className="absolute inset-x-0 bottom-0 z-30 max-h-[560px] overflow-hidden rounded-t-[16px] bg-white shadow-[0_-10px_26px_rgba(18,9,47,0.18)]">
              <div className="border-b border-[#eeeef7] px-4 pb-4 pt-4">
                <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-[#e8e8f6]" />
                <div className="flex items-center justify-between">
                  <button className="flex min-h-[52px] items-center gap-3 rounded-md border border-[#e6e7f1] bg-white px-4 text-[17px] shadow-sm" type="button">
                    <ListFilter size={25} color={blue} strokeWidth={3} />
                    <span className="text-[#7b7a84]">Sort by</span>
                    <strong>Cheapest</strong>
                  </button>
                  <button className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-[#e6e7f1] bg-white text-[#3155dd] shadow-sm" type="button">
                    <Settings2 size={29} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              <div className="max-h-[470px] overflow-y-auto">
                {shownBays.map((bay) => (
                  <button
                    key={bay.id}
                    type="button"
                    className="block w-full border-b border-[#eeeef7] bg-white px-5 py-5 text-left"
                    onClick={() => openBay(bay)}
                  >
                    <div className="grid grid-cols-[56px_1fr_44px] gap-3">
                      <div className={`flex h-[56px] w-[56px] items-center justify-center rounded-md ${bay.status === "full" ? "bg-[#929292]" : bay.pricePerHour === 0 ? "bg-[#008d0a]" : "bg-[#0b68c7]"}`}>
                        {bay.status === "full" ? <X size={34} color="white" strokeWidth={4} /> : <Navigation size={32} color="white" fill="white" />}
                      </div>
                      <div>
                        <div className="text-[22px] font-extrabold leading-tight">{getBayStatusLabel(bay)}</div>
                        <div className="mt-1 text-[17px] font-bold text-[#77777e]">{getBayType(bay)}</div>
                        <div className="mt-2 inline-flex rounded-md bg-[#fff5df] px-2.5 py-1 text-[14px] font-bold">
                          {getNotice(bay)}
                        </div>
                        <div className="mt-5 grid grid-cols-[72px_1fr] gap-x-2 gap-y-2 text-[14px]">
                          <span className="font-bold text-[#77777e]">Stay up to</span>
                          <strong>{bay.maxStay || "1h"}</strong>
                          <span className="font-bold text-[#77777e]">Address</span>
                          <strong>{bay.streetName || bay.name}, Tower Hamlets</strong>
                        </div>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[#e6e7f1] text-[#3155dd]">
                        <Navigation size={26} fill="#3155dd" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {panelMode === "search" && !selectedBay && (
            <div className="absolute inset-x-0 top-0 z-40 h-full bg-[#f8f8fd] px-4 pb-4 pt-4">
              <div className="mb-5 flex items-center gap-3">
                <button type="button" className="text-[#8f92b6]" onClick={() => setPanelMode("actions")}>
                  <ChevronRight className="rotate-180" size={36} strokeWidth={2.5} />
                </button>
                <div className="flex min-h-[58px] flex-1 items-center rounded-md border border-[#e0e1ec] bg-white px-3 shadow-sm">
                  <Search size={28} color={blue} strokeWidth={3} />
                  <input className="ml-2 w-full bg-transparent text-[18px] font-bold outline-none placeholder:text-[#9a99a6]" placeholder="Search location code or destination" autoFocus />
                </div>
              </div>
              <div className="mb-6 grid grid-cols-2 rounded-md border border-[#e0e1ec] bg-white p-0.5 text-[15px] font-bold">
                <button type="button" className="min-h-[44px] rounded-md bg-[#969de9] text-white">Nearby codes</button>
                <button type="button" className="min-h-[44px] rounded-md">Recent searches</button>
              </div>
              <div className="overflow-y-auto">
                {shownBays.map((bay) => (
                  <button
                    key={bay.id}
                    type="button"
                    className="grid w-full grid-cols-[38px_1fr] border-b border-[#dedee8] py-3 text-left"
                    onClick={() => openBay(bay)}
                  >
                    <span className="text-[34px] font-extrabold leading-none text-[#9aa0bd]">#</span>
                    <span>
                      <span className="block text-[18px] font-extrabold">{bay.locationId || bay.id.replace(/\D/g, "").slice(0, 6) || "606126"}</span>
                      <span className="block text-[15px] font-bold text-[#77777e]">{bay.streetName || bay.name}, Tower Hamlets</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {panelMode === "actions" && !selectedBay && (
            <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[16px] bg-white px-4 pb-5 pt-3 shadow-[0_-10px_26px_rgba(18,9,47,0.18)]">
              <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-[#e8e8f6]" />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[24px] font-extrabold">What do you want to do?</h2>
                <ChevronDown size={32} strokeWidth={3} />
              </div>
              <button type="button" className="mb-3 flex min-h-[58px] w-full items-center gap-4 rounded-md border border-[#e6e7f1] bg-white px-4 text-left text-[22px] font-extrabold shadow-[0_3px_8px_rgba(18,9,47,0.14)]">
                <span className="flex h-38px h-10 w-10 items-center justify-center rounded-full bg-[#eef0ff] text-[#3155dd]">
                  <Search size={24} strokeWidth={3} />
                </span>
                Plan parking in advance
                <ChevronRight className="ml-auto text-[#9aa0bd]" size={32} strokeWidth={3} />
              </button>
              <button type="button" className="mb-3 flex min-h-[58px] w-full items-center gap-4 rounded-md border border-[#e6e7f1] bg-white px-4 text-left text-[21px] font-extrabold shadow-[0_3px_8px_rgba(18,9,47,0.14)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef0ff] text-[#3155dd]">
                  <Compass size={24} strokeWidth={3} />
                </span>
                Park smarter with Kerb-pilot
                <ChevronRight className="ml-auto text-[#9aa0bd]" size={32} strokeWidth={3} />
              </button>
              <button
                type="button"
                className="flex min-h-[64px] w-full items-center gap-4 overflow-hidden rounded-md bg-[#2f45dc] pr-4 text-left text-[23px] font-extrabold text-white shadow-[0_4px_10px_rgba(18,9,47,0.18)]"
                onClick={() => setPanelMode("search")}
              >
                <span className="flex h-[64px] w-[78px] shrink-0 items-center justify-center bg-[#5565e6]">
                  <ParkingSquare size={40} strokeWidth={3} />
                </span>
                Pay with location code
                <ChevronRight className="ml-auto" size={34} strokeWidth={3} />
              </button>
            </div>
          )}

          <button
            type="button"
            className="absolute bottom-[20px] right-4 z-40 flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white text-[#3155dd] shadow"
            onClick={() => setShowReport(true)}
            aria-label="Report parking update"
          >
            <TriangleAlert size={25} strokeWidth={2.5} />
          </button>
        </div>

        {selectedBay && (
          <BayDetailSheet
            bay={selectedBay}
            onClose={() => setSelectedBay(null)}
            onNavigate={(bay) => {
              pushRecentBay(bay);
              nav.startDirections(bay);
            }}
            onBayReport={addReport}
            onBayStatusChange={bays.updateBayStatus}
            onStartSession={handleStartSession}
            onSaveBay={toggleSavedBay}
            isSaved={savedBays.some((item) => item.id === selectedBay.id)}
          />
        )}

        {showReport && (
          <ReportScreen
            onClose={() => setShowReport(false)}
            onSubmit={handleReportSubmit}
            selectedBay={selectedBay}
            hasUserLocation={Boolean(loc.userLocation)}
          />
        )}
      </div>
    </div>
  );
}
