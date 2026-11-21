import { useTranslation } from 'react-i18next';
import type { RecommendationDetails } from '../services/jobService';
import type { Job } from '../types/Job';
import MatchSummary from './MatchSummary';

export function orderJobsByMatch(jobs: Job[], details?: RecommendationDetails | null) {
  const scores = new Map(details?.recommendations.map(({ job, recommendation, matchingScore }) =>
    [job.jobId, recommendation?.matchPercentage ?? matchingScore]));
  return [...jobs].sort((left, right) => (scores.get(right.jobId) ?? -1) - (scores.get(left.jobId) ?? -1));
}

export default function JobMatchStatus({ id, details, loading }: {
  id: number;
  details?: RecommendationDetails | null;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const match = details?.recommendations.find(({ job }) => job.jobId === id);
  if (match) {
    return <MatchSummary score={match.matchingScore} recommendation={match.recommendation} reasons={match.matchingReasons} />;
  }
  const reason = details?.excludedJobs?.[id];
  return (
    <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-800">
      {reason ? <><strong>{t('dashboardMatching.ineligible')}</strong> · {t('dashboardMatching.exclusions.' + reason)}</>
        : t(loading ? 'workerDashboard.loadingJobs' : 'dashboardMatching.unscorable')}
    </p>
  );
}
