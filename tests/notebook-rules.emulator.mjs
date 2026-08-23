import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

const rules = await readFile('database.rules.json', 'utf8');
const env = await initializeTestEnvironment({ projectId: 'family-hub-rules', database: { host: '127.0.0.1', port: 9000, rules } });
const google = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).database();
const password = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: 'password' } }).database();
const household = 'households/test-notebook-household';
const board = { id: 'todo', title: 'Todo', kind: 'task', visible: true, collapsed: false, order: 0, createdAt: 1, updatedAt: 1 };
const item = { id: 'task-1', title: 'Call contractor', details: '', priority: 'high', status: 'active', createdAt: 2, updatedAt: 2 };

async function resetWithMember({ displayName = 'Sami' } = {}) {
  await env.withSecurityRulesDisabled(async (context) => {
    await context.database().ref(household).set(null);
    await context.database().ref(`${household}/settings/enrollmentOpen`).set(false);
    await context.database().ref(`${household}/members/alice`).set({ email: 'alice@gmail.com', ...(displayName ? { displayName } : {}) });
  });
}

test.after(async () => env.cleanup());

test('notebook data is readable and writable only by verified household members', async () => {
  await resetWithMember();
  const alice = google('alice', 'alice@gmail.com');
  const bob = google('bob', 'bob@gmail.com');
  await assertSucceeds(alice.ref(`${household}/notebook/boards/todo`).set(board));
  await assertSucceeds(alice.ref(`${household}/notebook`).get());
  await assertFails(bob.ref(`${household}/notebook`).get());
  await assertFails(bob.ref(`${household}/notebook/inbox/t1`).set({ id: 't1', text: 'private note', createdAt: 1, updatedAt: 1 }));
  await assertFails(password('alice', 'alice@gmail.com').ref(`${household}/notebook`).get());
  await assertFails(google('alice', 'wrong@gmail.com').ref(`${household}/notebook`).get());
});

test('member display name stays private/admin-managed during self-enrollment', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await context.database().ref(household).set(null);
    await context.database().ref(`${household}/settings/enrollmentOpen`).set(true);
  });
  const alice = google('alice', 'alice@gmail.com');
  await assertFails(alice.ref(`${household}/members/alice`).set({ email: 'alice@gmail.com', displayName: 'Sami' }));
  await assertSucceeds(alice.ref(`${household}/members/alice`).set({ email: 'alice@gmail.com' }));
  await assertFails(alice.ref(`${household}/members/alice/displayName`).set('Sami'));
});

test('notebook schema accepts canonical records and rejects unsupported fields or lifecycle states', async () => {
  await resetWithMember();
  const alice = google('alice', 'alice@gmail.com');
  await assertSucceeds(alice.ref(`${household}/notebook/boards/todo`).set(board));
  await assertSucceeds(alice.ref(`${household}/notebook/items/task-1`).set(item));
  await assertSucceeds(alice.ref(`${household}/notebook/memberships/todo/task-1`).set({ order: 0 }));
  await assertSucceeds(alice.ref(`${household}/notebook/inbox/ticket-1`).set({ id: 'ticket-1', text: 'remember this', createdAt: 3, updatedAt: 3 }));
  await assertSucceeds(alice.ref(`${household}/notebook/settings`).set({ viewFilter: 'completed' }));
  await assertSucceeds(alice.ref(`${household}/notebook/items/media-good`).set({ ...item, id: 'media-good', platform: 'Max', imdbRating: 8.2, myRating: 9.5 }));

  await assertFails(alice.ref(`${household}/notebook/items/bad-media`).set({ ...item, id: 'bad-media', mediaType: 'movie' }));
  await assertFails(alice.ref(`${household}/notebook/items/bad-complete`).set({ ...item, id: 'bad-complete', status: 'completed' }));
  await assertFails(alice.ref(`${household}/notebook/items/bad-recurring`).set({ ...item, id: 'bad-recurring', status: 'completed', completedAt: 4, recurrence: { unit: 'month', interval: 3 } }));
  await assertFails(alice.ref(`${household}/notebook/items/bad-time`).set({ ...item, id: 'bad-time', dueTime: '15:00' }));
  await assertFails(alice.ref(`${household}/notebook/items/bad-rating`).set({ ...item, id: 'bad-rating', imdbRating: 11 }));
  await assertFails(alice.ref(`${household}/notebook/items/bad-my-rating`).set({ ...item, id: 'bad-my-rating', myRating: 11 }));
});

test('new items may snapshot the current member display name and cannot later change or remove authors', async () => {
  await resetWithMember({ displayName: 'Sami' });
  const alice = google('alice', 'alice@gmail.com');
  const authoredRef = alice.ref(`${household}/notebook/items/authored`);
  await assertSucceeds(authoredRef.set({ ...item, id: 'authored', authorName: 'Sami' }));
  await assertFails(alice.ref(`${household}/notebook/items/wrong-author`).set({ ...item, id: 'wrong-author', authorName: 'Someone Else' }));
  await assertFails(authoredRef.update({ authorName: 'Someone Else', updatedAt: 3 }));
  await assertFails(authoredRef.child('authorName').remove());
  await assertSucceeds(authoredRef.update({ title: 'Edited title', updatedAt: 3 }));
});

test('comments snapshot the configured member name, never an email, and preserve the original author on edit', async () => {
  await resetWithMember();
  const alice = google('alice', 'alice@gmail.com');
  await assertSucceeds(alice.ref(`${household}/notebook/items/task-1`).set(item));
  const commentRef = alice.ref(`${household}/notebook/comments/comment-1`);
  await assertSucceeds(commentRef.set({ id: 'comment-1', itemId: 'task-1', body: 'Quoted $500', authorName: 'Sami', createdAt: 5 }));
  await assertFails(alice.ref(`${household}/notebook/comments/comment-email`).set({ id: 'comment-email', itemId: 'task-1', body: 'bad author', authorName: 'alice@gmail.com', createdAt: 6 }));
  await assertFails(commentRef.update({ authorName: 'Someone Else', body: 'changed' }));
  await assertSucceeds(commentRef.update({ body: 'changed', updatedAt: 7 }));
});

test('comments cannot be created until the member has a private display name', async () => {
  await resetWithMember({ displayName: '' });
  const alice = google('alice', 'alice@gmail.com');
  await assertSucceeds(alice.ref(`${household}/notebook/items/task-1`).set(item));
  await assertFails(alice.ref(`${household}/notebook/comments/comment-1`).set({ id: 'comment-1', itemId: 'task-1', body: 'hello', authorName: 'Sami', createdAt: 5 }));
});

test('completion events preserve priority and board membership snapshots', async () => {
  await resetWithMember();
  const alice = google('alice', 'alice@gmail.com');
  await assertSucceeds(alice.ref(`${household}/notebook/completionEvents/event-1`).set({ id: 'event-1', itemId: 'task-1', completedAt: 9, priority: 'urgent', boardIds: ['todo'] }));
  await assertFails(alice.ref(`${household}/notebook/completionEvents/event-2`).set({ id: 'event-2', itemId: 'task-1', completedAt: 9, priority: 'urgent', boardIds: [] }));
  await assertFails(alice.ref(`${household}/notebook/completionEvents/event-3`).set({ id: 'event-3', itemId: 'task-1', completedAt: 9, priority: 'critical', boardIds: ['todo'] }));
});
