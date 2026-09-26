---
id: 20260926162600_expand-meat-finishes
status: running
agent: luna-xhigh
runner: samidore
target_repo: samidore/FamilyHub
target_branch: main
summary: 扩充 FamilyHub 已确认的肉类 Instant Pot Finish 组合，并把同一压力基底中的“酱油/蚝油”统一并入红烧 Finish，完成数据验证与回归测试。
---
## Goal

Implement the Finish expansion explicitly approved by the user on current `samidore/FamilyHub` `main`.

Current household rules for this task:

- Wet meat cooking already uses the 9-quart Instant Pot shared base; Finish is post-pressure flavoring/reduction only.
- Do not add an ingredient-suitability gate.
- Do not create a Cartesian product of every Finish with every meat.
- **Within this Finish model, 红烧 is the household soy + oyster-sauce direction. Do not expose separate “酱油” and “蚝油” Finish buttons on the same pressure base.**
- Distinct standalone dishes such as 豉油鸡 are not merged merely because their names involve soy sauce.
- Keep Finish choices Recipe-local and inventory-neutral.

Read current `AGENTS.md`, `PROJECT.md`, `docs/modules/meal-builder/README.md`, `docs/modules/meal-builder/data-model.md`, `docs/modules/meal-builder/behavior.md`, and `.agents/skills/manage-meal-data/SKILL.md` after mandatory Git preflight.

## Exact Finish sets to implement

Preserve stable Recipe IDs. Reuse current shared Instant Pot bases; do not add duplicate Recipe cards just to represent these flavor variants.

### 1. Pork ribs — `shanghai-sweet-sour-ribs`

Keep base display identity `糖醋排骨`.

Exact Finish set:
- `sweet-sour` — default — `糖醋排骨`
- `red-braise` — `红烧排骨`
- `thirteen-spice` — `十三香排骨`
- `adobo` — `醋香排骨`

Requirements:
- Keep the existing shared pressure base and optional-group/inventory semantics.
- Update `red-braise` so the household red-braise direction uses soy + oyster sauce rather than creating separate soy/oyster Finish choices.
- Finish steps remain post-pressure only.

### 2. Chicken thighs / drumsticks — stable ID `oyster-sauce-braised-chicken`

The current `oyster` and `soy` Finish buttons are semantically duplicated under the user's household definition. Collapse them into one `red-braise` Finish.

Rename the display identity naturally while preserving the stable ID:
- base `name_zh`: `红烧鸡腿 / 鸡小腿`
- update English display name consistently.

Exact Finish set:
- `red-braise` — default — base identity
- `teriyaki` — `照烧鸡腿`
- `adobo` — `醋香焖鸡`
- `cola` — `可乐鸡腿`
- `thirteen-spice` — `十三香鸡腿`

Requirements:
- Remove the separate `oyster` and `soy` choices.
- `red-braise` must use the household soy + oyster-sauce direction.
- Preserve the shared chicken pressure base, one-of binding, one-pot-mix, child coverage, and meal contribution.
- Saved runtime selections using removed Finish IDs may fall back through the repository's existing invalid-Finish reconciliation; do not add a parallel migration system unless current code demonstrably requires one.

### 3. Chicken wings — `coca-cola-chicken-wings`

Keep `可乐鸡翅` as base/default identity.

Exact Finish set:
- `cola` — default — `可乐鸡翅`
- `swiss` — `瑞士鸡翼`
- `thirteen-spice` — `十三香鸡翅`
- `red-braise` — `红烧鸡翅`
- `teriyaki` — `照烧鸡翅`
- `adobo` — `醋香鸡翅`

Red-braise uses soy + oyster sauce. Keep all flavoring after the shared pressure stage.

### 4. Duck legs — `instant-pot-red-braised-duck-legs`

Convert the current hard-coded red-braise flavor into a neutral shared pressure base + Finish choices.

Use a natural base display name; remove `Instant Pot` from `name_zh` if doing so matches current naming conventions, while preserving the stable ID.

Exact Finish set:
- `red-braise` — default — `红烧鸭腿`
- `adobo` — `醋香鸭腿`
- `thirteen-spice` — `十三香鸭腿`
- `cola` — `可乐鸭腿`
- `teriyaki` — `照烧鸭腿`

Requirements:
- Pressure liquid/base must no longer hard-code the red-braise flavor.
- Red-braise Finish uses soy + oyster sauce.
- Preserve duck-leg inventory/optional/child semantics.

### 5. Duck wings — `soy-braised-duck-wings`

Keep stable ID; current display identity already resolves to red-braised duck wings.

Exact Finish set:
- `red-braise` — default — `红烧鸭翅膀`
- `adobo` — `醋香鸭翅`
- `thirteen-spice` — `十三香鸭翅`
- `cola` — `可乐鸭翅`
- `teriyaki` — `照烧鸭翅`

Requirements:
- Refactor current soy/red-braise pressure liquid to a neutral shared pressure base.
- Red-braise Finish uses soy + oyster sauce.
- Preserve inventory/optional/child semantics.

### 6. Large beef pressure base — `chinese-red-braised-beef`

This existing Recipe already covers:
- `whole-beef-brisket`
- `chuck-roast`
- `beef-rib-fingers`
- `boneless-beef-short-ribs`

Exact Finish set:
- `red-braise` — default — `红烧牛肉`
- `thirteen-spice` — `十三香牛肉`
- `adobo` — `醋香牛肉`
- `black-pepper` — `黑椒牛肉`

Requirements:
- Convert current hard-coded post-pressure red-braise sauce into `finish_options`.
- Shared pressure base remains neutral.
- Red-braise uses soy + oyster sauce.
- Preserve one-of binding, one-pot-mix, serving options, child coverage, and meal contribution.

### 7. Large lamb/goat pressure base — `red-braised-lamb`

Expand the existing large-chunk pressure Recipe so its one-of binding covers the household's large lamb/goat chunks:
- existing `lamb-shoulder-chunks`
- add `lamb-leg-chunks`
- existing `skin-on-bone-in-goat-pieces`

Exact Finish set:
- `red-braise` — default — `红烧羊肉`
- `thirteen-spice` — `十三香羊肉`
- `cumin` — `孜然羊肉`
- `adobo` — `醋香羊肉`

Requirements:
- Convert current hard-coded red-braise late sauce into Finish options.
- Shared pressure base remains neutral.
- Red-braise uses soy + oyster sauce.
- Cumin is a post-pressure dry/aromatic finish, not a second raw-meat stir-fry path.
- Preserve one-pot-mix and current planning/child semantics.

### 8. Pork feet — `red-braised-pork-trotters`

Exact Finish set:
- `red-braise` — default — `红烧猪蹄`
- `ginger-vinegar` — `姜醋猪脚`
- `thirteen-spice` — `十三香猪蹄`
- `adobo` — `醋香猪蹄`

Requirements:
- Refactor the current red-braise pressure liquid into a neutral shared pressure base; all flavor directions happen after pressure.
- Red-braise uses soy + oyster sauce.
- Keep `cantonese-pork-feet-ginger-vinegar` as a separate active Recipe because its hard composition includes `eggs`; do not archive or merge it into Finish. The new `ginger-vinegar` Finish is the pork-feet-only flavor direction and should have a natural local display name rather than pretending it includes the egg composition of `猪脚姜`.

## Red-braise consistency cleanup

For the pressure-based Finish Recipes touched by this work, `red-braise` is one choice and must not coexist with separate `soy` or `oyster` buttons.

Also update the existing `hong-shao-rou` `red-braise` Finish to match the same household soy + oyster-sauce direction, without otherwise expanding that Recipe's Finish set.

Fix the existing duplicate `基础焖煮液` line in `hong-shao-rou.yaml` while touching it.

Do not broadly rename or consolidate unrelated standalone Recipes whose dish identity is materially distinct.

## Canonical documentation

Update the smallest relevant canonical Meal Builder documentation to record this household Finish rule:

- On a shared Instant Pot meat base, `red-braise` represents the household soy + oyster-sauce red-braise direction.
- Do not offer separate soy and oyster Finish buttons beside red-braise on the same base.
- Distinct standalone dishes may still use soy/oyster ingredients where appropriate.

Do not create a parallel Finish registry or global runtime inheritance system; Finish stays Recipe-local.

## Data quality

For every added Finish:
- provide a stable local Finish ID;
- exactly one default per Recipe;
- natural `display_name_zh` for each non-default dish identity;
- Recipe-local `cook_ingredients` with usable quantities;
- executable post-pressure `steps`;
- do not hide tracked Ingredients inside Finish;
- preserve current contribution, inventory consumption, queue reservation, optional groups, serving behavior, and child coverage unless explicitly changed above.

Update root Meal Builder content metadata using current repository convention.

Run `meal-data.mjs verify-item` for every changed active Recipe.

## Tests and validation

Add or update focused data-level regression coverage for at least:

1. exact Finish ID sets for all eight targeted Recipe families;
2. natural resolved Chinese names for the new non-default choices;
3. chicken thigh Recipe has no separate `oyster` or `soy` Finish IDs and defaults to `red-braise`;
4. all targeted `red-braise` Finish cook ingredients contain the household soy + oyster direction;
5. duck leg/duck wing/beef/lamb/pork-feet shared pressure steps are flavor-neutral before Finish and Finish remains post-pressure;
6. `red-braised-lamb` includes `lamb-leg-chunks`;
7. `cantonese-pork-feet-ginger-vinegar` remains active with hard `eggs` composition;
8. `hong-shao-rou` has no duplicate base-liquid Cook View line.

Run focused tests, then the normal project verification gate `pnpm run verify`.

If the local environment still lacks pnpm or Java, run every equivalent available validation step, document the exact blocker, and do not claim the unavailable full gate passed.

Commit and push all task-scoped work to `origin/main`.

Keep the required detailed execution record at:
`operations/tasks/20260926162600_expand-meat-finishes.md`

Finish with exactly one canonical runner trailer:
`CODEX_RUNNER_RESULT {"status":"PASS|CONTINUE|FAIL|BLOCKED","validation":"...","changed_files":["..."],"notes":"..."}`
## Execution notes

- Preflight: origin verified as `https://github.com/samidore/FamilyHub.git`; branch `main`; upstream `origin/main`; worktree clean.
- Starting local HEAD: `59238d94482d2cfe772b8eef2e5a705d760f6d05`.
- Fetched `origin/main` tip: `59238d94482d2cfe772b8eef2e5a705d760f6d05`; local HEAD already contained the fetched tip, so the checkout was preserved.
- Checkpoint 1: Recipe-local Finish data and red-braise consistency cleanup, with per-item validation.
## Result

- Status: CONTINUE
- Validation: `meal-data.mjs verify-item` passed for all nine changed active Recipes; `git diff --check` passed.
- Checkpoint 1 complete: the eight requested Finish families, the `hong-shao-rou` red-braise update, duplicate Cook View line removal, and content version `1.40` are recorded in Recipe data.
- Next checkpoint: document the shared-base red-braise rule, add focused data-level regressions, run the focused tests and `pnpm run verify`, then publish the final checkpoint.