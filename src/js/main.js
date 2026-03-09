import '../css/style.css';
import '../css/mobile.css';
import './nav-auth.js';

function updateNavAuth() {
  const authLink = document.getElementById('authLink');
  if (!authLink) return;

  const badge = document.getElementById('userBadge');
  const token = localStorage.getItem('mealentry_token');
  const userRaw = localStorage.getItem('mealentry_user');

  if (token) {
    authLink.textContent = 'Kirjaudu ulos';
    authLink.href = '#logout';

    //näyttä käyttäjänimi jos löytyy
    if (badge) {
      try {
        const user = JSON.parse(userRaw || '{}');
        badge.textContent = user?.username ? `${user.username}` : '';
      } catch {
        badge.textContent = '';
      }
    }

    authLink.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem('mealentry_token');
      localStorage.removeItem('mealentry_user');
      window.location.href = 'index.html';
    };
  } else {
    authLink.textContent = 'Kirjaudu';
    authLink.href = 'login.html';
    authLink.onclick = null;
    if (badge) badge.textContent = '';
  }
}

updateNavAuth();
