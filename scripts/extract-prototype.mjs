import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(root, 'family_outing_hub_combined_prototype.html'), 'utf8');

function decodeHtml(value) {
  return value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
}

function extractArray(name) {
  const match = decodeHtml(source).match(new RegExp(`const ${name}\\s*=\\s*(\\[.*?\\]);`, 's'));
  if (!match) throw new Error(`Could not find ${name} in prototype`);
  return JSON.parse(match[1]);
}

const places = extractArray('places');
const events = extractArray('events');
if (places.length !== 29) throw new Error(`Expected 29 destinations, found ${places.length}`);
if (events.length !== 18) throw new Error(`Expected 18 events, found ${events.length}`);

const destinations = places.map((place) => ({
  name: place.name, shortName: place.short, location: place.location, category: place.category,
  driveMin: place.drive_min, driveMax: place.drive_max, status: place.status,
  ratings: { indoor: place.indoor, outdoor: place.outdoor, stroller: place.stroller, weather: place.weather, toddler: place.toddler, parent: place.parent },
  tags: place.tags, conditions: place.conditions, verifiedFacts: place.fact, familyFit: place.fit,
  risks: place.risk, beforeYouGo: place.before, googleMapsUrl: place.map, officialUrl: place.official,
  verifiedDate: '', recommendationScore: place.score,
}));

const libraryEvents = events.map((event) => ({
  day: event.day, dayOrder: event.day_order, time: event.time, timeOrder: event.time_order,
  name: event.name, library: event.library, location: event.location, drive: event.drive,
  age: event.age, ageGroup: event.age_group, description: event.desc, registration: event.registration,
  badges: event.badges, googleMapsUrl: event.maps, officialUrl: event.official, verifiedDate: '', dateRange: '',
}));

for (const item of [...destinations, ...libraryEvents]) {
  for (const key of ['googleMapsUrl', 'officialUrl']) {
    if (!item[key].startsWith('https://')) throw new Error(`${item.name} has an invalid ${key}`);
  }
}

const modules = [
  { id: 'day-trips', title: 'Day Trips', description: 'Nature centers, science museums, parks, playgrounds, animals, and family destinations within about an hour.', href: '/day-trips/', accent: 'green' },
  { id: 'library-activities', title: 'Library Activities', description: 'Storytimes, music, free play, and crafts organized by weekday and time.', href: '/library-activities/', accent: 'blue' },
];

await mkdir(path.join(root, 'src', 'data'), { recursive: true });
await Promise.all([
  writeFile(path.join(root, 'src', 'data', 'modules.json'), `${JSON.stringify(modules, null, 2)}\n`),
  writeFile(path.join(root, 'src', 'data', 'day-trips.json'), `${JSON.stringify(destinations, null, 2)}\n`),
  writeFile(path.join(root, 'src', 'data', 'library-events.json'), `${JSON.stringify(libraryEvents, null, 2)}\n`),
]);
console.log(`Migrated ${destinations.length} destinations and ${libraryEvents.length} library events.`);
