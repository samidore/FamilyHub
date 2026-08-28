import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  addDayTripComment,
  compareDayTripReactionPriority,
  dayTripCommentsFor,
  dayTripReactionSummary,
  defaultDayTripInteractionState,
  normalizeDayTripInteractionState,
  setDayTripReaction,
} from '../src/lib/dayTripInteractions.ts';
import { householdAuthorIconKind, householdCommentWindow } from '../src/lib/householdPeople.ts';

test('Day Trips interaction state rejects malformed reactions and comments', () => {
  const state = normalizeDayTripInteractionState({
    reactions: {
      zoo: {
        cat: { value: 'up', authorName: '猫猫', updatedAt: 2 },
        bad: { value: 'maybe', authorName: 'Nope', updatedAt: 2 },
        email: { value: 'down', authorName: 'person@example.com', updatedAt: 2 },
      },
    },
    comments: {
      c1: { id: 'c1', destinationId: 'zoo', body: '好玩', authorName: '呜哇', createdAt: 3 },
      c2: { id: 'wrong', destinationId: 'zoo', body: 'bad', authorName: '猫猫', createdAt: 3 },
    },
  });
  assert.deepEqual(Object.keys(state.reactions.zoo), ['cat']);
  assert.deepEqual(Object.keys(state.comments), ['c1']);
});

test('one account has exactly one toggleable up/down reaction', () => {
  let state = defaultDayTripInteractionState();
  state = setDayTripReaction(state, 'zoo', 'cat-uid', '猫猫', 'up', 1);
  assert.equal(state.reactions.zoo['cat-uid'].value, 'up');
  state = setDayTripReaction(state, 'zoo', 'cat-uid', '猫猫', 'down', 2);
  assert.deepEqual(Object.keys(state.reactions.zoo), ['cat-uid']);
  assert.equal(state.reactions.zoo['cat-uid'].value, 'down');
  state = setDayTripReaction(state, 'zoo', 'cat-uid', '猫猫', null, 3);
  assert.equal(state.reactions.zoo, undefined);
});

test('reaction priority is cat-up, other up, none, split, then down-only', () => {
  const catUp = dayTripReactionSummary({ cat: { value: 'up', authorName: '猫猫', updatedAt: 1 } });
  const dogUp = dayTripReactionSummary({ dog: { value: 'up', authorName: '呜哇', updatedAt: 1 } });
  const none = dayTripReactionSummary(undefined);
  const split = dayTripReactionSummary({ cat: { value: 'down', authorName: '猫猫', updatedAt: 1 }, dog: { value: 'up', authorName: '呜哇', updatedAt: 1 } });
  const down = dayTripReactionSummary({ cat: { value: 'down', authorName: '猫猫', updatedAt: 1 } });
  assert.deepEqual([catUp.rank, dogUp.rank, none.rank, split.rank, down.rank], [0, 1, 2, 3, 4]);
  assert.ok(compareDayTripReactionPriority(catUp, dogUp, 20, 10) < 0);
  assert.ok(compareDayTripReactionPriority(none, split, 20, 10) < 0);
  assert.ok(compareDayTripReactionPriority(split, down, 20, 10) < 0);
});

test('same reaction class uses more up-votes then shorter drive', () => {
  const twoUps = dayTripReactionSummary({ cat: { value: 'up', authorName: '猫猫', updatedAt: 1 }, dog: { value: 'up', authorName: '呜哇', updatedAt: 1 } });
  const oneUp = dayTripReactionSummary({ cat: { value: 'up', authorName: '猫猫', updatedAt: 1 } });
  assert.ok(compareDayTripReactionPriority(twoUps, oneUp, 40, 10) < 0);
  assert.ok(compareDayTripReactionPriority(oneUp, oneUp, 10, 20) < 0);
});

test('Day Trips comments use the shared household first/middle/last window and avatars', () => {
  let state = defaultDayTripInteractionState();
  for (let index = 1; index <= 4; index += 1) {
    state = addDayTripComment(state, { id: `c${index}`, destinationId: 'zoo', body: `body ${index}`, authorName: index % 2 ? '猫猫' : '呜哇', createdAt: index });
  }
  const comments = dayTripCommentsFor(state, 'zoo');
  const windowed = householdCommentWindow(comments);
  assert.deepEqual(windowed.leading.map((comment) => comment.id), ['c1']);
  assert.deepEqual(windowed.middle.map((comment) => comment.id), ['c2', 'c3']);
  assert.deepEqual(windowed.trailing.map((comment) => comment.id), ['c4']);
  assert.equal(householdAuthorIconKind('猫猫'), 'cat');
  assert.equal(householdAuthorIconKind('呜哇'), 'dog');
});

test('Meal Builder and Notebook Firebase repositories delegate household identity to the shared session', () => {
  const mealRepository = readFileSync(new URL('../src/lib/householdRepository.ts', import.meta.url), 'utf8');
  const notebookRepository = readFileSync(new URL('../src/lib/notebookRepository.ts', import.meta.url), 'utf8');
  assert.match(mealRepository, /new FirebaseHouseholdSession\(config\)/);
  assert.match(notebookRepository, /new FirebaseHouseholdSession\(config\)/);
  assert.doesNotMatch(mealRepository, /new GoogleAuthProvider/);
  assert.doesNotMatch(notebookRepository, /new GoogleAuthProvider/);
});
