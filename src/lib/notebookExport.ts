import { cloneNotebookState, type NotebookState } from './notebookDomain.ts';

export const NOTEBOOK_EXPORT_SCHEMA_VERSION = 1 as const;

export interface NotebookExport {
  schemaVersion: typeof NOTEBOOK_EXPORT_SCHEMA_VERSION;
  exportedAt: number;
  boards: NotebookState['boards'];
  items: NotebookState['items'];
  memberships: NotebookState['memberships'];
  comments: NotebookState['comments'];
  completionEvents: NotebookState['completionEvents'];
  inbox: NotebookState['inbox'];
  settings: NotebookState['settings'];
}

export function createNotebookExport(state: NotebookState, exportedAt = Date.now()): NotebookExport {
  if (!Number.isFinite(exportedAt) || exportedAt <= 0) throw new Error('Export timestamp 无效');
  const snapshot = cloneNotebookState(state);
  return {
    schemaVersion: NOTEBOOK_EXPORT_SCHEMA_VERSION,
    exportedAt,
    boards: snapshot.boards,
    items: snapshot.items,
    memberships: snapshot.memberships,
    comments: snapshot.comments,
    completionEvents: snapshot.completionEvents,
    inbox: snapshot.inbox,
    settings: snapshot.settings,
  };
}

export function serializeNotebookExport(state: NotebookState, exportedAt = Date.now()) {
  return `${JSON.stringify(createNotebookExport(state, exportedAt), null, 2)}\n`;
}
