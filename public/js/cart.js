(async () => {
  await Z.init('');
  const box = Z.$('#cartBox');

  // refresh prices/stock from the server so the cart never shows stale data
  async function refresh() {
    const items = Z.cart.get(); if (!items.length) return;
    try {
      const fresh = await Z.api('/products/by-ids?ids=' + items.map((i) => i.id).join(','));
      const map = new Map(fresh.map((p) => [p.id, p]));
      const next = items.filter((i) => map.has(i.id) && map.get(i.id).stock > 0).map((i) => {
        const p = map.get(i.id);
        return { ...i, name: p.name, price: p.price, image: p.image, slug: p.slug, stock: p.stock, qty: Math.min(i.qty, p.stock, 99) };
      });
      if (next.length !== items.length) Z.toast('Some unavailable items were removed from your cart.', 'err');
      Z.cart.save(next);
    } catch { /* offline: keep what we have */ }
  }

  function render() {
    const items = Z.cart.get();
    if (!items.length) {
      box.innerHTML = '<div class="empty"><h2>Your cart is empty</h2><p>Looks like you have not added anything yet.</p><a class="btn" href="/shop">Start shopping</a></div>'; return;
    }
    const sub = Z.cart.subtotal(), ship = Z.shipping(sub), left = Z.config.freeShippingOver - sub;
    box.innerHTML = `<div class="cart-layout">
      <div class="panel"><h2>Shopping cart (${Z.cart.count()})</h2>
        ${items.map((i) => `<div class="cart-item" data-id="${i.id}">
          <a href="/product?slug=${encodeURIComponent(i.slug)}"><img src="${Z.img(i.image)}" alt=""></a>
          <div><h3><a href="/product?slug=${encodeURIComponent(i.slug)}">${Z.esc(i.name)}</a></h3><div class="unit">${Z.money(i.price)} each</div>
            <div class="qty"><button data-act="dec" aria-label="Decrease">&minus;</button><span>${i.qty}</span><button data-act="inc" aria-label="Increase">+</button></div></div>
          <div><div class="line-total">${Z.money(i.price * i.qty)}</div><button class="remove" data-act="rm">Remove</button></div></div>`).join('')}
      </div>
      <aside class="panel"><h2>Order summary</h2>
        <div class="sum-row"><span>Subtotal</span><span>${Z.money(sub)}</span></div>
        <div class="sum-row"><span>Delivery</span><span>${ship ? Z.money(ship) : 'Free'}</span></div>
        ${left > 0 ? `<div class="ship-note">Add ${Z.money(left)} more for free delivery.</div>` : ''}
        <div class="sum-row total"><span>Total</span><span>${Z.money(sub + ship)}</span></div>
        <a class="btn btn-block" href="/checkout" style="margin-top:16px">Proceed to checkout</a>
        <a class="btn btn-ghost btn-block" href="/shop" style="margin-top:6px">Continue shopping</a>
      </aside></div>`;
  }
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = Number(b.closest('[data-id]').dataset.id); const it = Z.cart.get().find((i) => i.id === id);
    if (b.dataset.act === 'rm') Z.cart.remove(id);
    else if (b.dataset.act === 'inc') { if (it.qty >= Math.min(it.stock, 99)) Z.toast(`Only ${it.stock} available.`, 'err'); Z.cart.setQty(id, it.qty + 1); }
    else Z.cart.setQty(id, it.qty - 1);
    render();
  });
  render(); await refresh(); render();
})();
