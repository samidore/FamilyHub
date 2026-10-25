import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTodaySummary } from '../src/lib/todayDomain.ts';
import { defaultNotebookState } from '../src/lib/notebookDomain.ts';

const at = new Date(2026, 9, 25, 12).getTime();
const household = {
  inventory: { tofu: 5 }, freezerInventory: {}, inventoryBatches: { tofu: { '2026-10-20': 2, '2026-10-24': 3 } },
  thawingItems: { job: { ingredientId: 'tofu', quantity: 1, startedAt: at, readyAt: at + 3600000 } },
  discardedStock: {}, pendingCheckoutMeals: [], activeStep: 'recipes', recentMeals: [],
  currentMeal: { status: 'ready', selectedRecipeIds: ['soup'], recipeFinishSelections: { soup: 'soy' }, note: '少盐' },
};
const catalog = {
  ingredients: [{ id: 'tofu', nameZh: '豆腐', inventoryTracking: 'counted', inventoryFreshness: 'fifo', freshnessPriorityDays: 3 }],
  recipes: [{ id: 'soup', nameZh: '豆腐汤', finishOptions: [{ id: 'soy', default: false, displayNameZh: '酱油豆腐汤' }] }],
};
const entry = (id, title, dueDate, priority = 'normal', status = 'active') =>
  ({ id, title, details: '', priority, status, dueDate, createdAt: 1000, updatedAt: 1000 });

test('today summary combines existing household and notebook data without mutation', () => {
  const notebook = defaultNotebookState();
  notebook.items = {
    trash: entry('trash', '倒垃圾', '2026-10-26'),
    urgent: entry('urgent', '紧急事项', '2026-12-01', 'urgent'),
    later: entry('later', '下周任务', '2026-11-03'),
    completed: entry('completed', '完成了', '2026-10-26', 'urgent', 'completed'),
  };
  const before = JSON.stringify({ household, notebook });
  const result = buildTodaySummary(household, notebook, catalog, at);
  assert.deepEqual(result.urgent.map((item) => item.id), ['trash', 'urgent']);
  assert.deepEqual(result.upcoming.map((item) => item.id), ['trash']);
  assert.deepEqual(result.meal, { status: 'ready', dishes: ['酱油豆腐汤'], note: '少盐' });
  assert.deepEqual(result.expiring, [{ id: 'tofu', name: '豆腐', quantity: 2, ageDays: 5 }]);
  assert.equal(result.highStock[0].quantity, 5);
  assert.equal(result.thawing[0].name, '豆腐');
  assert.equal(JSON.stringify({ household, notebook }), before);
});

test('completed and distant tasks do not trigger alerts', () => {
  const notebook = defaultNotebookState();
  notebook.items = { done: entry('done', '完成', '2026-10-25', 'urgent', 'completed'), distant: entry('distant', '远期', '2026-11-10') };
  const result = buildTodaySummary({ ...household, currentMeal: null, inventory: {}, inventoryBatches: {}, thawingItems: {} }, notebook, catalog, at);
  assert.equal(result.urgent.length, 0);
  assert.equal(result.upcoming.length, 0);
  assert.equal(result.meal, null);
});
