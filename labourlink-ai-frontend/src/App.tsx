
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute, { GuestOnly } from './components/ProtectedRoute';
import { USE_MOCK } from './services/api';

import Home from './pages/Home';
import Login from './pages/Login';
import WorkerRegister from './pages/WorkerRegister';
import ContractorRegister from './pages/ContractorRegister';
import Jobs from './pages/Jobs';
import JobDetails from './pages/JobDetails';
import CreateJob from './pages/CreateJob';
import WorkerDashboard from './pages/WorkerDashboard';
import WorkerApplications from './pages/WorkerApplications';
import WorkerProfile from './pages/WorkerProfile';
import ContractorDashboard from './pages/ContractorDashboard';
import ContractorProfile from './pages/ContractorProfile';
import ContractorHiringHistory from './pages/ContractorHiringHistory';
import Allocations from './pages/Allocations';
import Replacements from './pages/Replacements';
import WorkerReviews from './pages/WorkerReviews';
import JobMatches from './pages/JobMatches';
import WorkerSearch from './pages/WorkerSearch';
import ContractorSearch from './pages/ContractorSearch';
import NotFound from './pages/NotFound';
import EmploymentAnalytics from './pages/EmploymentAnalytics';
import Chatbot from './components/Chatbot';
import ReadPageButton from './components/ReadPageButton';

export default function App() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
      >
        {t('common.skipToContent')}
      </a>

      {USE_MOCK && (
        <div
          role="status"
          className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-center text-sm font-semibold text-blue-900"
        >
          {t('common.sampleDataNotice')}
        </div>
      )}

      <Navbar />

      <main id="main" className="flex-1">
        <Routes>
          <Route path="/contractor/analytics" element={<ProtectedRoute allowedRole="contractor"><EmploymentAnalytics /></ProtectedRoute>} />
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/worker/login" element={<GuestOnly><Login /></GuestOnly>} />

          <Route
            path="/worker/register"
            element={<GuestOnly><WorkerRegister /></GuestOnly>}
          />

          <Route
            path="/contractor/register"
            element={<GuestOnly><ContractorRegister /></GuestOnly>}
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
            path="/worker/applications"
            element={
              <ProtectedRoute allowedRole="worker">
                <WorkerApplications />
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
            path="/contractor/hiring-history"
            element={
              <ProtectedRoute allowedRole="contractor">
                <ContractorHiringHistory />
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

          <Route
            path="/contractor/jobs/:id/edit"
            element={
              <ProtectedRoute allowedRole="contractor">
                <CreateJob />
              </ProtectedRoute>
            }
          />

          <Route path="/contractor/allocations" element={
            <ProtectedRoute allowedRole="contractor"><Allocations role="contractor" /></ProtectedRoute>
          } />
          <Route path="/worker/attendance" element={
            <ProtectedRoute allowedRole="worker"><Allocations role="worker" /></ProtectedRoute>
          } />
          <Route path="/contractor/replacements" element={
            <ProtectedRoute allowedRole="contractor"><Replacements role="contractor" /></ProtectedRoute>
          } />
          <Route path="/worker/replacements" element={
            <ProtectedRoute allowedRole="worker"><Replacements role="worker" /></ProtectedRoute>
          } />
          <Route path="/contractor/reviews" element={
            <ProtectedRoute allowedRole="contractor"><WorkerReviews role="contractor" /></ProtectedRoute>
          } />
          <Route path="/worker/reviews" element={
            <ProtectedRoute allowedRole="worker"><WorkerReviews role="worker" /></ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      <Chatbot />
      <ReadPageButton />
    </div>
  );
}
