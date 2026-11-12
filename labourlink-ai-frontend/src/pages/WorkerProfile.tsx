
import { Hammer, MapPin, Clock, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { getMyWorker } from '../services/workerService';
import { getToken } from '../utils/storage';
import { useFetch } from '../utils/useFetch';

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

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="card text-center">
          <h1 className="text-2xl font-bold">
            {t('workerProfile.loginRequired')}
          </h1>

          <p className="mt-2 text-slate-600">
            {t('workerProfile.loginMessage')}
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <Link to="/worker/login" className="btn-primary">
              {t('workerProfile.workerLogin')}
            </Link>

            <Link to="/worker/register" className="btn-outline">
              {t('workerProfile.registerWorker')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {t('workerProfile.title')}
        </h1>

        <p className="mt-1 text-slate-600">
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
          <div className="card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {worker.name}
                </h2>

                <p className="mt-1 text-slate-600">
                  {t('workerProfile.workerId')}: {worker.workerId}
                </p>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  worker.availability
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {worker.availability
                  ? t('workerProfile.available')
                  : t('workerProfile.notAvailable')}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <Phone size={18} aria-hidden />
                {t('workerProfile.phone')}
              </p>

              <p className="mt-2 text-lg font-semibold">
                {worker.phone}
              </p>
            </div>

            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <Hammer size={18} aria-hidden />
                {t('workerProfile.skill')}
              </p>

              <p className="mt-2 text-lg font-semibold">
                {worker.skill}
              </p>
            </div>

            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <Clock size={18} aria-hidden />
                {t('workerProfile.experience')}
              </p>

              <p className="mt-2 text-lg font-semibold">
                {worker.experience} {t('workerProfile.years')}
              </p>
            </div>

            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <MapPin size={18} aria-hidden />
                {t('workerProfile.location')}
              </p>

              <p className="mt-2 text-lg font-semibold">
                {worker.location}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/worker/dashboard" className="btn-primary">
              {t('dashboard')}
            </Link>

            <Link to="/jobs" className="btn-outline">
              {t('findWork')}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
