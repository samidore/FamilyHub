import type { InventoryTracking, MealIngredient, MealState, SelectedAddon } from './mealEngine.ts';
import { defaultMealState, reconcileMealState } from './mealEngine.ts';

/** Values stored for an Ingredient in household state. `true` is presence-only on. */
export type InventoryValue = true | number;
export type Inventory = Record<string, InventoryValue>;
export type CurrentMealStatus = 'selecting' | 'ready' | 'cooking';

export interface CurrentMeal {
  mealId: string;
  status: CurrentMealStatus;
  availableIngredientIds: string[];
  proteinTarget: number;
  vegetableTarget: number;
  stapleRequired: boolean;
  childMode: boolean;
  timePreference: MealState['timePreference'];
  selectedRecipeIds: string[];
  recipeIngredientBindings: Record<string, string[]>;
  selectedAddons: SelectedAddon[];
  createdAt?: number;
}

export interface HouseholdState {
  inventory: Inventory;
  currentMeal: CurrentMeal | null;
}

export type CheckoutConsumption = Record<string, number | boolean>;

export const PRESENCE_ONLY_INGREDIENT_IDS = new Set([
  'eggs', 'rice', 'noodles', 'bread', 'steamed-buns', 'oats', 'white-oil-sausage',
]);

const isFiniteHalfStep = (value: number) => Number.isFinite(value) && value > 0 && Math.abs(value * 2 - Math.round(value * 2)) < 1e-9;

export function trackingForIngredient(ingredientId: string, ingredients?: MealIngredient[] | Record<string, MealIngredient>): InventoryTracking {
  const item = Array.isArray(ingredients)
    ? ingredients.find((candidate) => candidate.id === ingredientId)
    : ingredients?.[ingredientId];
  return item?.inventoryTracking ?? (PRESENCE_ONLY_INGREDIENT_IDS.has(ingredientId) ? 'presence-only' : 'counted');
}

export function inventoryIsOn(value: InventoryValue | undefined, tracking: InventoryTracking = 'counted') {
  return tracking === 'presence-only' ? value === true : typeof value === 'number' && value > 0;
}

/** Normalize untrusted persisted state without inventing any Ingredient facts. */
export function normalizeInventory(inventory: unknown, ingredients?: MealIngredient[] | Record<string, MealIngredient>): Inventory {
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) return {};
  const knownIngredientIds = ingredients
    ? new Set(Array.isArray(ingredients) ? ingredients.map((ingredient) => ingredient.id) : Object.keys(ingredients))
    : undefined;
  const result: Inventory = {};
  for (const [id, raw] of Object.entries(inventory as Record<string, unknown>)) {
    if (knownIngredientIds && !knownIngredientIds.has(id)) continue;
    const tracking = trackingForIngredient(id, ingredients);
    if (tracking === 'presence-only') {
      if (raw === true || raw === 1) result[id] = true;
      continue;
    }
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (isFiniteHalfStep(value)) result[id] = Math.round(value * 2) / 2;
  }
  return result;
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const uniqueStrings = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))] : [];
const validTimePreferences = new Set<MealState['timePreference']>(['any', '30', '45', '60']);
const validMealStatuses = new Set<CurrentMealStatus>(['selecting', 'ready', 'cooking']);

/** Restore fields omitted by Realtime Database when empty arrays/objects are written. */
export function normalizeCurrentMeal(value: unknown): CurrentMeal | null {
  if (!isRecord(value) || typeof value.mealId !== 'string' || !value.mealId.trim()) return null;
  const defaults = defaultMealState();
  const status = typeof value.status === 'string' && validMealStatuses.has(value.status as CurrentMealStatus) ? value.status as CurrentMealStatus : 'selecting';
  const proteinTarget = typeof value.proteinTarget === 'number' && Number.isFinite(value.proteinTarget) && [1, 2, 3].includes(value.proteinTarget) ? value.proteinTarget : defaults.proteinTarget;
  const vegetableTarget = typeof value.vegetableTarget === 'number' && Number.isFinite(value.vegetableTarget) && [1, 2, 3].includes(value.vegetableTarget) ? value.vegetableTarget : defaults.vegetableTarget;
  const timePreference = typeof value.timePreference === 'string' && validTimePreferences.has(value.timePreference as MealState['timePreference']) ? value.timePreference as MealState['timePreference'] : defaults.timePreference;
  const rawBindings = isRecord(value.recipeIngredientBindings) ? value.recipeIngredientBindings : {};
  const recipeIngredientBindings: Record<string, string[]> = Object.fromEntries(Object.entries(rawBindings).map(([id, binding]) => [id, uniqueStrings(binding)]));
  const selectedAddons = Array.isArray(value.selectedAddons) ? value.selectedAddons.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.mainRecipeId !== 'string' || typeof entry.addonType !== 'string' || typeof entry.ingredientId !== 'string') return [];
    return [{ mainRecipeId: entry.mainRecipeId, addonType: entry.addonType, ingredientId: entry.ingredientId }];
  }) : [];
  const createdAt = typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) ? value.createdAt : undefined;
  return {
    mealId: value.mealId, status, availableIngredientIds: uniqueStrings(value.availableIngredientIds),
    proteinTarget, vegetableTarget, stapleRequired: typeof value.stapleRequired === 'boolean' ? value.stapleRequired : defaults.stapleRequired,
    childMode: typeof value.childMode === 'boolean' ? value.childMode : defaults.childMode, timePreference,
    selectedRecipeIds: uniqueStrings(value.selectedRecipeIds), recipeIngredientBindings, selectedAddons, ...(createdAt === undefined ? {} : { createdAt }),
  };
}

export function normalizeHouseholdState(value: unknown, ingredients?: MealIngredient[] | Record<string, MealIngredient>): HouseholdState {
  const record = isRecord(value) ? value : {};
  return { inventory: normalizeInventory(record.inventory, ingredients), currentMeal: normalizeCurrentMeal(record.currentMeal) };
}

export function toggleInventoryItem(inventory: Inventory, ingredientId: string, tracking: InventoryTracking = trackingForIngredient(ingredientId), on?: boolean): Inventory {
  const currentOn = inventoryIsOn(inventory[ingredientId], tracking);
  const nextOn = on ?? !currentOn;
  const next = { ...inventory };
  if (!nextOn) delete next[ingredientId];
  else next[ingredientId] = tracking === 'presence-only' ? true : (typeof next[ingredientId] === 'number' && next[ingredientId] > 0 ? next[ingredientId] : 1);
  return next;
}

export function adjustInventoryItem(inventory: Inventory, ingredientId: string, delta: number, tracking: InventoryTracking = trackingForIngredient(ingredientId)): Inventory {
  if (tracking === 'presence-only') return toggleInventoryItem(inventory, ingredientId, tracking, delta > 0 ? true : delta < 0 ? false : undefined);
  if (!Number.isFinite(delta) || Math.abs(delta * 2 - Math.round(delta * 2)) > 1e-9) return inventory;
  const current = typeof inventory[ingredientId] === 'number' ? inventory[ingredientId] : 0;
  const nextValue = Math.max(0, Math.round((current + delta) * 2) / 2);
  const next = { ...inventory };
  if (nextValue <= 0) delete next[ingredientId];
  else next[ingredientId] = nextValue;
  return next;
}

export const resetInventory = (): Inventory => ({});

export function availableIngredientIds(inventory: Inventory, ingredients?: MealIngredient[] | Record<string, MealIngredient>) {
  return Object.entries(inventory).filter(([id, value]) => inventoryIsOn(value, trackingForIngredient(id, ingredients))).map(([id]) => id).sort();
}

export function createCurrentMealFromInventory(inventory: Inventory, options: Partial<MealState> & { mealId?: string; createdAt?: number } = {}, ingredients?: MealIngredient[] | Record<string, MealIngredient>): CurrentMeal {
  const base = defaultMealState();
  return {
    mealId: options.mealId ?? createMealId(), status: 'selecting',
    availableIngredientIds: availableIngredientIds(inventory, ingredients),
    proteinTarget: options.proteinTarget ?? base.proteinTarget, vegetableTarget: options.vegetableTarget ?? base.vegetableTarget,
    stapleRequired: options.stapleRequired ?? base.stapleRequired, childMode: options.childMode ?? base.childMode, timePreference: options.timePreference ?? base.timePreference,
    selectedRecipeIds: [], recipeIngredientBindings: {}, selectedAddons: [], createdAt: options.createdAt ?? Date.now(),
  };
}

export function mealToEngineState(meal: CurrentMeal): MealState {
  return { availableIngredientIds: [...meal.availableIngredientIds], proteinTarget: meal.proteinTarget, vegetableTarget: meal.vegetableTarget, stapleRequired: meal.stapleRequired, childMode: meal.childMode, timePreference: meal.timePreference, selectedRecipeIds: [...meal.selectedRecipeIds], recipeIngredientBindings: { ...meal.recipeIngredientBindings }, selectedAddons: [...meal.selectedAddons] };
}

export function engineStateToMeal(meal: CurrentMeal, state: MealState): CurrentMeal {
  return { ...meal, availableIngredientIds: [...state.availableIngredientIds], proteinTarget: state.proteinTarget, vegetableTarget: state.vegetableTarget, stapleRequired: state.stapleRequired, childMode: state.childMode, timePreference: state.timePreference, selectedRecipeIds: [...state.selectedRecipeIds], recipeIngredientBindings: { ...state.recipeIngredientBindings }, selectedAddons: [...state.selectedAddons] };
}

/** Reconcile only current-meal selections; household inventory is deliberately untouched. */
export function reconcileCurrentMeal(meal: CurrentMeal, recipes: Parameters<typeof reconcileMealState>[1], ingredients: Parameters<typeof reconcileMealState>[2] = []): CurrentMeal {
  const state = reconcileMealState(mealToEngineState(meal), recipes, ingredients);
  return engineStateToMeal(meal, state);
}

export function setCurrentMealStatus(meal: CurrentMeal, status: CurrentMealStatus): CurrentMeal {
  if (status === 'ready' && meal.status !== 'selecting') return meal;
  if (status === 'cooking' && meal.status !== 'ready') return meal;
  if (status === 'selecting' && meal.status === 'cooking') return meal;
  return { ...meal, status };
}

export function resetRecipeSelection(meal: CurrentMeal): CurrentMeal {
  return { ...meal, status: 'selecting', selectedRecipeIds: [], recipeIngredientBindings: {}, selectedAddons: [] };
}

export function usedIngredientIds(meal: CurrentMeal): string[] {
  return [...new Set([...Object.values(meal.recipeIngredientBindings).flat(), ...meal.selectedAddons.map((entry) => entry.ingredientId)].filter(Boolean))].sort();
}

export function defaultCheckoutConsumption(meal: CurrentMeal, inventory: Inventory, ingredients?: MealIngredient[] | Record<string, MealIngredient>): CheckoutConsumption {
  return Object.fromEntries(usedIngredientIds(meal).map((id) => {
    const tracking = trackingForIngredient(id, ingredients);
    if (tracking === 'presence-only') return [id, false];
    const available = typeof inventory[id] === 'number' ? inventory[id] : 0;
    return [id, Math.min(1, available)];
  }));
}

export type CheckoutResult = { committed: true; state: HouseholdState } | { committed: false; reason: 'stale-meal' | 'invalid-consumption'; state: HouseholdState };

/** Apply checkout atomically to the supplied current state. Call this from a repository transaction. */
export function applyCheckout(state: HouseholdState, mealId: string, consumption: CheckoutConsumption, ingredients?: MealIngredient[] | Record<string, MealIngredient>): CheckoutResult {
  const meal = state.currentMeal;
  if (!meal || meal.mealId !== mealId || meal.status !== 'cooking') return { committed: false, reason: 'stale-meal', state };
  const used = new Set(usedIngredientIds(meal));
  const nextInventory = { ...state.inventory };
  for (const [id, requested] of Object.entries(consumption)) {
    if (!used.has(id)) continue;
    const tracking = trackingForIngredient(id, ingredients);
    if (tracking === 'presence-only') {
      if (requested !== true && requested !== false) return { committed: false, reason: 'invalid-consumption', state };
      if (requested) delete nextInventory[id];
      continue;
    }
    if (typeof requested !== 'number' || !Number.isFinite(requested) || requested < 0 || Math.abs(requested * 2 - Math.round(requested * 2)) > 1e-9) return { committed: false, reason: 'invalid-consumption', state };
    const current = typeof nextInventory[id] === 'number' ? nextInventory[id] : 0;
    const remaining = Math.max(0, Math.round((current - Math.min(requested, current)) * 2) / 2);
    if (remaining > 0) nextInventory[id] = remaining; else delete nextInventory[id];
  }
  return { committed: true, state: { inventory: nextInventory, currentMeal: null } };
}

export function createMealId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `meal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
