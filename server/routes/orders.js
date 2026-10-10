const router = require('express').Router();
const db = require('../db');
const config = require('../config');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { HttpError, wrap, str, int, email, phone } = require('../middleware/util');

const orderLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many orders from this connection. Try again later.' } });
const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

function withItems(order) {
  return { ...order, items: db.prepare('SELECT product_id,name,price,qty,image FROM order_items WHERE order_id=?').all(order.id) };
}
function newOrderNo() {
  const d = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `ZY${d}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// Place order. Prices are ALWAYS read from the database - the browser's prices are never trusted.
router.post('/', orderLimiter, wrap((req, res) => {
  const b = req.body || {};
  const info = {
    name: str(b.name, { min: 2, max: 80, field: 'Full name' }),
    email: email(b.email),
    phone: phone(b.phone),
    address: str(b.address, { min: 8, max: 250, field: 'Address' }),
    city: str(b.city, { min: 2, max: 60, field: 'City' }),
    notes: str(b.notes ?? '', { max: 500, field: 'Notes' }),
  };
  if (!Array.isArray(b.items) || !b.items.length) throw new HttpError(400, 'Your cart is empty.');
  if (b.items.length > 50) throw new HttpError(400, 'Too many items in one order.');

  const place = db.transaction(() => {
    const merged = new Map();
    for (const it of b.items) {
      const id = int(it.id, { min: 1, field: 'Product' });
      merged.set(id, (merged.get(id) || 0) + int(it.qty, { min: 1, max: 99, field: 'Quantity' }));
    }
    let subtotal = 0;
    const lines = [];
    for (const [id, qty] of merged) {
      const p = db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(id);
      if (!p) throw new HttpError(400, 'A product in your cart is no longer available.');
      if (p.stock < qty) throw new HttpError(409, p.stock ? `Only ${p.stock} left of "${p.name}".` : `"${p.name}" is out of stock.`);
      subtotal += p.price * qty;
      lines.push({ p, qty });
    }
    const shipping = subtotal >= config.store.freeShippingOver ? 0 : config.store.shippingFee;
    const total = subtotal + shipping;
    const order_no = newOrderNo();
    const r = db.prepare(`INSERT INTO orders (order_no,user_id,subtotal,shipping,total,payment_method,name,email,phone,address,city,notes)
      VALUES (?,?,?,?,?,'cod',?,?,?,?,?,?)`).run(order_no, req.user?.id ?? null, subtotal, shipping, total, info.name, info.email, info.phone, info.address, info.city, info.notes);
    const ins = db.prepare('INSERT INTO order_items (order_id,product_id,name,price,qty,image) VALUES (?,?,?,?,?,?)');
    const dec = db.prepare('UPDATE products SET stock=stock-? WHERE id=?');
    for (const { p, qty } of lines) { ins.run(r.lastInsertRowid, p.id, p.name, p.price, qty, p.image); dec.run(qty, p.id); }
    return r.lastInsertRowid;
  });

  const id = place();
  res.status(201).json(withItems(db.prepare('SELECT * FROM orders WHERE id=?').get(id)));
}));

router.get('/mine', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC').all(req.user.id).map(withItems));
});

// Guest tracking: needs BOTH order number and the email used
router.get('/track', orderLimiter, wrap((req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE order_no=? AND lower(email)=lower(?)').get(String(req.query.order_no || '').trim(), String(req.query.email || '').trim());
  if (!o) throw new HttpError(404, 'No order found with those details.');
  res.json(withItems(o));
}));

// ---------- admin ----------
router.get('/', requireAdmin, (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const rows = status ? db.prepare('SELECT * FROM orders WHERE status=? ORDER BY id DESC LIMIT 300').all(status)
                      : db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 300').all();
  res.json(rows.map(withItems));
});

router.patch('/:id/status', requireAdmin, wrap((req, res) => {
  const status = req.body.status;
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Invalid status.');
  const run = db.transaction(() => {
    const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
    if (!o) throw new HttpError(404, 'Order not found.');
    if (o.status === status) return o;
    if (o.status === 'cancelled') throw new HttpError(400, 'A cancelled order cannot be reopened.');
    if (status === 'cancelled') { // put stock back
      for (const it of db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id))
        if (it.product_id) db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(it.qty, it.product_id);
    }
    db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, o.id);
    return db.prepare('SELECT * FROM orders WHERE id=?').get(o.id);
  });
  res.json(withItems(run()));
}));

module.exports = router;
