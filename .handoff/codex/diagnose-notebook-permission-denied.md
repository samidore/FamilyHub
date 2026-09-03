# Diagnose Sami notebook systemic permission denied

Target agent: **Luna medium**.

## Goal

Diagnose the systemic production `PERMISSION_DENIED` affecting multiple Sami notebook writes (confirmed examples: scheduled `跳过本次` and reordering) **before changing any implementation or production data**.

This is an investigation task. Do not apply a local/one-button fix. The output must identify the actual failing layer and the smallest correct system-level repair scope.

## Known facts

- Current `src/lib/notebookRepository.ts` performs notebook mutations with `runTransaction()` at `households/{householdId}/notebook`, returning the full normalized notebook state.
- Therefore unrelated mutations can revalidate the whole notebook tree under Realtime Database `.validate` rules.
- Current repo rules contain `notebook/skipEvents` and permit household members at notebook root.
- The skip rules were deployed successfully on 2026-09-03 to production Firebase project `family-hub-a9ade`, database `family-hub-a9ade-default-rtdb`.
- The user still reports `permission denied` for more than one notebook mutation, so do not assume this is only missing `skipEvents` deployment.
- Current rules tests mostly exercise direct child writes; they do not prove the real full-root repository transaction works against production-shaped/legacy notebook state.

## Before investigation

1. `git pull --ff-only`.
2. Read current `AGENTS.md` and `PROJECT.md`.
3. Read `docs/modules/sami-notebook/README.md` only as needed.
4. Inspect current:
   - `src/lib/notebookRepository.ts`
   - `src/lib/notebookDomain.ts`
   - `src/lib/notebookActions.ts`
   - `src/lib/notebookAttribution.ts`
   - reorder UI/actions
   - `database.rules.json`
   - `tests/notebook-rules.emulator.mjs`
5. Confirm the authenticated Firebase CLI/project before any production read. Do not guess project/database/household IDs.

## Investigation A — deployed rules drift

Read the **currently deployed Realtime Database rules** for the production database using the authenticated Firebase environment / supported Firebase tooling.

Compare the deployed rules with current `main` `database.rules.json`.

Report only:
- same / different;
- if different, the relevant notebook rule differences and which repository commit/version appears deployed if determinable.

Do not dump credentials or unrelated rules content into the handoff.

## Investigation B — production notebook compatibility

Read the production household notebook subtree to a temporary local file only. **Never commit it, paste private task/comment content into the handoff, or leave a persistent copy in the repo.**

Use the production raw notebook state to determine whether a real root transaction would implicitly rewrite anything before the requested mutation:

1. Run the current `normalizeNotebookState(raw)` logic against the raw production snapshot.
2. Diff raw vs normalized structurally.
3. Identify paths/categories that would be added, removed, trimmed, compacted, or otherwise changed merely by repository normalization.
4. Check the resulting full normalized tree against current notebook rules, especially records whose rules are stricter than the TypeScript normalizer or contain immutable actor/author snapshots.

Report only schema/path categories and IDs if necessary for diagnosis; do not report private titles, comments, bodies, inbox text, or other household content.

Explicitly inspect likely compatibility hazards such as:
- legacy/modern recurrence shapes;
- board settings including `recurringBoardOrder`;
- item `authorName` / `completedByName` immutability;
- comment `authorName` immutability;
- completion-event legacy compatibility and `boardIds` representation;
- skip events;
- membership order records;
- any persisted field currently rejected by `$other` rules;
- any raw value normalized to a different immutable value.

## Investigation C — reproduce the actual write shape

The important test is **not** a direct child `.set()`.

Using current code/rules and a fixture shaped from production data without private text:

1. Reproduce a notebook-root write equivalent to the real repository transaction for an item reorder.
2. Reproduce a notebook-root write equivalent to scheduled `跳过本次` (advance one due date + add skip event atomically).
3. Determine which exact `.validate` path/expression rejects the write.

If local Java is unavailable, do not stop at the existing direct-child tests. Use the best available alternative:
- install/use an already available JRE if permitted;
- or prepare/run a temporary diagnostic emulator test in CI without weakening production tests;
- or use another Firebase-supported rules evaluation path.

Do not merge a permanent diagnostic test/file unless it belongs in the final repair; investigation-only scaffolding must be removed.

## Investigation D — architecture assessment

Determine whether the generic full-notebook root transaction is itself an unacceptable coupling point.

Answer:
- Is the current failure caused by one bad/stale production record, deployed-rules drift, or a rule/transaction semantic bug even for canonical state?
- Would repairing only the identified record/rule leave the notebook vulnerable to the same class of outage when another schema evolves?
- Which operations genuinely require multi-path atomicity (e.g. recurrence advancement + history event), and which can safely transact/update a narrower subtree?
- Is a targeted-write repository API warranted, or is a compatibility migration + root-transaction regression coverage sufficient?

Do not redesign the repository speculatively. Base the recommendation on the reproduced failure.

## Required Result

Append exactly one `## Result` with:

- `Status: PASS / BLOCKED` for the **diagnosis**, not for a repair;
- production rules comparison result;
- root cause with the exact failing rule/path or the narrowest proven failure point;
- whether production data normalization contributes;
- whether the generic notebook-root transaction is a systemic risk in this case;
- recommended repair scope (files/data migration/rules/tests), but **do not implement it**;
- validation/reproduction evidence;
- any remaining blocker.

Do not modify production notebook data. Do not deploy rules. Do not implement the repair in this task.

Commit and push only the appended Result (and no private diagnostic artifacts) so ChatGPT can inspect it.