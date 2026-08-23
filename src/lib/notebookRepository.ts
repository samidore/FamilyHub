import { cloneNotebookState, defaultNotebookState, normalizeMemberDisplayName, normalizeNotebookState, type NotebookState } from './notebookDomain.ts';
import { attributeNewNotebookItems } from './notebookAttribution.ts';
import type { FirebaseConfig } from './householdRepository.ts';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { get, getDatabase, onValue, ref, runTransaction, set, type Database, type DatabaseReference, type DataSnapshot } from 'firebase/database';

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

const REQUIRED_FIREBASE_CONFIG_KEYS: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'databaseURL', 'appId', 'householdId'];
const OPTIONAL_FIREBASE_CONFIG_KEYS: (keyof FirebaseConfig)[] = ['storageBucket', 'messagingSenderId'];
const popupFallbackCodes = new Set(['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported']);

export const hasCompleteNotebookFirebaseConfig = (config: Partial<FirebaseConfig> | null | undefined): config is FirebaseConfig =>
  Boolean(config && REQUIRED_FIREBASE_CONFIG_KEYS.every((key) => typeof config[key] === 'string' && config[key]!.trim()));
export const hasAnyNotebookFirebaseConfig = (config: Partial<FirebaseConfig> | null | undefined) =>
  Boolean(config && [...REQUIRED_FIREBASE_CONFIG_KEYS, ...OPTIONAL_FIREBASE_CONFIG_KEYS].some((key) => typeof config[key] === 'string' && config[key]!.trim()));

export function notebookGoogleIdentity(user: Pick<User, 'uid' | 'email' | 'emailVerified' | 'providerData'> | null) {
  if (!user?.email || !user.emailVerified || !user.providerData.some((provider) => provider.providerId === 'google.com')) return null;
  return { uid: user.uid, email: user.email };
}

export const shouldUseNotebookRedirectFallback = (error: unknown) => popupFallbackCodes.has((error as { code?: string } | null)?.code ?? '');

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
  private readonly app: FirebaseApp;
  private readonly auth: Auth;
  private readonly database: Database;
  private readonly notebookRef: DatabaseReference;
  private readonly listeners = new Set<NotebookStateListener>();
  private state: NotebookState = defaultNotebookState();
  private status: NotebookRepositoryStatus = { connection: 'connecting', label: '正在恢复登录状态…' };
  private uid = '';
  private email = '';
  private displayName = '';
  private unsubscribeNotebook?: () => void;
  private unsubscribeMember?: () => void;
  private disposed = false;

  constructor(config: FirebaseConfig) {
    this.householdId = config.householdId;
    const appName = `family-hub-${config.projectId}`;
    this.app = getApps().find((candidate) => candidate.name === appName) ?? initializeApp(config, appName);
    this.auth = getAuth(this.app);
    this.database = getDatabase(this.app, config.databaseURL);
    this.notebookRef = ref(this.database, `households/${config.householdId}/notebook`);
    this.ready = this.initialize();
  }

  getSnapshot() { return cloneNotebookState(this.state); }
  getStatus() { return { ...this.status, uid: this.uid || undefined, email: this.email || undefined, displayName: this.displayName || undefined }; }
  getCurrentMemberDisplayName() { return normalizeMemberDisplayName(this.displayName); }
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

  async signInWithGoogle() {
    await setPersistence(this.auth, browserLocalPersistence);
    if (this.auth.currentUser?.isAnonymous) await firebaseSignOut(this.auth);
    this.setStatus({ connection: 'connecting', label: '正在打开 Google 登录…' });
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(this.auth, provider);
      await this.resolveCurrentUser();
    } catch (error) {
      if (shouldUseNotebookRedirectFallback(error)) { await signInWithRedirect(this.auth, provider); return; }
      this.fail('Google 登录失败', error);
      throw error;
    }
  }

  async refreshAccess() {
    try { await this.resolveCurrentUser(); }
    catch (error) { this.fail('权限检查失败', error); throw error; }
  }

  async signOut() {
    this.stopSubscriptions();
    await firebaseSignOut(this.auth);
    this.uid = '';
    this.email = '';
    this.displayName = '';
    this.state = defaultNotebookState();
    this.showSignedOut();
  }

  dispose() { this.disposed = true; this.stopSubscriptions(); this.listeners.clear(); }

  private async initialize() {
    try {
      await setPersistence(this.auth, browserLocalPersistence);
      await getRedirectResult(this.auth);
      const user = await new Promise<User | null>((resolve) => {
        const unsubscribe = onAuthStateChanged(this.auth, (next) => { unsubscribe(); resolve(next); });
      });
      if (!user) { this.showSignedOut(); return; }
      if (user.isAnonymous) { await firebaseSignOut(this.auth); this.showSignedOut(); return; }
      await this.resolveAccess(user);
    } catch (error) {
      this.fail('Firebase 连接失败', error);
      throw error;
    }
  }

  private async resolveCurrentUser() {
    const user = this.auth.currentUser;
    if (!user) { this.showSignedOut(); return; }
    await this.resolveAccess(user);
  }

  private async resolveAccess(user: User) {
    const identity = notebookGoogleIdentity(user);
    if (!identity) throw new Error('请使用已验证的 Google Gmail 账号登录。');
    this.uid = identity.uid;
    this.email = identity.email;
    this.displayName = '';
    this.stopSubscriptions();
    this.setStatus({ connection: 'connecting', label: '正在检查家庭权限…', uid: this.uid, email: this.email });
    const memberRef = ref(this.database, `households/${this.householdId}/members/${this.uid}`);
    const enrollmentRef = ref(this.database, `households/${this.householdId}/settings/enrollmentOpen`);
    const [member, enrollment] = await Promise.all([get(memberRef), get(enrollmentRef)]);
    const enrollmentOpen = enrollment.val() === true;
    if (member.child('email').val() === this.email) { await this.connectNotebook(memberRef, enrollmentOpen); return; }
    if (enrollmentOpen) {
      await set(memberRef, { email: this.email });
      await this.connectNotebook(memberRef, true);
      return;
    }
    await set(ref(this.database, `households/${this.householdId}/accessRequests/${this.uid}`), { email: this.email });
    this.state = defaultNotebookState();
    this.setStatus({ connection: 'pending', label: '等待家庭管理员批准', uid: this.uid, email: this.email, enrollmentOpen: false });
    this.unsubscribeMember = onValue(memberRef, (next) => {
      if (!this.disposed && next.child('email').val() === this.email) void this.connectNotebook(memberRef, false).catch((error) => this.fail('Firebase 连接失败', error));
    }, (error) => this.fail('成员权限检查失败', error));
  }

  private async connectNotebook(memberRef: DatabaseReference, enrollmentOpen: boolean) {
    this.unsubscribeMember?.();
    this.unsubscribeMember = undefined;
    const [notebook, member] = await Promise.all([get(this.notebookRef), get(memberRef)]);
    if (member.child('email').val() !== this.email) throw new Error('家庭成员权限不存在。');
    this.displayName = normalizeMemberDisplayName(member.child('displayName').val()) ?? '';
    this.setStateFromSnapshot(notebook);
    this.setStatus({ connection: 'connected', label: '已连接 Firebase', uid: this.uid, email: this.email, displayName: this.displayName || undefined, enrollmentOpen });
    this.unsubscribeNotebook?.();
    this.unsubscribeNotebook = onValue(this.notebookRef, (next) => this.setStateFromSnapshot(next), (error) => { if (!this.disposed) this.fail('Firebase 实时连接中断', error); });
    this.unsubscribeMember = onValue(memberRef, (next) => {
      if (this.disposed) return;
      if (next.child('email').val() !== this.email) {
        this.unsubscribeNotebook?.();
        this.unsubscribeNotebook = undefined;
        this.displayName = '';
        this.state = defaultNotebookState();
        this.setStatus({ connection: 'pending', label: '家庭权限已撤销', uid: this.uid, email: this.email, enrollmentOpen: false });
        return;
      }
      const nextDisplayName = normalizeMemberDisplayName(next.child('displayName').val()) ?? '';
      if (nextDisplayName !== this.displayName) {
        this.displayName = nextDisplayName;
        this.setStatus({ ...this.status, displayName: this.displayName || undefined });
      }
    }, (error) => this.fail('成员资料同步失败', error));
  }

  private assertReady() { if (this.status.connection !== 'connected') throw new Error(this.status.error ?? 'Notebook repository is not ready'); }
  private setStateFromSnapshot(snapshot: DataSnapshot) { this.state = normalizeNotebookState(snapshot.val()); this.emit(); }
  private stopSubscriptions() { this.unsubscribeNotebook?.(); this.unsubscribeNotebook = undefined; this.unsubscribeMember?.(); this.unsubscribeMember = undefined; }
  private showSignedOut() { this.state = defaultNotebookState(); this.displayName = ''; this.setStatus({ connection: 'signed-out', label: '需要登录' }); }
  private setStatus(status: NotebookRepositoryStatus) { this.status = status; this.emit(); }
  private fail(label: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.setStatus({ connection: 'error', label, uid: this.uid || undefined, email: this.email || undefined, displayName: this.displayName || undefined, error: message });
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
