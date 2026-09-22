const entries = new Map();
let generation = 0;
export function clearPublicCache() { generation += 1; entries.clear(); }
// Memory only. Mutations invalidate entries. Never used for auth or news.
export function cachedPublicJson(key, fetcher, ttl = 15000) {
  const existing = entries.get(key);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const started = generation;
  const entry = { expires: Infinity, promise: null };
  entry.promise = fetcher().then((value) => {
    if (started === generation) entry.expires = Date.now() + ttl;
    return value;
  }).catch((error) => {
    if (entries.get(key) === entry) entries.delete(key);
    throw error;
  });
  entries.set(key, entry);
  return entry.promise;
}
