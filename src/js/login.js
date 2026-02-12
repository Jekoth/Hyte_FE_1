const BASE_URL = 'http://127.0.0.1:3000/api';

const form = document.getElementById('loginForm');
const msg = document.getElementById('formMsg');
const btn = document.getElementById('loginBtn');

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
    const password = document.getElementById('password')?.value;

    if (!username || !password) return setMsg('Täytä käyttäjänimi ja salasana.');

    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = 'Kirjaudutaan...';

    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password}),
      });

      const data = await safeJson(res);
      if (!res.ok) return setMsg(data.message || 'Kirjautuminen epäonnistui');

      localStorage.setItem('mealentry_token', data.token);
      localStorage.setItem('mealentry_user', JSON.stringify(data.user));

      setMsg('Kirjautuminen onnistui! Siirrytään…', true);
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
