---
name: manage-meal-data
description: Maintain FamilyHub Meal Builder Recipe and Ingredient YAML. Use for requests to add, update, rename, remove, archive, research, complete, or inspect a recipe or ingredient, including Chinese requests such as 加菜、改菜谱、删食材、更新用量, and when resolving duplicate dishes or ingredient coverage.
---

# Manage Meal Data

Maintain only this repository's indexed Meal Builder data. Never treat the archived GPT dump as a build source.

## Establish authority

1. Read `PROJECT.md`, `gpt.md`, and `docs/modules/meal-builder/{README,behavior,data-model,maintenance,sources}.md` completely.
2. Inspect `src/data/meal-builder/index.yaml` and the relevant category indexes and records.
3. Run the read-only helper from the repository root: `inspect <name-or-id>`, `references <stable-id>`, `next-order ingredient|recipe <category>`, and `verify-item <stable-id>` via `node .agents/skills/manage-meal-data/scripts/meal-data.mjs`.

Judge semantic duplicates yourself from identity, core technique, equipment, tags, requirements, and steps; token similarity is only a lead.

## Work in two phases

- In Plan Mode, research, inspect, ask questions, and return a decision-complete plan. Do not edit.
- In Default mode, execute only after plan approval or when the user supplied a complete, unambiguous record. Ask at most three focused questions for unresolved identity or household choices.
- Never invent household preference, child acceptance, tested timing, retailer availability, quantities, safety claims, or a verification date.

## Research

- Use complete user-supplied Recipe content directly. Research only when the user requests it or a required fact is missing or doubtful.
- When research is needed, use the `agent-reach` Skill when available and prefer a reputable recipe author for identity, quantities, and technique. Check retained food-safety claims against an authoritative source.
- Evidence labels and URLs are optional for cookability. Preserve existing evidence, record only supported claims and actual check dates, and mark adaptations.

## Add or update a Recipe

1. Accept a dish name as sufficient input. Inspect exact ID/name, Chinese-English aliases, archived IDs, and semantic duplicates.
2. Convert an exact or structurally equivalent Add into Update. Create a new stable kebab-case ID only for a distinct identity or core technique.
3. Produce a `cookable` Recipe with display-only Cook View input lines, executable steps, equipment, timing, and servings; keep operational requirements to required Ingredient identities and roles, and do not track pantry items there.
4. Preserve `status: candidate`; never auto-approve. Keep unsupported household facts unknown or ask.
5. Create missing required non-pantry Ingredients in the same planned transaction. On Update, retain the stable ID/filename and re-check the complete record.
6. Put a new Recipe in `recipe/<category>/<id>.yaml` and append it to the category index unless the user requests a position.

## Add or update an Ingredient

1. Classify it into an existing category and as `counted` or `presence-only`. Hidden pantry aromatics/seasonings need no Recipe coverage.
2. For other Ingredients, inspect Recipe coverage. If the user names a Recipe, complete it directly; otherwise use the brainstorming Skill when available, propose at least one researched cookable Recipe, and wait for confirmation before adding both.
3. Add the record and ID once. Use the next multiple-of-ten order reported by `next-order`.

## Delete

1. Inspect active and archived references.
2. An explicit delete permanently removes the record, its index entry, and all active references after that single reference check. Do not archive it or require another request or deployment wait.
3. Never reuse the deleted stable ID.

## Complete the transaction

- Edit only targets, required indexes/references, and root metadata. Increment `content_version` one patch and update `last_updated`.
- Run `verify-item` per changed ID, then `pnpm run validate`, `check`, `build`, `audit`, `test:unit`, `test:rules`, and `test:browser`.
- Inspect Cook View for cookable Recipes, report environmental blockers, preserve unrelated work, then commit/push only task files as required by `AGENTS.md`.
