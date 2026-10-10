(async () => {
  await Z.init('');
  if (!Z.user) { location.replace('/login?next=/account'); return; }
  const u = Z.user, pf = Z.$('#profileForm'), pw = Z.$('#passForm');
  Z.$('#hello').textContent = `Hello, ${u.name.split(' ')[0]}`;
  pf.name.value = u.name; pf.phone.value = u.phone || ''; pf.address.value = u.address || ''; pf.city.value = u.city || '';
  const flash = (el, text, ok) => { el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'err'); el.hidden = false; };

  pf.addEventListener('submit', async (e) => {
    e.preventDefault(); const m = Z.$('.msg', pf);
    try { await Z.api('/auth/me', { method: 'PUT', body: { name: pf.name.value, phone: pf.phone.value, address: pf.address.value, city: pf.city.value } }); flash(m, 'Profile saved.', true); }
    catch (ex) { flash(m, ex.message, false); }
  });
  pw.addEventListener('submit', async (e) => {
    e.preventDefault(); const m = Z.$('.msg', pw);
    try { await Z.api('/auth/me/password', { method: 'PUT', body: { current: pw.current.value, next: pw.next.value } }); pw.reset(); flash(m, 'Password changed.', true); }
    catch (ex) { flash(m, ex.message, false); }
  });
  try {
    const orders = await Z.api('/orders/mine');
    Z.$('#orders').innerHTML = orders.length ? orders.map(Z.orderHtml).join('') : '<div class="empty" style="padding:30px"><h2>No orders yet</h2><a class="btn" href="/shop">Start shopping</a></div>';
  } catch (ex) { Z.$('#orders').innerHTML = `<p class="msg err">${Z.esc(ex.message)}</p>`; }
})();
