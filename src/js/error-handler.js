const getErrorMessage = (error, fallback = 'Pyyntö epäonnistui.') => {
  if (!error) return fallback;

  // Abortcontroller timeout
  if (error.name === 'AbortError') {
    return 'Pyyntö aikakatkaistiin. Yritä uudelleen.';
  }

  // Network error
  if (error.message === 'Failed to fetch') {
    return 'Yhteys backendille epäonnistui. Tarkista että serveri on käynnissä.';
  }

  // API error message
  if (typeof error === 'string') {
    return error;
  }

  return error.message || fallback;
};


const handleError = (error, setStatus, fallback = 'Virhe tapahtui.') => {
  console.error(error);

  const message = getErrorMessage(error, fallback);

  if (typeof setStatus === 'function') {
    setStatus(message, 'error');
  } else {
    alert(message);
  }
};


export { getErrorMessage, handleError };
