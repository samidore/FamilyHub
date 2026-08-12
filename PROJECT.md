# Family Hub Project Charter

## Purpose

Family Hub is a mobile-first reference site for recurring family decisions that benefit from structured lists, search, filtering, and comparison. The active public modules are Day Trips, Library Activities, Pediatric Dentists, Adult Dermatologists, Colonoscopy Specialists, and Meal Builder. Future public modules may include play ideas; private calendars, appointments, and personal notes require a separately authenticated system.

This file is the current product and data authority. `HANDOFF_Family_Hub.md` and `family_outing_hub_combined_prototype.html` are historical migration references only.

## Product principles

- Design for phone use first, including outdoor use and one-handed interaction.
- Keep the home page an organized directory rather than a dashboard.
- Share navigation, accessibility, trust, and filter conventions while allowing each module its own information design.
- Keep source facts, family assessment, limitations, and before-you-go checks visibly separate.
- Prefer explicit domain schemas over a universal list format.
- Do not claim freshness from file modification dates. A verification date means the underlying information was checked.

## Privacy boundary

The GitHub Pages site is public on the internet. The first release permits only **public-reference** data: public venue, event, provider, source, and non-identifying family-assessment information.

The following must never be committed to or rendered by the public site:

- Names or identifying details of family members or children
- Exact home address, personal phone numbers, or personal email addresses
- Medical records, diagnoses, insurance identifiers, or private care notes
- Appointments, private schedules, travel plans, or location history
- Family photos or identifying private notes
- Credentials, tokens, secrets, or access-control information

Sensitive family context may be used only when it is generalized and cannot identify a person. Private family data requires real authentication, authorization, encrypted private storage, and a hosting review. Hidden routes, unlinked pages, committed JSON, and browser local storage are not privacy controls.

The public site must not add analytics, third-party embeds, remote fonts, or other passive tracking without an explicit privacy review. External resources should be ordinary user-initiated links.

## Language policy

- Navigation, general guidance, family assessments, limitations, and comments use Chinese.
- U.S. names, addresses, organizations, programs, credentials, and official terminology remain in English.
- Do not automatically translate English source content into Chinese.
- Mixed-language content is intentional; preserve the meaning and register of existing research.

## Units

- Road travel: minutes and miles when distance is known; never invent mileage.
- Everyday dimensions: metric units such as mm, cm, m, and kg as appropriate.
- Weather: degrees Celsius (`°C`).
- Recipe weights: grams for smaller amounts and pounds for larger amounts; do not use ounces.
- Recipe liquids: cups plus mL.
- Oven and air-fryer temperatures: degrees Fahrenheit (`°F`).

## Accessibility and interaction

- Target WCAG 2.2 AA.
- Mobile body text starts at 18px, controls at 17px, card titles at 28–32px, and tap targets at 48px.
- Support keyboard navigation, visible focus, reduced motion, logical headings, live result counts, and text zoom to 200%.
- Avoid horizontal scrolling, hover-only controls, sticky filter panels, decorative animation, and color-only meaning.
- Server-render the complete content. JavaScript may progressively enhance filtering, sorting, URL query state, and result counts. Dynamic tools such as Meal Builder may require JavaScript for derived selection, ranking, and view state, provided their complete reference content remains readable without JavaScript and the page clearly explains the limitation.

## Data and source rules

- Every active module has a typed registry entry, a strict domain schema, structured data, a domain presentation, and acceptance coverage.
- Schemas reject unknown fields, invalid ranges, unsafe URLs, and unsupported values.
- Use `null` or an omitted optional value when information is unknown; never invent facts or ratings.
- Prefer official venue, library, municipal, county, state, federal, practice, provider, and credential sources.
- Preserve caveats such as “not confirmed” and “rules pending confirmation.”
- External links must use HTTPS and safe new-tab attributes.
- Time-sensitive pages must tell readers to check current official sources. Content is updated manually when requested; it is not automatically expired or hidden.

## Module contract

To add a public module:

1. Add its metadata and search keywords to the typed module registry.
2. Define a strict domain schema and parse the structured dataset at build time.
3. Add the module page, card/list presentation, domain filter controller, and one accessible accent theme.
4. Use the shared header, filter shell, result count, empty state, source-link, and trust conventions.
5. Add schema, build-output, interaction, responsive, and privacy acceptance checks.
6. Update this charter only when the project-wide policy changes.

Planned categories and modules remain absent from navigation until they have a working route, validated data, and tests.

## Update workflow

1. Edit the appropriate structured dataset without rewriting unrelated records.
2. Record `verifiedDate` only for facts actually checked, using `YYYY-MM-DD`.
3. Run `pnpm run validate`, `pnpm run check`, `pnpm run build`, and `pnpm run audit`.
4. Run browser tests for interaction or layout changes.
5. Publish through the GitHub Pages workflow only after all checks pass.

## Current acceptance

- The home groups and searches the six working modules.
- Exactly 29 trips, 18 library activities, 10 pediatric dentists, 10 adult dermatologists, and 18 colonoscopy specialists are preserved.
- Every module works without client JavaScript and gains combined search/filter/sort behavior with it.
- Query state is bookmarkable, empty states are recoverable, and external links are safe.
- Layouts work without horizontal overflow at 375, 390, 430, 768, 1024, and 1440 pixels.
- Public data passes strict schemas and contains no private-family fields.
- Meal Builder parses its public-safe Markdown KB as the single Ingredient/Recipe source and preserves 132 Ingredients, 129 visible Starter choices, and 139 Recipes.
- Validation, Astro checks, production build, registry audit, and browser smoke tests pass.
