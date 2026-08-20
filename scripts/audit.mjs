import { readFile } from 'node:fs/promises';
import { moduleRegistry } from '../src/config/modules.ts';
import { parseAdultDermatologists, parseColonoscopySpecialists, parseDayTrips, parseLibraryEvents, parsePediatricDentists } from '../src/data/schemas.mjs';
import { parseObGynProviders } from '../src/data/obGynSchema.mjs';
import { obGynExternalProfiles } from '../src/data/obGynExternalProfiles.ts';
import { loadMealData } from './load-meal-data.mjs';

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const trips = parseDayTrips(await readJson('src/data/day-trips.json'));
const events = parseLibraryEvents(await readJson('src/data/library-events.json'));
const dentists = parsePediatricDentists(await readJson('src/data/pediatric-dentists.json'));
const dermatologists = parseAdultDermatologists(await readJson('src/data/adult-dermatologists.json'));
const colonoscopy = parseColonoscopySpecialists(await readJson('src/data/colonoscopy-specialists.json'));
const obGyn = parseObGynProviders(await readJson('src/data/ob-gyn.json'));
const obGynPlacements = obGyn.flatMap((provider) => provider.placements);
const meals = await loadMealData();
const home = await readFile('dist/index.html', 'utf8');
const languageUnits = await readFile('docs/project/language-units.md', 'utf8');
const privacyData = await readFile('docs/project/privacy-data.md', 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const records = {
  'day-trips': trips,
  'library-activities': events,
  'pediatric-dentists': dentists,
  'adult-dermatologists': dermatologists,
  'colonoscopy-specialists': colonoscopy,
  'ob-gyn': obGynPlacements,
  'meal-builder': meals.recipes,
};
const cardAttributes = {
  'day-trips': 'data-destination',
  'library-activities': 'data-event',
  'pediatric-dentists': 'data-dentist',
  'adult-dermatologists': 'data-dermatologist',
  'colonoscopy-specialists': 'data-colonoscopy',
  'ob-gyn': 'data-ob-gyn',
  'meal-builder': 'data-meal-recipe',
};
const cardCount = (html, attribute) => (html.match(new RegExp(`<article[^>]+${attribute}`, 'g')) ?? []).length;

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
assert(obGyn.length === 35, 'OB/GYN unique provider count is not 35');
assert(obGynPlacements.length === 40, 'OB/GYN placement count is not 40');
for (const section of ['valley-ob', 'hackensack-ob', 'englewood-ob', 'gyn']) {
  const sectionPlacements = obGynPlacements.filter((placement) => placement.section === section).sort((a, b) => a.rank - b.rank);
  assert(sectionPlacements.length === 10, `${section} must contain 10 placements`);
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
assert(!meals.recipes.find((item) => item.id === 'instant-pot-soy-chicken-thighs')?.tags?.includes('iron-pan-braise'), 'Instant Pot soy chicken thighs must not be iron-pan-braise');
assert(events.every((item, index, all) => !index || all[index - 1].dayOrder < item.dayOrder || (all[index - 1].dayOrder === item.dayOrder && all[index - 1].timeOrder <= item.timeOrder)), 'Events are not stored in weekday/time order');
assert(dentists.every((item) => item.healthgradesUrl.startsWith('https://www.healthgrades.com/')), 'A Healthgrades URL is missing or invalid');
assert(dentists.every((item) => item.healthgradesRating === null || (item.healthgradesRating >= 0 && item.healthgradesRating <= 5)), 'A Healthgrades rating is invalid');
assert(dentists.every((item) => item.eligibility.decision !== 'excluded'), 'An excluded dentist is present in the published candidate set');
assert(dentists.filter((item) => item.tier === 1).every((item) => Object.values(item.evidenceBands).every((band) => band === 'strong' || band === 'adequate')), 'Tier 1 contains a concern or unknown evidence band');
assert(dentists.every((item) => item.healthgradesReviewCount < 10 || item.reviewConfidence === 'moderate' || item.reviewConfidence === 'stronger' || item.reviewConfidence === 'unavailable'), 'Review confidence does not match the Healthgrades sample size');
assert(dermatologists.every((item) => item.gender === 'female' && (item.eligibility.discipline === 'verified' || item.eligibility.discipline === 'screened-no-match') && item.eligibility.decision !== 'excluded'), 'A non-female, failed-discipline-screen, or excluded dermatologist is present');
assert(dermatologists.filter((item) => item.locationScope === 'nyc').length >= 3 && dermatologists.filter((item) => item.locationScope === 'nyc').length <= 5, 'Dermatologist list must include three to five NYC specialist alternatives');
assert(dermatologists.every((item) => item.locationScope === 'local' || (item.driveMin === null && item.driveMax === null)), 'An NYC dermatologist contains an inferred drive time');
assert(dermatologists.every((item) => item.capabilities.includes('eczema-dermatitis') && item.safetyEvidence.length > 0), 'A dermatologist is missing condition-fit or official safety evidence');
assert(dermatologists.every((item) => item.reviewEvidence.some((evidence) => evidence.source === item.primaryReviewSource && evidence.rating === item.primaryRating && evidence.reviewCount === item.primaryReviewCount && evidence.writtenCount === item.primaryWrittenCount)), 'A dermatologist primary review source does not match its evidence');
assert(dermatologists.every((item) => item.safetyEvidence.some((evidence) => (evidence.source === 'NJ license' || evidence.source === 'NY license') && (item.eligibility.license === 'verified' ? evidence.status === 'verified' : item.eligibility.license === 'screened' && evidence.status === 'requires-confirmation'))), 'A dermatologist license claim is not supported at the published confidence');
assert(dermatologists.filter((item) => item.tier === 1).every((item) => item.evidenceBands.clinicalFoundation === 'strong' && (item.evidenceBands.perianalDermatitisFit === 'strong' || item.evidenceBands.perianalDermatitisFit === 'adequate') && item.evidenceBands.diagnosticBreadth === 'strong'), 'Tier 1 dermatologist lacks sufficient clinical-fit evidence');
assert(dermatologists.every((item) => item.reviewConfidence === 'unavailable' ? item.primaryReviewCount === 0 : item.reviewConfidence === 'very-limited' ? item.primaryReviewCount >= 1 && item.primaryReviewCount < 5 : item.reviewConfidence === 'limited' ? item.primaryReviewCount >= 5 && item.primaryReviewCount < 10 : item.reviewConfidence === 'moderate' ? item.primaryReviewCount >= 10 && item.primaryReviewCount < 25 : item.reviewConfidence === 'strong' ? item.primaryReviewCount >= 25 && item.primaryReviewCount < 100 : item.primaryReviewCount >= 100), 'Dermatologist review confidence does not match sample size');
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
assert(!/(memberId|groupNumber|insuranceId|insuranceCard|cardImage|codex-remote-attachments)/i.test(JSON.stringify(obGyn)), 'Private insurance fields or attachment paths were found in OB/GYN data');

const htmlFiles = [home, ...(await Promise.all(moduleRegistry.map((module) => readFile(`dist${module.route}index.html`, 'utf8'))))];
assert(htmlFiles.every((html) => !/(memberId|groupNumber|insuranceId|insuranceCard|cardImage|codex-remote-attachments)/i.test(html)), 'Private insurance fields or attachment paths were found in build output');
assert(htmlFiles.every((html) => !/(2024\s*年\s*8\s*月|\bwife\b|\bhusband\b|妻子|丈夫|\buser\s+(likes?|reports?)\b)/i.test(html)), 'Private household phrasing was found in build output');
assert(htmlFiles.every((html) => !/<iframe|google-analytics|googletagmanager|fonts\.googleapis/i.test(html)), 'A forbidden embed, analytics script, or remote font was found');
for (const html of htmlFiles) {
  const externalLinks = [...html.matchAll(/<a\b[^>]*href="(https:[^"]+)"[^>]*>/g)];
  assert(externalLinks.every((match) => /target="_blank"/.test(match[0]) && /rel="[^"]*noopener[^"]*noreferrer[^"]*"/.test(match[0])), 'An external link is missing safe new-tab attributes');
}

assert(languageUnits.includes('Road travel: minutes and miles'), 'Language/unit policy is missing the road-unit rule');
assert(languageUnits.includes('Weather: degrees Celsius'), 'Language/unit policy is missing the weather-unit rule');
assert(languageUnits.includes('Recipe liquids: cups plus mL'), 'Language/unit policy is missing the liquid-unit rule');
assert(privacyData.includes('public-reference'), 'Privacy/data policy is missing the public data classification');

console.log(`Registry audit passed: ${moduleRegistry.length} modules, ${trips.length} trips, ${events.length} activities, ${dentists.length} dentists, ${dermatologists.length} dermatologists, ${colonoscopy.length} colonoscopy specialists, ${obGyn.length} OB/GYN providers / ${obGynPlacements.length} placements, ${meals.recipes.length} meal recipes.`);
