# Colonoscopy Specialists

## Purpose

Compare NYC-area colonoscopy specialists for complex-polyp situations using advanced resection capability, hospital-level facility backup, formal NY safety records, patient-experience evidence, and network/booking questions. A Tier is a comparison aid, not a medical quality rating.

## Route and data

- Route: `/colonoscopy-specialists/`
- Dataset: `src/data/colonoscopy-specialists.json`
- Parser/type: `parseColonoscopySpecialists` and `ColonoscopySpecialist`
- Baseline: 18 specialists

Records keep provider/system/facility facts, capability and clinical-fit evidence, facility class, network verification, training/certification context, Healthgrades review confidence, safety screen, negative findings, concern level, verification questions, and official, facility, Healthgrades, NY Profile, OPMC, and Maps links separate.

## Page behavior

Search covers provider, facility, and evidence text. Filters include Tier, drive limit, health system, advanced-polyp fit, capability keyword (for example EMR, ESD, FTR, or CELS), review confidence, current-provider status, concern level, and network status. Sort defaults to family rank, with shortest drive, Healthgrades rating/count, and name alternatives. Keep state bookmarkable with live counts and recoverable empty/error states.

## Trust and maintenance

Before booking, confirm who will perform the procedure, personal EMR/ESD/FTR/CELS experience, staged-resection planning, anesthesia and pathology arrangements, surgical backup, and surveillance interval. Recheck the named provider's NY Physician Profile and OPMC pages for current license, malpractice, discipline, and hospital privileges. Healthgrades comments are not formal incident records; preserve classifications and source scope. Never publish a patient's reports, pathology, imaging, diagnosis, insurance, or appointment details.
