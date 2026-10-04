import { Hammer, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { getMyWorker } from '../services/workerService';
import { searchJobs } from '../services/jobService';
import { clearSession, getToken } from '../utils/storage';
import { useFetch } from '../utils/useFetch';

export default function WorkerDashboard() {
  const token = getToken();

  const prof = useFetch(
    async () => {
      if (!token) return null;
      return getMyWorker();
    },
    [token]
  );

  const worker = prof.data;

  const jobs = useFetch(
    async () =>
      worker
        ? searchJobs({
            skill: worker.skill,
            location: worker.location,
          })
        : [],
    [worker?.skill, worker?.location]
  );

  function logout() {
    clearSession();
    window.location.href = '/worker/login';
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="card text-center">
          <h1 className="text-2xl font-bold">
            Worker Login Required
          </h1>

          <p className="mt-2 text-slate-600">
            Please log in to view your profile and find available work.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <Link
              to="/worker/login"
              className="btn-primary w-full"
            >
              Worker Login
            </Link>

            <Link
              to="/worker/register"
              className="btn-outline w-full"
            >
              Register as Worker
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {prof.loading && (
        <LoadingSpinner label="Loading your profile..." />
      )}

      {prof.error && (
        <ErrorMessage
          message={prof.error}
          onRetry={prof.reload}
        />
      )}

      {!prof.loading && !prof.error && !worker && (
        <EmptyState
          title="Profile not found"
          text="We could not load your worker profile."
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={logout}
            >
              Log in again
            </button>
          }
        />
      )}

      {worker && (
        <>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome, {worker.name}
              </h1>

              <p className="mt-1 text-slate-600">
                Your LabourLink AI worker dashboard
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="btn-outline"
            >
              Logout
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <Hammer size={16} aria-hidden />
                Skill
              </p>

              <p className="text-xl font-bold">
                {worker.skill}
              </p>
            </div>

            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <Clock size={16} aria-hidden />
                Experience
              </p>

              <p className="text-xl font-bold">
                {worker.experience} years
              </p>
            </div>

            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <MapPin size={16} aria-hidden />
                Location
              </p>

              <p className="text-xl font-bold">
                {worker.location}
              </p>
            </div>

            <div className="card">
              <p className="text-slate-600">
                Availability
              </p>

              <p
                className={`text-xl font-bold ${
                  worker.availability
                    ? 'text-green-700'
                    : 'text-amber-700'
                }`}
              >
                {worker.availability
                  ? 'Available'
                  : 'Not available'}
              </p>
            </div>
          </div>

          <h2 className="mt-10 text-2xl font-bold">
            Jobs matching your skill and location
          </h2>

          <div className="mt-4">
            {jobs.loading && (
              <LoadingSpinner label="Loading jobs..." />
            )}

            {jobs.error && (
              <ErrorMessage
                message={jobs.error}
                onRetry={jobs.reload}
              />
            )}

            {!jobs.loading &&
              !jobs.error &&
              (jobs.data?.length ?? 0) === 0 && (
                <EmptyState
                  title="No matching jobs right now"
                  text="Check all available jobs to see other work."
                  action={
                    <Link
                      to="/jobs"
                      className="btn-primary"
                    >
                      Find Work
                    </Link>
                  }
                />
              )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.data?.map((j) => (
                <JobCard
                  key={j.jobId}
                  job={j}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}