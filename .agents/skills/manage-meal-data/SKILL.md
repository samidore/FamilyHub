---
name: manage-meal-data
description: Add, update, inspect, rename, archive, or remove FamilyHub Meal Builder Recipe and Ingredient data.
---

# Manage Meal Data

Use this skill for Recipe and Ingredient data tasks under `src/data/meal-builder/`.

1. Read `docs/modules/meal-builder/README.md`, then only the module documentation relevant to the change.
2. Before editing, use the repository helper as applicable:

```text
node .agents/skills/manage-meal-data/scripts/meal-data.mjs inspect "<name-or-id>"
node .agents/skills/manage-meal-data/scripts/meal-data.mjs references <stable-id>
node .agents/skills/manage-meal-data/scripts/meal-data.mjs next-order ingredient|recipe <category>
```

3. Review semantic duplicates yourself; helper matches are discovery only.
4. For Finish work, use the Finish expansion families in `data-model.md` as an authoring/discovery reference:
   - When the user names or adds a meat dish, identify its cooking path and protein form, then surface plausible Finish directions from the relevant family when that would help expand the Recipe.
   - Families are suggestions, not runtime inheritance. Add only the Finish choices that actually suit that Recipe.
   - Keep every Finish Recipe-local. The Recipe default must have a natural `name_zh`; every non-default Finish that changes the dish identity must have its own explicit, natural `display_name_zh`. Never generate a dish name mechanically from protein + Finish labels.
   - Adapt ingredients, quantities, timing, and steps to the actual Recipe even when the flavor direction is shared.
5. Make one complete data transaction according to `data-model.md`.
6. For each added or updated active record, run:

```text
node .agents/skills/manage-meal-data/scripts/meal-data.mjs verify-item <stable-id>
```

7. Run the verification required by the project documentation. For delete/archive work, confirm references and indexes through the applicable validation rather than `verify-item` on a removed active ID.
