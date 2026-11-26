/** Mounts actual household UI code over synthetic transport in the browser. */
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { compileUiModules, loadUiModule } from './uiModules.mjs';

export async function mountToday(page: Page) {
  await page.route('**/_astro/*.js', (route) => route.abort());
  await page.goto('today/');
  const source = (await readFile('src/pages/today.astro', 'utf8')).split('  <script>')[1].split('</script>')[0];
  const bundle = await compileUiModules('src/pages/today.ts', source);
  await page.addScriptTag({ content: `window.loadUiModule = ${loadUiModule.toString()}` });
  await page.evaluate((compiled) => {
    const test = window as any;
    Object.defineProperty(Notification, 'permission', { configurable: true, value: 'default' });
    const config = document.getElementById('today-firebase')!;
    config.textContent = JSON.stringify({ ...JSON.parse(config.textContent!), webPushPublicKey: 'public-test-key' });
    let listener: (status: any) => void;
    let status = { connection: 'connected', uid: 'synthetic-member', email: 'member@example.test', networkConnected: true };
    const subscriptions = new Map();
    test.today = {
      setStatus(next: any) { status = next; listener(status); },
      emit(path: string, value: any) { subscriptions.get(path).success({ val: () => value }); },
      fail(path: string) { subscriptions.get(path).failure(new Error('synthetic read failure')); },
      subscriptions, check: async () => false, enable: async () => {}, disable: async () => {},
    };
    const session = {
      database: {}, ready: Promise.resolve(), getStatus: () => status,
      subscribe(callback: any) { listener = callback; callback(status); },
      signInWithGoogle: async () => {}, refreshAccess: async () => {}, signOut: async () => {},
    };
    test.loadUiModule(compiled, {
      'firebase/database': {
        ref: (_: any, path: string) => path,
        onValue(path: string, success: any, failure: any) {
          subscriptions.set(path.split('/').at(-1), { success, failure });
          return () => subscriptions.delete(path.split('/').at(-1));
        },
      },
      'src/lib/householdSession.ts': { hasCompleteFirebaseConfig: () => true, FirebaseHouseholdSession: class { constructor() { return session; } } },
      'src/lib/todayPush.ts': {
        todayPushAvailable: () => true, todayPushIsEnabled: () => test.today.check(),
        enableTodayPush: () => test.today.enable(), disableTodayPush: () => test.today.disable(),
      },
    });
  }, bundle);
}

export async function mountNotebook(page: Page, developer = false) {
  await page.route('**/_astro/*.js', (route) => route.abort());
  await page.goto(developer ? 'sami-notebook/developer/' : 'sami-notebook/');
  const entry = developer ? 'src/lib/notebookDeveloperUi.ts' : 'src/lib/notebookUi.ts';
  const bundle = await compileUiModules(entry);
  await page.addScriptTag({ content: `window.loadUiModule = ${loadUiModule.toString()}` });
  await page.evaluate(({ compiled, isDeveloper }) => {
    const test = window as any;
    const services = { 'firebase/app': {}, 'firebase/auth': {}, 'firebase/database': {} };
    const { LocalNotebookRepository } = test.loadUiModule({ ...compiled, entry: 'src/lib/notebookRepository.ts' }, services);
    const time = Date.now();
    const board = { id: 'todo', title: 'Synthetic tasks', kind: 'task', visible: true, collapsed: false, order: 0, createdAt: time, updatedAt: time };
    const item = { id: 'task', title: 'Synthetic task', details: '', priority: 'normal', status: 'active', createdAt: time, updatedAt: time };
    test.repository = new LocalNotebookRepository('synthetic', { initialState: {
      boards: { todo: board }, items: { task: item }, memberships: { todo: { task: { itemId: 'task', order: 0 } } },
      inbox: { ticket: { id: 'ticket', text: 'Synthetic capture', createdAt: time, updatedAt: time } },
    } });
    const ui = test.loadUiModule(compiled, { ...services, 'src/lib/notebookRepository.ts': { createNotebookRepository: () => test.repository } });
    (isDeveloper ? ui.mountNotebookDeveloperUi : ui.mountNotebookUi)({});
  }, { compiled: bundle, isDeveloper: developer });
}

export async function mountPublicHousehold(page: Page, restaurant: boolean) {
  await page.route('**/_astro/*.js', (route) => route.abort());
  await page.goto(restaurant ? 'restaurants/' : 'day-trips/');
  const bundle = await compileUiModules(restaurant ? 'src/lib/restaurantInteractionUi.ts' : 'src/lib/dayTripInteractionUi.ts');
  await page.addScriptTag({ content: `window.loadUiModule = ${loadUiModule.toString()}` });
  await page.evaluate(({ compiled, isRestaurant }) => {
    const test = window as any;
    const ui = test.loadUiModule(compiled, { 'firebase/app': {}, 'firebase/auth': {}, 'firebase/database': {} });
    test.repository = (isRestaurant ? ui.mountRestaurantInteractionUi : ui.mountDayTripInteractionUi)({}, { allowLocal: true });
  }, { compiled: bundle, isRestaurant: restaurant });
}
