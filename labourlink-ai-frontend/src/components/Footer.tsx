import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-16 bg-navy-900 text-slate-300">
      <div className="hazard h-2" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="font-display text-xl font-bold text-white">LabourLink AI</p>
          <p className="mt-2 text-sm">Connecting daily-wage workers with suitable construction opportunities.</p>
        </div>
        <div>
          <p className="mb-2 font-semibold text-white">For Workers</p>
          <ul className="space-y-1 text-sm">
            <li><Link className="hover:text-white" to="/worker/register">Register as Worker</Link></li>
            <li><Link className="hover:text-white" to="/jobs">Find Work</Link></li>
            <li><Link className="hover:text-white" to="/worker/dashboard">My Profile</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-semibold text-white">For Contractors</p>
          <ul className="space-y-1 text-sm">
            <li><Link className="hover:text-white" to="/contractor/register">Register as Contractor</Link></li>
            <li><Link className="hover:text-white" to="/login">Login</Link></li>
            <li><Link className="hover:text-white" to="/contractor/jobs/create">Create Job</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-semibold text-white">Project</p>
          <p className="text-sm">B.Tech IT EPICS project. Workforce allocation using rule-based matching. Machine learning is planned for a future version.</p>
        </div>
      </div>
    </footer>
  );
}
