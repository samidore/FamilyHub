import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateMeal, defaultMealState, isFeasible, isMealComplete, rankCandidates, timeFit } from '../src/lib/mealEngine.ts';

const recipe = (id, contribution, childCoverage = { protein: false, vegetable: false }, requirements = []) => ({ id, order: Number(id.replace(/\D/g, '')) || 0, fitScore: 4, contribution, childCoverage, requirements, mealWindowMinutes: '30–45', elapsedMinutes: '30–45', advanceStartRequired: false });

test('required and one-of ingredients determine feasibility', () => {
  const item = recipe('r1', { protein: 1, vegetable: 0, staple: 0 }, undefined, [{ anyOf: ['pork'] }, { anyOf: ['mushroom-a', 'mushroom-b'] }]);
  assert.equal(isFeasible(item, new Set(['pork', 'mushroom-b'])), true);
  assert.equal(isFeasible(item, new Set(['pork'])), false);
});

test('mixed contributions aggregate and complete a meal', () => {
  const mixed = recipe('r1', { protein: .5, vegetable: 1, staple: 0 }, { protein: true, vegetable: true });
  const staple = recipe('r2', { protein: .5, vegetable: 1, staple: 1 }, { protein: false, vegetable: false });
  const state = defaultMealState(); state.selectedRecipeIds = ['r1', 'r2'];
  const totals = aggregateMeal([mixed, staple]);
  assert.deepEqual(totals, { protein: 1, vegetable: 2, staple: 1, childProtein: true, childVegetable: true });
  assert.equal(isMealComplete(state, totals), true);
});

test('child gap ranks efficient mixed filler before half protein and full fallback', () => {
  const steak = recipe('r1', { protein: 1, vegetable: 0, staple: 0 });
  const mixed = recipe('r2', { protein: .5, vegetable: 1, staple: 0 }, { protein: true, vegetable: true });
  const half = recipe('r3', { protein: .5, vegetable: 0, staple: 0 }, { protein: true, vegetable: false });
  const full = recipe('r4', { protein: 1, vegetable: 0, staple: 0 }, { protein: true, vegetable: false });
  const adult = recipe('r5', { protein: 1, vegetable: 0, staple: 0 });
  const state = defaultMealState(); state.stapleRequired = false; state.availableIngredientIds = ['all']; state.selectedRecipeIds = ['r1'];
  const ranked = rankCandidates([steak, mixed, half, full, adult], state).map((item) => item.id);
  assert.deepEqual(ranked, ['r2', 'r3', 'r4']);
  state.childMode = false;
  assert.deepEqual(rankCandidates([steak, mixed, half, full, adult], state).map((item) => item.id), ['r2']);
});

test('time preference ranks without hiding and flags borderline ranges', () => {
  const item = recipe('r1', { protein: 1, vegetable: 0, staple: 0 });
  assert.deepEqual(timeFit(item, '30'), { rank: 1, label: '时间偏紧' });
  item.advanceStartRequired = true;
  assert.deepEqual(timeFit(item, '60'), { rank: 2, label: '需提前开始' });
});
