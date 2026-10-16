# Breast Surgeons · Diagnostic Breast Evaluation

## Purpose and scope

Public provider comparison for **palpable breast masses, abnormal breast imaging, and abnormal / high-risk breast biopsy results** in Fair Lawn and nearby northern NJ, with a labeled NY option. This is **not** a ranking of breast cancer surgical outcomes. Compare the physician's demonstrated handling of benign and high-risk disease, preoperative diagnostic decisions, multidisciplinary backup, patient experience, and verified gaps separately.

Route: `/breast-surgeons/`. Registry: `src/config/modules.ts`, `health-care`, `public-reference`. Canonical data: `src/data/breast-surgeons.json`; types `src/data/breastSurgeonTypes.ts`; schema `src/data/breastSurgeonSchema.mjs`; cards: `src/modules/breast-surgeons/BreastSurgeonCard.astro`. Initial cohort: 10 physician entries, with stable unique IDs and ranks.

Follows `docs/project/medical-provider-search.md`.

## Clinical fit and ranking

- Evaluate eligibility for **unconfirmed lumps**, **BI-RADS / abnormal mammography or ultrasound**, **abnormal core needle biopsy**, **high-risk pathology**, and **radiologic-pathologic discordance**. Do not infer any diagnosis or suitability for a specific private patient.
- Distinguish physician-level proof from **center-level** imaging/pathology/biopsy capability. A center listing a technology does not verify that the named physician performs it.
- Strong = official provider page directly covers benign or precancerous disease, or abnormal biopsy; adequate = breast-specialist evidence but diagnostic-phase specifics still need confirmation; oncology-focused = surgical cancer expertise dominates public evidence.
- Current tiers: **2** for promising conditional candidates, **3** for candidates with narrower diagnosis-stage evidence or material practical unknowns. **No Tier 1** without independent individual state license verification and discipline screen. All current records correctly show these official checks as pending; no absence-of-discipline claims. Tier is only household comparison order, never quality certification.
- Ranking priorities: direct clinical fit 35%, training 20%, diagnostic-team support 20%, patient experience 10%, availability 10%, evidence coverage 5%, with formal licensure/safety gates outside the score. Do not manufacture precise subscores if evidence is insufficient.
- No inferred drive times, unsupported accreditation claims, or presumed insurance participation. NYC / NY records stay marked as cross-state alternatives.
- MSK Bergen is a consultation site; its official location page states surgery is generally conducted in Manhattan. Do not describe its surgical procedures as occurring in Montvale.

## Primary-source / review boundaries

- Use current official provider/health-system records for identity, current address, breast fellowship, board statements, clinic phone, and publicly stated new-patient policy. Labels `listed-accepting` are snapshots, not real-time inventory.
- Healthgrades: **only exact physician direct profile URL**, never search, directory, similarly named provider, or office fallback. If unavailable, omit the action; show unavailable. Schema enforces the profile slug prefix against provider ID.
- Keep individual **Healthgrades** and health-system doctor-level surveys separately, with their own rating and count. A practice's Google Maps rating is office-level and must not be promoted to a surgeon score. Ratings are patient experience, not surgical outcomes or proven complaints.
- Negative reviews can suggest communication, access, billing, or potential clinical concerns. Distinguish unverified allegations from state findings; small samples (especially fewer than 10) carry high uncertainty. Never claim a clean state record based on absent comments or hospital employment.
- Source record `verifiedDate` is the date the publicly cited official pages were actually consulted. Recheck current practice, phone, review counts, state records, and availability before updating.
- NJ official license search: https://newjersey.mylicense.com/verification/ ; NY: https://www.op.nysed.gov/verification-search . Physicians' discipline checks are not completed until a named-person primary-source lookup is captured.

## Page behavior and tests

- Existing FamilyHub shell/components/ochre styling; server-rendered complete cards. Search and filters (location, Tier, diagnostic fit, published new-patient evidence); sorts (household rank, Healthgrades rating, sample size, name).
- All filter state persisted in URL and resettable; empty state recoverable; unknown Healthgrades rating sorted after known rating.
- Every card shows official source, individual Healthgrades link if verified, center context, office map, formal verification portal, evidence limitations, and phone questions.
- Validate with `pnpm run validate`; static build/type check with `pnpm run check && pnpm run build && pnpm run audit`; unit tests include `tests/breast-surgeons.test.mjs`. Applicable browser checks use `pnpm run test:browser`.
- Never publish patient names, diagnoses, personal exam details, imaging, pathology, insurance IDs, appointments, or household-specific medical narratives. For diagnostic interpretation, direct to treating clinicians and existing clinical pathway; BI-RADS 4/5 biopsy recommendations should not be delayed for ranking.

## Primary medical context (not a substitute for care)

American Society of Breast Surgeons: management of benign/high-risk lesions requires appropriate **imaging–pathology concordance**, and discordant results can prompt further tissue evaluation. Treatment depends on the histologic type, clinical and imaging factors, not an automatic surgery decision. Source: https://www.breastsurgeons.org/docs/statements/asbrs-high-risk-lesions.pdf .
