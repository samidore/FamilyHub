import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

const rules = await readFile('database.rules.json', 'utf8');
const env = await initializeTestEnvironment({ projectId: 'family-hub-rules', database: { host: '127.0.0.1', port: 9000, rules } });
const google = (uid) => env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).database();
const household = 'households/outline-test';
const slug = 'maritime-story';
const path = `${household}/outlineSync/${slug}`;
const live = (rev, base, uid = 'alice') => ({ rev, base, at: 1700000000000, by: 'web', uid, plot: 'plot', plan: 'plan' });
const reset = () => env.withSecurityRulesDisabled(async (ctx) => {
  await ctx.database().ref(household).set({ members: { alice: { email: 'alice@example.com' } } });
});

test.after(() => env.cleanup());

test('members can read outline sync and outsiders cannot', async () => {
  await reset();
  await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path).set({ live: live('aaaaaaaaaaaa', 'old') }));
  await assertSucceeds(google('alice').ref(path).once('value'));
  await assertFails(google('outsider').ref(path).once('value'));
  await assertFails(env.unauthenticatedContext().database().ref(path).once('value'));
});

test('head, incoming, starter, and coordinator are admin-only', async () => {
  await reset();
  const alice = google('alice');
  for (const child of ['head', 'incoming', 'starter', '_coordinator']) {
    await assertFails(alice.ref(`${household}/outlineSync/${child}`).set({ value: true }));
  }
});

test('live uses a changed revision and the current revision as its CAS base', async () => {
  await reset();
  const alice = google('alice').ref(path);
  await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path).set({ live: live('aaaaaaaaaaaa', 'old') }));
  await assertSucceeds(alice.child('live').set(live('bbbbbbbbbbbb', 'aaaaaaaaaaaa')));
  await assertFails(alice.child('live').set(live('cccccccccccc', 'old')));
  await assertFails(alice.child('live').set(live('bbbbbbbbbbbb', 'bbbbbbbbbbbb')));
  await assertFails(alice.child('live').set({ ...live('dddddddddddd', 'bbbbbbbbbbbb'), by: 'repo' }));
  await assertFails(alice.child('live').set({ ...live('eeeeeeeeeeee', 'bbbbbbbbbbbb'), extra: true }));
  await assertFails(alice.child('live').set({ ...live('ffffffffffff', 'bbbbbbbbbbbb'), uid: 'outsider' }));
});

test('kept stores exactly the replaced live in the same CAS update', async () => {
  await reset();
  const alice = google('alice').ref(path);
  await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path).set({ live: live('aaaaaaaaaaaa', 'old') }));
  const replacement = live('bbbbbbbbbbbb', 'aaaaaaaaaaaa');
  const previous = live('aaaaaaaaaaaa', 'old');
  await assertSucceeds(alice.update({ live: replacement, kept: { rev: previous.rev, at: previous.at, uid: previous.uid, plot: previous.plot, plan: previous.plan } }));
  await assertFails(alice.update({ 'live/base': 'bbbbbbbbbbbb', 'live/rev': 'cccccccccccc', 'kept/plot': 'wrong' }));
  await assertFails(alice.child('kept').set({ rev: replacement.rev, at: replacement.at, uid: 'alice', plot: 'wrong', plan: replacement.plan }));
});

test('slug and payload constraints reject malformed writes', async () => {
  await reset();
  const alice = google('alice');
  await assertFails(alice.ref(`${household}/outlineSync/BadSlug`).set({ live: live('aaaaaaaaaaaa', 'old') }));
  await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(`${household}/outlineSync/${slug}`).set({ live: live('aaaaaaaaaaaa', 'old') }));
  const valid = live('bbbbbbbbbbbb', 'aaaaaaaaaaaa');
  await assertFails(alice.ref(path).child('live').set({ ...valid, rev: 'bad' }));
  await assertFails(alice.ref(path).child('live').set({ ...valid, plot: 1 }));
  await assertFails(alice.ref(path).child('live').set({ ...valid, plan: 'x'.repeat(2000001) }));
});

test('every explicit replacement works over a repo-written live', async () => {
  const alice = google('alice').ref(path);
  for (const extra of [{}, { over: 'tree-from-repo' }]) {
    await reset();
    const repo = { rev: 'aaaaaaaaaaaa', base: '', at: 1700000000000, by: 'repo', plot: 'repo-plot', plan: 'repo-plan' };
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path).set({ live: repo }));
    const kept = { rev: repo.rev, at: 1700000009999, uid: 'alice', plot: repo.plot, plan: repo.plan };
    await assertSucceeds(alice.update({ live: { ...live('bbbbbbbbbbbb', repo.rev), ...extra }, kept }));
  }
});
