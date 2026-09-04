# Meal Builder — unified inventory CI/browser correction

## Goal

Finish the already-approved unified Inventory Goal on current `main` by fixing the task-caused browser regressions from GitHub Actions run `33831732119` and two real UI/control defects found during review. Do **not** redesign the product and do **not** restore the old `入库 | 库存` tabs.

This is a correction to `.handoff/codex/meal-builder-unified-inventory-controls.md` and implementation commit `a5467e08a643dc5305843ee42c8650e74025fb80` / result commit `c3be0dfe0f3e6fdd688a9be9a00069de61528353`.

Before editing:
1. `git pull --ff-only`.
2. Read `AGENTS.md` and `PROJECT.md`.
3. Read `.handoff/codex/meal-builder-unified-inventory-controls.md` and this correction task.
4. Inspect only the current Meal Builder files/tests needed for the fixes below, especially `src/lib/household.ts`, `src/pages/meal-builder.astro`, `tests/family-hub.spec.ts`, `tests/meal-builder-inventory-layout.spec.ts`, and `tests/meal-freezer.test.mjs`.

## CI facts — do not guess

GitHub Actions run `33831732119` (run 510), build job `100896006236`, failed only in Playwright after the following already passed:

- validate PASS
- Astro check PASS
- build PASS
- audit PASS
- unit tests **190/190 PASS**
- Firebase rules tests **26/26 PASS**
- Playwright **24 passed / 14 failed**
- deploy skipped because Playwright failed

The 14 failures are primarily stale `tests/family-hub.spec.ts` assumptions from the removed two-tab inventory UI and old inventory helper selectors.

## Confirmed real implementation defects to fix

### 1. Non-FIFO ordinary refrigerated `− / +` is currently a no-op

Current `src/pages/meal-builder.astro` routes `[data-stock-delta]` for `storage === 'inventory'` only through `adjustInventoryBatch(...)` when a `[data-batch-key]` ancestor exists; otherwise it returns `state` unchanged.

That means the reviewed aggregate `− quantity +` controls for counted non-FIFO ready/refrigerated stock render but do nothing.

Required:
- add a focused domain helper in `src/lib/household.ts`, e.g. `adjustReadyAggregate`, for counted **non-FIFO ordinary ready stock**;
- reject presence-only, FIFO-batch paths, and inappropriate direct-frozen use;
- adjust ordinary `inventory` by one aligned delta;
- on negative deltas, preserve the existing queued-reservation invariant exactly as `adjustInventoryBatch` / `adjustFrozenAggregate` do: never intentionally reduce Recipe-available counted stock below queued reservation;
- wire inventory `[data-stock-delta]` with no batch key to this helper;
- add a unit test and browser regression proving `−/+` actually changes a non-FIFO counted ordinary Ingredient.

Do not solve this by hiding the controls.

### 2. FIFO refrigerated cards currently get duplicate `+ 冷藏 0.5` actions

Current `stockBatches()` appends its own new-batch `+ 冷藏 0.5`, and `renderLifecycle()` then appends another generic `+ 冷藏 0.5` for every counted Ingredient.

Required:
- exactly **one** compact action for creating a new refrigerated FIFO batch using the page-level selected batch date;
- existing batch rows retain their own `− quantity +` controls and exact date;
- do not remove the new-batch action entirely;
- add/update a browser assertion so this duplication cannot return.

### 3. Stock delta controls should reflect write permission

Current `render()` write-enabled selector disables add/toggle/thaw/discard/undo controls but omits `[data-stock-delta]`.

Required:
- include `[data-stock-delta]` in the canonical inventory write-control disabling path so non-writable Firebase state does not present enabled-looking `−/+` buttons;
- click guard remains as defense-in-depth.

## Stale browser tests to update

Update `tests/family-hub.spec.ts` to the **approved current UI**, not the removed two-tab UI.

### Helper behavior

Current stale helper:

```ts
async function setInventory(page, ids) {
  for (const id of ids) {
    const action = (await inventoryItem(page, id)).locator('[data-stock-add], [data-stock-toggle]').first();
    await action.click();
    if (await action.getAttribute('data-stock-add')) await action.click();
  }
}
```

This times out because unified Inventory defaults to hiding zero-stock Ingredients.

Required:
- before adding zero-stock Ingredients, ensure `#meal-show-all` is checked;
- continue using canonical current controls (`data-stock-add` for counted initial stocking, `data-stock-toggle` for presence-only);
- preserve the helper's intended historical quantity behavior: counted setup that used to click twice should still create 1 unit where downstream tests expect 1; presence-only only needs one click;
- do not make tests depend on hidden DOM that the product intentionally no longer renders.

### Default visibility assertions

The current product intentionally defaults to **only live stock / thaw jobs**.

Update the stale test that expects all `visibleIngredientCount` immediately:
- fresh empty local state should render zero inventory items/sections by default;
- after checking `#meal-show-all`, all visible Starter Ingredients/sections should appear;
- hidden pantry IDs remain absent.

### Presence-only copy/state

Current unified UI uses:
- absent: `入库`
- present: `移除`
- row copy indicates `冷藏 · 有` or physical `冷冻 · 有` as applicable.

Update stale expectations that still require the old button text `有`.

### Remove old tab interactions

Rewrite the old test `inventory lifecycle exposes frozen thaw actions and direct frozen stock once`:
- assert `[data-inventory-tab]` count is 0;
- check `#meal-show-all`;
- add thaw-required frozen stock through `[data-stock-add][data-stock-storage="freezer"]`;
- verify exactly one aggregate frozen row and a `化冻` action, with no dated frozen batch/age UI;
- add direct frozen stock (for example `frozen-chicken-patties`) through its canonical freezer add control;
- verify it renders once as physical `冷冻` and has **no** thaw action.

Do not recreate tab selectors just to satisfy tests.

### Zero-stock output assertions

In the unified UI, when a counted stock reaches zero, the item may still be visible only because `#meal-show-all` is ON, but there is no stock row/output representing fake quantity `0`.

Update stale post-checkout assertions such as `data-inventory-value="tomato" == 0` and cross-page `chicken-breast == 0` to assert the canonical zero-stock state (no aggregate/batch stock output / no live row when show-all is off), rather than inventing a displayed zero value.

### Returning-to-inventory / cross-page tests

Preserve the behavioral intent of all affected tests:
- current-meal ingredient exclusion does not mutate shared stock;
- newly stocked ingredients become available on resnapshot;
- checkout consumes counted inventory and leaves presence-only defaults unless marked used-up;
- reset confirmation behavior remains unchanged;
- two pages still observe inventory/current-meal updates.

Only replace stale Inventory setup/assertion mechanics; do not weaken these behaviors.

## Focused browser regression additions/updates

Use `tests/meal-builder-inventory-layout.spec.ts` or the most appropriate existing browser file to prove at minimum:

1. unified page has no old inventory tabs;
2. default empty state hides zero-stock Ingredients; `#meal-show-all` reveals them;
3. counted non-FIFO ordinary Ingredient aggregate `+`, `−`, `+` changes quantity correctly through the **UI event path**;
4. FIFO Ingredient with existing batch(es) has exactly one new-batch `data-stock-add[data-stock-storage="inventory"]` action outside the per-batch `−/+` controls;
5. frozen aggregate `−/+` remains functional and no freezer batch dates are rendered;
6. existing 375px no-overflow/touch-target expectations remain intact.

Do not lower the shared >=47px control-height acceptance.

## Scope constraints

- Keep the approved single Inventory page and `显示全部食材` toggle.
- Keep refrigerated FIFO dated batches with per-batch +/- and discard/undo.
- Keep frozen aggregate-only; do not reintroduce `freezerBatches`, source batch, frozen date, or frozen age.
- Keep independent thaw jobs.
- Keep Chicken/Duck merged Starter section.
- Keep the existing two-row data-driven bottom jump bar.
- Do not touch unrelated Day Trips, Notebook, Restaurant, Recipe content, or other modules.
- Do not change Firebase schema/rules unless a new test proves this correction genuinely requires it; run the rules gate regardless.

## Acceptance

All must PASS:

1. Non-FIFO ordinary counted `−/+` works through both domain helper and browser UI, with reservation protection on decrement.
2. FIFO card shows only one new-batch refrigerated add action.
3. `[data-stock-delta]` disabled state tracks write permission.
4. All stale `family-hub.spec.ts` inventory setup/tab/copy/zero-output assumptions are updated to the approved unified UI without weakening behavioral intent.
5. Focused unified-inventory browser regressions cover the current product shape.
6. `pnpm run test:unit` PASS.
7. `pnpm run test:browser` PASS.
8. `pnpm run test:rules` PASS where Java is available.
9. Full `pnpm run verify` PASS.
10. Push the fix to current `main` without reverting unrelated work.
11. Final GitHub Actions run is green through deploy. If CI exposes another task-caused failure, fix it in the same task rather than stopping after the first one.

## Completion

- Commit and push the correction.
- Append `## Result` to **this** handoff with Status, exact focused/full validation, final commit SHA, and any genuine unresolved blocker.
- Do not mark PASS while CI/deploy is pending or failing.
