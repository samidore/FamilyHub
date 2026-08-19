# Family Hub project index

Family Hub is a public, mobile-first Astro reference site for recurring family decisions. The active routes are:

| Area | Page | Route | Page documentation |
| --- | --- | --- | --- |
| Food & home | Meal Builder | `/meal-builder/` | [`docs/modules/meal-builder/README.md`](docs/modules/meal-builder/README.md) |
| Explore & play | Day Trips | `/day-trips/` | [`docs/modules/day-trips/README.md`](docs/modules/day-trips/README.md) |
| Explore & play | Library Activities | `/library-activities/` | [`docs/modules/library-activities/README.md`](docs/modules/library-activities/README.md) |
| Health & care | Pediatric Dentists | `/pediatric-dentists/` | [`docs/modules/pediatric-dentists/README.md`](docs/modules/pediatric-dentists/README.md) |
| Health & care | Adult Dermatologists | `/adult-dermatologists/` | [`docs/modules/adult-dermatologists/README.md`](docs/modules/adult-dermatologists/README.md) |
| Health & care | Colonoscopy Specialists | `/colonoscopy-specialists/` | [`docs/modules/colonoscopy-specialists/README.md`](docs/modules/colonoscopy-specialists/README.md) |

## Read before changing work

- Shared design and accessibility: [`docs/project/design-accessibility.md`](docs/project/design-accessibility.md)
- Public-data and privacy boundary: [`docs/project/privacy-data.md`](docs/project/privacy-data.md)
- Language and units: [`docs/project/language-units.md`](docs/project/language-units.md)
- Acceptance and release: [`docs/project/acceptance-release.md`](docs/project/acceptance-release.md)
- Meal Builder data and maintenance: [`docs/modules/meal-builder/README.md`](docs/modules/meal-builder/README.md)

`HANDOFF_Family_Hub.md`, `family_outing_hub_combined_prototype.html`, and the archived Meal Builder dump are historical references. They do not define current behavior or data.

## Mandatory project principles

- Design for phone use first, including one-handed use, outdoor use, text zoom to 200%, keyboard navigation, visible focus, reduced motion, logical headings, live result counts, and 48px minimum tap targets. Do not introduce horizontal scrolling, hover-only controls, sticky filter panels, decorative animation, or color-only meaning.
- Keep the home page an organized directory. Share header, filter, result-count, empty-state, source-link, trust, and accessibility conventions while allowing each page its own information design.
- Keep source facts, family assessment, limitations, and before-you-go checks separate. Use explicit domain schemas and strict build-time parsing; reject unknown fields, unsafe URLs, unsupported values, and invalid ranges.
- The published site contains only public-reference data. Never commit or render identifying family details, medical records, private schedules, exact home/contact details, credentials, tokens, secrets, or private notes. Hidden routes, local storage, and unlinked files are not privacy controls.
- Navigation, guidance, assessments, limitations, and comments use Chinese. U.S. names, addresses, organizations, programs, credentials, and official terminology stay in English; do not auto-translate source text.
- Use minutes and miles for road travel when known, metric everyday dimensions, Celsius for weather, grams/pounds (not ounces) for recipe weights, cups plus mL for recipe liquids, and Fahrenheit for ovens and air fryers. Never invent an unknown measurement.
- Prefer official current sources. A verification date means the underlying fact was checked; file modification time is not evidence. Time-sensitive pages tell readers to check the current official source.
- Every active page has a typed registry entry, strict structured data, a domain presentation, and acceptance coverage. New pages stay out of navigation until their route, data, schema, and tests work.

## Current acceptance summary

- The home page exposes exactly the six active pages listed above. Existing public datasets remain 29 trips, 18 library activities, 10 pediatric dentists, 10 adult dermatologists, and 18 colonoscopy specialists.
- Pages server-render complete reference content and progressively enhance search, filters, sorting, URL state, result counts, and empty states. External links use HTTPS and safe new-tab behavior.
- Meal Builder reads the indexed YAML data under `src/data/meal-builder/`; it has 135 Ingredients, 132 visible Starter choices, and 164 candidate Recipes, including 24 vegetable-centered structures, 23 checkout-only easy-braise Ingredients, and 36 iron-pan braise Recipes. `docs/archive/FAMILY_MEAL_KB.dump.md` is a historical GPT dump and is not a build source.
- Meal Builder's synchronized four-step flow covers inventory, recipe selection, cooking, and transaction-safe checkout. Shared household state stores stable IDs and operating state only; see its Firebase documentation.
- Before release, run `pnpm run validate`, `pnpm run check`, `pnpm run build`, `pnpm run audit`, and the relevant unit, rules, and browser tests. See [`docs/project/acceptance-release.md`](docs/project/acceptance-release.md) for the complete gate.
