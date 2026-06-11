const express = require('express');
const cors = require('cors');
const { fetchRecentUFCEvents, fetchUFCEventFights } = require('./lib/scrapeWikipedia');

const app = express();
app.use(cors());
// simple request logger to help debug 404s and API calls
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});
app.use(express.static('public'));

// /api/events?months=6
app.get('/api/events', async (req, res) => {
  try {
    const months = Math.max(1, Math.min(24, parseInt(req.query.months) || 6));
    console.log(`Fetching recent UFC events from Wikipedia for last ${months} months...`);
    const events = await fetchRecentUFCEvents(months);
    res.json({ events: events.map(e => ({
      title: e.title,
      slug: e.slug,
      date: e.date.toISOString(),
      isNumbered: e.isNumbered
    })) });
  } catch (err) {
    console.error('Error fetching events:', err.message);
    res.status(500).json({ error: String(err.message) });
  }
});

app.get('/api/event', async (req, res) => {
  const eventTitle = req.query.title || req.query.slug;

  if (!eventTitle) {
    return res.status(400).json({ error: 'missing title or slug query param' });
  }
  if (eventTitle.includes('..') || /^https?:/i.test(eventTitle)) {
    return res.status(400).json({ error: 'invalid event title' });
  }

  try {
    console.log(`Fetching fights for event: ${eventTitle}...`);
    const fights = await fetchUFCEventFights(eventTitle);
    if (fights.length === 0) {
      return res.status(404).json({ error: 'no fight card found for this event' });
    }
    res.json({ fights });
  } catch (err) {
    console.error('Error fetching event:', err.message);
    res.status(500).json({ error: String(err.message) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
