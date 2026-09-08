import { addNotebookItem } from './notebookActions.ts';
import { cloneNotebookState, normalizeNotebookState, type NotebookItem, type NotebookPreset, type NotebookState } from './notebookDomain.ts';
import { deleteNotebookItem } from './notebookItemDelete.ts';

export function notebookActivePresetItem(state: NotebookState, presetId: string): NotebookItem | null {
  return Object.values(state.items)
    .filter((item) => item.status === 'active' && item.sourcePresetId === presetId)
    .sort((left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id))[0] ?? null;
}

export function upsertNotebookPreset(state: NotebookState, preset: NotebookPreset): NotebookState {
  const validBoardIds = [...new Set(preset.boardIds)].filter((boardId) => state.boards[boardId]?.kind === 'task');
  if (!preset.title.trim() || validBoardIds.length === 0 || (preset.dueTime && !preset.dueDate)) return state;
  const next = cloneNotebookState(state);
  const existing = next.presets[preset.id];
  next.presets[preset.id] = {
    ...preset,
    title: preset.title.trim(),
    details: preset.details.trim(),
    boardIds: validBoardIds,
    createdAt: existing?.createdAt ?? preset.createdAt,
  };
  return normalizeNotebookState(next);
}

export function deleteNotebookPreset(state: NotebookState, presetId: string): NotebookState {
  if (!state.presets[presetId]) return state;
  const next = cloneNotebookState(state);
  delete next.presets[presetId];
  return normalizeNotebookState(next);
}

export function publishNotebookPreset(state: NotebookState, presetId: string, itemId: string, now: number): NotebookState {
  const preset = state.presets[presetId];
  if (!preset || state.items[itemId] || notebookActivePresetItem(state, presetId)) return state;
  const boardIds = preset.boardIds.filter((boardId) => state.boards[boardId]?.kind === 'task');
  if (boardIds.length === 0) return state;
  const item: NotebookItem = {
    id: itemId,
    title: preset.title,
    details: preset.details,
    priority: preset.priority,
    status: 'active',
    ...(preset.dueDate ? { dueDate: preset.dueDate } : {}),
    ...(preset.dueTime ? { dueTime: preset.dueTime } : {}),
    sourcePresetId: preset.id,
    createdAt: now,
    updatedAt: now,
  };
  return addNotebookItem(state, item, boardIds);
}

export function cancelNotebookPresetInstance(state: NotebookState, presetId: string): NotebookState {
  const activeIds = Object.values(state.items)
    .filter((item) => item.status === 'active' && item.sourcePresetId === presetId)
    .map((item) => item.id);
  if (activeIds.length === 0) return state;
  return activeIds.reduce((current, itemId) => deleteNotebookItem(current, itemId), state);
}
