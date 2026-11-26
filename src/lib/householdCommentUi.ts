/** Retains open comment editors, drafts, and focus during household updates. */
export function updateHouseholdCommentHtml(host: HTMLElement, html: string, formSelector: string) {
  const editors = new Map<string, { form: HTMLElement; open: boolean }>();
  const key = (form: HTMLElement) => JSON.stringify([form.dataset, form.closest<HTMLElement>('[data-board-id]')?.dataset.boardId]);
  host.querySelectorAll<HTMLElement>(formSelector).forEach((form) => {
    editors.set(key(form), { form, open: form.closest<HTMLDetailsElement>('details')!.open });
  });
  const focused = document.activeElement as HTMLElement | null;
  const hadFocus = focused !== null && host.contains(focused);
  host.innerHTML = html;
  host.querySelectorAll<HTMLElement>(formSelector).forEach((form) => {
    const previous = editors.get(key(form));
    if (previous && previous.form.querySelector('textarea')!.disabled === form.querySelector('textarea')!.disabled) {
      form.closest<HTMLDetailsElement>('details')!.open = previous.open;
      form.replaceWith(previous.form);
    }
  });
  if (hadFocus && focused?.isConnected) focused.focus({ preventScroll: true });
}
