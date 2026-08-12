# Vegetable Recipes + Finish-with-Leafy-Vegetable Add-on Design

## Approved scope

Meal Builder v1.5 keeps the 132 Ingredient records and adds 23 deduplicated, candidate Vegetable-centered Recipe records. The public KB therefore contains exactly 132 Ingredients, 129 visible Starter choices, and 162 Recipes. Existing records and stable IDs remain intact. All records remain `candidate`.

The controlled `finish-with-leafy-vegetable` feature is a Recipe add-on, not a synthetic Recipe. It is available only on the seven explicitly compatible stovetop finishing Recipes. `Instant Pot 酱油鸡腿` remains incompatible. Eligible add-on Ingredients are selected by the explicit `finish-wilt-compatible` tag; leafy-vegetable section membership alone is insufficient.

## Data contract

- Recipe `ingredients` entries are either a required `ingredient_id` or required `one_of` alternatives. Pantry seasoning is `availability: assumed` and never creates a Starter requirement.
- `child_coverage.protein` and `.vegetable` accept `true`, `false`, or `ingredient-dependent`.
- Ingredient records may declare `child_coverage.vegetable: true | false | unknown`; `unknown` never satisfies hard Child coverage.
- `meal_addons` contains controlled add-on records with an ID, accepted Ingredient tag, slot contribution, and child coverage. The add-on contributes Vegetable `1` and is persisted beside its selected main Recipe.

## Runtime state and binding

Persist `selectedRecipeIds`, selected Recipe Ingredient bindings, and selected add-ons. A binding records the chosen Ingredient for each required `one_of` group; a single-option group is auto-bound. Removing an Ingredient removes any selected Recipe/add-on that is no longer feasible. Removing a main Recipe removes its add-ons independently and does not remove other selected Recipes.

When a visible candidate has more than one currently available `one_of` alternative, the card renders a compact labeled selector for each such requirement. The selector updates a draft binding used for coverage/ranking and is committed with the selected Recipe. Add-ons with multiple eligible leafy Ingredients likewise render an explicit Ingredient selector; changing that choice records the chosen Ingredient rather than silently taking the first option.

Totals and Child coverage are derived from selected Recipes plus their bound add-ons. Ingredient-dependent coverage is resolved from the binding; unresolved or `unknown` values remain false for hard completion. Candidate ranking uses the existing Protein `+0.5` tolerance and fills current Protein, Vegetable, Staple, and Child gaps.

## Add-on ranking and compatibility

An add-on is considered only when its main Recipe is selected, the selected main Recipe declares that add-on, and a bound/available Ingredient has the required capability tag. Both Recipe-level declaration and Ingredient-level tag are checked. An unselected add-on is shown only while it fills a Vegetable target or resolves an unsatisfied Child Vegetable gap; already-selected add-ons remain visible for independent removal. In V1, a compatible add-on is shown under its selected main Recipe before independent candidates. Dedupe applies only against selected Recipe Ingredient bindings and selected add-ons; independent Vegetable Recipes remain available. Add-on removal is independent.

## Cook View and privacy

Cook View renders the selected Recipe steps and the exact KB discoverable note: precise quantities remain for source or first-cook calibration. It does not invent timing or quantities. Public KB language remains generalized and privacy-safe; no birth details, names, spouse labels, or user-report phrasing is committed.

## Verification

Parser, engine unit tests, Astro checks, production build, registry audit, privacy validation, and browser smoke tests must assert the strict counts, 23 Vegetable records, seven add-on declarations, ingredient-dependent/unknown behavior, persistence bindings, independent removal, and exact Cook View note.
