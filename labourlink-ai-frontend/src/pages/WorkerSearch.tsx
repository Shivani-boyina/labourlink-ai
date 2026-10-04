import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import WorkerCard from '../components/WorkerCard';
import { searchWorkers } from '../services/workerService';
import { useFetch } from '../utils/useFetch';
import { SKILLS } from './WorkerRegister';

export default function WorkerSearch() {
  const [skill, setSkill] = useState('');
  const [location, setLocation] = useState('');
  const [applied, setApplied] = useState({
    skill: '',
    location: '',
  });

  const { data, loading, error, reload } = useFetch(
    () => searchWorkers(applied.skill || undefined, applied.location || undefined),
    [applied]
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    setApplied({ skill, location });
  }

  function clear() {
    setSkill('');
    setLocation('');
    setApplied({ skill: '', location: '' });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Find Workers</h1>
      <p className="mt-2 text-slate-600">
        Search available workers by skill and location.
      </p>

      <form
        onSubmit={submit}
        className="card mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Search workers"
      >
        <div>
          <label htmlFor="worker-skill" className="label">
            Skill
          </label>
          <select
            id="worker-skill"
            className="input"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          >
            <option value="">Any skill</option>
            {SKILLS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="worker-location" className="label">
            Location
          </label>
          <input
            id="worker-location"
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Vijayawada"
          />
        </div>

        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary flex-1">
            <Search size={18} aria-hidden />
            Search
          </button>

          <button type="button" onClick={clear} className="btn-outline">
            Clear
          </button>
        </div>
      </form>

      <div className="mt-6">
        {loading && <LoadingSpinner label="Loading workers..." />}

        {error && <ErrorMessage message={error} onRetry={reload} />}

        {!loading && !error && data && data.length === 0 && (
          <EmptyState
            title="No workers found"
            text="Try a different skill or location."
          />
        )}

        {!loading && !error && data && data.length > 0 && (
          <>
            <p className="mb-3 text-slate-600">
              {data.length} worker{data.length > 1 ? 's' : ''} found
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.map((worker) => (
                <WorkerCard key={worker.workerId} worker={worker} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}