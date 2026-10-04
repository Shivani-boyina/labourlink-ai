import { Link } from 'react-router-dom';
import { ArrowLeftRight, Briefcase, Building2, HardHat, MapPin, Search, ShieldCheck, Users, UserCheck } from 'lucide-react';

const features = [
  { icon: Search, title: 'Skill-based matching', text: 'Jobs list the skill needed. Workers are matched by skill.' },
  { icon: MapPin, title: 'Location-based work', text: 'Find jobs in your area, such as Benz Circle, Vijayawada.' },
  { icon: UserCheck, title: 'Worker availability', text: 'Only workers marked available are shown to contractors.' },
  { icon: Users, title: 'Workforce management', text: 'Contractors post jobs and see eligible workers in one place.' },
];
const steps = ['Worker registers', 'Finds suitable jobs', 'Contractor posts jobs', 'Matching workers shown', 'Workforce connection'];

export default function Home() {
  return (
    <>
      <section className="bg-navy-900 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">Find the Right Work. Find the Right Workforce.</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-200">
              LabourLink AI connects daily-wage workers with construction contractors through structured job discovery and workforce matching.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link to="/jobs" className="btn-accent">Find Work</Link>
              <Link to="/login" className="btn border-2 border-white text-white hover:bg-white/10">Hire Workers</Link>
              <Link to="/worker/register" className="btn border-2 border-white/40 text-white hover:bg-white/10">Register as Worker</Link>
              <Link to="/contractor/register" className="btn border-2 border-white/40 text-white hover:bg-white/10">Register as Contractor</Link>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 text-navy-900" aria-label="Workers, jobs and contractors are connected">
            <div className="flex items-center justify-between gap-2 text-center">
              <div className="flex flex-col items-center gap-2"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-50"><HardHat size={30} aria-hidden /></span><span className="font-semibold">Workers</span></div>
              <ArrowLeftRight className="text-safety-600" aria-hidden />
              <div className="flex flex-col items-center gap-2"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-safety-400"><Briefcase size={30} aria-hidden /></span><span className="font-semibold">Jobs</span></div>
              <ArrowLeftRight className="text-safety-600" aria-hidden />
              <div className="flex flex-col items-center gap-2"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-50"><Building2 size={30} aria-hidden /></span><span className="font-semibold">Contractors</span></div>
            </div>
            <div className="hazard my-5 h-3 rounded" aria-hidden />
            <p className="flex items-center gap-2 text-sm text-slate-600"><ShieldCheck size={18} aria-hidden /> Matching uses clear rules: skill, location and availability. Workers are ranked by experience.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h2 className="text-3xl font-bold">What LabourLink AI gives you</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <Icon className="text-navy-700" aria-hidden />
              <h3 className="mt-3 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h2 className="text-3xl font-bold">How it works</h2>
        <ol className="mt-6 grid gap-3 md:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s} className="card flex items-center gap-3 md:flex-col md:text-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-800 font-bold text-white">{i + 1}</span>
              <span className="font-semibold">{s}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
