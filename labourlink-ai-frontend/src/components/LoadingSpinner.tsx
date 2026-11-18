import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ label = 'Loading, please wait...' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-14 text-base font-semibold text-slate-700"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
      </div>
      <span>{label}</span>
    </div>
  );
}
