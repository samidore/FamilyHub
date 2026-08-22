# Public data and privacy

The GitHub Pages site is public on the internet. Family Hub supports two explicit module privacy classes:

- `public-reference` — public venues, events, providers, source citations, generalized non-identifying family assessments, and other content safe to commit and server-render.
- `authenticated-household` — a public static shell whose private household content is loaded only after verified authentication and household authorization from the approved private runtime store.

A private module route being publicly reachable does not make its household data public. Private data must never be embedded into generated HTML, committed JSON/YAML, page source, or an unauthenticated fallback.

## Never publish

- Names or identifying details of family members or children.
- Exact home address, personal phone numbers, or personal email addresses.
- Medical records, diagnoses, insurance identifiers, private care notes, or appointment details.
- Private schedules, travel plans, location history, family photos, or identifying private notes.
- Credentials, API tokens, secrets, Firebase UIDs, Gmail addresses, access-control details, household inventory, current meal state, or Sami notebook state.

Generalized family context is allowed only when it cannot identify a person. Private family data requires a separately authenticated and authorized system. Hidden routes, unlinked pages, committed private data, and browser local storage are not privacy controls.

## Data handling rules

- Every active module declares a supported `privacyClass` in the module registry.
- `public-reference` modules use strict public domain schemas. Unknown fields and private-looking fields fail validation rather than being silently rendered.
- `authenticated-household` modules keep their private state outside the public repository and static build. Their production UI must remain locked until verified authentication and household membership succeed, and configuration failures must not silently fall back to local private data.
- Use `null` or an omitted optional field when a public fact is unknown. Never infer hours, prices, accessibility, parking, bathroom access, registration rules, ratings, mileage, medical quality, or child acceptance.
- Keep source facts, family assessment, limitations, and pre-visit/pre-cook checks visibly separate. A review score is not a medical quality rating; a family fit score is not an official rating.
- Meal Builder's public YAML contains recipe and ingredient facts only. Firebase stores household membership and operating state by stable ID; it must not become a second recipe/ingredient source.
- Sami notebook live state belongs only under its authenticated household runtime path. Portable exports may be stored only outside this public repository, such as the designated private backup repository.
- Do not add analytics, tracking pixels, remote fonts, third-party embeds, or other passive collection without an explicit privacy review. Ordinary user-initiated HTTPS links are allowed.

## Review checklist

Before publishing a data or UI change, run the privacy audit and inspect generated output. Confirm that:

- every active module has the correct supported privacy class;
- no private-family field, secret, token, UID, email, household value, notebook value, or local-storage fallback is committed or server-rendered;
- authenticated-household routes contain only their locked/static shell before client authorization;
- any new source URL is HTTPS and safe to open in a new tab.
