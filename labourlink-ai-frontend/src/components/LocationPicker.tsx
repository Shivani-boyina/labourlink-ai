import { useState } from 'react';
import { LocateFixed } from 'lucide-react';

export interface Coordinates { latitude: number; longitude: number }

export default function LocationPicker({ onSelect }: { onSelect: (coordinates: Coordinates) => void }) {
  const [message, setMessage] = useState('');
  function locate() {
    if (!navigator.geolocation) { setMessage('This browser cannot access device location. Enter your area manually.'); return; }
    setMessage('Waiting for location permission…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSelect({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setMessage('Location selected. Worker pins use an approximate area, not an exact address.');
      },
      () => setMessage('Location was not available. You can keep using the area name.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }
  return <div>
    <button type="button" onClick={locate} className="btn-outline !min-h-10 !px-3 !py-2 !text-sm"><LocateFixed size={16} /> Use my device location</button>
    {message && <p role="status" className="mt-1 text-xs text-slate-600">{message}</p>}
  </div>;
}
