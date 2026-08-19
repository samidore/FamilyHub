# Family Hub — Codex Handoff

> Superseded historical reference. `PROJECT.md` is the current authority. This handoff documents the original two-module migration and must not limit the current three-module foundation or visual system.

## 1. Goal

Create one mobile-first family website with one stable URL and a simple home page.

The first release has exactly two modules:

1. **Day Trips**
2. **Library Activities**

Do not add future modules in the first release. The code may use a reusable home-card component, but do not build a plugin system, settings page, database, authentication system, CMS, or generic module framework.

## 2. Source Files

Use these files as the authoritative starting point:

- `family_outing_hub_combined_prototype.html`
  - Approved visual direction
  - Current Day Trips and Library Activities prototype
- `GPT.md`
  - Coding behavior rules for this project

If source data conflicts with this handoff, stop and report the conflict before silently choosing one.

## 3. Privacy Assumption

The initial GitHub Pages site is **publicly accessible on the internet**.

Do not describe it as private.

Do not include:

- Home address
- Child's name
- Family photos
- Private schedules
- Personal contact information
- Notes that would be unsafe to publish

If private access is required, do not implement GitHub Pages authentication. Stop and present hosting/access-control alternatives.

## 4. Minimum Technical Architecture

Use **Astro** only as a static site generator.

Do not add React, Vue, a backend, a database, or a CMS.

Use:

- Astro
- TypeScript where Astro requires it
- Plain CSS
- Small amounts of plain client-side JavaScript for search, filtering, and sorting
- GitHub Actions for GitHub Pages deployment

Store content in three data files:

```text
src/data/modules.json
src/data/day-trips.json
src/data/library-events.json
```

Do not create one Markdown file per destination or event in the first release. The dataset is small enough that three structured files are simpler.

Recommended project structure:

```text
family-hub/
├── GPT.md
├── HANDOFF.md
├── README.md
├── package.json
├── astro.config.mjs
├── public/
├── src/
│   ├── components/
│   │   ├── ModuleCard.astro
│   │   ├── DestinationCard.astro
│   │   ├── LibraryEventCard.astro
│   │   └── SiteHeader.astro
│   ├── data/
│   │   ├── modules.json
│   │   ├── day-trips.json
│   │   └── library-events.json
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── day-trips.astro
│   │   └── library-activities.astro
│   └── styles/
│       └── global.css
└── .github/
    └── workflows/
        └── deploy.yml
```

Create additional files only when they solve a demonstrated need.

## 5. Home Page

The home page is a launcher, not a dashboard.

Display:

- Title: **Family Hub**
- Short subtitle
- Two large tappable cards:
  - Day Trips
  - Library Activities
- Current item count for each module
- Last-updated date derived from the data

Do not add navigation for modules that do not exist.

The home page must remain useful at a 390-pixel viewport width.

## 6. Shared Mobile Requirements

- Body text: at least 17px on mobile
- Card titles: approximately 26–30px
- Tap targets: at least 44px high
- One card per row on mobile
- No horizontal scrolling
- No wide tables
- No frozen or sticky filter panel
- Filters may collapse on mobile, but must scroll away with the page
- Preserve the calm, text-first, green/neutral card design from the prototype
- Do not add decorative animation

## 7. Day Trips

Migrate all **29 current destinations** from the prototype into `src/data/day-trips.json`.

Each destination record must support:

```json
{
  "name": "",
  "shortName": "",
  "location": "",
  "category": "",
  "driveMin": 0,
  "driveMax": 0,
  "status": "",
  "ratings": {
    "indoor": 0,
    "outdoor": 0,
    "stroller": 0,
    "weather": 0,
    "toddler": 0,
    "parent": 0
  },
  "tags": [],
  "conditions": [],
  "verifiedFacts": "",
  "familyFit": "",
  "risks": "",
  "beforeYouGo": "",
  "googleMapsUrl": "",
  "officialUrl": "",
  "verifiedDate": ""
}
```

Use `null` for an unconfirmed rating. Do not invent a value.

### Required card content

- Name
- Location
- Category
- Drive-time range
- Family status
- Toddler rating
- Parent rating
- Stroller rating
- Weather-tolerance rating
- Tags
- Verified facts
- Family fit
- Risks / limitations
- Before-you-go note
- Google Maps / Photos button
- Official website button

### Required controls

All controls must combine correctly:

- Search
- Category
- Drive-time band
- Weather / use case
- Family status
- Minimum indoor rating
- Minimum outdoor rating
- Minimum stroller rating
- Minimum weather-tolerance rating

Sorting:

- Recommended
- Shortest drive
- Toddler rating
- Parent rating
- Name

The count must update after filtering.

## 8. Library Activities

Migrate all **18 current events** from the prototype into `src/data/library-events.json`.

Each event record must support:

```json
{
  "day": "",
  "dayOrder": 0,
  "time": "",
  "timeOrder": 0,
  "name": "",
  "library": "",
  "location": "",
  "drive": "",
  "age": "",
  "ageGroup": "",
  "description": "",
  "registration": "",
  "badges": [],
  "googleMapsUrl": "",
  "officialUrl": "",
  "verifiedDate": "",
  "dateRange": ""
}
```

Do not convert recurring schedules into invented calendar dates.

### Display order

Default order:

1. Weekday
2. Time within weekday

### Required controls

- Search
- Weekday
- Library
- Age status
- Sort by schedule
- Sort by drive time
- Sort by library

Each event card must show:

- Time
- Event name
- Library
- Location and drive time
- Age
- Description
- Registration
- Badges / caveats
- Google Maps button
- Official activity or library link

## 9. Data Quality

Keep these visually separate:

- Verified facts
- Family-specific assessment
- Risks / limitations
- Before-you-go checks

Do not turn family assessments into factual claims.

For factual data:

- Prefer official venue, library, municipal, county, state, or federal sources.
- Preserve “not confirmed” or “rules pending confirmation” when the prototype says so.
- Do not infer bathroom access, parking cost, admission, stroller suitability, registration rules, or opening hours.
- Keep a `verifiedDate` field.
- Do not claim a page is current merely because its file was recently modified.

The first implementation is a migration task, not a fresh research task. Do not silently rewrite the content.

## 10. Images

Do not add destination images in the first release.

Do not use generic stock photos or repeated placeholders.

Keep the Google Maps / Photos button.

Family photos are explicitly out of scope while the site is publicly accessible.

## 11. Deployment

Configure GitHub Pages deployment through GitHub Actions.

Before deployment, run:

```bash
npm run check
npm run build
```

A failed check or build must fail the workflow.

Document:

- How to run locally
- How to edit Day Trips data
- How to edit Library Activities data
- How to deploy
- The fact that the published GitHub Pages URL is public

## 12. Implementation Plan and Verification

Codex should use this plan:

```text
1. Inspect the prototype and extract both datasets
   → verify: exactly 29 destinations and 18 library events are parsed

2. Build the minimal Astro shell and home page
   → verify: home page shows exactly two module cards at 390px width

3. Build Day Trips from JSON
   → verify: 29 cards render; every filter and sort combination preserves valid results

4. Build Library Activities from JSON
   → verify: 18 cards render; default order is weekday then time

5. Add GitHub Pages workflow and documentation
   → verify: npm run check and npm run build pass
```

If the prototype cannot be parsed reliably, stop and report the exact records that require manual migration. Do not fabricate missing content.

## 13. Acceptance Criteria

The first release is complete only when:

1. One URL opens the Family Hub home page.
2. The home page shows exactly Day Trips and Library Activities.
3. Day Trips renders 29 records.
4. Library Activities renders 18 records.
5. Search, filters, sorting, and visible result counts work.
6. Filter controls do not stay fixed while scrolling.
7. The layout works without horizontal scrolling at 390px.
8. Every external link is present and uses a valid `https://` URL.
9. No generic images or family photos are added.
10. Content lives in the three specified data files, separate from layout code.
11. `npm run check` passes.
12. `npm run build` passes.
13. GitHub Pages deployment is documented as public.
14. The implementation does not include unrequested future modules or infrastructure.
