const assert = require('assert');
const { parseEventsFromListHtml, filterEventsByMonths, parseEventDate } = require('../lib/scrapeWikipedia');

const sampleHtml = `
<table class="wikitable">
<tr>
<td><a href="/wiki/UFC_330" title="UFC 330">UFC 330</a></td>
<td><span data-sort-value="2026-08-15" style="white-space:nowrap">Aug 15, 2026</span></td>
<td><a href="/wiki/Xfinity_Mobile_Arena" title="Xfinity Mobile Arena">Xfinity Mobile Arena</a></td>
<td>Philadelphia, Pennsylvania, U.S.</td>
</tr>
<tr>
<td>774</td>
<td><a href="/wiki/UFC_Fight_Night:_Allen_vs._Costa" title="UFC Fight Night: Allen vs. Costa">UFC Fight Night: Allen vs. Costa</a></td>
<td><span data-sort-value="2026-05-16" style="white-space:nowrap">May 16, 2026</span></td>
<td><a href="/wiki/UFC_Apex" title="UFC Apex">Meta Apex</a></td>
<td>Las Vegas, Nevada, U.S.</td>
</tr>
</table>
`;

const events = parseEventsFromListHtml(sampleHtml);
console.log('Parsed events:', events);
assert.strictEqual(events.length, 2, `Expected 2 events, got ${events.length}`);
assert.strictEqual(events[0].title, 'UFC 330');
assert.strictEqual(events[0].slug, 'ufc-330');
assert.strictEqual(events[1].title, 'UFC Fight Night: Allen vs. Costa');
assert.strictEqual(events[1].slug, 'ufc-fight-night-allen-vs-costa');
assert.strictEqual(events[0].isNumbered, true);
assert.strictEqual(events[1].isNumbered, false);

const now = new Date('2026-08-20');
const filtered = filterEventsByMonths(events.map(e => ({ ...e, date: new Date(e.date) })), 4, now);
assert(filtered.length >= 2, `Expected at least 2 events for 4 months, got ${filtered.length}`);

const parsedIso1 = parseEventDate('2026-08-15');
assert.ok(parsedIso1 instanceof Date && !isNaN(parsedIso1), 'Expected valid Date for ISO date');
assert.strictEqual(parsedIso1.getFullYear(), 2026);
assert.strictEqual(parsedIso1.getMonth(), 7);
assert.strictEqual(parsedIso1.getDate(), 15);
const parsedIso2 = parseEventDate('Aug 15, 2026');
assert.ok(parsedIso2 instanceof Date && !isNaN(parsedIso2), 'Expected valid Date for human-readable date');
assert.strictEqual(parsedIso2.getFullYear(), 2026);
assert.strictEqual(parsedIso2.getMonth(), 7);
assert.strictEqual(parsedIso2.getDate(), 15);

console.log('scrapeWikipedia tests passed.');
