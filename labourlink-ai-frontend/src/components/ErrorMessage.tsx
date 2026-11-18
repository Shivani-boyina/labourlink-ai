import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: Props) {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border-2 border-red-200 bg-red-50/90 p-4 text-red-900 shadow-sm sm:flex-row sm:items-center"
    >
      <div className="flex items-center gap-2.5 flex-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <AlertCircle size={20} aria-hidden />
        </span>
        <p className="text-base font-medium">{message}</p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-danger shrink-0 !py-2 !px-4 !text-sm flex items-center gap-1.5"
        >
          <RefreshCw size={15} aria-hidden />
          <span>{t('common.tryAgain')}</span>
        </button>
      )}
    </div>
  );
}
