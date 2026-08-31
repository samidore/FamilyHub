import rawDayTrips from './day-trips.json';
import rawDayTripParking from './day-trip-parking.json';
import rawLibraryEvents from './library-events.json';
import rawPediatricDentists from './pediatric-dentists.json';
import rawAdultDermatologists from './adult-dermatologists.json';
import rawColonoscopySpecialists from './colonoscopy-specialists.json';
import rawObGynProviders from './ob-gyn.json';
import rawRestaurants from './restaurants.json';
import { mealRecipes } from './meal';
import { parseDayTripParking, parseDayTrips } from './dayTripSchema.mjs';
import { parseAdultDermatologists, parseColonoscopySpecialists, parseLibraryEvents, parsePediatricDentists } from './schemas.mjs';
import { parseObGynProviders } from './obGynSchema.mjs';
import { parseRestaurants } from './restaurantSchema.mjs';
import type { DayTripParking, DayTripWithParking } from './dayTripParking';
import type { AdultDermatologist, ColonoscopySpecialist, DayTrip, LibraryEvent, PediatricDentist } from './types';
import type { ObGynProvider } from './obGynTypes';
import type { Restaurant } from './restaurantTypes';
import type { ModuleId } from '../config/modules';

const dayTripTrailUrls: Record<string, string> = {
  'campgaw-mountain-reservation': 'https://www.alltrails.com/trail/us/new-jersey/hemlock-trail-orange',
  'ramapo-valley-scarlet-oak-pond': 'https://www.alltrails.com/trail/us/new-jersey/scarlet-oak-pond-orange-and-yellow-loop',
  'mills-reservation-trail': 'https://www.alltrails.com/trail/us/new-jersey/west-glen-and-eastview-trail-loop',
  'rifle-camp-park-red-trail': 'https://www.alltrails.com/trail/us/new-jersey/rifle-camp-park-red-trail-and-yellow-red-trail',
  'garrett-mountain-barbour-pond': 'https://www.alltrails.com/trail/us/new-jersey/barbour-pond-loop',
  'donch-preserve-haledon-reservoir': 'https://www.alltrails.com/trail/us/new-jersey/haledon-reservoir-white-trail-loop',
  'ringwood-manor-trail': 'https://www.alltrails.com/trail/us/new-jersey/ringwood-manor-trail',
  'ringwood-shepherd-lake': 'https://www.alltrails.com/trail/us/new-jersey/shepherd-lake-loop',
  'tallman-mountain-outer-loop': 'https://www.alltrails.com/trail/us/new-york/tallman-mountain-outer-loop',
  'blauvelt-state-park-camp-bluefields': 'https://www.alltrails.com/trail/us/new-york/blauvelt-camp-bluefields',
  'clausland-mountain-orange-trail': 'https://www.alltrails.com/trail/us/new-york/orange-trail--3',
  'south-mountain-hemlock-falls': 'https://www.alltrails.com/trail/us/new-jersey/hobble-falls-and-hemlock-falls-via-lenape-trail',
  'south-mountain-rahway-maple-falls': 'https://www.alltrails.com/trail/us/new-jersey/rahway-and-maple-falls-trail-loop',
  'south-mountain-crest-trail': 'https://www.alltrails.com/trail/us/new-jersey/crest-trail-to-crest-loop',
  'watchung-lake-surprise': 'https://www.alltrails.com/trail/us/new-jersey/lake-surprise-loop-via-w-r-tracy-drive',
  'mountain-way-white-trail': 'https://www.alltrails.com/trail/us/new-jersey/mountain-way-white-trail-loop',
  'jonathans-woods-purple-white': 'https://www.alltrails.com/trail/us/new-jersey/jonathan-s-woods-purple-and-white-trail-loop',
  'cranberry-lake-preserve-loop': 'https://www.alltrails.com/trail/us/new-york/cranberry-lake-red-purple-and-yellow-loop',
  'kennedy-dells-park': 'https://www.alltrails.com/trail/us/new-york/kennedy-dells-park',
  'saxon-woods-yellow-trail': 'https://www.alltrails.com/trail/us/new-york/mamaroneck-reservoir-via-yellow-trail-loop',
  'cascade-lake-red-trail': 'https://www.alltrails.com/trail/us/new-york/cascade-lake-loop-red-trail',
  'macy-park-irvington-reservoir': 'https://www.alltrails.com/trail/us/new-york/light-hike-to-the-lake',
  'old-croton-aqueduct-dam': 'https://www.alltrails.com/trail/us/new-york/old-croton-aqueduct-dam',
  'india-brook-buttermilk-falls': 'https://www.alltrails.com/trail/us/new-jersey/buttermilk-falls-and-frog-pond-loop',
  'tourne-red-decamp-loop': 'https://www.alltrails.com/trail/us/new-jersey/the-tourne-via-red-and-yellow-trail-loop',
  'lord-stirling-red-green-blue': 'https://www.alltrails.com/trail/us/new-jersey/the-great-swamp-red-trail',
};

const parsedDayTrips = parseDayTrips(rawDayTrips) as DayTrip[];
const dayTripParking = parseDayTripParking(rawDayTripParking, parsedDayTrips.map((trip) => trip.id)) as Record<string, DayTripParking>;
export const dayTrips = parsedDayTrips.map((trip) => {
  const parking = dayTripParking[trip.id];
  const trailUrl = dayTripTrailUrls[trip.id];
  return {
    ...trip,
    ...(parking ? { parking } : {}),
    ...(trailUrl ? { trailUrl } : {}),
  };
}) as DayTripWithParking[];
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
