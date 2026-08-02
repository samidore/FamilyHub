# Colonoscopy plan-network comparison design

## Scope

Preserve all 18 colonoscopy specialists and their existing clinical tiers, Healthgrades evidence, safety notes, and source links. Add a public, non-identifying plan-network comparison using the generic plan label `BlueCard PPO`. The site must never contain a member ID, prefix, group number, card image, name, or any other personal insurance field.

## Source policy

The network evidence is facility-level public reference data, not a guarantee of benefits. Current official sources used for the comparison are:

- NewYork-Presbyterian hospital plans: Blue Cross Blue Shield BlueCard Plans are listed, with an instruction to confirm eligibility.
- Memorial Sloan Kettering insurance plans: commercial BCBS licensee plans and BCBS states outside NY/NJ include PPO coverage, subject to plan/site confirmation.
- NYU Langone participating-plan grid: BCBS Out of State or Region and BCBS PPO are listed, with a provider-specific confirmation warning.
- Mount Sinai public insurance guidance: coverage varies by site and provider and must be confirmed; no facility-level BlueCard conclusion is inferred.

These sources support a public facility signal only. Every specialist remains `professionalStatus: "requires-confirmation"` because physician, anesthesia, pathology, procedure authorization, and exact plan benefits can differ.

## Data model

Add a strict `networkVerification` object to each colonoscopy record:

```text
{
  planLabel: "BlueCard PPO",
  facilityStatus: "publicly-supported" | "requires-confirmation",
  professionalStatus: "requires-confirmation",
  summary: string,
  sourceUrls: string[],
  verifiedDate: string
}
```

`facilityStatus` is `publicly-supported` for the MSK, NYU, and NYP systems whose official pages expose the relevant out-of-state/BlueCard facility signal. Mount Sinai records use `requires-confirmation`. No private identifiers are represented in the schema or data.

## Presentation and interaction

- Add a compact page-level note showing `BlueCard PPO` and explaining that public facility evidence is not final benefit confirmation.
- Add a `Network evidence` filter with `publicly supported` and `requires confirmation` options.
- Add a card badge and an expandable network-check section showing the plan label, facility status, professional status, summary, verification date, and official source links.
- Keep the current 18-card result count and all existing clinical filters.
- Default “family comparison order” uses network evidence as a secondary ordering key (`publicly-supported` first), then the existing clinical `rank`. Tier values remain clinical comparison tiers and are not rewritten.

## Validation and privacy acceptance

- Extend TypeScript types and the strict parser with exact allowed keys, enum checks, HTTPS source validation, and date validation.
- Verify all 18 records parse and remain present.
- Run `pnpm run validate`, `pnpm run check`, `pnpm run build`, and `pnpm run audit`.
- Confirm the built output contains the public plan label and no personal insurance field names, card paths, or private identifiers.
- Confirm the page works without JavaScript, the new filter updates the live count, and the page has no horizontal overflow at the project’s required widths.
