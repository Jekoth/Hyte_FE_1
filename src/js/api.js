const BASE_URL = 'http://127.0.0.1:3000/api';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('mealentry_token');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const getItemsBtn = document.getElementById('getItemsBtn');
if (getItemsBtn) {
  getItemsBtn.addEventListener('click', async () => {
    //
  });
}
