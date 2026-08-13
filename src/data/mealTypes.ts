import type { IngredientChildCoverage, InventoryTracking, MealAddon, MealRecipe } from '../lib/mealEngine';

export interface MealDataIngredient {
  id: string;
  nameZh: string;
  nameEn: string;
  visible: boolean;
  section: string;
  order: number;
  tags: string[];
  inventoryTracking: InventoryTracking;
  childCoverage?: { vegetable: IngredientChildCoverage };
}

export interface MealDataRecipe extends MealRecipe {
  nameZh: string;
  nameEn: string;
  tags: string[];
  primaryRole: string;
  mainProteinCategory: string;
  mealAddons: MealAddon[];
  checkoutUnits: Record<string, number>;
  ingredientChildCoverage: Record<string, IngredientChildCoverage>;
  activeMinutes: string;
  equipment: string[];
  detailLevel: string;
  steps: string[];
  childServing: string;
  adultFinish: string;
  substitutions: string[];
  childTexture: string;
  notes: string;
  vegetableCentered: boolean;
}

export interface MealData {
  metadata: { version: string; lastUpdated: string };
  starterSections: { id: string; labelZh: string; labelEn: string; order: number; visible: boolean }[];
  ingredients: MealDataIngredient[];
  recipes: MealDataRecipe[];
}
