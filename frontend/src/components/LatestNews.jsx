import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { newsRequest } from '../lib/news';
import NewsCard from './NewsCard';

export default function LatestNews() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => newsRequest('?limit=3').then((data) => {
      if (active) { setArticles(data.articles); setError(''); }
    }).catch(() => { if (active) { setArticles([]); setError('Club Events is temporarily unavailable.'); } })
      .finally(() => { if (active) setLoading(false); });
    load();
    const timer = setInterval(load, 240000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <section className="mt-10" aria-labelledby="latest-news-heading">
    <div className="flex justify-between items-center gap-4 mb-4">
      <h2 id="latest-news-heading" className="text-headline-md">Club Events</h2>
      <Link to="/events" className="text-primary font-medium underline underline-offset-4">All events</Link>
    </div>
    {loading ? <p role="status" className="text-ink-muted">Loading club events…</p>
      : error ? <p role="status" className="text-ink-muted">{error}</p>
      : articles.length ? <div className="grid md:grid-cols-3 gap-5">{articles.map((article) => <NewsCard key={article.id} article={article} />)}</div>
      : <p className="text-ink-muted">Club stories and announcements will appear here.</p>}
  </section>;
}
