import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export default function Field({ id, label, error, hint, children }: Props) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs font-medium text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-err`}
          role="alert"
          className="flex items-center gap-1.5 text-sm font-semibold text-red-600"
        >
          <AlertCircle size={15} className="shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export const fieldProps = (id: string, error?: string) => ({
  id,
  className: `input ${error ? 'input-error' : ''}`,
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-err` : undefined,
});
