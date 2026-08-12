# Shared Meal Firebase setup

The page uses the Firebase modular Web SDK (`setPersistence(auth, browserLocalPersistence)` followed by silent `signInAnonymously`) without a login form. Realtime Database state is observed with `onValue` and changed with `runTransaction`. A complete Firebase configuration never falls back to the local adapter: a connection or authorization error is shown in the page.

## One-time project setup

1. Create a Firebase project and a Realtime Database in the desired region.
2. Enable **Authentication → Sign-in method → Anonymous**.
3. Add the deployed GitHub Pages origin and local development origin under **Authentication → Settings → Authorized domains**.
4. Deploy `database.rules.json` with the Firebase CLI (`firebase deploy --only database`). Membership is intentionally not writable by the browser.
5. Choose one stable household ID. Both phones use the same `PUBLIC_FAMILY_HOUSEHOLD_ID`.

Rules tests use `firebase emulators:exec`; local runs require a Java runtime (`java -version`). GitHub-hosted Ubuntu runners provide Java for the CI rules step.

## GitHub Pages variables

Add these as repository **Variables** (not secrets; Firebase web API keys are public identifiers) so the build receives them:

`PUBLIC_FIREBASE_API_KEY`, `PUBLIC_FIREBASE_AUTH_DOMAIN`, `PUBLIC_FIREBASE_PROJECT_ID`, `PUBLIC_FIREBASE_DATABASE_URL`, `PUBLIC_FIREBASE_STORAGE_BUCKET`, `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `PUBLIC_FIREBASE_APP_ID`, and `PUBLIC_FAMILY_HOUSEHOLD_ID`.

The workflow passes the `PUBLIC_*` variables to the Astro build. All six required Firebase variables must be present together; any partial configuration shows a configuration error and disables shared writes. Once complete, any Firebase failure is surfaced and does not silently switch to local storage. `storageBucket` and `messagingSenderId` are optional.

## Approving a device

On first load the anonymous UID is shown when the user is not authorized. An operator with Firebase access must manually set:

`households/{householdId}/members/{anonymousUid} = true`

Use the UID from each phone, then reload. Never commit UIDs, household data, refresh tokens, or private notes.

## Final two-phone check

1. Open the deployed page on two phones with separate browser profiles.
2. Copy each displayed anonymous UID into the member allowlist and reload both phones.
3. Turn on a counted ingredient on phone A and confirm the half-step quantity appears on phone B.
4. Start a meal, select a recipe, mark it ready and cooking, then open Checkout on both phones. Confirming on one phone must clear the shared meal; the other must report a stale/duplicate checkout rather than consuming again.
5. Turn off a current-meal ingredient and verify inventory remains unchanged. Use Inventory Reset and confirm it requires confirmation; Recipe Reset must not.

This two-phone acceptance cannot be claimed until a real Firebase project, deployed rules, approved UIDs, and the final device check exist.
