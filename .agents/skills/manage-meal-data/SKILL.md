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
4. Make one complete data transaction according to `data-model.md`.
5. For each added or updated active record, run:

```text
node .agents/skills/manage-meal-data/scripts/meal-data.mjs verify-item <stable-id>
```

6. Run the verification required by the project documentation. For delete/archive work, confirm references and indexes through the applicable validation rather than `verify-item` on a removed active ID.
