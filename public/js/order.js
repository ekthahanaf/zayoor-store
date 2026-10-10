(async () => {
  await Z.init('');
  let o = null;
  try { o = JSON.parse(sessionStorage.getItem('zayoor.lastOrder')); } catch { /* none */ }
  if (!o) { location.replace('/track'); return; }
  Z.$('#orderNo').textContent = o.order_no;
  Z.$('#orderBox').innerHTML = Z.orderHtml(o);
  Z.$('#mailNote').textContent = `Keep your order number and the email you used (${o.email}) to track this order.`;
})();
