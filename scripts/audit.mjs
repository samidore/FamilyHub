import { readFile } from 'node:fs/promises';
import { moduleRegistry } from '../src/config/modules.ts';
import { parseDayTrips, parseLibraryEvents, parsePediatricDentists } from '../src/data/schemas.mjs';

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const trips = parseDayTrips(await readJson('src/data/day-trips.json'));
const events = parseLibraryEvents(await readJson('src/data/library-events.json'));
const dentists = parsePediatricDentists(await readJson('src/data/pediatric-dentists.json'));
const home = await readFile('dist/index.html', 'utf8');
const project = await readFile('PROJECT.md', 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const records = {
  'day-trips': trips,
  'library-activities': events,
  'pediatric-dentists': dentists,
};
const cardAttributes = {
  'day-trips': 'data-destination',
  'library-activities': 'data-event',
  'pediatric-dentists': 'data-dentist',
};
const cardCount = (html, attribute) => (html.match(new RegExp(`<article[^>]+${attribute}`, 'g')) ?? []).length;

assert(moduleRegistry.length === 3, 'The active module registry must contain exactly three release-one modules');
assert((home.match(/<a\b[^>]+data-module/g) ?? []).length === moduleRegistry.length, 'Home module cards do not match the active registry');
for (const module of moduleRegistry) {
  const output = await readFile(`dist${module.route}index.html`, 'utf8');
  assert(cardCount(output, cardAttributes[module.id]) === records[module.id].length, `${module.id} rendered card count does not match validated data`);
  assert(output.includes('id="main-content"'), `${module.id} is missing the main-content target`);
}

assert(trips.length === 29, 'Trip migration count is not 29');
assert(events.length === 18, 'Library activity migration count is not 18');
assert(dentists.length === 10, 'Pediatric dentist migration count is not 10');
assert(events.every((item, index, all) => !index || all[index - 1].dayOrder < item.dayOrder || (all[index - 1].dayOrder === item.dayOrder && all[index - 1].timeOrder <= item.timeOrder)), 'Events are not stored in weekday/time order');
assert(dentists.every((item) => item.healthgradesUrl.startsWith('https://www.healthgrades.com/')), 'A Healthgrades URL is missing or invalid');
assert(dentists.every((item) => item.healthgradesRating === null || (item.healthgradesRating >= 0 && item.healthgradesRating <= 5)), 'A Healthgrades rating is invalid');
assert(dentists.every((item) => item.eligibility.decision !== 'excluded'), 'An excluded dentist is present in the published candidate set');
assert(dentists.filter((item) => item.tier === 1).every((item) => Object.values(item.evidenceBands).every((band) => band === 'strong' || band === 'adequate')), 'Tier 1 contains a concern or unknown evidence band');
assert(dentists.every((item) => item.healthgradesReviewCount < 10 || item.reviewConfidence === 'moderate' || item.reviewConfidence === 'stronger' || item.reviewConfidence === 'unavailable'), 'Review confidence does not match the Healthgrades sample size');

const htmlFiles = [home, ...(await Promise.all(moduleRegistry.map((module) => readFile(`dist${module.route}index.html`, 'utf8'))))];
assert(htmlFiles.every((html) => !/<iframe|google-analytics|googletagmanager|fonts\.googleapis/i.test(html)), 'A forbidden embed, analytics script, or remote font was found');
for (const html of htmlFiles) {
  const externalLinks = [...html.matchAll(/<a\b[^>]*href="(https:[^"]+)"[^>]*>/g)];
  assert(externalLinks.every((match) => /target="_blank"/.test(match[0]) && /rel="[^"]*noopener[^"]*noreferrer[^"]*"/.test(match[0])), 'An external link is missing safe new-tab attributes');
}

assert(project.includes('Road travel: minutes and miles'), 'PROJECT.md is missing the road-unit policy');
assert(project.includes('Weather: degrees Celsius'), 'PROJECT.md is missing the weather-unit policy');
assert(project.includes('Recipe liquids: cups plus mL'), 'PROJECT.md is missing the liquid-unit policy');
assert(project.includes('public-reference'), 'PROJECT.md is missing the public data classification');

console.log(`Registry audit passed: ${moduleRegistry.length} modules, ${trips.length} trips, ${events.length} activities, ${dentists.length} dentists.`);
