// ─── components/SearchBar.js ──────────────────────────────────────────────────
import React, { useRef, useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Search } from 'lucide-react';

export default function SearchBar({ onPlaceSelected, onMessage, className = '' }) {
  const [text, setText]   = useState('');
  const acRef             = useRef(null);

  const handlePlace = () => {
    const place = acRef.current?.getPlace();
    if (!place?.geometry) { onMessage('Choose a place from the list'); return; }
    onPlaceSelected(place);
    setText(place.formatted_address || place.name || '');
    onMessage(`Showing parking near ${place.name || 'selected location'}`);
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' || !window.google?.maps || !text.trim()) return;
    new window.google.maps.Geocoder().geocode(
      { address: text, componentRestrictions: { country: 'GB' } },
      (results, status) => {
        if (status !== 'OK' || !results?.[0]) { onMessage('No matching place found'); return; }
        onPlaceSelected(results[0]);
        setText(results[0].formatted_address || text);
      }
    );
  };

  return (
    <>
      <div className={`absolute left-3 right-3 top-3 z-20 flex items-center gap-2.5 rounded-[18px] border border-slate-900/10 bg-white/95 px-3.5 py-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur ${className}`}>
        <Search size={18} color="#64748b" />
        <div className="min-w-0 flex-1">
          <Autocomplete
            onLoad={(ac) => (acRef.current = ac)}
            onPlaceChanged={handlePlace}
            options={{ componentRestrictions: { country: 'gb' }, fields: ['formatted_address', 'geometry', 'name'] }}
          >
            <input
              className="w-full min-w-0 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:font-semibold placeholder:text-slate-500"
              value={text}
              placeholder="Search by street or postcode, e.g. E1 6AN"
              aria-label="Search street, place, or postcode"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </Autocomplete>
        </div>
      </div>
    </>
  );
}
