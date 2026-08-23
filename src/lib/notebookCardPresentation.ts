import type { NotebookComment, NotebookItem } from './notebookDomain.ts';

export const NOTEBOOK_LEGACY_AUTHOR_NAME = '猫猫';
export type NotebookAuthorIconKind = 'cat' | 'dog' | 'generic';

export function notebookItemAuthorName(item: NotebookItem): string {
  return item.authorName ?? NOTEBOOK_LEGACY_AUTHOR_NAME;
}

export function notebookAuthorIconKind(authorName: string): NotebookAuthorIconKind {
  if (authorName === '猫猫') return 'cat';
  if (authorName === '呜哇') return 'dog';
  return 'generic';
}

export interface NotebookCommentWindow {
  leading: NotebookComment[];
  middle: NotebookComment[];
  trailing: NotebookComment[];
}

export function notebookCommentWindow(comments: NotebookComment[]): NotebookCommentWindow {
  if (comments.length <= 2) return { leading: comments, middle: [], trailing: [] };
  return {
    leading: comments.slice(0, 1),
    middle: comments.slice(1, -1),
    trailing: comments.slice(-1),
  };
}
