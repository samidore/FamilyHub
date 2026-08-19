# Meal Builder

Meal Builder is a dynamic household meal-planning tool. Available ingredients plus meal targets produce live recipe candidates, selected dishes, a Cook View, and a transaction-safe inventory checkout. It is a planning aid, not a nutrition calculator.

## Documentation

- [`behavior.md`](behavior.md): four-step flow, ranking, child coverage, Cook View, checkout, and household rules.
- [`data-model.md`](data-model.md): YAML layout, schemas, stable IDs, indexes, controlled values, and Recipe/Ingredient data-change transactions.
- [`sources.md`](sources.md): evidence levels, source policy, verification dates, and retained research decisions.
- [`firebase.md`](firebase.md): Google sign-in, Realtime Database membership, shared state, repository variables, and rules verification.

Read only what the change needs: `behavior.md` for UI or meal logic, `data-model.md` for YAML/records/indexes/loaders, `sources.md` for evidence work, and `firebase.md` for shared state.

## Data source

Active Meal Builder data is the indexed YAML tree under `src/data/meal-builder/`. Indexes define active membership and order; filesystem traversal does not. Historical material under `docs/archive/` is not a build source.
