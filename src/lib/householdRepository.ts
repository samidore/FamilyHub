import {
  applyCheckout,
  createCurrentMealFromInventory,
  createMealId,
  normalizeHouseholdState,
  cleanupDiscardedStock,
  reconcileInventoryBatchState,
  type CheckoutConsumption,
  type CheckoutResult,
  type CurrentMeal,
  type HouseholdState,
  type Inventory,
} from './household.ts';
import type { MealIngredient, MealRecipe, MealState } from './mealEngine.ts';
import { hasLegacyChickenThighIngredientIds, migrateLegacyChickenThighIngredientIds } from './mealIngredientIdMigration.ts';
import {
  FirebaseHouseholdSession,
  googleIdentity,
  hasAnyFirebaseConfig,
  hasCompleteFirebaseConfig,
  shouldUseRedirectFallback,
  type FirebaseConfig,
  type HouseholdSessionStatus,
} from './householdSession.ts';
import { onValue, ref, runTransaction, type DatabaseReference, type DataSnapshot } from 'firebase/database';

export type { FirebaseConfig } from './householdSession.ts';
export { firebaseConfigKeys, googleIdentity, hasAnyFirebaseConfig, hasCompleteFirebaseConfig, shouldUseRedirectFallback } from './householdSession.ts';

export type RepositoryConnection = 'local' | 'signed-out' | 'connecting' | 'pending' | 'connected' | 'error';
export interface RepositoryStatus {
  connection: RepositoryConnection;
  label: string;
  uid?: string;
  email?: string;
  displayName?: string;
  enrollmentOpen?: boolean;
  error?: string;
}
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
  signInWithGoogle(): Promise<void>;
  refreshAccess(): Promise<void>;
  signOut(): Promise<void>;
  dispose(): void;
}

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }
interface LocalRepositoryOptions { storage?: StorageLike; window?: Window; broadcast?: boolean; ingredients?: MealIngredient[] | Record<string, MealIngredient>; recipes?: MealRecipe[]; }
interface FirebaseRepositoryOptions { ingredients?: MealIngredient[] | Record<string, MealIngredient>; recipes?: MealRecipe[]; }

const fallbackStores = new Map<string, string>();
const memoryStorage: StorageLike = {
  getItem: (key) => fallbackStores.get(key) ?? null,
  setItem: (key, value) => void fallbackStores.set(key, value),
  removeItem: (key) => void fallbackStores.delete(key),
};
const LOCAL_STATUS: RepositoryStatus = { connection: 'local', label: '本地家庭同步' };

function browserStorage(): StorageLike {
  try { return typeof localStorage === 'undefined' ? memoryStorage : localStorage; } catch { return memoryStorage; }
}

function cloneState(state: HouseholdState): HouseholdState {
  return JSON.parse(JSON.stringify(state)) as HouseholdState;
}

function normalizePersistedState(value: unknown, ingredients?: MealIngredient[] | Record<string, MealIngredient>) {
  return normalizeHouseholdState(migrateLegacyChickenThighIngredientIds(value), ingredients);
}
function hasExpiredDiscardedStock(state: HouseholdState, now = Date.now()) { return Object.values(state.discardedStock).some((record) => record.undoUntil <= now); }

export class LocalHouseholdRepository implements HouseholdRepository {
  readonly kind = 'local' as const;
  readonly householdId: string;
  private readonly key: string;
  private readonly storage: StorageLike;
  private readonly browserWindow?: Window;
  private readonly listeners = new Set<StateListener>();
  private readonly ingredients?: MealIngredient[] | Record<string, MealIngredient>;
  private readonly recipes?: MealRecipe[];
  private readonly channel?: BroadcastChannel;
  private state: HouseholdState;
  private status: RepositoryStatus = { ...LOCAL_STATUS };

  constructor(householdId = 'local-household', options: LocalRepositoryOptions = {}) {
    this.householdId = householdId;
    this.key = `family-hub-household-${householdId}`;
    this.storage = options.storage ?? browserStorage();
    this.browserWindow = options.window ?? (typeof window === 'undefined' ? undefined : window);
    this.ingredients = options.ingredients;
    this.recipes = options.recipes;
    try {
      const stored = JSON.parse(this.storage.getItem(this.key) ?? 'null');
      this.state = normalizePersistedState(stored, this.ingredients);
      const cleaned = cleanupDiscardedStock(this.state);
      if (hasLegacyChickenThighIngredientIds(stored) || hasExpiredDiscardedStock(this.state)) { this.state = cleaned; this.storage.setItem(this.key, JSON.stringify(this.state)); }
    } catch { this.state = normalizePersistedState(undefined, this.ingredients); }
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
    const current = cleanupDiscardedStock(normalizePersistedState(JSON.parse(this.storage.getItem(this.key) ?? 'null'), this.ingredients));
    const proposed = mutator(cloneState(current));
    const next = normalizeHouseholdState(reconcileInventoryBatchState(current, proposed, this.ingredients), this.ingredients);
    this.persist(next);
    return this.getSnapshot();
  }
  transaction(mutator: (current: HouseholdState) => HouseholdState) { return this.update(mutator); }
  async setInventory(inventory: Inventory) { return this.update((state) => ({ ...state, inventory })); }
  async updateInventory(mutator: (inventory: Inventory) => Inventory) { return this.update((state) => ({ ...state, inventory: mutator({ ...state.inventory }) })); }
  async setCurrentMeal(currentMeal: CurrentMeal | null) { return this.update((state) => ({ ...state, currentMeal })); }
  async startCurrentMeal(options: Partial<MealState> = {}) {
    return this.update((state) => state.currentMeal ? state : ({ ...state, currentMeal: createCurrentMealFromInventory(state.inventory, options, this.ingredients, state.inventoryBatches) }));
  }
  async updateCurrentMeal(mutator: (currentMeal: CurrentMeal) => CurrentMeal) {
    return this.update((state) => state.currentMeal ? { ...state, currentMeal: mutator({ ...state.currentMeal }) } : state);
  }
  resetInventory() { return this.setInventory({}); }
  async checkout(mealId: string, consumption: CheckoutConsumption) {
    const options = { nextMealId: createMealId(), completedAt: Date.now(), recipes: this.recipes };
    let result: CheckoutResult = { committed: false, reason: 'stale-meal', state: this.getSnapshot() };
    await this.update((state) => { result = applyCheckout(state, mealId, consumption, this.ingredients, options); return result.state; });
    return { ...result, state: this.getSnapshot() };
  }
  async signInWithGoogle() { /* Local development needs no authentication. */ }
  async refreshAccess() { /* Local development is always ready. */ }
  async signOut() { /* Local development has no session. */ }
  dispose() { this.browserWindow?.removeEventListener('storage', this.handleStorage); this.channel?.close(); this.listeners.clear(); }

  private readonly handleStorage = (event: StorageEvent) => { if (event.key === this.key && event.newValue) this.receive(JSON.parse(event.newValue)); };
  private receive(value: unknown) {
    const incoming = value && typeof value === 'object' && 'state' in value ? (value as { state: unknown }).state : value;
    this.state = normalizePersistedState(incoming as Partial<HouseholdState>, this.ingredients);
    this.emit();
  }
  private persist(next: HouseholdState) {
    this.state = normalizePersistedState(next, this.ingredients);
    this.storage.setItem(this.key, JSON.stringify(this.state));
    this.channel?.postMessage(this.state);
    this.emit();
  }
  private emit() { const snapshot = this.getSnapshot(); const status = this.getStatus(); for (const listener of this.listeners) listener(snapshot, status); }
}

/** Firebase business-state adapter. Authentication and household identity are delegated to the shared session. */
export class FirebaseHouseholdRepository implements HouseholdRepository {
  readonly kind = 'firebase' as const;
  readonly householdId: string;
  readonly ready: Promise<void>;
  private readonly session: FirebaseHouseholdSession;
  private readonly stateRef: DatabaseReference;
  private readonly ingredients?: MealIngredient[] | Record<string, MealIngredient>;
  private readonly recipes?: MealRecipe[];
  private readonly listeners = new Set<StateListener>();
  private state: HouseholdState = normalizeHouseholdState(undefined);
  private status: RepositoryStatus = { connection: 'connecting', label: '正在恢复登录状态…' };
  private unsubscribeState?: () => void;
  private unsubscribeSession?: () => void;
  private connectedUid = '';
  private disposed = false;

  constructor(config: FirebaseConfig, options: FirebaseRepositoryOptions = {}) {
    this.householdId = config.householdId;
    this.ingredients = options.ingredients;
    this.recipes = options.recipes;
    this.session = new FirebaseHouseholdSession(config);
    this.stateRef = ref(this.session.database, `households/${config.householdId}/state`);
    this.ready = this.initialize();
  }

  getSnapshot() { return cloneState(this.state); }
  getStatus() { return { ...this.status }; }
  subscribe(listener: StateListener) { this.listeners.add(listener); listener(this.getSnapshot(), this.getStatus()); return () => this.listeners.delete(listener); }
  async update(mutator: (current: HouseholdState) => HouseholdState) { return this.transaction(mutator); }
  async transaction(mutator: (current: HouseholdState) => HouseholdState) {
    await this.ready.catch(() => undefined);
    this.assertReady();
    const next = await this.remoteTransaction(mutator);
    this.setState(next);
    return this.getSnapshot();
  }
  setInventory(inventory: Inventory) { return this.update((state) => ({ ...state, inventory })); }
  updateInventory(mutator: (inventory: Inventory) => Inventory) { return this.update((state) => ({ ...state, inventory: mutator({ ...state.inventory }) })); }
  setCurrentMeal(currentMeal: CurrentMeal | null) { return this.update((state) => ({ ...state, currentMeal })); }
  startCurrentMeal(options: Partial<MealState> = {}) { return this.update((state) => state.currentMeal ? state : ({ ...state, currentMeal: createCurrentMealFromInventory(state.inventory, options, this.ingredients, state.inventoryBatches) })); }
  updateCurrentMeal(mutator: (currentMeal: CurrentMeal) => CurrentMeal) { return this.update((state) => state.currentMeal ? { ...state, currentMeal: mutator({ ...state.currentMeal }) } : state); }
  resetInventory() { return this.setInventory({}); }
  async checkout(mealId: string, consumption: CheckoutConsumption) {
    await this.ready.catch(() => undefined);
    this.assertReady();
    let outcome: CheckoutResult | undefined;
    const options = { nextMealId: createMealId(), completedAt: Date.now(), recipes: this.recipes };
    await this.remoteTransaction((state) => { outcome = applyCheckout(state, mealId, consumption, this.ingredients, options); return outcome.state; });
    const result = outcome ?? { committed: false, reason: 'stale-meal' as const, state: this.state };
    this.setState(result.state);
    return { ...result, state: this.getSnapshot() };
  }
  signInWithGoogle() { return this.session.signInWithGoogle(); }
  refreshAccess() { return this.session.refreshAccess(); }
  signOut() { return this.session.signOut(); }
  dispose() {
    this.disposed = true;
    this.stopStateSubscription();
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
      this.stopStateSubscription();
      const snapshot = await import('firebase/database').then(({ get }) => get(this.stateRef));
      if (this.disposed || this.session.getStatus().connection !== 'connected') return;
      this.connectedUid = sessionStatus.uid;
      if (hasLegacyChickenThighIngredientIds(snapshot.val())) {
        const migration = await runTransaction(this.stateRef, (value) => normalizePersistedState(value, this.ingredients));
        if (this.disposed || this.session.getStatus().connection !== 'connected') return;
        this.setState(normalizePersistedState(migration.snapshot.val(), this.ingredients));
      } else {
        this.setStateFromSnapshot(snapshot);
      }
      const current = this.getSnapshot();
      if (hasExpiredDiscardedStock(current)) {
        const cleaned = await runTransaction(this.stateRef, (value) => cleanupDiscardedStock(normalizePersistedState(value, this.ingredients)));
        this.setState(normalizePersistedState(cleaned.snapshot.val(), this.ingredients));
      }
      this.setStatus(this.fromSessionStatus(sessionStatus));
      this.unsubscribeState = onValue(this.stateRef, (next) => this.setStateFromSnapshot(next), (error) => { if (!this.disposed) this.fail('Firebase 实时连接中断', error); });
      return;
    }
    this.connectedUid = '';
    this.stopStateSubscription();
    this.state = normalizeHouseholdState(undefined, this.ingredients);
    this.setStatus(this.fromSessionStatus(sessionStatus));
  }

  private fromSessionStatus(status: HouseholdSessionStatus): RepositoryStatus {
    return { ...status, connection: status.connection };
  }

  private async remoteTransaction(mutator: (state: HouseholdState) => HouseholdState) {
    const transaction = await runTransaction(this.stateRef, (value) => {
      const current = normalizePersistedState(value, this.ingredients);
      const proposed = mutator(cloneState(current));
      return normalizeHouseholdState(reconcileInventoryBatchState(current, proposed, this.ingredients), this.ingredients);
    });
    return normalizePersistedState(transaction.snapshot.val(), this.ingredients);
  }
  private assertReady() { if (this.status.connection !== 'connected') throw new Error(this.status.error ?? '家庭连接尚未准备好'); }
  private setStateFromSnapshot(snapshot: DataSnapshot) { this.setState(normalizePersistedState(snapshot.val(), this.ingredients)); }
  private setState(next: HouseholdState) { this.state = normalizePersistedState(next, this.ingredients); this.emit(); }
  private stopStateSubscription() { this.unsubscribeState?.(); this.unsubscribeState = undefined; }
  private setStatus(status: RepositoryStatus) { this.status = status; this.emit(); }
  private fail(label: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const session = this.session.getStatus();
    this.setStatus({ connection: 'error', label, uid: session.uid, email: session.email, displayName: session.displayName, error: message });
  }
  private emit() { const snapshot = this.getSnapshot(); const status = this.getStatus(); for (const listener of this.listeners) listener(snapshot, status); }
}

class ConfigurationErrorRepository implements HouseholdRepository {
  readonly kind = 'firebase' as const;
  readonly householdId: string;
  readonly ready = Promise.resolve();
  private readonly state = normalizeHouseholdState(undefined);
  private readonly status: RepositoryStatus;
  constructor(householdId: string, error: string) { this.householdId = householdId; this.status = { connection: 'error', label: '家庭连接配置不完整', error }; }
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
  signInWithGoogle(): Promise<void> { return this.reject(); }
  refreshAccess(): Promise<void> { return this.reject(); }
  signOut(): Promise<void> { return Promise.resolve(); }
  dispose() { /* no resources */ }
}

export function createHouseholdRepository(config: Partial<FirebaseConfig> | null | undefined, options: LocalRepositoryOptions & { firebase?: FirebaseRepositoryOptions } = {}): HouseholdRepository {
  if (hasCompleteFirebaseConfig(config)) return new FirebaseHouseholdRepository(config, options.firebase);
  if (hasAnyFirebaseConfig(config)) return new ConfigurationErrorRepository(config?.householdId?.trim() || 'family-household', '请完整设置家庭连接信息和家庭编号。');
  return new LocalHouseholdRepository(config?.householdId?.trim() || 'local-household', options);
}

// Keep the long-standing named exports available to existing callers and tests.
void googleIdentity;
void shouldUseRedirectFallback;
