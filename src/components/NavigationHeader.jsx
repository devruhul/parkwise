// ─── components/NavigationHeader.js ──────────────────────────────────────────
import React from 'react';
import { X } from 'lucide-react';

export default function NavigationHeader({ summary, onClose }) {
  if (!summary) return null;
  return (
    <div className="absolute left-3 right-3 top-3 z-30 rounded-[26px] bg-emerald-700 px-[18px] py-4 text-white shadow-[0_18px_36px_rgba(15,23,42,0.22)]">
      <div className="flex items-center justify-between gap-3">
        <button
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-white/15 text-white"
          onClick={onClose}
          aria-label="Close directions"
          type="button"
        >
          <X size={26} strokeWidth={2.2} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 text-sm font-bold text-white/85">Driving to parking bay</div>
          <div className="text-[20px] font-extrabold leading-tight text-white">{summary.destination}</div>
          <div className="mt-1.5 text-xs font-bold text-white/85">
            {summary.duration} · {summary.distance}
          </div>
        </div>
      </div>
    </div>
  );
}
