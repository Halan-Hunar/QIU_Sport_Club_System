import { Link } from 'react-router-dom';
import EventCredits from './EventCredits';

export default function NewsCard({ article }) {
  return (
    <Link to={`/events/${article.id}`} className="sc-card overflow-hidden group flex flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      {article.cover_url ? <img src={article.cover_url} alt={article.cover_alt || ''} loading="lazy" decoding="async"
        className="w-full aspect-[16/10] object-cover group-hover:opacity-90 transition-opacity" />
        : <div className="aspect-[16/10] bg-hero-deep" />}
      <div className="p-5 sm:p-6">
        <h3 className="text-headline-md mt-2 group-hover:text-primary break-words">{article.title}</h3>
        <EventCredits article={article} className="mt-3" />
        <p className="text-ink-variant text-sm mt-3 leading-relaxed line-clamp-3">{article.excerpt}</p>
      </div>
    </Link>
  );
}
