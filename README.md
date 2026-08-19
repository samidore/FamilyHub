# Family Hub

Family Hub is a mobile-first Astro site for recurring family decisions, including public reference modules and the shared Meal Builder.

Read [`PROJECT.md`](PROJECT.md) for project structure and shared constraints. Module documentation lives under [`docs/modules/`](docs/modules/).

## Local development

Requires Node.js 24 and pnpm.

```bash
pnpm install
pnpm run dev
```

Run the complete verification gate with:

```bash
pnpm run verify
```

Install Playwright Chromium once on a new machine if needed:

```bash
pnpm exec playwright install chromium
```

## Deploy

Push to `main`. The GitHub Pages workflow verifies the repository, builds the production artifact, and deploys `dist`.
