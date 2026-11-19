// The Novel Archive page keeps all of its state in the URL:
// /novel-archive/?book=<slug>&view=reader|timeline&doc=<path>#<fragment>.
// `view` is omitted for the reader so links from before the timeline keep working.

export const novelViews = [
  { id: 'reader', label: '阅读器' },
  { id: 'timeline', label: '时间线' },
] as const;

export type NovelView = (typeof novelViews)[number]['id'];

export interface NovelRoute { book: string; view: NovelView; doc: string; hash: string; }

export function parseNovelRoute(url: URL): NovelRoute {
  const book = url.searchParams.get('book') ?? '';
  const view = url.searchParams.get('view');
  return {
    book: /^[a-z0-9-]+$/.test(book) ? book : '',
    view: novelViews.find((item) => item.id === view)?.id ?? 'reader',
    doc: url.searchParams.get('doc') ?? '',
    hash: url.hash,
  };
}

export function novelRouteHref(current: URL, route: NovelRoute): string {
  const target = new URL(current.href);
  target.search = '';
  if (route.book) target.searchParams.set('book', route.book);
  if (route.view !== 'reader') target.searchParams.set('view', route.view);
  if (route.doc) target.searchParams.set('doc', route.doc);
  target.hash = route.hash;
  return `${target.pathname}${target.search}${target.hash}`;
}
