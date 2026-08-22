# Family Hub

Family Hub is a mobile-first Astro site for recurring family decisions, including public reference modules and authenticated shared household tools.

## Structure

- `src/config/modules.ts` — active modules, routes, categories, navigation metadata, and module privacy classes.
- `docs/modules/` — module documentation.
- `docs/project/` — shared project rules.
- `src/data/` — public application data.

Use code and structured data as the source of truth for dynamic state and counts.

## Shared constraints

- Public-reference module content may be committed and server-rendered only when it satisfies the public data rules.
- Authenticated-household modules may publish only a locked/static shell; private household operating state must stay in the separately authenticated runtime store and must not be committed or server-rendered into the public build.
- Unknown facts stay unknown; do not invent values or treat file modification dates as verification.
- Active data and runtime state must remain typed, validated, and covered by the applicable acceptance checks.
