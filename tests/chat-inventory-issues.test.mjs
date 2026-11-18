import assert from 'node:assert/strict';
import test from 'node:test';
import { applyInventoryImport } from '../src/lib/inventoryImport.ts';
import { normalizeHouseholdState } from '../src/lib/household.ts';
import { CHAT_IMPORT_ISSUE_PREFIX, scanChatInventoryIssues } from '../src/lib/chatInventoryIssues.ts';

const ingredients = [
  { id: 'chicken-thighs', nameZh: '鸡腿', inventoryTracking: 'counted', freezerBehavior: 'thaw-required', visible: true },
  { id: 'cucumber', nameZh: '黄瓜', inventoryTracking: 'counted', visible: true },
];
const payload = JSON.stringify({
  schema: 'meal-builder-inventory-import', version: 1, stocked_on: '2026-11-14',
  items: [{ ingredient_id: 'chicken-thighs', quantity: 4, storage: 'freezer' }],
  unmatched: [],
});
const issue = (number, body = payload, overrides = {}) => ({
  title: CHAT_IMPORT_ISSUE_PREFIX + ' Whole Foods',
  number,
  body,
  user: { login: 'samidore' },
  author_association: 'OWNER',
  ...overrides,
});

test('ChatGPT issue bridge trusts only owner-authored issues and preserves entry order', () => {
  const scanned = scanChatInventoryIssues([
    issue(105), issue(103),
    issue(101, payload, { user: { login: 'other' } }),
    issue(102, payload, { pull_request: {} }),
    issue(104, payload, { author_association: 'NONE' }),
    issue(106, payload, { title: 'Other task' }),
  ], ingredients, {}, '2026-11-17');
  assert.deepEqual(scanned.ready.map((item) => item.issueNumber), [103, 105]);
  assert.deepEqual(scanned.errors, []);
});

test('Already applied issues are skipped and malformed or unmatched commands do not partly apply', () => {
  const unmatched = JSON.stringify({ schema: 'meal-builder-inventory-import', version: 1, stocked_on: '2026-11-14', items: [{ ingredient_id: 'cucumber', quantity: 1, storage: 'inventory' }], unmatched: ['unknown'] });
  const scanned = scanChatInventoryIssues([issue(100), issue(101, '{broken'), issue(102, unmatched), issue(103)], ingredients, { '100': true }, '2026-11-17');
  assert.deepEqual(scanned.ready.map((item) => item.issueNumber), [103]);
  assert.equal(scanned.errors.length, 2);
});

test('Atomic acknowledgement leaves a repeated command without any additional freezer stock', () => {
  let state = normalizeHouseholdState(undefined, ingredients);
  const scanned = scanChatInventoryIssues([issue(107)], ingredients, {}, '2026-11-17');
  for (let pass = 0; pass < 2; pass++) for (const { issueNumber, draft } of scanned.ready) {
    const id = String(issueNumber);
    if (!state.chatImportedIssueIds?.[id]) state = normalizeHouseholdState({
      ...applyInventoryImport(state, draft, ingredients, '2026-11-17'),
      chatImportedIssueIds: { ...state.chatImportedIssueIds, [id]: true },
    }, ingredients);
  }
  assert.deepEqual(state.freezerInventory, { 'chicken-thighs': 4 });
  assert.deepEqual(state.chatImportedIssueIds, { '107': true });
});
