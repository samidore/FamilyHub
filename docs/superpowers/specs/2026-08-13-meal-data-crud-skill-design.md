# Meal Data CRUD Skill design

## Decision

FamilyHub maintains Recipe and Ingredient records through the repository-scoped `manage-meal-data` Skill. The indexed YAML remains the only build source; the archived GPT dump remains historical input.

The Skill separates planning from mutation, checks exact and semantic duplicates, researches only requested, missing, or doubtful facts, asks only material household questions, and produces `cookable` records without inventing private or unsupported facts. Non-pantry Ingredients require Recipe coverage; pantry records do not. Explicit deletion is permanent after one reference check, and stable IDs are never reused.

## Implementation

The Skill contains concise workflow instructions, implicit invocation metadata, and a deterministic read-only helper for inspection, references, ordering, and item validation. Normal edits continue to use repository editing tools rather than a write-capable CRUD program.

Operational Recipe inputs contain only required Ingredient IDs or `one_of` alternatives plus their roles. A `cookable` or `household-tested` Recipe uses separate display-only `cook_ingredients` text plus executable steps and equipment. Pantry inputs are not operational requirements, and source evidence is optional for cookability.

## Acceptance

Validate Skill metadata, helper commands, legacy compatibility, strict cookable failures, runtime field preservation, Cook View integration, and the complete repository gate. Data transactions increment the content patch version and update the data date; this structural change does not rewrite current records or bump content metadata.
