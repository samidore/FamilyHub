export const MEAL_TARGET_OPTIONS = [1, 2, 3] as const;
export const TIME_PREFERENCES = ['any', '30', '45', '60'] as const;
export const PROTEIN_TARGET_TOLERANCE = 0.5;

export type TimePreference = (typeof TIME_PREFERENCES)[number];
export type RecipeChildCoverage = boolean | 'ingredient-dependent';
export type IngredientChildCoverage = boolean | 'unknown';
export type InventoryTracking = 'counted' | 'presence-only';
export type InventoryFreshness = 'fifo';
export type FreezerBehavior = 'direct' | 'thaw-required';
export type MealContribution = { protein: number; vegetable: number; staple: number };

export interface MealIngredient {
  id: string;
  nameZh?: string;
  nameEn?: string;
  tags?: string[];
  inventoryTracking: InventoryTracking;
  inventoryFreshness?: InventoryFreshness;
  freezerBehavior?: FreezerBehavior;
  freshnessPriorityDays?: number;
  childCoverage?: { vegetable: IngredientChildCoverage };
}

export interface MealOptionalIngredient { ingredientId: string; contribution: MealContribution; checkoutUnits: number; }
export interface MealOptionalGroup { id: string; labelZh: string; ingredients: MealOptionalIngredient[]; }
export interface SelectedAddon { mainRecipeId: string; addonType: string; ingredientId: string; }
export interface MealRequirement { anyOf: string[]; role?: string; amount?: string; preparation?: string; }

export interface MealRecipe {
  id: string;
  order: number;
  fitScore: number;
  contribution: MealContribution;
  childCoverage: { protein: RecipeChildCoverage; vegetable: RecipeChildCoverage };
  requirements: MealRequirement[];
  optionalGroupIds?: string[];
  checkoutUnits?: Record<string, number>;
  ingredientChildCoverage?: Record<string, IngredientChildCoverage>;
  mealWindowMinutes: string;
  elapsedMinutes: string;
  advanceStartRequired: boolean;
  tags?: string[];
  [key: string]: unknown;
}

export interface MealState {
  availableIngredientIds: string[];
  proteinTarget: number;
  vegetableTarget: number;
  stapleRequired: boolean;
  childMode: boolean;
  timePreference: TimePreference;
  selectedRecipeIds: string[];
  recipeIngredientBindings: Record<string, string[]>;
  selectedAddons?: SelectedAddon[];
  ingredientFreshnessDates: Record<string, string>;
}

export interface MealTotals { protein: number; vegetable: number; staple: number; childProtein: boolean; childVegetable: boolean; }

export const defaultMealState = (): MealState => ({
  availableIngredientIds: [], proteinTarget: 1, vegetableTarget: 2, stapleRequired: true, childMode: true, timePreference: 'any', selectedRecipeIds: [],
  recipeIngredientBindings: {}, selectedAddons: [], ingredientFreshnessDates: {},
});

const asSet = (value: Set<string> | string[] | undefined) => value instanceof Set ? value : new Set(value ?? []);
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const zeroContribution = (): MealContribution => ({ protein: 0, vegetable: 0, staple: 0 });
const addContribution = (left: MealContribution, right: MealContribution): MealContribution => ({ protein: left.protein + right.protein, vegetable: left.vegetable + right.vegetable, staple: left.staple + right.staple });

export function calendarDateKey(value: Date | number = new Date()) {
  const date = value instanceof Date ? value : new Date(value); const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`;
}
function calendarDayNumber(value: string) { if (!DATE_KEY_PATTERN.test(value)) return null; const [year, month, day] = value.split('-').map(Number); const timestamp = Date.UTC(year, month - 1, day); const date = new Date(timestamp); if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null; return Math.floor(timestamp / 86_400_000); }
export function freshnessAgeDays(stockedOn: string, today = calendarDateKey()) { const stocked = calendarDayNumber(stockedOn); const current = calendarDayNumber(today); return stocked === null || current === null ? 0 : Math.max(0, current - stocked); }
function preferredFreshnessChoice(ids: string[], freshnessDates: Record<string, string>) { const dated = ids.filter((id) => DATE_KEY_PATTERN.test(freshnessDates[id] ?? '')); if (!dated.length) return ids[0] ?? null; return dated.reduce((oldest, id) => freshnessDates[id] < freshnessDates[oldest] ? id : oldest); }

export function bindRecipeIngredients(recipe: MealRecipe, available: Set<string> | string[], existing: (string | null | undefined)[] = [], ingredientFreshnessDates: Record<string, string> = {}) {
  const availableSet = asSet(available); return recipe.requirements.map((requirement, index) => { const prior = existing[index]; if (prior && requirement.anyOf.includes(prior) && availableSet.has(prior)) return prior; return preferredFreshnessChoice(requirement.anyOf.filter((id) => availableSet.has(id)), ingredientFreshnessDates); });
}
export const resolveRecipeBinding = bindRecipeIngredients;
export const isFeasible = (recipe: MealRecipe, available: Set<string> | string[], binding?: (string | null | undefined)[]) => { const availableSet = asSet(available); return recipe.requirements.every((requirement, index) => { const chosen = binding?.[index]; return chosen ? requirement.anyOf.includes(chosen) && availableSet.has(chosen) : requirement.anyOf.some((id) => availableSet.has(id)); }); };
const ingredientMap = (ingredients?: MealIngredient[] | Record<string, MealIngredient>) => !ingredients ? new Map<string, MealIngredient>() : Array.isArray(ingredients) ? new Map(ingredients.map((item) => [item.id, item])) : new Map(Object.entries(ingredients));
const optionalGroupMap = (groups: MealOptionalGroup[] = []) => new Map(groups.map((group) => [group.id, group]));
export function optionalGroupsForRecipe(recipe: MealRecipe | undefined, groups: MealOptionalGroup[] = []) { if (!recipe) return []; const map = optionalGroupMap(groups); return (recipe.optionalGroupIds ?? []).map((id) => map.get(id)).filter((group): group is MealOptionalGroup => Boolean(group)); }
export function optionalIngredientForRecipe(recipe: MealRecipe | undefined, groupId: string, ingredientId: string, groups: MealOptionalGroup[] = []) { return optionalGroupsForRecipe(recipe, groups).find((candidate) => candidate.id === groupId)?.ingredients.find((entry) => entry.ingredientId === ingredientId) ?? null; }
export function selectedOptionalAddonsForRecipe(state: Pick<MealState, 'selectedAddons'>, recipe: MealRecipe | undefined, groups: MealOptionalGroup[] = []) { if (!recipe) return []; const seen = new Set<string>(); return (state.selectedAddons ?? []).filter((addon) => { if (addon.mainRecipeId !== recipe.id || !optionalIngredientForRecipe(recipe, addon.addonType, addon.ingredientId, groups)) return false; const key = `${addon.addonType}\u0000${addon.ingredientId}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
export function freshnessIngredientIdsForRecipe(recipe: MealRecipe, binding: (string | null | undefined)[], availableIngredientIds: Set<string> | string[], groups: MealOptionalGroup[] = []) { const available = asSet(availableIngredientIds); const ids = new Set(binding.filter((id): id is string => Boolean(id))); for (const group of optionalGroupsForRecipe(recipe, groups)) for (const entry of group.ingredients) if (available.has(entry.ingredientId)) ids.add(entry.ingredientId); return [...ids]; }

export function freshnessPriorityAgeDays(binding: (string | null | undefined)[], ingredientFreshnessDates: Record<string, string>, ingredients: MealIngredient[] | Record<string, MealIngredient>, today = calendarDateKey()) {
  const map = ingredientMap(ingredients); return binding.reduce((oldest, id) => { if (!id) return oldest; const ingredient = map.get(id); const threshold = ingredient?.freshnessPriorityDays; if (ingredient?.inventoryFreshness !== 'fifo' || threshold === undefined || !Number.isInteger(threshold) || threshold <= 0) return oldest; const age = freshnessAgeDays(ingredientFreshnessDates[id] ?? '', today); return age > threshold ? Math.max(oldest, age) : oldest; }, 0);
}

type FreshnessRole = 'required' | 'one_of' | 'optional' | 'none';
const FRESHNESS_ROLE_PRIORITY: Record<FreshnessRole, number> = { required: 3, one_of: 2, optional: 1, none: 0 };
function freshnessPriorityForRecipe(
  recipe: MealRecipe,
  binding: (string | null | undefined)[],
  availableIngredientIds: Set<string> | string[],
  groups: MealOptionalGroup[],
  ingredientFreshnessDates: Record<string, string>,
  ingredients: MealIngredient[] | Record<string, MealIngredient>,
  today: string,
) {
  const requiredIds: string[] = [];
  const oneOfIds: string[] = [];
  recipe.requirements.forEach((requirement, index) => {
    const id = binding[index];
    if (!id) return;
    if (requirement.anyOf.length === 1) requiredIds.push(id);
    else oneOfIds.push(id);
  });

  const available = asSet(availableIngredientIds);
  const optionalIds = optionalGroupsForRecipe(recipe, groups).flatMap((group) =>
    group.ingredients.filter((entry) => available.has(entry.ingredientId)).map((entry) => entry.ingredientId),
  );
  const scopes: Array<{ role: Exclude<FreshnessRole, 'none'>; ids: string[] }> = [
    { role: 'required', ids: requiredIds },
    { role: 'one_of', ids: oneOfIds },
    { role: 'optional', ids: optionalIds },
  ];

  for (const scope of scopes) {
    const ageDays = freshnessPriorityAgeDays([...new Set(scope.ids)], ingredientFreshnessDates, ingredients, today);
    if (ageDays > 0) return { role: scope.role, rolePriority: FRESHNESS_ROLE_PRIORITY[scope.role], ageDays };
  }
  return { role: 'none' as const, rolePriority: FRESHNESS_ROLE_PRIORITY.none, ageDays: 0 };
}

const ingredientChildEaten = (id: string | null | undefined, ingredients?: MealIngredient[] | Record<string, MealIngredient>) => Boolean(id && ingredientMap(ingredients).get(id)?.tags?.includes('child-eaten'));
const recipeChildAll = (recipe: MealRecipe) => Boolean(recipe.tags?.includes('child-all-ingredients-eaten'));
function relevantBoundIds(recipe: MealRecipe, slot: 'protein' | 'vegetable', binding: (string | null | undefined)[]) { const ids = recipe.requirements.flatMap((requirement, index) => { const role = requirement.role ?? ''; const matches = slot === 'protein' ? (role === 'protein' || role === 'main-protein' || role === 'supporting-protein') : role === 'vegetable'; return matches ? [binding[index]] : []; }); return ids.length ? ids : binding; }
function resolveCoverage(recipe: MealRecipe, slot: 'protein' | 'vegetable', binding: (string | null | undefined)[] = [], ingredients?: MealIngredient[] | Record<string, MealIngredient>) {
  const declared = recipe.childCoverage?.[slot]; if (declared === true) return true; if (declared === false || declared !== 'ingredient-dependent') return false; const relevant = relevantBoundIds(recipe, slot, binding); const map = ingredientMap(ingredients); return relevant.some((id) => Boolean(id && (ingredientChildEaten(id, ingredients) || recipe.ingredientChildCoverage?.[id] === true || map.get(id)?.childCoverage?.vegetable === true)));
}
export const resolveRecipeChildCoverage = (recipe: MealRecipe, binding: (string | null | undefined)[] = [], ingredients?: MealIngredient[] | Record<string, MealIngredient>) => ({ protein: resolveCoverage(recipe, 'protein', binding, ingredients), vegetable: resolveCoverage(recipe, 'vegetable', binding, ingredients) });
export function optionalIngredientChildCoverage(recipe: MealRecipe, entry: MealOptionalIngredient, ingredients?: MealIngredient[] | Record<string, MealIngredient>) { const eligible = recipeChildAll(recipe) && ingredientChildEaten(entry.ingredientId, ingredients); return { protein: eligible && entry.contribution.protein > 0, vegetable: eligible && entry.contribution.vegetable > 0 }; }
function selectedOptionalContribution(recipe: MealRecipe, state: Pick<MealState, 'selectedAddons'>, groups: MealOptionalGroup[], ingredients?: MealIngredient[] | Record<string, MealIngredient>) { let contribution = zeroContribution(); let childProtein = false; let childVegetable = false; for (const addon of selectedOptionalAddonsForRecipe(state, recipe, groups)) { const entry = optionalIngredientForRecipe(recipe, addon.addonType, addon.ingredientId, groups); if (!entry) continue; contribution = addContribution(contribution, entry.contribution); const coverage = optionalIngredientChildCoverage(recipe, entry, ingredients); childProtein ||= coverage.protein; childVegetable ||= coverage.vegetable; } return { contribution, childProtein, childVegetable }; }

/** Temporary page compatibility while old checkout markup is replaced by composition enhancement. */
export function easyBraiseAddonIngredientIds(recipes: MealRecipe[], state: Pick<MealState, 'selectedRecipeIds' | 'recipeIngredientBindings'>, inventoryIngredientIds: string[], ingredients: MealIngredient[] | Record<string, MealIngredient>) {
  const selected = new Set(state.selectedRecipeIds); if (!recipes.some((recipe) => selected.has(recipe.id) && recipe.tags?.includes('iron-pan-braise'))) return []; const bound = new Set(Object.values(state.recipeIngredientBindings).flat()); const map = ingredientMap(ingredients); return [...new Set(inventoryIngredientIds)].filter((id) => !bound.has(id) && map.get(id)?.tags?.includes('easy-braise-addon'));
}

export function aggregateMeal(selected: MealRecipe[], context: { bindings?: Record<string, (string | null | undefined)[]>; recipeIngredientBindings?: Record<string, (string | null | undefined)[]>; selectedAddons?: SelectedAddon[]; optionalGroups?: MealOptionalGroup[]; availableIngredientIds?: string[]; ingredients?: MealIngredient[] | Record<string, MealIngredient>; } = {}): MealTotals {
  const available = asSet(context.availableIngredientIds); const bindings = context.bindings ?? context.recipeIngredientBindings ?? {}; const optionState = { selectedAddons: context.selectedAddons ?? [] };
  return selected.reduce<MealTotals>((total, recipe) => { const binding = bindings[recipe.id] ?? (available.size ? bindRecipeIngredients(recipe, available) : []); const coverage = resolveRecipeChildCoverage(recipe, binding, context.ingredients); const optional = selectedOptionalContribution(recipe, optionState, context.optionalGroups ?? [], context.ingredients); total.protein += recipe.contribution.protein + optional.contribution.protein; total.vegetable += recipe.contribution.vegetable + optional.contribution.vegetable; total.staple += recipe.contribution.staple + optional.contribution.staple; total.childProtein ||= coverage.protein || optional.childProtein; total.childVegetable ||= coverage.vegetable || optional.childVegetable; return total; }, { protein: 0, vegetable: 0, staple: 0, childProtein: false, childVegetable: false });
}
export const aggregateSelection = (recipes: MealRecipe[], state: MealState, ingredients?: MealIngredient[] | Record<string, MealIngredient>, optionalGroups: MealOptionalGroup[] = []) => aggregateMeal(recipes.filter((recipe) => state.selectedRecipeIds.includes(recipe.id)), { recipeIngredientBindings: state.recipeIngredientBindings, selectedAddons: state.selectedAddons, optionalGroups, availableIngredientIds: state.availableIngredientIds, ingredients });
export type MealCompletionRequirement = 'Protein' | 'Vegetable' | 'Staple' | '孩子蛋白' | '孩子蔬菜';
export function unmetCompletionRequirements(state: MealState, totals: MealTotals): MealCompletionRequirement[] { const unmet: MealCompletionRequirement[] = []; if (totals.protein < state.proteinTarget) unmet.push('Protein'); if (totals.vegetable < state.vegetableTarget) unmet.push('Vegetable'); if (state.stapleRequired && totals.staple < 1) unmet.push('Staple'); if (state.childMode && !totals.childProtein) unmet.push('孩子蛋白'); if (state.childMode && !totals.childVegetable) unmet.push('孩子蔬菜'); return unmet; }
export const isMealComplete = (state: MealState, totals: MealTotals) => unmetCompletionRequirements(state, totals).length === 0;
export function timeFit(recipe: MealRecipe, preference: TimePreference) { if (preference === 'any') return { rank: 0, label: '' }; const limit = Number(preference); const values = (recipe.mealWindowMinutes || recipe.elapsedMinutes).match(/\d+(?:\.\d+)?/g)?.map(Number) ?? []; if (recipe.advanceStartRequired) return { rank: 2, label: '需提前开始' }; if (!values.length) return { rank: 1, label: '时间需确认' }; const low = Math.min(...values); const high = Math.max(...values); if (high <= limit) return { rank: 0, label: '' }; if (low <= limit) return { rank: 1, label: '时间偏紧' }; return { rank: 2, label: '可能超过时间' }; }
export function recentRecipePenalty(recipeId: string, recentRecipeIds: string[][] = []) { return recentRecipeIds.reduce((penalty, ids, index) => ids.includes(recipeId) ? Math.max(penalty, recentRecipeIds.length - index) : penalty, 0); }
function potentialOptional(recipe: MealRecipe, state: MealState, groups: MealOptionalGroup[], ingredients: MealIngredient[] | Record<string, MealIngredient>) { const available = asSet(state.availableIngredientIds); let contribution = zeroContribution(); let childProtein = false; let childVegetable = false; for (const group of optionalGroupsForRecipe(recipe, groups)) for (const entry of group.ingredients.filter((candidate) => available.has(candidate.ingredientId))) { contribution.protein = Math.max(contribution.protein, entry.contribution.protein); contribution.vegetable = Math.max(contribution.vegetable, entry.contribution.vegetable); contribution.staple = Math.max(contribution.staple, entry.contribution.staple); const coverage = optionalIngredientChildCoverage(recipe, entry, ingredients); childProtein ||= coverage.protein; childVegetable ||= coverage.vegetable; } return { contribution, childProtein, childVegetable }; }

export function rankCandidates(recipes: MealRecipe[], state: MealState, ingredients: MealIngredient[] | Record<string, MealIngredient> = [], draftBindings: Record<string, (string | null | undefined)[]> = {}, recentRecipeIds: string[][] = [], today = calendarDateKey(), optionalGroups: MealOptionalGroup[] = []) {
  const available = asSet(state.availableIngredientIds); const selectedIds = new Set(state.selectedRecipeIds); const selected = recipes.filter((recipe) => selectedIds.has(recipe.id)); const totals = aggregateMeal(selected, { recipeIngredientBindings: state.recipeIngredientBindings, selectedAddons: state.selectedAddons, optionalGroups, availableIngredientIds: state.availableIngredientIds, ingredients }); const proteinLimit = state.proteinTarget + PROTEIN_TARGET_TOLERANCE; const freshnessDates = state.ingredientFreshnessDates ?? {}; const selectedBoundIngredientIds = new Set(selected.flatMap((recipe) => { const binding = state.recipeIngredientBindings[recipe.id]; return binding?.length ? binding : bindRecipeIngredients(recipe, available, [], freshnessDates); }).filter((id): id is string => Boolean(id))); const cache = new Map<string, ReturnType<typeof measure>>();
  function measure(recipe: MealRecipe) { const existing = draftBindings[recipe.id] ?? state.recipeIngredientBindings?.[recipe.id] ?? []; const baselineBinding = bindRecipeIngredients(recipe, available, existing); const freshnessBinding = bindRecipeIngredients(recipe, available, existing, freshnessDates); const baselineCoverage = resolveRecipeChildCoverage(recipe, baselineBinding, ingredients); const freshnessCoverage = resolveRecipeChildCoverage(recipe, freshnessBinding, ingredients); const childValue = (coverage: ReturnType<typeof resolveRecipeChildCoverage>) => Number(state.childMode && !totals.childProtein && coverage.protein) + Number(state.childMode && !totals.childVegetable && coverage.vegetable); const binding = childValue(freshnessCoverage) < childValue(baselineCoverage) ? baselineBinding : freshnessBinding; const coverage = binding === baselineBinding ? baselineCoverage : freshnessCoverage; if (!selectedIds.has(recipe.id)) draftBindings[recipe.id] = [...binding]; const next = { protein: totals.protein + recipe.contribution.protein, vegetable: totals.vegetable + recipe.contribution.vegetable, staple: totals.staple + recipe.contribution.staple }; const childSolved = childValue(coverage); const normalGaps = Number(totals.protein < state.proteinTarget && recipe.contribution.protein > 0) + Number(totals.vegetable < state.vegetableTarget && recipe.contribution.vegetable > 0) + Number(state.stapleRequired && totals.staple < 1 && recipe.contribution.staple > 0); const potential = potentialOptional(recipe, state, optionalGroups, ingredients); const potentialGaps = Number(totals.protein < state.proteinTarget && potential.contribution.protein > 0) + Number(totals.vegetable < state.vegetableTarget && potential.contribution.vegetable > 0) + Number(state.stapleRequired && totals.staple < 1 && potential.contribution.staple > 0); const potentialChild = Number(state.childMode && !totals.childProtein && potential.childProtein) + Number(state.childMode && !totals.childVegetable && potential.childVegetable); const withinProteinTolerance = next.protein <= proteinLimit; const overage = Math.max(0, next.protein - proteinLimit) + Math.max(0, next.vegetable - state.vegetableTarget) + Math.max(0, next.staple - (state.stapleRequired ? 1 : 0)); const freshness = freshnessPriorityForRecipe(recipe, binding, state.availableIngredientIds, optionalGroups, freshnessDates, ingredients, today); const reusesSelectedIngredient = binding.some((id) => Boolean(id && selectedBoundIngredientIds.has(id))); return { binding, childSolved, normalGaps, potentialGaps, potentialChild, withinProteinTolerance, overage, oldestAgeDays: freshness.ageDays, freshnessRolePriority: freshness.rolePriority, stalePriority: freshness.rolePriority > 0, reusesSelectedIngredient, time: timeFit(recipe, state.timePreference) }; }
  const measures = (recipe: MealRecipe) => { const cached = cache.get(recipe.id); if (cached) return cached; const value = measure(recipe); cache.set(recipe.id, value); return value; };
  return recipes.filter((recipe) => { if (selectedIds.has(recipe.id)) return false; const value = measures(recipe); if (!isFeasible(recipe, available, value.binding)) return false; return recipe.tags?.includes('meal-extra') || value.childSolved > 0 || value.normalGaps > 0 || value.potentialChild > 0 || value.potentialGaps > 0; }).sort((a, b) => {
    const aExtra = a.tags?.includes('meal-extra') === true; const bExtra = b.tags?.includes('meal-extra') === true;
    if (aExtra !== bExtra) return Number(aExtra) - Number(bExtra);
    const x = measures(a); const y = measures(b); const reuseOrder = Number(x.reusesSelectedIngredient) - Number(y.reusesSelectedIngredient); const freshnessRoleOrder = y.freshnessRolePriority - x.freshnessRolePriority; const staleAgeOrder = x.freshnessRolePriority > 0 && x.freshnessRolePriority === y.freshnessRolePriority ? y.oldestAgeDays - x.oldestAgeDays : 0; return reuseOrder || freshnessRoleOrder || staleAgeOrder || y.childSolved - x.childSolved || Number(y.withinProteinTolerance) - Number(x.withinProteinTolerance) || y.normalGaps - x.normalGaps || x.overage - y.overage || y.potentialChild - x.potentialChild || y.potentialGaps - x.potentialGaps || recentRecipePenalty(a.id, recentRecipeIds) - recentRecipePenalty(b.id, recentRecipeIds) || b.fitScore - a.fitScore || x.time.rank - y.time.rank || a.order - b.order;
  });
}

export function reconcileMealState(input: Partial<MealState>, recipes: MealRecipe[], _ingredients: MealIngredient[] | Record<string, MealIngredient> = [], optionalGroups: MealOptionalGroup[] = []): MealState {
  const state: MealState = { ...defaultMealState(), ...input, recipeIngredientBindings: { ...(input.recipeIngredientBindings ?? {}) }, selectedAddons: [...(input.selectedAddons ?? [])], ingredientFreshnessDates: { ...(input.ingredientFreshnessDates ?? {}) } }; const available = asSet(state.availableIngredientIds); const keptRecipes: string[] = []; const bindings: Record<string, string[]> = {};
  for (const id of [...new Set(state.selectedRecipeIds)]) { const recipe = recipes.find((item) => item.id === id); if (!recipe) continue; const existing = state.recipeIngredientBindings[id] ?? []; const binding = recipe.requirements.map((requirement, index) => { const prior = existing[index]; if (prior && requirement.anyOf.includes(prior)) return prior; return requirement.anyOf.find((ingredientId) => available.has(ingredientId)) ?? null; }); if (binding.some((value) => value === null)) continue; keptRecipes.push(id); bindings[id] = binding.filter((value): value is string => Boolean(value)); }
  const kept = new Set(keptRecipes); const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe])); const selectedAddons = (state.selectedAddons ?? []).filter((addon) => kept.has(addon.mainRecipeId) && (optionalGroups.length === 0 || Boolean(optionalIngredientForRecipe(recipeMap.get(addon.mainRecipeId), addon.addonType, addon.ingredientId, optionalGroups)))); return { ...state, availableIngredientIds: [...available], selectedRecipeIds: keptRecipes, recipeIngredientBindings: bindings, selectedAddons };
}

export function checkoutUnitsForSelection(recipes: MealRecipe[], state: MealState): Record<string, number> { const totals: Record<string, number> = {}; for (const recipe of recipes.filter((item) => state.selectedRecipeIds.includes(item.id))) for (const id of [...new Set(state.recipeIngredientBindings[recipe.id] ?? [])]) totals[id] = (totals[id] ?? 0) + (recipe.checkoutUnits?.[id] ?? 1); return totals; }
