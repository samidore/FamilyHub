# Meal Builder — 入库 / 库存 lifecycle redesign

## Goal

Replace the current Step 1 internal `库存 / 冷冻 / 化冻` split with the agreed two-task model:

`入库 | 库存`

- `入库` is only for adding household stock and seeing what is already present.
- `库存` is the lifecycle view for existing stock: per-batch age/freshness, freezer → thawing → refrigerated transitions, and batch discard with a shared 5-minute undo window.

Implement this on current `main`. The previously completed all-mushroom `香煎菌菇` work is already in `main`; preserve it and do not redo it.

Before editing:
1. `git pull --ff-only`.
2. Read `AGENTS.md` and `PROJECT.md`.
3. Read the current Meal Builder `README.md`, `behavior.md`, `data-model.md`, `inventory-import.md`, and `firebase.md` only as needed.
4. Inspect current `src/lib/household.ts`, `src/lib/householdRepository.ts`, `src/pages/meal-builder.astro`, styles, Firebase rules, and focused Meal Builder unit/browser/rules tests.

## Canonical product structure

The main four Meal Builder steps remain unchanged:

`1 库存 → 2 选菜 → 3 做饭 → 4 结算`

Inside Step 1 there are exactly two tabs:

`入库 | 库存`

Remove the standalone `冷冻` and `化冻` tabs. Freezer and thawing are stock states/actions inside the two new tabs, not top-level views.

### Storage meaning

Preserve current canonical Ingredient semantics; never infer by ID/name/category:

- no `freezer_behavior`: ordinary `inventory` only;
- `freezer_behavior: direct`: physically shown as frozen but continues to use ordinary `inventory` and remains Recipe-available immediately;
- `freezer_behavior: thaw-required`: refrigerated/ready stock uses ordinary `inventory`; frozen stock uses `freezerInventory`; it becomes Recipe-available only after thaw completion.

Current-meal snapshot behavior remains unchanged: any stock add/discard/thaw/undo does not silently rewrite an already-started meal.

## 1. 入库 tab

This tab is additive stock entry, not lifecycle management.

### Stock summary

Every visible Ingredient row must show the useful current amounts before the user adds more:

- ordinary-only item: current `现有` amount/presence;
- `direct`: current `冷冻` amount/presence;
- `thaw-required`: current `冷藏` amount + current `冷冻` amount; if a thaw job exists, also show concise `化冻中` quantity so stock in transit is not hidden.

Do not expose storage implementation terms such as `inventory`, `freezerInventory`, job IDs, or transactions.

### Manual entry date

Provide one compact batch-date control for manual entry:

- default = today's local calendar date;
- user can change it to an earlier valid date;
- do not accept a future date;
- keep the selected date while the user adds multiple items.

The date is used only where batch metadata is meaningful. Do not invent dated metadata for presence-only stock.

### Add actions

Use current tracking/freezer facts, data-driven:

- counted ordinary-only: add `0.5` per tap to ordinary stock;
- counted `direct`: add `0.5` per tap to frozen/direct stock (underlying aggregate remains ordinary `inventory`);
- counted `thaw-required`: expose distinct concise actions to add `0.5` to `冷藏` or `冷冻`;
- presence-only ordinary: absent → `入库`; when already present show an already-stocked state rather than creating duplicate presence;
- presence-only `direct`: same behavior but label/store it as frozen/direct;
- do not create unsupported thaw-required presence-only special cases.

Manual additions must be one household transaction each and update aggregate + applicable batch metadata atomically.

### Existing Chat JSON import

Keep the reviewed Chat JSON inventory import in `入库` and preserve its current contract/confirmation semantics. Do not redesign the JSON schema as part of this task. Existing import remains ordinary-stock entry; its own row dates remain authoritative and are not overridden by the manual-entry date control.

Keep the existing Starter-section/index-driven grouping and bottom two-row category jump bar. No parallel category registry.

## 2. 库存 tab

This is the dynamic current-stock management view.

Only show Ingredients that currently have at least one relevant state:

- ordinary/refrigerated stock;
- direct frozen stock;
- thaw-required frozen stock;
- an active thaw job.

Do not make the user scan empty Ingredient rows.

Group by canonical Starter sections. Within an Ingredient card, show its actual states together rather than splitting the Ingredient across separate pages.

Representative shape:

```text
鸡腿    冷藏 1.5 · 冷冻 2 · 化冻中 1

冷藏
09/01   1      2 / 3天       [丢掉]
09/03   0.5    0 / 3天       [丢掉]

冷冻
08/20   1      冷冻14天      [化冻] [丢掉]
日期未知 1                    [化冻] [丢掉]

化冻中
1      剩余18小时             [进入冷藏] [取消]
```

The exact visual layout may be adapted to the existing mobile design, but the information hierarchy and behaviors above are required.

### Ordinary dated batches / x-y freshness

Preserve the current canonical freshness scope. Do **not** add or guess new `inventory_freshness` or `freshness_priority_days` values.

For existing FIFO Ingredients:

- display each existing `inventoryBatches` date/quantity separately;
- derive age from local calendar days, never store age;
- show compact `x / y天`, where `x` is current age and `y` is the Ingredient's canonical `freshness_priority_days`;
- keep the existing strict freshness-priority predicate (`age > freshness_priority_days`) unchanged; the `临期` emphasis/badge must agree with the same predicate used by candidate ranking;
- oldest batch first.

For ordinary stock that has no canonical FIFO/freshness metadata, do not invent dates or a `/ y` threshold just to fill the UI. It may remain an aggregate stock row.

### Frozen batches

Add canonical runtime batch metadata for **counted freezer stock** so the Inventory tab can manage actual frozen batches.

Use a field named `freezerBatches` unless current implementation conventions make an equivalent name materially safer.

Required logical shape:

```text
freezerBatches/{ingredientId}/{batchKey} = positive half-unit quantity
```

Where:

- new manual frozen additions use `YYYY-MM-DD` batch keys and same-date additions merge;
- a special unknown-date key is allowed for legacy frozen aggregate whose historical date is not known;
- do not fabricate a historical date for pre-existing frozen stock;
- display the unknown batch as `日期未知`;
- for dated frozen batches show how many calendar days they have been frozen (for example `冷冻14天`), but do not invent a frozen-expiry threshold or `临期` rule.

Batch coverage:

- counted `thaw-required`: `freezerBatches` reconciles to `freezerInventory`;
- counted `direct`: `freezerBatches` reconciles to that Ingredient's ordinary `inventory` aggregate, because direct freezer items intentionally reuse ordinary inventory;
- presence-only freezer items remain boolean/presence and do not need fake batch metadata.

Existing household states that have aggregate frozen stock but no `freezerBatches` must load without losing quantity. Normalize/migrate the unmatched legacy quantity into the unknown-date batch, not today's date.

## 3. Inline thaw lifecycle

There is no standalone thaw tab.

For each frozen counted batch of a `thaw-required` Ingredient, show `化冻` directly on that batch row.

Starting thaw:

- acts on the specific source frozen batch;
- one tap moves max `1` unit, or the remaining `0.5` if that is all the batch has;
- atomically decrements the source aggregate + source freezer batch and creates one separate thaw job;
- preserve current 36-hour duration;
- each thaw job must retain enough source-batch identity to return to the same frozen batch on cancel;
- if the source batch reaches zero, remove that batch row;
- `direct` freezer items never expose `化冻`.

Thaw job display stays under the same Ingredient card.

Rename the manual completion action to the product-facing `进入冷藏`.

Completion:

- manual completion retains the existing max-1-per-tap behavior (or remaining `0.5`);
- automatic due completion moves the full remaining job quantity;
- ordinary/refrigerated aggregate updates atomically;
- if the Ingredient is FIFO, create/merge the resulting ordinary `inventoryBatches` batch using the manual completion local date, or `readyAt` local date for automatic completion, preserving current semantics;
- the refrigerated freshness clock therefore starts from the date it actually enters refrigerated inventory, not the original frozen date.

Cancel:

- removes the thaw job;
- returns its remaining quantity to the exact source frozen batch (including unknown-date legacy source), not a newly dated batch.

Do not change current meal snapshots when these transitions occur.

## 4. Batch / stock discard + 5-minute shared undo

Every dated ordinary FIFO batch and every counted frozen batch row must have a concise `丢掉` action. It is also acceptable/encouraged to offer the same whole-stock discard for a non-batched presence/aggregate stock row when that is the only truthful stock representation, but do not invent a fake batch date.

### Discard transaction

Discard means the whole displayed batch/stock row, not an arbitrary partial decrement.

On click:

- immediately remove that batch/stock from effective live inventory;
- remove/update its aggregate quantity atomically;
- it must immediately stop participating in stocked availability, FIFO, freshness display/ranking, and future snapshots;
- do **not** rewrite the current meal snapshot;
- do not require a confirmation modal.

At the same time create a shared runtime undo record. Use a canonical field such as `discardedStock` with independent records, not client-only/session state.

Each undo record must contain enough data to restore exactly:

- Ingredient identity;
- storage state (`inventory`/refrigerated vs frozen/direct);
- quantity or presence;
- original batch key/date when applicable, including unknown-date frozen legacy batch;
- `discardedAt`;
- `undoUntil = discardedAt + 5 minutes`.

Multiple discarded batches must have independent undo records/windows.

### Undo UI / behavior

For every active undo record, show a compact shared undo notice, e.g.:

`已丢掉 鸡腿 1份 · [撤销] · 4:59`

Requirements:

- visible countdown derived from timestamps;
- refresh does not lose the undo opportunity;
- another connected household device can see and execute the same undo while the window is active;
- undo within 5 minutes atomically restores original quantity/presence, original storage state, and original batch date/key, merging with an already-existing same-date batch if necessary;
- undo then deletes that undo record;
- after 5 minutes, undo is unavailable and must not restore stock even if a stale raw record still exists;
- expired records should be cleaned up safely/lazily so they do not accumulate indefinitely; cleanup must be idempotent.

Define a named constant for the 5-minute duration; do not scatter `300000` through UI/domain code.

## 5. Data model / repository / Firebase

Update the canonical household types, normalization/reconciliation helpers, local repository, Firebase repository/rules, docs, and migrations needed for the new runtime fields and atomic behaviors.

Important invariants:

- aggregate quantities remain the source used by Recipe availability/Checkout;
- FIFO `inventoryBatches` still reconcile correctly and Checkout still consumes oldest ordinary FIFO stock;
- `freezerBatches` must reconcile with the appropriate aggregate source without quantity loss;
- legacy state without new fields remains valid;
- unknown historical dates stay unknown;
- every stock lifecycle write is transaction-safe under Firebase and local repository implementations;
- Firebase rules must validate new state shapes and reject impossible/invalid quantities/timestamps/keys;
- no Ingredient-ID-specific behavior;
- current `freezer_behavior`, tracking, freshness, queue reservation, snapshot, checkout, and import semantics remain data-driven.

If the existing `清空库存` action remains, do not silently broaden its destructive scope. Preserve current reset behavior unless an accurate visible label needs adjustment after the UI redesign.

Update `docs/modules/meal-builder/behavior.md` and `data-model.md` to make the two-tab lifecycle and new runtime fields canonical. Update `inventory-import.md`/`firebase.md` only where the actual contract/rules changed. Do not create a parallel design note.

## Acceptance criteria

All required criteria must PASS:

1. Step 1 contains exactly `入库` and `库存`; standalone `冷冻` / `化冻` tabs are gone.
2. `入库` shows current relevant stock by storage state and supports correct data-driven manual adds, with one editable non-future batch date defaulting to today.
3. Existing Chat JSON import remains in `入库` with current contract and confirmation behavior.
4. `库存` shows only Ingredients with live stock/transit and combines ordinary, frozen, and thawing states under the same Ingredient.
5. FIFO ordinary batches render separately with quantity and `x / y天`; visual `临期` agrees exactly with the existing strict freshness-priority predicate; no new shelf-life facts are guessed.
6. Counted freezer stock has persisted batch metadata; new dated additions merge by date; legacy aggregate stock becomes `日期未知` without quantity loss or fabricated history.
7. Thaw starts from a specific thaw-required frozen batch, moves max 1/remaining 0.5, direct items never thaw, cancel returns to the same source batch, and manual/automatic completion enters refrigerated stock with the correct new date semantics.
8. Discarding one batch immediately removes only that batch/stock and updates its aggregate atomically.
9. Every discard has an independent shared 5-minute undo record; undo survives refresh/device changes, restores exact storage/date/quantity within the window, and cannot restore after expiry.
10. Existing Recipe availability, current-meal snapshot, queue reservation, Checkout, ordinary FIFO, presence-only, direct freezer, inventory import, and 36h auto-thaw semantics remain correct.
11. Firebase rules/local normalization accept the new canonical state, reject malformed new fields, and old persisted states still normalize without data loss.
12. Mobile browser coverage at 375px shows no horizontal viewport overflow; batch action controls remain usable and ingredient identity is readable.
13. Update focused unit/browser/rules tests for the new lifecycle, including legacy migration, batch-specific thaw/cancel/complete, discard/undo before and after expiry, multiple undo records, and cross-repository/shared persistence behavior.
14. Run the full project gate: `pnpm run verify`.
15. Push the final implementation to `main` only after task-caused failures are fixed.

## Validation / completion

Run focused tests while working, then:

```bash
pnpm run verify
```

If the local environment still lacks Java, run every other applicable validation and record that exact blocker in `## Result`; GitHub Actions should be used as the final full-gate source where available.

## Result

Status: FAIL
Validation: `pnpm run check` passed; all 182 unit tests passed; `pnpm run verify` completed through build, audit, and unit tests but stopped at Firebase rules because Java is unavailable. The browser suite was run separately and exposed stale pre-redesign expectations for the removed freezer/thawing tabs and old intake selectors.
Blocker: Java is unavailable locally, and the existing browser tests need to be updated for the required two-tab lifecycle contract before the full acceptance gate can pass.

Append `## Result` with only status, validation outcome, and any blocker/deviation as required by the task protocol. Keep commits task-scoped. Do not refactor unrelated Notebook or other FamilyHub modules.
