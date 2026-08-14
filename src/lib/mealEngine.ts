export type TimePreference = 'any' | '30' | '45' | '60';
export type RecipeChildCoverage = boolean | 'ingredient-dependent';
export type IngredientChildCoverage = boolean | 'unknown';
export type InventoryTracking = 'counted' | 'presence-only';

export interface MealIngredient {
  id: string;
  nameZh?: string;
  nameEn?: string;
  tags?: string[];
  inventoryTracking: InventoryTracking;
  childCoverage?: { vegetable: IngredientChildCoverage };
}

export interface MealRequirement {
  anyOf: string[];
  role?: string;
  amount?: string;
  preparation?: string;
}

export interface MealRecipe {
  id: string;
  order: number;
  fitScore: number;
  contribution: { protein: number; vegetable: number; staple: number };
  childCoverage: { protein: RecipeChildCoverage; vegetable: RecipeChildCoverage };
  requirements: MealRequirement[];
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
}

export interface MealTotals {
  protein: number;
  vegetable: number;
  staple: number;
  childProtein: boolean;
  childVegetable: boolean;
}

export const defaultMealState = (): MealState => ({
  availableIngredientIds: [], proteinTarget: 1, vegetableTarget: 2, stapleRequired: true, childMode: true, timePreference: 'any', selectedRecipeIds: [],
  recipeIngredientBindings: {},
});

const asSet = (value: Set<string> | string[] | undefined) => value instanceof Set ? value : new Set(value ?? []);

/** Pick a deterministic available Ingredient for every required group. */
export function bindRecipeIngredients(recipe: MealRecipe, available: Set<string> | string[], existing: (string | null | undefined)[] = []) {
  const availableSet = asSet(available);
  return recipe.requirements.map((requirement, index) => {
    const prior = existing[index];
    if (prior && requirement.anyOf.includes(prior) && availableSet.has(prior)) return prior;
    return requirement.anyOf.find((id) => availableSet.has(id)) ?? null;
  });
}

export const resolveRecipeBinding = bindRecipeIngredients;

export const isFeasible = (recipe: MealRecipe, available: Set<string> | string[], binding?: (string | null | undefined)[]) => {
  const availableSet = asSet(available);
  return recipe.requirements.every((requirement, index) => {
    const chosen = binding?.[index];
    return chosen ? requirement.anyOf.includes(chosen) && availableSet.has(chosen) : requirement.anyOf.some((id) => availableSet.has(id));
  });
};

const ingredientMap = (ingredients?: MealIngredient[] | Record<string, MealIngredient>) => {
  if (!ingredients) return new Map<string, MealIngredient>();
  if (Array.isArray(ingredients)) return new Map(ingredients.map((item) => [item.id, item]));
  return new Map(Object.entries(ingredients));
};

function resolveCoverage(recipe: MealRecipe, slot: 'protein' | 'vegetable', binding: (string | null | undefined)[] = [], ingredients?: MealIngredient[] | Record<string, MealIngredient>) {
  const declared = recipe.childCoverage?.[slot];
  if (declared === true || declared === false) return declared;
  if (declared !== 'ingredient-dependent') return false;
  const map = ingredientMap(ingredients);
  const relevant = recipe.requirements.flatMap((requirement, index) => {
    const role = requirement.role ?? '';
    const matches = slot === 'protein' ? (role === 'protein' || role === 'main-protein' || role === 'supporting-protein') : role === 'vegetable';
    return matches ? [binding[index]] : [];
  });
  const fallback = relevant.length ? relevant : binding;
  return fallback.some((id) => {
    if (!id) return false;
    const explicit = recipe.ingredientChildCoverage?.[id];
    const item = map.get(id);
    return explicit === true || item?.childCoverage?.vegetable === true;
  });
}

export const resolveRecipeChildCoverage = (recipe: MealRecipe, binding: (string | null | undefined)[] = [], ingredients?: MealIngredient[] | Record<string, MealIngredient>) => ({
  protein: resolveCoverage(recipe, 'protein', binding, ingredients), vegetable: resolveCoverage(recipe, 'vegetable', binding, ingredients),
});

/** Checkout-only candidates. This deliberately has no planning or Cook View effect. */
export function easyBraiseAddonIngredientIds(recipes: MealRecipe[], state: Pick<MealState, 'selectedRecipeIds' | 'recipeIngredientBindings'>, mealSnapshotIngredientIds: string[], ingredients: MealIngredient[] | Record<string, MealIngredient>): string[] {
  const selected = new Set(state.selectedRecipeIds);
  if (!recipes.some((recipe) => selected.has(recipe.id) && recipe.tags?.includes('iron-pan-braise'))) return [];
  const bound = new Set(Object.values(state.recipeIngredientBindings).flat());
  const map = ingredientMap(ingredients);
  return [...new Set(mealSnapshotIngredientIds)].filter((id) => !bound.has(id) && map.get(id)?.tags?.includes('easy-braise-addon'));
}

export function aggregateMeal(selected: MealRecipe[], context: {
  bindings?: Record<string, (string | null | undefined)[]>;
  recipeIngredientBindings?: Record<string, (string | null | undefined)[]>;
  availableIngredientIds?: string[];
  ingredients?: MealIngredient[] | Record<string, MealIngredient>;
} = {}): MealTotals {
  const available = asSet(context.availableIngredientIds);
  const bindings = context.bindings ?? context.recipeIngredientBindings ?? {};
  return selected.reduce<MealTotals>((total, recipe) => {
    const binding = bindings[recipe.id] ?? (available.size ? bindRecipeIngredients(recipe, available) : []);
    const coverage = resolveRecipeChildCoverage(recipe, binding, context.ingredients);
    total.protein += recipe.contribution.protein; total.vegetable += recipe.contribution.vegetable; total.staple += recipe.contribution.staple;
    total.childProtein ||= coverage.protein; total.childVegetable ||= coverage.vegetable;
    return total;
  }, { protein: 0, vegetable: 0, staple: 0, childProtein: false, childVegetable: false });
}

export const aggregateSelection = (recipes: MealRecipe[], state: MealState, ingredients?: MealIngredient[] | Record<string, MealIngredient>) => aggregateMeal(recipes.filter((recipe) => state.selectedRecipeIds.includes(recipe.id)), { recipeIngredientBindings: state.recipeIngredientBindings, availableIngredientIds: state.availableIngredientIds, ingredients });

export type MealCompletionRequirement = 'Protein' | 'Vegetable' | 'Staple' | '孩子蛋白' | '孩子蔬菜';

/** Return unmet targets in the same order used by the builder progress display. */
export function unmetCompletionRequirements(state: MealState, totals: MealTotals): MealCompletionRequirement[] {
  const unmet: MealCompletionRequirement[] = [];
  if (totals.protein < state.proteinTarget) unmet.push('Protein');
  if (totals.vegetable < state.vegetableTarget) unmet.push('Vegetable');
  if (state.stapleRequired && totals.staple < 1) unmet.push('Staple');
  if (state.childMode && !totals.childProtein) unmet.push('孩子蛋白');
  if (state.childMode && !totals.childVegetable) unmet.push('孩子蔬菜');
  return unmet;
}

export const isMealComplete = (state: MealState, totals: MealTotals) => unmetCompletionRequirements(state, totals).length === 0;

export function timeFit(recipe: MealRecipe, preference: TimePreference) {
  if (preference === 'any') return { rank: 0, label: '' };
  const limit = Number(preference);
  const values = (recipe.mealWindowMinutes || recipe.elapsedMinutes).match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (recipe.advanceStartRequired) return { rank: 2, label: '需提前开始' };
  if (!values.length) return { rank: 1, label: '时间需确认' };
  const low = Math.min(...values); const high = Math.max(...values);
  if (high <= limit) return { rank: 0, label: '' };
  if (low <= limit) return { rank: 1, label: '时间偏紧' };
  return { rank: 2, label: '可能超过时间' };
}

export function recentRecipePenalty(recipeId: string, recentRecipeIds: string[][] = []) {
  return recentRecipeIds.reduce((penalty, ids, index) => ids.includes(recipeId) ? Math.max(penalty, recentRecipeIds.length - index) : penalty, 0);
}

export function rankCandidates(recipes: MealRecipe[], state: MealState, ingredients: MealIngredient[] | Record<string, MealIngredient> = [], draftBindings: Record<string, (string | null | undefined)[]> = {}, recentRecipeIds: string[][] = []) {
  const available = asSet(state.availableIngredientIds);
  const selectedIds = new Set(state.selectedRecipeIds);
  const selected = recipes.filter((recipe) => selectedIds.has(recipe.id));
  const totals = aggregateMeal(selected, { recipeIngredientBindings: state.recipeIngredientBindings, availableIngredientIds: state.availableIngredientIds, ingredients });
  const proteinLimit = state.proteinTarget + 0.5;
  const measures = (recipe: MealRecipe) => {
    const binding = bindRecipeIngredients(recipe, available, draftBindings[recipe.id] ?? state.recipeIngredientBindings?.[recipe.id] ?? []);
    const coverage = resolveRecipeChildCoverage(recipe, binding, ingredients);
    const next = { protein: totals.protein + recipe.contribution.protein, vegetable: totals.vegetable + recipe.contribution.vegetable, staple: totals.staple + recipe.contribution.staple };
    const childSolved = Number(state.childMode && !totals.childProtein && coverage.protein) + Number(state.childMode && !totals.childVegetable && coverage.vegetable);
    const normalGaps = Number(totals.protein < state.proteinTarget && recipe.contribution.protein > 0) + Number(totals.vegetable < state.vegetableTarget && recipe.contribution.vegetable > 0) + Number(state.stapleRequired && totals.staple < 1 && recipe.contribution.staple > 0);
    const withinProteinTolerance = next.protein <= proteinLimit;
    const overage = Math.max(0, next.protein - proteinLimit) + Math.max(0, next.vegetable - state.vegetableTarget) + Math.max(0, next.staple - (state.stapleRequired ? 1 : 0));
    return { childSolved, normalGaps, withinProteinTolerance, overage, time: timeFit(recipe, state.timePreference) };
  };
  return recipes.filter((recipe) => {
    if (selectedIds.has(recipe.id) || !isFeasible(recipe, available, bindRecipeIngredients(recipe, available, draftBindings[recipe.id] ?? state.recipeIngredientBindings?.[recipe.id] ?? []))) return false;
    const value = measures(recipe);
    if (value.childSolved > 0) return true;
    if (value.normalGaps === 0) return false;
    if (!value.withinProteinTolerance && value.normalGaps === 1 && recipe.contribution.protein > 0 && totals.protein >= state.proteinTarget) return false;
    return true;
  }).sort((a, b) => {
    const x = measures(a); const y = measures(b);
    return recentRecipePenalty(a.id, recentRecipeIds) - recentRecipePenalty(b.id, recentRecipeIds) || y.childSolved - x.childSolved || Number(y.withinProteinTolerance) - Number(x.withinProteinTolerance) || y.normalGaps - x.normalGaps || x.overage - y.overage || b.fitScore - a.fitScore || x.time.rank - y.time.rank || a.order - b.order;
  });
}

/** Keep selected Recipes, bindings, and add-ons coherent after any state change. */
export function reconcileMealState(input: Partial<MealState>, recipes: MealRecipe[], _ingredients: MealIngredient[] | Record<string, MealIngredient> = []): MealState {
  const state: MealState = { ...defaultMealState(), ...input, recipeIngredientBindings: { ...(input.recipeIngredientBindings ?? {}) } };
  const available = asSet(state.availableIngredientIds);
  const keptRecipes: string[] = [];
  const bindings: Record<string, string[]> = {};
  for (const id of [...new Set(state.selectedRecipeIds)]) {
    const recipe = recipes.find((item) => item.id === id);
    if (!recipe) continue;
    const binding = bindRecipeIngredients(recipe, available, state.recipeIngredientBindings[id] ?? []);
    if (!isFeasible(recipe, available, binding)) continue;
    keptRecipes.push(id); bindings[id] = binding.filter((value): value is string => Boolean(value));
  }
  return { ...state, availableIngredientIds: [...available], selectedRecipeIds: keptRecipes, recipeIngredientBindings: bindings };
}

/** Recipe checkout units are strict when present; otherwise each bound/add-on Ingredient counts once per selected Recipe. */
export function checkoutUnitsForSelection(recipes: MealRecipe[], state: MealState): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const recipe of recipes.filter((item) => state.selectedRecipeIds.includes(item.id))) {
    const usedIds = [...new Set([
      ...(state.recipeIngredientBindings[recipe.id] ?? []),
    ])];
    for (const id of usedIds) totals[id] = (totals[id] ?? 0) + (recipe.checkoutUnits?.[id] ?? 1);
  }
  return totals;
}
