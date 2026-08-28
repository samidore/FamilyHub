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
import { get, getDatabase, onValue, ref, set, type Database, type DatabaseReference } from 'firebase/database';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  databaseURL: string;
  appId: string;
  householdId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export const firebaseConfigKeys: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'databaseURL', 'appId', 'householdId'];
export const firebaseOptionalConfigKeys: (keyof FirebaseConfig)[] = ['storageBucket', 'messagingSenderId'];
export const hasCompleteFirebaseConfig = (config: Partial<FirebaseConfig> | null | undefined): config is FirebaseConfig =>
  Boolean(config && firebaseConfigKeys.every((key) => typeof config[key] === 'string' && config[key]!.trim()));
export const hasAnyFirebaseConfig = (config: Partial<FirebaseConfig> | null | undefined) =>
  Boolean(config && [...firebaseConfigKeys, ...firebaseOptionalConfigKeys].some((key) => typeof config[key] === 'string' && config[key]!.trim()));

export type HouseholdSessionConnection = 'signed-out' | 'connecting' | 'pending' | 'connected' | 'error';
export interface HouseholdSessionStatus {
  connection: HouseholdSessionConnection;
  label: string;
  uid?: string;
  email?: string;
  displayName?: string;
  enrollmentOpen?: boolean;
  error?: string;
}
export type HouseholdSessionListener = (status: HouseholdSessionStatus) => void;

export function normalizeHouseholdDisplayName(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const name = value.trim();
  return name.includes('@') ? null : name;
}

export function googleIdentity(user: Pick<User, 'uid' | 'email' | 'emailVerified' | 'providerData'> | null) {
  if (!user?.email || !user.emailVerified || !user.providerData.some((provider) => provider.providerId === 'google.com')) return null;
  return { uid: user.uid, email: user.email };
}

const popupFallbackCodes = new Set(['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported']);
export const shouldUseRedirectFallback = (error: unknown) => popupFallbackCodes.has((error as { code?: string } | null)?.code ?? '');

export class FirebaseHouseholdSession {
  readonly householdId: string;
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly database: Database;
  readonly ready: Promise<void>;
  private status: HouseholdSessionStatus = { connection: 'connecting', label: '正在恢复登录状态…' };
  private readonly listeners = new Set<HouseholdSessionListener>();
  private uid = '';
  private email = '';
  private displayName = '';
  private unsubscribeMember?: () => void;
  private disposed = false;

  constructor(config: FirebaseConfig) {
    this.householdId = config.householdId;
    const appName = `family-hub-${config.projectId}`;
    this.app = getApps().find((candidate) => candidate.name === appName) ?? initializeApp(config, appName);
    this.auth = getAuth(this.app);
    this.database = getDatabase(this.app, config.databaseURL);
    this.ready = this.initialize();
  }

  getStatus(): HouseholdSessionStatus {
    return {
      ...this.status,
      uid: this.uid || undefined,
      email: this.email || undefined,
      displayName: this.displayName || undefined,
    };
  }

  getCurrentUid() { return this.uid || null; }
  getCurrentMemberDisplayName() { return normalizeHouseholdDisplayName(this.displayName); }

  subscribe(listener: HouseholdSessionListener) {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
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
      if (shouldUseRedirectFallback(error)) {
        await signInWithRedirect(this.auth, provider);
        return;
      }
      this.fail('Google 登录失败', error);
      throw error;
    }
  }

  async refreshAccess() {
    try {
      await this.resolveCurrentUser();
    } catch (error) {
      this.fail('权限检查失败', error);
      throw error;
    }
  }

  async signOut() {
    this.stopMemberSubscription();
    await firebaseSignOut(this.auth);
    this.clearIdentity();
    this.showSignedOut();
  }

  dispose() {
    this.disposed = true;
    this.stopMemberSubscription();
    this.listeners.clear();
  }

  private async initialize() {
    try {
      await setPersistence(this.auth, browserLocalPersistence);
      await getRedirectResult(this.auth);
      const user = await new Promise<User | null>((resolve) => {
        const unsubscribe = onAuthStateChanged(this.auth, (next) => {
          unsubscribe();
          resolve(next);
        });
      });
      if (!user) {
        this.showSignedOut();
        return;
      }
      if (user.isAnonymous) {
        await firebaseSignOut(this.auth);
        this.showSignedOut();
        return;
      }
      await this.resolveAccess(user);
    } catch (error) {
      this.fail('Firebase 连接失败', error);
      throw error;
    }
  }

  private async resolveCurrentUser() {
    const user = this.auth.currentUser;
    if (!user) {
      this.clearIdentity();
      this.showSignedOut();
      return;
    }
    await this.resolveAccess(user);
  }

  private async resolveAccess(user: User) {
    const identity = googleIdentity(user);
    if (!identity) throw new Error('请使用已验证的 Google Gmail 账号登录。');
    this.uid = identity.uid;
    this.email = identity.email;
    this.displayName = '';
    this.stopMemberSubscription();
    this.setStatus({ connection: 'connecting', label: '正在检查家庭权限…', uid: this.uid, email: this.email });

    const memberRef = ref(this.database, `households/${this.householdId}/members/${this.uid}`);
    const enrollmentRef = ref(this.database, `households/${this.householdId}/settings/enrollmentOpen`);
    const [member, enrollment] = await Promise.all([get(memberRef), get(enrollmentRef)]);
    const enrollmentOpen = enrollment.val() === true;

    if (member.child('email').val() === this.email) {
      this.connectMember(memberRef, member.child('displayName').val(), enrollmentOpen);
      return;
    }
    if (enrollmentOpen) {
      await set(memberRef, { email: this.email });
      this.connectMember(memberRef, null, true);
      return;
    }

    await set(ref(this.database, `households/${this.householdId}/accessRequests/${this.uid}`), { email: this.email });
    this.setStatus({ connection: 'pending', label: '等待家庭管理员批准', uid: this.uid, email: this.email, enrollmentOpen: false });
    this.unsubscribeMember = onValue(memberRef, (next) => {
      if (this.disposed || next.child('email').val() !== this.email) return;
      this.connectMember(memberRef, next.child('displayName').val(), false);
    }, (error) => this.fail('成员权限检查失败', error));
  }

  private connectMember(memberRef: DatabaseReference, rawDisplayName: unknown, enrollmentOpen: boolean) {
    this.displayName = normalizeHouseholdDisplayName(rawDisplayName) ?? '';
    this.setStatus({
      connection: 'connected',
      label: '已连接 Firebase',
      uid: this.uid,
      email: this.email,
      displayName: this.displayName || undefined,
      enrollmentOpen,
    });
    this.stopMemberSubscription();
    this.unsubscribeMember = onValue(memberRef, (next) => {
      if (this.disposed) return;
      if (next.child('email').val() !== this.email) {
        this.displayName = '';
        this.setStatus({ connection: 'pending', label: '家庭权限已撤销', uid: this.uid, email: this.email, enrollmentOpen: false });
        return;
      }
      const nextDisplayName = normalizeHouseholdDisplayName(next.child('displayName').val()) ?? '';
      if (nextDisplayName !== this.displayName) {
        this.displayName = nextDisplayName;
        this.setStatus({ ...this.status, displayName: this.displayName || undefined });
      }
    }, (error) => this.fail('成员资料同步失败', error));
  }

  private clearIdentity() {
    this.uid = '';
    this.email = '';
    this.displayName = '';
  }

  private stopMemberSubscription() {
    this.unsubscribeMember?.();
    this.unsubscribeMember = undefined;
  }

  private showSignedOut() {
    this.setStatus({ connection: 'signed-out', label: '需要登录' });
  }

  private setStatus(status: HouseholdSessionStatus) {
    this.status = status;
    this.emit();
  }

  private fail(label: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.setStatus({
      connection: 'error',
      label,
      uid: this.uid || undefined,
      email: this.email || undefined,
      displayName: this.displayName || undefined,
      error: message,
    });
  }

  private emit() {
    const status = this.getStatus();
    for (const listener of this.listeners) listener(status);
  }
}
