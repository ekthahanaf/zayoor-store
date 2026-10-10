require('dotenv').config();
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 24 || secret.startsWith('change-me')) {
  if (isProd) {
    console.error('FATAL: set a strong JWT_SECRET in .env (run: npm run setup)');
    process.exit(1);
  }
  console.warn('WARNING: weak/missing JWT_SECRET. Run "npm run setup" before going live.');
}

module.exports = {
  isProd,
  port: Number(process.env.PORT) || 3000,
  jwtSecret: secret || 'dev-only-insecure-secret-change-me',
  jwtDays: Number(process.env.JWT_EXPIRES_DAYS) || 7,
  admin: {
    email: (process.env.ADMIN_EMAIL || 'admin@zayoor.local').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
    name: process.env.ADMIN_NAME || 'Store Admin',
  },
  store: {
    name: process.env.STORE_NAME || 'Zayoor',
    currency: process.env.CURRENCY || 'Rs.',
    shippingFee: Number(process.env.SHIPPING_FEE ?? 200),
    freeShippingOver: Number(process.env.FREE_SHIPPING_OVER ?? 3000),
  },
  paths: {
    root: path.join(__dirname, '..'),
    public: path.join(__dirname, '..', 'public'),
    uploads: path.join(__dirname, '..', 'uploads'),
    db: path.join(__dirname, '..', 'data', 'store.db'),
  },
};
