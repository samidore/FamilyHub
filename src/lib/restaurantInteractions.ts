import {
  FirebaseHouseholdSession,
  hasAnyFirebaseConfig,
  hasCompleteFirebaseConfig,
  normalizeHouseholdDisplayName,
  type FirebaseConfig,
  type HouseholdSessionStatus,
} from './householdSession.ts';
import { get, onValue, ref, update, type DatabaseReference, type DataSnapshot } from 'firebase/database';

export type RestaurantRatingScore = 1 | 2 | 3 | 4 | 5;

export interface RestaurantRating {
  score: RestaurantRatingScore;
  authorName: string;
  updatedAt: number;
}

export interface RestaurantWant {
  authorName: string;
  updatedAt: number;
}

export interface RestaurantComment {
  id: string;
  restaurantId: string;
  body: string;
  authorName: string;
  createdAt: number;
  updatedAt?: number;
}

export interface RestaurantInboxTicket {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface RestaurantInteractionState {
  ratings: Record<string, Record<string, RestaurantRating>>;
  wants: Record<string, Record<string, RestaurantWant>>;
  comments: Record<string, RestaurantComment>;
  inbox: Record<string, RestaurantInboxTicket>;
}

export type RestaurantInteractionConnection = 'local' | 'signed-out' | 'connecting' | 'pending' | 'connected' | 'error';
export interface RestaurantInteractionStatus {
  connection: RestaurantInteractionConnection;
  label: string;
  uid?: string;
  email?: string;
  displayName?: string;
  enrollmentOpen?: boolean;
  error?: string;
}
export type RestaurantInteractionListener = (state: RestaurantInteractionState, status: RestaurantInteractionStatus) => void;

export interface RestaurantInteractionRepository {
  readonly kind: 'local' | 'firebase';
  readonly householdId: string;
  readonly ready?: Promise<void>;
  getSnapshot(): RestaurantInteractionState;
  getStatus(): RestaurantInteractionStatus;
  getCurrentUid(): string | null;
  getCurrentMemberDisplayName(): string | null;
  subscribe(listener: RestaurantInteractionListener): () => void;
  transaction(mutator: (current: RestaurantInteractionState) => RestaurantInteractionState): Promise<RestaurantInteractionState>;
  signInWithGoogle(): Promise<void>;
  refreshAccess(): Promise<void>;
  signOut(): Promise<void>;
  dispose(): void;
}

export interface RestaurantWantSummary {
  count: number;
  cat: boolean;
  dog: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const positiveTimestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
const ratingScore = (value: unknown): value is RestaurantRatingScore => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
const clone = (state: RestaurantInteractionState) => structuredClone(state);
const sameValue = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

export const defaultRestaurantInteractionState = (): RestaurantInteractionState => ({ ratings: {}, wants: {}, comments: {}, inbox: {} });

function normalizeRating(value: unknown): RestaurantRating | null {
  if (!isRecord(value) || !ratingScore(value.score) || !positiveTimestamp(value.updatedAt)) return null;
  const authorName = normalizeHouseholdDisplayName(value.authorName);
  return authorName ? { score: value.score, authorName, updatedAt: value.updatedAt } : null;
}

function normalizeWant(value: unknown): RestaurantWant | null {
  if (!isRecord(value) || !positiveTimestamp(value.updatedAt)) return null;
  const authorName = normalizeHouseholdDisplayName(value.authorName);
  return authorName ? { authorName, updatedAt: value.updatedAt } : null;
}

function normalizeComment(id: string, value: unknown): RestaurantComment | null {
  if (!isRecord(value) || value.id !== id || typeof value.restaurantId !== 'string' || !value.restaurantId.trim() || typeof value.body !== 'string' || !value.body.trim()) return null;
  const authorName = normalizeHouseholdDisplayName(value.authorName);
  if (!authorName || !positiveTimestamp(value.createdAt) || (value.updatedAt !== undefined && !positiveTimestamp(value.updatedAt))) return null;
  return {
    id,
    restaurantId: value.restaurantId.trim(),
    body: value.body.trim(),
    authorName,
    createdAt: value.createdAt,
    ...(positiveTimestamp(value.updatedAt) ? { updatedAt: value.updatedAt } : {}),
  };
}

function normalizeInboxTicket(id: string, value: unknown): RestaurantInboxTicket | null {
  if (!isRecord(value) || value.id !== id || typeof value.text !== 'string' || !value.text.trim() || !positiveTimestamp(value.createdAt) || !positiveTimestamp(value.updatedAt)) return null;
  return { id, text: value.text.trim(), createdAt: value.createdAt, updatedAt: value.updatedAt };
}

function normalizeByRestaurant<T>(value: unknown, normalize: (entry: unknown) => T | null): Record<string, Record<string, T>> {
  const result: Record<string, Record<string, T>> = {};
  if (!isRecord(value)) return result;
  for (const [restaurantId, rawByUid] of Object.entries(value)) {
    if (!restaurantId.trim() || !isRecord(rawByUid)) continue;
    const byUid: Record<string, T> = {};
    for (const [uid, rawEntry] of Object.entries(rawByUid)) {
      if (!uid.trim()) continue;
      const entry = normalize(rawEntry);
      if (entry) byUid[uid] = entry;
    }
    if (Object.keys(byUid).length) result[restaurantId] = byUid;
  }
  return result;
}

export function normalizeRestaurantInteractionState(value: unknown): RestaurantInteractionState {
  const raw = isRecord(value) ? value : {};
  const ratings = normalizeByRestaurant(raw.ratings, normalizeRating);
  const wants = normalizeByRestaurant(raw.wants, normalizeWant);
  const comments: Record<string, RestaurantComment> = {};
  if (isRecord(raw.comments)) {
    for (const [id, rawComment] of Object.entries(raw.comments)) {
      const comment = normalizeComment(id, rawComment);
      if (comment) comments[id] = comment;
    }
  }
  const inbox: Record<string, RestaurantInboxTicket> = {};
  if (isRecord(raw.inbox)) {
    for (const [id, rawTicket] of Object.entries(raw.inbox)) {
      const ticket = normalizeInboxTicket(id, rawTicket);
      if (ticket) inbox[id] = ticket;
    }
  }
  return { ratings, wants, comments, inbox };
}

function diffFlatCollection<T>(prefix: string, current: Record<string, T>, next: Record<string, T>, patch: Record<string, unknown>) {
  for (const id of new Set([...Object.keys(current), ...Object.keys(next)])) {
    if (sameValue(current[id], next[id])) continue;
    patch[`${prefix}/${id}`] = next[id] ?? null;
  }
}

function diffNestedCollection<T>(prefix: string, current: Record<string, Record<string, T>>, next: Record<string, Record<string, T>>, patch: Record<string, unknown>) {
  for (const parentId of new Set([...Object.keys(current), ...Object.keys(next)])) {
    const currentChildren = current[parentId] ?? {};
    const nextChildren = next[parentId] ?? {};
    for (const childId of new Set([...Object.keys(currentChildren), ...Object.keys(nextChildren)])) {
      if (sameValue(currentChildren[childId], nextChildren[childId])) continue;
      patch[`${prefix}/${parentId}/${childId}`] = nextChildren[childId] ?? null;
    }
  }
}

export function restaurantInteractionLeafPatch(current: RestaurantInteractionState, next: RestaurantInteractionState): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  diffNestedCollection('ratings', current.ratings, next.ratings, patch);
  diffNestedCollection('wants', current.wants, next.wants, patch);
  diffFlatCollection('comments', current.comments, next.comments, patch);
  diffFlatCollection('inbox', current.inbox, next.inbox, patch);
  return patch;
}

export function restaurantCommentsFor(state: RestaurantInteractionState, restaurantId: string): RestaurantComment[] {
  return Object.values(state.comments)
    .filter((comment) => comment.restaurantId === restaurantId)
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
}

export function restaurantRatingForAuthor(state: RestaurantInteractionState, restaurantId: string, authorName: string): RestaurantRating | undefined {
  return Object.values(state.ratings[restaurantId] ?? {}).find((rating) => rating.authorName === authorName);
}

export function restaurantWantSummary(wants: Record<string, RestaurantWant> | undefined): RestaurantWantSummary {
  const values = Object.values(wants ?? {});
  return {
    count: values.length,
    cat: values.some((want) => want.authorName === '猫猫'),
    dog: values.some((want) => want.authorName === '呜哇'),
  };
}

export function compareRestaurantWantPriority(left: RestaurantWantSummary, right: RestaurantWantSummary, leftName = '', rightName = '') {
  return right.count - left.count || leftName.localeCompare(rightName);
}

export function setRestaurantRating(
  state: RestaurantInteractionState,
  restaurantId: string,
  uid: string,
  authorName: string,
  score: RestaurantRatingScore | null,
  now: number,
): RestaurantInteractionState {
  const name = normalizeHouseholdDisplayName(authorName);
  if (!restaurantId || !uid || !name || !positiveTimestamp(now) || (score !== null && !ratingScore(score))) return state;
  const next = clone(state);
  const byUid = { ...(next.ratings[restaurantId] ?? {}) };
  if (score === null) delete byUid[uid];
  else byUid[uid] = { score, authorName: name, updatedAt: now };
  if (Object.keys(byUid).length) next.ratings[restaurantId] = byUid;
  else delete next.ratings[restaurantId];
  return normalizeRestaurantInteractionState(next);
}

export function setRestaurantWant(
  state: RestaurantInteractionState,
  restaurantId: string,
  uid: string,
  authorName: string,
  active: boolean,
  now: number,
): RestaurantInteractionState {
  const name = normalizeHouseholdDisplayName(authorName);
  if (!restaurantId || !uid || !name || !positiveTimestamp(now)) return state;
  const next = clone(state);
  const byUid = { ...(next.wants[restaurantId] ?? {}) };
  if (active) byUid[uid] = { authorName: name, updatedAt: now };
  else delete byUid[uid];
  if (Object.keys(byUid).length) next.wants[restaurantId] = byUid;
  else delete next.wants[restaurantId];
  return normalizeRestaurantInteractionState(next);
}

export function addRestaurantComment(state: RestaurantInteractionState, comment: RestaurantComment): RestaurantInteractionState {
  if (state.comments[comment.id] || !normalizeComment(comment.id, comment)) return state;
  return normalizeRestaurantInteractionState({ ...state, comments: { ...state.comments, [comment.id]: comment } });
}

export function editRestaurantComment(state: RestaurantInteractionState, commentId: string, body: string, updatedAt: number): RestaurantInteractionState {
  const existing = state.comments[commentId];
  if (!existing || !body.trim() || !positiveTimestamp(updatedAt)) return state;
  return normalizeRestaurantInteractionState({ ...state, comments: { ...state.comments, [commentId]: { ...existing, body: body.trim(), updatedAt } } });
}

export function deleteRestaurantComment(state: RestaurantInteractionState, commentId: string): RestaurantInteractionState {
  if (!state.comments[commentId]) return state;
  const next = clone(state);
  delete next.comments[commentId];
  return next;
}

export function addRestaurantInboxTicket(state: RestaurantInteractionState, ticket: RestaurantInboxTicket): RestaurantInteractionState {
  if (state.inbox[ticket.id] || !normalizeInboxTicket(ticket.id, ticket)) return state;
  return normalizeRestaurantInteractionState({ ...state, inbox: { ...state.inbox, [ticket.id]: ticket } });
}

export function editRestaurantInboxTicket(state: RestaurantInteractionState, ticketId: string, text: string, updatedAt: number): RestaurantInteractionState {
  const existing = state.inbox[ticketId];
  if (!existing || !text.trim() || !positiveTimestamp(updatedAt)) return state;
  return normalizeRestaurantInteractionState({ ...state, inbox: { ...state.inbox, [ticketId]: { ...existing, text: text.trim(), updatedAt } } });
}

export function deleteRestaurantInboxTicket(state: RestaurantInteractionState, ticketId: string): RestaurantInteractionState {
  if (!state.inbox[ticketId]) return state;
  const next = clone(state);
  delete next.inbox[ticketId];
  return next;
}

export function clearRestaurantInbox(state: RestaurantInteractionState): RestaurantInteractionState {
  if (!Object.keys(state.inbox).length) return state;
  return { ...clone(state), inbox: {} };
}

export function createRestaurantInboxChatPrompt(state: RestaurantInteractionState, date: string): string {
  const tickets = Object.values(state.inbox).sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
  const lines = tickets.map((ticket, index) => `${index + 1}. ${ticket.text}`);
  return [
    `FamilyHub Restaurants Inbox — ${date}`,
    '',
    'GOAL: 处理下面这些 Restaurants 随手记。先读取当前 repo 的 AGENTS.md、PROJECT.md 和 Restaurants canonical docs/data；涉及饭店公开事实时先联网核实。按现有 schema、隐私边界和实现规则修改正确的 canonical files。家庭评分、想吃、评论属于 private runtime state，不要写进公开 restaurants.json。',
    '',
    ...lines,
  ].join('\n');
}

interface LocalOptions { initialState?: unknown; displayName?: string; uid?: string; }
export interface CreateRestaurantInteractionRepositoryOptions extends LocalOptions { allowLocal?: boolean; }

export class LocalRestaurantInteractionRepository implements RestaurantInteractionRepository {
  readonly kind = 'local' as const;
  readonly householdId: string;
  private state: RestaurantInteractionState;
  private readonly displayName: string | null;
  private readonly uid: string;
  private readonly listeners = new Set<RestaurantInteractionListener>();
  private readonly status: RestaurantInteractionStatus;

  constructor(householdId = 'local-household', options: LocalOptions = {}) {
    this.householdId = householdId;
    this.state = normalizeRestaurantInteractionState(options.initialState);
    this.displayName = normalizeHouseholdDisplayName(options.displayName ?? 'Local User');
    this.uid = options.uid?.trim() || 'local-user';
    this.status = { connection: 'local', label: '本地开发数据（显式启用）', uid: this.uid, displayName: this.displayName ?? undefined };
  }
  getSnapshot() { return clone(this.state); }
  getStatus() { return { ...this.status }; }
  getCurrentUid() { return this.uid; }
  getCurrentMemberDisplayName() { return this.displayName; }
  subscribe(listener: RestaurantInteractionListener) { this.listeners.add(listener); listener(this.getSnapshot(), this.getStatus()); return () => this.listeners.delete(listener); }
  async transaction(mutator: (current: RestaurantInteractionState) => RestaurantInteractionState) {
    this.state = normalizeRestaurantInteractionState(mutator(this.getSnapshot()));
    this.emit();
    return this.getSnapshot();
  }
  async signInWithGoogle() { /* Local development needs no authentication. */ }
  async refreshAccess() { /* Local development is always ready. */ }
  async signOut() { /* Local development has no session. */ }
  dispose() { this.listeners.clear(); }
  private emit() { for (const listener of this.listeners) listener(this.getSnapshot(), this.getStatus()); }
}

export class FirebaseRestaurantInteractionRepository implements RestaurantInteractionRepository {
  readonly kind = 'firebase' as const;
  readonly householdId: string;
  readonly ready: Promise<void>;
  private readonly session: FirebaseHouseholdSession;
  private readonly interactionsRef: DatabaseReference;
  private state = defaultRestaurantInteractionState();
  private status: RestaurantInteractionStatus = { connection: 'connecting', label: '正在恢复登录状态…' };
  private readonly listeners = new Set<RestaurantInteractionListener>();
  private unsubscribeInteractions?: () => void;
  private unsubscribeSession?: () => void;
  private connectedUid = '';
  private disposed = false;

  constructor(config: FirebaseConfig) {
    this.householdId = config.householdId;
    this.session = new FirebaseHouseholdSession(config);
    this.interactionsRef = ref(this.session.database, `households/${config.householdId}/restaurants`);
    this.ready = this.initialize();
  }
  getSnapshot() { return clone(this.state); }
  getStatus() { return { ...this.status }; }
  getCurrentUid() { return this.session.getCurrentUid(); }
  getCurrentMemberDisplayName() { return this.session.getCurrentMemberDisplayName(); }
  subscribe(listener: RestaurantInteractionListener) { this.listeners.add(listener); listener(this.getSnapshot(), this.getStatus()); return () => this.listeners.delete(listener); }
  async transaction(mutator: (current: RestaurantInteractionState) => RestaurantInteractionState) {
    await this.ready.catch(() => undefined);
    this.assertReady();
    const snapshot = await get(this.interactionsRef);
    const current = normalizeRestaurantInteractionState(snapshot.val());
    const next = normalizeRestaurantInteractionState(mutator(clone(current)));
    const patch = restaurantInteractionLeafPatch(current, next);
    if (Object.keys(patch).length) await update(this.interactionsRef, patch);
    const refreshed = await get(this.interactionsRef);
    this.setStateFromSnapshot(refreshed);
    return this.getSnapshot();
  }
  signInWithGoogle() { return this.session.signInWithGoogle(); }
  refreshAccess() { return this.session.refreshAccess(); }
  signOut() { return this.session.signOut(); }
  dispose() {
    this.disposed = true;
    this.stopInteractionSubscription();
    this.unsubscribeSession?.();
    this.unsubscribeSession = undefined;
    this.session.dispose();
    this.listeners.clear();
  }

  private async initialize() {
    await this.session.ready.catch(() => undefined);
    await this.handleSessionStatus(this.session.getStatus());
    this.unsubscribeSession = this.session.subscribe((status) => { if (!this.disposed) void this.handleSessionStatus(status); });
  }

  private async handleSessionStatus(sessionStatus: HouseholdSessionStatus) {
    if (sessionStatus.connection === 'connected' && sessionStatus.uid) {
      if (this.connectedUid === sessionStatus.uid && this.status.connection === 'connected') {
        this.setStatus({ ...sessionStatus, connection: 'connected' });
        return;
      }
      this.stopInteractionSubscription();
      const snapshot = await get(this.interactionsRef);
      if (this.disposed || this.session.getStatus().connection !== 'connected') return;
      this.connectedUid = sessionStatus.uid;
      this.setStateFromSnapshot(snapshot);
      this.setStatus({ ...sessionStatus, connection: 'connected' });
      this.unsubscribeInteractions = onValue(this.interactionsRef, (next) => this.setStateFromSnapshot(next), (error) => { if (!this.disposed) this.fail('Restaurants 家庭数据连接中断', error); });
      return;
    }
    this.connectedUid = '';
    this.stopInteractionSubscription();
    this.state = defaultRestaurantInteractionState();
    this.setStatus({ ...sessionStatus, connection: sessionStatus.connection });
  }

  private assertReady() { if (this.status.connection !== 'connected') throw new Error(this.status.error ?? 'Restaurants household repository is not ready'); }
  private setStateFromSnapshot(snapshot: DataSnapshot) { this.state = normalizeRestaurantInteractionState(snapshot.val()); this.emit(); }
  private stopInteractionSubscription() { this.unsubscribeInteractions?.(); this.unsubscribeInteractions = undefined; }
  private setStatus(status: RestaurantInteractionStatus) { this.status = status; this.emit(); }
  private fail(label: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const session = this.session.getStatus();
    this.setStatus({ connection: 'error', label, uid: session.uid, email: session.email, displayName: session.displayName, error: message });
  }
  private emit() { for (const listener of this.listeners) listener(this.getSnapshot(), this.getStatus()); }
}

class ConfigurationErrorRestaurantInteractionRepository implements RestaurantInteractionRepository {
  readonly kind = 'firebase' as const;
  readonly householdId: string;
  readonly ready = Promise.resolve();
  private readonly state = defaultRestaurantInteractionState();
  private readonly status: RestaurantInteractionStatus;
  constructor(householdId: string, error: string) { this.householdId = householdId; this.status = { connection: 'error', label: 'Firebase 配置不完整', error }; }
  getSnapshot() { return clone(this.state); }
  getStatus() { return { ...this.status }; }
  getCurrentUid() { return null; }
  getCurrentMemberDisplayName() { return null; }
  subscribe(listener: RestaurantInteractionListener) { listener(this.getSnapshot(), this.getStatus()); return () => undefined; }
  private reject<T>(): Promise<T> { return Promise.reject(new Error(this.status.error)); }
  transaction(_mutator: (current: RestaurantInteractionState) => RestaurantInteractionState): Promise<RestaurantInteractionState> { return this.reject(); }
  signInWithGoogle(): Promise<void> { return this.reject(); }
  refreshAccess(): Promise<void> { return this.reject(); }
  signOut(): Promise<void> { return Promise.resolve(); }
  dispose() { /* no resources */ }
}

export function createRestaurantInteractionRepository(config: Partial<FirebaseConfig> | null | undefined, options: CreateRestaurantInteractionRepositoryOptions = {}): RestaurantInteractionRepository {
  if (hasCompleteFirebaseConfig(config)) return new FirebaseRestaurantInteractionRepository(config);
  if (options.allowLocal && !hasAnyFirebaseConfig(config)) return new LocalRestaurantInteractionRepository(config?.householdId?.trim() || 'local-household', options);
  return new ConfigurationErrorRestaurantInteractionRepository(
    config?.householdId?.trim() || 'family-household',
    'Restaurants 家庭评分、想吃、评论和随手记需要完整 Firebase apiKey、authDomain、projectId、databaseURL、appId 和 householdId。',
  );
}
