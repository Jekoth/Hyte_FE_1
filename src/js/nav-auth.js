export function updateNavAuth() {
  const authLink = document.getElementById('authLink');
  if (!authLink) return;

  const token = localStorage.getItem('mealentry_token');

  if (token) {
    authLink.style.display = '';
    authLink.textContent = 'Kirjaudu ulos';
    authLink.href = '#logout';

    authLink.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem('mealentry_token');
      localStorage.removeItem('mealentry_user');
      window.location.href = 'index.html';
    };
  } else {
    authLink.style.display = '';
    authLink.textContent = 'Kirjaudu';
    authLink.href = 'login.html';
    authLink.onclick = null;
  }
}

export function hideLoginContentIfLoggedIn() {
  const token = localStorage.getItem('mealentry_token');

  document.querySelectorAll('[data-hide-when-logged-in]').forEach((el) => {
    el.style.display = token ? 'none' : '';
  });
}

hideLoginContentIfLoggedIn();
updateNavAuth();
