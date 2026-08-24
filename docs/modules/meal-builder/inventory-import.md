# Chat-assisted inventory import

## Purpose

Meal Builder accepts a small JSON payload produced by Chat after recognizing groceries or ingredients from images. Chat performs semantic identification against the current active Ingredient library; Meal Builder performs exact validation, review, and the inventory transaction. The website does not upload images, call an AI model, or fuzzy-match Ingredient names.

This protocol is the canonical contract between the Chat producer and the Meal Builder consumer.

## Producer protocol

Before producing an import payload, read the current Meal Builder Ingredient index and only the category records needed to resolve the recognized items. Match only active Ingredients whose `starter.visible` is true. Use canonical stable IDs; never invent an ID or substitute a merely similar Ingredient when identity is uncertain.

For each recognized grocery/inventory row:

- Default to **1 inventory unit per distinct row**.
- Multiple distinct rows of the same Ingredient are summed into one `items[]` entry.
- Do not count the same physical item again when it appears in multiple photos or from multiple angles.
- Do not convert pounds, grams, package weight, serving count, or package size into inventory units.
- Quantity must be a positive multiple of `0.5`; normal image recognition should usually produce whole-number quantities.
- Explicit user instruction overrides the exception table, which overrides the normal row-count rule, which overrides the default of 1.

Current quantity exceptions:

| Ingredient ID | Import quantity rule |
| --- | --- |
| `whole-pork-tenderloin` | One recognized row counts as **2 inventory units**. |

`stocked_on` is the user's local calendar date in `YYYY-MM-DD` form. Use the current local date unless the user explicitly identifies another stock-entry date. A user-specified date must not be replaced with the image timestamp, receipt timestamp, or file modification date.

Anything that cannot be matched confidently to an active visible Ingredient goes in `unmatched`. The final response for this workflow should be the JSON object only, without a Markdown fence or surrounding explanation, so it can be pasted directly into Meal Builder.

## JSON v1 contract

```json
{
  "schema": "meal-builder-inventory-import",
  "version": 1,
  "stocked_on": "2026-08-24",
  "items": [
    {
      "ingredient_id": "whole-pork-tenderloin",
      "quantity": 2
    },
    {
      "ingredient_id": "broccoli",
      "quantity": 1
    }
  ],
  "unmatched": [
    "上海青苗"
  ]
}
```

Required fields:

- `schema`: exactly `meal-builder-inventory-import`.
- `version`: exactly `1` for this contract.
- `stocked_on`: a real calendar date in `YYYY-MM-DD`, not later than the consumer's current local date.
- `items`: an array of `{ ingredient_id, quantity }` objects. `ingredient_id` is a canonical stable ID and `quantity` is a positive multiple of `0.5`.
- `unmatched`: an array of non-empty human-readable strings for recognized items without a reliable canonical match. An empty array is valid.

The producer should merge duplicate `ingredient_id` entries. The consumer is still required to merge duplicates defensively by summing their quantities.

## Consumer review

Parsing has no inventory side effects. Meal Builder must reject malformed JSON, unsupported schema/version, invalid quantities, and invalid or future `stocked_on` dates before any write.

For each `items[]` entry, Meal Builder exact-matches the ID against the currently deployed active visible Ingredient library:

- Valid IDs become review rows using the canonical Chinese/English display names.
- Unknown, archived, or non-visible IDs become unmatched review entries and are never fuzzy-matched or silently replaced.
- Producer-provided `unmatched` entries are shown in the same unmatched section.
- Unmatched entries do not prevent valid matched entries from being imported.

Review behavior:

- `counted` Ingredients show current inventory, the proposed additive quantity, and the resulting quantity. The proposed quantity can be adjusted in `0.5` steps.
- `presence-only` Ingredients use the canonical tracking mode, regardless of the numeric quantity in JSON. If absent, review shows that import will set the Ingredient to present; if already present, it remains visible as `已在库 · 无需修改`.
- `×` removes only that row from the current import draft. It never removes or decrements existing household inventory. This is the intended way to exclude groceries that are being put into the freezer; when they are later thawed, they can be added through the normal inventory flow.
- `stocked_on` is prefilled from JSON and remains editable in review. The edited date is revalidated before confirmation.

The first `确认入库` action opens a second confirmation dialog showing the reviewed date and item count. No inventory write occurs until the user confirms that dialog.

## Inventory transaction

Confirmation is one additive household transaction against the latest live state, not against the inventory values that happened to be visible when review opened. Concurrent changes from another device must not be overwritten.

For each retained row:

- `presence-only`: set the aggregate inventory value to `true`; an already-present Ingredient is a no-op.
- non-FIFO `counted`: add the reviewed quantity to the latest aggregate quantity.
- FIFO `counted`: add the reviewed quantity to the latest aggregate quantity and to `inventoryBatches/{ingredientId}/{stocked_on}`. Same-date additions merge; other dated batches remain separate.

The proposed FIFO batch map must continue to sum exactly to aggregate inventory so the existing repository reconciliation can preserve it. The import transaction must not alter `currentMeal`, `activeStep`, recent meals, current-meal availability, or the frozen current-meal freshness snapshot.

After a successful transaction, clear the pasted JSON and import draft. The import payload, recognized image, Chat transcript, and import history are not persisted as new household state.

## Non-goals

Version 1 does not add image upload, AI/API integration, fuzzy matching, in-page Ingredient creation, freezer state, thaw history, receipt price, weight-to-unit conversion, per-item stock dates, import history, or a new Firebase node.