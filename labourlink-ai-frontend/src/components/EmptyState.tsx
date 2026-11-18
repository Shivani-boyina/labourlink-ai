import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface Props {
  title: string;
  text?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, text, action }: Props) {
  return (
    <div className="card flex flex-col items-center gap-3 py-12 px-6 text-center border-2 border-dashed border-slate-300 bg-slate-50/50">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
        <Inbox size={32} aria-hidden />
      </div>
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      {text && <p className="max-w-md text-base text-slate-600">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
