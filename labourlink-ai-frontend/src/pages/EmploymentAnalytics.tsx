import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEmployment } from '../services/analyticsService';
import type { EmploymentDashboard, EmploymentSummary } from '../services/analyticsService';
import { errorMessage } from '../services/api';

const format = (value: number | null | undefined, suffix = '') => value == null ? 'Unavailable' : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
function EmploymentCharts({ data }: { data: EmploymentSummary }) {
  const employed = data.totalWorkers ? data.employedWorkers / data.totalWorkers * 100 : 0;
  const unemployed = data.totalWorkers ? data.unemployedWorkers / data.totalWorkers * 100 : 0;
  const maxHire = Math.max(1, ...data.trends.map(point => point.hires));
  const maxEmployment = Math.max(1, ...data.trends.map(point => point.datedAssignments));
  const points = data.trends.map((point, index) => `${30 + index / Math.max(1, data.trends.length - 1) * 540},${170 - point.datedAssignments / maxEmployment * 130}`).join(' ');
  return <div className="grid gap-5 lg:grid-cols-3">
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">Employment status</h2>
      <div role="img" aria-label={`${data.employedWorkers} employed, ${data.unemployedWorkers} unemployed, ${data.unknownWorkers} unknown`}
        className="mx-auto my-5 flex h-40 w-40 items-center justify-center rounded-full"
        style={{ background: data.totalWorkers ? `conic-gradient(#15803d 0% ${employed}%, #e2e8f0 ${employed}% ${employed + unemployed}%, #d97706 ${employed + unemployed}% 100%)` : '#e2e8f0' }}>
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white"><strong className="text-2xl">{data.totalWorkers}</strong><span className="text-xs">workers</span></div>
      </div><p className="text-sm"><span className="text-green-700">● Employed {data.employedWorkers}</span> · Unemployed {data.unemployedWorkers} · <span className="text-amber-700">Unknown {data.unknownWorkers}</span></p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">Daily hiring</h2>
      {!data.trends.some(point => point.hires > 0) && <p className="mt-3 text-sm text-slate-500">No hiring recorded in this period.</p>}
      <div className="mt-6 flex h-44 items-end gap-1 border-b border-slate-300" role="img" aria-label={`Daily hiring trend. ${data.trends.reduce((sum, day) => sum + day.hires, 0)} worker-day hires in this period.`}>
        {data.trends.map(point => <div key={point.date} className="flex h-full min-w-0 flex-1 items-end" title={`${point.date}: ${point.hires} hires`}><div className="w-full rounded-t bg-blue-600" style={{ height: `${point.hires / maxHire * 100}%` }} /></div>)}
      </div><p className="mt-3 flex justify-between text-xs text-slate-500"><span>{data.trends[0]?.date}</span><span>{data.trends[data.trends.length - 1]?.date}</span></p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">Dated assignment trend</h2>
      <svg viewBox="0 0 600 205" className="mt-4 w-full" role="img" aria-label={`Workers with dated assignments each day, maximum ${maxEmployment}`}>
        <line x1="30" y1="170" x2="580" y2="170" stroke="#94a3b8" />
        <polyline points={points} fill="none" stroke="#15803d" strokeWidth="4" />
        <text x="3" y="40" fontSize="18">{maxEmployment}</text><text x="3" y="174" fontSize="18">0</text>
      </svg><p className="text-xs text-slate-500">Recorded schedule coverage. Undated assignments are excluded.</p>
    </section>
    <details className="lg:col-span-3"><summary className="cursor-pointer text-sm font-semibold text-blue-700">View chart data</summary>
      <div className="max-h-64 overflow-auto"><table className="mt-3 w-full bg-white text-left text-sm"><thead><tr><th>Date</th><th>Hired workers</th><th>Dated assignments</th></tr></thead><tbody>{data.trends.map(point => <tr key={point.date}><td>{point.date}</td><td>{point.hires}</td><td>{point.datedAssignments}</td></tr>)}</tbody></table></div>
    </details>
  </div>;
}

export default function EmploymentAnalytics() {
  const [dashboard, setDashboard] = useState<EmploymentDashboard | null>(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    getEmployment(days).then(data => {
      if (active) setDashboard(data);
    }).catch(reason => { if (active) setError(errorMessage(reason)); });
    return () => { active = false; };
  }, [days, refresh]);
  const data = dashboard?.actual;
  const periodEmploymentRate = data && data.totalWorkers > 0 && data.trends.length > 0
    ? 100 * data.trends.reduce((total, day) => total + day.datedAssignments, 0)
      / (data.trends.length * data.totalWorkers)
    : null;
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 text-slate-900">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><Link to="/contractor/dashboard" className="text-sm text-blue-700">Back to dashboard</Link><h1 className="mt-2 text-3xl font-bold">Employment analytics</h1><p className="mt-2 text-slate-600">Track recorded employment and opportunities for continuous work.</p></div>
      <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold" onClick={() => setRefresh(value => value + 1)}>Refresh</button></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
    <label className="flex flex-wrap items-center gap-2 font-semibold">
      Period
      <select className="rounded-lg border border-slate-300 bg-white p-2" value={days}
        onChange={event => { setDashboard(null); setDays(Number(event.target.value)); }}>
        <option value={7}>Weekly (last 7 days)</option>
        <option value={30}>Monthly (last 30 days)</option>
      </select>
    </label>
    {!data ? <p role="status">{error ? 'Analytics could not load. Use Refresh to retry.' : 'Loading employment statistics…'}</p> : <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[
        ['Registered workers', format(data.totalWorkers)], ['Currently employed', format(data.employedWorkers)],
        ['Currently unemployed', format(data.unemployedWorkers)], ['Hired today', format(data.hiredToday)],
        ["Today’s hiring percentage", format(data.hiringPercentage, '%')], ['Current employment rate', format(data.employmentRate, '%')],
        [days === 7 ? 'Weekly employment percentage' : 'Monthly employment percentage', format(periodEmploymentRate, '%')],
        ['Unemployment rate', format(data.unemploymentRate, '%')], ['Workers with ML recommendations', format(data.workersWithMlRecommendations)],
      ].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-3 break-words text-3xl font-bold text-blue-900">{value}</p></div>)}</div>
      <p className="text-sm text-slate-600">The period percentage averages the daily share of registered workers with a dated assignment.</p>
      <p className="text-sm text-slate-600">Unknown employment status {data.unknownWorkers}. Average recorded unemployment duration {format(data.averageUnemploymentDays, ' days')} across {data.unemploymentDurationCoverage} workers with dated completed work. {data.recommendationMeasuredAt && `ML observation ${new Date(data.recommendationMeasuredAt).toLocaleString()}.`}</p>
      <EmploymentCharts data={data} />
      <details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold">Metric definitions and data coverage</summary><ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">{dashboard?.definitions.map(text => <li key={text}>{text}</li>)}</ul><p className="mt-4 text-xs text-slate-500">Updated {new Date(dashboard!.generatedAt).toLocaleString()} · {dashboard!.timezone}</p></details>
    </>}
  </div>;
}
