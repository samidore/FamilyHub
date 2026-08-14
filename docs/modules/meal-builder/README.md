# Meal Builder

Meal Builder is a dynamic household meal-planning tool. Available ingredients plus meal targets produce live recipe candidates, selected dishes, a Cook View, and a transaction-safe inventory checkout. It is a planning aid, not a nutrition calculator.

## Documentation index

- [`behavior.md`](behavior.md): four-step flow, ranking, child coverage, Cook View, checkout, and household rules.
- [`data-model.md`](data-model.md): YAML layout, stable IDs, schemas, controlled vocabularies, and invariants.
- [`maintenance.md`](maintenance.md): add/update/delete procedure, index policy, validation, and GPT-dump handling.
- [`sources.md`](sources.md): evidence levels, source registry policy, verification dates, and retained research decisions.
- [`firebase.md`](firebase.md): Google sign-in, Realtime Database membership, shared state, repository variables, and rules verification.

Read `behavior.md` before changing UI or ranking, `data-model.md` before changing YAML/schema/loader code, and `maintenance.md` before changing any record or index.

## Live data layout

The build source is the indexed YAML tree under `src/data/meal-builder/`:

```text
index.yaml
ingredients/
  index.yaml
  <ingredient-category>.yaml
recipe/
  index.yaml
  <recipe-category>/
    index.yaml
    <stable-id>.yaml
archive/
  ingredients/
  recipe/
```

Each recipe has one file. Category indexes and the root index are explicit; filesystem traversal never determines display or recommendation order. `docs/archive/FAMILY_MEAL_KB.dump.md` is a read-only historical GPT dump and is not loaded by the product.

## Current invariants

- 134 Ingredient records; 131 visible non-pantry Starter choices; 163 candidate Recipes.
- All active records retain their stable lowercase kebab-case IDs and remain `candidate`; no automatic approval.
- 23 Ingredients carry the checkout-only `easy-braise-addon` capability and 36 Recipes carry `iron-pan-braise`. This pairing does not affect planning or Cook View; pure Instant Pot/Sauté-only routes are excluded.
- Recipe availability comes only from Ingredient IDs and `one_of` alternatives in `ingredients[]`. Pantry items appear only as Cook View text and are not tracked. Starter selection means “available this meal,” not “must use.”
- Public data contains recipe/ingredient facts only. Shared Firebase state contains stable IDs and household operating state, never private family profile data or a second recipe library.
