import type { ReactNode } from 'react';

interface Props { id: string; label: string; error?: string; hint?: string; children: ReactNode }

export default function Field({ id, label, error, hint, children }: Props) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-sm text-slate-500">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}

export const fieldProps = (id: string, error?: string) => ({
  id,
  className: `input ${error ? 'input-error' : ''}`,
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-err` : undefined,
});
