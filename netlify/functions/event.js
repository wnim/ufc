const { fetchUFCEventFights } = require('../../lib/scrapeWikipedia');

exports.handler = async (event) => {
  const eventTitle = event.queryStringParameters?.title || event.queryStringParameters?.slug;

  if (!eventTitle) {
    return { statusCode: 400, body: JSON.stringify({ error: 'missing title or slug query param' }) };
  }
  if (eventTitle.includes('..') || /^https?:/i.test(eventTitle)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid event title' }) };
  }

  try {
    const fights = await fetchUFCEventFights(eventTitle);
    if (fights.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'no fight card found for this event' }) };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fights }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
