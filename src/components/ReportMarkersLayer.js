import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

const REPORT_CONFIG = {
  warden:   { icon: '🚓', color: '#fbbf24' },
  blocked:  { icon: '⚠️', color: '#f97316' },
  accident: { icon: '🚨', color: '#ef4444' },
  works:    { icon: '🚧', color: '#a78bfa' },
};

export default function ReportMarkersLayer({ reports }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) layerRef.current.clearLayers();
    else layerRef.current = L.layerGroup().addTo(map);

    reports.forEach(r => {
      const cfg = REPORT_CONFIG[r.type] || REPORT_CONFIG.blocked;
      const icon = L.divIcon({
        className: '',
        iconAnchor: [18, 18],
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="
              width:36px;height:36px;border-radius:50%;
              background:rgba(13,17,23,0.92);
              border:2px solid ${cfg.color};
              display:flex;align-items:center;justify-content:center;
              font-size:17px;
              box-shadow:0 0 14px ${cfg.color}88,0 2px 8px rgba(0,0,0,0.5);
            ">${cfg.icon}</div>
            <div style="
              margin-top:3px;
              background:rgba(13,17,23,0.88);
              border:1px solid ${cfg.color}55;
              border-radius:10px;padding:2px 7px;
              font-family:'DM Sans',sans-serif;font-size:9px;font-weight:600;
              color:${cfg.color};white-space:nowrap;
            ">${r.time}</div>
          </div>
        `,
      });
      const marker = L.marker([r.lat, r.lng], { icon });
      marker.bindTooltip(r.label, {
        direction: 'top', offset: [0, -44],
        className: 'parkwise-tooltip',
      });
      layerRef.current.addLayer(marker);
    });

    return () => layerRef.current?.clearLayers();
  }, [reports, map]);

  return null;
}
