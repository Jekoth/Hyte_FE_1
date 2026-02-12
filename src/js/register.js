const BASE_URL = 'http://127.0.0.1:3000/api';

const form = document.getElementById('registerForm');
const msg = document.getElementById('formMsg');
const btn = document.getElementById('registerBtn');

if (form && msg && btn) {
  const setMsg = (text, ok = false) => {
    msg.textContent = text;
    msg.style.display = text ? 'block' : 'none';
    msg.style.color = ok ? 'rgba(24, 140, 70, 1)' : 'rgba(200, 40, 40, 1)';
  };

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg('');

    const username = document.getElementById('username')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const password2 = document.getElementById('password2')?.value;

    if (!username || !email || !password) return setMsg('Täytä kaikki kentät.');
    if (password.length < 6) return setMsg('Salasanan pitää olla vähintään 6 merkkiä.');
    if (password !== password2) return setMsg('Salasanat eivät täsmää.');

    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = 'Luodaan tili...';

    try {
      // register
      const regRes = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, email, password}),
      });

      const regData = await safeJson(regRes);
      if (!regRes.ok) return setMsg(regData.message || 'Rekisteröinti epäonnistui');

      // auto- login
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password}),
      });

      const loginData = await safeJson(loginRes);
      if (!loginRes.ok) return setMsg('Tili luotu, mutta kirjautuminen epäonnistui. Kirjaudu erikseen.');

      localStorage.setItem('mealentry_token', loginData.token);
      localStorage.setItem('mealentry_user', JSON.stringify(loginData.user));

      setMsg('Tili luotu! Siirrytään…', true);
      setTimeout(() => (window.location.href = 'index.html'), 600);
    } catch (err) {
      console.error(err);
      setMsg('Yhteys backendille epäonnistui. Onko serveri käynnissä portissa 3000?');
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  });
}
