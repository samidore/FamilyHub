# Adult Dermatologists

## Purpose

Compare female adult dermatologists for perianal dermatitis or eczema evaluation. General dermatology quality is the publication foundation; the family comparison then weighs condition fit, diagnostic breadth, patient-experience evidence, safety screening, access, and travel. The page does not assume that a perianal rash is eczema, and family tiers are not medical quality ratings.

## Route and data

- Route: `/adult-dermatologists/`
- Dataset: `src/data/adult-dermatologists.json`
- Parser/type: `parseAdultDermatologists` and `AdultDermatologist`
- Baseline: 10 female physicians, including three to five clearly labeled NYC specialist alternatives

Records separate provider/practice/location facts, eligibility, evidence bands, publicly supported diagnostic capabilities, a perianal-dermatitis fit summary, patient-review evidence, official safety evidence, availability, training/certification context, negative findings, verification questions, and source links.

## Page behavior

Search covers provider, location, condition-fit, capability, safety, and review evidence. Filters include location scope, Tier, known drive limit, perianal-dermatitis fit, diagnostic capability, review confidence, availability, and concern level. Sort defaults to one unified family rank, with condition fit, known drive, primary rating/count, and name alternatives. NYC specialists remain in the same ranking and carry a visible `NYC 专科备选` label. Preserve bookmarkable state, live counts, accessible controls, and a recoverable empty state.

## Trust and maintenance

Use official provider/health-system material, current license and discipline information, and board evidence for qualification. Healthgrades is patient-experience evidence, not a clinical outcome or eligibility measure; provider and office/group ratings remain separate. Missing written reviews are unknown evidence, not proof of safety. Confirm that the named female MD/DO personally evaluates adult perianal rashes, whether a chaperone is available, and whether patch testing, KOH/culture, biopsy, or referral is appropriate. Update `verifiedDate` only after checking the underlying sources.
