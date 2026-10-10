class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const wrap = (fn) => (req, res, next) => {
  try { Promise.resolve(fn(req, res, next)).catch(next); } catch (e) { next(e); }
};

function str(v, { min = 0, max = 255, field = 'Field' } = {}) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min) throw new HttpError(400, `${field} is required.`);
  if (s.length > max) throw new HttpError(400, `${field} is too long (max ${max}).`);
  return s;
}
function int(v, { min = 0, max = 100000000, field = 'Value' } = {}) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${field} must be a whole number between ${min} and ${max}.`);
  return n;
}
function email(v) {
  const s = str(v, { min: 3, max: 120, field: 'Email' }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new HttpError(400, 'Enter a valid email address.');
  return s;
}
function phone(v) {
  const s = str(v, { min: 7, max: 20, field: 'Phone' });
  if (!/^[0-9+\-\s()]{7,20}$/.test(s)) throw new HttpError(400, 'Enter a valid phone number.');
  return s;
}
function slugify(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item';
}
function password(v) {
  const s = typeof v === 'string' ? v : '';
  if (s.length < 8 || s.length > 100) throw new HttpError(400, 'Password must be 8-100 characters.');
  return s;
}
module.exports = { HttpError, wrap, str, int, email, phone, slugify, password };
