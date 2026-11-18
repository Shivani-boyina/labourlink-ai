import { useEffect, useRef, useState } from 'react';
import type { Worker } from '../types/Worker';
import type { Coordinates } from './LocationPicker';

type Point = { lat: number; lng: number };
type MapApi = {
  Map: new (element: HTMLElement, options: { center: Point; zoom: number; mapTypeControl: boolean; streetViewControl: boolean; fullscreenControl: boolean }) => { fitBounds: (bounds: unknown) => void };
  Marker: new (options: { map: unknown; position: Point; title: string }) => { addListener: (name: string, callback: () => void) => void };
  InfoWindow: new (options: { content: HTMLElement }) => { open: (options: { map: unknown; anchor: unknown }) => void };
  LatLngBounds: new () => { extend: (point: Point) => void };
};
declare global { interface Window { google?: { maps?: MapApi } } }
let mapsLoad: Promise<MapApi> | undefined;
function loadMaps(key: string): Promise<MapApi> {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsLoad) return mapsLoad;
  mapsLoad = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-labourlink-maps]');
    const script = existing ?? document.createElement('script');
    const done = () => window.google?.maps ? resolve(window.google.maps) : reject(new Error('Google Maps could not be loaded.'));
    if (existing) { script.addEventListener('load', done, { once: true }); script.addEventListener('error', () => reject(new Error('Google Maps could not be loaded.')), { once: true }); }
    else {
      script.dataset.labourlinkMaps = 'true';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async`;
      script.async = true; script.defer = true; script.onload = done; script.onerror = () => reject(new Error('Google Maps could not be loaded.'));
      document.head.appendChild(script);
    }
  });
  return mapsLoad;
}

export default function WorkerMap({ workers, center }: { workers: Worker[]; center?: Coordinates | null }) {
  const element = useRef<HTMLDivElement>(null);
  const [problem, setProblem] = useState('');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const located = workers.filter((worker) => worker.locationShared && worker.latitude != null && worker.longitude != null);
  useEffect(() => {
    if (!apiKey || !element.current || located.length === 0) return;
    let active = true;
    loadMaps(apiKey).then((maps) => {
      if (!active || !element.current) return;
      const first = located[0];
      const map = new maps.Map(element.current, {
        center: center ? { lat: center.latitude, lng: center.longitude } : { lat: first.latitude!, lng: first.longitude! },
        zoom: center ? 11 : 10, mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
      });
      const bounds = new maps.LatLngBounds();
      located.forEach((worker) => {
        const point = { lat: worker.latitude!, lng: worker.longitude! };
        bounds.extend(point);
        const marker = new maps.Marker({ map, position: point, title: `Approximate ${worker.skill} service area` });
        marker.addListener('click', () => {
          const content = document.createElement('div');
          const title = document.createElement('strong'); title.textContent = worker.skill;
          const area = document.createElement('p'); area.textContent = 'Approximate worker service area. Exact address is not shown.';
          content.append(title, area);
          new maps.InfoWindow({ content }).open({ map, anchor: marker });
        });
      });
      if (!center && located.length > 1) map.fitBounds(bounds);
      setProblem('');
    }).catch(() => { if (active) setProblem('Map unavailable. Check the restricted Google Maps key and API configuration; the worker list is still available.'); });
    return () => { active = false; };
  }, [apiKey, center?.latitude, center?.longitude, located.map((worker) => worker.workerId).join(',')]);

  if (!apiKey) return <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Map view needs a restricted Google Maps JavaScript API key. Worker search results remain available below.</p>;
  if (!located.length) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">No matching workers have opted into approximate map sharing. The worker list remains available.</p>;
  return <div><div ref={element} className="h-80 w-full rounded-xl border border-slate-200" aria-label="Map showing approximate areas of workers who opted in" role="img" />{problem && <p role="status" className="mt-2 text-sm text-amber-800">{problem}</p>}</div>;
}
