const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { signToken, setAuthCookie, requireAuth } = require('../middleware/auth');
const { HttpError, wrap, str, email, phone, password } = require('../middleware/util');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, address: u.address, city: u.city });

router.post('/register', limiter, wrap((req, res) => {
  const name = str(req.body.name, { min: 2, max: 80, field: 'Name' });
  const mail = email(req.body.email);
  const pass = password(req.body.password);
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(mail)) throw new HttpError(409, 'An account with this email already exists.');
  const info = db.prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)').run(name, mail, bcrypt.hashSync(pass, 12));
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);
  setAuthCookie(res, signToken(user));
  res.status(201).json({ user: publicUser(user) });
}));

router.post('/login', limiter, wrap((req, res) => {
  const mail = email(req.body.email);
  const pass = typeof req.body.password === 'string' ? req.body.password : '';
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(mail);
  // same message for unknown email / wrong password
  if (!user || !bcrypt.compareSync(pass, user.password_hash)) throw new HttpError(401, 'Incorrect email or password.');
  setAuthCookie(res, signToken(user));
  res.json({ user: publicUser(user) });
}));

router.post('/logout', (_req, res) => { res.clearCookie('token'); res.json({ ok: true }); });

router.get('/me', (req, res) => res.json({ user: req.user ? publicUser(req.user) : null }));

router.put('/me', requireAuth, wrap((req, res) => {
  const name = str(req.body.name, { min: 2, max: 80, field: 'Name' });
  const ph = req.body.phone ? phone(req.body.phone) : '';
  const address = str(req.body.address ?? '', { max: 250, field: 'Address' });
  const city = str(req.body.city ?? '', { max: 60, field: 'City' });
  db.prepare('UPDATE users SET name=?,phone=?,address=?,city=? WHERE id=?').run(name, ph, address, city, req.user.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)) });
}));

router.put('/me/password', requireAuth, limiter, wrap((req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(String(req.body.current || ''), user.password_hash)) throw new HttpError(400, 'Current password is incorrect.');
  const next = password(req.body.next);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(next, 12), user.id);
  res.json({ ok: true });
}));

module.exports = router;
