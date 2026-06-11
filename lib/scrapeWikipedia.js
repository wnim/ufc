const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function normalizeEventTitle(rawTitle) {
  return (rawTitle || '')
    .replace(/\s*\[\d+\]$/, '')
    .replace(/\s*:\s*$/, '')
    .trim();
}

function parseEventSlug(title) {
  return title
    .toLowerCase()
    .replace(/[\s:]+/g, '-')
    .replace(/[.,/()']/g, '')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseEventDate(value) {
  if (!value) return null;
  const cleanValue = value.trim();

  // Wikipedia sort values look like "000000002026-06-06-0" — extract the embedded ISO date
  const sortMatch = cleanValue.match(/\d{4}-\d{2}-\d{2}/);
  if (sortMatch) {
    const date = new Date(sortMatch[0]);
    return isNaN(date.getTime()) ? null : date;
  }

  const parsed = Date.parse(cleanValue);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  const parts = cleanValue.match(/(\w+)\s+(\d{1,2}),\s*(\d{4})/);
  if (parts) {
    const date = new Date(`${parts[1]} ${parts[2]}, ${parts[3]}`);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function parseEventsFromListHtml(html) {
  const $ = cheerio.load(html);
  const events = [];

  $('table.wikitable').each((tableIdx, table) => {
    $(table)
      .find('tr')
      .each((rowIdx, tr) => {
        const cells = $(tr).find('td');
        if (cells.length < 2) return;

        let titleCellIndex = 0;
        let dateCellIndex = 1;
        const firstCellText = $(cells[0]).text().trim();

        if (/^\d+$/.test(firstCellText) && cells.length >= 5) {
          titleCellIndex = 1;
          dateCellIndex = 2;
        }

        const rawTitle = $(cells[titleCellIndex]).text().trim();
        const normalizedTitle = normalizeEventTitle(rawTitle);
        if (!normalizedTitle) return;
        if (!/^(UFC|Fight Night)/i.test(normalizedTitle)) return;

        const link = $(cells[titleCellIndex]).find('a').first();
        const title = link.length ? $(link).text().trim() : normalizedTitle;
        const dateCell = $(cells[dateCellIndex]);
        const sortValue = dateCell.find('span[data-sort-value]').attr('data-sort-value');
        const dateText = sortValue || dateCell.text().trim();
        const date = parseEventDate(dateText);
        if (!date) return;

        const isNumbered = /^UFC\s+\d+/i.test(title);
        events.push({
          title,
          slug: parseEventSlug(title),
          date,
          isNumbered
        });
      });
  });

  return events;
}

function filterEventsByMonths(events, months = 6, now = new Date()) {
  const pastDate = new Date(now);
  pastDate.setMonth(now.getMonth() - months);
  return events
    .filter(e => e.date >= pastDate && e.date <= now)
    .sort((a, b) => b.date - a.date);
}

function eventTitleToWikiCandidates(eventTitle) {
  const full = eventTitle.replace(/\s+/g, '_');
  // Also try stripping the subtitle (e.g. "UFC 327: Procházka vs. Ulberg" → "UFC 327")
  const short = full.replace(/:.*$/, '').replace(/_+$/, '');
  return short !== full ? [full, short] : [full];
}

async function fetchUFCEventFights(eventTitle) {
  const candidates = eventTitleToWikiCandidates(eventTitle);
  let lastErr;
  for (const wikiTitle of candidates) {
    const url = `https://en.wikipedia.org/wiki/${wikiTitle}`;
    try {
      console.log(`Fetching Wikipedia event page: ${url}`);
      const html = await fetchText(url);
      const $ = cheerio.load(html);
      return extractFightsFromTable($);
    } catch (err) {
      lastErr = err;
      if (err.message.startsWith('HTTP 404')) continue; // try next candidate
      break;
    }
  }
  console.error(`Error fetching Wikipedia for ${eventTitle}:`, lastErr.message);
  throw lastErr;
}

async function fetchRecentUFCEvents(months = 6) {
  try {
    const url = 'https://en.wikipedia.org/wiki/List_of_Ultimate_Fighting_Championship_events';
    console.log(`Fetching UFC events list from: ${url}`);
    const html = await fetchText(url);
    const events = parseEventsFromListHtml(html);
    console.log(`Parsed ${events.length} events from Wikipedia list`);
    const filtered = filterEventsByMonths(events, months);
    console.log(`Filtered to ${filtered.length} events for last ${months} months`);
    return filtered;
  } catch (err) {
    console.error('Error fetching UFC events list:', err.message);
    throw err;
  }
}

// Column indices in Wikipedia UFC event fight tables
const COL = { WEIGHT_CLASS: 0, FIGHTER_A: 1, FIGHTER_B: 3, METHOD: 4, ROUND: 5, TIME: 6, NOTES: 7 };

function extractFightsFromTable($) {
  const rows = [];
  let currentSection = null;

  $('table').each((tableIdx, table) => {
    const $table = $(table);
    $table.find('tr').each((idx, tr) => {
      const $tr = $(tr);
      const headerCell = $tr.find('th[colspan="8"], th[colspan="7"], th[colspan="6"]');
      if (headerCell.length > 0) {
        currentSection = headerCell.text().trim().toLowerCase();
      }
      if (currentSection && currentSection.includes('card') && !currentSection.includes('preliminary')) {
        const cells = $tr.find('td');
        if (cells.length >= 5) {
          const fighterA = $(cells[COL.FIGHTER_A]).text().trim();
          const fighterB = $(cells[COL.FIGHTER_B]).text().trim();
          const method = $(cells[COL.METHOD]).text().trim();
          if (fighterA && fighterB && method) {
            rows.push({
              weightClass: $(cells[COL.WEIGHT_CLASS]).text().trim(),
              fighterA,
              fighterB,
              method,
              round: $(cells[COL.ROUND]).text().trim(),
              time: $(cells[COL.TIME]).text().trim(),
              notes: cells[COL.NOTES] ? $(cells[COL.NOTES]).text().trim() : '',
            });
          }
        }
      }
    });
  });

  return rows;
}

module.exports = {
  fetchUFCEventFights,
  fetchRecentUFCEvents,
  parseEventsFromListHtml,
  filterEventsByMonths,
  parseEventDate,
  normalizeEventTitle,
  parseEventSlug
};
