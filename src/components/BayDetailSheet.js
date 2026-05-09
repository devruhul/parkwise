// ─── components/BayDetailSheet.js ────────────────────────────────────────────
//
// KEY FIX: The inner content div uses overflowY:'auto' + WebkitOverflowScrolling
// so it scrolls with trackpad/mouse on Mac without any native drag needed.
//
import React, { useEffect, useMemo, useRef, useState } from "react";
import { STATUS_CONFIG } from "../data/parkingData";
import { DURATION_OPTIONS } from "../constants";

// ── Helpers ──────────────────────────────────────────────────────────────────
const getRestrictionSummary = (bay) => {
  if (bay.pricePerHour === 0) return "No payment needed right now";
  if (bay.status === "full") return "Currently reported full";
  return "Payment required during control hours";
};

const getNextFreeText = (bay) => {
  const m = bay.restrictions?.match(/after\s+(\d{1,2}:?\d{0,2})/i);
  if (m) return `Free after ${m[1]}`;
  return bay.pricePerHour === 0 ? "Free now" : "Check signs before leaving";
};

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position: "absolute",
    inset: 0,
    zIndex: 100,
    background: "rgba(0,0,0,0.38)",
    display: "flex",
    alignItems: "flex-end",
  },
  // The outer sheet just provides the rounded top and shadow
  sheet: {
    width: "100%",
    background: "#ffffff",
    borderRadius: "22px 22px 0 0",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 -18px 44px rgba(15,23,42,0.18)",
    animation: "baySlideUp 0.3s ease",
    // ⬇ fixed max height so scrolling kicks in
    maxHeight: "86vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden", // clip the rounded corners
  },
  // Drag handle – not scrollable
  handleWrap: {
    padding: "14px 18px 12px",
    flexShrink: 0,
  },
  handleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  handleSpacer: {
    width: 30,
    flexShrink: 0,
  },
  handle: {
    width: 36,
    height: 4,
    background: "rgba(15,23,42,0.15)",
    borderRadius: 2,
    flexShrink: 0,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#f1f5f9",
    border: "none",
    color: "#64748b",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    lineHeight: 1,
  },
  // ⬇ This div scrolls on Mac trackpad / mousewheel
  scrollBody: {
    overflowY: "auto",
    WebkitOverflowScrolling: "touch", // smooth momentum on Mac
    overscrollBehavior: "contain", // don't scroll the page behind
    padding: "0 18px 32px",
    flex: 1,
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  streetName: { fontSize: 20, fontWeight: 800, color: "#0f172a" },
  zone: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "'Space Mono', monospace",
  },
  statusChip: {
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  priceCard: {
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#f8fafc",
    padding: 14,
    marginBottom: 12,
  },
  priceWrap: {
    display: "flex",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 4,
  },
  price: { fontSize: 32, fontWeight: 700 },
  perHour: { fontSize: 14, color: "#64748b" },
  priceMeta: { fontSize: 13, color: "#475569", fontWeight: 700 },
  badgeRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 },
  badge: {
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
  },
  section: { marginBottom: 14 },
  sectionLabel: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
    fontFamily: "'Space Mono', monospace",
  },
  payRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  payBtn: {
    minHeight: 44,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#f1f5f9",
    border: "1px solid rgba(15,23,42,0.08)",
    textAlign: "center",
    fontSize: 13,
    fontWeight: 600,
    color: "#1d4ed8",
    cursor: "pointer",
  },
  availBar: {
    padding: "10px 14px",
    borderRadius: 12,
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  availLabel: { fontSize: 14, fontWeight: 600 },
  confidence: { fontSize: 12, color: "#64748b" },
  durationRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 6,
    marginBottom: 10,
  },
  durationBtn: {
    minHeight: 40,
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "#ffffff",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  sessionTotal: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 14,
    background: "#ecfeff",
    color: "#155e75",
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 12,
  },
  primaryBtn: {
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    marginBottom: 8,
  },
  directionsBtn: {
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    border: "none",
    background: "#1d4ed8",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    marginBottom: 12,
  },
  actionRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  actionBtn: {
    minHeight: 44,
    padding: "10px 8px",
    borderRadius: 12,
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center",
  },
  toast: {
    position: "absolute",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#22c55e",
    color: "#052e16",
    padding: "8px 18px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    zIndex: 200,
    whiteSpace: "nowrap",
    animation: "fadeIn 0.2s ease",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function BayDetailSheet({
  bay,
  onClose,
  onNavigate,
  onBayReport,
  onBayStatusChange,
  onStartSession,
}) {
  const [toast, setToast] = useState(null);
  const [localStatus, setLocalStatus] = useState(bay.status);
  const [duration, setDuration] = useState(60);
  const scrollRef = useRef(null);

  const cfg = STATUS_CONFIG[localStatus] || STATUS_CONFIG.paid;
  const total = useMemo(
    () => (bay.pricePerHour > 0 ? (bay.pricePerHour * duration) / 60 : 0),
    [bay.pricePerHour, duration],
  );

  useEffect(() => {
    setLocalStatus(bay.status);
  }, [bay.id, bay.status]);

  // Scroll to top when a new bay is opened
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [bay.id]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div
      style={s.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        @keyframes baySlideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {toast && (
        <div style={s.toast} role="status">
          {toast}
        </div>
      )}

      <div
        style={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bay-title"
      >
        {/* ── Fixed handle + close ─────────────────────────────────────── */}
        <div style={s.handleWrap}>
          <div style={s.handleRow}>
            <div style={s.handleSpacer} aria-hidden />
            <div style={s.handle} aria-hidden />
            <button style={s.closeBtn} onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <div style={s.scrollBody} ref={scrollRef}>
          {/* Header */}
          <div style={s.row}>
            <div>
              <div id="bay-title" style={s.streetName}>
                {bay.streetName || bay.name}
              </div>
              <div style={s.zone}>
                Bay {bay.id} · Zone {bay.zone}
              </div>
            </div>
            <div
              style={{
                ...s.statusChip,
                background: `${cfg.color}18`,
                color: cfg.color,
              }}
            >
              {cfg.label}
            </div>
          </div>

          {/* Price card */}
          <div style={s.priceCard}>
            <div style={s.priceWrap}>
              <span
                style={{
                  ...s.price,
                  color: bay.pricePerHour === 0 ? "#15803d" : "#0f172a",
                }}
              >
                {bay.pricePerHour === 0
                  ? "FREE"
                  : `£${bay.pricePerHour.toFixed(2)}`}
              </span>
              {bay.pricePerHour > 0 && <span style={s.perHour}>/ hour</span>}
            </div>
            <div style={s.priceMeta}>
              {getRestrictionSummary(bay)} · {getNextFreeText(bay)}
            </div>
          </div>

          {/* Restriction badges */}
          <div style={s.badgeRow}>
            <span
              style={{
                ...s.badge,
                background: "rgba(29,78,216,0.12)",
                color: "#1d4ed8",
              }}
            >
              {bay.restrictions}
            </span>
            <span
              style={{
                ...s.badge,
                background: "rgba(180,83,9,0.14)",
                color: "#92400e",
              }}
            >
              Max {bay.maxStay}
            </span>
          </div>

          {/* Payment methods */}
          {bay.paymentMethods?.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionLabel}>Pay with</div>
              <div style={s.payRow}>
                {bay.paymentMethods.map((m) => (
                  <div key={m} style={s.payBtn}>
                    {m}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Availability bar */}
          <div
            style={{
              ...s.availBar,
              background: `${cfg.color}12`,
              border: `1px solid ${cfg.color}24`,
            }}
          >
            <span style={{ ...s.availLabel, color: cfg.color }}>
              {cfg.label}
            </span>
            <span style={s.confidence}>
              Confidence {bay.confidence}/5 · {bay.lastUpdated}
            </span>
          </div>

          {/* Duration picker (paid bays only) */}
          {bay.pricePerHour > 0 && (
            <div style={s.section}>
              <div style={s.sectionLabel}>Duration</div>
              <div
                style={s.durationRow}
                role="group"
                aria-label="Choose duration"
              >
                {DURATION_OPTIONS.map((min) => (
                  <button
                    key={min}
                    type="button"
                    style={{
                      ...s.durationBtn,
                      background: duration === min ? "#0f172a" : "#ffffff",
                      color: duration === min ? "#ffffff" : "#334155",
                    }}
                    aria-pressed={duration === min}
                    onClick={() => setDuration(min)}
                  >
                    {min >= 60 ? `${min / 60}h` : `${min}m`}
                  </button>
                ))}
              </div>
              <div style={s.sessionTotal}>
                <span>{duration} min</span>
                <span>£{total.toFixed(2)}</span>
              </div>
              <button
                type="button"
                style={s.primaryBtn}
                onClick={() => {
                  onStartSession?.({ bay, durationMinutes: duration, total });
                  showToast(`Parking started for ${duration} min`);
                }}
              >
                Start parking
              </button>
            </div>
          )}

          {/* Directions */}
          <button
            type="button"
            style={s.directionsBtn}
            onClick={() => onNavigate?.(bay)}
          >
            Directions
          </button>

          {/* Community action row */}
          <div style={s.actionRow}>
            {[
              {
                label: "I'm Leaving",
                bg: "#f0fdf4",
                color: "#166534",
                border: "#bbf7d0",
                action: () => {
                  setLocalStatus("free");
                  onBayStatusChange?.(bay.id, "free");
                  showToast("Bay marked as free");
                },
              },
              {
                label: "Paid",
                bg: "#eff6ff",
                color: "#1d4ed8",
                border: "#bfdbfe",
                action: () => {
                  setLocalStatus("paid");
                  onBayStatusChange?.(bay.id, "paid");
                  showToast("Bay marked as paid");
                },
              },
              {
                label: "It's Full",
                bg: "#fef2f2",
                color: "#991b1b",
                border: "#fecaca",
                action: () => {
                  setLocalStatus("full");
                  onBayStatusChange?.(bay.id, "full");
                  showToast("Reported as full");
                },
              },
              {
                label: "Warden alert",
                bg: "#fffbeb",
                color: "#92400e",
                border: "#fde68a",
                action: () => {
                  onBayReport?.("warden", bay);
                  showToast("Warden alert sent");
                },
              },
            ].map(({ label, bg, color, border, action }) => (
              <button
                key={label}
                type="button"
                style={{
                  ...s.actionBtn,
                  background: bg,
                  color,
                  border: `1px solid ${border}`,
                }}
                onClick={action}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* end scrollBody */}
      </div>
    </div>
  );
}
