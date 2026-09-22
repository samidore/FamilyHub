# Meal Builder lost Recipe restoration

## Goal

Repair the Recipe-consolidation regressions where previously active dishes can no longer be selected as the same practical dish.

Do not roll back the consolidation. Restore only the lost dish identities, keep the current Finish / Option / Serving model, and then re-audit all pre-consolidation active Recipes against the current model with a stricter reachability standard.

Use Luna max and complete implementation + validation locally.

## Read first

Follow repo root `AGENTS.md` and `PROJECT.md`, then read only task-relevant Meal Builder docs/code/tests/data, especially:

- `.agents/skills/manage-meal-data/SKILL.md`
- `docs/modules/meal-builder/README.md`
- `docs/modules/meal-builder/data-model.md`
- `docs/modules/meal-builder/behavior.md`
- `src/data/meal-builder/optional-groups.yaml`
- affected active/archive Recipe YAML and category indexes
- Meal Builder parser/engine/household code only if needed
- applicable unit/browser tests

The pre-consolidation baseline is commit:

`a3efbd92481612f4a7bffa1ffad2f6013352a753`

At that commit there were 200 active Recipes. The consolidation commit was:

`3aea6ea1b6397db930b666cff761d3716db3810f`

Do not create a permanent parallel migration/report knowledge file. The handoff `## Result` may contain the audit summary; canonical truth remains active/archive data and normal docs.

## Correct reachability standard

The old consolidation's coverage check was too weak.

An old Recipe counts as preserved only when there is a current reachable composition:

`active Recipe + one_of + Finish + zero/more Options + optional Serving`

such that:

1. every defining inventory Ingredient of the old dish can still be selected;
2. the current path does not force an extra defining Ingredient that the old dish did not require;
3. the primary cooking structure remains materially equivalent;
4. Finish is only flavor/final treatment and must not stand in for an inventory-bearing defining Ingredient;
5. Serving may only account for rice/noodles;
6. a renamed/surviving Recipe ID does not count as preserved if its former dish identity is no longer selectable.

A mechanical mapping to a vaguely related consolidated Recipe is not sufficient.

## Required restoration

Implement the following approved remedies.

### 1. Pure pork-slice core: 京酱 / 姜烧

The current `mushroom-pork-slices-stir-fry` is a mixed pork+vegetable Recipe and therefore cannot represent the former pure-meat dishes without forcing mushroom/yellow-chives.

Restore a pure pork-slice Recipe using the historical `beijing-sauce-pork-strips` ID as the active card.

Requirements:
- main protein: `whole-pork-tenderloin` (and only add another existing pork-slice alternative if current canonical data clearly supports the identical route);
- no hard vegetable requirement;
- default Finish: 京酱;
- non-default Finish: 姜烧, preserving practical behavior of archived `japanese-ginger-pork-shogayaki`;
- natural user-facing name, with the default dish still clearly 京酱肉丝;
- do not keep duplicate 京酱/姜烧 Finishes on the mixed `mushroom-pork-slices-stir-fry` if that would misleadingly imply those pure-meat dishes remain represented there.

Do not create a new global quick-stir optional group.

### 2. Restore 香干肉丝

Reactivate `pressed-tofu-pork-strips` as its own Recipe.

Defining composition:
- pork tenderloin / pork strips
- `pressed-tofu`

Preserve the historical quick-stir structure. Do not reinterpret `pressed-tofu` as ordinary tofu in `homestyle-tofu-family`.

### 3. Restore 韭黄香干肉丝

Reactivate `yellow-chives-pressed-tofu-pork-strips` as its own Recipe.

Defining composition:
- pork
- `pressed-tofu`
- `yellow-chives`

Do not invent a new optional-group primitive just to absorb this dish.

### 4. Restore 锅塌里脊

Reactivate `guo-ta-pork-tenderloin`.

This is a distinct cooking structure:
- pork tenderloin
- egg coating
- pan setting/searing
- short covered braise/塌汁 finish

It must remain a separate Recipe, not a Finish on ordinary pork stir-fry.

### 5. Restore 酱丁

Reactivate `jiang-ding-ground-pork-pressed-tofu`.

Defining composition:
- `ground-pork`
- `pressed-tofu`

The current `ground-pork-chinese-greens-stir-fry + jiang-ding Finish` does not preserve the old dish because it forces a vegetable and cannot select pressed tofu as the defining second component.

Remove or rename that misleading Finish on the mixed ground-pork Recipe if leaving it would imply the old 酱丁 is covered there.

### 6. Restore Thịt Kho 猪肉卤蛋

Reactivate `vietnamese-thit-kho-eggs`.

Defining composition:
- pork chunks
- eggs

Keep the current pork-braise `thit-kho` Finish if useful as a no-egg flavor variant, but do not treat it as coverage for the archived egg-bearing dish.

### 7. Restore 番茄土豆排骨汤 composition

Do not reactivate a separate card.

Add `potato` to the canonical `soup-addons` group with contribution/checkout semantics consistent with the existing global Option model.

Then verify:
- `winter-melon-pork-rib-soup` / current 排骨汤
- `change-it-up` tomato selected
- `soup-addons` potato selected

can reproduce 番茄土豆排骨汤 without extra forced defining ingredients.

### 8. Restore 韭菜炒鸡片

Do not reactivate a separate card.

Add `garlic-chives` to the vegetable `one_of` in the current flexible chicken+vegetable stir-fry (`chicken-broccoli-stir-fry`).

Do not confuse `garlic-chives` 韭菜 with `yellow-chives` 韭黄.

### 9. Restore 番茄鸡蛋面

Do not reactivate a separate card unless implementation proves the current composition model cannot express it cleanly.

Preferred repair:
- current `tomato-scrambled-eggs` / 时蔬炒蛋 must allow noodles as Serving;
- selecting tomato + noodles must yield the practical 番茄鸡蛋面 route;
- Cook guidance must explicitly assemble the separately cooked noodles with the tomato-egg topping/sauce, so it is not merely "炒蛋旁边配面".

If this cannot be expressed without corrupting the generic vegetable-egg Recipe, keep/re-activate the old `tomato-egg-noodles` as a separate Recipe instead. Do not force an incorrect abstraction merely to keep card count low.

### 10. Restore squid identities correctly

The surviving ID `squid-chinese-greens-stir-fry` used to mean 青菜炒鱿鱼 but was rewritten into a pure-squid Recipe. Restore its historical dish identity:

- squid
- `chinese-greens`
- mixed quick-stir structure

Reactivate `ginger-scallion-squid` as the pure-squid card for 姜葱鱿鱼.

Reactivate `squid-bell-pepper-onion-stir-fry` as its own Recipe:
- squid
- `bell-pepper`
- `onion`

Do not introduce a global stir-fry add-on group to collapse these.

## Preserve current correct consolidations

Do not undo current valid consolidation paths, including but not limited to:

- beef pure stir-fry Finishes such as oyster/cumin/scallion;
- beef mixed vegetable `one_of`;
- gyudon / sukiyaki / niku-udon family where current Serving/Finish behavior is valid;
- chicken thigh/drumstick braise Finishes;
- chicken wing Finishes;
- tomato egg-drop soup via `change-it-up`;
- steamed fish black-bean Finish;
- lamb/goat family consolidations that still preserve the old dish;
- generic vegetable stir-fries and vegetable scrambled-egg `one_of`;
- current four broad Option groups;
- `add-some-richness` membership, including intentional whole-pork-tenderloin and pork-chops members.

Do not re-expand the menu toward 200 cards. Restore only identities that fail the strict standard.

## Full 200-Recipe reachability audit

After implementing the fixes, audit every active Recipe from baseline commit `a3efbd92481612f4a7bffa1ffad2f6013352a753`.

For each old Recipe, classify it internally as one of:

- unchanged/surviving;
- preserved by current Recipe + one_of;
- preserved by Finish;
- preserved by Option(s);
- preserved by Serving;
- preserved by a combination of the above;
- restored as a separate active Recipe;
- NOT REACHABLE.

The audit must inspect the old YAML and the actual current composition. Do not infer coverage from similar names alone.

Acceptance:
- zero `NOT REACHABLE` old Recipes unless there is a material product reason that requires user decision;
- if any remain, report them explicitly and mark the task BLOCKED rather than silently accepting them.

A temporary script/checklist/fixture is allowed during implementation. Do not leave a permanent migration manifest unless an automated regression test is the smallest useful long-term guard.

## Regression tests

Add focused tests that would have caught this regression.

At minimum, assert representative reachability for:

- 京酱肉丝: pure pork + 京酱, no forced mushroom/yellow-chives;
- 姜烧猪肉: pure pork + 姜烧;
- 香干肉丝: pork + pressed-tofu;
- 韭黄香干肉丝: pork + pressed-tofu + yellow-chives;
- 锅塌里脊: pork + eggs as its own cooking structure;
- 酱丁: ground-pork + pressed-tofu without forced vegetable;
- Thịt Kho 猪肉卤蛋: pork + eggs;
- 番茄土豆排骨汤: tomato + potato both reachable through current options;
- 韭菜炒鸡片: `garlic-chives` is a current chicken mixed-stir `one_of`;
- 番茄鸡蛋面: tomato + noodles route is reachable and Cook semantics are correct;
- 青菜炒鱿鱼: surviving historical ID once again requires/represents chinese-greens;
- 姜葱鱿鱼: pure squid route exists;
- 甜椒洋葱炒鱿鱼: both defining vegetables are represented.

Prefer a data-level reachability regression covering the full old-200 baseline in addition to focused cases if it can be implemented without embedding a permanent duplicated recipe knowledge base. A compact invariant generated from archive/current canonical data is preferable to a giant hard-coded mapping.

## Data quality

While restoring archived YAML, rebuild from the actual historical dish logic plus current schema/conventions. Do not resurrect stale bugs or retired fields.

Ensure:
- all hard ingredients appear in steps;
- contribution, child coverage, checkout units, cook ingredients and steps agree;
- no stale unrelated template text;
- no retired easy-braise / iron-pan-braise fields or wording;
- titles remain natural household dish names.

## Archive/index behavior

For any reactivated archived Recipe:
- move it back to the correct active category directory;
- set active status consistent with current data conventions;
- add it to the category index in a sensible position;
- do not duplicate the same stable ID in archive and active data.

For old Recipes intentionally still represented by a consolidated path, leave them archived.

## Scope exclusions

Do not:
- redesign Meal Builder UI;
- change Finish/Option/Serving semantics;
- add a new global stir-fry optional group;
- add compatibility matrices or a cooking DSL;
- alter inventory-import behavior;
- modify unrelated recipes;
- touch `database-debug.log`.

## Validation

Run focused parser/data/reachability tests while working.

Before completion run:

- `pnpm run validate`
- `pnpm run check`
- `pnpm run build`
- `pnpm run audit`
- `pnpm run test:unit`
- relevant browser tests, then `pnpm run test:browser`
- `pnpm run verify`

If `pnpm run verify` again reaches Firebase Rules and fails only because this local environment cannot spawn Java, report that exact environmental blocker. Do not treat it as a product/data failure.

## Result

Append a concise `## Result` containing:

- `Status: PASS / FAIL / BLOCKED`;
- active Recipe count before/after this restoration;
- exact Recipes reactivated;
- exact consolidated paths changed;
- full 200/200 reachability audit result, including count reachable and any remaining NOT REACHABLE items;
- focused/full validation results;
- Java/Firebase emulator blocker if still applicable;
- any material deviation from this task.
