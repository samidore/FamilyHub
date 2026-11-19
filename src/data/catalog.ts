import rawDayTrips from './day-trips.json';
import rawDayTripParking from './day-trip-parking.json';
import rawDayTripBikeExposure from './day-trip-bike-exposure.json';
import rawLibraryEvents from './library-events.json';
import rawPediatricDentists from './pediatric-dentists.json';
import rawAdultDermatologists from './adult-dermatologists.json';
import rawColonoscopySpecialists from './colonoscopy-specialists.json';
import rawObGynProviders from './ob-gyn.json';
import rawBreastSurgeons from './breast-surgeons.json';
import rawRestaurants from './restaurants.json';
import { mealRecipes } from './meal';
import { parseDayTripParking, parseDayTrips } from './dayTripSchema.mjs';
import { parseDayTripBikeExposure } from './dayTripBikeExposure';
import { parseAdultDermatologists, parseColonoscopySpecialists, parseLibraryEvents, parsePediatricDentists } from './schemas.mjs';
import { parseObGynProviders } from './obGynSchema.mjs';
import { parseBreastSurgeons } from './breastSurgeonSchema.mjs';
import { parseRestaurants } from './restaurantSchema.mjs';
import type { DayTripParking, DayTripWithParking } from './dayTripParking';
import type { AdultDermatologist, ColonoscopySpecialist, DayTrip, DayTripLocation, LibraryEvent, PediatricDentist } from './types';
import type { ObGynProvider } from './obGynTypes';
import type { BreastSurgeon } from './breastSurgeonTypes';
import type { Restaurant } from './restaurantTypes';
import type { ModuleId } from '../config/modules';

type DayTripSource = Omit<DayTrip, 'locations'> & { locations: Omit<DayTripLocation, 'bikeExposure'>[] };
const parsedDayTrips = parseDayTrips(rawDayTrips) as DayTripSource[];
const dayTripBikeExposure = parseDayTripBikeExposure(rawDayTripBikeExposure, parsedDayTrips);
const dayTripParking = parseDayTripParking(rawDayTripParking, parsedDayTrips.map((trip) => trip.id)) as Record<string, DayTripParking>;
export const dayTrips = parsedDayTrips.map((trip): DayTripWithParking => ({
  ...trip,
  locations: trip.locations.map((location) => ({
    ...location,
    bikeExposure: dayTripBikeExposure[trip.id]?.[location.name]
      ?? (location.environment === 'indoor' || !location.tags.includes('woody-walk') ? 'low' : 'unknown'),
  })),
  ...(dayTripParking[trip.id] ? { parking: dayTripParking[trip.id] } : {}),
}));
export const libraryEvents = parseLibraryEvents(rawLibraryEvents) as LibraryEvent[];
export const pediatricDentists = parsePediatricDentists(rawPediatricDentists) as PediatricDentist[];
export const adultDermatologists = parseAdultDermatologists(rawAdultDermatologists) as AdultDermatologist[];
export const colonoscopySpecialists = parseColonoscopySpecialists(rawColonoscopySpecialists) as ColonoscopySpecialist[];
export const restaurants = parseRestaurants(rawRestaurants) as Restaurant[];
export const breastSurgeons = parseBreastSurgeons(rawBreastSurgeons) as BreastSurgeon[];

export const obGynProviders = parseObGynProviders(rawObGynProviders) as ObGynProvider[];

export const moduleRecords: Partial<Record<ModuleId, readonly unknown[]>> = {
  'day-trips': dayTrips,
  'library-activities': libraryEvents,
  'pediatric-dentists': pediatricDentists,
  'adult-dermatologists': adultDermatologists,
  'colonoscopy-specialists': colonoscopySpecialists,
  'ob-gyn': obGynProviders,
  'breast-surgeons': breastSurgeons,
  'meal-builder': mealRecipes,
  'restaurants': restaurants,
};

export function latestVerifiedDate(records: readonly { verifiedDate: string }[]) {
  const dates = records.map((record) => record.verifiedDate).filter(Boolean).sort();
  return dates.at(-1) ?? '';
}
