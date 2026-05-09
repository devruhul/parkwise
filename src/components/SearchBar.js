// ─── components/SearchBar.js ──────────────────────────────────────────────────
import React, { useRef, useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Search } from 'lucide-react';

const s = {
  wrap: {
    position: 'absolute',
    top: 12, left: 12, right: 12,
    zIndex: 24,
    background: 'rgba(255,255,255,0.96)',
    borderRadius: 18, padding: '11px 14px',
    display: 'flex', alignItems: 'center', gap: 10,
    border: '1px solid rgba(15,23,42,0.10)',
    boxShadow: '0 12px 30px rgba(15,23,42,0.12)',
    backdropFilter: 'blur(10px)',
  },
  input: {
    flex: 1, minWidth: 0,
    border: 'none', outline: 'none',
    background: 'transparent',
    color: '#0f172a', fontSize: 14, fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
  },
  status: {
    position: 'absolute',
    top: 68, left: 18, right: 18,
    zIndex: 25, borderRadius: 14, padding: '9px 12px',
    background: '#ffffff', border: '1px solid rgba(15,23,42,0.10)',
    color: '#475569', fontSize: 12, fontWeight: 700,
    boxShadow: '0 10px 22px rgba(15,23,42,0.12)',
  },
};

export default function SearchBar({ onPlaceSelected, onMessage }) {
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
      <div style={s.wrap}>
        <Search size={18} color="#64748b" aria-hidden />
        <Autocomplete
          onLoad={(ac) => (acRef.current = ac)}
          onPlaceChanged={handlePlace}
          options={{ componentRestrictions: { country: 'gb' }, fields: ['formatted_address', 'geometry', 'name'] }}
        >
          <input
            style={s.input}
            value={text}
            placeholder="Search street or postcode"
            aria-label="Search street, place, or postcode"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </Autocomplete>
      </div>
    </>
  );
}
