import type { NotebookComment, NotebookItem } from './notebookDomain.ts';
import { householdAuthorIconKind, householdCommentWindow, type HouseholdAuthorIconKind } from './householdPeople.ts';

export const NOTEBOOK_LEGACY_AUTHOR_NAME = '猫猫';
export const NOTEBOOK_LEGACY_COMPLETER_NAME = '呜哇';
export type NotebookAuthorIconKind = HouseholdAuthorIconKind;

export function notebookItemAuthorName(item: Pick<NotebookItem, 'authorName'>): string {
  return item.authorName?.trim() || NOTEBOOK_LEGACY_AUTHOR_NAME;
}

export function notebookCompletedByName(record: { completedByName?: string }): string {
  return record.completedByName?.trim() || NOTEBOOK_LEGACY_COMPLETER_NAME;
}

export function notebookAuthorIconKind(authorName: string): NotebookAuthorIconKind {
  return householdAuthorIconKind(authorName);
}

export interface NotebookCommentWindow {
  leading: NotebookComment[];
  middle: NotebookComment[];
  trailing: NotebookComment[];
}

export function notebookCommentWindow(comments: NotebookComment[]): NotebookCommentWindow {
  return householdCommentWindow(comments);
}
