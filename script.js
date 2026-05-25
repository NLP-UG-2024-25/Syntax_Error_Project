const toggle = document.getElementById('theme-toggle');
 
function updateIcon() {
  toggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}
 
toggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  updateIcon();
});
 
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}
updateIcon();
 
// =====================
//  MAPOWANIE WOJEWÓDZTW  (nazwa z selecta → kod NFZ)
// =====================
const PROVINCE_CODES = {
  'dolnoslaskie':        '01',
  'kujawsko-pomorskie':  '02',
  'lubelskie':           '03',
  'lubuskie':            '04',
  'lodzkie':             '05',
  'malopolskie':         '06',
  'mazowieckie':         '07',
  'opolskie':            '08',
  'podkarpackie':        '09',
  'podlaskie':           '10',
  'pomorskie':           '11',
  'slaskie':             '12',
  'swietokrzyskie':      '13',
  'warminsko-mazurskie': '14',
  'wielkopolskie':       '15',
  'zachodniopomorskie':  '16',
};
 
// =====================
//  STRONA GŁÓWNA  (index.html)
// =====================
const searchBtn = document.querySelector('.btn-search');
if (searchBtn) {
  searchBtn.addEventListener('click', (e) => {
    e.preventDefault();
 
    const province = document.querySelector('.form-select').value;
    const benefit  = document.querySelectorAll('.form-input')[0].value.trim();
    const city     = document.getElementById('city-input').value.trim();
    const caseType = document.getElementById('pilny').checked ? '2' : '1';
 
    if (!province) { alert('Wybierz województwo.'); return; }
    if (!benefit)  { alert('Wpisz specjalistę.'); return; }
 
    localStorage.setItem('nfz_search', JSON.stringify({ province, benefit, city, caseType }));
    window.location.href = 'results.html';
  });
}
 
// =====================
//  GEOLOKALIZACJA (tylko index.html)
// =====================
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('city-input')) {
    getDeviceLocation();
  }
 
  if (document.querySelector('.results-grid')) {
    initResultsPage();
  }
});
 
function getDeviceLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => console.log(`Lokalizacja: ${pos.coords.latitude}, ${pos.coords.longitude}`),
    (err) => console.warn(`Błąd geolokalizacji (${err.code}): ${err.message}`),
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
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
  updateResultsHeader(params);
  prefillFilters(params);
  fetchQueues(params);
 
  // Filtry — ponowne wyszukiwanie po kliknięciu "Szukaj"
  const applyBtn = document.getElementById('apply-filters');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const updatedParams = {
        province: document.getElementById('filter-province').value,
        benefit:  document.getElementById('filter-benefit').value,
        city:     document.getElementById('filter-city').value,
        caseType: params.caseType,
      };
      fetchQueues(updatedParams);
    });
  }
}
 
function updateResultsHeader(params) {
  const header = document.querySelector('.results-info h1');
  if (!header) return;
 
  const provinceName = document.getElementById('filter-province')?.selectedOptions[0]?.text
    || params.province;
  const city    = params.city    ? `, ${params.city}` : '';
  const caseStr = params.caseType === '2' ? 'Pilny' : 'Stabilny';
 
  header.textContent = `WYNIKI DLA: ${params.benefit.toUpperCase()}${city} — ${caseStr}`;
}
 
function prefillFilters(params) {
  const prov = document.getElementById('filter-province');
  const bene = document.getElementById('filter-benefit');
  const city = document.getElementById('filter-city');
  if (prov) prov.value = params.province;
  if (bene) bene.value = params.benefit;
  if (city) city.value = params.city;
}
 
// =====================
//  WYWOŁANIE API NFZ
// =====================
async function fetchQueues(params, page = 1) {
  const grid = document.querySelector('.results-grid');
  if (!grid) return;
 
  grid.innerHTML = '<p class="loading-msg">Wyszukiwanie terminów… ⏳</p>';
 
  const provinceCode = PROVINCE_CODES[params.province] || params.province;
 
  const url = new URL('https://api.nfz.gov.pl/app-itl-api/queues');
  // url.searchParams.set('case',     params.caseType);
   url.searchParams.set('province', provinceCode);
   url.searchParams.set('name', 'example');
   url.searchParams.set('benefit',  params.benefit);
   url.searchParams.set('page',     page);
   url.searchParams.set('limit',    12);
   url.searchParams.set('format',   'json');
   if (params.city) url.searchParams.set('locality', params.city);
 
  try {
    const res  = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
 
    if (json.errors) {
      showError('API zwróciło błąd: ' + json.errors[0]['errorr-reason']);
      return;
    }
 
    renderCards(json.data, grid);
    renderPagination(json.meta, json.links, params);
 
  } catch (err) {
    showError('Nie udało się pobrać wyników. Sprawdź połączenie z internetem.<br><small>' + err.message + '</small>');
  }
}
 
// =====================
//  RENDEROWANIE KART
// =====================
function renderCards(data, grid) {
  grid.innerHTML = '';
 
  if (!data || data.length === 0) {
    grid.innerHTML = '<p class="loading-msg">Brak wyników dla podanych kryteriów. Spróbuj zmienić wyszukiwanie.</p>';
    return;
  }
 
  data.forEach(item => {
    const attr = item.attributes;
 
    const name     = attr.provider || 'Nieznana placówka';
    const address  = [attr.address, attr.place].filter(Boolean).join(', ') || '—';
    const city     = attr.locality || '';
    const benefit  = attr.benefit  || '—';
    const date     = attr['first-available-date'] || null;
    const waitDays = attr['statistics']?.['provider-data']?.['average-period'] ?? null;
    const phone    = attr['phone'] || null;
 
    const dateStr  = date
      ? formatDate(date)
      : '<span style="color:#aaa">brak danych</span>';
 
    const waitStr = waitDays !== null
      ? `<p class="wait-info">Śr. oczekiwanie: <strong>${waitDays} dni</strong></p>`
      : '';
 
    const phoneStr = phone
      ? `<p class="phone-info">📞 ${phone}</p>`
      : '';
 
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
      <button class="reserve-btn" onclick="alert('Szczegóły: ${escHtml(name).replace(/'/g,"\\'")}')">
        Zobacz więcej
      </button>
    `;
    grid.appendChild(card);
  });
}
 
// =====================
//  PAGINACJA
// =====================
function renderPagination(meta, links, params) {
  let pager = document.getElementById('pagination');
  if (!pager) {
    pager = document.createElement('div');
    pager.id = 'pagination';
    pager.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:24px;flex-wrap:wrap;';
    document.querySelector('.results-grid').insertAdjacentElement('afterend', pager);
  }
  pager.innerHTML = '';
 
  if (!meta || meta.count <= meta.limit) return;
 
  const totalPages = Math.ceil(meta.count / meta.limit);
  const current    = meta.page;
 
  const pages = new Set([1, current - 1, current, current + 1, totalPages].filter(p => p >= 1 && p <= totalPages));
  let prev = null;
 
  [...pages].sort((a, b) => a - b).forEach(p => {
    if (prev !== null && p - prev > 1) {
      const dots = document.createElement('span');
      dots.textContent = '…';
      dots.style.alignSelf = 'center';
      pager.appendChild(dots);
    }
    const btn = document.createElement('button');
    btn.textContent = p;
    btn.className   = 'reserve-btn';
    btn.style.cssText = `width:44px;padding:10px 0;${p === current ? 'opacity:0.5;cursor:default;' : ''}`;
    if (p !== current) btn.addEventListener('click', () => fetchQueues(params, p));
    pager.appendChild(btn);
    prev = p;
  });
}
 
// =====================
//  HELPERS
// =====================
function showError(msg) {
  const grid = document.querySelector('.results-grid');
  if (grid) grid.innerHTML = `<p class="loading-msg" style="color:#c0392b">${msg}</p>`;
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