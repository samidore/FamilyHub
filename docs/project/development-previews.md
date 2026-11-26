# Development previews

Run `npm.cmd run dev`. Add `?mock=…` to the real route. Preview data is synthetic, uses the existing local repositories, and stays in memory. Reloading resets it; no account or Firebase writes occur.

| Route | Mock values |
| --- | --- |
| `/today/` | `today-signed-in`, `today-signed-out`, `today-pending`, `today-loading`, `today-error`, `today-meal-error`, `today-notebook-error`, `today-reconnecting` |
| `/today/` notification states | `today-push-checking`, `today-push-enabling`, `today-push-disabling`, `today-push-enabled`, `today-push-disabled`, `today-push-denied`, `today-push-unsupported`, `today-push-unconfigured`, `today-push-error` |
| `/meal-builder/` | `meal-signed-in` |
| `/sami-notebook/` | `notebook-signed-in`, `notebook-pending`, `notebook-loading`, `notebook-error`, `notebook-reconnecting` |
| `/sami-notebook/developer/` | `developer-signed-in`, `developer-pending`, `developer-loading`, `developer-error`, `developer-reconnecting` |

Today read retries recover the synthetic failed source. Enabled/disabled notification previews use the normal UI controls. The enabling/disabling and checking previews stay pending for screenshots. Permission and delivery are simulated; previews do not establish real OS push delivery.

All mock entry points are guarded by `import.meta.env.DEV`. `pnpm run audit` scans every built HTML/JS/map file for fixture identifiers; a production browser test also checks that a mock URL cannot unlock Today. `tests/ux-dev-preview.spec.ts` starts its own Astro development server and exercises these states at 390 and 1440 pixels.

To regenerate review screenshots in the handoff folder, set `FAMILYHUB_UX_SHOTS=1` for that Playwright invocation.
