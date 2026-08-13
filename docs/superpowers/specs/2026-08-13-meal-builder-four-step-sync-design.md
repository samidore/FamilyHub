# Meal Builder four-step synchronized flow

Meal Builder remains one URL with four shared, full-screen steps: inventory, recipes, cook, and checkout. `activeStep` is household state, so every connected device renders the same step.

Inventory stays grouped by the existing eleven KB starter sections and shows each section's in-stock/total count. All groups are initially open, and local manual collapse choices survive inventory rerenders. Starting a meal snapshots current stock into the meal. Recipe selection is a shared selecting state; in-stock ingredient cards default on, exclusions are retained, and invalid selections are reconciled when availability changes. Potato and peeled shrimp are presence-only; persisted positive counts migrate to present.

Recipe selection retains the existing targets, candidates, selected recipes, bindings, and leafy add-on behavior. A complete selection advances directly to cook; a secondary “就这样吧” action may bypass completion after at least one Recipe is selected. The first three step buttons support shared navigation, while checkout is reachable only from cook. The `selecting`, `ready`, and `cooking` lifecycle values remain for compatibility.

Checkout is a shared `checkoutDraft`. Counted values change in 0.5 steps; presence-only items default to keep. Recipe selection, binding, or add-on changes clear the draft. Checkout uses an inline two-stage confirmation. The final repository transaction requires the same meal ID, `cooking` status, and `checkout` step; it rejects invalid or over-available consumption, applies inventory changes once, records the completed menu, creates a fresh meal from remaining stock, and returns all devices to recipes.

Household state retains the newest four completed menus. Feasible candidate Recipes not present in those menus rank first; older recent Recipes follow, and Recipes from the newest meal rank last. History changes order only and never hides a feasible Recipe.

Persisted state normalizes old records by deriving an active step from the legacy lifecycle and adding empty exclusions, draft, and recent-history fields. The parser accepts optional strict recipe `checkout_units` mappings: known ingredient IDs and positive half steps only. Missing mappings use one unit per selected bound/add-on ingredient per recipe.

Validation covers domain normalization, exact-once checkout semantics, parser validation, Firebase field validation, and browser synchronization. The existing berry palette, local Atkinson font, server-rendered complete catalog, no-script content, 48px controls, visible focus, live announcements, and reduced-motion behavior are retained.
