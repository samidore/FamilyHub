# Meal Builder data model

## Files and indexes

`src/data/meal-builder/index.yaml` is the root manifest. Ingredient records are grouped in category YAML files under `ingredients/`; each Recipe is one YAML file under a category directory in `recipe/`. Optional composition groups are defined once in `src/data/meal-builder/optional-groups.yaml`.

Root and category indexes are the only ordering authority. Active files must be indexed exactly once. Archive files are excluded from active output but reserve their IDs globally. A loader must not infer membership or order from filesystem traversal or filenames.

## Stable IDs and status

- IDs are lowercase kebab-case and remain stable when display names change. Archived IDs are never reused.
- `status` is `candidate`, `approved`, or `archived`. Current records remain candidates unless explicitly promoted.
- `type` is `ingredient` or `recipe` for active records.
- Recipe `fit_score` is an integer from 0–5 used only as a late ranking tiebreaker after freshness and meal-completion logic.

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
- Pantry items, seasonings, binders, and optional cooking ingredients belong in `cook_ingredients` / steps, not hard requirements.
- Reuse an existing optional group when the same optional Ingredient set and fixed adult contribution apply; do not duplicate optional member lists inside Recipes.
- Set meal contribution, child coverage/suitability, and only the capability tags the Recipe actually supports.
- Use `inventory_freshness: fifo` only when dated stock age should affect FIFO consumption and candidate priority. It is valid only with `inventory_tracking: counted`, requires a positive-integer `freshness_priority_days`, and must be an explicit Ingredient fact, never inferred from ID, section, display name, or tags. Do not set `freshness_priority_days` on a non-FIFO Ingredient.
- A `cookable` Recipe needs complete Cook View ingredients, executable steps, and equipment.
- Keep referenced IDs indexed exactly once and validate the full Ingredient + Recipe transaction.

## Ingredient record

```yaml
id: chicken-thighs
type: ingredient
inventory_tracking: counted # counted | presence-only
inventory_freshness: fifo   # optional; fifo only
freezer_behavior: thaw-required # optional; direct | thaw-required
freshness_priority_days: 3  # required with fifo; strict age > threshold
status: candidate
name_zh: 鸡腿
name_en: Chicken Thighs
starter:
  visible: true
  section: chicken
  order: 10
tags: []
```

The lifecycle runtime stores frozen quantities only in aggregate `inventory` or `freezerInventory`, plus independent `thawingItems` jobs and shared `discardedStock/{recordId}` undo records. Step 1 is one unified Inventory page with a show-all visibility toggle. Refrigerated FIFO batches remain dated; frozen stock has no batch metadata.

`starter.visible: false` retains a long-term ID without showing a button. Every visible Ingredient has one controlled section and a unique positive order. `inventory_tracking` is the source of truth: `counted` uses half-unit quantities and `presence-only` stores boolean presence. Runtime code must not infer tracking mode from Ingredient IDs.

`freezer_behavior` is an independent explicit fact. `direct` uses ordinary `inventory` and remains Recipe-available; `thaw-required` uses `freezerInventory` until a thawing job enters ordinary inventory. Missing means the Ingredient is not shown in the freezer view.

`inventory_freshness` is optional. `fifo` means the household runtime keeps dated half-unit batches for that counted Ingredient and consumes the oldest batch first. Every FIFO Ingredient also declares `freshness_priority_days`, a positive integer used by candidate ranking and the Recipes freshness badge. The threshold is strict: an Ingredient becomes freshness-priority only when its oldest snapshot age is greater than the declared value; equality does not qualify. `freshness_priority_days` is static Ingredient data and is not stored in Firebase household state. The aggregate inventory quantity remains the user-facing total; batch quantities must sum to that total. Runtime age is derived from batch dates and is never stored as a separate age counter.

The current explicit FIFO scope is fresh pork, chicken, beef, lamb/goat; non-frozen leafy and other vegetables; and soft tofu, firm tofu, egg tofu, and pressed tofu. Their current `freshness_priority_days` values are 3 for fresh meat, 5 for non-frozen vegetables, and 7 for the four fresh tofu Ingredients. Fish/shellfish, mushrooms, eggs, dry tofu products, frozen/processed meats, frozen vegetables, staples, and pantry items currently omit both freshness fields. Changing the scope or threshold later means changing the canonical Ingredient record, not adding ID- or section-based runtime rules.

The optional Ingredient `child_coverage.vegetable` is read only when a Recipe declares ingredient-dependent base coverage. `unknown` stays unknown. The `child-eaten` tag records that the Ingredient is normally eaten by the child; it is not sufficient by itself to make an optional Ingredient satisfy Child coverage in every Recipe.

A visible Ingredient normally requires a true standalone Recipe fallback. `addon-only` is the explicit exception for an Ingredient intentionally used only as a controlled add-on/supporting item. Starter section IDs and order come from the Ingredient index; UI and documentation must not maintain a parallel section-order list.

## Optional group registry

Optional composition has one canonical registry: `src/data/meal-builder/optional-groups.yaml`.

```yaml
optional_groups:
  - id: add-some-richness
    label_zh: 加点油水
    ingredients:
      - ingredient_id: ground-pork
        meal_contribution: { protein: 0.5, vegetable: 0, staple: 0 }
        checkout_units: 1
```

Each group owns:

- stable group ID;
- UI label;
- member Ingredient IDs;
- each member's fixed adult planning contribution;
- default Checkout quantity.

Recipes reference group IDs only. Do not copy the member list or adult contribution into Recipe records. The same optional Ingredient therefore has the same adult planning contribution wherever that group is used.

The current groups are:

- `add-some-richness` — `加点油水`;
- `change-it-up` — `改头换面`;
- `one-pot-mix` — `一锅乱炖`.

Child coverage is deliberately **not** stored in the optional registry. Optional Child coverage is Recipe-specific: the current runtime counts an optional Ingredient for Child Protein/Vegetable only when the Recipe is tagged `child-all-ingredients-eaten` **and** the Ingredient is tagged `child-eaten`, with the optional member's contribution for that slot greater than zero. This keeps “the child eats this ingredient” separate from “this preparation makes it count for the child.”

A Recipe cannot select the same Ingredient simultaneously as a hard/`one_of` binding and as an optional member. Plan UI, Checkout UI, normalization, and transaction validation all enforce that invariant.

## Runtime household inventory shape

Static Ingredient/Recipe/optional-group facts stay in YAML. Firebase/local household state stores operating state only. Aggregate inventory remains compatible with the existing shape:

```text
inventory/{ingredientId} = true | positive half-unit number
freezerInventory/{ingredientId} = true | positive half-unit number
thawingItems/{jobId} = { ingredientId, quantity, startedAt, readyAt }
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

This is deliberately not a copy of full batch quantities or static threshold data. Entering/resnapshotting Recipes refreshes the availability and oldest-date snapshot; later inventory edits do not rewrite a meal already being planned. Candidate ranking and the freshness badge combine that frozen date with the current canonical Ingredient's `freshness_priority_days`. Checkout still validates against live aggregate inventory and live FIFO batches atomically.

Pre-existing aggregate FIFO stock that has no batch metadata is migrated once to `2026-08-18`. The migration date is intentionally coarse: it provides deterministic ordering for stock known to predate the feature without claiming a historical purchase date that was never recorded.

Content version 1.24 merges the former `boneless-skinless-chicken-thighs` and `bone-in-chicken-thighs` identities into the canonical `chicken-thighs` Ingredient. Persisted-state migration runs **before** normal unknown-ID filtering. Aggregate quantities are added, FIFO batches on the same date are added while distinct dates remain distinct, the oldest legacy freshness-snapshot date becomes the canonical date, and current-meal availability, bindings, exclusions, and Checkout Plan/Actual Ingredient IDs are rewritten to `chicken-thighs`. Local storage rewrites the canonical state when legacy IDs are read; a connected Firebase repository detects legacy raw state and commits the same conversion with a Realtime Database transaction. The two retired IDs are migration aliases only and must not return as active Ingredient records or Recipe requirements.

## Recipe record

```yaml
id: oyster-sauce-braised-chicken
type: recipe
status: candidate
name_zh: 蚝油焖鸡腿 / 鸡小腿
name_en: Oyster-Sauce Braised Chicken Thighs or Drumsticks
tags:
  - child-all-ingredients-eaten
  - family-shared
fit_score: 4
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
  - chicken-drumsticks
  - chicken-thighs
supporting_protein_ingredient_ids: []
optional_groups:
  - one-pot-mix
vegetable_ingredient_ids: []
meal_contribution: { protein: 1, vegetable: 0, staple: 0 }
child_coverage: { protein: true, vegetable: false }
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids: [rice]
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment: [medium burner, covered pot / braiser]
burner_plan: ''
child_suitable: yes
child_texture: ''
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: cookable
ingredients:
  - one_of: [chicken-drumsticks, chicken-thighs]
    role: main-protein
cook_ingredients:
  - 鸡腿 / 鸡小腿：约900–1100 g；鸡腿带骨或无骨均可
steps:
  - 按完整 Cook View 步骤执行。
child_serving: ''
adult_finish: ''
substitutions: []
```

`meal_contribution` is the base slot-calculation source; `primary_role` is UI grouping. `integral_staple_ingredient_ids` means the Recipe includes the staple; `recommended_staple_ingredient_ids` is a pairing suggestion only. Each `ingredients[]` entry contains one required `ingredient_id` or `one_of` identity plus its role and must resolve to the active Ingredient library.

`supporting_protein_ingredient_ids` is composition metadata for supporting proteins that are part of the dish. When such a protein is required for Recipe identity, it also appears in `ingredients[]`; `ingredients[]`, not this metadata field, remains the hard availability contract.

`optional_groups` is the only Recipe-level optional composition field. It is an ordered list of central optional-group IDs. There is no per-Recipe optional member allow-list, adult contribution override, stage DSL, condition matrix, or nested-option model.

`ingredients[]` is the hard availability contract, not a transcription of the full recipe. Put an inventory Ingredient there only when the dish stops being that dish without it. Recommended but omittable inventory items, pantry aromatics, and the complete version of the recipe stay in `cook_ingredients`/steps. Base `meal_contribution` counts only the hard Recipe composition; selected optionals add their central fixed contribution at runtime.

`cook_ingredients` is display-only and never affects availability or inventory. `cookable` and `household-tested` records require nonempty Cook View lines, executable steps, and equipment.

## Current meal composition state

The selected meal stores Plan separately from Checkout Actual.

Plan:

```text
currentMeal/selectedRecipeIds
currentMeal/recipeIngredientBindings/{recipeId}
currentMeal/selectedAddons[] = { mainRecipeId, addonType: optionalGroupId, ingredientId }
```

`recipeIngredientBindings` stores fixed/`one_of` selections. `selectedAddons` stores planned optional choices. Selecting an optional immediately adds its adult contribution and eligible Recipe-specific Child coverage to meal completion; unselected optionals never count as already filled.

Checkout Actual is Recipe-scoped:

```text
currentMeal/checkoutRecipeDrafts/{recipeId}/bindings[]
currentMeal/checkoutRecipeDrafts/{recipeId}/optionalAddons[]
currentMeal/checkoutRecipeDrafts/{recipeId}/consumption/{ingredientId}
```

Checkout starts from Plan but may change a `one_of` binding, remove a planned optional, or add an unplanned optional that is currently in live inventory. These edits do not rewrite Plan. Counted quantities are shown per Recipe, but the transaction aggregates all Recipes by Ingredient before validating and consuming inventory. Defaults and +/- controls respect the remaining global inventory so the initial per-Recipe draft does not over-allocate a shared Ingredient. Presence-only Ingredients use a per-Recipe “used up” boolean; final aggregation is logical OR.

## Controlled values and invariants

- Main protein categories: `pork`, `beef`, `lamb`, `chicken`, `egg`, `tofu`, `fish`, `shellfish`, `mixed`, `none`; goat maps to `lamb`.
- `inventory_tracking` is `counted` or `presence-only`; optional `inventory_freshness` is `fifo` and requires `counted`. Every FIFO Ingredient requires a positive-integer `freshness_priority_days`; that field is invalid without `inventory_freshness`.
- `vegetable-centered` is an explicit Recipe tag. It must never be inferred from category, name, or historical provenance. Runtime `vegetableCentered` is derived from this tag.
- `meal-extra` is an explicit Recipe capability for a stocked meal extra such as 点心. It is always addable when its hard Ingredient is available, contributes zero to Protein/Vegetable/Staple, and is ranked after ordinary meal candidates; it is not a Staple or child-coverage claim.
- `child-eaten` is an Ingredient fact; `child-all-ingredients-eaten` is a Recipe preparation fact. Optional Child coverage requires both.
- `addon-only` exempts an Ingredient from standalone fallback. Optional eligibility itself comes only from central optional-group membership plus a Recipe reference to that group.
- Every visible Ingredient without `addon-only` must have at least one active Recipe with a single required identity group containing that Ingredient.
- Recipe Ingredient IDs, `one_of` options, required supporting-protein metadata IDs, optional-group IDs/members, starter sections, and active index entries must resolve. No duplicate IDs, unknown fields, invalid values, unsafe paths, filename/ID mismatch, or unindexed active file is allowed.
- Active data must not reintroduce the retired `optional_supporting_protein_ingredient_ids`, `easy-braise-addon`, or `iron-pan-braise` systems.
- Deprecated fields `vegetable_count`, `staple_pairings`, and `child_support_protein_needed` must not return in active records.
- Archive records are validated for schema and privacy but never emitted as active candidates. Unknown archived IDs already present in Firebase household state are ignored by reconciliation. Explicit release migrations may canonicalize named legacy IDs before that filtering; currently `boneless-skinless-chicken-thighs` and `bone-in-chicken-thighs` map only to `chicken-thighs`. Retired IDs are never reused.
