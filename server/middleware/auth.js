const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

function signToken(user) {
  return jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: `${config.jwtDays}d` });
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.jwtDays * 86400 * 1000,
  });
}

// Attaches req.user if a valid token exists (does not block)
function loadUser(req, _res, next) {
  const token = req.cookies && req.cookies.token;
  if (token) {
    try {
      const { id } = jwt.verify(token, config.jwtSecret);
      const user = db.prepare('SELECT id,name,email,role,phone,address,city FROM users WHERE id=?').get(id);
      if (user) req.user = user;
    } catch { /* invalid/expired token -> treated as guest */ }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in first.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in first.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access only.' });
  next();
}

module.exports = { signToken, setAuthCookie, loadUser, requireAuth, requireAdmin };
