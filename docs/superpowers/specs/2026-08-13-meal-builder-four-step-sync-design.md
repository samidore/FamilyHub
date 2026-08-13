# Meal Builder four-step synchronized flow

Meal Builder remains one URL with four shared, full-screen steps: inventory, recipes, cook, and checkout. `activeStep` is household state, so every connected device renders the same step.

Inventory stays grouped by the existing eleven KB starter sections and shows each section's in-stock/total count. Starting a meal snapshots current stock into the meal. Recipe selection is a shared selecting state; in-stock ingredient cards default on, exclusions are retained, and invalid selections are reconciled when availability changes.

Recipe selection retains the existing targets, candidates, selected recipes, bindings, and leafy add-on behavior. A complete selection advances directly to cook while preserving the `selecting`, `ready`, and `cooking` lifecycle values for compatibility. Cook can return to recipes or advance to checkout.

Checkout is a shared `checkoutDraft`. Counted values change in 0.5 steps; presence-only items default to keep. Recipe selection, binding, or add-on changes clear the draft. Checkout uses an inline two-stage confirmation. The final repository transaction requires the same meal ID, `cooking` status, and `checkout` step; it rejects invalid or over-available consumption, applies inventory changes once, clears the meal, and returns all devices to inventory.

Persisted state normalizes old records by deriving an active step from the legacy lifecycle and adding empty exclusions/draft fields. The parser accepts optional strict recipe `checkout_units` mappings: known ingredient IDs and positive half steps only. Missing mappings use one unit per selected bound/add-on ingredient per recipe.

Validation covers domain normalization, exact-once checkout semantics, parser validation, Firebase field validation, and browser synchronization. The existing berry palette, local Atkinson font, server-rendered complete catalog, no-script content, 48px controls, visible focus, live announcements, and reduced-motion behavior are retained.
