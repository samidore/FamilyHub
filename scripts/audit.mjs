import { readFile } from 'node:fs/promises';

const trips = JSON.parse(await readFile('src/data/day-trips.json', 'utf8'));
const events = JSON.parse(await readFile('src/data/library-events.json', 'utf8'));
const dentists = JSON.parse(await readFile('src/data/pediatric-dentists.json', 'utf8'));
const home = await readFile('dist/index.html', 'utf8');
const tripHtml = await readFile('dist/day-trips/index.html', 'utf8');
const eventHtml = await readFile('dist/library-activities/index.html', 'utf8');
const dentistHtml = await readFile('dist/pediatric-dentists/index.html', 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const cardCount = (html, attribute) => (html.match(new RegExp(`<article[^>]+${attribute}`, 'g')) ?? []).length;

assert(trips.length === 29, 'Trip data count is not 29');
assert(events.length === 18, 'Event data count is not 18');
assert(dentists.length === 10, 'Pediatric dentist data count is not 10');
assert((home.match(/<a[^>]+class="module-card/g) ?? []).length === 3, 'Home does not render three modules');
assert(cardCount(tripHtml, 'data-destination') === 29, 'Day Trips does not render 29 cards');
assert(cardCount(eventHtml, 'data-event') === 18, 'Library Activities does not render 18 cards');
assert(cardCount(dentistHtml, 'data-dentist') === 10, 'Pediatric Dentist does not render 10 cards');
assert([...trips, ...events, ...dentists].every((item) => item.googleMapsUrl.startsWith('https://') && item.officialUrl.startsWith('https://')), 'An external URL is not HTTPS');
assert(dentists.every((item) => item.healthgradesUrl.startsWith('https://www.healthgrades.com/')), 'A dentist Healthgrades URL is missing or invalid');
assert(dentists.every((item) => item.rating >= 4 && item.reviewCount >= 10 && item.tier >= 1 && item.tier <= 3), 'A dentist does not meet rating, review, or tier requirements');
assert(events.every((item, index, all) => !index || all[index - 1].dayOrder < item.dayOrder || (all[index - 1].dayOrder === item.dayOrder && all[index - 1].timeOrder <= item.timeOrder)), 'Events are not in schedule order');
const requiredTripKeys = ['name', 'shortName', 'location', 'category', 'driveMin', 'driveMax', 'status', 'ratings', 'tags', 'conditions', 'verifiedFacts', 'familyFit', 'risks', 'beforeYouGo', 'googleMapsUrl', 'officialUrl', 'verifiedDate'];
assert(trips.every((item) => requiredTripKeys.every((key) => key in item)), 'A trip is missing a required field');

console.log('Acceptance audit passed: 3 modules, 29 trips, 18 events, 10 pediatric dentists, HTTPS links, schemas, and schedule order.');
