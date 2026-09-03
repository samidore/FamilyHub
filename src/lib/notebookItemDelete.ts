import { cloneNotebookState, normalizeNotebookState, type NotebookState } from './notebookDomain.ts';

export function deleteNotebookItem(state: NotebookState, itemId: string): NotebookState {
  const existing = state.items[itemId];
  if (!existing) return state;

  const next = cloneNotebookState(state);
  const affectedBoards: string[] = [];
  delete next.items[itemId];

  for (const [boardId, currentMemberships] of Object.entries(next.memberships)) {
    if (!currentMemberships[itemId]) continue;
    affectedBoards.push(boardId);
    const memberships = { ...currentMemberships };
    delete memberships[itemId];
    if (Object.keys(memberships).length) next.memberships[boardId] = memberships;
    else delete next.memberships[boardId];
  }

  for (const [commentId, comment] of Object.entries(next.comments)) {
    if (comment.itemId === itemId) delete next.comments[commentId];
  }
  for (const [eventId, event] of Object.entries(next.completionEvents)) {
    if (event.itemId === itemId) delete next.completionEvents[eventId];
  }
  for (const [eventId, event] of Object.entries(next.skipEvents)) {
    if (event.itemId === itemId) delete next.skipEvents[eventId];
  }

  if (existing.status === 'active') {
    for (const boardId of affectedBoards) {
      const memberships = next.memberships[boardId];
      if (!memberships) continue;
      const ids = Object.keys(memberships)
        .filter((id) => next.items[id]?.status === 'active' && next.items[id]?.priority === existing.priority)
        .sort((leftId, rightId) => {
          const leftOrder = memberships[leftId]?.order ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = memberships[rightId]?.order ?? Number.MAX_SAFE_INTEGER;
          if (leftOrder !== rightOrder) return leftOrder - rightOrder;
          const left = next.items[leftId];
          const right = next.items[rightId];
          return (right?.createdAt ?? 0) - (left?.createdAt ?? 0) || leftId.localeCompare(rightId);
        });
      ids.forEach((id, order) => { memberships[id] = { order }; });
    }
  }

  return normalizeNotebookState(next);
}
