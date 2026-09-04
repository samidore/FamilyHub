import type { DayTripBikeExposure } from './types';

export type DayTripBikeExposureMap = Record<string, Record<string, DayTripBikeExposure>>;

type DayTripShape = {
  id: string;
  locations: { name: string }[];
};

const exposureValues = new Set<DayTripBikeExposure>(['low', 'high', 'unknown']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function parseDayTripBikeExposure(value: unknown, trips: readonly DayTripShape[]): DayTripBikeExposureMap {
  if (!isRecord(value)) throw new Error('day-trip-bike-exposure: expected an object keyed by destination id');

  const tripsById = new Map(trips.map((trip) => [trip.id, trip]));

  for (const [tripId, rawLocations] of Object.entries(value)) {
    const trip = tripsById.get(tripId);
    if (!trip) throw new Error(`day-trip-bike-exposure.${tripId}: destination id does not exist in day-trips`);
    if (!isRecord(rawLocations)) throw new Error(`day-trip-bike-exposure.${tripId}: expected an object keyed by location name`);

    const locationNames = new Set(trip.locations.map((location) => location.name));
    for (const [locationName, exposure] of Object.entries(rawLocations)) {
      if (!locationNames.has(locationName)) {
        throw new Error(`day-trip-bike-exposure.${tripId}.${locationName}: location does not exist in day-trips`);
      }
      if (!exposureValues.has(exposure as DayTripBikeExposure)) {
        throw new Error(`day-trip-bike-exposure.${tripId}.${locationName}: expected low, high, or unknown`);
      }
    }
  }

  return value as DayTripBikeExposureMap;
}
