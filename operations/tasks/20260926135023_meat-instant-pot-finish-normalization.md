---
id: 20260926135023_meat-instant-pot-finish-normalization
status: running
agent: luna-xhigh
runner: samidore
target_repo: samidore/FamilyHub
target_branch: main
summary: 统一 FamilyHub 肉类湿式焖煮为 Instant Pot 基底并修正现有 Finish 分层，覆盖全部猪鸡鸭牛羊/山羊 active Ingredient 与 Recipe，最后通过完整 Meal Builder 验证。
---
## Goal

Normalize the current canonical Meal Builder meat cooking model to the household rule just confirmed by the user:

- Stir-fry stays stir-fry.
- A meat Recipe whose meat is cooked through a wet braise / stew / simmer / red-braise / lu-style braise / casserole / meat-soup tenderizing phase must use the 9-qt Instant Pot for that wet meat-cooking phase instead of stovetop/oven slow braising.
- Do **not** exclude any meat Ingredient from Instant Pot merely because it is thin, tender, steak/chop-shaped, bone-in, organ meat, etc. The user explicitly rejected that suitability gate. If a specific active Recipe is fundamentally a stir-fry, pan-sear, steam, roast, baked, or other identity-defining dry/quick method, preserve that Recipe's method; the Instant Pot rule applies to wet braise/stew/simmer/tenderizing routes, not as a replacement for unrelated cooking identities.
- For a pressure-based Recipe with `finish_options`, the shared Instant Pot base is responsible for cooking/tenderizing the meat to its target texture. Finish steps are late flavoring / reduction / coating / dressing only and must not contain the main cook-to-tender phase.

Use the current fetched `origin/main` as repository authority. Read `AGENTS.md`, `PROJECT.md`, `docs/modules/meal-builder/README.md`, `docs/modules/meal-builder/data-model.md`, `docs/modules/meal-builder/behavior.md`, and `.agents/skills/manage-meal-data/SKILL.md` before substantive edits.

Scope is the active meat Ingredient categories:
- `pork`
- `chicken` including duck Ingredients stored there
- `beef`
- `lamb-goat`

Fish and shellfish are out of scope.

Do not include the separate pending candidate-ranking / half-unit inventory / child-coverage logic work in this task.

## Checkpoint 1 — Canonical policy and audit

1. Audit every active Ingredient in the four meat categories and every active Recipe that uses them.
2. Classify active Recipes by actual cooking path, not by name alone:
   - stir-fry / quick pan route: preserve;
   - identity-defining steam / roast / bake / pan-sear route: preserve unless it also contains a separate wet slow-braise meat-cooking phase that should move to Instant Pot;
   - wet braise / stew / simmer / lu / casserole / soup route where the meat is being cooked/tenderized in liquid: normalize that meat-cooking phase to Instant Pot.
3. Update the canonical Meal Builder docs so future authoring follows this household rule. In particular, remove/replace wording in the Finish expansion guidance that implies Instant Pot is only for “tougher” cuts or that covered stovetop braise is the normal meat-braise family. Preserve other non-meat or genuinely quick/dry cooking families.
4. Record the audited Ingredient/Recipe coverage in the task execution notes; do not create a new permanent knowledge-base/report file.

Validate the docs/data remain parseable, commit and push this checkpoint before continuing.

## Checkpoint 2 — Normalize active meat Recipes and existing Finish semantics

Apply the audit to the active Recipe data.

### A. Wet meat routes

For every in-scope active Recipe whose meat is currently cooked/tenderized by wet stovetop/oven braise, stew, simmer, lu-style braise, casserole, or meat-soup slow cooking:

- convert the meat-cooking phase to the household 9-qt Instant Pot workflow;
- use Recipe-specific pressure time / release / liquid amounts and target texture based on the current dish and existing content; do not invent a single hard-coded pressure time for all meats;
- keep any necessary post-pressure stovetop reduction/finishing step when that is part of the dish;
- keep tracked Ingredients in normal hard/one-of/optional composition; Finish additions remain inventory-neutral pantry/cooking guidance;
- update `tags`, `equipment`, `burner_plan`, timing metadata, `steps`, and `cook_ingredients` consistently;
- preserve current Recipe identity, contribution, inventory bindings, child-coverage meaning, and optional-group semantics unless a direct consequence of the cooking-path correction requires a local wording/timing update.

Examples already observed on current main that must be checked include, but are not limited to:
- `shanghai-sweet-sour-ribs`
- `red-braised-pork-trotters`
- `cantonese-pork-feet-ginger-vinegar`
- `coca-cola-chicken-wings`
- `oyster-sauce-braised-chicken`
- `soy-braised-chicken-gizzards`
- `soy-braised-duck-wings`
- `chinese-braised-beef-shank`
- `galbijjim`
- `japanese-daikon-braised-boneless-short-ribs`
- `red-braised-lamb-riblets`
- `clear-braised-lamb-leg-chunks`
- `clear-lamb-daikon-soup`
- `clear-lamb-spine-soup`
- `hong-kong-yuba-lamb-casserole`
- `western-braised-lamb-shanks`

This list is discovery evidence, not the authoritative complete list; the audit must cover all active in-scope Recipes.

### B. Finish layering

Normalize every existing in-scope Recipe with `finish_options` so that:
- shared base cooking happens before Finish;
- Finish steps no longer say to braise/simmer the raw meat until tender;
- Finish only changes the late flavor/dressing/reduction;
- existing natural dish names and `display_name_zh` identities remain intact.

Known current Finish families to inspect include:
- `hong-shao-rou`
- `coca-cola-chicken-wings`
- `oyster-sauce-braised-chicken`
plus the existing stir-fry Finish Recipes; the latter should remain stir-fry and should not be converted just because they have Finish options.

### C. Explicit ribs correction

Implement the user-confirmed ribs model:

- Keep `shanghai-sweet-sour-ribs` as the canonical active Recipe identity.
- Its shared base must be Instant Pot first to cook/soften `soft-pork-ribs`, followed by a finish stage.
- Add explicit Recipe-local Finish choices:
  - default `sweet-sour` resolving to the base display identity `糖醋排骨`;
  - non-default `red-braise` with natural display name `红烧排骨`.
- Both finishes share the same Ingredient binding, Protein contribution, child coverage, optional-group capability, Instant Pot base, and adult/child serving behavior; only the late sauce/reduction differs.
- Do not add a second standalone `red-braised-pork-ribs` Recipe.

### D. Existing flavor-only duplicates

Where current active Recipes for the same meat Ingredient/composition differ only by post-tenderization pantry flavor and can safely be represented as Finish choices under the existing schema, consolidate only when the equivalence is mechanically clear from current canonical data. Preserve stable IDs and avoid broad archival churn. If consolidation would require changing hard/one-of/optional composition, serving semantics, or a materially different cooking identity, keep separate Recipes.

Do **not** invent speculative new flavor combinations merely to create a Cartesian product. This task normalizes the current canonical dish set plus the explicit `红烧排骨` addition. In the detailed task result, list remaining plausible pressure-base × existing-Finish directions that are not represented so the user can decide later whether to add them.

For every changed active Meal Builder record, run the repository Meal Data helper verification required by `.agents/skills/manage-meal-data/SKILL.md`.

Commit and push this checkpoint before continuing.

## Checkpoint 3 — Regression coverage and full validation

Add/update the smallest tests needed to lock in the corrected canonical semantics, including:

- active meat braise/wet-cook data cannot silently drift back to a long stovetop/oven tenderizing route where the canonical Recipe is now Instant Pot based;
- `shanghai-sweet-sour-ribs` parses with the two required Finish choices and resolves `红烧排骨` correctly;
- Finish steps for pressure-based Recipes remain post-pressure flavor/finish semantics rather than the main tenderizing phase, using a robust data-level assertion rather than fragile prose matching where practical.

Run focused checks while editing, then run the project release gate `pnpm run verify`.

Fix task-caused failures. If full verification is blocked only by an environment dependency, run every available preceding check, report the exact blocker, and do not claim full release verification passed.

## Constraints

- Smallest complete change; no unrelated refactor.
- Current indexed YAML is the data authority.
- No new parallel knowledge base or permanent audit report.
- Do not change the pending Protein-target ranking, child-softness semantics, or half-unit planning availability in this task.
- Do not reintroduce deprecated Meal Builder fields/systems.
- Follow existing canonical data transaction, indexing, and content-metadata rules.
- Work only on `samidore/FamilyHub` branch `main`.
- Create/update the required target execution record at `operations/tasks/20260926135023_meat-instant-pot-finish-normalization.md`.
- Commit and push each completed checkpoint to `origin/main`.
- Finish with exactly one canonical runner trailer:
  `CODEX_RUNNER_RESULT {"status":"PASS|CONTINUE|FAIL|BLOCKED","validation":"...","changed_files":["..."],"notes":"..."}`


## Execution notes

- Resolved starting local HEAD before reconciliation: `8ad298bbaecff604c5807404ecf885ed84d82a29`.
- Fetched `origin/main` tip before reconciliation: `d8a3314da81023a2ae8f5969eac85b55640faa12`.
- Initial worktree was clean and local `main` was behind; fast-forwarded to the fetched tip. Post-reconciliation local HEAD and remote tip are both `d8a3314da81023a2ae8f5969eac85b55640faa12`.


### Checkpoint 1 — Canonical policy and audit

- Audited active Ingredient membership through `src/data/meal-builder/ingredients/index.yaml` and each referenced category file: 48 total. `pork` (12): `whole-pork-tenderloin`, `pork-shoulder-chunks`, `thin-sliced-pork-belly`, `extra-thin-sliced-pork-belly`, `ground-pork`, `soft-pork-ribs`, `pork-feet`, `pork-chops`, `pork-liver`, `white-oil-sausage`, `chinese-sausage`, `pork-meatballs`. `chicken` including duck (12): `chicken-thighs`, `chicken-breast`, `whole-chicken-wings`, `party-wings`, `chicken-drumsticks`, `frozen-chicken-patties`, `whole-chicken`, `chicken-gizzards`, `chicken-hearts`, `chicken-liver`, `duck-wings`, `duck-legs`. `beef` (14): `whole-beef-brisket`, `sliced-beef-brisket`, `hot-pot-beef-slices`, `beef-shank`, `chuck-roast`, `oxtail`, `cross-cut-beef-short-ribs`, `ground-beef`, `frozen-beef-patties`, `beef-rib-fingers`, `flat-iron-steak`, `denver-steak`, `boneless-beef-short-ribs`, `beef-steak`. `lamb-goat` (10): `hot-pot-lamb-slices`, `lamb-shoulder-chunks`, `lamb-leg-chunks`, `ground-lamb`, `bone-in-lamb-chops`, `boneless-lamb-chops`, `lamb-shanks`, `lamb-riblets`, `skin-on-bone-in-goat-pieces`, `lamb-spine-sections`.
- Audited all active indexed Recipes across every Recipe category and matched actual `ingredients[]` / `one_of` bindings to the 48 Ingredients (also cross-checked protein metadata): 83 Recipes. Fish/shellfish records were out of scope.
- Actual quick stir-fry / pan / sauced-pan routes to preserve (29): `beijing-sauce-pork-strips`, `pressed-tofu-pork-strips`, `yellow-chives-pressed-tofu-pork-strips`, `jiang-ding-ground-pork-pressed-tofu`, `mushroom-pork-slices-stir-fry`, `moo-shu-pork`, `ground-pork-chinese-greens-stir-fry`, `ginger-scallion-pork-liver`, `chicken-broccoli-stir-fry`, `mushroom-beef-stir-fry`, `scallion-beef-stir-fry`, `ground-beef-chinese-greens-stir-fry`, `cumin-lamb`, `sweet-and-sour-pork-tenderloin`, `guo-ta-pork-tenderloin`, `scallion-salt-extra-thin-pork-belly`, `butter-shoyu-chicken`, `simple-pan-seared-chicken-breast`, `orange-chicken`, `pan-seared-frozen-chicken-patties`, `cumin-chicken-hearts`, `japanese-hamburg-steak`, `frozen-beef-patty-burger`, `la-galbi`, `pan-seared-steak`, `pan-seared-frozen-beef-patty`, `simple-pan-seared-lamb-chops`, `xinjiang-lamb-noodles`, `niku-udon`.
- Identity-defining steam, roast, bake, air-fry, or heat-only/pre-cooked-meat routes to preserve (13): `water-chestnut-steamed-pork-patty`, `minced-pork-steamed-eggs`, `steamed-ribs-black-bean`, `steamed-chicken-shiitake-fresh-wood-ear`, `steamed-chicken-chinese-sausage`, `steamed-beef-rice-with-egg`, `cantonese-char-siu`, `honey-soy-baked-wings-drumsticks`, `baked-chicken-katsu`, `slow-roasted-lamb-shanks`, `air-fryer-chicken-thighs`, `clear-pork-meatball-soup` (heat-only packaged meatballs), `taro-rice` (cured sausage is cooked with the rice).
- Wet liquid-cook/tenderize routes reviewed from executable steps: 41 total. Four already use a complete pressure base: `instant-pot-red-braised-duck-legs`, `chinese-red-braised-beef`, `instant-pot-oxtail-soup`, `red-braised-lamb`. `hong-shao-rou` already pressure-cooks pork shoulder but still has a separate stovetop meat-cooking branch for thin belly, so it remains in the normalization set. The 37 requiring a full Instant Pot path are: `vietnamese-thit-kho-eggs`, `clear-braised-lions-head-meatballs`, `hong-shao-rou`, `mille-feuille-nabe-pork-napa`, `shanghai-sweet-sour-ribs`, `shanghai-braised-pork-chops`, `red-braised-pork-trotters`, `cantonese-pork-feet-ginger-vinegar`, `oyster-sauce-braised-chicken`, `coca-cola-chicken-wings`, `white-cut-chicken`, `cantonese-soy-sauce-chicken`, `hainanese-chicken-rice`, `soy-braised-chicken-gizzards`, `soy-braised-chicken-liver`, `soy-braised-duck-wings`, `nikujaga`, `chinese-braised-beef-shank`, `galbijjim`, `japanese-daikon-braised-boneless-short-ribs`, `red-braised-lamb-meatballs`, `western-braised-lamb-shanks`, `hong-kong-yuba-lamb-casserole`, `red-braised-lamb-riblets`, `winter-melon-pork-meatball-soup`, `winter-melon-pork-rib-soup`, `tomato-fatty-beef-soup`, `clear-lamb-daikon-soup`, `clear-lamb-spine-soup`, `clear-braised-lamb-leg-chunks`, `taiwanese-braised-minced-pork-rice`, `oyakodon`, `chicken-shiitake-udon-soup`, `gyudon`, `sukiyaki-don`, `red-braised-beef-noodle-soup`, `xinjiang-lamb-pilaf`.
- Updated `behavior.md` with the path-based 9-quart Instant Pot household rule and pressure-base/late-Finish semantics. Updated `data-model.md` to replace the cut-gated covered-braise family, align the illustrative braised-chicken equipment, and state that pressure timing/liquid/release remain Recipe-specific.
- Validation: `git diff --check` passed; `node scripts/validate.mjs` and `node scripts/validate-meal-privacy.mjs` both passed, including Meal Builder YAML validation (142 Ingredients / 153 Recipes) and privacy validation. `pnpm` is unavailable in this environment, so the equivalent Node scripts were invoked directly.
- Checkpoint 1 result: COMPLETE. The checkpoint commit `4fd1fec71f7f95f194402031f6d371253aa632c1` is pushed to `origin/main`. Next checkpoint: normalize active wet meat Recipes and existing Finish semantics, including the explicit ribs Finish choices.