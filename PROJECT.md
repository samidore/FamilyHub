# Family Hub

Family Hub is a mobile-first Astro site for recurring family decisions, including public reference modules and the shared Meal Builder.

## Structure

- `src/config/modules.ts` — active modules, routes, categories, and navigation metadata.
- `docs/modules/` — module documentation.
- `docs/project/` — shared project rules.
- `docs/archive/` — historical material.
- `src/data/` — application data.

Use code and structured data as the source of truth for dynamic state and counts.

## Shared constraints

- The published site contains only public-reference content; private household operating state must not be committed or rendered publicly.
- Unknown facts stay unknown; do not invent values or treat file modification dates as verification.
- Active data must remain typed, validated, and covered by the applicable acceptance checks.
