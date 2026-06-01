const toggle = document.getElementById('theme-toggle');

function updateIcon() {
  if (!toggle) return;
  toggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}

// Inicjalizacja ikony przy ładowaniu skryptu
updateIcon();

if (toggle) {
  toggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    updateIcon();
  });
}

const PROVINCE_CODES = {
  dolnoslaskie: '01',
  'kujawsko-pomorskie': '02',
  lubelskie: '03',
  lubuskie: '04',
  lodzkie: '05',
  malopolskie: '06',
  mazowieckie: '07',
  opolskie: '08',
  podkarpackie: '09',
  podlaskie: '10',
  pomorskie: '11',
  slaskie: '12',
  swietokrzyskie: '13',
  'warminsko-mazurskie': '14',
  wielkopolskie: '15',
  zachodniopomorskie: '16'
};

// =====================
//  STRONA GŁÓWNA  (index.html)
// =====================
const searchForm = document.querySelector('.search-form');
const searchBtn = document.querySelector('.btn-search');

// Funkcja wykonująca wyszukiwanie
function executeSearch() {
  const provinceSelect = document.querySelector('.form-select');
  const benefitInputElem = document.getElementById('benefit-input');
  const cityInput      = document.getElementById('city-input');
  const pilnyRadio     = document.getElementById('pilny');

  const province = provinceSelect ? provinceSelect.value : '';
  const benefit  = benefitInputElem ? benefitInputElem.value.trim() : '';
  const city     = cityInput ? cityInput.value.trim() : '';
  const caseType = (pilnyRadio && pilnyRadio.checked) ? '2' : '1';

  if (!province) {
    alert('Wybierz województwo.');
    return;
  }

  if (!benefit) {
    alert('Wpisz specjalistę.');
    return;
  }

  localStorage.setItem('nfz_search', JSON.stringify({ province, benefit, city, caseType }));
  window.location.href = 'results.html';
}

// 1. Obsługa tradycyjnego kliknięcia myszką w przycisk
if (searchBtn) {
  searchBtn.addEventListener('click', e => {
    e.preventDefault();
    executeSearch();
  });
}

// 2. Globalna obsługa Entera dla całego formularza
if (searchForm) {
  searchForm.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    }
  });
}

// =====================
//  INICJALIZACJA STRON
// =====================
document.addEventListener('DOMContentLoaded', () => {
  // Aktualizacja ikony po pełnym załadowaniu DOM, aby zgrała się ze skryptem z sekcji body
  updateIcon();

  if (document.getElementById('city-input')) {
    getDeviceLocation();
  }

  if (document.querySelector('.results-grid')) {
    initResultsPage();
  }
});

// =====================
//  GEOLOKALIZACJA (OpenStreetMap Reverse Geocoding)
// =====================
function getDeviceLocation() {
  if (!navigator.geolocation) {
    console.error('Geolokalizacja nie jest wspierana przez tę przeglądarkę.');
    return;
  }

  const cityInput = document.getElementById('city-input');
  if (cityInput) {
    cityInput.placeholder = 'Ustalanie lokalizacji... ⏳';
  }

  const geoOptions = {
    enableHighAccuracy: false,
    timeout: 15000,
    maximumAge: 60000
  };

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;

      fetch(url, {
        method: 'GET',
        headers: {
          'Accept-Language': 'pl',
          'User-Agent': 'SyntaxErrorProjectNFZ/1.0 (kontakt: student@ug.edu.pl)'
        }
      })
        .then(res => {
          if (!res.ok) throw new Error(`Błąd sieci API map: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (!data?.address || !cityInput) return;

          const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.municipality;

          if (city) {
            cityInput.value = city;
          } else {
            cityInput.placeholder = 'Miejscowość';
          }
        })
        .catch(err => {
          console.error('Błąd pobierania nazwy miasta z API Nominatim:', err);
          if (cityInput) cityInput.placeholder = 'Miejscowość';
        });
    },
    err => {
      console.warn(`Błąd systemu geolokalizacji (${err.code}): ${err.message}`);
      if (!cityInput) return;

      if (err.code === 1) {
        cityInput.placeholder = 'Odmowa dostępu do lokalizacji';
      } else {
        cityInput.placeholder = 'Wpisz miejscowość ręcznie...';
      }
    },
    geoOptions
  );
}

// =====================
//  STRONA WYNIKÓW  (results.html)
// =====================
function initResultsPage() {
  const raw = localStorage.getItem('nfz_search');
  if (!raw) {
    showError('Brak danych wyszukiwania. Wróć na stronę główną.');
    return;
  }

  const params = JSON.parse(raw);
  prefillFilters(params);
  updateResultsHeader(params);
  fetchQueues(params);

  const applyBtn = document.getElementById('apply-filters');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const updatedParams = {
        province: document.getElementById('filter-province').value,
        benefit: document.getElementById('filter-benefit').value.trim(),
        city: document.getElementById('filter-city').value.trim(),
        caseType: params.caseType
      };

      localStorage.setItem('nfz_search', JSON.stringify(updatedParams));
      updateResultsHeader(updatedParams);
      fetchQueues(updatedParams);
    });
  }
}

function updateResultsHeader(params) {
  const header = document.querySelector('.results-info h1');
  if (!header) return;

  const city = params.city ? `, ${params.city}` : '';
  const caseStr = params.caseType === '2' ? 'Pilny' : 'Stabilny';
  header.textContent = `WYNIKI DLA: ${params.benefit.toUpperCase()}${city} — ${caseStr}`;
}

function prefillFilters(params) {
  const prov = document.getElementById('filter-province');
  const bene = document.getElementById('filter-benefit');
  const city = document.getElementById('filter-city');

  if (prov) prov.value = params.province;
  if (bene) bene.value = params.benefit;
  if (city) city.value = params.city || '';
}

/* async function fetchQueues(params, page = 1) {
  const grid = document.querySelector('.results-grid');
  if (!grid) return;

  grid.innerHTML = '<p class="loading-msg">Wyszukiwanie terminów...</p>';
  clearPagination();

  const provinceCode = PROVINCE_CODES[params.province] || params.province;
  const url = new URL('https://api.nfz.gov.pl/app-itl-api/queues');

  url.searchParams.set('province', provinceCode);
  url.searchParams.set('name', 'example');
  url.searchParams.set('benefit', params.benefit);
  url.searchParams.set('page', page);
  url.searchParams.set('limit', 12);
  url.searchParams.set('format', 'json');

  if (params.city) {
    url.searchParams.set('locality', params.city);
  }

  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (json.errors) {
      showError(`API zwróciło błąd: ${json.errors[0]['errorr-reason']}`);
      return;
    }

    renderCards(json.data, grid);
    renderPagination(json.meta, params);
  } catch (err) {
    showError(`Nie udało się pobrać wyników. Sprawdź połączenie z internetem.<br><small>${err.message}</small>`);
  }
} */

async function fetchQueues(params, page = 1) {
  const grid = document.querySelector('.results-grid');
  if (!grid) return;

  grid.innerHTML = '<p class="loading-msg">Wyszukiwanie terminów...</p>';
  clearPagination();

  const provinceCode = PROVINCE_CODES[params.province] || params.province;
  const url = new URL('https://api.nfz.gov.pl/app-itl-api/queues');

  // Ustawianie parametrów API
  url.searchParams.set('province', provinceCode);
  url.searchParams.set('case', params.caseType); // 🔥 NAPRAWIONE: Teraz NFZ rozróżnia tryb Pilny/Stabilny
  url.searchParams.set('benefit', params.benefit);
  url.searchParams.set('page', page);
  url.searchParams.set('limit', 12);
  url.searchParams.set('format', 'json');
  // Usunięto parametr 'name', który blokował wyniki wyszukiwania

  if (params.city) {
    url.searchParams.set('locality', params.city);
  }

  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (json.errors) {
      showError(`API zwróciło błąd: ${json.errors[0]['errorr-reason']}`);
      return;
    }

    if (!json.data || json.data.length === 0) {
      renderCards(json.data, grid);
      return;
    }

    // ==========================================
    // 🔥 NOWOŚĆ: SORTOWANIE I FILTROWANIE PO DACIE
    // ==========================================
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetujemy godzinę do północy dla dokładnego porównania

    const sortedData = json.data
      // 1. Opcjonalnie filtrujemy przeterminowane daty (jeśli API NFZ zwróci błąd cache)
      .filter(item => {
        const dateStr = item.attributes.dates?.date;
        if (item.attributes.dates?.applicable && dateStr) {
          const appointmentDate = new Date(dateStr);
          appointmentDate.setHours(0, 0, 0, 0);
          return appointmentDate >= today; // Zostawiamy tylko dzisiejsze i przyszłe terminy
        }
        return true; // Zostawiamy też placówki z "brak danych", przeniesiemy je na koniec
      })
      // 2. Sortujemy od najbliższego terminu do najdalszego
      .sort((a, b) => {
        const dateAStr = a.attributes.dates?.applicable ? a.attributes.dates?.date : null;
        const dateBStr = b.attributes.dates?.applicable ? b.attributes.dates?.date : null;

        const dateA = dateAStr ? new Date(dateAStr) : null;
        const dateB = dateBStr ? new Date(dateBStr) : null;

        if (dateA && dateB) return dateA - dateB; // Wcześniejsza data (najbliższa) ląduje wyżej
        if (dateA) return -1;                     // Jeśli tylko 'a' ma datę, trafia wyżej niż 'b'
        if (dateB) return 1;                      // Jeśli tylko 'b' ma datę, trafia wyżej niż 'a'
        return 0;                                 // Jeśli obie placówki nie mają daty, zachowują kolejność
      });

    // Renderujemy posegregowane karty
    renderCards(sortedData, grid);
    renderPagination(json.meta, params);
  } catch (err) {
    showError(`Nie udało się pobrać wyników. Sprawdź połączenie z internetem.<br><small>${err.message}</small>`);
  }
}

function renderCards(data, grid) {
  grid.innerHTML = '';

  if (!data || data.length === 0) {
    grid.innerHTML = '<p class="loading-msg">Brak wyników dla podanych kryteriów. Spróbuj zmienić wyszukiwanie.</p>';
    return;
  }

  data.forEach(item => {
    const attr = item.attributes;
    const name = attr.provider || 'Nieznana placówka';
    const address = [attr.address, attr.place].filter(Boolean).join(', ') || '—';
    const city = attr.locality || '';
    const benefit = attr.benefit || '—';
    const firstAvailable = attr.dates || null;
    const waitDays = attr.statistics?.['provider-data']?.['average-period'] ?? null;
    const phone = attr.phone || null;

    const dateStr =
      firstAvailable?.applicable && firstAvailable?.date
        ? formatDate(firstAvailable.date)
        : '<span style="color:#aaa">brak danych</span>';
    const waitStr =
      waitDays !== null
        ? `<p class="wait-info">Śr. oczekiwanie: <strong>${waitDays} dni</strong></p>`
        : '';
    const phoneStr = phone ? `<p class="phone-info">📞 ${phone}</p>` : '';

    const card = document.createElement('article');
    card.className = 'result-card';
    card.innerHTML = `
      <h3>${escHtml(name)}</h3>
      <p>${escHtml(address)}${city ? ', ' + escHtml(city) : ''}</p>
      ${phoneStr}
      <div class="term-box">
        <span>NAJBLIŻSZY TERMIN:</span>
        <strong>${dateStr}</strong>
      </div>
      ${waitStr}
      <p class="benefit-label">${escHtml(benefit)}</p>
    `;

    grid.appendChild(card);
  });
}

function renderPagination(meta, params) {
  const pagers = [document.getElementById('pagination-top'), document.getElementById('pagination-bottom')].filter(Boolean);
  pagers.forEach(pager => {
    pager.innerHTML = '';
    pager.style.display = 'none';
  });

  if (!meta || meta.count <= meta.limit) return;

  const totalPages = Math.ceil(meta.count / meta.limit);
  const current = meta.page;
  const pages = new Set([1, current - 1, current, current + 1, totalPages].filter(p => p >= 1 && p <= totalPages));
  let prev = null;

  [...pages].sort((a, b) => a - b).forEach(pageNumber => {
    if (prev !== null && pageNumber - prev > 1) {
      pagers.forEach(pager => {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.className = 'pagination-dots';
        pager.appendChild(dots);
      });
    }

    pagers.forEach(pager => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = pageNumber;
      btn.className = `pagination-btn${pageNumber === current ? ' is-active' : ''}`;

      if (pageNumber !== current) {
        btn.addEventListener('click', () => fetchQueues(params, pageNumber));
      }

      pager.appendChild(btn);
      pager.style.display = 'flex';
    });

    prev = pageNumber;
  });
}

function clearPagination() {
  ['pagination-top', 'pagination-bottom'].forEach(id => {
    const pager = document.getElementById(id);
    if (!pager) return;
    pager.innerHTML = '';
    pager.style.display = 'none';
  });
}

function showError(msg) {
  const grid = document.querySelector('.results-grid');
  if (grid) {
    grid.innerHTML = `<p class="loading-msg" style="color:#c0392b">${msg}</p>`;
  }
  clearPagination();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =====================
// AUTOCOMPLETE SPECJALISTÓW (WERSJA UNIWERSALNA)
// =====================
let autocompleteTimeout = null;

// Uniwersalne pobieranie sugestii z API dla wskazanego inputu i boksu
async function fetchBenefitSuggestions(query, input, box) {
  if (!query || query.length < 2) {
    hideSuggestions(box);
    return;
  }

  try {
    const url = new URL('https://api.nfz.gov.pl/app-itl-api/queues');
    url.searchParams.set('benefit', query);
    url.searchParams.set('limit', 10);
    url.searchParams.set('page', 1);
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json.data) {
      hideSuggestions(box);
      return;
    }

    // Pobieramy unikalne nazwy świadczeń
    const benefits = [
      ...new Set(
        json.data
          .map(item => item.attributes?.benefit)
          .filter(Boolean)
      )
    ];

    renderSuggestions(benefits, input, box);
  } catch (err) {
    console.error('Błąd pobierania sugestii:', err);
    hideSuggestions(box);
  }
}

// Uniwersalne renderowanie listy sugestii
function renderSuggestions(items, input, box) {
  if (!box) return;
  box.innerHTML = '';

  if (!items.length) {
    hideSuggestions(box);
    return;
  }

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.textContent = item;

    div.addEventListener('click', () => {
      if (input) input.value = item;
      hideSuggestions(box);
    });

    box.appendChild(div);
  });

  box.style.display = 'block';
}

// Uniwersalne ukrywanie wskazanego boksu
function hideSuggestions(box) {
  if (!box) return;
  box.style.display = 'none';
  box.innerHTML = '';
}

// Funkcja inicjalizująca parę: pole tekstowe + boks podpowiedzi
function initAutocomplete(inputId, boxId) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(boxId);

  if (!input || !box) return; // Jeśli nie ma elementów na danej stronie, przerywamy bez błędów

  input.addEventListener('input', e => {
    const query = e.target.value.trim();
    clearTimeout(autocompleteTimeout);

    // Debounce
    autocompleteTimeout = setTimeout(() => {
      fetchBenefitSuggestions(query, input, box);
    }, 300);
  });
}

// AKTYWACJA PODPOWIEDZI DLA OBU STRON
initAutocomplete('benefit-input', 'suggestions-box');         // Strona główna
initAutocomplete('filter-benefit', 'filter-suggestions-box');   // Strona z wynikami

// Globalne zamykanie wszystkich otwartych boksów po kliknięciu poza wyszukiwarkami
document.addEventListener('click', e => {
  if (!e.target.closest('.autocomplete-wrapper')) {
    const allBoxes = document.querySelectorAll('.suggestions-box');
    allBoxes.forEach(box => hideSuggestions(box));
  }
});