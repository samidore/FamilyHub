/** Keeps list controls and bookmarkable query state in sync. */
export type ListControl = HTMLInputElement | HTMLSelectElement;
export type ListControls = Record<string, ListControl>;

const defaultValue = (control: ListControl) => control.dataset.default ?? '';

function syncListUi(controls: ListControls) {
  const shell = Object.values(controls)[0]?.closest('.filter-shell');
  if (!shell?.classList.contains('filter-shell--medical')) return;
  const active = Object.values(controls).some((control) => control.value.trim() !== defaultValue(control));
  const clear = shell.querySelector<HTMLElement>('.clear-button');
  if (clear) { clear.dataset.active = String(active); clear.tabIndex = active ? 0 : -1; }
  const count = [...shell.querySelectorAll<HTMLSelectElement>('.filter-grid select')].filter((control) => control.value !== defaultValue(control)).length;
  const badge = shell.querySelector<HTMLElement>('[data-filter-badge]');
  if (badge) { badge.hidden = count === 0; badge.textContent = String(count); }
}

export function restoreListState(controls: ListControls) {
  const params = new URLSearchParams(window.location.search);
  Object.entries(controls).forEach(([key, control]) => {
    const value = params.get(key);
    if (value === null) return;
    if (control instanceof HTMLInputElement) control.value = value;
    else if ([...control.options].some((option) => option.value === value)) control.value = value;
  });
}

export function writeListState(controls: ListControls) {
  syncListUi(controls);
  const params = new URLSearchParams();
  Object.entries(controls).forEach(([key, control]) => {
    if (control.value && control.value !== defaultValue(control)) params.set(key, control.value);
  });
  const query = params.toString();
  history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}

export function bindListState(controls: ListControls, render: () => void) {
  syncListUi(controls);
  const update = () => { writeListState(controls); render(); };
  Object.values(controls).forEach((control) => {
    control.addEventListener('input', update);
    if (control instanceof HTMLInputElement && control.type === 'search') control.addEventListener('search', update);
  });
}

export function clearListState(controls: ListControls, render: () => void) {
  Object.values(controls).forEach((control) => { control.value = defaultValue(control); });
  writeListState(controls);
  render();
}
