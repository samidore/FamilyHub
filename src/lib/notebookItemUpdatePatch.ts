import { cloneNotebookState, normalizeNotebookState, type NotebookState } from './notebookDomain.ts';

export const NOTEBOOK_ITEM_UPDATE_PATCH_VERSION = 1 as const;

export interface NotebookItemUpdate {
  itemId: string;
  details?: string;
  platform?: string;
  imdbRating?: number;
  myRating?: number;
  notes?: string;
  review?: string;
}

export interface NotebookItemUpdatePatch {
  patchVersion: typeof NOTEBOOK_ITEM_UPDATE_PATCH_VERSION;
  itemUpdates: NotebookItemUpdate[];
}

export type NotebookItemUpdatePatchValidation =
  | { ok: true; patch: NotebookItemUpdatePatch }
  | { ok: false; error: string };

export interface NotebookItemUpdatePreview {
  updateCount: number;
  items: Array<{ itemId: string; title: string }>;
}

const PATCH_KEYS = new Set(['patchVersion', 'itemUpdates']);
const UPDATE_KEYS = new Set(['itemId', 'details', 'platform', 'imdbRating', 'myRating', 'notes', 'review']);
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const hasOnlyKeys = (value: Record<string, unknown>, allowed: Set<string>) => Object.keys(value).every((key) => allowed.has(key));
const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const hasOwn = (value: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const optionalStringUpdate = (value: unknown, field: string) => {
  if (value === undefined) return { ok: true as const, present: false as const, value: undefined };
  if (typeof value !== 'string') return { ok: false as const, error: `${field} 必须是字符串` };
  return { ok: true as const, present: true as const, value: value.trim() };
};
const optionalRatingUpdate = (value: unknown, field: string) => {
  if (value === undefined) return { ok: true as const, present: false as const, value: undefined };
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10) return { ok: false as const, error: `${field} 必须在 0–10 之间` };
  return { ok: true as const, present: true as const, value };
};

function itemBelongsToMediaBoard(state: NotebookState, itemId: string) {
  return Object.entries(state.memberships).some(([boardId, memberships]) =>
    state.boards[boardId]?.kind === 'media' && Boolean((memberships as Record<string, unknown> | undefined)?.[itemId]));
}

export function validateNotebookItemUpdatePatch(value: unknown, state: NotebookState): NotebookItemUpdatePatchValidation {
  if (!isRecord(value) || !hasOnlyKeys(value, PATCH_KEYS)) return { ok: false, error: 'Item update patch 顶层格式无效或包含不支持的字段' };
  if (value.patchVersion !== NOTEBOOK_ITEM_UPDATE_PATCH_VERSION) return { ok: false, error: `只支持 patchVersion ${NOTEBOOK_ITEM_UPDATE_PATCH_VERSION}` };
  if (!Array.isArray(value.itemUpdates) || value.itemUpdates.length === 0) return { ok: false, error: 'itemUpdates 至少需要一个更新' };

  const seen = new Set<string>();
  const itemUpdates: NotebookItemUpdate[] = [];
  for (let index = 0; index < value.itemUpdates.length; index += 1) {
    const raw: unknown = value.itemUpdates[index];
    const prefix = `itemUpdates[${index}]`;
    if (!isRecord(raw) || !hasOnlyKeys(raw, UPDATE_KEYS)) return { ok: false, error: `${prefix} 格式无效或包含不支持的字段` };
    if (!nonEmptyString(raw.itemId)) return { ok: false, error: `${prefix}.itemId 不能为空` };
    const itemId = raw.itemId.trim();
    if (seen.has(itemId)) return { ok: false, error: `itemId 重复：${itemId}` };
    seen.add(itemId);
    if (!state.items[itemId]) return { ok: false, error: `事项不存在：${itemId}` };

    const updateFields = ['details', 'platform', 'imdbRating', 'myRating', 'notes', 'review'];
    if (!updateFields.some((key) => hasOwn(raw, key))) return { ok: false, error: `${prefix} 至少需要一个可更新字段` };

    const details = optionalStringUpdate(raw.details, `${prefix}.details`); if (!details.ok) return details;
    const platform = optionalStringUpdate(raw.platform, `${prefix}.platform`); if (!platform.ok) return platform;
    const notes = optionalStringUpdate(raw.notes, `${prefix}.notes`); if (!notes.ok) return notes;
    const review = optionalStringUpdate(raw.review, `${prefix}.review`); if (!review.ok) return review;
    const imdbRating = optionalRatingUpdate(raw.imdbRating, `${prefix}.imdbRating`); if (!imdbRating.ok) return imdbRating;
    const myRating = optionalRatingUpdate(raw.myRating, `${prefix}.myRating`); if (!myRating.ok) return myRating;

    const hasMediaField = ['platform', 'imdbRating', 'myRating', 'notes', 'review'].some((key) => hasOwn(raw, key));
    if (hasMediaField && !itemBelongsToMediaBoard(state, itemId)) return { ok: false, error: `${prefix} 含影视字段，但该事项不属于 media Board` };

    itemUpdates.push({
      itemId,
      ...(details.present ? { details: details.value } : {}),
      ...(platform.present ? { platform: platform.value } : {}),
      ...(imdbRating.present ? { imdbRating: imdbRating.value } : {}),
      ...(myRating.present ? { myRating: myRating.value } : {}),
      ...(notes.present ? { notes: notes.value } : {}),
      ...(review.present ? { review: review.value } : {}),
    });
  }
  return { ok: true, patch: { patchVersion: NOTEBOOK_ITEM_UPDATE_PATCH_VERSION, itemUpdates } };
}

export function parseNotebookItemUpdatePatchJson(text: string, state: NotebookState): NotebookItemUpdatePatchValidation {
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { return { ok: false, error: 'Chat patch 不是有效 JSON' }; }
  return validateNotebookItemUpdatePatch(value, state);
}

export function createNotebookItemUpdatePreview(patch: NotebookItemUpdatePatch, state: NotebookState): NotebookItemUpdatePreview {
  return {
    updateCount: patch.itemUpdates.length,
    items: patch.itemUpdates.map((update) => ({ itemId: update.itemId, title: state.items[update.itemId]?.title ?? update.itemId })),
  };
}

export function applyNotebookItemUpdatePatch(state: NotebookState, patchValue: NotebookItemUpdatePatch, now: number): NotebookState {
  const validation = validateNotebookItemUpdatePatch(patchValue, state);
  if (!validation.ok) throw new Error(validation.error);
  if (!Number.isFinite(now) || now <= 0) throw new Error('Apply timestamp 无效');
  const next = cloneNotebookState(state);

  for (const update of validation.patch.itemUpdates) {
    const current = next.items[update.itemId];
    if (!current) throw new Error(`事项不存在：${update.itemId}`);
    const edited = { ...current, updatedAt: now };
    if (update.details !== undefined) edited.details = update.details;
    for (const field of ['platform', 'notes', 'review'] as const) {
      const value = update[field];
      if (value === undefined) continue;
      if (value) edited[field] = value;
      else delete edited[field];
    }
    if (update.imdbRating !== undefined) edited.imdbRating = update.imdbRating;
    if (update.myRating !== undefined) edited.myRating = update.myRating;
    next.items[update.itemId] = edited;
  }
  return normalizeNotebookState(next);
}
