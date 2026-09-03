# Fix Sami notebook skip-event root-write lock

Target agent: **Luna medium**.

## Goal

Fix the production Sami notebook `PERMISSION_DENIED` that begins after a scheduled recurrence has one persisted `skipEvent`, causing unrelated notebook writes such as item/Board reorder to fail.

## Established root cause

Current notebook mutations use `runTransaction()` at `households/{householdId}/notebook`, so every mutation revalidates all persisted notebook children.

Current `database.rules.json` validates each `skipEvents/$eventId` as if it were always being newly created:

- it requires the referenced item to currently be scheduled;
- it requires the referenced item's current `dueDate` to equal the event's historical `dueDate`;
- it requires `!data.exists()` and the creating member name.

That is correct for **creation**, but incorrect for an **existing historical skip event** during later full-notebook root transactions. After the first skip, the item advances to its next due date while the skip event correctly retains the previous occurrence date. Therefore later root writes revalidate the existing event against the item's newer due date and fail. `!data.exists()` also fails for the existing event.

Production was confirmed to contain one persisted skip event, matching the reported onset of systemic write failures.

## Required changes

1. `git pull --ff-only` and read current `AGENTS.md` + `PROJECT.md`.
2. Make the smallest rule change in `database.rules.json` so that:
   - **new** `skipEvents/$eventId` still require the current scheduled occurrence, matching current item due date, valid member `skippedByName`, valid shape/priority/boardIds, etc.;
   - **existing** skip events are allowed to pass later parent/root writes only when they remain unchanged as immutable history;
   - an existing skip event cannot have its actor, occurrence date, item id, timestamp, priority snapshot, boardIds snapshot, id, or any other field modified or extended;
   - do not loosen notebook root authorization or unrelated rules.
3. Prefer an explicit immutable-existing branch in the event-level validation if supported by Realtime Database rules. Verify the exact rules semantics in the emulator rather than assuming object comparison behavior.
4. Add regression coverage in `tests/notebook-rules.emulator.mjs` using the **real notebook-root write shape**, not just direct child `.set()`:
   - create canonical scheduled item + membership;
   - perform first root transaction/write that advances the item and creates a skip event;
   - then perform a second full `/notebook` root write that only reorders an unrelated membership/board and assert success while the historical skip event remains unchanged;
   - perform a subsequent second scheduled skip/root write and assert success while the first skip event remains unchanged;
   - assert attempts to mutate any existing skip-event historical snapshot are rejected.
5. Keep the existing direct child skip-event tests.
6. Run focused rules tests, then the full project verification gate required by the repo.
7. If all validation passes, deploy **only Realtime Database rules** from the verified current main/worktree to the confirmed production Firebase project/database used by FamilyHub. Do not deploy hosting, functions, or data. Confirm the target before deployment; do not guess.
8. Do not modify production notebook data.
9. Commit and push the implementation and test changes to `main`.

## Production deployment target

Previous authenticated deployment confirmed:
- project: `family-hub-a9ade`
- database: `family-hub-a9ade-default-rtdb`

Still re-confirm the active authenticated target before deploying.

## Validation

Required evidence:
- Firebase emulator reproduces the formerly failing sequence and now passes it;
- existing skip-event mutation attempts fail;
- current skip creation still passes;
- existing notebook rules tests pass;
- repo verification gate passes, or any environmental blocker is reported exactly;
- production database-rules deploy succeeds to the confirmed target.

## Result

Append exactly one `## Result` containing:
- `Status: PASS / FAIL / BLOCKED`;
- implementation summary;
- validation results;
- production rules deployment result;
- any blocker/deviation/unresolved issue.
