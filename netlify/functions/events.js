const { fetchRecentUFCEvents } = require('../../lib/scrapeWikipedia');

exports.handler = async (event) => {
  try {
    const months = Math.max(1, Math.min(24, parseInt(event.queryStringParameters?.months) || 6));
    const events = await fetchRecentUFCEvents(months);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: events.map(e => ({
          title: e.title,
          slug: e.slug,
          date: e.date.toISOString(),
          isNumbered: e.isNumbered,
        }))
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
