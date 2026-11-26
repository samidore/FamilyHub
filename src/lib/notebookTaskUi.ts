/** Preserves task disclosures, menu focus, pending feedback, and reorder motion. */
export function setupNotebookTaskUi(host: HTMLElement) {
  const expanded = new Set<string>();
  const pending = new Set<string>();
  let openKey = '';
  let focusAction = '';
  let focusedEditor: HTMLElement | null = null;
  let positions = new Map<string, number>();
  const cards = () => [...host.querySelectorAll<HTMLElement>('.notebook-task')];
  const key = (card: HTMLElement) => `${card.dataset.boardId}/${card.dataset.itemId}`;
  const apply = () => cards().forEach((card) => {
    const isExpanded = expanded.has(card.dataset.itemId!);
    card.querySelector('[data-task-expand]')?.setAttribute('aria-expanded', String(isExpanded));
    card.querySelector<HTMLElement>('.task-body')!.hidden = !isExpanded;
    const open = key(card) === openKey;
    card.dataset.menuOpen = String(open);
    card.querySelector('[data-task-menu-toggle]')?.setAttribute('aria-expanded', String(open));
    const menu = card.querySelector<HTMLElement>('.task-menu');
    if (menu) menu.inert = !open;
    const busy = pending.has(card.dataset.itemId!);
    card.setAttribute('aria-busy', String(busy));
    card.querySelectorAll<HTMLButtonElement>('[data-complete-item], [data-task-menu-toggle]').forEach((button) => { button.disabled = busy; });
  });
  const close = (focus = true) => {
    const card = cards().find((entry) => key(entry) === openKey);
    openKey = ''; apply();
    if (focus) card?.querySelector<HTMLButtonElement>('[data-task-menu-toggle]')?.focus();
  };
  host.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const card = target.closest<HTMLElement>('.notebook-task');
    if (!card) return;
    if (target.closest('[data-task-expand]')) {
      const id = card.dataset.itemId!;
      if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
      apply();
    }
    if (target.closest('[data-task-menu-toggle]')) {
      if (openKey === key(card)) close();
      else { openKey = key(card); apply(); card.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus(); }
    }
    if (target.closest('[data-edit-item], [data-task-priority]')) close();
  });
  document.addEventListener('click', (event) => { if (openKey && !(event.target as HTMLElement).closest('.task-menu, [data-task-menu-toggle]')) close(); });
  host.addEventListener('keydown', (event) => {
    if (!openKey) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('[data-menu-open="true"] [role="menuitem"]:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault(); buttons[next]?.focus();
  });
  return {
    beforeRender() {
      positions = new Map(cards().map((card) => [key(card), card.getBoundingClientRect().top]));
      const focused = document.activeElement as HTMLElement | null;
      focusedEditor = focused && host.contains(focused) ? focused : null;
      focusAction = focused?.dataset.moveItem ?? '';
    },
    afterRender() {
      apply();
      if (focusedEditor?.isConnected) focusedEditor.focus({ preventScroll: true });
      if (focusAction) host.querySelector<HTMLButtonElement>(`[data-menu-open="true"] [data-move-item="${focusAction}"]`)?.focus();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      cards().forEach((card) => {
        const before = positions.get(key(card));
        const delta = before === undefined ? 0 : before - card.getBoundingClientRect().top;
        if (delta) card.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
      });
    },
    setPending(id: string, busy: boolean) { if (busy) pending.add(id); else pending.delete(id); apply(); },
  };
}
