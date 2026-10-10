(async () => {
  await Z.init('');
  const items = Z.cart.get();
  if (!items.length) { location.replace('/cart'); return; }
  const u = Z.user;
  const f = Z.$('#checkoutForm');
  if (u) { f.name.value = u.name || ''; f.email.value = u.email || ''; f.phone.value = u.phone || ''; f.address.value = u.address || ''; f.city.value = u.city || ''; }
  else Z.$('#guestNote').hidden = false;

  const sub = Z.cart.subtotal(), ship = Z.shipping(sub);
  Z.$('#summary').innerHTML = items.map((i) => `<div class="mini-item"><img src="${Z.img(i.image)}" alt=""><div class="grow">${Z.esc(i.name)}<small>Qty ${i.qty}</small></div><b>${Z.money(i.price * i.qty)}</b></div>`).join('') +
    `<div class="sum-row"><span>Subtotal</span><span>${Z.money(sub)}</span></div><div class="sum-row"><span>Delivery</span><span>${ship ? Z.money(ship) : 'Free'}</span></div><div class="sum-row total"><span>Total</span><span>${Z.money(sub + ship)}</span></div>`;

  const err = Z.$('#err'), btn = Z.$('#placeBtn');
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); err.hidden = true; btn.disabled = true; btn.textContent = 'Placing order...';
    try {
      const order = await Z.api('/orders', { method: 'POST', body: {
        name: f.name.value, email: f.email.value, phone: f.phone.value, address: f.address.value, city: f.city.value, notes: f.notes.value,
        items: Z.cart.get().map((i) => ({ id: i.id, qty: i.qty })) } });
      Z.cart.clear();
      try { sessionStorage.setItem('zayoor.lastOrder', JSON.stringify(order)); } catch { /* ignore */ }
      location.href = '/order';
    } catch (ex) {
      err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Place order';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
})();
