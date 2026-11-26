/** Checks loading, retry, and account changes at the Firebase repository boundary. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { compileUiModules, loadUiModule } from './helpers/uiModules.mjs';

const tick = () => new Promise((resolve) => setImmediate(resolve));
const repositories = [
  ['src/lib/notebookRepository.ts', 'FirebaseNotebookRepository'],
  ['src/lib/householdRepository.ts', 'FirebaseHouseholdRepository'],
  ['src/lib/dayTripInteractions.ts', 'FirebaseDayTripInteractionRepository'],
  ['src/lib/restaurantInteractions.ts', 'FirebaseRestaurantInteractionRepository'],
];

for (const [entry, className] of repositories) {
  const bundle = await compileUiModules(entry);
  function setup(read) {
    let current = { connection: 'connected', uid: 'first-member', email: 'first@example.test' };
    let listener;
    const session = {
      database: {}, ready: Promise.resolve(), getStatus: () => current,
      getCurrentMemberDisplayName: () => 'Synthetic member', getCurrentUid: () => current.uid,
      subscribe(callback) { listener = callback; callback(current); return () => {}; },
      refreshAccess: async () => {
        session.emit({ ...current, connection: 'connecting' });
        session.emit({ ...current, connection: 'connected' });
      },
      emit(status) { current = status; listener?.(status); }, dispose() {},
    };
    const exports = loadUiModule(bundle, {
      'src/lib/householdSession.ts': { FirebaseHouseholdSession: class { constructor() { return session; } } },
      'firebase/database': { ref: (_, key) => key, get: () => read(), onValue: () => () => {} },
    });
    const repository = new exports[className]({ householdId: 'synthetic' });
    return { repository, session };
  }

  test(`${className}: failed initial read exposes error and access retry recovers`, async () => {
    let failure = true;
    const { repository, session } = setup(async () => {
      if (failure) throw new Error('synthetic read failure');
      return { val: () => null };
    });
    await repository.ready.catch(() => {});
    await tick();
    assert.equal(repository.getStatus().connection, 'error');
    failure = false;
    await session.refreshAccess();
    await tick();
    assert.equal(repository.getStatus().connection, 'connected');
    repository.dispose();
  });

  test(`${className}: connection feedback does not duplicate an outstanding read`, async () => {
    let reads = 0;
    let finish;
    const { repository, session } = setup(() => { reads++; return new Promise((resolve) => finish = resolve); });
    await tick();
    session.emit({ ...session.getStatus(), networkConnected: false });
    await tick();
    assert.equal(reads, 1);
    finish({ val: () => null });
    await tick();
    assert.equal(repository.getStatus().connection, 'connected');
    assert.equal(repository.getStatus().networkConnected, false);
    repository.dispose();
  });

  test(`${className}: an old account read cannot replace the new account status`, async () => {
    const pending = [];
    const { repository, session } = setup(() => new Promise((resolve) => pending.push(resolve)));
    await tick();
    session.emit({ connection: 'connecting', uid: 'second-member' });
    session.emit({ connection: 'connected', uid: 'second-member' });
    await tick();
    pending[1]({ val: () => null });
    await tick();
    pending[0]({ val: () => null });
    await tick();
    assert.equal(repository.getStatus().uid, 'second-member');
    repository.dispose();
  });
}
