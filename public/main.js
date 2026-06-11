async function api(path, { silent404 = false } = {}) {
  const res = await fetch(path);
  if (!res.ok) {
    if (silent404 && res.status === 404) return null;
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed ${res.status} ${res.statusText} ${text}`);
  }
  return await res.json();
}

const eventsEl        = document.getElementById('events');
const hideNonNumbered = document.getElementById('hideNonNumbered');
const hideWomen       = document.getElementById('hideWomen');
const finishesOnly    = document.getElementById('finishesOnly');
const showAllBtn      = document.getElementById('showAll');
const monthsSelect    = document.getElementById('monthsSelect');
const themeToggle     = document.getElementById('themeToggle');

// ── Theme ──────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}
themeToggle.onclick = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  savePrefs();
};

let isLoading      = false;
let cachedEvents   = [];  // all events for cachedMonths
let cachedMonths   = 0;   // largest timeframe fetched so far
const fightCache   = new Map(); // eventTitle -> fights[]

function isWomenFight(weightClass) {
  return /women|women's|female/i.test(weightClass || '');
}

function isDecision(method) {
  return /decision|draw/i.test(method || '');
}

function filterFights(fights) {
  return fights.filter(f => {
    if (finishesOnly.checked && isDecision(f.method)) return false;
    if (hideWomen.checked && isWomenFight(f.weightClass)) return false;
    return true;
  });
}

// --- Fight count badge ---

function countLabel(title) {
  if (!fightCache.has(title)) return '…';
  const fights = fightCache.get(title);
  if (!fights) return '';  // no card on Wikipedia
  const n = filterFights(fights).length;
  return n === 1 ? '1 fight' : `${n} fights`;
}

function updateCountBadge(title) {
  const card = eventsEl.querySelector(`[data-title="${CSS.escape(title)}"]`);
  if (!card) return;
  const badge = card.querySelector('.fight-count');
  if (badge) badge.textContent = countLabel(title);
  // Also refresh open fight list if visible
  const openFights = card.querySelector('.fights');
  if (openFights) renderFightList(card, fightCache.get(title));
}

// --- Fetch fights (cached) ---

async function loadFights(title, { silent404 = false } = {}) {
  if (!fightCache.has(title)) {
    const data = await api(`/api/event?title=${encodeURIComponent(title)}`, { silent404 });
    fightCache.set(title, data ? data.fights || [] : null); // null = no card available
  }
  return fightCache.get(title);
}

// --- Render fight list inside a card ---

function renderFightList(card, fights) {
  const existing = card.querySelector('.fights');
  if (existing) existing.remove();

  const btn = card.querySelector('button.toggle-fights');
  const visible = filterFights(fights);

  const container = document.createElement('div');
  container.className = 'fights';

  if (visible.length === 0) {
    container.innerHTML = '<div class="small">No matching fights (after filters).</div>';
  } else {
    for (const f of visible) {
      const [left, right] = Math.random() < 0.5 ? [f.fighterA, f.fighterB] : [f.fighterB, f.fighterA];
      const el = document.createElement('div');
      el.className = 'fight';
      el.innerHTML = `
        <div class="fighter">${left}</div>
        <div class="fight-center"><div class="vs">VS</div></div>
        <div class="fighter right">${right}</div>`;
      container.appendChild(el);
    }
  }

  card.appendChild(container);
}

// --- Build a single event card ---

function makeEventCard(ev) {
  const card = document.createElement('div');
  card.className = 'event';
  card.dataset.title = ev.title;

  const header = document.createElement('div');
  header.className = 'event-header';

  const titleBlock = document.createElement('div');
  titleBlock.className = 'event-title-block';
  titleBlock.innerHTML = `
    <div class="event-name">${ev.title}</div>
    <div class="event-meta">
      <span class="event-date">${new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      <span class="fight-count">${countLabel(ev.title)}</span>
    </div>`;

  header.appendChild(titleBlock);
  card.appendChild(header);

  let loading = false;
  card.onclick = async () => {
    if (loading) return;
    const open = card.querySelector('.fights');
    if (open) { open.remove(); return; }
    loading = true;
    card.classList.add('loading');
    try {
      const fights = await loadFights(ev.title);
      if (!fights) return;
      renderFightList(card, fights);
      updateCountBadge(ev.title);
    } catch (err) {
      console.error('Failed to load fights', err);
    } finally {
      loading = false;
      card.classList.remove('loading');
    }
  };
  return card;
}

// --- Render event list ---

function renderEvents(events) {
  eventsEl.innerHTML = '';
  const filtered = events.filter(e => !(hideNonNumbered.checked && !e.isNumbered));

  if (!filtered.length) {
    eventsEl.innerHTML = '<p class="small">No events found for selected filters.</p>';
    showAllBtn.disabled = true;
    return;
  }

  showAllBtn.disabled = false;
  for (const ev of filtered) {
    eventsEl.appendChild(makeEventCard(ev));
  }

  // Pre-fetch fight counts in background (sequentially to be polite)
  prefetchCounts(filtered);
}

async function prefetchCounts(events) {
  for (const ev of events) {
    if (fightCache.has(ev.title)) continue;
    try {
      await loadFights(ev.title, { silent404: true });
      updateCountBadge(ev.title);
    } catch {
      // non-fatal; count stays as "…"
    }
  }
}

// --- Re-render open fight cards when filters change ---

function refilterOpenFights() {
  eventsEl.querySelectorAll('.event').forEach(card => {
    const title = card.dataset.title;
    const badge = card.querySelector('.fight-count');
    if (badge) badge.textContent = countLabel(title);
    if (card.querySelector('.fights') && fightCache.has(title)) {
      renderFightList(card, fightCache.get(title));
    }
  });
}

// --- Show / hide all ---

let allShown = false;

showAllBtn.onclick = async () => {
  if (allShown) {
    eventsEl.querySelectorAll('.fights').forEach(f => f.remove());
    allShown = false;
    showAllBtn.textContent = 'Show all fights';
    return;
  }

  showAllBtn.disabled = true;
  showAllBtn.textContent = 'Loading…';
  const cards = [...eventsEl.querySelectorAll('.event')];
  await Promise.all(cards.map(async card => {
    const title = card.dataset.title;
    if (card.querySelector('.fights')) return; // already open
    try {
      const fights = await loadFights(title);
      renderFightList(card, fights);
      updateCountBadge(title);
    } catch { /* ignore individual failures */ }
  }));
  allShown = true;
  showAllBtn.disabled = false;
  showAllBtn.textContent = 'Hide all fights';
};

// --- Load events from API ---

function eventsForMonths(months) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return cachedEvents.filter(e => new Date(e.date) >= cutoff);
}

async function load() {
  if (isLoading) return;
  const months = parseInt(monthsSelect.value) || 6;

  const mainHeading = document.getElementById('mainHeading');
  if (mainHeading) {
    mainHeading.textContent = `Last ${months} Month${months === 1 ? '' : 's'}`;
  }

  // If we already have enough data, just re-render from cache
  if (months <= cachedMonths) {
    allShown = false;
    showAllBtn.textContent = 'Show all fights';
    renderEvents(eventsForMonths(months));
    return;
  }

  try {
    isLoading = true;
    allShown = false;
    showAllBtn.textContent = 'Show all fights';
    eventsEl.innerHTML = '<div class="small">Loading events…</div>';
    const data = await api(`/api/events?months=${months}`);
    cachedEvents = data.events || [];
    cachedMonths = months;
    renderEvents(cachedEvents);
  } catch (err) {
    console.error('Failed to load events', err);
    eventsEl.innerHTML = `<div class="small">Error loading events: ${err.message}</div>`;
  } finally {
    isLoading = false;
  }
}

const PREFS_KEY = 'ufc-prefs';

function savePrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify({
    theme: document.documentElement.dataset.theme,
    months: monthsSelect.value,
    finishesOnly: finishesOnly.checked,
    hideNonNumbered: hideNonNumbered.checked,
    hideWomen: hideWomen.checked,
  }));
}

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    if (p.theme)                          applyTheme(p.theme);
    if (p.months)                         monthsSelect.value      = p.months;
    if (p.finishesOnly    !== undefined)  finishesOnly.checked    = p.finishesOnly;
    if (p.hideNonNumbered !== undefined)  hideNonNumbered.checked = p.hideNonNumbered;
    if (p.hideWomen       !== undefined)  hideWomen.checked       = p.hideWomen;
  } catch { /* ignore corrupt storage */ }
}

monthsSelect.onchange    = () => { savePrefs(); load(); };
hideNonNumbered.onchange = () => { savePrefs(); allShown = false; showAllBtn.textContent = 'Show all fights'; renderEvents(eventsForMonths(parseInt(monthsSelect.value) || 6)); };
finishesOnly.onchange    = () => { savePrefs(); refilterOpenFights(); };
hideWomen.onchange       = () => { savePrefs(); refilterOpenFights(); };

loadPrefs();
load();
