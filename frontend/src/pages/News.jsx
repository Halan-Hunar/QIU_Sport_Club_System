import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { newsRequest } from '../lib/news';
import NewsCard from '../components/NewsCard';

export default function News() {
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    const load = () => newsRequest(`?page=${page}`).then((result) => {
      if (active) { setData(result); setError(''); }
    }).catch((e) => { if (active) { setData(null); setError(e.message); } });
    load();
    const timer = setInterval(load, 240000);
    return () => { active = false; clearInterval(timer); };
  }, [page, attempt]);
  return <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
    <header className="flex flex-wrap justify-between items-start gap-5 mb-8">
      <div><h1 className="text-headline-lg sm:text-display-lg">Club Events</h1>
        <p className="text-ink-variant mt-2">Events, match reports, and stories from QIU Sports Club.</p></div>
      {user?.role === 'admin' && <Link className="sc-btn-primary" to="/admin/events">Manage events</Link>}
    </header>
    {error ? <div role="alert"><p>{error}</p><button className="sc-btn-secondary mt-4" onClick={() => setAttempt((n) => n + 1)}>Try again</button></div>
      : !data ? <p role="status">Loading articles…</p>
      : data.articles.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{data.articles.map((article) => <NewsCard key={article.id} article={article} />)}</div>
      : <div className="sc-card p-10 text-center"><h2 className="text-headline-md">The next story is on its way</h2><p className="text-ink-variant mt-2">Check back for club events and tournament highlights.</p></div>}
    {data && data.total > 12 && <nav aria-label="Event pages" className="flex justify-center items-center gap-4 mt-8">
      <button className="sc-btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page}</span><button className="sc-btn-secondary" disabled={page * 12 >= data.total} onClick={() => setPage(page + 1)}>Next</button>
    </nav>}
  </div>;
}
