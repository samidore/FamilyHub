import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

const rules = await readFile('database.rules.json', 'utf8');
const env = await initializeTestEnvironment({ projectId: 'family-hub-rules', database: { host: '127.0.0.1', port: 9000, rules } });
const google = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).database();
const password = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: 'password' } }).database();
const household = 'households/test-day-trip-household';

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

test('Day Trips household overlay is private to verified Google household members', async () => {
  await reset();
  const cat = google('cat', 'cat@gmail.com');
  const dog = google('dog', 'dog@gmail.com');
  const outsider = google('outsider', 'outsider@gmail.com');
  await assertSucceeds(cat.ref(`${household}/dayTrips`).get());
  await assertSucceeds(dog.ref(`${household}/dayTrips`).get());
  await assertFails(outsider.ref(`${household}/dayTrips`).get());
  await assertFails(password('cat', 'cat@gmail.com').ref(`${household}/dayTrips`).get());
});

test('reactions are keyed by the signed-in uid and snapshot the member display name', async () => {
  await reset();
  const cat = google('cat', 'cat@gmail.com');
  const own = cat.ref(`${household}/dayTrips/reactions/bergen-county-zoo/cat`);
  await assertSucceeds(own.set({ value: 'up', authorName: '猫猫', updatedAt: 1 }));
  await assertSucceeds(own.update({ value: 'down', updatedAt: 2 }));
  await assertFails(own.update({ authorName: '呜哇', updatedAt: 3 }));
  await assertFails(cat.ref(`${household}/dayTrips/reactions/bergen-county-zoo/dog`).set({ value: 'up', authorName: '猫猫', updatedAt: 1 }));
  await assertFails(cat.ref(`${household}/dayTrips/reactions/bad/cat`).set({ value: 'maybe', authorName: '猫猫', updatedAt: 1 }));
  await assertFails(cat.ref(`${household}/dayTrips/reactions/wrong-name/cat`).set({ value: 'up', authorName: '呜哇', updatedAt: 1 }));
  await assertSucceeds(own.remove());
});

test('comments reuse immutable household display-name attribution and allow household editing/deletion', async () => {
  await reset();
  const cat = google('cat', 'cat@gmail.com');
  const dog = google('dog', 'dog@gmail.com');
  const comment = cat.ref(`${household}/dayTrips/comments/c1`);
  await assertSucceeds(comment.set({ id: 'c1', destinationId: 'bergen-county-zoo', body: '想再去', authorName: '猫猫', createdAt: 1 }));
  await assertFails(cat.ref(`${household}/dayTrips/comments/wrong`).set({ id: 'wrong', destinationId: 'bergen-county-zoo', body: 'bad', authorName: '呜哇', createdAt: 1 }));
  await assertSucceeds(dog.ref(`${household}/dayTrips/comments/c1`).update({ body: '下周去', updatedAt: 2 }));
  await assertFails(dog.ref(`${household}/dayTrips/comments/c1`).update({ authorName: '呜哇', updatedAt: 3 }));
  await assertFails(dog.ref(`${household}/dayTrips/comments/c1`).update({ createdAt: 9, updatedAt: 3 }));
  await assertSucceeds(dog.ref(`${household}/dayTrips/comments/c1`).remove());
});
