import { z } from 'zod';

const id = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const detail = new RegExp(`^/(events|news|tournaments|club/heads|matches)/(${id})(/stats)?$`, 'i');
export function pageIdentity(path) {
  if (['/', '/events', '/news', '/club/heads', '/tournaments', '/teams', '/stats'].includes(path)) {
    return { path: path === '/news' ? '/events' : path, kind: 'page', resource_id: null };
  }
  const match = detail.exec(path);
  if (!match || (match[3] && match[1] !== 'tournaments')) return null;
  const section = match[1] === 'news' ? 'events' : match[1];
  return { path: `/${section}/${match[2].toLowerCase()}${match[3] || ''}`,
    kind: section === 'events' ? 'article' : section === 'tournaments' ? 'tournament' : section === 'matches' ? 'match' : 'head',
    resource_id: match[2].toLowerCase() };
}
export const eventSchema = z.object({
  event_id: z.string().uuid(), session_id: z.string().uuid(),
  path: z.string().max(150).refine((value) => !!pageIdentity(value)),
  source: z.enum(['Direct / unknown', 'Google', 'Instagram', 'Facebook', 'Bing', 'Other websites']),
  device: z.enum(['Mobile', 'Desktop', 'Tablet']),
  active_seconds: z.number().int().min(0).max(1800),
  scroll_depth: z.number().int().min(0).max(100),
}).strict();
export function reportRange(query, now = new Date()) {
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v);
  const parsed = z.object({ from: date, to: date }).strict().safeParse(query);
  if (!parsed.success) return null;
  const { from, to } = parsed.data;
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  const today = new Date(now.getTime() + 3 * 3600000).toISOString().slice(0, 10);
  if (days < 1 || days > 90 || to > today || from < new Date(Date.parse(today) - 89 * 86400000).toISOString().slice(0, 10)) return null;
  return { from, to, days };
}
