import { apiFetchPublic, normalizeErrorMessage } from './api.js';
import { handleError } from './error-handler.js';

const form = document.getElementById('registerForm');
const msg = document.getElementById('formMsg');
const btn = document.getElementById('registerBtn');

if (form && msg && btn) {
  const setMsg = (text, ok = false) => {
    msg.textContent = text;
    msg.style.display = text ? 'block' : 'none';
    msg.style.color = ok ? 'rgba(24, 140, 70, 1)' : 'rgba(200, 40, 40, 1)';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg('');

    const username = document.getElementById('username')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const password2 = document.getElementById('password2')?.value;

    if (!username || !email || !password) {
      setMsg('Täytä kaikki kentät.');
      return;
    }

    if (password.length < 6) {
      setMsg('Salasanan pitää olla vähintään 6 merkkiä.');
      return;
    }

    if (password !== password2) {
      setMsg('Salasanat eivät täsmää.');
      return;
    }

    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = 'Luodaan tili...';

    try {
      await apiFetchPublic('/users', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });

      const loginData = await apiFetchPublic('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      localStorage.setItem('mealentry_token', loginData.token);
      localStorage.setItem('mealentry_user', JSON.stringify(loginData.user));

      setMsg('Tili luotu! Siirrytään…', true);
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 600);
    } catch (error) {
      handleError(error, setMessage, 'Rekisteröinti epäonnistui.');
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  });
}
