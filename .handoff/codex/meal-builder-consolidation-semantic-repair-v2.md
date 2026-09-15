# Meal Builder consolidation semantic repair v2

This task **supersedes** `.handoff/codex/meal-builder-consolidation-semantic-repair.md`. Execute the prior semantic-repair task in full, but apply the authoritative correction below wherever it conflicts with the prior handoff or the original consolidation handoff.

## Authoritative user correction: `add-some-richness`

Do **not** narrow `add-some-richness` based on meat cut size, whole-cut form, or the idea that an optional add-on must literally be a small chopped ingredient.

The household intentionally designed `加点油水` as a broad composition option meaning roughly: **add another protein component to this meal/dish when useful**. The cook will decide the practical preparation at cooking time. This is a private household menu board, not a cooking-rule engine.

Therefore:

- preserve intentional members such as `whole-pork-tenderloin` and `pork-chops` in `add-some-richness`;
- do not remove a member merely because it is a whole cut, pork chop, larger piece, or would require slicing/cutting/cooking separately;
- do not infer a stricter compatibility whitelist from ingredient physical form;
- only remove an `add-some-richness` member if it is actually erroneous for another canonical reason (wrong Ingredient identity, duplicate/broken reference, inconsistent contribution/checkout contract, etc.), not because it looks too large or unlike a conventional stir-in;
- keep the shared contribution semantics consistent with the current group contract.

This correction specifically overrides the prior semantic-repair sentence that said to remove/review `pork-chops` or other large/whole forms as potentially implausible add-ins.

## Everything else

Follow `.handoff/codex/meal-builder-consolidation-semantic-repair.md` for the full semantic repair scope, including:

- Finish must remain inventory-neutral and must not stand in for tomato/mushroom/broccoli/etc.;
- genericized `one_of` Recipes need truly shared names, cook ingredients, and executable steps;
- finish-specific sauce must not leak into shared core;
- retired variants must not remain accidentally hard-required (e.g. generic rib soup must not require winter melon);
- Option-group references must match the actual cooking interface, but **do not apply that rule by pruning intentional `add-some-richness` whole-cut members**;
- contribution/role semantics must be truthful;
- tough-meat cores should use the agreed household Instant Pot -> finish/reduction route where applicable;
- homestyle tofu should not become a dumping ground;
- keep the Plan UI compact;
- audit all consolidation-changed active Recipes, not only named examples;
- run the full requested validation. If Firebase emulator remains blocked only because Java cannot spawn, report that exact environment blocker after all other gates.

## Result

Append only:

- `Status: PASS / FAIL / BLOCKED`;
- concise semantic-repair summary;
- explicit confirmation that intentional `add-some-richness` whole-cut members (including `whole-pork-tenderloin` and `pork-chops`) were preserved;
- validation outcome and any remaining material deviation;
- existing deployment guard about current/pending meals referencing archived Recipe IDs.

## Result

Status: BLOCKED

Semantic repair completed across 20 consolidation-changed active Recipes. Finish choices are inventory-neutral; genericized one_of bases now have shared names, cook lines, and executable steps; tomato/mushroom/broccoli variants were moved out of Finish; quick stir-fries no longer expose one-pot-mix; soup-addons now include tofu, mushrooms, and leafy vegetables; rib soup no longer hard-requires winter melon; applicable tough-meat routes use Instant Pot-to-finish/reduction; and homestyle tofu excludes pressed-tofu.

Intentional `add-some-richness` whole-cut members, including `whole-pork-tenderloin` and `pork-chops`, were preserved with the existing contribution and checkout contract.

Validation: `pnpm run validate`, `pnpm run check`, `pnpm run build`, `pnpm run audit`, `pnpm run test:unit`, the semantic audit, all 20 per-record `verify-item` checks, and the full browser suite (`49 passed`) passed. `pnpm run verify` reached Firebase Rules but is blocked because Java cannot spawn (`Could not spawn \`java -version\``); this is the only remaining material environment deviation.

Deployment guard: before deploying the archived-ID cutover, complete or reset any real `currentMeal` or `pendingCheckoutMeals` that still reference Recipes archived by the consolidation.
