# Family Hub

Family Hub is a public, mobile-first Astro reference hub for family lists, comparisons, and the shared Meal Builder. Start with [`PROJECT.md`](PROJECT.md), then open the page-specific docs before changing a page or its data.

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
pnpm run test:rules
pnpm run test:browser
```

Install Playwright Chromium once on a new machine with `pnpm exec playwright install chromium`.

## Active pages and data

- Day Trips: `src/data/day-trips.json` · [`docs/modules/day-trips/README.md`](docs/modules/day-trips/README.md)
- Library Activities: `src/data/library-events.json` · [`docs/modules/library-activities/README.md`](docs/modules/library-activities/README.md)
- Pediatric Dentists: `src/data/pediatric-dentists.json` · [`docs/modules/pediatric-dentists/README.md`](docs/modules/pediatric-dentists/README.md)
- Adult Dermatologists: `src/data/adult-dermatologists.json` · [`docs/modules/adult-dermatologists/README.md`](docs/modules/adult-dermatologists/README.md)
- Colonoscopy Specialists: `src/data/colonoscopy-specialists.json` · [`docs/modules/colonoscopy-specialists/README.md`](docs/modules/colonoscopy-specialists/README.md)
- Meal Builder: indexed YAML under `src/data/meal-builder/` · [`docs/modules/meal-builder/README.md`](docs/modules/meal-builder/README.md)

Active module metadata and home categories live in `src/config/modules.ts`; strict public-data rules live in `src/data/schemas.mjs`. Meal Builder data rules start from its module README and data model; archived migration material under `docs/archive/` is not a build source.

Keep U.S. proper names, addresses, programs, credentials, official terminology, and source titles in English. General guidance, family assessments, limitations, comments, and household instructions use Chinese. Do not translate source material automatically. Only set `verifiedDate` after checking the underlying source; leave unknown values empty or `null` as permitted by the schema.

## Add or update a page

1. Read `PROJECT.md`, the relevant module README, and the shared design/privacy/language/acceptance docs.
2. Edit only the appropriate structured dataset and page-owned presentation. Use the module's documented schema and stable-ID rules.
3. Add or update schema, build-output, interaction, responsive, and privacy coverage with the behavior change.
4. Run the full verification gate, inspect the generated output, and publish only after it passes.

Do not solve private-family requirements with hidden pages, unlinked URLs, committed private JSON, or local storage. Authentication and private storage require a separate architecture review.

## Deploy

Push the project to `main`; the GitHub Pages workflow installs dependencies and Chromium, validates data, checks Astro, builds, audits the output, runs browser tests, and publishes `dist`. In GitHub **Settings → Pages**, choose **GitHub Actions** as the source. `astro.config.mjs` derives the base path for user, organization, and project Pages sites.

## Historical references

Historical migration and provenance material lives under `docs/archive/`. It is not a current source of project behavior or data.
