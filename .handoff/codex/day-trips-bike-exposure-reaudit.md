# Day Trips bike-exposure re-audit

## Goal

Correct the bicycle filter that was just implemented in `day-trips-binary-filters-great-swamp.md`.

The previous implementation modeled a legal/official fact (`bicycleAccess: allowed | prohibited | unknown`) and therefore mechanically migrated most existing routes to `unknown`. That is not the user's intended filter.

The user's question is practical:

> When walking here with a toddler, is this a route where bicycles are realistically expected to share the path?

The filter should identify **low bicycle-exposure walking locations**, not require an explicit government prohibition on bicycles.

Read `AGENTS.md`, `PROJECT.md`, `Protocols/protocols/chatgpt-codex.md`, the previous handoff/result, current Day Trips schema/data/UI/tests, and `DAY_TRIPS_EASY_SHADED_TRAILS_TO_CODEX.md` before editing.

Do not refactor unrelated modules.

## Correct semantic model

Replace the current `bicycleAccess` legal-access model with a route/location-level practical exposure model, preferably:

```ts
bikeExposure: 'low' | 'high' | 'unknown'
```

Equivalent naming is acceptable only if it clearly describes **practical bicycle exposure/risk**, not legal permission.

The UI pill may remain `步道无自行车` / `无自行车`; its practical meaning is: **keep locations where a child walking on the route is not expected to regularly mix with bicycles.**

When this constraint is ON, pass only `bikeExposure === 'low'`. `unknown` does not pass.

### Evidence hierarchy

Do NOT require an official bicycle-prohibition rule for `low`.

Classify using the actual route and the best available combination of evidence:

1. **Explicit route evidence overrides heuristics**
   - AllTrails route includes `mountain-biking`, `road-biking`, or `bike-touring` => normally `high`.
   - Official/current source says the route is multi-use/shared with bicycles or bicycling is designated there => `high`.
   - Official/current source explicitly prohibits bicycles => `low`.

2. **Route form is valid practical evidence when no contrary bike-use evidence exists**
   - boardwalk / wooden walkway => normally `low`
   - ordinary narrow forest hiking trail / natural-surface hiking path => normally `low` when AllTrails does not list biking and there is no contrary source
   - ordinary hiking-only dirt/stone/gravel trail => normally `low`
   - paved asphalt/concrete greenway or named multi-use path => normally `high`
   - rail trail / broad shared greenway / carriage route where cycling is a normal use => normally `high`

3. **Do not use surface alone when it conflicts with actual use**
   - Dirt trails can still be mountain-bike routes: those are `high`.
   - Paved garden/arboretum walkways can still be `low` if bicycles are prohibited or functionally excluded.
   - Wide gravel roads can be cycling routes; check route/activity evidence.

4. `unknown` is for genuinely unresolved/conflicting cases, not a default for every route lacking a legal prohibition sentence.

This is a practical product classification, not a legal-claims database. Do not create a parallel evidence store unless the existing Day Trips canonical data model requires provenance for this field.

## Location-level behavior

Keep the already-confirmed filter pipeline:

1. destination checks
2. `麦不上天` rejects the whole destination if any original sub-location has `playground`
3. apply ordinary constraints to sub-locations
4. re-compute available activities only from surviving sub-locations
5. require a selected activity to remain among survivors

For bicycle exposure specifically:

- classify the **specific location/route**, not the whole park
- if a destination bundles a high-exposure paved/multi-use path and a low-exposure forest trail into one location, split that location when necessary so the filter can work correctly
- a separate low-exposure trail can keep a destination eligible even if another route in the same park is high exposure

Indoor/enclosed attractions are not bicycle-shared trails. Do not accidentally make `步道无自行车 + 室内活动` impossible merely because an indoor location previously inherited `unknown`. Use the simplest repo-consistent representation/filter rule so non-trail enclosed locations are not falsely rejected by a bicycle-trail constraint.

## Re-audit the previously added AllTrails forest batch

The user explicitly challenged the prior result because dozens of Easy forest trails were all left `unknown`. Re-audit **every currently active destination/location added from `DAY_TRIPS_EASY_SHADED_TRAILS_TO_CODEX.md`**, not just Great Swamp.

ChatGPT re-checked the following AllTrails routes on 2026-09-04. These are strong starting evidence; verify current route identity before writing data.

### Strong LOW-exposure candidates

These AllTrails routes are natural/forest hiking routes and the current AllTrails activity list does **not** include a bicycle activity:

- Campgaw Mountain — Hemlock Trail (Orange), AllTrails `10550838`
- Ramapo Valley — Scarlet Oak Pond Orange and Yellow Loop, `10306017`
- Mills Reservation — West, Glen and Eastview Trail Loop, `10279403`
- Garrett Mountain — Barbour Pond Loop, `11157160`
- G. Thomas Donch — Haledon Reservoir White Trail Loop, `10389556`
- G. Thomas Donch — Preserve Shoreline Loop and Island Bridges Trail, `10618936`
- Ringwood State Park — Ringwood Manor Trail, `10263651`
- Ringwood State Park — Shepherd Lake Loop, `10317736`
- Tallman Mountain — Outer Loop, `11505052`
- Blauvelt — Camp Bluefields Trail, `10658840`
- Clausland Mountain — Orange Trail, `10306664`
- South Mountain — Hobble Falls/Hemlock Falls via Lenape, `11046666`
- South Mountain — Rahway and Maple Falls Loop, `10296509`
- South Mountain — Crest Trail to Crest Loop, `10274558`
- Watchung Reservation — Lake Surprise Loop via W. R. Tracy Drive, `10292304`
- Mountain Way — White Trail Loop, `10296167`
- Cranberry Lake Preserve — Red/Purple/Yellow Loop, `10242413`
- Kennedy Dells — Kennedy Dells Park, `10237653`
- Cascade Lake Park — Red Trail Loop, `10238316`
- V. E. Macy Park — Irvington Reservoir route, `10706450`
- India Brook / Buttermilk Falls — Buttermilk Falls and Frog Pond Loop, `10410564`
- Lord Stirling Park — Red/Green/Blue Trail, `10022155`

Do not blindly assign `low` only from this list: confirm that the exact Day Trips `location` corresponds to the route rather than a broader paved/multi-use area. But these should **not** remain `unknown` merely because no law says “bicycles prohibited.”

### Strong HIGH-exposure candidates

AllTrails explicitly lists `mountain-biking` on these checked routes:

- Rifle Camp Park — Red Trail and Yellow/Red Trail, `11100931`
- Jonathan's Woods — Purple and White Trail Loop, `11046242`
- Saxon Woods — Mamaroneck Reservoir via Yellow Trail Loop, `10027954`
- Tourne County Park — Red and Decamp Trail Loop, `10037624`

These should normally be `high` for this user's filter even though they are forest/dirt routes.

### Needs specific review

- Old Croton Aqueduct Dam, AllTrails `10281660`: the short loop's activity list is hiking/walking/trail-running, but the broader Old Croton Aqueduct corridor has active bicycle use. Determine whether the exact stored Day Trips location actually shares the bike-used corridor; classify accordingly rather than guessing.
- Any stored location explicitly named `multi-use path`, paved greenway, rail trail, or similar should be presumptively `high` unless a specific rule/function excludes bicycles.

Re-audit the remainder of the active batch even if not named above. The acceptance condition is that the **whole currently active Easy-shaded AllTrails batch** is reviewed, not just the examples ChatGPT happened to enumerate.

## Great Swamp corrections

`森系遛猫` is only a playful UI name for **people walking in woods**. It does NOT mean walking a cat or bringing any pet.

Therefore pet policy must never decide whether a location receives `woody-walk`.

### Great Swamp National Wildlife Refuge

Current official FWS evidence checked again 2026-09-04:

- refuge has close to 11.5 miles of foot-access trails
- regulations: refuge trails are open to foot travel only
- bicycles/rollerblades are not allowed on refuge trails; bicycles are allowed on Pleasant Plains Road
- FWS map says WOC/White Oak are boardwalk + compacted stone dust, mostly flat/limited incline
- Bockoven and Nature Detective are flat/limited incline with compacted stone dust, wood chip, and unimproved natural surfaces
- WOC has about 1.5 miles boardwalks/trails

Official sources:
- `https://www.fws.gov/refuge/great-swamp`
- `https://www.fws.gov/refuge/great-swamp/visit-us`
- `https://www.fws.gov/refuge/great-swamp/what-we-do/laws-regulations`
- official FWS all-trails map linked from Visit Us

AllTrails evidence checked by ChatGPT:
- Wildlife Observation Center Trails `10257546`: Easy, 2.9 mi, 13 ft gain, boardwalk/gravel, stroller-friendly; AllTrails accessibility notes boardwalk/gravel and gentle grade
- Wildlife Observation Center Trail South `11374857`: Easy, 1.0 mi, forest/kids/wildlife
- Wildlife Observation Center Trail North `11374859`: Easy, 1.1 mi, forest/kids/wildlife
- White Oak Trail `10663462`: Easy, 1.0 mi, forest/kids/wildlife
- Bockoven Trail `10578451`: Easy, 0.5 mi, forest/kids/river/wildlife
- Nature Detective Trail `11374861`: Easy, 0.3 mi, forest/kids/river/wildlife
- Orange Trail `10032428`: Easy, 3.2 mi, forest/kids/wildlife
- Blue Trail `10298117`: Easy, 4.5 mi, forest/kids/river/wildlife

Corrections required:

- Great Swamp WOC walking location should carry `woody-walk` (and wildlife/animals as appropriate). Pet prohibition is irrelevant to this tag's semantics.
- Great Swamp refuge walking trails are clearly `bikeExposure: low`.
- WOC stroller suitability may be `true` if the exact stored location corresponds to the AllTrails stroller-friendly WOC route / official flat boardwalk-stone-dust network; keep note compact about surface rather than claiming every refuge trail is stroller-friendly.
- Do not clutter the card with a pet warning solely because the earlier task misread `森系遛猫` as literal pet walking. Remove/demote that notice unless it is independently useful under normal Day Trips conventions.

Also add/research a practical **Visitor Center / Bockoven + Nature Detective** access cluster if it is not already represented. It is a distinct useful toddler-scale forest-walk start from the WOC. Follow current parking-cluster conventions.

Optionally include Great Swamp Outdoor Education Center only if it fits the current Day Trips drive/suitability scope after normal verification. Morris County's current bicycle policy explicitly prohibits bicycles on all trails/walkways at Great Swamp Outdoor Education Center, and AllTrails has several Easy forest/kid routes there (e.g. Orange 0.8 mi / Red 0.5 mi).

For any new practical cluster, use the current project's Google Maps drive-time policy/origin if available. If origin is not available, do not invent a minute count; use the repo's explicit unknown drive-time state.

## Schema / migration

- Replace `bicycleAccess` with `bikeExposure` in schema/types/data/filter code/tests; do not leave two competing bicycle fields.
- Migration may retain `unknown` on unrelated, unreviewed records, but the active Easy-shaded AllTrails batch must be actually re-audited.
- Dedicated indoor/enclosed locations should not remain behaviorally blocked by this trail filter.
- Keep the classification at location granularity.

## Acceptance tests

Preserve all prior binary-filter tests, rewritten for `bikeExposure`, and add/adjust tests proving:

1. natural forest hiking route + no bike activity => low route can pass `无自行车`
2. natural dirt forest route explicitly supporting mountain biking => high and does not pass
3. paved/multi-use walking route => high unless stronger evidence says bicycles excluded
4. boardwalk walking route => low unless stronger evidence says bikes share it
5. mixed destination: high bike path + separate low forest `woody-walk`; `无自行车 + 森系遛猫` still passes via the forest trail
6. mixed destination: only high bike `woody-walk` survives; same filters fail
7. enclosed indoor activity is not falsely eliminated by a bicycle-trail constraint
8. `麦不上天` destination-level behavior remains unchanged
9. Great Swamp WOC passes `无自行车 + 森系遛猫`
10. current active Easy-shaded batch has been reviewed and is not mechanically left all `unknown`

Report counts in `## Result`:

- active batch locations reviewed
- `low`
- `high`
- genuinely `unknown`
- locations split because one stored location mixed route types
- Great Swamp records added/corrected

Run the current repo-required checks, including focused Day Trips tests, `pnpm run validate`, `pnpm run check`, `pnpm run build`, `pnpm run test:unit`, and `pnpm run verify`. Report pre-existing unrelated failures and Java/Firebase blockers exactly; do not claim PASS for commands that did not complete.

Commit/push only task-related changes and append `## Result` to this handoff.