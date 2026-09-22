import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { newsRequest } from '../lib/news';
import NewsArticle from '../components/NewsArticle';

export default function NewsDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setArticle(null); setError('');
    const load = () => newsRequest(`/${id}`).then((data) => {
      if (active) { setArticle(data.article); setError(''); }
    }).catch((e) => { if (active) { setArticle(null); setError(e.message); } });
    load();
    // Renew private image URLs and stop showing articles that are unpublished.
    const timer = setInterval(load, 240000);
    window.addEventListener('focus', load);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); };
  }, [id]);
  return <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
    <Link to="/events" className="text-primary underline underline-offset-4">Back to Club Events</Link>
    {error ? <p role="alert" className="sc-card p-8 mt-6">{error}</p>
      : article ? <NewsArticle article={article} /> : <p role="status" className="py-12">Loading article…</p>}
  </div>;
}
