# Meal Builder — unified inventory page and batch-aware controls

## Goal

Replace the current `入库 | 库存` split UI with the reviewed single Inventory page, restore practical decrement controls, simplify frozen stock to aggregate-only storage, and keep thawing as independent jobs.

This task implements the user-reviewed design on current `main`. Preserve unrelated work, including the recent Chicken/Duck Starter-section merge and the data-driven two-row Inventory category jump bar.

Before editing:
1. `git pull --ff-only`.
2. Read `AGENTS.md` and `PROJECT.md`.
3. Read `docs/modules/meal-builder/README.md`, `behavior.md`, `data-model.md`, `inventory-import.md`, and `firebase.md` only as needed for this task.
4. Inspect current `src/lib/household.ts`, `src/lib/householdRepository.ts`, `src/lib/inventoryImport.ts`, `src/components/MealInventoryImport.astro`, `src/pages/meal-builder.astro`, `src/components/MealBuilderNavigationEnhancements.astro`, `database.rules.json`, and applicable unit/browser/rules tests.
5. Treat this handoff as superseding the earlier two-tab/freezer-batch product shape. Do not preserve stale UI or stale docs merely because earlier handoffs mention them.

## Reviewed product design

### 1. One Inventory page, not two tabs

Remove the `入库 | 库存` tab split.

Step 1 is one unified Inventory page with one visibility toggle:

- default: show only Ingredients with actual stock and/or active thaw jobs;
- toggle ON: `显示全部食材` (or equally clear compact copy) and show every visible Starter Ingredient, including zero-stock ones;
- this toggle affects visibility only; it never changes stock.

The existing Chat-assisted bulk import remains available on this same Inventory page. Do not create a parallel intake screen.

The existing batch-date input remains the date used when creating a new refrigerated FIFO batch. Future dates remain invalid.

### 2. Ingredient card may grow vertically

Each Ingredient is one card/block. Its height is content-driven:

- no fixed equal-height cards;
- no internal scroll region merely to force equal heights;
- if an Ingredient has many refrigerated batches or thaw jobs, the card naturally becomes taller;
- 375px viewport must not horizontally overflow.

Use compact horizontal controls, but preserve the existing touch-target acceptance (>=47px where the shared responsive test applies). Do not make controls full-width just to satisfy touch height.

### 3. Refrigerated stock: dated FIFO batches get their own +/-

For a counted FIFO Ingredient, refrigerated stock is batch-specific and each dated batch is independently editable.

Representative shape:

```text
鸡腿

冷藏 · 共 1.5
09/01   [−] 1   [+]   2 / 3天       [丢掉]
09/03   [−] 0.5 [+]   0 / 3天       [丢掉]

冷冻
[−] 3 [+]                         [化冻]

化冻中
0.5份 · 剩余18小时               [进入冷藏] [取消]
1份   · 剩余31小时               [进入冷藏] [取消]
```

Required refrigerated behavior:

- each FIFO batch row has its own `−`, displayed quantity, and `+`;
- `−` removes exactly `0.5` from that specific batch, not from the oldest other batch;
- `+` adds exactly `0.5` to that specific existing batch and preserves that batch date;
- if a batch reaches zero it disappears;
- aggregate `inventory/{ingredientId}` must be updated atomically with the exact batch mutation;
- existing strict freshness behavior remains: local calendar-day age, `x / y天`, and `临期` iff `age > freshness_priority_days`; equality is not stale;
- `丢掉` still discards the entire displayed refrigerated batch and uses the existing shared five-minute undo semantics;
- undo restores the exact date and quantity and merges with the same date if it already exists.

Creating a **new** refrigerated FIFO batch uses the page-level selected batch date plus a compact add action. Do not force users to mutate an existing date when they intend to add stock from a new date.

For counted non-FIFO ordinary Ingredients, there is no invented date/batch metadata. Render one compact ready-stock aggregate row with `− quantity +` because the canonical model deliberately has no FIFO batches for that Ingredient.

Presence-only ordinary stock remains boolean and uses a compact present/absent control rather than numeric +/-.

### 4. Frozen stock: aggregate only, no freezer batches

Frozen time/order does not have meaningful operational FIFO semantics for this household. New runtime behavior must therefore stop tracking frozen stock by date/batch.

Required:

- no normal-runtime `freezerBatches` state;
- no frozen purchase-date rows;
- no `冷冻N天` display;
- no source batch selection when starting thaw;
- no frozen FIFO consumption;
- frozen counted stock renders as one aggregate row: `冷冻 [−] quantity [+]`;
- `−` reduces the frozen aggregate by exactly `0.5` (never below zero and respecting any applicable existing reservation invariant for direct frozen stock);
- `+` increases the frozen aggregate by exactly `0.5` and does not create date metadata;
- do not show a separate frozen `丢掉` action; decrement is the quantity-removal control;
- direct frozen stock remains physically frozen but Recipe-available through ordinary `inventory` aggregate, exactly as the existing `freezer_behavior: direct` model intends;
- thaw-required frozen stock remains unavailable in `freezerInventory` until thaw completion;
- Ingredients without freezer support do not render a frozen row;
- direct Ingredients never render a thaw action.

Do not replace freezer batches with another hidden frozen-date system.

### 5. Thawing remains independent job/batch state

Thawing **does** remain per-job because each started thaw has its own timing and cancellation/completion lifecycle.

Required:

- every tap of `化冻` starts one independent thaw job; do not merge multiple jobs merely because they begin on the same day/time window;
- start thaw from the frozen aggregate, not from a freezer batch;
- preserve current quantity rule unless existing canonical tests/code prove a different invariant: move at most 1 unit per start, or the remaining 0.5 unit;
- starting a thaw atomically decrements the correct frozen aggregate and creates `{ ingredientId, quantity, startedAt, readyAt }`;
- new jobs do not need `sourceBatchKey` because frozen stock has no source batch;
- `取消` removes only that job and returns its remaining quantity to the frozen aggregate;
- `进入冷藏` affects only that job (current manual amount rule remains one unit per tap / remaining 0.5 unless canonical code says otherwise);
- manual completion enters refrigerated stock using the manual completion local calendar date;
- automatic due completion enters refrigerated stock using `readyAt` local calendar date;
- for FIFO Ingredients, completion creates/merges the corresponding refrigerated `inventoryBatches` date;
- partial completion leaves the remainder in that same thaw job with its original timing;
- multiple thaw jobs for one Ingredient remain independently visible and independently actionable.

### 6. Legacy `freezerBatches` / `sourceBatchKey` migration

Existing household state may contain `freezerBatches` and thaw jobs with `sourceBatchKey` from the previous implementation. Remove those fields safely without changing stock quantities.

Migration rule:

- **aggregate stock is authoritative**;
- for direct stock, keep current `inventory` aggregate exactly;
- for thaw-required stock, keep current `freezerInventory` aggregate exactly;
- do not recalculate either aggregate from old `freezerBatches` because old metadata can be incomplete or stale;
- old `freezerBatches` are discardable metadata only;
- old `sourceBatchKey` is discardable metadata only; preserve the thaw job's ingredient, quantity, startedAt, and readyAt;
- local persisted state should be rewritten once when legacy frozen-batch metadata is detected;
- Firebase connected state should be cleaned once/idempotently by transaction when legacy frozen-batch metadata is detected, analogous to existing persisted-state migration patterns;
- no data loss in `inventory`, `freezerInventory`, `inventoryBatches`, `thawingItems`, current meal, pending checkout meals, or recent meals.

The canonical `HouseholdState` should no longer emit `freezerBatches`. New writes must not reintroduce it.

### 7. Discard / undo after freezer simplification

Preserve the useful existing refrigerated-batch discard behavior:

- whole refrigerated batch discard remains immediate, no confirmation;
- shared five-minute undo remains persisted and cross-device;
- exact refrigerated batch date/quantity restore remains required;
- multiple independent undo records remain valid;
- expired records are still cleaned safely/idempotently.

New UI does not create frozen discard records. If legacy valid frozen discard records can still exist transiently, either preserve safe backward-compatible normalization/undo until expiry or migrate them without inventing stock; do not make a five-minute legacy record crash the new state model.

Presence-only stock removal can use the unified compact stock control; do not route it through the old Intake additive-only behavior.

### 8. Batch import stays storage-aware but frozen import is aggregate-only

Preserve the current JSON v1 contract and backward compatibility:

- item `storage` remains optional-compatible and supports `inventory | freezer` according to canonical `freezer_behavior`;
- same Ingredient may have separate inventory and freezer rows;
- review still allows `thaw-required` rows to switch `冷藏 / 冷冻`;
- direct remains fixed to physical `冷冻` while using ordinary aggregate underneath;
- ordinary non-freezer Ingredients cannot be imported as freezer.

Change only the persistence semantics for frozen rows:

- `storage: inventory` + FIFO counted still uses `stocked_on` to add/merge the refrigerated dated batch;
- `storage: freezer` adds only the appropriate aggregate (`inventory` for direct, `freezerInventory` for thaw-required);
- frozen import does **not** create `freezerBatches` and does not use `stocked_on` as frozen batch metadata;
- keep the payload-level `stocked_on` field for v1 compatibility and because mixed imports may include refrigerated FIFO rows;
- do not bump schema/version solely for this internal storage simplification.

Update `inventory-import.md` accordingly.

### 9. Bottom category jump bar

Preserve the current data-driven fixed bottom jump bar:

- generated from currently rendered Starter sections;
- no horizontal scrolling;
- exactly two rows at 375px;
- compact labels;
- no new hard-coded column count;
- recent Chicken/Duck merge remains one `chicken` section whose canonical display label is `鸡鸭`; compact jump label may remain `鸡` if that is the current intended compact label.

When `显示全部食材` is OFF, the jump bar reflects only sections actually rendered by current stock/thaw jobs. When ON, it reflects all rendered visible Starter sections.

## Data/domain implementation requirements

Refactor only as much as needed to make the new canonical model coherent.

Expected affected areas include:

- `src/lib/household.ts`
  - remove normal `FreezerBatches` / `HouseholdState.freezerBatches` dependence;
  - remove `sourceBatchKey` from canonical new thaw jobs;
  - add focused helpers for exact refrigerated batch +/- and aggregate frozen +/- rather than abusing generic FIFO consumption;
  - update `addStock`, `startThaw`, `cancelThaw`, `completeThaw`, `discardStock`, `undoDiscard`, normalization, and `reconcileInventoryBatchState` as required;
  - preserve current-meal snapshots and checkout FIFO semantics for refrigerated FIFO stock.
- `src/lib/householdRepository.ts`
  - detect and one-time clean legacy `freezerBatches` / `sourceBatchKey` in local and Firebase persisted state;
  - preserve existing legacy chicken-thigh migration and expired-discard cleanup behavior.
- `src/lib/inventoryImport.ts`
  - frozen imports aggregate only.
- `src/pages/meal-builder.astro`
  - remove two-tab Step-1 UI and implement unified card/toggle controls;
  - remove obsolete intake-only event paths/selectors;
  - keep Chat import integration.
- `src/components/MealInventoryImport.astro`
  - only if selectors/copy/semantics require updating.
- `database.rules.json`
  - prevent new `freezerBatches` writes while allowing deletion/migration of existing legacy data;
  - remove `sourceBatchKey` from canonical thaw-job allowed children so new writes cannot reintroduce it;
  - preserve correct validation for inventory, freezerInventory, inventoryBatches, thawingItems, discardedStock, and unrelated modules.
- canonical docs `behavior.md`, `data-model.md`, `inventory-import.md`, and `firebase.md` only where they describe the superseded lifecycle.

Do not modify Ingredient/Recipe content data for this task. Do not undo the current Chicken/Duck section merge.

## Reservation and snapshot invariants

Preserve all existing invariants unless explicitly changed above:

- aggregate inventory remains Recipe availability/Checkout source;
- FIFO checkout still consumes oldest **refrigerated** FIFO batch first;
- pending-checkout reservations remain virtual and unchanged;
- manual decrements of Recipe-available counted inventory must not intentionally consume below currently reserved quantity;
- direct frozen stock remains immediately Recipe-available because its aggregate is ordinary inventory;
- thaw-required frozen stock remains unavailable until completion;
- current meal availability/freshness snapshot is not rewritten by Inventory edits;
- presence-only tracking remains boolean;
- no runtime Ingredient-ID/name special cases;
- reset semantics are not silently broadened to clear additional storage domains. If current copy becomes misleading, make the smallest truthful copy change rather than broadening destructive behavior.

## Tests to add/update

Update tests to the new reviewed product rather than weakening them or preserving stale two-tab behavior.

### Focused domain tests

Cover at minimum:

1. exact refrigerated batch `−0.5` changes only the selected batch and matching aggregate;
2. exact refrigerated batch `+0.5` changes only the selected batch and matching aggregate;
3. batch reaches zero and disappears cleanly;
4. adding a new refrigerated FIFO batch uses selected date and preserves other dates;
5. non-FIFO counted ready stock uses aggregate +/- without fake batches;
6. frozen direct aggregate +/- mutates ordinary `inventory` only;
7. thaw-required frozen aggregate +/- mutates `freezerInventory` only;
8. start thaw deducts aggregate and creates independent job with no source batch;
9. two thaw starts create two jobs; cancel one restores only its quantity;
10. manual partial/full completion and automatic completion create/merge correct refrigerated FIFO dates;
11. legacy `freezerBatches` and `sourceBatchKey` normalize/migrate away while aggregates and thaw quantities/times remain unchanged;
12. refrigerated batch discard + exact undo still works;
13. strict freshness equality vs threshold+1 still behaves correctly.

### Inventory import tests

Cover:

- frozen direct import adds aggregate only, no freezer batch metadata;
- thaw-required frozen import adds `freezerInventory` only;
- mixed cold/frozen import uses `stocked_on` only for the cold FIFO row;
- old v1 payload without `storage` remains compatible.

### Firebase rules emulator tests

Cover:

- canonical aggregate freezer state and thaw jobs accepted;
- `freezerBatches` cannot be newly written/reintroduced;
- thaw job with legacy `sourceBatchKey` cannot be newly written after migration;
- deleting legacy frozen-batch metadata as part of normalization/migration succeeds;
- unrelated valid state still passes.

### Browser tests

Cover at 375px at minimum:

- no `入库 | 库存` tabs remain;
- one visibility toggle exists and defaults to only live stock/thaw jobs;
- toggling shows zero-stock visible Ingredients;
- FIFO refrigerated card shows each date row with its own compact `− quantity +` and batch discard;
- adding/removing one batch does not alter another displayed batch;
- frozen row is one aggregate `− quantity +`, with no dated frozen rows/age;
- thaw-required frozen row has `化冻`; direct frozen row does not;
- multiple thaw jobs render separately with separate `进入冷藏 / 取消` controls;
- cards grow vertically with multiple rows and do not create horizontal viewport overflow/internal horizontal scroll;
- touch targets still meet existing acceptance;
- Chat JSON bulk import remains functional on the unified Inventory page;
- bottom category jump bar remains fixed, two-row, non-scrolling, and data-driven.

Update stale copy/selector tests as necessary; do not lower shared responsive/touch thresholds.

## Documentation acceptance

After implementation, canonical docs must no longer claim:

- Step 1 has exactly two tabs;
- normal frozen stock is date/batch tracked;
- thaw must remember a frozen source batch;
- frozen dated batches show age.

They must instead describe:

- one Inventory page with a show-all toggle;
- refrigerated FIFO dated batches with batch-specific +/-;
- frozen aggregate-only stock;
- independent thaw jobs;
- storage-aware import with frozen aggregate persistence.

Do not create a new permanent design/KB document beyond updating the existing canonical docs and this task handoff.

## Acceptance criteria

All must PASS:

1. Step 1 is one unified Inventory page with a default-off `显示全部食材`-style toggle; no `入库 | 库存` split remains.
2. FIFO refrigerated batches have independent `− / quantity / +` controls and whole-batch discard/5-minute undo.
3. New refrigerated FIFO batch creation uses the selected non-future batch date.
4. Non-FIFO ordinary counted stock has aggregate +/- without fake dates.
5. Frozen counted stock is aggregate-only; no normal `freezerBatches`, frozen dates, frozen age, or frozen FIFO behavior remains.
6. Direct frozen aggregate remains ordinary `inventory`; thaw-required frozen aggregate remains `freezerInventory`.
7. Frozen +/- works correctly and direct stock respects existing reservation semantics.
8. Every thaw start creates an independent job; cancel/complete acts only on that job; no new `sourceBatchKey`.
9. FIFO thaw completion creates the correct refrigerated dated batch for manual/automatic completion.
10. Legacy `freezerBatches` / `sourceBatchKey` are cleaned safely without changing authoritative aggregate quantities or active thaw quantity/timing.
11. Chat inventory import remains v1-compatible and storage-aware; frozen imports no longer create frozen batch metadata.
12. Firebase rules accept the new canonical shape, reject reintroduction of removed frozen-batch metadata, and allow safe legacy cleanup.
13. Current-meal snapshot, checkout FIFO, queued reservation, presence-only, reset, and privacy behavior remain intact.
14. Ingredient cards grow with content; 375px has no horizontal overflow; action controls remain compact but satisfy touch-target acceptance.
15. Bottom category jump bar remains data-driven, fixed, exactly two rows, and non-scrolling at 375px.
16. Canonical Meal Builder docs describe the new model and contain no stale two-tab/frozen-batch requirements.
17. Focused unit/import/rules/browser regressions exist for the new behavior.
18. `pnpm run verify` passes in the available environment; if local Java is unavailable, still run all other focused/full checks and rely on CI for the rules gate.
19. Final GitHub Actions run for the implementation commit is green through deploy before this Goal is considered complete.

## Completion protocol

- Make the smallest coherent implementation; do not refactor unrelated Recipe/Cook/Checkout/Notebook/Day Trips code.
- Run focused tests while editing, then `pnpm run verify`.
- Fix all task-caused failures rather than reporting the first failure.
- Commit and push to current `main` without reverting unrelated later commits.
- Append `## Result` to this handoff with Status, validation results, final implementation commit SHA, and any genuine blocker/deviation.
- Do not mark PASS if CI/deploy is failing or has not completed.

## Result

Status: BLOCKED

Validation: `pnpm run validate`, `pnpm run check`, `pnpm run build`, `pnpm run audit`, `pnpm run test:unit`, and `pnpm run test:browser` pass locally. `pnpm run test:rules` was attempted but is blocked locally because Java is unavailable; CI rules/deploy must confirm before final acceptance.

Implementation commit SHA: a5467e08a643dc5305843ee42c8650e74025fb80 (handoff update will amend this commit).

The implementation removes normal frozen batch metadata, adds unified Inventory visibility and batch/aggregate controls, preserves thaw jobs and refrigerated discard/undo, updates migration/import/rules/docs, and updates focused regressions.
