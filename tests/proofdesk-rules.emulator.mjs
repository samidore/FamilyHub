// Proofdesk's MC option is a boolean chosen once at request creation, retained on resend.
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

const rules = await readFile('database.rules.json', 'utf8');
const env = await initializeTestEnvironment({ projectId: 'family-hub-rules', database: { host: '127.0.0.1', port: 9000, rules } });
const google = (uid) => env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).database();
const household = 'households/proofdesk-test';
const path = `${household}/proofdesk/book/20261121-153012-abcd`;
const queued = (source, option) => ({
  id: '20261121-153012-abcd', title: 'Test draft', createdAt: 1, updatedAt: 1, source,
  ...(source === 'paste' ? { draft: 'Test paragraph.' } : { driveName: 'Chapter 1' }),
  status: 'queued', checks: { manuscript: { status: 'queued' }, open: { status: 'queued' } },
  ...option,
});
const reset = () => env.withSecurityRulesDisabled(async (ctx) => {
  await ctx.database().ref(household).set({ members: { alice: { email: 'alice@example.com' } } });
});

test.after(() => env.cleanup());

test('members create pasted and Drive requests with either boolean or no option', async () => {
  for (const source of ['paste', 'drive']) for (const option of [{}, { skipProse: false }, { skipProse: true }]) {
    await reset();
    await assertSucceeds(google('alice').ref(path).set(queued(source, option)));
  }
  for (const value of ['true', 1, { enabled: true }]) {
    await reset();
    await assertFails(google('alice').ref(path).set(queued('paste', { skipProse: value })));
  }
  await reset();
  await assertFails(google('outsider').ref(path).set(queued('paste', { skipProse: true })));
  await assertFails(env.unauthenticatedContext().database().ref(path).set(queued('paste', { skipProse: true })));
});

test('option cannot be added, toggled or removed after creation, including a resend', async () => {
  for (const option of [{}, { skipProse: false }, { skipProse: true }]) {
    await reset();
    const alice = google('alice').ref(path);
    await assertSucceeds(alice.set(queued('paste', option)));
    const changed = option.skipProse === undefined ? false : !option.skipProse;
    await assertFails(alice.update({ skipProse: changed }));
    if (option.skipProse !== undefined) await assertFails(alice.child('skipProse').remove());
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path).update({
      status: 'done', 'checks/manuscript/status': 'done', 'checks/open/status': 'done',
    }));
    await assertFails(alice.update({ skipProse: changed, status: 'queued', 'checks/open/status': 'queued' }));
    if (option.skipProse !== undefined) await assertFails(alice.update({ skipProse: null, status: 'queued' }));
    await assertSucceeds(alice.update({ status: 'queued', updatedAt: 2, 'checks/open/status': 'queued' }));
  }
});
