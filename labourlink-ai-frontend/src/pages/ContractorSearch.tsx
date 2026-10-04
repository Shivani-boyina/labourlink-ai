import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { getContractors } from '../services/contractorService';
import { useFetch } from '../utils/useFetch';
import type { Contractor } from '../types/Contractor';

export default function ContractorSearch() {
  const [location, setLocation] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');

  const { data, loading, error, reload } = useFetch(
    getContractors,
    []
  );

  const contractors = (data ?? []).filter((contractor: Contractor) => {
    if (!appliedLocation.trim()) {
      return true;
    }

    return (contractor.location ?? '')
      .toLowerCase()
      .includes(appliedLocation.trim().toLowerCase());
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setAppliedLocation(location);
  }

  function clear() {
    setLocation('');
    setAppliedLocation('');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Find Contractors</h1>

      <p className="mt-2 text-slate-600">
        Search contractors by location.
      </p>

      <form
        onSubmit={submit}
        className="card mt-5 grid gap-4 sm:grid-cols-2"
        aria-label="Search contractors"
      >
        <div>
          <label htmlFor="contractor-location" className="label">
            Location
          </label>

          <input
            id="contractor-location"
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

          <button
            type="button"
            onClick={clear}
            className="btn-outline"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="mt-6">
        {loading && (
          <LoadingSpinner label="Loading contractors..." />
        )}

        {error && (
          <ErrorMessage
            message={error}
            onRetry={reload}
          />
        )}

        {!loading &&
          !error &&
          contractors.length === 0 && (
            <EmptyState
              title="No contractors found"
              text="Try a different location."
            />
          )}

        {!loading &&
          !error &&
          contractors.length > 0 && (
            <>
              <p className="mb-3 text-slate-600">
                {contractors.length} contractor
                {contractors.length > 1 ? 's' : ''} found
              </p>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {contractors.map((contractor) => (
                  <div
                    key={contractor.contractorId}
                    className="card"
                  >
                    <h2 className="text-xl font-semibold">
                      {contractor.contractorName}
                    </h2>

                    {contractor.companyName && (
                      <p className="mt-1 text-slate-700">
                        {contractor.companyName}
                      </p>
                    )}

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p>
                        <strong>Phone:</strong>{' '}
                        {contractor.phone}
                      </p>

                      {contractor.location && (
                        <p>
                          <strong>Location:</strong>{' '}
                          {contractor.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
      </div>
    </div>
  );
}