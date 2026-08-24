import { cloneNotebookState, normalizeMemberDisplayName, type NotebookState } from './notebookDomain.ts';

export function attributeNewNotebookItems(current: NotebookState, next: NotebookState, displayName: string | null): NotebookState {
  const memberName = normalizeMemberDisplayName(displayName);
  if (!memberName) return next;

  const newItemIds = Object.keys(next.items).filter((itemId) => !current.items[itemId] && !next.items[itemId]?.authorName);
  const newlyCompletedItemIds = Object.keys(next.items).filter((itemId) => {
    const before = current.items[itemId];
    const after = next.items[itemId];
    return Boolean(after?.status === 'completed' && before?.status !== 'completed' && !after.completedByName);
  });
  const newCompletionEventIds = Object.keys(next.completionEvents).filter((eventId) => !current.completionEvents[eventId] && !next.completionEvents[eventId]?.completedByName);

  if (!newItemIds.length && !newlyCompletedItemIds.length && !newCompletionEventIds.length) return next;
  const attributed = cloneNotebookState(next);

  for (const itemId of newItemIds) {
    const item = attributed.items[itemId];
    if (item) attributed.items[itemId] = { ...item, authorName: memberName };
  }
  for (const itemId of newlyCompletedItemIds) {
    const item = attributed.items[itemId];
    if (item) attributed.items[itemId] = { ...item, completedByName: memberName };
  }
  for (const eventId of newCompletionEventIds) {
    const event = attributed.completionEvents[eventId];
    if (event) attributed.completionEvents[eventId] = { ...event, completedByName: memberName };
  }
  return attributed;
}
