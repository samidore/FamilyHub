# Deploy current Firebase rules for notebook skip

Target agent: **Luna medium**.

## Goal

Fix the production `permission denied` when the user clicks `跳过本次` on a scheduled recurring item in Sami的小本本.

The front-end implementation is already on `main`. The failure is consistent with production Realtime Database rules not yet including the new `notebook/skipEvents` rules.

## Before doing anything

1. `git pull --ff-only`
2. Read current `AGENTS.md` and `PROJECT.md`.
3. Read `docs/modules/sami-notebook/README.md` only as needed.
4. Inspect current `database.rules.json`, `firebase.json`, the production Firebase target/config available in the authenticated local environment, and the existing deployment history/conventions.
5. Do not guess the production Firebase project. Confirm the target from the authenticated environment / existing project configuration before deploying.

## Required work

1. Confirm current `main` contains the scheduled-recurrence skip implementation and corresponding `skipEvents` validation in `database.rules.json`.
2. Confirm the production website is using the expected Firebase project/database.
3. Deploy **only the Realtime Database rules** from current `main` to that production Firebase project. Do not deploy hosting, functions, data, or other Firebase resources.
4. Verify the deployed rules release succeeds.
5. If possible with the available authenticated/browser environment, verify that clicking `跳过本次` now succeeds for a scheduled recurring item and no longer returns `permission denied`. Do not modify live household data beyond the minimum required test action; if a safe reversible live test is not available, verify deployment and rule target instead.

## Important constraints

- Do not change recurrence semantics or UI unless investigation proves the current implementation itself is faulty.
- Do not loosen Firebase authorization broadly to make the write pass.
- Preserve the current household/member checks and the specific `skipEvents` validation already committed.
- Do not modify or migrate live notebook data.
- The existing GitHub Pages workflow deploys the static site only; do not redesign CI/CD in this repair task unless the rules cannot be safely deployed without a small necessary repository change.

## Validation

At minimum record:
- production Firebase project/database target used;
- successful database-rules deploy result;
- whether an end-to-end skip action could be safely verified;
- any remaining blocker.

## Completion

Append a `## Result` section containing only:
- `Status: PASS / FAIL / BLOCKED`;
- deployment/verification outcome;
- blocker or deviation if any.

If no repository code change is required beyond the Result update, commit and push the Result update after the production rules deployment so ChatGPT can inspect it.
