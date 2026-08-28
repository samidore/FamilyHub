import rawDayTrips from './day-trips.json';
import rawLibraryEvents from './library-events.json';
import rawPediatricDentists from './pediatric-dentists.json';
import rawAdultDermatologists from './adult-dermatologists.json';
import rawColonoscopySpecialists from './colonoscopy-specialists.json';
import rawObGynProviders from './ob-gyn.json';
import rawRestaurants from './restaurants.json';
import { mealRecipes } from './meal';
import { parseAdultDermatologists, parseColonoscopySpecialists, parseDayTrips, parseLibraryEvents, parsePediatricDentists } from './schemas.mjs';
import { parseObGynProviders } from './obGynSchema.mjs';
import { parseRestaurants } from './restaurantSchema.mjs';
import type { AdultDermatologist, ColonoscopySpecialist, DayTrip, LibraryEvent, PediatricDentist } from './types';
import type { ObGynProvider } from './obGynTypes';
import type { Restaurant } from './restaurantTypes';
import type { ModuleId } from '../config/modules';

export const dayTrips = parseDayTrips(rawDayTrips) as DayTrip[];
export const libraryEvents = parseLibraryEvents(rawLibraryEvents) as LibraryEvent[];
export const pediatricDentists = parsePediatricDentists(rawPediatricDentists) as PediatricDentist[];
export const adultDermatologists = parseAdultDermatologists(rawAdultDermatologists) as AdultDermatologist[];
export const colonoscopySpecialists = parseColonoscopySpecialists(rawColonoscopySpecialists) as ColonoscopySpecialist[];
export const restaurants = parseRestaurants(rawRestaurants) as Restaurant[];

const obGynNameCorrections: Partial<Record<string, string>> = {
  'emily-howell': 'Emily Ruth Howell, DO',
  'zachary-merriam': 'Zachary Merriam, DO',
  'sara-brescia': 'Sara Brescia, DO',
};
const parsedObGynProviders = parseObGynProviders(rawObGynProviders) as ObGynProvider[];
export const obGynProviders = parsedObGynProviders.map((provider) => ({
  ...provider,
  name: obGynNameCorrections[provider.id] ?? provider.name,
}));

export const moduleRecords: Partial<Record<ModuleId, readonly unknown[]>> = {
  'day-trips': dayTrips,
  'library-activities': libraryEvents,
  'pediatric-dentists': pediatricDentists,
  'adult-dermatologists': adultDermatologists,
  'colonoscopy-specialists': colonoscopySpecialists,
  'ob-gyn': obGynProviders,
  'meal-builder': mealRecipes,
  'restaurants': restaurants,
};

export function latestVerifiedDate(records: readonly { verifiedDate: string }[]) {
  const dates = records.map((record) => record.verifiedDate).filter(Boolean).sort();
  return dates.at(-1) ?? '';
}
