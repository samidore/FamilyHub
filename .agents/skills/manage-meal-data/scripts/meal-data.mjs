#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';

const repoRoot = process.cwd();
const dataRoot = path.join(repoRoot, 'src', 'data', 'meal-builder');

const slash = (value) => value.replaceAll('\\', '/');
const words = (value) => String(value ?? '').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

async function yamlFiles() {
  const names = (await readdir(dataRoot, { recursive: true })).filter((name) => name.endsWith('.yaml'));
  return Promise.all(names.map(async (name) => {
    const relativePath = slash(name);
    const text = await readFile(path.join(dataRoot, name), 'utf8');
    return { path: relativePath, text, value: parseYaml(text) };
  }));
}

function recordsFrom(file) {
  if (file.value?.type === 'recipe' || file.value?.type === 'ingredient') return [file.value];
  return Array.isArray(file.value?.ingredients) ? file.value.ingredients : [];
}

export async function inspect(query) {
  if (!query) throw new Error('inspect requires a name or stable ID');
  const queryText = query.toLocaleLowerCase();
  const queryWords = new Set(words(query));
  const matches = [];
  for (const file of await yamlFiles()) {
    for (const record of recordsFrom(file)) {
      const labels = [record.id, record.name_zh, record.name_en].filter(Boolean).map(String);
      const haystack = labels.join(' ').toLocaleLowerCase();
      const overlap = [...queryWords].filter((word) => words(haystack).includes(word)).length;
      const exact = labels.some((label) => label.toLocaleLowerCase() === queryText);
      if (!exact && !haystack.includes(queryText) && overlap === 0) continue;
      matches.push({
        id: record.id,
        type: record.type,
        status: record.status,
        name_zh: record.name_zh,
        name_en: record.name_en,
        path: file.path,
        match: exact ? 'exact' : haystack.includes(queryText) ? 'substring' : 'token',
        semantic_review: record.type === 'recipe' ? {
          primary_role: record.primary_role,
          main_protein_category: record.main_protein_category,
          equipment: record.equipment ?? [],
          tags: record.tags ?? [],
          ingredients: record.ingredients ?? [],
          steps: record.steps ?? [],
        } : undefined,
      });
    }
  }
  return matches.sort((a, b) => ['exact', 'substring', 'token'].indexOf(a.match) - ['exact', 'substring', 'token'].indexOf(b.match));
}

export async function references(id) {
  if (!id) throw new Error('references requires a stable ID');
  const hits = [];
  for (const file of await yamlFiles()) {
    const lines = file.text.split(/\r?\n/);
    const lineNumbers = lines.flatMap((line, index) => line.includes(id) ? [index + 1] : []);
    if (lineNumbers.length) hits.push({ path: file.path, lines: lineNumbers });
  }
  return hits;
}

export async function nextOrder(kind, category) {
  if (!['ingredient', 'recipe'].includes(kind) || !category) throw new Error('next-order requires ingredient|recipe and a category');
  const files = await yamlFiles();
  if (kind === 'recipe') {
    const index = files.find((file) => file.path === `recipe/${category}/index.yaml`);
    if (!index || !Array.isArray(index.value?.recipes)) throw new Error(`unknown Recipe category ${category}`);
    return { category, append_position: index.value.recipes.length + 1, after_id: index.value.recipes.at(-1) ?? null };
  }
  const categoryFile = files.find((file) => file.path === `ingredients/${category}.yaml`);
  if (!categoryFile || !Array.isArray(categoryFile.value?.ingredients)) throw new Error(`unknown Ingredient category ${category}`);
  const maximum = Math.max(0, ...categoryFile.value.ingredients.map((record) => Number(record.starter?.order) || 0));
  return { category, order: Math.floor(maximum / 10) * 10 + 10 };
}

export async function verifyItem(id) {
  if (!id) throw new Error('verify-item requires a stable ID');
  const files = await yamlFiles();
  const locations = files.flatMap((file) => recordsFrom(file).filter((record) => record.id === id).map((record) => ({ path: file.path, type: record.type, status: record.status })));
  if (locations.length !== 1) throw new Error(`${id} must resolve to exactly one record; found ${locations.length}`);
  const loaderUrl = pathToFileURL(path.join(repoRoot, 'scripts', 'load-meal-data.mjs')).href;
  await (await import(loaderUrl)).loadMealData();
  return { id, valid: true, ...locations[0], references: await references(id) };
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const result = command === 'inspect' ? await inspect(args.join(' '))
    : command === 'references' ? await references(args[0])
      : command === 'next-order' ? await nextOrder(args[0], args[1])
        : command === 'verify-item' ? await verifyItem(args[0])
          : (() => { throw new Error('usage: meal-data.mjs inspect|references|next-order|verify-item ...'); })();
  console.log(JSON.stringify(result, null, 2));
}

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
