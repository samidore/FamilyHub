import { NOTEBOOK_CAT_ICON_DATA_URI } from './notebookAuthorAssets.ts';
import { NOTEBOOK_DOG_ICON_DATA_URI } from './notebookDogAuthorAsset.ts';

export type HouseholdAuthorIconKind = 'cat' | 'dog' | 'generic';

export const escapeHouseholdHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export function householdAuthorIconKind(authorName: string): HouseholdAuthorIconKind {
  if (authorName === '猫猫') return 'cat';
  if (authorName === '呜哇') return 'dog';
  return 'generic';
}

export interface HouseholdCommentWindow<T> {
  leading: T[];
  middle: T[];
  trailing: T[];
}

export function householdCommentWindow<T>(comments: T[]): HouseholdCommentWindow<T> {
  if (comments.length <= 2) return { leading: [...comments], middle: [], trailing: [] };
  return {
    leading: [comments[0]],
    middle: comments.slice(1, -1),
    trailing: [comments[comments.length - 1]],
  };
}

export function householdPersonIconHtml(name: string, accessibleAction = '', compact = false) {
  const e = escapeHouseholdHtml;
  const kind = householdAuthorIconKind(name);
  const sizeClass = compact ? ' household-person-icon--compact' : '';
  const common = `class="household-person-icon household-person-icon--${kind}${sizeClass}" role="img" aria-label="${e(name)}${e(accessibleAction)}" title="${e(name)}" data-author-name="${e(name)}"`;
  if (kind === 'cat') return `<span ${common}><img src="${NOTEBOOK_CAT_ICON_DATA_URI}" alt="" aria-hidden="true" /></span>`;
  if (kind === 'dog') return `<span ${common}><img src="${NOTEBOOK_DOG_ICON_DATA_URI}" alt="" aria-hidden="true" /></span>`;
  return `<span ${common}><svg viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle cx="18" cy="18" r="15"/><circle cx="18" cy="14" r="5"/><path d="M9.5 29c.8-5.2 4-8 8.5-8s7.7 2.8 8.5 8"/></svg></span>`;
}
