import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { newsRequest, formatNewsDate } from '../lib/news';

export default function NewsAdmin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setData(null); setError('');
    newsRequest(`/admin?page=${page}`).then((value) => { if (active) setData(value); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [page, attempt]);
  return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
    <Link to="/events" className="text-primary underline">View Club Events</Link>
    <header className="flex flex-wrap items-center justify-between gap-4 my-6">
      <div><h1 className="text-headline-lg">Manage events</h1><p className="text-ink-variant mt-2">Drafts are visible only to club admins.</p></div>
      <Link to="/admin/events/new" className="sc-btn-primary">Write an article</Link>
    </header>
    {error ? <div role="alert"><p>{error}</p><button className="sc-btn-secondary mt-3" onClick={() => setAttempt((n) => n + 1)}>Try again</button></div>
      : !data ? <p role="status">Loading your articles…</p>
      : !data.articles.length ? <p className="sc-card p-8">No articles yet. Start with a club announcement or match report.</p>
      : <div className="space-y-3">{data.articles.map((article) => <Link to={`/admin/events/${article.id}`} key={article.id}
        className="sc-card p-5 flex flex-wrap justify-between items-center gap-4 hover:border-primary">
        <div className="min-w-0"><h2 className="text-headline-md break-words">{article.title}</h2>
          <p className="text-sm text-ink-variant mt-1">{article.author || 'No author yet'} · {formatNewsDate(article.article_date)}</p></div>
        <span className={article.status === 'published' ? 'sc-chip-primary' : 'sc-chip-muted'}>{article.status}</span>
      </Link>)}</div>}
    {data && data.total > 12 && <nav aria-label="Article pages" className="flex gap-4 items-center mt-6">
      <button className="sc-btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page}</span><button className="sc-btn-secondary" disabled={page * 12 >= data.total} onClick={() => setPage(page + 1)}>Next</button>
    </nav>}
  </div>;
}
