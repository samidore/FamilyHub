import { readFile } from 'node:fs/promises';
import { parseAdultDermatologists, parseColonoscopySpecialists, parseDayTrips, parseLibraryEvents, parsePediatricDentists } from '../src/data/schemas.mjs';
import { parseObGynProviders } from '../src/data/obGynSchema.mjs';
import { loadMealData } from './load-meal-data.mjs';

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const trips = parseDayTrips(await readJson('src/data/day-trips.json'));
const events = parseLibraryEvents(await readJson('src/data/library-events.json'));
const dentists = parsePediatricDentists(await readJson('src/data/pediatric-dentists.json'));
const dermatologists = parseAdultDermatologists(await readJson('src/data/adult-dermatologists.json'));
const colonoscopy = parseColonoscopySpecialists(await readJson('src/data/colonoscopy-specialists.json'));
const obGyn = parseObGynProviders(await readJson('src/data/ob-gyn.json'));
const meals = await loadMealData();

const eventRangePattern = /^\d{4}-\d{2}-\d{2}(?: – \d{4}-\d{2}-\d{2})?$/;
for (const [index, event] of events.entries()) {
  if (event.library !== 'Maurice M. Pine Library' || !event.location.includes('Fair Lawn')) throw new Error(`library-events[${index}]: only Fair Lawn / Maurice M. Pine Library events are allowed`);
  if (!event.verifiedDate) throw new Error(`library-events[${index}].verifiedDate: source verification date is required`);
  if (!eventRangePattern.test(event.dateRange)) throw new Error(`library-events[${index}].dateRange: expected YYYY-MM-DD or YYYY-MM-DD – YYYY-MM-DD`);
  const dates = event.dateRange.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  if (dates.at(-1) < dates[0]) throw new Error(`library-events[${index}].dateRange: end date must not precede start date`);
}

console.log(`Validated strict public schemas: ${trips.length} trips, ${events.length} events, ${dentists.length} dentists, ${dermatologists.length} dermatologists, ${colonoscopy.length} colonoscopy specialists, ${obGyn.length} OB/GYN providers.`);
console.log(`Validated Meal Builder data: ${meals.ingredients.length} ingredients, ${meals.ingredients.filter((item) => item.visible).length} visible Starter choices, ${meals.recipes.length} recipes.`);
