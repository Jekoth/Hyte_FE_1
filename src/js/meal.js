import { handleError } from './error-handler.js';

const mealRows = document.getElementById('mealRows');
const addRowBtn = document.getElementById('addRowBtn');
const form = document.getElementById('mealForm');
const formStatus = document.getElementById('formStatus');
const analyzeBtn = document.getElementById('analyzeBtn');
const saveMealBtn = document.getElementById('saveMealBtn');
const loadHistoryBtn = document.getElementById('loadHistoryBtn');
const result = document.getElementById('mealResult');
const historyList = document.getElementById('mealHistoryList');

const SEARCH_URL = 'https://world.openfoodfacts.net/cgi/search.pl';
const API_BASE_URL = '/api/meals';
const FETCH_TIMEOUT_MS = 15000;

let lastAnalysis = null;

const foodTranslations = {
  banaani: 'banana',
  omena: 'apple',
  päärynä: 'pear',
  appelsiini: 'orange',
  mandariini: 'mandarin',
  kana: 'chicken',
  kanafilee: 'chicken breast',
  broileri: 'chicken',
  riisi: 'rice',
  pasta: 'pasta',
  makaroni: 'macaroni',
  kaurahiutaleet: 'oats',
  kaura: 'oats',
  jogurtti: 'yogurt',
  yoghurt: 'yogurt',
  maito: 'milk',
  juusto: 'cheese',
  cheddar: 'cheddar',
  leipä: 'bread',
  ruisleipä: 'rye bread',
  kananmuna: 'egg',
  muna: 'egg',
  lohi: 'salmon',
  tonnikala: 'tuna',
  peruna: 'potato',
  kurkku: 'cucumber',
  tomaatti: 'tomato',
  salaatti: 'lettuce',
  avokado: 'avocado',
  maapähkinävoi: 'peanut butter',
  voi: 'butter',
  kinkku: 'ham',
  jauheliha: 'ground beef',
  naudanliha: 'beef',
  porsaanliha: 'pork',
};

const createRow = (name = '', grams = '') => {
  const row = document.createElement('div');
  row.className = 'meal-row';
  row.innerHTML = `
    <div>
      <label>Ruoka-aine</label>
      <input
        type="text"
        class="meal-name"
        placeholder="esim. kanafilee, riisi, banaani"
        value="${name}"
        required
      />
    </div>
    <div>
      <label>Määrä (g)</label>
      <input
        type="number"
        class="meal-grams"
        min="1"
        step="1"
        placeholder="100"
        value="${grams}"
        required
      />
    </div>
    <button type="button" class="btn-secondary remove-row">Poista</button>
  `;
  mealRows.appendChild(row);
};

const setStatus = (text = '', type = '') => {
  formStatus.textContent = text;
  formStatus.className = `status-box${type ? ` is-${type}` : ''}`;
  formStatus.style.display = text ? 'block' : 'none';
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round = (value) => Math.round((value + Number.EPSILON) * 10) / 10;

const getToken = () => localStorage.getItem('mealentry_token');

const pickNutriment = (nutriments, keys) => {
  for (const key of keys) {
    const value = nutriments?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return toNumber(value);
    }
  }
  return 0;
};

const normalizeQuery = (query) =>
  query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const translateFoodName = (query) => {
  const normalized = normalizeQuery(query);
  return foodTranslations[normalized] || normalized;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Ruokatietojen haku aikakatkaistiin. Yritä uudelleen.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJsonWithRetry = async (url, retries = 1) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await delay(600);
      }
    }
  }

  throw lastError;
};

const scoreProductMatch = (product, query) => {
  const nutriments = product?.nutriments || {};
  const name = (product?.product_name || '').toLowerCase();
  const brands = (product?.brands || '').toLowerCase();
  const q = normalizeQuery(query);

  let score = 0;

  if (name === q) score += 100;
  if (name.includes(q)) score += 50;
  if (brands.includes(q)) score += 10;

  if (pickNutriment(nutriments, ['energy-kcal_100g', 'energy-kcal']) > 0) score += 5;
  if (pickNutriment(nutriments, ['proteins_100g', 'proteins']) > 0) score += 5;
  if (pickNutriment(nutriments, ['carbohydrates_100g', 'carbohydrates']) > 0) score += 5;
  if (pickNutriment(nutriments, ['fat_100g', 'fat']) > 0) score += 5;

  return score;
};

const searchFood = async (query) => {
  const translatedQuery = translateFoodName(query);

  const url = new URL(SEARCH_URL);
  url.searchParams.set('search_terms', translatedQuery);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', '10');
  url.searchParams.set(
    'fields',
    'product_name,brands,nutriments,nutrition_grades,code'
  );

  const data = await fetchJsonWithRetry(url.toString(), 1);
  const products = Array.isArray(data.products) ? data.products : [];

  const validProducts = products.filter((product) => {
    const nutriments = product?.nutriments || {};
    return (
      pickNutriment(nutriments, ['energy-kcal_100g', 'energy-kcal']) > 0 ||
      pickNutriment(nutriments, ['proteins_100g', 'proteins']) > 0 ||
      pickNutriment(nutriments, ['carbohydrates_100g', 'carbohydrates']) > 0 ||
      pickNutriment(nutriments, ['fat_100g', 'fat']) > 0
    );
  });

  if (!validProducts.length) {
    throw new Error(`Ruoka-aineelle "${query}" ei löytynyt ravintoarvoja.`);
  }

  validProducts.sort(
    (a, b) => scoreProductMatch(b, translatedQuery) - scoreProductMatch(a, translatedQuery)
  );

  return validProducts[0];
};

const getMacrosPer100g = (product) => {
  const nutriments = product?.nutriments || {};

  return {
    kcal: pickNutriment(nutriments, ['energy-kcal_100g', 'energy-kcal']),
    protein: pickNutriment(nutriments, ['proteins_100g', 'proteins']),
    carbs: pickNutriment(nutriments, ['carbohydrates_100g', 'carbohydrates']),
    fat: pickNutriment(nutriments, ['fat_100g', 'fat']),
    sugar: pickNutriment(nutriments, ['sugars_100g', 'sugars']),
    fiber: pickNutriment(nutriments, ['fiber_100g', 'fiber']),
    salt: pickNutriment(nutriments, ['salt_100g', 'salt']),
    sodium: pickNutriment(nutriments, ['sodium_100g', 'sodium']) * 1000,
    nutriGrade: product?.nutrition_grades || '-',
    name: product?.product_name || 'Tuntematon tuote',
    brand: product?.brands || '',
    code: product?.code || '',
  };
};

const scaleMacros = (per100g, grams) => {
  const factor = grams / 100;
  return {
    kcal: per100g.kcal * factor,
    protein: per100g.protein * factor,
    carbs: per100g.carbs * factor,
    fat: per100g.fat * factor,
    sugar: per100g.sugar * factor,
    fiber: per100g.fiber * factor,
    salt: per100g.salt * factor,
    sodium: per100g.sodium * factor,
  };
};

const calculateScore = (totals) => {
  let score = 10;
  const notes = [];

  if (totals.kcal > 950) {
    score -= 3;
    notes.push('Erittäin suuri kalorimäärä yhdelle aterialle.');
  } else if (totals.kcal > 750) {
    score -= 2;
    notes.push('Melko suuri kalorimäärä.');
  } else if (totals.kcal >= 350 && totals.kcal <= 700) {
    notes.push('Kalorimäärä on kohtuullinen.');
  }

  if (totals.fat > 35) {
    score -= 2;
    notes.push('Rasvaa on paljon.');
  } else if (totals.fat > 20) {
    score -= 1;
    notes.push('Rasvaa on melko paljon.');
  }

  if (totals.sugar > 25) {
    score -= 2;
    notes.push('Sokeria on runsaasti.');
  } else if (totals.sugar > 12) {
    score -= 1;
    notes.push('Sokeria on kohtalaisesti.');
  }

  if (totals.salt > 2) {
    score -= 2;
    notes.push('Suolaa on paljon.');
  } else if (totals.salt > 1.2) {
    score -= 1;
    notes.push('Suolaa on melko paljon.');
  }

  if (totals.protein >= 25) {
    score += 1;
    notes.push('Proteiinia on hyvin.');
  }

  if (totals.fiber >= 8) {
    score += 1;
    notes.push('Kuitua on hyvin.');
  }

  if (totals.sugar > 20 && totals.fat > 20) {
    score -= 2;
    notes.push('Yhdistelmässä on paljon sekä sokeria että rasvaa.');
  }

  if (totals.carbs > 70 && totals.fiber < 5) {
    score -= 1;
    notes.push('Hiilihydraatteja on paljon mutta kuitua vähän.');
  }

  score = Math.max(1, Math.min(10, score));

  let label = 'Kohtalainen';
  let cssClass = 'score-mid';

  if (score >= 8) {
    label = 'Hyvä';
    cssClass = 'score-good';
  } else if (score <= 4) {
    label = 'Heikko';
    cssClass = 'score-bad';
  }

  return { score, label, cssClass, notes };
};

const renderResult = (totals, items, scoreInfo) => {
  result.innerHTML = `
    <span class="score-pill ${scoreInfo.cssClass}">
      Terveyspisteet: ${scoreInfo.score}/10 · ${scoreInfo.label}
    </span>

    <div class="meal-totals">
      <div class="metric"><small>Kalorit</small><strong>${round(totals.kcal)} kcal</strong></div>
      <div class="metric"><small>Proteiini</small><strong>${round(totals.protein)} g</strong></div>
      <div class="metric"><small>Hiilihydraatit</small><strong>${round(totals.carbs)} g</strong></div>
      <div class="metric"><small>Rasva</small><strong>${round(totals.fat)} g</strong></div>
      <div class="metric"><small>Sokeri</small><strong>${round(totals.sugar)} g</strong></div>
      <div class="metric"><small>Kuitu</small><strong>${round(totals.fiber)} g</strong></div>
      <div class="metric"><small>Suola</small><strong>${round(totals.salt)} g</strong></div>
      <div class="metric"><small>Natrium</small><strong>${Math.round(totals.sodium)} mg</strong></div>
    </div>

    <h3>Aterian arvio</h3>
    <ul class="analysis-list">
      ${
        scoreInfo.notes.length
          ? scoreInfo.notes.map((note) => `<li>${note}</li>`).join('')
          : '<li>Ei erityisiä varoituksia.</li>'
      }
    </ul>

    <h3>Käytetyt tuotteet</h3>
    <ul class="meal-list">
      ${items
        .map(
          (item) => `
            <li>
              <strong>${item.inputName}</strong> (${item.grams} g) → käytetty tuote:
              <strong>${item.product.name}</strong>
              ${item.product.brand ? ` / ${item.product.brand}` : ''}
              ${
                item.product.nutriGrade && item.product.nutriGrade !== '-'
                  ? ` / Nutri-Score ${item.product.nutriGrade.toUpperCase()}`
                  : ''
              }
            </li>
          `
        )
        .join('')}
    </ul>
  `;
};

const getFormItems = () => {
  const rows = [...document.querySelectorAll('.meal-row')];

  return rows
    .map((row) => {
      const inputName = row.querySelector('.meal-name')?.value.trim();
      const grams = toNumber(row.querySelector('.meal-grams')?.value);
      return { inputName, grams };
    })
    .filter((item) => item.inputName && item.grams > 0);
};

const buildMealName = (items) =>
  items
    .slice(0, 3)
    .map((item) => item.inputName)
    .join(', ');

const renderMealHistory = (meals) => {
  if (!Array.isArray(meals) || !meals.length) {
    historyList.innerHTML = 'Ei vielä haettuja tai tallennettuja aterioita.';
    return;
  }

  historyList.innerHTML = meals
    .map((meal) => {
      const safeMeal = encodeURIComponent(JSON.stringify(meal));
      const dateText = meal.created_at
        ? new Date(meal.created_at).toLocaleString('fi-FI')
        : '';

      return `
        <button type="button" class="history-item" data-meal="${safeMeal}">
          <strong>${meal.meal_name || 'Ateria'}</strong><br />
          <small>${dateText}</small><br />
          <small>Pisteet: ${meal.health_score}/10 · ${meal.health_label}</small>
        </button>
      `;
    })
    .join('');
};

const openSavedMeal = (meal) => {
  mealRows.innerHTML = '';

  const items = Array.isArray(meal.items_json) ? meal.items_json : [];

  if (!items.length) {
    createRow('', '');
  } else {
    items.forEach((item) => {
      createRow(item.name || '', item.grams || '');
    });
  }

  const scoreValue = Number(meal.health_score || 0);

  const scoreInfo = {
    score: scoreValue,
    label: meal.health_label || 'Kohtalainen',
    cssClass: scoreValue >= 8 ? 'score-good' : scoreValue <= 4 ? 'score-bad' : 'score-mid',
    notes: meal.analysis ? [meal.analysis] : [],
  };

  const totals = {
    kcal: Number(meal.calories || 0),
    protein: Number(meal.protein || 0),
    carbs: Number(meal.carbs || 0),
    fat: Number(meal.fat || 0),
    sugar: Number(meal.sugar || 0),
    fiber: Number(meal.fiber || 0),
    salt: Number(meal.salt || 0),
    sodium: Number(meal.sodium || 0),
  };

  const mappedItems = items.map((item) => ({
    inputName: item.name || '',
    grams: item.grams || 0,
    product: {
      name: item.matched_product || item.name || '',
      brand: item.brand || '',
      nutriGrade: item.nutriGrade || '-',
    },
  }));

  renderResult(totals, mappedItems, scoreInfo);

  lastAnalysis = {
    mealName: meal.meal_name || buildMealName(mappedItems),
    items: mappedItems,
    totals,
    scoreInfo,
  };

  setStatus('Edellinen haku avattu.', 'ok');
};

const loadMealHistory = async () => {
  const token = getToken();

  if (!token) {
    throw new Error('Kirjaudu sisään nähdäksesi edelliset haut.');
  }

  const res = await fetch(API_BASE_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => []);

  if (!res.ok) {
    throw new Error(data.message || 'Edellisten hakujen haku epäonnistui.');
  }

  renderMealHistory(data);
  return data;
};

const saveMealToBackend = async () => {
  const token = getToken();

  if (!token) {
    throw new Error('Kirjaudu sisään tallentaaksesi haun.');
  }

  if (!lastAnalysis) {
    throw new Error('Laske ateria ennen tallennusta.');
  }

  const payload = {
    meal_name: lastAnalysis.mealName || 'Ateria',
    items_json: lastAnalysis.items.map((item) => ({
      name: item.inputName,
      grams: item.grams,
      matched_product: item.product.name,
      brand: item.product.brand || '',
      nutriGrade: item.product.nutriGrade || '-',
    })),
    calories: round(lastAnalysis.totals.kcal),
    protein: round(lastAnalysis.totals.protein),
    carbs: round(lastAnalysis.totals.carbs),
    fat: round(lastAnalysis.totals.fat),
    sugar: round(lastAnalysis.totals.sugar),
    fiber: round(lastAnalysis.totals.fiber),
    salt: round(lastAnalysis.totals.salt),
    sodium: Math.round(lastAnalysis.totals.sodium),
    health_score: lastAnalysis.scoreInfo.score,
    health_label: lastAnalysis.scoreInfo.label,
    analysis: lastAnalysis.scoreInfo.notes.join(' '),
  };

  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Tallennus epäonnistui.');
  }

  return data;
};

addRowBtn.addEventListener('click', () => createRow());

mealRows.addEventListener('click', (event) => {
  if (!event.target.classList.contains('remove-row')) return;

  const rows = document.querySelectorAll('.meal-row');
  if (rows.length <= 1) return;

  event.target.closest('.meal-row')?.remove();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('');

  const items = getFormItems();
  if (!items.length) {
    setStatus('Lisää vähintään yksi ruoka-aine ja määrä grammoina.', 'error');
    return;
  }

  analyzeBtn.disabled = true;
  const oldText = analyzeBtn.textContent;
  analyzeBtn.textContent = 'Lasketaan...';
  setStatus('Lasketaan ateriaa...', 'loading');

  try {
    const token = getToken();

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch('/api/meals/analyze', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ items }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data.requiresLogin) {
        setStatus(
          data.message || 'Voit laskea ilman kirjautumista 3 kertaa. Kirjaudu jatkaaksesi.',
          'error'
        );
        return;
      }

      throw new Error(data.message || 'Aterian laskenta epäonnistui.');
    }

    const totals = data.totals || {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      sugar: 0,
      fiber: 0,
      salt: 0,
      sodium: 0,
    };

    const resolvedItems = data.items || [];
    const scoreInfo = data.scoreInfo || {
      score: 0,
      label: 'Kohtalainen',
      cssClass: 'score-mid',
      notes: [],
    };

    renderResult(totals, resolvedItems, scoreInfo);

    lastAnalysis = {
      mealName: data.mealName || buildMealName(resolvedItems),
      items: resolvedItems,
      totals,
      scoreInfo,
    };

    if (typeof data.guestUsesRemaining === 'number' && !token) {
      setStatus(
        `Ateria laskettu onnistuneesti. Ilmaisia laskuja jäljellä: ${data.guestUsesRemaining}.`,
        'ok'
      );
    } else {
      setStatus('Ateria laskettu onnistuneesti.', 'ok');
    }
  } catch (error) {
    handleError(error, setStatus, 'Aterian laskenta epäonnistui.');
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = oldText;
  }
});

saveMealBtn.addEventListener('click', async () => {
  saveMealBtn.disabled = true;
  const oldText = saveMealBtn.textContent;
  saveMealBtn.textContent = 'Tallennetaan...';

  try {
    await saveMealToBackend();
    setStatus('Haku tallennettu onnistuneesti.', 'ok');
    await loadMealHistory();
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Tallennus epäonnistui.', 'error');
  } finally {
    saveMealBtn.disabled = false;
    saveMealBtn.textContent = oldText;
  }
});

loadHistoryBtn.addEventListener('click', async () => {
  loadHistoryBtn.disabled = true;
  const oldText = loadHistoryBtn.textContent;
  loadHistoryBtn.textContent = 'Haetaan...';

  try {
    setStatus('Haetaan edellisiä hakuja...', 'loading');
    await loadMealHistory();
    setStatus('Edelliset haut haettu.', 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Hakujen lataus epäonnistui.', 'error');
  } finally {
    loadHistoryBtn.disabled = false;
    loadHistoryBtn.textContent = oldText;
  }
});

historyList.addEventListener('click', (event) => {
  const button = event.target.closest('.history-item');
  if (!button) return;

  try {
    const meal = JSON.parse(decodeURIComponent(button.dataset.meal));
    openSavedMeal(meal);
  } catch (error) {
    console.error(error);
    setStatus('Tallennetun haun avaaminen epäonnistui.', 'error');
  }
});

createRow('kanafilee', '150');
createRow('riisi', '180');
createRow('jogurtti', '150');
