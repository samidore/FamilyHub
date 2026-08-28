import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const trips = JSON.parse(await readFile(new URL('../src/data/day-trips.json', import.meta.url), 'utf8'));

const ALL_ACTIVITIES = ['woody-walk', 'playground', 'no-playground', 'indoor-visit', 'animals', 'water-play'];
const CORE = {
  sunny: ALL_ACTIVITIES,
  rain: ['indoor-visit', 'animals'],
  heat: ['woody-walk', 'playground', 'indoor-visit', 'animals', 'water-play'],
  'post-rain': ['woody-walk', 'playground', 'no-playground', 'animals'],
};

function matches(trip, driveMinutes, weather, activity) {
  if (trip.driveMinutes > driveMinutes) return false;

  const surviving = trip.locations.filter((location) => weather === 'sunny' || !location.notFor.includes(weather));
  if (!surviving.length) return false;

  if (activity === 'no-playground') {
    return trip.locations.every((location) => !location.tags.includes('playground'));
  }
  return surviving.some((location) => location.tags.includes(activity));
}

test('Day Trips core coverage keeps at least three destinations per core combination', () => {
  for (const [weather, activities] of Object.entries(CORE)) {
    for (const activity of activities) {
      for (const driveMinutes of [20, 40]) {
        const matchesForCell = trips.filter((trip) => matches(trip, driveMinutes, weather, activity));
        assert.ok(
          matchesForCell.length >= 3,
          `${weather} + ${activity} + <=${driveMinutes} has only ${matchesForCell.length}: ${matchesForCell.map((trip) => trip.name).join(', ')}`,
        );
      }
    }
  }
});

test('Day Trips keeps no-playground derived instead of storing it as a location tag', () => {
  for (const trip of trips) {
    assert.ok(trip.locations.length >= 1 && trip.locations.length <= 3, `${trip.id} must keep coarse locations`);
    for (const location of trip.locations) {
      assert.equal(location.tags.includes('no-playground'), false, `${trip.id}/${location.name} stores derived no-playground`);
    }
  }
});
