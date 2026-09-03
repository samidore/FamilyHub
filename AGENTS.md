# AGENTS.md

Read `PROJECT.md` before changing the repository, then follow the documentation owned by the area being changed.

- Make the smallest change that fully satisfies the request.
- Do not refactor, clean up, or redesign unrelated code. Preserve unrelated user work.
- Resolve minor ambiguity from existing code, behavior, tests, and project conventions. Ask only when the choice would materially change behavior, data meaning, architecture, privacy/security, or cause a destructive change.
- A clear implementation request does not require separate plan approval.
- Before taking a consequential action, first explain the problem, the reasoning, the intended process, and the expected result to the user. Do not skip directly to execution merely because the action is technically straightforward.
- Do not hard-code values derivable from canonical data or runtime state. Literal numbers are allowed only when they are intentional product/domain invariants.
- Use focused checks while working and the project verification gate before completing applicable implementation work. Fix task-caused failures rather than stopping at the first failure; report exact environmental blockers when verification cannot run.
- Keep commits task-scoped. Do not create backup branches, safety copies, or extra scaffolding without a concrete need or explicit request.
