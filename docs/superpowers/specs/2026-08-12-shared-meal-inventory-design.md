# Shared Household Inventory and Meal Workflow

## Goal

Extend the existing single-route Meal Builder with a shared household inventory, collaborative meal status, and Checkout while preserving all current Recipe ranking, scoring, tolerance, child-coverage, Vegetable/add-on, Cook View, stable-ID, KB, and GitHub Pages behavior.

## Data authority and tracking

`FAMILY_MEAL_KB.md` remains the only source of Ingredient and Recipe facts. Every Ingredient gains a required `inventory_tracking` value of `counted` or `presence-only`; Firebase stores only stable IDs and household operating state. The presence-only Ingredients are `eggs`, `rice`, `noodles`, `bread`, `steamed-buns`, `oats`, and `white-oil-sausage`; all others are counted.

Counted quantities use rough half-unit increments. Turning an absent item on starts it at `1`; decrementing to `0` turns it off. Presence-only items store only on/off state.

## Shared state and authorization

The Realtime Database shape is:

```text
households/{householdId}/members/{anonymousUid}: true
households/{householdId}/state/inventory/{ingredientId}: true | positive half-step number
households/{householdId}/state/currentMeal: CurrentMeal | null
```

Firebase Anonymous Auth uses persistent browser auth and has no login UI. Database rules grant household-state access only to UIDs manually approved under `members`; clients cannot modify membership. An unapproved device shows its UID and approval instructions. Both approved devices use the same configured household ID.

The app uses a Firebase repository when complete Firebase build configuration is present. A configured Firebase failure is surfaced and never silently falls back. With no Firebase configuration, development and CI use a clearly labelled local repository backed by `localStorage` and cross-tab notification.

## Meal workflow

Starting a new current meal copies the inventory items that are on into current-meal availability once. Inventory and current-meal availability then remain independent. Turning a current-meal Ingredient off can reconcile away Recipes or add-ons that are no longer feasible, but never changes inventory.

The shared status is `selecting`, `ready`, or `cooking`. Targets, availability, Recipe bindings, selected Recipe/add-on stable IDs, and status are shared. Existing completion rules continue to gate the bottom confirmation button; confirmation changes `selecting` to `ready`. Recipe Reset clears only selections, bindings, and add-ons, requires no confirmation, and returns to `selecting`. Starting Cook View changes the status to `cooking`.

Inventory Reset requires confirmation and clears only inventory. All household mutations use transactional updates so concurrent clients operate on current remote state rather than overwriting stale snapshots.

## Checkout

Checkout is a local draft opened from Cook View while shared status remains `cooking`. Used Ingredients are the unique stable IDs from selected Recipe bindings plus selected add-ons. Counted consumption defaults to `min(1, current inventory)` and adjusts in half units from `0` to the available quantity. Presence-only “used up” defaults off.

Checkout confirmation runs one transaction over household `state`. It succeeds only when the same `mealId` still exists with status `cooking`, applies inventory reductions, and clears the current meal. This prevents stale or duplicate checkout. Meal history is not stored in v1.

## Interface and verification

Keep `/meal-builder/` as one route with mobile Inventory and Current Meal views plus visible connection state. Preserve the existing readable catalog and no-JavaScript reference behavior.

Automated coverage includes strict KB tracking validation and unchanged record counts, household-domain state transitions and checkout, Firebase emulator security rules, cross-tab local synchronization, both inventory modes, reset confirmation differences, the shared status flow, Checkout, and all existing Meal Builder browser and unit coverage. Run the full project validation suite before committing and pushing implementation changes.

Firebase project creation remains an operator step. Documentation must cover Anonymous Auth, Realtime Database, authorized domains, rules deployment, GitHub repository variables, UID approval, and final two-phone verification. Real two-phone acceptance cannot be claimed until that configuration exists.
