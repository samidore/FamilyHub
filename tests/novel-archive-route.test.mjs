import assert from 'node:assert/strict';
import test from 'node:test';
import { novelRouteHref, parseNovelRoute } from '../src/lib/novelArchiveRoute.ts';

const page = 'https://family.example/novel-archive/';

test('links from before the timeline still open the reader', () => {
  const route = parseNovelRoute(new URL(`${page}?book=maritime-story&doc=events%2FE-0047.md#at-定约`));
  assert.deepEqual(route, { book: 'maritime-story', view: 'reader', doc: 'events/E-0047.md', hash: `#${encodeURIComponent('at-定约')}` });
  assert.equal(novelRouteHref(new URL(page), route), '/novel-archive/?book=maritime-story&doc=events%2FE-0047.md#at-%E5%AE%9A%E7%BA%A6');
});

test('every view, book and page round-trips through the URL', () => {
  for (const route of [
    { book: 'maritime-story', view: 'timeline', doc: '', hash: '' },
    { book: 'maritime-story', view: 'timeline', doc: 'source/C13.md', hash: '' },
    { book: 'second-book', view: 'reader', doc: 'source/C1.md', hash: '#p9' },
  ]) {
    assert.deepEqual(parseNovelRoute(new URL(novelRouteHref(new URL(page), route), page)), route);
  }
});

test('unknown views fall back to the reader and unsafe book names are dropped', () => {
  const route = parseNovelRoute(new URL(`${page}?book=..%2Fsettings&view=graph`));
  assert.equal(route.book, '');
  assert.equal(route.view, 'reader');
  assert.equal(novelRouteHref(new URL(`${page}?book=x&view=timeline&doc=a.md#b`), route), '/novel-archive/');
});
