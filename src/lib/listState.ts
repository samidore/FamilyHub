export type ListControl = HTMLInputElement | HTMLSelectElement;
export type ListControls = Record<string, ListControl>;

const defaultValue = (control: ListControl) => control.dataset.default ?? '';

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
  const params = new URLSearchParams();
  Object.entries(controls).forEach(([key, control]) => {
    if (control.value && control.value !== defaultValue(control)) params.set(key, control.value);
  });
  const query = params.toString();
  history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}

export function bindListState(controls: ListControls, render: () => void) {
  Object.values(controls).forEach((control) => control.addEventListener('input', () => { writeListState(controls); render(); }));
}

export function clearListState(controls: ListControls, render: () => void) {
  Object.values(controls).forEach((control) => { control.value = defaultValue(control); });
  writeListState(controls);
  render();
}
