# Meal Builder recipe consolidation implementation

## Goal

Implement the approved Meal Builder consolidation in `samidore/FamilyHub` so the Recipes page behaves like a compact household menu board: preserve practical cooking coverage while collapsing repetitive recipe cards that differ only by compatible ingredient choice, final seasoning, optional add-ins, or rice/noodle serving.

Use **Luna max**. Complete the implementation, data migration, archive transaction, and validation locally. Do not stop after adding schema support.

## Read first

Follow repo root `AGENTS.md` and `PROJECT.md`, then read only task-relevant Meal Builder docs/code/tests, especially:

- `.agents/skills/manage-meal-data/SKILL.md`
- `docs/modules/meal-builder/README.md`
- `docs/modules/meal-builder/data-model.md`
- `docs/modules/meal-builder/behavior.md`
- `src/data/meal-builder/optional-groups.yaml`
- Meal Builder parser/types/engine/household/UI/checkout code
- `database.rules.json`
- applicable unit, browser, and Firebase rules tests

Do not create a second permanent knowledge base or permanent migration manifest. The canonical end state is the active Meal Builder data plus archived retired records.

## Product intent

This is a private household menu board, not a cooking rules engine. The cook can make reasonable adjustments during cooking, and Checkout already records Actual composition.

Priorities:

1. Preserve practical dish coverage: every currently active recipe must still be representable after migration, either as an active Recipe, a Finish, a required/`one_of` choice, an Option, or rice/noodle Serving.
2. Substantially reduce repetitive cards so scrolling reveals genuinely different cooking ideas rather than many ingredient/flavor variants.
3. Do not optimize for the minimum possible recipe count. If two dishes have materially different cooking interfaces, keep separate Recipes (canonical example: 糖醋排骨 vs 排骨汤).
4. Do not keep avoidable duplicates as an excuse for caution. Same core cooking structure with normal substitutions/finishes should consolidate.
5. User-facing names must remain natural menu names. Never expose internal engineering/core names.

## Composition model

Extend the existing Recipe composition model to:

```text
Recipe
├─ required / one_of
├─ finish_options        # optional, Recipe-specific single select
├─ optional_groups[]     # existing central groups; 0..N
└─ serving_options       # optional subset of [rice, noodles]
```

Do not add a generic stage DSL, compatibility matrix, per-Recipe optional member allow-list, or nested options.

### Finish

Add an optional Recipe field `finish_options`.

Each finish has:

- stable Recipe-local `id`;
- `label_zh`;
- exactly one `default: true` when finish options exist;
- optional `display_name_zh` for non-default variants that have a natural distinct menu name;
- finish-specific Cook View additions needed to complete the shared core, using the smallest clean schema consistent with current Cook View data (prefer `cook_ingredients` and `steps` additions; do not build a generic workflow language).

Rules:

- `recipe.name_zh` is the natural popular name of the default Finish.
- Default finish does not need to duplicate `display_name_zh`.
- Resolved user-facing name = `display_name_zh` when selected and present, otherwise Recipe `name_zh`.
- Finish never changes inventory, adult meal contribution, or Checkout quantities.
- Finish selection is part of shared Plan state and Cook View.
- Finish is not re-edited as Checkout Actual because it is not an inventory fact.
- If variants require materially different primary cooking process, texture target, meal contribution, or Child coverage, they are separate Recipes rather than Finishes.

### Serving

Add optional Recipe field:

```yaml
serving_options: [rice, noodles]
```

Only canonical Ingredient IDs `rice` and `noodles` are permitted. A Recipe may allow either or both. None is always legal.

Behavior:

- single-select: none / rice / noodles;
- only currently available serving choices are selectable, while an already planned value remains visible during edit so it can be removed;
- selected Serving contributes `staple: 1` to Plan;
- unselected available Serving may keep a candidate discoverable when Staple is the remaining gap, analogous to current optional potential, but does not count until selected;
- Serving is not queue-reserved;
- Cook View shows the selected serving/assembly;
- Checkout Actual starts from Plan and may switch rice/noodles or remove Serving if live stock allows;
- Actual Serving participates in final inventory consumption using existing presence-only semantics.

Do not add bread, udon, rice noodles, buns, or other serving taxonomy in this task.

### Shared state

Extend shared current/pending meal state cleanly, e.g.:

```text
recipeFinishSelections/{recipeId} = finishId
recipeServingSelections/{recipeId} = rice | noodles
checkoutRecipeDrafts/{recipeId}/servingIngredientId = rice | noodles   # optional
```

Use the existing repository/state patterns. Reconciliation must:

- drop selections for removed/unselected Recipes;
- reset invalid/missing Finish selections to the Recipe default when a selected Recipe has Finish options;
- remove Finish state when a Recipe has no Finish options;
- remove invalid/unavailable schema values for Serving; Plan availability rules should match existing composition behavior;
- preserve queue behavior and Actual-vs-Plan separation.

Update Firebase rules and emulator tests in the same change. Current rules reject unknown Checkout/currentMeal fields, so connected mode must work without permission errors.

## Optional groups

Keep the global Option taxonomy small. Do **not** add a `快炒配菜` group and do not create Recipe-specific/few-Recipe groups.

Canonical target is four representative groups:

1. Existing stable ID `add-some-richness`, label `加点油水`.
   - general add-a-little-protein behavior usable by tofu, vegetable, soup, etc.;
   - use the current group as baseline, but remove clearly implausible large/whole forms as optional add-ins when appropriate;
   - members remain fixed Protein 0.5 add-ons with normal checkout units.

2. Existing stable ID `change-it-up`, relabel to a clear tomato meaning such as `加番茄`.
   - tomato only;
   - used for common tomato variants such as 豆腐汤 → 番茄豆腐汤, 蛋花汤 → 番茄蛋花汤.

3. Existing stable ID `one-pot-mix`, relabel `顺手焖`.
   - representative tofu/yuba, suitable leafy/napa, mushrooms, winter melon/daikon/root/starchy items that are naturally added during braise/reduction;
   - preserve appropriate fixed contributions.

4. New central group `soup-addons`, label `汤里加`.
   - representative leafy vegetables, tofu, mushrooms, winter melon, daikon, corn, Chinese yam, etc. that are naturally added to soups.

Groups may overlap Ingredient membership. A Recipe may reference multiple optional groups. Do not impose `optional_groups.length <= 1`.

When multiple referenced groups contain the same Ingredient, the Plan/Cook/Checkout UI must not show duplicate controls. Deduplicate deterministically by Recipe group order (first group wins for presentation/new selection). Existing persisted valid addon records should reconcile safely.

Add validation so the same Ingredient appearing in multiple central groups cannot have conflicting `meal_contribution` or `checkout_units` across those groups.

Hard/`one_of` bound Ingredients must continue to be hidden from Option controls.

## Consolidation rules

Audit every active Recipe, not only the examples below. Build a temporary working coverage mapping while migrating, but do not create a permanent parallel mapping file after completion.

### General merge rules

Consolidate when Recipes share the same core cooking interface and differ mainly by:

- compatible cut/form within the same protein family -> `one_of`;
- final seasoning/sauce/finish -> Finish;
- representative optional add-in -> central Option Group;
- rice/noodle final serving -> Serving.

Keep separate when the defining cooking interface changes materially: soup vs reduction, steam vs fry, roast vs wet braise, coating/breading, formed meat vs whole/chunk meat, special integrated staple process, substantially different texture target, etc.

For household tough meat (beef/lamb/goat/pork chunks, appropriate legs/trotters/etc.), prefer the established household route where applicable: Instant Pot tenderize, then wok/pan seasoning/reduction, with suitable `顺手焖` additions during finishing. Do not mechanically retain stale 10–15 minute IP guidance for tough cuts; use recipe-appropriate times.

Goat and lamb belong to the same protein family for consolidation.

### Quick stir-fry structure

Do not invent a `快炒配菜` Option Group.

Where current cards include both protein-only and protein+vegetable stir-fries, use two clean core shapes as needed:

- a natural protein-only stir-fry Recipe with Finish variants for flavor/aromatic endings such as 孜然/葱爆/姜烧/京酱 when they share the same core;
- a natural mixed stir-fry Recipe such as `牛肉炒时蔬` / `鸡片炒时蔬` / `肉片炒时蔬` / `鱿鱼炒时蔬`, with hard protein plus a vegetable `one_of` covering compatible existing vegetable variants.

Do not make vegetable hard requirements prevent representation of pure-meat variants, and do not expose generic engineering names. A natural generic household menu name such as `牛肉炒时蔬` is acceptable when the selected `one_of` vegetable varies.

### High-confidence family direction

Use current data as source of truth and consolidate thoroughly. Important expected outcomes include, but are not limited to:

- Pork: consolidate repeated pork-slice stir-fries; repeated ground-pork stir-fries; chunk/belly braise flavor variants; rib soup variants into one 排骨汤 with soup additions; trotter flavor variants. Keep 糖醋排骨 separate from 排骨汤, steamed black-bean ribs separate, char siu separate, etc.
- Beef: consolidate mixed beef+veg stir-fries; pure sliced-beef flavor stir-fries; red/clear chunk-beef braise variants including noodle/rice serving where appropriate; gyudon/sukiyaki/niku-udon family where one core genuinely works; merge duplicate frozen beef patty pan/burger behavior with bread not becoming a new Serving type (retain a separate burger Recipe only if bread is structurally defining and needed for coverage). Keep shank, oxtail, steak, LA galbi, galbijjim when cooking interface differs.
- Lamb/goat: consolidate sliced lamb pure stir-fry finishes; merge lamb/goat chunk braises/soups that share the IP+tenderize+finish core; keep spine, chops, shanks, riblets, meatballs when structurally different.
- Chicken: consolidate repeated chicken+veg stir-fries; pan-seared boneless chicken finish variants; braised thigh/drumstick variants; wing braise variants; steamed chicken variants. Keep white-cut chicken vs soy-sauce chicken separate if the primary poaching medium/process differs; keep Hainan chicken rice because rice is an integrated cooking structure.
- Duck: retain distinct duck wing and duck leg Recipes, but give appropriate braise/finish/Option behavior.
- Fish: merge compatible steamed whole-fish ginger-scallion vs black-bean variants under one steamed-fish Recipe; keep baked/miso/pan-seared structures separate.
- Shellfish: consolidate compatible squid+veg stir-fries; consolidate shrimp+veg stir-fries where appropriate; keep scrambled eggs, poached shrimp, scallops, oysters, paste soup vs ready-ball soup when handling differs.
- Egg/tofu: consolidate basic/tomato egg-drop soup using `加番茄`; consolidate tomato egg + noodle serving only if core remains clean; retain one `家常豆腐` family using soft/firm/egg tofu as already intended, and attach appropriate Option groups.
- Vegetables: materially reduce repetitive plain stir-fries. Keep existing leafy `one_of` pattern and create a small number of natural generic household structures such as `清炒叶菜`, `清炒时蔬`, and where appropriate `家常炒蛋` with compatible vegetable `one_of`. Keep genuinely distinct oyster-sauce blanching, fermented-bean-curd, sesame dressing, cold salad, steam, simmer/braise structures separate.
- Staples: do not use Serving to absorb true staple cooking structures such as fried rice, yaki udon, congee, Hainan chicken rice, savory mixed rice, etc. Merge only obvious same-interface duplicates when clean.
- Extras: preserve unless a true duplicate is found.

### Data quality cleanup during rewrite

Do not copy existing template contamination into consolidated Recipes. Rewrite from the correct cooking core and fix mismatches encountered, including known patterns such as:

- hard Ingredient not actually used;
- stale shepherd's-purse/greens text;
- beef/lamb braises containing pig-trotter residue;
- chicken variants referencing the wrong vegetable prep;
- generic shrimp/squid/scallop residue;
- thin beef soup using bone/chunk blanching instructions;
- stale retired easy-braise prose;
- steamed beef rice metadata vs actual sliced/ground beef mismatch;
- duplicate frozen beef patty records with contradictory child coverage;
- unrealistic lamb shank tenderness logic.

Do not preserve historical mistakes merely to minimize diffs.

## UI behavior

Extend the existing inline Plan draft; do not redesign the whole page.

Candidate card:

- continues to show natural Recipe name (default Finish name when applicable);
- compact composition summary should represent required/one_of, Finish availability, Option group labels, and Serving availability without enumerating huge lists.

Plan editor order should remain compact and mobile-friendly:

1. required / main `one_of`;
2. Finish (when present), default preselected;
3. referenced Option groups, multi-select with dedupe;
4. Serving: none / rice / noodles as allowed and available.

Selected summary and Cook View show resolved menu name and current choices. Cook View combines shared core instructions with selected Finish completion instructions and shows selected Serving assembly.

Do not turn the UI into a rule/configuration editor.

## Ranking / totals / Child behavior

- Finish has zero effect on totals and inventory.
- Selected Serving adds Staple 1.
- Available but unselected Serving may only provide candidate potential/discoverability, mirroring current optional-potential semantics.
- Option behavior and Child coverage remain consistent with existing central optional rules unless a consolidated Recipe's preparation fact legitimately changes.
- When consolidating Recipes, do not merge variants whose base meal contribution or Child coverage semantics cannot be represented correctly by one core.

## Archive and coverage transaction

For every retired active Recipe:

- remove it from active category index;
- move its YAML to `src/data/meal-builder/archive/`;
- set `status: archived`;
- keep its stable ID globally reserved;
- remove/update active references;
- do not leave duplicate active files as reference material.

Use the existing archive contract.

Before considering a family complete, verify that every old active Recipe in that family maps to one of:

- surviving/new active Recipe directly;
- active Recipe + Finish;
- active Recipe + required/`one_of` selection;
- active Recipe + Option;
- active Recipe + rice/noodle Serving;
- or an explicitly justified separate active Recipe because the cooking interface is materially different.

Coverage must not silently disappear.

Do not create a permanent migration knowledge file after the task. The handoff itself may contain the task/result; canonical product truth remains active/archive data and normal docs.

## Runtime/deployment guard

Do not add a large one-off legacy Recipe-ID migration system solely for this consolidation.

Archived/unknown Recipe IDs already reconcile away. Therefore deployment must not occur while a real household `currentMeal` or `pendingCheckoutMeals` still depends on Recipe IDs archived by this change. Mention this deployment guard clearly in `## Result` so ChatGPT/user can ensure the current/pending meal is completed or reset before deploying the archived-ID cutover.

## Documentation

Update `docs/modules/meal-builder/data-model.md` and `behavior.md` to the new canonical model. Remove obsolete statements such as composition having only required/one_of/optional if no longer true. Keep docs concise and aligned with actual implementation; do not preserve rejected design history.

Update root Meal Builder content metadata using existing repository conventions. Keep schema version unchanged if the implementation remains backward-compatible for Recipes omitting the new optional fields; bump content version appropriately.

## Validation

Use the Meal data helper as required by `.agents/skills/manage-meal-data/SKILL.md` for changed active records and reference checks.

Add/update focused tests covering at minimum:

- Finish schema: unique IDs, exactly one default, invalid display/fields rejected;
- Finish default/resolved naming and state reconciliation;
- Finish switching does not change meal totals/inventory/checkout;
- Serving schema only accepts rice/noodles;
- Serving selected adds Staple 1; unselected potential does not count yet;
- Serving Checkout Actual switch/remove and presence-only consumption;
- Serving is not queue-reserved;
- Option groups may overlap;
- overlapping option members with conflicting contribution/checkout are rejected;
- duplicate Option UI entries are deduped deterministically;
- hard/one_of binding still hides same Ingredient from Option UI;
- multiple Option groups remain supported;
- Firebase rules accept the new shared state/Checkout fields and still reject unknown fields;
- stale invalid Finish/Serving state reconciles safely;
- archived old Recipe IDs do not appear as active candidates;
- representative end-to-end consolidated Recipe through Recipes -> Cook -> Checkout, including one tough-meat case with Finish + Option + Serving;
- coverage check for the migration so no old active Recipe is accidentally unrepresented.

Run focused checks while iterating, then complete the repository gate:

```text
pnpm run verify
```

Fix task-caused failures rather than stopping at the first failure.

## Scope exclusions

- No new generic recipe/stage DSL.
- No per-Recipe optional member allow-lists.
- No large set of new Option Groups.
- No new Serving types beyond rice/noodles.
- No unrelated Meal Builder redesign or repository cleanup.
- No PR unless repository state unexpectedly requires one.

## Result

Append only:

- `Status: PASS / FAIL / BLOCKED`;
- concise summary of implemented consolidation/capabilities;
- final active Recipe count before/after if readily available from canonical indexes;
- validation outcome, including `pnpm run verify`;
- any material deviation/blocker;
- explicit deployment guard reminder about current/pending meals containing archived Recipe IDs.
