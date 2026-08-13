# Meal Builder Data and Documentation Split

## Goal

Replace `FAMILY_MEAL_KB.md` as the live Ingredient and Recipe source with small, indexed YAML files. Keep the current Meal Builder UI, ranking, Firebase stable-ID protocol, and public-data guarantees unchanged.

## Data architecture

`src/data/meal-builder/index.yaml` is the root manifest. Ingredients live in category files under `ingredients/`; Recipes live one per stable-ID filename under category folders in `recipe/`. Root and category indexes define category and Recipe order explicitly so filesystem traversal cannot change recommendation order.

The shared loader must reject unknown fields, duplicate IDs, missing or extra indexed files, filename/ID mismatches, invalid paths, invalid values, and broken Ingredient references. It returns the existing `mealData` runtime shape. Production parsing must not hard-code current record counts.

Archived Ingredient and Recipe records live under `src/data/meal-builder/archive/`, are excluded from active output, retain globally reserved IDs, and remain subject to schema and privacy validation. Unknown archived IDs already present in Firebase household state are ignored by existing reconciliation behavior.

## Documentation architecture

`PROJECT.md` becomes a concise project entry point. It retains short mandatory project-wide principles, including mobile-first design, privacy, language, units, structured data, and verification, and links to detailed project and module documentation.

Detailed shared rules live under `docs/project/`. Each active page has `docs/modules/<page>/README.md`. Meal Builder additionally indexes separate behavior, data-model, maintenance, source, and Firebase documents.

The former KB moves to `docs/archive/FAMILY_MEAL_KB.dump.md` with a prominent non-authoritative historical warning. Current rules, sources, and decisions are extracted into maintained Meal Builder documentation; historical design specs stay unchanged.

## Maintenance workflow

- Add: create the target YAML record, add it to the appropriate index, update root content metadata, and run full validation.
- Update: edit only the target record. Display-name changes do not rename stable IDs. Verification dates change only after checking underlying facts.
- Delete: first archive the record and remove it from active indexes. Active references must be removed. Physical deletion is allowed only in a later change after one successful deployed version and a repository-wide reference check. Archived IDs may never be reused.

## Acceptance

The migration must prove record-by-record parity with the old source before archiving it: 132 Ingredients, 129 visible Starter choices, 162 Recipes, 23 Vegetable-centered structures, seven controlled leafy-vegetable add-ons, and identical active ordering and parsed runtime fields.

Permanent validation covers schema strictness, manifest completeness, stable ordering, global ID uniqueness, references, archive isolation, privacy, and key Meal Builder invariants. Browser assertions compare rendered counts with active data rather than embedding library totals. The complete repository verification suite must pass without Meal Builder UI or synchronized household-state regressions.
