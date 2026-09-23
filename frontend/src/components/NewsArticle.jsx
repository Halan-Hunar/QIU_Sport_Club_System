import ArticleBody from './ArticleBody';
import EventCredits from './EventCredits';

export default function NewsArticle({ article }) {
  return (
    <article>
      <header className="max-w-3xl mx-auto py-6 sm:py-10">
        <p className="text-primary font-medium">Club Events</p>
        <h1 className="text-3xl sm:text-5xl leading-tight mt-3 break-words">{article.title || 'Untitled article'}</h1>
        {article.cover_alt && article.cover_alt !== article.title && <p className="mt-4 text-lg leading-relaxed text-ink-variant">{article.cover_alt}</p>}
        <EventCredits article={article} className="mt-5" />
      </header>
      {article.cover_url && <img src={article.cover_url} alt={article.title || ''}
        className="w-full max-w-3xl mx-auto max-h-[432px] aspect-[16/9] object-cover rounded-md" fetchPriority="high" />}
      <ArticleBody body={article.body} media={article.media} />
    </article>
  );
}
