# Day Trips binary constraints + Great Swamp

## Goal

Implement the Day Trips filter model confirmed with the user:

- activity tags answer **“what do we want to do?”**
- compact two-state constraint pills answer **“what requirements must the usable sub-location satisfy?”**
- apply ordinary constraints to sub-locations first, then re-check whether surviving sub-locations still satisfy the selected activity
- `麦不上天` is the one special destination-level exclusion

Also add Great Swamp National Wildlife Refuge — Wildlife Observation Center as a concrete nearby record using current official evidence.

Do not refactor unrelated FamilyHub modules.

## Read first

1. `AGENTS.md`
2. `PROJECT.md`
3. `Protocols/protocols/chatgpt-codex.md`
4. Current Day Trips implementation/data/tests, especially:
   - `src/pages/day-trips.astro`
   - `src/modules/day-trips/DayTripCard.astro`
   - `src/data/day-trips.json`
   - `src/data/dayTripSchema.mjs`
   - `src/data/types.ts`
   - `src/data/catalog.ts`
   - `tests/day-trip-coverage.test.mjs`
   - relevant Day Trips/list-state tests

Preserve current reactions/comments, parking, weather, Open Now, sorting, search, and list-state behavior.

## UI model

### Activity group: `想玩什么`

This group contains only genuine activities. Keep existing multi-select OR semantics.

Examples:

- `森系遛猫` / `woody-walk`
- `麦攀爬` / `playground`
- indoor visit
- animals
- water play
- pick-your-own

Remove `麦不上天` / `no-playground` from this activity group and from ordinary activity-tag presentation.

### Compact binary constraint group

Add one visually compact tag/pill-style group, e.g. `限制`, with all controls OFF by default:

- `麦不上天`
- `步道无自行车`
- `Stroller 可用`

Each is strictly two-state:

- OFF = do not filter on this property
- ON = enforce this requirement

Move Stroller out of its current select/dropdown into this pill group.

Keep `Open Now` as its existing separate control unless a tiny layout adjustment is required. Do not broaden this into a general filter redesign.

Persist and restore the new controls through the existing `listState` mechanism. Clear Filters resets all three to OFF.

Do not add select-all/select-none behavior to the constraint group; OFF is the natural default.

## Exact filter semantics

The crucial rule is:

> ordinary constraints remove unusable sub-locations first; selected activities are evaluated only against what survives.

For each destination:

1. Apply destination-level checks already in the page, such as drive-time and search.
2. If `麦不上天` is ON, inspect the destination's original locations. If **any** location has the `playground` tag, reject the whole destination immediately.
3. Start from all original locations.
4. Apply existing location-level filters plus the new ordinary binary constraints:
   - weather
   - indoor/outdoor
   - Stroller when ON: keep only `location.stroller === true`
   - Open Now
   - `步道无自行车` when ON: keep only locations explicitly verified as bicycle-prohibited / bike-free
5. If no locations survive, reject the destination.
6. Compute available activity tags only from the surviving locations.
7. Show the destination if at least one selected real activity tag exists among the surviving locations.

### Required behavior examples

Cover these with focused tests:

1. Destination has:
   - bike-allowed paved `woody-walk`
   - bike-prohibited playground

   Filter: `步道无自行车 + 森系遛猫`

   => **FAIL**. The surviving playground must not make the destination satisfy `woody-walk`.

2. Destination has:
   - bike-allowed paved route
   - separate bike-prohibited `woody-walk`

   Filter: `步道无自行车 + 森系遛猫`

   => **PASS**.

3. Destination has any playground anywhere.

   Filter: `麦不上天`

   => **FAIL whole destination**, even if some other filter would later remove that playground sub-location.

4. Stroller OFF => no stroller restriction.

   Stroller ON => remove non-stroller sub-locations first, then re-check selected activities.

5. Unknown bicycle status must never pass `步道无自行车`.

If a small pure matcher/helper makes these semantics easy to test without fragile DOM tests, extract one narrowly scoped helper. Do not over-refactor.

## Bicycle data model

Bicycle access is a location-level fact, not a destination-level tag.

Use an explicit validated enum rather than a boolean, preferably:

```ts
bicycleAccess: 'prohibited' | 'allowed' | 'unknown'
```

Equivalent repo-consistent naming is acceptable, but semantics must remain explicit.

Requirements:

- schema/types reject invalid values
- `步道无自行车` passes only explicit `prohibited`
- `unknown` must not be treated as safe
- if migration requires all locations to carry the field, `unknown` is an acceptable default
- audit current outdoor walking locations, especially `woody-walk`, against current official park/trail rules where practical
- record `allowed` or `prohibited` only when evidence supports it; otherwise keep `unknown`
- do not create a parallel Day Trips data store for bicycle rules

The intended model is route/sub-location based. A large destination may contain a bike-shared paved path and a separate foot-only trail; the destination remains eligible if the foot-only surviving location still satisfies the desired activity.

## Great Swamp record

Add a practical record for:

**Great Swamp National Wildlife Refuge — Wildlife Observation Center**

Use current official U.S. Fish & Wildlife Service evidence. Current sources verified on 2026-09-03:

- `https://www.fws.gov/refuge/great-swamp`
- `https://www.fws.gov/refuge/great-swamp/visit-us`
- `https://www.fws.gov/refuge/great-swamp/what-we-do/laws-regulations`

Official facts to preserve:

- Wildlife Observation Center address: **220 Long Hill Road, Harding Township, NJ 07976**
- approximately **1.5 miles of boardwalks and trails**
- informational kiosk, wildlife observation blinds, restrooms
- refuge trails are for foot travel; biking/rollerblading are not allowed on refuge trails
- Pleasant Plains Road can allow biking, but that is not the WOC trail location
- therefore the WOC trail location is explicit bicycle `prohibited` / bike-free for this filter
- public areas are generally open sunrise to sunset, subject to closures; follow current Day Trips trail-hours conventions rather than inventing fixed clock times
- **pets are not allowed on refuge trails or WOC boardwalks**; surface this as a prominent compact notice

Use a concrete Google Maps destination for the Wildlife Observation Center, not the broad refuge centroid.

### Great Swamp activity caution

Current UI label `森系遛猫` maps to `woody-walk`, but Great Swamp officially prohibits pets.

Do not imply pet compatibility.

- If current repo semantics clearly establish that `woody-walk` is only playful wording for a wooded family walk and does not mean an actual pet may accompany the user, the tag may be used if the physical route qualifies.
- Otherwise omit `woody-walk` for this record and use only truthful activities such as wildlife/animals.

For Stroller, do not infer a blanket true value merely from boardwalk/flat-looking descriptions. Use current Day Trips evidence standards; if not confidently established, keep it false/unknown according to the existing model rather than fabricate compatibility.

### Drive time

Use the current project’s established Google Maps origin/policy if available in the execution environment.

Never persist a private household origin in repo data, logs, handoff result, or commit messages.

If the required origin cannot be resolved, do not invent a minute count. Use the repo-supported explicit unknown state (`driveMinutes: null` plus aligned provenance) rather than blocking the filter work.

If an existing test incorrectly hard-codes all records to the historical 2026-08-30 check date, repair that test so new records can carry honest current provenance without weakening source/status validation.

## Acceptance

Verify all of the following:

1. `想玩什么` contains only genuine activities.
2. `麦不上天`, `步道无自行车`, and `Stroller 可用` are compact two-state pills, OFF by default.
3. `麦不上天` rejects the whole destination if any original sub-location is a playground.
4. Stroller and bicycle constraints operate at sub-location level before activity matching.
5. Unknown bicycle access never passes the bike-free filter.
6. Activity select-all/select-none still works for genuine activities only.
7. Clear Filters resets the new constraints to OFF.
8. List-state persistence restores the new constraint states.
9. Great Swamp WOC exists once as a concrete access destination with official-source facts and explicit bicycle-prohibited trail status.
10. Great Swamp does not imply pet compatibility.
11. No unrelated module changes.

Run focused Day Trips tests plus the repository-required checks from current `AGENTS.md` / `PROJECT.md`, including at minimum:

```bash
pnpm run validate
pnpm run check
pnpm run build
pnpm run test:unit
pnpm run verify
```

If Java/Firebase rules remain an environment blocker, run every other applicable check and report the exact blocker. Do not claim PASS for commands that did not run.

Append `## Result` to this same handoff with only Status, validation outcome, and blocker/deviation if any. Keep commits task-scoped and push the implementation.

## Result

Status: BLOCKED

Validation outcome: `pnpm run validate`, `pnpm run check`, `pnpm run build`, `pnpm run audit`, and all 191 unit tests passed. Focused Day Trips tests passed. Browser tests passed 37/38; the single failure is the unrelated existing Meal Builder navigation mobile-layout assertion.

Blocker/deviation: `pnpm run verify` reached the Firebase rules stage but could not run because Java is unavailable (`Could not spawn java -version`).
