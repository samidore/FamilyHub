/** Exercises session feedback against controlled Google and Firebase boundaries. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { compileUiModules, loadUiModule } from './helpers/uiModules.mjs';

const bundle = await compileUiModules('src/lib/householdSession.ts');
const config = { projectId: 'ui-test', databaseURL: 'https://example.test', householdId: 'synthetic' };
const user = { uid: 'synthetic-member', email: 'member@example.test', emailVerified: true, providerData: [{ providerId: 'google.com' }] };
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function setup() {
  const listeners = new Map();
  let persistence = async () => {};
  let popup = async () => {};
  let redirect = async () => {};
  const auth = { currentUser: null };
  const { FirebaseHouseholdSession } = loadUiModule(bundle, {
    'firebase/app': { getApps: () => [], initializeApp: () => ({}) },
    'firebase/auth': {
      GoogleAuthProvider: class { setCustomParameters() {} }, getAuth: () => auth,
      browserLocalPersistence: {}, setPersistence: () => persistence(), getRedirectResult: async () => null,
      onAuthStateChanged: (_, callback) => { queueMicrotask(() => callback(null)); return () => {}; },
      signInWithPopup: () => popup(), signInWithRedirect: () => redirect(), signOut: async () => {},
    },
    'firebase/database': {
      getDatabase: () => ({}), ref: (_, key) => key,
      get: async () => ({ val: () => false, child: (field) => ({ val: () => field === 'email' ? user.email : 'Test member' }) }),
      set: async () => {},
      onValue: (key, callback) => { listeners.set(key, callback); return () => listeners.delete(key); },
    },
  });
  const session = new FirebaseHouseholdSession(config);
  await session.ready;
  return { session, listeners, auth, setPersistence: (fn) => persistence = fn, setPopup: (fn) => popup = fn, setRedirect: (fn) => redirect = fn };
}

test('sign-in immediately shows progress and storage failures remain recoverable', async () => {
  const fixture = await setup();
  let reject;
  fixture.setPersistence(() => new Promise((_, fail) => reject = fail));
  const signingIn = fixture.session.signInWithGoogle();
  assert.equal(fixture.session.getStatus().connection, 'connecting');
  reject(new Error('storage unavailable'));
  await assert.rejects(signingIn);
  assert.equal(fixture.session.getStatus().connection, 'error');
  fixture.session.dispose();
});

test('redirect fallback failures leave an error instead of an endless login spinner', async () => {
  const fixture = await setup();
  fixture.setPopup(async () => { throw { code: 'auth/popup-blocked' }; });
  fixture.setRedirect(async () => { throw new Error('redirect unavailable'); });
  await assert.rejects(fixture.session.signInWithGoogle());
  assert.equal(fixture.session.getStatus().connection, 'error');
  fixture.session.dispose();
});

test('network reconnection feedback preserves verified membership and is disposed', async () => {
  const fixture = await setup();
  fixture.auth.currentUser = user;
  await fixture.session.refreshAccess();
  const update = fixture.listeners.get('.info/connected');
  assert.equal(typeof update, 'function');
  update({ val: () => false });
  assert.equal(fixture.session.getStatus().connection, 'connected');
  assert.equal(fixture.session.getStatus().networkConnected, false);
  update({ val: () => true });
  assert.equal(fixture.session.getStatus().networkConnected, true);
  fixture.session.dispose();
  assert.equal(fixture.listeners.has('.info/connected'), false);
  await tick();
});

test('restoring revoked membership reconnects without a manual access check', async () => {
  const fixture = await setup();
  fixture.auth.currentUser = user;
  await fixture.session.refreshAccess();
  const update = fixture.listeners.get('households/synthetic/members/synthetic-member');
  update({ child: () => ({ val: () => null }) });
  assert.equal(fixture.session.getStatus().connection, 'pending');
  update({ child: (field) => ({ val: () => field === 'email' ? user.email : null }) });
  assert.equal(fixture.session.getStatus().connection, 'connected');
  fixture.session.dispose();
});

test('cancelled Google login describes the next action without an SDK code', async () => {
  const fixture = await setup();
  fixture.setPopup(async () => { throw { code: 'auth/popup-closed-by-user' }; });
  await assert.rejects(fixture.session.signInWithGoogle());
  assert.match(fixture.session.getStatus().error, /重试/);
  assert.doesNotMatch(fixture.session.getStatus().error, /auth\//);
  fixture.session.dispose();
});
