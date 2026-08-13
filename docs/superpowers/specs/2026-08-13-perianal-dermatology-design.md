# Perianal Dermatitis Dermatologist Comparison Design

## Goal

Replace the adult-acne use case on `/adult-dermatologists/` with a public-reference comparison of female adult dermatologists for a possible perianal dermatitis or eczema evaluation. Keep ten physicians, combine nearby choices with four visibly labeled NYC specialist alternatives, and rank all candidates together.

## Research and ranking

Candidates must be female adult-dermatology MD/DO physicians with acceptable license, discipline, board, and general clinical-foundation evidence. Published condition fit distinguishes direct anogenital, contact-dermatitis, or patch-testing expertise from broader eczema and medical-dermatology evidence. Diagnostic breadth includes only publicly supported infection/fungal, psoriasis/lichen, biopsy, or multidisciplinary-referral capabilities.

The family rank prioritizes condition fit, diagnostic breadth, clinical foundation, patient experience and negative patterns, safety evidence, and practical access. Healthgrades is not a clinical qualification gate. A missing rating or written-review count remains null or unavailable and is never described as a clean safety finding.

## Page behavior

The page searches all rendered provider and evidence text. It filters location, Tier, known drive, condition fit, capability, review confidence, availability, and concern level. It sorts by family rank, condition fit, known drive, rating, rating count, or name. NYC cards use an explicit text label and remain in the unified ranking.

Cards separate assessment, capabilities, evidence bands, review sources, official safety sources, negative findings, and booking questions. Guidance states that perianal dermatitis has multiple possible causes and asks whether the named female physician personally evaluates the site, offers a chaperone, and can perform or arrange appropriate diagnostic testing. No identifying family or medical data is stored.

## Acceptance

Strict parsing rejects old acne fields, unsupported capabilities, unsafe URLs, mixed known/unknown drive ranges, inferred NYC drive times, non-female records, and missing official safety evidence. Acceptance keeps ten complete ranks and three to five NYC alternatives, exercises the new filters and sorting, verifies server-rendered content and responsive behavior, and runs the complete project release gate before commit and publication.
