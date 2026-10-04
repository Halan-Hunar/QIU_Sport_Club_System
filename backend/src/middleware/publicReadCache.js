// Short process-local cache for expensive, identical public summaries.
// No authentication, drafts, player details, or analytics responses are cached.
export function publicReadCache({ ttl = 10000, now = Date.now } = {}) {
  const paths = new Set(['/api/stats', '/api/stats/latest-champion', '/api/match-events/stats', '/api/teams', '/api/tournaments']);
  const entries = new Map();
  let generation = 0;
  return (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.path.startsWith('/api/analytics') || req.path.startsWith('/api/auth')) return next();
      res.on('finish', () => { if (res.statusCode < 400) { generation++; entries.clear(); } });
      return next();
    }
    if (req.method !== 'GET' || !paths.has(req.path) || Object.keys(req.query).length) return next();
    const cached = entries.get(req.path);
    res.set('Cache-Control', 'no-store');
    if (cached && cached.expires > now()) return res.json(cached.body);
    const started = generation;
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200 && generation === started) entries.set(req.path, { body, expires: now() + ttl });
      return json(body);
    };
    next();
  };
}
