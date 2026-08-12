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

export interface MealAddon {
  id: string;
  acceptsIngredientTag: string;
  contribution: { protein: number; vegetable: number; staple: number };
  childCoverage: { protein: boolean; vegetable: RecipeChildCoverage };
  notes?: string;
}

export interface MealRequirement {
  anyOf: string[];
  role?: string;
}

export interface MealRecipe {
  id: string;
  order: number;
  fitScore: number;
  contribution: { protein: number; vegetable: number; staple: number };
  childCoverage: { protein: RecipeChildCoverage; vegetable: RecipeChildCoverage };
  requirements: MealRequirement[];
  mealAddons?: MealAddon[];
  ingredientChildCoverage?: Record<string, IngredientChildCoverage>;
  mealWindowMinutes: string;
  elapsedMinutes: string;
  advanceStartRequired: boolean;
  [key: string]: unknown;
}

export interface SelectedAddon {
  mainRecipeId: string;
  addonType: string;
  ingredientId: string;
}

export type SelectedAddons = SelectedAddon[];

export interface MealState {
  availableIngredientIds: string[];
  proteinTarget: number;
  vegetableTarget: number;
  stapleRequired: boolean;
  childMode: boolean;
  timePreference: TimePreference;
  selectedRecipeIds: string[];
  recipeIngredientBindings: Record<string, string[]>;
  selectedAddons: SelectedAddons;
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
  recipeIngredientBindings: {}, selectedAddons: [],
});

const asSet = (value: Set<string> | string[] | undefined) => value instanceof Set ? value : new Set(value ?? []);
const recipeAddons = (recipe: MealRecipe) => Array.isArray(recipe.mealAddons) ? recipe.mealAddons : [];

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

export function addonIsCompatible(recipe: MealRecipe, addon: MealAddon, ingredientId: string, ingredients?: MealIngredient[] | Record<string, MealIngredient>) {
  const item = ingredientMap(ingredients).get(ingredientId);
  return recipeAddons(recipe).some((candidate) => candidate.id === addon.id) && Boolean(item?.tags?.includes(addon.acceptsIngredientTag));
}

export function compatibleAddonIngredients(recipe: MealRecipe, addon: MealAddon, available: Set<string> | string[], ingredients: MealIngredient[] | Record<string, MealIngredient>) {
  const availableSet = asSet(available);
  return [...availableSet].filter((id) => addonIsCompatible(recipe, addon, id, ingredients));
}

/** Return selected main Recipes whose declared add-on has at least one compatible Ingredient. */
export function rankAddons(recipes: MealRecipe[], state: MealState, ingredients: MealIngredient[] | Record<string, MealIngredient>) {
  const available = asSet(state.availableIngredientIds);
  const selectedBindingIngredients = new Set(state.selectedRecipeIds.flatMap((id) => state.recipeIngredientBindings?.[id] ?? []));
  const selectedAddonIngredients = new Set((state.selectedAddons ?? []).map((entry) => entry.ingredientId));
  const selectedRecipes = recipes.filter((recipe) => state.selectedRecipeIds.includes(recipe.id));
  const totals = aggregateMeal(selectedRecipes, {
    recipeIngredientBindings: state.recipeIngredientBindings,
    selectedAddons: state.selectedAddons,
    availableIngredientIds: state.availableIngredientIds,
    ingredients,
  });
  return state.selectedRecipeIds.flatMap((recipeId) => {
    const recipe = recipes.find((item) => item.id === recipeId);
    if (!recipe) return [];
    const binding = bindRecipeIngredients(recipe, available, state.recipeIngredientBindings?.[recipe.id] ?? []);
    if (!isFeasible(recipe, available, binding)) return [];
    return recipeAddons(recipe).flatMap((addon) => {
      const current = (state.selectedAddons ?? []).find((entry) => entry.mainRecipeId === recipe.id && entry.addonType === addon.id);
      const ingredientIds = compatibleAddonIngredients(recipe, addon, available, ingredients).filter((id) => {
        if (selectedBindingIngredients.has(id) && current?.ingredientId !== id) return false;
        if (selectedAddonIngredients.has(id) && current?.ingredientId !== id) return false;
        return true;
      });
      const currentIngredientValid = Boolean(current?.ingredientId && available.has(current.ingredientId) && addonIsCompatible(recipe, addon, current.ingredientId, ingredients));
      const selectedIngredientId = currentIngredientValid ? current?.ingredientId : ingredientIds[0];
      const needsVegetable = totals.vegetable < state.vegetableTarget;
      const needsChildVegetable = state.childMode && !totals.childVegetable;
      const viableIngredientIds = needsVegetable ? ingredientIds : (needsChildVegetable ? ingredientIds.filter((id) => addonCoverage(addon, id, ingredients)) : []);
      if (!current && !viableIngredientIds.length) return [];
      if (current && !currentIngredientValid && !viableIngredientIds.length) return [{ recipeId: recipe.id, recipe, addon, ingredientIds: current?.ingredientId ? [current.ingredientId] : [], selectedIngredientId: current?.ingredientId }];
      if (current && currentIngredientValid && !viableIngredientIds.includes(current.ingredientId)) viableIngredientIds.unshift(current.ingredientId);
      return [{ recipeId: recipe.id, recipe, addon, ingredientIds: viableIngredientIds, selectedIngredientId }];
    });
  });
}

function selectedAddonEntries(state: MealState, recipeId: string): SelectedAddon[] {
  return (state.selectedAddons ?? []).filter((entry) => entry.mainRecipeId === recipeId);
}

function addonCoverage(addon: MealAddon, ingredientId: string | undefined, ingredients?: MealIngredient[] | Record<string, MealIngredient>) {
  if (addon.childCoverage.vegetable !== 'ingredient-dependent') return Boolean(addon.childCoverage.vegetable);
  if (!ingredientId) return false;
  return ingredientMap(ingredients).get(ingredientId)?.childCoverage?.vegetable === true;
}

export function aggregateMeal(selected: MealRecipe[], context: {
  bindings?: Record<string, (string | null | undefined)[]>;
  recipeIngredientBindings?: Record<string, (string | null | undefined)[]>;
  selectedAddons?: SelectedAddons;
  availableIngredientIds?: string[];
  ingredients?: MealIngredient[] | Record<string, MealIngredient>;
} = {}): MealTotals {
  const available = asSet(context.availableIngredientIds);
  const bindings = context.bindings ?? context.recipeIngredientBindings ?? {};
  const bindingIngredients = new Set(selected.flatMap((recipe) => bindings[recipe.id] ?? (available.size ? bindRecipeIngredients(recipe, available) : [])));
  const usedAddonIngredients = new Set<string>();
  const selectedAddons = context.selectedAddons ?? [];
  return selected.reduce<MealTotals>((total, recipe) => {
    const binding = bindings[recipe.id] ?? (available.size ? bindRecipeIngredients(recipe, available) : []);
    const coverage = resolveRecipeChildCoverage(recipe, binding, context.ingredients);
    total.protein += recipe.contribution.protein; total.vegetable += recipe.contribution.vegetable; total.staple += recipe.contribution.staple;
    total.childProtein ||= coverage.protein; total.childVegetable ||= coverage.vegetable;
    for (const entry of selectedAddons.filter((candidate) => candidate.mainRecipeId === recipe.id)) {
      const addon = recipeAddons(recipe).find((candidate) => candidate.id === entry.addonType);
      if (!addon || !entry.ingredientId || !available.has(entry.ingredientId) || bindingIngredients.has(entry.ingredientId) || usedAddonIngredients.has(entry.ingredientId) || !addonIsCompatible(recipe, addon, entry.ingredientId, context.ingredients)) continue;
      usedAddonIngredients.add(entry.ingredientId);
      total.protein += addon.contribution.protein; total.vegetable += addon.contribution.vegetable; total.staple += addon.contribution.staple;
      total.childProtein ||= addon.childCoverage.protein; total.childVegetable ||= addonCoverage(addon, entry.ingredientId, context.ingredients);
    }
    return total;
  }, { protein: 0, vegetable: 0, staple: 0, childProtein: false, childVegetable: false });
}

export const aggregateSelection = (recipes: MealRecipe[], state: MealState, ingredients?: MealIngredient[] | Record<string, MealIngredient>) => aggregateMeal(recipes.filter((recipe) => state.selectedRecipeIds.includes(recipe.id)), { recipeIngredientBindings: state.recipeIngredientBindings, selectedAddons: state.selectedAddons, availableIngredientIds: state.availableIngredientIds, ingredients });

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

export function rankCandidates(recipes: MealRecipe[], state: MealState, ingredients: MealIngredient[] | Record<string, MealIngredient> = [], draftBindings: Record<string, (string | null | undefined)[]> = {}) {
  const available = asSet(state.availableIngredientIds);
  const selectedIds = new Set(state.selectedRecipeIds);
  const selected = recipes.filter((recipe) => selectedIds.has(recipe.id));
  const totals = aggregateMeal(selected, { recipeIngredientBindings: state.recipeIngredientBindings, selectedAddons: state.selectedAddons, availableIngredientIds: state.availableIngredientIds, ingredients });
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
    return y.childSolved - x.childSolved || Number(y.withinProteinTolerance) - Number(x.withinProteinTolerance) || y.normalGaps - x.normalGaps || x.overage - y.overage || b.fitScore - a.fitScore || x.time.rank - y.time.rank || a.order - b.order;
  });
}

/** Keep selected Recipes, bindings, and add-ons coherent after any state change. */
export function reconcileMealState(input: Partial<MealState>, recipes: MealRecipe[], ingredients: MealIngredient[] | Record<string, MealIngredient> = []): MealState {
  const state: MealState = { ...defaultMealState(), ...input, recipeIngredientBindings: { ...(input.recipeIngredientBindings ?? {}) }, selectedAddons: [...(input.selectedAddons ?? [])] };
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
  const selectedAddons: SelectedAddons = [];
  const usedRecipeIngredients = new Set(Object.values(bindings).flat());
  const usedAddonIngredients = new Set<string>();
  for (const recipeId of keptRecipes) {
    const recipe = recipes.find((item) => item.id === recipeId)!;
    const entries = selectedAddonEntries(state, recipeId);
    const kept = entries.flatMap((entry) => {
      const addon = recipeAddons(recipe).find((candidate) => candidate.id === entry.addonType);
      if (!addon) return [];
      const ingredientId = entry.ingredientId;
      if (!ingredientId || !available.has(ingredientId) || usedRecipeIngredients.has(ingredientId) || usedAddonIngredients.has(ingredientId) || !addonIsCompatible(recipe, addon, ingredientId, ingredients)) return [];
      usedAddonIngredients.add(ingredientId);
      return [{ mainRecipeId: recipeId, addonType: addon.id, ingredientId }];
    });
    selectedAddons.push(...kept);
  }
  return { ...state, availableIngredientIds: [...available], selectedRecipeIds: keptRecipes, recipeIngredientBindings: bindings, selectedAddons };
}

export function addSelectedAddon(state: MealState, recipe: MealRecipe, addonId: string, ingredientId: string, ingredients: MealIngredient[] | Record<string, MealIngredient>) {
  const addon = recipeAddons(recipe).find((candidate) => candidate.id === addonId);
  const bound = new Set(state.selectedRecipeIds.flatMap((id) => state.recipeIngredientBindings?.[id] ?? []));
  const usedByOtherAddon = (state.selectedAddons ?? []).some((entry) => !(entry.mainRecipeId === recipe.id && entry.addonType === addonId) && entry.ingredientId === ingredientId);
  if (!addon || !addonIsCompatible(recipe, addon, ingredientId, ingredients) || !asSet(state.availableIngredientIds).has(ingredientId) || bound.has(ingredientId) || usedByOtherAddon) return state;
  const selectedAddons = (state.selectedAddons ?? []).filter((entry) => !(entry.mainRecipeId === recipe.id && entry.addonType === addonId));
  return { ...state, selectedAddons: [...selectedAddons, { mainRecipeId: recipe.id, addonType: addonId, ingredientId }] };
}

export function removeSelectedAddon(state: MealState, recipeId: string, addonId: string) {
  const selectedAddons = (state.selectedAddons ?? []).filter((entry) => !(entry.mainRecipeId === recipeId && entry.addonType === addonId));
  return { ...state, selectedAddons };
}
