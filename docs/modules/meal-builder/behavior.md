# Meal Builder behavior

## Household intent and constraints

The tool supports multiple adults and a young child without storing birthdays or identity details. The household prefers mild, low-oil, non-spicy shared food; adult heat is added after the child's portion is removed. Prefer one shared family dish over a separate child meal. Supported methods are braise, simmer, steam, roast, pan-sear, stir-fry, oven, air fryer, and Instant Pot; deep-frying is not used. Common equipment is a 9-quart Instant Pot, stovetop nonstick pan, strong-burner wok/iron pan, oven, and small air fryer.

Time is a workload signal, not an automatic hard filter. Account for opening, washing, peeling, trimming, cutting, marinating, preheating, pan changes, and cleaning—not only heat time. `active_minutes`, `meal_window_minutes`, `elapsed_minutes`, and `advance_start_required` remain source/workflow ranges until the household measures them. Instant Pot meat pressure is commonly about 10–15 minutes, but release, liquid, rice ratio, and cut thickness stay recipe-specific.

## Shared four-step flow

1. **Inventory** — connected household users adjust categorized ingredient inventory. Counted items use half-unit quantities; presence-only staples/pantry items use a boolean presence value. Ingredients explicitly marked `inventory_freshness: fifo` also keep dated quantity batches. Additions on the same local calendar date merge into that date; additions on different dates stay separate. Aggregate decreases consume the oldest dated batch first. Inventory also accepts the reviewed Chat-assisted JSON contract in [`inventory-import.md`](inventory-import.md): parsing has no side effects, matched visible Ingredients can be removed or quantity-adjusted before import, unmatched items remain visible but unwritten, and a second confirmation is required before one additive transaction commits the retained rows. The Inventory view also exposes a horizontally scrollable sticky category-jump bar generated from the rendered Starter sections; choosing a category opens that inventory section and scrolls it into view without changing inventory.
2. **Recipes** — users set Protein and Vegetable planning targets, optional Staple, time preference, and Child mode; select available ingredients; review ranked candidates; select Recipes; then expand a selected Recipe to edit its composition. Fixed requirements are displayed, `one_of` requirements are single-select, and each referenced optional group renders as its own multi-select section such as `加点油水`, `改头换面`, or `一锅乱炖`. The complete available-ingredient filter is wrapped in one overall fold that defaults closed whenever the Recipes view is entered; its compact summary keeps the selected-count visible, while opening it preserves the existing per-section folds and bulk controls.
3. **Cook** — selected Recipes and their child-serving/adult-finish notes render in Cook View. Planned optional Ingredients are shown as a compact `计划加料` summary. The household can return to Recipes while preserving the current meal.
4. **Checkout** — each selected Recipe gets its own Actual-composition card. The card starts from Plan, but the cook may switch a `one_of` choice, remove a planned optional, add an unplanned optional from current live inventory, and adjust actual consumed quantities. Confirm and commit atomically. Counted FIFO Ingredients are deducted from the oldest batch first in the same transaction. A stale meal or invalid quantity does not partially mutate inventory or batch metadata.

`activeStep`, current meal status, selected Recipes, ingredient bindings, planned optionals, Recipe-scoped Checkout Actual drafts, and current-meal freshness snapshot are household state shared across connected devices. The page observes remote changes and reconciles unknown/archived IDs safely.

Inventory quantity/batches and current-meal availability/freshness are independent snapshots. Entering Recipes resnapshots the currently stocked Ingredients and each FIFO Ingredient's oldest date. Later inventory edits, including bulk imports, do not rewrite the current meal's ingredient filter or freshness priority. Checkout always uses the latest live inventory for available Actual choices and validates/consumes the latest live inventory in its atomic transaction.

## Recipe composition: Plan and Actual

Every Recipe composition has only three concepts:

```text
required/fixed Ingredients
one_of
optional groups
```

There is no separate supporting-protein UI, easy-braise UI, tomato UI, stage DSL, compatibility matrix, or per-Recipe optional member list.

### Plan in Recipes

- A selected Recipe card can expand to `编辑这道菜`.
- Fixed hard requirements are shown but cannot be deselected.
- Each `one_of` requirement is one section with exactly one active binding.
- Each referenced central optional group is one separate section; its members are multi-select.
- Plan optional choices are limited to the meal's frozen availability snapshot, except an already-selected choice remains visible so it can be deselected.
- A hard/`one_of` bound Ingredient is never shown again as an optional choice for the same Recipe.
- Selecting an optional immediately adds that member's centrally declared adult Protein/Vegetable/Staple contribution to the effective Recipe. Deselecting removes it.
- Unselected optionals never count as already filling a meal slot.

The effective planned Recipe is:

```text
base Recipe
+ current one_of binding
+ selected optional contributions
+ Recipe-specific Child effect of selected optionals
```

Child treatment is not a global optional-list property. An optional member counts toward Child Protein/Vegetable only when the Recipe has `child-all-ingredients-eaten`, the Ingredient has `child-eaten`, and that optional member actually contributes to the corresponding adult slot. Ingredient `child-eaten` alone does not override a Recipe's own base `child_coverage`.

### Actual at Checkout

Checkout represents what was actually cooked, not an edit to the earlier Plan.

- Actual starts from the planned `one_of` bindings and planned optionals.
- The cook may switch `one_of` to another valid live-stock alternative.
- The cook may remove a planned optional.
- The cook may add an unplanned optional from a group referenced by that Recipe if the Ingredient is currently in live inventory.
- The same Ingredient cannot be both a hard binding and an optional in one Recipe.
- Checkout edits never rewrite the Plan state used by Recipes/Cook View.
- Checkout does not reject a meal because the Actual composition no longer satisfies planning targets; the food has already been cooked.

Quantity controls remain Recipe-scoped so the cook can describe actual use per dish. Before commit, all Recipe quantities are aggregated by Ingredient. Counted defaults and +/- controls respect the remaining **global** inventory across all Recipe cards, so two Recipes do not each independently default to consuming the full available quantity. Presence-only `用完` values aggregate with logical OR. The final transaction validates all totals first and then consumes once; there is never a per-Recipe partial decrement.

## Targets, completion, and ranking

- Protein, Vegetable, and Staple are family planning slots, not nutrition servings or grams. A Recipe may contribute multiple slots; for example, a meat-and-vegetable dish may contribute `protein: 0.5` and `vegetable: 1`.
- Protein uses an internal `+0.5` tolerance. Once the target is met, candidates that exceed remaining tolerance without filling another unmet slot or Child coverage disappear. A half-protein dish that also fills Vegetable ranks above a pure half-protein fallback when Child Protein is still missing; a larger child-suitable protein may remain as a hard-coverage fallback.
- Child mode defaults **on**. With it enabled, both Child Protein and Child Vegetable coverage are hard meal-completion requirements. This is dynamic state aggregation, not a simple Recipe-category filter.
- Base `child_coverage` answers whether the same Recipe can provide a realistically chewable child portion through normal serving adjustments such as cutting shorter/smaller, a brief extra softening step, or adult deboning/checking. Current preference or willingness to eat is not a hard coverage condition. A quick stir-fry whose defining result remains chewy does not count merely because it can be cut smaller; meat braised/stewed genuinely soft can count, including ribs only after adult deboning and bone-fragment checks.
- Base `child_coverage` may be `true`, `false`, or `ingredient-dependent`. An ingredient-dependent Recipe reads the selected Ingredient's declared child coverage; `unknown` never satisfies a hard Child requirement. General `child_suitable`, `child_texture`, and `child_serving` notes remain separate facts.
- A candidate may remain visible when an available optional could fill a currently unmet adult or Child gap. That **potential** keeps the Recipe discoverable but does not count the gap as filled until the user actually selects the optional.
- **Freshness-priority candidates are placed at the top of the Recipes candidate list.** A candidate qualifies when its current binding uses a FIFO Ingredient older than that Ingredient's strict `freshness_priority_days` threshold. Among qualifying candidates, the oldest qualifying bound Ingredient ranks first. Only after this freshness block does the normal correctness/repetition/fit/time ordering apply within the remaining comparisons.
- In Recipes, a candidate or selected Recipe whose current binding crosses the same per-Ingredient threshold shows a compact hourglass badge labeled `临期`. The badge does not show age, Ingredient names, or other freshness explanation; Cook View and Checkout do not display it.
- For an unselected Recipe with a `one_of` requirement, the default binding prefers the oldest available FIFO option, but never if that choice would solve fewer currently unmet Child-coverage requirements than the normal deterministic option. An existing selected/manual binding is never silently rebound because another Ingredient becomes older.
- Recipe availability is evaluated from each hard `ingredients[]` identity and any matching `one_of` option. Pantry items are display-only Cook View text and never participate in availability or inventory. A Starter Ingredient is available for this meal; it is not mandatory to consume.
- Recipes exposes global and per-section bulk availability controls for stocked visible Starter Ingredients. Bulk select/deselect changes only the current meal filter, never shared inventory. Ingredient availability filters affect future Recipe discovery only: once a Recipe is selected, later filter changes do not hide, remove, rebind, or otherwise change that selected Recipe; it continues to contribute to completion, Cook View, and checkout until explicitly removed or reset.
- The UI sections are data-driven by `starter.section`; every visible section can collapse, and collapsing never clears selections. The Recipes ingredient filter adds one parent fold above those sections, and Inventory category jumps use the same rendered section identities rather than a separate hard-coded category list. `starter.order` is stable and not alphabetic.

## FIFO inventory scope and migration

FIFO is explicit Ingredient data, not a category inference. The current tracked scope is fresh pork, chicken, beef, lamb/goat; non-frozen leafy and other vegetables; and soft tofu, firm tofu, egg tofu, and pressed tofu. Each FIFO Ingredient also declares its own positive-integer `freshness_priority_days`; current values are 3 for fresh meat, 5 for non-frozen vegetables, and 7 for the four fresh tofu Ingredients. Fish/shellfish, mushrooms, eggs, dry tofu products, frozen/processed meats, frozen vegetables, staples, and pantry items are not freshness-tracked unless their canonical Ingredient record is deliberately changed later.

When this feature first reads aggregate stock for a FIFO Ingredient without batch metadata, that pre-existing quantity is assigned the one-time migration date `2026-08-18`. This preserves FIFO ordering without inventing a more precise historical purchase date. Normal manual additions use the local calendar date of the inventory write. A reviewed Chat-assisted bulk import instead uses its validated, editable `stocked_on` date and adds the imported quantity to that dated batch; same-date imports merge without rewriting older batches.

## Optional groups and standalone coverage

Vegetable Recipes represent a real cooking structure, not every seasoning label. Compatible hard alternatives use `one_of` rather than duplicate stable IDs. Optional variants use central groups rather than duplicate Recipes when the base dish identity remains the same.

`addon-only` is a data-quality exemption from standalone Recipe coverage for an Ingredient intentionally used only as an optional/supporting item. It does not by itself make that Ingredient available to every Recipe. Runtime optional eligibility requires both central group membership and a Recipe reference to that group.

The retired `easy-braise-addon` Ingredient tag, `iron-pan-braise` Recipe tag, and per-Recipe optional-supporting-protein allow-list are not active behavior and must not return.

## Reset, errors, and privacy

Resetting Recipe selection keeps the shared inventory unchanged. Clearing shared inventory requires explicit confirmation and removes any FIFO batch metadata with the aggregate inventory; it does not change current-meal availability/freshness snapshots. Firebase/auth errors are shown; there is no local-data fallback. The Chat-assisted importer persists only the resulting normal inventory and FIFO batch state, not pasted JSON, images, Chat transcripts, or import history. The page never stores names, birthdays, addresses, schedules, diagnoses, Gmail addresses, UIDs, tokens, or private notes.
