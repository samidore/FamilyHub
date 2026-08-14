# Acceptance and release

## Module contract

Each active page has a typed registry entry, a strict domain parser/schema, structured data, a domain presentation, and acceptance coverage. A new page must add registry metadata and keywords, define its schema and build-time parser, add its page/card/filter presentation, use the shared layout and trust conventions, and add schema, build-output, interaction, responsive, and privacy checks before it is added to navigation.

## Verification gate

Run the smallest relevant checks while editing, then the full gate before publishing:

```text
pnpm run validate
pnpm run check
pnpm run build
pnpm run audit
pnpm run test:rules
pnpm run test:browser
```

The rules tests use `firebase emulators:exec` and require Java locally; GitHub-hosted Ubuntu runners provide Java. Install Playwright Chromium once on a new machine with `pnpm exec playwright install chromium`.

## Required acceptance

- Home exposes exactly the six active registry modules and each route produces a page with a `main-content` target.
- Baseline public counts remain 29 Day Trips, 18 Library Activities, 10 Pediatric Dentists, 10 Adult Dermatologists, and 18 Colonoscopy Specialists. Tests should compare rendered counts with validated data rather than duplicating numbers in browser logic.
- Every page server-renders its reference content, supports combined search/filter/sort behavior with JavaScript, preserves bookmarkable query state, recovers from empty results, and avoids horizontal overflow at 375, 390, 430, 768, 1024, and 1440px.
- Public schemas reject unknown/private fields, unsafe URLs, invalid ranges, unsupported values, duplicate stable IDs, and broken references. Generated HTML passes the privacy scan.
- Meal Builder validates manifest completeness, stable ordering, globally unique IDs, archive isolation, ingredient references, and active counts of 134 Ingredients, 131 visible Starter choices, and 163 Recipes. Checkout atomically validates its checkout-only easy-braise eligibility.

## Release discipline

Record `verifiedDate` only after checking the underlying source, using `YYYY-MM-DD`. Time-sensitive content tells readers to check the current official page; it is not automatically expired. Publish through the GitHub Pages workflow only after the full gate passes. Commit only task-related changes and preserve unrelated user work.
