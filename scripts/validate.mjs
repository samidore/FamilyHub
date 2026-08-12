import { readFile } from 'node:fs/promises';
import { parseAdultDermatologists, parseColonoscopySpecialists, parseDayTrips, parseLibraryEvents, parsePediatricDentists } from '../src/data/schemas.mjs';
import { parseMealKb } from '../src/data/mealParser.mjs';

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const trips = parseDayTrips(await readJson('src/data/day-trips.json'));
const events = parseLibraryEvents(await readJson('src/data/library-events.json'));
const dentists = parsePediatricDentists(await readJson('src/data/pediatric-dentists.json'));
const dermatologists = parseAdultDermatologists(await readJson('src/data/adult-dermatologists.json'));
const colonoscopy = parseColonoscopySpecialists(await readJson('src/data/colonoscopy-specialists.json'));
const meals = parseMealKb(await readFile('FAMILY_MEAL_KB.md', 'utf8'));

if (trips.length !== 29 || events.length !== 18 || dentists.length !== 10 || dermatologists.length !== 10 || colonoscopy.length !== 18) {
  throw new Error(`Migration count mismatch: ${trips.length} trips, ${events.length} events, ${dentists.length} dentists, ${dermatologists.length} dermatologists, ${colonoscopy.length} colonoscopy specialists`);
}

console.log(`Validated strict public schemas: ${trips.length} trips, ${events.length} events, ${dentists.length} dentists, ${dermatologists.length} dermatologists, ${colonoscopy.length} colonoscopy specialists.`);
console.log(`Validated Meal KB: ${meals.ingredients.length} ingredients, ${meals.ingredients.filter((item) => item.visible).length} visible Starter choices, ${meals.recipes.length} recipes.`);
