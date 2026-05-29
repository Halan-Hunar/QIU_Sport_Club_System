import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-[6rem] leading-none text-primary/20 select-none">404</p>
      <h1 className="font-display text-headline-lg text-ink mt-4">Page not found</h1>
      <p className="text-ink-variant mt-2 max-w-sm">
        The page you're looking for doesn't exist or was moved.
      </p>
      <Link to="/" className="sc-btn-primary mt-8">
        Back to Home
      </Link>
    </div>
  );
}
