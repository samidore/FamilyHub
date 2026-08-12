import kbText from '../../FAMILY_MEAL_KB.md?raw';
import { parseMealKb } from './mealParser.mjs';

export const mealData = parseMealKb(kbText);
export const mealRecipes = mealData.recipes;
