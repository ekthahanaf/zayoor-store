# Zayoor Store

Full-stack e-commerce store: **Node.js + Express + SQLite** backend, responsive HTML/CSS/JS storefront, and an admin panel.
Sab kuch free aur open source hai. Koi paid service ya external database nahi chahiye.

## Run karne ka tareeqa (5 minute)

[Node.js 22.13 ya naya (24 LTS best hai)](https://nodejs.org) install hona chahiye.

```bash
npm install          # dependencies install
npm run setup        # .env banata hai (random secret) aur admin password print karta hai
npm run seed         # (optional) demo categories aur products add karta hai
npm start            # http://localhost:3000 kholo
```

* Store: http://localhost:3000
* Admin panel: http://localhost:3000/admin  (`npm run setup` ka email/password use karo)

Demo products admin panel se delete kar do (ya `npm run seed` skip kar do) aur apne products add karo.

## Kya kya hai

**Customers**
* Home, shop (search, category, price, stock filters, sorting, pagination)
* Product page (discount badge, stock status, related products)
* Cart (browser me save, live price/stock se dobara check hota hai)
* Checkout (Cash on Delivery), guest ya logged-in
* Register / login, profile, password change, order history
* Order tracking (order number + email se)

**Admin** (`/admin`)
* Dashboard: revenue, orders, customers, 14-day chart, low stock, best sellers
* Products: add / edit / delete, **image upload**, price, old price, stock, featured, hide
* Categories: add / edit / delete (images ke saath)
* Orders: customer + items dekho, status change karo (pending, confirmed, shipped, delivered, cancelled). Cancel karne par stock wapas ho jata hai.
* Customers list

## Security
* Passwords bcrypt se hashed; login HttpOnly + SameSite cookie (JWT) me
* **Prices hamesha database se aate hain**, browser ke bheje hue prices par bharosa nahi
* Stock transaction ke andar check/kam hota hai (overselling nahi)
* Admin API sirf admin ke liye; login/register/order par rate limiting
* Input validation, parameterised SQL (SQL injection nahi), output escape (XSS nahi)
* Helmet headers + strict Content-Security-Policy, CSRF header check
* Image upload sirf JPG/PNG/WEBP, max 3 MB, random file names
* `.env`, database aur uploads publicly serve nahi hote

## Settings (`.env`)
`PORT`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STORE_NAME`, `CURRENCY`, `SHIPPING_FEE`, `FREE_SHIPPING_OVER`.
Badalne ke baad server restart karo.

## Live karna
1. `.env` me `NODE_ENV=production` set karo (secure cookies; HTTPS zaroori, e.g. Nginx/Caddy ya SSL dene wala host).
2. `data/store.db` aur `uploads/` folder ka backup rakho.
3. Node chalane wale hosts: Render, Railway, Fly.io ya koi VPS. `data/` aur `uploads/` ke liye persistent disk use karo.

## Folder structure
```
server/            backend (index.js, db.js, config.js, routes/, middleware/, seed.js, setup.js)
public/            frontend (HTML pages, css/, js/, img/)
data/              SQLite database (khud ban jata hai)
uploads/           admin panel se upload ki hui images
```
`public/img/seed` ki tasveerein sirf placeholder illustrations hain. Admin panel se asli photos laga lo.

## Abhi included nahi (aage ke liye)
Online payment (card/JazzCash/Easypaisa), email notifications, product reviews, coupons, product variants (size/colour).
