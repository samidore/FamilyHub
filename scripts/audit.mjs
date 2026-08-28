import { readFile } from 'node:fs/promises';
import { moduleRegistry } from '../src/config/modules.ts';
import { parseAdultDermatologists, parseColonoscopySpecialists, parseDayTrips, parseLibraryEvents, parsePediatricDentists } from '../src/data/schemas.mjs';
import { parseObGynProviders } from '../src/data/obGynSchema.mjs';
import { parseRestaurants } from '../src/data/restaurantSchema.mjs';
import { obGynExternalProfiles } from '../src/data/obGynExternalProfiles.ts';
import { loadMealData } from './load-meal-data.mjs';

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const trips = parseDayTrips(await readJson('src/data/day-trips.json'));
const events = parseLibraryEvents(await readJson('src/data/library-events.json'));
const dentists = parsePediatricDentists(await readJson('src/data/pediatric-dentists.json'));
const dermatologists = parseAdultDermatologists(await readJson('src/data/adult-dermatologists.json'));
const colonoscopy = parseColonoscopySpecialists(await readJson('src/data/colonoscopy-specialists.json'));
const obGyn = parseObGynProviders(await readJson('src/data/ob-gyn.json'));
const restaurants = parseRestaurants(await readJson('src/data/restaurants.json'));
const obGynPlacements = obGyn.flatMap((provider) => provider.placements);
const meals = await loadMealData();
const home = await readFile('dist/index.html', 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const records = {
  'day-trips': trips,
  'library-activities': events,
  'pediatric-dentists': dentists,
  'adult-dermatologists': dermatologists,
  'colonoscopy-specialists': colonoscopy,
  'ob-gyn': obGynPlacements,
  'meal-builder': meals.recipes,
  'restaurants': restaurants,
};
const cardAttributes = {
  'day-trips': 'data-destination',
  'library-activities': 'data-event',
  'pediatric-dentists': 'data-dentist',
  'adult-dermatologists': 'data-dermatologist',
  'colonoscopy-specialists': 'data-colonoscopy',
  'ob-gyn': 'data-ob-gyn',
  'meal-builder': 'data-meal-recipe',
  'restaurants': 'data-restaurant',
};
const supportedPrivacyClasses = new Set(['public-reference', 'authenticated-household']);
const cardCount = (html, attribute) => (html.match(new RegExp(`<article[^>]+${attribute}`, 'g')) ?? []).length;

assert((home.match(/<a\b[^>]+data-module/g) ?? []).length === moduleRegistry.length, 'Home module cards do not match the active registry');
const moduleOutputs = [];
for (const module of moduleRegistry) {
  assert(supportedPrivacyClasses.has(module.privacyClass), `${module.id} has an unsupported privacy class`);
  const output = await readFile(`dist${module.route}index.html`, 'utf8');
  moduleOutputs.push(output);
  assert(output.includes('id="main-content"'), `${module.id} is missing the main-content target`);
  if (module.privacyClass === 'public-reference') {
    const recordSet = records[module.id];
    const cardAttribute = cardAttributes[module.id];
    assert(Array.isArray(recordSet) && typeof cardAttribute === 'string', `${module.id} is missing public-reference audit metadata`);
    assert(cardCount(output, cardAttribute) === recordSet.length, `${module.id} rendered card count does not match validated data`);
  }
}

for (const section of ['valley-ob', 'hackensack-ob', 'englewood-ob', 'gyn']) {
  const sectionPlacements = obGynPlacements.filter((placement) => placement.section === section).sort((a, b) => a.rank - b.rank);
  assert(sectionPlacements.length > 0, `${section} has no placements`);
  assert(sectionPlacements.every((placement, index) => placement.rank === index + 1), `${section} ranks are not a complete deterministic order`);
}

const obGynIds = obGyn.map((provider) => provider.id).sort();
const obGynExternalIds = Object.keys(obGynExternalProfiles).sort();
assert(obGynExternalIds.length === obGyn.length, 'OB/GYN external review-link directory must contain exactly one entry per unique provider');
assert(JSON.stringify(obGynExternalIds) === JSON.stringify(obGynIds), 'OB/GYN external review-link directory provider IDs do not match the provider dataset');
assert(Object.values(obGynExternalProfiles).every((entry) => entry.healthgradesUrl.startsWith('https://www.healthgrades.com/')), 'Every OB/GYN provider must have a Healthgrades link');
assert(Object.values(obGynExternalProfiles).every((entry) => ['profile', 'group', 'directory'].includes(entry.healthgradesLinkKind)), 'An OB/GYN Healthgrades link is missing its scope label');
assert(Object.values(obGynExternalProfiles).every((entry) => !entry.webmdUrl || entry.webmdUrl.startsWith('https://doctor.webmd.com/')), 'An OB/GYN WebMD link is invalid');
assert(Object.values(obGynExternalProfiles).every((entry) => !entry.zocdocUrl || entry.zocdocUrl.startsWith('https://www.zocdoc.com/')), 'An OB/GYN Zocdoc link is invalid');

assert(dentists.every((item) => item.eligibility.decision !== 'excluded'), 'An excluded dentist is present in the published candidate set');
assert(dentists.filter((item) => item.tier === 1).every((item) => Object.values(item.evidenceBands).every((band) => band === 'strong' || band === 'adequate')), 'Tier 1 contains a concern or unknown evidence band');
assert(dentists.every((item) => item.healthgradesReviewCount < 10 || item.reviewConfidence === 'moderate' || item.reviewConfidence === 'stronger' || item.reviewConfidence === 'unavailable'), 'Review confidence does not match the Healthgrades sample size');

assert(dermatologists.every((item) => item.gender === 'female' && (item.eligibility.discipline === 'verified' || item.eligibility.discipline === 'screened-no-match') && item.eligibility.decision !== 'excluded'), 'A non-female, failed-discipline-screen, or excluded dermatologist is present');
assert(dermatologists.every((item) => item.locationScope === 'local' || (item.driveMin === null && item.driveMax === null)), 'An NYC dermatologist contains an inferred drive time');
assert(dermatologists.every((item) => item.capabilities.includes('eczema-dermatitis') && item.safetyEvidence.length > 0), 'A dermatologist is missing condition-fit or official safety evidence');
assert(dermatologists.every((item) => item.reviewEvidence.some((evidence) => evidence.source === item.primaryReviewSource && evidence.rating === item.primaryRating && evidence.reviewCount === item.primaryReviewCount && evidence.writtenCount === item.primaryWrittenCount)), 'A dermatologist primary review source does not match its evidence');
assert(dermatologists.every((item) => item.safetyEvidence.some((evidence) => (evidence.source === 'NJ license' || evidence.source === 'NY license') && (item.eligibility.license === 'verified' ? evidence.status === 'verified' : item.eligibility.license === 'screened' && evidence.status === 'requires-confirmation'))), 'A dermatologist license claim is not supported at the published confidence');
assert(dermatologists.filter((item) => item.tier === 1).every((item) => item.evidenceBands.clinicalFoundation === 'strong' && (item.evidenceBands.perianalDermatitisFit === 'strong' || item.evidenceBands.perianalDermatitisFit === 'adequate') && item.evidenceBands.diagnosticBreadth === 'strong'), 'Tier 1 dermatologist lacks sufficient clinical-fit evidence');
assert(dermatologists.every((item) => item.reviewConfidence === 'unavailable' ? item.primaryReviewCount === 0 : item.reviewConfidence === 'very-limited' ? item.primaryReviewCount >= 1 && item.primaryReviewCount < 5 : item.reviewConfidence === 'limited' ? item.primaryReviewCount >= 5 && item.primaryReviewCount < 10 : item.reviewConfidence === 'moderate' ? item.primaryReviewCount >= 10 && item.primaryReviewCount < 25 : item.reviewConfidence === 'strong' ? item.primaryReviewCount >= 25 && item.primaryReviewCount < 100 : item.primaryReviewCount >= 100), 'Dermatologist review confidence does not match sample size');
assert([...dermatologists].sort((a, b) => a.rank - b.rank).every((item, index) => item.rank === index + 1), 'Dermatologist ranks are not a complete deterministic order');

assert(colonoscopy.every((item) => item.driveMax <= 90), 'A colonoscopy candidate exceeds the 90-minute scope');
assert(colonoscopy.every((item) => item.eligibility.decision !== 'excluded'), 'An excluded colonoscopy specialist is present in the published candidate set');
assert(colonoscopy.filter((item) => item.tier === 1).every((item) => Object.values(item.evidenceBands).every((band) => band === 'strong' || band === 'adequate')), 'Tier 1 colonoscopy specialist contains a concern or unknown evidence band');
assert([...colonoscopy].sort((a, b) => a.rank - b.rank).every((item, index) => item.rank === index + 1), 'Colonoscopy specialist ranks are not a complete deterministic order');

const expectedOptionalGroups = [
  ['add-some-richness', '加点油水'],
  ['change-it-up', '改头换面'],
  ['one-pot-mix', '一锅乱炖'],
];
assert(JSON.stringify(meals.optionalGroups.map((group) => [group.id, group.labelZh])) === JSON.stringify(expectedOptionalGroups), 'Meal Builder optional groups do not match the canonical registry');
assert(meals.optionalGroups.every((group) => new Set(group.ingredients.map((entry) => entry.ingredientId)).size === group.ingredients.length), 'A Meal Builder optional group contains duplicate Ingredient IDs');
assert(meals.optionalGroups.find((group) => group.id === 'one-pot-mix')?.ingredients.length === 23, 'One-pot-mix must keep the migrated 23-Ingredient membership');
assert(meals.recipes.filter((recipe) => recipe.optionalGroupIds?.includes('one-pot-mix')).length === 40, 'One-pot-mix Recipe scope must keep the migrated 40 Recipes');
assert(meals.recipes.filter((recipe) => recipe.optionalGroupIds?.includes('add-some-richness')).length === 6, 'Add-some-richness must be referenced by the six vegetable structures');
assert(meals.recipes.filter((recipe) => recipe.optionalGroupIds?.includes('change-it-up')).length === 3, 'Change-it-up must be referenced by the three current base Recipes');
const legacyEasyBraiseIds = meals.ingredients.filter((ingredient) => ingredient.tags?.includes('easy-braise-addon')).map((ingredient) => ingredient.id);
const legacyIronPanIds = meals.recipes.filter((recipe) => recipe.tags?.includes('iron-pan-braise')).map((recipe) => recipe.id);
assert(legacyEasyBraiseIds.length === 0, `Legacy easy-braise Ingredient capability returned: ${legacyEasyBraiseIds.join(', ')}`);
assert(legacyIronPanIds.length === 0, `Legacy iron-pan Recipe capability returned: ${legacyIronPanIds.join(', ')}`);
assert(meals.ingredients.find((ingredient) => ingredient.id === 'ground-pork')?.tags?.includes('child-eaten'), 'Ground pork must retain child-eaten status');
assert(!meals.ingredients.find((ingredient) => ingredient.id === 'pork-feet')?.tags?.includes('child-eaten'), 'Pork feet must not be marked child-eaten');

assert(!/(memberId|groupNumber|insuranceId|insuranceCard|cardImage|codex-remote-attachments)/i.test(JSON.stringify(colonoscopy)), 'Private insurance fields or attachment paths were found in colonoscopy data');
assert(!/(memberId|groupNumber|insuranceId|insuranceCard|cardImage|codex-remote-attachments)/i.test(JSON.stringify(obGyn)), 'Private insurance fields or attachment paths were found in OB/GYN data');

const htmlFiles = [home, ...moduleOutputs];
assert(htmlFiles.every((html) => !/(memberId|groupNumber|insuranceId|insuranceCard|cardImage|codex-remote-attachments)/i.test(html)), 'Private insurance fields or attachment paths were found in build output');
assert(htmlFiles.every((html) => !/(2024\s*年\s*8\s*月|\bwife\b|\bhusband\b|妻子|丈夫|\buser\s+(likes?|reports?)\b)/i.test(html)), 'Private household phrasing was found in build output');
assert(htmlFiles.every((html) => !/<iframe|google-analytics|googletagmanager|fonts\.googleapis/i.test(html)), 'A forbidden embed, analytics script, or remote font was found');
for (const html of htmlFiles) {
  const externalLinks = [...html.matchAll(/<a\b[^>]*href="(https:[^"]+)"[^>]*>/g)];
  assert(externalLinks.every((match) => /target="_blank"/.test(match[0]) && /rel="[^"]*noopener[^"]*noreferrer[^"]*"/.test(match[0])), 'An external link is missing safe new-tab attributes');
}

console.log(`Registry audit passed: ${moduleRegistry.length} modules, ${trips.length} trips, ${events.length} activities, ${dentists.length} dentists, ${dermatologists.length} dermatologists, ${colonoscopy.length} colonoscopy specialists, ${obGyn.length} OB/GYN providers / ${obGynPlacements.length} placements, ${restaurants.length} restaurants, ${meals.recipes.length} meal recipes.`);
