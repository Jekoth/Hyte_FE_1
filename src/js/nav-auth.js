export function updateNavAuth() {
  const authLink = document.getElementById('authLink');
  if (!authLink) return;

  const token = localStorage.getItem('mealentry_token');

  if (token) {
    authLink.textContent = 'Kirjaudu ulos';
    authLink.href = '#logout';

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
  }
}

//ajetaan heti kun tiedosto ladataan
updateNavAuth();
