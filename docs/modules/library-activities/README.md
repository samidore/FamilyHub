# Library Activities

## Purpose

Provide a weekly view of nearby library storytime, music/movement, free play, craft, and related activities for a young child.

## Route and data

- Route: `/library-activities/`
- Dataset: `src/data/library-events.json`
- Parser/type: `parseLibraryEvents` and `LibraryEvent`
- Baseline: 18 activities across five nearby library systems

Records contain public schedule facts, library/location, age group, activity type, registration mode, date range, drive estimate, and official/Maps links. Schedules and eligibility are time-sensitive.

## Page behavior

Search covers rendered event text. Filters include weekday, library, age group, activity type, and registration mode (drop-in or registration/confirmation required). Sort defaults to deterministic weekday/time order, with shortest drive and library-name alternatives. Query/filter state is bookmarkable; live counts and empty-state recovery must work without losing the complete server-rendered list.

## Maintenance and acceptance

Use the library or activity's official page before publishing. Recheck registration, resident eligibility, age limits, seasonal dates, cancellations, and location. Do not convert a missing schedule into a guess. Keep official terminology and source titles in English where applicable, and run the shared verification gate.
