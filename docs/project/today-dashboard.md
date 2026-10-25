# Today dashboard and household notifications

## Purpose

`/today/` is the household's read-only overview. It reuses the existing authenticated Google/Firebase household session, `households/{householdId}/state` (Meal Builder) and `households/{householdId}/notebook` (Sami's Notebook). No second task/meal database or public household snapshot is created.

- **Upcoming:** active notebook items due in the next seven local calendar days, sorted by due date.
- **Urgent:** active items whose priority is `urgent` or whose deadline is tomorrow/today/overdue, reusing `notebookDueSoon`.
- **Meal:** current planned dishes including recipe-specific Finish name, whole-meal note, and queued checkout count.
- **Stock:** existing FIFO freshness priority, >=4 stored counted units, and thaw jobs. These are usage signals, not food-safety expiration claims.
- **Privacy:** the Astro HTML contains public recipe/ingredient labels and Firebase web configuration only. Live household operating state is loaded client-side only after verified Google household membership.

The Today page is linked from the existing directory homepage. It is also the `start_url` for the installable web app (`public/manifest.webmanifest`). The service worker handles push only and does **not** cache private data.

## Notifications

Push is optional per **device** and per **signed-in member**; the user must tap `开启通知` while signed into the installed web app. The subscription endpoint and encryption keys are stored at `households/{householdId}/notificationDevices/{uid}/{deviceId}`, with membership-aware Firebase rules granting read/write only to that UID. The private VAPID key is kept as a Cloud Functions secret, never in the static website or repository.

Cloud Functions (`functions/index.js`):

1. `onMealPlanChanged`: on selected-recipe changes, notify other registered household devices, not the initiating authenticated member. Sends a generic count, not a copied private recipe catalog.
2. `onNotebookUrgentChanged`: on new urgent/next-day task visibility, notify other registered household devices.
3. `eveningHouseholdReminder`: at **7 PM America/New_York**, notify subscribed devices of active notebook items due tomorrow. The task's existing `dueDate`/recurrence cursor remains authoritative; no garbage-day schedule is hard-coded.

The functions write a server-only `notificationDispatch` ledger to suppress duplicated event retries. No client can read or write that ledger under database rules. Cloud Functions require Firebase project privileges and generally the Blaze billing plan; GitHub Pages alone cannot send push after the site is closed.

## Deployment prerequisites (manual authorization required)

1. Confirm the Realtime Database's region in Firebase Console. Configure the Cloud Functions deployment region to match using `FAMILYHUB_FUNCTIONS_REGION` (defaults to `us-central1`). Do not guess the production region.
2. Enable Cloud Functions and Cloud Scheduler in the existing Firebase project. Confirm any billing implications first.
3. Generate a VAPID key pair with a trusted `web-push` tool, e.g. `cd functions && npm install && npx web-push generate-vapid-keys --json`. Do **not** commit the private key.
4. Set private key using `firebase functions:secrets:set WEB_PUSH_PRIVATE_KEY`. Put the matching public key in the local Functions environment as `WEB_PUSH_PUBLIC_KEY`. Configure `FAMILYHUB_HOUSEHOLD_ID` and `FAMILYHUB_SITE_URL` if they differ from the existing project.
5. Configure GitHub Actions variable `PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` to the **same** public key. The website's deploy workflow injects it when building the static artifact.
6. Deploy the updated `database.rules.json` and Functions from a trusted, Firebase-authenticated environment using `firebase deploy --only database,functions`. The existing GitHub Pages workflow does **not** deploy Functions.
7. Rebuild/redeploy GitHub Pages; install FamilyHub from Safari onto each iPhone Home Screen, open it as an installed web app, sign in, and tap `开启通知` separately on each device. Confirm one phone's meal update reaches the other phone and that next-day reminders arrive once. Verify the push click opens `/today/`.

**Security:** Never add the VAPID private key, private subscription endpoints, UIDs, Gmail addresses or live household snapshots to Git. Add Functions `.env*` files to `.gitignore`. If remote setup is incomplete, the Today page still works and states that push is not configured.

## Verification

Run the existing `pnpm run verify`, including Firebase rules emulator tests. Exercise two authenticated accounts and an unauthenticated account, a recipe selection change, a next-day recurring item, completion/skip, revocation, and device unsubscribing. Browser-based UI and actual iOS push delivery require end-to-end testing on the deployed site; emulator checks alone cannot establish OS-level notifications.

## Widget decision

An iOS native Home Screen Widget is **not** equivalent to the installed Web App or its notifications. A Scriptable widget would need a separately designed, authenticated read-only summary API; embedding Firebase credentials or a public summary endpoint in widget code is not acceptable. Defer the Widget until the Today page and Web Push are verified in actual household use.
