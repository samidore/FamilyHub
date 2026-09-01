# Meal Builder freezer / thawing implementation

Execute this task against the latest `main`.

Before changing anything:

1. `git pull --ff-only`
2. Read `AGENTS.md` and `PROJECT.md`.
3. Follow `docs/modules/meal-builder/README.md` to read only the current Meal Builder docs needed for UI/runtime/data/Firebase work.
4. Inspect current code/tests before editing. Do not rely on older chat/handoff assumptions.

## Goal

Add a freezer workflow inside Meal Builder Inventory without adding another main Meal Builder step.

The Inventory area has three internal views:

- `库存`
- `冷冻`
- `化冻中 N`

The existing `1 库存 → 2 选菜 → 3 做饭 → 4 结算` flow remains unchanged.

## Required behavior

### 1. Ingredient identity stays canonical

Do **not** create parallel IDs such as `frozen-chicken-thighs` for an Ingredient that already exists as `chicken-thighs`.

Add one explicit optional canonical Ingredient fact for freezer behavior. Prefer a controlled field such as:

```yaml
freezer_behavior: direct # direct | thaw-required
```

Use the final field name consistently in schema/types/docs/validation. Runtime code must not infer freezer behavior from Ingredient ID, display name, starter section, or category.

Semantics:

- no freezer field: ordinary Ingredient; not shown in the freezer view.
- `direct`: stored/used directly from the freezer; no thaw transition.
- `thaw-required`: may have separate frozen reserve; frozen reserve is not available to Recipes until it enters ordinary inventory.

Initial static-data scope for this task:

- Deliberately annotate current Ingredients already explicitly tagged `frozen` as `direct`; do not make runtime infer from the tag after migration.
- Annotate `steamed-buns` as `direct` because this household keeps this type of ready-to-use staple in the freezer.
- Annotate the existing visible raw pork, chicken, beef, and lamb/goat Ingredients as `thaw-required`, except any Ingredient that is already an explicitly frozen/ready-to-cook product and therefore belongs in `direct`.
- Do not add new wonton/dumpling Ingredient or Recipe content in this task. The new model must support future presence-only freezer-direct items such as 馄饨/水饺 without another runtime redesign.
- Do not expand the freezer scope to unrelated categories merely because something could theoretically be frozen.

Preserve each Ingredient's current `inventory_tracking`; freezer behavior is a separate fact.

### 2. Direct-from-freezer stock reuses ordinary inventory state

For `freezer_behavior: direct`, keep using the existing canonical `inventory/{ingredientId}` value as the actual stock state.

This is deliberate:

- the item is rendered in the `冷冻` view instead of the ordinary `库存` category list;
- presence-only direct items use the existing on/off behavior;
- counted direct items use the existing half-unit quantity behavior;
- they are immediately available to the existing Recipe snapshot logic;
- Checkout continues consuming the same ordinary inventory value with no new source-selection UI.

Do not duplicate direct-freezer stock into a second runtime store.

### 3. Thaw-required frozen reserve is separate runtime state

Extend `HouseholdState` with a normalized frozen-reserve map for `thaw-required` Ingredients, for example:

```ts
freezerInventory: Inventory
```

Only known Ingredients whose canonical freezer behavior is `thaw-required` may survive normalization in this map. Preserve the Ingredient's normal inventory tracking rules; initial annotated thaw-required proteins are counted.

For a thaw-required Ingredient:

- ordinary `inventory` = already thawed / fridge-ready stock and behaves exactly as today;
- `freezerInventory` = frozen reserve, shown only in `冷冻`;
- the same Ingredient may simultaneously have quantities in both locations;
- frozen reserve is **not** included in `availableIngredientIds`, Recipe feasibility, reservation, freshness priority, or Checkout until it is moved into ordinary inventory.

### 4. Thawing entries

Add normalized shared household state for individual thawing jobs, for example:

```ts
thawingItems: Record<string, {
  ingredientId: string;
  quantity: number;
  startedAt: number;
  readyAt: number;
}>
```

Use a runtime entry ID so the same Ingredient can have multiple thaw jobs started at different times.

Rules:

- `quantity` must follow the counted half-unit invariant and be positive.
- only known `thaw-required` Ingredients are valid.
- `readyAt = startedAt + 36 hours`.
- define the 36-hour duration once as a named constant; do not scatter the number.
- malformed/unknown persisted entries are reconciled away safely.

### 5. Start thawing

In `冷冻`, each `thaw-required` Ingredient shows its frozen quantity and a prominent `化冻` action.

A normal tap starts one inventory unit when at least one unit exists; if only `0.5` remains, start that `0.5` rather than blocking. Do not show a confirmation modal.

Starting a thaw must be one household transaction:

1. decrement that amount from `freezerInventory`;
2. create a new thawing entry with `startedAt` and `readyAt`.

Never partially apply this operation.

### 6. Manual completion — exact button label

Every thawing card has a primary button whose visible text is exactly:

**`进入库存`**

No longer wording such as `已化冻，入库存`.

Pressing `进入库存` immediately and atomically:

1. removes that thawing entry;
2. adds its quantity to ordinary `inventory`;
3. if the Ingredient is FIFO, adds that quantity to the FIFO batch date for the **manual completion time**.

No confirmation modal.

This user action overrides the timer: if the cook can see that the food is thawed, it is ready.

### 7. Automatic completion at 36 hours

A thawing item logically enters ordinary inventory at `readyAt`.

There is no requirement to add a server/cloud scheduler. Implement reliable client reconciliation using the existing repository transaction model:

- while Meal Builder is open, schedule/check the nearest `readyAt` and promote due entries;
- on initial load, reconnect, and relevant shared-state updates, reconcile any entries already past due;
- promotion must use a transaction and be safe under two connected devices racing to promote the same entry;
- process due entries without double-adding inventory.

If the page was closed when 36 hours elapsed, the next active Meal Builder client should promote the item immediately.

For FIFO, an automatic promotion discovered late must use the calendar date of the item's **`readyAt`** as the batch date, not the later observation/open time. This preserves the fact that the food became fridge-ready 36 hours after thawing began.

### 8. Cancel thawing

Every thawing card also has `取消化冻`.

Pressing it atomically:

1. removes the thawing entry;
2. returns its quantity to `freezerInventory`.

No confirmation modal.

### 9. Current-meal snapshot semantics remain unchanged

A manual or automatic thaw completion changes live ordinary inventory only.

It must **not** rewrite an already-created current meal's frozen availability snapshot. Newly thawed stock participates when the existing workflow next creates/resnapshots a meal, exactly like any other later inventory edit.

Preserve all current queue reservation / Checkout behavior.

## Inventory UI

### Top-level internal tabs

Inside the existing Inventory step, add a compact mobile-first segmented/tab control:

```text
[ 库存 ]   [ 冷冻 ]   [ 化冻中 2 ]
```

- Default tab is `库存`.
- `化冻中` includes the current number of thaw jobs when nonzero.
- Switching these tabs does not change `activeStep`.
- Do not add a fifth Meal Builder main step.

### 库存 tab

Keep the current categorized inventory UI and bottom category-jump behavior for ordinary Ingredients.

Do not render `freezer_behavior: direct` Ingredients in this ordinary list; they live in `冷冻` visually even though their backing state is existing `inventory`.

`thaw-required` Ingredients continue to appear here for their already-thawed/fridge-ready ordinary inventory quantity.

Add a compact, tappable thaw status strip near the top when at least one item is thawing, showing enough information to notice it without opening the third tab. Example intent:

```text
冷冻 12 项 · 化冻中 2
鸡腿 18h · 猪里脊 31h
```

Do not hard-code Ingredient names or counts; derive from state/data. Exact copy/layout may adapt to current design system.

### 冷冻 tab

Render only Ingredients explicitly configured for freezer behavior, grouped using the existing Starter section metadata/order rather than a parallel hard-coded category registry.

- `direct`: existing inventory toggle or +/- control according to `inventory_tracking`.
- `thaw-required`: +/- controls edit `freezerInventory`; a `化冻` action starts a thaw job.
- Use the existing Ingredient name/display metadata.
- Keep it usable on iPhone-sized screens; no horizontal-scroll dependency.

### 化冻中 tab

Sort cards by `readyAt` ascending.

Each card should visibly show:

- Ingredient name;
- quantity;
- elapsed thaw time in a compact form;
- remaining time;
- concrete expected automatic-entry time/date (e.g. `明天 09:30 自动进入库存`, with an unambiguous fallback date when not tomorrow);
- primary `进入库存` button;
- secondary `取消化冻` button.

Update displayed time while the page stays open at a reasonable cadence (minute-level is sufficient; do not create high-frequency timers).

When no items are thawing, show a compact empty state rather than an empty category shell.

## Persistence / Firebase / reset

- Extend local and Firebase household persistence using the existing normalization + transaction architecture.
- Update Firebase Realtime Database rules to allow and validate only the new freezer/thawing state shape needed here; preserve current authentication/privacy boundaries.
- Add emulator rule tests for allowed valid state and rejected malformed state.
- Do not store duplicate Ingredient static facts, labels, birthdays, names, or other private metadata in runtime freezer/thaw entries.
- Existing Chat-assisted inventory import continues to target ordinary `inventory`; do not redesign the importer in this task.
- Existing `清空库存` behavior should remain scoped to ordinary inventory unless current code/docs make a different scope necessary. Do not silently erase frozen reserve or thawing jobs through that existing action.

## Data/model/docs

Update the canonical Meal Builder docs and schema/loader/validator as required:

- `docs/modules/meal-builder/behavior.md`
- `docs/modules/meal-builder/data-model.md`
- `docs/modules/meal-builder/firebase.md` only as needed for persisted state/rules
- active Ingredient schema/types/loader/validator
- content manifest version/date if static Ingredient data changes, using the current repo's next valid version rather than assuming an old version

Do not create a second permanent design document or knowledge base.

## Tests / acceptance criteria

Add focused tests that prove at minimum:

1. freezer behavior is explicit canonical Ingredient data and invalid values fail validation;
2. direct freezer items remain immediately Recipe-available through existing ordinary inventory and are visually excluded from the normal inventory list;
3. thaw-required frozen reserve is not Recipe-available;
4. starting thaw atomically reduces frozen reserve and creates one 36-hour entry;
5. default thaw amount is 1 unit, falling back to 0.5 when only 0.5 exists;
6. manual `进入库存` removes the thaw job, adds ordinary inventory, and uses the manual completion date for FIFO;
7. auto promotion does not occur before `readyAt`, does occur at/after it, is idempotent under repeated reconciliation, and uses `readyAt` date for FIFO even when observed later;
8. `取消化冻` returns stock to frozen reserve without touching ordinary inventory;
9. an already-created current meal snapshot does not gain newly thawed stock;
10. local persisted state and Firebase state normalize/reconcile the new fields safely;
11. Firebase rules allow valid new state and reject malformed new state;
12. browser/UI coverage verifies the three Inventory tabs, thaw card, and exact visible primary button text `进入库存`;
13. existing Inventory, FIFO, queue reservation, Recipe selection, Cook, and Checkout tests remain passing.

Run the full project gate:

```bash
pnpm run verify
```

Fix task-caused failures. If a verification stage is genuinely blocked by the environment, report the exact blocker and run every remaining applicable focused check; do not claim blocked checks passed.

## Completion

- Keep changes limited to this feature; no unrelated refactors.
- Commit and push the implementation to `main` after validation.
- In the implementation's final commit, delete `MEAL_BUILDER_FREEZER_TO_CODEX.md` so this temporary execution handoff does not become a parallel long-term source of truth. Canonical behavior must remain in the existing Meal Builder docs/code/data/tests.
- Report changed files, commit SHA, and PASS/BLOCKED verification results.
