(async () => {
  await Z.init('shop');
  const q = Z.qs();
  const state = { search: q.get('search') || '', category: q.get('category') || '', sort: q.get('sort') || 'newest', min: q.get('min') || '', max: q.get('max') || '', instock: q.get('instock') === '1', featured: q.get('featured') === '1', page: Number(q.get('page')) || 1 };
  const grid = Z.$('#grid'), count = Z.$('#count'), pager = Z.$('#pager');

  const cats = await Z.api('/categories').catch(() => []);
  const total = cats.reduce((n, c) => n + c.product_count, 0);
  Z.$('#catList').innerHTML = `<label class="opt"><span class="lbl"><input type="radio" name="cat" value="" ${!state.category ? 'checked' : ''}>All</span><span>${total}</span></label>` +
    cats.map((c) => `<label class="opt"><span class="lbl"><input type="radio" name="cat" value="${Z.esc(c.slug)}" ${state.category === c.slug ? 'checked' : ''}>${Z.esc(c.name)}</span><span>${c.product_count}</span></label>`).join('');
  Z.$('#fSearch').value = state.search; Z.$('#fMin').value = state.min; Z.$('#fMax').value = state.max;
  Z.$('#fStock').checked = state.instock; Z.$('#sort').value = state.sort;

  function sync() {
    const p = new URLSearchParams();
    if (state.search) p.set('search', state.search);
    if (state.category) p.set('category', state.category);
    if (state.sort !== 'newest') p.set('sort', state.sort);
    if (state.min) p.set('min', state.min);
    if (state.max) p.set('max', state.max);
    if (state.instock) p.set('instock', '1');
    if (state.featured) p.set('featured', '1');
    if (state.page > 1) p.set('page', state.page);
    history.replaceState(null, '', '/shop' + (p.toString() ? '?' + p : ''));
    return p;
  }
  async function load() {
    const p = sync(); p.set('limit', 9);
    grid.innerHTML = Z.skeletons(6);
    try {
      const r = await Z.api('/products?' + p);
      count.textContent = `${r.total} product${r.total === 1 ? '' : 's'}`;
      grid.innerHTML = r.items.length ? r.items.map(Z.productCard).join('') : '<div class="empty" style="grid-column:1/-1"><h2>No products found</h2><p>Try different filters or search words.</p></div>';
      pager.innerHTML = r.pages > 1 ? Array.from({ length: r.pages }, (_, i) => `<button data-page="${i + 1}" class="${r.page === i + 1 ? 'on' : ''}">${i + 1}</button>`).join('') : '';
      const cat = cats.find((c) => c.slug === state.category);
      Z.$('#shopTitle').textContent = state.search ? `Results for "${state.search}"` : cat ? cat.name : 'All products';
    } catch (e) { grid.innerHTML = `<p class="msg err" style="grid-column:1/-1">${Z.esc(e.message)}</p>`; }
  }
  const apply = () => { state.page = 1; load(); };
  Z.$('#catList').addEventListener('change', (e) => { state.category = e.target.value; apply(); });
  Z.$('#sort').onchange = (e) => { state.sort = e.target.value; apply(); };
  Z.$('#fStock').onchange = (e) => { state.instock = e.target.checked; apply(); };
  Z.$('#filterForm').addEventListener('submit', (e) => { e.preventDefault(); state.search = Z.$('#fSearch').value.trim(); state.min = Z.$('#fMin').value; state.max = Z.$('#fMax').value; apply(); });
  Z.$('#clear').onclick = () => { location.href = '/shop'; };
  Z.$('#filterToggle').onclick = () => Z.$('#filters').classList.toggle('open');
  pager.addEventListener('click', (e) => { const b = e.target.closest('[data-page]'); if (b) { state.page = Number(b.dataset.page); load(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
  load();
})();
