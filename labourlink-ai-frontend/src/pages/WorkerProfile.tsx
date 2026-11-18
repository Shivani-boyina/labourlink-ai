
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Hammer, HardHat, IndianRupee, MapPin, Phone, Search, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { getMyWorker, updateMyMatchingProfile, updateMyWorkerLocation } from '../services/workerService';
import WorkProfileEditor from '../components/WorkProfileEditor';
import WorkerRating from '../components/WorkerRating';
import { getToken } from '../utils/storage';
import { useFetch } from '../utils/useFetch';
import LocationPicker, { type Coordinates } from '../components/LocationPicker';

export default function WorkerProfile() {
  const { t } = useTranslation();
  const token = getToken();

  const { data: worker, loading, error, reload } = useFetch(
    async () => {
      if (!token) return null;
      return getMyWorker();
    },
    [token]
  );
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [shareLocation, setShareLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  useEffect(() => {
    if (worker) {
      setLocation(worker.location);
      setShareLocation(Boolean(worker.locationShared));
      if (worker.latitude != null && worker.longitude != null) setCoordinates({ latitude: worker.latitude, longitude: worker.longitude });
    }
  }, [worker]);

  async function saveLocation(event: FormEvent) {
    event.preventDefault();
    setSavingLocation(true); setLocationMessage('');
    try {
      await updateMyWorkerLocation({
        location,
        shareLocation,
        ...(shareLocation && coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
      });
      setLocationMessage('Location preferences saved.');
      await reload();
    } catch { setLocationMessage('Could not save location. Check your connection and try again.'); }
    finally { setSavingLocation(false); }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="card border-2 border-slate-200 bg-white p-8 text-center space-y-4 shadow-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <HardHat size={28} aria-hidden />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {t('workerProfile.loginRequired')}
          </h1>

          <p className="text-base text-slate-600">
            {t('workerProfile.loginMessage')}
          </p>

          <div className="pt-2 flex flex-col gap-3">
            <Link to="/worker/login" className="btn-primary w-full">
              {t('workerProfile.workerLogin')}
            </Link>

            <Link to="/worker/register" className="btn-outline w-full">
              {t('workerProfile.registerWorker')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12 space-y-6">
      <Link
        to="/worker/dashboard"
        className="inline-flex items-center gap-2 text-base font-semibold text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} aria-hidden />
        <span>{t('workerProfile.backToDashboard')}</span>
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-slate-900">
          {t('workerProfile.title')}
        </h1>
        <p className="text-base text-slate-600">
          {t('workerProfile.subtitle')}
        </p>
      </div>

      {loading && (
        <LoadingSpinner label={t('workerProfile.loading')} />
      )}

      {error && (
        <ErrorMessage message={error} onRetry={reload} />
      )}

      {!loading && !error && !worker && (
        <EmptyState
          title={t('workerProfile.notFound')}
          text={t('workerProfile.notFoundMessage')}
        />
      )}

      {worker && (
        <>
          <div className="card border-2 border-slate-200/90 bg-white p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 font-extrabold text-xl">
                  {worker.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {worker.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {t('workerProfile.workerId')}: #{worker.workerId}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wider self-start sm:self-auto ${
                  worker.availability
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {worker.availability ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>
                  {worker.availability
                    ? t('workerProfile.available')
                    : t('workerProfile.notAvailable')}
                </span>
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Phone size={15} className="text-blue-600" aria-hidden />
                  <span>{t('workerProfile.phone')}</span>
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {worker.phone}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Hammer size={15} className="text-blue-600" aria-hidden />
                  <span>{t('workerProfile.skill')}</span>
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {t('workerRegister.skills.' + worker.skill, worker.skill)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Clock size={15} className="text-blue-600" aria-hidden />
                  <span>{t('workerProfile.experience')}</span>
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {worker.experience} {t('workerProfile.years')}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <MapPin size={15} className="text-blue-600" aria-hidden />
                  <span>{t('workerProfile.location')}</span>
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {worker.location}
                </p>
                <form onSubmit={saveLocation} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                  <label htmlFor="edit-worker-location" className="label">Update your service area</label>
                  <input id="edit-worker-location" className="input" maxLength={200} value={location} onChange={(event) => setLocation(event.target.value)} required />
                  <LocationPicker onSelect={setCoordinates} />
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="mt-1" checked={shareLocation} onChange={(event) => setShareLocation(event.target.checked)} />
                    <span>Share my approximate location on worker maps. The app rounds it to about 1 km; exact device coordinates are not shown.</span>
                  </label>
                  {shareLocation && !coordinates && <p className="text-xs text-amber-800">Choose your device location before enabling map sharing.</p>}
                  <button type="submit" disabled={savingLocation || (shareLocation && !coordinates)} className="btn-primary !min-h-10 !py-2 !text-sm">{savingLocation ? 'Saving…' : 'Save location preferences'}</button>
                  {locationMessage && <p role="status" className="text-sm text-slate-700">{locationMessage}</p>}
                </form>
              </div>

              {worker.expectedWagePerDay != null && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <IndianRupee size={15} className="text-blue-600" aria-hidden />
                    <span>{t('workerProfile.expectedWage')}</span>
                  </p>
                  <p className="mt-1.5 text-lg font-bold text-blue-900">
                    ₹{worker.expectedWagePerDay} {t('jobCard.perDay')}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2">
              <WorkerRating average={worker.averageRating} count={worker.reviewCount} />
              <Link to="/worker/reviews" className="font-semibold text-blue-700">{t('review.mine')}</Link>
            </div>
            <WorkProfileEditor key={worker.workerId} initial={worker} worker save={async (profile) => {
              await updateMyMatchingProfile(profile);
              reload();
            }} />
            <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
              <Link to="/worker/dashboard" className="btn-primary">
                {t('dashboard')}
              </Link>

              <Link to="/jobs" className="btn-outline flex items-center gap-2">
                <Search size={18} aria-hidden />
                <span>{t('findWork')}</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
