/** Colours candidate contributions from the same unmet requirements as meal progress. */
import { aggregateSelection, unmetCompletionRequirements, type MealIngredient, type MealOptionalGroup, type MealRecipe, type MealState } from './mealEngine.ts';

export function renderCandidateContributions(card: HTMLElement, recipe: MealRecipe, state: MealState | null, recipes: MealRecipe[], ingredients: MealIngredient[], groups: MealOptionalGroup[], ready: boolean) {
  const missing = state ? unmetCompletionRequirements(state, aggregateSelection(recipes, state, ingredients, groups)) : [];
  const host = card.querySelector<HTMLElement>('.gives')!;
  host.replaceChildren();
  const add = (goal: typeof missing[number], label: string, child = false) => {
    const gap = ready && missing.includes(goal);
    const chip = document.createElement('span');
    chip.className = `give${gap ? ' give--needed' : ''}`;
    chip.dataset.goal = goal;
    chip.textContent = !ready || gap ? label : child ? `${goal} · 已满` : `${label} · 已满`;
    host.append(chip);
  };
  if (recipe.contribution.protein) add('Protein', `Protein +${recipe.contribution.protein}`);
  if (recipe.contribution.vegetable) add('Vegetable', `Vegetable +${recipe.contribution.vegetable}`);
  if (recipe.contribution.staple) add('Staple', 'Staple ✓');
  if (recipe.childCoverage.protein === true) add('孩子蛋白', '孩子蛋白 ✓', true);
  if (recipe.childCoverage.vegetable === true) add('孩子蔬菜', '孩子蔬菜 ✓', true);
  if (recipe.childCoverage.vegetable === 'ingredient-dependent') add('孩子蔬菜', '孩子蔬菜：按食材', true);
}
