const API_BASE_URL = '/api';

const safeJson = async (res) => {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return {};
  }

  try {
    return await res.json();
  } catch {
    return {};
  }
};

const normalizeErrorMessage = (error, fallback = 'Pyyntö epäonnistui.') => {
  if (!error) return fallback;

  if (typeof error === 'string') return error;

  if (error.name === 'AbortError') {
    return 'Pyyntö aikakatkaistiin. Yritä uudelleen.';
  }

  if (error.message === 'Failed to fetch') {
    return 'Yhteys backendille epäonnistui. Tarkista että serveri on käynnissä.';
  }

  return error.message || fallback;
};

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('mealentry_token');

  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res;

  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    throw new Error(normalizeErrorMessage(error));
  }

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return data;
}

export async function apiFetchPublic(path, options = {}) {
  let res;

  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      credentials: 'include',
    });
  } catch (error) {
    throw new Error(normalizeErrorMessage(error));
  }

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return data;
}

export { normalizeErrorMessage };
