# Meal Builder thaw workspace relocation

## Goal

Move the user action for starting a thaw out of the Freezer inventory list and into the Thawing tab/workspace, while preserving the existing freezer/thaw data model and transaction semantics.

Before editing:
1. `git pull --ff-only`
2. Read current `AGENTS.md` and `PROJECT.md`.
3. Read `docs/modules/meal-builder/README.md` and only the current Meal Builder behavior/data-model docs relevant to freezer/thaw UI.
4. Inspect current `src/pages/meal-builder.astro`, freezer/thaw helpers, and focused tests.

## Confirmed design

Top tabs remain conceptually:

`[ 库存 ] [ 冷冻 ] [ 化冻 N ]`

The responsibilities are now:

- **冷冻** = manage what is in the freezer and its quantity/presence.
- **化冻** = choose what stocked thaw-required item to start thawing, and manage already-running thaw jobs.

Do not add a fifth main Meal Builder step.

## Required UI changes

### 1. Freezer tab

Freezer remains grouped by existing Starter section metadata and keeps the current bottom category jump behavior.

It must continue to show all ingredients with explicit `freezer_behavior`:

- `direct` items use ordinary `inventory` and current direct presence/count controls.
- `thaw-required` items use `freezerInventory` and current counted controls.

**Remove the `化冻` button from thaw-required rows in the Freezer tab.**

Freezer rows are inventory management only.

Do not change:
- direct vs thaw-required storage targets;
- presence-only/count controls;
- counted 0.5 increments;
- existing single-line mobile layout.

### 2. Thawing tab becomes a complete thaw workspace

Render two sections in this order:

#### A. 正在化冻

Show the current thaw jobs using the existing behavior/data:
- ingredient name;
- remaining job quantity;
- elapsed/remaining time and exact `readyAt` auto-entry time using the current minute-level display convention;
- `进入库存`;
- `取消化冻`.

Preserve current semantics:
- manual `进入库存` transfers max 1 unit per tap, or 0.5 if that is all that remains;
- `取消化冻` returns the job's remaining quantity to `freezerInventory`;
- 36h auto promotion remains unchanged;
- FIFO completion-date semantics remain unchanged;
- current-meal snapshot semantics remain unchanged.

If no jobs are running, show a compact empty state for this subsection only; do not replace the whole thaw workspace because the user may still have items available to start thawing.

#### B. 可以化冻

List **only** ingredients satisfying all of these conditions:
- canonical `freezer_behavior: thaw-required`;
- current `freezerInventory` quantity > 0.

Do not show zero-stock thaw-required ingredients.
Do not show `direct` items.
Do not infer eligibility from ID/name/category/tag.

For each available item show:
- ingredient name;
- current frozen quantity;
- one `化冻` button.

Starting thaw must reuse the existing transaction/helper semantics:
- each tap moves 1 unit from freezer into a new thaw job;
- if only 0.5 remains, move 0.5;
- no confirm dialog;
- atomic decrement of `freezerInventory` + creation of one separate thaw job;
- job timing remains the existing named 36h duration.

After starting, the available quantity should update immediately; if it becomes 0, that item disappears from `可以化冻`.

### 3. Thaw tab count

Keep the current tab count `N` representing the number of **active thaw jobs**, not the number of eligible freezer ingredients.

### 4. Mobile/interaction

This is mobile-first.

At 375px:
- no horizontal viewport overflow;
- action buttons remain usable;
- long ingredient names do not push controls off-screen;
- the two sections are visually obvious without extra design-document explanation.

Use concise product copy only. Do not expose internal terms such as `freezerInventory`, job IDs, transactions, or data-model explanations in the visible UI.

## Tests

Add/adjust focused browser/unit coverage proving at minimum:

1. A thaw-required ingredient with freezer quantity 0 is not listed under `可以化冻`.
2. A thaw-required ingredient with freezer quantity > 0 is listed with one `化冻` button.
3. A `direct` freezer ingredient is never listed under `可以化冻`.
4. Freezer-tab thaw-required rows no longer show `化冻`.
5. Starting thaw from `可以化冻` moves max 1 unit (or remaining 0.5) into a new thaw job and decrements `freezerInventory` atomically.
6. Once source freezer quantity reaches 0, the item disappears from `可以化冻`.
7. `正在化冻` still exposes `进入库存` and `取消化冻` and preserves existing behavior.
8. 36h auto-thaw, FIFO, current-meal snapshot, direct freezer, presence-only, counted toggle, and freezer grouping/jump tests remain passing.
9. 375px browser acceptance has no horizontal overflow.

Run focused checks, then full gate:

```bash
pnpm run verify
```

Fix task-caused failures. If a local environmental blocker exists, run all remaining checks and rely on GitHub Actions as the final verification source.

## Completion

- Keep the change task-scoped.
- Commit and push implementation to `main` only after validation.
- Delete this handoff file in the final implementation commit.
- Do not touch the separate mushroom task except to preserve any concurrent current-main changes after pulling latest.
