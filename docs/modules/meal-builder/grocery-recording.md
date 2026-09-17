# Grocery recording protocol

## Trigger

Use this protocol only when the user says `记录模式` or clearly asks to enter the same grocery-recording workflow.

## Start

Before recording the first item:

1. Read `docs/modules/meal-builder/inventory-import.md`.
2. Read the current active Meal Builder Ingredient index at `src/data/meal-builder/ingredients/index.yaml` and only the category records needed to resolve reported items.
3. Match only active Ingredients whose `starter.visible` is true. Canonical Ingredient identity, quantity rules, storage rules, and final JSON contract come from the current repo. The receipt-label table below stores only reusable external receipt labels that resolve to those canonical IDs; it is not a second Ingredient list.
4. Read the reusable receipt-label table below before interpreting receipt text.
5. Start a fresh record for this chat only. Do not carry grocery items from another chat into this record.


## Reusable receipt labels

Frequently used stores print the same abbreviated item labels repeatedly. Treat an exact label match in this table as a reliable Ingredient identity and do not ask the user to reconfirm it. User correction still has higher priority than this table, and quantity/storage still follow the live receipt plus `inventory-import.md`.

When an otherwise ambiguous raw receipt label is explicitly resolved by the user and is stable enough to recur, persist that reusable mapping here so later grocery-recording chats can use it directly. Do not add one-off descriptions, inferred variants, storage choices, quantities, or non-inventory products.

| Receipt label | Ingredient ID |
| --- | --- |
| `ASN/TAS JASMINE RICE 10LBS` | `rice` |
| `MAILING STEAMO BREAD` | `steamed-buns` |
| `KONG KEE SMALL SOFT FRIED TO` | `fried-tofu-puffs` |
| `KUNG KEE EGG TOFU [SQUARE]` | `egg-tofu` |
| `SANSUI MULTI USE TOFU` | `soft-tofu` |
| `PORK SOFT BONE` | `soft-pork-ribs` |
| `SAKURA GROUND PORK` | `ground-pork` |
| `CHINESE LO BOK` | `daikon` |
| `TAIWAN SPINACH` | `spinach` |
| `A CHOY [TAIWAN LETTUCE]` | `youmai-cai` |
| `LONG NAPA` | `napa-cabbage` |
| `BABY NAPA` | `baby-napa-cabbage` |
| `JI MAO CHOY` | `chinese-greens` |
| `YOU CHOY MUI` | `choy-sum` |
| `YOU CHOY SUM` | `choy-sum` |
| `BEAN SPROUT` | `bean-sprouts` |
| `CHINESE EGGPLANT` | `eggplant` |

## Recording items

For every item the user reports:

- Match it immediately to a canonical Ingredient.
- If the match is reliable, add it to the current chat record and reply briefly: `已记录：<食材名> × <数量>（<冷藏/冷冻>）`.
- If identity is uncertain, multiple Ingredients are plausible, or product form changes Ingredient identity, do not guess or record it yet. Ask the user immediately.
- Preserve explicit user corrections to Ingredient identity, quantity, and storage destination.
- Apply the quantity and storage rules in `inventory-import.md`; explicit user instruction has priority where that protocol allows it.

## Receipt reconciliation

If the user later provides a receipt, reconcile it against the current chat record rather than rebuilding the record from the receipt alone.

- Resolve exact reusable receipt-label matches from the table above before doing semantic interpretation. Add items that were missed during shopping only when the receipt can be reliably matched to a canonical Ingredient.
- Use the receipt to check quantities and duplicate rows when reliable.
- Do not let abbreviated or ambiguous receipt text override an Ingredient identity, quantity correction, or storage destination that the user already explicitly confirmed in chat.
- If the receipt conflicts with confirmed chat information, or the receipt itself is not reliable enough to decide, ask the user instead of choosing silently.
- Do not count the same physical item twice merely because it appears both in chat and on the receipt.

Priority for reconciliation is:

1. explicit user confirmation or correction;
2. already-confirmed chat record;
3. reliable receipt evidence used for checking or filling omissions;
4. no guessing.

## Finish

When the user says `结束记录`, `出 JSON`, or clearly asks to finish the recording session:

1. Combine the current chat record, all user corrections, and any receipt reconciliation.
2. Produce the current `meal-builder-inventory-import` payload exactly as required by `docs/modules/meal-builder/inventory-import.md`.
3. Output only the paste-ready JSON code block, with no surrounding explanation.
