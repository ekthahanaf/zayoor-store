(async () => {
  await Z.init('track');
  const f = Z.$('#trackForm'), out = Z.$('#result'), err = Z.$('#err');
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); err.hidden = true; out.innerHTML = '';
    try {
      const o = await Z.api(`/orders/track?order_no=${encodeURIComponent(f.order_no.value)}&email=${encodeURIComponent(f.email.value)}`);
      out.innerHTML = Z.orderHtml(o);
    } catch (ex) { err.textContent = ex.message; err.hidden = false; }
  });
})();
