(async () => {
  await Z.init('shop');
  const slug = Z.qs().get('slug'); const box = Z.$('#detail');
  if (!slug) { box.innerHTML = '<div class="empty"><h2>Product not found</h2><a class="btn" href="/shop">Browse products</a></div>'; return; }
  try {
    const { product: p, related } = await Z.api('/products/' + encodeURIComponent(slug));
    Z.products[p.id] = p; document.title = `${p.name} | ${Z.config.name}`;
    const off = p.compare_price && p.compare_price > p.price ? Math.round((1 - p.price / p.compare_price) * 100) : 0;
    const stockCls = p.stock < 1 ? 'out' : p.stock <= 5 ? 'low' : 'in';
    const stockTxt = p.stock < 1 ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock';
    Z.$('#crumbs').innerHTML = `<a href="/">Home</a> / <a href="/shop">Shop</a>${p.category_slug ? ` / <a href="/shop?category=${encodeURIComponent(p.category_slug)}">${Z.esc(p.category_name)}</a>` : ''} / ${Z.esc(p.name)}`;
    let qty = 1;
    box.innerHTML = `<div class="detail-img"><img src="${Z.img(p.image)}" alt="${Z.esc(p.name)}"></div>
      <div>
        <span class="card-cat">${Z.esc(p.category_name || '')}</span>
        <h1>${Z.esc(p.name)}</h1>
        <div class="price"><b>${Z.money(p.price)}</b>${off ? `<s>${Z.money(p.compare_price)}</s><span class="tag" style="position:static">-${off}%</span>` : ''}</div>
        <p style="margin-top:14px"><span class="stock-line ${stockCls}">${stockTxt}</span></p>
        <p class="desc">${Z.esc(p.description)}</p>
        <div class="buy-row">
          <div class="qty"><button id="minus" aria-label="Decrease">&minus;</button><span id="q">1</span><button id="plus" aria-label="Increase">+</button></div>
          <button class="btn" id="addBtn" ${p.stock < 1 ? 'disabled' : ''}>Add to cart</button>
          <button class="btn btn-outline" id="buyBtn" ${p.stock < 1 ? 'disabled' : ''}>Buy now</button>
        </div>
        <div class="info-list"><div><b>Payment</b><span>Cash on delivery</span></div><div><b>Delivery</b><span>${Z.config.freeShippingOver ? `Free over ${Z.money(Z.config.freeShippingOver)}, otherwise ${Z.money(Z.config.shippingFee)}` : Z.money(Z.config.shippingFee)}</span></div></div>
      </div>`;
    const setQ = (n) => { qty = Math.max(1, Math.min(n, p.stock || 1, 99)); Z.$('#q').textContent = qty; };
    Z.$('#minus').onclick = () => setQ(qty - 1); Z.$('#plus').onclick = () => setQ(qty + 1);
    Z.$('#addBtn').onclick = () => { if (Z.cart.add(p, qty)) Z.toast(`${p.name} added to cart`); };
    Z.$('#buyBtn').onclick = () => { if (Z.cart.add(p, qty)) location.href = '/cart'; };
    if (related.length) { Z.$('#related').hidden = false; Z.$('#relatedGrid').innerHTML = related.map(Z.productCard).join(''); }
  } catch (e) { box.innerHTML = `<div class="empty"><h2>${e.status === 404 ? 'Product not found' : 'Something went wrong'}</h2><p>${Z.esc(e.message)}</p><a class="btn" href="/shop">Browse products</a></div>`; }
})();
