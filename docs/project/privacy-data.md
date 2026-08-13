# Public data and privacy

The GitHub Pages site is public on the internet. The public release is limited to `public-reference` records: public venues, events, providers, source citations, and generalized non-identifying family assessments.

## Never publish

- Names or identifying details of family members or children.
- Exact home address, personal phone numbers, or personal email addresses.
- Medical records, diagnoses, insurance identifiers, private care notes, or appointment details.
- Private schedules, travel plans, location history, family photos, or identifying private notes.
- Credentials, API tokens, secrets, Firebase UIDs, Gmail addresses, access-control details, household inventory, or current meal state.

Generalized family context is allowed only when it cannot identify a person. Private family data requires a separately authenticated and authorized system, encrypted private storage, and a hosting review. Hidden routes, unlinked pages, committed JSON, and browser local storage are not privacy controls.

## Data handling rules

- Every active module declares `privacyClass: public-reference` and uses a strict domain schema. Unknown fields and private-looking fields fail validation rather than being silently rendered.
- Use `null` or an omitted optional field when a public fact is unknown. Never infer hours, prices, accessibility, parking, bathroom access, registration rules, ratings, mileage, medical quality, or child acceptance.
- Keep source facts, family assessment, limitations, and pre-visit/pre-cook checks visibly separate. A review score is not a medical quality rating; a family fit score is not an official rating.
- Meal Builder's public YAML contains recipe and ingredient facts only. Firebase stores household membership and operating state by stable ID; it must not become a second recipe/ingredient source.
- Do not add analytics, tracking pixels, remote fonts, third-party embeds, or other passive collection without an explicit privacy review. Ordinary user-initiated HTTPS links are allowed.

## Review checklist

Before publishing a data or UI change, run the privacy audit and inspect generated output. Confirm that no private-family field, secret, token, UID, email, household value, or local-storage fallback is committed or rendered. Check that any new source URL is HTTPS and safe to open in a new tab.
