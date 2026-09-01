# Meal Builder: single-line inventory, UI copy cleanup, 点心 Extra, zongzi freezer

## Goal

Implement the agreed Meal Builder correction on current `main` and verify it fully.

This is one task. Do not redesign unrelated Meal Builder behavior.

## Required outcome

### 1. Inventory / freezer rows never wrap controls to a second line

Current `.meal-inventory-item` permits wrapping. Fix Inventory and Freezer rows so the item name and all row controls remain on one horizontal row at mobile width.

Required behavior:

- no control group wrapping below the ingredient name;
- counted ordinary/direct row remains `开启/在库存 + − + quantity + +`;
- thaw-required freezer row remains `开启/在库存 + − + quantity + + + 化冻`;
- presence-only rows keep their current semantics;
- controls must not shrink into unusable text or clip outside the viewport;
- prefer compact horizontal controls rather than a second line;
- the Chinese ingredient name must stay on one line and may reduce font size when its available width is small/its name is long;
- English secondary name may remain secondary below the Chinese name if needed, but the action controls themselves must stay on the same row as the name block;
- do not truncate the Chinese ingredient identity with ellipsis if a generic responsive font-size solution can keep it readable;
- do not add Ingredient-ID-specific CSS or JS.

Add a Playwright/browser acceptance test at **375px viewport width** proving representative ordinary counted, direct freezer, and thaw-required freezer rows do not horizontally overflow the viewport and the controls are not pushed below the name/control row. Include at least one of the longer current ingredient names.

Preserve the existing bottom two-row category jump bar.

### 2. Clean user-visible Meal Builder copy

Audit Meal Builder user-visible text in `src/pages/meal-builder.astro` and Meal Builder enhancement components. Remove implementation/design-document language and disclaimer filler. Keep text that directly tells the household what an action means or what state affects their decision.

Remove or replace at minimum:

- `KB v...` — remove.
- decorative `实时补齐组餐缺口` summary pill — remove.
- visible English implementation eyebrows such as `Shared Household`, `Inventory`, `Cook View`, `Checkout`, `Chat Import`, `Confirm` when the adjacent Chinese heading already conveys the meaning — remove rather than duplicate.
- Inventory explanation containing `presence-only`, FIFO/model internals — remove.
- `本顿可用食材是库存快照，之后调整库存不会改写本顿。` — remove.
- the alternate current-meal explanation `请先从当前库存开始本顿；本顿开始后，两台设备会共享选菜和状态。` — remove rather than replace with another design explanation.
- Cook View copy `这里只显示本次选中的菜。内容按 KB 当前完成度呈现，不补造精确用量。` — remove.
- `discoverableNote` disclaimer about reliable structure / calibrating precise amounts — remove from visible UI. Do not delete actual recipe data.
- Checkout copy `这是本设备的结算草稿；确认时会用同一个事务检查本顿仍处于 cooking。` — remove.
- page footer disclaimer beginning `Meal Builder 是组餐参考，不是营养计算器...` — remove the whole visible footer block for this module.
- visible backend wording such as `Firebase`, raw `UID`, `cooking`, transaction language — do not expose these in normal product UI. Map shared-connection/status copy to concise household language. Errors may remain actionable but should not expose backend implementation names/IDs unnecessarily.
- bulk import copy `粘贴按仓库协议生成的 JSON。解析只生成草稿；确认前可以删掉冷冻项、调整数量和入库日期。` -> concise product copy: `粘贴 ChatGPT 生成的入库 JSON。确认前可调整数量和日期。`
- confirmation copy must not say `presence-only`; use normal Chinese or omit the implementation detail.
- queued reservation warning copy `冻结 X 份主料` -> `预留 X 份主料` so it cannot be confused with the real freezer feature.

Use these exact user-approved strings where applicable:

- queue-only checkout description: `仅结算 Queued；当前选择不变`
- the available-ingredient explanatory sentence is not needed; the visible section heading `可用食材` is sufficient. Remove the longer sentence rather than replacing it with another paragraph.

Also ensure user-visible current meal state does not show raw internal enum values such as `selecting` / `cooking`. Map them to concise Chinese product states such as `选菜中` / `做饭中` / `待结算` as appropriate to the actual state model.

Do not remove useful decision information such as freshness age badges, queue count, reserved quantity, actual checkout effects, or actionable auth/error states.

Add/adjust focused tests or source assertions so the removed implementation strings cannot casually regress into visible UI.

### 3. Add a new visible Ingredient section: 点心 / Extra

Add a canonical data-driven visible Starter section after 主食:

- section id: `extra`
- Chinese label: `点心`
- English label may be `Extra`
- stable order after current `staple` and before hidden pantry
- include it in the existing indexed Ingredient data structure; do not maintain a parallel UI-only section list.

Add these five active visible Ingredients to this section:

1. 水饺 — suggested stable id `dumplings`
2. 馄饨 — suggested stable id `wontons`
3. 鲜肉月饼 — suggested stable id `fresh-meat-mooncake`
4. 甜包子 — suggested stable id `sweet-buns`
5. 咸包子 — suggested stable id `savory-buns`

Before finalizing IDs, run the repository meal-data inspect helper and reuse an existing stable ID if the same identity already exists. Do not create semantic duplicates.

For all five:

- `inventory_tracking: presence-only`
- `freezer_behavior: direct`
- visible in Starter section `extra`
- stored in ordinary `inventory`, displayed under the Freezer tab through the existing `direct` behavior
- no thaw job / 36-hour requirement
- checkout uses the existing presence-only `用完` semantics

These are **meal extras / 点心**, not Staple fillers.

### 4. Add a canonical Recipe concept for meal extras

The household requirement is: these five items are **Extra / 点心 and are always allowed to be added** to the current meal when stocked.

Implement this data-driven; never special-case the five IDs in ranking/UI logic.

Use one explicit canonical Recipe capability/tag, preferably `meal-extra` unless the existing schema/conventions clearly require another equivalent controlled value. Document it in the Meal Builder data model/behavior as an explicit Recipe fact.

Add one simple active Recipe for each new Ingredient, under an indexed Recipe category appropriate for Extra/点心. A new `extra` recipe category/directory is preferred over falsely classifying them as staple if current loader/validator cleanly supports adding the category.

Each Extra Recipe must:

- hard-require exactly its corresponding Ingredient;
- have base `meal_contribution: { protein: 0, vegetable: 0, staple: 0 }` so it never satisfies or changes Protein / Vegetable / Staple planning targets;
- not claim Child Protein or Child Vegetable coverage merely because it contains meat/vegetable filling;
- be a genuinely usable heat/serve Recipe record under current data quality rules; do not invent unsafe exact cooking times for unknown commercial products. Use product/package directions where product-specific timing is necessary, while still providing practical generic heat-through steps and doneness/safety cues as appropriate;
- use the canonical `meal-extra` capability/tag.

Ranking/candidate behavior for a feasible `meal-extra` Recipe:

- it is visible whenever its hard-required Ingredient is in the current meal's available Ingredient snapshot;
- it remains addable regardless of whether Protein / Vegetable / Staple / Child targets are unmet, met, or would otherwise cause normal candidate suppression;
- zero contribution means selecting it never changes completion totals;
- it should not crowd out the main meal recommendations: rank normal meal candidates first under existing rules, then feasible Extra candidates in deterministic existing order (unless current architecture has a cleaner equivalent presentation that still keeps them visibly available);
- once selected, existing selected-Recipe persistence/Cook/Checkout behavior applies normally;
- current meal snapshot semantics remain unchanged: stocking an Extra after the meal snapshot does not silently add it to that already-started meal until the normal resnapshot/new-meal flow.

Add unit/browser coverage proving at minimum:

1. an available Extra remains in candidates when all meal targets are already satisfied;
2. an available Extra remains in candidates when targets are still unmet;
3. an unavailable Extra is not offered;
4. selecting an Extra does not change Protein/Vegetable/Staple/Child completion totals;
5. normal candidates retain their ranking behavior and appear before Extras;
6. checkout sees the selected Extra's presence-only Ingredient and existing `用完` semantics.

### 5. Move 粽子 storage to the freezer without changing its meal role

Current `zongzi` is a presence-only Staple and `steamed-zongzi` contributes Staple 1. Preserve that meal semantics.

Change only the Ingredient storage fact:

- `zongzi` remains in section `staple`;
- remains `presence-only`;
- add `freezer_behavior: direct`;
- it therefore disappears from ordinary Inventory visual rows and appears under Freezer using ordinary inventory state;
- no thaw step;
- `steamed-zongzi` remains a normal Staple Recipe with Staple contribution 1;
- do **not** mark zongzi/steamed-zongzi as `meal-extra`.

### 6. Bottom jump bar

With the new visible `extra` section there are 12 visible Starter sections. Preserve the current fixed jump bar and make sure all visible sections, including `点心`, fit cleanly in two rows with no horizontal scrolling at mobile width. Do not add a second hard-coded category registry if the rendered Starter sections can drive it. If the existing short-label mapping needs an entry for `extra`, add only the compact display label needed by the existing navigation convention.

## Documentation and data integrity

Follow `.agents/skills/manage-meal-data/SKILL.md`.

Read only the relevant current module docs before editing and update canonical docs where the new `meal-extra` behavior/section needs to be recorded. Do not create a parallel permanent design note.

Use the meal-data helper:

- inspect proposed/new identities;
- update indexes/metadata as required by the current data model;
- `verify-item` each added/updated active Ingredient and Recipe as applicable.

Do not revive retired `easy-braise-addon`, `iron-pan-braise`, or old optional-supporting systems.

## Acceptance criteria

All must PASS:

1. Inventory/freezer controls are a single horizontal row at 375px; no action group wraps to a second line and no horizontal viewport overflow occurs.
2. Counted/direct/thaw-required behavior remains correct, including `开启`, 0.5 controls, `化冻`, manual `进入库存`, 36h auto-thaw, and ordinary-vs-freezer storage targets.
3. The listed implementation/disclaimer copy is removed/replaced; exact approved queue copy is present; raw backend/status jargon is not visible in normal Meal Builder UI.
4. New visible `点心` section exists and the bottom jump bar still fits all 12 visible sections in two rows without horizontal scrolling.
5. 水饺、馄饨、鲜肉月饼、甜包子、咸包子 exist as direct-freezer presence-only Ingredients with no duplicate IDs.
6. Each has a real active Extra Recipe; feasible Extras are always addable regardless of meal completion state, do not alter completion totals, and rank after normal candidates.
7. 粽子 is direct-freezer but remains a normal Staple and still contributes Staple 1 through its existing Recipe.
8. Existing queue, freshness, composition, checkout, inventory import, freezer/thaw, FIFO, and snapshot tests remain passing.
9. Run the full project gate: `pnpm run verify`.
10. Commit and push the implementation to `main` only after validation.

## Result

Status: BLOCKED

Validation:
- `pnpm run validate` passed, including Meal Builder schema and privacy validation.
- `pnpm run check` passed with 0 errors and 0 warnings; 2 pre-existing deprecation hints remain.
- `pnpm run build` passed.
- `pnpm exec playwright test` passed all 36 browser tests.
- `node --test tests/*.test.mjs` passed all 180 unit tests.
- `pnpm run verify` is blocked at `test:rules`: Java is unavailable (`Could not spawn java -version`).

Final commit SHA: a97da74

Deviation/blocker: Firebase Realtime Database rules tests could not run because Java is not installed or available on PATH; no task-caused test failure remains.
