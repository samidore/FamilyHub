# Meal Builder Firebase shared state

Meal Builder uses Firebase Google Authentication with `browserLocalPersistence` and Realtime Database. Ingredient and Recipe facts come from the indexed YAML tree under `src/data/meal-builder/`; Firebase stores only household membership and operating state: aggregate inventory, optional dated FIFO inventory batches, the current meal and its freshness snapshot, active step, recipe selections/bindings, add-ons, and checkout draft. A configured Firebase error is shown and never falls back to local data.

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

Current-meal ranking stores only the oldest-date snapshot it needs:

```text
households/{householdId}/state/currentMeal/ingredientFreshnessDates/{ingredientId} = YYYY-MM-DD
```

Entering/resnapshotting Recipes refreshes this map from live batch state. Inventory edits afterward do not rewrite that current-meal snapshot. Checkout still reads the latest live inventory and FIFO batches and commits all deductions atomically.

## State and privacy invariants

- Store stable Ingredient/Recipe IDs and household operating state only. Do not copy recipe facts, source URLs, Gmail addresses, UIDs, tokens, private schedules, or family profile data into the public repository or meal state.
- Inventory totals and `inventoryBatches` are one transactionally consistent operating-state model. Presence-only and non-FIFO Ingredients do not need dated batches.
- Inventory and current-meal availability/freshness are independent snapshots. Recipe reset leaves inventory unchanged; inventory reset requires explicit confirmation and clears aggregate inventory plus FIFO batch metadata without rewriting the current meal.
- Checkout is transaction-safe: validate the draft against current inventory and meal revision, consume FIFO batches from oldest to newest, then commit aggregate inventory, batch metadata, recent meal, and next meal atomically. A stale meal or invalid quantity must not partially decrement either aggregate or batch state.
- Unknown/archived IDs already present in household state are ignored by reconciliation. Never reuse an archived ID for a new record.

## Verification

1. Leave enrollment open and sign in from each intended Gmail account once. Confirm each appears under `members` with its own UID and email.
2. On two phones, change aggregate inventory and verify realtime synchronization. For a FIFO Ingredient, add stock on different dates or controlled test dates and verify distinct date batches remain synchronized while the displayed total stays correct.
3. Start a meal, then change the live inventory from the other phone. Confirm the current meal's availability and oldest-date ranking snapshot do not change until the meal is deliberately resnapshotted through the Recipes flow.
4. Checkout a quantity that crosses two FIFO batches. Confirm the oldest batch is removed/reduced first and aggregate inventory changes by the same total amount.
5. Set enrollment closed. Confirm existing members reconnect after a browser restart without another login.
6. Sign in with a different Gmail. Confirm it sees a pending-approval state, cannot access shared state, and creates only its own access request.
7. Approve the request by creating its member record and confirm the page connects.
8. Run `pnpm run test:rules` with the Firebase emulator, plus the full project verification gate.

Clearing browser site data, explicitly logging out, or revoking Google access requires login again. Never commit Gmail addresses, UIDs, tokens, household inventory, or meal state. Local emulator runs require Java; GitHub-hosted Ubuntu runners provide it.
