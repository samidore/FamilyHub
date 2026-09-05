# Goal

Implement the approved Meal Builder Recipes-step selection flow so users can understand each Recipe's composition before selecting it, edit a draft composition, and only commit the Recipe on a second confirmation.

Use the current repository as authority. Read `AGENTS.md`, `PROJECT.md`, `docs/modules/meal-builder/README.md`, and the relevant parts of `docs/modules/meal-builder/behavior.md` before editing.

## Required changes

1. In `src/pages/meal-builder.astro`, candidate Recipe cards must show a compact always-visible composition summary with three concepts derived from canonical Recipe/optional-group data:
   - `必需 Required`: fixed requirements (`requirement.anyOf.length === 1`), showing Ingredient names.
   - `选一 One of`: alternative requirements (`requirement.anyOf.length > 1`), showing the currently draft-bound Ingredient or a compact alternatives summary as appropriate.
   - `可加 Optional`: referenced optional-group labels only in collapsed state; do not dump every optional Ingredient into the candidate card.
   Use `—` when a concept does not exist.

2. Change the candidate action to a two-stage flow:
   - First tap on `选择这道菜` opens an inline editor for that Recipe and creates/uses local draft state only.
   - This first tap MUST NOT add the Recipe to `selectedRecipeIds`, change meal-completion totals, persist the Recipe, or trigger selected-recipe ranking/reuse effects.
   - The inline editor has `取消` and `确认选择`.

3. Inline composition editor:
   - `Required`: display fixed Ingredient(s), not removable.
   - `One of`: render direct pressed/unpressed single-select controls (mobile-friendly chips/buttons), not the current `<select>` UI.
   - `Optional`: render each referenced central optional group as a separate section using `labelZh`; available group members are pressed/unpressed multi-select controls.
   - Plan optional choices are limited to the meal's frozen `availableIngredientIds`, except an already-selected optional remains visible when editing an already-selected Recipe so it can be removed.
   - A hard/one_of-bound Ingredient must not also appear as an optional choice for the same Recipe.
   - Draft edits should update visual state synchronously but must not persist until confirmation.

4. On `确认选择` for an unselected Recipe, atomically persist the Recipe selection plus its current one_of binding(s) and selected optional add-ons (`CurrentMeal.selectedAddons`). Then update totals/ranking normally and close the editor.

5. Selected Recipe panel:
   - Show a compact actual planned composition summary (bound required/one_of Ingredients plus selected optionals) under the Recipe name.
   - Add `编辑` alongside `移除`.
   - `编辑` opens the same inline composition editor populated from persisted Plan state.
   - Edits to an already-selected Recipe remain draft-only until confirmation; `取消` restores persisted state.
   - Confirming an edit persists binding + selectedAddons without removing/re-adding the Recipe.

6. Wire existing state correctly instead of inventing a parallel model:
   - `CurrentMeal` already contains `selectedAddons`; make sure `mealStateFromCurrentMeal()` carries it into `MealState` and persistence writes it back where required.
   - Include `mealData.optionalGroups` in the client payload and use existing helpers/types from `mealEngine` where appropriate (`optionalGroupsForRecipe`, selected optional helpers, etc.).
   - Do not change the Meal Builder data model or YAML schema.

7. Preserve existing behavior:
   - Ranking/freshness semantics and candidate ordering after an actual selection remain unchanged.
   - Ingredient availability snapshot semantics remain unchanged.
   - Cook View and Checkout Plan/Actual semantics remain unchanged except that newly planned optionals now correctly flow through existing `selectedAddons` state.
   - Do not refactor unrelated inventory/Firebase/checkout code.

8. Update `docs/modules/meal-builder/behavior.md` only as needed so `Plan in Recipes` explicitly matches the implemented two-tap draft/confirm interaction and compact candidate composition summary. Do not duplicate rules already present.

## UI constraints

- Mobile-first and compact.
- Candidate collapsed cards should become more informative, not substantially taller from listing every possible optional Ingredient.
- Use the existing visual language/classes where possible; add narrowly scoped CSS only when needed.
- One-of and optional Ingredient choices must be obvious pressed/unpressed controls with adequate tap targets.

## Tests / acceptance criteria

Add or extend focused tests (browser test where interaction is required) proving all of the following:

1. Candidate card visibly exposes Required / One of / Optional summary before selection.
2. First tap opens editor but Recipe is not yet selected and completion totals do not change.
3. Required is immutable, one_of is single-select, optional is multi-select by central group.
4. Canceling a new selection leaves persisted meal state unchanged.
5. Confirming a new selection persists Recipe + bindings + selectedAddons and then affects totals/ranking.
6. Selected Recipe displays planned composition and can be edited; cancel does not persist, confirm does.
7. No bound hard/one_of Ingredient is duplicated as an optional choice.
8. Existing Meal Builder tests continue to pass.

Run focused tests while iterating, then run the project gate:

```bash
pnpm run verify
```

Fix task-caused failures. If an environment-only verification stage cannot run, report the exact blocker and run every preceding/focused check that is available.

## Result

Append a `## Result` section to this file with:

- `Status: PASS / FAIL / BLOCKED`
- files changed
- validation performed and outcome
- any blocker, deviation, or unresolved issue
