# Meal Builder `加点油水` reference repair

## Goal

Repair the remaining semantic regression after commit `12204613980ca009ce6cf1a09ca720366b064934`: the central `add-some-richness` group membership is correct, but its Recipe reference scope was incorrectly narrowed to only `simple-stir-fried-leafy-greens`.

Use **Luna max**. Read root `AGENTS.md`, `PROJECT.md`, the current Meal Builder docs/data/tests, and the two prior consolidation handoffs/results only as needed. Work from the current repo.

## Authoritative product meaning

`add-some-richness` / `加点油水` is a broad household composition option meaning: **add another protein component to this dish/meal when useful**. It is not limited to literal stir-ins, quick stir-fries, or small cuts.

The cook will handle practical preparation. This is a private household menu board, not a cooking compatibility engine.

Therefore:

- preserve the current `add-some-richness` member list exactly unless an actual canonical data error is found;
- in particular, keep `whole-pork-tenderloin` and `pork-chops`;
- do not narrow compatibility based on cut size/form;
- do not add a fifth Option group or Recipe-specific allow-list.

## Required repair

The current audit assertion incorrectly enforces that only `simple-stir-fried-leafy-greens` references `add-some-richness`. Remove that restriction and restore/use this option on protein-light tofu / vegetable / soup structures where adding another protein component is naturally useful.

At minimum review and repair these active Recipes:

1. `recipe/vegetable/simple-stir-fried-leafy-greens.yaml`
   - already correctly references `add-some-richness`; preserve it.

2. `recipe/egg-tofu/basic-egg-drop-soup.yaml`
   - this can become a tomato soup through `change-it-up`, and household intent explicitly allows adding meat/protein to such soup;
   - add `add-some-richness` alongside the existing tomato/soup options;
   - keep Finish inventory-neutral (there should be no tomato Finish).

3. `recipe/egg-tofu/homestyle-tofu-family.yaml`
   - add `add-some-richness` alongside `one-pot-mix`; household tofu dishes may receive an extra protein component;
   - do not re-add pressed tofu to the main tofu `one_of`.

4. `recipe/vegetable/shepherds-purse-soft-tofu-soup.yaml`
   - this protein-light vegetable/tofu soup should support `add-some-richness`;
   - model its optional tofu through the existing `soup-addons` composition path rather than leaving optional tofu only as free-text cook guidance;
   - keep frozen shepherd's purse as the hard vegetable identity.

Audit other active protein-light **vegetable / tofu / soup** Recipes for the same household behavior, but do not mechanically attach `add-some-richness` to already meat-centered Recipes or to dishes where another protein component would clearly change the dish identity.

The goal is representative broad household use, not exhaustive compatibility whitelisting.

## Tests / audit

- Remove/replace the current audit invariant that `add-some-richness` must be referenced by only `simple-stir-fried-leafy-greens`.
- Add a stable semantic assertion that the canonical representative structures above reference it where appropriate.
- Keep tests asserting that `whole-pork-tenderloin`, `pork-chops`, and the other intentional central members remain in the group.
- Ensure overlapping Option groups still dedupe correctly and contributions remain unchanged.
- Do not change active Recipe count solely for this repair.

Run focused tests plus:

- `pnpm run validate`
- `pnpm run check`
- `pnpm run build`
- `pnpm run audit`
- `pnpm run test:unit`
- `pnpm run test:browser`
- `pnpm run verify`

If `pnpm run verify` is blocked only because the environment cannot spawn Java for Firebase Rules, report that exact existing environment blocker after all other available gates pass.

## Result

Append only:

- `Status: PASS / FAIL / BLOCKED`;
- Recipes that now reference `add-some-richness` as the representative intended set;
- explicit confirmation that `whole-pork-tenderloin` and `pork-chops` remain members;
- validation outcome and any remaining material deviation;
- existing archived-ID deployment guard if still applicable.
