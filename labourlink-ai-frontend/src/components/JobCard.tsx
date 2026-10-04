import { Link } from 'react-router-dom';
import { Hammer, IndianRupee, MapPin, Users } from 'lucide-react';
import type { Job } from '../types/Job';

export const StatusBadge = ({ status }: { status: string }) => {
  const open = status?.toUpperCase() === 'OPEN';
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${open ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'}`}>
      {status || 'UNKNOWN'}
    </span>
  );
};

export default function JobCard({ job }: { job: Job }) {
  return (
    <article className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold">{job.title}</h3>
        <StatusBadge status={job.status} />
      </div>
      <ul className="space-y-1.5 text-slate-700">
        <li className="flex items-center gap-2"><Hammer size={18} aria-hidden /> Skill: <strong>{job.requiredSkill}</strong></li>
        <li className="flex items-center gap-2"><MapPin size={18} aria-hidden /> <span className="sr-only">Location:</span> {job.location}</li>
        <li className="flex items-center gap-2 text-lg font-bold text-navy-900"><IndianRupee size={18} aria-hidden /> ₹{job.wagePerDay}/day</li>
        <li className="flex items-center gap-2"><Users size={18} aria-hidden /> {job.requiredWorkers} workers needed</li>
      </ul>
      <Link to={`/jobs/${job.jobId}`} className="btn-primary mt-auto">View Details</Link>
    </article>
  );
}
