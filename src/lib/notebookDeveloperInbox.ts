/** Edits Inbox tickets in place and keeps deleted tickets available for undo. */
import { cloneNotebookState, type NotebookState } from './notebookDomain.ts';
import { escapeNotebookHtml as e } from './notebookView.ts';

interface InboxContext {
  host: HTMLElement;
  getState(): NotebookState;
  mutate(label: string, fn: (current: NotebookState) => NotebookState): Promise<boolean>;
}

export function setupDeveloperInbox({ host, getState, mutate }: InboxContext) {
  const deleted = new Map<string, NotebookState['inbox'][string]>();
  const notices = document.createElement('div');
  notices.className = 'meal-undo-notices'; notices.setAttribute('aria-live', 'polite'); host.after(notices);
  const renderNotices = () => {
    notices.innerHTML = [...deleted.values()].map((ticket) => `<div class="meal-undo-notice"><span>已删除：${e(ticket.text)}</span><button type="button" data-undo-ticket="${e(ticket.id)}">撤销</button></div>`).join('');
  };
  const render = () => {
    const editors = new Map([...host.querySelectorAll<HTMLFormElement>('[data-ticket-editor]')].map((form) => [form.dataset.ticketEditor!, form]));
    const focused = document.activeElement as HTMLElement | null;
    const tickets = Object.values(getState().inbox).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    host.innerHTML = tickets.length ? tickets.map((ticket) => `<article class="developer-inbox-row" data-ticket-id="${e(ticket.id)}"><p>${e(ticket.text)}</p><div class="developer-row-actions"><button type="button" class="quiet-button" data-edit-ticket>编辑</button><button type="button" class="quiet-button" data-delete-ticket>删除</button></div></article>`).join('') : '<p class="notebook-muted">收件箱现在是空的。</p>';
    host.querySelectorAll<HTMLElement>('[data-ticket-id]').forEach((row) => {
      const editor = editors.get(row.dataset.ticketId!);
      if (editor) { row.replaceChildren(editor); if (focused && editor.contains(focused)) focused.focus({ preventScroll: true }); }
    });
  };
  host.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-ticket-id]');
    const id = row?.dataset.ticketId;
    const ticket = id ? getState().inbox[id] : undefined;
    if (!row || !ticket) return;
    if (target.closest('[data-edit-ticket]')) {
      row.innerHTML = `<form data-ticket-editor="${e(ticket.id)}"><label>修改随手记<textarea name="text" required>${e(ticket.text)}</textarea></label><div class="developer-row-actions"><button type="submit">保存</button><button type="button" data-cancel-ticket>取消</button></div></form>`;
      row.querySelector('textarea')?.focus();
    }
    if (target.closest('[data-cancel-ticket]')) { row.querySelector('form')?.remove(); render(); host.querySelector<HTMLButtonElement>(`[data-ticket-id="${CSS.escape(ticket.id)}"] [data-edit-ticket]`)?.focus(); }
    if (target.closest('[data-delete-ticket]')) {
      (target.closest('button') as HTMLButtonElement).disabled = true;
      let removed = ticket;
      void mutate('删除 Inbox', (current) => {
        if (!current.inbox[ticket.id]) throw new Error('Inbox ticket 已不存在');
        removed = current.inbox[ticket.id];
        const next = cloneNotebookState(current); delete next.inbox[ticket.id]; return next;
      }).then((ok) => { if (ok) { deleted.set(ticket.id, removed); renderNotices(); } else render(); });
    }
  });
  host.addEventListener('submit', (event) => {
    const form = (event.target as HTMLElement).closest<HTMLFormElement>('[data-ticket-editor]');
    if (!form) return;
    event.preventDefault();
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    if (submit.disabled) return;
    const text = String(new FormData(form).get('text') ?? '').trim();
    if (!text) return;
    submit.disabled = true;
    const input = form.querySelector<HTMLTextAreaElement>('textarea')!;
    input.readOnly = true;
    void mutate('修改 Inbox', (current) => {
      const ticket = current.inbox[form.dataset.ticketEditor!];
      if (!ticket) throw new Error('Inbox ticket 已不存在');
      return { ...current, inbox: { ...current.inbox, [ticket.id]: { ...ticket, text, updatedAt: Date.now() } } };
    }).then((ok) => { if (ok) { form.remove(); render(); } }).finally(() => { submit.disabled = false; input.readOnly = false; });
  });
  notices.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-undo-ticket]');
    const ticket = button ? deleted.get(button.dataset.undoTicket!) : undefined;
    if (!ticket || !button || button.disabled) return;
    button.disabled = true;
    void mutate('撤销删除', (current) => {
      if (current.inbox[ticket.id]) throw new Error('这条随手记已存在，请刷新后查看。');
      return { ...current, inbox: { ...current.inbox, [ticket.id]: ticket } };
    }).then((ok) => { if (ok) deleted.delete(ticket.id); renderNotices(); });
  });
  return { render };
}
