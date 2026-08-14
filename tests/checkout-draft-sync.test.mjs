import assert from 'node:assert/strict';
import test from 'node:test';
import { CheckoutDraftSync } from '../src/lib/checkoutDraftSync.ts';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

test('checkout drafts stay optimistic and save immutable snapshots in order', async () => {
  const sync = new CheckoutDraftSync();
  const first = deferred();
  const second = deferred();
  const started = [];
  const saves = [first, second];
  const save = (snapshot) => { started.push(snapshot); return saves[started.length - 1].promise; };
  const saved = (result) => sync.sync('meal-1', result);
  const failed = () => assert.fail('save should succeed');

  sync.sync('meal-1', { tomato: 0 });
  const firstEdit = { tomato: 0.5 };
  sync.edit('meal-1', firstEdit, save, { saved, failed });
  firstEdit.tomato = 9;
  sync.edit('meal-1', { tomato: 1 }, save, { saved, failed });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(sync.value, { tomato: 1 });
  assert.deepEqual(started, [{ tomato: 0.5 }]);
  sync.sync('meal-1', { tomato: 0 });
  assert.deepEqual(sync.value, { tomato: 1 });

  first.resolve({ tomato: 0.5 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(started, [{ tomato: 0.5 }, { tomato: 1 }]);
  second.resolve({ tomato: 1 });
  await sync.whenIdle();

  assert.deepEqual(sync.value, { tomato: 1 });
});

test('latest failed checkout save restores the newest authoritative draft', async () => {
  const sync = new CheckoutDraftSync();
  const write = deferred();
  let failure;

  sync.sync('meal-1', { tomato: 0.5 });
  sync.edit('meal-1', { tomato: 1 }, () => write.promise, {
    saved: () => assert.fail('save should fail'),
    failed: (error) => { failure = error; },
  });
  sync.sync('meal-1', { tomato: 0 });
  assert.deepEqual(sync.value, { tomato: 1 });

  write.reject(new Error('offline'));
  await sync.whenIdle();

  assert.equal(failure.message, 'offline');
  assert.deepEqual(sync.value, { tomato: 0 });
});

test('completion from an old meal cannot replace the current meal draft', async () => {
  const sync = new CheckoutDraftSync();
  const oldWrite = deferred();
  let staleCompletion = false;

  sync.sync('meal-1', { tomato: 0 });
  sync.edit('meal-1', { tomato: 0.5 }, () => oldWrite.promise, {
    saved: () => { staleCompletion = true; },
    failed: () => assert.fail('save should succeed'),
  });
  sync.sync('meal-2', { eggs: false });
  oldWrite.resolve({ tomato: 0.5 });
  await sync.whenIdle();

  assert.equal(staleCompletion, false);
  assert.deepEqual(sync.value, { eggs: false });
});
