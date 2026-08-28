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
const TARGETS = {
  'woody-walk': [[20, 5], [40, 10]],
  playground: [[20, 3]],
  'no-playground': [[20, 3], [40, 5]],
  'indoor-visit': [[20, 3], [40, 5]],
  animals: [[20, 3], [40, 5]],
  'water-play': [[20, 3], [40, 5]],
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

test('Day Trips core coverage meets activity-specific nearby targets', () => {
  for (const [weather, activities] of Object.entries(CORE)) {
    for (const activity of activities) {
      for (const [driveMinutes, minimum] of TARGETS[activity]) {
        const matchesForCell = trips.filter((trip) => matches(trip, driveMinutes, weather, activity));
        assert.ok(
          matchesForCell.length >= minimum,
          `${weather} + ${activity} + <=${driveMinutes} needs ${minimum}, has only ${matchesForCell.length}: ${matchesForCell.map((trip) => trip.name).join(', ')}`,
        );
      }
    }
  }
});

test('Day Trips keeps no-playground derived instead of storing it as a location tag', () => {
  for (const trip of trips) {
    assert.ok(trip.locations.length >= 1, `${trip.id} must keep at least one coarse location`);
    for (const location of trip.locations) {
      assert.equal(location.tags.includes('no-playground'), false, `${trip.id}/${location.name} stores derived no-playground`);
    }
  }
});

test('Day Trips uses practical parking clusters for the audited large parks', () => {
  const ids = new Set(trips.map((trip) => trip.id));
  assert.ok(ids.has('flat-rock-brook-nature-center'));
  assert.ok(ids.has('flat-rock-brook-jones-road'));
  assert.ok(ids.has('overpeck-henry-hoebel-north'));
  assert.ok(ids.has('overpeck-ridgefield-park-area'));
  assert.ok(ids.has('dunkerhook-saddle-river'));
  assert.ok(ids.has('saddle-river-otto-pehle-area'));
  assert.ok(ids.has('saddle-river-rochelle-park-area'));

  const vanSaun = trips.find((trip) => trip.id === 'bergen-county-zoo');
  assert.ok(vanSaun, 'Van Saun north cluster is missing');
  assert.equal(ids.has('van-saun-harmony-playground'), false, 'Van Saun north cluster is still double-counted');
  const vanSaunTags = new Set(vanSaun.locations.flatMap((location) => location.tags));
  for (const tag of ['animals', 'indoor-visit', 'playground', 'water-play']) {
    assert.ok(vanSaunTags.has(tag), `Van Saun north cluster is missing ${tag}`);
  }
});
