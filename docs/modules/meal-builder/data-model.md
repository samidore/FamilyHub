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
- `change-it-up` — `加番茄`;
- `one-pot-mix` — `顺手焖`;
- `soup-addons` — `汤里加`.

Groups may overlap. Overlapping members must use the same contribution and checkout quantity; the parser rejects conflicts. Recipes may reference multiple groups. Runtime option lists follow Recipe group order and show an Ingredient once. Any Ingredient present in a Recipe hard or `one_of` requirement is hidden from that Recipe's optional UI, even when it is also in a central group.

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
equipment: [9-quart Instant Pot, medium burner for reduction]
burner_plan: Instant Pot cooks the chicken to its target texture; use the medium burner only for a separate post-pressure sauce reduction.
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

`finish_options` is an optional ordered list of Recipe-local cooking finishes. Each entry has a stable local `id`, `label_zh`, exactly one `default: true` entry per Recipe, and optional `display_name_zh`, `cook_ingredients`, and `steps`. The default Finish uses the base Recipe `name_zh`; a non-default `display_name_zh` is the resolved Cook/Checkout name. Finish choices are presentation and cooking guidance only: they never change planning totals, inventory availability, checkout consumption, or queue reservations.

### Finish expansion families

Finish families are a **central authoring reference**, not runtime data and not a Recipe inheritance system. Their purpose is to help expand a meat Recipe: identify the cooking path and protein form, then use the matching family as a shortlist of plausible flavor/dish directions. A family never creates a Finish automatically and is never stored in household state.

The current authoring families are:

| Family | Typical cooking path / protein form | Useful Finish directions to consider |
| --- | --- | --- |
| Thin-meat quick stir-fry | Thin beef, pork, lamb, or similarly quick-cooking whole-muscle slices; high heat, short cook, meat commonly leaves and returns to the pan | light sauce, scallion, oyster, cumin, ginger, Beijing sweet-bean, scallion-salt, black-pepper style |
| 9-quart Instant Pot wet braise + finish | Any meat Recipe whose wet braise, stew, simmer, lu-style braise, casserole, or meat-soup phase cooks/tenderizes the meat; this path has no cut, tenderness, thickness, bone, or organ suitability gate | oyster-soy, teriyaki, soy-aromatic, red-braise, vinegar/adobo-style, vinegar-fragrant, spice-forward, and other inventory-neutral late sauces |
| Pan-sear + sauce/glaze | Steak, pork chop, chicken breast/thigh, patties, and other portions whose identity is primarily a seared surface plus a short final sauce/glaze | plain/pan jus, garlic-butter style, black-pepper, shoyu-butter, teriyaki-style glaze |
| Steam + dress | Whole fish/fillets and other proteins whose main cook is steaming and whose identity changes mostly in the dressing/aromatics | ginger-scallion, black-bean, light soy, other steam-compatible pantry dressings |
| Ground/minced meat stir-fry | Ground pork/beef and similar minced meat cooked loose, then combined with a vegetable or tofu base | light sauce, sauce-diced style, ginger, scallion, other quick pantry seasoning profiles |

These direction lists are deliberately broader than any one Recipe. Use them to **suggest possibilities**, then judge the specific ingredient, cut, texture, family preferences, and base cooking path before adding anything. Stir-fry, steam, roast, bake, pan-sear, and other identity-defining dry or quick routes keep their method. For a wet meat route, the Instant Pot base—not Finish—cooks the meat to target texture; a separate stovetop step may reduce or coat the cooked meat afterward. Pressure time, release, and liquid are Recipe-specific.

On an Instant Pot Recipe with `finish_options`, shared base cooking must finish the main meat-cooking/tenderizing phase before the selected Finish begins. Finish steps are limited to late flavoring, dressing, coating, or reduction and must not tell the cook to simmer/braise raw meat until tender.

On a shared Instant Pot meat base, `red-braise` means the household soy plus oyster-sauce direction. Do not offer separate soy and oyster Finish choices beside `red-braise` on the same base. This applies to shared-base Finish choices; distinct standalone dishes may still use soy or oyster-sauce ingredients when appropriate.

Recipe identity stays local:

- The Recipe's default path must already have a natural dish name in `name_zh`.
- Every non-default Finish that changes the resolved dish identity must declare an explicit, natural `display_name_zh`. Do **not** derive names by concatenating a protein name, family name, or `label_zh`.
- `label_zh` is a compact chooser label; it does not need to equal the full dish name. For example, a shared scallion direction may resolve to `葱爆牛肉`, `葱香肉片`, or `葱爆羊肉` depending on the Recipe.
- Even when two Recipes draw from the same family, their `cook_ingredients` and `steps` remain Recipe-local and must be rewritten for the actual cut, quantity, heat, timing, and texture target.
- A family is a discovery pool, not an obligation. Do not add every compatible direction to every Recipe.
- Finish remains inventory-neutral. If a variation requires a tracked Ingredient to become part of the dish, model that Ingredient through hard/one-of composition, an applicable optional group, or a distinct Recipe rather than hiding it inside Finish.
- Highly distinctive preparations may stay entirely Recipe-local even when a broad family is nearby; examples include 牛丼/寿喜烧, 可乐鸡翅/瑞士鸡翅, and specific steamed-fish preparations.

`serving_options` is an optional list containing only `rice` and/or `noodles`. The Recipes Plan UI presents the available choices as one selection (`none`, `rice`, or `noodles`). A selected serving contributes one Staple in Plan and adds one selected serving Ingredient to Checkout Actual. It is not included in queued hard-Ingredient reservations. Checkout may switch or remove it against live stock without rewriting the Plan.

`ingredients[]` is the hard availability contract, not a transcription of the full recipe. Put an inventory Ingredient there only when the dish stops being that dish without it. Recommended but omittable inventory items, pantry aromatics, and the complete version of the recipe stay in `cook_ingredients`/steps. Base `meal_contribution` counts only the hard Recipe composition; selected optionals add their central fixed contribution at runtime.

`cook_ingredients` is display-only and never affects availability or inventory. `cookable` and `household-tested` records require nonempty Cook View lines, executable steps, and equipment.

## Current meal composition state

The selected meal stores Plan separately from Checkout Actual.

Plan:

```text
currentMeal/selectedRecipeIds
currentMeal/recipeIngredientBindings/{recipeId}
currentMeal/selectedAddons[] = { mainRecipeId, addonType: optionalGroupId, ingredientId }
currentMeal/recipeFinishSelections/{recipeId} = finishId
currentMeal/recipeServingSelections/{recipeId} = rice | noodles
```

`recipeIngredientBindings` stores fixed/`one_of` selections. `selectedAddons` stores planned optional choices. Selecting an optional immediately adds its adult contribution and eligible Recipe-specific Child coverage to meal completion; unselected optionals never count as already filled.

Checkout Actual is Recipe-scoped:

```text
currentMeal/checkoutRecipeDrafts/{recipeId}/bindings[]
currentMeal/checkoutRecipeDrafts/{recipeId}/optionalAddons[]
currentMeal/checkoutRecipeDrafts/{recipeId}/servingIngredientId = rice | noodles
currentMeal/checkoutRecipeDrafts/{recipeId}/consumption/{ingredientId}
```

Checkout starts from Plan but may change a `one_of` binding, remove a planned optional, or add an unplanned optional that is currently in live inventory. These edits do not rewrite Plan. Counted quantities are shown per Recipe, but the transaction aggregates all Recipes by Ingredient before validating and consuming inventory. Defaults and +/- controls respect the remaining global inventory so the initial per-Recipe draft does not over-allocate a shared Ingredient. Presence-only Ingredients use a per-Recipe “used up” boolean; final aggregation is logical OR.

Reconciliation keeps only state for selected, known, currently feasible Recipes; it drops Finish and serving entries for removed or archived Recipes, restores a Recipe's default Finish when its saved Finish is invalid, and removes unavailable serving choices. It also canonicalizes duplicate overlapping optional records to the first referenced group. Finish and serving state remain separate from the Plan's Ingredient bindings and optional records.

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
