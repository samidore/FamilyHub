# Grocery recording protocol

## Modes and triggers

- `记录模式`：用户逐项报商品，持续维护本聊天的买菜记录。
- `小票入库`、`图片入库`、`根据小票入库`：从小票图片开始，识别完整清单并生成标准化核对表单。
- 已在本聊天的记录模式中时，后续上传小票只用于复核与补全，不另开记录，也不覆盖用户已确认的信息。

## Start

开始任一模式前：

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
| `NATURE SOY FIVE SPICE FLAVOR` | `pressed-tofu` |
| `PORK SOFT BONE` | `soft-pork-ribs` |
| `PORK BELLY [DICE]` | `diced-pork-belly` |
| `BEEF INSIDE SKIRTS` | `beef-skirt-steak` |
| `BF SLICED TONGUE` | `beef-tongue-slices` |
| `MUSSEL MEAT` | `mussel-meat` |
| `SAKURA GROUND PORK` | `ground-pork` |
| `KYL PORK SAUSAGE` | `white-oil-sausage` |
| `KING OYSTER MUSHROOM [SLICED]` | `king-oyster-mushrooms` |
| `ANTLER MUSHROOM [200G]` | `fresh-mixed-mushrooms` |
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
| `BABY CABBAGE` | `chinese-greens` |
| `BEEF RIB EYE SLICED` | `hot-pot-beef-slices` |
| `LAMB SHOULDER SLICED` | `hot-pot-lamb-slices` |
| `PORK SPARE RIB` | `soft-pork-ribs` |
| `BEEF DROP FLANK` | `whole-beef-brisket` |
| `FROZEN KUNG FU SNAKEHEAD FIS` | `fish-fillets` |
| `SHANGHAI STYLE RICE DUMPLING` | `zongzi` |

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

## Receipt-photo import: mandatory review form

上传一张或多张小票图片时，识别全部可见商品；同一小票的重叠截图、多个角度及重复出现的相同商品不得重复计数。先使用上方 receipt-label 对照表，再以当前 active Ingredient 核对商品身份。用户在本聊天已明确确认的身份、数量、存放方式优先于小票简称或模型推断。

### Presentation

识别完成后，**优先使用 ChatGPT 原生可交互表单**（移动端易操作的输入、数字选择、下拉/分段选择控件），把本次购物的所有已匹配和待确认项目集中展示；不以大段散文、多个独立问答或仅不可编辑的表格替代表单。无可用表单能力时，用同字段的结构化核对表和集中确认代替。

表单顶部包含商店、入库日期及已匹配／待确认数量；商店未知可留空，入库日期遵循 `inventory-import.md`。

每个商品行使用以下**固定字段与顺序**：

| 字段 | 表单要求 |
| --- | --- |
| 原始商品 | 小票原文，只读；必要时显示包装数量或重量作为参考 |
| Ingredient | 当前 canonical Ingredient 中文名；不能可靠匹配时标记待确认并提供可靠候选 |
| 本次入库数量 | 可修改的库存单位数量，按当前 canonical 规则预填，数量步长遵循 `inventory-import.md`；允许设为 0 以跳过 |
| 存放位置 | 仅展示该 Ingredient 支持的 `冷藏`、`冷冻`、`开始化冻`，已知用户确认优先，其他不确定项保持待确认 |
| 处理方式 | `入库`／`跳过`／`待确认`；未经可靠识别的商品不能默认入库 |

**不要设置“已吃掉”字段或通过买入数量减去已吃数量来计算入库。** 表单中的数量始终指**本次实际要入库的份数**，可直接改小、改为 0 或跳过。原小票上包装数量和重量是证据，不自动等同于库存份数，也不把 lb / g 换算为份数。重复行按已确认的物理商品数量合并。

同一个 Ingredient 的不同份数存放在不同位置时，拆成多行分别选存放位置；不得重复计算同一份商品。`presence-only` Ingredient 仍按 canonical 有无库存模式处理，表单可保留原始购买数量供核对，不把它作为持久数量。

**所有商品行下方单独放一个可输入的“补充说明／更正”文本框**，供用户一次说明漏报商品、名称纠正、拆分储存、数量修正或其他问题。文本框为可选项，不能替代各行的结构化字段。收到补充说明后更新本聊天记录并刷新核对结果；有歧义的修改须确认，不得直接猜测。该文本不进入 GitHub Issue 或 Firebase 库存状态。

表单底部展示本次实际入库的合计、冷藏／冷冻／化冻分布和待确认项目数。已跳过或数量为 0 的行仍可留在核对页，但不进入最终 payload。待确认项目集中显示，不强制用户一次全部解决；未确认项目不得发送到直接入库通道。

### Actions

- `保存选择`：仅更新本聊天的累计记录及已确认信息，不写库存。
- `确认并直接入库`：按当前 `inventory-import.md` 生成 v1 payload，仅包含已确认且数量大于 0 的有效 Ingredient，并通过 GitHub Issue bridge 提交一次指令。未确认项目继续保留在本聊天，提交前明确列出未入库项。
- `出 JSON`：仍按 canonical v1 contract 只输出可复制的 JSON code block。

GitHub Issue 创建成功只能报告“已提交，等待 FamilyHub 同步”，不能报告 Firebase 已写入；不上传小票图片、价格、补充说明文本或聊天记录到 GitHub Issue。

## Direct-entry alternative

When the user explicitly requests **direct FamilyHub entry** (for example, `直接入库`), use the GitHub Issue bridge defined in `inventory-import.md` instead of making them open an import link. A successful GitHub Issue creation means **queued for sync**, not that Firebase has already updated. The authenticated site commits it automatically when opened, with atomic idempotency. If the user asks for `出 JSON`, continue to use the JSON-only contract.

## Finish

When the user says `结束记录`, `出 JSON`, or clearly asks to finish the recording session:

1. Combine the current chat record, all user corrections, and any receipt reconciliation.
2. Produce the current `meal-builder-inventory-import` payload exactly as required by `docs/modules/meal-builder/inventory-import.md`.
3. Output only the paste-ready JSON code block, with no surrounding explanation.
