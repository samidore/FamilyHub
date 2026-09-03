# Meal Builder — Firebase batch-rule wildcard fix

## Goal

Fix the current CI blocker in `database.rules.json` introduced by the Meal Builder inventory lifecycle correction, then rerun the complete verification gate.

Work on current `main`; preserve all unrelated changes.

Before editing:
1. `git pull --ff-only`.
2. Read `AGENTS.md` and `PROJECT.md`.
3. Read `.handoff/codex/meal-builder-intake-inventory-lifecycle-fixes.md` only as context for the current correction.

## Confirmed failure

GitHub Actions `pnpm run verify` reaches Firebase emulator startup and fails before rules tests run:

`database.rules.json:36:229: Cannot have multiple default rules ('$date' and '$other').`

Current rules contain both a wildcard child and `$other` at the same level:

- `inventoryBatches/$ingredientId/$date` plus sibling `$other`
- `freezerBatches/$ingredientId/$batch` plus sibling `$other`

Realtime Database treats `$date` / `$batch` as the default wildcard, so the sibling `$other` is invalid. The wildcard `.validate` expressions already validate the key format, so `$other` is unnecessary.

## Exact change

In `database.rules.json` only:

1. Remove the sibling `"$other": { ".validate": false }` from inside `inventoryBatches/$ingredientId`.
2. Remove the sibling `"$other": { ".validate": false }` from inside `freezerBatches/$ingredientId`.
3. Keep the existing wildcard validation expressions unchanged:
   - `inventoryBatches`: `$date` must match `YYYY-MM-DD` and value must be positive half-unit quantity.
   - `freezerBatches`: `$batch` must be `unknown` or `YYYY-MM-DD` and value must be positive half-unit quantity.
4. Do not change other Firebase rules or Meal Builder runtime code unless a verification failure proves another task-caused issue.

Invalid child keys must still be rejected through the wildcard key predicate; do not weaken rule validation.

## Validation

Run, in order:

```bash
pnpm run test:rules
pnpm run verify
```

The task is complete only if the Firebase emulator loads the rules and the full gate passes, including browser tests. If CI is needed for Java, push the minimal fix and use GitHub Actions as the final gate.

## Acceptance

1. Firebase rules load without the duplicate-default-rule error.
2. New Meal Builder rules tests for `freezerBatches`, `sourceBatchKey`, and `discardedStock` pass.
3. Full `pnpm run verify` passes.
4. Browser suite remains green; do not weaken tests.
5. Final GitHub Actions run and deploy are green.
6. Append one `## Result` with Status, validation outcome, and any unresolved blocker/deviation.

## Result

Status: BLOCKED
Validation: `pnpm run test:unit` passed (186/186). `pnpm run verify` passed validation, check, build, audit, and unit tests, then stopped before browser tests because Firebase emulator startup could not spawn Java.
Blocker: Java is unavailable locally; run `pnpm run test:rules` and the final `pnpm run verify` in CI or an environment with Java to complete the rules/browser/deploy gate.
