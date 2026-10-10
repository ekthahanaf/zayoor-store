(async () => {
  await Z.init('');
  const gate = Z.$('#gate');
  if (!Z.user) { location.replace('/login?next=/admin'); return; }
  if (Z.user.role !== 'admin') { gate.innerHTML = '<div class="container"><div class="empty"><h2>Admins only</h2><p>Your account does not have access to this page.</p><a class="btn" href="/">Back to store</a></div></div>'; return; }

  const TABS = [['dashboard', 'Dashboard'], ['products', 'Products'], ['categories', 'Categories'], ['orders', 'Orders'], ['customers', 'Customers']];
  gate.innerHTML = `<div class="admin"><aside class="admin-side"><h3>Manage</h3>${TABS.map(([k, l]) => `<button data-tab="${k}">${l}</button>`).join('')}</aside><section class="admin-main" id="view"></section></div>`;
  const view = Z.$('#view'), bg = Z.$('#modalBg'), modal = Z.$('#modal');
  let tab = (location.hash || '#dashboard').slice(1); if (!TABS.some(([k]) => k === tab)) tab = 'dashboard';

  const openModal = (html) => { modal.innerHTML = html; bg.classList.add('open'); const i = Z.$('input,select,textarea', modal); if (i) i.focus(); };
  const closeModal = () => bg.classList.remove('open');
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  const confirmBox = (msg) => window.confirm(msg);

  // ---------- Dashboard ----------
  async function dashboard() {
    const s = await Z.api('/admin/stats');
    const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); days.push({ d, revenue: (s.daily.find((x) => x.d === d) || {}).revenue || 0 }); }
    const max = Math.max(...days.map((d) => d.revenue), 1);
    view.innerHTML = `<div class="admin-bar"><h1>Dashboard</h1></div>
      <div class="stats"><div class="stat"><small>Revenue (excl. cancelled)</small><b>${Z.money(s.revenue)}</b></div><div class="stat"><small>Orders</small><b>${s.orders}</b></div><div class="stat"><small>Pending orders</small><b>${s.pending}</b></div><div class="stat"><small>Customers</small><b>${s.customers}</b></div></div>
      <div class="dash-grid"><div class="panel"><h2>Revenue, last 14 days</h2><div class="chart">${days.map((d) => `<div class="bar" style="height:${Math.max(d.revenue / max * 100, 2)}%" data-tip="${d.d.slice(5)}: ${Z.money(d.revenue)}"></div>`).join('')}</div><div class="chart-labels">${days.map((d) => `<span>${d.d.slice(8)}</span>`).join('')}</div></div>
      <div><div class="panel" style="margin-bottom:16px"><h2>Low stock</h2><ul class="list-plain">${s.lowStock.map((p) => `<li><span>${Z.esc(p.name)}</span><b style="color:${p.stock ? 'var(--warn)' : 'var(--sale)'}">${p.stock ? p.stock + ' left' : 'Sold out'}</b></li>`).join('') || '<li>All good.</li>'}</ul></div>
      <div class="panel"><h2>Best sellers</h2><ul class="list-plain">${s.top.map((p) => `<li><span>${Z.esc(p.name)}</span><b>${p.sold} sold</b></li>`).join('') || '<li>No sales yet.</li>'}</ul></div></div></div>`;
  }

  // ---------- Products ----------
  let cats = [];
  async function products() {
    const [list, c] = await Promise.all([Z.api('/admin/products'), Z.api('/categories')]); cats = c;
    view.innerHTML = `<div class="admin-bar"><h1>Products <small style="color:var(--muted);font-size:15px">(${list.length})</small></h1><button class="btn" data-act="new-product">+ Add product</button></div>
      <div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map((p) => `<tr data-id="${p.id}"><td><div class="cell-flex"><img class="thumb" src="${Z.img(p.image)}" alt=""><div><b>${Z.esc(p.name)}</b>${p.featured ? ' <span class="pill confirmed">Featured</span>' : ''}</div></div></td>
        <td>${Z.esc(p.category_name || '-')}</td><td>${Z.money(p.price)}${p.compare_price ? `<br><small style="color:var(--muted)"><s>${Z.money(p.compare_price)}</s></small>` : ''}</td>
        <td style="color:${p.stock === 0 ? 'var(--sale)' : p.stock <= 5 ? 'var(--warn)' : 'inherit'};font-weight:600">${p.stock}</td>
        <td><span class="pill ${p.active ? 'delivered' : 'cancelled'}">${p.active ? 'Visible' : 'Hidden'}</span></td>
        <td><div class="actions"><button class="btn btn-outline btn-sm" data-act="edit-product">Edit</button><button class="btn btn-danger btn-sm" data-act="del-product">Delete</button></div></td></tr>`).join('') || '<tr><td colspan="6">No products yet.</td></tr>'}
      </tbody></table></div>`;
    view._products = list;
  }
  function productForm(p = {}) {
    openModal(`<h2>${p.id ? 'Edit product' : 'Add product'}</h2><form id="pForm" novalidate><div class="msg err" hidden></div>
      <div class="field"><label>Name</label><input class="input" name="name" value="${Z.esc(p.name || '')}" required maxlength="120"></div>
      <div class="row"><div class="field"><label>Price (Rs.)</label><input class="input" name="price" type="number" min="0" value="${p.price ?? ''}" required></div>
        <div class="field"><label>Old price (optional)</label><input class="input" name="compare_price" type="number" min="0" value="${p.compare_price ?? ''}"></div></div>
      <div class="row"><div class="field"><label>Stock</label><input class="input" name="stock" type="number" min="0" value="${p.stock ?? 0}" required></div>
        <div class="field"><label>Category</label><select class="select" name="category_id"><option value="">None</option>${cats.map((c) => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${Z.esc(c.name)}</option>`).join('')}</select></div></div>
      <div class="field"><label>Description</label><textarea class="textarea" name="description" maxlength="4000">${Z.esc(p.description || '')}</textarea></div>
      <div class="field"><label>Image</label><div class="cell-flex"><img class="preview" id="pv" src="${Z.img(p.image)}" alt=""><div style="flex:1"><input class="input" type="file" name="image" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG or WEBP, max 3 MB. Or paste an image link:</small><input class="input" name="image_url" placeholder="https://..." style="margin-top:6px"></div></div></div>
      <div style="display:flex;gap:22px;margin-bottom:8px"><label class="check"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> Featured on home page</label><label class="check"><input type="checkbox" name="active" ${p.active === 0 ? '' : 'checked'}> Visible in store</label></div>
      <div class="modal-foot"><button class="btn btn-outline" type="button" data-act="close">Cancel</button><button class="btn" type="submit">${p.id ? 'Save changes' : 'Add product'}</button></div></form>`);
    const f = Z.$('#pForm');
    f.image.onchange = () => { if (f.image.files[0]) Z.$('#pv').src = URL.createObjectURL(f.image.files[0]); };
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); const err = Z.$('.msg', f); err.hidden = true;
      const fd = new FormData(f); fd.set('featured', f.featured.checked ? '1' : '0'); fd.set('active', f.active.checked ? '1' : '0');
      if (!f.image.files[0]) fd.delete('image');
      try { await Z.api(p.id ? `/products/${p.id}` : '/products', { method: p.id ? 'PUT' : 'POST', form: fd }); closeModal(); Z.toast('Product saved'); render(); }
      catch (ex) { err.textContent = ex.message; err.hidden = false; }
    });
  }

  // ---------- Categories ----------
  async function categories() {
    const list = await Z.api('/categories'); view._cats = list;
    view.innerHTML = `<div class="admin-bar"><h1>Categories</h1><button class="btn" data-act="new-cat">+ Add category</button></div>
      <div class="table-wrap"><table><thead><tr><th>Category</th><th>Products</th><th></th></tr></thead><tbody>
      ${list.map((c) => `<tr data-id="${c.id}"><td><div class="cell-flex"><img class="thumb" src="${Z.img(c.image)}" alt=""><b>${Z.esc(c.name)}</b></div></td><td>${c.product_count}</td>
      <td><div class="actions"><button class="btn btn-outline btn-sm" data-act="edit-cat">Edit</button><button class="btn btn-danger btn-sm" data-act="del-cat">Delete</button></div></td></tr>`).join('') || '<tr><td colspan="3">No categories.</td></tr>'}</tbody></table></div>`;
  }
  function catForm(c = {}) {
    openModal(`<h2>${c.id ? 'Edit category' : 'Add category'}</h2><form id="cForm" novalidate><div class="msg err" hidden></div>
      <div class="field"><label>Name</label><input class="input" name="name" value="${Z.esc(c.name || '')}" required maxlength="60"></div>
      <div class="field"><label>Image</label><input class="input" type="file" name="image" accept="image/jpeg,image/png,image/webp"><input class="input" name="image_url" placeholder="or paste image link" style="margin-top:6px"></div>
      <div class="modal-foot"><button class="btn btn-outline" type="button" data-act="close">Cancel</button><button class="btn" type="submit">Save</button></div></form>`);
    const f = Z.$('#cForm');
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); const err = Z.$('.msg', f); err.hidden = true; const fd = new FormData(f); if (!f.image.files[0]) fd.delete('image');
      try { await Z.api(c.id ? `/categories/${c.id}` : '/categories', { method: c.id ? 'PUT' : 'POST', form: fd }); closeModal(); Z.toast('Category saved'); render(); }
      catch (ex) { err.textContent = ex.message; err.hidden = false; }
    });
  }

  // ---------- Orders ----------
  const STATUS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  async function orders(filter = '') {
    const list = await Z.api('/orders' + (filter ? `?status=${filter}` : ''));
    view.innerHTML = `<div class="admin-bar"><h1>Orders</h1><select class="select sm" id="ofilter"><option value="">All statuses</option>${STATUS.map((s) => `<option value="${s}" ${s === filter ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></div>
      <div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>
      ${list.map((o) => `<tr data-id="${o.id}"><td><b>${Z.esc(o.order_no)}</b><br><small style="color:var(--muted)">${Z.date(o.created_at)}</small></td>
        <td>${Z.esc(o.name)}<br><small style="color:var(--muted)">${Z.esc(o.phone)} &middot; ${Z.esc(o.city)}</small><br><small style="color:var(--muted)">${Z.esc(o.address)}</small>${o.notes ? `<br><small><i>Note: ${Z.esc(o.notes)}</i></small>` : ''}</td>
        <td class="items-inline">${o.items.map((i) => `${i.qty} x ${Z.esc(i.name)}`).join('<br>')}</td><td><b>${Z.money(o.total)}</b></td>
        <td><select class="select sm" data-act="status" ${o.status === 'cancelled' ? 'disabled' : ''}>${STATUS.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="5">No orders found.</td></tr>'}</tbody></table></div>`;
    Z.$('#ofilter').onchange = (e) => orders(e.target.value);
  }

  // ---------- Customers ----------
  async function customers() {
    const list = await Z.api('/admin/users');
    view.innerHTML = `<div class="admin-bar"><h1>Customers</h1></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Joined</th><th>Role</th></tr></thead><tbody>
      ${list.map((u) => `<tr><td><b>${Z.esc(u.name)}</b></td><td>${Z.esc(u.email)}</td><td>${Z.esc(u.phone || '-')}</td><td>${u.orders}</td><td>${Z.date(u.created_at)}</td><td><span class="pill ${u.role === 'admin' ? 'confirmed' : ''}">${u.role}</span></td></tr>`).join('')}</tbody></table></div>`;
  }

  // ---------- router + events ----------
  const views = { dashboard, products, categories, orders, customers };
  async function render() {
    Z.$$('.admin-side button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    view.innerHTML = '<div class="skel" style="min-height:240px"></div>';
    try { await views[tab](); } catch (e) { view.innerHTML = `<p class="msg err">${Z.esc(e.message)}</p>`; }
  }
  gate.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; history.replaceState(null, '', '#' + tab); render(); return; }
  });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = Number(b.closest('[data-id]')?.dataset.id); const act = b.dataset.act;
    try {
      if (act === 'close') closeModal();
      else if (act === 'new-product') productForm();
      else if (act === 'edit-product') productForm(view._products.find((p) => p.id === id));
      else if (act === 'del-product') { if (confirmBox('Delete this product permanently? Past orders keep their details.')) { await Z.api(`/products/${id}`, { method: 'DELETE' }); Z.toast('Product deleted'); render(); } }
      else if (act === 'new-cat') catForm();
      else if (act === 'edit-cat') catForm(view._cats.find((c) => c.id === id));
      else if (act === 'del-cat') { if (confirmBox('Delete this category? Its products will become uncategorised.')) { await Z.api(`/categories/${id}`, { method: 'DELETE' }); Z.toast('Category deleted'); render(); } }
    } catch (ex) { Z.toast(ex.message, 'err'); }
  });
  document.addEventListener('change', async (e) => {
    const s = e.target.closest('[data-act="status"]'); if (!s) return;
    const id = Number(s.closest('[data-id]').dataset.id);
    if (s.value === 'cancelled' && !confirmBox('Cancel this order? Stock will be returned and this cannot be undone.')) { render(); return; }
    try { await Z.api(`/orders/${id}/status`, { method: 'PATCH', body: { status: s.value } }); Z.toast('Order updated'); render(); }
    catch (ex) { Z.toast(ex.message, 'err'); render(); }
  });
  render();
})();
