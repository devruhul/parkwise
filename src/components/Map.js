import React, { useState } from "react";
import {
  GoogleMap,
  useLoadScript,
  Polyline,
  Marker,
} from "@react-google-maps/api";

import { PARKING_BAYS, REPORTS, STATUS_CONFIG } from "../data/parkingData";
import {
  googleMapsApiKey,
  londonCenter,
  googleMapOptions,
} from "../services/googleMaps";

import BayDetailSheet from "./BayDetailSheet";
import ReportScreen from "./ReportScreen";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

export default function Map() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey,
  });

  const [selectedBay, setSelectedBay] = useState(null);
  const [showReport, setShowReport] = useState(false);

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div style={{ position: "relative" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={londonCenter}
        zoom={14}
        options={googleMapOptions}
      >
        {/* Parking Lines */}
        {PARKING_BAYS.map((bay) => {
          const config = STATUS_CONFIG[bay.status];

          return (
            <Polyline
              key={bay.id}
              path={bay.coordinates}
              options={{
                strokeColor: config.color,
                strokeWeight: 6,
              }}
              onClick={() => setSelectedBay(bay)}
            />
          );
        })}

        {/* Reports */}
        {REPORTS.map((r) => (
          <Marker key={r.id} position={{ lat: r.lat, lng: r.lng }} />
        ))}
      </GoogleMap>

      {/* Bay Detail Sheet */}
      {selectedBay && (
        <BayDetailSheet
          bay={selectedBay}
          onClose={() => setSelectedBay(null)}
          onNavigate={(bay) => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${bay.lat},${bay.lng}`;
            window.open(url, "_blank");
          }}
        />
      )}

      {/* Report Button */}
      <button
        onClick={() => setShowReport(true)}
        style={{
          position: "absolute",
          bottom: 30,
          right: 20,
          padding: "14px",
          borderRadius: "50%",
          background: "#0f172a",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        +
      </button>

      {/* Report Screen */}
      {showReport && <ReportScreen onClose={() => setShowReport(false)} />}
    </div>
  );
}
