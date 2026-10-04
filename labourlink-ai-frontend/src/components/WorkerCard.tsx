import { Check, MapPin, Phone } from 'lucide-react';
import type { Worker } from '../types/Worker';
import type { Job } from '../types/Job';

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export default function WorkerCard({ worker, job }: { worker: Worker; job?: Job }) {
  const tags: string[] = [];
  if (job && same(worker.skill, job.requiredSkill)) tags.push('Skill match');
  if (job && same(worker.location, job.location)) tags.push('Location match');
  if (worker.availability) tags.push('Available');
  tags.push(`${worker.experience} years experience`);

  return (
    <article className="card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xl font-semibold">{worker.name}</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${worker.availability ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {worker.availability ? 'Available' : 'Not available'}
        </span>
      </div>
      <p className="mt-1 font-medium text-navy-700">{worker.skill}</p>
      <ul className="mt-2 space-y-1 text-slate-700">
        <li className="flex items-center gap-2"><Phone size={16} aria-hidden /> {worker.phone}</li>
        <li className="flex items-center gap-2"><MapPin size={16} aria-hidden /> {worker.location}</li>
      </ul>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Match reasons">
        {tags.map((t) => (
          <li key={t} className="flex items-center gap-1 rounded-full bg-navy-50 px-3 py-1 text-sm text-navy-800"><Check size={14} aria-hidden /> {t}</li>
        ))}
      </ul>
    </article>
  );
}
