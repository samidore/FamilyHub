# Meal Builder — 入库 / 库存 lifecycle review fixes

## Goal

Fix the failed `入库 | 库存` lifecycle implementation from commit `9cb7148a9e13cdfc6b1f05dfa13fa32db7a2a836` so the original Goal acceptance criteria actually pass.

This is a correction task on current `main`. Preserve all unrelated later work, especially Day Trips/Notebook changes. Do not revert the two-tab product design and do not redo the already-completed mushroom work.

Before editing:
1. `git pull --ff-only`.
2. Read `AGENTS.md` and `PROJECT.md`.
3. Read `.handoff/codex/meal-builder-intake-inventory-lifecycle.md` including its FAIL Result.
4. Read the current Meal Builder `README.md`, `behavior.md`, `data-model.md`, and only the implementation/tests needed for this correction.
5. Inspect current `src/lib/household.ts`, `src/lib/householdRepository.ts`, `src/pages/meal-builder.astro`, `database.rules.json`, and Meal Builder unit/browser/rules tests.

## Confirmed review findings to fix

### 1. Batch-specific thaw currently decrements the wrong batch

Current `startThaw` chooses the requested `sourceBatchKey`, but then calls the generic FIFO `consumeInventoryBatches(batches, amount)`. That helper consumes the lexicographically oldest batch, not necessarily the selected batch.

Required:
- when the user taps `化冻` on a specific frozen batch, decrement exactly that batch key;
- move max 1 unit, or remaining 0.5;
- remove only that batch if emptied;
- record that exact source batch key on the thaw job, including `unknown` when that is the actual source;
- cancel must return remaining quantity to exactly that same source batch;
- do not use the ordinary FIFO-consumption helper for selected frozen-batch removal unless it is extended with semantics that explicitly target the requested key.

Add focused unit tests with at least two frozen batches where the user thaws the later/non-oldest batch and prove the earlier batch is unchanged; include cancel and partial/manual completion.

### 2. Direct frozen stock is rendered as duplicate/wrong refrigerated stock

Current lifecycle rendering first renders ordinary non-FIFO inventory as `冷藏`, then additionally renders `freezerBatches` for counted `freezer_behavior: direct`. This duplicates the same underlying aggregate. Presence-only direct items are currently rendered only through the ordinary branch and appear as `冷藏 true`.

Required product semantics:
- `direct` is physically frozen even though its aggregate intentionally lives in ordinary `inventory` for Recipe availability;
- in the `库存` UI, direct stock must render once, as frozen/direct stock, never as an additional `冷藏` row;
- counted direct uses its frozen batches;
- presence-only direct shows one truthful frozen presence row, with human copy such as `冷冻 · 有`, not `冷藏 true`;
- discard/undo for direct stock must preserve the fact that the stock is physically frozen.

Add browser coverage for counted direct and presence-only direct.

### 3. Undo of a discarded direct frozen batch restores batch metadata to the wrong store

Current `undoDiscard` derives the aggregate backing store (`inventory` for direct), then uses that result to choose the batch store, causing a discarded direct frozen batch to restore its date into `inventoryBatches` instead of `freezerBatches`.

Required:
- distinguish physical storage state from aggregate backing field;
- undo a direct frozen batch into ordinary `inventory` aggregate **and** the original `freezerBatches` key;
- preserve exact original date/`unknown` key and quantity;
- merge with an already-existing same batch key if necessary;
- no fabricated date.

Add unit tests proving exact date restoration for direct frozen counted stock.

### 4. Presence-only intake currently has two click paths / wrong additive semantics

Current intake presence-only button carries both `data-stock-toggle` and legacy `data-inventory-toggle`, while two separate delegated click handlers listen for them. One click can trigger two writes/race.

Required:
- `入库` is additive only;
- absent presence-only stock: one `入库` action that writes presence once;
- already present: show an already-stocked state (`有` or equivalent) and do not use this intake action to toggle it off;
- use exactly one event path/write per click;
- `direct` presence-only still uses ordinary inventory underneath but is labeled as frozen;
- removal/discard belongs in the `库存` lifecycle tab, not intake.

Remove legacy selector attributes from the new intake controls rather than making two handlers cooperate.

Update browser helpers/tests to use the new canonical intake action instead of reviving the old toggle UI.

### 5. Intake stock summary labels must match storage meaning

For `thaw-required`, ordinary ready stock must say `冷藏`, not generic `现有`.

Required summary:
- ordinary-only: `现有`;
- direct: `冷冻`;
- thaw-required: `冷藏 X · 冷冻 Y`, plus `化冻中 Z` when applicable.

Never display booleans as `true/false`.

### 6. Freshness age and 临期 display must use canonical calendar-day semantics

Current lifecycle UI calculates age with `(Date.now() - localMidnight) / 86400000`, which is elapsed 24-hour periods and can be wrong across DST. It also does not visibly apply the required strict `临期` emphasis.

Required:
- derive age as local calendar-day difference, using/reusing the same canonical date-age logic used by Meal Builder freshness/ranking where possible;
- show FIFO refrigerated batch as `x / y天`;
- `y` comes only from canonical `freshness_priority_days`;
- show `临期` emphasis iff the same existing predicate is true: `age > freshness_priority_days` (equality is not stale);
- do not add/guess thresholds for ingredients without canonical freshness metadata;
- add unit/browser coverage for equality vs threshold+1 and a DST-crossing date case.

### 7. Frozen dated batches must show frozen age

For a dated freezer batch, show current calendar-day age such as `冷冻14天`; `unknown` remains `日期未知`.

Do not invent a frozen expiry threshold or `临期` rule.

### 8. Expired discard undo records must be lazily cleaned from shared state

Current UI filters expired records out of display but does not persistently remove them, so hidden expired records can accumulate indefinitely.

Required:
- when connected/writable and expired discard records exist, perform an idempotent transaction that removes expired records;
- do not create a write/render loop;
- another device should observe the cleanup;
- stale expired records can never restore stock;
- cleanup should be opportunistic (subscribe/render/timer is fine) and not require user interaction.

Add unit/repository/browser coverage as appropriate.

### 9. Harden discarded-stock normalization and Firebase rule shape

Current local `normalizeDiscardedStock` is looser than the canonical contract. Make local normalization and Firebase validation agree.

Required canonical record:
- exactly one of `quantity` or `presence: true`;
- `undoUntil === discardedAt + STOCK_UNDO_WINDOW_MS`;
- optional `batchKey` only if valid `YYYY-MM-DD` or `unknown`;
- invalid/malformed records normalize away locally and are rejected by Firebase rules;
- unknown extra fields rejected by Firebase rules;
- preserve valid legacy household state that simply lacks the new fields.

Add dedicated unit and Firebase emulator tests for valid/invalid `freezerBatches`, `sourceBatchKey`, and `discardedStock`, including both quantity+presence ambiguity, invalid batch keys, invalid undo window, and extra fields.

### 10. Remove superseded dead inventory UI code

Current `renderInventory()` returns after new `renderIntake/renderLifecycle`, leaving a large old inventory implementation unreachable; old `renderFreezer()` and `renderThawing()` functions are also unused. Astro check explicitly reports unreachable/unused hints from this task.

Required:
- remove the superseded old Step-1 rendering/event code that no longer participates in the two-tab UI;
- keep only current `入库 | 库存` paths;
- do not refactor unrelated Meal Builder Recipe/Cook/Checkout code.

### 11. Mobile action controls regressed below the existing touch-size acceptance

CI on `9cb7148...` failed responsive browser acceptance because a Meal Builder control measured `35.6875px` high where the existing test requires at least 47px. This is a real UI regression, not a stale-selector issue.

Required:
- new intake, discard, thaw, cancel, enter-refrigerated, undo, and date controls must remain usable at 375px;
- preserve existing project touch-target acceptance (>=47px where the shared responsive test applies);
- no horizontal viewport overflow at 375px;
- long ingredient names remain readable and controls do not get pushed off-screen;
- do not weaken the shared responsive test merely to accept smaller controls.

## Tests: update to the new product, do not merely delete old assertions

The implementation commit changed no test files. Correct that.

Update browser test helpers/selectors from the removed old inventory/freezer/thaw tabs to the canonical `入库 | 库存` flow. Preserve the behavioral intent of existing tests (meal setup, checkout queue, ingredient exclusion, import, cross-page sync, etc.) while interacting through the new intake controls.

Replace obsolete freezer/thawing-tab browser tests with coverage for:
- exactly two tabs `入库` and `库存`;
- manual intake for ordinary, direct, and thaw-required storage;
- current stock summaries;
- lifecycle hides zero-stock items;
- ordinary FIFO `x/y` and strict `临期`;
- freezer dated/unknown batches;
- batch-specific thaw/cancel/manual completion;
- direct never exposes thaw;
- discard + shared 5-minute undo; exact restoration; expired undo unavailable/cleaned;
- multiple independent undo records;
- 375px no overflow and usable action controls;
- Chat JSON import remains functional in intake.

Add focused unit tests for the domain helpers above rather than relying only on browser tests.
Add Firebase emulator rules tests for all new state fields.

Do not change tests to preserve old three-tab UI behavior. Do not weaken unrelated project acceptance thresholds.

## CI facts from review

GitHub Actions run `33791708609` for implementation commit `9cb7148...` proves:
- validate PASS;
- Astro check PASS but with task-caused unreachable/unused hints;
- build PASS;
- audit PASS;
- unit tests PASS 182/182;
- Firebase emulator rules tests PASS 25/25 (Java is therefore not a final blocker in CI);
- Playwright FAIL: 26 failed / 12 passed;
- deploy skipped.

The correction is not complete until the full current-main gate passes.

## Acceptance

All must PASS:
1. Original Goal criteria 1–15 in `.handoff/codex/meal-builder-intake-inventory-lifecycle.md` are satisfied.
2. Each confirmed review bug above is covered by a focused regression test.
3. No duplicate/refrigerated rendering for direct frozen stock.
4. Batch-specific thaw always mutates the clicked source batch and cancel returns to it.
5. Direct frozen discard undo restores exact freezer batch identity/date.
6. Intake presence-only uses one additive write path and never toggles existing stock off.
7. `x/y` and `临期` use local calendar days and the existing strict predicate; frozen batches show age without invented expiry.
8. Expired shared undo records are safely cleaned without loops and cannot restore.
9. New runtime shapes are consistently normalized and Firebase-rule validated.
10. No task-caused unreachable/unused Step-1 legacy implementation remains.
11. Updated browser suite tests the new UI rather than stale selectors.
12. Full `pnpm run verify` passes in an environment with Java/Playwright; GitHub Actions on the final commit must be green, including deploy.

## Completion

- Run focused tests while editing, then `pnpm run verify`.
- Fix every task-caused failure; do not stop after the first failing browser test.
- Commit and push the correction to current `main` without reverting unrelated commits that landed after `9cb7148...`.
- Append `## Result` to this handoff with only Status, validation outcome, and any unresolved blocker/deviation. Do not delete this handoff before ChatGPT reviews the result.

## Result

Status: BLOCKED
Validation: `pnpm run test:unit` passed (185/185); `pnpm run check` passed with only pre-existing unrelated deprecation hints; `pnpm run build` and `pnpm run audit` passed; full browser suite passed (38/38). Firebase rules emulator validation could not start because Java is unavailable locally.
Blocker: Java is unavailable locally; run `pnpm run test:rules` and the final `pnpm run verify` in CI or an environment with Java to complete the rules/deploy gate.

## Result

Status: BLOCKED
Validation: `pnpm run validate`, `pnpm run check`, `pnpm run build`, `pnpm run audit`, `pnpm run test:unit` (186/186), and `pnpm run test:browser` (38/38) passed. Firebase rules validation in `pnpm run verify` could not start because Java is unavailable locally.
Blocker: Run `pnpm run test:rules` and the final `pnpm run verify` in CI or an environment with Java; no other unresolved task-caused failure remains.
