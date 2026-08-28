import type { InventoryFreshness, InventoryTracking, MealIngredient, MealOptionalGroup, MealRecipe, MealState, SelectedAddon } from './mealEngine.ts';
import { MEAL_TARGET_OPTIONS, TIME_PREFERENCES, calendarDateKey, checkoutUnitsForSelection, defaultMealState, optionalIngredientForRecipe, reconcileMealState } from './mealEngine.ts';

export type InventoryValue = true | number;
export type Inventory = Record<string, InventoryValue>;
export type InventoryBatches = Record<string, Record<string, number>>;
export type CurrentMealStatus = 'selecting' | 'ready' | 'cooking';
export type MealActiveStep = 'inventory' | 'recipes' | 'cook' | 'checkout';
export type CheckoutConsumption = Record<string, number | boolean>;
export interface CheckoutOptionalAddon { addonType: string; ingredientId: string; }
export interface CheckoutRecipeDraft { bindings: string[]; optionalAddons: CheckoutOptionalAddon[]; consumption: CheckoutConsumption; }
export type CheckoutRecipeDrafts = Record<string, CheckoutRecipeDraft>;

export interface CurrentMeal {
  mealId: string;
  status: CurrentMealStatus;
  availableIngredientIds: string[];
  ingredientFreshnessDates: Record<string, string>;
  proteinTarget: number;
  vegetableTarget: number;
  stapleRequired: boolean;
  childMode: boolean;
  timePreference: MealState['timePreference'];
  selectedRecipeIds: string[];
  recipeIngredientBindings: Record<string, string[]>;
  /** Planned optional choices made during Recipe selection. */
  selectedAddons: SelectedAddon[];
  excludedIngredientIds: string[];
  /** Legacy flat checkout draft retained only for old persisted state. */
  checkoutDraft: CheckoutConsumption;
  /** Actual per-Recipe composition edited by the cook at Checkout. */
  checkoutRecipeDrafts: CheckoutRecipeDrafts;
  createdAt?: number;
}

export interface CompletedMeal { mealId: string; completedAt: number; recipeIds: string[]; }
export interface HouseholdState { inventory: Inventory; inventoryBatches: InventoryBatches; currentMeal: CurrentMeal | null; activeStep: MealActiveStep; recentMeals: CompletedMeal[]; }

export const COUNTED_INVENTORY_STEP = 0.5;
export const RECENT_MEAL_LIMIT = 4;
export const OPTIONAL_ADDON_INITIAL_UNITS = 1;
export const SUPPORTING_PROTEIN_ADDON_TYPE = 'supporting-protein';
export const LEGACY_FIFO_MIGRATION_DATE = '2026-08-18';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const isStepAligned = (value: number) => Number.isFinite(value) && Math.abs(value / COUNTED_INVENTORY_STEP - Math.round(value / COUNTED_INVENTORY_STEP)) < 1e-9;
const isPositiveCountedInventoryValue = (value: number) => value > 0 && isStepAligned(value);
export const roundCountedInventoryValue = (value: number) => Math.round(value / COUNTED_INVENTORY_STEP) * COUNTED_INVENTORY_STEP;
const quantitiesEqual = (left: number, right: number) => Math.abs(left - right) < 1e-9;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const uniqueStrings = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))] : [];
const validTimePreferences = new Set<MealState['timePreference']>(TIME_PREFERENCES);
const validMealStatuses = new Set<CurrentMealStatus>(['selecting', 'ready', 'cooking']);
const validActiveSteps = new Set<MealActiveStep>(['inventory', 'recipes', 'cook', 'checkout']);
const isMealTarget = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && MEAL_TARGET_OPTIONS.some((target) => target === value);

function ingredientRecord(ingredientId: string, ingredients?: MealIngredient[] | Record<string, MealIngredient>) {
  return Array.isArray(ingredients) ? ingredients.find((candidate) => candidate.id === ingredientId) : ingredients?.[ingredientId];
}

export function trackingForIngredient(ingredientId: string, ingredients?: MealIngredient[] | Record<string, MealIngredient>): InventoryTracking { return ingredientRecord(ingredientId, ingredients)?.inventoryTracking ?? 'counted'; }
export function freshnessForIngredient(ingredientId: string, ingredients?: MealIngredient[] | Record<string, MealIngredient>): InventoryFreshness | undefined { return ingredientRecord(ingredientId, ingredients)?.inventoryFreshness; }
const isFifoIngredient = (ingredientId: string, ingredients?: MealIngredient[] | Record<string, MealIngredient>) => trackingForIngredient(ingredientId, ingredients) === 'counted' && freshnessForIngredient(ingredientId, ingredients) === 'fifo';
export function inventoryIsOn(value: InventoryValue | undefined, tracking: InventoryTracking = 'counted') { return tracking === 'presence-only' ? value === true : typeof value === 'number' && value > 0; }

export function normalizeInventory(inventory: unknown, ingredients?: MealIngredient[] | Record<string, MealIngredient>): Inventory {
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) return {};
  const knownIngredientIds = ingredients ? new Set(Array.isArray(ingredients) ? ingredients.map((ingredient) => ingredient.id) : Object.keys(ingredients)) : undefined;
  const result: Inventory = {};
  for (const [id, raw] of Object.entries(inventory as Record<string, unknown>)) {
    if (knownIngredientIds && !knownIngredientIds.has(id)) continue;
    const tracking = trackingForIngredient(id, ingredients);
    if (tracking === 'presence-only') { if (raw === true || (typeof raw === 'number' && Number.isFinite(raw) && raw > 0)) result[id] = true; continue; }
    if (typeof raw === 'number' && isPositiveCountedInventoryValue(raw)) result[id] = roundCountedInventoryValue(raw);
  }
  return result;
}

function normalizeDateMap(value: unknown, known?: Set<string>) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, date]) => (!known || known.has(id)) && typeof date === 'string' && DATE_KEY_PATTERN.test(date)) as [string, string][]);
}

function normalizeBatchRecord(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([date, quantity]) => DATE_KEY_PATTERN.test(date) && typeof quantity === 'number' && isPositiveCountedInventoryValue(quantity)).map(([date, quantity]) => [date, roundCountedInventoryValue(quantity as number)] as const).sort(([left], [right]) => left.localeCompare(right)));
}

export function inventoryBatchTotal(batches: Record<string, number> | undefined) { return roundCountedInventoryValue(Object.values(batches ?? {}).reduce((sum, quantity) => sum + quantity, 0)); }
function addInventoryBatch(batches: Record<string, number>, date: string, quantity: number) {
  if (quantity <= 0) return { ...batches };
  const next = { ...batches }; next[date] = roundCountedInventoryValue((next[date] ?? 0) + quantity);
  return Object.fromEntries(Object.entries(next).sort(([left], [right]) => left.localeCompare(right)));
}

export function consumeInventoryBatches(batches: Record<string, number>, quantity: number) {
  let remaining = roundCountedInventoryValue(quantity); const next = { ...batches };
  for (const date of Object.keys(next).sort()) {
    if (remaining <= 0) break;
    const used = Math.min(next[date], remaining); const rest = roundCountedInventoryValue(next[date] - used); remaining = roundCountedInventoryValue(remaining - used);
    if (rest > 0) next[date] = rest; else delete next[date];
  }
  return remaining > 0 ? null : Object.fromEntries(Object.entries(next).sort(([left], [right]) => left.localeCompare(right)));
}

export function normalizeInventoryBatches(value: unknown, inventory: Inventory, ingredients?: MealIngredient[] | Record<string, MealIngredient>): InventoryBatches {
  const raw = isRecord(value) ? value : {};
  const ids = ingredients ? (Array.isArray(ingredients) ? ingredients.map((item) => item.id) : Object.keys(ingredients)) : Object.keys(raw);
  const result: InventoryBatches = {};
  for (const id of ids) {
    if (!isFifoIngredient(id, ingredients)) continue;
    const quantity = typeof inventory[id] === 'number' ? inventory[id] as number : 0; if (quantity <= 0) continue;
    let batches = normalizeBatchRecord(raw[id]); const total = inventoryBatchTotal(batches);
    if (quantitiesEqual(total, quantity)) { result[id] = batches; continue; }
    if (total < quantity) batches = addInventoryBatch(batches, LEGACY_FIFO_MIGRATION_DATE, roundCountedInventoryValue(quantity - total));
    else batches = consumeInventoryBatches(batches, roundCountedInventoryValue(total - quantity)) ?? {};
    if (inventoryBatchTotal(batches) > 0) result[id] = batches;
  }
  return result;
}

export function reconcileInventoryBatchState(previous: HouseholdState, proposed: HouseholdState, ingredients?: MealIngredient[] | Record<string, MealIngredient>, today = calendarDateKey()): HouseholdState {
  const previousInventory = normalizeInventory(previous.inventory, ingredients); const proposedInventory = normalizeInventory(proposed.inventory, ingredients);
  const previousBatches = normalizeInventoryBatches(previous.inventoryBatches, previousInventory, ingredients); const proposedRawBatches = isRecord(proposed.inventoryBatches) ? proposed.inventoryBatches : {};
  const ids = ingredients ? (Array.isArray(ingredients) ? ingredients.map((item) => item.id) : Object.keys(ingredients)) : []; const nextBatches: InventoryBatches = {};
  for (const id of ids) {
    if (!isFifoIngredient(id, ingredients)) continue;
    const oldQuantity = typeof previousInventory[id] === 'number' ? previousInventory[id] as number : 0; const nextQuantity = typeof proposedInventory[id] === 'number' ? proposedInventory[id] as number : 0;
    if (nextQuantity <= 0) continue;
    const explicitlyProposed = normalizeBatchRecord(proposedRawBatches[id]);
    if (quantitiesEqual(inventoryBatchTotal(explicitlyProposed), nextQuantity) && !quantitiesEqual(nextQuantity, oldQuantity)) { nextBatches[id] = explicitlyProposed; continue; }
    let batches = { ...(previousBatches[id] ?? {}) }; const delta = roundCountedInventoryValue(nextQuantity - oldQuantity);
    if (delta > 0) batches = addInventoryBatch(batches, DATE_KEY_PATTERN.test(today) ? today : calendarDateKey(), delta); else if (delta < 0) batches = consumeInventoryBatches(batches, -delta) ?? {};
    if (!quantitiesEqual(inventoryBatchTotal(batches), nextQuantity)) batches = normalizeInventoryBatches({ [id]: batches }, { [id]: nextQuantity }, Array.isArray(ingredients) ? ingredients.filter((item) => item.id === id) : ingredients ? { [id]: ingredients[id] } : undefined)[id] ?? {};
    if (inventoryBatchTotal(batches) > 0) nextBatches[id] = batches;
  }
  return { ...proposed, inventory: proposedInventory, inventoryBatches: nextBatches };
}

export function freshnessDatesForInventory(inventoryBatches: InventoryBatches, availableIds: string[] | Set<string> | undefined, ingredients?: MealIngredient[] | Record<string, MealIngredient>) {
  const available = availableIds instanceof Set ? availableIds : new Set(availableIds ?? Object.keys(inventoryBatches)); const result: Record<string, string> = {};
  for (const id of available) { if (!isFifoIngredient(id, ingredients)) continue; const dates = Object.keys(inventoryBatches[id] ?? {}).filter((date) => DATE_KEY_PATTERN.test(date)).sort(); if (dates[0]) result[id] = dates[0]; }
  return result;
}

export function normalizeCheckoutConsumption(value: unknown, ingredients?: MealIngredient[] | Record<string, MealIngredient>): CheckoutConsumption {
  if (!isRecord(value)) return {};
  const known = ingredients ? new Set(Array.isArray(ingredients) ? ingredients.map((item) => item.id) : Object.keys(ingredients)) : undefined; const normalized: CheckoutConsumption = {};
  for (const [id, raw] of Object.entries(value)) {
    if (known && !known.has(id)) continue;
    if (trackingForIngredient(id, ingredients) === 'presence-only') { if (raw === true || raw === false) normalized[id] = raw; }
    else if (typeof raw === 'number' && raw >= 0 && isStepAligned(raw)) normalized[id] = roundCountedInventoryValue(raw);
  }
  return normalized;
}

export function normalizeCheckoutRecipeDrafts(value: unknown, ingredients?: MealIngredient[] | Record<string, MealIngredient>): CheckoutRecipeDrafts {
  if (!isRecord(value)) return {};
  const result: CheckoutRecipeDrafts = {};
  for (const [recipeId, raw] of Object.entries(value)) {
    if (!isRecord(raw)) continue;
    const optionalAddons = Array.isArray(raw.optionalAddons) ? raw.optionalAddons.flatMap((entry) => isRecord(entry) && typeof entry.addonType === 'string' && typeof entry.ingredientId === 'string' ? [{ addonType: entry.addonType, ingredientId: entry.ingredientId }] : []) : [];
    result[recipeId] = { bindings: uniqueStrings(raw.bindings), optionalAddons, consumption: normalizeCheckoutConsumption(raw.consumption, ingredients) };
  }
  return result;
}

export function normalizeCurrentMeal(value: unknown, ingredients?: MealIngredient[] | Record<string, MealIngredient>): CurrentMeal | null {
  if (!isRecord(value) || typeof value.mealId !== 'string' || !value.mealId.trim()) return null;
  const defaults = defaultMealState(); const status = typeof value.status === 'string' && validMealStatuses.has(value.status as CurrentMealStatus) ? value.status as CurrentMealStatus : 'selecting';
  const proteinTarget = isMealTarget(value.proteinTarget) ? value.proteinTarget : defaults.proteinTarget; const vegetableTarget = isMealTarget(value.vegetableTarget) ? value.vegetableTarget : defaults.vegetableTarget;
  const timePreference = typeof value.timePreference === 'string' && validTimePreferences.has(value.timePreference as MealState['timePreference']) ? value.timePreference as MealState['timePreference'] : defaults.timePreference;
  const rawBindings = isRecord(value.recipeIngredientBindings) ? value.recipeIngredientBindings : {}; const recipeIngredientBindings: Record<string, string[]> = Object.fromEntries(Object.entries(rawBindings).map(([id, binding]) => [id, uniqueStrings(binding)]));
  const selectedAddons = Array.isArray(value.selectedAddons) ? value.selectedAddons.flatMap((entry) => isRecord(entry) && typeof entry.mainRecipeId === 'string' && typeof entry.addonType === 'string' && typeof entry.ingredientId === 'string' ? [{ mainRecipeId: entry.mainRecipeId, addonType: entry.addonType, ingredientId: entry.ingredientId }] : []) : [];
  const createdAt = typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) ? value.createdAt : undefined; const known = ingredients ? new Set(Array.isArray(ingredients) ? ingredients.map((item) => item.id) : Object.keys(ingredients)) : undefined;
  const excludedIngredientIds = uniqueStrings(value.excludedIngredientIds).filter((id) => !known || known.has(id)); const checkoutDraft = normalizeCheckoutConsumption(value.checkoutDraft, ingredients); const checkoutRecipeDrafts = normalizeCheckoutRecipeDrafts(value.checkoutRecipeDrafts, ingredients); const ingredientFreshnessDates = normalizeDateMap(value.ingredientFreshnessDates, known);
  return { mealId: value.mealId, status, availableIngredientIds: uniqueStrings(value.availableIngredientIds), ingredientFreshnessDates, proteinTarget, vegetableTarget, stapleRequired: typeof value.stapleRequired === 'boolean' ? value.stapleRequired : defaults.stapleRequired, childMode: typeof value.childMode === 'boolean' ? value.childMode : defaults.childMode, timePreference, selectedRecipeIds: uniqueStrings(value.selectedRecipeIds), recipeIngredientBindings, selectedAddons, excludedIngredientIds, checkoutDraft, checkoutRecipeDrafts, ...(createdAt === undefined ? {} : { createdAt }) };
}

export function normalizeHouseholdState(value: unknown, ingredients?: MealIngredient[] | Record<string, MealIngredient>): HouseholdState {
  const record = isRecord(value) ? value : {}; const inventory = normalizeInventory(record.inventory, ingredients); const inventoryBatches = normalizeInventoryBatches(record.inventoryBatches, inventory, ingredients); let currentMeal = normalizeCurrentMeal(record.currentMeal, ingredients);
  if (currentMeal && (!isRecord(record.currentMeal) || !('ingredientFreshnessDates' in record.currentMeal))) currentMeal = { ...currentMeal, ingredientFreshnessDates: freshnessDatesForInventory(inventoryBatches, currentMeal.availableIngredientIds, ingredients) };
  const recentMeals = Array.isArray(record.recentMeals) ? record.recentMeals.flatMap((entry) => { if (!isRecord(entry) || typeof entry.mealId !== 'string' || !entry.mealId.trim() || typeof entry.completedAt !== 'number' || !Number.isFinite(entry.completedAt)) return []; const recipeIds = uniqueStrings(entry.recipeIds); return recipeIds.length ? [{ mealId: entry.mealId, completedAt: entry.completedAt, recipeIds }] : []; }).slice(0, RECENT_MEAL_LIMIT) : [];
  const legacyStep: MealActiveStep = currentMeal?.status === 'cooking' ? 'cook' : currentMeal?.status === 'ready' ? 'recipes' : 'inventory'; const activeStep = typeof record.activeStep === 'string' && validActiveSteps.has(record.activeStep as MealActiveStep) ? record.activeStep as MealActiveStep : legacyStep;
  return { inventory, inventoryBatches, currentMeal, activeStep: currentMeal ? activeStep : 'inventory', recentMeals };
}

export function toggleInventoryItem(inventory: Inventory, ingredientId: string, tracking: InventoryTracking = trackingForIngredient(ingredientId), on?: boolean): Inventory {
  const currentOn = inventoryIsOn(inventory[ingredientId], tracking); const nextOn = on ?? !currentOn; const next = { ...inventory };
  if (!nextOn) delete next[ingredientId]; else next[ingredientId] = tracking === 'presence-only' ? true : (typeof next[ingredientId] === 'number' && next[ingredientId] > 0 ? next[ingredientId] : 1); return next;
}
export function adjustInventoryItem(inventory: Inventory, ingredientId: string, delta: number, tracking: InventoryTracking = trackingForIngredient(ingredientId)): Inventory {
  if (tracking === 'presence-only') return toggleInventoryItem(inventory, ingredientId, tracking, delta > 0 ? true : delta < 0 ? false : undefined); if (!isStepAligned(delta)) return inventory;
  const current = typeof inventory[ingredientId] === 'number' ? inventory[ingredientId] : 0; const nextValue = Math.max(0, roundCountedInventoryValue(current + delta)); const next = { ...inventory }; if (nextValue <= 0) delete next[ingredientId]; else next[ingredientId] = nextValue; return next;
}
export const resetInventory = (): Inventory => ({});
export function availableIngredientIds(inventory: Inventory, ingredients?: MealIngredient[] | Record<string, MealIngredient>) { return Object.entries(inventory).filter(([id, value]) => inventoryIsOn(value, trackingForIngredient(id, ingredients))).map(([id]) => id).sort(); }

export function createCurrentMealFromInventory(inventory: Inventory, options: Partial<MealState> & { mealId?: string; createdAt?: number } = {}, ingredients?: MealIngredient[] | Record<string, MealIngredient>, inventoryBatches: InventoryBatches = {}): CurrentMeal {
  const base = defaultMealState(); const available = availableIngredientIds(inventory, ingredients);
  return { mealId: options.mealId ?? createMealId(), status: 'selecting', availableIngredientIds: available, ingredientFreshnessDates: options.ingredientFreshnessDates ?? freshnessDatesForInventory(inventoryBatches, available, ingredients), proteinTarget: options.proteinTarget ?? base.proteinTarget, vegetableTarget: options.vegetableTarget ?? base.vegetableTarget, stapleRequired: options.stapleRequired ?? base.stapleRequired, childMode: options.childMode ?? base.childMode, timePreference: options.timePreference ?? base.timePreference, selectedRecipeIds: [], recipeIngredientBindings: {}, selectedAddons: [], excludedIngredientIds: [], checkoutDraft: {}, checkoutRecipeDrafts: {}, createdAt: options.createdAt ?? Date.now() };
}

export function mealToEngineState(meal: CurrentMeal): MealState { return { availableIngredientIds: [...meal.availableIngredientIds], ingredientFreshnessDates: { ...meal.ingredientFreshnessDates }, proteinTarget: meal.proteinTarget, vegetableTarget: meal.vegetableTarget, stapleRequired: meal.stapleRequired, childMode: meal.childMode, timePreference: meal.timePreference, selectedRecipeIds: [...meal.selectedRecipeIds], recipeIngredientBindings: { ...meal.recipeIngredientBindings }, selectedAddons: [...meal.selectedAddons] }; }
export function engineStateToMeal(meal: CurrentMeal, state: MealState): CurrentMeal { return { ...meal, availableIngredientIds: [...state.availableIngredientIds], ingredientFreshnessDates: { ...(state.ingredientFreshnessDates ?? meal.ingredientFreshnessDates) }, proteinTarget: state.proteinTarget, vegetableTarget: state.vegetableTarget, stapleRequired: state.stapleRequired, childMode: state.childMode, timePreference: state.timePreference, selectedRecipeIds: [...state.selectedRecipeIds], recipeIngredientBindings: { ...state.recipeIngredientBindings }, selectedAddons: [...(state.selectedAddons ?? [])] }; }

export function validOptionalAddons(meal: CurrentMeal, recipes: MealRecipe[], optionalGroups: MealOptionalGroup[]) {
  const selected = new Set(meal.selectedRecipeIds); const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe])); const seen = new Set<string>();
  return meal.selectedAddons.filter((addon) => {
    const recipe = recipeMap.get(addon.mainRecipeId); if (!recipe || !selected.has(recipe.id) || !optionalIngredientForRecipe(recipe, addon.addonType, addon.ingredientId, optionalGroups)) return false;
    if ((meal.recipeIngredientBindings[recipe.id] ?? []).includes(addon.ingredientId)) return false;
    const key = `${addon.mainRecipeId}\u0000${addon.addonType}\u0000${addon.ingredientId}`; if (seen.has(key)) return false; seen.add(key); return true;
  });
}

export function toggleRecipeOptionalAddon(meal: CurrentMeal, recipeId: string, groupId: string, ingredientId: string, selected: boolean, recipes: MealRecipe[], optionalGroups: MealOptionalGroup[]): CurrentMeal {
  if (!meal.selectedRecipeIds.includes(recipeId)) return meal; const recipe = recipes.find((item) => item.id === recipeId); if (!recipe || !optionalIngredientForRecipe(recipe, groupId, ingredientId, optionalGroups)) return meal;
  if (selected && (!meal.availableIngredientIds.includes(ingredientId) || (meal.recipeIngredientBindings[recipeId] ?? []).includes(ingredientId))) return meal;
  const existing = validOptionalAddons(meal, recipes, optionalGroups).filter((addon) => !(addon.mainRecipeId === recipeId && addon.addonType === groupId && addon.ingredientId === ingredientId));
  if (selected) existing.push({ mainRecipeId: recipeId, addonType: groupId, ingredientId });
  return { ...meal, selectedAddons: existing, checkoutDraft: {}, checkoutRecipeDrafts: {} };
}

/** Legacy supporting-protein helpers remain readable until old persisted meals age out. */
function supportingProteinIds(recipe: MealRecipe | undefined) { const value = recipe?.supportingProteinIngredientIds; return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.length > 0) : []; }
export function selectedSupportingProteinId(meal: CurrentMeal, recipeId: string, _recipes?: MealRecipe[]) { return meal.selectedAddons.find((addon) => addon.mainRecipeId === recipeId && addon.addonType === SUPPORTING_PROTEIN_ADDON_TYPE)?.ingredientId ?? null; }
export function setSupportingProteinAddon(meal: CurrentMeal, recipeId: string, ingredientId: string | null, recipes: MealRecipe[]): CurrentMeal {
  const recipe = recipes.find((item) => item.id === recipeId); if (!recipe || !meal.selectedRecipeIds.includes(recipeId)) return meal; const allowed = supportingProteinIds(recipe); if (ingredientId && (!allowed.includes(ingredientId) || !meal.availableIngredientIds.includes(ingredientId))) return meal;
  const selectedAddons = meal.selectedAddons.filter((addon) => !(addon.mainRecipeId === recipeId && addon.addonType === SUPPORTING_PROTEIN_ADDON_TYPE)); if (ingredientId) selectedAddons.push({ mainRecipeId: recipeId, addonType: SUPPORTING_PROTEIN_ADDON_TYPE, ingredientId }); return { ...meal, selectedAddons, checkoutDraft: {}, checkoutRecipeDrafts: {} };
}

export function reconcileCurrentMeal(meal: CurrentMeal, recipes: MealRecipe[], ingredients: MealIngredient[] | Record<string, MealIngredient> = [], optionalGroups: MealOptionalGroup[] = []): CurrentMeal {
  const state = reconcileMealState(mealToEngineState(meal), recipes, ingredients, optionalGroups); const reconciled = engineStateToMeal(meal, state); return { ...reconciled, selectedAddons: optionalGroups.length ? validOptionalAddons(reconciled, recipes, optionalGroups) : reconciled.selectedAddons };
}

export function setCurrentMealStatus(meal: CurrentMeal, status: CurrentMealStatus): CurrentMeal { if (status === 'ready' && meal.status !== 'selecting') return meal; if (status === 'cooking' && meal.status !== 'ready') return meal; if (status === 'selecting' && meal.status === 'cooking') return meal; return { ...meal, status }; }
export function advanceMealToCooking(meal: CurrentMeal): CurrentMeal { return setCurrentMealStatus(setCurrentMealStatus(meal, 'ready'), 'cooking'); }
export function setMealActiveStep(state: HouseholdState, step: MealActiveStep): HouseholdState { const meal = state.currentMeal; if (!meal) return { ...state, activeStep: 'inventory' }; if ((step === 'cook' || step === 'checkout') && meal.status !== 'cooking') return state; if (step === 'recipes' && meal.status === 'cooking') return state; return { ...state, activeStep: step }; }

export function resetRecipeSelection(meal: CurrentMeal): CurrentMeal { return { ...meal, status: 'selecting', selectedRecipeIds: [], recipeIngredientBindings: {}, selectedAddons: [], checkoutDraft: {}, checkoutRecipeDrafts: {} }; }
export function usedIngredientIds(meal: CurrentMeal, recipes?: MealRecipe[]): string[] { const known = recipes ? new Set(recipes.map((recipe) => recipe.id)) : undefined; return [...new Set(meal.selectedRecipeIds.filter((id) => !known || known.has(id)).flatMap((id) => meal.recipeIngredientBindings[id] ?? []).filter(Boolean))].sort(); }

/** Legacy flat checkout helpers, retained for persisted drafts and focused compatibility tests. */
export function defaultCheckoutConsumption(meal: CurrentMeal, inventory: Inventory, ingredients?: MealIngredient[] | Record<string, MealIngredient>, recipes?: MealRecipe[]): CheckoutConsumption {
  const units = recipes ? checkoutUnitsForSelection(recipes, mealToEngineState(meal)) : Object.fromEntries(usedIngredientIds(meal).map((id) => [id, 1]));
  return Object.fromEntries(Object.entries(units).map(([id, unitsValue]) => trackingForIngredient(id, ingredients) === 'presence-only' ? [id, false] : [id, Math.min(unitsValue, typeof inventory[id] === 'number' ? inventory[id] as number : 0)]));
}
export function checkoutDraftForMeal(meal: CurrentMeal, inventory: Inventory, ingredients?: MealIngredient[] | Record<string, MealIngredient>, recipes?: MealRecipe[]) { const defaults = defaultCheckoutConsumption(meal, inventory, ingredients, recipes); const saved = normalizeCheckoutConsumption(meal.checkoutDraft, ingredients); return Object.fromEntries(Object.entries(defaults).map(([id, fallback]) => [id, saved[id] ?? fallback])); }
export function updateCheckoutDraft(meal: CurrentMeal, draft: CheckoutConsumption, inventory: Inventory, ingredients?: MealIngredient[] | Record<string, MealIngredient>, recipes?: MealRecipe[]): CurrentMeal { const defaults = defaultCheckoutConsumption(meal, inventory, ingredients, recipes); const normalized = normalizeCheckoutConsumption(draft, ingredients); return { ...meal, checkoutDraft: Object.fromEntries(Object.entries(defaults).map(([id, fallback]) => [id, normalized[id] ?? fallback])) }; }

export function defaultCheckoutRecipeDrafts(meal: CurrentMeal, inventory: Inventory, ingredients: MealIngredient[] | Record<string, MealIngredient>, recipes: MealRecipe[], optionalGroups: MealOptionalGroup[]): CheckoutRecipeDrafts {
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe])); const planned = validOptionalAddons(meal, recipes, optionalGroups); const result: CheckoutRecipeDrafts = {};
  const remaining: Record<string, number> = Object.fromEntries(Object.entries(inventory).filter(([, value]) => typeof value === 'number').map(([id, value]) => [id, value as number]));
  const allocate = (id: string, units: number) => {
    if (trackingForIngredient(id, ingredients) === 'presence-only') return false;
    const available = remaining[id] ?? 0; const value = Math.min(units, available); remaining[id] = roundCountedInventoryValue(Math.max(0, available - value)); return value;
  };
  for (const recipeId of meal.selectedRecipeIds) {
    const recipe = recipeMap.get(recipeId); if (!recipe) continue; const bindings = [...(meal.recipeIngredientBindings[recipeId] ?? [])]; const optionals = planned.filter((addon) => addon.mainRecipeId === recipeId).map(({ addonType, ingredientId }) => ({ addonType, ingredientId })); const consumption: CheckoutConsumption = {};
    const addDefault = (id: string, units: number) => { const value = allocate(id, units); if (typeof value === 'boolean') consumption[id] = Boolean(consumption[id]) || value; else consumption[id] = roundCountedInventoryValue((typeof consumption[id] === 'number' ? consumption[id] as number : 0) + value); };
    bindings.forEach((id) => addDefault(id, recipe.checkoutUnits?.[id] ?? 1));
    optionals.forEach((addon) => { const entry = optionalIngredientForRecipe(recipe, addon.addonType, addon.ingredientId, optionalGroups); if (entry) addDefault(addon.ingredientId, entry.checkoutUnits); });
    result[recipeId] = { bindings, optionalAddons: optionals, consumption };
  }
  return result;
}

export function checkoutRecipeDraftsForMeal(meal: CurrentMeal, inventory: Inventory, ingredients: MealIngredient[] | Record<string, MealIngredient>, recipes: MealRecipe[], optionalGroups: MealOptionalGroup[]): CheckoutRecipeDrafts {
  const defaults = defaultCheckoutRecipeDrafts(meal, inventory, ingredients, recipes, optionalGroups); const saved = normalizeCheckoutRecipeDrafts(meal.checkoutRecipeDrafts, ingredients); const result: CheckoutRecipeDrafts = {};
  for (const [recipeId, fallback] of Object.entries(defaults)) result[recipeId] = saved[recipeId] ?? fallback;
  return result;
}

export function updateCheckoutRecipeDrafts(meal: CurrentMeal, drafts: CheckoutRecipeDrafts, ingredients?: MealIngredient[] | Record<string, MealIngredient>): CurrentMeal { return { ...meal, checkoutRecipeDrafts: normalizeCheckoutRecipeDrafts(drafts, ingredients) }; }

function validateCheckoutRecipeDrafts(meal: CurrentMeal, drafts: CheckoutRecipeDrafts, recipes: MealRecipe[], optionalGroups: MealOptionalGroup[], ingredients?: MealIngredient[] | Record<string, MealIngredient>) {
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe])); const totals: CheckoutConsumption = {};
  for (const recipeId of meal.selectedRecipeIds) {
    const recipe = recipeMap.get(recipeId); const draft = drafts[recipeId]; if (!recipe || !draft || draft.bindings.length !== recipe.requirements.length) return null;
    for (const [index, requirement] of recipe.requirements.entries()) if (!requirement.anyOf.includes(draft.bindings[index])) return null;
    const allowedIds = new Set(draft.bindings); const seenOptionals = new Set<string>();
    for (const addon of draft.optionalAddons) {
      if (allowedIds.has(addon.ingredientId) || !optionalIngredientForRecipe(recipe, addon.addonType, addon.ingredientId, optionalGroups)) return null;
      const key = `${addon.addonType}\u0000${addon.ingredientId}`; if (seenOptionals.has(key)) return null; seenOptionals.add(key); allowedIds.add(addon.ingredientId);
    }
    for (const [id, requested] of Object.entries(draft.consumption)) {
      if (!allowedIds.has(id)) return null;
      if (trackingForIngredient(id, ingredients) === 'presence-only') { if (requested !== true && requested !== false) return null; totals[id] = Boolean(totals[id]) || requested; }
      else { if (typeof requested !== 'number' || requested < 0 || !isStepAligned(requested)) return null; totals[id] = roundCountedInventoryValue((typeof totals[id] === 'number' ? totals[id] as number : 0) + requested); }
    }
  }
  return totals;
}

export type CheckoutResult = { committed: true; state: HouseholdState } | { committed: false; reason: 'stale-meal' | 'invalid-consumption'; state: HouseholdState };

function consumeAggregatedCheckout(state: HouseholdState, meal: CurrentMeal, totals: CheckoutConsumption, ingredients?: MealIngredient[] | Record<string, MealIngredient>, options: { nextMealId?: string; completedAt?: number } = {}): CheckoutResult {
  const nextInventory = { ...state.inventory }; const nextBatches: InventoryBatches = Object.fromEntries(Object.entries(normalizeInventoryBatches(state.inventoryBatches, state.inventory, ingredients)).map(([id, batches]) => [id, { ...batches }]));
  for (const [id, requested] of Object.entries(totals)) {
    const tracking = trackingForIngredient(id, ingredients);
    if (tracking === 'presence-only') { if (requested !== true && requested !== false) return { committed: false, reason: 'invalid-consumption', state }; if (requested) delete nextInventory[id]; continue; }
    if (typeof requested !== 'number' || requested < 0 || !isStepAligned(requested)) return { committed: false, reason: 'invalid-consumption', state }; const current = typeof nextInventory[id] === 'number' ? nextInventory[id] as number : 0; if (requested > current) return { committed: false, reason: 'invalid-consumption', state };
    if (requested > 0 && isFifoIngredient(id, ingredients)) { const consumed = consumeInventoryBatches(nextBatches[id] ?? {}, requested); if (!consumed) return { committed: false, reason: 'invalid-consumption', state }; if (inventoryBatchTotal(consumed) > 0) nextBatches[id] = consumed; else delete nextBatches[id]; }
    const remaining = Math.max(0, roundCountedInventoryValue(current - requested)); if (remaining > 0) nextInventory[id] = remaining; else delete nextInventory[id];
  }
  const completedAt = options.completedAt ?? Date.now(); const completed = { mealId: meal.mealId, completedAt, recipeIds: [...new Set(meal.selectedRecipeIds)] }; const recentMeals = [completed, ...(state.recentMeals ?? []).filter((entry) => entry.mealId !== meal.mealId)].filter((entry) => entry.recipeIds.length).slice(0, RECENT_MEAL_LIMIT); const currentMeal = createCurrentMealFromInventory(nextInventory, { mealId: options.nextMealId, createdAt: completedAt }, ingredients, nextBatches);
  return { committed: true, state: { inventory: nextInventory, inventoryBatches: nextBatches, currentMeal, activeStep: 'recipes', recentMeals } };
}

export function applyCheckoutComposition(state: HouseholdState, mealId: string, drafts: CheckoutRecipeDrafts, ingredients: MealIngredient[] | Record<string, MealIngredient>, options: { nextMealId?: string; completedAt?: number; recipes: MealRecipe[]; optionalGroups: MealOptionalGroup[] }): CheckoutResult {
  const meal = state.currentMeal; if (!meal || meal.mealId !== mealId || meal.status !== 'cooking' || state.activeStep !== 'checkout') return { committed: false, reason: 'stale-meal', state };
  const totals = validateCheckoutRecipeDrafts(meal, drafts, options.recipes, options.optionalGroups, ingredients); if (!totals) return { committed: false, reason: 'invalid-consumption', state }; return consumeAggregatedCheckout(state, meal, totals, ingredients, options);
}

/** Legacy flat checkout entry point. */
export function applyCheckout(state: HouseholdState, mealId: string, consumption: CheckoutConsumption, ingredients?: MealIngredient[] | Record<string, MealIngredient>, options: { nextMealId?: string; completedAt?: number; recipes?: MealRecipe[] } = {}): CheckoutResult {
  const meal = state.currentMeal; if (!meal || meal.mealId !== mealId || meal.status !== 'cooking' || (state.activeStep !== undefined && state.activeStep !== 'checkout')) return { committed: false, reason: 'stale-meal', state };
  const used = new Set(options.recipes ? Object.keys(checkoutUnitsForSelection(options.recipes, mealToEngineState(meal))) : usedIngredientIds(meal)); for (const id of Object.keys(consumption)) if (!used.has(id)) return { committed: false, reason: 'invalid-consumption', state }; return consumeAggregatedCheckout(state, meal, consumption, ingredients, options);
}

export function createMealId() { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID(); return `meal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
