import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// Signed-in Novel Archive behaviour against a stubbed Firebase: Google sign-in is a
// persisted Auth user and the Realtime Database is answered over its WebSocket protocol
// from the tree below. The build must carry the stub config, so this file only runs on
// request; see docs/modules/novel-archive/README.md for the command.
const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const stub = { apiKey: 'novel-stub-key', projectId: 'novel-stub', householdId: 'novel-stub-house' };
const reader = { uid: 'novel-stub-reader', email: 'reader@example.com' };
test.skip(env.NOVEL_FIREBASE_STUB !== '1', 'needs a build with the stub Firebase config (NOVEL_FIREBASE_STUB=1)');

type Tree = { [key: string]: unknown };
interface Point { title: string; locs: string[] }
interface Timeline { owners: { id: string; domain: string }[]; points: Record<string, Point> }

// A small made-up timeline: two axis Owners, two selectable lines, two bands.
const fixture = (axisLabel: string) => ({
  bands: ['开端', '后来'], axis: ['CH-Ann', 'TP-Ann-Bo'], axisLabel, defaultOn: ['CH-Cy'],
  domains: [['CHARACTER', '人物'], ['LOCATION', '地点'], ['TOPIC', '主题']],
  owners: [
    { id: 'CH-Ann', domain: 'CHARACTER', name: 'Ann', desc: '主角', pts: [['E-9001', 'Ann 到码头', 1], ['E-9002@定约', 'Ann 定约', 0], ['E-9004', 'Ann 离开', 0]] },
    { id: 'CH-Cy', domain: 'CHARACTER', name: 'Cy', desc: '旁观者', pts: [['E-9002@定约', 'Cy 旁观', 0], ['E-9003', 'Cy 独行，后见 E-9004', 0], ['E-9004', 'Cy 告别', 0]] },
    { id: 'LOC-Dock', domain: 'LOCATION', name: '码头', desc: '', pts: [['E-9001', '相遇之处', 0]] },
    { id: 'TP-Ann-Bo', domain: 'TOPIC', name: 'Ann与Bo', desc: '', pts: [['E-9001', '两人相遇', 1]] },
  ],
  points: {
    'E-9001': { r: 0, b: 0, t: '在码头相遇', title: '相遇', time: '春', end: '', pt: '', story: '两人在码头相遇。', roles: { 'CH-Ann': '到达' }, locs: ['C1#P2'] },
    'E-9002@定约': { r: 10, b: 0, t: '定下约定', title: '约定', time: '春末', end: '', pt: '当面定约', story: '', roles: {}, locs: ['C2#P5-P6'] },
    'E-9003': { r: 20, b: 1, t: 'Cy 独行', title: '独行', time: '夏', end: '', pt: '', story: '', roles: { 'CH-Cy': '独自出发' }, locs: ['C2#P9'] },
    'E-9004': { r: 30, b: 1, t: '告别', title: '告别', time: '秋', end: '', pt: '', story: '', roles: {}, locs: ['C3#P1'] },
  },
});

const pageKey = (path: string) => Buffer.from(path).toString('base64url');
// Reading pages for every link the timeline can make, shaped like the compiled KB.
function stubBook(title: string, timeline: Timeline): Tree {
  const pages: Record<string, [string, string]> = {
    'INDEX.md': ['总目录', `<h1>${title} 总目录</h1><p><a href="CHRONOLOGY.md">文字时间线</a></p>`],
    'CHRONOLOGY.md': ['文字时间线', '<h1>文字时间线</h1>'],
  };
  const chapters: Record<string, number> = {};
  for (const [pid, point] of Object.entries(timeline.points)) {
    const [eid, name] = pid.split('@');
    const page = pages[`events/${eid}.md`] ??= [`${eid} ${point.title}`, `<h1>${eid} ${point.title}</h1>`];
    if (name) page[1] += `<h2><a id="at-${name}"></a>${name}</h2>${'<p>经过。</p>'.repeat(30)}`;
    for (const loc of point.locs) {
      const [, chapter, paragraph] = /^C(\d+)#P(\d+)/.exec(loc)!;
      chapters[chapter] = Math.max(chapters[chapter] ?? 0, Number(paragraph));
    }
  }
  for (const [chapter, last] of Object.entries(chapters)) {
    const body = Array.from({ length: last + 30 }, (_, i) => `<p><a id="p${i + 1}"></a>[P${i + 1}] 第 ${chapter} 章正文。</p>`).join('');
    pages[`source/C${chapter}.md`] = [`C${chapter}`, `<h1>C${chapter}</h1>${body}`];
  }
  for (const owner of timeline.owners) {
    for (const page of ['START_HERE.md', 'TIMELINE_INDEX.md']) pages[`owners/${owner.domain}/${owner.id}/${page}`] = [`${owner.id} ${page}`, `<h1>${owner.id}</h1>`];
  }
  const entries = Object.fromEntries(Object.entries(pages).map(([path, [pageTitle]]) => [pageKey(path), { path, title: pageTitle, section: '全局' }]));
  return {
    manifest: { title, scope: 'C1–C3', entries },
    pages: Object.fromEntries(Object.entries(pages).map(([path, [, html]]) => [pageKey(path), html])),
    search: Object.fromEntries(Object.entries(pages).map(([path, [pageTitle]]) => [pageKey(path), pageTitle])),
    timeline: JSON.stringify(timeline),
  };
}

// NOVEL_STUB_DB may name a full private payload ({manifest,pages,search,timeline}) for
// the first book, e.g. for screenshots with the real timeline; it is never committed.
async function database() {
  const first = env.NOVEL_STUB_DB ? JSON.parse(await readFile(env.NOVEL_STUB_DB, 'utf8')) as Tree : stubBook('Maritime Story', fixture('Ann·Bo'));
  const books: Record<string, Tree> = { 'maritime-story': first, 'second-book': stubBook('Second Book', fixture('第二本')) };
  const catalog = Object.fromEntries(Object.entries(books).map(([slug, book]) => [slug, { title: (book.manifest as Tree).title, scope: (book.manifest as Tree).scope }]));
  return { households: { [stub.householdId]: { members: { [reader.uid]: { email: reader.email } }, settings: { enrollmentOpen: false }, novelArchive: { catalog, books } } } } as Tree;
}

async function stubFirebase(page: Page, { signedIn = true } = {}) {
  const db = await database();
  const reads: string[] = [];
  const at = (path: string) => path.split('/').filter(Boolean).reduce<unknown>((node, key) => (node as Tree | null)?.[key] ?? null, db);
  if (signedIn) {
    const user = {
      uid: reader.uid, email: reader.email, emailVerified: true, isAnonymous: false,
      providerData: [{ providerId: 'google.com', uid: 'google-reader', email: reader.email, displayName: null, phoneNumber: null, photoURL: null }],
      stsTokenManager: { refreshToken: 'stub-refresh', accessToken: 'stub-access', expirationTime: Date.now() + 3_600_000 },
      createdAt: '1', lastLoginAt: '1', apiKey: stub.apiKey, appName: `family-hub-${stub.projectId}`,
    };
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`firebase:authUser:${stub.apiKey}:family-hub-${stub.projectId}`, JSON.stringify(user)]);
  }
  await page.route(/identitytoolkit\.googleapis\.com/, (route) => route.fulfill({ json: { users: [{
    localId: reader.uid, email: reader.email, emailVerified: true, createdAt: '1', lastLoginAt: '1',
    providerUserInfo: [{ providerId: 'google.com', rawId: 'google-reader', email: reader.email }],
  }] } }));
  await page.routeWebSocket(/firebaseio\.com/, (ws) => {
    const send = (data: unknown) => ws.send(JSON.stringify({ t: 'd', d: data }));
    ws.send(JSON.stringify({ t: 'c', d: { t: 'h', d: { ts: Date.now(), v: '5', h: new URL(ws.url()).host, s: 'stub-session' } } }));
    ws.onMessage((message) => {
      let frame: { t?: string; d?: { r: number; a: string; b: { p?: string } } };
      try { frame = JSON.parse(String(message)); } catch { return; }
      if (frame?.t !== 'd' || !frame.d) return;
      const { r, a, b } = frame.d;
      if (b.p) reads.push(b.p);
      if (a === 'q') send({ a: 'd', b: { p: b.p, d: at(b.p!) } });
      send({ r, b: { s: 'ok', d: a === 'g' ? at(b.p!) : {} } });
    });
  });
  return reads;
}

const timelineRows = (page: Page) => page.locator('#novel-timeline-view .row');
const tab = (page: Page, name: '阅读器' | '时间线') => page.locator('#novel-views').getByRole('link', { name });
const expectUrl = (page: Page, params: Record<string, string>, hash = '') => expect.poll(() => {
  const url = new URL(page.url());
  return { ...Object.fromEntries(url.searchParams), hash: decodeURIComponent(url.hash) };
}).toEqual({ ...params, hash });

test('signed out, a configured book page reads nothing from the novel archive', async ({ page }) => {
  const reads = await stubFirebase(page, { signedIn: false });
  await page.goto('novel-archive/?book=maritime-story&view=timeline');
  await expect(page.locator('#novel-sign-in')).toBeVisible();
  await expect(page.locator('#novel-book-title')).toHaveText('Maritime Story');
  await expect(page.locator('#novel-app')).toBeHidden();
  await expect(page.locator('#novel-timeline-view')).toBeEmpty();
  expect(reads.filter((path) => path.includes('novelArchive'))).toEqual([]);
});

test('direct links and refresh open the named book, view and place', async ({ page }) => {
  await stubFirebase(page);
  await page.goto('novel-archive/?book=maritime-story&view=timeline');
  await expect(timelineRows(page).first()).toBeVisible();
  await expect(tab(page, '时间线')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#novel-book-title')).toHaveText('Maritime Story');
  await page.reload();
  await expect(timelineRows(page).first()).toBeVisible();
  await expect(page.locator('#novel-reader-view')).toBeHidden();

  await page.goto('novel-archive/?book=second-book&doc=source%2FC2.md#p9');
  await expect(page.locator('#novel-page-title')).toHaveText('C2');
  await expect(page.locator('#novel-book-title')).toHaveText('Second Book');
  await expect(page.locator('#novel-book-select')).toHaveValue('second-book');
  await expect(page.locator('#novel-content [id="p9"]')).toBeInViewport();
  await page.reload();
  await expect(page.locator('#novel-page-title')).toHaveText('C2');
  await expect(page.locator('#novel-content [id="p9"]')).toBeInViewport();
  await expect(page.locator('#novel-timeline-view')).toBeEmpty();
});

test('timeline links open the reader and history replays views and books', async ({ page }) => {
  await stubFirebase(page);
  await page.goto('novel-archive/?book=maritime-story');
  await expectUrl(page, { book: 'maritime-story', doc: 'INDEX.md' });
  await tab(page, '时间线').click();
  await expectUrl(page, { book: 'maritime-story', view: 'timeline', doc: 'INDEX.md' });
  await page.locator('#novel-timeline-view .row[data-p="E-9002@定约"]').click();
  const card = page.locator('#novel-timeline-view .card');
  await expect(card.locator('.loc')).toHaveText('C2#P5-P6');
  await card.getByRole('link', { name: '约定 · 定约' }).click();
  await expectUrl(page, { book: 'maritime-story', doc: 'events/E-9002.md' }, '#at-定约');
  await expect(page.locator('#novel-content [id="at-定约"]')).toBeInViewport();

  await page.locator('#novel-book-select').selectOption('second-book');
  await expectUrl(page, { book: 'second-book', doc: 'INDEX.md' });
  await expect(page.locator('#novel-book-title')).toHaveText('Second Book');
  await tab(page, '时间线').click();
  await expect(page.locator('#novel-timeline-view .chip.axis')).toContainText('第二本');
  const depth = await page.evaluate(() => history.length);

  await page.goBack();
  await expectUrl(page, { book: 'second-book', doc: 'INDEX.md' });
  await expect(page.locator('#novel-page-title')).toHaveText('总目录');
  await page.goBack();
  await expectUrl(page, { book: 'maritime-story', doc: 'events/E-9002.md' }, '#at-定约');
  await expect(page.locator('#novel-page-title')).toHaveText('E-9002 约定');
  await expect(page.locator('#novel-book-title')).toHaveText('Maritime Story');
  await page.goBack();
  await expectUrl(page, { book: 'maritime-story', view: 'timeline', doc: 'INDEX.md' });
  await expect(page.locator('#novel-timeline-view .chip.axis')).toContainText('Ann·Bo');
  await expect(card).toHaveCount(1);   // the opened node is kept per book
  await page.goForward();
  await page.goForward();
  await expectUrl(page, { book: 'second-book', doc: 'INDEX.md' });
  await expect(page.locator('#novel-book-select')).toHaveValue('second-book');
  expect(await page.evaluate(() => history.length)).toBe(depth);

  await page.goBack();
  await tab(page, '时间线').click();
  await page.locator('#novel-timeline-view .card .loc').click();
  await expectUrl(page, { book: 'maritime-story', doc: 'source/C2.md' }, '#p5');
  await expect(page.locator('#novel-content [id="p5"]')).toBeInViewport();
});

// Screenshots for review: NOVEL_SHOTS_DIR=<dir> NOVEL_STUB_DB=<real payload>.
test('review screenshots', async ({ page }) => {
  test.skip(!env.NOVEL_SHOTS_DIR, 'set NOVEL_SHOTS_DIR to capture review screenshots');
  const dir = env.NOVEL_SHOTS_DIR!;
  await mkdir(dir, { recursive: true });
  await stubFirebase(page);
  for (const [name, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1366, height: 900 }]] as const) {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await page.locator('[data-category-section="novel-archive"]').screenshot({ path: join(dir, `${name}-1-home-section.png`) });
    await page.goto('novel-archive/?book=maritime-story');
    await expect(page.locator('#novel-content h1, #novel-content h2').first()).toBeVisible();
    await page.locator('#novel-views').scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(dir, `${name}-2-reader.png`) });
    await tab(page, '时间线').click();
    await expect(timelineRows(page).first()).toBeVisible();
    await page.evaluate(() => document.getElementById('novel-views')!.scrollIntoView({ behavior: 'instant' }));
    await page.screenshot({ path: join(dir, `${name}-3-timeline.png`) });
    const row = page.locator('#novel-timeline-view .row:has(.key)').nth(1);
    await row.click();
    await page.evaluate(() => {
      const open = document.querySelector<HTMLElement>('#novel-timeline-view .row.open')!;
      window.scrollBy({ top: open.getBoundingClientRect().top - 120, behavior: 'instant' });
    });
    await page.screenshot({ path: join(dir, `${name}-4-expanded.png`) });
    await row.click();
    await page.locator('#novel-timeline-view [data-nt="zfit"]').click();
    await page.screenshot({ path: join(dir, `${name}-5-overview.png`) });
  }
});
