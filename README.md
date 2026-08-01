# Family Hub

A mobile-first Astro site with two modules: 29 family day trips and 18 nearby library activities. The published GitHub Pages URL is public; do not add family photos, names, addresses, private schedules, or contact details.

## Run locally

Install Node.js 22 or newer, then run:

```bash
npm install
npm run dev
```

Before committing, verify the project:

```bash
npm run check
npm run build
```

## Edit content

- Home cards: `src/data/modules.json`
- Day trips: `src/data/day-trips.json`
- Library activities: `src/data/library-events.json`

Keep verified facts, family assessment, risks, and before-you-go checks separate. Use an ISO date (`YYYY-MM-DD`) in `verifiedDate` only when the underlying information was actually checked. Do not infer missing hours, prices, accessibility, parking, bathrooms, or registration rules.

The one-time prototype migration can be repeated with `npm run migrate`, but it overwrites all three data files and intentionally leaves verification dates blank because the prototype did not contain them.

## Deploy

1. Create or choose a GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the source.
3. The included workflow checks and builds the site before publishing it.

The configuration derives the GitHub Pages owner and repository path during the workflow, so it supports both organization/user Pages and project Pages URLs.
