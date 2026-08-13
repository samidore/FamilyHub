# Day Trips

## Purpose

Help the household choose a nearby destination for the day's weather, drive tolerance, and child activity needs. This is a comparison aid, not an official venue rating.

## Route and data

- Route: `/day-trips/`
- Dataset: `src/data/day-trips.json`
- Parser/type: `parseDayTrips` and `DayTrip`
- Baseline: 29 destinations

Records keep the venue's public facts, drive range, category, conditions, indoor/outdoor/stroller/weather ratings, family fit, risks, before-you-go checks, and official/Maps links. Keep facts separate from the household recommendation score.

## Page behavior

Search covers the rendered record text. Filters include category, drive bucket (≤20, 21–40, 41–60 minutes), conditions, status, and minimum indoor/outdoor/stroller/weather ratings. Sort options are family recommendation, shortest drive, toddler rating, parent rating, and name. State is bookmarkable; counts update live; clearing filters restores all records; no-result state is recoverable.

## Maintenance and acceptance

Use current official venue information for hours, fees, registration, construction, and seasonal facilities. Set `verifiedDate` only after checking the source. Never invent mileage, ratings, accessibility, or weather claims. Run the shared validation/build/audit/browser gate after changes.
