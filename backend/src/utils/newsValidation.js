import { z } from 'zod';

export const mediaPathPattern = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i;
const mediaPath = z.string().regex(mediaPathPattern, 'Upload a news image first.');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}, 'Enter a valid date.');

export const articleSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title.').max(180),
  author: z.string().trim().max(100),
  organiser: z.enum(['musa', 'shad', 'dyako']).nullable().default(null),
  co_organiser: z.enum(['halan']).nullable().default(null),
  article_date: date,
  cover_path: mediaPath.nullable(),
  cover_alt: z.string().trim().max(240),
  body: z.string().max(60000),
  status: z.enum(['draft', 'published']),
}).strict().superRefine((article, ctx) => {
  if (article.status !== 'published') return;
  for (const [field, valid, message] of [
    ['author', article.author.length > 0, 'Add an author before publishing.'],
    ['cover_path', !!article.cover_path, 'Add a cover image before publishing.'],
    ['body', article.body.trim().length > 0, 'Write the article before publishing.'],
  ]) if (!valid) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
});

export function mediaPaths(article) {
  const paths = new Set(article.cover_path ? [article.cover_path] : []);
  for (const match of (article.body ?? '').matchAll(/\/news-media\/([0-9a-f-]{36}\/[0-9a-f-]{36}\.webp)/gi)) {
    paths.add(match[1]);
  }
  return [...paths];
}

export function excerpt(body) {
  return body.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, '').replace(/[#*_>`~]/g, '')
    .replace(/\s+/g, ' ').trim().slice(0, 200);
}
