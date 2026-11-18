import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home } from 'lucide-react';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center space-y-4">
      <p className="font-display text-8xl font-black text-blue-700">404</p>
      <h1 className="text-3xl font-extrabold text-slate-900">{t('notFound.title')}</h1>
      <p className="text-base text-slate-600 max-w-md mx-auto">{t('notFound.message')}</p>
      <div className="pt-2">
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <Home size={18} aria-hidden />
          <span>{t('notFound.home')}</span>
        </Link>
      </div>
    </div>
  );
}
