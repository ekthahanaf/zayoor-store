const router = require('express').Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

router.get('/stats', (_req, res) => {
  const one = (sql) => db.prepare(sql).get();
  res.json({
    revenue: one("SELECT COALESCE(SUM(total),0) v FROM orders WHERE status<>'cancelled'").v,
    orders: one('SELECT COUNT(*) v FROM orders').v,
    pending: one("SELECT COUNT(*) v FROM orders WHERE status='pending'").v,
    products: one('SELECT COUNT(*) v FROM products').v,
    customers: one("SELECT COUNT(*) v FROM users WHERE role='customer'").v,
    lowStock: db.prepare('SELECT id,name,stock FROM products WHERE active=1 AND stock<=5 ORDER BY stock ASC LIMIT 8').all(),
    daily: db.prepare(`SELECT date(created_at) d, COUNT(*) orders, COALESCE(SUM(total),0) revenue FROM orders
      WHERE status<>'cancelled' AND created_at >= date('now','-13 days') GROUP BY d ORDER BY d`).all(),
    top: db.prepare(`SELECT oi.name AS name, SUM(oi.qty) sold FROM order_items oi JOIN orders o ON o.id=oi.order_id
      WHERE o.status<>'cancelled' GROUP BY oi.name ORDER BY sold DESC LIMIT 5`).all(),
  });
});

router.get('/users', (_req, res) => {
  res.json(db.prepare(`SELECT u.id,u.name,u.email,u.role,u.phone,u.created_at,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) AS orders FROM users u ORDER BY u.id DESC LIMIT 300`).all());
});

module.exports = router;
