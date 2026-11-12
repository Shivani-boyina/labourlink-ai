
import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { USE_MOCK } from './services/api';

import Home from './pages/Home';
import Login from './pages/Login';
import WorkerRegister from './pages/WorkerRegister';
import ContractorRegister from './pages/ContractorRegister';
import Jobs from './pages/Jobs';
import JobDetails from './pages/JobDetails';
import CreateJob from './pages/CreateJob';
import WorkerDashboard from './pages/WorkerDashboard';
import WorkerProfile from './pages/WorkerProfile';
import ContractorDashboard from './pages/ContractorDashboard';
import ContractorProfile from './pages/ContractorProfile';
import JobMatches from './pages/JobMatches';
import WorkerSearch from './pages/WorkerSearch';
import ContractorSearch from './pages/ContractorSearch';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to content
      </a>

      {USE_MOCK && (
        <div
          role="status"
          className="bg-safety-400 px-4 py-2 text-center text-sm font-semibold text-navy-900"
        >
          Sample data mode is ON. Jobs and workers shown are not real.
        </div>
      )}

      <Navbar />

      <main id="main" className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />
          <Route path="/worker/login" element={<Login />} />

          <Route
            path="/worker/register"
            element={<WorkerRegister />}
          />

          <Route
            path="/contractor/register"
            element={<ContractorRegister />}
          />

          <Route
            path="/worker/dashboard"
            element={
              <ProtectedRoute allowedRole="worker">
                <WorkerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/worker/profile"
            element={
              <ProtectedRoute allowedRole="worker">
                <WorkerProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/contractor/dashboard"
            element={
              <ProtectedRoute allowedRole="contractor">
                <ContractorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/contractor/profile"
            element={
              <ProtectedRoute allowedRole="contractor">
                <ContractorProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workers/search"
            element={
              <ProtectedRoute allowedRole="contractor">
                <WorkerSearch />
              </ProtectedRoute>
            }
          />

          <Route
            path="/contractors/search"
            element={
              <ProtectedRoute allowedRole="worker">
                <ContractorSearch />
              </ProtectedRoute>
            }
          />

          <Route path="/jobs" element={<Jobs />} />

          <Route
            path="/jobs/:id"
            element={<JobDetails />}
          />

          <Route
            path="/jobs/:id/matches"
            element={
              <ProtectedRoute allowedRole="contractor">
                <JobMatches />
              </ProtectedRoute>
            }
          />

          <Route
            path="/contractor/jobs/create"
            element={
              <ProtectedRoute allowedRole="contractor">
                <CreateJob />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
