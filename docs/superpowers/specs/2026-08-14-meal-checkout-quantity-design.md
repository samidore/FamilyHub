# Meal checkout quantity synchronization

Checkout keeps a page-local draft for the active `mealId`. Each click updates it immediately, increments a local revision, and queues an immutable draft snapshot behind earlier writes. The queue persists each snapshot through the existing repository transaction API, using the transaction's current inventory for validation and clamping.

Realtime updates always refresh the last authoritative checkout draft. They replace the displayed draft only when that meal has no queued local edit; a new meal always takes over. Completion handlers apply state only when both their `mealId` and revision are still current, preventing an older write from repainting a newer click. The latest failed write restores the most recently received authoritative draft and announces the error.

The data contract is unchanged: counted ingredients remain in 0.5 increments and clamp from zero to current inventory; optional easy-braise items still use their first `+` as `+1`; presence-only items remain Boolean "used up" controls. Checkout eligibility, Firebase schema, and repository API are unchanged.
