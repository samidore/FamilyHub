# Day Trips binary constraints + Great Swamp

## Goal

Fix Day Trips filtering so **activity tags** answer “what do we want to do?” while small binary controls answer “what constraints must the usable sub-location satisfy?”. Add Great Swamp National Wildlife Refuge — Wildlife Observation Center as a concrete nearby destination using current official evidence.

This task is one coherent behavior/data change. Do not refactor unrelated FamilyHub modules.

## Read first

1. `AGENTS.md`
2. `PROJECT.md`
3. Current Day Trips implementation/data/tests, especially:
   - `src/pages/day-trips.astro`
   - `src/modules/day-trips/DayTripCard.astro`
   - `src/data/day-trips.json`
   - `src/data/dayTripSchema.mjs`
   - `src/data/types.ts`
   - `src/data/catalog.ts`
   - `tests/day-trip-coverage.test.mjs`
   - relevant browser/unit tests for Day Trips/list-state persistence

Preserve current reactions/comments, parking, weather, Open Now, sorting, search, and list-state behavior.

## Required UI model

### 1. `麦不上天` is NOT an activity tag

Remove `no-playground` from the `想玩什么` activity selector and from the ordinary activity-tag presentation.

`想玩什么` should contain only real stored activity tags such as:

- `森系遛猫` / `woody-walk`
- `麦攀爬` / `playground`
- `室内赶鸡`
- `动物园`
- `玩水`
- `摘棉花`

Keep current multi-select semantics for these activity tags: the destination may satisfy **any selected activity**, but only through a sub-location that survives all active location-level constraints.

### 2. Add one compact tag-style binary-constraint group

Create a visually compact fieldset/group (for example `限制`) containing toggle/pill buttons, all OFF by default:

- `麦不上天`
- `无自行车`
- `Stroller`

These are two-state controls only:

- OFF = do not filter on that property.
- ON = enforce that requirement.

Move Stroller out of its current `<select>` and into this group. Keep `Open Now` as its existing separate control unless a very small layout adjustment is required; do not broaden this task into a filter redesign.

Persist/restore these toggles through the existing `listState` mechanism, including Clear Filters behavior.

## Exact filter semantics

The crucial model is: **apply restrictions first to sub-locations, then ask whether the remaining sub-locations still satisfy the selected activity.**

For each destination:

1. Apply destination-level checks such as drive time and search.
2. If `麦不上天` is ON, reject the **entire destination** if any original location has the `playground` tag. This is the one special destination-level constraint.
3. Start with all original `locations`.
4. Apply location-level constraints to produce `surviving` locations:
   - weather
   - indoor/outdoor
   - Stroller when ON: keep only `location.stroller === true`
   - Open Now
   - `无自行车` when ON: keep only locations whose bicycle status is explicitly verified as bicycle-prohibited / bike-free under the schema chosen below
5. If no locations survive, reject the destination.
6. Compute activity tags **only from surviving locations**.
7. Show the destination only if at least one selected real activity tag is present among those surviving locations.

Important examples that must be covered by tests:

- A destination has a bike-allowed paved `woody-walk` plus a bike-prohibited playground. `无自行车 + 森系遛猫` => **FAIL**. The playground surviving must not make the destination satisfy `woody-walk`.
- A destination has a bike-allowed paved path plus a separate bike-prohibited `woody-walk`. `无自行车 + 森系遛猫` => **PASS**.
- A destination has any playground anywhere. `麦不上天` => **FAIL the whole destination**, even if the playground would have been removed by another location filter.
- Stroller OFF => no stroller restriction. Stroller ON => filter sub-locations first, then re-check selected activities.
- Unknown bicycle status must **never** pass `无自行车`.

If extracting a small pure matcher/helper makes these semantics testable without fragile DOM tests, do so; keep the refactor narrowly scoped.

## Bicycle data model

Add a typed/validated location-level bicycle-access field. Prefer an explicit enum such as:

```ts
bicycleAccess: 'prohibited' | 'allowed' | 'unknown'
```

Naming may differ slightly if there is a clear repo convention, but semantics must remain explicit. Do not use a bare boolean if it would collapse “unknown” into “allowed” or “safe”.

Requirements:

- Schema/types must reject invalid values.
- The `无自行车` filter passes only explicit `prohibited` (or the equivalent verified bike-free state).
- Never infer unknown locations as safe.
- Audit current **outdoor locations relevant to walking/outdoor activity, especially every `woody-walk` location**, against current official park/trail rules where practical. Record `allowed` or `prohibited` only when evidence supports it; otherwise record `unknown`.
- If the chosen schema requires the field on all locations, mechanical migration to `unknown` is acceptable. Do not fabricate facts just to avoid `unknown`.
- Do not create a separate parallel Day Trips data store merely for bicycle rules.

The user’s intended safety behavior is route/sub-location based: a large park may contain a bike-shared paved path and a separate foot-only trail. The destination should remain usable when the foot-only surviving location still satisfies the desired activity.

## Great Swamp destination

Add a distinct practical parking/access record for:

**Great Swamp National Wildlife Refuge — Wildlife Observation Center**

Current official evidence verified by ChatGPT on 2026-09-03:

- U.S. Fish & Wildlife Service refuge page: `https://www.fws.gov/refuge/great-swamp`
- Visit page: `https://www.fws.gov/refuge/great-swamp/visit-us`
- Regulations: `https://www.fws.gov/refuge/great-swamp/what-we-do/laws-regulations`
- Wildlife Observation Center address stated by FWS: **220 Long Hill Road, Harding Township, NJ 07976**.
- FWS states the WOC has approximately **1.5 miles of boardwalks and trails**, an informational kiosk, wildlife-observation blinds, and restrooms.
- FWS rules state refuge **trails are open to foot travel only**; biking/rollerblading are not allowed on refuge trails. Biking is allowed on Pleasant Plains Road, not on the WOC trails. Therefore the WOC trail location is explicit bicycle `prohibited` / bike-free for the new filter.
- Refuge public areas are open year-round from sunrise to sunset, subject to closures. Follow the current Day Trips convention for trail hours rather than inventing fixed sunrise/sunset times.
- Current FWS 2026 material lists the Wildlife Observation Center among areas open to non-hunters only.
- Important: FWS explicitly says **pets are not allowed on refuge trails or WOC boardwalks**. Preserve this as a prominent compact `notice` so the UI does not imply pet access.

Use a concrete Google Maps destination for the WOC, not the broad refuge centroid.

### Activity-tag caution

The current UI label `森系遛猫` maps to `woody-walk`, while FWS prohibits pets at Great Swamp WOC. Do **not** silently present Great Swamp as pet-compatible.

- If current repo semantics/documentation establishes that `woody-walk` is only a playful label for a wooded family walk and does **not** imply an actual pet may come, `woody-walk` may be used for the WOC if the physical route otherwise qualifies.
- If that semantic cannot be established, omit `woody-walk` for this destination and keep a truthful activity such as `animals` / wildlife observation. Do not guess away the official pet restriction.

Stroller: official materials describe the WOC as boardwalk/stone-dust trails and largely flat/limited-incline, but do not treat that alone as a blanket accessibility promise. Use current Day Trips evidence standards; if stroller usability cannot be established confidently, do not invent it.

### Drive time

Use the current Day Trips Google Maps drive-time policy/origin already established by the project if it is available in the execution environment. Never persist a private household origin in the repo, logs, handoff result, or commit message.

If the required origin cannot be resolved, do **not** fabricate a minute count. Add the record with the repo-supported explicit unknown drive-time state (`driveMinutes: null` + aligned provenance) rather than blocking the filter work. If current tests incorrectly require every record to have the historical `2026-08-30` check date, repair that test so new verified/unknown records can carry honest current provenance without weakening source/status validation.

## Card/search behavior

- `麦不上天` must no longer appear as though it were an ordinary activity tag.
- It may remain derivable internally from original locations for the destination-level toggle.
- Do not add `无自行车` as an activity tag.
- Keep search useful, but do not let search-token implementation alter filter semantics.

## Validation / acceptance

Add focused tests for all five filter examples above plus schema validation for bicycle status.

Also verify:

1. Activity select-all/select-none still works using only real activities.
2. Clear Filters resets all new binary constraints to OFF.
3. List-state persistence restores all new toggles.
4. `麦不上天` is no longer part of the activity OR expression.
5. `无自行车` evaluates sub-locations, not a broad destination-level boolean.
6. Great Swamp WOC exists once as a concrete access/parking cluster, uses official URLs/current facts, and has explicit bicycle-prohibited status.
7. No unknown bicycle state is treated as safe.
8. No unrelated module changes.

Run the repository’s required checks from current `AGENTS.md` / `PROJECT.md`, including at minimum the applicable Day Trips tests plus:

```bash
pnpm run validate
pnpm run check
pnpm run build
pnpm run test:unit
pnpm run verify
```

If local Java/Firebase rules remain an environment blocker, run every other applicable check and report the exact blocker. Do not claim PASS for commands that did not run.

Append `## Result` to this file with only Status, validation outcome, and any blocker/deviation. Keep commits task-scoped and push the implementation.