# Sami notebook: skip one scheduled recurrence

Target agent: **Luna medium**.

## Goal

Add an explicit `跳过本次` action for **scheduled recurring** items in Sami的小本本 so a missed or no-longer-needed occurrence can be dismissed without falsely marking it completed.

This is a narrow recurrence behavior change. Do not redesign unrelated notebook behavior.

Before editing:
1. `git pull --ff-only`
2. Read current `AGENTS.md` and `PROJECT.md`.
3. Read `docs/modules/sami-notebook/README.md` and inspect the current Sami notebook recurrence implementation, Firebase schema/rules, and tests.

## Required behavior

### 1. Scope

`跳过本次` exists only for modern `recurrence.kind = scheduled` recurring items.

Do **not** show or support it for:
- `recurrence.kind = afterCompletion`;
- one-time items;
- unsupported/legacy recurrence shapes unless they are already normalized by existing code into a safe scheduled equivalent.

Do not change the meaning of existing completion.

### 2. Scheduled recurrence semantics

For a scheduled recurring item with current materialized `dueDate`:

- `完成` means the occurrence was actually done. Preserve the existing completion-event behavior and advance exactly one scheduled occurrence.
- `跳过本次` means this occurrence was not done and should no longer remain pending. Advance **exactly one scheduled occurrence** using the same calendar schedule advancement logic as completion, but do not create a completion event and do not count/display the occurrence as completed.
- Skipping does not reset or re-anchor the cadence.
- Skipping one overdue occurrence must not silently catch up multiple missed occurrences. If the next scheduled occurrence is also overdue, it remains the current overdue occurrence and the user may explicitly complete or skip again.

Examples:
- Mon/Thu task currently due Thu -> skip Thu -> next due is Mon.
- Weekly task several occurrences overdue -> one skip advances one occurrence only.

### 3. Persistence / history

Persist a distinct skip record rather than representing a skip as completion.

Follow the smallest model consistent with the current repository. Prefer a parallel skip-event record/collection if the existing completion-history structure makes that the least invasive approach; do not refactor the entire recurrence history model merely to unify event types.

A persisted skip record must contain enough immutable snapshot/context to identify the skipped occurrence and who skipped it. At minimum preserve:
- skipped occurrence date (`dueDate` before advancement);
- `skippedAt` timestamp;
- `skippedByName` using the same private household display-name snapshot conventions used by completion actions.

Include other existing recurrence-history snapshots only where needed to render history consistently or satisfy current schema conventions.

Firebase validation/rules must enforce the same household/authorship/privacy boundaries as existing notebook recurrence history and must reject malformed skip writes.

No live household data may be committed to the repository.

### 4. UI

On an active scheduled recurring card in `反复干`, expose two direct actions:

`完成`  and  `跳过本次`

- `完成` remains the primary action.
- `跳过本次` is a visually secondary action but must remain directly visible; do not hide it in an overflow menu.
- Do not show `跳过本次` for `afterCompletion` recurrence.
- If the same active scheduled recurring item is actionable through another existing rendered surface (for example the Smart Urgent duplicate), keep behavior consistent rather than exposing contradictory action sets.
- Preserve mobile usability and avoid horizontal overflow at 375px.

No confirmation dialog is required unless the current notebook convention already requires confirmation for an equivalent non-destructive recurrence advancement action.

### 5. Recurring history display

Where recurring occurrence history is already rendered in `Completed` / `All`, include skipped occurrences as distinct history rows rather than pretending they are completions.

They must be visibly distinguishable, for example:
- completed occurrence: existing completed presentation;
- skipped occurrence: `跳过` / skipped presentation with the skipper identity/date according to current history conventions.

A skipped event must not make the live item `status = completed`, must not enter one-time completion grace behavior, and must not affect ordinary Board memberships/order beyond the existing recurrence rules.

If the current Completed view is semantically defined as completion-only in code, keep its completed counts/semantics completion-only while still presenting skip history in the recurrence-history area required by the canonical module design. Do not inflate completion metrics with skips.

### 6. Canonical documentation

Update `docs/modules/sami-notebook/README.md` so scheduled recurrence explicitly documents:
- completion advances one occurrence and records completion;
- skip advances one occurrence without completion;
- neither action auto-catches-up multiple missed occurrences;
- after-completion recurrence has no skip action;
- skip history is distinct from completion history.

## Acceptance tests

Add/update focused tests proving at minimum:

1. active modern scheduled recurrence shows `跳过本次`;
2. after-completion recurrence does not show it;
3. one skip advances exactly one scheduled occurrence using existing calendar rules;
4. skipping an overdue occurrence can leave the next occurrence overdue; no multi-occurrence auto-catch-up;
5. skip creates a distinct persisted skip record containing the occurrence date and skipper snapshot;
6. skip creates no completion event and does not set the recurring item to completed;
7. completion behavior remains unchanged;
8. recurrence history visually distinguishes completed vs skipped occurrences and does not count a skip as a completion;
9. Firebase rules accept valid household skip writes and reject malformed/unauthorized writes;
10. 375px recurring-card actions remain usable without horizontal overflow;
11. existing scheduled day/week/month/year advancement, after-completion cadence, legacy compatibility, Smart Urgent, ordinary Board exclusivity, and recurring completion history remain correct.

## Validation

Run focused notebook/unit/rules/browser checks while implementing, then run the full project gate:

```bash
pnpm run verify
```

Fix task-caused failures. If an environment dependency blocks only one stage, run all remaining stages and report the exact blocker.

## Completion

Keep the implementation task-scoped. Commit and push the implementation to `main` after validation.

Append a `## Result` section to this handoff containing only:
- `Status: PASS / FAIL / BLOCKED`;
- validation outcome;
- blocker, deviation, or unresolved issue if any.
