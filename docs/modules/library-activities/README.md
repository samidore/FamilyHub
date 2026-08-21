# Library Activities

## Purpose

Provide a current view of Maurice M. Pine Library children's activities in Fair Lawn, with family fit judged against an intentionally public `2024 Q3` birth-quarter baseline.

## Route and data

- Route: `/library-activities/`
- Dataset: `src/data/library-events.json`
- Parser/type: `parseLibraryEvents` and `LibraryEvent`
- Scope: Fair Lawn only; use `Maurice M. Pine Library` as the library value, including library-run off-site programs in Fair Lawn.

Records contain public schedule facts, location, age group, activity type, registration mode, date range, drive estimate, and official/Maps links. Schedules and eligibility are time-sensitive.

## Inclusion and family-fit rules

- Use the library or activity's official source before publishing. A credible secondary event listing may fill details such as time or age when the official current listing corroborates that the event exists but does not expose those details in crawlable text.
- The public family-fit baseline is a child born in `2024 Q3`. Do not store or require a more precise birth date for this module.
- Treat published age ranges as practical suitability guidance, not proof-of-age gates. A cutoff only a few months above the child's current age is acceptable; for example, a `2½+` activity should not be excluded solely because of that boundary.
- Exclude a program only when the available evidence clearly places it in an older developmental stage, such as an older-preschool or school-age-only activity that is materially beyond the current baseline.
- When no age is published, use the activity format, Children's Department context, performer history, and credible secondary listings to make a practical fit judgment. If evidence is still insufficient, keep a current Children's Department event visible as `可能适合` rather than treating missing age text as an automatic exclusion.
- Unknown factual details still stay unknown. Mark only the specific unresolved field instead of turning the entire record into a generic "待确认" entry.
- `verifiedDate` must be populated when an event is added or refreshed.
- `dateRange` is the expiry source for the page. Use `YYYY-MM-DD` for a one-day event or `YYYY-MM-DD – YYYY-MM-DD` for a bounded series. The final ISO date is treated as the last valid date.
- Remove obsolete records during a source refresh even though the page also hides records automatically after their final date.

## Page behavior

Search covers rendered event text. Filters include weekday, family-fit/age group, activity type, and registration mode (drop-in or registration/confirmation required). Sort defaults to chronological event date/time, with shortest drive as the alternative. There is no library filter or library-name sort because the module is Fair Lawn-only. Query/filter state is bookmarkable; counts are derived from the data and expired records are excluded from the live count and results.

## Maintenance and acceptance

Recheck registration, Fair Lawn resident eligibility, age guidance, seasonal dates, cancellations, location, and event date. Preserve uncertainty only where the source is genuinely incomplete. Keep official terminology and source titles in English where applicable, and run the shared verification gate.
