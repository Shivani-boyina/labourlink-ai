import { useTranslation } from 'react-i18next';

export default function WorkerRating({ average, count }: { average?: number | null; count?: number }) {
  const { t, i18n } = useTranslation();
  if (average == null || !count) return <p className="text-sm text-slate-600">{t('review.unrated')}</p>;
  const rating = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(average);
  return <p className="text-sm font-medium text-slate-800">{t('review.ratingSummary', { rating, count })}</p>;
}
