const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { HttpError, wrap, str, int, slugify } = require('../middleware/util');

// ---------- image upload (admin only) ----------
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: config.paths.uploads,
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EXT[file.mimetype]),
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => (EXT[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Only JPG, PNG or WEBP images are allowed.'))),
});

function resolveImage(req, existing = '') {
  if (req.file) {
    if (existing.startsWith('/uploads/')) fs.unlink(path.join(config.paths.uploads, path.basename(existing)), () => {});
    return '/uploads/' + req.file.filename;
  }
  const url = (req.body.image_url || '').trim();
  if (url) {
    if (!/^(https?:\/\/|\/)[^\s"'<>]+$/i.test(url) || url.length > 500) throw new HttpError(400, 'Image URL is not valid.');
    return url;
  }
  return existing;
}

const PRODUCT_SELECT = `SELECT p.*, c.name AS category_name, c.slug AS category_slug
  FROM products p LEFT JOIN categories c ON c.id = p.category_id`;

function uniqueSlug(table, base, ignoreId = 0) {
  let slug = slugify(base), n = 1;
  while (db.prepare(`SELECT 1 FROM ${table} WHERE slug=? AND id<>?`).get(slug, ignoreId)) slug = `${slugify(base)}-${++n}`;
  return slug;
}

// ---------- categories ----------
router.get('/categories', (_req, res) => {
  res.json(db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id AND p.active=1) AS product_count
    FROM categories c ORDER BY c.name`).all());
});

router.post('/categories', requireAdmin, upload.single('image'), wrap((req, res) => {
  const name = str(req.body.name, { min: 2, max: 60, field: 'Category name' });
  if (db.prepare('SELECT 1 FROM categories WHERE lower(name)=lower(?)').get(name)) throw new HttpError(409, 'Category already exists.');
  const info = db.prepare('INSERT INTO categories (name,slug,image) VALUES (?,?,?)').run(name, uniqueSlug('categories', name), resolveImage(req));
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id=?').get(info.lastInsertRowid));
}));

router.put('/categories/:id', requireAdmin, upload.single('image'), wrap((req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id=?').get(req.params.id);
  if (!cat) throw new HttpError(404, 'Category not found.');
  const name = str(req.body.name, { min: 2, max: 60, field: 'Category name' });
  const clash = db.prepare('SELECT 1 FROM categories WHERE lower(name)=lower(?) AND id<>?').get(name, cat.id);
  if (clash) throw new HttpError(409, 'Another category already uses this name.');
  db.prepare('UPDATE categories SET name=?,slug=?,image=? WHERE id=?').run(name, uniqueSlug('categories', name, cat.id), resolveImage(req, cat.image), cat.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id=?').get(cat.id));
}));

router.delete('/categories/:id', requireAdmin, wrap((req, res) => {
  const r = db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  if (!r.changes) throw new HttpError(404, 'Category not found.');
  res.json({ ok: true });
}));

// ---------- products ----------
router.get('/products', wrap((req, res) => {
  const where = ['p.active=1'], params = [];
  const q = (req.query.search || '').toString().trim().slice(0, 80);
  if (q) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (req.query.category) { where.push('c.slug=?'); params.push(String(req.query.category)); }
  if (req.query.featured === '1') where.push('p.featured=1');
  if (req.query.min !== undefined && req.query.min !== '') { where.push('p.price>=?'); params.push(int(req.query.min, { field: 'Min price' })); }
  if (req.query.max !== undefined && req.query.max !== '') { where.push('p.price<=?'); params.push(int(req.query.max, { field: 'Max price' })); }
  if (req.query.instock === '1') where.push('p.stock>0');
  const sorts = { newest: 'p.id DESC', 'price-asc': 'p.price ASC', 'price-desc': 'p.price DESC', name: 'p.name ASC' };
  const order = sorts[req.query.sort] || sorts.newest;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 48);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const from = `FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) n ${from}`).get(...params).n;
  const items = db.prepare(`SELECT p.*, c.name AS category_name, c.slug AS category_slug ${from} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);
  res.json({ items, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
}));

// Used by the cart to refresh prices/stock: /api/products/by-ids?ids=1,2,3
router.get('/products/by-ids', wrap((req, res) => {
  const ids = String(req.query.ids || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 50);
  if (!ids.length) return res.json([]);
  res.json(db.prepare(`${PRODUCT_SELECT} WHERE p.active=1 AND p.id IN (${ids.map(() => '?').join(',')})`).all(...ids));
}));

router.get('/products/:idOrSlug', wrap((req, res) => {
  const k = req.params.idOrSlug;
  const p = db.prepare(`${PRODUCT_SELECT} WHERE (p.slug=? OR p.id=?) AND p.active=1`).get(k, /^\d+$/.test(k) ? k : -1);
  if (!p) throw new HttpError(404, 'Product not found.');
  const related = db.prepare(`${PRODUCT_SELECT} WHERE p.category_id IS ? AND p.id<>? AND p.active=1 ORDER BY RANDOM() LIMIT 4`).all(p.category_id, p.id);
  res.json({ product: p, related });
}));

function readProduct(req, existing) {
  const name = str(req.body.name, { min: 2, max: 120, field: 'Product name' });
  const price = int(req.body.price, { field: 'Price' });
  const cp = req.body.compare_price === '' || req.body.compare_price == null ? null : int(req.body.compare_price, { field: 'Old price' });
  const stock = int(req.body.stock, { field: 'Stock' });
  const description = str(req.body.description ?? '', { max: 4000, field: 'Description' });
  let category_id = req.body.category_id === '' || req.body.category_id == null ? null : int(req.body.category_id, { field: 'Category' });
  if (category_id && !db.prepare('SELECT 1 FROM categories WHERE id=?').get(category_id)) throw new HttpError(400, 'Selected category does not exist.');
  const flag = (v) => (v === true || v === 'true' || v === '1' || v === 1 || v === 'on' ? 1 : 0);
  return { name, price, compare_price: cp, stock, description, category_id, featured: flag(req.body.featured), active: req.body.active === undefined ? 1 : flag(req.body.active), image: resolveImage(req, existing?.image || '') };
}

router.get('/admin/products', requireAdmin, (_req, res) => res.json(db.prepare(`${PRODUCT_SELECT} ORDER BY p.id DESC`).all()));

router.post('/products', requireAdmin, upload.single('image'), wrap((req, res) => {
  const d = readProduct(req);
  const info = db.prepare(`INSERT INTO products (name,slug,description,price,compare_price,stock,category_id,image,featured,active)
    VALUES (@name,@slug,@description,@price,@compare_price,@stock,@category_id,@image,@featured,@active)`).run({ ...d, slug: uniqueSlug('products', d.name) });
  res.status(201).json(db.prepare(`${PRODUCT_SELECT} WHERE p.id=?`).get(info.lastInsertRowid));
}));

router.put('/products/:id', requireAdmin, upload.single('image'), wrap((req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!p) throw new HttpError(404, 'Product not found.');
  const d = readProduct(req, p);
  db.prepare(`UPDATE products SET name=@name,slug=@slug,description=@description,price=@price,compare_price=@compare_price,
    stock=@stock,category_id=@category_id,image=@image,featured=@featured,active=@active WHERE id=@id`)
    .run({ ...d, slug: uniqueSlug('products', d.name, p.id), id: p.id });
  res.json(db.prepare(`${PRODUCT_SELECT} WHERE p.id=?`).get(p.id));
}));

router.delete('/products/:id', requireAdmin, wrap((req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!p) throw new HttpError(404, 'Product not found.');
  db.prepare('DELETE FROM products WHERE id=?').run(p.id); // order history keeps its own copy of name/price
  if (p.image.startsWith('/uploads/')) fs.unlink(path.join(config.paths.uploads, path.basename(p.image)), () => {});
  res.json({ ok: true });
}));

module.exports = router;
