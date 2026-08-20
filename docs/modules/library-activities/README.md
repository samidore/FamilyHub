# Library Activities

## Purpose

Provide a current view of Maurice M. Pine Library children's activities in Fair Lawn, with age-two suitability made explicit when the official source provides it.

## Route and data

- Route: `/library-activities/`
- Dataset: `src/data/library-events.json`
- Parser/type: `parseLibraryEvents` and `LibraryEvent`
- Scope: Fair Lawn only; use `Maurice M. Pine Library` as the library value, including library-run off-site programs in Fair Lawn.

Records contain public schedule facts, location, age group, activity type, registration mode, date range, drive estimate, and official/Maps links. Schedules and eligibility are time-sensitive.

## Inclusion rules

- Use the library or activity's official source before publishing.
- Include current or upcoming programs listed by the Maurice M. Pine Library Children's Department unless the official source explicitly shows that age 2 is ineligible.
- When the official source explicitly includes age 2, label the event accordingly. When the public source does not expose an age requirement, keep the event visible and label the age as `年龄待确认`; do not infer eligibility from the title, performer, or format.
- Unknown time or venue details stay unknown and must be labeled as needing confirmation rather than guessed.
- `verifiedDate` must be populated when an event is added or refreshed.
- `dateRange` is the expiry source for the page. Use `YYYY-MM-DD` for a one-day event or `YYYY-MM-DD – YYYY-MM-DD` for a bounded series. The final ISO date is treated as the last valid date.
- Remove obsolete records during a source refresh even though the page also hides records automatically after their final date.

## Page behavior

Search covers rendered event text. Filters include weekday, age group, activity type, and registration mode (drop-in or registration/confirmation required). Sort defaults to chronological event date/time, with shortest drive as the alternative. There is no library filter or library-name sort because the module is Fair Lawn-only. Query/filter state is bookmarkable; counts are derived from the data and expired records are excluded from the live count and results.

## Maintenance and acceptance

Recheck registration, Fair Lawn resident eligibility, age limits, seasonal dates, cancellations, location, and event date. Do not convert a missing schedule, age requirement, time, or venue into a guess. Keep official terminology and source titles in English where applicable, and run the shared verification gate.
