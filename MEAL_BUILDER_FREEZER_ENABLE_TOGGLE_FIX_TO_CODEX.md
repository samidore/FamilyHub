# Meal Builder freezer counted enable-toggle correction

This is a narrow follow-up correction to the current `main` after commit `dbbd247cb2055a21421bc67c96db5f928839516a`.

Before editing:

1. `git pull --ff-only`
2. Read `AGENTS.md` and `PROJECT.md`.
3. Inspect current `src/pages/meal-builder.astro` and the relevant Meal Builder browser/unit tests.
4. Do not redesign the freezer feature or touch unrelated behavior.

## Confirmed regression

The pre-freezer ordinary Inventory counted row had this interaction structure:

```text
[开启 / 在库存] [−] quantity [+]
```

The current shared `renderInventoryRow()` only renders the toggle for `presence-only`. For `counted` it now renders only:

```text
[−] quantity [+]
```

Therefore the freezer counted rows have no `开启` button. Because the renderer is shared, ordinary Inventory counted rows may also have lost the same toggle.

This is an implementation regression, not a new design decision.

## Required fix

### 1. Restore counted toggle in the shared row renderer

For every counted row rendered by `renderInventoryRow()`, restore the same compact toggle + decrement/value/increment layout used by Inventory before the freezer refactor:

```text
[开启 / active-state] [−] value [+]
```

Reuse the existing `meal-inventory-toggle` class and existing Inventory interaction conventions. Do not create a freezer-only visual style.

Off-state visible text must be exactly:

`开启`

For ordinary Inventory, preserve the pre-regression active-state wording/behavior unless current canonical tests/docs intentionally changed it.

For freezer counted rows, use a concise active-state label appropriate to the existing control without removing the `开启` off state. Prefer consistency with ordinary Inventory over adding a new control pattern.

### 2. Storage target is determined by source/behavior

The counted toggle must mutate the same storage source as that row's `− / +` controls:

- ordinary Inventory row -> ordinary `inventory`
- freezer `direct` row -> ordinary `inventory`
- freezer `thaw-required` row -> `freezerInventory`

Never write a `direct` item into `freezerInventory`.

### 3. Counted toggle semantics

For counted values:

- current quantity `0` / absent -> tapping `开启` sets quantity to `1`
- current quantity `> 0` -> tapping the active toggle removes/turns off that stock entry
- `− / +` remain `COUNTED_INVENTORY_STEP` (`0.5`) increments exactly as today
- no confirmation modal

This is the same behavior ordinary Inventory had before the regression.

### 4. Presence-only behavior stays intact

Do not break the already-fixed direct freezer presence-only behavior:

- direct presence-only reads/writes ordinary `inventory`
- it survives normalization/repository round-trip
- its current presence toggle behavior remains unchanged unless sharing a helper requires a purely structural refactor

This task is specifically about restoring the missing counted `开启` control.

### 5. Freezer behavior stays intact

Do not regress:

- section grouping
- bottom two-row category jump bar
- `化冻` transfer behavior
- manual `进入库存` transfers max 1 per tap
- automatic 36h promotion
- FIFO behavior
- current-meal snapshot semantics

## Tests

Add/adjust focused coverage proving at minimum:

1. ordinary Inventory counted row exposes an off-state `开启` toggle;
2. freezer `thaw-required` counted row exposes an off-state `开启` toggle;
3. tapping freezer counted `开启` creates `freezerInventory[id] = 1` and does not touch ordinary `inventory`;
4. tapping its active toggle removes that freezer quantity;
5. `− / value / +` remain present alongside the toggle and keep 0.5-step behavior;
6. freezer `direct` counted toggle, if any configured direct-counted item exists in fixtures/current data, uses ordinary `inventory` rather than `freezerInventory`;
7. direct presence-only freezer behavior remains working;
8. grouping/jump/thaw/manual-entry tests from the prior freezer correction remain passing.

Run the full gate:

```bash
pnpm run verify
```

Fix task-caused failures. Report exact environmental blockers rather than claiming blocked checks passed.

## Completion

- Keep the change task-scoped.
- Commit and push the implementation to `main` only after validation.
- Delete `MEAL_BUILDER_FREEZER_ENABLE_TOGGLE_FIX_TO_CODEX.md` in the final implementation commit so it does not become a permanent parallel source of truth.
- Report final commit SHA and PASS/BLOCKED verification results.
