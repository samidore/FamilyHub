import { cloneNotebookState, defaultNotebookState, normalizeMemberDisplayName, normalizeNotebookState, type NotebookState } from './notebookDomain.ts';
import { attributeNewNotebookItems } from './notebookAttribution.ts';
import {
  FirebaseHouseholdSession,
  googleIdentity,
  hasAnyFirebaseConfig,
  hasCompleteFirebaseConfig,
  shouldUseRedirectFallback,
  type FirebaseConfig,
  type HouseholdSessionStatus,
} from './householdSession.ts';
import { get, onValue, ref, runTransaction, type DatabaseReference, type DataSnapshot } from 'firebase/database';
import type { User } from 'firebase/auth';

export type NotebookRepositoryConnection = 'local' | 'signed-out' | 'connecting' | 'pending' | 'connected' | 'error';
export interface NotebookRepositoryStatus {
  connection: NotebookRepositoryConnection;
  label: string;
  uid?: string;
  email?: string;
  displayName?: string;
  enrollmentOpen?: boolean;
  error?: string;
}
export type NotebookStateListener = (state: NotebookState, status: NotebookRepositoryStatus) => void;

export interface NotebookRepository {
  readonly kind: 'local' | 'firebase';
  readonly householdId: string;
  readonly ready?: Promise<void>;
  getSnapshot(): NotebookState;
  getStatus(): NotebookRepositoryStatus;
  getCurrentMemberDisplayName(): string | null;
  subscribe(listener: NotebookStateListener): () => void;
  update(mutator: (current: NotebookState) => NotebookState): Promise<NotebookState>;
  transaction(mutator: (current: NotebookState) => NotebookState): Promise<NotebookState>;
  signInWithGoogle(): Promise<void>;
  refreshAccess(): Promise<void>;
  signOut(): Promise<void>;
  dispose(): void;
}

interface LocalNotebookRepositoryOptions { initialState?: unknown; displayName?: string; }
export interface CreateNotebookRepositoryOptions extends LocalNotebookRepositoryOptions { allowLocal?: boolean; }

// Compatibility aliases: Notebook and Meal Builder now use the same household session helpers.
export const hasCompleteNotebookFirebaseConfig = hasCompleteFirebaseConfig;
export const hasAnyNotebookFirebaseConfig = hasAnyFirebaseConfig;
export const notebookGoogleIdentity = (user: Pick<User, 'uid' | 'email' | 'emailVerified' | 'providerData'> | null) => googleIdentity(user);
export const shouldUseNotebookRedirectFallback = shouldUseRedirectFallback;

export class LocalNotebookRepository implements NotebookRepository {
  readonly kind = 'local' as const;
  readonly householdId: string;
  private state: NotebookState;
  private readonly displayName: string | null;
  private readonly listeners = new Set<NotebookStateListener>();
  private status: NotebookRepositoryStatus;

  constructor(householdId = 'local-household', options: LocalNotebookRepositoryOptions = {}) {
    this.householdId = householdId;
    this.state = normalizeNotebookState(options.initialState);
    this.displayName = normalizeMemberDisplayName(options.displayName ?? 'Local User');
    this.status = { connection: 'local', label: '本地开发数据（显式启用）', displayName: this.displayName ?? undefined };
  }

  getSnapshot() { return cloneNotebookState(this.state); }
  getStatus() { return { ...this.status }; }
  getCurrentMemberDisplayName() { return this.displayName; }
  subscribe(listener: NotebookStateListener) { this.listeners.add(listener); listener(this.getSnapshot(), this.getStatus()); return () => this.listeners.delete(listener); }
  async update(mutator: (current: NotebookState) => NotebookState) { return this.transaction(mutator); }
  async transaction(mutator: (current: NotebookState) => NotebookState) {
    const current = this.getSnapshot();
    const next = mutator(cloneNotebookState(current));
    this.state = normalizeNotebookState(attributeNewNotebookItems(current, next, this.displayName));
    this.emit();
    return this.getSnapshot();
  }
  async signInWithGoogle() { /* Explicit local development needs no authentication. */ }
  async refreshAccess() { /* Explicit local development is always ready. */ }
  async signOut() { /* Explicit local development has no session. */ }
  dispose() { this.listeners.clear(); }
  private emit() { const state = this.getSnapshot(); const status = this.getStatus(); for (const listener of this.listeners) listener(state, status); }
}

export class FirebaseNotebookRepository implements NotebookRepository {
  readonly kind = 'firebase' as const;
  readonly householdId: string;
  readonly ready: Promise<void>;
  private readonly session: FirebaseHouseholdSession;
  private readonly notebookRef: DatabaseReference;
  private readonly listeners = new Set<NotebookStateListener>();
  private state: NotebookState = defaultNotebookState();
  private status: NotebookRepositoryStatus = { connection: 'connecting', label: '正在恢复登录状态…' };
  private unsubscribeNotebook?: () => void;
  private unsubscribeSession?: () => void;
  private connectedUid = '';
  private disposed = false;

  constructor(config: FirebaseConfig) {
    this.householdId = config.householdId;
    this.session = new FirebaseHouseholdSession(config);
    this.notebookRef = ref(this.session.database, `households/${config.householdId}/notebook`);
    this.ready = this.initialize();
  }

  getSnapshot() { return cloneNotebookState(this.state); }
  getStatus() { return { ...this.status }; }
  getCurrentMemberDisplayName() { return this.session.getCurrentMemberDisplayName(); }
  subscribe(listener: NotebookStateListener) { this.listeners.add(listener); listener(this.getSnapshot(), this.getStatus()); return () => this.listeners.delete(listener); }
  async update(mutator: (current: NotebookState) => NotebookState) { return this.transaction(mutator); }
  async transaction(mutator: (current: NotebookState) => NotebookState) {
    await this.ready.catch(() => undefined);
    this.assertReady();
    const transaction = await runTransaction(this.notebookRef, (value) => {
      const current = normalizeNotebookState(value);
      const next = mutator(cloneNotebookState(current));
      return normalizeNotebookState(attributeNewNotebookItems(current, next, this.getCurrentMemberDisplayName()));
    });
    this.setStateFromSnapshot(transaction.snapshot);
    return this.getSnapshot();
  }
  signInWithGoogle() { return this.session.signInWithGoogle(); }
  refreshAccess() { return this.session.refreshAccess(); }
  signOut() { return this.session.signOut(); }
  dispose() {
    this.disposed = true;
    this.stopNotebookSubscription();
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
        this.setStatus(this.fromSessionStatus(sessionStatus));
        return;
      }
      this.stopNotebookSubscription();
      const snapshot = await get(this.notebookRef);
      if (this.disposed || this.session.getStatus().connection !== 'connected') return;
      this.connectedUid = sessionStatus.uid;
      this.setStateFromSnapshot(snapshot);
      this.setStatus(this.fromSessionStatus(sessionStatus));
      this.unsubscribeNotebook = onValue(this.notebookRef, (next) => this.setStateFromSnapshot(next), (error) => { if (!this.disposed) this.fail('Firebase 实时连接中断', error); });
      return;
    }
    this.connectedUid = '';
    this.stopNotebookSubscription();
    this.state = defaultNotebookState();
    this.setStatus(this.fromSessionStatus(sessionStatus));
  }

  private fromSessionStatus(status: HouseholdSessionStatus): NotebookRepositoryStatus {
    return { ...status, connection: status.connection };
  }

  private assertReady() { if (this.status.connection !== 'connected') throw new Error(this.status.error ?? 'Notebook repository is not ready'); }
  private setStateFromSnapshot(snapshot: DataSnapshot) { this.state = normalizeNotebookState(snapshot.val()); this.emit(); }
  private stopNotebookSubscription() { this.unsubscribeNotebook?.(); this.unsubscribeNotebook = undefined; }
  private setStatus(status: NotebookRepositoryStatus) { this.status = status; this.emit(); }
  private fail(label: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const session = this.session.getStatus();
    this.setStatus({ connection: 'error', label, uid: session.uid, email: session.email, displayName: session.displayName, error: message });
  }
  private emit() { const state = this.getSnapshot(); const status = this.getStatus(); for (const listener of this.listeners) listener(state, status); }
}

class ConfigurationErrorNotebookRepository implements NotebookRepository {
  readonly kind = 'firebase' as const;
  readonly householdId: string;
  readonly ready = Promise.resolve();
  private readonly state = defaultNotebookState();
  private readonly status: NotebookRepositoryStatus;
  constructor(householdId: string, error: string) {
    this.householdId = householdId;
    this.status = { connection: 'error', label: 'Firebase 配置不完整', error };
  }
  getSnapshot() { return cloneNotebookState(this.state); }
  getStatus() { return { ...this.status }; }
  getCurrentMemberDisplayName() { return null; }
  subscribe(listener: NotebookStateListener) { listener(this.getSnapshot(), this.getStatus()); return () => undefined; }
  private reject<T>(): Promise<T> { return Promise.reject(new Error(this.status.error)); }
  update(_mutator: (current: NotebookState) => NotebookState): Promise<NotebookState> { return this.reject(); }
  transaction(_mutator: (current: NotebookState) => NotebookState): Promise<NotebookState> { return this.reject(); }
  signInWithGoogle(): Promise<void> { return this.reject(); }
  refreshAccess(): Promise<void> { return this.reject(); }
  signOut(): Promise<void> { return Promise.resolve(); }
  dispose() { /* no resources */ }
}

export function createNotebookRepository(config: Partial<FirebaseConfig> | null | undefined, options: CreateNotebookRepositoryOptions = {}): NotebookRepository {
  if (hasCompleteNotebookFirebaseConfig(config)) return new FirebaseNotebookRepository(config);
  if (options.allowLocal && !hasAnyNotebookFirebaseConfig(config)) return new LocalNotebookRepository(config?.householdId?.trim() || 'local-household', options);
  return new ConfigurationErrorNotebookRepository(
    config?.householdId?.trim() || 'family-household',
    'Sami的小本本需要完整 Firebase apiKey、authDomain、projectId、databaseURL、appId 和 householdId；生产环境不会回退到本地数据。',
  );
}
