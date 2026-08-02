import rawDayTrips from './day-trips.json';
import rawLibraryEvents from './library-events.json';
import rawPediatricDentists from './pediatric-dentists.json';
import { parseDayTrips, parseLibraryEvents, parsePediatricDentists } from './schemas.mjs';
import type { DayTrip, LibraryEvent, PediatricDentist } from './types';
import type { ModuleId } from '../config/modules';

export const dayTrips = parseDayTrips(rawDayTrips) as DayTrip[];
export const libraryEvents = parseLibraryEvents(rawLibraryEvents) as LibraryEvent[];
export const pediatricDentists = parsePediatricDentists(rawPediatricDentists) as PediatricDentist[];

export const moduleRecords: Record<ModuleId, readonly unknown[]> = {
  'day-trips': dayTrips,
  'library-activities': libraryEvents,
  'pediatric-dentists': pediatricDentists,
};

export function latestVerifiedDate(records: readonly { verifiedDate: string }[]) {
  const dates = records.map((record) => record.verifiedDate).filter(Boolean).sort();
  return dates.at(-1) ?? '';
}
