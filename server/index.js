const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');
const db = require('./db'); // eslint-disable-line no-unused-vars
const { loadUser } = require('./middleware/auth');

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'https:'],
      'script-src': ["'self'"],
      'script-src-attr': ["'none'"],
      'upgrade-insecure-requests': config.isProd ? [] : null,
    },
  },
}));
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(loadUser);

// CSRF defence for state-changing API calls: cookie is SameSite=Lax and we also
// require a custom header that cross-site forms/images cannot send.
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.get('X-Requested-With') !== 'zayoor') {
    return res.status(403).json({ error: 'Invalid request.' });
  }
  next();
});

app.get('/api/config', (_req, res) => res.json(config.store));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/catalog'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

app.use('/uploads', express.static(config.paths.uploads, { maxAge: '7d', index: false, dotfiles: 'deny' }));
app.use(express.static(config.paths.public, { extensions: ['html'], maxAge: config.isProd ? '1h' : 0 }));
app.use((_req, res) => res.status(404).sendFile(path.join(config.paths.public, '404.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed request.' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image is too large (max 3 MB).' });
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side.' });
});

if (require.main === module) {
  app.listen(config.port, () => console.log(`${config.store.name} running at http://localhost:${config.port}`));
}
module.exports = app;
