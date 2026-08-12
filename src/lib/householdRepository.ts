import {
  applyCheckout,
  createCurrentMealFromInventory,
  normalizeHouseholdState,
  type CheckoutConsumption,
  type CheckoutResult,
  type CurrentMeal,
  type HouseholdState,
  type Inventory,
} from './household.ts';
import type { MealIngredient, MealState } from './mealEngine.ts';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence, signInAnonymously, type Auth } from 'firebase/auth';
import { get, getDatabase, onValue, ref, runTransaction, type Database, type DatabaseReference, type DataSnapshot } from 'firebase/database';

export type RepositoryConnection = 'local' | 'connecting' | 'connected' | 'unauthorized' | 'error';
export interface RepositoryStatus { connection: RepositoryConnection; label: string; uid?: string; error?: string; }
export type StateListener = (state: HouseholdState, status: RepositoryStatus) => void;

export interface HouseholdRepository {
  readonly kind: 'local' | 'firebase';
  readonly householdId: string;
  readonly ready?: Promise<void>;
  getSnapshot(): HouseholdState;
  getStatus(): RepositoryStatus;
  subscribe(listener: StateListener): () => void;
  update(mutator: (current: HouseholdState) => HouseholdState): Promise<HouseholdState>;
  transaction(mutator: (current: HouseholdState) => HouseholdState): Promise<HouseholdState>;
  setInventory(inventory: Inventory): Promise<HouseholdState>;
  updateInventory(mutator: (inventory: Inventory) => Inventory): Promise<HouseholdState>;
  setCurrentMeal(currentMeal: CurrentMeal | null): Promise<HouseholdState>;
  startCurrentMeal(options?: Partial<MealState>): Promise<HouseholdState>;
  updateCurrentMeal(mutator: (currentMeal: CurrentMeal) => CurrentMeal): Promise<HouseholdState>;
  resetInventory(): Promise<HouseholdState>;
  checkout(mealId: string, consumption: CheckoutConsumption): Promise<CheckoutResult>;
  dispose(): void;
}

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }
interface LocalRepositoryOptions { storage?: StorageLike; window?: Window; broadcast?: boolean; ingredients?: MealIngredient[] | Record<string, MealIngredient>; }

const fallbackStores = new Map<string, string>();
const memoryStorage: StorageLike = { getItem: (key) => fallbackStores.get(key) ?? null, setItem: (key, value) => void fallbackStores.set(key, value), removeItem: (key) => void fallbackStores.delete(key) };
const LOCAL_STATUS: RepositoryStatus = { connection: 'local', label: '本地开发同步（未连接 Firebase）' };

function browserStorage(): StorageLike {
  try { return typeof localStorage === 'undefined' ? memoryStorage : localStorage; } catch { return memoryStorage; }
}

function cloneState(state: HouseholdState): HouseholdState {
  return JSON.parse(JSON.stringify(state)) as HouseholdState;
}

export class LocalHouseholdRepository implements HouseholdRepository {
  readonly kind = 'local' as const;
  readonly householdId: string;
  private readonly key: string;
  private readonly storage: StorageLike;
  private readonly browserWindow?: Window;
  private readonly listeners = new Set<StateListener>();
  private readonly ingredients?: MealIngredient[] | Record<string, MealIngredient>;
  private readonly channel?: BroadcastChannel;
  private state: HouseholdState;
  private status: RepositoryStatus = { ...LOCAL_STATUS };

  constructor(householdId = 'local-household', options: LocalRepositoryOptions = {}) {
    this.householdId = householdId;
    this.key = `family-hub-household-${householdId}`;
    this.storage = options.storage ?? browserStorage();
    this.browserWindow = options.window ?? (typeof window === 'undefined' ? undefined : window);
    this.ingredients = options.ingredients;
    try { this.state = normalizeHouseholdState(JSON.parse(this.storage.getItem(this.key) ?? 'null'), this.ingredients); } catch { this.state = normalizeHouseholdState(undefined, this.ingredients); }
    if (options.broadcast !== false && this.browserWindow && typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(this.key);
      this.channel.addEventListener('message', (event) => this.receive(event.data));
    }
    this.browserWindow?.addEventListener('storage', this.handleStorage);
  }

  getSnapshot() { return cloneState(this.state); }
  getStatus() { return { ...this.status }; }
  subscribe(listener: StateListener) { this.listeners.add(listener); listener(this.getSnapshot(), this.getStatus()); return () => this.listeners.delete(listener); }

  async update(mutator: (current: HouseholdState) => HouseholdState) {
    const current = normalizeHouseholdState(JSON.parse(this.storage.getItem(this.key) ?? 'null'), this.ingredients);
    const next = normalizeHouseholdState(mutator(cloneState(current)), this.ingredients);
    this.persist(next); return this.getSnapshot();
  }
  transaction(mutator: (current: HouseholdState) => HouseholdState) { return this.update(mutator); }
  async setInventory(inventory: Inventory) { return this.update((state) => ({ ...state, inventory })); }
  async updateInventory(mutator: (inventory: Inventory) => Inventory) { return this.update((state) => ({ ...state, inventory: mutator({ ...state.inventory }) })); }
  async setCurrentMeal(currentMeal: CurrentMeal | null) { return this.update((state) => ({ ...state, currentMeal })); }
  async startCurrentMeal(options: Partial<MealState> = {}) {
    return this.update((state) => state.currentMeal ? state : ({ ...state, currentMeal: createCurrentMealFromInventory(state.inventory, options, this.ingredients) }));
  }
  async updateCurrentMeal(mutator: (currentMeal: CurrentMeal) => CurrentMeal) {
    return this.update((state) => state.currentMeal ? { ...state, currentMeal: mutator({ ...state.currentMeal }) } : state);
  }
  resetInventory() { return this.setInventory({}); }
  async checkout(mealId: string, consumption: CheckoutConsumption) {
    let result: CheckoutResult = { committed: false, reason: 'stale-meal', state: this.getSnapshot() };
    await this.update((state) => { result = applyCheckout(state, mealId, consumption, this.ingredients); return result.state; });
    return { ...result, state: this.getSnapshot() };
  }

  dispose() { this.browserWindow?.removeEventListener('storage', this.handleStorage); this.channel?.close(); this.listeners.clear(); }

  private readonly handleStorage = (event: StorageEvent) => { if (event.key === this.key && event.newValue) this.receive(JSON.parse(event.newValue)); };
  private receive(value: unknown) {
    const incoming = value && typeof value === 'object' && 'state' in value ? (value as { state: unknown }).state : value;
    const next = normalizeHouseholdState(incoming as Partial<HouseholdState>, this.ingredients);
    this.state = next; this.emit();
  }
  private persist(next: HouseholdState) {
    this.state = normalizeHouseholdState(next, this.ingredients);
    const encoded = JSON.stringify(this.state); this.storage.setItem(this.key, encoded);
    this.channel?.postMessage(this.state); this.emit();
  }
  private emit() { const snapshot = this.getSnapshot(); const status = this.getStatus(); for (const listener of this.listeners) listener(snapshot, status); }
}

export interface FirebaseConfig { apiKey: string; authDomain: string; projectId: string; databaseURL: string; appId: string; householdId: string; storageBucket?: string; messagingSenderId?: string; }
export const firebaseConfigKeys: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'databaseURL', 'appId', 'householdId'];
const firebaseOptionalConfigKeys: (keyof FirebaseConfig)[] = ['storageBucket', 'messagingSenderId'];
export const hasCompleteFirebaseConfig = (config: Partial<FirebaseConfig> | null | undefined): config is FirebaseConfig => Boolean(config && firebaseConfigKeys.every((key) => typeof config[key] === 'string' && config[key]!.trim()));
export const hasAnyFirebaseConfig = (config: Partial<FirebaseConfig> | null | undefined) => Boolean(config && [...firebaseConfigKeys, ...firebaseOptionalConfigKeys].some((key) => typeof config[key] === 'string' && config[key]!.trim()));

interface FirebaseRepositoryOptions { ingredients?: MealIngredient[] | Record<string, MealIngredient>; }

/** Firebase modular SDK adapter; configured failures never fall back to local state. */
export class FirebaseHouseholdRepository implements HouseholdRepository {
  readonly kind = 'firebase' as const;
  readonly householdId: string;
  readonly ready: Promise<void>;
  private readonly app: FirebaseApp;
  private readonly auth: Auth;
  private readonly database: Database;
  private readonly stateRef: DatabaseReference;
  private readonly ingredients?: MealIngredient[] | Record<string, MealIngredient>;
  private readonly listeners = new Set<StateListener>();
  private state: HouseholdState = normalizeHouseholdState(undefined);
  private status: RepositoryStatus = { connection: 'connecting', label: '正在连接 Firebase…' };
  private uid = '';
  private unsubscribeState?: () => void;
  private disposed = false;

  constructor(config: FirebaseConfig, options: FirebaseRepositoryOptions = {}) {
    this.householdId = config.householdId; this.ingredients = options.ingredients;
    const appName = `family-hub-${config.projectId}`;
    this.app = getApps().find((candidate) => candidate.name === appName) ?? initializeApp(config, appName);
    this.auth = getAuth(this.app); this.database = getDatabase(this.app, config.databaseURL); this.stateRef = ref(this.database, `households/${config.householdId}/state`);
    this.ready = this.initialize();
  }

  getSnapshot() { return cloneState(this.state); }
  getStatus() { return { ...this.status, uid: this.uid || undefined }; }
  subscribe(listener: StateListener) { this.listeners.add(listener); listener(this.getSnapshot(), this.getStatus()); return () => this.listeners.delete(listener); }
  async update(mutator: (current: HouseholdState) => HouseholdState) { return this.transaction(mutator); }
  async transaction(mutator: (current: HouseholdState) => HouseholdState) {
    await this.ready; this.assertReady();
    const next = await this.remoteTransaction(mutator);
    this.setState(next); return this.getSnapshot();
  }
  setInventory(inventory: Inventory) { return this.update((state) => ({ ...state, inventory })); }
  updateInventory(mutator: (inventory: Inventory) => Inventory) { return this.update((state) => ({ ...state, inventory: mutator({ ...state.inventory }) })); }
  setCurrentMeal(currentMeal: CurrentMeal | null) { return this.update((state) => ({ ...state, currentMeal })); }
  startCurrentMeal(options: Partial<MealState> = {}) { return this.update((state) => state.currentMeal ? state : ({ ...state, currentMeal: createCurrentMealFromInventory(state.inventory, options, this.ingredients) })); }
  updateCurrentMeal(mutator: (currentMeal: CurrentMeal) => CurrentMeal) { return this.update((state) => state.currentMeal ? { ...state, currentMeal: mutator({ ...state.currentMeal }) } : state); }
  resetInventory() { return this.setInventory({}); }
  async checkout(mealId: string, consumption: CheckoutConsumption) {
    await this.ready; this.assertReady();
    let outcome: CheckoutResult | undefined;
    await this.remoteTransaction((state) => { outcome = applyCheckout(state, mealId, consumption, this.ingredients); return outcome.state; });
    const result = outcome ?? { committed: false, reason: 'stale-meal' as const, state: this.state };
    this.setState(result.state); return { ...result, state: this.getSnapshot() };
  }
  dispose() { this.disposed = true; this.unsubscribeState?.(); this.listeners.clear(); }

  private async initialize() {
    try {
      await setPersistence(this.auth, browserLocalPersistence);
      const credential = await signInAnonymously(this.auth);
      this.uid = credential.user.uid;
      const snapshot = await get(this.stateRef); this.setStateFromSnapshot(snapshot);
      this.status = { connection: 'connected', label: '已连接 Firebase', uid: this.uid }; this.emit();
      this.unsubscribeState = onValue(this.stateRef, (next) => this.setStateFromSnapshot(next), (error) => {
        if (!this.disposed) { this.status = { ...this.status, connection: 'error', label: 'Firebase 实时连接中断', error: error.message }; this.emit(); }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.status = { connection: /PERMISSION_DENIED|permission-denied|401|403|unauthorized/i.test(message) ? 'unauthorized' : 'error', label: 'Firebase 连接失败', uid: this.uid || undefined, error: message }; this.emit();
      throw error;
    }
  }
  private async remoteTransaction(mutator: (state: HouseholdState) => HouseholdState) {
    const transaction = await runTransaction(this.stateRef, (value) => normalizeHouseholdState(mutator(normalizeHouseholdState(value, this.ingredients)), this.ingredients));
    return normalizeHouseholdState(transaction.snapshot.val(), this.ingredients);
  }
  private assertReady() { if (this.status.connection !== 'connected') throw new Error(this.status.error ?? 'Firebase repository is not ready'); }
  private setStateFromSnapshot(snapshot: DataSnapshot) { this.setState(normalizeHouseholdState(snapshot.val(), this.ingredients)); }
  private setState(next: HouseholdState) { this.state = normalizeHouseholdState(next, this.ingredients); this.emit(); }
  private emit() { const snapshot = this.getSnapshot(); const status = this.getStatus(); for (const listener of this.listeners) listener(snapshot, status); }
}

class ConfigurationErrorRepository implements HouseholdRepository {
  readonly kind = 'firebase' as const;
  readonly householdId: string;
  readonly ready = Promise.resolve();
  private readonly state = normalizeHouseholdState(undefined);
  private readonly status: RepositoryStatus;
  constructor(householdId: string, error: string) { this.householdId = householdId; this.status = { connection: 'error', label: 'Firebase 配置不完整', error }; }
  getSnapshot() { return cloneState(this.state); }
  getStatus() { return { ...this.status }; }
  subscribe(listener: StateListener) { listener(this.getSnapshot(), this.getStatus()); return () => undefined; }
  private reject<T>(): Promise<T> { return Promise.reject(new Error(this.status.error)); }
  update(_mutator: (current: HouseholdState) => HouseholdState): Promise<HouseholdState> { return this.reject(); }
  transaction(_mutator: (current: HouseholdState) => HouseholdState): Promise<HouseholdState> { return this.reject(); }
  setInventory(_inventory: Inventory): Promise<HouseholdState> { return this.reject(); }
  updateInventory(_mutator: (inventory: Inventory) => Inventory): Promise<HouseholdState> { return this.reject(); }
  setCurrentMeal(_currentMeal: CurrentMeal | null): Promise<HouseholdState> { return this.reject(); }
  startCurrentMeal(_options?: Partial<MealState>): Promise<HouseholdState> { return this.reject(); }
  updateCurrentMeal(_mutator: (currentMeal: CurrentMeal) => CurrentMeal): Promise<HouseholdState> { return this.reject(); }
  resetInventory(): Promise<HouseholdState> { return this.reject(); }
  checkout(_mealId: string, _consumption: CheckoutConsumption): Promise<CheckoutResult> { return this.reject(); }
  dispose() { /* no resources */ }
}

export function createHouseholdRepository(config: Partial<FirebaseConfig> | null | undefined, options: LocalRepositoryOptions & { firebase?: FirebaseRepositoryOptions } = {}): HouseholdRepository {
  if (hasCompleteFirebaseConfig(config)) return new FirebaseHouseholdRepository(config, options.firebase);
  if (hasAnyFirebaseConfig(config)) return new ConfigurationErrorRepository(config?.householdId?.trim() || 'family-household', '请完整设置 Firebase apiKey、authDomain、projectId、databaseURL、appId 和 householdId。');
  return new LocalHouseholdRepository(config?.householdId?.trim() || 'local-household', options);
}
