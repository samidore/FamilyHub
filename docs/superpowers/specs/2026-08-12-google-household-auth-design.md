# Google Household Authentication Design

## Goal

Replace silent Firebase Anonymous Auth with persistent Google sign-in while preserving the shared inventory and meal workflow. Support an initial open-enrollment window so household members can join easily, then allow the household to be closed without removing existing members.

## Authentication

- Show one `使用 Google 登录` button when no Firebase user is signed in.
- Use Firebase Google Auth with `browserLocalPersistence`. A signed-in browser normally remains signed in across tabs, browser restarts, and device restarts.
- Use a popup where supported and fall back to redirect when the popup is blocked or unavailable, including mobile browsers.
- Do not automatically create anonymous users. Existing anonymous sessions are signed out before Google sign-in; no inventory or meal facts are attached to an anonymous UID.
- Show the signed-in Gmail address and a logout action. Clearing browser site data, revoking Google access, or explicitly logging out requires another login.

## Household Enrollment

Store household access control under:

```text
households/{householdId}/settings/enrollmentOpen: boolean
households/{householdId}/members/{uid}/email: string
households/{householdId}/accessRequests/{uid}/email: string
```

When `enrollmentOpen` is `true`, a Google-authenticated user who is not already a member may create only their own member record. The email must equal the verified email in their Firebase Google token. Once created, that member remains authorized after enrollment closes.

When `enrollmentOpen` is `false`, a non-member may create or refresh only their own access request. They cannot read household state. The page shows `等待批准`, their email, and UID. A Firebase Console administrator approves them by creating the corresponding member record and may then remove the request.

Member email addresses are acceptable household data but are not rendered in the public static site or committed to GitHub. Members may read the membership list; non-members may read only their own membership/request records and the enrollment flag.

## Authorization Rules

- Require Firebase Authentication using the Google provider for enrollment, access requests, and household state.
- State read/write access requires an existing `members/{auth.uid}` record whose stored email matches `auth.token.email`.
- During open enrollment, a user may create only `members/{auth.uid}` with their own token email. Clients cannot edit or delete member records after creation.
- With enrollment closed, clients cannot add members. Firebase Console administrators retain control because administrative operations bypass client rules.
- A non-member may create/update only `accessRequests/{auth.uid}` with their own email and cannot list other requests.
- Existing inventory validation, meal-status validation, and transactional Checkout protections remain unchanged.

## User Interface

The Shared Household panel has four explicit states:

1. `需要登录`: Google login button; inventory and meal controls disabled.
2. `正在连接`: authentication/enrollment check in progress.
3. `等待批准`: email and UID shown with retry/refresh; shared state remains unavailable.
4. `已连接 Firebase`: email shown; all authorized collaborative controls work normally.

Open enrollment happens automatically after Google login and is visibly labeled `开放加入`. The UI never claims Firebase is connected before membership and state subscription succeed. Authentication, popup, redirect, permission, and network errors show actionable messages without falling back to local storage.

## Firebase Setup and Bootstrap

1. Enable Google under Firebase Authentication > Sign-in method.
2. Keep `samidore.github.io` in Authorized domains.
3. Publish the updated Realtime Database rules.
4. In Realtime Database Data, set `households/family-household/settings/enrollmentOpen` to Boolean `true`.
5. Each intended household member signs in once with their Gmail account.
6. Confirm their records appear under `members`.
7. Set `enrollmentOpen` to Boolean `false`. Existing members retain access; later users enter the request flow.

## Compatibility and Scope

- Do not change Ingredient/Recipe facts, KB IDs, ranking, scoring, availability semantics, status transitions, Checkout, or GitHub Pages routing.
- Do not add an application admin dashboard in this change. Enrollment closure and approvals use Firebase Console.
- Do not duplicate Recipe or Ingredient facts in Firebase.
- Do not introduce another backend.

## Verification

- Unit tests cover signed-out, member, open-enrollment, pending-request, logout, redirect recovery, and configured-error states.
- Emulator rule tests prove Google-provider/token-email validation, self-enrollment only while open, request isolation, member persistence after closure, non-member state denial, and member state access.
- Browser tests cover login UI, two different approved accounts sharing state, pending approval, disabled controls, persistent-session restoration, and existing inventory/meal/Checkout flows.
- Run validation, privacy validation, Astro check, build, audit, unit tests, rules emulator tests, and Playwright tests before deployment.
