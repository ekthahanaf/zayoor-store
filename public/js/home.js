(async () => {
  await Z.init('home');
  const cats = Z.$('#cats'), feat = Z.$('#featured');
  feat.innerHTML = Z.skeletons(4);
  try {
    const [c, f] = await Promise.all([Z.api('/categories'), Z.api('/products?featured=1&limit=8')]);
    cats.innerHTML = c.map((x) => `<a class="cat-tile" href="/shop?category=${encodeURIComponent(x.slug)}"><img src="${Z.img(x.image)}" alt="" loading="lazy"><h3>${Z.esc(x.name)}</h3><span>${x.product_count} items</span></a>`).join('');
    const arts = f.items.slice(0, 3).map((p) => `<img src="${Z.img(p.image)}" alt="">`).join('');
    Z.$('#heroArt').innerHTML = arts;
    feat.innerHTML = f.items.length ? f.items.map(Z.productCard).join('') : '<p>No featured products yet.</p>';
  } catch (e) { feat.innerHTML = `<p class="msg err">${Z.esc(e.message)}</p>`; }
  Z.$('#perkShip').textContent = `On orders over ${Z.money(Z.config.freeShippingOver)}`;
})();
