# Meal Builder data model

## Files and indexes

`src/data/meal-builder/index.yaml` is the root manifest. Ingredient records are grouped in category YAML files under `ingredients/`; each Recipe is one YAML file under a category directory in `recipe/`.

Root and category indexes are the only ordering authority. Active files must be indexed exactly once. Archive files are excluded from active output but reserve their IDs globally. A loader must not infer membership or order from filesystem traversal or filenames.

## Stable IDs and status

- IDs are lowercase kebab-case and remain stable when display names change. Archived IDs are never reused.
- `status` is `candidate`, `approved`, or `archived`. Current records remain candidates unless explicitly promoted.
- `type` is `ingredient` or `recipe` for active records.
- Recipe `fit_score` is an integer from 0–5 used only as a ranking tiebreaker after meal-completion and freshness logic.

## Data changes

Treat each Recipe or Ingredient change as one transaction:

- Reuse an existing stable ID for the same identity; otherwise add the record and required index/reference changes together.
- A new Recipe may reference only active Ingredients; add any genuinely new required non-pantry Ingredient in the same transaction.
- Delete/archive the record, its index entry, and active references together.
- Update root content metadata for active data changes using the existing repository format.
- Validate the complete transaction before completion.

### Add / update checklist

- Every visible non-`addon-only` Ingredient needs a true standalone fallback Recipe.
- Recipe hard requirements contain only active inventory Ingredients required for the dish to remain that dish.
- Pantry items, seasonings, binders, and optional cooking ingredients belong in `cook_ingredients` / steps, not hard requirements or tags unless they define a real capability.
- Set meal contribution, child coverage/suitability, and only the capability tags the Recipe actually supports.
- Use `inventory_freshness: fifo` only when dated stock age should affect FIFO consumption and candidate priority. It is valid only with `inventory_tracking: counted`, requires a positive-integer `freshness_priority_days`, and must be an explicit Ingredient fact, never inferred from ID, section, display name, or tags. Do not set `freshness_priority_days` on a non-FIFO Ingredient.
- A `cookable` Recipe needs complete Cook View ingredients, executable steps, and equipment.
- Keep referenced IDs indexed exactly once and validate the full Ingredient + Recipe transaction.

## Ingredient record

```yaml
id: boneless-skinless-chicken-thighs
type: ingredient
inventory_tracking: counted # counted | presence-only
inventory_freshness: fifo   # optional; fifo only
freshness_priority_days: 3  # required with fifo; strict age > threshold
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
```

`starter.visible: false` retains a long-term ID without showing a button. Every visible Ingredient has one controlled section and a unique positive order. `inventory_tracking` is the source of truth: `counted` uses half-unit quantities and `presence-only` stores boolean presence. Runtime code must not infer tracking mode from Ingredient IDs.

`inventory_freshness` is optional. `fifo` means the household runtime keeps dated half-unit batches for that counted Ingredient and consumes the oldest batch first. Every FIFO Ingredient also declares `freshness_priority_days`, a positive integer used by candidate ranking and the Recipes `临期` badge. The threshold is strict: an Ingredient becomes freshness-priority only when its oldest snapshot age is greater than the declared value; equality does not qualify. `freshness_priority_days` is static Ingredient data and is not stored in Firebase household state. The aggregate inventory quantity remains the user-facing total; batch quantities must sum to that total. Runtime age is derived from batch dates and is never stored as a separate age counter.

The current explicit FIFO scope is fresh pork, chicken, beef, lamb/goat; non-frozen leafy and other vegetables; and soft tofu, firm tofu, egg tofu, and pressed tofu. Their current `freshness_priority_days` values are 3 for fresh meat, 5 for non-frozen vegetables, and 7 for the four fresh tofu Ingredients. Fish/shellfish, mushrooms, eggs, dry tofu products, frozen/processed meats, frozen vegetables, staples, and pantry items currently omit both freshness fields. Changing the scope or threshold later means changing the canonical Ingredient record, not adding ID- or section-based runtime rules.

The optional Ingredient `child_coverage.vegetable` is read only when a Recipe declares ingredient-dependent coverage. `unknown` stays unknown.

A visible Ingredient normally requires a true standalone Recipe fallback. `addon-only` is the explicit exception for an Ingredient intentionally used only as a controlled add-on/supporting item. Starter section IDs and order come from the Ingredient index; UI and documentation must not maintain a parallel section-order list.

## Runtime household inventory shape

Static Ingredient/Recipe facts stay in YAML. Firebase/local household state stores operating state only. Aggregate inventory remains compatible with the existing shape:

```text
inventory/{ingredientId} = true | positive half-unit number
```

For an Ingredient whose canonical data says `inventory_freshness: fifo`, runtime also stores:

```text
inventoryBatches/{ingredientId}/{YYYY-MM-DD} = positive half-unit number
```

Same-day additions merge under the same date key; different dates remain separate. The sum of a FIFO Ingredient's dated batches must equal its aggregate counted inventory quantity. Aggregate decreases and checkout consume oldest date keys first. Presence-only and non-FIFO Ingredients never require batch metadata.

A current meal stores only the oldest date needed for its ranking snapshot:

```text
currentMeal/ingredientFreshnessDates/{ingredientId} = YYYY-MM-DD
```

This is deliberately not a copy of full batch quantities or static threshold data. Entering/resnapshotting Recipes refreshes the availability and oldest-date snapshot; later inventory edits do not rewrite a meal already being planned. Candidate ranking and the `临期` badge combine that frozen date with the current canonical Ingredient's `freshness_priority_days`. Checkout still validates against live aggregate inventory and live FIFO batches atomically.

Pre-existing aggregate FIFO stock that has no batch metadata is migrated once to `2026-08-18`. The migration date is intentionally coarse: it provides deterministic ordering for stock known to predate the feature without claiming a historical purchase date that was never recorded.

## Recipe record

```yaml
id: chicken-teriyaki-thighs
type: recipe
status: candidate
name_zh: 照烧鸡腿
name_en: Chicken Teriyaki Thighs
tags: [family-shared, non-spicy-base]
fit_score: 5
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution: {protein: 1, vegetable: 0, staple: 0}
child_coverage: {protein: true, vegetable: false}
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids: [rice]
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
detail_level: cookable
ingredients:
  - ingredient_id: boneless-skinless-chicken-thighs
    role: main-protein
cook_ingredients:
  - 去骨去皮鸡腿肉：500 g，切成适口小块
steps:
  - 按完整 Cook View 步骤执行。
child_serving: ''
adult_finish: ''
substitutions: []
```

`meal_contribution` is the only slot-calculation source; `primary_role` is UI grouping. `integral_staple_ingredient_ids` means the Recipe includes the staple; `recommended_staple_ingredient_ids` is a pairing suggestion only. Each `ingredients[]` entry contains one required `ingredient_id` or `one_of` identity plus its role and must resolve to the active Ingredient library.

`supporting_protein_ingredient_ids` is a per-Recipe compatibility allow-list for optional proteins that can be folded into the same cooking structure without turning the supporting protein into a hard requirement. Entries must resolve to active Ingredients, must not duplicate a hard requirement in the same Recipe, and are preserved by the loader as runtime metadata. The allow-list alone does not change Recipe feasibility, `meal_contribution`, child coverage, Cook View, or checkout; any controlled selection flow must bind the chosen supporting protein explicitly before those operating behaviors change.

`ingredients[]` is the hard availability contract, not a transcription of the full recipe. Put an inventory Ingredient there only when the dish stops being that dish without it. Recommended but omittable inventory items, pantry aromatics, and the complete version of the recipe stay in `cook_ingredients`/steps. `meal_contribution` counts only slots guaranteed by hard requirements.

`cook_ingredients` is display-only and never affects availability or inventory. `cookable` and `household-tested` records require nonempty Cook View lines, executable steps, and equipment.

## Controlled values and invariants

- Main protein categories: `pork`, `beef`, `lamb`, `chicken`, `egg`, `tofu`, `fish`, `shellfish`, `mixed`, `none`; goat maps to `lamb`.
- `inventory_tracking` is `counted` or `presence-only`; optional `inventory_freshness` is `fifo` and requires `counted`. Every FIFO Ingredient requires a positive-integer `freshness_priority_days`; that field is invalid without `inventory_freshness`.
- Tags express product capabilities and preparation facts. `easy-braise-addon` is a checkout-only Ingredient tag; `addon-only` exempts an Ingredient from standalone fallback; `iron-pan-braise` identifies Recipes compatible with that checkout add-on flow.
- `vegetable-centered` is an explicit Recipe tag. It must never be inferred from category, name, or historical provenance. Runtime `vegetableCentered` is derived from this tag.
- Every visible Ingredient without `addon-only` must have at least one active Recipe with a single required identity group containing that Ingredient.
- Recipe Ingredient IDs, `one_of` options, supporting-protein allow-list IDs, starter sections, and active index entries must resolve. No duplicate IDs, unknown fields, invalid values, unsafe paths, filename/ID mismatch, or unindexed active file is allowed.
- Deprecated fields `vegetable_count`, `staple_pairings`, and `child_support_protein_needed` must not return in active records.
- Archive records are validated for schema and privacy but never emitted as active candidates. Unknown archived IDs already present in Firebase household state are ignored by reconciliation; new IDs are never silently reused.
