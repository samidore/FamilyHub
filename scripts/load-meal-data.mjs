import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseMealFiles } from '../src/data/mealParser.mjs';

const root = path.resolve('src/data/meal-builder');

export async function readMealFiles() {
  const names = await readdir(root, { recursive: true });
  const yamlPaths = names.filter((name) => name.endsWith('.yaml'));
  return Object.fromEntries(await Promise.all(yamlPaths.map(async (name) => [name.replaceAll('\\', '/'), await readFile(path.join(root, name), 'utf8')])));
}

/** @returns {Promise<import('../src/data/mealTypes').MealData>} */
export async function loadMealData() {
  return parseMealFiles(await readMealFiles());
}
