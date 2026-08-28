import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

const rules = await readFile('database.rules.json', 'utf8');
const env = await initializeTestEnvironment({ projectId: 'family-hub-rules', database: { host: '127.0.0.1', port: 9000, rules } });
const google = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).database();
const password = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: 'password' } }).database();
const household = 'households/test-restaurant-household';

async function reset() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.database();
    await db.ref(household).set(null);
    await db.ref(`${household}/settings/enrollmentOpen`).set(false);
    await db.ref(`${household}/members/cat`).set({ email: 'cat@gmail.com', displayName: '猫猫' });
    await db.ref(`${household}/members/dog`).set({ email: 'dog@gmail.com', displayName: '呜哇' });
  });
}

test.after(async () => env.cleanup());

test('Restaurants household state is private to verified Google household members', async () => {
  await reset();
  const cat = google('cat', 'cat@gmail.com');
  const dog = google('dog', 'dog@gmail.com');
  const outsider = google('outsider', 'outsider@gmail.com');
  await assertSucceeds(cat.ref(`${household}/restaurants`).get());
  await assertSucceeds(dog.ref(`${household}/restaurants`).get());
  await assertFails(outsider.ref(`${household}/restaurants`).get());
  await assertFails(password('cat', 'cat@gmail.com').ref(`${household}/restaurants`).get());
});

test('restaurant ratings are 1-5 and attributed to the matching uid member', async () => {
  await reset();
  const cat = google('cat', 'cat@gmail.com');
  const own = cat.ref(`${household}/restaurants/ratings/bloom-chicken-hackensack/cat`);
  await assertSucceeds(own.set({ score: 4, authorName: '猫猫', updatedAt: 1 }));
  await assertSucceeds(own.update({ score: 5, updatedAt: 2 }));
  await assertFails(own.update({ score: 4.5, updatedAt: 3 }));
  await assertFails(own.update({ score: 6, updatedAt: 3 }));
  await assertFails(own.update({ authorName: '呜哇', updatedAt: 3 }));
  await assertFails(cat.ref(`${household}/restaurants/ratings/bloom-chicken-hackensack/dog`).set({ score: 5, authorName: '猫猫', updatedAt: 1 }));
});

test('restaurant want state is attributed to the matching uid member', async () => {
  await reset();
  const dog = google('dog', 'dog@gmail.com');
  const own = dog.ref(`${household}/restaurants/wants/bloom-chicken-hackensack/dog`);
  await assertSucceeds(own.set({ authorName: '呜哇', updatedAt: 1 }));
  await assertFails(own.update({ authorName: '猫猫', updatedAt: 2 }));
  await assertFails(dog.ref(`${household}/restaurants/wants/bloom-chicken-hackensack/cat`).set({ authorName: '呜哇', updatedAt: 1 }));
});

test('restaurant repository-style root transactions can change only the signed-in member leaf', async () => {
  await reset();
  const cat = google('cat', 'cat@gmail.com');
  const dog = google('dog', 'dog@gmail.com');
  await assertSucceeds(dog.ref(`${household}/restaurants/ratings/bloom-chicken-hackensack/dog`).set({ score: 5, authorName: '呜哇', updatedAt: 1 }));
  const root = cat.ref(`${household}/restaurants`);
  await assertSucceeds(root.transaction((current) => {
    const next = current ?? {};
    next.ratings ??= {};
    next.ratings['bloom-chicken-hackensack'] ??= {};
    next.ratings['bloom-chicken-hackensack'].cat = { score: 4, authorName: '猫猫', updatedAt: 2 };
    return next;
  }));
  const snapshot = await assertSucceeds(root.get());
  assert.equal(snapshot.child('ratings/bloom-chicken-hackensack/cat/score').val(), 4);
  assert.equal(snapshot.child('ratings/bloom-chicken-hackensack/dog/score').val(), 5);
});

test('restaurant comments and inbox keep household attribution and timestamp shape', async () => {
  await reset();
  const cat = google('cat', 'cat@gmail.com');
  const dog = google('dog', 'dog@gmail.com');
  const comment = cat.ref(`${household}/restaurants/comments/c1`);
  await assertSucceeds(comment.set({ id: 'c1', restaurantId: 'bloom-chicken-hackensack', body: '还会再点', authorName: '猫猫', createdAt: 1 }));
  await assertFails(cat.ref(`${household}/restaurants/comments/wrong`).set({ id: 'wrong', restaurantId: 'bloom-chicken-hackensack', body: 'bad', authorName: '呜哇', createdAt: 1 }));
  await assertSucceeds(dog.ref(`${household}/restaurants/comments/c1`).update({ body: '家庭共享可整理', updatedAt: 2 }));
  await assertFails(dog.ref(`${household}/restaurants/comments/c1`).update({ authorName: '呜哇', updatedAt: 3 }));
  await assertFails(dog.ref(`${household}/restaurants/comments/c1`).update({ createdAt: 9, updatedAt: 3 }));

  const inbox = dog.ref(`${household}/restaurants/inbox/i1`);
  await assertSucceeds(inbox.set({ id: 'i1', text: '加一家拉面', createdAt: 1, updatedAt: 1 }));
  await assertSucceeds(cat.ref(`${household}/restaurants/inbox/i1`).update({ text: '加一家 Fort Lee 拉面', updatedAt: 2 }));
  await assertFails(cat.ref(`${household}/restaurants/inbox/i1`).update({ createdAt: 9, updatedAt: 3 }));
});
