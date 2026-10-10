/* Zayoor - shared core: API, cart, layout, helpers. No inline scripts (CSP-safe). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const Z = { $, $$, esc, config: { name: 'Zayoor', currency: 'Rs.', shippingFee: 200, freeShippingOver: 3000 }, user: null, products: {} };
  const money = (n) => `${Z.config.currency} ${Number(n).toLocaleString('en-PK')}`;
  Z.money = money;
  Z.date = (s) => new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  Z.img = (p) => esc(p || '/img/seed/cat-bag.svg');

  // ---------- API ----------
  Z.api = async (path, { method = 'GET', body, form } = {}) => {
    const opts = { method, credentials: 'same-origin', headers: { 'X-Requested-With': 'zayoor' } };
    if (form) opts.body = form;
    else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    let res;
    try { res = await fetch('/api' + path, opts); } catch { throw new Error('Cannot reach the server. Check your connection.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || 'Request failed.'); e.status = res.status; throw e; }
    return data;
  };

  // ---------- toast ----------
  Z.toast = (msg, type = '') => {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + type; t.textContent = msg; box.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  };

  // ---------- cart (localStorage, validated again by the server at checkout) ----------
  const KEY = 'zayoor.cart.v2';
  Z.cart = {
    get() { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch { return []; } },
    save(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage blocked */ } Z.updateBadge(); },
    count() { return this.get().reduce((n, i) => n + i.qty, 0); },
    subtotal() { return this.get().reduce((n, i) => n + i.price * i.qty, 0); },
    add(p, qty = 1) {
      const items = this.get();
      const max = Math.min(p.stock, 99);
      const ex = items.find((i) => i.id === p.id);
      const next = (ex ? ex.qty : 0) + qty;
      if (max < 1) { Z.toast('Sorry, this item is out of stock.', 'err'); return false; }
      if (next > max) { Z.toast(`Only ${max} available.`, 'err'); if (ex) ex.qty = max; else return false; }
      else if (ex) ex.qty = next;
      else items.push({ id: p.id, name: p.name, price: p.price, image: p.image, slug: p.slug, stock: p.stock, qty });
      this.save(items); return true;
    },
    setQty(id, qty) { const items = this.get(); const it = items.find((i) => i.id === id); if (!it) return; it.qty = Math.max(1, Math.min(qty, it.stock, 99)); this.save(items); },
    remove(id) { this.save(this.get().filter((i) => i.id !== id)); },
    clear() { this.save([]); },
  };
  Z.shipping = (sub) => (sub === 0 || sub >= Z.config.freeShippingOver ? 0 : Z.config.shippingFee);
  Z.updateBadge = () => { const b = $('#cartBadge'); if (!b) return; const n = Z.cart.count(); b.textContent = n; b.hidden = !n; };

  // ---------- product card ----------
  Z.productCard = (p) => {
    Z.products[p.id] = p;
    const off = p.compare_price && p.compare_price > p.price ? Math.round((1 - p.price / p.compare_price) * 100) : 0;
    const out = p.stock < 1;
    return `<article class="card">
      <a class="card-img" href="/product?slug=${encodeURIComponent(p.slug)}" aria-label="${esc(p.name)}">
        <img src="${Z.img(p.image)}" alt="${esc(p.name)}" loading="lazy">
        ${out ? '<span class="tag out">Sold out</span>' : off ? `<span class="tag">-${off}%</span>` : ''}
      </a>
      <div class="card-body">
        <span class="card-cat">${esc(p.category_name || 'General')}</span>
        <h3 class="card-title"><a href="/product?slug=${encodeURIComponent(p.slug)}">${esc(p.name)}</a></h3>
        <div class="price"><b>${money(p.price)}</b>${off ? `<s>${money(p.compare_price)}</s>` : ''}</div>
        ${!out && p.stock <= 5 ? `<span class="low">Only ${p.stock} left</span>` : ''}
        <button class="btn btn-sm" data-add="${p.id}" ${out ? 'disabled' : ''}>${out ? 'Sold out' : 'Add to cart'}</button>
      </div>
    </article>`;
  };
  Z.skeletons = (n = 4) => Array.from({ length: n }, () => '<div class="skel"></div>').join('');

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add && Z.products[add.dataset.add]) {
      const p = Z.products[add.dataset.add];
      if (Z.cart.add(p, 1)) Z.toast(`${p.name} added to cart`);
    }
    const dd = $('.dropdown.open');
    if (dd && !e.target.closest('.user-menu')) dd.classList.remove('open');
  });

  // ---------- order rendering (used by order / track / account) ----------
  const FLOW = ['pending', 'confirmed', 'shipped', 'delivered'];
  Z.orderHtml = (o) => {
    const idx = FLOW.indexOf(o.status);
    const steps = o.status === 'cancelled' ? '' : `<div class="steps">${FLOW.map((s, i) => `<div class="${i <= idx ? 'done' : ''}">${s[0].toUpperCase() + s.slice(1)}</div>`).join('')}</div>`;
    return `<div class="order">
      <div class="order-top"><div><b>${esc(o.order_no)}</b><small>Placed ${Z.date(o.created_at)}</small></div><span class="pill ${esc(o.status)}">${esc(o.status)}</span></div>
      ${steps}
      ${o.items.map((i) => `<div class="mini-item"><img src="${Z.img(i.image)}" alt=""><div class="grow">${esc(i.name)}<small>${i.qty} x ${money(i.price)}</small></div><b>${money(i.qty * i.price)}</b></div>`).join('')}
      <div class="sum-row"><span>Delivery</span><span>${o.shipping ? money(o.shipping) : 'Free'}</span></div>
      <div class="sum-row total"><span>Total (Cash on delivery)</span><span>${money(o.total)}</span></div>
      <small style="color:var(--muted)">Deliver to: ${esc(o.name)}, ${esc(o.address)}, ${esc(o.city)} &middot; ${esc(o.phone)}</small>
    </div>`;
  };

  // ---------- layout ----------
  const I = {
    bag: '<svg viewBox="0 0 24 24"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  };
  Z.icons = I;

  function header(active) {
    const link = (href, label, key) => `<a href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`;
    return `<div class="topbar">Free delivery on orders over ${money(Z.config.freeShippingOver)} &middot; Cash on delivery available</div>
    <header class="header"><div class="container header-row">
      <a class="logo" href="/"><span class="logo-mark">${I.bag}</span>${esc(Z.config.name)}</a>
      <nav class="nav" id="nav">${link('/', 'Home', 'home')}${link('/shop', 'Shop', 'shop')}${link('/track', 'Track order', 'track')}</nav>
      <form class="header-search" action="/shop" role="search">${I.search}<label class="sr-only" for="hs">Search products</label><input id="hs" name="search" type="search" placeholder="Search products..." autocomplete="off"></form>
      <div class="header-actions">
        <div class="user-menu"><button class="icon-btn" id="userBtn" aria-label="Account" aria-haspopup="true">${I.user}</button><div class="dropdown" id="userDd"></div></div>
        <a class="icon-btn" href="/cart" aria-label="Cart">${I.bag}<span class="badge-count" id="cartBadge" hidden>0</span></a>
        <button class="icon-btn menu-toggle" id="menuBtn" aria-label="Menu">${I.menu}</button>
      </div></div></header>`;
  }
  function footer() {
    return `<footer class="footer"><div class="container"><div class="footer-grid">
      <div><a class="logo" href="/"><span class="logo-mark">${I.bag}</span>${esc(Z.config.name)}</a><p>Trendy gadgets, fitness gear, bags and skin care at honest prices, delivered to your door.</p></div>
      <div><h4>Shop</h4><a href="/shop">All products</a><a href="/shop?sort=price-asc">Lowest price</a><a href="/shop?featured=1">Featured</a></div>
      <div><h4>Account</h4><a href="/login">Login / Sign up</a><a href="/account">My orders</a><a href="/track">Track an order</a></div>
      <div><h4>Info</h4><a href="/cart">Cart</a><a>Cash on delivery</a><a>Free shipping over ${money(Z.config.freeShippingOver)}</a></div>
    </div><div class="footer-bottom">&copy; ${new Date().getFullYear()} ${esc(Z.config.name)}. All rights reserved.</div></div></footer>`;
  }
  function renderUser() {
    const dd = $('#userDd'); if (!dd) return;
    const u = Z.user;
    dd.innerHTML = u
      ? `<div class="who"><strong>${esc(u.name)}</strong>${esc(u.email)}</div><a href="/account">My account &amp; orders</a>${u.role === 'admin' ? '<a href="/admin">Admin panel</a>' : ''}<button id="logoutBtn">Log out</button>`
      : '<a href="/login">Log in</a><a href="/login?tab=register">Create account</a>';
    const lb = $('#logoutBtn');
    if (lb) lb.onclick = async () => { await Z.api('/auth/logout', { method: 'POST' }); location.href = '/'; };
  }

  Z.init = async (active = '') => {
    try { Z.config = { ...Z.config, ...(await Z.api('/config')) }; } catch { /* use defaults */ }
    const h = $('#site-header'), f = $('#site-footer');
    if (h) h.innerHTML = header(active);
    if (f) f.innerHTML = footer();
    Z.updateBadge();
    const mb = $('#menuBtn'); if (mb) mb.onclick = () => $('#nav').classList.toggle('open');
    const ub = $('#userBtn'); if (ub) ub.onclick = (e) => { e.stopPropagation(); $('#userDd').classList.toggle('open'); };
    try { Z.user = (await Z.api('/auth/me')).user; } catch { Z.user = null; }
    renderUser();
    return Z;
  };

  // only allow same-site relative redirects
  Z.safeNext = (n) => (typeof n === 'string' && /^\/[A-Za-z0-9_\-./?=&%]*$/.test(n) && !n.startsWith('//') ? n : '/account');
  Z.qs = () => new URLSearchParams(location.search);

  window.Z = Z;
})();
