import { FirebaseHouseholdSession, hasAnyFirebaseConfig, hasCompleteFirebaseConfig, normalizeHouseholdDisplayName, type FirebaseConfig, type HouseholdSessionStatus } from './householdSession.ts';
import { get, onValue, ref, runTransaction, type DatabaseReference, type DataSnapshot } from 'firebase/database';

export type DayTripReactionValue = 'up' | 'down';
export interface DayTripReaction {
  value: DayTripReactionValue;
  authorName: string;
  updatedAt: number;
}
export interface DayTripComment {
  id: string;
  destinationId: string;
  body: string;
  authorName: string;
  createdAt: number;
  updatedAt?: number;
}
export interface DayTripInteractionState {
  reactions: Record<string, Record<string, DayTripReaction>>;
  comments: Record<string, DayTripComment>;
}

export type DayTripInteractionConnection = 'local' | 'signed-out' | 'connecting' | 'pending' | 'connected' | 'error';
export interface DayTripInteractionStatus {
  connection: DayTripInteractionConnection;
  label: string;
  uid?: string;
  email?: string;
  displayName?: string;
  enrollmentOpen?: boolean;
  error?: string;
}
export type DayTripInteractionListener = (state: DayTripInteractionState, status: DayTripInteractionStatus) => void;

export interface DayTripInteractionRepository {
  readonly kind: 'local' | 'firebase';
  readonly householdId: string;
  readonly ready?: Promise<void>;
  getSnapshot(): DayTripInteractionState;
  getStatus(): DayTripInteractionStatus;
  getCurrentUid(): string | null;
  getCurrentMemberDisplayName(): string | null;
  subscribe(listener: DayTripInteractionListener): () => void;
  transaction(mutator: (current: DayTripInteractionState) => DayTripInteractionState): Promise<DayTripInteractionState>;
  signInWithGoogle(): Promise<void>;
  refreshAccess(): Promise<void>;
  signOut(): Promise<void>;
  dispose(): void;
}

export interface DayTripReactionSummary {
  rank: number;
  upCount: number;
  downCount: number;
  catUp: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const positiveTimestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
const clone = (state: DayTripInteractionState) => structuredClone(state);
export const defaultDayTripInteractionState = (): DayTripInteractionState => ({ reactions: {}, comments: {} });

function normalizeReaction(value: unknown): DayTripReaction | null {
  if (!isRecord(value) || (value.value !== 'up' && value.value !== 'down') || !positiveTimestamp(value.updatedAt)) return null;
  const authorName = normalizeHouseholdDisplayName(value.authorName);
  if (!authorName) return null;
  return { value: value.value, authorName, updatedAt: value.updatedAt };
}

function normalizeComment(id: string, value: unknown): DayTripComment | null {
  if (!isRecord(value) || value.id !== id || typeof value.destinationId !== 'string' || !value.destinationId.trim() || typeof value.body !== 'string' || !value.body.trim()) return null;
  const authorName = normalizeHouseholdDisplayName(value.authorName);
  if (!authorName || !positiveTimestamp(value.createdAt) || (value.updatedAt !== undefined && !positiveTimestamp(value.updatedAt))) return null;
  return {
    id,
    destinationId: value.destinationId.trim(),
    body: value.body.trim(),
    authorName,
    createdAt: value.createdAt,
    ...(positiveTimestamp(value.updatedAt) ? { updatedAt: value.updatedAt } : {}),
  };
}

export function normalizeDayTripInteractionState(value: unknown): DayTripInteractionState {
  const raw = isRecord(value) ? value : {};
  const reactions: DayTripInteractionState['reactions'] = {};
  if (isRecord(raw.reactions)) {
    for (const [destinationId, rawByUid] of Object.entries(raw.reactions)) {
      if (!destinationId.trim() || !isRecord(rawByUid)) continue;
      const byUid: Record<string, DayTripReaction> = {};
      for (const [uid, rawReaction] of Object.entries(rawByUid)) {
        const reaction = uid.trim() ? normalizeReaction(rawReaction) : null;
        if (reaction) byUid[uid] = reaction;
      }
      if (Object.keys(byUid).length) reactions[destinationId] = byUid;
    }
  }
  const comments: Record<string, DayTripComment> = {};
  if (isRecord(raw.comments)) {
    for (const [id, rawComment] of Object.entries(raw.comments)) {
      const comment = normalizeComment(id, rawComment);
      if (comment) comments[id] = comment;
    }
  }
  return { reactions, comments };
}

export function dayTripCommentsFor(state: DayTripInteractionState, destinationId: string): DayTripComment[] {
  return Object.values(state.comments)
    .filter((comment) => comment.destinationId === destinationId)
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

export function dayTripReactionSummary(reactions: Record<string, DayTripReaction> | undefined): DayTripReactionSummary {
  const values = Object.values(reactions ?? {});
  const up = values.filter((reaction) => reaction.value === 'up');
  const downCount = values.length - up.length;
  const catUp = up.some((reaction) => reaction.authorName === '猫猫');
  let rank: number;
  if (up.length > 0 && downCount === 0) rank = catUp ? 0 : 1;
  else if (values.length === 0) rank = 2;
  else if (up.length > 0 && downCount > 0) rank = 3;
  else rank = 4;
  return { rank, upCount: up.length, downCount, catUp };
}

export function compareDayTripReactionPriority(
  left: DayTripReactionSummary,
  right: DayTripReactionSummary,
  leftDrive: number,
  rightDrive: number,
  leftName = '',
  rightName = '',
) {
  return left.rank - right.rank
    || right.upCount - left.upCount
    || leftDrive - rightDrive
    || leftName.localeCompare(rightName);
}

export function setDayTripReaction(
  state: DayTripInteractionState,
  destinationId: string,
  uid: string,
  authorName: string,
  value: DayTripReactionValue | null,
  now: number,
): DayTripInteractionState {
  const name = normalizeHouseholdDisplayName(authorName);
  if (!destinationId || !uid || !name || !positiveTimestamp(now)) return state;
  const next = clone(state);
  const byUid = { ...(next.reactions[destinationId] ?? {}) };
  if (value === null) delete byUid[uid];
  else byUid[uid] = { value, authorName: name, updatedAt: now };
  if (Object.keys(byUid).length) next.reactions[destinationId] = byUid;
  else delete next.reactions[destinationId];
  return normalizeDayTripInteractionState(next);
}

export function addDayTripComment(state: DayTripInteractionState, comment: DayTripComment): DayTripInteractionState {
  if (state.comments[comment.id] || !normalizeComment(comment.id, comment)) return state;
  return normalizeDayTripInteractionState({ ...state, comments: { ...state.comments, [comment.id]: comment } });
}

export function editDayTripComment(state: DayTripInteractionState, commentId: string, body: string, updatedAt: number): DayTripInteractionState {
  const existing = state.comments[commentId];
  if (!existing || !body.trim() || !positiveTimestamp(updatedAt)) return state;
  return normalizeDayTripInteractionState({ ...state, comments: { ...state.comments, [commentId]: { ...existing, body: body.trim(), updatedAt } } });
}

export function deleteDayTripComment(state: DayTripInteractionState, commentId: string): DayTripInteractionState {
  if (!state.comments[commentId]) return state;
  const next = clone(state);
  delete next.comments[commentId];
  return next;
}

interface LocalOptions { initialState?: unknown; displayName?: string; uid?: string; }
export interface CreateDayTripInteractionRepositoryOptions extends LocalOptions { allowLocal?: boolean; }

export class LocalDayTripInteractionRepository implements DayTripInteractionRepository {
  readonly kind = 'local' as const;
  readonly householdId: string;
  private state: DayTripInteractionState;
  private readonly displayName: string | null;
  private readonly uid: string;
  private readonly listeners = new Set<DayTripInteractionListener>();
  private readonly status: DayTripInteractionStatus;
  constructor(householdId = 'local-household', options: LocalOptions = {}) {
    this.householdId = householdId;
    this.state = normalizeDayTripInteractionState(options.initialState);
    this.displayName = normalizeHouseholdDisplayName(options.displayName ?? 'Local User');
    this.uid = options.uid?.trim() || 'local-user';
    this.status = { connection: 'local', label: '本地开发数据（显式启用）', uid: this.uid, displayName: this.displayName ?? undefined };
  }
  getSnapshot() { return clone(this.state); }
  getStatus() { return { ...this.status }; }
  getCurrentUid() { return this.uid; }
  getCurrentMemberDisplayName() { return this.displayName; }
  subscribe(listener: DayTripInteractionListener) { this.listeners.add(listener); listener(this.getSnapshot(), this.getStatus()); return () => this.listeners.delete(listener); }
  async transaction(mutator: (current: DayTripInteractionState) => DayTripInteractionState) {
    this.state = normalizeDayTripInteractionState(mutator(this.getSnapshot()));
    this.emit();
    return this.getSnapshot();
  }
  async signInWithGoogle() { /* Local development needs no authentication. */ }
  async refreshAccess() { /* Local development is always ready. */ }
  async signOut() { /* Local development has no session. */ }
  dispose() { this.listeners.clear(); }
  private emit() { for (const listener of this.listeners) listener(this.getSnapshot(), this.getStatus()); }
}

export class FirebaseDayTripInteractionRepository implements DayTripInteractionRepository {
  readonly kind = 'firebase' as const;
  readonly householdId: string;
  readonly ready: Promise<void>;
  private readonly session: FirebaseHouseholdSession;
  private readonly interactionsRef: DatabaseReference;
  private state = defaultDayTripInteractionState();
  private status: DayTripInteractionStatus = { connection: 'connecting', label: '正在恢复登录状态…' };
  private readonly listeners = new Set<DayTripInteractionListener>();
  private unsubscribeInteractions?: () => void;
  private unsubscribeSession?: () => void;
  private connectedUid = '';
  private disposed = false;

  constructor(config: FirebaseConfig) {
    this.householdId = config.householdId;
    this.session = new FirebaseHouseholdSession(config);
    this.interactionsRef = ref(this.session.database, `households/${config.householdId}/dayTrips`);
    this.ready = this.initialize();
  }
  getSnapshot() { return clone(this.state); }
  getStatus() { return { ...this.status }; }
  getCurrentUid() { return this.session.getCurrentUid(); }
  getCurrentMemberDisplayName() { return this.session.getCurrentMemberDisplayName(); }
  subscribe(listener: DayTripInteractionListener) { this.listeners.add(listener); listener(this.getSnapshot(), this.getStatus()); return () => this.listeners.delete(listener); }
  async transaction(mutator: (current: DayTripInteractionState) => DayTripInteractionState) {
    await this.ready.catch(() => undefined);
    this.assertReady();
    const transaction = await runTransaction(this.interactionsRef, (value) => normalizeDayTripInteractionState(mutator(normalizeDayTripInteractionState(value))));
    this.setStateFromSnapshot(transaction.snapshot);
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
      this.unsubscribeInteractions = onValue(this.interactionsRef, (next) => this.setStateFromSnapshot(next), (error) => { if (!this.disposed) this.fail('Day Trips 家庭数据连接中断', error); });
      return;
    }
    this.connectedUid = '';
    this.stopInteractionSubscription();
    this.state = defaultDayTripInteractionState();
    this.setStatus({ ...sessionStatus, connection: sessionStatus.connection });
  }
  private assertReady() { if (this.status.connection !== 'connected') throw new Error(this.status.error ?? 'Day Trips household repository is not ready'); }
  private setStateFromSnapshot(snapshot: DataSnapshot) { this.state = normalizeDayTripInteractionState(snapshot.val()); this.emit(); }
  private stopInteractionSubscription() { this.unsubscribeInteractions?.(); this.unsubscribeInteractions = undefined; }
  private setStatus(status: DayTripInteractionStatus) { this.status = status; this.emit(); }
  private fail(label: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const session = this.session.getStatus();
    this.setStatus({ connection: 'error', label, uid: session.uid, email: session.email, displayName: session.displayName, error: message });
  }
  private emit() { for (const listener of this.listeners) listener(this.getSnapshot(), this.getStatus()); }
}

class ConfigurationErrorDayTripInteractionRepository implements DayTripInteractionRepository {
  readonly kind = 'firebase' as const;
  readonly householdId: string;
  readonly ready = Promise.resolve();
  private readonly state = defaultDayTripInteractionState();
  private readonly status: DayTripInteractionStatus;
  constructor(householdId: string, error: string) { this.householdId = householdId; this.status = { connection: 'error', label: 'Firebase 配置不完整', error }; }
  getSnapshot() { return clone(this.state); }
  getStatus() { return { ...this.status }; }
  getCurrentUid() { return null; }
  getCurrentMemberDisplayName() { return null; }
  subscribe(listener: DayTripInteractionListener) { listener(this.getSnapshot(), this.getStatus()); return () => undefined; }
  private reject<T>(): Promise<T> { return Promise.reject(new Error(this.status.error)); }
  transaction(_mutator: (current: DayTripInteractionState) => DayTripInteractionState): Promise<DayTripInteractionState> { return this.reject(); }
  signInWithGoogle(): Promise<void> { return this.reject(); }
  refreshAccess(): Promise<void> { return this.reject(); }
  signOut(): Promise<void> { return Promise.resolve(); }
  dispose() { /* no resources */ }
}

export function createDayTripInteractionRepository(config: Partial<FirebaseConfig> | null | undefined, options: CreateDayTripInteractionRepositoryOptions = {}): DayTripInteractionRepository {
  if (hasCompleteFirebaseConfig(config)) return new FirebaseDayTripInteractionRepository(config);
  if (options.allowLocal && !hasAnyFirebaseConfig(config)) return new LocalDayTripInteractionRepository(config?.householdId?.trim() || 'local-household', options);
  return new ConfigurationErrorDayTripInteractionRepository(
    config?.householdId?.trim() || 'family-household',
    'Day Trips 家庭评价需要完整 Firebase apiKey、authDomain、projectId、databaseURL、appId 和 householdId。',
  );
}
