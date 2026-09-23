import { ORGANISERS, CO_ORGANISERS } from '../constants/organisers';
import { formatNewsDate } from '../lib/news';

export default function EventCredits({ article, className = '' }) {
  const organiser = ORGANISERS.find((person) => person.id === article.organiser);
  const coOrganiser = CO_ORGANISERS.find((person) => person.id === article.co_organiser);
  return <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-variant ${className}`}>
    {organiser && <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border font-medium ${organiser.className}`}>
      <span className="text-xs">Head of Club:</span> {organiser.name}</span>}
    {coOrganiser && <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border font-medium ${coOrganiser.className}`}>
      <span className="text-xs">Co-organizer:</span> {coOrganiser.name}</span>}
    {article.event_date && <span className="text-sm font-medium">Event: {formatNewsDate(article.event_date)}</span>}
    <span className="text-xs">Author: {article.author || 'Club editor'}</span>
    <time className="text-xs" dateTime={article.article_date}>Article: {formatNewsDate(article.article_date)}</time>
  </div>;
}
