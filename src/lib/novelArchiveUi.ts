import { get, ref } from 'firebase/database';
import { novelBooks } from '../config/modules.ts';
import {
  FirebaseHouseholdSession,
  hasCompleteFirebaseConfig,
  type FirebaseConfig,
  type HouseholdSessionStatus,
} from './householdSession.ts';
import { novelRouteHref, parseNovelRoute, type NovelRoute, type NovelView } from './novelArchiveRoute.ts';
import { mountNovelTimeline, type NovelTimelineState } from './novelTimeline.ts';
import { parseTimelineData, type NovelTimelineData } from './novelTimelineModel.ts';

interface BookInfo { title: string; scope?: string; pageCount?: number; }
interface PageEntry { path: string; title: string; section: string; }
interface BookManifest { title: string; scope?: string; entries: Record<string, PageEntry>; }
interface LoadedBook {
  manifest: BookManifest;
  pathToKey: Map<string, string>;
  searchable: Record<string, string> | null;
  /** undefined: not read yet; null: not synced for this book. */
  timeline?: NovelTimelineData | null;
  timelineState?: NovelTimelineState;
}

const sections = [
  ['总目录', 'INDEX.md'],
  ['人物与支线', 'human/02-人物与支线.md'],
  ['世界设定', 'human/03-势力地点与议题.md'],
  ['文字时间线', 'CHRONOLOGY.md'],
  ['发生／披露对照', 'DUAL_ORDER.md'],
  ['事件索引', 'events/INDEX.md'],
  ['伏笔', 'setups/INDEX.md'],
] as const;

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing Novel Archive element: ${id}`);
  return node as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const here = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

export function mountNovelArchive(config: Partial<FirebaseConfig>) {
  const authPanel = element<HTMLElement>('novel-auth');
  const authMessage = element<HTMLElement>('novel-auth-message');
  const signIn = element<HTMLButtonElement>('novel-sign-in');
  const refresh = element<HTMLButtonElement>('novel-refresh-access');
  const signOut = element<HTMLButtonElement>('novel-sign-out');
  const appPanel = element<HTMLElement>('novel-app');
  const bookTitle = element<HTMLElement>('novel-book-title');
  const bookSelect = element<HTMLSelectElement>('novel-book-select');
  const scope = element<HTMLElement>('novel-scope');
  const views = element<HTMLElement>('novel-views');
  const readerView = element<HTMLElement>('novel-reader-view');
  const timelineView = element<HTMLElement>('novel-timeline-view');
  const nav = element<HTMLElement>('novel-nav');
  const title = element<HTMLElement>('novel-page-title');
  const article = element<HTMLElement>('novel-content');
  const live = element<HTMLElement>('novel-live');
  const searchInput = element<HTMLInputElement>('novel-search');
  const searchForm = element<HTMLFormElement>('novel-search-form');
  const searchResults = element<HTMLElement>('novel-results');

  // The page title is the book's public name, so it is shown before login too.
  const showBookTitle = (slug: string, privateTitle?: string) => {
    const name = novelBooks.find((book) => book.slug === slug)?.title ?? privateTitle ?? '小离总周报';
    bookTitle.textContent = name;
    document.title = name === '小离总周报' ? '小离总周报 · Family Hub' : `${name} · 小离总周报 · Family Hub`;
  };
  showBookTitle(parseNovelRoute(new URL(window.location.href)).book);

  const message = (text: string) => { live.textContent = text; };
  if (!hasCompleteFirebaseConfig(config)) {
    authMessage.textContent = 'FamilyHub Firebase 配置不完整，无法访问私人小说内容。';
    signIn.hidden = true;
    refresh.hidden = true;
    signOut.hidden = true;
    appPanel.hidden = true;
    return;
  }

  const session = new FirebaseHouseholdSession(config);
  const root = `households/${config.householdId}/novelArchive`;
  let activeUid = '';
  let requestSerial = 0;
  let catalog: Record<string, BookInfo> = {};
  let books = new Map<string, LoadedBook>();
  // What is on screen: the reader keeps its page while the timeline is shown.
  let currentBook = '';
  let currentPath = '';
  let shownView: NovelView | '' = '';
  let readerScrollY = 0;
  let timeline: { slug: string; unmount: () => void } | null = null;

  const isConnected = () => session.getStatus().connection === 'connected';
  const readerHref = (book: string, path: string, hash = '') =>
    novelRouteHref(new URL(window.location.href), { book, view: 'reader', doc: path, hash });

  const unmountTimeline = () => {
    timeline?.unmount();
    timeline = null;
    timelineView.replaceChildren();
  };

  const clearPrivate = () => {
    requestSerial += 1;
    activeUid = '';
    unmountTimeline();
    currentBook = '';
    currentPath = '';
    shownView = '';
    readerScrollY = 0;
    catalog = {};
    books = new Map();
    bookSelect.replaceChildren();
    nav.replaceChildren();
    title.textContent = '';
    article.replaceChildren();
    searchResults.replaceChildren();
    searchInput.value = '';
    scope.textContent = '';
    message('');
  };

  const showStatus = (status: HouseholdSessionStatus) => {
    const connected = status.connection === 'connected';
    authPanel.hidden = connected;
    appPanel.hidden = !connected;
    authMessage.textContent = status.error ? `${status.label}：${status.error}` : status.label;
    signIn.hidden = status.connection !== 'signed-out' && !(status.connection === 'error' && !status.email);
    refresh.hidden = status.connection !== 'pending' && !(status.connection === 'error' && Boolean(status.email));
    signOut.hidden = !status.email;
    if (!connected) {
      if (activeUid) clearPrivate();
      return;
    }
    if (activeUid !== status.uid) {
      clearPrivate();
      activeUid = status.uid ?? '';
      void loadBooks();
    }
  };

  const validateManifest = (value: unknown): BookManifest | null => {
    if (!isRecord(value) || typeof value.title !== 'string' || !isRecord(value.entries)) return null;
    const entries: Record<string, PageEntry> = {};
    for (const [key, entry] of Object.entries(value.entries)) {
      if (!/^[a-zA-Z0-9_-]+$/.test(key) || !isRecord(entry) || typeof entry.path !== 'string' ||
          typeof entry.title !== 'string' || typeof entry.section !== 'string') return null;
      entries[key] = { path: entry.path, title: entry.title, section: entry.section };
    }
    return { title: value.title, scope: typeof value.scope === 'string' ? value.scope : undefined, entries };
  };

  const loadBooks = async () => {
    const serial = ++requestSerial;
    message('正在加载小说目录…');
    try {
      const snapshot = await get(ref(session.database, `${root}/catalog`));
      if (serial !== requestSerial || !isConnected()) return;
      const data = snapshot.val();
      catalog = {};
      if (isRecord(data)) {
        for (const [slug, book] of Object.entries(data)) {
          if (/^[a-z0-9-]+$/.test(slug) && isRecord(book) && typeof book.title === 'string') {
            catalog[slug] = { title: book.title, scope: typeof book.scope === 'string' ? book.scope : undefined,
              pageCount: typeof book.pageCount === 'number' ? book.pageCount : undefined };
          }
        }
      }
      bookSelect.replaceChildren();
      for (const slug of Object.keys(catalog).sort()) {
        const option = document.createElement('option');
        option.value = slug;
        option.textContent = catalog[slug].title;
        bookSelect.append(option);
      }
      if (!bookSelect.options.length) {
        views.hidden = true;
        title.textContent = '尚未同步小说';
        article.textContent = '登录已成功。小说 KB 需要从私有 Novel 仓库同步到 FamilyHub 的私有数据库后才能阅读。';
        message('');
        return;
      }
      views.hidden = false;
      await render();
    } catch (error) {
      if (serial !== requestSerial) return;
      message(error instanceof Error ? `读取小说目录失败：${error.message}` : '读取小说目录失败');
    }
  };

  const loadBook = async (slug: string) => {
    const snapshot = await get(ref(session.database, `${root}/books/${slug}/manifest`));
    const manifest = validateManifest(snapshot.val());
    if (!manifest) throw new Error('小说索引缺失或格式无效');
    const pathToKey = new Map(Object.entries(manifest.entries).map(([key, entry]) => [entry.path, key]));
    return { manifest, pathToKey, searchable: null } satisfies LoadedBook;
  };

  const renderNav = (slug: string, book: LoadedBook) => {
    nav.replaceChildren();
    for (const [label, path] of sections) {
      if (!book.pathToKey.has(path)) continue;
      const link = document.createElement('a');
      link.textContent = label;
      link.href = readerHref(slug, path);
      link.dataset.docPath = path;
      nav.append(link);
    }
  };

  const scrollToFragment = (fragment: string) => {
    if (!fragment) return;
    let target = '';
    try { target = decodeURIComponent(fragment.replace(/^#/, '')); }
    catch { target = fragment.replace(/^#/, ''); }
    requestAnimationFrame(() => {
      const match = [...article.querySelectorAll<HTMLElement>('[id]')].find((node) => node.id === target);
      match?.scrollIntoView({ block: 'start' });
    });
  };

  const remapLinks = (slug: string, book: LoadedBook) => {
    for (const anchor of article.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      const href = anchor.getAttribute('href');
      if (!href) continue;
      try {
        const resolved = new URL(href, new URL(currentPath, 'https://kb.invalid/'));
        if (resolved.hostname === 'kb.invalid' && resolved.pathname.endsWith('.md')) {
          const path = decodeURIComponent(resolved.pathname.slice(1));
          if (!book.pathToKey.has(path)) {
            anchor.removeAttribute('href');
            continue;
          }
          anchor.href = readerHref(slug, path, resolved.hash);
          anchor.dataset.docPath = path;
          anchor.dataset.docHash = resolved.hash;
        } else if (href.startsWith('#')) {
          anchor.href = readerHref(slug, currentPath, href);
          anchor.dataset.docHash = href;
        } else if (resolved.protocol === 'https:' && resolved.hostname !== 'kb.invalid') {
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
        } else {
          anchor.removeAttribute('href');
        }
      } catch {
        anchor.removeAttribute('href');
      }
    }
  };

  const showPage = async (slug: string, book: LoadedBook, path: string, serial: number) => {
    const key = book.pathToKey.get(path)!;
    message('正在读取页面…');
    const snapshot = await get(ref(session.database, `${root}/books/${slug}/pages/${key}`));
    if (serial !== requestSerial || !isConnected()) return false;
    const html = snapshot.val();
    if (typeof html !== 'string') throw new Error('页面未同步');
    currentPath = path;
    title.textContent = book.manifest.entries[key].title;
    article.innerHTML = html;
    remapLinks(slug, book);
    return true;
  };

  const showReader = async (slug: string, book: LoadedBook, route: NovelRoute, serial: number) => {
    if (!book.pathToKey.has(route.doc)) {
      if (route.doc) route.hash = '';
      route.doc = 'INDEX.md';
    }
    const fromTimeline = shownView === 'timeline';
    unmountTimeline();
    timelineView.hidden = true;
    readerView.hidden = false;
    if (currentPath !== route.doc) {
      if (!await showPage(slug, book, route.doc, serial)) return false;
    } else if (fromTimeline && !route.hash) {
      window.scrollTo({ top: readerScrollY, behavior: 'instant' });
      return true;
    }
    if (route.hash) scrollToFragment(route.hash);
    else window.scrollTo({ top: 0, behavior: 'instant' });
    return true;
  };

  const showTimeline = async (slug: string, book: LoadedBook, route: NovelRoute, serial: number) => {
    route.hash = '';
    if (shownView === 'reader') readerScrollY = window.scrollY;
    readerView.hidden = true;
    timelineView.hidden = false;
    if (timeline?.slug === slug) return true;
    unmountTimeline();
    if (book.timeline === undefined) {
      message('正在读取时间线…');
      const snapshot = await get(ref(session.database, `${root}/books/${slug}/timeline`));
      if (serial !== requestSerial || !isConnected()) return false;
      book.timeline = parseTimelineData(snapshot.val());
    }
    if (!book.timeline) {
      const empty = document.createElement('p');
      empty.className = 'novel-muted';
      empty.textContent = '这本书的时间线尚未同步。';
      timelineView.append(empty);
      return true;
    }
    const firstVisit = !book.timelineState;
    const href = (path: string, hash: string) => (book.pathToKey.has(path) ? readerHref(slug, path, hash) : null);
    const mounted = mountNovelTimeline(timelineView, book.timeline, href, book.timelineState);
    book.timelineState = mounted.state;
    timeline = { slug, unmount: mounted.unmount };
    // Start the timeline at its top when the reader was scrolled further down.
    if (firstVisit && views.getBoundingClientRect().top < 0) views.scrollIntoView({ block: 'start', behavior: 'instant' });
    return true;
  };

  // Shows whatever the URL names. User navigation pushes the URL first (go); back and
  // forward only call render, so history is never rewritten except to normalise it.
  const render = async () => {
    if (!isConnected() || !bookSelect.options.length) return;
    const serial = ++requestSerial;
    const route = parseNovelRoute(new URL(window.location.href));
    const slug = catalog[route.book] ? route.book : Object.keys(catalog).sort()[0];
    route.book = slug;
    bookSelect.value = slug;
    showBookTitle(slug, catalog[slug].title);
    scope.textContent = catalog[slug].scope ?? '';
    try {
      let book = books.get(slug);
      if (!book) {
        message('正在读取知识库索引…');
        book = await loadBook(slug);
        if (serial !== requestSerial || !isConnected()) return;
        books.set(slug, book);
      }
      if (currentBook !== slug) {
        unmountTimeline();
        currentBook = slug;
        currentPath = '';
        title.textContent = '';
        article.replaceChildren();
        searchResults.replaceChildren();
        searchInput.value = '';
        renderNav(slug, book);
      }
      const shown = route.view === 'timeline'
        ? await showTimeline(slug, book, route, serial)
        : await showReader(slug, book, route, serial);
      if (!shown) return;
      shownView = route.view;
      for (const tab of views.querySelectorAll<HTMLAnchorElement>('a[data-novel-view]')) {
        const view = tab.dataset.novelView as NovelView;
        tab.href = novelRouteHref(new URL(window.location.href), { ...route, view, hash: '' });
        if (view === route.view) tab.setAttribute('aria-current', 'page');
        else tab.removeAttribute('aria-current');
      }
      const normal = novelRouteHref(new URL(window.location.href), route);
      if (normal !== here()) history.replaceState(null, '', normal);
      message('');
    } catch (error) {
      if (serial !== requestSerial) return;
      message(error instanceof Error ? error.message : '知识库加载失败');
    }
  };

  const go = (route: NovelRoute) => {
    const href = novelRouteHref(new URL(window.location.href), route);
    if (href !== here()) history.pushState(null, '', href);
    void render();
  };

  const handleInternalClick = (event: MouseEvent) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest<HTMLAnchorElement>('a[data-doc-path], a[data-doc-hash]');
    if (!anchor || !currentBook) return;
    event.preventDefault();
    go({ book: currentBook, view: 'reader', doc: anchor.dataset.docPath ?? currentPath, hash: anchor.dataset.docHash ?? '' });
  };
  nav.addEventListener('click', handleInternalClick);
  article.addEventListener('click', handleInternalClick);
  timelineView.addEventListener('click', handleInternalClick);

  const search = async (query: string) => {
    const slug = currentBook;
    const book = books.get(slug);
    if (!book || !isConnected()) return;
    searchResults.replaceChildren();
    query = query.trim().toLocaleLowerCase();
    if (!query) return;
    const serial = requestSerial;
    message('正在搜索…');
    try {
      if (!book.searchable) {
        const snapshot = await get(ref(session.database, `${root}/books/${slug}/search`));
        if (serial !== requestSerial || !isConnected()) return;
        const raw = snapshot.val();
        if (!isRecord(raw)) throw new Error('全文检索尚未同步');
        book.searchable = Object.fromEntries(Object.entries(raw).filter(([key, value]) =>
          /^[a-zA-Z0-9_-]+$/.test(key) && typeof value === 'string')) as Record<string, string>;
      }
      const searchable = book.searchable;
      const found = Object.entries(book.manifest.entries)
        .map(([key, entry]) => {
          const content = (searchable[key] ?? '').toLocaleLowerCase();
          const titleMatch = entry.title.toLocaleLowerCase().includes(query);
          const position = content.indexOf(query);
          return { entry, titleMatch, position, excerpt: position < 0 ? '' : (searchable[key] ?? '').slice(Math.max(0, position - 38), position + query.length + 80) };
        })
        .filter((result) => result.titleMatch || result.position >= 0)
        .sort((a, b) => Number(b.titleMatch) - Number(a.titleMatch) || a.position - b.position)
        .slice(0, 60);
      searchResults.replaceChildren();
      const count = document.createElement('p');
      count.textContent = `搜索结果：${found.length}${found.length === 60 ? ' 条（最多显示 60 条）' : ' 条'}`;
      searchResults.append(count);
      for (const result of found) {
        const link = document.createElement('a');
        link.href = readerHref(slug, result.entry.path);
        link.dataset.docPath = result.entry.path;
        link.textContent = result.entry.title;
        if (result.excerpt) {
          const excerpt = document.createElement('small');
          excerpt.textContent = ` · ${result.excerpt}`;
          link.append(excerpt);
        }
        searchResults.append(link);
      }
      message('');
    } catch (error) {
      message(error instanceof Error ? error.message : '搜索失败');
    }
  };
  searchResults.addEventListener('click', handleInternalClick);
  searchForm.addEventListener('submit', (event) => { event.preventDefault(); void search(searchInput.value); });
  bookSelect.addEventListener('change', () => {
    const { view } = parseNovelRoute(new URL(window.location.href));
    go({ book: bookSelect.value, view, doc: '', hash: '' });
  });
  views.addEventListener('click', (event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const tab = (event.target as Element).closest<HTMLAnchorElement>('a[data-novel-view]');
    if (!tab || !currentBook) return;
    event.preventDefault();
    const route = parseNovelRoute(new URL(window.location.href));
    go({ ...route, book: currentBook, view: tab.dataset.novelView as NovelView, hash: '' });
  });
  window.addEventListener('popstate', () => void render());
  signIn.addEventListener('click', () => void session.signInWithGoogle().catch((error) => { authMessage.textContent = String(error); }));
  refresh.addEventListener('click', () => void session.refreshAccess().catch((error) => { authMessage.textContent = String(error); }));
  signOut.addEventListener('click', () => void session.signOut());
  session.subscribe(showStatus);
}
