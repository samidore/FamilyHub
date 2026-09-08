import { NOTEBOOK_PRIORITIES, type NotebookPreset, type NotebookPriority, type NotebookState } from './notebookDomain.ts';
import { orderedNotebookBoards } from './notebookActions.ts';
import { cancelNotebookPresetInstance, deleteNotebookPreset, notebookActivePresetItem, publishNotebookPreset, restoreNotebookItemWithPresetGuard, upsertNotebookPreset } from './notebookPresets.ts';
import { escapeNotebookHtml } from './notebookView.ts';
import type { NotebookRepository } from './notebookRepository.ts';

export interface NotebookPresetUiContext {
  repository: NotebookRepository;
  getState(): NotebookState;
  mutate(label: string, fn: (current: NotebookState) => NotebookState): Promise<boolean>;
  status(message: string, error?: boolean): void;
}

const stamp = () => Date.now();
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

function taskBoardChoices(state: NotebookState, selected: Set<string>) {
  return orderedNotebookBoards(state)
    .filter((board) => board.kind === 'task')
    .map((board) => `<label><input type="checkbox" name="presetBoardIds" value="${escapeNotebookHtml(board.id)}" ${selected.has(board.id) ? 'checked' : ''} />${escapeNotebookHtml(board.title)}</label>`)
    .join('');
}

function renderPresetStrip(state: NotebookState) {
  const presets = Object.values(state.presets).sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
  const chips = presets.length
    ? presets.map((preset) => {
        const active = Boolean(notebookActivePresetItem(state, preset.id));
        return `<div class="notebook-preset-entry">
          <button type="button" class="notebook-preset-chip${active ? ' is-active' : ''}" data-preset-trigger="${escapeNotebookHtml(preset.id)}" aria-pressed="${active ? 'true' : 'false'}" title="${active ? '再次点击取消本次' : '发布任务'}">${escapeNotebookHtml(preset.title)}</button>
          <button type="button" class="notebook-preset-edit" data-preset-edit="${escapeNotebookHtml(preset.id)}" aria-label="编辑 ${escapeNotebookHtml(preset.title)}">✎</button>
        </div>`;
      }).join('')
    : '<p class="notebook-muted notebook-presets__empty">还没有预设。</p>';
  return `<div class="notebook-presets__header"><h2>预设</h2><button type="button" class="notebook-preset-add" data-preset-new aria-label="新增预设">＋</button></div><div class="notebook-preset-list">${chips}</div>`;
}

export function setupNotebookPresetUi(context: NotebookPresetUiContext) {
  const host = document.querySelector<HTMLElement>('#notebook-presets')!;
  const boardsHost = document.querySelector<HTMLElement>('#notebook-boards')!;
  const dialog = document.querySelector<HTMLDialogElement>('#notebook-preset-dialog')!;
  const form = document.querySelector<HTMLFormElement>('#notebook-preset-form')!;
  const dialogTitle = document.querySelector<HTMLElement>('#notebook-preset-dialog-title')!;
  const boardChoices = document.querySelector<HTMLElement>('#notebook-preset-board-choices')!;
  const deleteButton = document.querySelector<HTMLButtonElement>('#notebook-delete-preset')!;
  let editingPresetId: string | null = null;

  const selectedBoards = () => [...form.querySelectorAll<HTMLInputElement>('input[name="presetBoardIds"]')]
    .filter((input) => input.checked)
    .map((input) => input.value);
  const setValue = (name: string, value: string | undefined) => {
    const input = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (input) input.value = value ?? '';
  };
  const render = () => { host.innerHTML = renderPresetStrip(context.getState()); };
  const openEditor = (presetId?: string) => {
    const state = context.getState();
    const preset = presetId ? state.presets[presetId] : undefined;
    editingPresetId = preset?.id ?? null;
    dialogTitle.textContent = preset ? '编辑预设' : '新预设';
    deleteButton.hidden = !preset;
    setValue('title', preset?.title);
    setValue('details', preset?.details);
    (form.elements.namedItem('priority') as HTMLSelectElement).value = preset?.priority ?? 'normal';
    setValue('dueDate', preset?.dueDate);
    setValue('dueTime', preset?.dueTime);
    boardChoices.innerHTML = taskBoardChoices(state, new Set(preset?.boardIds ?? []));
    dialog.showModal();
  };

  boardsHost.addEventListener('click', (event) => {
    const restore = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-restore-item]');
    const itemId = restore?.dataset.restoreItem;
    if (!itemId) return;
    const item = context.getState().items[itemId];
    if (!item?.sourcePresetId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const active = notebookActivePresetItem(context.getState(), item.sourcePresetId);
    if (active && active.id !== itemId) {
      context.status('这个预设已经有一项进行中，不能撤销旧任务完成。', true);
      return;
    }
    void context.mutate('撤销完成', (current) => restoreNotebookItemWithPresetGuard(current, itemId, stamp()));
  }, { capture: true });

  host.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-preset-new]')) { openEditor(); return; }
    const edit = target.closest<HTMLButtonElement>('[data-preset-edit]');
    if (edit?.dataset.presetEdit) { openEditor(edit.dataset.presetEdit); return; }
    const trigger = target.closest<HTMLButtonElement>('[data-preset-trigger]');
    const presetId = trigger?.dataset.presetTrigger;
    if (!presetId) return;
    const active = notebookActivePresetItem(context.getState(), presetId);
    if (active) {
      void context.mutate('取消本次', (current) => cancelNotebookPresetInstance(current, presetId));
      return;
    }
    const itemId = makeId('item');
    void context.mutate('发布预设', (current) => publishNotebookPreset(current, presetId, itemId, stamp()));
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();
    const details = String(data.get('details') ?? '').trim();
    const priority = String(data.get('priority') ?? 'normal') as NotebookPriority;
    const dueDate = String(data.get('dueDate') ?? '').trim();
    const dueTime = String(data.get('dueTime') ?? '').trim();
    const boardIds = selectedBoards();
    if (!title || !NOTEBOOK_PRIORITIES.includes(priority) || boardIds.length === 0) {
      context.status('预设需要标题和至少一个任务 Board', true);
      return;
    }
    if (dueTime && !dueDate) {
      context.status('设置时间前请先设置日期', true);
      return;
    }
    const now = stamp();
    const existing = editingPresetId ? context.getState().presets[editingPresetId] : undefined;
    const preset: NotebookPreset = {
      id: existing?.id ?? makeId('preset'),
      title,
      details,
      priority,
      ...(dueDate ? { dueDate } : {}),
      ...(dueTime ? { dueTime } : {}),
      boardIds,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    void context.mutate(existing ? '保存预设' : '创建预设', (current) => upsertNotebookPreset(current, preset)).then((saved) => {
      if (saved) dialog.close();
    });
  });

  deleteButton.addEventListener('click', () => {
    const presetId = editingPresetId;
    if (!presetId) return;
    const preset = context.getState().presets[presetId];
    if (!preset || !window.confirm(`删除预设“${preset.title}”？已经发布的任务不会删除。`)) return;
    void context.mutate('删除预设', (current) => deleteNotebookPreset(current, presetId)).then((saved) => {
      if (saved) dialog.close();
    });
  });

  dialog.addEventListener('close', () => {
    editingPresetId = null;
    deleteButton.hidden = true;
  });

  return { render };
}
