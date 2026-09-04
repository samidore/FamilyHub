# Meal Builder — compact Inventory card controls

## Goal

Implement the user-approved compact mobile Inventory card behavior on current `main`, without changing the unified Inventory data model.

Before editing:
1. `git pull --ff-only`.
2. Read `AGENTS.md` and `PROJECT.md`.
3. Inspect current `src/pages/meal-builder.astro`, `src/lib/household.ts`, and relevant inventory unit/browser tests.
4. Preserve unrelated work, especially unified Inventory, aggregate-only frozen stock, independent thaw jobs, storage-aware JSON import, Chicken/Duck merge, and the fixed two-row bottom category jump bar.

## Required behavior

### 1. Inventory cards grow vertically; no horizontal squeeze

The current 375px layout is broken because Ingredient name, batch metadata, +/- controls, discard, thaw jobs, and add buttons are being compressed into the same horizontal flex layout.

Each Ingredient card must be content-height and structurally vertical:

- Ingredient name block first;
- refrigerated block;
- frozen block when supported;
- thaw-job block(s) when present;
- no fixed equal card height;
- no internal horizontal scroll;
- no action may overflow the card at 375px;
- keep existing >=47px touch-target acceptance.

Do not force every control for an Ingredient onto one row. Use compact rows inside each storage block.

### 2. Refrigerated FIFO stock

For counted FIFO refrigerated stock:

- show a compact heading such as `冷藏 2` (total quantity; no verbose `共` copy required);
- each dated batch remains independent;
- compact batch metadata, e.g. `9/4 · 0/3` and append `· 临期` only under the existing strict stale rule (`age > threshold`);
- each existing batch has `[−] quantity [+]`, where `−/+` each change exactly 0.5 on that exact batch;
- preserve whole-batch discard/undo; compact UI label may be `丢`;
- `+` on an existing batch keeps that batch date;
- `−` to zero removes that batch.

Do not display quantity twice in the metadata line and control row.

### 3. Normal manual intake is `+1`, using click-time local today

The 0.5 buttons are correction controls, not the normal grocery intake action.

Add one compact standalone `+1` action for each applicable counted storage block:

- refrigerated `+1`: add exactly 1 unit;
- for FIFO refrigerated stock, use the local calendar date **at click time**;
- repeated `+1` clicks on the same local date merge into the same dated `inventoryBatches` entry;
- a click on a later local date naturally creates a second batch;
- do not cache the intake date at page load;
- remove the page-level manual `批次日期` control if it is no longer used by any manual Inventory action. Do not affect the separate Chat JSON import review date behavior.

Examples:
- two `+1` clicks on 2026-09-04 -> `2026-09-04: 2`;
- one later `+1` on 2026-09-05 -> batches `{2026-09-04: 2, 2026-09-05: 1}`.

For counted non-FIFO ready stock, keep aggregate `− quantity +` corrections at 0.5 and add compact `+1` normal intake with no fake date metadata.

When a zero-stock FIFO Ingredient is visible because `显示全部食材` is ON, the normal entry action is simply `+1`; after adding, its dated batch appears. Do not invent a zero-valued FIFO batch.

### 4. Frozen stock

Frozen remains aggregate-only; do not reintroduce freezer batches or dates.

For counted frozen stock:

- show compact heading `冷冻 <quantity>`;
- keep aggregate `− quantity +`, each correction step 0.5;
- add a compact `+1` normal-intake action that increases the correct frozen aggregate by exactly 1;
- direct-frozen stock still targets ordinary `inventory` and remains immediately Recipe-available;
- thaw-required frozen stock still targets `freezerInventory` and remains unavailable until thaw completion;
- direct frozen does not show thaw controls.

Do not add frozen-date metadata.

### 5. Explicit thaw quantities

For counted `thaw-required` frozen stock, replace the single implicit `化冻` action with two compact actions:

- `化冻0.5`
- `化冻1`

Domain behavior:

- each click creates one independent thaw job;
- requested amount is exactly 0.5 or 1;
- never deduct more frozen stock than available;
- disable/hide `化冻1` when fewer than 1 unit is available; disable/hide `化冻0.5` when fewer than 0.5 is available;
- do not silently turn a requested `1` into `0.5`;
- preserve 36h timing and all current cancellation/completion behavior;
- `startThaw` or a focused replacement helper should accept the requested quantity explicitly and validate step alignment/availability;
- no `sourceBatchKey` or freezer batch logic.

### 6. Thaw jobs stay independent and compact

Each thaw job should render independently and may use two visual rows on mobile. Compact copy is preferred:

`化冻 1 · 24h` with `[冷藏] [取消]`.

Requirements:

- do not merge jobs;
- `冷藏` means the existing manual completion action for that job;
- `取消` restores only that job's remaining quantity;
- multiple jobs simply make the Ingredient card taller;
- no job action may overflow the card at 375px.

### 7. Presence-only stock

Preserve boolean semantics. Do not invent numeric +/- or +1 for presence-only Ingredients. Keep the control compact and truthful.

## Implementation constraints

- Keep `COUNTED_INVENTORY_STEP = 0.5`; it remains the correction granularity.
- `+1` is an intentional manual-intake action, not a change to the domain step constant.
- For FIFO refrigerated `+1`, reuse canonical `addStock`/batch logic so same-date merges are atomic and aggregate inventory stays consistent.
- Use local calendar-day semantics already used by Meal Builder. Manual `+1` must resolve today when clicked, including if the page stayed open across midnight.
- Existing queued reservation protections must still apply to negative aggregate corrections where already required.
- Do not change checkout FIFO, current-meal snapshot behavior, discard undo window, reset semantics, import schema, Firebase shape, Ingredient/Recipe data, or unrelated modules.
- Do not modify the bottom category jump bar except if a selector must be preserved for the changed card DOM.
- Use concise household-facing copy; avoid verbose labels such as `新增冷藏批次`, `进入冷藏`, or `丢掉` where `+1`, `冷藏`, and `丢` communicate the same action.

## Tests

Update/add focused tests without weakening shared responsive checks.

Unit/domain coverage:
1. requested thaw 0.5 creates a 0.5 job and subtracts exactly 0.5;
2. requested thaw 1 creates a 1 job and subtracts exactly 1;
3. requested 1 with only 0.5 available is rejected/no-op rather than silently thawing 0.5;
4. two thaw starts create independent jobs;
5. refrigerated `+1` on same date merges into one batch; different date creates a second batch;
6. existing exact batch +/- remains 0.5 and preserves batch date.

Browser coverage at 375px:
1. a FIFO Ingredient with multiple batches renders without horizontal overflow/overlap;
2. batch metadata and `[−] quantity [+]` are readable and independent;
3. normal `+1` adds one unit and uses today's dated FIFO batch;
4. repeated same-day `+1` increments the same displayed batch;
5. frozen aggregate exposes correction +/- plus `+1`;
6. thaw-required frozen stock exposes `化冻0.5` and `化冻1`, with `1` unavailable when stock <1;
7. multiple thaw jobs render independently with `冷藏`/`取消` inside the card;
8. no page-level manual batch-date control remains if it has no remaining purpose;
9. shared responsive/touch-target tests still pass;
10. bottom category jump bar remains two-row/non-scrolling at 375px.

## Validation

Run focused inventory/unit/browser tests while editing, then full `pnpm run verify`.

Fix all task-caused failures. If local Java is unavailable, report rules as the exact environmental blocker but run every other available check. Commit and push the implementation to current `main`.

Append `## Result` with Status, validation, implementation commit SHA, and any genuine blocker/deviation. Do not claim final PASS while GitHub CI/deploy is failing or pending.

## Result

Status: PASS

Validation: `pnpm run validate`, `pnpm run check` (0 errors), `pnpm run build`, `pnpm run audit`, `pnpm run test:unit` (193 passed), and `pnpm run test:browser` (41 passed). `pnpm run verify` reached the Firebase rules suite but could not run it because the environment could not spawn `java -version`; no Java runtime was available on PATH. No GitHub CI/deploy status was available or changed.

Implementation commit SHA: `bbdcba3` (rebased task commit).

The pre-existing untracked `database-debug.log` was left untouched.
