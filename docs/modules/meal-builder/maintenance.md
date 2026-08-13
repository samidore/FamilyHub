# Meal Builder maintenance

This is the operating procedure for keeping Meal Builder maintainable. The product consumes indexed YAML; the large GPT dump is an import/archival artifact only.

## Before editing

1. Read `PROJECT.md`, this module index, `behavior.md`, `data-model.md`, and `sources.md` for a content change. Read `firebase.md` for shared-state changes.
2. Find the stable ID and its active category/index entry. Search the entire repository for references, including Firebase fixtures and tests.
3. Confirm the change is a fact supported by a source or a documented household decision. Do not fill unknown fields with a plausible value.
4. Preserve unrelated records and user work. One record/file per change keeps diffs reviewable and avoids a shared monolithic Markdown merge conflict.

## Add

For an Ingredient:

1. Create the record in the correct `ingredients/<category>.yaml` file with a new lowercase kebab-case stable ID, schema-complete fields, conservative fit/evidence, inventory tracking, and Starter section/order.
2. Add the ID exactly once to the Ingredient category index and update the root manifest's content metadata (`content_version`, `last_updated`) using the repository's established format.

For a Recipe:

1. Create `recipe/<category>/<stable-id>.yaml`; the filename must equal `id`.
2. Use a real cooking structure, not a protein × vegetable × seasoning product. Reference existing Ingredient IDs, `one_of` alternatives, or assumed pantry seasoning; add no synthetic leafy add-on Recipe.
3. Add the ID exactly once to the category index and update root content metadata. Keep status `candidate` until a separate approval decision.

For either record, run the migration-equivalent parity/privacy/schema checks plus the full validation, type check, build, audit, rules, and browser checks. Do not expose a new active record until its index and references validate.

## Update

- Edit only the target YAML record and the necessary index/metadata. Do not rewrite the whole library or reformat unrelated files.
- A display-name change does not rename the stable ID or filename. Treat an ID change as a delete + add with an explicit migration review.
- Update `evidence.checked_on`/`verifiedDate` only after checking the underlying source on that date. File movement, a parser migration, or a new GPT dump is not evidence.
- Preserve `candidate` status, source scope, family constraints, child-coverage uncertainty, and conservative timing/detail level unless the change explicitly resolves them.
- If a Recipe changes required Ingredients, `one_of`, contributions, child coverage, or add-ons, inspect affected ranking, Starter reachability, selected-meal reconciliation, Cook View, and checkout tests.

## Delete and archive

1. First move the record to `src/data/meal-builder/archive/` (preserving its stable ID and a clear category path) and remove it from the active index.
2. Remove active references from Recipes, indexes, fixtures, and documentation. Active data must not reference an archived record.
3. Run the repository-wide stable-ID/privacy/reference audit. Archived IDs remain globally reserved and may not be reused. Existing Firebase household state may contain an archived ID; runtime reconciliation ignores it safely.
4. Keep the archived record through at least one successful deployed version. Physical deletion is a later, separate change only after that deployment and another full reference check.

Do not “delete” a record by hiding it with a UI flag while leaving it active, and do not silently replace it with a differently named record.

## Index and version policy

Root and category indexes define order; do not depend on filesystem order or alphabetical sorting. Every active file must be indexed exactly once, every index entry must resolve to one file, and every filename must match its ID. Update `content_version` and `last_updated` for a data change, but never use the latter as a verification date.

## GPT dumps and imports

ChatGPT exports may be stored as historical dumps under the archive for provenance. They are not parsed by the site, edited as daily source, or used to justify a `verifiedDate`. A deliberate import must be deterministic, produce one-record-per-file YAML and complete indexes, compare old/new records by ID and order, report discrepancies, and pass the full gate before the dump is archived.

## Required checks

At minimum run:

```text
pnpm run validate
pnpm run check
pnpm run build
pnpm run audit
pnpm run test:rules
pnpm run test:browser
```

Also inspect the generated Meal Builder output, privacy scan, active/archive boundaries, known stable IDs, 132/129/162 counts, 23 vegetable structures, seven add-on supports, and Firebase unknown-ID reconciliation when applicable.
