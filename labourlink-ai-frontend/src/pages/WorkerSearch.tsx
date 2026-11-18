
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Hammer, MapPin, RotateCcw, Search, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import WorkerCard from '../components/WorkerCard';
import WorkerMap from '../components/WorkerMap';
import LocationPicker, { type Coordinates } from '../components/LocationPicker';
import { searchWorkers } from '../services/workerService';
import { useFetch } from '../utils/useFetch';
import { SKILLS } from './WorkerRegister';

export default function WorkerSearch() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [skill, setSkill] = useState(() => searchParams.get('skill') || '');
  const [location, setLocation] = useState(() => searchParams.get('location') || '');
  const [deviceLocation, setDeviceLocation] = useState<Coordinates | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [applied, setApplied] = useState({
    skill: searchParams.get('skill') || '',
    location: searchParams.get('location') || '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    radiusKm: 25,
  });
  useEffect(() => {
    const nextSkill = searchParams.get('skill') || '';
    const nextLocation = searchParams.get('location') || '';
    setSkill(nextSkill); setLocation(nextLocation);
    setApplied((current) => ({ ...current, skill: nextSkill, location: nextLocation }));
  }, [searchParams]);

  const { data, loading, error, reload } = useFetch(
    () => searchWorkers(applied.skill || undefined, applied.location || undefined, applied.latitude, applied.longitude, applied.radiusKm),
    [applied]
  );
  function distanceTo(worker: { latitude?: number | null; longitude?: number | null }): number | undefined {
    if (applied.latitude == null || applied.longitude == null || worker.latitude == null || worker.longitude == null) return undefined;
    const radians = (value: number) => value * Math.PI / 180;
    const dLat = radians(worker.latitude - applied.latitude);
    const dLng = radians(worker.longitude - applied.longitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(applied.latitude)) * Math.cos(radians(worker.latitude)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setApplied({ skill, location, latitude: deviceLocation?.latitude, longitude: deviceLocation?.longitude, radiusKm });
  }

  function clear() {
    setSkill('');
    setLocation('');
    setDeviceLocation(null);
    setRadiusKm(25);
    setApplied({ skill: '', location: '', latitude: undefined, longitude: undefined, radiusKm: 25 });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-6">
      <Link
        to="/contractor/dashboard"
        className="inline-flex items-center gap-2 text-base font-semibold text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} aria-hidden />
        <span>{t('workerSearch.backToDashboard')}</span>
      </Link>

      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-800">
          <Users size={14} aria-hidden />
          <span>{t('workerSearch.badge')}</span>
        </span>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
          {t('workerSearch.title')}
        </h1>
        <p className="mt-1 text-base text-slate-600">
          {t('workerSearch.subtitle')}
        </p>
      </div>

      <form
        onSubmit={submit}
        className="card border-2 border-slate-200/90 bg-white p-5 md:p-6"
        aria-label={t('workerSearch.formLabel')}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="worker-skill" className="label flex items-center gap-1.5">
              <Hammer size={16} className="text-blue-600" aria-hidden />
              <span>{t('workerSearch.skill')}</span>
            </label>
            <select
              id="worker-skill"
              className="input"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            >
              <option value="">{t('workerSearch.anySkill')}</option>
              {SKILLS.map((item) => (
                <option key={item} value={item}>{t('workerRegister.skills.' + item, item)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="worker-location" className="label flex items-center gap-1.5">
              <MapPin size={16} className="text-blue-600" aria-hidden />
              <span>{t('workerSearch.location')}</span>
            </label>
            <input
              id="worker-location"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('workerSearch.locationPlaceholder')}
            />
            {location.trim() && (
              <a
                className="mt-2 inline-flex text-sm font-semibold text-blue-700 underline"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`}
                target="_blank"
                rel="noreferrer"
              >
                Open this area in Google Maps
              </a>
            )}
          </div>

          <div className="flex items-end gap-2.5">
            <button type="submit" className="btn-primary flex-1 !py-3 flex items-center justify-center gap-2">
              <Search size={18} aria-hidden />
              <span>{t('workerSearch.search')}</span>
            </button>
            <button type="button" onClick={clear} className="btn-outline !py-3 flex items-center justify-center gap-1.5">
              <RotateCcw size={16} aria-hidden />
              <span>{t('workerSearch.clear')}</span>
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <LocationPicker onSelect={setDeviceLocation} />
          <label className="text-sm font-medium text-slate-700">Distance
            <select disabled={!deviceLocation} className="input ml-2 !inline-block !w-auto !min-h-10 !py-1" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>
              <option value={10}>10 km</option><option value={25}>25 km</option><option value={50}>50 km</option><option value={100}>100 km</option>
            </select>
          </label>
          {deviceLocation && <span className="text-xs text-slate-600">Approximate search center selected (GPS permission granted)</span>}
        </div>
      </form>

      <div className="mt-8">
        {loading && (
          <LoadingSpinner label={t('workerSearch.loading')} />
        )}

        {error && (
          <ErrorMessage message={error} onRetry={reload} />
        )}

        {!loading && !error && data && data.length === 0 && (
          <EmptyState
            title={t('workerSearch.emptyTitle')}
            text={t('workerSearch.emptyMessage')}
            action={
              <button type="button" onClick={clear} className="btn-primary">
                <span>{t('workerSearch.viewAllWorkers')}</span>
              </button>
            }
          />
        )}

        {!loading && !error && data && data.length > 0 && (
          <>
            <p className="mb-4 text-base font-semibold text-slate-700">
              {t('workerSearch.results', { count: data.length })}
            </p>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {data.map((worker) => (
                <WorkerCard key={worker.workerId} worker={worker} distanceKm={distanceTo(worker)} />
              ))}
            </div>
            <section className="mt-8 space-y-3" aria-label="Map of matching workers">
              <h2 className="text-xl font-bold">Map view</h2>
              <WorkerMap workers={data} center={applied.latitude != null && applied.longitude != null ? { latitude: applied.latitude, longitude: applied.longitude } : null} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
