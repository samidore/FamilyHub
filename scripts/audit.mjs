import { readFile } from 'node:fs/promises';

const trips = JSON.parse(await readFile('src/data/day-trips.json', 'utf8'));
const events = JSON.parse(await readFile('src/data/library-events.json', 'utf8'));
const home = await readFile('dist/index.html', 'utf8');
const tripHtml = await readFile('dist/day-trips/index.html', 'utf8');
const eventHtml = await readFile('dist/library-activities/index.html', 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const cardCount = (html, attribute) => (html.match(new RegExp(`<article[^>]+${attribute}`, 'g')) ?? []).length;

assert(trips.length === 29, 'Trip data count is not 29');
assert(events.length === 18, 'Event data count is not 18');
assert((home.match(/<a[^>]+class="module-card/g) ?? []).length === 2, 'Home does not render two modules');
assert(cardCount(tripHtml, 'data-destination') === 29, 'Day Trips does not render 29 cards');
assert(cardCount(eventHtml, 'data-event') === 18, 'Library Activities does not render 18 cards');
assert([...trips, ...events].every((item) => item.googleMapsUrl.startsWith('https://') && item.officialUrl.startsWith('https://')), 'An external URL is not HTTPS');
assert(events.every((item, index, all) => !index || all[index - 1].dayOrder < item.dayOrder || (all[index - 1].dayOrder === item.dayOrder && all[index - 1].timeOrder <= item.timeOrder)), 'Events are not in schedule order');
const requiredTripKeys = ['name', 'shortName', 'location', 'category', 'driveMin', 'driveMax', 'status', 'ratings', 'tags', 'conditions', 'verifiedFacts', 'familyFit', 'risks', 'beforeYouGo', 'googleMapsUrl', 'officialUrl', 'verifiedDate'];
assert(trips.every((item) => requiredTripKeys.every((key) => key in item)), 'A trip is missing a required field');

console.log('Acceptance audit passed: 2 modules, 29 trips, 18 events, HTTPS links, schemas, and schedule order.');
