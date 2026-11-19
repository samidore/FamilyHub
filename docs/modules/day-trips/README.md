# Day Trips

Day Trips is the public-reference module at /day-trips/. Its canonical destination data is src/data/day-trips.json, validated by parseDayTrips in src/data/dayTripSchema.mjs and loaded through src/data/catalog.ts. The page UI is implemented in src/pages/day-trips.astro with src/modules/day-trips/DayTripCard.astro; filtering and interaction behavior lives in src/lib/dayTripFiltering.mjs, src/lib/dayTripInteractionUi.ts, and src/lib/dayTripInteractions.ts.

Focused verification is covered by the day-trip tests under tests/day-trip-*.test.mjs and tests/day-trip-browser.spec.ts; the repository release gate is pnpm run verify.
