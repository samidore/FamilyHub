# Meal Builder: extend 香煎菌菇 to every active mushroom

## Goal

Update the existing canonical `pan-seared-mushrooms` Recipe so every active visible Ingredient in the `mushroom` Starter section can use it as a true standalone pan-seared dish.

This is a narrow Meal Builder data change. Do not create eight duplicate Recipes and do not alter unrelated Meal Builder behavior.

Before editing:
1. `git pull --ff-only`
2. Read `AGENTS.md` and `PROJECT.md`.
3. Follow `.agents/skills/manage-meal-data/SKILL.md`.
4. Read `docs/modules/meal-builder/README.md` and only the relevant data-model material.
5. Use the meal-data helper to inspect the current mushroom Ingredients and `pan-seared-mushrooms` before editing.

## Current canonical scope

`src/data/meal-builder/ingredients/mushroom.yaml` currently has these eight active visible mushroom Ingredients:

- `king-oyster-mushrooms` — 杏鲍菇
- `button-cremini-mushrooms` — 口蘑 / Cremini
- `fresh-shiitake` — 鲜香菇
- `oyster-mushrooms` — 平菇
- `shimeji-mushrooms` — 蟹味菇（Shimeji）
- `enoki-mushrooms` — 金针菇
- `maitake` — 舞茸
- `fresh-wood-ear-mushrooms` — 新鲜黑木耳

The existing Recipe `src/data/meal-builder/recipe/vegetable/pan-seared-mushrooms.yaml` is already the canonical generic dish `香煎菌菇`, but its hard `one_of` and `vegetable_ingredient_ids` currently include only 杏鲍菇 and 口蘑/Cremini.

## Required change

Extend this one existing Recipe to support all eight active mushroom Ingredients above.

### Identity / composition

- Keep stable Recipe ID `pan-seared-mushrooms`.
- Keep name `香煎菌菇` unless a tiny wording adjustment is needed for clarity.
- `ingredients` remains one hard `one_of` group, now containing all eight mushroom IDs.
- `vegetable_ingredient_ids` must represent all supported mushroom identities consistently with current data conventions.
- Keep base meal contribution as Vegetable 1 / Protein 0 / Staple 0.
- Keep Child vegetable coverage `false` unless current canonical data provides explicit evidence to change it. Do not infer child acceptance from the Ingredient identity.
- Preserve the existing pan-seared/light/non-spicy/vegetable-centered semantics.

### Cookability

The Recipe must remain genuinely cookable for **each** selectable mushroom, not merely list additional IDs.

Rewrite/extend prep and pan-searing instructions so the single Recipe handles the materially different shapes/textures without unsafe or nonsensical instructions. At minimum account for:

- 杏鲍菇: thick slices/planks; true browned faces.
- 口蘑/Cremini: halves or thick slices; evaporate released water before finishing.
- 鲜香菇: remove tough stem ends as needed, caps halved/thick-sliced; cook until softened and browned.
- 平菇: tear into broad pieces/clusters; avoid overcrowding and drive off moisture.
- 蟹味菇/Shimeji: trim root base, separate clusters; cook until softened, lightly browned, no raw firmness.
- 金针菇: trim root base, separate into small bundles; use a thin layer/small bundles and cook through until limp/tender with browned edges rather than treating it like a thick mushroom steak.
- 舞茸: tear into bite-size fronds/clusters; let edges crisp/brown while centers cook through.
- 新鲜黑木耳: clean/trim, tear or cut into bite-size pieces; **must be thoroughly cooked**. Do not imply a brief surface sear alone is sufficient. Pan-cook until fully hot/tender and moisture has cooked off; browning can be light. Avoid unsafe raw/undercooked language.

Use one practical base seasoning profile consistent with the existing Recipe (neutral oil, light salt, optional light soy is fine). It is acceptable to give mushroom-specific prep/endpoint guidance inside steps/substitutions rather than creating separate Recipes.

Do not invent package/product-specific facts. This is a fresh mushroom cooking Recipe.

### Data quality

- Do not add hard-coded runtime logic or Ingredient-specific UI code.
- Do not add a second generic pan-seared mushroom Recipe.
- Keep the data transaction limited to this Recipe and required metadata/version/index changes only if current repository conventions require them.
- Update root Meal Builder content metadata if required by the current data model for active Recipe changes.

## Validation

Run:

```bash
node .agents/skills/manage-meal-data/scripts/meal-data.mjs verify-item pan-seared-mushrooms
pnpm run verify
```

Also add/adjust a focused data/unit assertion only if existing validation does not already prove the expanded `one_of` resolves every active mushroom ID.

Acceptance:
1. All eight current active mushroom Ingredients are valid hard options for `pan-seared-mushrooms`.
2. Selecting any one of the eight can make the Recipe feasible under the existing one-of binding logic.
3. Recipe remains Vegetable 1 and does not gain Child coverage.
4. Cook View instructions are executable and sensible for all eight, including enoki and fresh wood ear.
5. No duplicate pan-seared mushroom Recipes are created.
6. `verify-item pan-seared-mushrooms` passes.
7. Full `pnpm run verify` passes, or any environmental blocker is reported exactly.

## Completion

- Commit and push the implementation to `main` after validation.
- Delete this handoff file in the final implementation commit so it does not become a permanent parallel source of truth.
