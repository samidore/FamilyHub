import { cloneNotebookState, type NotebookState } from './notebookDomain.ts';
import { createNotebookRepository, type CreateNotebookRepositoryOptions } from './notebookRepository.ts';
import type { FirebaseConfig } from './householdRepository.ts';
import {
  applyNotebookPatch,
  createNotebookInboxCopyPayload,
  createNotebookPatchPreview,
  parseNotebookPatchJson,
  prepareNotebookPatchItemIds,
  type NotebookPatch,
} from './notebookPatch.ts';
import { serializeNotebookExport } from './notebookExport.ts';

const get = <T extends Element>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing Developer UI element: ${selector}`);
  return element;
};
const escapeHtml = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const stamp = () => Date.now();
const makeItemId = () => `item-${crypto.randomUUID()}`;

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('浏览器不允许自动复制');
}

export function mountNotebookDeveloperUi(config: Partial<FirebaseConfig>, options: CreateNotebookRepositoryOptions = {}) {
  const repository = createNotebookRepository(config, options);
  const authShell = get<HTMLElement>('#developer-auth-shell');
  const authMessage = get<HTMLElement>('#developer-auth-message');
  const signIn = get<HTMLButtonElement>('#developer-sign-in');
  const refresh = get<HTMLButtonElement>('#developer-refresh-access');
  const signOut = get<HTMLButtonElement>('#developer-sign-out');
  const app = get<HTMLElement>('#developer-app');
  const live = get<HTMLElement>('#developer-live-status');
  const inboxList = get<HTMLElement>('#developer-inbox-list');
  const inboxCount = get<HTMLElement>('#developer-inbox-count');
  const copyAll = get<HTMLButtonElement>('#developer-copy-all');
  const patchInput = get<HTMLTextAreaElement>('#developer-patch-input');
  const validateButton = get<HTMLButtonElement>('#developer-validate-patch');
  const previewHost = get<HTMLElement>('#developer-patch-preview');
  const applyButton = get<HTMLButtonElement>('#developer-apply-patch');
  const exportButton = get<HTMLButtonElement>('#developer-export');
  let state = repository.getSnapshot();
  let validatedPatch: NotebookPatch | null = null;

  const status = (message: string, error = false) => {
    live.textContent = message;
    live.dataset.error = error ? 'true' : 'false';
  };
  const mutate = async (label: string, fn: (current: NotebookState) => NotebookState) => {
    try {
      status(`${label}…`);
      await repository.transaction(fn);
      status(`${label}完成`);
      return true;
    } catch (error) {
      status(error instanceof Error ? error.message : String(error), true);
      return false;
    }
  };

  const renderInbox = () => {
    const tickets = Object.values(state.inbox).sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
    inboxCount.textContent = tickets.length ? `${tickets.length} 条待整理` : '暂无待整理';
    copyAll.disabled = tickets.length === 0;
    inboxList.innerHTML = tickets.length
      ? tickets.map((ticket) => `<article class="developer-inbox-row" data-ticket-id="${escapeHtml(ticket.id)}"><p>${escapeHtml(ticket.text)}</p><div class="developer-row-actions"><button type="button" class="quiet-button" data-edit-ticket>编辑</button><button type="button" class="quiet-button" data-delete-ticket>删除</button></div></article>`).join('')
      : '<p class="notebook-muted">Inbox 现在是空的。</p>';
  };

  const clearPatchPreview = () => {
    validatedPatch = null;
    previewHost.hidden = true;
    previewHost.innerHTML = '';
    applyButton.hidden = true;
  };

  const validateAndRenderPatch = () => {
    const result = parseNotebookPatchJson(patchInput.value.trim(), state);
    if (!result.ok) {
      clearPatchPreview();
      status(result.error, true);
      return false;
    }
    validatedPatch = result.patch;
    const preview = createNotebookPatchPreview(result.patch, state);
    previewHost.innerHTML = `<h3>准备转换 ${preview.ticketCount} 条 Inbox</h3><ul>${preview.boardCounts.map((entry) => `<li><strong>${escapeHtml(entry.title)}</strong><span>${entry.count}</span></li>`).join('')}</ul><p>${preview.ticketCount} 条 Inbox 将被删除，并创建 ${preview.ticketCount} 个新事项。</p>`;
    previewHost.hidden = false;
    applyButton.textContent = `Apply ${preview.ticketCount} items`;
    applyButton.hidden = false;
    status('Patch 验证通过');
    return true;
  };

  const renderStatus = (current = repository.getStatus()) => {
    const connected = current.connection === 'connected' || current.connection === 'local';
    authShell.hidden = connected;
    app.hidden = !connected;
    authMessage.textContent = current.error ? `${current.label}：${current.error}` : current.label;
    signIn.hidden = current.connection !== 'signed-out' && !(current.connection === 'error' && !current.email);
    refresh.hidden = current.connection !== 'pending' && !(current.connection === 'error' && Boolean(current.email));
    signOut.hidden = !current.email;
    if (connected) {
      renderInbox();
      if (validatedPatch) validateAndRenderPatch();
    }
  };

  repository.subscribe((next, repoStatus) => {
    state = next;
    renderStatus(repoStatus);
  });
  signIn.addEventListener('click', () => void repository.signInWithGoogle().catch((error) => status(String(error), true)));
  refresh.addEventListener('click', () => void repository.refreshAccess().catch((error) => status(String(error), true)));
  signOut.addEventListener('click', () => void repository.signOut());

  inboxList.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-ticket-id]');
    const ticketId = row?.dataset.ticketId;
    if (!ticketId) return;
    const ticket = state.inbox[ticketId];
    if (!ticket) return;
    if (target.closest('[data-edit-ticket]')) {
      const text = window.prompt('修改 Inbox', ticket.text)?.trim();
      if (!text || text === ticket.text) return;
      void mutate('修改 Inbox', (current) => {
        const existing = current.inbox[ticketId];
        if (!existing) throw new Error('Inbox ticket 已不存在');
        return { ...current, inbox: { ...current.inbox, [ticketId]: { ...existing, text, updatedAt: stamp() } } };
      });
      return;
    }
    if (target.closest('[data-delete-ticket]') && window.confirm('删除这条 Inbox？')) {
      void mutate('删除 Inbox', (current) => {
        if (!current.inbox[ticketId]) throw new Error('Inbox ticket 已不存在');
        const next = cloneNotebookState(current);
        delete next.inbox[ticketId];
        return next;
      });
    }
  });

  copyAll.addEventListener('click', () => {
    const text = `${JSON.stringify(createNotebookInboxCopyPayload(state), null, 2)}\n`;
    void copyText(text).then(() => status('Inbox payload 已复制')).catch((error) => status(error instanceof Error ? error.message : String(error), true));
  });

  patchInput.addEventListener('input', clearPatchPreview);
  validateButton.addEventListener('click', validateAndRenderPatch);
  applyButton.addEventListener('click', () => {
    const latest = parseNotebookPatchJson(patchInput.value.trim(), state);
    if (!latest.ok) { clearPatchPreview(); status(latest.error, true); return; }
    const patch = latest.patch;
    const itemIds = prepareNotebookPatchItemIds(patch, makeItemId);
    const now = stamp();
    void mutate('应用 Chat patch', (current) => applyNotebookPatch(current, patch, itemIds, now)).then((ok) => {
      if (!ok) return;
      patchInput.value = '';
      clearPatchPreview();
    });
  });

  exportButton.addEventListener('click', () => {
    try {
      const blob = new Blob([serializeNotebookExport(state)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sami-notebook.json';
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      status('数据库导出完成');
    } catch (error) {
      status(error instanceof Error ? error.message : String(error), true);
    }
  });

  window.addEventListener('beforeunload', () => repository.dispose(), { once: true });
  renderStatus();
}
