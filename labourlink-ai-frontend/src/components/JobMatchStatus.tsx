import { useTranslation } from 'react-i18next';
import type { RecommendationDetails } from '../services/jobService';
import type { Job } from '../types/Job';
import MatchSummary from './MatchSummary';

export function orderJobsByMatch(jobs: Job[], details?: RecommendationDetails | null) {
  if (!details) return jobs;
  const scores = new Map(details.recommendations.map(({ job, recommendation, matchingScore }) =>
    [job.jobId, recommendation?.matchPercentage ?? matchingScore]));
  return [...jobs].sort((left, right) => {
    const leftEligible = scores.has(left.jobId);
    const rightEligible = scores.has(right.jobId);
    if (leftEligible !== rightEligible) return rightEligible ? 1 : -1;
    const score = (id: number) => scores.get(id) ?? details.compatibility?.[id]?.rulesScore ?? -1;
    return score(right.jobId) - score(left.jobId) || left.jobId - right.jobId;
  });
}

export default function JobMatchStatus({ job, details, loading }: {
  job: Job;
  details?: RecommendationDetails | null;
  loading: boolean;
}) {
  const { t } = useTranslation();
  if (loading) return <p role="status">{t('workerDashboard.loadingJobs')}</p>;
  const match = details?.recommendations.find((row) => row.job.jobId === job.jobId);
  const compatibility = details?.compatibility?.[job.jobId];
  const reason = details?.excludedJobs?.[job.jobId];
  const eligibility = match ? t('dashboardMatching.eligible')
    : reason ? t('dashboardMatching.ineligible') + ' · ' + t(
      reason === 'WAGE' && job.wagePerDay != null ? 'dashboardMatching.wageBelowExpected' : 'dashboardMatching.exclusions.' + reason,
      { wage: job.wagePerDay },
    ) : undefined;

  return (
    <MatchSummary skill={compatibility?.skillMatch} eligibility={eligibility}
      score={match?.matchingScore ?? compatibility?.rulesScore} recommendation={match?.recommendation}
      reasons={match?.matchingReasons} showExplanation={!!match} />
  );
}
