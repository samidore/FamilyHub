# Pediatric Dentists

## Purpose

Compare nearby pediatric dental practices using public specialty, toddler-care, safety/consent, continuity, drive, and patient-experience evidence. A Tier is a household comparison tool, not a medical quality rating.

## Route and data

- Route: `/pediatric-dentists/`
- Dataset: `src/data/pediatric-dentists.json`
- Parser/type: `parsePediatricDentists` and `PediatricDentist`
- Baseline: 10 practices

The schema keeps provider eligibility, evidence bands, Tier/rank, drive range, Healthgrades rating/counts/confidence, training and certification context, long-term fit, strengths, concern level, negative findings, verification questions, and source links separate.

## Page behavior

Search covers provider and evidence text. Filters include Tier, drive limit, review confidence, evidence status (`qualified`/`conditional`), and concern level. Sort defaults to family rank, with shortest drive, Healthgrades rating/count, and name alternatives. Counts, bookmarkable state, keyboard operation, and recoverable empty states are required.

## Trust and maintenance

Before booking, directly confirm the named provider's current NJ license, pediatric specialty permit/ABPD status, first-visit approach for a two-year-old, parent presence, consent before restraint or sedation, alternatives, after-hours emergency plan, provider continuity, insurance, and fees. Keep small Healthgrades samples visible and do not combine scores from different platforms. Verify source facts before changing `verifiedDate`.
