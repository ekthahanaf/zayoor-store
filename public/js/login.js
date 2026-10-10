(async () => {
  await Z.init('');
  const next = Z.safeNext(Z.qs().get('next'));
  if (Z.user) { location.replace(Z.user.role === 'admin' && !Z.qs().get('next') ? '/admin' : next); return; }
  const tabs = Z.$$('.tabs button'), forms = { login: Z.$('#loginForm'), register: Z.$('#registerForm') };
  const show = (t) => { tabs.forEach((b) => b.classList.toggle('on', b.dataset.tab === t)); Object.entries(forms).forEach(([k, el]) => (el.hidden = k !== t)); Z.$('#title').textContent = t === 'login' ? 'Welcome back' : 'Create your account'; Z.$('#sub').textContent = t === 'login' ? 'Log in to see your orders and check out faster.' : 'It takes less than a minute.'; };
  tabs.forEach((b) => (b.onclick = () => show(b.dataset.tab)));
  show(Z.qs().get('tab') === 'register' ? 'register' : 'login');

  function wire(form, path, fields) {
    const err = Z.$('.msg', form), btn = Z.$('button[type=submit]', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); err.hidden = true; btn.disabled = true;
      try {
        const { user } = await Z.api(path, { method: 'POST', body: Object.fromEntries(fields.map((n) => [n, form[n].value])) });
        location.href = user.role === 'admin' && !Z.qs().get('next') ? '/admin' : next;
      } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
    });
  }
  wire(forms.login, '/auth/login', ['email', 'password']);
  wire(forms.register, '/auth/register', ['name', 'email', 'password']);
})();
