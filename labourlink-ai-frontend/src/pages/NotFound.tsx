import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="font-display text-7xl font-bold text-safety-500">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page Not Found</h1>
      <p className="mt-2 text-slate-600">This page does not exist or was moved.</p>
      <Link to="/" className="btn-primary mt-6">Back to Home</Link>
    </div>
  );
}
