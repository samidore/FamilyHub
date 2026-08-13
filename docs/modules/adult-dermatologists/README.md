# Adult Dermatologists

## Purpose

Compare nearby adult dermatology options for adult-acne and related care using board certification, clinical fit, patient-experience evidence, availability, drive, and booking questions. Family tiers are not medical quality ratings.

## Route and data

- Route: `/adult-dermatologists/`
- Dataset: `src/data/adult-dermatologists.json`
- Parser/type: `parseAdultDermatologists` and `AdultDermatologist`
- Baseline: 10 physicians

Records separate provider/practice/location facts, eligibility and evidence bands, adult-acne summary, primary review source and confidence, availability, training/certification context, strengths, concern level, negative findings, verification questions, and official/Healthgrades/Maps links.

## Page behavior

Search covers rendered provider and evidence text. Filters include Tier, drive limit, adult-acne fit, review confidence, availability, and concern level. Sort defaults to family rank, with shortest drive, primary rating/count, and name alternatives. Preserve bookmarkable state, live counts, accessible controls, and a recoverable empty state.

## Trust and maintenance

Use official practice/provider and current licensing information for verification; Healthgrades is patient-experience evidence, not a clinical outcome measure. Keep negative findings classified and sourced rather than presenting unverified allegations as fact. Confirm current accepting-new-patients status, insurance, and appointment details directly, and only update `verifiedDate` after checking the underlying source.
