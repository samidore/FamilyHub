# OB / GYN

## Purpose

Compare nearby obstetricians by delivery-hospital context and keep a separate general-gynecology shortlist. The page follows `docs/project/medical-provider-search.md`: public qualification and training evidence, delivery relationship, patient experience, practical access, evidence gaps, and phone-confirmation questions stay distinct. Tier and `familyScore` are family comparison tools, not medical-quality ratings.

## Route and data

- Route: `/ob-gyn/`
- Provider dataset: `src/data/ob-gyn.json`
- External review-link directory: `src/data/obGynExternalProfiles.ts`
- Parser: `parseObGynProviders` in `src/data/obGynSchema.mjs`
- Type: `ObGynProvider` in `src/data/obGynTypes.ts`
- Baseline: 35 unique physicians and 40 ranked placements
  - Valley Hospital OB: 10
  - Hackensack University Medical Center OB: 10
  - Englewood Hospital OB: 10
  - General GYN: 10

A physician who appears in both OB and GYN is stored once with multiple placements so provider facts do not drift between duplicate records. External review links are keyed by the same stable provider ID so changing an outside URL does not duplicate clinical facts.

## Page behavior

The four comparison groups are native collapsible `<details>` sections. Each section keeps a deterministic 1–10 family order. Search and Tier filters work across placements; active filters open sections containing matches. Complete reference content remains server-rendered without JavaScript.

Provider cards separate:

- public clinical/training evidence;
- patient-experience evidence;
- hospital relationship and delivery coverage when applicable;
- availability;
- strengths and evidence gaps;
- official and review-source links.

## Review-source policy

Every provider has three fixed outbound review/reference actions:

1. **Official** — the health-system or practice source used for identity, scope, training, and current practice facts.
2. **Healthgrades** — required for every provider. Prefer a direct doctor profile. If a direct profile slug cannot be reliably verified, use a Healthgrades group page that lists the doctor; a specialty-directory fallback is allowed only when neither direct nor group URL can be reliably confirmed. The page labels `profile`, `group`, and `directory` link scope instead of pretending every link is doctor-level.
3. **Google · office** — a Maps search for the physician/practice/location. Treat resulting ratings as office/practice experience unless the review scope clearly identifies the individual physician.

Zocdoc and WebMD are optional and appear only when a reliable direct provider profile has been identified. Vitals and RateMDs are research supplements rather than fixed UI links.

Never combine Healthgrades, health-system patient surveys, Google, Zocdoc, WebMD, or other platform ratings into one average. Preserve each source and sample scope separately. A health-system survey may have a larger sample than Healthgrades, but it remains a health-system survey rather than an independent doctor rating.

## Trust and maintenance

- `confirmed-delivery`, `likely-delivery`, `affiliation-only`, and `unclear` are evidence labels, not quality grades.
- Do not remove a reasonable candidate only because current delivery status, new-patient status, or insurance cannot be verified online; mark it for phone confirmation.
- Premera status is not a screening gate. A specific member/network must be confirmed with Premera, the physician practice, and the delivery facility.
- Do not claim a clean NJ license/discipline record unless the primary-source physician lookup was actually checked for that provider.
- Health-system ratings and Healthgrades ratings remain separate patient-experience evidence and are not clinical outcomes.
- Update `verifiedDate` only after the underlying source for that record has been checked.
- No patient identity, diagnosis, insurance identifiers, appointment details, or other private household health data belong in this public module.
