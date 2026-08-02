# Family Hub

A mobile-first Astro reference hub for family lists that benefit from search, filtering, and comparison. The first release contains:

- 29 Day Trips
- 18 Library Activities
- 10 Pediatric Dentists

The published GitHub Pages URL is public. Read [`PROJECT.md`](PROJECT.md) before changing data, design, privacy boundaries, language, or units.

## Run locally

Use Node.js 24 and pnpm:

```bash
pnpm install
pnpm run dev
```

Run the complete local acceptance suite with:

```bash
pnpm run verify
```

The individual checks are:

```bash
pnpm run validate
pnpm run check
pnpm run build
pnpm run audit
pnpm run test:browser
```

Install Playwright Chromium once on a new machine with `pnpm exec playwright install chromium`.

## Edit content

- Day Trips: `src/data/day-trips.json`
- Library Activities: `src/data/library-events.json`
- Pediatric Dentists: `src/data/pediatric-dentists.json`
- Active module metadata and home categories: `src/config/modules.ts`
- Strict public-data rules: `src/data/schemas.mjs`

Keep U.S. proper names, addresses, programs, credentials, and official terminology in English. General guidance, family assessments, limitations, and comments use Chinese. Do not translate source material automatically.

Only set `verifiedDate` when the underlying source was actually checked. Leave unknown values empty or `null` as allowed by the schema; never infer missing hours, prices, accessibility, parking, bathroom access, registration rules, ratings, or mileage.

## Add a module

1. Add an active `ModuleDefinition` to `src/config/modules.ts`. Unfinished modules do not belong in navigation.
2. Add a strict domain parser and TypeScript record type.
3. Add the structured dataset and expose its parsed records through `src/data/catalog.ts`.
4. Add a domain folder under `src/modules/` for its card/list presentation, plus an explicit Astro page and filter controller.
5. Use the shared layout, field tab, filter shell, result count, empty state, source-link, and trust conventions.
6. Extend the registry audit and Playwright tests before publishing.

Do not solve private-family requirements with hidden pages, unlinked URLs, committed JSON, or local storage. Authentication and private storage require a separate architecture review.

## Deploy

1. Push the project to the repository’s `main` branch.
2. In GitHub **Settings → Pages**, choose **GitHub Actions** as the source.
3. The workflow installs dependencies and Chromium, validates public data, checks Astro, builds, audits the output, runs browser tests, and then publishes the static `dist` artifact.

The generated site works as either a user/organization Pages site or a project Pages site because `astro.config.mjs` derives the base path in CI.

## Historical references

`HANDOFF_Family_Hub.md` and `family_outing_hub_combined_prototype.html` document the original migration. They are retained for provenance and data comparison, but `PROJECT.md` is the current authority.
