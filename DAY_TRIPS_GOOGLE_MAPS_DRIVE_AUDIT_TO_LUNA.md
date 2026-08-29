# Temporary Task — Day Trips Google Maps Drive-Time Audit

> **Temporary execution file.** Read and execute this task after pulling latest `main`. When the task is successfully completed and committed, delete this file in the same completion commit. Do not turn it into permanent project documentation.

## 0. Start exactly here

Run:

```bash
git pull --ff-only
```

Then read, in this order:

1. `AGENTS.md`
2. `PROJECT.md`
3. this file
4. `src/data/day-trips.json`
5. `src/data/dayTripSchema.mjs`
6. `src/data/types.ts`
7. `src/pages/day-trips.astro`
8. `src/modules/day-trips/DayTripCard.astro`
9. the Day Trips tests that reference `driveMinutes`, nearby coverage, sorting, or filtering

Do not start changing data before you understand the current schema and current null-handling behavior.

---

# 1. Goal

Replace the current Day Trips drive-time dataset with **real Google Maps driving times gathered one destination at a time from one identical origin and one identical scheduled departure time**.

The current drive-time values are untrusted. They came from mixed sources such as Rome2Rio and OSRM and must **not** be reused as answers, hints, expected values, fallbacks, or calibration targets.

The user has already demonstrated a concrete bad example:

- `dundee-island-park` currently shows `8` minutes in FamilyHub.
- A real Google Maps Home → Dundee Island Park lookup showed roughly 19–21 minutes under current traffic.

This does **not** mean the new stored value must be 20. The new value must be read fresh from the fixed scheduled Google Maps lookup defined below. Dundee is only a regression sentinel proving the current dataset cannot be trusted.

---

# 2. Canonical routing policy — DO NOT DEVIATE

For **every Day Trips destination**, use exactly this routing policy.

## Origin

**Home** — the family's actual home location.

Use one and the same exact home origin for all records.

Preferred resolution order:

1. If Google Maps in the Codex browser/session resolves the saved label `Home`, use that.
2. If the exact home street address has already been supplied privately in the active Codex session, it may be entered directly into Google Maps.
3. If neither is available, **STOP before changing drive-time data** and report:

```text
BLOCKED: HOME_ORIGIN_UNAVAILABLE
Google Maps cannot resolve the family's Home origin in this Codex session.
```

Do **not** substitute Tender Years, Fair Lawn city center, a ZIP code, a nearby landmark, or any other origin.

### Privacy rule for Home

The home address may be used inside Google Maps for the lookup, but it must never be written into:

- repository files
- JSON
- markdown
- source comments
- tests
- terminal logs intentionally created by you
- commit messages
- final report

Do not print the address back to the user.

## Source

**Google Maps only for the final stored drive time.**

Do not use any of these as a final source:

- Rome2Rio
- OSRM
- OpenStreetMap routing
- Travelmath
- GraphHopper
- Bing Maps
- Apple Maps
- straight-line distance
- distance-to-time conversion
- existing `driveMinutes`

Other sources are not needed for this task.

## Travel mode

**Driving**.

Do not use transit, walking, cycling, or rideshare estimates.

## Fixed departure

Set Google Maps to:

**Depart at Tuesday, 2026-09-15, 2:00 AM**

Use the local time shown by Google Maps for the route. This is intentionally an off-peak baseline.

Every destination must use this exact same scheduled departure. Do not use `Leave now` for any record.

## Route options

Use Google Maps default driving settings.

Do **not** enable:

- Avoid highways
- Avoid tolls
- Avoid ferries

Use the default route Google Maps recommends/selects for that scheduled departure.

Do not manually choose a slower scenic route or choose a different alternate route just because its number better matches an old value.

---

# 3. How to convert the Google Maps display into `driveMinutes`

For the **default recommended route** at the fixed departure time:

### Case A — Google gives one duration

Example:

```text
18 min
```

Store:

```json
"driveMinutes": 18
```

### Case B — Google gives a duration range

Example:

```text
18–22 min
```

This project's drive time is an **off-peak baseline**, so store the **lower bound shown by Google**:

```json
"driveMinutes": 18
```

This is not an estimate invented by you; it is a deterministic transformation of the Google Maps range.

### Case C — multiple alternate routes appear

Use the route Google Maps marks/selects as the default recommended route.

Do not choose the numerically shortest alternate unless Google itself selected/recommended it.

### Case D — Google cannot provide a scheduled driving duration

After retrying the exact destination identity as described below, store:

```json
"driveMinutes": null
```

and provenance status `unknown`.

Do not invent a number.

---

# 4. Destination identity — one record at a time

Process `src/data/day-trips.json` in its existing order.

Expected current count is 56 destinations. Do not delete, add, merge, or split destinations in this task.

For each record:

1. Read the record `id`, `name`, aliases, city/state, and `googleMapsUrl`.
2. Open the record's current `googleMapsUrl` or otherwise resolve that **same concrete place** in Google Maps.
3. Confirm the destination shown by Google Maps corresponds to the current record.
4. Open Directions.
5. Set origin to the exact same Home used for every other record.
6. Set Driving.
7. Set `Depart at` to **2026-09-15 2:00 AM**.
8. Read the default recommended route duration.
9. Convert it using Section 3.
10. Immediately update only that record's drive-time fields.
11. Move to the next record.

Do not first generate a 56-row table from another routing engine and then copy it into JSON.

You may automate repetitive browser clicking/navigation, but every non-null stored value must come from an actual Google Maps directions result with the required origin, destination, driving mode, and scheduled departure.

## Important split destinations

Respect the concrete parking/entrance identities already encoded in the repo. In particular, these are distinct routes and must be queried separately:

- Flat Rock Brook Nature Center vs. Flat Rock Brook — Oritani Playground
- Teatown Nature Center / Lakeside vs. Teatown Cliffdale Farm
- Rockefeller Main Entrance / Swan Lake vs. Rockwood Hall
- Saddle River County Park areas
- Overpeck Henry Hoebel vs. Overpeck Ridgefield Park Area

Do not reuse one park's time for another entrance.

If a `googleMapsUrl` resolves to an obviously wrong place or wrong entrance, do not silently substitute a city-center route. Set that record to unknown and report the identity problem at the end. Do not redesign destination identities in this task.

---

# 5. Existing values are forbidden as evidence

Treat every current `driveMinutes` as untrusted input.

Never do any of the following:

- preserve a current value because it “looks right”
- use a current value when Google Maps fails
- choose a Google alternate route because it is closer to the old value
- round Google Maps to the old 5-minute bucket
- infer one entrance from another nearby entrance
- infer a park from its city
- convert miles into minutes

Every non-null final value must be independently observed during this Google Maps pass.

---

# 6. Data fields to update

The existing `driveMinutes: number | null` support and null UI behavior are correct and should remain.

For every destination, after this audit:

## Verified

```json
"driveMinutes": 18,
"driveTimeProvenance": {
  "checkedDate": "<actual execution date YYYY-MM-DD>",
  "primarySource": "Google Maps",
  "status": "verified"
}
```

## Unknown

```json
"driveMinutes": null,
"driveTimeProvenance": {
  "checkedDate": "<actual execution date YYYY-MM-DD>",
  "primarySource": "Google Maps",
  "status": "unknown"
}
```

Remove any stale `crossCheckSource` from the previous audit unless the current schema mechanically requires it. It should not be needed.

At task completion, there must be **no Day Trips drive provenance claiming Rome2Rio, OSRM, OpenStreetMap, or Travelmath as the primary source**.

Do not change the destination's general `verifiedDate` merely because drive time was checked.

Do not expose `driveTimeProvenance` in the visible webpage. The visible card continues to show only the minutes or `车程待核实`.

---

# 7. Do not redesign the current null implementation

Keep the already-correct behavior:

- `driveMinutes` may be `number | null`
- null displays `车程待核实`
- null sorts after known drive times
- null does not pass `≤20 / ≤40 / ≤60 / ≤120` filters
- null still appears when drive-time filtering is unrestricted

Only fix these behaviors if you find a real bug while validating them.

Do not refactor the page or card for this task.

---

# 8. Tests — no bypasses

The previous audit introduced dangerous test bypasses such as returning early when every drive time is null.

Search the Day Trips tests for logic equivalent to:

```js
if (trips.every((trip) => trip.driveMinutes === null)) return;
```

or group-specific equivalents for PYO / aquarium / coverage.

Such bypasses are forbidden.

Use commit `9a57a96e436047a9c2172973028e5dc7cee733b1` as a reference for the pre-null-audit coverage requirements if needed.

Rules:

- preserve the original nearby coverage thresholds
- preserve the original maximum-minute thresholds
- do not skip coverage when data is missing
- do not weaken assertions to make the new data pass
- retain legitimate tests that verify null sorting/filter/display behavior

If the real Google Maps dataset causes an existing coverage requirement to fail, report the test as FAIL. **Real data wins over a green test.** Do not falsify data and do not weaken the test.

---

# 9. Mandatory audit assertions before tests

Before running the normal test suite, programmatically or manually verify all of the following:

1. Destination count is unchanged from the current dataset (expected 56).
2. Every destination was processed in this Google Maps pass.
3. Every non-null `driveMinutes` is an integer from 0–300.
4. Every non-null drive time has `status: "verified"`.
5. Every null drive time has `status: "unknown"`.
6. Every record has `primarySource: "Google Maps"`.
7. No record has `primarySource` containing `Rome2Rio`, `OSRM`, `OpenStreetMap`, or `Travelmath`.
8. No home address appears anywhere in tracked repository files.
9. No unrelated destination content was changed.
10. `dundee-island-park` was actually re-queried from Google Maps using the fixed scheduled departure and was not copied from either the old `8` or the user's current-traffic `20` screenshot.

If any assertion fails, fix it before continuing.

---

# 10. Validation

Run focused checks first, then the full repository verification gate.

At minimum:

```bash
pnpm run validate
pnpm run check
pnpm run build
pnpm run test:unit
```

Then run:

```bash
pnpm run verify
```

`pnpm run verify` currently includes validation, Astro check, build, audit, unit tests, Firebase rules tests, and browser tests.

If an environmental dependency blocks part of `verify` (for example Java/Firebase emulator/browser runtime), report that exact command as BLOCKED. Do not call a blocked check PASS.

Do not modify unrelated tests to fix unrelated pre-existing failures.

---

# 11. Scope control

Files that may legitimately change:

- `src/data/day-trips.json`
- Day Trips schema/types only if required to preserve the already-agreed `number | null` behavior
- Day Trips page/card only if a real null-handling bug is discovered
- Day Trips tests only to remove prior bypasses or correctly test the agreed null behavior
- this temporary task file, which must be deleted on successful completion

Do not modify:

- Meal Builder
- Restaurants
- Libraries
- other modules
- global styles unless absolutely required by a demonstrated Day Trips bug
- Firebase household data

Do not create another handoff, report markdown, audit markdown, backup branch, or permanent source log.

---

# 12. Completion output

Before committing, run:

```bash
git status
git diff --check
```

Then output exactly this information in the Codex response:

```text
RESULT

Google Maps audit
- Total destinations: <n>
- Google Maps verified: <n>
- Unknown: <n>
- Scheduled departure used for every route: 2026-09-15 02:00 AM
- Origin uniform for every route: YES / NO

Unknown IDs
- <id>
- ...
(or `none`)

Destination identity problems
- <id>: <short explanation>
(or `none`)

Known regression check
- dundee-island-park: <stored minutes or unknown>
- Fresh Google Maps lookup performed: YES / NO

Tests
- pnpm run validate: PASS / FAIL / BLOCKED
- pnpm run check: PASS / FAIL / BLOCKED
- pnpm run build: PASS / FAIL / BLOCKED
- pnpm run test:unit: PASS / FAIL / BLOCKED
- pnpm run verify: PASS / FAIL / BLOCKED

Integrity
- Reused old hard-coded/mixed-source drive times: NO
- Guessed missing drive times: NO
- Weakened nearby coverage tests: NO
- Wrote Home address into repo: NO
- Non-Google primary drive sources remaining: 0

Repository
- Completion commit: <sha>
- Pushed to main: YES / NO
```

Do not include the home address in this report.

---

# 13. Commit and cleanup

If the required implementation is complete:

1. Delete `DAY_TRIPS_GOOGLE_MAPS_DRIVE_AUDIT_TO_LUNA.md`.
2. Confirm only task-related files are modified.
3. Commit with:

```text
Complete Day Trips Google Maps drive audit
```

4. Push to `main`.
5. Stop. Do not start another task.

If the task is BLOCKED because Home cannot be resolved or Google Maps browser access is unavailable, **do not delete this task file and do not fabricate data**. Report the blocker and stop.
