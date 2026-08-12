import { parse as parseYaml } from 'yaml';

const INGREDIENT_KEYS = new Set(['id', 'type', 'status', 'name_zh', 'name_en', 'starter', 'tags', 'fit', 'evidence', 'notes']);
const RECIPE_KEYS = new Set(['id', 'type', 'status', 'name_zh', 'name_en', 'tags', 'fit', 'evidence', 'notes', 'primary_role', 'main_protein_category', 'main_protein_ingredient_ids', 'supporting_protein_ingredient_ids', 'vegetable_ingredient_ids', 'meal_contribution', 'child_coverage', 'integral_staple_ingredient_ids', 'recommended_staple_ingredient_ids', 'active_minutes', 'meal_window_minutes', 'elapsed_minutes', 'advance_start_required', 'equipment', 'burner_plan', 'child_suitable', 'child_texture', 'spicy_in_base', 'deep_fried', 'salt_level', 'oil_level', 'servings', 'detail_level', 'ingredients', 'steps', 'child_serving', 'adult_finish', 'substitutions']);
const CONTRIBUTIONS = new Set([0, 0.5, 1, 2]);
const STARTER_KEYS = new Set(['visible', 'section', 'order']);
const SECTION_KEYS = new Set(['id', 'label_zh', 'label_en', 'order', 'visible']);
const FIT_KEYS = new Set(['hard_rules', 'score', 'strengths', 'tradeoffs']);
const EVIDENCE_KEYS = new Set(['level', 'checked_on', 'scope', 'sources']);
const CONTRIBUTION_KEYS = new Set(['protein', 'vegetable', 'staple']);
const CHILD_KEYS = new Set(['protein', 'vegetable']);
const REQUIREMENT_KEYS = new Set(['ingredient_id', 'one_of', 'pantry_core', 'role', 'availability']);
const assert = (condition, message) => { if (!condition) throw new Error(`Meal KB: ${message}`); };
const assertKeys = (record, allowed) => {
  const unknown = Object.keys(record).filter((key) => !allowed.has(key));
  assert(!unknown.length, `${record.id ?? record.type ?? 'record'} has unknown fields: ${unknown.join(', ')}`);
};
const stringArray = (value) => Array.isArray(value) ? value.map(String) : [];

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

  const ingredientRecords = blocks.filter((block) => block.type === 'ingredient' && typeof block.id === 'string');
  const recipeRecords = blocks.filter((block) => block.type === 'recipe' && typeof block.id === 'string');
  assert(ingredientRecords.length === 132, `expected 132 ingredients, found ${ingredientRecords.length}`);
  assert(recipeRecords.length === 139, `expected 139 recipes, found ${recipeRecords.length}`);

  const ingredientIds = new Set();
  const ingredients = ingredientRecords.map((record) => {
    assertKeys(record, INGREDIENT_KEYS);
    assert(typeof record.id === 'string' && /^[a-z0-9-]+$/.test(record.id), 'ingredient has invalid ID');
    assert(!ingredientIds.has(record.id), `duplicate ingredient ID ${record.id}`);
    ingredientIds.add(record.id);
    assertKeys(record.starter ?? {}, STARTER_KEYS); assertKeys(record.fit ?? {}, FIT_KEYS); assertKeys(record.evidence ?? {}, EVIDENCE_KEYS);
    assert(record.starter && typeof record.starter.visible === 'boolean', `${record.id} has invalid starter visibility`);
    assert(sectionIds.has(record.starter.section), `${record.id} has unknown starter section ${record.starter.section}`);
    assert(Number.isInteger(record.starter.order) && record.starter.order > 0, `${record.id} has invalid starter order`);
    return {
      id: record.id, nameZh: String(record.name_zh), nameEn: String(record.name_en),
      visible: record.starter.visible, section: String(record.starter.section), order: Number(record.starter.order),
    };
  });
  assert(ingredients.filter((ingredient) => ingredient.visible).length === 129, 'expected 129 visible starter ingredients');
  for (const section of starterSections) {
    const orders = ingredients.filter((ingredient) => ingredient.section === section.id).map((ingredient) => ingredient.order);
    assert(new Set(orders).size === orders.length, `${section.id} starter orders must be unique`);
  }

  const recipeIds = new Set();
  const recipes = recipeRecords.map((record, order) => {
    assertKeys(record, RECIPE_KEYS);
    assert(typeof record.id === 'string' && /^[a-z0-9-]+$/.test(record.id), 'recipe has invalid ID');
    assert(!recipeIds.has(record.id), `duplicate recipe ID ${record.id}`);
    recipeIds.add(record.id);
    assertKeys(record.fit ?? {}, FIT_KEYS); assertKeys(record.evidence ?? {}, EVIDENCE_KEYS); assertKeys(record.meal_contribution ?? {}, CONTRIBUTION_KEYS); assertKeys(record.child_coverage ?? {}, CHILD_KEYS);
    for (const key of ['protein', 'vegetable', 'staple']) assert(CONTRIBUTIONS.has(record.meal_contribution?.[key]), `${record.id} has invalid ${key} contribution`);
    for (const key of ['protein', 'vegetable']) assert(typeof record.child_coverage?.[key] === 'boolean', `${record.id} has invalid child ${key} coverage`);
    assert(typeof record.advance_start_required === 'boolean', `${record.id} has invalid advance-start flag`);
    const requirements = [];
    for (const entry of record.ingredients ?? []) {
      assertKeys(entry, REQUIREMENT_KEYS);
      if (entry.availability === 'assumed') continue;
      assert(entry.availability === 'required', `${record.id} has unsupported ingredient availability`);
      const anyOf = entry.ingredient_id ? [String(entry.ingredient_id)] : stringArray(entry.one_of);
      assert(anyOf.length > 0, `${record.id} has an empty required ingredient choice`);
      for (const id of anyOf) assert(ingredientIds.has(id), `${record.id} references missing ingredient ${id}`);
      requirements.push({ anyOf });
    }
    return {
      id: record.id, nameZh: String(record.name_zh), nameEn: String(record.name_en), tags: stringArray(record.tags),
      primaryRole: String(record.primary_role), fitScore: Number(record.fit?.score ?? 0), order,
      contribution: { protein: Number(record.meal_contribution.protein), vegetable: Number(record.meal_contribution.vegetable), staple: Number(record.meal_contribution.staple) },
      childCoverage: { protein: record.child_coverage.protein, vegetable: record.child_coverage.vegetable },
      requirements, activeMinutes: String(record.active_minutes ?? ''), mealWindowMinutes: String(record.meal_window_minutes ?? ''),
      elapsedMinutes: String(record.elapsed_minutes ?? ''), advanceStartRequired: record.advance_start_required,
      equipment: stringArray(record.equipment), detailLevel: String(record.detail_level),
      steps: stringArray(record.steps), childServing: String(record.child_serving ?? ''), adultFinish: String(record.adult_finish ?? ''),
      substitutions: stringArray(record.substitutions), childTexture: String(record.child_texture ?? ''), notes: String(record.notes ?? ''),
    };
  });

  return {
    metadata: { version: String(metadata.kb_version), lastUpdated: String(metadata.last_updated) },
    starterSections: starterSections.filter((section) => section.visible).sort((a, b) => a.order - b.order),
    ingredients: ingredients.sort((a, b) => a.order - b.order), recipes,
  };
}
