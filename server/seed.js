// Adds demo categories & products (safe to run again: skips if data exists).
const db = require('./db');
const { slugify } = require('./middleware/util');

if (db.prepare('SELECT COUNT(*) n FROM categories').get().n) {
  console.log('Catalog already has data - seed skipped. (Delete data/store.db to start over.)');
  process.exit(0);
}

const cats = [
  ['Watches', 'watch'], ['Fitness', 'fitness'], ['Electronics', 'electronics'],
  ['AC Covers', 'cover'], ['Laptop Bags', 'bag'], ['Skin Care', 'skincare'],
];
const insCat = db.prepare('INSERT INTO categories (name,slug,image) VALUES (?,?,?)');
const catId = {};
for (const [name, icon] of cats) catId[name] = insCat.run(name, slugify(name), `/img/seed/cat-${icon}.svg`).lastInsertRowid;

// name, category, price, old price, stock, featured, icon, hue, description
const products = [
  ['Smart Watch Pro', 'Watches', 2499, 3499, 40, 1, 'watch', 222, 'Fitness tracking, call and message notifications, heart-rate monitor and up to 7 days of battery. Water resistant and works with Android and iPhone.'],
  ['Classic Steel Analog Watch', 'Watches', 3299, null, 18, 0, 'watch', 28, 'Stainless-steel case with a scratch-resistant glass face and a comfortable adjustable strap. A clean everyday watch.'],
  ['Kids Digital Watch', 'Watches', 899, 1199, 60, 0, 'watch', 340, 'Colourful, durable and water resistant with alarm and stopwatch. Soft silicone strap.'],
  ['Hand Gripper Set', 'Fitness', 799, 999, 80, 1, 'fitness', 12, 'Adjustable-resistance hand gripper for stronger forearms and grip. Anti-slip handles, ideal for gym or desk.'],
  ['Resistance Bands (5 pcs)', 'Fitness', 1299, 1699, 45, 0, 'fitness', 150, 'Five bands of different resistance levels with carry bag. Great for home workouts and stretching.'],
  ['Yoga Mat 6mm', 'Fitness', 1499, null, 30, 0, 'fitness', 280, 'Non-slip, cushioned 6 mm mat with strap. Easy to clean and lightweight to carry.'],
  ['Bluetooth Earbuds', 'Electronics', 1199, 1799, 100, 1, 'electronics', 200, 'True wireless earbuds with clear sound, touch controls and a charging case that gives up to 20 hours in total.'],
  ['Rechargeable Table Fan', 'Electronics', 2799, 3299, 25, 1, 'electronics', 175, 'Quiet 3-speed fan with a rechargeable battery that lasts through load-shedding. Tilt-adjustable head.'],
  ['20000mAh Power Bank', 'Electronics', 2999, null, 35, 0, 'electronics', 40, 'Fast-charging power bank with dual USB output and an LED level indicator. Charges most phones 4-5 times.'],
  ['Split AC Cover (1.5 Ton)', 'AC Covers', 1599, null, 22, 0, 'cover', 95, 'Waterproof, UV-resistant outdoor unit cover that protects your AC from dust and rain. Elastic fitting.'],
  ['Window AC Cover (1 Ton)', 'AC Covers', 1199, 1399, 3, 0, 'cover', 55, 'Heavy-duty cover with reinforced stitching. Fits most 1 to 1.5 ton window units.'],
  ['Laptop Backpack 15.6"', 'Laptop Bags', 2899, 3599, 28, 1, 'bag', 245, 'Padded laptop compartment, water-resistant fabric, USB charging port and multiple organiser pockets.'],
  ['Slim Laptop Sleeve 14"', 'Laptop Bags', 999, null, 50, 0, 'bag', 320, 'Shock-absorbing neoprene sleeve with a front pocket for your charger.'],
  ['Vitamin C Face Serum', 'Skin Care', 1399, 1799, 0, 0, 'skincare', 25, 'Brightening serum with 10% Vitamin C and hyaluronic acid. Lightweight and fast absorbing.'],
  ['Hydrating Face Wash', 'Skin Care', 649, null, 90, 1, 'skincare', 190, 'Gentle daily cleanser that removes oil and dirt without drying your skin. Suitable for all skin types.'],
];
const insP = db.prepare(`INSERT INTO products (name,slug,description,price,compare_price,stock,category_id,image,featured)
  VALUES (?,?,?,?,?,?,?,?,?)`);
db.transaction(() => {
  products.forEach(([name, cat, price, old, stock, feat, icon, hue, desc], i) =>
    insP.run(name, slugify(name), desc, price, old, stock, catId[cat], `/img/seed/p-${icon}-${hue}.svg`, feat));
})();
console.log(`Seeded ${cats.length} categories and ${products.length} products.`);
