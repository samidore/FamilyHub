# Meal Builder Firebase shared state

Meal Builder uses Firebase Google Authentication with `browserLocalPersistence` and Realtime Database. Ingredient, Recipe, and optional-group facts come from the indexed YAML tree under `src/data/meal-builder/`; Firebase stores only household membership and operating state: aggregate inventory, freezer reserve, thawing jobs, optional dated FIFO inventory batches, the current meal and its freshness snapshot, active step, Recipe Plan composition, Recipe-scoped Checkout Actual composition, and recent meals. A configured Firebase error is shown and never falls back to local data.

## Firebase Console setup

1. Register a Web app in the Firebase project. Firebase Hosting is not required because GitHub Pages hosts the site.
2. Open **Authentication → Sign-in method → Google**, enable it, choose the project support email, and save. Anonymous Authentication is not used.
3. Under **Authentication → Settings → Authorized domains**, keep `samidore.github.io` and `localhost` for local development.
4. Create Realtime Database in locked mode.
5. In Realtime Database **Rules**, publish the repository's `database.rules.json`.
6. In Realtime Database **Data**, create `households/family-household/settings/enrollmentOpen` with Boolean `true` during first enrollment.

The database rules require a verified Google token. A member record stores the token email:

```text
households/family-household/members/{uid}/email = "person@gmail.com"
```

While `enrollmentOpen` is `true`, each Google user can create only their own member record. After the intended members sign in, set it to Boolean `false`; existing members retain access.

Membership records from the earlier anonymous-auth release used Boolean `true`. They do not authorize Google accounts and may be removed after new Gmail members join; do not replace new `{ "email": "..." }` objects with Boolean values.

When enrollment is closed, a new signed-in user creates only:

```text
households/family-household/accessRequests/{uid}/email = "person@gmail.com"
```

To approve it, create `members/{uid}/email` with exactly the requested Gmail address, then remove the matching access request. Do not change an existing member email; remove and recreate the record if the account must change.

## GitHub repository variables

Set these under **Settings → Secrets and variables → Actions → Variables**:

| Variable | Firebase config value |
| --- | --- |
| `PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `PUBLIC_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `PUBLIC_FIREBASE_APP_ID` | `appId` |
| `PUBLIC_FAMILY_HOUSEHOLD_ID` | `family-household` |

`PUBLIC_FIREBASE_STORAGE_BUCKET` and `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` are optional. Repository variables are compiled into the production artifact; rerun the Pages workflow after changing them.

## Household state shape

Aggregate inventory keeps the existing compact representation:

```text
households/{householdId}/state/inventory/{ingredientId} = true | positive half-unit number
```

Only Ingredients whose canonical YAML has `inventory_freshness: fifo` also use:

```text
households/{householdId}/state/inventoryBatches/{ingredientId}/{YYYY-MM-DD} = positive half-unit number
```

The runtime keeps the sum of dated batches equal to the aggregate counted quantity. Same-day additions merge, later dates remain distinct, and decreases consume oldest dates first. Existing aggregate FIFO stock with no batch metadata is deterministically migrated to `2026-08-18`; this is a release migration marker, not a claimed historical purchase date.

Content version 1.24 has one explicit Ingredient-ID migration: legacy `boneless-skinless-chicken-thighs` and `bone-in-chicken-thighs` both canonicalize to `chicken-thighs`. Canonicalization occurs before normal unknown-ID filtering. If more than one of those keys exists, aggregate quantities are added; FIFO quantities are merged by date; the oldest freshness-snapshot date wins; and current-meal availability, bindings, exclusions, legacy flat checkout draft, and Recipe-scoped Checkout Actual Ingredient IDs are rewritten to the canonical ID. On the first connected read that still contains either legacy ID, the Firebase repository commits the canonicalized state with a Realtime Database transaction. Subsequent reads contain only `chicken-thighs`.

Current-meal ranking stores only the oldest-date snapshot it needs:

```text
households/{householdId}/state/currentMeal/ingredientFreshnessDates/{ingredientId} = YYYY-MM-DD
```

Entering/resnapshotting Recipes refreshes this map from live batch state. Inventory edits afterward do not rewrite that current-meal snapshot. Checkout still reads the latest live inventory and FIFO batches and commits all deductions atomically.

### Recipe Plan state

The Plan selected in Recipes is stored as stable IDs only:

```text
currentMeal/selectedRecipeIds/{index} = recipeId
currentMeal/recipeIngredientBindings/{recipeId}/{index} = ingredientId
currentMeal/selectedAddons/{index}/mainRecipeId = recipeId
currentMeal/selectedAddons/{index}/addonType = optionalGroupId
currentMeal/selectedAddons/{index}/ingredientId = ingredientId
```

`recipeIngredientBindings` stores hard/`one_of` choices. `selectedAddons` stores planned optional choices. Static optional-group membership, labels, contributions, and default quantities remain in YAML and are never copied into Firebase.

### Recipe-scoped Checkout Actual state

Checkout Actual is stored separately from Plan:

```text
currentMeal/checkoutRecipeDrafts/{recipeId}/bindings/{index} = ingredientId
currentMeal/checkoutRecipeDrafts/{recipeId}/optionalAddons/{index}/addonType = optionalGroupId
currentMeal/checkoutRecipeDrafts/{recipeId}/optionalAddons/{index}/ingredientId = ingredientId
currentMeal/checkoutRecipeDrafts/{recipeId}/consumption/{ingredientId} = false | nonnegative half-unit number
```

Realtime Database may omit empty arrays/objects, so normalization restores omitted empty `optionalAddons`/`consumption` collections safely.

Checkout Actual is initialized from Plan but may diverge: the cook can change a valid `one_of` binding, remove a planned optional, or add an unplanned optional that is valid for that Recipe and currently stocked. These writes do **not** rewrite `recipeIngredientBindings` or `selectedAddons`.

The rules validate only the storage shape and primitive constraints. Application transaction validation additionally enforces Recipe IDs, binding membership, optional-group eligibility, no required+optional duplicate within one Recipe, live inventory, and aggregate quantity limits.

The older flat `checkoutDraft/{ingredientId}` shape is retained only for persisted-state compatibility. New composition Checkout uses `checkoutRecipeDrafts`.

## State and privacy invariants

- Store stable Ingredient/Recipe/group IDs and household operating state only. Do not copy Recipe facts, source URLs, Gmail addresses, UIDs, tokens, private schedules, or family profile data into the public repository or meal state.
- Inventory totals and `inventoryBatches` are one transactionally consistent operating-state model. Presence-only and non-FIFO Ingredients do not need dated batches.
- Inventory and current-meal availability/freshness are independent snapshots. Recipe reset leaves inventory unchanged; inventory reset requires explicit confirmation and clears aggregate inventory plus FIFO batch metadata without rewriting the current meal.
- Plan and Actual are distinct. Checkout edits do not mutate the earlier Plan.
- Checkout is transaction-safe: validate every Recipe Actual draft, aggregate all Recipe quantities by Ingredient, validate the aggregate against current inventory, consume FIFO batches from oldest to newest, then commit aggregate inventory, batch metadata, recent meal, and next meal atomically. A stale meal or invalid quantity must not partially decrement either aggregate or batch state.
- Counted Checkout defaults and +/- controls share the same global available quantity across Recipe cards; one Ingredient cannot be independently over-allocated by each Recipe card.
- Presence-only `用完` booleans aggregate with logical OR across Recipes.
- Unknown/archived IDs already present in household state are ignored by reconciliation unless an explicit release migration maps them first. The only current aliases are the two retired chicken-thigh IDs mapped to `chicken-thighs`; retired IDs are never reused.

## Verification

1. Leave enrollment open and sign in from each intended Gmail account once. Confirm each appears under `members` with its own UID and email.
2. On two phones, change aggregate inventory and verify realtime synchronization. For a FIFO Ingredient, add stock on different dates or controlled test dates and verify distinct date batches remain synchronized while the displayed total stays correct.
3. Start a meal, then change the live inventory from the other phone. Confirm the current meal's availability and oldest-date ranking snapshot do not change until the meal is deliberately resnapshotted through the Recipes flow.
4. In Recipes, select a `one_of` choice and optional Ingredient. Open Checkout on the other device; confirm Actual starts from that Plan, then change the `one_of` and optional choices and verify the original Plan fields are unchanged.
5. Use the same counted Ingredient in two Recipe Actual cards. Confirm default/+ controls do not allocate more than the live global total.
6. Checkout a quantity that crosses two FIFO batches. Confirm the final aggregated quantity consumes the oldest batch first and aggregate inventory changes by the same total amount.
7. For a controlled legacy-state test, seed both retired chicken-thigh IDs with different FIFO dates, reconnect once, and confirm the database contains only `chicken-thighs`, with summed aggregate quantity, merged dated batches, and the oldest current-meal freshness date preserved.
8. Set enrollment closed. Confirm existing members reconnect after a browser restart without another login.
9. Sign in with a different Gmail. Confirm it sees a pending-approval state, cannot access shared state, and creates only its own access request.
10. Approve the request by creating its member record and confirm the page connects.
11. Run `pnpm run test:rules` with the Firebase emulator, plus the full project verification gate.

Clearing browser site data, explicitly logging out, or revoking Google access requires login again. Never commit Gmail addresses, UIDs, tokens, household inventory, or meal state. Local emulator runs require Java; GitHub-hosted Ubuntu runners provide it.
