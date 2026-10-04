// Express 4 does not automatically forward rejected async route promises.
export function asyncRouter(router) {
  for (const name of ['id', 'teamId', 'playerId']) router.param(name, (req, res, next, value) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return res.status(400).json({ error: 'Invalid identifier.' });
    next();
  });
  for (const layer of router.stack) {
    if (layer.route) {
      for (const routeLayer of layer.route.stack) wrap(routeLayer);
    } else if (layer.handle.stack) asyncRouter(layer.handle);
    else wrap(layer);
  }
  return router;
}
function wrap(layer) {
  const handler = layer.handle;
  if (handler.length === 4) return;
  layer.handle = function (req, res, next) {
    try { Promise.resolve(handler(req, res, next)).catch(next); } catch (error) { next(error); }
  };
}
