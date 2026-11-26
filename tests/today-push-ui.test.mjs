/** Verifies browser notification checks without contacting push services. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { compileUiModules, loadUiModule } from './helpers/uiModules.mjs';

const bundle = await compileUiModules('src/lib/todayPush.ts');

function setup(context, registration) {
  for (const key of ['window', 'navigator', 'Notification', 'localStorage']) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    context.after(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]);
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { Notification: {}, PushManager: {}, isSecureContext: true } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serviceWorker: {
    getRegistration: async () => registration, ready: new Promise(() => {}), register: async () => registration,
  } } });
  Object.defineProperty(globalThis, 'Notification', { configurable: true, value: { permission: 'granted', requestPermission: async () => 'granted' } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'synthetic-device' } });
  const writes = [];
  const ui = loadUiModule(bundle, { 'firebase/database': {
    ref: (_, key) => key, get: async () => ({ exists: () => true }),
    set: async (key) => writes.push(key), remove: async (key) => writes.push(key),
  } });
  const session = { database: {}, householdId: 'synthetic', getStatus: () => ({ connection: 'connected', uid: 'synthetic-member' }) };
  return { ui, session, writes };
}

test('checking notifications without a registered worker returns disabled promptly', async (context) => {
  const { ui, session } = setup(context, undefined);
  const result = await Promise.race([ui.todayPushIsEnabled(session, '/'), new Promise((resolve) => setImmediate(() => resolve('hung')))]);
  assert.equal(result, false);
});

test('disabling notifications without a worker completes instead of hanging logout', async (context) => {
  const { ui, session, writes } = setup(context, undefined);
  const result = await Promise.race([ui.disableTodayPush(session, '/').then(() => 'done'), new Promise((resolve) => setImmediate(() => resolve('hung')))]);
  assert.equal(result, 'done');
  assert.equal(writes.length, 1);
});

test('denied permission does not subscribe or register device data', async (context) => {
  const { ui, session, writes } = setup(context, undefined);
  Notification.requestPermission = async () => 'denied';
  await assert.rejects(ui.enableTodayPush(session, 'public-test-key', '/'), /权限/);
  assert.equal(writes.length, 0);
});
