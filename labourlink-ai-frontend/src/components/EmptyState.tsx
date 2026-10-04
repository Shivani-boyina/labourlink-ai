import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface Props { title: string; text?: string; action?: ReactNode }

export default function EmptyState({ title, text, action }: Props) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <Inbox className="text-slate-400" size={40} aria-hidden />
      <h3 className="text-xl font-semibold">{title}</h3>
      {text && <p className="max-w-md text-slate-600">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
