import { parse as parseYaml } from 'yaml';

const INGREDIENT_KEYS = new Set(['id', 'type', 'status', 'name_zh', 'name_en', 'starter', 'tags', 'child_coverage', 'inventory_tracking', 'fit', 'evidence', 'notes']);
const RECIPE_KEYS = new Set(['id', 'type', 'status', 'name_zh', 'name_en', 'tags', 'fit', 'evidence', 'notes', 'primary_role', 'main_protein_category', 'main_protein_ingredient_ids', 'supporting_protein_ingredient_ids', 'vegetable_ingredient_ids', 'meal_contribution', 'child_coverage', 'integral_staple_ingredient_ids', 'recommended_staple_ingredient_ids', 'active_minutes', 'meal_window_minutes', 'elapsed_minutes', 'advance_start_required', 'equipment', 'burner_plan', 'child_suitable', 'child_texture', 'spicy_in_base', 'deep_fried', 'salt_level', 'oil_level', 'servings', 'detail_level', 'ingredients', 'cook_ingredients', 'steps', 'child_serving', 'adult_finish', 'substitutions', 'checkout_units']);
const CONTRIBUTIONS = new Set([0, 0.5, 1, 2]);
const STARTER_KEYS = new Set(['visible', 'section', 'order']);
const SECTION_KEYS = new Set(['id', 'label_zh', 'label_en', 'order', 'visible']);
const FIT_KEYS = new Set(['hard_rules', 'score', 'strengths', 'tradeoffs']);
const EVIDENCE_KEYS = new Set(['level', 'checked_on', 'scope', 'sources']);
const CONTRIBUTION_KEYS = new Set(['protein', 'vegetable', 'staple']);
const RECIPE_CHILD_KEYS = new Set(['protein', 'vegetable']);
const INGREDIENT_CHILD_KEYS = new Set(['vegetable']);
const REQUIREMENT_KEYS = new Set(['ingredient_id', 'one_of', 'role']);
const INVENTORY_TRACKING = new Set(['counted', 'presence-only']);
const ACTIVE_STATUSES = new Set(['candidate', 'approved']);
const DETAIL_LEVELS = new Set(['discoverable', 'cookable', 'household-tested']);

const assert = (condition, message) => { if (!condition) throw new Error(`Meal data: ${message}`); };
const assertKeys = (record, allowed) => {
  const unknown = Object.keys(record ?? {}).filter((key) => !allowed.has(key));
  assert(!unknown.length, `${record?.id ?? record?.type ?? 'record'} has unknown fields: ${unknown.join(', ')}`);
};
const stringArray = (value) => Array.isArray(value) ? value.map(String) : [];
const coverageValue = (value, label) => {
  assert(value === true || value === false || value === 'ingredient-dependent', `${label} has invalid child coverage`);
  return value;
};

function parseMealRecords(metadata, sectionRecords, ingredientRecords, recipeRecords, enforceCurrentContent = true) {
  assert(typeof metadata.version === 'number' || typeof metadata.version === 'string', 'content version must be a number or string');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(metadata.last_updated), 'last_updated must use YYYY-MM-DD');
  const starterSections = sectionRecords.map((section) => {
    assertKeys(section, SECTION_KEYS);
    return { id: String(section.id), labelZh: String(section.label_zh), labelEn: String(section.label_en), order: Number(section.order), visible: section.visible === true };
  });
  const sectionIds = new Set(starterSections.map((section) => section.id));
  assert(sectionIds.size === starterSections.length, 'starter section IDs must be unique');

  assert(ingredientRecords.length > 0, 'no ingredient records found');
  assert(recipeRecords.length > 0, 'no recipe records found');

  const ingredientIds = new Set();
  const ingredientRaw = ingredientRecords.map((record) => {
    assertKeys(record, INGREDIENT_KEYS);
    assert(/^[a-z0-9-]+$/.test(record.id), `ingredient ${record.id} has invalid ID`);
    assert(ACTIVE_STATUSES.has(record.status) || record.status === 'archived', `${record.id} has invalid status`);
    assert(!ingredientIds.has(record.id), `duplicate ingredient ID ${record.id}`);
    ingredientIds.add(record.id);
    assertKeys(record.starter ?? {}, STARTER_KEYS); assertKeys(record.fit ?? {}, FIT_KEYS); assertKeys(record.evidence ?? {}, EVIDENCE_KEYS); assertKeys(record.child_coverage ?? {}, INGREDIENT_CHILD_KEYS);
    assert(INVENTORY_TRACKING.has(record.inventory_tracking), `${record.id} has invalid inventory_tracking`);
    assert(record.starter && typeof record.starter.visible === 'boolean', `${record.id} has invalid starter visibility`);
    assert(sectionIds.has(record.starter.section), `${record.id} has unknown starter section ${record.starter.section}`);
    assert(Number.isInteger(record.starter.order) && record.starter.order > 0, `${record.id} has invalid starter order`);
    if (record.child_coverage) assert(record.child_coverage.vegetable === true || record.child_coverage.vegetable === false || record.child_coverage.vegetable === 'unknown', `${record.id} has invalid ingredient child coverage`);
    return record;
  });
  const ingredients = ingredientRaw.map((record) => ({
    id: record.id, nameZh: String(record.name_zh), nameEn: String(record.name_en),
    visible: record.starter.visible, section: String(record.starter.section), order: Number(record.starter.order),
    tags: stringArray(record.tags), inventoryTracking: record.inventory_tracking,
    childCoverage: record.child_coverage ? { vegetable: record.child_coverage.vegetable } : undefined,
  }));
  for (const section of starterSections) {
    const orders = ingredients.filter((ingredient) => ingredient.section === section.id).map((ingredient) => ingredient.order);
    assert(new Set(orders).size === orders.length, `${section.id} starter orders must be unique`);
  }

  const recipeIds = new Set();
  const recipes = recipeRecords.map((record, order) => {
    assertKeys(record, RECIPE_KEYS);
    assert(/^[a-z0-9-]+$/.test(record.id), `recipe ${record.id} has invalid ID`);
    assert(ACTIVE_STATUSES.has(record.status) || record.status === 'archived', `${record.id} has invalid status`);
    assert(!recipeIds.has(record.id), `duplicate recipe ID ${record.id}`);
    recipeIds.add(record.id);
    assertKeys(record.fit ?? {}, FIT_KEYS); assertKeys(record.evidence ?? {}, EVIDENCE_KEYS); assertKeys(record.meal_contribution ?? {}, CONTRIBUTION_KEYS); assertKeys(record.child_coverage ?? {}, RECIPE_CHILD_KEYS);
    for (const key of ['protein', 'vegetable', 'staple']) assert(CONTRIBUTIONS.has(record.meal_contribution?.[key]), `${record.id} has invalid ${key} contribution`);
    const childCoverage = { protein: coverageValue(record.child_coverage?.protein, `${record.id}.protein`), vegetable: coverageValue(record.child_coverage?.vegetable, `${record.id}.vegetable`) };
    assert(typeof record.advance_start_required === 'boolean', `${record.id} has invalid advance-start flag`);
    assert(DETAIL_LEVELS.has(record.detail_level), `${record.id} has an invalid detail_level`);
    const requirements = [];
    for (const entry of record.ingredients ?? []) {
      assertKeys(entry, REQUIREMENT_KEYS);
      const identities = Number(Boolean(entry.ingredient_id)) + Number(Array.isArray(entry.one_of));
      assert(identities === 1, `${record.id} ingredient entry requires exactly one identity`);
      const anyOf = entry.ingredient_id ? [String(entry.ingredient_id)] : stringArray(entry.one_of);
      assert(anyOf.length > 0, `${record.id} has an empty required ingredient choice`);
      for (const id of anyOf) assert(ingredientIds.has(id), `${record.id} references missing ingredient ${id}`);
      requirements.push({ anyOf, role: String(entry.role ?? '') });
    }
    if (record.detail_level !== 'discoverable') {
      assert(Array.isArray(record.cook_ingredients) && record.cook_ingredients.length > 0 && record.cook_ingredients.every((entry) => typeof entry === 'string' && entry.trim().length > 0), `${record.id} cookable record requires cook_ingredients`);
      assert(Array.isArray(record.steps) && record.steps.length > 0 && record.steps.every((step) => typeof step === 'string' && step.trim().length > 0), `${record.id} cookable record requires executable steps`);
      assert(Array.isArray(record.equipment) && record.equipment.length > 0 && record.equipment.every((item) => typeof item === 'string' && item.trim().length > 0), `${record.id} cookable record requires equipment`);
    }
    const checkoutUnits = {};
    if (record.checkout_units !== undefined) {
      assert(record.checkout_units && typeof record.checkout_units === 'object' && !Array.isArray(record.checkout_units), `${record.id} has invalid checkout_units`);
      for (const [id, units] of Object.entries(record.checkout_units)) {
        assert(ingredientIds.has(id), `${record.id} checkout_units references missing ingredient ${id}`);
        assert(typeof units === 'number' && units > 0 && units % 0.5 === 0, `${record.id} checkout_units has invalid units`);
        checkoutUnits[id] = units;
      }
    }
    return {
      id: record.id, nameZh: String(record.name_zh), nameEn: String(record.name_en), tags: stringArray(record.tags), primaryRole: String(record.primary_role),
      mainProteinCategory: String(record.main_protein_category ?? 'none'), fitScore: Number(record.fit?.score ?? 0), order,
      contribution: { protein: Number(record.meal_contribution.protein), vegetable: Number(record.meal_contribution.vegetable), staple: Number(record.meal_contribution.staple) },
      childCoverage, requirements, cookIngredientLines: stringArray(record.cook_ingredients),
      checkoutUnits,
      ingredientChildCoverage: Object.fromEntries(requirements.flatMap((requirement) => requirement.anyOf).map((id) => [id, ingredients.find((item) => item.id === id)?.childCoverage?.vegetable ?? 'unknown'])),
      activeMinutes: String(record.active_minutes ?? ''), mealWindowMinutes: String(record.meal_window_minutes ?? ''), elapsedMinutes: String(record.elapsed_minutes ?? ''), advanceStartRequired: record.advance_start_required,
      equipment: stringArray(record.equipment), detailLevel: String(record.detail_level), steps: stringArray(record.steps), childServing: String(record.child_serving ?? ''), adultFinish: String(record.adult_finish ?? ''), substitutions: stringArray(record.substitutions), childTexture: String(record.child_texture ?? ''), notes: String(record.notes ?? ''), vegetableCentered: stringArray(record.evidence?.sources).some((source) => /^V\d{2}\s*[—-]/.test(source)),
    };
  });
  if (enforceCurrentContent) {
    const standaloneRequired = ingredients.filter((ingredient) => ingredient.visible && !ingredient.tags.includes('addon-only'));
    for (const ingredient of standaloneRequired) {
      assert(
        recipes.some((recipe) => recipe.requirements.length === 1 && recipe.requirements[0].anyOf.includes(ingredient.id)),
        `${ingredient.id} is missing a standalone Recipe; tag it addon-only only when that is the intentional product behavior`,
      );
    }
    assert(recipes.some((recipe) => recipe.id === 'simple-stir-fried-leafy-greens' && recipe.childCoverage.vegetable === true), 'softened leafy-greens Child Vegetable coverage is missing');
  }

  return {
    metadata: { version: String(metadata.version), lastUpdated: String(metadata.last_updated) },
    starterSections: starterSections.filter((section) => section.visible).sort((a, b) => a.order - b.order),
    ingredients: ingredients.sort((a, b) => a.order - b.order), recipes,
  };
}

const ROOT_KEYS = new Set(['schema_version', 'content_version', 'last_updated', 'ingredients', 'recipes']);
const INGREDIENT_INDEX_KEYS = new Set(['categories']);
const INGREDIENT_CATEGORY_KEYS = new Set(['id', 'label_zh', 'label_en', 'order', 'visible', 'file', 'ingredient_ids']);
const RECIPE_INDEX_KEYS = new Set(['categories']);
const RECIPE_CATEGORY_KEYS = new Set(['id', 'directory']);
const RECIPE_CATEGORY_INDEX_KEYS = new Set(['recipes']);
const yamlFile = (files, path) => {
  const text = files[path];
  assert(typeof text === 'string', `missing indexed file ${path}`);
  const value = parseYaml(text);
  assert(value && typeof value === 'object' && !Array.isArray(value), `${path} must contain a YAML object`);
  return value;
};
const pathIsSafe = (value) => typeof value === 'string' && /^(?!.*(?:^|\/)\.\.(?:\/|$))[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*\.yaml$/.test(value);

/** Parse a complete Meal Builder directory supplied as relative YAML paths to text. */
export function parseMealFiles(files) {
  assert(files && typeof files === 'object', 'meal files must be a path-to-text object');
  const paths = Object.keys(files).sort();
  assert(paths.every((path) => pathIsSafe(path)), 'meal data contains an invalid path');
  const root = yamlFile(files, 'index.yaml');
  assertKeys(root, ROOT_KEYS);
  assert(root.schema_version === 1, 'unsupported schema_version');
  assert(typeof root.content_version === 'string' && root.content_version.length > 0, 'content_version must be a string');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(root.last_updated), 'last_updated must use YYYY-MM-DD');
  assert(root.ingredients === 'ingredients/index.yaml' && root.recipes === 'recipe/index.yaml', 'root data indexes are invalid');

  const ingredientIndex = yamlFile(files, root.ingredients);
  assertKeys(ingredientIndex, INGREDIENT_INDEX_KEYS);
  assert(Array.isArray(ingredientIndex.categories) && ingredientIndex.categories.length > 0, 'ingredient categories are missing');
  const activePaths = new Set(['index.yaml', root.ingredients, root.recipes]);
  const ingredientRecords = [];
  const ingredientIds = new Set();
  const starterSections = [];
  for (const category of ingredientIndex.categories) {
    assertKeys(category, INGREDIENT_CATEGORY_KEYS);
    assert(typeof category.id === 'string' && category.file === `${category.id}.yaml` && pathIsSafe(`ingredients/${category.file}`), 'ingredient category file is invalid');
    starterSections.push({ id: category.id, label_zh: category.label_zh, label_en: category.label_en, order: category.order, visible: category.visible });
    const filePath = `ingredients/${category.file}`;
    const categoryFile = yamlFile(files, filePath);
    assertKeys(categoryFile, new Set(['ingredients']));
    assert(Array.isArray(categoryFile.ingredients) && Array.isArray(category.ingredient_ids), `${filePath} is missing ingredients`);
    const ids = categoryFile.ingredients.map((record) => record?.id);
    assert(JSON.stringify(ids) === JSON.stringify(category.ingredient_ids), `${filePath} does not match its ingredient index`);
    for (const record of categoryFile.ingredients) {
      assert(record?.type === 'ingredient' && record.starter?.section === category.id, `${filePath} has an invalid ingredient category`);
      assert(ACTIVE_STATUSES.has(record.status), `${filePath} contains a non-active Ingredient`);
      assert(!ingredientIds.has(record.id), `duplicate ingredient ID ${record.id}`); ingredientIds.add(record.id); ingredientRecords.push(record);
    }
    activePaths.add(filePath);
  }

  const recipeIndex = yamlFile(files, root.recipes);
  assertKeys(recipeIndex, RECIPE_INDEX_KEYS);
  assert(Array.isArray(recipeIndex.categories) && recipeIndex.categories.length > 0, 'recipe categories are missing');
  const recipeRecords = [];
  const recipeIds = new Set();
  for (const category of recipeIndex.categories) {
    assertKeys(category, RECIPE_CATEGORY_KEYS);
    assert(typeof category.id === 'string' && category.directory === category.id && /^[a-z0-9-]+$/.test(category.id), 'recipe category is invalid');
    const indexPath = `recipe/${category.directory}/index.yaml`;
    const categoryIndex = yamlFile(files, indexPath);
    assertKeys(categoryIndex, RECIPE_CATEGORY_INDEX_KEYS);
    assert(Array.isArray(categoryIndex.recipes), `${indexPath} is missing recipes`);
    activePaths.add(indexPath);
    for (const id of categoryIndex.recipes) {
      assert(typeof id === 'string' && /^[a-z0-9-]+$/.test(id), `${indexPath} has an invalid recipe ID`);
      assert(!ingredientIds.has(id), `stable ID is shared by Ingredient and Recipe ${id}`);
      const recipePath = `recipe/${category.directory}/${id}.yaml`;
      const record = yamlFile(files, recipePath);
      assert(record.id === id && record.type === 'recipe', `${recipePath} has an invalid recipe or filename mismatch`);
      assert(ACTIVE_STATUSES.has(record.status), `${recipePath} must have an active status`);
      assert(!recipeIds.has(id), `duplicate recipe ID ${id}`); recipeIds.add(id); recipeRecords.push(record); activePaths.add(recipePath);
    }
  }
  for (const path of paths.filter((path) => !path.startsWith('archive/'))) assert(activePaths.has(path), `unindexed active file ${path}`);

  const allIds = new Set([...ingredientIds, ...recipeIds]);
  const archivedIngredients = [];
  const archivedRecipes = [];
  for (const path of paths.filter((path) => path.startsWith('archive/'))) {
    const record = yamlFile(files, path);
    assert(record.status === 'archived' && (record.type === 'ingredient' || record.type === 'recipe') && typeof record.id === 'string', `${path} is not a valid archived record`);
    assert(path.endsWith(`/${record.id}.yaml`), `${path} does not match archived ID ${record.id}`);
    assert(!allIds.has(record.id), `archived ID conflicts with active ID ${record.id}`); allIds.add(record.id);
    (record.type === 'ingredient' ? archivedIngredients : archivedRecipes).push(record);
  }
  const metadata = { version: root.content_version, last_updated: root.last_updated };
  const activeData = parseMealRecords(metadata, starterSections, ingredientRecords, recipeRecords);
  if (archivedIngredients.length || archivedRecipes.length) {
    parseMealRecords(metadata, starterSections, [...ingredientRecords, ...archivedIngredients], [...recipeRecords, ...archivedRecipes], false);
  }
  return activeData;
}
