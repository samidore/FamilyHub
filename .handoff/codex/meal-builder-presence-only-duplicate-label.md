# Meal Builder presence-only duplicate 有/无 label fix

## Goal

Fix the current Meal Builder acceptance bug where a `presence-only` inventory row renders the same state twice, e.g. `无 无` in the Freezer tab.

Before editing:
1. `git pull --ff-only`
2. Read `AGENTS.md` and `PROJECT.md`.
3. Inspect current `src/pages/meal-builder.astro` and focused Meal Builder browser tests.

## Confirmed root cause

Current `renderInventoryRow()` creates both:
- a clickable presence-only toggle whose text is `有` / `无`; and
- an `output` whose text is also `有` / `无`;
then appends both for presence-only rows.

The ordinary Inventory renderer has the same duplicate pattern: it appends the toggle and then also appends the presence-only output.

This produces duplicate visible state text such as `无 无` / `有 有`.

## Required fix

For `presence-only` rows, render exactly **one visible state control**:

```text
[有]
```
or
```text
[无]
```

The one visible element must be the existing clickable toggle button, preserving current semantics and `aria-pressed` behavior.

Apply consistently to:
- ordinary Inventory presence-only rows;
- Freezer `direct` presence-only rows (including 点心, 馒头, 粽子, etc.).

Do not change counted rows. They must remain:

```text
[开启/在库存] [−] qty [+]
```

Do not change freezer storage semantics, direct/thaw-required behavior, inventory state, checkout behavior, or styling beyond what is necessary.

Prefer removing/not appending the redundant presence-only `output` in DOM rather than merely visually hiding duplicate product text, unless current architecture makes a single semantic output necessary for accessibility. In all cases there must be exactly one visible `有`/`无` state per presence-only row.

## Tests

Add/adjust focused browser coverage proving:
1. A direct-freezer presence-only row at off state shows exactly one visible `无` state.
2. After toggling on, it shows exactly one visible `有` state.
3. An ordinary Inventory presence-only row also shows exactly one visible state.
4. Counted row controls are unchanged.

Run the focused test(s), then:

```bash
pnpm run verify
```

Fix task-caused failures. If local Java is unavailable for rules tests, still run the remaining applicable checks and report that exact environment blocker; GitHub Actions is the final verification source.

## Completion

- Keep the change narrowly task-scoped.
- Commit and push to `main` after validation.
- Delete this handoff file in the final implementation commit.
- Also delete the already-completed stale `.handoff/codex/meal-builder-extra-copy-single-line.md` if it still exists; it should not remain as a parallel permanent source of truth.
- Append `## Result` before deletion only if needed by the Codex task workflow; final `main` should not retain completed handoff files.
