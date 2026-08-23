import {
  NOTEBOOK_PRIORITIES,
  cloneNotebookState,
  isSupportedRecurrence,
  normalizeNotebookState,
  type NotebookBoardKind,
  type NotebookItem,
  type NotebookPriority,
  type NotebookRecurrence,
  type NotebookState,
} from './notebookDomain.ts';

export const NOTEBOOK_PATCH_VERSION = 1 as const;
export const NOTEBOOK_INBOX_PROTOCOL_VERSION = 1 as const;

export interface NotebookInboxCopyPayload {
  protocolVersion: typeof NOTEBOOK_INBOX_PROTOCOL_VERSION;
  boards: Array<{ id: string; title: string; kind: NotebookBoardKind }>;
  inbox: Array<{ id: string; text: string; createdAt: number; updatedAt: number }>;
}

export interface NotebookPatchItem {
  ticketId: string;
  title: string;
  details: string;
  boardIds: string[];
  priority: NotebookPriority;
  dueDate?: string;
  dueTime?: string;
  recurrence?: NotebookRecurrence;
  platform?: string;
  imdbRating?: number;
  myRating?: number;
  notes?: string;
  review?: string;
}

export interface NotebookPatch {
  patchVersion: typeof NOTEBOOK_PATCH_VERSION;
  items: NotebookPatchItem[];
}

export type NotebookPatchValidation =
  | { ok: true; patch: NotebookPatch }
  | { ok: false; error: string };

export interface NotebookPatchPreview {
  ticketCount: number;
  boardCounts: Array<{ boardId: string; title: string; count: number }>;
}

const PATCH_KEYS = new Set(['patchVersion', 'items']);
const ITEM_KEYS = new Set([
  'ticketId', 'title', 'details', 'boardIds', 'priority', 'dueDate', 'dueTime', 'recurrence',
  'platform', 'imdbRating', 'myRating', 'notes', 'review',
]);
const RECURRENCE_KEYS = new Set(['unit', 'interval']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const prioritySet = new Set<string>(NOTEBOOK_PRIORITIES);

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const hasOnlyKeys = (value: Record<string, unknown>, allowed: Set<string>) => Object.keys(value).every((key) => allowed.has(key));
const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const optionalString = (value: unknown, field: string) => {
  if (value === undefined) return { ok: true as const, value: undefined };
  if (typeof value !== 'string') return { ok: false as const, error: `${field} 必须是字符串` };
  const trimmed = value.trim();
  return { ok: true as const, value: trimmed || undefined };
};
const optionalRating = (value: unknown, field: string) => {
  if (value === undefined) return { ok: true as const, value: undefined };
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10) return { ok: false as const, error: `${field} 必须在 0–10 之间` };
  return { ok: true as const, value };
};
const isCalendarDate = (value: string) => {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

function orderedBoards(state: NotebookState) {
  return Object.values(state.boards).sort((left, right) => left.order - right.order || left.createdAt - right.createdAt || left.id.localeCompare(right.id));
}

function orderedInbox(state: NotebookState) {
  return Object.values(state.inbox).sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
}

export function createNotebookInboxCopyPayload(state: NotebookState): NotebookInboxCopyPayload {
  return {
    protocolVersion: NOTEBOOK_INBOX_PROTOCOL_VERSION,
    boards: orderedBoards(state).map(({ id, title, kind }) => ({ id, title, kind })),
    inbox: orderedInbox(state).map(({ id, text, createdAt, updatedAt }) => ({ id, text, createdAt, updatedAt })),
  };
}

export function createNotebookInboxChatPrompt(state: NotebookState, today?: string): string {
  const boards = orderedBoards(state);
  const inbox = orderedInbox(state);
  const boardLines = boards.length
    ? boards.map((board) => `- ${board.title} — ${board.id} — kind=${board.kind}`).join('\n')
    : '- 无可用 Board';
  const inboxLines = inbox.length
    ? inbox.map((ticket) => `- ${ticket.id}\n  ${ticket.text}`).join('\n')
    : '- Inbox 为空';
  const dateLine = today ? `\n当前日期（用户浏览器本地日期）：${today}\n` : '\n';
  return [
    '请整理下面 Sami的小本本 Inbox，并生成可直接粘回 Developer 页的 Chat patch。',
    dateLine.trimEnd(),
    '通用规则：',
    '- 每个 Inbox ticket 转成一个正式事项；ticketId 必须原样保留。',
    '- 只能使用下面列出的现有 board ID；不要创建、重命名或猜测 Board。',
    '- 根据原文选择 priority：urgent | high | normal | low。',
    '- 不确定的信息不要编造；没有可靠依据的可选字段直接省略。',
    '- dueDate 只有在原文能可靠确定日期时填写，格式 YYYY-MM-DD；dueTime 只有在同时有 dueDate 时填写，格式 HH:MM。',
    '- recurrence 只允许：每 N 天 {unit:"day",interval:N}、每周 {unit:"week",interval:1}、每 N 月 {unit:"month",interval:N}、每年 {unit:"year",interval:1}。',
    '',
    'Media 规则：',
    '- 任何归入 kind="media" Board 的事项，都必须先联网查找并核实对应作品的 IMDb 页面。',
    '- 如果作品可以唯一确认且 IMDb 当前评分可可靠查到，必须把当前 IMDb 评分填入 imdbRating（0–10）；不得凭记忆、猜测或其他网站评分代替。',
    '- 如果作品重名、无法唯一确认，或无法可靠查到 IMDb 评分，则省略 imdbRating，并在 notes 中简短说明需要确认什么。',
    '- myRating 只在 Inbox 原文明示用户个人评分时填写；不得从 IMDb 或其他评分推断。',
    '- platform / notes / review 也不要无依据编造；review 只记录原文明确表达的用户评价。',
    '',
    '返回要求：',
    '- 只返回纯 JSON；不要 Markdown 代码块，不要解释，不要在 JSON 前后加文字。',
    '- patchVersion 必须为 1。',
    '- details 必须存在；没有补充内容时使用空字符串。',
    '- 可选字段没有值时直接省略。',
    '',
    '返回 JSON 结构示例：',
    '{',
    '  "patchVersion": 1,',
    '  "items": [',
    '    {',
    '      "ticketId": "TICKET_ID",',
    '      "title": "标题",',
    '      "details": "",',
    '      "boardIds": ["BOARD_ID"],',
    '      "priority": "normal"',
    '    }',
    '  ]',
    '}',
    '',
    '可选字段：dueDate, dueTime, recurrence, platform, imdbRating, myRating, notes, review。',
    '',
    '可用 Boards：',
    boardLines,
    '',
    'Inbox：',
    inboxLines,
  ].filter((line, index, lines) => !(line === '' && lines[index - 1] === '')).join('\n').trim() + '\n';
}

export function validateNotebookPatch(value: unknown, state: NotebookState): NotebookPatchValidation {
  if (!isRecord(value) || !hasOnlyKeys(value, PATCH_KEYS)) return { ok: false, error: 'Patch 顶层格式无效或包含不支持的字段' };
  if (value.patchVersion !== NOTEBOOK_PATCH_VERSION) return { ok: false, error: `只支持 patchVersion ${NOTEBOOK_PATCH_VERSION}` };
  if (!Array.isArray(value.items) || value.items.length === 0) return { ok: false, error: 'Patch 至少需要一个 item' };

  const seenTickets = new Set<string>();
  const normalizedItems: NotebookPatchItem[] = [];
  for (let index = 0; index < value.items.length; index += 1) {
    const raw: unknown = value.items[index];
    const prefix = `items[${index}]`;
    if (!isRecord(raw) || !hasOnlyKeys(raw, ITEM_KEYS)) return { ok: false, error: `${prefix} 格式无效或包含不支持的字段` };
    if (!nonEmptyString(raw.ticketId)) return { ok: false, error: `${prefix}.ticketId 不能为空` };
    const ticketId = raw.ticketId.trim();
    if (seenTickets.has(ticketId)) return { ok: false, error: `ticketId 重复：${ticketId}` };
    seenTickets.add(ticketId);
    if (!state.inbox[ticketId]) return { ok: false, error: `Inbox ticket 不存在：${ticketId}` };

    if (!nonEmptyString(raw.title)) return { ok: false, error: `${prefix}.title 不能为空` };
    if (typeof raw.details !== 'string') return { ok: false, error: `${prefix}.details 必须是字符串` };
    if (!Array.isArray(raw.boardIds) || raw.boardIds.length === 0 || raw.boardIds.some((boardId) => !nonEmptyString(boardId))) {
      return { ok: false, error: `${prefix}.boardIds 至少需要一个有效 Board ID` };
    }
    const boardIds = raw.boardIds.map((boardId) => (boardId as string).trim());
    if (new Set(boardIds).size !== boardIds.length) return { ok: false, error: `${prefix}.boardIds 不能重复` };
    for (const boardId of boardIds) if (!state.boards[boardId]) return { ok: false, error: `Board 不存在：${boardId}` };

    if (typeof raw.priority !== 'string' || !prioritySet.has(raw.priority)) return { ok: false, error: `${prefix}.priority 无效` };
    const priority = raw.priority as NotebookPriority;

    let dueDate: string | undefined;
    if (raw.dueDate !== undefined) {
      if (typeof raw.dueDate !== 'string' || !isCalendarDate(raw.dueDate)) return { ok: false, error: `${prefix}.dueDate 必须是有效 YYYY-MM-DD` };
      dueDate = raw.dueDate;
    }
    let dueTime: string | undefined;
    if (raw.dueTime !== undefined) {
      if (typeof raw.dueTime !== 'string' || !TIME_PATTERN.test(raw.dueTime)) return { ok: false, error: `${prefix}.dueTime 必须是有效 HH:MM` };
      if (!dueDate) return { ok: false, error: `${prefix}.dueTime 需要同时提供 dueDate` };
      dueTime = raw.dueTime;
    }

    let recurrence: NotebookRecurrence | undefined;
    if (raw.recurrence !== undefined) {
      if (!isRecord(raw.recurrence) || !hasOnlyKeys(raw.recurrence, RECURRENCE_KEYS) || !isSupportedRecurrence(raw.recurrence)) {
        return { ok: false, error: `${prefix}.recurrence 不属于当前支持的重复规则` };
      }
      recurrence = { ...raw.recurrence } as NotebookRecurrence;
    }

    const platform = optionalString(raw.platform, `${prefix}.platform`); if (!platform.ok) return platform;
    const notes = optionalString(raw.notes, `${prefix}.notes`); if (!notes.ok) return notes;
    const review = optionalString(raw.review, `${prefix}.review`); if (!review.ok) return review;
    const imdbRating = optionalRating(raw.imdbRating, `${prefix}.imdbRating`); if (!imdbRating.ok) return imdbRating;
    const myRating = optionalRating(raw.myRating, `${prefix}.myRating`); if (!myRating.ok) return myRating;
    const hasMediaField = raw.platform !== undefined || raw.imdbRating !== undefined || raw.myRating !== undefined || raw.notes !== undefined || raw.review !== undefined;
    if (hasMediaField && !boardIds.some((boardId) => state.boards[boardId]?.kind === 'media')) {
      return { ok: false, error: `${prefix} 含影视字段，但没有目标 media Board` };
    }

    normalizedItems.push({
      ticketId,
      title: raw.title.trim(),
      details: raw.details.trim(),
      boardIds,
      priority,
      ...(dueDate ? { dueDate } : {}),
      ...(dueTime ? { dueTime } : {}),
      ...(recurrence ? { recurrence } : {}),
      ...(platform.value ? { platform: platform.value } : {}),
      ...(imdbRating.value !== undefined ? { imdbRating: imdbRating.value } : {}),
      ...(myRating.value !== undefined ? { myRating: myRating.value } : {}),
      ...(notes.value ? { notes: notes.value } : {}),
      ...(review.value ? { review: review.value } : {}),
    });
  }
  return { ok: true, patch: { patchVersion: NOTEBOOK_PATCH_VERSION, items: normalizedItems } };
}

export function parseNotebookPatchJson(text: string, state: NotebookState): NotebookPatchValidation {
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { return { ok: false, error: 'Chat patch 不是有效 JSON' }; }
  return validateNotebookPatch(value, state);
}

export function createNotebookPatchPreview(patch: NotebookPatch, state: NotebookState): NotebookPatchPreview {
  const counts = new Map<string, number>();
  for (const item of patch.items) for (const boardId of item.boardIds) counts.set(boardId, (counts.get(boardId) ?? 0) + 1);
  return {
    ticketCount: patch.items.length,
    boardCounts: orderedBoards(state).filter((board) => counts.has(board.id)).map((board) => ({ boardId: board.id, title: board.title, count: counts.get(board.id)! })),
  };
}

export function prepareNotebookPatchItemIds(patch: NotebookPatch, makeId: () => string): Record<string, string> {
  const result: Record<string, string> = {};
  const ids = new Set<string>();
  for (const item of patch.items) {
    const id = makeId();
    if (!nonEmptyString(id) || ids.has(id)) throw new Error('生成的 item ID 无效或重复');
    ids.add(id);
    result[item.ticketId] = id;
  }
  return result;
}

function activeSectionIds(state: NotebookState, boardId: string, priority: NotebookPriority) {
  const memberships = state.memberships[boardId] ?? {};
  return Object.keys(memberships)
    .filter((itemId) => state.items[itemId]?.status === 'active' && state.items[itemId]?.priority === priority)
    .sort((leftId, rightId) => {
      const leftOrder = memberships[leftId]?.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = memberships[rightId]?.order ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      const left = state.items[leftId];
      const right = state.items[rightId];
      return (right?.createdAt ?? 0) - (left?.createdAt ?? 0) || leftId.localeCompare(rightId);
    });
}

export function applyNotebookPatch(state: NotebookState, patchValue: NotebookPatch, itemIds: Record<string, string>, now: number): NotebookState {
  const validation = validateNotebookPatch(patchValue, state);
  if (!validation.ok) throw new Error(validation.error);
  const patch = validation.patch;
  if (!Number.isFinite(now) || now <= 0) throw new Error('Apply timestamp 无效');

  const generatedIds = patch.items.map((item) => itemIds[item.ticketId]);
  if (generatedIds.some((id) => !nonEmptyString(id)) || new Set(generatedIds).size !== generatedIds.length) throw new Error('Prepared item IDs 缺失或重复');
  for (const id of generatedIds) if (state.items[id]) throw new Error(`Prepared item ID 已存在：${id}`);

  const next = cloneNotebookState(state);
  const groups = new Map<string, { boardId: string; priority: NotebookPriority; itemIds: string[] }>();
  for (const patchItem of patch.items) {
    const id = itemIds[patchItem.ticketId];
    const item: NotebookItem = {
      id,
      title: patchItem.title,
      details: patchItem.details,
      priority: patchItem.priority,
      status: 'active',
      ...(patchItem.dueDate ? { dueDate: patchItem.dueDate } : {}),
      ...(patchItem.dueTime ? { dueTime: patchItem.dueTime } : {}),
      ...(patchItem.recurrence ? { recurrence: patchItem.recurrence } : {}),
      ...(patchItem.platform ? { platform: patchItem.platform } : {}),
      ...(patchItem.imdbRating !== undefined ? { imdbRating: patchItem.imdbRating } : {}),
      ...(patchItem.myRating !== undefined ? { myRating: patchItem.myRating } : {}),
      ...(patchItem.notes ? { notes: patchItem.notes } : {}),
      ...(patchItem.review ? { review: patchItem.review } : {}),
      createdAt: now,
      updatedAt: now,
    };
    next.items[id] = item;
    for (const boardId of patchItem.boardIds) {
      next.memberships[boardId] = { ...(next.memberships[boardId] ?? {}), [id]: { order: 0 } };
      const key = `${boardId}\u0000${patchItem.priority}`;
      const group = groups.get(key) ?? { boardId, priority: patchItem.priority, itemIds: [] };
      group.itemIds.push(id);
      groups.set(key, group);
    }
  }

  for (const { boardId, priority, itemIds: patchIds } of groups.values()) {
    const existingIds = activeSectionIds(state, boardId, priority);
    const memberships = { ...(next.memberships[boardId] ?? {}) };
    [...patchIds, ...existingIds].forEach((itemId, order) => { memberships[itemId] = { order }; });
    next.memberships[boardId] = memberships;
  }
  for (const patchItem of patch.items) delete next.inbox[patchItem.ticketId];
  return normalizeNotebookState(next);
}
