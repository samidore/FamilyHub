# Firebase shared meal setup

The Meal Builder uses Firebase Google Authentication with `browserLocalPersistence` and Realtime Database. Recipe and Ingredient facts remain in `FAMILY_MEAL_KB.md`; Firebase stores only household membership, inventory, and the current meal. A configured Firebase error is shown and never falls back to local data.

## Firebase Console

1. Register a Web app in the Firebase project. Firebase Hosting is not required because GitHub Pages hosts the site.
2. Open **Authentication → Sign-in method → Google**, enable it, choose the project support email, and save. Anonymous Authentication is no longer used.
3. Under **Authentication → Settings → Authorized domains**, keep `samidore.github.io` (and `localhost` for local development).
4. Create Realtime Database in locked mode.
5. Open Realtime Database **Rules**, replace the editor with `database.rules.json`, and publish.
6. In Realtime Database **Data**, create `households/family-household/settings/enrollmentOpen` with the Boolean value `true`.

The database rules require a verified Google token. A member record contains the token email:

```text
households/family-household/members/{uid}/email = "person@gmail.com"
```

While `enrollmentOpen` is `true`, each Google user can create only their own member record. Once all intended members have signed in, change `enrollmentOpen` to Boolean `false`. Existing members keep access.

Membership records from the earlier anonymous-auth release used the Boolean value `true`. They do not authorize Google accounts and may be removed after the new Gmail members have joined; do not replace the new `{ "email": "..." }` objects with Boolean values.

When enrollment is closed, a new signed-in user creates only:

```text
households/family-household/accessRequests/{uid}/email = "person@gmail.com"
```

To approve the request in Firebase Console, create `members/{uid}/email` with exactly the requested Gmail address. The open page observes its own membership and normally connects automatically. The administrator may then delete the matching access request. Do not change an existing member email; remove and recreate the record if the account must change.

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

`PUBLIC_FIREBASE_STORAGE_BUCKET` and `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` are optional. Repository variables are compiled into the production artifact. After changing them, rerun the GitHub Pages workflow.

## Verification

1. Leave enrollment open and sign in from each intended Gmail account once. Confirm each appears under `members` with its own UID and email.
2. On two phones, change inventory and recipe selection and verify realtime synchronization.
3. Set enrollment closed. Confirm both existing members still reconnect after a browser restart without another login.
4. Sign in with a different Gmail. Confirm it shows **等待家庭管理员批准**, cannot access shared state, and creates only its own access request.
5. Approve the request by creating its member record; confirm the page connects.

Clearing browser site data, explicitly logging out, or revoking Google access requires login again. Never commit Gmail addresses, UIDs, tokens, household inventory, or meal state.

Rules tests use `firebase emulators:exec`; local runs require Java. GitHub-hosted Ubuntu runners provide Java for CI.
