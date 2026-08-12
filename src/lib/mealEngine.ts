export type TimePreference = 'any' | '30' | '45' | '60';
export interface MealState { availableIngredientIds: string[]; proteinTarget: number; vegetableTarget: number; stapleRequired: boolean; childMode: boolean; timePreference: TimePreference; selectedRecipeIds: string[]; }
export interface MealRecipe { id: string; order: number; fitScore: number; contribution: { protein: number; vegetable: number; staple: number }; childCoverage: { protein: boolean; vegetable: boolean }; requirements: { anyOf: string[] }[]; mealWindowMinutes: string; elapsedMinutes: string; advanceStartRequired: boolean; }

export const defaultMealState = (): MealState => ({ availableIngredientIds: [], proteinTarget: 1, vegetableTarget: 2, stapleRequired: true, childMode: true, timePreference: 'any', selectedRecipeIds: [] });
export const isFeasible = (recipe: MealRecipe, available: Set<string>) => recipe.requirements.every((requirement) => requirement.anyOf.some((id) => available.has(id)));
export const aggregateMeal = (selected: MealRecipe[]) => selected.reduce((total, recipe) => ({
  protein: total.protein + recipe.contribution.protein,
  vegetable: total.vegetable + recipe.contribution.vegetable,
  staple: total.staple + recipe.contribution.staple,
  childProtein: total.childProtein || recipe.childCoverage.protein,
  childVegetable: total.childVegetable || recipe.childCoverage.vegetable,
}), { protein: 0, vegetable: 0, staple: 0, childProtein: false, childVegetable: false });

export const isMealComplete = (state: MealState, totals: ReturnType<typeof aggregateMeal>) => totals.protein >= state.proteinTarget && totals.vegetable >= state.vegetableTarget && (!state.stapleRequired || totals.staple >= 1) && (!state.childMode || (totals.childProtein && totals.childVegetable));

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

export function rankCandidates(recipes: MealRecipe[], state: MealState) {
  const available = new Set(state.availableIngredientIds);
  const selectedIds = new Set(state.selectedRecipeIds);
  const selected = recipes.filter((recipe) => selectedIds.has(recipe.id));
  const totals = aggregateMeal(selected);
  const proteinLimit = state.proteinTarget + 0.5;
  const measures = (recipe: MealRecipe) => {
    const next = { protein: totals.protein + recipe.contribution.protein, vegetable: totals.vegetable + recipe.contribution.vegetable, staple: totals.staple + recipe.contribution.staple };
    const childSolved = Number(state.childMode && !totals.childProtein && recipe.childCoverage.protein) + Number(state.childMode && !totals.childVegetable && recipe.childCoverage.vegetable);
    const normalGaps = Number(totals.protein < state.proteinTarget && recipe.contribution.protein > 0) + Number(totals.vegetable < state.vegetableTarget && recipe.contribution.vegetable > 0) + Number(state.stapleRequired && totals.staple < 1 && recipe.contribution.staple > 0);
    const withinProteinTolerance = next.protein <= proteinLimit;
    const overage = Math.max(0, next.protein - proteinLimit) + Math.max(0, next.vegetable - state.vegetableTarget) + Math.max(0, next.staple - (state.stapleRequired ? 1 : 0));
    return { childSolved, normalGaps, withinProteinTolerance, overage, time: timeFit(recipe, state.timePreference) };
  };
  return recipes.filter((recipe) => {
    if (selectedIds.has(recipe.id) || !isFeasible(recipe, available)) return false;
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
