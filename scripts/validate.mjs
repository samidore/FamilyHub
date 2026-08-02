import { readFile } from 'node:fs/promises';
import { parseAdultDermatologists, parseDayTrips, parseLibraryEvents, parsePediatricDentists } from '../src/data/schemas.mjs';

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const trips = parseDayTrips(await readJson('src/data/day-trips.json'));
const events = parseLibraryEvents(await readJson('src/data/library-events.json'));
const dentists = parsePediatricDentists(await readJson('src/data/pediatric-dentists.json'));
const dermatologists = parseAdultDermatologists(await readJson('src/data/adult-dermatologists.json'));

if (trips.length !== 29 || events.length !== 18 || dentists.length !== 10 || dermatologists.length !== 10) {
  throw new Error(`Migration count mismatch: ${trips.length} trips, ${events.length} events, ${dentists.length} dentists, ${dermatologists.length} dermatologists`);
}

console.log(`Validated strict public schemas: ${trips.length} trips, ${events.length} events, ${dentists.length} dentists, ${dermatologists.length} dermatologists.`);
