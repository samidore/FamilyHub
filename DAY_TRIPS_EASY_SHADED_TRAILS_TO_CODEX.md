# Temporary Task — Day Trips Easy Shaded Trails Batch

> Temporary Codex execution file. Delete this file in the completion commit. Do not keep it as project documentation.

## Goal

Expand Day Trips with a **large batch of shaded, genuinely Easy forest walks / state-park trail access points within 60 minutes of Home**. Most new destinations should naturally carry `woody-walk` (`森系遛猫`).

The user specifically wants:

- Easy only; do not include Moderate/Hard.
- Good tree cover / shade. A token `forest` feature is not enough if the actual walk is substantially exposed.
- Prefer short, low-climb routes practical with a 2-year-old; stroller is not required.
- Avoid cliff-edge / hazardous-water routes even if AllTrails labels them Easy.
- Paid parking, cash-only payment, reservations, unusual parking access, or other parking traps must be prominently recorded using the parking layer already on current `main`.
- Do not stop after an arbitrary destination count. Process the whole candidate set and add every qualifying <=60-minute parking cluster.

## Start

1. `git pull --ff-only`
2. Read `AGENTS.md`, then `PROJECT.md`.
3. Read current Day Trips data/schema/UI/tests, especially:
   - `src/data/day-trips.json`
   - `src/data/day-trip-parking.json`
   - `src/data/dayTripSchema.mjs`
   - `src/data/dayTripParking.ts`
   - `src/data/catalog.ts`
   - `src/modules/day-trips/DayTripCard.astro`
   - `tests/day-trip-coverage.test.mjs`
   - `tests/day-trip-parking.test.mjs`
4. Preserve the parking implementation already on `main`; extend it only where new destinations need parking metadata.

## Non-negotiable Google Maps drive-time policy

For every candidate, the final `driveMinutes` must be gathered fresh from Google Maps:

- Origin: the same exact saved **Home** used by the completed Day Trips drive audit.
- Driving mode.
- Depart at **Tuesday 2026-09-15 02:00 AM**, local time.
- Default Google Maps route/settings; do not enable avoid-highways/tolls/ferries.
- If Google shows a range, store the lower bound.
- If there are alternates, use the route Google selects/recommends by default.
- Process each concrete parking entrance separately. Never infer one entrance from another.
- Existing drive times, straight-line distance, Rome2Rio, OSRM, Travelmath, OpenStreetMap routing, etc. are forbidden as evidence.
- If saved Home cannot be resolved, STOP before adding active trail destinations and report `BLOCKED: HOME_ORIGIN_UNAVAILABLE`.
- Only add a candidate if the freshly observed Google Maps baseline is **<=60 minutes**.

Every new non-null drive time must use:

```json
"driveTimeProvenance": {
  "checkedDate": "2026-08-30",
  "primarySource": "Google Maps",
  "status": "verified"
}
```

Do not write the Home address anywhere in the repository, output, logs intentionally created for this task, or commit message.

## AllTrails research already completed

The following were found on 2026-08-30 with AllTrails filters centered on **Easy + hiking + forest**, generally capped around 4 miles / 410 ft gain. Treat these as the main candidate pool; verify route/parking identity before adding. One practical parking cluster should normally become one Day Trip, not one record per overlapping trail.

| Area / practical candidate | AllTrails route | ID | Length | Gain | Est. time |
| --- | --- | ---: | ---: | ---: | ---: |
| Campgaw Mountain County Park | Hemlock Trail (Orange) | 10550838 | 0.9 mi | 45 ft | 18 min |
| Ramapo Valley County Reservation | Scarlet Oak Pond Orange and Yellow Loop | 10306017 | 1.6 mi | 49 ft | 30 min |
| Ramapo Valley County Reservation | Scarlet Oak Pond to MacMillan Reservoir | 10296980 | 2.3 mi | 239 ft | 54 min |
| Mills Reservation | West, Glen and Eastview Trail Loop | 10279403 | 1.5 mi | 118 ft | 33 min |
| Mills Reservation | Mills Reservation Trail | 10035045 | 2.1 mi | 173 ft | 47 min |
| Rifle Camp Park | Red Trail and Yellow/Red Trail | 11100931 | 1.5 mi | 150 ft | 35 min |
| Garrett Mountain Reservation | Barbour Pond Loop | 11157160 | 1.0 mi | 29 ft | 19 min |
| G. Thomas Donch Nature Preserve | Haledon Reservoir White Trail Loop | 10389556 | 1.6 mi | 32 ft | 29 min |
| G. Thomas Donch Nature Preserve | Preserve Shoreline Loop / Island Bridges | 10618936 | 1.6 mi | 45 ft | 30 min |
| Emerson Woods Preserve | Emerson Woods Preserve / Oradell Reservoir | 10030195 | 2.1 mi | 32 ft | 38 min |
| Ringwood State Park — Ringwood Manor | Ringwood Manor Trail | 10263651 | 3.1 mi | 291 ft | 71 min |
| Ringwood State Park — Shepherd Lake | Shepherd Lake Loop | 10317736 | 1.7 mi | 170 ft | 40 min |
| Tallman Mountain State Park | Tallman Mountain Outer Loop | 11505052 | 3.1 mi | 121 ft | 60 min |
| Blauvelt State Park | Camp Bluefields Trail | 10658840 | 2.0 mi | 265 ft | 51 min |
| Clausland Mountain County Park | Orange Trail | 10306664 | 1.1 mi | 206 ft | 32 min |
| South Mountain Reservation | Hobble Falls + Hemlock Falls via Lenape | 11046666 | 0.7 mi | 59 ft | 16 min |
| South Mountain Reservation | Rahway and Maple Falls Loop | 10296509 | 0.9 mi | 78 ft | 20 min |
| South Mountain Reservation | Crest Trail to Crest Loop | 10274558 | 2.2 mi | 68 ft | 42 min |
| Watchung Reservation | Lake Surprise via W. R. Tracy Drive | 10292304 | 1.7 mi | 19 ft | 30 min |
| Watchung Reservation | Deserted Village Loop | 10762113 | 1.2 mi | 101 ft | 27 min |
| Mountain Way Park | White Trail Loop | 10296167 | 0.9 mi | 98 ft | 22 min |
| Jonathan's Woods | Purple and White Trail Loop | 11046242 | 1.8 mi | 121 ft | 38 min |
| Cranberry Lake Preserve | Red, Purple and Yellow Loop | 10242413 | 1.7 mi | 177 ft | 40 min |
| Kennedy Dells County Park | Kennedy Dells Park | 10237653 | 2.5 mi | 134 ft | 51 min |
| Saxon Woods Park | Mamaroneck Reservoir via Yellow Trail | 10027954 | 2.8 mi | 196 ft | 61 min |
| Cascade Lake Park | Cascade Lake Loop (Red Trail) | 10238316 | 1.5 mi | 134 ft | 34 min |
| V. E. Macy Park | Irvington Reservoir via V. E. Macy Park Trail | 10706450 | 1.7 mi | 190 ft | 41 min |
| Old Croton Aqueduct State Historic Park | Old Croton Aqueduct Dam | 10281660 | 1.5 mi | 177 ft | 37 min |
| Denbrook | Denbrook Trail | 11081184 | 2.1 mi | 91 ft | 42 min |
| Speedwell Park | Patriots Path from Speedwell Lake | 10274846 | 3.9 mi | 62 ft | 70 min |
| India Brook / Buttermilk Falls | Buttermilk Falls and Frog Pond Loop | 10410564 | 2.3 mi | 200 ft | 52 min |
| Tourne County Park | Red and Decamp Trail Loop | 10037624 | 1.3 mi | 337 ft | 43 min |
| Lord Stirling Park | Red, Green and Blue Trail | 10022155 | 2.8 mi | 29 ft | 49 min |

Also review any additional nearby **Easy + genuinely shaded forest** candidates surfaced while resolving these parks. This table is a floor, not a quota. Do not force Wawayanda/Harriman/Palisades into the batch if current easy-route evidence is weak, rocky, cliff-adjacent, substantially exposed, or no longer Easy.

## Selection / data rules

- Prefer the shortest, flattest useful route within each parking cluster; mention another overlapping Easy option in the note only when useful.
- `locations[].tags` should normally include `woody-walk`.
- For this shaded batch, do not add `heat` to `notFor` unless the route turns out not to meet the user's shade requirement; if it is meaningfully exposed, exclude it instead.
- Natural-surface forest trails should normally use `notFor: ["rain", "post-rain"]` unless official surface conditions justify otherwise.
- `stroller` must reflect the actual route, not the park in general.
- Note should be compact and practical: route name, approx distance/gain, shade/forest character, and why this is the useful access point.
- Google Maps URL must resolve the concrete parking lot / trail access point, not a broad town or ambiguous park centroid.
- Use an official park/preserve page for `officialUrl`.
- `verifiedDate` should reflect the source verification date.

### Parking

Use `src/data/day-trip-parking.json` for anything a family could be surprised by:

- parking/entrance fee
- cash-only payment
- automated pay station / app-only payment
- reservation requirement
- seasonal fee window
- unusually limited or separate trail parking

Verify current parking rules from an **official source**, not AllTrails reviews. Do not invent a payment method if the official source does not state it.

Important split examples:

- Ringwood Manor and Shepherd Lake are separate destinations/parking clusters.
- Watchung routes should be split if their practical parking starts are materially different.
- South Mountain routes should be split only when they genuinely require separate parking clusters; do not multiply records for overlapping trails from the same start.

## Validation / acceptance

Required:

1. Every added destination has an AllTrails Easy forest route and good shade.
2. Every added destination has a fresh Google Maps Home -> concrete parking entrance drive time at the fixed 2026-09-15 02:00 AM departure, and is <=60 minutes.
3. No new route is cliff-edge / substantially exposed / deceptively technical for this household use case.
4. Large parks are represented by practical parking clusters, with independent drive times where entrances differ.
5. Paid/unusual parking is structured and visible through the existing parking UI; cash-only is explicitly marked.
6. Most new entries are `woody-walk` / 森系遛猫.
7. No existing Day Trips drive-time provenance is weakened or replaced with non-Google sources.
8. Do not weaken tests to accommodate data.

Run:

```bash
pnpm run validate
pnpm run check
pnpm run build
pnpm run test:unit
pnpm run verify
```

Fix all task-caused failures. If an environment dependency blocks part of verification, mark it BLOCKED with the exact command.

Finally:

- delete `DAY_TRIPS_EASY_SHADED_TRAILS_TO_CODEX.md`
- `git diff --check`
- commit only task-related changes
- push `main`
- report counts: candidates processed, added <=60, excluded >60, excluded suitability, parking warnings added, and validation PASS/FAIL/BLOCKED.
