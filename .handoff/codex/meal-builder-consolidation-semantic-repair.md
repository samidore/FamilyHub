# Meal Builder consolidation semantic repair

## Goal

Repair the semantic/data problems introduced by commit `3aea6ea1b6397db930b666cff761d3716db3810f` without redesigning the new Finish/Serving framework. Preserve the intended compact household menu-board behavior, practical coverage, and 4-group Option model.

Use **Luna max**. Read root `AGENTS.md`, `PROJECT.md`, the prior consolidation handoff/result, and task-relevant Meal Builder docs/code/data/tests. Inspect the actual current repo; do not rely on this handoff as a substitute for canonical data.

## What is already correct and should be preserved

- Finish + rice/noodles Serving capability across Plan/Cook/Checkout/queue/state.
- Four global Option groups only: `add-some-richness`, `change-it-up` (`加番茄`), `one-pot-mix` (`顺手焖`), `soup-addons` (`汤里加`).
- Multiple Option groups per Recipe are allowed; overlapping members are deduped.
- Archived old Recipe IDs stay archived; do not restore duplicates merely to avoid repair work.
- No generic DSL, compatibility matrix, per-Recipe optional allow-list, or new Option taxonomy.
- Do not optimize for minimum Recipe count; split only when one semantic model cannot represent the cooking interface/contribution correctly.

## Core semantic rules to enforce

### 1. Finish is NOT an inventory-bearing ingredient variant

Finish may change seasoning/final treatment only. It must not stand in for tomato, mushroom, broccoli, garlic chives, daikon, tofu/yuba, or another inventory Ingredient that should be selected through hard/`one_of`/Option.

If a selected Finish would require an Ingredient to exist in inventory, that Ingredient must be represented by composition instead. Do not allow a user to choose a Finish that implies an ingredient without selecting/consuming that ingredient.

Known bad example: `basic-egg-drop-soup` currently has both `加番茄` Option and a `tomato` Finish. Remove tomato-as-Finish; tomato belongs to `change-it-up`. Keep the base Recipe natural (e.g. 蛋花汤) and let the selected Option be visible in Plan/Cook.

Audit **all active Recipes with `finish_options`** for this same mistake, not only the examples named here.

### 2. A Recipe with `one_of` must have truly shared instructions

If a requirement allows multiple Ingredients, base `name_zh`, `cook_ingredients`, and `steps` must work for every legal choice. They must not remain hardcoded to the first/old Ingredient.

Known bad examples:

- `beef/mushroom-beef-stir-fry.yaml` allows mushroom/tomato/broccoli/gai-lan but still calls itself 蘑菇炒牛肉 and tells the cook to add mushrooms.
- `chicken/chicken-broccoli-stir-fry.yaml` allows broccoli/mushroom/yellow-chives but base instructions still hardcode broccoli.
- `pork/mushroom-pork-slices-stir-fry.yaml` allows multiple second ingredients but base instructions/cook ingredients still hardcode mushrooms.

Use natural generic menu names when the selected ingredient varies (`牛肉炒时蔬`, `鸡片炒时蔬`, `肉片炒时蔬`, etc.) unless a guaranteed/default fact makes a more specific name truthful. Write generic shared steps with concise conditional prep where needed.

Do not use Finish labels such as `mushroom`, `broccoli`, `garlic-chives`, etc. to mirror a `one_of` ingredient choice. The `one_of` already owns that identity.

### 3. Finish-specific sauce must not leak from the default into the shared core

When one Recipe has multiple Finish flavor paths, its base core must be finish-neutral. Do not keep the default sauce in `cook_ingredients`/steps and then append an alternate Finish that says “replace it”. Move finish-specific sauce ingredients/steps into the Finish entries; base instructions should reference the selected finishing sauce/treatment generically.

Known examples to repair:

- `chicken/oyster-sauce-braised-chicken.yaml` base still lists oyster sauce while alternate Teriyaki/Soy/Adobo finishes exist.
- `beef/scallion-beef-stir-fry.yaml` default is scallion but base instructions and ingredient list still contain generic vegetable template residue and an oyster-sauce base.

Audit all active multi-Finish Recipes for this pattern.

### 4. Preserve practical coverage; do not leave a retired variant accidentally hard-required

Known critical bug: `pork/winter-melon-pork-rib-soup.yaml` is now the generic `排骨汤`, but `ingredients[]` still hard-requires `winter-melon`. That makes lotus-root/daikon/corn/yam/etc. coverage disappear whenever winter melon is absent.

For generic rib soup, ribs are the hard identity; compatible soup vegetables belong to `soup-addons` unless a separate Recipe truly requires one. Base contribution/Child semantics must match this model. Audit other consolidated Recipes for the same “old variant still hard-required” bug.

### 5. Optional-group references must match cooking interface

Do not mechanically attach broad groups everywhere.

- `add-some-richness`: for protein-light tofu/vegetable/soup dishes where adding some meat/shrimp is natural. Do not add extra meat to an already meat-centered Recipe without a real reason.
- `one-pot-mix` / 顺手焖: braise/reduction/simmer contexts where those ingredients can actually be added during finishing. Do not attach it to a pure quick wok stir-fry merely because members are generally useful.
- `soup-addons`: soup contexts.
- `change-it-up` / 加番茄: common tomato variant where natural.

Audit every active `optional_groups` reference introduced/changed by the consolidation.

The registry itself also needs repair:

- `soup-addons` is currently too narrow relative to the approved intent. Add representative tofu, mushrooms, and leafy vegetables that are naturally put into soup, while keeping the global group count at four.
- Remove clearly implausible `add-some-richness` members (at minimum review `pork-chops`; keep a whole cut only if it is realistically used by slicing/cutting it as the normal household add-in).
- Keep cross-group contribution/checkout values consistent.

### 6. Contribution/role semantics must stay correct

Do not put a protein Ingredient into a `role: vegetable` `one_of` merely to collapse cards.

Known bad example: `pork/mushroom-pork-slices-stir-fry.yaml` currently includes `pressed-tofu` in the vegetable `one_of`, while the Recipe contribution is Protein 1 + Vegetable 1. That is semantically wrong. Split or model it through an appropriate composition route; do not fake Vegetable coverage.

Audit all new/expanded `one_of` sets for role and meal-contribution correctness.

### 7. Restore the agreed household cooking core for tough meat

The consolidation was supposed to rewrite tough beef/lamb/goat/pork chunk braises around the household route when applicable: **Instant Pot to tender, then wok/pan seasoning/reduction, optionally 顺手焖 add-ins**.

Known bad example: `lamb-goat/red-braised-lamb.yaml` still uses a 90–120 minute stovetop braise and even contains stale pig-trotter text (`猪蹄则皮筋软糯`). The user specifically described lamb/goat chunk cooking as about one hour in the Instant Pot before finishing.

Audit the consolidated tough-meat cores and remove all cross-protein/template residue. Where red/clear variants genuinely share the same tenderization core, consolidate via Finish/Option as originally intended; keep separate only when the cooking interface really differs.

### 8. Homestyle tofu identity

`homestyle-tofu-family` was previously the one retained general tofu dish. The consolidation added `pressed-tofu` to its main `one_of`. Re-evaluate and remove it unless it truly behaves as the same 家常豆腐 identity and contribution/texture. Do not use this Recipe as a dumping ground for retired tofu/pressed-tofu dishes.

### 9. UI compactness cleanup

The Plan editor currently renders a `主食 Serving` section even for Recipes with no `serving_options` (only `不选`). Do not render Finish or Serving sections when the Recipe does not support them. Preserve mobile compactness.

Keep the editor order aligned with the product model: required/main choices first, then Finish, Option groups, then Serving. Do not redesign the page.

## Exhaustive audit requirement

Do not patch only the named files. The examples demonstrate a systematic mechanical-merge problem.

Audit every active Recipe changed by the consolidation, especially every Recipe with:

- expanded `one_of`;
- new `finish_options`;
- new/changed `optional_groups`;
- new `serving_options`;
- a genericized display name or archived predecessors.

For each, verify:

1. every legal hard/`one_of` selection is executable by the base steps;
2. no base step/cook ingredient still assumes a different old variant;
3. Finish is inventory-neutral and truly a final flavor/treatment choice;
4. hard requirements are identity-required only;
5. role/contribution and Child coverage are truthful;
6. Option groups fit the cooking interface;
7. old coverage remains representable;
8. no stale text from another protein/vegetable remains.

Do not create a permanent audit/migration knowledge file. Use this handoff for the task/result.

## Tests / validation

Add targeted regression tests for the semantic failures above where practical, including at least:

- generic rib soup is feasible with ribs + a non-winter-melon soup addon and does not hard-require winter melon;
- tomato egg-drop soup requires/selects tomato through Option composition, not Finish;
- representative mixed stir-fry `one_of` variants share neutral executable base data (no first-option-only hard requirement; add data assertions as appropriate);
- quick stir-fries do not reference `one-pot-mix` unless the Recipe actually includes a simmer/braise interface;
- Recipe Plan editor does not render Serving controls when `serving_options` is absent;
- existing Finish/Serving/state/Checkout tests continue to pass.

Run Meal data helper verification/reference checks for changed active records and archive/index transactions.

Run focused tests, then `pnpm run validate`, `pnpm run check`, `pnpm run build`, `pnpm run audit`, `pnpm run test:unit`, `pnpm run test:browser`, and `pnpm run verify`.

The prior environment could not spawn `java -version`, so Firebase emulator/rules verification may remain environmentally blocked. If so, do not treat that as permission to skip all other verification: run every available gate, inspect/update rules consistently, and report the exact rules-test blocker.

## Result

Append only:

- `Status: PASS / FAIL / BLOCKED`;
- concise summary of semantic repairs and any active Recipe-count change;
- validation outcome;
- any remaining material deviation;
- the existing deployment guard: before deploying archived-ID changes, complete/reset any real current/pending meals that still reference archived Recipe IDs.
