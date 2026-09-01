import type { FreezerBehavior, IngredientChildCoverage, InventoryFreshness, InventoryTracking, MealOptionalGroup, MealRecipe } from '../lib/mealEngine';

export interface MealDataIngredient {
  id: string;
  nameZh: string;
  nameEn: string;
  visible: boolean;
  section: string;
  order: number;
  tags: string[];
  inventoryTracking: InventoryTracking;
  inventoryFreshness?: InventoryFreshness;
  freezerBehavior?: FreezerBehavior;
  freshnessPriorityDays?: number;
  childCoverage?: { vegetable: IngredientChildCoverage };
}

export interface MealDataRecipe extends MealRecipe {
  nameZh: string;
  nameEn: string;
  tags: string[];
  primaryRole: string;
  mainProteinCategory: string;
  supportingProteinIngredientIds: string[];
  optionalGroupIds: string[];
  checkoutUnits: Record<string, number>;
  ingredientChildCoverage: Record<string, IngredientChildCoverage>;
  activeMinutes: string;
  equipment: string[];
  detailLevel: string;
  cookIngredientLines: string[];
  steps: string[];
  childServing: string;
  adultFinish: string;
  substitutions: string[];
  childTexture: string;
  vegetableCentered: boolean;
}

export interface MealData {
  metadata: { version: string; lastUpdated: string };
  starterSections: { id: string; labelZh: string; labelEn: string; order: number; visible: boolean }[];
  ingredients: MealDataIngredient[];
  optionalGroups: MealOptionalGroup[];
  recipes: MealDataRecipe[];
}
