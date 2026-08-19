# OB / GYN

## Purpose

Compare nearby obstetricians by delivery-hospital context and keep a separate general-gynecology shortlist. The page follows `docs/project/medical-provider-search.md`: public qualification and training evidence, delivery relationship, patient experience, practical access, evidence gaps, and phone-confirmation questions stay distinct. Tier and `familyScore` are family comparison tools, not medical-quality ratings.

## Route and data

- Route: `/ob-gyn/`
- Dataset: `src/data/ob-gyn.json`
- Parser: `parseObGynProviders` in `src/data/obGynSchema.mjs`
- Type: `ObGynProvider` in `src/data/obGynTypes.ts`
- Baseline: 35 unique physicians and 40 ranked placements
  - Valley Hospital OB: 10
  - Hackensack University Medical Center OB: 10
  - Englewood Hospital OB: 10
  - General GYN: 10

A physician who appears in both OB and GYN is stored once with multiple placements so provider facts do not drift between duplicate records.

## Page behavior

The four comparison groups are native collapsible `<details>` sections. Each section keeps a deterministic 1–10 family order. Search and Tier filters work across placements; active filters open sections containing matches. Complete reference content remains server-rendered without JavaScript.

Provider cards separate:

- public clinical/training evidence;
- patient-experience evidence;
- hospital relationship and delivery coverage when applicable;
- availability;
- strengths and evidence gaps;
- official source links and direct Healthgrades links when verified.

## Trust and maintenance

- `confirmed-delivery`, `likely-delivery`, `affiliation-only`, and `unclear` are evidence labels, not quality grades.
- Do not remove a reasonable candidate only because current delivery status, new-patient status, or insurance cannot be verified online; mark it for phone confirmation.
- Premera status is not a screening gate. A specific member/network must be confirmed with Premera, the physician practice, and the delivery facility.
- Do not claim a clean NJ license/discipline record unless the primary-source physician lookup was actually checked for that provider.
- Health-system ratings and Healthgrades ratings remain separate patient-experience evidence and are not clinical outcomes.
- Update `verifiedDate` only after the underlying source for that record has been checked.
- No patient identity, diagnosis, insurance identifiers, appointment details, or other private household health data belong in this public module.
