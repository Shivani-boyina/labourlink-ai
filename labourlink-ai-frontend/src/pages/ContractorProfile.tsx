import { Building2, MapPin, Phone, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { getContractors } from '../services/contractorService';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../utils/useFetch';

export default function ContractorProfile() {
  const { session } = useAuth();
  const contractorId = session?.contractorId ?? null;

  const { data: contractors, loading, error, reload } = useFetch(
    getContractors,
    []
  );

  const contractor = contractors?.find(
    (item) => item.contractorId === contractorId
  );

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="card text-center">
          <h1 className="text-2xl font-bold">
            Contractor Login Required
          </h1>

          <p className="mt-2 text-slate-600">
            Please log in to view your contractor profile.
          </p>

          <Link
            to="/login"
            className="btn-primary mt-5 inline-block"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Contractor Profile
        </h1>

        <p className="mt-1 text-slate-600">
          Your LabourLink AI contractor profile
        </p>
      </div>

      {loading && (
        <LoadingSpinner label="Loading your profile..." />
      )}

      {error && (
        <ErrorMessage
          message={error}
          onRetry={reload}
        />
      )}

      {!loading && !error && !contractor && (
        <EmptyState
          title="Profile not found"
          text="We could not load your contractor profile."
        />
      )}

      {contractor && (
        <>
          <div className="card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {contractor.contractorName}
                </h2>

                <p className="mt-1 text-slate-600">
                  Contractor ID: {contractor.contractorId}
                </p>
              </div>

              <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
                Registered Contractor
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <Building2 size={18} aria-hidden />
                Company
              </p>

              <p className="mt-2 text-lg font-semibold">
                {contractor.companyName || 'Not provided'}
              </p>
            </div>

            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <Phone size={18} aria-hidden />
                Phone
              </p>

              <p className="mt-2 text-lg font-semibold">
                {contractor.phone}
              </p>
            </div>

            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <MapPin size={18} aria-hidden />
                Location
              </p>

              <p className="mt-2 text-lg font-semibold">
                {contractor.location || 'Not provided'}
              </p>
            </div>

            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <Briefcase size={18} aria-hidden />
                Contractor ID
              </p>

              <p className="mt-2 text-lg font-semibold">
                {contractor.contractorId}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              to="/contractor/dashboard"
              className="btn-primary"
            >
              Dashboard
            </Link>

            <Link
              to="/contractor/jobs/create"
              className="btn-outline"
            >
              Create Job
            </Link>
          </div>
        </>
      )}
    </div>
  );
}