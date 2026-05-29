import { useNavigate } from 'react-router-dom';

export default function Declined() {
  const navigate = useNavigate();

  const goBack = () => {
    localStorage.removeItem('consent');
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <h1 className="font-display text-headline-lg text-ink leading-tight">
          Access declined
        </h1>
        <p className="text-ink-variant mt-3 leading-relaxed">
          You must accept the terms to use this platform.
        </p>
        <button
          type="button"
          onClick={goBack}
          className="sc-btn-secondary !py-2 !px-4 mt-6"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
