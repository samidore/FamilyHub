import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addRestaurantComment,
  addRestaurantInboxTicket,
  compareRestaurantWantPriority,
  createRestaurantInboxChatPrompt,
  defaultRestaurantInteractionState,
  normalizeRestaurantInteractionState,
  restaurantCommentsFor,
  restaurantInteractionLeafPatch,
  restaurantRatingForAuthor,
  restaurantWantSummary,
  setRestaurantRating,
  setRestaurantWant,
} from '../src/lib/restaurantInteractions.ts';

test('restaurant interaction state rejects malformed private records', () => {
  const state = normalizeRestaurantInteractionState({
    ratings: { bloom: { cat: { score: 5, authorName: '猫猫', updatedAt: 1 }, bad: { score: 6, authorName: '呜哇', updatedAt: 1 } } },
    wants: { bloom: { dog: { authorName: '呜哇', updatedAt: 2 }, bad: { authorName: 'x@example.com', updatedAt: 2 } } },
    comments: { c1: { id: 'c1', restaurantId: 'bloom', body: '好吃', authorName: '猫猫', createdAt: 3 }, c2: { id: 'wrong', restaurantId: 'bloom', body: 'bad', authorName: '猫猫', createdAt: 3 } },
    inbox: { i1: { id: 'i1', text: '加一家拉面', createdAt: 4, updatedAt: 4 }, i2: { id: 'nope', text: 'bad', createdAt: 4, updatedAt: 4 } },
  });
  assert.deepEqual(Object.keys(state.ratings.bloom), ['cat']);
  assert.deepEqual(Object.keys(state.wants.bloom), ['dog']);
  assert.deepEqual(Object.keys(state.comments), ['c1']);
  assert.deepEqual(Object.keys(state.inbox), ['i1']);
});

test('ratings are one integer 1-5 score per uid and author', () => {
  let state = defaultRestaurantInteractionState();
  state = setRestaurantRating(state, 'bloom', 'cat', '猫猫', 4, 1);
  assert.equal(state.ratings.bloom.cat.score, 4);
  assert.equal(restaurantRatingForAuthor(state, 'bloom', '猫猫')?.score, 4);
  state = setRestaurantRating(state, 'bloom', 'cat', '猫猫', 5, 2);
  assert.equal(state.ratings.bloom.cat.score, 5);
  state = setRestaurantRating(state, 'bloom', 'cat', '猫猫', null, 3);
  assert.equal(state.ratings.bloom, undefined);
});

test('restaurant Firebase patches touch exact leaves and never rewrite sibling member state', () => {
  let current = defaultRestaurantInteractionState();
  current = setRestaurantRating(current, 'bloom', 'dog', '呜哇', 5, 1);
  const withCat = setRestaurantRating(current, 'bloom', 'cat', '猫猫', 4, 2);
  assert.deepEqual(restaurantInteractionLeafPatch(current, withCat), {
    'ratings/bloom/cat': { score: 4, authorName: '猫猫', updatedAt: 2 },
  });
  const withoutDog = setRestaurantRating(withCat, 'bloom', 'dog', '呜哇', null, 3);
  assert.deepEqual(restaurantInteractionLeafPatch(withCat, withoutDog), {
    'ratings/bloom/dog': null,
  });
});

test('want priority sorts more household wants first then name', () => {
  let state = defaultRestaurantInteractionState();
  state = setRestaurantWant(state, 'both', 'cat', '猫猫', true, 1);
  state = setRestaurantWant(state, 'both', 'dog', '呜哇', true, 2);
  state = setRestaurantWant(state, 'one', 'dog', '呜哇', true, 3);
  const both = restaurantWantSummary(state.wants.both);
  const one = restaurantWantSummary(state.wants.one);
  const none = restaurantWantSummary(undefined);
  assert.deepEqual(both, { count: 2, cat: true, dog: true });
  assert.ok(compareRestaurantWantPriority(both, one, 'B', 'A') < 0);
  assert.ok(compareRestaurantWantPriority(one, none, 'B', 'A') < 0);
  assert.ok(compareRestaurantWantPriority(none, none, 'A', 'B') < 0);
});

test('restaurant comments stay ordered and attributed', () => {
  let state = defaultRestaurantInteractionState();
  state = addRestaurantComment(state, { id: 'c2', restaurantId: 'bloom', body: '第二条', authorName: '呜哇', createdAt: 2 });
  state = addRestaurantComment(state, { id: 'c1', restaurantId: 'bloom', body: '第一条', authorName: '猫猫', createdAt: 1 });
  assert.deepEqual(restaurantCommentsFor(state, 'bloom').map((comment) => comment.id), ['c1', 'c2']);
});

test('restaurant inbox prompt batches notes without exposing private state as public data', () => {
  let state = defaultRestaurantInteractionState();
  state = addRestaurantInboxTicket(state, { id: 'i1', text: 'Bloom 加炸鸡 tag', createdAt: 1, updatedAt: 1 });
  state = addRestaurantInboxTicket(state, { id: 'i2', text: 'Fort Lee 那家拉面查一下', createdAt: 2, updatedAt: 2 });
  const prompt = createRestaurantInboxChatPrompt(state, '2026-08-28');
  assert.match(prompt, /FamilyHub Restaurants Inbox/);
  assert.match(prompt, /1\. Bloom 加炸鸡 tag/);
  assert.match(prompt, /2\. Fort Lee 那家拉面查一下/);
  assert.match(prompt, /private runtime state/);
  assert.match(prompt, /不要写进公开 restaurants\.json/);
});
