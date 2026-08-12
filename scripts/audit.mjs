import { readFile } from 'node:fs/promises';
import { moduleRegistry } from '../src/config/modules.ts';
import { parseAdultDermatologists, parseColonoscopySpecialists, parseDayTrips, parseLibraryEvents, parsePediatricDentists } from '../src/data/schemas.mjs';
import { parseMealKb } from '../src/data/mealParser.mjs';

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const trips = parseDayTrips(await readJson('src/data/day-trips.json'));
const events = parseLibraryEvents(await readJson('src/data/library-events.json'));
const dentists = parsePediatricDentists(await readJson('src/data/pediatric-dentists.json'));
const dermatologists = parseAdultDermatologists(await readJson('src/data/adult-dermatologists.json'));
const colonoscopy = parseColonoscopySpecialists(await readJson('src/data/colonoscopy-specialists.json'));
const meals = parseMealKb(await readFile('FAMILY_MEAL_KB.md', 'utf8'));
const home = await readFile('dist/index.html', 'utf8');
const project = await readFile('PROJECT.md', 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const records = {
  'day-trips': trips,
  'library-activities': events,
  'pediatric-dentists': dentists,
  'adult-dermatologists': dermatologists,
  'colonoscopy-specialists': colonoscopy,
  'meal-builder': meals.recipes,
};
const cardAttributes = {
  'day-trips': 'data-destination',
  'library-activities': 'data-event',
  'pediatric-dentists': 'data-dentist',
  'adult-dermatologists': 'data-dermatologist',
  'colonoscopy-specialists': 'data-colonoscopy',
  'meal-builder': 'data-meal-recipe',
};
const cardCount = (html, attribute) => (html.match(new RegExp(`<article[^>]+${attribute}`, 'g')) ?? []).length;

assert(moduleRegistry.length === 6, 'The active module registry must contain exactly six modules');
assert((home.match(/<a\b[^>]+data-module/g) ?? []).length === moduleRegistry.length, 'Home module cards do not match the active registry');
for (const module of moduleRegistry) {
  const output = await readFile(`dist${module.route}index.html`, 'utf8');
  assert(cardCount(output, cardAttributes[module.id]) === records[module.id].length, `${module.id} rendered card count does not match validated data`);
  assert(output.includes('id="main-content"'), `${module.id} is missing the main-content target`);
}

assert(trips.length === 29, 'Trip migration count is not 29');
assert(events.length === 18, 'Library activity migration count is not 18');
assert(dentists.length === 10, 'Pediatric dentist migration count is not 10');
assert(dermatologists.length === 10, 'Adult dermatologist migration count is not 10');
assert(colonoscopy.length === 18, 'Colonoscopy specialist migration count is not 18');
assert(meals.ingredients.length === 132 && meals.ingredients.filter((item) => item.visible).length === 129 && meals.recipes.length === 162, 'Meal KB counts are incorrect');
assert(meals.recipes.filter((item) => item.vegetableCentered).length === 23, 'Vegetable-centered Recipe count is not 23');
assert(meals.recipes.filter((item) => item.mealAddons?.some((addon) => addon.id === 'finish-with-leafy-vegetable')).length === 7, 'Finish-with-leafy-vegetable add-on count is not seven');
assert(!meals.recipes.find((item) => item.id === 'instant-pot-soy-chicken-thighs')?.mealAddons?.length, 'Instant Pot soy chicken thighs must not have a leafy add-on');
assert(meals.ingredients.filter((item) => item.tags?.includes('finish-wilt-compatible')).length === 5, 'Finish-wilt capability count is not five');
assert(events.every((item, index, all) => !index || all[index - 1].dayOrder < item.dayOrder || (all[index - 1].dayOrder === item.dayOrder && all[index - 1].timeOrder <= item.timeOrder)), 'Events are not stored in weekday/time order');
assert(dentists.every((item) => item.healthgradesUrl.startsWith('https://www.healthgrades.com/')), 'A Healthgrades URL is missing or invalid');
assert(dentists.every((item) => item.healthgradesRating === null || (item.healthgradesRating >= 0 && item.healthgradesRating <= 5)), 'A Healthgrades rating is invalid');
assert(dentists.every((item) => item.eligibility.decision !== 'excluded'), 'An excluded dentist is present in the published candidate set');
assert(dentists.filter((item) => item.tier === 1).every((item) => Object.values(item.evidenceBands).every((band) => band === 'strong' || band === 'adequate')), 'Tier 1 contains a concern or unknown evidence band');
assert(dentists.every((item) => item.healthgradesReviewCount < 10 || item.reviewConfidence === 'moderate' || item.reviewConfidence === 'stronger' || item.reviewConfidence === 'unavailable'), 'Review confidence does not match the Healthgrades sample size');
assert(dermatologists.every((item) => item.primaryReviewCount >= 10 && item.primaryRating >= 4), 'A dermatologist review floor is missing');
assert(dermatologists.every((item) => item.reviewEvidence.some((evidence) => evidence.scope === 'provider' && evidence.rating !== null && evidence.rating >= 4 && evidence.reviewCount >= 10)), 'A dermatologist is missing attributable provider-level review evidence');
assert(dermatologists.every((item) => item.eligibility.discipline === 'verified' && item.eligibility.decision !== 'excluded'), 'A non-MD/DO or excluded dermatologist is present');
assert(dermatologists.filter((item) => item.tier === 1).every((item) => item.availability === 'verified' && Object.values(item.evidenceBands).every((band) => band === 'strong' || band === 'adequate')), 'Tier 1 dermatologist contains an availability or evidence gap');
assert(dermatologists.every((item) => item.reviewConfidence === 'moderate' ? item.primaryReviewCount >= 10 && item.primaryReviewCount < 25 : item.reviewConfidence === 'strong' ? item.primaryReviewCount >= 25 && item.primaryReviewCount < 100 : item.reviewConfidence === 'very-strong' ? item.primaryReviewCount >= 100 : true), 'Dermatologist review confidence does not match sample size');
assert([...dermatologists].sort((a, b) => a.rank - b.rank).every((item, index) => item.rank === index + 1), 'Dermatologist ranks are not a complete deterministic order');
assert(colonoscopy.every((item) => item.healthgradesUrl.startsWith('https://www.healthgrades.com/')), 'A colonoscopy Healthgrades URL is missing or invalid');
assert(colonoscopy.every((item) => item.driveMax <= 90), 'A colonoscopy candidate exceeds the 90-minute scope');
assert(colonoscopy.every((item) => item.eligibility.decision !== 'excluded'), 'An excluded colonoscopy specialist is present in the published candidate set');
assert(colonoscopy.filter((item) => item.tier === 1).every((item) => Object.values(item.evidenceBands).every((band) => band === 'strong' || band === 'adequate')), 'Tier 1 colonoscopy specialist contains a concern or unknown evidence band');
assert([...colonoscopy].sort((a, b) => a.rank - b.rank).every((item, index) => item.rank === index + 1), 'Colonoscopy specialist ranks are not a complete deterministic order');
assert(colonoscopy.every((item) => item.facilityUrl.startsWith('https://') && item.nyProfileUrl.startsWith('https://') && item.opmcUrl.startsWith('https://')), 'A colonoscopy safety or facility link is missing');
assert(colonoscopy.every((item) => item.networkVerification.planLabel === 'BlueCard PPO'), 'A colonoscopy plan label is missing or unexpected');
assert(colonoscopy.every((item) => item.networkVerification.professionalStatus === 'requires-confirmation'), 'A colonoscopy professional network status must remain conditional');
assert(colonoscopy.every((item) => item.networkVerification.sourceUrls.every((url) => url.startsWith('https://'))), 'A colonoscopy network source is missing or insecure');
assert(!/(memberId|groupNumber|insuranceId|insuranceCard|cardImage|codex-remote-attachments)/i.test(JSON.stringify(colonoscopy)), 'Private insurance fields or attachment paths were found in colonoscopy data');

const htmlFiles = [home, ...(await Promise.all(moduleRegistry.map((module) => readFile(`dist${module.route}index.html`, 'utf8'))))];
assert(htmlFiles.every((html) => !/(memberId|groupNumber|insuranceId|insuranceCard|cardImage|codex-remote-attachments)/i.test(html)), 'Private insurance fields or attachment paths were found in build output');
assert(htmlFiles.every((html) => !/(2024\s*年\s*8\s*月|\bwife\b|\bhusband\b|妻子|丈夫|\buser\s+(likes?|reports?)\b)/i.test(html)), 'Private household phrasing was found in build output');
assert(htmlFiles.every((html) => !/<iframe|google-analytics|googletagmanager|fonts\.googleapis/i.test(html)), 'A forbidden embed, analytics script, or remote font was found');
for (const html of htmlFiles) {
  const externalLinks = [...html.matchAll(/<a\b[^>]*href="(https:[^"]+)"[^>]*>/g)];
  assert(externalLinks.every((match) => /target="_blank"/.test(match[0]) && /rel="[^"]*noopener[^"]*noreferrer[^"]*"/.test(match[0])), 'An external link is missing safe new-tab attributes');
}

assert(project.includes('Road travel: minutes and miles'), 'PROJECT.md is missing the road-unit policy');
assert(project.includes('Weather: degrees Celsius'), 'PROJECT.md is missing the weather-unit policy');
assert(project.includes('Recipe liquids: cups plus mL'), 'PROJECT.md is missing the liquid-unit policy');
assert(project.includes('public-reference'), 'PROJECT.md is missing the public data classification');

console.log(`Registry audit passed: ${moduleRegistry.length} modules, ${trips.length} trips, ${events.length} activities, ${dentists.length} dentists, ${dermatologists.length} dermatologists, ${colonoscopy.length} colonoscopy specialists, ${meals.recipes.length} meal recipes.`);
