import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-12 text-lg text-slate-600">
      <Loader2 className="animate-spin" aria-hidden /> {label}
    </div>
  );
}
