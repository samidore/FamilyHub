# Meal Builder Option -> Checkout state repair

## Goal

Fix the production bug where an Optional ingredient selected in the Recipe-plan UI can disappear before Checkout, so Checkout does not automatically show the planned add-on.

The intended contract is already established and must remain unchanged:

- Recipe-plan Optional choices are persisted in `CurrentMeal.selectedAddons`.
- Cook reflects those planned Optional choices.
- Direct Checkout and queued Checkout initialize Actual composition from the planned Optional choices.
- Checkout remains editable Actual truth.
- Do not change Recipe data, Option-group membership, contribution semantics, or the recent Recipe consolidation.

Use Luna max.

## Confirmed root cause

`src/components/MealBuilderRecipeSelectionEnhancements.astro` and the Checkout enhancement paths use the canonical `optionalGroups` data, but the legacy/main client script in `src/pages/meal-builder.astro` still creates an incomplete client Recipe payload and calls state reconciliation without `optionalGroups`.

Current relevant behavior:

- `reconcileMealState(input, recipes, ingredients, optionalGroups)` validates `selectedAddons` against Recipe optional groups.
- If `optionalGroups` is omitted, its default is `[]`; planned Option add-ons can therefore be treated as invalid and removed.
- `reconcileCurrentMeal(..., recipes, ingredients, optionalGroups)` ultimately has the same requirement.
- `meal-builder.astro` currently has calls such as `reconcileMealState(..., recipes, ingredients)` and `reconcileCurrentMeal(..., recipes, ingredients)` in legacy page-state / resnapshot / selection paths.
- The page client payload currently does not provide the full Option-group context needed by those calls.
- The newer composition/checkout enhancement already contains the correct default checkout behavior: `defaultCheckoutRecipeDrafts()` copies valid planned `selectedAddons` into `optionalAddons` and their consumption rows. Do not paper over this by adding a Checkout-only workaround.

This means the fix must unify the old page reconciliation context rather than special-case a particular Ingredient.

## Required implementation

1. In `src/pages/meal-builder.astro`, extend the client bootstrap payload and client `Payload` typing so the main page script has the canonical Meal Builder `optionalGroups` and each Recipe has the `optionalGroupIds` needed by `MealRecipe` reconciliation.
   - Derive from `mealData`; do not duplicate Option definitions.
   - Keep the payload minimal but semantically complete for all state functions used by this page.

2. In the main page client script, use that canonical `optionalGroups` everywhere reconciliation can validate or rewrite Meal composition state.
   - Audit every `reconcileMealState(...)` call in `src/pages/meal-builder.astro`.
   - Audit every `reconcileCurrentMeal(...)` call in `src/pages/meal-builder.astro`.
   - Any path that can receive/preserve `selectedAddons` must pass `optionalGroups`.
   - Pay particular attention to initialization/session compatibility state, repository subscription state, `persistMeal`, `resnapshotMeal`, step transitions, legacy selection/removal/binding paths, and returning from inventory/recipes/cook/checkout.
   - Do not change behavior unrelated to Option preservation.

3. Audit the other Meal Builder client components for the same omission pattern, especially paths that resnapshot, queue, or reconcile an existing meal.
   - `MealBuilderRecipeSelectionEnhancements.astro`
   - `MealBuilderCompositionEnhancements.astro`
   - `MealBuilderCheckoutQueueEnhancements.astro`
   - any other Meal Builder component that calls `reconcileMealState` or `reconcileCurrentMeal`
   Fix only genuine omissions. Existing callers that already pass `optionalGroups` should be left alone.

4. Preserve the existing checkout contract.
   - Do not make Checkout reconstruct planned Options heuristically from names or inventory.
   - The source of truth is persisted `selectedAddons`.
   - `defaultCheckoutRecipeDrafts()` / queued checkout should continue to initialize Actual Option selections from that state.
   - Do not change Option membership, Recipe YAML, Finish, Serving, Child coverage, Meal contribution, or inventory checkout units.

5. Add regression coverage that proves the user-visible flow, not only helper behavior.

   Direct Checkout regression:
   - start a Meal with inventory sufficient for a Recipe and one of its Optional ingredients;
   - select the Recipe through the current plan-draft UI;
   - select an Optional add-on (prefer a stable representative such as `ground-pork` through `add-some-richness` on a Recipe that currently supports it, e.g. `basic-egg-drop-soup`, unless current canonical data makes another representative cleaner);
   - confirm the Recipe plan;
   - transition through Cook to Checkout using the real page controls;
   - assert the same Optional ingredient is automatically selected/present in the Checkout Actual composition without the user selecting it a second time;
   - assert an Actual consumption control/row exists for it according to its inventory tracking.

   Queued Checkout regression:
   - repeat through the real queue flow (`排队结算` / pending checkout path);
   - assert the queued meal preserves the planned Optional and queued Checkout automatically initializes it as selected/present.

   The regression should fail against the broken behavior where legacy reconciliation drops `selectedAddons`.

6. If the tests reveal a second independent state-loss path, fix it in the same task, but keep the change scoped to Option-plan persistence into Cook/Checkout. Do not redesign Meal Builder.

## Important constraints

- `samidore/FamilyHub` is canonical; read root `AGENTS.md` and `PROJECT.md` before editing.
- Follow task-relevant Meal Builder docs and existing conventions.
- This is a state/reconciliation integration fix, not a Recipe/data migration.
- Do not alter the four central Option primitives or their memberships.
- In particular, preserve `add-some-richness` semantics and intentional members such as `whole-pork-tenderloin` and `pork-chops`.
- Do not remove or narrow Optional choices as a workaround.
- Do not add a second persistent source of truth for planned add-ons.
- Keep changes minimal and task-scoped.
- `database-debug.log` may be locally generated/untracked; do not add, modify, or commit it.

## Validation

During work, run focused tests for the affected state/reconcile helpers and the new browser regressions.

Before completion run:

- `pnpm run validate`
- `pnpm run check`
- `pnpm run build`
- `pnpm run audit`
- `pnpm run test:unit`
- relevant browser tests, then `pnpm run test:browser`
- `pnpm run verify`

If the full verify again reaches Firebase Rules and fails only because the local environment cannot spawn Java, report that exact environment blocker; do not disguise it as a product failure. All other task-caused failures must be fixed.

## Result

Append only:

- `Status: PASS / FAIL / BLOCKED`;
- concise root-cause/fix summary;
- direct Checkout regression result;
- queued Checkout regression result;
- validation outcome and any remaining material deviation.
