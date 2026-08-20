# Library Activities

## Purpose

Provide a current view of Maurice M. Pine Library children's activities in Fair Lawn that are explicitly suitable for a 2-year-old child.

## Route and data

- Route: `/library-activities/`
- Dataset: `src/data/library-events.json`
- Parser/type: `parseLibraryEvents` and `LibraryEvent`
- Scope: Fair Lawn only; use `Maurice M. Pine Library` as the library value, including library-run off-site programs in Fair Lawn.

Records contain public schedule facts, location, age group, activity type, registration mode, date range, drive estimate, and official/Maps links. Schedules and eligibility are time-sensitive.

## Inclusion rules

- Use the library or activity's official source before publishing.
- Include only programs whose published age range explicitly includes age 2. Do not infer toddler eligibility from the activity title, performer, or format.
- Exclude programs with unknown age requirements until the official source confirms eligibility.
- `verifiedDate` must be populated when an event is added or refreshed.
- `dateRange` is the expiry source for the page. Use `YYYY-MM-DD` for a one-day event or `YYYY-MM-DD – YYYY-MM-DD` for a bounded series. The final ISO date is treated as the last valid date.
- Remove obsolete records during a source refresh even though the page also hides records automatically after their final date.

It is valid for the dataset to be empty between program seasons when the official page does not expose any still-current program with a confirmed age-2 requirement.

## Page behavior

Search covers rendered event text. Filters include weekday, age group, activity type, and registration mode (drop-in or registration/confirmation required). Sort defaults to schedule order, with shortest drive as the alternative. There is no library filter or library-name sort because the module is Fair Lawn-only. Query/filter state is bookmarkable; counts are derived from the data and expired records are excluded from the live count and results.

## Maintenance and acceptance

Recheck registration, Fair Lawn resident eligibility, age limits, seasonal dates, cancellations, and location. Do not convert a missing schedule or missing age requirement into a guess. Keep official terminology and source titles in English where applicable, and run the shared verification gate.
