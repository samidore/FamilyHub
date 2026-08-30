import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const trips = JSON.parse(await readFile(new URL('../src/data/day-trips.json', import.meta.url), 'utf8'));

const ALL_ACTIVITIES = ['woody-walk', 'playground', 'no-playground', 'indoor-visit', 'animals', 'water-play', 'pick-your-own'];
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
  'pick-your-own': [[20, 2], [40, 4]],
};

function matches(trip, driveMinutes, weather, activity) {
  if (trip.driveMinutes === null) return false;
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
  assert.ok(ids.has('teatown-nature-center-lakeside'));
  assert.ok(ids.has('teatown-cliffdale-farm'));
  assert.ok(ids.has('rockefeller-main-entrance-swan-lake'));
  assert.ok(ids.has('rockefeller-rockwood-hall'));
  assert.equal(ids.has('teatown-lake-reservation'), false, 'Teatown broad record is still unsplit');
  assert.equal(ids.has('rockefeller-state-park-preserve'), false, 'Rockefeller broad record is still unsplit');

  const vanSaun = trips.find((trip) => trip.id === 'bergen-county-zoo');
  assert.ok(vanSaun, 'Van Saun north cluster is missing');
  assert.equal(ids.has('van-saun-harmony-playground'), false, 'Van Saun north cluster is still double-counted');
  const vanSaunTags = new Set(vanSaun.locations.flatMap((location) => location.tags));
  for (const tag of ['animals', 'indoor-visit', 'playground', 'water-play']) {
    assert.ok(vanSaunTags.has(tag), `Van Saun north cluster is missing ${tag}`);
  }
});

test('Day Trips keeps pick-your-own as a real stored activity with nearby coverage', () => {
  const pyo = trips.filter((trip) => trip.locations.some((location) => location.tags.includes('pick-your-own')));
  assert.ok(pyo.length >= 8, `pick-your-own needs a useful farm set, has only ${pyo.length}`);
  assert.ok(pyo.filter((trip) => trip.driveMinutes !== null && trip.driveMinutes <= 20).length >= 2, 'pick-your-own needs at least two <=20 minute options');
  assert.ok(pyo.filter((trip) => trip.driveMinutes !== null && trip.driveMinutes <= 40).length >= 4, 'pick-your-own needs at least four <=40 minute options');
});

test('Day Trips nests aquarium under the 玩水 activity and keeps a useful aquarium set', () => {
  const aquariumTrips = trips.filter((trip) => trip.locations.some((location) => location.tags.includes('aquarium')));
  assert.ok(aquariumTrips.length >= 9, `aquarium needs the agreed useful set, has only ${aquariumTrips.length}`);
  assert.ok(aquariumTrips.filter((trip) => trip.driveMinutes !== null && trip.driveMinutes <= 20).length >= 3, 'aquarium needs at least three <=20 minute options');
  assert.ok(aquariumTrips.filter((trip) => trip.driveMinutes !== null && trip.driveMinutes <= 40).length >= 5, 'aquarium needs at least five <=40 minute options');

  for (const trip of aquariumTrips) {
    for (const location of trip.locations.filter((item) => item.tags.includes('aquarium'))) {
      assert.ok(location.tags.includes('water-play'), `${trip.id}/${location.name} aquarium must also sit under water-play`);
    }
  }
});

test('Day Trips keeps unknown drive times explicitly unknown and provenance-aligned', () => {
  for (const trip of trips) {
    assert.equal(trip.driveTimeProvenance.status, trip.driveMinutes === null ? 'unknown' : 'verified');
    assert.equal(trip.driveTimeProvenance.checkedDate, '2026-08-30');
    assert.equal(trip.driveTimeProvenance.primarySource, 'Google Maps');
  }
});

test('Day Trips keeps the audited Google Maps identities photo-friendly and unambiguous where known', () => {
  for (const trip of trips) {
    const url = new URL(trip.googleMapsUrl);
    assert.ok(['google.com', 'www.google.com'].includes(url.hostname), `${trip.id} must use Google Maps`);
    assert.ok(url.pathname.startsWith('/maps/place/') || url.pathname.startsWith('/maps/search'), `${trip.id} must open a place/search page`);
    const query = url.searchParams.get('query') ?? '';
    assert.equal(/^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(query.trim()), false, `${trip.id} must not use coordinate-only maps links`);
  }

  const oritani = trips.find((trip) => trip.id === 'flat-rock-brook-jones-road');
  assert.ok(oritani, 'Flat Rock Oritani playground record is missing');
  assert.equal(oritani.name, 'Flat Rock Brook — Oritani Playground');
  const oritaniUrl = new URL(oritani.googleMapsUrl);
  assert.equal(oritaniUrl.searchParams.get('query_place_id'), 'ChIJUwFrJwDxwokRz50o1ocd_VU');

  const concklin = trips.find((trip) => trip.id === 'orchards-of-concklin-pyo');
  assert.ok(concklin, 'Orchards of Concklin record is missing');
  assert.match(decodeURIComponent(concklin.googleMapsUrl).replaceAll('+', ' '), /1010 (?:Route|Rt\.) 45/i);
});
