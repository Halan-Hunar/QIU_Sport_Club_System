import Markdown, { defaultUrlTransform } from 'react-markdown';

export default function ArticleBody({ body, media }) {
  return (
      <div className="news-body max-w-3xl mx-auto py-8 sm:py-12">
        <Markdown skipHtml urlTransform={defaultUrlTransform}
          allowedElements={['p','h2','h3','h4','strong','em','blockquote','ul','ol','li','a','img','br','hr','code','pre']}
          unwrapDisallowed components={{
            img: ({ src, alt }) => {
              const path = src?.startsWith('/news-media/') ? src.slice('/news-media/'.length) : null;
              const url = path && media?.[path];
              return url ? <img src={url} alt={alt || ''} loading="lazy" decoding="async" /> : <span className="text-ink-muted">[Image unavailable]</span>;
            },
            a: ({ href, children }) => {
              const safe = href && /^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href);
              return safe ? <a href={href} rel="noopener noreferrer">{children}</a> : <span>{children}</span>;
            },
          }}>{body || ''}</Markdown>
      </div>
  );
}
