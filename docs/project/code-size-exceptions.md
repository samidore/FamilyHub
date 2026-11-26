# Existing UI size exceptions

The shared `Protocols/tools/check_size.py` currently checks Python only. These pre-existing TypeScript/Astro/CSS entry points exceed 400 file lines or 80 function lines. They remain exceptions during the UX implementation to preserve task scope; new UI helpers are separate, smaller modules.

| Path | Reason and split boundary for a future structural change |
| --- | --- |
| `src/components/MealBuilderInventoryLayoutEnhancements.astro` | Existing storage/view DOM enhancement entry points; split storage blocks from view navigation. |
| `src/components/MealBuilderNavigationEnhancements.astro` | Existing navigation setup spans several folds; split account chrome, targets, and ingredient folds. |
| `src/components/MealBuilderRecipeSelectionEnhancements.astro` | Existing draft editor and confirmation transaction are large; split draft rendering from persistence. |
| `src/pages/meal-builder.astro` | Existing page combines public catalog markup and runtime orchestration; split inventory, recipe, and cooking controllers. |
| `src/lib/notebookDeveloperUi.ts` | Existing mount coordinates patch validation and application; split the patch panel from page authentication. |
| `src/lib/notebookItemUi.ts` | Existing editor/setup and delegated handlers are large; split item editor, comments, and reorder handlers. |
| `src/lib/notebookUi.ts` | Existing mount owns page lifecycle; split rendering and source subscriptions. |
| `src/styles/global.css` | Existing shared layout and Meal Builder styles share one file; move Meal Builder base styles to their own sheet. |
| `tests/family-hub.spec.ts` | Existing integration suite spans modules; split tests by module when test organization is next changed. |
