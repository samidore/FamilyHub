import { parse as parseYaml } from 'yaml';

const INGREDIENT_KEYS = new Set(['id', 'type', 'status', 'name_zh', 'name_en', 'starter', 'tags', 'child_coverage', 'inventory_tracking', 'fit', 'evidence', 'notes']);
const RECIPE_KEYS = new Set(['id', 'type', 'status', 'name_zh', 'name_en', 'tags', 'fit', 'evidence', 'notes', 'primary_role', 'main_protein_category', 'main_protein_ingredient_ids', 'supporting_protein_ingredient_ids', 'vegetable_ingredient_ids', 'meal_contribution', 'child_coverage', 'meal_addons', 'integral_staple_ingredient_ids', 'recommended_staple_ingredient_ids', 'active_minutes', 'meal_window_minutes', 'elapsed_minutes', 'advance_start_required', 'equipment', 'burner_plan', 'child_suitable', 'child_texture', 'spicy_in_base', 'deep_fried', 'salt_level', 'oil_level', 'servings', 'detail_level', 'ingredients', 'steps', 'child_serving', 'adult_finish', 'substitutions', 'checkout_units']);
const ADDON_KEYS = new Set(['id', 'accepts_ingredient_tag', 'meal_contribution', 'child_coverage', 'notes']);
const CONTRIBUTIONS = new Set([0, 0.5, 1, 2]);
const STARTER_KEYS = new Set(['visible', 'section', 'order']);
const SECTION_KEYS = new Set(['id', 'label_zh', 'label_en', 'order', 'visible']);
const FIT_KEYS = new Set(['hard_rules', 'score', 'strengths', 'tradeoffs']);
const EVIDENCE_KEYS = new Set(['level', 'checked_on', 'scope', 'sources']);
const CONTRIBUTION_KEYS = new Set(['protein', 'vegetable', 'staple']);
const RECIPE_CHILD_KEYS = new Set(['protein', 'vegetable']);
const INGREDIENT_CHILD_KEYS = new Set(['vegetable']);
const REQUIREMENT_KEYS = new Set(['ingredient_id', 'one_of', 'pantry_core', 'role', 'availability']);
const ADDON_ID = 'finish-with-leafy-vegetable';
const ADDON_TAG = 'finish-wilt-compatible';
const ADDON_RECIPE_COUNT = 7;
const INVENTORY_TRACKING = new Set(['counted', 'presence-only']);
const PRESENCE_ONLY_INGREDIENTS = new Set(['eggs', 'rice', 'noodles', 'bread', 'steamed-buns', 'oats', 'white-oil-sausage']);

const assert = (condition, message) => { if (!condition) throw new Error(`Meal KB: ${message}`); };
const assertKeys = (record, allowed) => {
  const unknown = Object.keys(record ?? {}).filter((key) => !allowed.has(key));
  assert(!unknown.length, `${record?.id ?? record?.type ?? 'record'} has unknown fields: ${unknown.join(', ')}`);
};
const stringArray = (value) => Array.isArray(value) ? value.map(String) : [];
const coverageValue = (value, label) => {
  assert(value === true || value === false || value === 'ingredient-dependent', `${label} has invalid child coverage`);
  return value;
};

export function parseMealKb(text) {
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert(frontmatter, 'frontmatter is missing');
  const metadata = parseYaml(frontmatter[1]);
  assert(typeof metadata.kb_version === 'number', 'kb_version must be numeric');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(metadata.last_updated), 'last_updated must use YYYY-MM-DD');

  const blocks = [...text.matchAll(/```yaml\r?\n([\s\S]*?)```/g)].map((match) => parseYaml(match[1])).filter(Boolean);
  const sectionBlock = blocks.find((block) => Array.isArray(block.starter_sections));
  assert(sectionBlock, 'starter section registry is missing');
  const starterSections = sectionBlock.starter_sections.map((section) => {
    assertKeys(section, SECTION_KEYS);
    return { id: String(section.id), labelZh: String(section.label_zh), labelEn: String(section.label_en), order: Number(section.order), visible: section.visible === true };
  });
  const sectionIds = new Set(starterSections.map((section) => section.id));
  assert(sectionIds.size === starterSections.length, 'starter section IDs must be unique');

  // The shape examples in the KB have no string ID; only typed records count.
  const ingredientRecords = blocks.filter((block) => block.type === 'ingredient' && typeof block.id === 'string');
  const recipeRecords = blocks.filter((block) => block.type === 'recipe' && typeof block.id === 'string');
  assert(ingredientRecords.length === 132, `expected 132 ingredients, found ${ingredientRecords.length}`);
  assert(recipeRecords.length === 162, `expected 162 recipes, found ${recipeRecords.length}`);

  const ingredientIds = new Set();
  const ingredientRaw = ingredientRecords.map((record) => {
    assertKeys(record, INGREDIENT_KEYS);
    assert(/^[a-z0-9-]+$/.test(record.id), `ingredient ${record.id} has invalid ID`);
    assert(!ingredientIds.has(record.id), `duplicate ingredient ID ${record.id}`);
    ingredientIds.add(record.id);
    assertKeys(record.starter ?? {}, STARTER_KEYS); assertKeys(record.fit ?? {}, FIT_KEYS); assertKeys(record.evidence ?? {}, EVIDENCE_KEYS); assertKeys(record.child_coverage ?? {}, INGREDIENT_CHILD_KEYS);
    assert(INVENTORY_TRACKING.has(record.inventory_tracking), `${record.id} has invalid inventory_tracking`);
    assert((record.inventory_tracking === 'presence-only') === PRESENCE_ONLY_INGREDIENTS.has(record.id), `${record.id} must use the approved inventory_tracking mode`);
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
  assert(ingredients.filter((ingredient) => ingredient.visible).length === 129, 'expected 129 visible starter ingredients');
  for (const section of starterSections) {
    const orders = ingredients.filter((ingredient) => ingredient.section === section.id).map((ingredient) => ingredient.order);
    assert(new Set(orders).size === orders.length, `${section.id} starter orders must be unique`);
  }
  const taggedIngredients = ingredients.filter((ingredient) => ingredient.tags.includes(ADDON_TAG)).map((ingredient) => ingredient.id).sort();
  assert(taggedIngredients.length === 5, 'finish-wilt capability tag count must be five');

  const recipeIds = new Set();
  const recipes = recipeRecords.map((record, order) => {
    assertKeys(record, RECIPE_KEYS);
    assert(/^[a-z0-9-]+$/.test(record.id), `recipe ${record.id} has invalid ID`);
    assert(!recipeIds.has(record.id), `duplicate recipe ID ${record.id}`);
    recipeIds.add(record.id);
    assertKeys(record.fit ?? {}, FIT_KEYS); assertKeys(record.evidence ?? {}, EVIDENCE_KEYS); assertKeys(record.meal_contribution ?? {}, CONTRIBUTION_KEYS); assertKeys(record.child_coverage ?? {}, RECIPE_CHILD_KEYS);
    for (const key of ['protein', 'vegetable', 'staple']) assert(CONTRIBUTIONS.has(record.meal_contribution?.[key]), `${record.id} has invalid ${key} contribution`);
    const childCoverage = { protein: coverageValue(record.child_coverage?.protein, `${record.id}.protein`), vegetable: coverageValue(record.child_coverage?.vegetable, `${record.id}.vegetable`) };
    assert(typeof record.advance_start_required === 'boolean', `${record.id} has invalid advance-start flag`);
    const requirements = [];
    for (const entry of record.ingredients ?? []) {
      assertKeys(entry, REQUIREMENT_KEYS);
      if (entry.availability === 'assumed') continue;
      assert(entry.availability === 'required', `${record.id} has unsupported ingredient availability`);
      const anyOf = entry.ingredient_id ? [String(entry.ingredient_id)] : stringArray(entry.one_of);
      assert(anyOf.length > 0, `${record.id} has an empty required ingredient choice`);
      for (const id of anyOf) assert(ingredientIds.has(id), `${record.id} references missing ingredient ${id}`);
      requirements.push({ anyOf, role: String(entry.role ?? '') });
    }
    const mealAddons = (record.meal_addons ?? []).map((addon) => {
      assertKeys(addon, ADDON_KEYS);
      assert(addon.id === ADDON_ID, `${record.id} has unsupported meal add-on ${addon.id}`);
      assert(addon.accepts_ingredient_tag === ADDON_TAG, `${record.id} has unsupported add-on capability`);
      assert(addon.meal_contribution?.protein === 0 && addon.meal_contribution?.vegetable === 1 && addon.meal_contribution?.staple === 0, `${record.id} has invalid add-on contribution`);
      assert(addon.child_coverage?.protein === false && addon.child_coverage?.vegetable === 'ingredient-dependent', `${record.id} has invalid add-on child coverage`);
      return { id: addon.id, acceptsIngredientTag: addon.accepts_ingredient_tag, contribution: { protein: 0, vegetable: 1, staple: 0 }, childCoverage: { protein: false, vegetable: 'ingredient-dependent' }, notes: String(addon.notes ?? '') };
    });
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
      childCoverage, requirements, mealAddons,
      checkoutUnits,
      ingredientChildCoverage: Object.fromEntries(requirements.flatMap((requirement) => requirement.anyOf).map((id) => [id, ingredients.find((item) => item.id === id)?.childCoverage?.vegetable ?? 'unknown'])),
      activeMinutes: String(record.active_minutes ?? ''), mealWindowMinutes: String(record.meal_window_minutes ?? ''), elapsedMinutes: String(record.elapsed_minutes ?? ''), advanceStartRequired: record.advance_start_required,
      equipment: stringArray(record.equipment), detailLevel: String(record.detail_level), steps: stringArray(record.steps), childServing: String(record.child_serving ?? ''), adultFinish: String(record.adult_finish ?? ''), substitutions: stringArray(record.substitutions), childTexture: String(record.child_texture ?? ''), notes: String(record.notes ?? ''), vegetableCentered: stringArray(record.evidence?.sources).some((source) => /^V\d{2}\s*[—-]/.test(source)),
    };
  });
  const addOnRecipes = recipes.filter((recipe) => recipe.mealAddons.length > 0);
  assert(addOnRecipes.length === ADDON_RECIPE_COUNT, `expected ${ADDON_RECIPE_COUNT} add-on recipes, found ${addOnRecipes.length}`);
  assert(!recipes.find((recipe) => recipe.id === 'instant-pot-soy-chicken-thighs')?.mealAddons.length, 'Instant Pot soy chicken thighs must not support the add-on');
  assert(recipes.filter((recipe) => recipe.vegetableCentered).length === 23, 'expected 23 Vegetable-centered recipes');
  assert(recipes.some((recipe) => recipe.id === 'simple-stir-fried-leafy-greens' && recipe.childCoverage.vegetable === 'ingredient-dependent'), 'ingredient-dependent Vegetable coverage is missing');

  return {
    metadata: { version: String(metadata.kb_version), lastUpdated: String(metadata.last_updated) },
    starterSections: starterSections.filter((section) => section.visible).sort((a, b) => a.order - b.order),
    ingredients: ingredients.sort((a, b) => a.order - b.order), recipes,
  };
}
