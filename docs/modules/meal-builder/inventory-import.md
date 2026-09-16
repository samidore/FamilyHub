# Chat-assisted inventory import

## Purpose

Meal Builder accepts a small JSON payload produced by Chat after recognizing groceries or ingredients from images. Chat performs semantic identification against the current active Ingredient library; Meal Builder performs exact validation, review, storage/thaw selection, and the inventory transaction. The website does not upload images, call an AI model, or fuzzy-match Ingredient names.

This protocol is the canonical contract between the Chat producer and the Meal Builder consumer.

## Producer protocol

Before producing an import payload, read the current Meal Builder Ingredient index and only the category records needed to resolve the recognized items. Match only active Ingredients whose `starter.visible` is true. Use canonical stable IDs; never invent an ID or substitute a merely similar Ingredient when identity is uncertain.

For each recognized grocery/inventory row:

- Default to **1 inventory unit per distinct row**.
- Multiple distinct rows of the same Ingredient with the same storage/thaw destination are summed into one `items[]` entry.
- The same Ingredient may appear in multiple entries when units have different destinations such as refrigerated, frozen, or starting thaw.
- Do not count the same physical item again when it appears in multiple photos or from multiple angles.
- Do not convert pounds, grams, package weight, serving count, or package size into inventory units.
- Quantity must be a positive multiple of `0.5`; normal image recognition should usually produce whole-number quantities.
- Explicit user instruction overrides the exception table, which overrides the normal row-count rule, which overrides the default of 1.

Current quantity exceptions:

| Ingredient ID | Import quantity rule |
| --- | --- |
| `whole-pork-tenderloin` | One recognized row counts as **3 inventory units**. |

`stocked_on` is the user's local calendar date in `YYYY-MM-DD` form. Use the current local date unless the user explicitly identifies another stock-entry date. A user-specified date must not be replaced with the image timestamp, receipt timestamp, or file modification date. For a `thawing` row, `stocked_on` records the intake/review date only; the eventual refrigerated FIFO batch uses the actual thaw-completion date under the normal thaw lifecycle.

New producer payloads should include `storage` on each matched item:

- `inventory` — ordinary ready stock. For `thaw-required` Ingredients this is refrigerated stock.
- `freezer` — physically frozen stock.
- `thawing` — start a new thaw job immediately when the reviewed import transaction is confirmed.

Storage must follow the canonical Ingredient's `freezer_behavior`:

- no `freezer_behavior`: `inventory` only;
- `direct`: `freezer` only; it remains Recipe-available because direct frozen stock intentionally uses ordinary inventory underneath;
- `thaw-required`: `inventory`, `freezer`, or `thawing`.

For backward compatibility, the consumer still accepts an omitted `storage`: `direct` defaults to `freezer`; every other Ingredient defaults to `inventory`.

Anything that cannot be matched confidently to an active visible Ingredient goes in `unmatched`. The final response for this workflow should contain the JSON object in a `json` code block, with no surrounding explanation or other copyable content, so the code-block copy action yields paste-ready JSON for Meal Builder.

## JSON v1 contract

```json
{
  "schema": "meal-builder-inventory-import",
  "version": 1,
  "stocked_on": "2026-09-03",
  "items": [
    {
      "ingredient_id": "whole-pork-tenderloin",
      "quantity": 3,
      "storage": "thawing"
    },
    {
      "ingredient_id": "broccoli",
      "quantity": 1,
      "storage": "inventory"
    }
  ],
  "unmatched": [
    "上海青苗"
  ]
}
```

Required fields:

- `schema`: exactly `meal-builder-inventory-import`.
- `version`: exactly `1`.
- `stocked_on`: a real calendar date in `YYYY-MM-DD`, not later than the consumer's current local date.
- `items`: an array of matched item objects.
- `unmatched`: an array of non-empty human-readable strings for recognized items without a reliable canonical match. An empty array is valid.

Each `items[]` entry contains:

- `ingredient_id`: canonical stable Ingredient ID;
- `quantity`: positive multiple of `0.5`;
- `storage`: `inventory`, `freezer`, or `thawing`. It is recommended for all new payloads and may be omitted only for the backward-compatible default described above.

The producer should merge duplicate `(ingredient_id, storage)` pairs. The consumer is still required to merge identical pairs defensively by summing their quantities. It must **not** merge the same Ingredient across different storage/thaw destinations.

## Consumer review

Parsing has no inventory side effects. Meal Builder rejects malformed JSON, unsupported schema/version, invalid quantities, invalid or future `stocked_on` dates, unknown storage values, and a storage/thaw destination that contradicts the canonical Ingredient's `freezer_behavior`.

For each `items[]` entry, Meal Builder exact-matches the ID against the currently deployed active visible Ingredient library:

- Valid IDs become review rows using the canonical Chinese/English display names.
- Unknown, archived, or non-visible IDs become unmatched review entries and are never fuzzy-matched or silently replaced.
- Producer-provided `unmatched` entries are shown in the same unmatched section.
- Unmatched entries do not prevent valid matched entries from being imported.

Review behavior:

- `counted` Ingredients show the current quantity in the selected destination/state, the proposed additive quantity, and the resulting quantity. The proposed quantity can be adjusted in `0.5` steps.
- `presence-only` Ingredients use the canonical tracking mode regardless of the numeric quantity in JSON. If absent in the selected destination, review shows that import will set it to present; if already present there, it remains visible as a no-op.
- `thaw-required` Ingredients expose a `冷藏 / 冷冻 / 开始解冻` selector in review.
- `direct` frozen Ingredients are fixed to `冷冻`; ordinary Ingredients without freezer support are fixed to normal inventory.
- `×` removes only that row from the current import draft. It never removes or decrements existing household inventory.
- `stocked_on` is prefilled from JSON and remains editable in review. The edited date is revalidated before confirmation.

The first `确认入库` action opens a second confirmation dialog showing the reviewed date, item count, frozen-item count, and thaw-start item count when applicable. No inventory write or thaw job is created until the user confirms that dialog.

## Inventory transaction

Confirmation is one additive household transaction against the latest live state, not against the inventory values that happened to be visible when review opened. Concurrent changes from another device must not be overwritten. All `thawing` rows in that confirmation use the same confirmation timestamp as their thaw start time.

For each retained row:

### `storage: inventory`

- `presence-only`: set ordinary aggregate inventory to `true`; already-present is a no-op.
- non-FIFO `counted`: add the reviewed quantity to ordinary aggregate inventory.
- FIFO `counted`: add to ordinary aggregate inventory and `inventoryBatches/{ingredientId}/{stocked_on}`.

### `storage: freezer`

- `freezer_behavior: direct`: add only to ordinary aggregate `inventory` so the Ingredient stays immediately Recipe-available; presence-only direct items set ordinary inventory to `true`.
- `freezer_behavior: thaw-required`: add only to aggregate `freezerInventory`. The stock does not become Recipe-available until the normal thaw lifecycle transfers it into ordinary inventory.

### `storage: thawing`

- Valid only for `freezer_behavior: thaw-required` Ingredients.
- Create a thaw job directly for the reviewed quantity; do not first add that quantity to `freezerInventory` or ordinary `inventory`.
- `startedAt` is the import confirmation timestamp and `readyAt` is exactly 36 hours later, using the same lifecycle as a manually started thaw job.
- Until completion, the quantity is not Recipe-available. Automatic completion transfers the full remaining quantity to ordinary refrigerated inventory; FIFO Ingredients receive a batch dated with the actual completion date. Manual partial completion and cancellation keep their existing normal semantics, including cancellation returning the remaining quantity to frozen inventory.

Same-date additions merge within the refrigerated FIFO batch; frozen additions remain aggregate-only. Thaw jobs remain independent state until completion or cancellation. The import transaction must preserve aggregate/batch reconciliation, `currentMeal`, `activeStep`, recent meals, queued meals, current-meal availability, and the frozen current-meal freshness snapshot.

After a successful transaction, clear the pasted JSON and import draft. The import payload, recognized image, Chat transcript, and import history are not persisted as new household state.

## Non-goals

This contract does not add image upload, AI/API integration, fuzzy matching, in-page Ingredient creation, thaw history, receipt price, weight-to-unit conversion, per-package identities, import history, or a new Firebase node.
