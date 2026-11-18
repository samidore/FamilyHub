import { get, ref } from 'firebase/database';
import {
  FirebaseHouseholdSession,
  hasCompleteFirebaseConfig,
  type FirebaseConfig,
  type HouseholdSessionStatus,
} from './householdSession.ts';

interface BookInfo { title: string; scope?: string; pageCount?: number; }
interface PageEntry { path: string; title: string; section: string; }
interface BookManifest { title: string; scope?: string; entries: Record<string, PageEntry>; }

const sections = [
  ['总目录', 'INDEX.md'],
  ['人物与支线', 'human/02-人物与支线.md'],
  ['世界设定', 'human/03-势力地点与议题.md'],
  ['时间线', 'CHRONOLOGY.md'],
  ['发生／披露对照', 'DUAL_ORDER.md'],
  ['事件索引', 'events/INDEX.md'],
  ['伏笔', 'setups/INDEX.md'],
  ['章节正文', 'source/C1.md'],
] as const;

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing Novel Archive element: ${id}`);
  return node as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function mountNovelArchive(config: Partial<FirebaseConfig>) {
  const authPanel = element<HTMLElement>('novel-auth');
  const authMessage = element<HTMLElement>('novel-auth-message');
  const signIn = element<HTMLButtonElement>('novel-sign-in');
  const refresh = element<HTMLButtonElement>('novel-refresh-access');
  const signOut = element<HTMLButtonElement>('novel-sign-out');
  const appPanel = element<HTMLElement>('novel-app');
  const bookSelect = element<HTMLSelectElement>('novel-book-select');
  const scope = element<HTMLElement>('novel-scope');
  const nav = element<HTMLElement>('novel-nav');
  const title = element<HTMLElement>('novel-page-title');
  const article = element<HTMLElement>('novel-content');
  const live = element<HTMLElement>('novel-live');
  const searchInput = element<HTMLInputElement>('novel-search');
  const searchForm = element<HTMLFormElement>('novel-search-form');
  const searchResults = element<HTMLElement>('novel-results');

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
  let currentBook = '';
  let currentPath = '';
  let catalog: Record<string, BookInfo> = {};
  let manifest: BookManifest | null = null;
  let pathToKey = new Map<string, string>();
  let searchable: Record<string, string> | null = null;

  const isConnected = () => session.getStatus().connection === 'connected';
  const route = (book: string, path: string, hash = '') => {
    const target = new URL(window.location.href);
    target.searchParams.set('book', book);
    target.searchParams.set('doc', path);
    target.hash = hash;
    return `${target.pathname}${target.search}${target.hash}`;
  };

  const clearPrivate = () => {
    requestSerial += 1;
    activeUid = '';
    currentBook = '';
    currentPath = '';
    catalog = {};
    manifest = null;
    pathToKey = new Map();
    searchable = null;
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
      const slugs = Object.keys(catalog).sort();
      for (const slug of slugs) {
        const option = document.createElement('option');
        option.value = slug;
        option.textContent = catalog[slug].title;
        bookSelect.append(option);
      }
      if (!slugs.length) {
        title.textContent = '尚未同步小说';
        article.textContent = '登录已成功。小说 KB 需要从私有 Novel 仓库同步到 FamilyHub 的私有数据库后才能阅读。';
        message('');
        return;
      }
      const requested = new URLSearchParams(window.location.search).get('book') ?? '';
      await openBook(slugs.includes(requested) ? requested : slugs[0]);
    } catch (error) {
      if (serial !== requestSerial) return;
      message(error instanceof Error ? `读取小说目录失败：${error.message}` : '读取小说目录失败');
    }
  };

  const renderNav = () => {
    nav.replaceChildren();
    if (!manifest) return;
    for (const [label, path] of sections) {
      if (!pathToKey.has(path)) continue;
      const link = document.createElement('a');
      link.textContent = label;
      link.href = route(currentBook, path);
      link.dataset.docPath = path;
      nav.append(link);
    }
  };

  const openBook = async (slug: string) => {
    if (!catalog[slug] || !isConnected()) return;
    const serial = ++requestSerial;
    currentBook = slug;
    currentPath = '';
    manifest = null;
    searchable = null;
    pathToKey.clear();
    searchResults.replaceChildren();
    searchInput.value = '';
    bookSelect.value = slug;
    title.textContent = catalog[slug].title;
    scope.textContent = catalog[slug].scope ?? '';
    article.replaceChildren();
    nav.replaceChildren();
    message('正在读取知识库索引…');
    try {
      const snapshot = await get(ref(session.database, `${root}/books/${slug}/manifest`));
      if (serial !== requestSerial || !isConnected()) return;
      const parsed = validateManifest(snapshot.val());
      if (!parsed) throw new Error('小说索引缺失或格式无效');
      manifest = parsed;
      pathToKey = new Map(Object.entries(parsed.entries).map(([key, entry]) => [entry.path, key]));
      renderNav();
      const query = new URLSearchParams(window.location.search);
      const requested = query.get('book') === slug ? query.get('doc') : null;
      await openPage(requested && pathToKey.has(requested) ? requested : 'INDEX.md', false);
    } catch (error) {
      if (serial !== requestSerial) return;
      message(error instanceof Error ? error.message : '知识库加载失败');
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

  const remapLinks = () => {
    for (const anchor of article.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      const href = anchor.getAttribute('href');
      if (!href) continue;
      try {
        const resolved = new URL(href, new URL(currentPath, 'https://kb.invalid/'));
        if (resolved.hostname === 'kb.invalid' && resolved.pathname.endsWith('.md')) {
          const path = decodeURIComponent(resolved.pathname.slice(1));
          if (!pathToKey.has(path)) {
            anchor.removeAttribute('href');
            continue;
          }
          anchor.href = route(currentBook, path, resolved.hash);
          anchor.dataset.docPath = path;
          anchor.dataset.docHash = resolved.hash;
        } else if (href.startsWith('#')) {
          anchor.href = route(currentBook, currentPath, href);
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

  const openPage = async (path: string, push = true, hash = '') => {
    const key = pathToKey.get(path);
    if (!key || !manifest || !isConnected()) return;
    const serial = ++requestSerial;
    const slug = currentBook;
    message('正在读取页面…');
    try {
      const snapshot = await get(ref(session.database, `${root}/books/${slug}/pages/${key}`));
      if (serial !== requestSerial || !isConnected() || slug !== currentBook) return;
      const html = snapshot.val();
      if (typeof html !== 'string') throw new Error('页面未同步');
      currentPath = path;
      title.textContent = manifest.entries[key].title;
      article.innerHTML = html;
      remapLinks();
      if (push) history.pushState(null, '', route(slug, path, hash));
      else if (!new URLSearchParams(window.location.search).has('doc')) history.replaceState(null, '', route(slug, path, hash));
      message('');
      if (hash || window.location.hash) scrollToFragment(hash || window.location.hash);
      else window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) {
      if (serial !== requestSerial) return;
      message(error instanceof Error ? error.message : '页面读取失败');
    }
  };

  const navigate = async (path: string, hash = '') => {
    if (path === currentPath) {
      history.pushState(null, '', route(currentBook, path, hash));
      scrollToFragment(hash);
      return;
    }
    await openPage(path, true, hash);
  };

  const handleInternalClick = (event: MouseEvent) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest<HTMLAnchorElement>('a[data-doc-path], a[data-doc-hash]');
    if (!anchor) return;
    event.preventDefault();
    const path = anchor.dataset.docPath ?? currentPath;
    void navigate(path, anchor.dataset.docHash ?? '');
  };
  nav.addEventListener('click', handleInternalClick);
  article.addEventListener('click', handleInternalClick);

  const search = async (query: string) => {
    if (!manifest || !isConnected() || !currentBook) return;
    searchResults.replaceChildren();
    query = query.trim().toLocaleLowerCase();
    if (!query) return;
    const slug = currentBook;
    const serial = requestSerial;
    message('正在搜索…');
    try {
      if (!searchable) {
        const snapshot = await get(ref(session.database, `${root}/books/${slug}/search`));
        if (serial !== requestSerial || !isConnected()) return;
        const raw = snapshot.val();
        if (!isRecord(raw)) throw new Error('全文检索尚未同步');
        searchable = Object.fromEntries(Object.entries(raw).filter(([key, value]) =>
          /^[a-zA-Z0-9_-]+$/.test(key) && typeof value === 'string')) as Record<string, string>;
      }
      const found = Object.entries(manifest.entries)
        .map(([key, entry]) => {
          const content = (searchable?.[key] ?? '').toLocaleLowerCase();
          const titleMatch = entry.title.toLocaleLowerCase().includes(query);
          const position = content.indexOf(query);
          return { entry, titleMatch, position, excerpt: position < 0 ? '' : (searchable?.[key] ?? '').slice(Math.max(0, position - 38), position + query.length + 80) };
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
        link.href = route(slug, result.entry.path);
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
  bookSelect.addEventListener('change', () => void openBook(bookSelect.value));
  window.addEventListener('popstate', () => {
    const query = new URLSearchParams(window.location.search);
    const book = query.get('book');
    const path = query.get('doc') ?? 'INDEX.md';
    if (book && book !== currentBook && catalog[book]) void openBook(book);
    else if (pathToKey.has(path)) void openPage(path, false, window.location.hash);
  });
  signIn.addEventListener('click', () => void session.signInWithGoogle().catch((error) => { authMessage.textContent = String(error); }));
  refresh.addEventListener('click', () => void session.refreshAccess().catch((error) => { authMessage.textContent = String(error); }));
  signOut.addEventListener('click', () => void session.signOut());
  session.subscribe(showStatus);
}
