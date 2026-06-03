import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Car,
  ChevronRight,
  CreditCard,
  MapPin,
  Navigation,
  Plus,
  X,
} from "lucide-react";
import { DURATION_OPTIONS } from "../constants";

const blue = "#2f45dc";
const appBlue = "#0870cf";
const green = "#008d0a";
const grey = "#9b9b9b";

const formatStay = (minutes) => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const getStatusCopy = (bay) => {
  if (bay.status === "full") {
    return {
      title: "No parking",
      type: "Currently unavailable",
      notice: "Check another bay nearby",
      color: grey,
    };
  }
  if (bay.pricePerHour === 0 || bay.status === "free") {
    return {
      title: "Park for free",
      type: /resident|permit/i.test(`${bay.restrictions} ${bay.maxStay} ${bay.rawCost || ""}`)
        ? "Resident bay"
        : "Single yellow line",
      notice: "No parking after 08:30 tomorrow",
      color: green,
    };
  }
  return {
    title: "Pay to park",
    type: "Paid parking bay",
    notice: `Controls ${bay.restrictions}`,
    color: appBlue,
  };
};

export default function BayDetailSheet({
  bay,
  onClose,
  onNavigate,
  onBayReport,
  onBayStatusChange,
  onStartSession,
  onSaveBay,
  isSaved,
}) {
  const [duration, setDuration] = useState(60);
  const [showSessionSetup, setShowSessionSetup] = useState(false);
  const scrollRef = useRef(null);
  const copy = getStatusCopy(bay);
  const isPaid = bay.pricePerHour > 0 && bay.status !== "full";

  const total = useMemo(
    () => (isPaid ? (bay.pricePerHour * duration) / 60 + 0.2 : 0),
    [bay.pricePerHour, duration, isPaid],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setShowSessionSetup(false);
    setDuration(60);
  }, [bay.id]);

  const endDate = new Date(Date.now() + duration * 60 * 1000);
  const endTime = endDate.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });

  if (showSessionSetup) {
    return (
      <div className="absolute inset-0 z-[100] flex flex-col bg-white">
        <div className="bg-[#0870cf] px-5 pb-8 pt-7 text-white">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => setShowSessionSetup(false)} aria-label="Back">
              <ChevronRight className="rotate-180" size={36} strokeWidth={2.6} />
            </button>
            <button type="button" onClick={onClose} aria-label="Close">
              <X size={34} strokeWidth={2.6} />
            </button>
          </div>
          <div className="text-center">
            <div className="text-[30px] font-extrabold leading-none">{bay.locationId || "606126"}</div>
            <div className="mt-3 text-[17px] font-extrabold">{bay.streetName || bay.name}, Tower Hamlets</div>
          </div>
        </div>

        <div className="border-b-[5px] border-[#efeffc] bg-white px-5 py-7 text-center">
          <h2 className="text-[25px] font-extrabold">Add details to start session</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="border-b-[5px] border-[#efeffc] px-5 py-6">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-bold text-[#77777e]">Vehicle</span>
              <button type="button" className="flex items-center gap-2 rounded-full bg-[#fff5df] px-4 py-2 text-[18px] font-bold">
                <Plus size={22} color="#f3aa16" strokeWidth={3} /> Add vehicle
              </button>
            </div>
          </div>

          <div className="border-b-[5px] border-[#efeffc] px-5 py-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[17px] font-bold text-[#77777e]">Payment</span>
              <div className="flex gap-2">
                <button type="button" className="flex items-center gap-2 rounded-full bg-[#fff5df] px-3 py-2 text-[16px] font-bold">
                  <Plus size={20} color="#f3aa16" strokeWidth={3} /> Add card
                </button>
                <button type="button" className="flex items-center gap-2 rounded-full bg-[#fff5df] px-3 py-2 text-[16px] font-bold">
                  <Plus size={20} color="#f3aa16" strokeWidth={3} /> Add Google Pay
                </button>
              </div>
            </div>
          </div>

          <div className="border-b-[5px] border-[#efeffc] px-5 py-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[17px] font-bold text-[#77777e]">End session reminder</span>
              <span className="flex items-center gap-3 text-[24px] font-extrabold">
                15m <ChevronRight size={32} color="#9aa0bd" strokeWidth={3} />
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-y-2 text-[17px]">
              <span className="font-bold text-[#77777e]">Duration</span>
              <strong>{formatStay(duration)}</strong>
              <span className="font-bold text-[#77777e]">End time</span>
              <strong>{endTime}</strong>
            </div>
          </div>

          <div className="border-b-[5px] border-[#efeffc] px-5 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[18px] font-extrabold">Pay when session ends</div>
                <div className="text-[16px] font-bold text-[#77777e]">Includes 20p convenience fee</div>
              </div>
              <div className="text-[34px] font-extrabold">£{total.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white px-6 pb-8 pt-5 shadow-[0_-9px_20px_rgba(18,9,47,0.12)]">
          <button
            type="button"
            className="h-[58px] w-full rounded-md bg-[#d5d5d5] text-[20px] font-bold text-white shadow"
            onClick={() => onStartSession?.({ bay, durationMinutes: duration, total })}
          >
            Start session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-end bg-transparent">
      <div className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[16px] bg-white shadow-[0_-10px_30px_rgba(18,9,47,0.22)]">
        <div className="shrink-0 bg-white px-5 pt-3">
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-[#e8e8f6]" />
          <div className="mb-5 grid grid-cols-[64px_1fr_42px] items-start gap-4">
            <div
              className="flex h-[64px] w-[64px] items-center justify-center rounded-md"
              style={{ background: copy.color }}
            >
              {bay.status === "full" ? (
                <X size={42} color="white" strokeWidth={4} />
              ) : (
                <Navigation size={38} color="white" fill="white" />
              )}
            </div>
            <div>
              <h2 className="text-[27px] font-extrabold leading-tight">{copy.title}</h2>
              <div className="mt-1 text-[19px] font-bold text-[#77777e]">{copy.type}</div>
              <div className="mt-3 inline-flex rounded-md bg-[#fff5df] px-3 py-1.5 text-[15px] font-bold">
                {copy.notice}
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="text-[#12092f]">
              <X size={36} strokeWidth={2.6} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          <section className="border-t-[5px] border-[#efeffc] px-5 py-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[22px] font-extrabold">Operating hours</h3>
              <div className="grid grid-cols-2 rounded-md bg-[#f0f0f3] p-0.5 text-[15px] font-bold">
                <button type="button" className="rounded-md bg-white px-8 py-3 shadow-sm">Day</button>
                <button type="button" className="px-8 py-3">Week</button>
              </div>
            </div>
            <div className="mb-7 flex gap-6 text-[15px] font-bold">
              <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-sm bg-[#008d0a]" /> Park for free</span>
              {isPaid && <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-sm bg-[#0870cf]" /> Pay to park</span>}
              <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-sm bg-[#9b9b9b]" /> No parking</span>
            </div>
            <div className="relative h-[50px]">
              <div className="absolute left-0 right-0 top-4 grid h-3 grid-cols-[1.35fr_1.05fr_0.9fr_0.55fr] overflow-hidden">
                <span className="bg-[#008d0a]" />
                <span className={isPaid ? "bg-[#0870cf]" : "bg-[#9b9b9b]"} />
                <span className="bg-[#9b9b9b]" />
                <span className="bg-[#008d0a]" />
              </div>
              <div className="absolute left-[55%] top-0 h-8 border-l-2 border-[#12092f]">
                <span className="absolute -left-7 -top-7 rounded-md border border-[#e0e1ec] bg-white px-2 py-1 text-[15px] font-bold">{new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="absolute left-0 right-0 top-8 flex justify-between text-[15px] font-bold">
                <span>00:00</span><span>08:30</span><span>17:30</span><span>23:59</span>
              </div>
            </div>
          </section>

          <section className="border-t-[5px] border-[#efeffc] px-5 py-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[22px] font-extrabold">Walking time</h3>
              <button type="button" className="flex items-center gap-2 rounded-md border border-[#e5e6f1] bg-white px-4 py-3 text-[16px] font-bold shadow">
                <MapPin size={22} color={blue} fill={blue} /> Set destination
              </button>
            </div>
            <div className="grid grid-cols-[20px_1fr] gap-x-3 gap-y-2 text-[16px]">
              <span className="mt-1 h-4 w-4 rounded-full bg-[#008d0a]" />
              <span><span className="block font-bold text-[#77777e]">Selected bay</span><strong>{bay.streetName || bay.name}, Tower Hamlets</strong></span>
              <span className="mt-1 h-4 w-4 rounded-full bg-[#12092f]" />
              <span><span className="block font-bold text-[#77777e]">Destination</span><strong>Set destination to view walking time</strong></span>
            </div>
          </section>

          <section className="border-t-[5px] border-[#efeffc] px-5 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[22px] font-extrabold">Found data issues?</h3>
                <p className="mt-3 text-[16px] font-bold leading-relaxed text-[#a0a0a6]">
                  Take a photo of the issue and get in touch so we can fix it.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md bg-[#fff5df] px-4 py-3 text-[15px] font-bold"
                onClick={() => onBayReport?.("works", bay)}
              >
                Report
              </button>
            </div>
          </section>

          <section className="border-t-[5px] border-[#efeffc] px-5 py-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[22px] font-extrabold">Bay details</h3>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-[15px] font-bold ${isSaved ? "bg-[#eef0ff] text-[#3155dd]" : "bg-[#fff5df] text-[#12092f]"}`}
                onClick={() => onSaveBay?.(bay)}
              >
                {isSaved ? "Saved" : "Save bay"}
              </button>
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-y-3 text-[16px]">
              <span className="font-bold text-[#77777e]">Address</span><strong>{bay.streetName || bay.name}, Tower Hamlets</strong>
              <span className="font-bold text-[#77777e]">Zone</span><strong>{bay.zone}</strong>
              <span className="font-bold text-[#77777e]">Restriction</span><strong>{bay.restrictions}</strong>
              <span className="font-bold text-[#77777e]">Max stay</span><strong>{bay.maxStay}</strong>
            </div>
          </section>

          {isPaid && (
            <section className="border-t-[5px] border-[#efeffc] px-5 py-6">
              <h3 className="mb-4 text-center text-[22px] font-extrabold">Stay up to {formatStay(148)} from now</h3>
              <div className="grid grid-cols-5 gap-2">
                {DURATION_OPTIONS.map((min) => (
                  <button
                    key={min}
                    type="button"
                    className={`min-h-[44px] rounded-md border text-[15px] font-bold ${
                      duration === min ? "border-[#2f45dc] bg-[#2f45dc] text-white" : "border-[#e0e1ec] bg-white"
                    }`}
                    onClick={() => setDuration(min)}
                  >
                    {formatStay(min)}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="shrink-0 bg-white px-5 pb-5 pt-4 shadow-[0_-8px_20px_rgba(18,9,47,0.14)]">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div><div className="text-[15px] font-bold text-[#77777e]">Payment</div><div className="text-[22px] font-extrabold">{isPaid ? `£${total.toFixed(2)}` : "No charge"}</div></div>
            <div><div className="text-[15px] font-bold text-[#77777e]">Stay up to</div><div className="text-[22px] font-extrabold">{isPaid ? formatStay(duration) : "14h 30m"}</div></div>
            <div><div className="text-[15px] font-bold text-[#77777e]">No return</div><div className="text-[22px] font-extrabold">None</div></div>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              type="button"
              className="flex h-[54px] items-center justify-center gap-3 rounded-md border border-[#e1e2ee] bg-white text-[20px] font-extrabold shadow"
              onClick={() => {
                onNavigate?.(bay);
                onClose?.();
              }}
            >
              <Navigation size={26} color={blue} fill={blue} /> Directions
            </button>
            {isPaid && (
              <button
                type="button"
                className="flex h-[54px] items-center justify-center gap-2 rounded-md bg-[#2f45dc] px-5 text-[18px] font-extrabold text-white shadow"
                onClick={() => setShowSessionSetup(true)}
              >
                <CreditCard size={23} />
                Pay
              </button>
            )}
          </div>
          {!isPaid && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button type="button" className="flex h-[44px] items-center justify-center gap-2 rounded-md bg-[#f0fdf4] text-[15px] font-bold text-[#166534]" onClick={() => onBayStatusChange?.(bay.id, "free")}>
                <Car size={19} /> I'm leaving
              </button>
              <button type="button" className="h-[44px] rounded-md bg-[#fff5df] text-[15px] font-bold" onClick={() => onBayReport?.("warden", bay)}>
                Warden alert
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
