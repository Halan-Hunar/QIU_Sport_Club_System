import Markdown, { defaultUrlTransform } from 'react-markdown';
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
      <div className="news-body max-w-3xl mx-auto py-8 sm:py-12">
        <Markdown skipHtml urlTransform={defaultUrlTransform}
          allowedElements={['p','h2','h3','h4','strong','em','blockquote','ul','ol','li','a','img','br','hr','code','pre']}
          unwrapDisallowed components={{
            img: ({ src, alt }) => {
              const path = src?.startsWith('/news-media/') ? src.slice('/news-media/'.length) : null;
              const url = path && article.media?.[path];
              return url ? <img src={url} alt={alt || ''} loading="lazy" decoding="async" /> : <span className="text-ink-muted">[Image unavailable]</span>;
            },
            a: ({ href, children }) => {
              const safe = href && /^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href);
              return safe ? <a href={href} rel="noopener noreferrer">{children}</a> : <span>{children}</span>;
            },
          }}>{article.body || ''}</Markdown>
      </div>
    </article>
  );
}
