import { cloneNotebookState, type NotebookState, type NotebookViewFilter } from './notebookDomain.ts';
import { notebookNextGraceExpiry } from './notebookActions.ts';
import { notebookNextLocalMidnight } from './notebookDueSoon.ts';
import { renderNotebookBoards, escapeNotebookHtml } from './notebookView.ts';
import { createNotebookRepository, type CreateNotebookRepositoryOptions } from './notebookRepository.ts';
import { setupNotebookBoardManager } from './notebookBoardManager.ts';
import { setupNotebookItemUi } from './notebookItemUi.ts';
import { setupNotebookPointerReorder } from './notebookPointerReorder.ts';
import type { FirebaseConfig } from './householdRepository.ts';

const get = <T extends Element>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing notebook UI element: ${selector}`);
  return element;
};
const stamp = () => Date.now();
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function mountNotebookUi(config: Partial<FirebaseConfig>, options: CreateNotebookRepositoryOptions = {}) {
  const repository = createNotebookRepository(config, options);
  const authShell = get<HTMLElement>('#notebook-auth-shell');
  const authMessage = get<HTMLElement>('#notebook-auth-message');
  const signIn = get<HTMLButtonElement>('#notebook-sign-in');
  const refresh = get<HTMLButtonElement>('#notebook-refresh-access');
  const signOut = get<HTMLButtonElement>('#notebook-sign-out');
  const app = get<HTMLElement>('#notebook-app');
  const live = get<HTMLElement>('#notebook-live-status');
  const boardsHost = get<HTMLElement>('#notebook-boards');
  const inboxForm = get<HTMLFormElement>('#notebook-inbox-form');
  const inboxInput = get<HTMLInputElement>('#notebook-inbox-input');
  const itemForm = get<HTMLFormElement>('#notebook-item-form');
  const inboxCount = get<HTMLElement>('#notebook-inbox-count');
  const displayNamePanel = get<HTMLElement>('#notebook-display-name-panel');
  let state = repository.getSnapshot();
  let renderTimer: number | undefined;

  const clearRenderTimer = () => {
    if (renderTimer !== undefined) window.clearTimeout(renderTimer);
    renderTimer = undefined;
  };
  const status = (message: string, error = false) => { live.textContent = message; live.dataset.error = error ? 'true' : 'false'; };
  const mutate = async (label: string, fn: (current: NotebookState) => NotebookState) => {
    try { status(`${label}…`); await repository.transaction(fn); status(`${label}完成`); }
    catch (error) { status(error instanceof Error ? error.message : String(error), true); }
  };
  const context = { repository, getState: () => state, mutate, status };
  const manager = setupNotebookBoardManager(context);
  setupNotebookItemUi(context);
  setupNotebookPointerReorder(context);

  const renderApp = () => {
    clearRenderTimer();
    const now = Date.now();
    const displayName = repository.getCurrentMemberDisplayName();
    displayNamePanel.innerHTML = displayName
      ? `<p>评论显示名：<strong>${escapeNotebookHtml(displayName)}</strong></p>`
      : '<p class="notebook-warning">评论显示名字尚未配置。任务、Board 和 Inbox 可正常使用，但新增评论会保持关闭。</p>';
    document.querySelectorAll<HTMLButtonElement>('[data-view-filter]').forEach((button) => {
      const active = button.dataset.viewFilter === state.settings.viewFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const ticketCount = Object.keys(state.inbox).length;
    inboxCount.textContent = ticketCount ? `${ticketCount} 条待整理` : '暂无待整理';
    boardsHost.innerHTML = renderNotebookBoards(state, displayName, now);
    if (manager.dialog.open) manager.render();

    const refreshAt: number[] = [];
    if (state.settings.viewFilter === 'active') {
      const expiry = notebookNextGraceExpiry(state, now);
      if (expiry !== null) refreshAt.push(expiry);
    }
    if (state.settings.viewFilter !== 'completed') refreshAt.push(notebookNextLocalMidnight(now));
    if (refreshAt.length) {
      const next = Math.min(...refreshAt);
      renderTimer = window.setTimeout(renderApp, Math.max(50, next - Date.now() + 50));
    }
  };
  const renderStatus = (current = repository.getStatus()) => {
    const connected = current.connection === 'connected' || current.connection === 'local';
    authShell.hidden = connected;
    app.hidden = !connected;
    authMessage.textContent = current.error ? `${current.label}：${current.error}` : current.label;
    signIn.hidden = current.connection !== 'signed-out' && !(current.connection === 'error' && !current.email);
    refresh.hidden = current.connection !== 'pending' && !(current.connection === 'error' && Boolean(current.email));
    signOut.hidden = !current.email;
    if (connected) renderApp();
    else clearRenderTimer();
  };

  repository.subscribe((next, repoStatus) => { state = next; renderStatus(repoStatus); });
  signIn.addEventListener('click', () => void repository.signInWithGoogle().catch((error) => status(String(error), true)));
  refresh.addEventListener('click', () => void repository.refreshAccess().catch((error) => status(String(error), true)));
  signOut.addEventListener('click', () => void repository.signOut());

  document.querySelectorAll<HTMLButtonElement>('[data-view-filter]').forEach((button) => button.addEventListener('click', () => {
    const viewFilter = button.dataset.viewFilter as NotebookViewFilter;
    void mutate('切换筛选', (current) => ({ ...current, settings: { ...current.settings, viewFilter } }));
  }));
  get<HTMLButtonElement>('#notebook-collapse-all').addEventListener('click', () => void mutate('全部收起', (current) => {
    const next = cloneNotebookState(current);
    const time = stamp();
    for (const [id, board] of Object.entries(next.boards)) next.boards[id] = { ...board, collapsed: true, updatedAt: time };
    return next;
  }));

  itemForm.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing && event.target instanceof HTMLInputElement) event.preventDefault();
  });

  inboxForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = inboxInput.value.trim();
    if (!text) return;
    const ticketId = makeId('ticket');
    const time = stamp();
    void mutate('记下来了', (current) => ({ ...current, inbox: { ...current.inbox, [ticketId]: { id: ticketId, text, createdAt: time, updatedAt: time } } })).then(() => {
      inboxInput.value = '';
      inboxInput.focus();
    });
  });
  window.addEventListener('beforeunload', () => { clearRenderTimer(); repository.dispose(); }, { once: true });
  renderStatus();
}
