import assert from 'node:assert/strict';
import test from 'node:test';
import { filterDayTripLocations, matchesDayTripActivities } from '../src/lib/dayTripFiltering.mjs';

const location = (tags, bicycleAccess, stroller = true) => ({ tags, bicycleAccess, stroller, environment: 'outdoor', notFor: [], hours: 'always' });

test('ordinary constraints are applied before activity matching', () => {
  const locations = [location(['woody-walk'], 'allowed'), location(['playground'], 'prohibited')];
  assert.equal(matchesDayTripActivities(locations, new Set(['woody-walk']), { bicycleFree: true }), false);
});

test('a surviving bike-prohibited location can satisfy the activity', () => {
  const locations = [location(['woody-walk'], 'allowed'), location(['woody-walk'], 'prohibited')];
  assert.equal(matchesDayTripActivities(locations, new Set(['woody-walk']), { bicycleFree: true }), true);
});

test('no-playground rejects from original locations and unknown bicycle access fails closed', () => {
  const locations = [location(['playground'], 'unknown'), location(['woody-walk'], 'unknown')];
  assert.equal(matchesDayTripActivities(locations, new Set(['woody-walk']), { noPlayground: true }), false);
  assert.equal(filterDayTripLocations(locations, { bicycleFree: true }).length, 0);
});

test('stroller is unrestricted off and applied before activity matching when on', () => {
  const locations = [location(['woody-walk'], 'unknown', false), location(['playground'], 'unknown', true)];
  assert.equal(matchesDayTripActivities(locations, new Set(['woody-walk']), { stroller: false }), true);
  assert.equal(matchesDayTripActivities(locations, new Set(['woody-walk']), { stroller: true }), false);
});
