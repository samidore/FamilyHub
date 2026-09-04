# Meal Builder — inventory storage block layout fix

## Goal

Fix the current mobile Inventory card DOM/layout so refrigerated, frozen, and thaw-job controls render as explicit vertical blocks instead of interleaved loose controls. This is a layout/structure correction on top of the already-approved inventory behavior; do not redesign the data model.

Before editing:
1. `git pull --ff-only`.
2. Read `AGENTS.md` and `PROJECT.md`.
3. Inspect current `src/pages/meal-builder.astro` and the focused inventory browser tests.
4. Preserve the inventory behavior implemented by the prior compact-controls task (`bbdcba3` / current main), including FIFO refrigerated batches, aggregate-only frozen stock, explicit thaw quantities, +1 intake, 0.5 correction steps, independent thaw jobs, and the fixed two-row bottom category jump bar.

## Problem confirmed from current deployed UI

The current DOM still appends storage controls as loose siblings, so blocks interleave on 375px mobile layouts. In particular:

- a thaw-required Ingredient with `freezerInventory = 0` can show an unlabeled frozen `+1` because the frozen stock row is omitted while the add button is rendered separately;
- refrigerated `+1`, frozen `+1`, frozen +/- and thaw controls can appear on the same wrapping line or in the wrong visual order;
- thaw-job controls can visually mix into storage controls;
- screenshots show `冷藏 0` and unrelated `+1` buttons on the same line, and zero frozen stock with a visible frozen `+1` but no `冷冻` label.

This must be fixed at the DOM/component structure level, not with margin tweaks only.

## Required structure

Each Ingredient card must render, in this order:

1. Ingredient name block;
2. refrigerated block (when the Ingredient has ordinary refrigerated storage semantics);
3. frozen block (whenever the Ingredient supports frozen storage, even when frozen quantity is zero);
4. independent thaw-job block(s), one per job.

Each block owns all of its controls. Do not append block-specific actions as loose siblings outside the block.

### Refrigerated block

For counted FIFO Ingredients:

- heading: compact `冷藏 <total>` when stock exists; when zero, `冷藏` is sufficient;
- each dated batch remains its own row with compact metadata and `[−] quantity [+]` correction controls at 0.5 plus compact `[丢]`;
- the normal intake `[+1]` belongs inside the refrigerated block;
- zero stock visible under `显示全部食材` still shows the refrigerated block and its `[+1]`, but no zero-valued batch.

For counted non-FIFO ordinary stock:

- block contains compact aggregate `冷藏 <quantity>` with `[−] quantity [+]` and `[+1]`;
- when quantity is zero, show the block with `冷藏` and `[+1]`; do not create fake dated metadata.

For presence-only ordinary stock:

- keep boolean semantics inside a compact refrigerated block such as `冷藏 · 有 [移除]` or equivalent existing concise copy.

### Frozen block

Whenever `freezerBehavior` is present, render a real frozen block even when frozen quantity is zero.

For counted frozen stock:

- heading: `冷冻 <quantity>` including `冷冻 0` when zero; this is intentionally visible so the `+1` action has a clear owner;
- correction controls `[−] quantity [+]` remain 0.5-step when applicable;
- normal frozen intake `[+1]` is inside the frozen block;
- `−` is disabled when quantity is zero;
- direct-frozen still uses ordinary `inventory`; thaw-required still uses `freezerInventory`;
- do not reintroduce frozen batches/dates.

For thaw-required frozen stock:

- `化冻0.5` / `化冻1` belong inside the frozen block below/alongside the frozen quantity controls as fits mobile width;
- disable/hide each thaw action when insufficient frozen quantity, preserving the existing requested-quantity semantics;
- direct frozen never shows thaw actions.

For presence-only direct-frozen Ingredients, keep existing boolean semantics but ensure the `冷冻` label and control live together in the frozen block.

### Thaw jobs

Each active thaw job renders below the storage blocks, independently:

`化冻 1 · 16h` with `[冷藏] [取消]` (or equivalent current concise copy).

- no job may share the same flex/grid row container with refrigerated or frozen block controls;
- multiple jobs simply make the card taller;
- no merge of jobs and no behavior change.

## Mobile layout requirements

At 375px:

- card is content-height and grows vertically;
- no horizontal overflow, clipping, or overlapping controls;
- storage blocks are visually distinct and ordered correctly;
- `+1` never appears without its `冷藏` or `冷冻` block context;
- do not use a single wrapping flex container for all storage/job actions;
- preserve >=47px touch-target acceptance;
- concise copy is preferred;
- do not alter the bottom category jump bar.

## Behavior to preserve exactly

- refrigerated normal intake `+1` uses click-time local today and same-day clicks merge into the same FIFO batch;
- existing batch `−/+` are 0.5 correction steps and preserve batch date;
- frozen aggregate `−/+` are 0.5 correction steps;
- frozen `+1` adds one full unit;
- explicit `化冻0.5` / `化冻1` quantities remain unchanged;
- thaw jobs remain independent;
- checkout FIFO, reservations, current-meal snapshots, JSON import, reset semantics, Firebase shape/rules, Ingredient/Recipe data, and unrelated modules remain unchanged.

## Tests

Update/add focused browser regressions rather than weakening shared checks.

At minimum cover at 375px:

1. thaw-required Ingredient with zero frozen quantity still renders a visible `冷冻 0` block containing its frozen `+1`;
2. refrigerated `+1` is inside the refrigerated block and frozen `+1` is inside the frozen block;
3. no unlabeled standalone `+1` exists for a freezer-capable Ingredient;
4. frozen quantity >0 renders `[−] quantity [+]`, `+1`, and appropriate thaw controls within the frozen block;
5. zero frozen quantity disables the frozen decrement and unavailable thaw controls;
6. active thaw job renders below storage blocks with its own `冷藏`/`取消` actions;
7. FIFO refrigerated batch rows remain readable and independent;
8. no card or control overflows the 375px viewport;
9. existing shared touch-target test still passes;
10. bottom category jump bar remains unchanged/two-row/non-scrolling.

## Validation

Run focused inventory browser tests first, then full available `pnpm run verify`.

Fix task-caused failures. If Java is unavailable locally, report only the rules suite as the environmental blocker and run every other check. Commit and push the implementation to current `main`.

Append `## Result` with Status, validation, implementation SHA, and any genuine blocker/deviation. Do not claim final PASS if GitHub CI/deploy is failing or pending.