# Meal Builder freezer UI/runtime correction

This is a narrow correction to the freezer implementation already on `main` in commit `234336907ede3ec87275b8ba935222027da8068c`.

Before editing:

1. `git pull --ff-only`
2. Read `AGENTS.md` and `PROJECT.md`.
3. Read the current canonical Meal Builder docs only as needed (`docs/modules/meal-builder/README.md` points to them).
4. Inspect the current implementation and tests. Do not reimplement or redesign the freezer feature.

## User-reported problems to fix

1. `presence-only` direct freezer items cannot actually be added.
2. The freezer tab lost the existing Inventory section grouping.
3. The freezer tab lost the existing fixed two-row bottom category jump bar behavior.
4. Quantity controls in freezer should be the same UI/semantics as ordinary Inventory, not a parallel-looking implementation.
5. Manual `进入库存` should move **1 inventory unit per tap** (or `0.5` if less than 1 remains), not blindly transfer an arbitrarily larger thawing quantity.

## 1. Fix direct freezer persistence bug

Current bug: `renderFreezer()` reads `household.freezerInventory[item.id]` for every freezer item, and `[data-freezer-toggle]` writes to `freezerInventory` for presence-only items. But canonical semantics say `freezer_behavior: direct` reuses ordinary `inventory`, while normalization of `freezerInventory` only keeps `thaw-required`. Therefore a direct presence-only item is immediately normalized away and appears impossible to add.

Required fix:

- For `freezerBehavior === 'direct'`, read/write **ordinary `household.inventory`** exactly like the ordinary Inventory tab.
- Never write a `direct` item into `freezerInventory`.
- Presence-only direct item:
  - absent → tap adds `inventory[id] = true`;
  - present → tap removes it;
  - use the same visible control, label/state, classes, disabled semantics, and handler semantics as ordinary Inventory presence-only.
- Counted direct item:
  - use ordinary `inventory[id]`;
  - use the same `− / value / +` UI and `COUNTED_INVENTORY_STEP` semantics as ordinary Inventory.
- `thaw-required` items continue to read/write `freezerInventory` in the freezer tab.

Prefer extracting/reusing the existing ordinary Inventory row/control builder or a small shared helper so the two views cannot drift. Do not create duplicate direct-freezer state.

## 2. Preserve Inventory grouping in 冷冻

Current freezer rendering is a flat list. Replace that with the **same section structure and ordering used by ordinary Inventory**.

Requirements:

- Use `payload.starterSections` / canonical Starter section metadata and ordering. Do not create a separate freezer category registry.
- Render the same section labels and collapsible group shell used by ordinary Inventory (`meal-inventory-group` or the current canonical equivalent).
- Inside each section, filter to visible Ingredients with `freezerBehavior` set.
- Hide sections that contain no freezer items.
- Preserve existing collapse behavior; collapsing never mutates stock.
- Do not lose the Ingredient bilingual display/name behavior.
- Do not hard-code pork/chicken/beef/etc. labels in freezer code.

The expected mental model is: switching `库存` → `冷冻` changes which rows are shown, **not** the basic Inventory information architecture.

## 3. Preserve the bottom two-row category jump bar

The existing Inventory bottom jump bar is part of the Inventory UX and must also work on `冷冻`.

Requirements:

- On `库存`, keep current behavior unchanged.
- On `冷冻`, render/use the same bottom fixed two-row jump control and same compact section labels.
- Targets must be the currently rendered freezer sections, derived from Starter section identity/order rather than a parallel list.
- Tapping a freezer category jump must open that freezer section if collapsed and scroll it into view exactly like ordinary Inventory.
- No horizontal-scroll dependency; preserve the existing two-row mobile layout.
- When switching between `库存` and `冷冻`, refresh the jump targets to match the active tab.
- Do not let jump buttons point at hidden/empty groups from the other tab.
- `化冻中` does not need fake category jumps; hide/disable the category jump bar there unless the existing component has a cleaner empty-state behavior.

Prefer sharing the existing jump rendering/handler rather than adding a second implementation.

## 4. Freezer counted controls must be literally the same Inventory UI

For counted items in `冷冻`, the add/decrement UI should not merely resemble Inventory; reuse the same markup/classes/order/interaction conventions.

Required presentation/behavior:

```text
食材名       [−]  2  [+]
```

using the current canonical Inventory layout, spacing, button sizing, disabled behavior, and half-unit step.

Storage target depends only on freezer behavior:

- `direct` → ordinary `inventory`;
- `thaw-required` → `freezerInventory`.

For presence-only `direct`, reuse the ordinary presence-only Inventory control so there is a clear way to add/set it present.

Do not introduce a separate UX language like a special `有/无` freezer-only control if ordinary Inventory uses a different canonical interaction.

## 5. `化冻` remains one-unit transfer

Keep existing intended behavior:

- tapping `化冻` starts 1 unit when frozen reserve >= 1;
- if only 0.5 remains, starts 0.5;
- atomic freezer reserve decrement + thaw job creation;
- no confirmation.

No redesign needed here unless required by the shared-control refactor.

## 6. Manual `进入库存` is +1 per tap

User correction: `进入库存` is an incremental transfer action.

For a thawing entry with remaining `quantity`:

- each tap transfers `min(1, quantity)` into ordinary inventory;
- therefore quantity 2 → ordinary inventory +1, thawing entry remains quantity 1;
- quantity 1 → ordinary inventory +1 and entry is removed;
- quantity 0.5 → ordinary inventory +0.5 and entry is removed.

This must be atomic.

FIFO semantics:

- the transferred portion gets the manual completion calendar date;
- if a later tap transfers another portion on a later date, that later portion gets that later date;
- existing inventory batch invariants must remain valid.

Automatic 36h completion is different: when `readyAt` is reached, promote the **entire remaining quantity** of that thaw job, using the `readyAt` calendar date as already designed.

`取消化冻` returns the **entire remaining quantity** to frozen reserve.

If the current `completeThaw` helper assumes all-or-nothing manual completion, minimally extend/refactor it so manual incremental completion and automatic full promotion remain explicit and tested. Do not duplicate complex FIFO logic in the page.

## 7. UI consistency around `进入库存`

Keep visible primary button text exactly:

`进入库存`

No confirmation modal.

Do not rename it to `加入库存`, `已化冻`, or other wording.

If a thaw card displays quantity >1, the UI must make it understandable that each tap moves 1; the remaining quantity must update immediately after persistence. Avoid extra explanatory clutter if the live quantity change is sufficient.

## 8. Tests

Add/adjust focused tests proving at minimum:

1. `freezer_behavior: direct` presence-only item toggles ordinary `inventory` and survives normalization/repository round-trip.
2. A direct freezer item never gets persisted into `freezerInventory`.
3. A direct counted freezer item uses ordinary inventory quantity semantics.
4. A thaw-required counted freezer item edits `freezerInventory` only.
5. Freezer UI renders canonical Starter section grouping, not a flat item list.
6. Freezer tab exposes the same category jump mechanism and only targets visible freezer groups; Inventory tab remains unchanged; Thawing does not expose stale freezer/inventory jump targets.
7. Freezer counted controls use the same canonical classes/structure expected by existing Inventory browser tests.
8. Presence-only direct freezer item can be added in browser UI.
9. Manual `进入库存` on quantity 2 adds exactly 1 and leaves quantity 1 thawing.
10. A second manual tap removes the remaining quantity 1 and totals +2 ordinary inventory.
11. Quantity 0.5 manually transfers 0.5 and removes the job.
12. Manual partial FIFO transfer uses manual completion date for only the transferred part.
13. Automatic due promotion still transfers the entire remaining job and uses `readyAt` date.
14. Existing freezer, inventory, FIFO, meal snapshot, queue, checkout, and browser tests still pass.

Run the full project gate:

```bash
pnpm run verify
```

Fix task-caused failures. Report environmental blockers exactly; do not claim blocked stages passed.

## Completion

- Keep this correction task-scoped; no unrelated refactor.
- Update canonical Meal Builder docs if the current docs say manual `进入库存` transfers the entire thawing entry; they must state the corrected incremental manual behavior.
- Commit and push to `main` only after validation.
- Delete `MEAL_BUILDER_FREEZER_UI_FIX_TO_CODEX.md` in the final implementation commit so the canonical source remains code/docs/tests.
- Report commit SHA and verification PASS/BLOCKED results.