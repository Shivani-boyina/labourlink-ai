import { AlertCircle } from 'lucide-react';

interface Props { message: string; onRetry?: () => void }

export default function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center">
      <AlertCircle className="shrink-0" aria-hidden />
      <p className="flex-1">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="btn-danger !py-2">Try again</button>}
    </div>
  );
}
