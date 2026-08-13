# Meal Builder data model

## Files and indexes

`src/data/meal-builder/index.yaml` is the root manifest. It records the schema/content version, update metadata, category entry points, and active/archive boundaries. Ingredient records are grouped in category YAML files under `ingredients/`; each Recipe is one YAML file under a category directory in `recipe/`.

Root and category indexes are the only ordering authority. An index entry includes the stable ID and display order; a loader must not sort by filename or walk the filesystem to infer order. Active files must be indexed exactly once. Archive files are excluded from active output but reserve their IDs globally.

## Stable IDs and status

- IDs are lowercase kebab-case and never change when a display name changes. A deleted/archived ID may never be reused.
- `status` is `candidate`, `approved`, or `archived`. Current migrated records remain `candidate`; no importer or UI action auto-approves a record.
- `type` is `ingredient` or `recipe` for active records. A legacy Meal Combo pattern is documentation only and is not a new active record type.
- `fit.score` is an integer 0–5 and cannot override a hard-rule failure. `fit.hard_rules` is `pass`, `fail`, `n/a`, or `unknown`.
- Evidence levels are `official-current`, `retailer-current`, `reputable-general`, `user-confirmed`, `inferred`, and `unverified`. `evidence.checked_on` is a real source-check date, not a file timestamp.

## Ingredient record

```yaml
id: boneless-skinless-chicken-thighs
type: ingredient
inventory_tracking: counted # counted | presence-only
status: candidate
name_zh: 无骨去皮鸡腿肉
name_en: Boneless Skinless Chicken Thighs
starter:
  visible: true
  section: chicken
  order: 10
tags: []
child_coverage:
  vegetable: unknown
fit:
  hard_rules: pass
  score: 0
  strengths: []
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: source scope
  sources: []
notes: ''
```

`starter.visible: false` retains a long-term ID without showing a button; the current hidden pantry aromatics are `ginger`, `scallion`, and `garlic`. Every visible non-pantry ingredient has one controlled section and a unique positive order. `inventory_tracking: counted` supports half-unit quantities; `presence-only` is used for `eggs`, `rice`, `noodles`, `bread`, `steamed-buns`, `oats`, `white-oil-sausage`, `potato`, and `peeled-shrimp`.

The optional Ingredient `child_coverage.vegetable` is read only when a Recipe declares ingredient-dependent coverage. `unknown` remains unknown; section membership or a leafy name cannot imply `finish-wilt-compatible`.

Starter section IDs and order are data, not UI inference:

```text
pork 10 · chicken 20 · beef 30 · lamb-goat 40 · fish 50 · shellfish 60
egg-tofu 70 · leafy-vegetable 80 · other-vegetable 90 · mushroom 100
staple 110 · pantry 999 (hidden)
```

## Recipe record

```yaml
id: chicken-teriyaki-thighs
type: recipe
status: candidate
name_zh: 照烧鸡腿
name_en: Chicken Teriyaki Thighs
tags: [family-shared, non-spicy-base]
fit: {hard_rules: pass, score: 0, strengths: [], tradeoffs: []}
evidence: {level: reputable-general, checked_on: '2026-08-12', scope: '', sources: []}
notes: ''
primary_role: protein # protein | vegetable | staple | mixed
main_protein_category: chicken
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution: {protein: 1, vegetable: 0, staple: 0}
child_coverage: {protein: true, vegetable: false}
meal_addons: []
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids: []
active_minutes: 20
meal_window_minutes: 45
elapsed_minutes: 45
advance_start_required: false
equipment: [stovetop-nonstick]
burner_plan: ''
child_suitable: true
child_texture: ''
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable # discoverable | cookable | household-tested
ingredients:
  - ingredient_id: boneless-skinless-chicken-thighs
    role: main-protein
    availability: required
    amount: 500 g # optional; required for cookable / household-tested Recipes
    preparation: 切成适口小块 # optional
  - one_of: [chinese-greens, baby-napa-cabbage]
    role: vegetable
    availability: required
  - pantry_core: common seasonings
    role: seasoning
    availability: assumed
steps: []
child_serving: ''
adult_finish: ''
substitutions: []
```

`meal_contribution` is the only slot-calculation source; `primary_role` is UI grouping. `integral_staple_ingredient_ids` means the recipe includes the staple; `recommended_staple_ingredient_ids` is a pairing suggestion only. `ingredients[].availability: required` must resolve to the active Ingredient library, while `one_of` means any listed option is sufficient and `pantry_core: assumed` never requires a Starter selection.

`ingredients[]` may add nonempty `amount` and `preparation` to an Ingredient, `one_of` group, or `pantry_core` input. Cook View renders supplied values while only required Ingredient IDs affect availability. `detail_level: discoverable` is enough for candidate ranking but not a claim that exact Cook View quantities have been tested. Candidate records must not invent precise grams or sauce ratios; use a supported source and household calibration before moving to `cookable` or `household-tested`. Those two levels require every actual input, including pantry seasoning, to have an amount, plus nonempty executable steps and equipment and at least one direct HTTPS evidence source.

## Controlled values and invariants

- Main protein categories: `pork`, `beef`, `lamb`, `chicken`, `egg`, `tofu`, `fish`, `shellfish`, `mixed`, `none`; goat maps to `lamb`.
- Tags include timing (`lunch-30`, `lunch-45`, `make-ahead`, `advance-start`, `low-active-time`, `one-pot`, `pot-in-pot`, `leftover-friendly`, `freezer-friendly`), family (`family-shared`, `soft-protein`, `soft-vegetable`, `child-support-protein`, `adult-finish-separate`, `two-vegetable-ready`), equipment (`instant-pot`, `stovetop-nonstick`, `stovetop-wok`, `oven`, `air-fryer`), preparation (`low-prep`, `medium-prep`, `high-prep`, `minimal-cutting`, `light-seasoning`, `non-spicy-base`, `pan-seared`, `stir-fried`, `steamed`, `braised`, `simmered`, `roasted`), and the explicit `finish-wilt-compatible` Ingredient capability.
- `meal_addons` is only for defined add-ons. The v1 add-on is `finish-with-leafy-vegetable`; it contributes a slot and child coverage but never changes the main ID.
- Deprecated fields `vegetable_count`, `staple_pairings`, and `child_support_protein_needed` must not return in active records.
- Recipe Ingredient IDs, `one_of` options, starter sections, and active index entries must resolve. No duplicate IDs, unknown fields, invalid values, unsafe paths, filename/ID mismatch, or unindexed active file is allowed.
- Archive records are validated for schema and privacy but never emitted as active candidates. Unknown archived IDs already present in Firebase household state are ignored by reconciliation; new IDs are never silently reused.

## Migration parity

The YAML migration must preserve all 132 Ingredient IDs, all 162 Recipe IDs, active ordering, fields, statuses, source evidence, Starter visibility/order, 23 vegetable-centered structures, seven supported add-ons, and the 129 visible Starter count. Compare old parsed records with new loaded records record-by-record before treating the historical dump as archive-only.
