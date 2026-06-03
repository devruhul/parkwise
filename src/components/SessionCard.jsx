// ─── components/SessionCard.js ────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';

export default function SessionCard({ session }) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(`1970-01-01T${session?.endsAt || '00:00'}:00`).getTime())
  );

  useEffect(() => {
    if (!session) return undefined;

    const tick = () => {
      const remaining = Math.max(0, session.endsAtMs - Date.now());
      setRemainingMs(remaining);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [session]);

  if (!session) return null;

  const totalMinutes = Math.floor(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const countdown = `${hours}:${String(mins).padStart(2, '0')} left`;

  return (
    <div
      className="absolute bottom-[244px] left-3 right-3 z-20 rounded-2xl bg-slate-900 p-3.5 text-white shadow-[0_16px_36px_rgba(15,23,42,0.28)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-bold text-white/70">Active parking</div>
          <div className="mt-0.5 text-base font-extrabold">
            {session.bay.streetName || session.bay.name}
          </div>
          <div className="mt-1.5 text-xs text-white/70">
            Ends {session.endsAt} · £{session.total.toFixed(2)} · {countdown}
          </div>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold text-white/90">
          {countdown}
        </div>
      </div>
    </div>
  );
}
