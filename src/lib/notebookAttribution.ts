import { cloneNotebookState, normalizeMemberDisplayName, type NotebookState } from './notebookDomain.ts';

export function attributeNewNotebookItems(current: NotebookState, next: NotebookState, displayName: string | null): NotebookState {
  const authorName = normalizeMemberDisplayName(displayName);
  if (!authorName) return next;
  const newItemIds = Object.keys(next.items).filter((itemId) => !current.items[itemId] && !next.items[itemId]?.authorName);
  if (!newItemIds.length) return next;
  const attributed = cloneNotebookState(next);
  for (const itemId of newItemIds) {
    const item = attributed.items[itemId];
    if (item) attributed.items[itemId] = { ...item, authorName };
  }
  return attributed;
}
