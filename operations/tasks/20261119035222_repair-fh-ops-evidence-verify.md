---
id: 20261119035222_repair-fh-ops-evidence-verify
status: ready
agent: luna-medium
kinds: code
target_repo: samidore/FamilyHub
target_branch: fh-ops-cleanup
account: sami
review_family: 20261119034000_fh-ops-cleanup
summary: 修正 FamilyHub 清理任务的原始记录与 Sami Notebook 过期阶段说明，补齐删除引用证据并重试完整验收。
---
# Same-family repair: evidence integrity and release verification

This is a narrow repair for Orchestrator family `20261119034000_fh-ops-cleanup`. Authorized scope remains exactly `samidore/CodexTasks:families/20261119034000_fh-ops-cleanup.md` (FamilyHub audit items 6, 7, 10, 11, 12 plus removing `/ops/novel/`, with no displayName rules change). Continue on `samidore/FamilyHub@fh-ops-cleanup`; review starting publication `c3c5967639f88ffbddff0dc303c4addcdd5b663a`. The Runner owns Git preflight and final commit/push for Luna. Do not edit CodexTasks.

Read the mandatory protocols injected by Runner and follow target `AGENTS.md` / `PROJECT.md`; retain a verbatim central task snapshot in the new `operations/tasks/20261119035222_repair-fh-ops-evidence-verify.md` and append honest execution notes. Read the exact earlier `operations/tasks/20261119034000_fh-ops-cleanup.md` and inspect actual branch state first.

## Findings to resolve

1. **Prior task snapshot was modified.** The published original central task at CodexTasks commit `7975de7b54dba1fdb2dde58ca7329c72c24e0a04` begins with `status: ready`. The target record `operations/tasks/20261119034000_fh-ops-cleanup.md` at `c3c59676` begins with `status: complete`. Every other original task line matched the later central task text when reviewed; the original snapshot must remain exact. In that existing prior task record, restore only the original snapshot line to `status: ready` and preserve all subsequent `## Protocols read`, `## Execution record`, and `## Validation` sections. Do not restate or delete execution history. The new repair's own task record must likewise preserve its original `status: ready` snapshot and append notes after it.
2. **Stale roadmap phrasing remains in notebook documentation.** `docs/modules/sami-notebook/README.md` removed the old `## Implementation sequence`, but its header still says `Phase 4 is implemented; Phase 5 release verification is pending`, and the new `## Current implementation status` repeats the phase wording. Replace those two outdated phase-oriented statements with a concise current-state description based on the implemented runtime, e.g. `Status: implemented module; release validation uses pnpm run verify.` Keep the existing documented validation command and functional/privacy acceptance criteria; do not claim a successful release verification that was not run. Keep the change surgical; avoid rewriting business rules.
3. **Deletion-reference evidence is not in the earlier execution record.** It claims reference checks were done but does not state checks/results. Verify, from the exact pre-cleanup commit `94e8b73094a2ade775802f9a5c2948e060b2e22d` and current branch, whether `novelRunInspector`, `mountNovelRunInspector`, `/ops/novel/`, `.handoff/codex/`, `MEAL_BUILDER_REQUEST_TO_LUNA.md`, `README-NOOP`, the two old `operations/tasks/20260926*` records, and `database-debug.log` have any *surviving runtime/dependency references* outside the removed files. Use bounded `git grep` or equivalent exact file searches; report the commands and results in the new task record and (if useful) the earlier one. These checks are retrospective: do **not** fabricate a pre-deletion execution log or pretend that a search ran before the original deletion. If an actual still-live reference within the authorized cleanup scope exists, fix only that reference and verify. Do not restore old handoffs merely because they are mentioned as history.

## Required verification

The substantive code change from `c3c59676` already contains the correct expected shapes on inspection: six mandatory Firebase config checks before final production build, `pnpm run audit` on final `dist`, Playwright port 4322 with `reuseExistingServer: false`, static audit of Today + notebook Developer pages, and deletion of the mock run inspector. Do not reopen these implementations without specific failing evidence.

The first worker reported: `pnpm run verify` could not start (`pnpm` CommandNotFoundException), while direct Astro build and `node --test` failed at `spawn EPERM`. This is **not** full verification. Try a genuinely different available path to the same gate if it is already present without repository or system-level changes, such as `corepack pnpm run verify` / `corepack.cmd pnpm run verify` when Corepack is installed and resolves the project's pnpm version. If `pnpm` is available after normal non-invasive resolution, run the exact `pnpm run verify` command. Capture exact commands, failing process/stage, and the real error stack or message; distinguish a local sandbox/process-spawn limitation from a repository failure. Do not add production fallbacks, alter app logic, bypass checks, or install new global tooling merely to mask an environment blocker. Do not rerun identical proven-failing commands without a changed condition.

When build succeeds, confirm `dist/today/index.html` and `dist/sami-notebook/developer/index.html` exist, `dist/ops/novel/index.html` does not exist, and `pnpm run audit` passes on the same built `dist`. If the environment still prevents build or verify, state explicitly that **family completion remains unverified**; run only checks that have diagnostic value and record the human/environment decision required for a subsequent BLOCKED report. No false PASS.

Finally run `git diff --check`, inspect `git diff --stat` and changed files; preserve the scope exclusions: no meal-builder implementation/data, `src/layouts/BaseLayout.astro`, homepage, novel reader/sync, or Firebase displayName rules changes. The target record for this repair must contain the exact original task snapshot, protocol-reading evidence, actual outcomes, validation, and blockers. Leave all edits in workspace for Runner publication and end with the exact RUNNER_READY trailer required by its instructions.

## Protocols read

Principles.md | 新的要求可以改变之后怎么做，但不能追溯改写之前的计划、实现、决定或证据。证据不足时明确保留不确定性，不选择最讨用户喜欢的解释。
Coding.md | 8. **Handoff 写入口。** Orchestrator 写代码任务 handoff 时，将已知入口写为 `file:function`。
gpt-defensive.md | 本协议不禁止有现实依据的 robustness；它禁止 GPT 把假想风险或失效状态自动变成永久代码复杂度。

## Execution record

- Restored only the earlier task record front-matter snapshot line from `status: complete` to its original `status: ready`; all existing protocol, execution, and validation history remains intact.
- Replaced both Sami Notebook phase-progress statements with current-state wording. The existing `pnpm run verify` command and acceptance criteria remain unchanged.
- Retrospective reference checks were run; no authorized live reference required a code change. The current branch command was `git grep -n -E "novelRunInspector|mountNovelRunInspector|/ops/novel/|\\.handoff/codex/|MEAL_BUILDER_REQUEST_TO_LUNA\\.md|README-NOOP|20260926135023|20260926162600|database-debug\\.log" -- ':!operations/tasks/20261119034000_fh-ops-cleanup.md' ':!operations/tasks/20261119035222_repair-fh-ops-evidence-verify.md'`; it returned only `.gitignore:8:database-debug.log`, the intentional ignore rule, with no runtime/dependency reference. The pre-cleanup command was the same bounded `git grep` against `94e8b73094a2ade775802f9a5c2948e060b2e22d`; its unfiltered matches were confined to the removed inspector files, removed handoffs/artifacts, and the two old task records. The explicit outside-removed-artifacts command added path exclusions for those files and returned no matches (exit 1). These are retrospective searches, not a fabricated pre-deletion log.
- Corepack resolution was attempted through both `corepack pnpm run verify` and `corepack.cmd pnpm run verify`. Both reached the package script declaration but failed before `validate` with `'pnpm' is not recognized as an internal or external command, operable program or batch file.` No global tooling or repository fallback was added.

## Validation

- Passed: `node scripts/validate.mjs`.
- Passed: `node scripts/validate-meal-privacy.mjs`.
- Passed: `git diff --check`.
- Full `pnpm run verify` remains unrun/unverified because the available Corepack paths cannot resolve `pnpm`; therefore family completion remains unverified. The prior direct Astro build and `node --test` attempts recorded in the earlier task were blocked by Windows `spawn EPERM`; they were not repeated because the condition was unchanged. A subsequent run needs an environment with the project pnpm executable available, then the exact `pnpm run verify` gate and generated `dist` assertions must be rerun.
- No generated `dist` assertions are claimed because the required build did not start. No excluded application/data files were changed.

## Result

Status: BLOCKED

Validation completed for the documentation, evidence, and focused repository checks; release verification and family completion remain unverified due to the local pnpm/process environment blocker.
