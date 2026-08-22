export const NOTEBOOK_PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;
export type NotebookPriority = (typeof NOTEBOOK_PRIORITIES)[number];
export type NotebookStatus = 'active' | 'completed';
export type NotebookBoardKind = 'task' | 'media';
export type NotebookViewFilter = 'active' | 'completed' | 'all';
export type NotebookRecurrenceUnit = 'day' | 'week' | 'month' | 'year';

export interface NotebookRecurrence {
  unit: NotebookRecurrenceUnit;
  interval: number;
}

export interface NotebookBoard {
  id: string;
  title: string;
  kind: NotebookBoardKind;
  description?: string;
  visible: boolean;
  collapsed: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface NotebookItem {
  id: string;
  title: string;
  details: string;
  priority: NotebookPriority;
  status: NotebookStatus;
  dueDate?: string;
  dueTime?: string;
  recurrence?: NotebookRecurrence;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  platform?: string;
  imdbRating?: number;
  myRating?: number;
  notes?: string;
  review?: string;
}

export interface NotebookMembership { order: number; }
export type NotebookMemberships = Record<string, Record<string, NotebookMembership>>;

export interface NotebookComment {
  id: string;
  itemId: string;
  body: string;
  authorName: string;
  createdAt: number;
  updatedAt?: number;
}

export interface NotebookCompletionEvent {
  id: string;
  itemId: string;
  completedAt: number;
  priority: NotebookPriority;
  boardIds: string[];
}

export interface NotebookInboxTicket {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface NotebookSettings { viewFilter: NotebookViewFilter; }

export interface NotebookState {
  boards: Record<string, NotebookBoard>;
  items: Record<string, NotebookItem>;
  memberships: NotebookMemberships;
  comments: Record<string, NotebookComment>;
  completionEvents: Record<string, NotebookCompletionEvent>;
  inbox: Record<string, NotebookInboxTicket>;
  settings: NotebookSettings;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const priorities = new Set<NotebookPriority>(NOTEBOOK_PRIORITIES);
const statuses = new Set<NotebookStatus>(['active', 'completed']);
const boardKinds = new Set<NotebookBoardKind>(['task', 'media']);
const viewFilters = new Set<NotebookViewFilter>(['active', 'completed', 'all']);
const recurrenceUnits = new Set<NotebookRecurrenceUnit>(['day', 'week', 'month', 'year']);

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const finitePositive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
const nonNegativeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const optionalString = (value: unknown) => typeof value === 'string' ? value.trim() : undefined;
const optionalRating = (value: unknown) => value === undefined ? undefined : (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10 ? value : null);

export function normalizeMemberDisplayName(value: unknown): string | null {
  if (!nonEmptyString(value)) return null;
  const name = value.trim();
  if (name.includes('@')) return null;
  return name;
}

export function isSupportedRecurrence(value: unknown): value is NotebookRecurrence {
  if (!isRecord(value) || typeof value.unit !== 'string' || !recurrenceUnits.has(value.unit as NotebookRecurrenceUnit)) return false;
  if (!Number.isInteger(value.interval) || (value.interval as number) < 1) return false;
  return (value.unit === 'day' || value.unit === 'month') || value.interval === 1;
}

function normalizeBoard(id: string, value: unknown): NotebookBoard | null {
  if (!isRecord(value) || value.id !== id || !nonEmptyString(value.title) || !boardKinds.has(value.kind as NotebookBoardKind)) return null;
  if (typeof value.visible !== 'boolean' || typeof value.collapsed !== 'boolean' || !nonNegativeInteger(value.order)) return null;
  if (!finitePositive(value.createdAt) || !finitePositive(value.updatedAt)) return null;
  const description = optionalString(value.description);
  return {
    id,
    title: value.title.trim(),
    kind: value.kind as NotebookBoardKind,
    ...(description ? { description } : {}),
    visible: value.visible,
    collapsed: value.collapsed,
    order: value.order,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function normalizeItem(id: string, value: unknown): NotebookItem | null {
  if (!isRecord(value) || value.id !== id || !nonEmptyString(value.title) || typeof value.details !== 'string') return null;
  if (!priorities.has(value.priority as NotebookPriority) || !statuses.has(value.status as NotebookStatus)) return null;
  if (!finitePositive(value.createdAt) || !finitePositive(value.updatedAt)) return null;
  const dueDate = typeof value.dueDate === 'string' && DATE_PATTERN.test(value.dueDate) ? value.dueDate : undefined;
  const dueTime = typeof value.dueTime === 'string' && TIME_PATTERN.test(value.dueTime) ? value.dueTime : undefined;
  if (value.dueTime !== undefined && (!dueDate || !dueTime)) return null;
  const recurrence = value.recurrence === undefined ? undefined : isSupportedRecurrence(value.recurrence) ? { ...value.recurrence } : null;
  if (recurrence === null) return null;
  const status = value.status as NotebookStatus;
  const completedAt = finitePositive(value.completedAt) ? value.completedAt : undefined;
  if (status === 'completed' && (!completedAt || recurrence)) return null;
  if (status === 'active' && value.completedAt !== undefined) return null;
  const imdbRating = optionalRating(value.imdbRating);
  const myRating = optionalRating(value.myRating);
  if (imdbRating === null || myRating === null) return null;
  const platform = optionalString(value.platform);
  const notes = optionalString(value.notes);
  const review = optionalString(value.review);
  return {
    id,
    title: value.title.trim(),
    details: value.details.trim(),
    priority: value.priority as NotebookPriority,
    status,
    ...(dueDate ? { dueDate } : {}),
    ...(dueTime ? { dueTime } : {}),
    ...(recurrence ? { recurrence } : {}),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...(completedAt ? { completedAt } : {}),
    ...(platform ? { platform } : {}),
    ...(imdbRating !== undefined ? { imdbRating } : {}),
    ...(myRating !== undefined ? { myRating } : {}),
    ...(notes ? { notes } : {}),
    ...(review ? { review } : {}),
  };
}

function normalizeComment(id: string, value: unknown): NotebookComment | null {
  if (!isRecord(value) || value.id !== id || !nonEmptyString(value.itemId) || !nonEmptyString(value.body)) return null;
  const authorName = normalizeMemberDisplayName(value.authorName);
  if (!authorName || !finitePositive(value.createdAt)) return null;
  if (value.updatedAt !== undefined && !finitePositive(value.updatedAt)) return null;
  return {
    id,
    itemId: value.itemId.trim(),
    body: value.body.trim(),
    authorName,
    createdAt: value.createdAt,
    ...(finitePositive(value.updatedAt) ? { updatedAt: value.updatedAt } : {}),
  };
}

function normalizeCompletionEvent(id: string, value: unknown): NotebookCompletionEvent | null {
  if (!isRecord(value) || value.id !== id || !nonEmptyString(value.itemId) || !finitePositive(value.completedAt)) return null;
  if (!priorities.has(value.priority as NotebookPriority) || !Array.isArray(value.boardIds)) return null;
  const boardIds = [...new Set(value.boardIds.filter(nonEmptyString).map((boardId) => boardId.trim()))];
  if (boardIds.length !== value.boardIds.length || boardIds.length === 0) return null;
  return { id, itemId: value.itemId.trim(), completedAt: value.completedAt, priority: value.priority as NotebookPriority, boardIds };
}

function normalizeInboxTicket(id: string, value: unknown): NotebookInboxTicket | null {
  if (!isRecord(value) || value.id !== id || !nonEmptyString(value.text) || !finitePositive(value.createdAt) || !finitePositive(value.updatedAt)) return null;
  return { id, text: value.text.trim(), createdAt: value.createdAt, updatedAt: value.updatedAt };
}

function normalizeRecord<T>(value: unknown, parser: (id: string, raw: unknown) => T | null): Record<string, T> {
  if (!isRecord(value)) return {};
  const result: Record<string, T> = {};
  for (const [id, raw] of Object.entries(value)) {
    const parsed = parser(id, raw);
    if (parsed) result[id] = parsed;
  }
  return result;
}

function normalizeMemberships(value: unknown, boards: Record<string, NotebookBoard>, items: Record<string, NotebookItem>): NotebookMemberships {
  if (!isRecord(value)) return {};
  const result: NotebookMemberships = {};
  for (const [boardId, rawMembers] of Object.entries(value)) {
    if (!boards[boardId] || !isRecord(rawMembers)) continue;
    const members: Record<string, NotebookMembership> = {};
    for (const [itemId, rawMembership] of Object.entries(rawMembers)) {
      if (!items[itemId] || !isRecord(rawMembership) || !nonNegativeInteger(rawMembership.order)) continue;
      members[itemId] = { order: rawMembership.order };
    }
    if (Object.keys(members).length > 0) result[boardId] = members;
  }
  return result;
}

export function defaultNotebookState(): NotebookState {
  return {
    boards: {},
    items: {},
    memberships: {},
    comments: {},
    completionEvents: {},
    inbox: {},
    settings: { viewFilter: 'active' },
  };
}

export function normalizeNotebookState(value: unknown): NotebookState {
  const raw = isRecord(value) ? value : {};
  const boards = normalizeRecord(raw.boards, normalizeBoard);
  const items = normalizeRecord(raw.items, normalizeItem);
  const comments = normalizeRecord(raw.comments, normalizeComment);
  const completionEvents = normalizeRecord(raw.completionEvents, normalizeCompletionEvent);
  const inbox = normalizeRecord(raw.inbox, normalizeInboxTicket);
  const viewFilter = isRecord(raw.settings) && typeof raw.settings.viewFilter === 'string' && viewFilters.has(raw.settings.viewFilter as NotebookViewFilter)
    ? raw.settings.viewFilter as NotebookViewFilter
    : 'active';
  return {
    boards,
    items,
    memberships: normalizeMemberships(raw.memberships, boards, items),
    comments: Object.fromEntries(Object.entries(comments).filter(([, comment]) => Boolean(items[comment.itemId]))),
    completionEvents,
    inbox,
    settings: { viewFilter },
  };
}

export function cloneNotebookState(state: NotebookState): NotebookState {
  return structuredClone(state);
}
