import { parseMealFiles } from './mealParser.mjs';
import type { MealData } from './mealTypes';

const modules = import.meta.glob('./meal-builder/**/*.yaml', { eager: true, import: 'default', query: '?raw' }) as Record<string, string>;
const files = Object.fromEntries(Object.entries(modules).map(([file, text]) => [file.replace('./meal-builder/', ''), text]));

export const mealData: MealData = parseMealFiles(files);
export const mealRecipes = mealData.recipes;
