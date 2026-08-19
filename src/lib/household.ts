import type { InventoryTracking, MealIngredient, MealRecipe, MealState } from './mealEngine.ts';
import { MEAL_TARGET_OPTIONS, TIME_PREFERENCES, checkoutUnitsForSelection, defaultMealState, easyBraiseAddonIngredientIds, reconcileMealState } from './mealEngine.ts';

/** Values stored for an Ingredient in household state. `true` is presence-only on. */
export type InventoryValue = true | number;
export type Inventory = Record<string, InventoryValue>;
export type CurrentMealStatus = 'selecting' | 'ready' | 'cooking';
export type MealActiveStep = 'inventory' | 'recipes' | 'cook' | 'checkout';
export interface SelectedAddon { mainRecipeId: string; addonType: string; ingredientId: string; }

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
  /** Ingredients deliberately excluded from this meal's in-stock snapshot. */
  excludedIngredientIds: string[];
  /** Shared checkout draft; values are presence toggles or counted-unit steps. */
  checkoutDraft: CheckoutConsumption;
  createdAt?: number;
}

export interface CompletedMeal {
  mealId: string;
  completedAt: number;
  recipeIds: string[];
}

export interface HouseholdState {
  inventory: Inventory;
  currentMeal: CurrentMeal | null;
  activeStep: MealActiveStep;
  /** Newest first; retained only to reduce short-term Recipe repetition. */
  recentMeals: CompletedMeal[];
}

export type CheckoutConsumption = Record<string, number | boolean>;

export const COUNTED_INVENTORY_STEP = 0.5;
export const RECENT_MEAL_LIMIT = 4;
export const OPTIONAL_ADDON_INITIAL_UNITS = 1;

const isStepAligned = (value: number) => Number.isFinite(value) && Math.abs(value / COUNTED_INVENTORY_STEP - Math.round(value / COUNTED_INVENTORY_STEP)) < 1e-9;
const isPositiveCountedInventoryValue = (value: number) => value > 0 && isStepAligned(value);
export const roundCountedInventoryValue = (value: number) => Math.round(value / COUNTED_INVENTORY_STEP) * COUNTED_INVENTORY_STEP;

/** Ingredient data is the authority for inventory tracking mode. */
export function trackingForIngredient(ingredientId: string, ingredients?: MealIngredient[] | Record<string, MealIngredient>): InventoryTracking {
  const item = Array.isArray(ingredients)
    ? ingredients.find((candidate) => candidate.id === ingredientId)
    : ingredients?.[ingredientId];
  return item?.inventoryTracking ?? 'counted';
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
      if (raw === true || (typeof raw === 'number' && Number.isFinite(raw) && raw > 0)) result[id] = true;
      continue;
    }
    if (typeof raw === 'number' && isPositiveCountedInventoryValue(raw)) result[id] = roundCountedInventoryValue(raw);
  }
  return result;
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const uniqueStrings = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))] : [];
const validTimePreferences = new Set<MealState['timePreference']>(TIME_PREFERENCES);
const validMealStatuses = new Set<CurrentMealStatus>(['selecting', 'ready', 'cooking']);
const validActiveSteps = new Set<MealActiveStep>(['inventory', 'recipes', 'cook', 'checkout']);
const isMealTarget = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && MEAL_TARGET_OPTIONS.some((target) => target === value);

/** Restore fields omitted by Realtime Database when empty arrays/objects are written. */
export function normalizeCurrentMeal(value: unknown, ingredients?: MealIngredient[] | Record<string, MealIngredient>): CurrentMeal | null {
  if (!isRecord(value) || typeof value.mealId !== 'string' || !value.mealId.trim()) return null;
  const defaults = defaultMealState();
  const status = typeof value.status === 'string' && validMealStatuses.has(value.status as CurrentMealStatus) ? value.status as CurrentMealStatus : 'selecting';
  const proteinTarget = isMealTarget(value.proteinTarget) ? value.proteinTarget : defaults.proteinTarget;
  const vegetableTarget = isMealTarget(value.vegetableTarget) ? value.vegetableTarget : defaults.vegetableTarget;
  const timePreference = typeof value.timePreference === 'string' && validTimePreferences.has(value.timePreference as MealState['timePreference']) ? value.timePreference as MealState['timePreference'] : defaults.timePreference;
  const rawBindings = isRecord(value.recipeIngredientBindings) ? value.recipeIngredientBindings : {};
  const recipeIngredientBindings: Record<string, string[]> = Object.fromEntries(Object.entries(rawBindings).map(([id, binding]) => [id, uniqueStrings(binding)]));
  const selectedAddons = Array.isArray(value.selectedAddons) ? value.selectedAddons.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.mainRecipeId !== 'string' || typeof entry.addonType !== 'string' || typeof entry.ingredientId !== 'string') return [];
    return [{ mainRecipeId: entry.mainRecipeId, addonType: entry.addonType, ingredientId: entry.ingredientId }];
  }) : [];
  const createdAt = typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) ? value.createdAt : undefined;
  const known = ingredients ? new Set(Array.isArray(ingredients) ? ingredients.map((item) => item.id) : Object.keys(ingredients)) : undefined;
  const excludedIngredientIds = uniqueStrings(value.excludedIngredientIds).filter((id) => !known || known.has(id));
  const checkoutDraft = normalizeCheckoutConsumption(value.checkoutDraft, ingredients);
  return {
    mealId: value.mealId, status, availableIngredientIds: uniqueStrings(value.availableIngredientIds),
    proteinTarget, vegetableTarget, stapleRequired: typeof value.stapleRequired === 'boolean' ? value.stapleRequired : defaults.stapleRequired,
    childMode: typeof value.childMode === 'boolean' ? value.childMode : defaults.childMode, timePreference,
    selectedRecipeIds: uniqueStrings(value.selectedRecipeIds), recipeIngredientBindings, selectedAddons, excludedIngredientIds, checkoutDraft, ...(createdAt === undefined ? {} : { createdAt }),
  };
}

export function normalizeHouseholdState(value: unknown, ingredients?: MealIngredient[] | Record<string, MealIngredient>): HouseholdState {
  const record = isRecord(value) ? value : {};
  const currentMeal = normalizeCurrentMeal(record.currentMeal, ingredients);
  const recentMeals = Array.isArray(record.recentMeals) ? record.recentMeals.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.mealId !== 'string' || !entry.mealId.trim() || typeof entry.completedAt !== 'number' || !Number.isFinite(entry.completedAt)) return [];
    const recipeIds = uniqueStrings(entry.recipeIds);
    return recipeIds.length ? [{ mealId: entry.mealId, completedAt: entry.completedAt, recipeIds }] : [];
  }).slice(0, RECENT_MEAL_LIMIT) : [];
  const legacyStep: MealActiveStep = currentMeal?.status === 'cooking' ? 'cook' : currentMeal?.status === 'ready' ? 'recipes' : 'inventory';
  const activeStep = typeof record.activeStep === 'string' && validActiveSteps.has(record.activeStep as MealActiveStep) ? record.activeStep as MealActiveStep : legacyStep;
  return { inventory: normalizeInventory(record.inventory, ingredients), currentMeal, activeStep: currentMeal ? activeStep : 'inventory', recentMeals };
}

export function normalizeCheckoutConsumption(value: unknown, ingredients?: MealIngredient[] | Record<string, MealIngredient>): CheckoutConsumption {
  if (!isRecord(value)) return {};
  const known = ingredients ? new Set(Array.isArray(ingredients) ? ingredients.map((item) => item.id) : Object.keys(ingredients)) : undefined;
  const normalized: CheckoutConsumption = {};
  for (const [id, raw] of Object.entries(value)) {
    if (known && !known.has(id)) continue;
    if (trackingForIngredient(id, ingredients) === 'presence-only') { if (raw === true || raw === false) normalized[id] = raw; }
    else if (typeof raw === 'number' && raw >= 0 && isStepAligned(raw)) normalized[id] = roundCountedInventoryValue(raw);
  }
  return normalized;
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
  if (!isStepAligned(delta)) return inventory;
  const current = typeof inventory[ingredientId] === 'number' ? inventory[ingredientId] : 0;
  const nextValue = Math.max(0, roundCountedInventoryValue(current + delta));
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
    selectedRecipeIds: [], recipeIngredientBindings: {}, selectedAddons: [], excludedIngredientIds: [], checkoutDraft: {}, createdAt: options.createdAt ?? Date.now(),
  };
}

export function mealToEngineState(meal: CurrentMeal): MealState {
  return { availableIngredientIds: [...meal.availableIngredientIds], proteinTarget: meal.proteinTarget, vegetableTarget: meal.vegetableTarget, stapleRequired: meal.stapleRequired, childMode: meal.childMode, timePreference: meal.timePreference, selectedRecipeIds: [...meal.selectedRecipeIds], recipeIngredientBindings: { ...meal.recipeIngredientBindings } };
}

export function engineStateToMeal(meal: CurrentMeal, state: MealState): CurrentMeal {
  return { ...meal, availableIngredientIds: [...state.availableIngredientIds], proteinTarget: state.proteinTarget, vegetableTarget: state.vegetableTarget, stapleRequired: state.stapleRequired, childMode: state.childMode, timePreference: state.timePreference, selectedRecipeIds: [...state.selectedRecipeIds], recipeIngredientBindings: { ...state.recipeIngredientBindings }, selectedAddons: [] };
}

/** Reconcile only current-meal selections; household inventory is deliberately untouched. */
export function reconcileCurrentMeal(meal: CurrentMeal, recipes: Parameters<typeof reconcileMealState>[1], ingredients: Parameters<typeof reconcileMealState>[2] = []): CurrentMeal {
  const state = reconcileMealState(mealToEngineState(meal), recipes, ingredients);
  return { ...engineStateToMeal(meal, state), selectedAddons: [] };
}

export function setCurrentMealStatus(meal: CurrentMeal, status: CurrentMealStatus): CurrentMeal {
  if (status === 'ready' && meal.status !== 'selecting') return meal;
  if (status === 'cooking' && meal.status !== 'ready') return meal;
  if (status === 'selecting' && meal.status === 'cooking') return meal;
  return { ...meal, status };
}

/** A single transaction may advance a completed selection through ready to cooking. */
export function advanceMealToCooking(meal: CurrentMeal): CurrentMeal {
  return setCurrentMealStatus(setCurrentMealStatus(meal, 'ready'), 'cooking');
}

export function setMealActiveStep(state: HouseholdState, step: MealActiveStep): HouseholdState {
  const meal = state.currentMeal;
  if (!meal) return { ...state, activeStep: 'inventory' };
  if (step === 'cook' || step === 'checkout') {
    if (meal.status !== 'cooking') return state;
  } else if (step === 'recipes' && meal.status === 'cooking') return state;
  return { ...state, activeStep: step };
}

export function updateCheckoutDraft(meal: CurrentMeal, draft: CheckoutConsumption, inventory: Inventory, ingredients?: MealIngredient[] | Record<string, MealIngredient>, recipes?: MealRecipe[]): CurrentMeal {
  const defaults = defaultCheckoutConsumption(meal, inventory, ingredients, recipes);
  const normalized = normalizeCheckoutConsumption(draft, ingredients);
  return { ...meal, checkoutDraft: Object.fromEntries(Object.entries(defaults).map(([id, fallback]) => [id, normalized[id] ?? fallback])) };
}

export function resetRecipeSelection(meal: CurrentMeal): CurrentMeal {
  return { ...meal, status: 'selecting', selectedRecipeIds: [], recipeIngredientBindings: {}, selectedAddons: [], checkoutDraft: {} };
}

export function usedIngredientIds(meal: CurrentMeal, recipes?: MealRecipe[]): string[] {
  const known = recipes ? new Set(recipes.map((recipe) => recipe.id)) : undefined;
  return [...new Set(meal.selectedRecipeIds.filter((id) => !known || known.has(id)).flatMap((id) => meal.recipeIngredientBindings[id] ?? []).filter(Boolean))].sort();
}

export function defaultCheckoutConsumption(meal: CurrentMeal, inventory: Inventory, ingredients?: MealIngredient[] | Record<string, MealIngredient>, recipes?: MealRecipe[]): CheckoutConsumption {
  const units = recipes ? checkoutUnitsForSelection(recipes, mealToEngineState(meal)) : {};
  const ids = recipes ? Object.keys(units) : usedIngredientIds(meal);
  const optionalIds = recipes ? easyBraiseAddonIngredientIds(recipes, mealToEngineState(meal), meal.availableIngredientIds, ingredients ?? []) : [];
  const entries: [string, number | boolean][] = ids.map((id): [string, number | boolean] => {
    const tracking = trackingForIngredient(id, ingredients);
    if (tracking === 'presence-only') return [id, false];
    const available = typeof inventory[id] === 'number' ? inventory[id] : 0;
    return [id, Math.min(units[id] ?? 1, available)];
  });
  entries.push(...optionalIds.map((id): [string, number | boolean] => [id, trackingForIngredient(id, ingredients) === 'presence-only' ? false : 0]));
  return Object.fromEntries(entries);
}

export function checkoutDraftForMeal(meal: CurrentMeal, inventory: Inventory, ingredients?: MealIngredient[] | Record<string, MealIngredient>, recipes?: MealRecipe[]) {
  const defaults = defaultCheckoutConsumption(meal, inventory, ingredients, recipes);
  const saved = normalizeCheckoutConsumption(meal.checkoutDraft, ingredients);
  return Object.fromEntries(Object.entries(defaults).map(([id, fallback]) => [id, saved[id] ?? fallback]));
}

export type CheckoutResult = { committed: true; state: HouseholdState } | { committed: false; reason: 'stale-meal' | 'invalid-consumption'; state: HouseholdState };

/** Apply checkout atomically to the supplied current state. Call this from a repository transaction. */
export function applyCheckout(state: HouseholdState, mealId: string, consumption: CheckoutConsumption, ingredients?: MealIngredient[] | Record<string, MealIngredient>, options: { nextMealId?: string; completedAt?: number; recipes?: MealRecipe[] } = {}): CheckoutResult {
  const meal = state.currentMeal;
  if (!meal || meal.mealId !== mealId || meal.status !== 'cooking' || (state.activeStep !== undefined && state.activeStep !== 'checkout')) return { committed: false, reason: 'stale-meal', state };
  const normal = new Set(options.recipes ? Object.keys(checkoutUnitsForSelection(options.recipes, mealToEngineState(meal))) : usedIngredientIds(meal));
  const optional = new Set(options.recipes ? easyBraiseAddonIngredientIds(options.recipes, mealToEngineState(meal), meal.availableIngredientIds, ingredients ?? []) : []);
  const used = new Set([...normal, ...optional]);
  const nextInventory = { ...state.inventory };
  for (const [id, requested] of Object.entries(consumption)) {
    if (!used.has(id)) return { committed: false, reason: 'invalid-consumption', state };
    const tracking = trackingForIngredient(id, ingredients);
    if (tracking === 'presence-only') {
      if (requested !== true && requested !== false) return { committed: false, reason: 'invalid-consumption', state };
      if (requested) delete nextInventory[id];
      continue;
    }
    if (typeof requested !== 'number' || requested < 0 || !isStepAligned(requested)) return { committed: false, reason: 'invalid-consumption', state };
    const current = typeof nextInventory[id] === 'number' ? nextInventory[id] : 0;
    if (requested > current) return { committed: false, reason: 'invalid-consumption', state };
    const remaining = Math.max(0, roundCountedInventoryValue(current - requested));
    if (remaining > 0) nextInventory[id] = remaining; else delete nextInventory[id];
  }
  const completedAt = options.completedAt ?? Date.now();
  const completed = { mealId: meal.mealId, completedAt, recipeIds: [...new Set(meal.selectedRecipeIds)] };
  const recentMeals = [completed, ...(state.recentMeals ?? []).filter((entry) => entry.mealId !== meal.mealId)].filter((entry) => entry.recipeIds.length).slice(0, RECENT_MEAL_LIMIT);
  const currentMeal = createCurrentMealFromInventory(nextInventory, { mealId: options.nextMealId, createdAt: completedAt }, ingredients);
  return { committed: true, state: { inventory: nextInventory, currentMeal, activeStep: 'recipes', recentMeals } };
}

export function createMealId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `meal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
