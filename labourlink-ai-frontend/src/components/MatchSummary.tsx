import { useTranslation } from 'react-i18next';

const notices: Record<string, string> = {
  MODEL_UNAVAILABLE: 'mlMatching.modelUnavailable',
  FEATURES_UNAVAILABLE: 'mlMatching.featuresUnavailable',
  SCORING_LIMIT: 'mlMatching.scoringLimit',
};

interface MatchSummaryProps {
  score?: number | null;
  recommendation?: {
    method: 'ML' | 'RULE_BASED';
    matchPercentage: number | null;
    fallbackReason: string | null;
    featureIssues?: Array<{ feature: string; reason: string }>;
  } | null;
  reasons?: string[] | null;
}

export default function MatchSummary({ score, recommendation, reasons }: MatchSummaryProps) {
  const { t, i18n } = useTranslation();
  const mlScore = recommendation?.method === 'ML' ? recommendation.matchPercentage : null;
  const value = mlScore ?? score;
  const label = t(mlScore != null ? 'dashboardMatching.mlScore' : 'dashboardMatching.ruleScore');
  const notice = recommendation?.fallbackReason && notices[recommendation.fallbackReason];

  return (
    <div className="space-y-1 rounded-xl bg-blue-50 p-3 text-sm text-blue-950">
      <p className="font-semibold">
        {label}
        {value != null && ' · ' + new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(value) + '%'}
      </p>
      {value != null && <progress className="block h-2 w-full accent-blue-700" max={100} value={value} aria-label={label} />}
      <p>{reasons?.length ? reasons.map((reason) => t('mlMatching.reasons.' + reason)).join(' · ') : t('dashboardMatching.baseExplanation')}</p>
      {notice && <p>{t(notice)}</p>}
      {!!recommendation?.featureIssues?.length && (
        <ul className="list-disc pl-5">
          {recommendation.featureIssues.map(({ feature, reason }) => (
            <li key={feature}>{t('mlMatching.featureIssue.' + reason, { feature: t('mlMatching.features.' + feature) })}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
