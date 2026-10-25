import type { HouseholdState } from './household.ts';
import type { NotebookItem, NotebookState } from './notebookDomain.ts';
import { getNotebookDueSoonState, notebookLocalDateKey } from './notebookDueSoon.ts';
import { freshnessAgeDays } from './mealEngine.ts';

export interface TodayCatalog {
  recipes: { id: string; nameZh: string; finishOptions?: { id: string; default: boolean; displayNameZh?: string }[] }[];
  ingredients: { id: string; nameZh?: string; inventoryTracking: 'counted' | 'presence-only'; inventoryFreshness?: 'fifo'; freshnessPriorityDays?: number }[];
}

export interface TodayMeal {
  status: 'selecting' | 'ready' | 'cooking';
  dishes: string[];
  note: string;
}
export interface TodayStockAlert { id: string; name: string; quantity: number; ageDays?: number; }
export interface TodayThawAlert { id: string; name: string; quantity: number; readyAt: number; }
export interface TodaySummary {
  urgent: NotebookItem[];
  upcoming: NotebookItem[];
  meal: TodayMeal | null;
  queuedMeals: number;
  expiring: TodayStockAlert[];
  highStock: TodayStockAlert[];
  thawing: TodayThawAlert[];
}

const calendarDays = (date: string) => {
  const value = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(value) ? Math.floor(value / 86400000) : null;
};

export function buildTodaySummary(
  household: HouseholdState,
  notebook: NotebookState,
  catalog: TodayCatalog,
  now = Date.now(),
): TodaySummary {
  const today = notebookLocalDateKey(now);
  const todayDay = calendarDays(today)!;
  const active = Object.values(notebook.items).filter((item) => item.status === 'active');
  const dueDistance = (item: NotebookItem) =>
    item.dueDate ? (calendarDays(item.dueDate) ?? Number.POSITIVE_INFINITY) - todayDay : Number.POSITIVE_INFINITY;
  const urgent = active.filter((item) => item.priority === 'urgent' || getNotebookDueSoonState(item, today) !== null)
    .sort((a, b) => dueDistance(a) - dueDistance(b) || (a.priority === 'urgent' ? -1 : 1) - (b.priority === 'urgent' ? -1 : 1) || a.title.localeCompare(b.title));
  const upcoming = active.filter((item) => dueDistance(item) >= 0 && dueDistance(item) <= 7)
    .sort((a, b) => dueDistance(a) - dueDistance(b) || (a.dueTime ?? '').localeCompare(b.dueTime ?? '') || a.title.localeCompare(b.title));

  const recipeById = new Map(catalog.recipes.map((recipe) => [recipe.id, recipe]));
  const current = household.currentMeal;
  const meal = current && (current.selectedRecipeIds.length > 0 || current.note.trim())
    ? {
        status: current.status,
        dishes: current.selectedRecipeIds.map((id) => {
          const recipe = recipeById.get(id);
          if (!recipe) return null;
          const finish = recipe.finishOptions?.find((option) => option.id === current.recipeFinishSelections[id])
            ?? recipe.finishOptions?.find((option) => option.default);
          return finish?.displayNameZh || recipe.nameZh;
        }).filter((name): name is string => Boolean(name)),
        note: current.note,
      }
    : null;

  const expiring: TodayStockAlert[] = [];
  const highStock: TodayStockAlert[] = [];
  for (const ingredient of catalog.ingredients) {
    if (ingredient.inventoryTracking !== 'counted') continue;
    const stocked = typeof household.inventory[ingredient.id] === 'number' ? household.inventory[ingredient.id] as number : 0;
    const frozen = typeof household.freezerInventory[ingredient.id] === 'number' ? household.freezerInventory[ingredient.id] as number : 0;
    const name = ingredient.nameZh ?? ingredient.id;
    if (stocked + frozen >= 4) highStock.push({ id: ingredient.id, name, quantity: stocked + frozen });
    if (ingredient.inventoryFreshness !== 'fifo' || !ingredient.freshnessPriorityDays) continue;
    const priorityBatches = Object.entries(household.inventoryBatches[ingredient.id] ?? {})
      .map(([date, quantity]) => ({ ageDays: freshnessAgeDays(date, today), quantity }))
      .filter((batch) => batch.ageDays > ingredient.freshnessPriorityDays!);
    if (priorityBatches.length) expiring.push({
      id: ingredient.id, name,
      quantity: priorityBatches.reduce((sum, batch) => sum + batch.quantity, 0),
      ageDays: Math.max(...priorityBatches.map((batch) => batch.ageDays)),
    });
  }
  expiring.sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0) || a.name.localeCompare(b.name));
  highStock.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));

  const ingredientName = new Map(catalog.ingredients.map((ingredient) => [ingredient.id, ingredient.nameZh ?? ingredient.id]));
  const thawing = Object.entries(household.thawingItems)
    .map(([id, job]) => ({ id, name: ingredientName.get(job.ingredientId) ?? job.ingredientId, quantity: job.quantity, readyAt: job.readyAt }))
    .sort((a, b) => a.readyAt - b.readyAt);
  return { urgent, upcoming, meal, queuedMeals: household.pendingCheckoutMeals.length, expiring, highStock, thawing };
}
