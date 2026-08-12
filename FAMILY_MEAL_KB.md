---
kb_version: 1.5
last_updated: 2026-08-12
language: zh-CN
status: active
---

# Family Meal Knowledge Base

> 本文件是家庭食谱项目唯一的长期知识库。ChatGPT 负责主要调研、内容设计、数据整理和验证；Codex 主要负责将确认后的内容制作成 Family Hub 网页并维护。
> 原则：简约、长期复用、易维护、易扩充；同一事实只维护一次。

# 1. PROJECT

## 1.1 目标

建立可长期复用的家庭餐食系统：Ingredient Library + Recipe Library 驱动 **dynamic Meal Builder**；用户先勾选本顿可用食材、Protein / Vegetable / Staple 目标、Child toggle 与时间条件，Meal Builder 实时候选并逐步填槽；选完后进入 Cook View 查看所选菜谱。Family Hub 是最终网页载体。预制 Meal Combo / Weekly Plan 不是当前网页成立的前置条件；只有用户明确保存常用搭配时才需要长期保存 meal combination。

## 1.2 当前阶段

当前阶段：**Vegetable Recipe Library v1.5 + finish-with-leafy-vegetable add-on formalization**。

- Ingredient Library 保持 132 条 Candidate Ingredient records 与 v1.4 Starter/UI schema；stable ID 不变。
- Recipe Library 从 139 条扩展到 **162 条**：新增 23 条去重后的 Vegetable-centered Recipe structures，全部为 `candidate`。
- 蒜蓉/清炒等同构做法已按 cooking structure 合并；可互换食材使用机器可读 `one_of`，不做 `vegetable × seasoning` 排列组合。
- 新增 `finish-with-leafy-vegetable` add-on：兼容主菜在铁锅/炒锅末段收汁时可顺锅焖一份兼容嫩叶菜，贡献 `vegetable: 1`，不生成 synthetic Recipe。
- 首批仅 7 条现有主菜支持该 add-on：糖醋排骨、红烧肉、照烧鸡腿、蚝油焖鸡腿/鸡小腿、可乐鸡翅、瑞士鸡翼、红烧牛肉。`Instant Pot 酱油鸡腿` 明确不支持。
- Child coverage schema 允许 `ingredient-dependent`；Ingredient 级 coverage 未被家庭确认时保持 `unknown`，不为 Meal Builder 虚构儿童接受度。
- 所有 Ingredient / Recipe 仍为 `candidate`，没有自动升级 `approved`；本阶段不生成 Weekly Plan。

# 2. CONSTRAINTS

## 2.1 家庭与口味

- 一般家庭规模：多位成人与幼儿阶段成员；不记录出生日期或身份信息。
- 成人也偏清淡。
- 基础菜不放辣；成人辣味在孩子份盛出后另加。
- 全家可共享同一轻盐度；避免重油。
- 优先一道全家共享菜，而不是默认另做儿童餐。

## 2.2 Meal 结构 / Meal Builder

通常每顿包括：
1. 目标数量的 Protein；
2. 目标数量的 Vegetable；
3. 一个 Staple；
4. 当 Child toggle 开启时，整顿饭必须满足 child protein coverage 与 child vegetable coverage。

Meal Builder 的 Protein / Vegetable 数量是**家庭组餐份数（planning slots）**，不是营养学 serving 或克数。Recipe 可同时贡献多个 slot；例如肉菜同炒可贡献 `protein: 0.5` + `vegetable: 1`。

Protein target 有内部 `+0.5` tolerance：例如 `Protein = 1` 时，正常候选可累计到 1.5。达到成人 Protein 目标后，不能补当前缺口、且会超过剩余 tolerance 的 Protein Recipe 应消失；若 Child toggle 开启且 child protein coverage 仍未满足，可保留能解决该 hard coverage 的更大 Protein Recipe 作为 fallback。能以较小 Protein 增量并同时补 Vegetable 等其他缺口的 Recipe 优先。Vegetable 使用同类“补缺口优先、无用 overage 降权/隐藏”的逻辑。

Child toggle 默认开启。Child coverage 是**Meal completion 的硬条件**，但不是简单按 Recipe 类别过滤：系统根据已选菜实时判断仍缺什么。

Recipe 本身不强制同时含蔬菜；Meal Builder 根据每条 Recipe 的 `meal_contribution` 与 `child_coverage` 动态计算完整性。

受控 main protein categories：`pork`, `beef`, `lamb`, `chicken`, `egg`, `tofu`, `fish`, `shellfish`, `mixed`, `none`。Goat 归入 `lamb`。

## 2.3 烹饪方法与设备

允许：炖、煮、蒸、焖、煎、炒、烤、空气炸。**不用锅/炒锅深油炸。**

主要设备：
- 9-quart Instant Pot；
- 中火灶口 + 不粘锅；
- 强火灶口 + 铁锅/炒锅。

次要设备：gas oven、small air fryer。

Chicken 长期采购规则：只买 Whole Foods。

## 2.4 时间规则 — 2026-08-11 修订

- 时间是**计划与工作量信号，不是特别硬的 Recipe 淘汰条件**；每天 schedule 可不同。
- 午餐仍以 30–45 分钟临近上桌工作量作为常用参考，但 advance-start、低 active-time 菜可以保留。
- 时间评估必须考虑开包装、洗、削、修整、剪/切、腌、预热、换锅和实际清洁成本，而不是只看加热时间。
- 没有家庭实测时，可记录可靠来源或 workflow-derived **范围**，明确不是 household stopwatch data；不因缺少精确分钟自动 BLOCKED。
- 只有会改变安全、可执行性、Recipe identity 或家庭 fit 的时间/参数问题才需要人工介入。

正式字段：`active_minutes`, `meal_window_minutes`, `elapsed_minutes`, `advance_start_required`。

## 2.5 Instant Pot / pot-in-pot

- 家庭常见模式：**下层烧肉，上层架起不锈钢容器蒸饭**。
- 家庭经验中，肉类常见压力段约 **10–15 分钟**；这是工作模式，不是所有 Recipe 的统一参数。
- 液体量、米水比、release、不同肉块厚度仍按具体 Recipe / 首次测试校准；不为每道菜机械追问。

## 2.6 Ingredient / cut / child rules

- Recipe 先找真实成熟菜式，不做 `protein × vegetable × technique` 排列组合。
- canonical meat cut 不是淘汰条件；可用家庭现有整块/大块肉自行切片、切条、切块，只要不破坏菜式身份。
- Child suitability 必须区分客观质地、孩子当前接受度、以及上桌后的去骨/剪小动作。
- `pressed-tofu`, `dried-yuba-sticks`, `fried-tofu-puffs` 默认是 supporting ingredients，不自动成为 tofu-main Recipe base。
- `egg-tofu` 质地软，**孩子会吃**。
- 木耳统一使用 `fresh-wood-ear-mushrooms`，不是干木耳，不计泡发时间。
- Homemade whole roast chicken 已移出 Recipe pool；烤鸡优先购买 ready-cooked supermarket roast/rotisserie chicken，不在此自动新增 Ingredient。
- 家里有 ready-made/canned scallion oil，葱油拌面不需要从头炸葱油。

## 2.7 Vegetable Recipe / finishing add-on rules

- Vegetable Recipe 继续遵守“真实 cooking structure 优先”：`蒜蓉菜心`、`蒜蓉豆苗` 等若核心 workflow 与清炒叶菜相同，则合并为一个 Recipe，通过 `one_of` 覆盖兼容 Ingredient。
- `meal_contribution.vegetable` 表示整盘菜在家庭组餐中的 Vegetable slot 贡献，不由 Vegetable Ingredient 数量机械推导；例如莴笋 + 新鲜木耳仍可整体记为 `vegetable: 1`。
- `finish-with-leafy-vegetable` 是**主 Recipe 的选配 add-on**，不是独立 Recipe：只允许在已明确声明支持、且确有 stovetop 收汁/焖烧末段窗口的主菜上使用。
- add-on 所接受的叶菜由 Ingredient tag `finish-wilt-compatible` 决定；不能从 `starter.section: leafy-vegetable` 自动推断。
- 首批 `finish-wilt-compatible`：`chinese-greens`, `lettuce`, `youmai-cai`, `choy-sum`, `baby-napa-cabbage`。菠菜因家庭去草酸 workflow、芥兰/空心菜等因火候或质地差异暂不自动兼容。
- add-on 被选中后贡献 `vegetable: 1`，并作为所选主 Recipe 的附属状态保存；不可生成诸如“糖醋排骨上海青”的新 Recipe stable ID。
- 同一 available Ingredient 仍可用于独立 Vegetable Recipe；在两者都能补当前 Vegetable gap 时，Meal Builder 可优先 add-on，因为不另占 burner、附加 active work 更低，但独立菜仍可选。
- `child_coverage` 可为 `ingredient-dependent`：当 Recipe / add-on 的儿童 coverage 取决于 `one_of` 中实际选中的 Ingredient 时，运行时读取该 Ingredient 的 `child_coverage`。`unknown` 不视为满足 Child hard coverage。

# 3. STANDARDS

## 3.1 Status / ID / evidence / fit

- status: `candidate | approved | archived`；本版新增 Recipe 全部 `candidate`。
- Stable ID: lowercase kebab-case；已有 ID 保留。
- Evidence levels: `official-current`, `retailer-current`, `reputable-general`, `user-confirmed`, `inferred`, `unverified`。
- Fit score: integer 0–5；硬约束失败不能被高分覆盖。

## 3.2 Controlled tags

Timing: `lunch-30`, `lunch-45`, `make-ahead`, `advance-start`, `low-active-time`, `one-pot`, `pot-in-pot`, `leftover-friendly`, `freezer-friendly`.

Family: `family-shared`, `soft-protein`, `soft-vegetable`, `child-support-protein`, `adult-finish-separate`, `two-vegetable-ready`.

Equipment: `instant-pot`, `stovetop-nonstick`, `stovetop-wok`, `oven`, `air-fryer`.

Preparation/method: `low-prep`, `medium-prep`, `high-prep`, `minimal-cutting`, `light-seasoning`, `non-spicy-base`, `pan-seared`, `stir-fried`, `steamed`, `braised`, `simmered`, `roasted`.

Ingredient capability: `finish-wilt-compatible` (only for Ingredients explicitly validated for the `finish-with-leafy-vegetable` add-on).

## 3.3 Candidate Recipe record shape — v1.5

```yaml
id:
type: recipe
status: candidate
name_zh:
name_en:
tags: []
fit: {hard_rules:, score:, strengths: [], tradeoffs: []}
evidence: {level:, checked_on:, scope:, sources: []}
notes:
primary_role: protein | vegetable | staple | mixed
main_protein_category:
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein:
  vegetable:
  staple:
child_coverage:
  protein: true | false | ingredient-dependent
  vegetable: true | false | ingredient-dependent
meal_addons:
  - id:
    accepts_ingredient_tag:
    meal_contribution: {protein:, vegetable:, staple:}
    child_coverage: {protein:, vegetable:}
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids: []
active_minutes:
meal_window_minutes:
elapsed_minutes:
advance_start_required:
equipment: []
burner_plan:
child_suitable:
child_texture:
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable | cookable | household-tested
ingredients:
  - ingredient_id: example-id
    role: main-protein | supporting-protein | vegetable | integral-staple
    availability: required
  - one_of: [example-a, example-b]
    role: main-protein
    availability: required
  - pantry_core: common seasonings
    role: seasoning
    availability: assumed
steps:
child_serving:
adult_finish:
substitutions:
```

### Meal Builder field semantics

- `meal_contribution` 是家庭组餐 planning slot，不是营养学 serving 或克数。常用粒度为 `0`, `0.5`, `1`；只有明确需要时才使用更大 Vegetable contribution。
- `primary_role` 只用于 UI 分类/排序；真正的 slot 计算只读取 `meal_contribution`。
- `child_coverage.protein` / `.vegetable` 表示该 Recipe 按正常家庭 serving 与 child-serving 路线是否能实际承担相应儿童 coverage。值可为 `true`, `false`, `ingredient-dependent`。已知当前接受度优先；缺少直接家庭事实时使用保守的质地 / 可分食 workflow inference，不把“理论可吃”自动写成 true。`ingredient-dependent` 时运行时读取实际选中 Ingredient 的对应 coverage；Ingredient 为 `unknown` 时不计为满足 hard coverage。
- `meal_addons` 只用于已正式定义的 Recipe add-on；v1.5 首个受控 add-on 为 `finish-with-leafy-vegetable`。Add-on contribution 与 child coverage 参与 Meal Builder 聚合，但不改变主 Recipe stable ID。
- `child_suitable` / `child_texture` / `child_serving` 继续记录更细的儿童事实；旧 `child_support_protein_needed` 已废弃，因为 Meal Builder 可由当前 meal state + `child_coverage` 动态推出。
- `integral_staple_ingredient_ids` 表示 Recipe 本身包含的 Staple；`recommended_staple_ingredient_ids` 只是搭配建议。旧 `staple_pairings` 已废弃。
- `vegetable_ingredient_ids` 只列真正的 Vegetable / fungi；项目定义为 Staple 的 potato / sweet-potato / taro / lotus-root / kabocha / corn 等不再混入此字段。旧 `vegetable_count` 已废弃，Builder 只读取 `meal_contribution.vegetable`。
- `ingredients[].availability: required` 表示 Starter 中必须有该非-pantry Ingredient 才能做；`pantry_core` 使用 `assumed`，不要求用户在 Starter 里勾选。
- `one_of` 用于已确认的等价主料/切型替代，任一可用即可满足 Recipe availability。
- `detail_level: discoverable` 表示足以参与 Meal Builder，但还没有被正式整理成完整 Cook View；`cookable` 要有足够可执行的用量/步骤；`household-tested` 表示完整菜谱已经过家庭实做校准。

**Candidate quantity rule:** 不为尚未家庭测试的 Recipe 虚构精确克数/酱汁比例。`ingredients` 负责结构与 availability；具体比例由引用来源支持并在 Cook View / 首次家庭实做时校准。这不影响 Recipe identity / fit / Meal Builder 使用。

## 3.4 Candidate Ingredient record shape — v1.5

```yaml
id:
type: ingredient
status: candidate
name_zh:
name_en:
starter:
  visible: true | false
  section:
  order:
tags: []
child_coverage:  # optional; needed when Recipe coverage is ingredient-dependent
  vegetable: true | false | unknown
fit:
  hard_rules: pass | fail | n/a | unknown
  score: 0-5
  strengths: []
  tradeoffs: []
evidence:
  level:
  checked_on:
  scope:
  sources: []
notes:
```

### Starter/UI semantics

- Starter 上勾选的是**本顿可以使用的 Ingredient**，不是“必须使用”的食材。
- `starter.visible: true` 的 Ingredient 生成可点击按钮；选中状态必须在 section collapse / expand 后保持。
- `starter.visible: false` 用于保留长期 Ingredient ID 但不要求用户管理的 pantry item。
- Recipe availability 仍以 Recipe record 为唯一事实来源：所有 `availability: required` 条件必须被当前 available-ingredient selection 满足；`one_of` 任一选中即可；`pantry_core: assumed` 不需要 Starter 选择。
- `starter.section` 只负责 UI 分区；Recipe 的 Protein / Vegetable / Staple contribution 仍只读取 Recipe `meal_contribution`，不能从 Ingredient section 反推。
- `starter.order` 是稳定 UI 排序值；当前迁移沿用已确认 Ingredient brainstorm 的原有顺序，不按字母或临时 Recipe 数量动态重排。
- Ingredient `child_coverage.vegetable` 是当前家庭 Meal Builder coverage 事实，可为 `true`, `false`, `unknown`；只在 Recipe 标记为 `ingredient-dependent` 时参与运行时解析。未确认时保持 `unknown`。
- Ingredient capability 只能由明确 tag 声明；例如 `finish-wilt-compatible` 不能由“属于叶菜 section”自动推断。
- 所有显示 section 均可 collapse；collapse 只改变显示，不改变已选 Ingredient。

Starter section registry：

```yaml
starter_sections:
  - {id: pork, label_zh: 猪肉, label_en: Pork, order: 10, visible: true}
  - {id: chicken, label_zh: 鸡肉, label_en: Chicken, order: 20, visible: true}
  - {id: beef, label_zh: 牛肉, label_en: Beef, order: 30, visible: true}
  - {id: lamb-goat, label_zh: 羊 / 山羊, label_en: Lamb / Goat, order: 40, visible: true}
  - {id: fish, label_zh: 鱼, label_en: Fish, order: 50, visible: true}
  - {id: shellfish, label_zh: 海鲜, label_en: Shellfish / Seafood, order: 60, visible: true}
  - {id: egg-tofu, label_zh: 蛋 / 豆腐, label_en: Egg / Tofu, order: 70, visible: true}
  - {id: leafy-vegetable, label_zh: 叶菜, label_en: Leafy Vegetables, order: 80, visible: true}
  - {id: other-vegetable, label_zh: 其他蔬菜, label_en: Other Vegetables, order: 90, visible: true}
  - {id: mushroom, label_zh: 菌菇, label_en: Mushrooms, order: 100, visible: true}
  - {id: staple, label_zh: 主食, label_en: Staples, order: 110, visible: true}
  - {id: pantry, label_zh: 常备香料, label_en: Pantry Aromatics, order: 999, visible: false}
```

# 4. INGREDIENT LIBRARY

> 本节将原 Candidate Index 迁移为正式 Candidate Ingredient records。所有 132 个既有 stable ID 均保留；本 migration 不创建 retailer inventory / price / package-size 等时效事实。

## 4.1 Pork

### ingredient: whole-pork-tenderloin | 猪里脊

```yaml
id: whole-pork-tenderloin
type: ingredient
status: candidate
name_zh: 猪里脊
name_en: Whole Pork Tenderloin
starter:
  visible: true
  section: pork
  order: 10
tags: []
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 有明确家庭高价值 / 接受度信息。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 家庭高价值食材；household-observed preference favors tenderloin dishes.
```

### ingredient: pork-shoulder-chunks | 梅花肉块

```yaml
id: pork-shoulder-chunks
type: ingredient
status: candidate
name_zh: 梅花肉块
name_en: Pork Shoulder Chunks
starter:
  visible: true
  section: pork
  order: 20
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: thin-sliced-pork-belly | 薄切五花肉

```yaml
id: thin-sliced-pork-belly
type: ingredient
status: candidate
name_zh: 薄切五花肉
name_en: Thin-Sliced Pork Belly
starter:
  visible: true
  section: pork
  order: 30
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: extra-thin-sliced-pork-belly | 超薄切五花肉

```yaml
id: extra-thin-sliced-pork-belly
type: ingredient
status: candidate
name_zh: 超薄切五花肉
name_en: Extra-Thin-Sliced Pork Belly
starter:
  visible: true
  section: pork
  order: 40
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: ground-pork | 猪绞肉

```yaml
id: ground-pork
type: ingredient
status: candidate
name_zh: 猪绞肉
name_en: Ground Pork
starter:
  visible: true
  section: pork
  order: 50
tags: []
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 有明确家庭高价值 / 接受度信息。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 家庭接受度高；家庭认为味道优于牛绞肉。
```

### ingredient: soft-pork-ribs | 软排骨

```yaml
id: soft-pork-ribs
type: ingredient
status: candidate
name_zh: 软排骨
name_en: Soft Pork Ribs
starter:
  visible: true
  section: pork
  order: 60
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs:
  - 具体 butcher cut 尚未严格核实。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 现有 stable ID 保留；具体 butcher cut 尚未严格核实，不在本次 UI migration 中虚构。
```

### ingredient: pork-feet | 猪脚

```yaml
id: pork-feet
type: ingredient
status: candidate
name_zh: 猪脚
name_en: Pork Feet
starter:
  visible: true
  section: pork
  order: 70
tags:
- child-eaten
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 孩子可以吃；总耗时通常较长。
```

### ingredient: pork-chops | 猪排

```yaml
id: pork-chops
type: ingredient
status: candidate
name_zh: 猪排
name_en: Pork Chops
starter:
  visible: true
  section: pork
  order: 80
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: pork-liver | 猪肝

```yaml
id: pork-liver
type: ingredient
status: candidate
name_zh: 猪肝
name_en: Pork Liver
starter:
  visible: true
  section: pork
  order: 90
tags:
- low-priority
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 保留为可用候选，特定场景仍有价值。
  tradeoffs:
  - 用户已明确降低优先度或使用频率。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 用户已明确降为低优先度。
```

### ingredient: white-oil-sausage | 白油肠

```yaml
id: white-oil-sausage
type: ingredient
status: candidate
name_zh: 白油肠
name_en: White Oil Sausage
starter:
  visible: true
  section: pork
  order: 100
tags:
- supporting-only
- processed
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 作为 supporting ingredient 有明确菜单价值。
  tradeoffs:
  - 默认不承担 main-protein base；用途比核心主料窄。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Processed / supporting ingredient。
```

### ingredient: chinese-sausage | 中式香肠

```yaml
id: chinese-sausage
type: ingredient
status: candidate
name_zh: 中式香肠
name_en: Chinese Sausage
starter:
  visible: true
  section: pork
  order: 110
tags:
- supporting-only
- processed
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 作为 supporting ingredient 有明确菜单价值。
  tradeoffs:
  - 默认不承担 main-protein base；用途比核心主料窄。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Processed / supporting ingredient。
```

### ingredient: pork-meatballs | 贡丸

```yaml
id: pork-meatballs
type: ingredient
status: candidate
name_zh: 贡丸
name_en: Pork Meatballs
starter:
  visible: true
  section: pork
  order: 120
tags:
- supporting-only
- processed
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 作为 supporting ingredient 有明确菜单价值。
  tradeoffs:
  - 默认不承担 main-protein base；用途比核心主料窄。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Processed / supporting ingredient。
```


## 4.2 Chicken

### ingredient: boneless-skinless-chicken-thighs | 无骨去皮鸡腿肉

```yaml
id: boneless-skinless-chicken-thighs
type: ingredient
status: candidate
name_zh: 无骨去皮鸡腿肉
name_en: Boneless Skinless Chicken Thighs
starter:
  visible: true
  section: chicken
  order: 10
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: chicken-breast | 鸡胸

```yaml
id: chicken-breast
type: ingredient
status: candidate
name_zh: 鸡胸
name_en: Chicken Breast
starter:
  visible: true
  section: chicken
  order: 20
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: whole-chicken-wings | 整鸡翅

```yaml
id: whole-chicken-wings
type: ingredient
status: candidate
name_zh: 整鸡翅
name_en: Whole Chicken Wings
starter:
  visible: true
  section: chicken
  order: 30
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: party-wings | Party Wings

```yaml
id: party-wings
type: ingredient
status: candidate
name_zh: Party Wings
name_en: Party Wings
starter:
  visible: true
  section: chicken
  order: 40
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: chicken-drumsticks | 鸡小腿

```yaml
id: chicken-drumsticks
type: ingredient
status: candidate
name_zh: 鸡小腿
name_en: Chicken Drumsticks
starter:
  visible: true
  section: chicken
  order: 50
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: bone-in-chicken-thighs | 带骨鸡腿

```yaml
id: bone-in-chicken-thighs
type: ingredient
status: candidate
name_zh: 带骨鸡腿
name_en: Bone-In Chicken Thighs
starter:
  visible: true
  section: chicken
  order: 60
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: frozen-chicken-patties | 冷冻鸡肉饼

```yaml
id: frozen-chicken-patties
type: ingredient
status: candidate
name_zh: 冷冻鸡肉饼
name_en: Frozen Chicken Patties
starter:
  visible: true
  section: chicken
  order: 70
tags:
- processed
- frozen
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: whole-chicken | 整鸡

```yaml
id: whole-chicken
type: ingredient
status: candidate
name_zh: 整鸡
name_en: Whole Chicken
starter:
  visible: true
  section: chicken
  order: 80
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: chicken-gizzards | 鸡胗

```yaml
id: chicken-gizzards
type: ingredient
status: candidate
name_zh: 鸡胗
name_en: Chicken Gizzards
starter:
  visible: true
  section: chicken
  order: 90
tags:
- low-priority
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 保留为可用候选，特定场景仍有价值。
  tradeoffs:
  - 用户已明确降低优先度或使用频率。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 低优先度。
```

### ingredient: chicken-hearts | 鸡心

```yaml
id: chicken-hearts
type: ingredient
status: candidate
name_zh: 鸡心
name_en: Chicken Hearts
starter:
  visible: true
  section: chicken
  order: 100
tags:
- low-priority
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 保留为可用候选，特定场景仍有价值。
  tradeoffs:
  - 用户已明确降低优先度或使用频率。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 低优先度。
```

### ingredient: chicken-liver | 鸡肝

```yaml
id: chicken-liver
type: ingredient
status: candidate
name_zh: 鸡肝
name_en: Chicken Liver
starter:
  visible: true
  section: chicken
  order: 110
tags:
- low-priority
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 保留为可用候选，特定场景仍有价值。
  tradeoffs:
  - 用户已明确降低优先度或使用频率。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 低优先度 / 计划尝试。
```


## 4.3 Beef

### ingredient: whole-beef-brisket | 整块牛腩

```yaml
id: whole-beef-brisket
type: ingredient
status: candidate
name_zh: 整块牛腩
name_en: Whole Beef Brisket
starter:
  visible: true
  section: beef
  order: 10
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: sliced-beef-brisket | 牛腩片

```yaml
id: sliced-beef-brisket
type: ingredient
status: candidate
name_zh: 牛腩片
name_en: Sliced Beef Brisket
starter:
  visible: true
  section: beef
  order: 20
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: hot-pot-beef-slices | 火锅牛肉片

```yaml
id: hot-pot-beef-slices
type: ingredient
status: candidate
name_zh: 火锅牛肉片
name_en: Hot-Pot Beef Slices
starter:
  visible: true
  section: beef
  order: 30
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: beef-shank | 牛腱

```yaml
id: beef-shank
type: ingredient
status: candidate
name_zh: 牛腱
name_en: Beef Shank
starter:
  visible: true
  section: beef
  order: 40
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: chuck-roast | 牛肩肉大块

```yaml
id: chuck-roast
type: ingredient
status: candidate
name_zh: 牛肩肉大块
name_en: Chuck Roast
starter:
  visible: true
  section: beef
  order: 50
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: oxtail | 牛尾

```yaml
id: oxtail
type: ingredient
status: candidate
name_zh: 牛尾
name_en: Oxtail
starter:
  visible: true
  section: beef
  order: 60
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: cross-cut-beef-short-ribs | 横切牛小排

```yaml
id: cross-cut-beef-short-ribs
type: ingredient
status: candidate
name_zh: 横切牛小排
name_en: Cross-Cut Beef Short Ribs
starter:
  visible: true
  section: beef
  order: 70
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: ground-beef | 牛绞肉

```yaml
id: ground-beef
type: ingredient
status: candidate
name_zh: 牛绞肉
name_en: Ground Beef
starter:
  visible: true
  section: beef
  order: 80
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: frozen-beef-patties | 冷冻牛肉饼

```yaml
id: frozen-beef-patties
type: ingredient
status: candidate
name_zh: 冷冻牛肉饼
name_en: Frozen Beef Patties
starter:
  visible: true
  section: beef
  order: 90
tags:
- processed
- frozen
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: beef-rib-fingers | 牛肋条

```yaml
id: beef-rib-fingers
type: ingredient
status: candidate
name_zh: 牛肋条
name_en: Beef Rib Fingers
starter:
  visible: true
  section: beef
  order: 100
tags:
- low-priority
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 保留为可用候选，特定场景仍有价值。
  tradeoffs:
  - 用户已明确降低优先度或使用频率。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 用户已明确降为低优先度。
```

### ingredient: flat-iron-steak | 板腱牛排

```yaml
id: flat-iron-steak
type: ingredient
status: candidate
name_zh: 板腱牛排
name_en: Flat Iron Steak
starter:
  visible: true
  section: beef
  order: 110
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: denver-steak | 丹佛牛排

```yaml
id: denver-steak
type: ingredient
status: candidate
name_zh: 丹佛牛排
name_en: Denver Steak
starter:
  visible: true
  section: beef
  order: 120
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: boneless-beef-short-ribs | 无骨牛小排

```yaml
id: boneless-beef-short-ribs
type: ingredient
status: candidate
name_zh: 无骨牛小排
name_en: Boneless Beef Short Ribs
starter:
  visible: true
  section: beef
  order: 130
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: beef-steak | 牛排

```yaml
id: beef-steak
type: ingredient
status: candidate
name_zh: 牛排
name_en: Beef Steak
starter:
  visible: true
  section: beef
  order: 140
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```


## 4.4 Lamb / Goat

### ingredient: hot-pot-lamb-slices | 火锅羊肉片

```yaml
id: hot-pot-lamb-slices
type: ingredient
status: candidate
name_zh: 火锅羊肉片
name_en: Hot-Pot Lamb Slices
starter:
  visible: true
  section: lamb-goat
  order: 10
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: lamb-shoulder-chunks | 羊肩肉块

```yaml
id: lamb-shoulder-chunks
type: ingredient
status: candidate
name_zh: 羊肩肉块
name_en: Lamb Shoulder Chunks
starter:
  visible: true
  section: lamb-goat
  order: 20
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: lamb-leg-chunks | 羊腿肉块

```yaml
id: lamb-leg-chunks
type: ingredient
status: candidate
name_zh: 羊腿肉块
name_en: Lamb Leg Chunks
starter:
  visible: true
  section: lamb-goat
  order: 30
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: bone-in-lamb-chops | 带骨羊排

```yaml
id: bone-in-lamb-chops
type: ingredient
status: candidate
name_zh: 带骨羊排
name_en: Bone-In Lamb Chops
starter:
  visible: true
  section: lamb-goat
  order: 40
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: boneless-lamb-chops | 无骨羊排

```yaml
id: boneless-lamb-chops
type: ingredient
status: candidate
name_zh: 无骨羊排
name_en: Boneless Lamb Chops
starter:
  visible: true
  section: lamb-goat
  order: 50
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: lamb-shanks | 羊腱

```yaml
id: lamb-shanks
type: ingredient
status: candidate
name_zh: 羊腱
name_en: Lamb Shanks
starter:
  visible: true
  section: lamb-goat
  order: 60
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: lamb-riblets | 羊肋排

```yaml
id: lamb-riblets
type: ingredient
status: candidate
name_zh: 羊肋排
name_en: Lamb Riblets
starter:
  visible: true
  section: lamb-goat
  order: 70
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: skin-on-bone-in-goat-pieces | 带皮带骨山羊肉块

```yaml
id: skin-on-bone-in-goat-pieces
type: ingredient
status: candidate
name_zh: 带皮带骨山羊肉块
name_en: Skin-On Bone-In Goat Pieces
starter:
  visible: true
  section: lamb-goat
  order: 80
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: lamb-spine-sections | 羊蝎子

```yaml
id: lamb-spine-sections
type: ingredient
status: candidate
name_zh: 羊蝎子
name_en: Lamb Spine Sections
starter:
  visible: true
  section: lamb-goat
  order: 90
tags:
- low-priority
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 保留为可用候选，特定场景仍有价值。
  tradeoffs:
  - 用户已明确降低优先度或使用频率。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 低频候选。
```


## 4.5 Fish

> Household context: fish is used less often; household acceptance varies by mild sea-bass-like routes such as Branzino. This context does not change Ingredient Starter visibility.

### ingredient: salmon | 三文鱼

```yaml
id: salmon
type: ingredient
status: candidate
name_zh: 三文鱼
name_en: Salmon
starter:
  visible: true
  section: fish
  order: 10
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: chilean-sea-bass | 智利海鲈

```yaml
id: chilean-sea-bass
type: ingredient
status: candidate
name_zh: 智利海鲈
name_en: Chilean Sea Bass
starter:
  visible: true
  section: fish
  order: 20
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: live-freshwater-bass | 活淡水鲈鱼

```yaml
id: live-freshwater-bass
type: ingredient
status: candidate
name_zh: 活淡水鲈鱼
name_en: Live Freshwater Bass
starter:
  visible: true
  section: fish
  order: 30
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: branzino | Branzino（欧洲海鲈）

```yaml
id: branzino
type: ingredient
status: candidate
name_zh: Branzino（欧洲海鲈）
name_en: Branzino
starter:
  visible: true
  section: fish
  order: 40
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: sablefish | Sablefish（黑鳕）

```yaml
id: sablefish
type: ingredient
status: candidate
name_zh: Sablefish（黑鳕）
name_en: Sablefish
starter:
  visible: true
  section: fish
  order: 50
tags:
- exploratory
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 保留为探索性候选，可扩展现有 Recipe 路线。
  tradeoffs:
  - 家庭接受度 / 重复使用价值尚未充分验证。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 探索性鱼类候选。
```

### ingredient: halibut | 大比目鱼

```yaml
id: halibut
type: ingredient
status: candidate
name_zh: 大比目鱼
name_en: Halibut
starter:
  visible: true
  section: fish
  order: 60
tags:
- exploratory
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 保留为探索性候选，可扩展现有 Recipe 路线。
  tradeoffs:
  - 家庭接受度 / 重复使用价值尚未充分验证。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 探索性鱼类候选。
```

### ingredient: black-sea-bass | 黑海鲈

```yaml
id: black-sea-bass
type: ingredient
status: candidate
name_zh: 黑海鲈
name_en: Black Sea Bass
starter:
  visible: true
  section: fish
  order: 70
tags:
- exploratory
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 保留为探索性候选，可扩展现有 Recipe 路线。
  tradeoffs:
  - 家庭接受度 / 重复使用价值尚未充分验证。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 探索性鱼类候选。
```

### ingredient: grouper | 石斑鱼

```yaml
id: grouper
type: ingredient
status: candidate
name_zh: 石斑鱼
name_en: Grouper
starter:
  visible: true
  section: fish
  order: 80
tags:
- exploratory
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 保留为探索性候选，可扩展现有 Recipe 路线。
  tradeoffs:
  - 家庭接受度 / 重复使用价值尚未充分验证。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 探索性鱼类候选。
```


## 4.6 Shellfish / Seafood

> Processed seafood 默认 supporting use，不自动承担 main protein。

### ingredient: peeled-shrimp | 虾仁

```yaml
id: peeled-shrimp
type: ingredient
status: candidate
name_zh: 虾仁
name_en: Peeled Shrimp
starter:
  visible: true
  section: shellfish
  order: 10
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: shell-on-shrimp | 带壳虾

```yaml
id: shell-on-shrimp
type: ingredient
status: candidate
name_zh: 带壳虾
name_en: Shell-On Shrimp
starter:
  visible: true
  section: shellfish
  order: 20
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: scallops | 扇贝

```yaml
id: scallops
type: ingredient
status: candidate
name_zh: 扇贝
name_en: Scallops
starter:
  visible: true
  section: shellfish
  order: 30
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: squid | 鱿鱼

```yaml
id: squid
type: ingredient
status: candidate
name_zh: 鱿鱼
name_en: Squid
starter:
  visible: true
  section: shellfish
  order: 40
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: oysters | 生蚝

```yaml
id: oysters
type: ingredient
status: candidate
name_zh: 生蚝
name_en: Oysters
starter:
  visible: true
  section: shellfish
  order: 50
tags:
- low-priority
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 保留为可用候选，特定场景仍有价值。
  tradeoffs:
  - 用户已明确降低优先度或使用频率。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 低优先度。
```

### ingredient: shrimp-paste | 虾滑

```yaml
id: shrimp-paste
type: ingredient
status: candidate
name_zh: 虾滑
name_en: Shrimp Paste
starter:
  visible: true
  section: shellfish
  order: 60
tags:
- supporting-only
- processed
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 作为 supporting ingredient 有明确菜单价值。
  tradeoffs:
  - 默认不承担 main-protein base；用途比核心主料窄。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Processed seafood；默认 supporting use。
```

### ingredient: fish-paste | 鱼滑

```yaml
id: fish-paste
type: ingredient
status: candidate
name_zh: 鱼滑
name_en: Fish Paste
starter:
  visible: true
  section: shellfish
  order: 70
tags:
- supporting-only
- processed
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 作为 supporting ingredient 有明确菜单价值。
  tradeoffs:
  - 默认不承担 main-protein base；用途比核心主料窄。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Processed seafood；默认 supporting use。
```

### ingredient: fish-balls | 鱼丸

```yaml
id: fish-balls
type: ingredient
status: candidate
name_zh: 鱼丸
name_en: Fish Balls
starter:
  visible: true
  section: shellfish
  order: 80
tags:
- supporting-only
- processed
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 作为 supporting ingredient 有明确菜单价值。
  tradeoffs:
  - 默认不承担 main-protein base；用途比核心主料窄。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Processed seafood；默认 supporting use。
```

### ingredient: assorted-seafood-balls | 综合海鲜丸

```yaml
id: assorted-seafood-balls
type: ingredient
status: candidate
name_zh: 综合海鲜丸
name_en: Assorted Seafood Balls
starter:
  visible: true
  section: shellfish
  order: 90
tags:
- supporting-only
- processed
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 作为 supporting ingredient 有明确菜单价值。
  tradeoffs:
  - 默认不承担 main-protein base；用途比核心主料窄。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Processed seafood；默认 supporting use。
```


## 4.7 Egg / Tofu

> `pressed-tofu`, `dried-yuba-sticks`, `fried-tofu-puffs` 默认 supporting ingredients；`egg-tofu` 当前修正规则为质地软且孩子会吃。

### ingredient: eggs | 鸡蛋

```yaml
id: eggs
type: ingredient
status: candidate
name_zh: 鸡蛋
name_en: Eggs
starter:
  visible: true
  section: egg-tofu
  order: 10
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: soft-tofu | 嫩豆腐

```yaml
id: soft-tofu
type: ingredient
status: candidate
name_zh: 嫩豆腐
name_en: Soft Tofu
starter:
  visible: true
  section: egg-tofu
  order: 20
tags:
- child-eaten
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 有明确家庭高价值 / 接受度信息。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 孩子明确喜欢；软质地。
```

### ingredient: firm-tofu | 老豆腐 / 硬豆腐

```yaml
id: firm-tofu
type: ingredient
status: candidate
name_zh: 老豆腐 / 硬豆腐
name_en: Firm Tofu
starter:
  visible: true
  section: egg-tofu
  order: 30
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs:
  - 孩子当前不稳定接受。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 成人偏好；孩子当前不稳定接受。
```

### ingredient: egg-tofu | 鸡蛋豆腐（日本豆腐）

```yaml
id: egg-tofu
type: ingredient
status: candidate
name_zh: 鸡蛋豆腐（日本豆腐）
name_en: Egg Tofu
starter:
  visible: true
  section: egg-tofu
  order: 40
tags:
- child-eaten
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 当前修正规则：质地软，孩子会吃。
```

### ingredient: pressed-tofu | 香干

```yaml
id: pressed-tofu
type: ingredient
status: candidate
name_zh: 香干
name_en: Pressed Tofu
starter:
  visible: true
  section: egg-tofu
  order: 50
tags:
- supporting-only
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 作为 supporting ingredient 有明确菜单价值。
  tradeoffs:
  - 默认不承担 main-protein base；用途比核心主料窄。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 用户喜欢；作为 supporting ingredient，不自动成为 tofu-main base。
```

### ingredient: tofu-sheets | 豆皮

```yaml
id: tofu-sheets
type: ingredient
status: candidate
name_zh: 豆皮
name_en: Tofu Sheets
starter:
  visible: true
  section: egg-tofu
  order: 60
tags:
- supporting-only
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 作为 supporting ingredient 有明确菜单价值。
  tradeoffs:
  - 默认不承担 main-protein base；用途比核心主料窄。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 用户喜欢；作为 supporting ingredient。
```

### ingredient: dried-yuba-sticks | 腐竹

```yaml
id: dried-yuba-sticks
type: ingredient
status: candidate
name_zh: 腐竹
name_en: Dried Yuba Sticks
starter:
  visible: true
  section: egg-tofu
  order: 70
tags:
- supporting-only
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 作为 supporting ingredient 有明确菜单价值。
  tradeoffs:
  - 默认不承担 main-protein base；用途比核心主料窄。
  - 需要泡发，属于 advance-start ingredient。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 需要泡发；advance-start；作为 supporting ingredient。
```

### ingredient: fried-tofu-puffs | 油豆腐 / 豆泡

```yaml
id: fried-tofu-puffs
type: ingredient
status: candidate
name_zh: 油豆腐 / 豆泡
name_en: Fried Tofu Puffs
starter:
  visible: true
  section: egg-tofu
  order: 80
tags:
- supporting-only
- processed
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 作为 supporting ingredient 有明确菜单价值。
  tradeoffs:
  - 默认不承担 main-protein base；用途比核心主料窄。
  - 家庭喜欢但使用频率较低。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 用户很喜欢但低频；作为 supporting ingredient。
```


## 4.8 Leafy Vegetables

### ingredient: baby-napa-cabbage | 娃娃菜

```yaml
id: baby-napa-cabbage
type: ingredient
status: candidate
name_zh: 娃娃菜
name_en: Baby Napa Cabbage
starter:
  visible: true
  section: leafy-vegetable
  order: 10
tags:
- finish-wilt-compatible
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not
    explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
child_coverage:
  vegetable: unknown
```

### ingredient: napa-cabbage | 大白菜

```yaml
id: napa-cabbage
type: ingredient
status: candidate
name_zh: 大白菜
name_en: Napa Cabbage
starter:
  visible: true
  section: leafy-vegetable
  order: 20
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: chinese-greens | 青菜

```yaml
id: chinese-greens
type: ingredient
status: candidate
name_zh: 青菜
name_en: Chinese Greens
starter:
  visible: true
  section: leafy-vegetable
  order: 30
tags:
- finish-wilt-compatible
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not
    explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
child_coverage:
  vegetable: unknown
```

### ingredient: spinach | 菠菜

```yaml
id: spinach
type: ingredient
status: candidate
name_zh: 菠菜
name_en: Spinach
starter:
  visible: true
  section: leafy-vegetable
  order: 40
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: lettuce | 生菜

```yaml
id: lettuce
type: ingredient
status: candidate
name_zh: 生菜
name_en: Lettuce
starter:
  visible: true
  section: leafy-vegetable
  order: 50
tags:
- finish-wilt-compatible
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not
    explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
child_coverage:
  vegetable: unknown
```

### ingredient: youmai-cai | 油麦菜

```yaml
id: youmai-cai
type: ingredient
status: candidate
name_zh: 油麦菜
name_en: Youmai Cai
starter:
  visible: true
  section: leafy-vegetable
  order: 60
tags:
- finish-wilt-compatible
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not
    explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
child_coverage:
  vegetable: unknown
```

### ingredient: choy-sum | 菜心

```yaml
id: choy-sum
type: ingredient
status: candidate
name_zh: 菜心
name_en: Choy Sum
starter:
  visible: true
  section: leafy-vegetable
  order: 70
tags:
- finish-wilt-compatible
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not
    explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
child_coverage:
  vegetable: unknown
```

### ingredient: gai-lan | 芥兰

```yaml
id: gai-lan
type: ingredient
status: candidate
name_zh: 芥兰
name_en: Gai Lan
starter:
  visible: true
  section: leafy-vegetable
  order: 80
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not
    explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
child_coverage:
  vegetable: unknown
```

### ingredient: water-spinach | 空心菜

```yaml
id: water-spinach
type: ingredient
status: candidate
name_zh: 空心菜
name_en: Water Spinach
starter:
  visible: true
  section: leafy-vegetable
  order: 90
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: pea-shoots | 豆苗

```yaml
id: pea-shoots
type: ingredient
status: candidate
name_zh: 豆苗
name_en: Pea Shoots
starter:
  visible: true
  section: leafy-vegetable
  order: 100
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not
    explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
child_coverage:
  vegetable: unknown
```

### ingredient: amaranth-greens | 苋菜

```yaml
id: amaranth-greens
type: ingredient
status: candidate
name_zh: 苋菜
name_en: Amaranth Greens
starter:
  visible: true
  section: leafy-vegetable
  order: 110
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not
    explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
child_coverage:
  vegetable: unknown
```

### ingredient: tong-hao | 茼蒿

```yaml
id: tong-hao
type: ingredient
status: candidate
name_zh: 茼蒿
name_en: Tong Hao
starter:
  visible: true
  section: leafy-vegetable
  order: 120
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not
    explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
child_coverage:
  vegetable: unknown
```

### ingredient: mustard-greens | 芥菜

```yaml
id: mustard-greens
type: ingredient
status: candidate
name_zh: 芥菜
name_en: Mustard Greens
starter:
  visible: true
  section: leafy-vegetable
  order: 130
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: frozen-shepherds-purse | 冷冻荠菜末

```yaml
id: frozen-shepherds-purse
type: ingredient
status: candidate
name_zh: 冷冻荠菜末
name_en: Frozen Shepherd’s Purse
starter:
  visible: true
  section: leafy-vegetable
  order: 140
tags:
- frozen
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 只使用冷冻荠菜末；可临时解冻/直接进入家庭 workflow。
```


## 4.9 Other Vegetables

> 本 section 包含 cruciferous / gourd / fruiting / root-stem / beans-pods / strong-flavor vegetables；这些都是 Starter 中可勾选的非-pantry 食材。

### ingredient: broccoli | 西兰花

```yaml
id: broccoli
type: ingredient
status: candidate
name_zh: 西兰花
name_en: Broccoli
starter:
  visible: true
  section: other-vegetable
  order: 10
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: cauliflower | 花菜

```yaml
id: cauliflower
type: ingredient
status: candidate
name_zh: 花菜
name_en: Cauliflower
starter:
  visible: true
  section: other-vegetable
  order: 20
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: green-cabbage | 卷心菜

```yaml
id: green-cabbage
type: ingredient
status: candidate
name_zh: 卷心菜
name_en: Green Cabbage
starter:
  visible: true
  section: other-vegetable
  order: 30
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: winter-melon | 冬瓜

```yaml
id: winter-melon
type: ingredient
status: candidate
name_zh: 冬瓜
name_en: Winter Melon
starter:
  visible: true
  section: other-vegetable
  order: 40
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: luffa | 丝瓜

```yaml
id: luffa
type: ingredient
status: candidate
name_zh: 丝瓜
name_en: Luffa
starter:
  visible: true
  section: other-vegetable
  order: 50
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: zucchini | 西葫芦

```yaml
id: zucchini
type: ingredient
status: candidate
name_zh: 西葫芦
name_en: Zucchini
starter:
  visible: true
  section: other-vegetable
  order: 60
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: cucumber | 黄瓜

```yaml
id: cucumber
type: ingredient
status: candidate
name_zh: 黄瓜
name_en: Cucumber
starter:
  visible: true
  section: other-vegetable
  order: 70
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: bitter-melon | 苦瓜

```yaml
id: bitter-melon
type: ingredient
status: candidate
name_zh: 苦瓜
name_en: Bitter Melon
starter:
  visible: true
  section: other-vegetable
  order: 80
tags:
- low-priority
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 保留为可用候选，特定场景仍有价值。
  tradeoffs:
  - 用户已明确降低优先度或使用频率。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 用户已明确降为低优先度。
```

### ingredient: tomato | 番茄

```yaml
id: tomato
type: ingredient
status: candidate
name_zh: 番茄
name_en: Tomato
starter:
  visible: true
  section: other-vegetable
  order: 90
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: eggplant | 茄子

```yaml
id: eggplant
type: ingredient
status: candidate
name_zh: 茄子
name_en: Eggplant
starter:
  visible: true
  section: other-vegetable
  order: 100
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: bell-pepper | 甜椒

```yaml
id: bell-pepper
type: ingredient
status: candidate
name_zh: 甜椒
name_en: Bell Pepper
starter:
  visible: true
  section: other-vegetable
  order: 110
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: carrot | 胡萝卜

```yaml
id: carrot
type: ingredient
status: candidate
name_zh: 胡萝卜
name_en: Carrot
starter:
  visible: true
  section: other-vegetable
  order: 120
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: daikon | 白萝卜

```yaml
id: daikon
type: ingredient
status: candidate
name_zh: 白萝卜
name_en: Daikon
starter:
  visible: true
  section: other-vegetable
  order: 130
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: chinese-yam | 山药

```yaml
id: chinese-yam
type: ingredient
status: candidate
name_zh: 山药
name_en: Chinese Yam
starter:
  visible: true
  section: other-vegetable
  order: 140
tags:
- low-priority
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 保留为可用候选，特定场景仍有价值。
  tradeoffs:
  - 用户已明确降低优先度或使用频率。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 用户已明确降为低优先度；处理时容易刺激手部。
```

### ingredient: celtuce | 莴笋

```yaml
id: celtuce
type: ingredient
status: candidate
name_zh: 莴笋
name_en: Celtuce
starter:
  visible: true
  section: other-vegetable
  order: 150
tags:
- low-priority
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 保留为可用候选，特定场景仍有价值。
  tradeoffs:
  - 用户已明确降低优先度或使用频率。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 用户已明确降为低优先度；备菜较麻烦。
```

### ingredient: water-chestnuts | 马蹄

```yaml
id: water-chestnuts
type: ingredient
status: candidate
name_zh: 马蹄
name_en: Water Chestnuts
starter:
  visible: true
  section: other-vegetable
  order: 160
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: sugar-snap-peas | 甜豆

```yaml
id: sugar-snap-peas
type: ingredient
status: candidate
name_zh: 甜豆
name_en: Sugar Snap Peas
starter:
  visible: true
  section: other-vegetable
  order: 170
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: frozen-shelled-edamame | 冷冻去壳毛豆

```yaml
id: frozen-shelled-edamame
type: ingredient
status: candidate
name_zh: 冷冻去壳毛豆
name_en: Frozen Shelled Edamame
starter:
  visible: true
  section: other-vegetable
  order: 180
tags:
- frozen
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: frozen-green-peas | 冷冻青豆

```yaml
id: frozen-green-peas
type: ingredient
status: candidate
name_zh: 冷冻青豆
name_en: Frozen Green Peas
starter:
  visible: true
  section: other-vegetable
  order: 190
tags:
- frozen
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: yellow-chives | 韭黄

```yaml
id: yellow-chives
type: ingredient
status: candidate
name_zh: 韭黄
name_en: Yellow Chives
starter:
  visible: true
  section: other-vegetable
  order: 200
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 家庭购买通常是一包现成，备菜相对方便。
```

### ingredient: garlic-chives | 韭菜

```yaml
id: garlic-chives
type: ingredient
status: candidate
name_zh: 韭菜
name_en: Garlic Chives
starter:
  visible: true
  section: other-vegetable
  order: 210
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 可作为 Vegetable-slot 食材。
```

### ingredient: chinese-celery | 香芹

```yaml
id: chinese-celery
type: ingredient
status: candidate
name_zh: 香芹
name_en: Chinese Celery
starter:
  visible: true
  section: other-vegetable
  order: 220
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Strong-flavor vegetable；可占 Vegetable slot。
```

### ingredient: celery | 西芹

```yaml
id: celery
type: ingredient
status: candidate
name_zh: 西芹
name_en: Celery
starter:
  visible: true
  section: other-vegetable
  order: 230
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Strong-flavor vegetable；可占 Vegetable slot。
```

### ingredient: onion | 洋葱

```yaml
id: onion
type: ingredient
status: candidate
name_zh: 洋葱
name_en: Onion
starter:
  visible: true
  section: other-vegetable
  order: 240
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Strong-flavor vegetable；可占 Vegetable slot。
```

### ingredient: garlic-scapes | 蒜苔

```yaml
id: garlic-scapes
type: ingredient
status: candidate
name_zh: 蒜苔
name_en: Garlic Scapes
starter:
  visible: true
  section: other-vegetable
  order: 250
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 不算 pantry aromatic；可作为 Vegetable-slot 食材。
```


## 4.10 Mushrooms

### ingredient: king-oyster-mushrooms | 杏鲍菇

```yaml
id: king-oyster-mushrooms
type: ingredient
status: candidate
name_zh: 杏鲍菇
name_en: King Oyster Mushrooms
starter:
  visible: true
  section: mushroom
  order: 10
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: button-cremini-mushrooms | 口蘑 / Cremini

```yaml
id: button-cremini-mushrooms
type: ingredient
status: candidate
name_zh: 口蘑 / Cremini
name_en: Button / Cremini Mushrooms
starter:
  visible: true
  section: mushroom
  order: 20
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: fresh-shiitake | 鲜香菇

```yaml
id: fresh-shiitake
type: ingredient
status: candidate
name_zh: 鲜香菇
name_en: Fresh Shiitake
starter:
  visible: true
  section: mushroom
  order: 30
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: oyster-mushrooms | 平菇

```yaml
id: oyster-mushrooms
type: ingredient
status: candidate
name_zh: 平菇
name_en: Oyster Mushrooms
starter:
  visible: true
  section: mushroom
  order: 40
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: shimeji-mushrooms | 蟹味菇（Shimeji）

```yaml
id: shimeji-mushrooms
type: ingredient
status: candidate
name_zh: 蟹味菇（Shimeji）
name_en: Shimeji Mushrooms
starter:
  visible: true
  section: mushroom
  order: 50
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: enoki-mushrooms | 金针菇

```yaml
id: enoki-mushrooms
type: ingredient
status: candidate
name_zh: 金针菇
name_en: Enoki Mushrooms
starter:
  visible: true
  section: mushroom
  order: 60
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: maitake | 舞茸

```yaml
id: maitake
type: ingredient
status: candidate
name_zh: 舞茸
name_en: Maitake
starter:
  visible: true
  section: mushroom
  order: 70
tags:
- low-priority
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 保留为可用候选，特定场景仍有价值。
  tradeoffs:
  - 用户已明确降低优先度或使用频率。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 较贵，用户已明确降为低优先度。
```

### ingredient: fresh-wood-ear-mushrooms | 新鲜黑木耳

```yaml
id: fresh-wood-ear-mushrooms
type: ingredient
status: candidate
name_zh: 新鲜黑木耳
name_en: Fresh Wood Ear Mushrooms
starter:
  visible: true
  section: mushroom
  order: 80
tags:
- fresh-only
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 固定为新鲜黑木耳；不是干木耳，不计泡发时间。
```


## 4.11 Staples

> Project classification：potato / sweet potato / taro / lotus root / kabocha / corn 均是 Staple；Recipe 是否真正填满 Staple slot 由 `meal_contribution.staple` 决定。

### ingredient: rice | 米饭 / 大米

```yaml
id: rice
type: ingredient
status: candidate
name_zh: 米饭 / 大米
name_en: Rice
starter:
  visible: true
  section: staple
  order: 10
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: noodles | 面条

```yaml
id: noodles
type: ingredient
status: candidate
name_zh: 面条
name_en: Noodles
starter:
  visible: true
  section: staple
  order: 20
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: potato | 土豆

```yaml
id: potato
type: ingredient
status: candidate
name_zh: 土豆
name_en: Potato
starter:
  visible: true
  section: staple
  order: 30
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 项目分类为 Staple，不按 Vegetable slot 计算。
```

### ingredient: sweet-potato | 红薯

```yaml
id: sweet-potato
type: ingredient
status: candidate
name_zh: 红薯
name_en: Sweet Potato
starter:
  visible: true
  section: staple
  order: 40
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 项目分类为 Staple，不按 Vegetable slot 计算。
```

### ingredient: taro | 芋头

```yaml
id: taro
type: ingredient
status: candidate
name_zh: 芋头
name_en: Taro
starter:
  visible: true
  section: staple
  order: 50
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 项目分类为 Staple，不按 Vegetable slot 计算。
```

### ingredient: lotus-root | 莲藕

```yaml
id: lotus-root
type: ingredient
status: candidate
name_zh: 莲藕
name_en: Lotus Root
starter:
  visible: true
  section: staple
  order: 60
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 项目分类为 Staple，不按 Vegetable slot 计算。
```

### ingredient: kabocha-squash | 南瓜（Kabocha）

```yaml
id: kabocha-squash
type: ingredient
status: candidate
name_zh: 南瓜（Kabocha）
name_en: Kabocha Squash
starter:
  visible: true
  section: staple
  order: 70
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 项目分类为 Staple，不按 Vegetable slot 计算。
```

### ingredient: corn | 玉米

```yaml
id: corn
type: ingredient
status: candidate
name_zh: 玉米
name_en: Corn
starter:
  visible: true
  section: staple
  order: 80
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: 项目分类为 Staple，不按 Vegetable slot 计算。
```

### ingredient: bread | 面包

```yaml
id: bread
type: ingredient
status: candidate
name_zh: 面包
name_en: Bread
starter:
  visible: true
  section: staple
  order: 90
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: steamed-buns | 馒头

```yaml
id: steamed-buns
type: ingredient
status: candidate
name_zh: 馒头
name_en: Steamed Buns
starter:
  visible: true
  section: staple
  order: 100
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```

### ingredient: oats | 燕麦

```yaml
id: oats
type: ingredient
status: candidate
name_zh: 燕麦
name_en: Oats
starter:
  visible: true
  section: staple
  order: 110
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 已通过 Ingredient brainstorm 保留，适合作为长期可用候选。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: ''
```


## 4.12 Pantry Aromatics

> 姜、葱、蒜为 assumed pantry aromatics：保留稳定 Ingredient ID，但 `starter.visible: false`，Recipe 不要求用户逐项勾选。

### ingredient: ginger | 姜

```yaml
id: ginger
type: ingredient
status: candidate
name_zh: 姜
name_en: Ginger
starter:
  visible: false
  section: pantry
  order: 10
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 家庭常备 aromatic，可由 Recipe 直接假设存在。
  tradeoffs:
  - 不占 Meal Builder Ingredient slot，不在 Starter 中显示。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Pantry aromatic；不占 Vegetable slot，不需要在 Starter 中勾选。
```

### ingredient: scallion | 葱

```yaml
id: scallion
type: ingredient
status: candidate
name_zh: 葱
name_en: Scallion
starter:
  visible: false
  section: pantry
  order: 20
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 家庭常备 aromatic，可由 Recipe 直接假设存在。
  tradeoffs:
  - 不占 Meal Builder Ingredient slot，不在 Starter 中显示。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Pantry aromatic；不占 Vegetable slot，不需要在 Starter 中勾选。
```

### ingredient: garlic | 蒜

```yaml
id: garlic
type: ingredient
status: candidate
name_zh: 蒜
name_en: Garlic
starter:
  visible: false
  section: pantry
  order: 30
tags: []
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 家庭常备 aromatic，可由 Recipe 直接假设存在。
  tradeoffs:
  - 不占 Meal Builder Ingredient slot，不在 Starter 中显示。
evidence:
  level: user-confirmed
  checked_on: '2026-08-12'
  scope: Accepted Ingredient brainstorm + v1.4 Starter/UI migration; fit is conservative where priority was not explicit. No retailer, price, package-size, prep-minute, or new child-acceptance claim.
  sources:
  - Family Meal Ingredient brainstorm / retained candidate decisions
notes: Pantry aromatic；不占 Vegetable slot，不需要在 Starter 中勾选。
```

# 5. CANDIDATE RECIPE LIBRARY

> Total: 139. All records below remain `candidate`.
> All 139 records use Recipe schema v1.3 and are Meal-Builder-readable.
> Time fields are planning ranges unless explicitly marked user-confirmed. `detail_level` remains `discoverable` until a later Cook View formalization upgrades the record.

## 5.1 Pork (35)

### recipe: sweet-and-sour-pork-tenderloin | 糖醋里脊

```yaml
id: sweet-and-sour-pork-tenderloin
type: recipe
status: candidate
name_zh: 糖醋里脊
name_en: Pan-Seared Sweet-and-Sour Pork Tenderloin
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - User-confirmed household recipe/preference — non-deep-fried 糖醋里脊
notes: Household preference favors this dish. Household route is explicitly non-deep-fried. Observed household workflow is about 1 hour from starting prep to
  table.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- whole-pork-tenderloin
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 35–45 (workflow-derived)
meal_window_minutes: ~60 (user-confirmed)
elapsed_minutes: ~60 (user-confirmed)
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-pork-tenderloin
  role: main-protein
  availability: required
- pantry_core: sweet-sour vinegar/sugar/tomato-style glaze; light soy optional
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 whole-pork-tenderloin；准备 sweet-sour vinegar/sugar/tomato-style glaze; light soy optional。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: beijing-sauce-pork-strips | 京酱肉丝

```yaml
id: beijing-sauce-pork-strips
type: recipe
status: candidate
name_zh: 京酱肉丝
name_en: Beijing Sweet-Bean-Sauce Pork Strips
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - The Woks of Life — Shredded Pork Stir-Fry with Sweet Bean Sauce; plus user-confirmed household preference
notes: Household preference favors this dish; recipe need not contain a vegetable.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- whole-pork-tenderloin
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- steamed-buns
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-pork-tenderloin
  role: main-protein
  availability: required
- pantry_core: sweet bean sauce / light soy / sugar, used lightly
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 whole-pork-tenderloin；蔬菜为 无固定蔬菜。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：sweet bean sauce / light soy / sugar, used lightly；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: pressed-tofu-pork-strips | 香干肉丝

```yaml
id: pressed-tofu-pork-strips
type: recipe
status: candidate
name_zh: 香干肉丝
name_en: Shredded Pork with Pressed Tofu
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - The Woks of Life — Five Spice Tofu with Shredded Pork; plus user-confirmed household preference
notes: Household preference favors this dish. Pressed tofu is supporting protein, not the main category.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- whole-pork-tenderloin
supporting_protein_ingredient_ids:
- pressed-tofu
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-pork-tenderloin
  role: main-protein
  availability: required
- ingredient_id: pressed-tofu
  role: supporting-protein
  availability: required
- pantry_core: light soy / Shaoxing / ginger-garlic style stir-fry sauce
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 whole-pork-tenderloin；蔬菜为 无固定蔬菜。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：light soy / Shaoxing / ginger-garlic style stir-fry sauce；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: yellow-chives-pressed-tofu-pork-strips | 韭黄香干肉丝

```yaml
id: yellow-chives-pressed-tofu-pork-strips
type: recipe
status: candidate
name_zh: 韭黄香干肉丝
name_en: Pork and Pressed Tofu with Yellow Chives
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - 下厨房 — 韭黄香干肉丝; plus user-confirmed household preference
notes: Household preference favors this dish. Observed household workflow is 30–45 min.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- whole-pork-tenderloin
supporting_protein_ingredient_ids:
- pressed-tofu
vegetable_ingredient_ids:
- yellow-chives
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–30 (workflow-derived)
meal_window_minutes: 30–45 (user-confirmed)
elapsed_minutes: 30–45 (user-confirmed)
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-pork-tenderloin
  role: main-protein
  availability: required
- ingredient_id: pressed-tofu
  role: supporting-protein
  availability: required
- ingredient_id: yellow-chives
  role: vegetable
  availability: required
- pantry_core: light soy / Shaoxing / ginger style
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 whole-pork-tenderloin；蔬菜为 yellow-chives。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：light soy / Shaoxing / ginger style；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: mushroom-pork-slices-stir-fry | 蘑菇片炒肉片

```yaml
id: mushroom-pork-slices-stir-fry
type: recipe
status: candidate
name_zh: 蘑菇片炒肉片
name_en: Mushroom and Pork Slice Stir-fry
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - User-confirmed household pattern — mushroom pork slices stir-fry
notes: Explicit household addition; observed household workflow is 30–45 min.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- whole-pork-tenderloin
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- button-cremini-mushrooms
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–30 (workflow-derived)
meal_window_minutes: 30–45 (user-confirmed)
elapsed_minutes: 30–45 (user-confirmed)
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-pork-tenderloin
  role: main-protein
  availability: required
- ingredient_id: button-cremini-mushrooms
  role: vegetable
  availability: required
- pantry_core: light soy / ginger / optional oyster sauce
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 whole-pork-tenderloin；蔬菜为 button-cremini-mushrooms。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：light soy / ginger / optional oyster sauce；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: moo-shu-pork | 木须肉

```yaml
id: moo-shu-pork
type: recipe
status: candidate
name_zh: 木须肉
name_en: Moo Shu Pork
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- family-shared
- two-vegetable-ready
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - 'The Woks of Life — Moo Shu Pork: The Authentic Chinese Recipe'
notes: Uses fresh wood ear; no soaking time.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- whole-pork-tenderloin
supporting_protein_ingredient_ids:
- eggs
vegetable_ingredient_ids:
- cucumber
- fresh-wood-ear-mushrooms
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-pork-tenderloin
  role: main-protein
  availability: required
- ingredient_id: eggs
  role: supporting-protein
  availability: required
- ingredient_id: cucumber
  role: vegetable
  availability: required
- ingredient_id: fresh-wood-ear-mushrooms
  role: vegetable
  availability: required
- pantry_core: light soy / Shaoxing / sesame-oil-style finish
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 whole-pork-tenderloin；蔬菜为 cucumber, fresh-wood-ear-mushrooms。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：light soy / Shaoxing / sesame-oil-style finish；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: japanese-ginger-pork-shogayaki | 日式姜烧猪肉

```yaml
id: japanese-ginger-pork-shogayaki
type: recipe
status: candidate
name_zh: 日式姜烧猪肉
name_en: Japanese Ginger Pork (Shogayaki)
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Ginger Pork (Shogayaki)
notes: Whole tenderloin can be sliced thin at home; canonical sliced cut is not a rejection criterion.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- whole-pork-tenderloin
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-pork-tenderloin
  role: main-protein
  availability: required
- pantry_core: ginger / soy / mirin-style sauce, light household salt
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 whole-pork-tenderloin；准备 ginger / soy / mirin-style sauce, light household salt。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: guo-ta-pork-tenderloin | 锅塌里脊

```yaml
id: guo-ta-pork-tenderloin
type: recipe
status: candidate
name_zh: 锅塌里脊
name_en: Guo Ta Pork Tenderloin
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - 豆果美食 / 下厨房 — 天津锅塌里脊 / 锅塌里脊
notes: Household has not made this yet; timing remains source/workflow-derived.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- whole-pork-tenderloin
supporting_protein_ingredient_ids:
- eggs
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-pork-tenderloin
  role: main-protein
  availability: required
- ingredient_id: eggs
  role: supporting-protein
  availability: required
- pantry_core: egg coating + light savory finishing liquid
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 whole-pork-tenderloin；准备 egg coating + light savory finishing liquid。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: shepherds-purse-ground-pork-stir-fry | 荠菜炒肉末

```yaml
id: shepherds-purse-ground-pork-stir-fry
type: recipe
status: candidate
name_zh: 荠菜炒肉末
name_en: Shepherd’s Purse with Ground Pork
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - User-confirmed household pattern — ground pork + Chinese greens
notes: User explicitly called this “很棒”; frozen minced shepherd’s purse can be used without advance thawing when practical.
  Observed household workflow is about 20 min.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- ground-pork
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- frozen-shepherds-purse
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 12–18 (workflow-derived)
meal_window_minutes: ~20 (user-confirmed)
elapsed_minutes: ~20 (user-confirmed)
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-pork
  role: main-protein
  availability: required
- ingredient_id: frozen-shepherds-purse
  role: vegetable
  availability: required
- pantry_core: ginger / light soy / minimal oil
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 ground-pork；蔬菜为 frozen-shepherds-purse。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：ginger / light soy / minimal oil；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: jiang-ding-ground-pork-pressed-tofu | 酱丁

```yaml
id: jiang-ding-ground-pork-pressed-tofu
type: recipe
status: candidate
name_zh: 酱丁
name_en: Jiang Ding — Ground Pork with Diced Pressed Tofu
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - User-confirmed household pattern — 酱丁 (ground pork + pressed tofu)
notes: Explicit household addition. Pressed tofu remains supporting protein.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- ground-pork
supporting_protein_ingredient_ids:
- pressed-tofu
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- noodles
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-pork
  role: main-protein
  availability: required
- ingredient_id: pressed-tofu
  role: supporting-protein
  availability: required
- pantry_core: savory bean/soy-style sauce, kept non-spicy and light
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 ground-pork；蔬菜为 无固定蔬菜。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：savory bean/soy-style sauce, kept non-spicy and light；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: ground-pork-chinese-greens-stir-fry | 猪肉末炒青菜

```yaml
id: ground-pork-chinese-greens-stir-fry
type: recipe
status: candidate
name_zh: 猪肉末炒青菜
name_en: Ground Pork with Chinese Greens
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - User-confirmed household pattern — ground pork + Chinese greens
notes: Explicit household addition and a genuine household cooking pattern; vegetable can use compatible leafy greens via
  substitutions.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- ground-pork
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- chinese-greens
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 1
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids:
- rice
recommended_staple_ingredient_ids: []
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
- separately cooked rice
burner_plan: High-output burner for the wok; rice is treated as an already-cooked or separately cooked staple.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-pork
  role: main-protein
  availability: required
- ingredient_id: chinese-greens
  role: vegetable
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- pantry_core: ginger / garlic / light soy
  role: seasoning
  availability: assumed
steps:
- 先准备白米饭；炒菜时将米饭保温备用。
- 按菜式需要处理 ground-pork；蔬菜为 chinese-greens。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：ginger / garlic / light soy；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: minced-pork-tofu | 肉末豆腐

```yaml
id: minced-pork-tofu
type: recipe
status: candidate
name_zh: 肉末豆腐
name_en: Ground Pork with Soft Tofu
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - Made With Lau — Mapo Tofu with Pork; used only to verify ground-pork + soft-tofu structure, with chili/bean-sauce identity
    not carried into household 肉末豆腐
notes: Main category remains pork; soft tofu is supporting protein. This is a mild household adaptation, not Mapo Tofu.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- ground-pork
supporting_protein_ingredient_ids:
- soft-tofu
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-pork
  role: main-protein
  availability: required
- ingredient_id: soft-tofu
  role: supporting-protein
  availability: required
- pantry_core: light soy / oyster-sauce-style savory sauce; no chili/bean-chili paste in base
  role: seasoning
  availability: assumed
steps:
- 处理 ground-pork；按来源决定是否需要焯水或轻煎。
- 加入 light soy / oyster-sauce-style savory sauce; no chili/bean-chili paste in base 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: clear-braised-lions-head-meatballs | 清炖狮子头

```yaml
id: clear-braised-lions-head-meatballs
type: recipe
status: candidate
name_zh: 清炖狮子头
name_en: Clear-Braised Lion’s Head Meatballs
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Lion’s Head Meatballs; 下厨房 — 清炖狮子头
notes: Clear-braised route avoids deep-frying; Chinese greens optional but compatible.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- ground-pork
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- water-chestnuts
- chinese-greens
meal_contribution:
  protein: 1
  vegetable: 0.5
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-pork
  role: main-protein
  availability: required
- ingredient_id: water-chestnuts
  role: vegetable
  availability: required
- ingredient_id: chinese-greens
  role: vegetable
  availability: required
- pantry_core: ginger / scallion / light soy or clear broth
  role: seasoning
  availability: assumed
steps:
- 处理 ground-pork；按来源决定是否需要焯水或轻煎。
- 加入 ginger / scallion / light soy or clear broth 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: water-chestnut-steamed-pork-patty | 马蹄蒸肉饼

```yaml
id: water-chestnut-steamed-pork-patty
type: recipe
status: candidate
name_zh: 马蹄蒸肉饼
name_en: Steamed Pork Patty with Water Chestnut
tags:
- light-seasoning
- non-spicy-base
- steamed
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Bon Appétit — Chinese Steamed Pork Patty
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- ground-pork
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- water-chestnuts
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- covered steamer / heatproof plate
burner_plan: Medium burner for covered steaming; high-output burner remains available.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-pork
  role: main-protein
  availability: required
- ingredient_id: water-chestnuts
  role: vegetable
  availability: required
- pantry_core: light soy / ginger / sesame-oil-style seasoning
  role: seasoning
  availability: assumed
steps:
- 处理 ground-pork；搭配 water-chestnuts；按来源用 light soy / ginger / sesame-oil-style seasoning 做短腌或铺料。
- 水开后上锅蒸；厚度/骨量变化时以实际熟度为准，不把来源分钟机械套用到不同切法。
- 出锅后按需要加入葱姜等清淡收尾；避免额外淋大量热油。
- 孩子份先去骨/剪小/确认没有硬壳或筋膜，再加成人后味。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: minced-pork-steamed-eggs | 肉末蒸蛋

```yaml
id: minced-pork-steamed-eggs
type: recipe
status: candidate
name_zh: 肉末蒸蛋
name_en: Steamed Egg with Minced Pork
tags:
- light-seasoning
- non-spicy-base
- steamed
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - PBS Food / Made With Lau — Chinese Steamed Eggs with Minced Pork
notes: Main category is pork per finalized classification rule.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- ground-pork
supporting_protein_ingredient_ids:
- eggs
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- covered steamer / heatproof plate
burner_plan: Medium burner for covered steaming; high-output burner remains available.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-pork
  role: main-protein
  availability: required
- ingredient_id: eggs
  role: supporting-protein
  availability: required
- pantry_core: light soy / scallion optional
  role: seasoning
  availability: assumed
steps:
- 处理 ground-pork；搭配 无固定蔬菜；按来源用 light soy / scallion optional 做短腌或铺料。
- 水开后上锅蒸；厚度/骨量变化时以实际熟度为准，不把来源分钟机械套用到不同切法。
- 出锅后按需要加入葱姜等清淡收尾；避免额外淋大量热油。
- 孩子份先去骨/剪小/确认没有硬壳或筋膜，再加成人后味。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: winter-melon-pork-meatball-soup | 冬瓜丸子汤

```yaml
id: winter-melon-pork-meatball-soup
type: recipe
status: candidate
name_zh: 冬瓜丸子汤
name_en: Winter Melon Pork Meatball Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Chinese Winter Melon Soup with Meatballs
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- ground-pork
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- winter-melon
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-pork
  role: main-protein
  availability: required
- ingredient_id: winter-melon
  role: vegetable
  availability: required
- pantry_core: ginger / scallion / clear light broth
  role: seasoning
  availability: assumed
steps:
- 处理 ground-pork；蔬菜/主食配料为 winter-melon。骨肉汤按来源需要先焯洗。
- 加水与 ginger / scallion / clear light broth 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: taiwanese-braised-minced-pork-rice | 台式肉燥饭

```yaml
id: taiwanese-braised-minced-pork-rice
type: recipe
status: candidate
name_zh: 台式肉燥饭
name_en: Taiwanese Braised Minced Pork Rice
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Taiwanese Braised Minced Pork (肉燥饭)
notes: Rice is carried by the recipe. Use fresh shiitake or a no-dried-mushroom version; do not add dried shiitake soaking
  burden.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- ground-pork
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- fresh-shiitake
meal_contribution:
  protein: 0.5
  vegetable: 0
  staple: 1
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids:
- rice
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- nonstick pan
- separately cooked rice
burner_plan: Medium burner for topping; rice is treated as an already-cooked or separately cooked staple.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-pork
  role: main-protein
  availability: required
- ingredient_id: fresh-shiitake
  role: vegetable
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- pantry_core: soy / shallot-or-scallion / five-spice style braising profile, light household salt
  role: seasoning
  availability: assumed
steps:
- 先准备米饭；处理 ground-pork 与 fresh-shiitake。
- 用小锅/不粘锅按 soy / shallot-or-scallion / five-spice style braising profile, light household salt 做成浇头，保持清淡并控制汁量。
- 把浇头连同适量汁放在米饭上；含蛋的版本保持适合家庭的熟度。
- 孩子份优先选择软嫩主料并剪小，成人后味分开。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: low-oil-ground-pork-eggplant | 少油肉末茄子

```yaml
id: low-oil-ground-pork-eggplant
type: recipe
status: candidate
name_zh: 少油肉末茄子
name_en: Low-Oil Ground Pork Eggplant
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - 下厨房 — 少油版肉末茄子
notes: Household route deliberately avoids deep-frying and heavy oil.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- ground-pork
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- eggplant
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-pork
  role: main-protein
  availability: required
- ingredient_id: eggplant
  role: vegetable
  availability: required
- pantry_core: garlic / light soy / small amount savory sauce, no chili
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 ground-pork；蔬菜为 eggplant。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：garlic / light soy / small amount savory sauce, no chili；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: cantonese-char-siu | 叉烧

```yaml
id: cantonese-char-siu
type: recipe
status: candidate
name_zh: 叉烧
name_en: Cantonese Char Siu
tags:
- light-seasoning
- non-spicy-base
- roasted
- oven
- advance-start
- child-support-protein
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 主烹调设备可释放灶口。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Char Siu (Chinese BBQ Pork)
notes: Shoulder can be cut into long pieces; advance marination lowers spontaneity.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- pork-shoulder-chunks
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- noodles
active_minutes: 15–25
meal_window_minutes: 15–25
elapsed_minutes: 45–75 + marination
advance_start_required: true
equipment:
- gas oven
- sheet pan / baking dish
burner_plan: Oven carries the main cooking load and frees both stovetop burners.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: pork-shoulder-chunks
  role: main-protein
  availability: required
- pantry_core: char-siu sweet-savory glaze; household version lighter and not aggressively salty
  role: seasoning
  availability: assumed
steps:
- 处理 pork-shoulder-chunks，准备 char-siu sweet-savory glaze; household version lighter and not aggressively salty；需要腌制的菜提前完成。
- 烤箱预热；食材单层放置，使用少量油或烘焙纸/烤架降低粘连。
- 按引用来源的厚度与熟度逻辑烤制；家庭实际切法不同则以熟度为准。
- 出炉后静置/拆骨/切小；成人酱汁或辣味在孩子份盛出后再加。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: hong-shao-rou | 红烧肉

```yaml
id: hong-shao-rou
type: recipe
status: candidate
name_zh: 红烧肉
name_en: Red-Braised Pork
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Shanghai-Style Braised Pork Belly (Hong Shao Rou)
notes: Canonical belly is not required; household large pork pieces may be used when texture remains appropriate.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- pork-shoulder-chunks
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- steamed-buns
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: pork-shoulder-chunks
  role: main-protein
  availability: required
- pantry_core: soy / sugar / ginger-scallion red-braise profile
  role: seasoning
  availability: assumed
steps:
- 处理 pork-shoulder-chunks；按来源决定是否需要焯水或轻煎。
- 加入 soy / sugar / ginger-scallion red-braise profile 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the
  dish does not benefit from it.
substitutions: []
meal_addons:
- id: finish-with-leafy-vegetable
  accepts_ingredient_tag: finish-wilt-compatible
  meal_contribution:
    protein: 0
    vegetable: 1
    staple: 0
  child_coverage:
    protein: false
    vegetable: ingredient-dependent
  notes: 仅在铁锅/炒锅末段已有收汁/焖烧窗口时加入兼容嫩叶菜；不另起锅。
```

### recipe: japanese-kakuni | 日式角煮

```yaml
id: japanese-kakuni
type: recipe
status: candidate
name_zh: 日式角煮
name_en: Japanese Kakuni
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Kakuni (Braised Pork Belly)
notes: Long cook; cut adaptation documented.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- pork-shoulder-chunks
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- noodles
- steamed-buns
active_minutes: 25–40
meal_window_minutes: 25–40
elapsed_minutes: 180–300
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: pork-shoulder-chunks
  role: main-protein
  availability: required
- pantry_core: soy / sake / mirin / ginger braise
  role: seasoning
  availability: assumed
steps:
- 处理 pork-shoulder-chunks；按来源决定是否需要焯水或轻煎。
- 加入 soy / sake / mirin / ginger braise 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: vietnamese-thit-kho-eggs | 越南 Thịt Kho 猪肉卤蛋

```yaml
id: vietnamese-thit-kho-eggs
type: recipe
status: candidate
name_zh: 越南 Thịt Kho 猪肉卤蛋
name_en: Vietnamese Thịt Kho with Eggs
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Vietnamese Thịt Kho references — pork + eggs + coconut-water/fish-sauce caramel braise
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- pork-shoulder-chunks
supporting_protein_ingredient_ids:
- eggs
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: pork-shoulder-chunks
  role: main-protein
  availability: required
- ingredient_id: eggs
  role: supporting-protein
  availability: required
- pantry_core: coconut-water / fish-sauce / caramelized-sugar braise, salt kept light
  role: seasoning
  availability: assumed
steps:
- 处理 pork-shoulder-chunks；按来源决定是否需要焯水或轻煎。
- 加入 coconut-water / fish-sauce / caramelized-sugar braise, salt kept light 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: filipino-pork-adobo | Filipino Pork Adobo

```yaml
id: filipino-pork-adobo
type: recipe
status: candidate
name_zh: Filipino Pork Adobo
name_en: Filipino Pork Adobo
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Filipino Pork Adobo references — vinegar/soy/garlic braise
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- pork-shoulder-chunks
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: pork-shoulder-chunks
  role: main-protein
  availability: required
- pantry_core: vinegar / soy / garlic / bay leaf
  role: seasoning
  availability: assumed
steps:
- 处理 pork-shoulder-chunks；按来源决定是否需要焯水或轻煎。
- 加入 vinegar / soy / garlic / bay leaf 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: mille-feuille-nabe-pork-napa | 白菜猪肉千层锅

```yaml
id: mille-feuille-nabe-pork-napa
type: recipe
status: candidate
name_zh: 白菜猪肉千层锅
name_en: Pork and Napa Mille-Feuille Nabe
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Mille-Feuille Nabe
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- thin-sliced-pork-belly
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- napa-cabbage
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- noodles
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: thin-sliced-pork-belly
  role: main-protein
  availability: required
- ingredient_id: napa-cabbage
  role: vegetable
  availability: required
- pantry_core: dashi / light soy / ginger or ponzu-at-table
  role: seasoning
  availability: assumed
steps:
- 处理 thin-sliced-pork-belly；按来源决定是否需要焯水或轻煎。
- 加入 dashi / light soy / ginger or ponzu-at-table 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: shanghai-sweet-sour-ribs | 糖醋排骨

```yaml
id: shanghai-sweet-sour-ribs
type: recipe
status: candidate
name_zh: 糖醋排骨
name_en: Shanghai Sweet-and-Sour Ribs
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Shanghai Sweet and Sour Ribs
notes: Household has a preferred Instant Pot-then-wok route in another chat; this library record keeps the dish
  identity and non-fried rule.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- soft-pork-ribs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: soft-pork-ribs
  role: main-protein
  availability: required
- pantry_core: vinegar / sugar / soy sweet-sour braise; no deep-frying
  role: seasoning
  availability: assumed
steps:
- 处理 soft-pork-ribs；按来源决定是否需要焯水或轻煎。
- 加入 vinegar / sugar / soy sweet-sour braise; no deep-frying 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the
  dish does not benefit from it.
substitutions: []
meal_addons:
- id: finish-with-leafy-vegetable
  accepts_ingredient_tag: finish-wilt-compatible
  meal_contribution:
    protein: 0
    vegetable: 1
    staple: 0
  child_coverage:
    protein: false
    vegetable: ingredient-dependent
  notes: 仅在铁锅/炒锅末段已有收汁/焖烧窗口时加入兼容嫩叶菜；不另起锅。
```

### recipe: steamed-ribs-black-bean | 豉汁蒸排骨

```yaml
id: steamed-ribs-black-bean
type: recipe
status: candidate
name_zh: 豉汁蒸排骨
name_en: Steamed Ribs with Black Bean Sauce
tags:
- light-seasoning
- non-spicy-base
- steamed
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Dim Sum Steamed Spare Ribs with Black Beans
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- soft-pork-ribs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- covered steamer / heatproof plate
burner_plan: Medium burner for covered steaming; high-output burner remains available.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: soft-pork-ribs
  role: main-protein
  availability: required
- pantry_core: fermented black bean / garlic / light soy
  role: seasoning
  availability: assumed
steps:
- 处理 soft-pork-ribs；搭配 无固定蔬菜；按来源用 fermented black bean / garlic / light soy 做短腌或铺料。
- 水开后上锅蒸；厚度/骨量变化时以实际熟度为准，不把来源分钟机械套用到不同切法。
- 出锅后按需要加入葱姜等清淡收尾；避免额外淋大量热油。
- 孩子份先去骨/剪小/确认没有硬壳或筋膜，再加成人后味。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: winter-melon-pork-rib-soup | 冬瓜排骨汤

```yaml
id: winter-melon-pork-rib-soup
type: recipe
status: candidate
name_zh: 冬瓜排骨汤
name_en: Winter Melon Pork Rib Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Winter Melon Soup with Pork Ribs
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- soft-pork-ribs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- winter-melon
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: soft-pork-ribs
  role: main-protein
  availability: required
- ingredient_id: winter-melon
  role: vegetable
  availability: required
- pantry_core: ginger / clear broth / light salt
  role: seasoning
  availability: assumed
steps:
- 处理 soft-pork-ribs；蔬菜/主食配料为 winter-melon。骨肉汤按来源需要先焯洗。
- 加水与 ginger / clear broth / light salt 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: lotus-root-pork-rib-soup | 莲藕排骨汤

```yaml
id: lotus-root-pork-rib-soup
type: recipe
status: candidate
name_zh: 莲藕排骨汤
name_en: Lotus Root Pork Rib Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Lotus Root & Pork Soup
notes: Lotus root is classified as staple in this project; do not automatically add a full rice portion.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- soft-pork-ribs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 1
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids:
- lotus-root
recommended_staple_ingredient_ids: []
active_minutes: 25–40
meal_window_minutes: 25–40
elapsed_minutes: 180–300
advance_start_required: true
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: soft-pork-ribs
  role: main-protein
  availability: required
- ingredient_id: lotus-root
  role: integral-staple
  availability: required
- pantry_core: ginger / clear broth / light salt
  role: seasoning
  availability: assumed
steps:
- 处理 soft-pork-ribs；蔬菜/主食配料为 lotus-root。骨肉汤按来源需要先焯洗。
- 加水与 ginger / clear broth / light salt 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: daikon-pork-rib-soup | 白萝卜排骨汤

```yaml
id: daikon-pork-rib-soup
type: recipe
status: candidate
name_zh: 白萝卜排骨汤
name_en: Daikon Pork Rib Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Reputable Chinese home-cooking references — daikon pork rib soup
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- soft-pork-ribs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- daikon
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: soft-pork-ribs
  role: main-protein
  availability: required
- ingredient_id: daikon
  role: vegetable
  availability: required
- pantry_core: ginger / clear broth / light salt
  role: seasoning
  availability: assumed
steps:
- 处理 soft-pork-ribs；蔬菜/主食配料为 daikon。骨肉汤按来源需要先焯洗。
- 加水与 ginger / clear broth / light salt 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: corn-carrot-pork-rib-soup | 玉米胡萝卜排骨汤

```yaml
id: corn-carrot-pork-rib-soup
type: recipe
status: candidate
name_zh: 玉米胡萝卜排骨汤
name_en: Corn-Carrot Pork Rib Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Chinese pork-bone soup / rib-soup patterns with tomato, potato and corn
notes: Corn is a staple in this project; carrot counts as vegetable.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- soft-pork-ribs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- carrot
meal_contribution:
  protein: 1
  vegetable: 0.5
  staple: 1
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids:
- corn
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: soft-pork-ribs
  role: main-protein
  availability: required
- ingredient_id: corn
  role: integral-staple
  availability: required
- ingredient_id: carrot
  role: vegetable
  availability: required
- pantry_core: ginger / clear broth / light salt
  role: seasoning
  availability: assumed
steps:
- 处理 soft-pork-ribs；蔬菜/主食配料为 corn, carrot。骨肉汤按来源需要先焯洗。
- 加水与 ginger / clear broth / light salt 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: tomato-potato-pork-rib-soup | 番茄土豆排骨汤

```yaml
id: tomato-potato-pork-rib-soup
type: recipe
status: candidate
name_zh: 番茄土豆排骨汤
name_en: Tomato-Potato Pork Rib Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Chinese pork-bone soup / rib-soup patterns with tomato, potato and corn
notes: Potato is the staple carried in the recipe.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- soft-pork-ribs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- tomato
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 1
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids:
- potato
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: soft-pork-ribs
  role: main-protein
  availability: required
- ingredient_id: tomato
  role: vegetable
  availability: required
- ingredient_id: potato
  role: integral-staple
  availability: required
- pantry_core: ginger / tomato-based clear-savory broth
  role: seasoning
  availability: assumed
steps:
- 处理 soft-pork-ribs；蔬菜/主食配料为 tomato, potato。骨肉汤按来源需要先焯洗。
- 加水与 ginger / tomato-based clear-savory broth 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: chinese-yam-pork-rib-soup | 山药排骨汤

```yaml
id: chinese-yam-pork-rib-soup
type: recipe
status: candidate
name_zh: 山药排骨汤
name_en: Chinese Yam Pork Rib Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
  - 已在 brainstorm 中标为低优先度/低频。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Cantonese pork soup with carrot / Chinese yam pattern
notes: Low priority because yam preparation is unpleasant for the household.
primary_role: mixed
main_protein_category: pork
main_protein_ingredient_ids:
- soft-pork-ribs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- chinese-yam
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: soft-pork-ribs
  role: main-protein
  availability: required
- ingredient_id: chinese-yam
  role: vegetable
  availability: required
- pantry_core: ginger / clear broth / light salt
  role: seasoning
  availability: assumed
steps:
- 处理 soft-pork-ribs；蔬菜/主食配料为 chinese-yam。骨肉汤按来源需要先焯洗。
- 加水与 ginger / clear broth / light salt 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: shanghai-braised-pork-chops | 上海葱烤大排

```yaml
id: shanghai-braised-pork-chops
type: recipe
status: candidate
name_zh: 上海葱烤大排
name_en: Shanghai Scallion-Braised Pork Chops
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- lunch-45
- child-support-protein
fit:
  hard_rules: pass
  score: 3
  strengths: []
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Braised Pork Chops, Shanghai-style
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- pork-chops
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- noodles
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: pork-chops
  role: main-protein
  availability: required
- pantry_core: scallion / light soy / mild sweet-savory braising liquid
  role: seasoning
  availability: assumed
steps:
- 处理 pork-chops；按来源决定是否需要焯水或轻煎。
- 加入 scallion / light soy / mild sweet-savory braising liquid 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: red-braised-pork-trotters | 红烧猪蹄

```yaml
id: red-braised-pork-trotters
type: recipe
status: candidate
name_zh: 红烧猪蹄
name_en: Red-Braised Pork Trotters
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - Omnivore’s Cookbook — Chinese Braised Pork Trotters
notes: User confirms child can eat pork feet; long cook but low active time.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- pork-feet
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 25–40
meal_window_minutes: 25–40
elapsed_minutes: 180–300
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: pork-feet
  role: main-protein
  availability: required
- pantry_core: soy / ginger / mild sweet-savory red braise
  role: seasoning
  availability: assumed
steps:
- 处理 pork-feet；按来源决定是否需要焯水或轻煎。
- 加入 soy / ginger / mild sweet-savory red braise 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: cantonese-pork-feet-ginger-vinegar | 猪脚姜

```yaml
id: cantonese-pork-feet-ginger-vinegar
type: recipe
status: candidate
name_zh: 猪脚姜
name_en: Cantonese Pork Feet with Ginger and Vinegar
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- child-support-protein
fit:
  hard_rules: pass
  score: 3
  strengths: []
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Cantonese Pork Knuckles with Ginger and Vinegar
notes: Strong sweet-vinegar/ginger identity makes this lower-frequency for the household.
primary_role: protein
main_protein_category: pork
main_protein_ingredient_ids:
- pork-feet
supporting_protein_ingredient_ids:
- eggs
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 25–40
meal_window_minutes: 25–40
elapsed_minutes: 180–300
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: pork-feet
  role: main-protein
  availability: required
- ingredient_id: eggs
  role: supporting-protein
  availability: required
- pantry_core: ginger / sweet black vinegar / egg braise
  role: seasoning
  availability: assumed
steps:
- 处理 pork-feet；按来源决定是否需要焯水或轻煎。
- 加入 ginger / sweet black vinegar / egg braise 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

## 5.2 Chicken (23)

### recipe: chicken-teriyaki-thighs | 照烧鸡腿

```yaml
id: chicken-teriyaki-thighs
type: recipe
status: candidate
name_zh: 照烧鸡腿
name_en: Chicken Teriyaki Thighs
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Chicken Teriyaki
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather
  than invented.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- boneless-skinless-chicken-thighs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of
  the dish.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: boneless-skinless-chicken-thighs
  role: main-protein
  availability: required
- pantry_core: soy / mirin / sugar teriyaki glaze, light household ratio
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 boneless-skinless-chicken-thighs；准备 soy / mirin / sugar teriyaki glaze, light household ratio。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the
  dish does not benefit from it.
substitutions: []
meal_addons:
- id: finish-with-leafy-vegetable
  accepts_ingredient_tag: finish-wilt-compatible
  meal_contribution:
    protein: 0
    vegetable: 1
    staple: 0
  child_coverage:
    protein: false
    vegetable: ingredient-dependent
  notes: 仅在铁锅/炒锅末段已有收汁/焖烧窗口时加入兼容嫩叶菜；不另起锅。
```

### recipe: oyakodon | 亲子丼

```yaml
id: oyakodon
type: recipe
status: candidate
name_zh: 亲子丼
name_en: Oyakodon Chicken and Egg Rice Bowl
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Oyakodon (Chicken and Egg Bowl)
notes: Rice is carried in the recipe; onion counts as vegetable.
primary_role: mixed
main_protein_category: chicken
main_protein_ingredient_ids:
- boneless-skinless-chicken-thighs
supporting_protein_ingredient_ids:
- eggs
vegetable_ingredient_ids:
- onion
meal_contribution:
  protein: 1
  vegetable: 0.5
  staple: 1
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids:
- rice
recommended_staple_ingredient_ids: []
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- nonstick pan
- separately cooked rice
burner_plan: Medium burner for topping; rice is treated as an already-cooked or separately cooked staple.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: boneless-skinless-chicken-thighs
  role: main-protein
  availability: required
- ingredient_id: eggs
  role: supporting-protein
  availability: required
- ingredient_id: onion
  role: vegetable
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- pantry_core: dashi / soy / mirin / lightly sweet sauce
  role: seasoning
  availability: assumed
steps:
- 先准备米饭；处理 boneless-skinless-chicken-thighs 与 onion。
- 用小锅/不粘锅按 dashi / soy / mirin / lightly sweet sauce 做成浇头，保持清淡并控制汁量。
- 把浇头连同适量汁放在米饭上；含蛋的版本保持适合家庭的熟度。
- 孩子份优先选择软嫩主料并剪小，成人后味分开。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: chicken-broccoli-stir-fry | 西兰花炒鸡片

```yaml
id: chicken-broccoli-stir-fry
type: recipe
status: candidate
name_zh: 西兰花炒鸡片
name_en: Chicken and Broccoli Stir-fry
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau — Chicken & Broccoli Stir-fry
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: chicken
main_protein_ingredient_ids:
- chicken-breast
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- broccoli
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: chicken-breast
  role: main-protein
  availability: required
- ingredient_id: broccoli
  role: vegetable
  availability: required
- pantry_core: ginger / garlic / light oyster-soy style sauce
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 chicken-breast；蔬菜为 broccoli。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：ginger / garlic / light oyster-soy style sauce；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: chicken-mushroom-stir-fry | 蘑菇炒鸡片

```yaml
id: chicken-mushroom-stir-fry
type: recipe
status: candidate
name_zh: 蘑菇炒鸡片
name_en: Chicken and Mushroom Stir-fry
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Moo Goo Gai Pan / Chicken with Chinese Broccoli & Mushrooms (chicken-mushroom stir-fry structure)
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: chicken
main_protein_ingredient_ids:
- chicken-breast
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- button-cremini-mushrooms
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: chicken-breast
  role: main-protein
  availability: required
- ingredient_id: button-cremini-mushrooms
  role: vegetable
  availability: required
- pantry_core: ginger / light soy / optional oyster sauce
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 chicken-breast；蔬菜为 button-cremini-mushrooms。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：ginger / light soy / optional oyster sauce；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: chicken-garlic-chives-stir-fry | 韭菜炒鸡片

```yaml
id: chicken-garlic-chives-stir-fry
type: recipe
status: candidate
name_zh: 韭菜炒鸡片
name_en: Chicken with Garlic Chives
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - Made With Lau — Chicken & Broccoli Stir-fry
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: chicken
main_protein_ingredient_ids:
- chicken-breast
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- garlic-chives
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: chicken-breast
  role: main-protein
  availability: required
- ingredient_id: garlic-chives
  role: vegetable
  availability: required
- pantry_core: ginger / light soy / small amount sesame oil
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 chicken-breast；蔬菜为 garlic-chives。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：ginger / light soy / small amount sesame oil；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: butter-shoyu-chicken | Butter Shoyu Chicken

```yaml
id: butter-shoyu-chicken
type: recipe
status: candidate
name_zh: Butter Shoyu Chicken
name_en: Butter Shoyu Chicken
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Butter Shoyu Chicken
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- boneless-skinless-chicken-thighs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: boneless-skinless-chicken-thighs
  role: main-protein
  availability: required
- pantry_core: butter + soy sauce; household uses modest butter/soy
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 boneless-skinless-chicken-thighs；准备 butter + soy sauce; household uses modest butter/soy。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: scallion-ginger-soy-chicken-breast | 葱姜酱油鸡胸

```yaml
id: scallion-ginger-soy-chicken-breast
type: recipe
status: candidate
name_zh: 葱姜酱油鸡胸
name_en: Scallion-Ginger Soy Chicken Breast
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - Made With Lau — Easy Pan-Fried Chicken Breast
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- chicken-breast
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: chicken-breast
  role: main-protein
  availability: required
- pantry_core: scallion / ginger / light soy
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 chicken-breast；准备 scallion / ginger / light soy。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: simple-pan-seared-chicken-breast | 简单嫩煎鸡胸

```yaml
id: simple-pan-seared-chicken-breast
type: recipe
status: candidate
name_zh: 简单嫩煎鸡胸
name_en: Simple Tender Pan-Seared Chicken Breast
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau — Easy Pan-Fried Chicken Breast
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- chicken-breast
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- bread
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: chicken-breast
  role: main-protein
  availability: required
- pantry_core: salt-light simple seasoning; optional soy-butter or pan juice finish
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 chicken-breast；准备 salt-light simple seasoning; optional soy-butter or pan juice finish。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: instant-pot-soy-chicken-thighs | Instant Pot 酱油鸡腿

```yaml
id: instant-pot-soy-chicken-thighs
type: recipe
status: candidate
name_zh: Instant Pot 酱油鸡腿
name_en: Instant Pot Soy Chicken Thighs
tags:
- light-seasoning
- non-spicy-base
- instant-pot
- low-active-time
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 主烹调设备可释放灶口。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Instant Pot official chicken-thigh pressure-cooking recipes; household soy route adaptation
notes: Exact household pressure/release/liquid parameters remain recipe-test data, not a reason to block the record.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- bone-in-chicken-thighs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- 9-quart Instant Pot
burner_plan: Instant Pot carries the main cooking load and frees both burners.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: bone-in-chicken-thighs
  role: main-protein
  availability: required
- pantry_core: soy / ginger / scallion mild braising liquid
  role: seasoning
  availability: assumed
steps:
- 将 bone-in-chicken-thighs 与 soy / ginger / scallion mild braising liquid 放入 9-qt Instant Pot 下层；液体至少满足设备正常起压要求，但不在未验证时写死家庭水量。
- 本家庭常用肉类压力段约 10–15 分钟作为工作模式；具体菜首次执行时按食材厚度与可靠来源校正，不把该范围当统一强制参数。
- 放压方式按具体菜与当日流程选择并记录到测试备注；未测试前不宣称某一种 release 为家庭标准。
- 开盖确认熟度，必要时用 sauté 收汁/调味；孩子份先盛出。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: instant-pot-thirteen-spice-soy-party-wings | Instant Pot 十三香酱油 Party Wings

```yaml
id: instant-pot-thirteen-spice-soy-party-wings
type: recipe
status: candidate
name_zh: Instant Pot 十三香酱油 Party Wings
name_en: Instant Pot Thirteen-Spice Soy Party Wings
tags:
- light-seasoning
- non-spicy-base
- instant-pot
- low-active-time
- lunch-45
- family-shared
- pot-in-pot
- one-pot
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 主烹调设备可释放灶口。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - Household-confirmed Instant Pot Party Wings pattern; current user update 2026-08-11
notes: Household commonly cooks meat below and rice in an elevated upper bowl; pressure segment is commonly around 10–15 min.
  Exact release/liquid/rice ratio remains recipe-specific.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- party-wings
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- 9-quart Instant Pot
burner_plan: Instant Pot carries the main cooking load and frees both burners.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: party-wings
  role: main-protein
  availability: required
- pantry_core: thirteen-spice + soy-style light braising liquid
  role: seasoning
  availability: assumed
steps:
- 将 party-wings 与 thirteen-spice + soy-style light braising liquid 放入 9-qt Instant Pot 下层；液体至少满足设备正常起压要求，但不在未验证时写死家庭水量。
- 本家庭常用肉类压力段约 10–15 分钟作为工作模式；具体菜首次执行时按食材厚度与可靠来源校正，不把该范围当统一强制参数。
- 放压方式按具体菜与当日流程选择并记录到测试备注；未测试前不宣称某一种 release 为家庭标准。
- 开盖确认熟度，必要时用 sauté 收汁/调味；孩子份先盛出。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: oyster-sauce-braised-chicken | 蚝油焖鸡腿 / 鸡小腿

```yaml
id: oyster-sauce-braised-chicken
type: recipe
status: candidate
name_zh: 蚝油焖鸡腿 / 鸡小腿
name_en: Oyster-Sauce Braised Chicken Thighs or Drumsticks
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Oyster Sauce Chicken
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather
  than invented.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- chicken-drumsticks
- bone-in-chicken-thighs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - chicken-drumsticks
  - bone-in-chicken-thighs
  role: main-protein
  availability: required
- pantry_core: oyster sauce / soy / ginger-scallion, diluted for light salt
  role: seasoning
  availability: assumed
steps:
- 处理 chicken-drumsticks, bone-in-chicken-thighs；按来源决定是否需要焯水或轻煎。
- 加入 oyster sauce / soy / ginger-scallion, diluted for light salt 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the
  dish does not benefit from it.
substitutions: []
meal_addons:
- id: finish-with-leafy-vegetable
  accepts_ingredient_tag: finish-wilt-compatible
  meal_contribution:
    protein: 0
    vegetable: 1
    staple: 0
  child_coverage:
    protein: false
    vegetable: ingredient-dependent
  notes: 仅在铁锅/炒锅末段已有收汁/焖烧窗口时加入兼容嫩叶菜；不另起锅。
```

### recipe: chicken-adobo | Chicken Adobo

```yaml
id: chicken-adobo
type: recipe
status: candidate
name_zh: Chicken Adobo
name_en: Filipino Chicken Adobo
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - RecipeTin Eats — Filipino Chicken Adobo
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- bone-in-chicken-thighs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: bone-in-chicken-thighs
  role: main-protein
  availability: required
- pantry_core: vinegar / soy / garlic / bay leaf
  role: seasoning
  availability: assumed
steps:
- 处理 bone-in-chicken-thighs；按来源决定是否需要焯水或轻煎。
- 加入 vinegar / soy / garlic / bay leaf 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: honey-soy-baked-wings-drumsticks | 蜂蜜酱油烤鸡翅 / 鸡小腿

```yaml
id: honey-soy-baked-wings-drumsticks
type: recipe
status: candidate
name_zh: 蜂蜜酱油烤鸡翅 / 鸡小腿
name_en: Honey-Soy Baked Wings or Drumsticks
tags:
- light-seasoning
- non-spicy-base
- roasted
- oven
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 主烹调设备可释放灶口。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — baked chicken wings
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- whole-chicken-wings
- chicken-drumsticks
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 15–25
elapsed_minutes: 45–75
advance_start_required: false
equipment:
- gas oven
- sheet pan / baking dish
burner_plan: Oven carries the main cooking load and frees both stovetop burners.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - whole-chicken-wings
  - chicken-drumsticks
  role: main-protein
  availability: required
- pantry_core: honey / soy / garlic glaze, light household salt
  role: seasoning
  availability: assumed
steps:
- 处理 whole-chicken-wings, chicken-drumsticks，准备 honey / soy / garlic glaze, light household salt；需要腌制的菜提前完成。
- 烤箱预热；食材单层放置，使用少量油或烘焙纸/烤架降低粘连。
- 按引用来源的厚度与熟度逻辑烤制；家庭实际切法不同则以熟度为准。
- 出炉后静置/拆骨/切小；成人酱汁或辣味在孩子份盛出后再加。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: baked-chicken-katsu | Baked Chicken Katsu

```yaml
id: baked-chicken-katsu
type: recipe
status: candidate
name_zh: Baked Chicken Katsu
name_en: Baked Chicken Katsu
tags:
- light-seasoning
- non-spicy-base
- roasted
- oven
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 主烹调设备可释放灶口。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Baked Chicken Katsu
notes: Baked route preserves katsu identity without violating the no-deep-fry rule.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- chicken-breast
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 15–25
elapsed_minutes: 45–75
advance_start_required: false
equipment:
- gas oven
- sheet pan / baking dish
burner_plan: Oven carries the main cooking load and frees both stovetop burners.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: chicken-breast
  role: main-protein
  availability: required
- pantry_core: panko coating baked rather than deep-fried; tonkatsu sauce optional at table
  role: seasoning
  availability: assumed
steps:
- 处理 chicken-breast，准备 panko coating baked rather than deep-fried; tonkatsu sauce optional at table；需要腌制的菜提前完成。
- 烤箱预热；食材单层放置，使用少量油或烘焙纸/烤架降低粘连。
- 按引用来源的厚度与熟度逻辑烤制；家庭实际切法不同则以熟度为准。
- 出炉后静置/拆骨/切小；成人酱汁或辣味在孩子份盛出后再加。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: air-fryer-chicken-thighs | Air-Fryer Chicken Thighs

```yaml
id: air-fryer-chicken-thighs
type: recipe
status: candidate
name_zh: Air-Fryer Chicken Thighs
name_en: Air-Fryer Chicken Thighs
tags:
- light-seasoning
- non-spicy-base
- air-fryer
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 主烹调设备可释放灶口。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Serious Eats — Air-Fryer Chicken Thighs (editors’ air-fryer recipe collection)
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- boneless-skinless-chicken-thighs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- small air fryer
burner_plan: Air fryer carries the main cooking load and frees both stovetop burners.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: boneless-skinless-chicken-thighs
  role: main-protein
  availability: required
- pantry_core: simple soy/garlic or salt-light seasoning
  role: seasoning
  availability: assumed
steps:
- 处理 boneless-skinless-chicken-thighs，薄油并用 simple soy/garlic or salt-light seasoning 轻调味。
- 食材尽量单层放入小空气炸锅；批量过大时分批。
- 中途检查并视需要翻面；以实际熟度为准。
- 孩子份去皮/去骨或剪小；成人后味另加。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: steamed-chicken-shiitake-fresh-wood-ear | 鲜香菇新鲜黑木耳蒸滑鸡

```yaml
id: steamed-chicken-shiitake-fresh-wood-ear
type: recipe
status: candidate
name_zh: 鲜香菇新鲜黑木耳蒸滑鸡
name_en: Steamed Chicken with Fresh Shiitake and Fresh Wood Ear
tags:
- light-seasoning
- non-spicy-base
- steamed
- stovetop-nonstick
- lunch-45
- family-shared
- two-vegetable-ready
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life / Made With Lau — steamed chicken with mushrooms; fresh wood-ear substitution per household handoff
notes: Uses fresh wood ear; no soaking.
primary_role: mixed
main_protein_category: chicken
main_protein_ingredient_ids:
- boneless-skinless-chicken-thighs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- fresh-shiitake
- fresh-wood-ear-mushrooms
meal_contribution:
  protein: 1
  vegetable: 0.5
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- covered steamer / heatproof plate
burner_plan: Medium burner for covered steaming; high-output burner remains available.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: boneless-skinless-chicken-thighs
  role: main-protein
  availability: required
- ingredient_id: fresh-shiitake
  role: vegetable
  availability: required
- ingredient_id: fresh-wood-ear-mushrooms
  role: vegetable
  availability: required
- pantry_core: ginger / light soy / cornstarch-style velvet marinade
  role: seasoning
  availability: assumed
steps:
- 处理 boneless-skinless-chicken-thighs；搭配 fresh-shiitake, fresh-wood-ear-mushrooms；按来源用 ginger / light soy / cornstarch-style
  velvet marinade 做短腌或铺料。
- 水开后上锅蒸；厚度/骨量变化时以实际熟度为准，不把来源分钟机械套用到不同切法。
- 出锅后按需要加入葱姜等清淡收尾；避免额外淋大量热油。
- 孩子份先去骨/剪小/确认没有硬壳或筋膜，再加成人后味。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: steamed-chicken-chinese-sausage | 香肠蒸鸡

```yaml
id: steamed-chicken-chinese-sausage
type: recipe
status: candidate
name_zh: 香肠蒸鸡
name_en: Steamed Chicken with Chinese Sausage
tags:
- light-seasoning
- non-spicy-base
- steamed
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau — steamed chicken with mushroom and Chinese sausage
notes: Chinese sausage is supporting protein/processed flavoring, not main category.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- boneless-skinless-chicken-thighs
supporting_protein_ingredient_ids:
- chinese-sausage
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- covered steamer / heatproof plate
burner_plan: Medium burner for covered steaming; high-output burner remains available.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: boneless-skinless-chicken-thighs
  role: main-protein
  availability: required
- ingredient_id: chinese-sausage
  role: supporting-protein
  availability: required
- pantry_core: ginger / light soy; sausage used sparingly for flavor
  role: seasoning
  availability: assumed
steps:
- 处理 boneless-skinless-chicken-thighs；搭配 无固定蔬菜；按来源用 ginger / light soy; sausage used sparingly for flavor 做短腌或铺料。
- 水开后上锅蒸；厚度/骨量变化时以实际熟度为准，不把来源分钟机械套用到不同切法。
- 出锅后按需要加入葱姜等清淡收尾；避免额外淋大量热油。
- 孩子份先去骨/剪小/确认没有硬壳或筋膜，再加成人后味。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: chicken-shiitake-udon-soup | 鸡肉鲜香菇乌冬汤

```yaml
id: chicken-shiitake-udon-soup
type: recipe
status: candidate
name_zh: 鸡肉鲜香菇乌冬汤
name_en: Chicken and Fresh Shiitake Udon Soup
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Chicken & Shiitake Udon Noodle Soup
notes: Noodles are carried in the recipe.
primary_role: mixed
main_protein_category: chicken
main_protein_ingredient_ids:
- chicken-breast
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- fresh-shiitake
meal_contribution:
  protein: 1
  vegetable: 0.5
  staple: 1
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids:
- noodles
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- pot
- wok/nonstick pan if stir-fried
burner_plan: Pot on medium burner; use high-output wok only if the recipe is a stir-fried noodle.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: chicken-breast
  role: main-protein
  availability: required
- ingredient_id: fresh-shiitake
  role: vegetable
  availability: required
- ingredient_id: noodles
  role: integral-staple
  availability: required
- pantry_core: light chicken/dashi-style broth / soy
  role: seasoning
  availability: assumed
steps:
- 处理 chicken-breast 与 fresh-shiitake；准备 light chicken/dashi-style broth / soy。
- 面条按种类煮至合适熟度并沥水；汤面则保留单独汤底。
- 炒面在高输出灶口快速合炒；汤面则把主料/蔬菜在汤中依次煮熟。
- 最后合并并调整清淡盐度；成人辣味另加。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: coca-cola-chicken-wings | 可乐鸡翅

```yaml
id: coca-cola-chicken-wings
type: recipe
status: candidate
name_zh: 可乐鸡翅
name_en: Coca-Cola Chicken Wings
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Coca-Cola Chicken Wings
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather
  than invented.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- whole-chicken-wings
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-chicken-wings
  role: main-protein
  availability: required
- pantry_core: cola + soy braising glaze, household version restrained in sweetness/salt
  role: seasoning
  availability: assumed
steps:
- 处理 whole-chicken-wings；按来源决定是否需要焯水或轻煎。
- 加入 cola + soy braising glaze, household version restrained in sweetness/salt 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the
  dish does not benefit from it.
substitutions: []
meal_addons:
- id: finish-with-leafy-vegetable
  accepts_ingredient_tag: finish-wilt-compatible
  meal_contribution:
    protein: 0
    vegetable: 1
    staple: 0
  child_coverage:
    protein: false
    vegetable: ingredient-dependent
  notes: 仅在铁锅/炒锅末段已有收汁/焖烧窗口时加入兼容嫩叶菜；不另起锅。
```

### recipe: hong-kong-swiss-chicken-wings | 瑞士鸡翼

```yaml
id: hong-kong-swiss-chicken-wings
type: recipe
status: candidate
name_zh: 瑞士鸡翼
name_en: Hong Kong Swiss Chicken Wings
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Christine’s Recipes / Hong Kong home-cooking references — Swiss Chicken Wings
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather
  than invented.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- whole-chicken-wings
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-chicken-wings
  role: main-protein
  availability: required
- pantry_core: sweet soy / ginger / aromatic braising liquid, kept light
  role: seasoning
  availability: assumed
steps:
- 处理 whole-chicken-wings；按来源决定是否需要焯水或轻煎。
- 加入 sweet soy / ginger / aromatic braising liquid, kept light 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the
  dish does not benefit from it.
substitutions: []
meal_addons:
- id: finish-with-leafy-vegetable
  accepts_ingredient_tag: finish-wilt-compatible
  meal_contribution:
    protein: 0
    vegetable: 1
    staple: 0
  child_coverage:
    protein: false
    vegetable: ingredient-dependent
  notes: 仅在铁锅/炒锅末段已有收汁/焖烧窗口时加入兼容嫩叶菜；不另起锅。
```

### recipe: white-cut-chicken | 白切鸡

```yaml
id: white-cut-chicken
type: recipe
status: candidate
name_zh: 白切鸡
name_en: Cantonese White Cut Chicken
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau — White Cut Chicken
notes: Whole-chicken planned/lower-frequency route; homemade roast chicken remains excluded.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- whole-chicken
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 60–120
advance_start_required: true
equipment:
- large pot
burner_plan: Large pot on medium/high burner during heat-up, then gentle cooking/steeping.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-chicken
  role: main-protein
  availability: required
- pantry_core: ginger-scallion dipping sauce served separately
  role: seasoning
  availability: assumed
steps:
- 整鸡清理后按 ginger-scallion dipping sauce served separately 的传统路线入锅；保持整鸡结构。
- 控制水温/火力让鸡均匀熟透；来源使用浸煮/焖浸时保留这一结构。
- 确认最厚部位熟透后取出并静置；需要的酱油/葱姜汁另做。
- 成人负责斩件、去骨；孩子份只给无骨软肉并剪小。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: cantonese-soy-sauce-chicken | 豉油鸡

```yaml
id: cantonese-soy-sauce-chicken
type: recipe
status: candidate
name_zh: 豉油鸡
name_en: Cantonese Soy Sauce Chicken
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau — Soy Sauce Chicken
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: chicken
main_protein_ingredient_ids:
- whole-chicken
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 60–120
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-chicken
  role: main-protein
  availability: required
- pantry_core: soy / ginger / scallion aromatic braising liquid, diluted for household salt
  role: seasoning
  availability: assumed
steps:
- 处理 whole-chicken；按来源决定是否需要焯水或轻煎。
- 加入 soy / ginger / scallion aromatic braising liquid, diluted for household salt 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: hainanese-chicken-rice | 海南鸡饭

```yaml
id: hainanese-chicken-rice
type: recipe
status: candidate
name_zh: 海南鸡饭
name_en: Hainanese Chicken Rice
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Hainan Chicken and Rice
notes: Rice is carried in the recipe; lower-frequency because whole-chicken workflow is larger.
primary_role: mixed
main_protein_category: chicken
main_protein_ingredient_ids:
- whole-chicken
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- cucumber
meal_contribution:
  protein: 1
  vegetable: 0.5
  staple: 1
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids:
- rice
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 60–120
advance_start_required: true
equipment:
- large pot
burner_plan: Large pot on medium/high burner during heat-up, then gentle cooking/steeping.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: whole-chicken
  role: main-protein
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- ingredient_id: cucumber
  role: vegetable
  availability: required
- pantry_core: poached chicken + ginger-scallion sauces + chicken-flavored rice
  role: seasoning
  availability: assumed
steps:
- 整鸡清理后按 poached chicken + ginger-scallion sauces + chicken-flavored rice 的传统路线入锅；保持整鸡结构。
- 控制水温/火力让鸡均匀熟透；来源使用浸煮/焖浸时保留这一结构。
- 确认最厚部位熟透后取出并静置；需要的酱油/葱姜汁另做。
- 用鸡汤/鸡油风味液按引用来源另煮米饭；具体米水比按家庭常用米和锅具校准，不在未测试时写死。
- 成人负责斩件、去骨；孩子份只给无骨软肉并剪小。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

## 5.3 Beef (26)

### recipe: mushroom-beef-stir-fry | 口蘑炒牛肉

```yaml
id: mushroom-beef-stir-fry
type: recipe
status: candidate
name_zh: 口蘑炒牛肉
name_en: Mushroom Beef Stir-fry
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Beef & Mushroom Stir-fry
notes: Uses sliced-beef-brisket; canonical stir-fry steak cuts are optional substitutions, not new Ingredient dependencies.
  Child support recommended because quick-cooked beef slices may be chewy.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- sliced-beef-brisket
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- button-cremini-mushrooms
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: sliced-beef-brisket
  role: main-protein
  availability: required
- ingredient_id: button-cremini-mushrooms
  role: vegetable
  availability: required
- pantry_core: ginger / light soy / oyster-sauce style
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 sliced-beef-brisket；蔬菜为 button-cremini-mushrooms。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：ginger / light soy / oyster-sauce style；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: tomato-beef-stir-fry | 番茄炒牛肉

```yaml
id: tomato-beef-stir-fry
type: recipe
status: candidate
name_zh: 番茄炒牛肉
name_en: Tomato Beef Stir-fry
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Beef Tomato Stir-fry
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- sliced-beef-brisket
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- tomato
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: sliced-beef-brisket
  role: main-protein
  availability: required
- ingredient_id: tomato
  role: vegetable
  availability: required
- pantry_core: tomato / ginger / light soy / mild sweet-savory sauce
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 sliced-beef-brisket；蔬菜为 tomato。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：tomato / ginger / light soy / mild sweet-savory sauce；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: beef-broccoli-stir-fry | 西兰花牛肉

```yaml
id: beef-broccoli-stir-fry
type: recipe
status: candidate
name_zh: 西兰花牛肉
name_en: Beef and Broccoli
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Beef & Broccoli
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- sliced-beef-brisket
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- broccoli
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: sliced-beef-brisket
  role: main-protein
  availability: required
- ingredient_id: broccoli
  role: vegetable
  availability: required
- pantry_core: ginger / garlic / oyster-soy style sauce
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 sliced-beef-brisket；蔬菜为 broccoli。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：ginger / garlic / oyster-soy style sauce；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: beef-gai-lan-stir-fry | 芥兰牛肉

```yaml
id: beef-gai-lan-stir-fry
type: recipe
status: candidate
name_zh: 芥兰牛肉
name_en: Beef with Gai Lan
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Beef with Chinese Broccoli (Gai Lan)
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- sliced-beef-brisket
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- gai-lan
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: sliced-beef-brisket
  role: main-protein
  availability: required
- ingredient_id: gai-lan
  role: vegetable
  availability: required
- pantry_core: ginger / oyster sauce / light soy
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 sliced-beef-brisket；蔬菜为 gai-lan。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：ginger / oyster sauce / light soy；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: scallion-beef-stir-fry | 葱爆牛肉

```yaml
id: scallion-beef-stir-fry
type: recipe
status: candidate
name_zh: 葱爆牛肉
name_en: Scallion Beef Stir-fry
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Scallion Beef
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: beef
main_protein_ingredient_ids:
- sliced-beef-brisket
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: sliced-beef-brisket
  role: main-protein
  availability: required
- pantry_core: scallion / light soy / Shaoxing-style sauce
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 sliced-beef-brisket；蔬菜为 无固定蔬菜。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：scallion / light soy / Shaoxing-style sauce；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: oyster-sauce-beef-stir-fry | 蚝油牛肉

```yaml
id: oyster-sauce-beef-stir-fry
type: recipe
status: candidate
name_zh: 蚝油牛肉
name_en: Oyster Sauce Beef
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Oyster Sauce Beef
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: beef
main_protein_ingredient_ids:
- sliced-beef-brisket
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: sliced-beef-brisket
  role: main-protein
  availability: required
- pantry_core: oyster sauce / ginger / light soy, diluted to household salt
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 sliced-beef-brisket；蔬菜为 无固定蔬菜。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：oyster sauce / ginger / light soy, diluted to household salt；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: cumin-beef | 孜然牛肉

```yaml
id: cumin-beef
type: recipe
status: candidate
name_zh: 孜然牛肉
name_en: Cumin Beef
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- child-support-protein
- adult-finish-separate
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - Omnivore’s Cookbook — Cumin Beef; household adaptation omits chili from base
notes: Cumin is the defining flavor; source chili is optionalized to adult finish rather than kept in the family base.
primary_role: protein
main_protein_category: beef
main_protein_ingredient_ids:
- sliced-beef-brisket
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: sliced-beef-brisket
  role: main-protein
  availability: required
- pantry_core: cumin / garlic / optional coriander; chili omitted from base
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 sliced-beef-brisket；蔬菜为 无固定蔬菜。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：cumin / garlic / optional coriander; chili omitted from base；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: ground-beef-chinese-greens-stir-fry | 牛肉末炒青菜

```yaml
id: ground-beef-chinese-greens-stir-fry
type: recipe
status: candidate
name_zh: 牛肉末炒青菜
name_en: Ground Beef with Chinese Greens
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - User-retained household pattern — ground beef + Chinese greens
notes: Explicit retained Beef household addition.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- ground-beef
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- chinese-greens
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-beef
  role: main-protein
  availability: required
- ingredient_id: chinese-greens
  role: vegetable
  availability: required
- pantry_core: ginger / garlic / light soy
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 ground-beef；蔬菜为 chinese-greens。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：ginger / garlic / light soy；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: gyudon | 牛丼

```yaml
id: gyudon
type: recipe
status: candidate
name_zh: 牛丼
name_en: Gyudon Beef Rice Bowl
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Gyudon
notes: Rice is carried in the recipe; thin beef is tenderer but child support remains prudent unless household experience
  says otherwise.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- hot-pot-beef-slices
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- onion
meal_contribution:
  protein: 1
  vegetable: 0.5
  staple: 1
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids:
- rice
recommended_staple_ingredient_ids: []
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- nonstick pan
- separately cooked rice
burner_plan: Medium burner for topping; rice is treated as an already-cooked or separately cooked staple.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: hot-pot-beef-slices
  role: main-protein
  availability: required
- ingredient_id: onion
  role: vegetable
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- pantry_core: dashi / soy / mirin / mild sweetness
  role: seasoning
  availability: assumed
steps:
- 先准备米饭；处理 hot-pot-beef-slices 与 onion。
- 用小锅/不粘锅按 dashi / soy / mirin / mild sweetness 做成浇头，保持清淡并控制汁量。
- 把浇头连同适量汁放在米饭上；含蛋的版本保持适合家庭的熟度。
- 孩子份优先选择软嫩主料并剪小，成人后味分开。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: niku-udon | 肉乌冬

```yaml
id: niku-udon
type: recipe
status: candidate
name_zh: 肉乌冬
name_en: Niku Udon
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Niku Udon
notes: Noodles are carried in the recipe.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- hot-pot-beef-slices
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- onion
meal_contribution:
  protein: 1
  vegetable: 0.5
  staple: 1
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids:
- noodles
recommended_staple_ingredient_ids: []
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- pot
- wok/nonstick pan if stir-fried
burner_plan: Pot on medium burner; use high-output wok only if the recipe is a stir-fried noodle.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: hot-pot-beef-slices
  role: main-protein
  availability: required
- ingredient_id: onion
  role: vegetable
  availability: required
- ingredient_id: noodles
  role: integral-staple
  availability: required
- pantry_core: dashi / soy / mirin-style broth
  role: seasoning
  availability: assumed
steps:
- 处理 hot-pot-beef-slices 与 onion；准备 dashi / soy / mirin-style broth。
- 面条按种类煮至合适熟度并沥水；汤面则保留单独汤底。
- 炒面在高输出灶口快速合炒；汤面则把主料/蔬菜在汤中依次煮熟。
- 最后合并并调整清淡盐度；成人辣味另加。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: tomato-fatty-beef-soup | 番茄肥牛汤

```yaml
id: tomato-fatty-beef-soup
type: recipe
status: candidate
name_zh: 番茄肥牛汤
name_en: Tomato Thin-Beef Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Tomato Hot Pot with Beef; used for tomato + thin-beef soup structure
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- hot-pot-beef-slices
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- tomato
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: hot-pot-beef-slices
  role: main-protein
  availability: required
- ingredient_id: tomato
  role: vegetable
  availability: required
- pantry_core: tomato / ginger / light savory broth
  role: seasoning
  availability: assumed
steps:
- 处理 hot-pot-beef-slices；蔬菜/主食配料为 tomato。骨肉汤按来源需要先焯洗。
- 加水与 tomato / ginger / light savory broth 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: sukiyaki-don | 寿喜烧丼

```yaml
id: sukiyaki-don
type: recipe
status: candidate
name_zh: 寿喜烧丼
name_en: Sukiyaki Don
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Sukiyaki Don
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- hot-pot-beef-slices
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- onion
meal_contribution:
  protein: 1
  vegetable: 0.5
  staple: 1
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids:
- rice
recommended_staple_ingredient_ids: []
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- nonstick pan
- separately cooked rice
burner_plan: Medium burner for topping; rice is treated as an already-cooked or separately cooked staple.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: hot-pot-beef-slices
  role: main-protein
  availability: required
- ingredient_id: onion
  role: vegetable
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- pantry_core: sukiyaki-style soy / mirin / sugar sauce, lightened
  role: seasoning
  availability: assumed
steps:
- 先准备米饭；处理 hot-pot-beef-slices 与 onion。
- 用小锅/不粘锅按 sukiyaki-style soy / mirin / sugar sauce, lightened 做成浇头，保持清淡并控制汁量。
- 把浇头连同适量汁放在米饭上；含蛋的版本保持适合家庭的熟度。
- 孩子份优先选择软嫩主料并剪小，成人后味分开。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: nikujaga | 肉じゃが

```yaml
id: nikujaga
type: recipe
status: candidate
name_zh: 肉じゃが
name_en: Nikujaga
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- lunch-45
- family-shared
- two-vegetable-ready
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Nikujaga
notes: Potato is the staple carried in the recipe; onion/carrot count as vegetables.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- hot-pot-beef-slices
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- onion
- carrot
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 1
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids:
- potato
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: hot-pot-beef-slices
  role: main-protein
  availability: required
- ingredient_id: potato
  role: integral-staple
  availability: required
- ingredient_id: onion
  role: vegetable
  availability: required
- ingredient_id: carrot
  role: vegetable
  availability: required
- pantry_core: dashi / soy / mirin / sugar
  role: seasoning
  availability: assumed
steps:
- 处理 hot-pot-beef-slices；按来源决定是否需要焯水或轻煎。
- 加入 dashi / soy / mirin / sugar 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: steamed-beef-rice-with-egg | 窝蛋牛肉饭

```yaml
id: steamed-beef-rice-with-egg
type: recipe
status: candidate
name_zh: 窝蛋牛肉饭
name_en: Steamed Minced Beef Rice with Egg
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau — Minced Beef with Rice / 窝蛋免治牛肉飯
notes: Main category remains beef; rice carried in recipe.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- ground-beef
supporting_protein_ingredient_ids:
- eggs
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 1
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids:
- rice
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- nonstick pan
- separately cooked rice
burner_plan: Medium burner for topping; rice is treated as an already-cooked or separately cooked staple.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-beef
  role: main-protein
  availability: required
- ingredient_id: eggs
  role: supporting-protein
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- pantry_core: light soy / oyster-sauce style minced-beef seasoning + egg
  role: seasoning
  availability: assumed
steps:
- 先准备米饭；处理 ground-beef 与 无固定蔬菜。
- 用小锅/不粘锅按 light soy / oyster-sauce style minced-beef seasoning + egg 做成浇头，保持清淡并控制汁量。
- 把浇头连同适量汁放在米饭上；含蛋的版本保持适合家庭的熟度。
- 孩子份优先选择软嫩主料并剪小，成人后味分开。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: japanese-hamburg-steak | 日式汉堡排

```yaml
id: japanese-hamburg-steak
type: recipe
status: candidate
name_zh: 日式汉堡排
name_en: Japanese Hambagu
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Hambagu / Wafu Hambagu
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: beef
main_protein_ingredient_ids:
- ground-beef
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- onion
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- bread
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: ground-beef
  role: main-protein
  availability: required
- ingredient_id: onion
  role: vegetable
  availability: required
- pantry_core: onion + mild savory sauce; choose lighter wafu finish when useful
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 ground-beef；准备 onion + mild savory sauce; choose lighter wafu finish when useful。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: frozen-beef-patty-burger | Frozen Beef Patty Burger

```yaml
id: frozen-beef-patty-burger
type: recipe
status: candidate
name_zh: Frozen Beef Patty Burger
name_en: Frozen Beef Patty Burger
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - Common frozen beef patty burger household technique; candidate convenience pattern
notes: Convenience pattern; bread is carried as staple.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- frozen-beef-patties
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 1
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids:
- bread
recommended_staple_ingredient_ids: []
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: frozen-beef-patties
  role: main-protein
  availability: required
- ingredient_id: bread
  role: integral-staple
  availability: required
- pantry_core: simple burger seasoning; condiments added individually
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 frozen-beef-patties；准备 simple burger seasoning; condiments added individually。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: daikon-braised-beef | 萝卜炖牛肉

```yaml
id: daikon-braised-beef
type: recipe
status: candidate
name_zh: 萝卜炖牛肉
name_en: Braised Beef with Daikon
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Chinese Braised Beef with Daikon
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- chuck-roast
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- daikon
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: chuck-roast
  role: main-protein
  availability: required
- ingredient_id: daikon
  role: vegetable
  availability: required
- pantry_core: ginger / soy / mild aromatic braise
  role: seasoning
  availability: assumed
steps:
- 处理 chuck-roast；按来源决定是否需要焯水或轻煎。
- 加入 ginger / soy / mild aromatic braise 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: potato-braised-beef | 土豆炖牛肉

```yaml
id: potato-braised-beef
type: recipe
status: candidate
name_zh: 土豆炖牛肉
name_en: Braised Beef with Potato
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - Chinese home-style potato braised beef references; same braising family as red-braised beef
notes: Potato is the staple carried in recipe.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- chuck-roast
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 1
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids:
- potato
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: chuck-roast
  role: main-protein
  availability: required
- ingredient_id: potato
  role: integral-staple
  availability: required
- pantry_core: ginger / soy / mild savory braise
  role: seasoning
  availability: assumed
steps:
- 处理 chuck-roast；按来源决定是否需要焯水或轻煎。
- 加入 ginger / soy / mild savory braise 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: chinese-red-braised-beef | 红烧牛肉

```yaml
id: chinese-red-braised-beef
type: recipe
status: candidate
name_zh: 红烧牛肉
name_en: Chinese Red-Braised Beef
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Red Braised Beef
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather
  than invented.
primary_role: protein
main_protein_category: beef
main_protein_ingredient_ids:
- chuck-roast
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: chuck-roast
  role: main-protein
  availability: required
- pantry_core: soy / ginger / mild sweet-savory red braise
  role: seasoning
  availability: assumed
steps:
- 处理 chuck-roast；按来源决定是否需要焯水或轻煎。
- 加入 soy / ginger / mild sweet-savory red braise 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the
  dish does not benefit from it.
substitutions: []
meal_addons:
- id: finish-with-leafy-vegetable
  accepts_ingredient_tag: finish-wilt-compatible
  meal_contribution:
    protein: 0
    vegetable: 1
    staple: 0
  child_coverage:
    protein: false
    vegetable: ingredient-dependent
  notes: 仅在当天采用偏浓汁、stovetop final-reduction 路线时使用；偏汤汁版本不启用。
```

### recipe: red-braised-beef-noodle-soup | 红烧牛肉面

```yaml
id: red-braised-beef-noodle-soup
type: recipe
status: candidate
name_zh: 红烧牛肉面
name_en: Red-Braised Beef Noodle Soup
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Braised Beef Noodle Soup
notes: Noodles are carried in recipe.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- chuck-roast
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 1
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids:
- noodles
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- pot
- wok/nonstick pan if stir-fried
burner_plan: Pot on medium burner; use high-output wok only if the recipe is a stir-fried noodle.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: chuck-roast
  role: main-protein
  availability: required
- ingredient_id: noodles
  role: integral-staple
  availability: required
- pantry_core: red-braised beef broth / soy / aromatics, non-spicy household base
  role: seasoning
  availability: assumed
steps:
- 处理 chuck-roast 与 无固定蔬菜；准备 red-braised beef broth / soy / aromatics, non-spicy household base。
- 面条按种类煮至合适熟度并沥水；汤面则保留单独汤底。
- 炒面在高输出灶口快速合炒；汤面则把主料/蔬菜在汤中依次煮熟。
- 最后合并并调整清淡盐度；成人辣味另加。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: chinese-braised-beef-shank | 酱牛肉

```yaml
id: chinese-braised-beef-shank
type: recipe
status: candidate
name_zh: 酱牛肉
name_en: Chinese Braised Beef Shank
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- child-support-protein
fit:
  hard_rules: pass
  score: 3
  strengths: []
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Braised Beef Shank
notes: Often served sliced; child support recommended unless a very soft portion is available.
primary_role: protein
main_protein_category: beef
main_protein_ingredient_ids:
- beef-shank
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- noodles
active_minutes: 25–40
meal_window_minutes: 25–40
elapsed_minutes: 180–300
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: beef-shank
  role: main-protein
  availability: required
- pantry_core: soy / aromatics / mild five-spice profile
  role: seasoning
  availability: assumed
steps:
- 处理 beef-shank；按来源决定是否需要焯水或轻煎。
- 加入 soy / aromatics / mild five-spice profile 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: instant-pot-oxtail-soup | Instant Pot 牛尾汤

```yaml
id: instant-pot-oxtail-soup
type: recipe
status: candidate
name_zh: Instant Pot 牛尾汤
name_en: Instant Pot Oxtail Soup
tags:
- light-seasoning
- non-spicy-base
- instant-pot
- low-active-time
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 主烹调设备可释放灶口。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Instant Pot official oxtail soup pressure-cooking references
notes: Pressure-cooking route is supported; exact household pressure/release remains test data.
primary_role: protein
main_protein_category: beef
main_protein_ingredient_ids:
- oxtail
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- 9-quart Instant Pot
burner_plan: Instant Pot carries the main cooking load and frees both burners.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: oxtail
  role: main-protein
  availability: required
- pantry_core: ginger / clear broth / light salt
  role: seasoning
  availability: assumed
steps:
- 将 oxtail 与 ginger / clear broth / light salt 放入 9-qt Instant Pot 下层；液体至少满足设备正常起压要求，但不在未验证时写死家庭水量。
- 本家庭常用肉类压力段约 10–15 分钟作为工作模式；具体菜首次执行时按食材厚度与可靠来源校正，不把该范围当统一强制参数。
- 放压方式按具体菜与当日流程选择并记录到测试备注；未测试前不宣称某一种 release 为家庭标准。
- 开盖确认熟度，必要时用 sauté 收汁/调味；孩子份先盛出。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: la-galbi | LA Galbi

```yaml
id: la-galbi
type: recipe
status: candidate
name_zh: LA Galbi
name_en: LA Galbi Korean Short Ribs
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- advance-start
- child-support-protein
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Korean Bapsang — LA Galbi
notes: Premium/lower-frequency route; cross-cut bones require careful child separation.
primary_role: protein
main_protein_category: beef
main_protein_ingredient_ids:
- cross-cut-beef-short-ribs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 15–25
elapsed_minutes: 45–75 + marination
advance_start_required: true
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: cross-cut-beef-short-ribs
  role: main-protein
  availability: required
- pantry_core: soy / pear-or-fruit sweetness / garlic marinade, kept light
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 cross-cut-beef-short-ribs；准备 soy / pear-or-fruit sweetness / garlic marinade, kept light。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: galbijjim | Galbijjim

```yaml
id: galbijjim
type: recipe
status: candidate
name_zh: Galbijjim
name_en: Korean Braised Short Ribs (Galbijjim)
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
- two-vegetable-ready
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Korean Bapsang — Galbijjim
notes: Premium/lower-frequency route.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- cross-cut-beef-short-ribs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- carrot
- daikon
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 25–40
meal_window_minutes: 25–40
elapsed_minutes: 180–300
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: cross-cut-beef-short-ribs
  role: main-protein
  availability: required
- ingredient_id: carrot
  role: vegetable
  availability: required
- ingredient_id: daikon
  role: vegetable
  availability: required
- pantry_core: soy / fruit sweetness / garlic braise, kept light
  role: seasoning
  availability: assumed
steps:
- 处理 cross-cut-beef-short-ribs；按来源决定是否需要焯水或轻煎。
- 加入 soy / fruit sweetness / garlic braise, kept light 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: japanese-daikon-braised-boneless-short-ribs | 日式萝卜炖无骨牛小排

```yaml
id: japanese-daikon-braised-boneless-short-ribs
type: recipe
status: candidate
name_zh: 日式萝卜炖无骨牛小排
name_en: Japanese-Style Daikon Braised Boneless Short Ribs
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - Japanese soy/miso daikon + boneless short-rib braise references
notes: Premium/lower-frequency route.
primary_role: mixed
main_protein_category: beef
main_protein_ingredient_ids:
- boneless-beef-short-ribs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- daikon
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: boneless-beef-short-ribs
  role: main-protein
  availability: required
- ingredient_id: daikon
  role: vegetable
  availability: required
- pantry_core: soy / dashi or miso-light braise / ginger
  role: seasoning
  availability: assumed
steps:
- 处理 boneless-beef-short-ribs；按来源决定是否需要焯水或轻煎。
- 加入 soy / dashi or miso-light braise / ginger 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: pan-seared-steak | 铁锅煎牛排

```yaml
id: pan-seared-steak
type: recipe
status: candidate
name_zh: 铁锅煎牛排
name_en: Pan-Seared Steak
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-45
- child-support-protein
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau beef collection / standard pan-seared steak technique
notes: One Recipe covers compatible steak cuts; do not split by flat iron, Denver, or generic steak cut.
primary_role: protein
main_protein_category: beef
main_protein_ingredient_ids:
- beef-steak
- flat-iron-steak
- denver-steak
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- potato
- rice
- bread
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: conditional
child_texture: 整块煎牛排/羊排即使可切小，也不是稳定的软质主蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - beef-steak
  - flat-iron-steak
  - denver-steak
  role: main-protein
  availability: required
- pantry_core: salt-light sear; butter/aromatics optional adult finish
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 beef-steak；准备 salt-light sear; butter/aromatics optional adult finish。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 若提供则逆纹切很小；Meal Combo 另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions:
- flat-iron-steak
- denver-steak
- beef-steak
- other compatible steak cuts already represented in Ingredient Library
```

## 5.4 Lamb / Goat (14)

### recipe: cumin-lamb | 孜然羊肉

```yaml
id: cumin-lamb
type: recipe
status: candidate
name_zh: 孜然羊肉
name_en: Cumin Lamb
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- child-support-protein
- adult-finish-separate
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - Omnivore’s Cookbook / The Woks of Life — Xinjiang Cumin Lamb; household adaptation omits chili from base
notes: Cumin remains defining; chili moves to adult finish.
primary_role: protein
main_protein_category: lamb
main_protein_ingredient_ids:
- hot-pot-lamb-slices
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: hot-pot-lamb-slices
  role: main-protein
  availability: required
- pantry_core: cumin / garlic / optional cilantro; chili omitted from base
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 hot-pot-lamb-slices；蔬菜为 无固定蔬菜。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：cumin / garlic / optional cilantro; chili omitted from base；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: scallion-lamb-stir-fry | 葱爆羊肉

```yaml
id: scallion-lamb-stir-fry
type: recipe
status: candidate
name_zh: 葱爆羊肉
name_en: Scallion Lamb Stir-fry
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Chinese 葱爆羊肉 references; scallion-lamb is the classic structure
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: lamb
main_protein_ingredient_ids:
- hot-pot-lamb-slices
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: hot-pot-lamb-slices
  role: main-protein
  availability: required
- pantry_core: scallion / light soy / Shaoxing-style seasoning
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 hot-pot-lamb-slices；蔬菜为 无固定蔬菜。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：scallion / light soy / Shaoxing-style seasoning；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: xinjiang-lamb-noodles | 新疆羊肉拌面

```yaml
id: xinjiang-lamb-noodles
type: recipe
status: candidate
name_zh: 新疆羊肉拌面
name_en: Xinjiang Lamb Noodles (Laghman-style)
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-45
- child-support-protein
- two-vegetable-ready
- adult-finish-separate
fit:
  hard_rules: pass
  score: 3
  strengths: []
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - Omnivore’s Cookbook — Laghman / Xinjiang lamb noodles
notes: Noodles are carried in recipe; two-vegetable structure.
primary_role: mixed
main_protein_category: lamb
main_protein_ingredient_ids:
- lamb-leg-chunks
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- onion
- bell-pepper
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 1
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids:
- noodles
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- pot
- wok/nonstick pan if stir-fried
burner_plan: Pot on medium burner; use high-output wok only if the recipe is a stir-fried noodle.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: lamb-leg-chunks
  role: main-protein
  availability: required
- ingredient_id: onion
  role: vegetable
  availability: required
- ingredient_id: bell-pepper
  role: vegetable
  availability: required
- ingredient_id: noodles
  role: integral-staple
  availability: required
- pantry_core: cumin / tomato-onion-pepper savory topping; chili omitted from base
  role: seasoning
  availability: assumed
steps:
- 处理 lamb-leg-chunks 与 onion, bell-pepper；准备 cumin / tomato-onion-pepper savory topping; chili omitted from base。
- 面条按种类煮至合适熟度并沥水；汤面则保留单独汤底。
- 炒面在高输出灶口快速合炒；汤面则把主料/蔬菜在汤中依次煮熟。
- 最后合并并调整清淡盐度；成人辣味另加。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: xinjiang-lamb-pilaf | 羊肉抓饭

```yaml
id: xinjiang-lamb-pilaf
type: recipe
status: candidate
name_zh: 羊肉抓饭
name_en: Xinjiang Lamb Pilaf
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- advance-start
- family-shared
- two-vegetable-ready
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Xinjiang Lamb Rice
notes: Rice carried in recipe.
primary_role: mixed
main_protein_category: lamb
main_protein_ingredient_ids:
- lamb-shoulder-chunks
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- carrot
- onion
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 1
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids:
- rice
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot
burner_plan: Covered pot on medium burner; no second burner required for the recipe itself.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: lamb-shoulder-chunks
  role: main-protein
  availability: required
- ingredient_id: carrot
  role: vegetable
  availability: required
- ingredient_id: onion
  role: vegetable
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- pantry_core: cumin / onion / carrot / lamb-fat-aroma profile with restrained added oil
  role: seasoning
  availability: assumed
steps:
- 洗米并处理 carrot, onion 及配料；准备 cumin / onion / carrot / lamb-fat-aroma profile with restrained added oil。
- 需要先煸香/轻煎的配料用少量油处理，然后与米同锅。
- 按引用来源的锅具路线把米饭焖熟；家庭版若改变米量/锅具，不写死未经测试的水比。
- 关火后按需要焖放，再轻轻拌匀上桌。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: red-braised-lamb | 红烧羊肉

```yaml
id: red-braised-lamb
type: recipe
status: candidate
name_zh: 红烧羊肉
name_en: Red-Braised Lamb
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Omnivore’s Cookbook — Red Braised Lamb
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: lamb
main_protein_ingredient_ids:
- lamb-shoulder-chunks
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: lamb-shoulder-chunks
  role: main-protein
  availability: required
- pantry_core: soy / ginger / mild aromatics; no chili
  role: seasoning
  availability: assumed
steps:
- 处理 lamb-shoulder-chunks；按来源决定是否需要焯水或轻煎。
- 加入 soy / ginger / mild aromatics; no chili 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: daikon-braised-lamb | 白萝卜炖羊肉

```yaml
id: daikon-braised-lamb
type: recipe
status: candidate
name_zh: 白萝卜炖羊肉
name_en: Braised Lamb with Daikon
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Ying Chen Blog — Cantonese Style Lamb and Daikon Stew in Chu Hou Paste
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: lamb
main_protein_ingredient_ids:
- lamb-shoulder-chunks
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- daikon
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: lamb-shoulder-chunks
  role: main-protein
  availability: required
- ingredient_id: daikon
  role: vegetable
  availability: required
- pantry_core: ginger / daikon / light savory braise
  role: seasoning
  availability: assumed
steps:
- 处理 lamb-shoulder-chunks；按来源决定是否需要焯水或轻煎。
- 加入 ginger / daikon / light savory braise 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: clear-lamb-daikon-soup | 清炖羊肉萝卜汤

```yaml
id: clear-lamb-daikon-soup
type: recipe
status: candidate
name_zh: 清炖羊肉萝卜汤
name_en: Clear Lamb and Daikon Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - ChinaRecipes — Radish and Lamb Soup
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: lamb
main_protein_ingredient_ids:
- lamb-leg-chunks
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- daikon
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: lamb-leg-chunks
  role: main-protein
  availability: required
- ingredient_id: daikon
  role: vegetable
  availability: required
- pantry_core: ginger / scallion / clear light broth
  role: seasoning
  availability: assumed
steps:
- 处理 lamb-leg-chunks；蔬菜/主食配料为 daikon。骨肉汤按来源需要先焯洗。
- 加水与 ginger / scallion / clear light broth 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: simple-pan-seared-lamb-chops | 简单煎羊排

```yaml
id: simple-pan-seared-lamb-chops
type: recipe
status: candidate
name_zh: 简单煎羊排
name_en: Simple Pan-Seared Lamb Chops
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-45
- child-support-protein
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - RecipeTin Eats / RecipeTin Japan — pan-seared lamb-chop techniques
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: lamb
main_protein_ingredient_ids:
- bone-in-lamb-chops
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- potato
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: conditional
child_texture: 整块煎牛排/羊排即使可切小，也不是稳定的软质主蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: bone-in-lamb-chops
  role: main-protein
  availability: required
- pantry_core: salt-light / garlic-herb optional finish
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 bone-in-lamb-chops；准备 salt-light / garlic-herb optional finish。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 若提供则逆纹切很小；Meal Combo 另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: slow-roasted-lamb-shanks | 慢烤羊腱

```yaml
id: slow-roasted-lamb-shanks
type: recipe
status: candidate
name_zh: 慢烤羊腱
name_en: Slow-Roasted Lamb Shanks
tags:
- light-seasoning
- non-spicy-base
- roasted
- oven
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  - 主烹调设备可释放灶口。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - RecipeTin Eats — slow-cooked lamb shanks
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: lamb
main_protein_ingredient_ids:
- lamb-shanks
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- potato
- rice
active_minutes: 25–40
meal_window_minutes: 25–40
elapsed_minutes: 180–300
advance_start_required: true
equipment:
- gas oven
- sheet pan / baking dish
burner_plan: Oven carries the main cooking load and frees both stovetop burners.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: lamb-shanks
  role: main-protein
  availability: required
- pantry_core: garlic / herbs / mild stock braise-roast
  role: seasoning
  availability: assumed
steps:
- 处理 lamb-shanks，准备 garlic / herbs / mild stock braise-roast；需要腌制的菜提前完成。
- 烤箱预热；食材单层放置，使用少量油或烘焙纸/烤架降低粘连。
- 按引用来源的厚度与熟度逻辑烤制；家庭实际切法不同则以熟度为准。
- 出炉后静置/拆骨/切小；成人酱汁或辣味在孩子份盛出后再加。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: daikon-goat-soup | 白萝卜山羊肉汤

```yaml
id: daikon-goat-soup
type: recipe
status: candidate
name_zh: 白萝卜山羊肉汤
name_en: Goat and Daikon Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Chinese goat + daikon soup home-cooking references
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: lamb
main_protein_ingredient_ids:
- skin-on-bone-in-goat-pieces
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- daikon
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 25–40
meal_window_minutes: 25–40
elapsed_minutes: 180–300
advance_start_required: true
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: skin-on-bone-in-goat-pieces
  role: main-protein
  availability: required
- ingredient_id: daikon
  role: vegetable
  availability: required
- pantry_core: ginger / clear broth / light salt
  role: seasoning
  availability: assumed
steps:
- 处理 skin-on-bone-in-goat-pieces；蔬菜/主食配料为 daikon。骨肉汤按来源需要先焯洗。
- 加水与 ginger / clear broth / light salt 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: red-braised-goat | 红烧山羊肉

```yaml
id: red-braised-goat
type: recipe
status: candidate
name_zh: 红烧山羊肉
name_en: Red-Braised Goat
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - Inferred goat adaptation from verified Chinese red-braised lamb/goat cooking patterns
notes: Goat remains in lamb main category.
primary_role: protein
main_protein_category: lamb
main_protein_ingredient_ids:
- skin-on-bone-in-goat-pieces
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 25–40
meal_window_minutes: 25–40
elapsed_minutes: 180–300
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: skin-on-bone-in-goat-pieces
  role: main-protein
  availability: required
- pantry_core: soy / ginger / mild sweet-savory braise
  role: seasoning
  availability: assumed
steps:
- 处理 skin-on-bone-in-goat-pieces；按来源决定是否需要焯水或轻煎。
- 加入 soy / ginger / mild sweet-savory braise 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: clear-lamb-spine-soup | 清炖羊蝎子

```yaml
id: clear-lamb-spine-soup
type: recipe
status: candidate
name_zh: 清炖羊蝎子
name_en: Clear Lamb Spine Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- advance-start
- family-shared
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
  - 已在 brainstorm 中标为低优先度/低频。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Chinese 羊蝎子 clear-soup references + standard slow lamb-bone soup technique
notes: Low-frequency ingredient with many bones; retained candidate but poor routine fit.
primary_role: protein
main_protein_category: lamb
main_protein_ingredient_ids:
- lamb-spine-sections
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 25–40
meal_window_minutes: 25–40
elapsed_minutes: 180–300
advance_start_required: true
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: lamb-spine-sections
  role: main-protein
  availability: required
- pantry_core: ginger / scallion / clear broth
  role: seasoning
  availability: assumed
steps:
- 处理 lamb-spine-sections；蔬菜/主食配料为 无固定蔬菜。骨肉汤按来源需要先焯洗。
- 加水与 ginger / scallion / clear broth 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: western-braised-lamb-shanks | 西式炖羊腱

```yaml
id: western-braised-lamb-shanks
type: recipe
status: candidate
name_zh: 西式炖羊腱
name_en: Western Braised Lamb Shanks
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- family-shared
- two-vegetable-ready
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 可设计为全家共享基础口味。
  tradeoffs:
  - 需要提前启动或较长被动烹调时间。
  - 已在 brainstorm 中标为第二优先度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Western braised lamb-shank references
notes: Second priority.
primary_role: mixed
main_protein_category: lamb
main_protein_ingredient_ids:
- lamb-shanks
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- carrot
- onion
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- potato
- bread
active_minutes: 25–40
meal_window_minutes: 25–40
elapsed_minutes: 180–300
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 成品肉可软嫩，但必须由成人去骨。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: lamb-shanks
  role: main-protein
  availability: required
- ingredient_id: carrot
  role: vegetable
  availability: required
- ingredient_id: onion
  role: vegetable
  availability: required
- pantry_core: stock / tomato optional / herbs / onion-carrot
  role: seasoning
  availability: assumed
steps:
- 处理 lamb-shanks；按来源决定是否需要焯水或轻煎。
- 加入 stock / tomato optional / herbs / onion-carrot 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 成人彻底去骨并检查碎骨/硬软骨后剪小。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: hong-kong-yuba-lamb-casserole | 港式枝竹羊腩煲

```yaml
id: hong-kong-yuba-lamb-casserole
type: recipe
status: candidate
name_zh: 港式枝竹羊腩煲
name_en: Hong Kong Yuba Lamb Casserole
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- advance-start
- child-support-protein
fit:
  hard_rules: pass
  score: 2
  strengths: []
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 需要提前启动或较长被动烹调时间。
  - 已在 brainstorm 中标为第二优先度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Hong Kong Style Lamb Casserole; source explicitly accepts lamb shoulder and goat substitutions
notes: Second priority; dried yuba requires advance soaking. Source supports lamb shoulder as a substitute for lamb breast.
primary_role: protein
main_protein_category: lamb
main_protein_ingredient_ids:
- lamb-shoulder-chunks
supporting_protein_ingredient_ids:
- dried-yuba-sticks
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 25–40
meal_window_minutes: 25–40
elapsed_minutes: 180–300
advance_start_required: true
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: lamb-shoulder-chunks
  role: main-protein
  availability: required
- ingredient_id: dried-yuba-sticks
  role: supporting-protein
  availability: required
- pantry_core: fermented-bean-curd / ginger / aromatic casserole profile, kept mild
  role: seasoning
  availability: assumed
steps:
- 处理 lamb-shoulder-chunks；按来源决定是否需要焯水或轻煎。
- 加入 fermented-bean-curd / ginger / aromatic casserole profile, kept mild 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

## 5.5 Fish (5)

### recipe: cantonese-steamed-fish-ginger-scallion | 姜葱清蒸鱼

```yaml
id: cantonese-steamed-fish-ginger-scallion
type: recipe
status: candidate
name_zh: 姜葱清蒸鱼
name_en: Cantonese Steamed Fish with Ginger and Scallion
tags:
- light-seasoning
- non-spicy-base
- steamed
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Cantonese Steamed Fish
notes: Compatible sea-bass-like fish remain substitutions, not separate recipes.
primary_role: protein
main_protein_category: fish
main_protein_ingredient_ids:
- live-freshwater-bass
- branzino
- black-sea-bass
- grouper
- halibut
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- covered steamer / heatproof plate
burner_plan: Medium burner for covered steaming; high-output burner remains available.
child_suitable: objective-yes-current-preference-low
child_texture: 鱼肉本身可做得柔软，但孩子目前总体不爱吃鱼。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - live-freshwater-bass
  - branzino
  - black-sea-bass
  - grouper
  - halibut
  role: main-protein
  availability: required
- pantry_core: ginger / scallion / light soy; minimal oil finish
  role: seasoning
  availability: assumed
steps:
- 处理 live-freshwater-bass；搭配 无固定蔬菜；按来源用 ginger / scallion / light soy; minimal oil finish 做短腌或铺料。
- 水开后上锅蒸；厚度/骨量变化时以实际熟度为准，不把来源分钟机械套用到不同切法。
- 出锅后按需要加入葱姜等清淡收尾；避免额外淋大量热油。
- 孩子份先去骨/剪小/确认没有硬壳或筋膜，再加成人后味。
child_serving: 成人彻底去刺后压碎/撕小；Meal Combo 默认保留软蛋白备选。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions:
- branzino
- black-sea-bass
- grouper
- halibut
- whole-fish or compatible fillet path
```

### recipe: steamed-fish-black-bean | 豉汁蒸鱼

```yaml
id: steamed-fish-black-bean
type: recipe
status: candidate
name_zh: 豉汁蒸鱼
name_en: Steamed Fish with Black Bean Sauce
tags:
- light-seasoning
- non-spicy-base
- steamed
- stovetop-nonstick
- lunch-45
- child-support-protein
fit:
  hard_rules: pass
  score: 3
  strengths: []
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Steamed Fish with Black Bean Sauce
notes: Black-bean sauce is a meaningful dish identity, so this remains separate from plain steamed fish.
primary_role: protein
main_protein_category: fish
main_protein_ingredient_ids:
- live-freshwater-bass
- branzino
- black-sea-bass
- grouper
- halibut
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- covered steamer / heatproof plate
burner_plan: Medium burner for covered steaming; high-output burner remains available.
child_suitable: objective-yes-current-preference-low
child_texture: 鱼肉本身可做得柔软，但孩子目前总体不爱吃鱼。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - live-freshwater-bass
  - branzino
  - black-sea-bass
  - grouper
  - halibut
  role: main-protein
  availability: required
- pantry_core: fermented black bean / garlic / ginger / light soy
  role: seasoning
  availability: assumed
steps:
- 处理 live-freshwater-bass；搭配 无固定蔬菜；按来源用 fermented black bean / garlic / ginger / light soy 做短腌或铺料。
- 水开后上锅蒸；厚度/骨量变化时以实际熟度为准，不把来源分钟机械套用到不同切法。
- 出锅后按需要加入葱姜等清淡收尾；避免额外淋大量热油。
- 孩子份先去骨/剪小/确认没有硬壳或筋膜，再加成人后味。
child_serving: 成人彻底去刺后压碎/撕小；Meal Combo 默认保留软蛋白备选。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions:
- branzino
- black-sea-bass
- grouper
- halibut
```

### recipe: baked-sea-bass-branzino | 烤 Sea Bass / Branzino

```yaml
id: baked-sea-bass-branzino
type: recipe
status: candidate
name_zh: 烤 Sea Bass / Branzino
name_en: Baked Sea Bass or Branzino
tags:
- light-seasoning
- non-spicy-base
- roasted
- oven
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 主烹调设备可释放灶口。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - RecipeTin Eats — Whole Baked Fish; supports sea-bass/branzino oven route
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: fish
main_protein_ingredient_ids:
- branzino
- black-sea-bass
- live-freshwater-bass
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- potato
active_minutes: 15–25
meal_window_minutes: 15–25
elapsed_minutes: 45–75
advance_start_required: false
equipment:
- gas oven
- sheet pan / baking dish
burner_plan: Oven carries the main cooking load and frees both stovetop burners.
child_suitable: objective-yes-current-preference-low
child_texture: 鱼肉本身可做得柔软，但孩子目前总体不爱吃鱼。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - branzino
  - black-sea-bass
  - live-freshwater-bass
  role: main-protein
  availability: required
- pantry_core: lemon-herb OR soy-citrus finish; finishes are variations
  role: seasoning
  availability: assumed
steps:
- 处理 branzino，准备 lemon-herb OR soy-citrus finish; finishes are variations；需要腌制的菜提前完成。
- 烤箱预热；食材单层放置，使用少量油或烘焙纸/烤架降低粘连。
- 按引用来源的厚度与熟度逻辑烤制；家庭实际切法不同则以熟度为准。
- 出炉后静置/拆骨/切小；成人酱汁或辣味在孩子份盛出后再加。
child_serving: 成人彻底去刺后压碎/撕小；Meal Combo 默认保留软蛋白备选。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions:
- black-sea-bass
- live-freshwater-bass when suitable for baking
- lemon-herb finish
- soy-citrus finish
```

### recipe: miso-marinated-baked-fish | 味噌腌烤鱼

```yaml
id: miso-marinated-baked-fish
type: recipe
status: candidate
name_zh: 味噌腌烤鱼
name_en: Miso-Marinated Baked Fish
tags:
- light-seasoning
- non-spicy-base
- roasted
- oven
- advance-start
- child-support-protein
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 主烹调设备可释放灶口。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Miso Black Cod / Miso Salmon; fish-specific marination times retained as source-dependent
notes: Do not apply black-cod multi-day marination mechanically to every fish.
primary_role: protein
main_protein_category: fish
main_protein_ingredient_ids:
- chilean-sea-bass
- sablefish
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 15–25
elapsed_minutes: 45–75 + marination
advance_start_required: true
equipment:
- gas oven
- sheet pan / baking dish
burner_plan: Oven carries the main cooking load and frees both stovetop burners.
child_suitable: objective-yes-current-preference-low
child_texture: 鱼肉本身可做得柔软，但孩子目前总体不爱吃鱼。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - chilean-sea-bass
  - sablefish
  role: main-protein
  availability: required
- pantry_core: miso-based marinade; exact marination time depends on fish/source
  role: seasoning
  availability: assumed
steps:
- 处理 chilean-sea-bass，准备 miso-based marinade; exact marination time depends on fish/source；需要腌制的菜提前完成。
- 烤箱预热；食材单层放置，使用少量油或烘焙纸/烤架降低粘连。
- 按引用来源的厚度与熟度逻辑烤制；家庭实际切法不同则以熟度为准。
- 出炉后静置/拆骨/切小；成人酱汁或辣味在孩子份盛出后再加。
child_serving: 成人彻底去刺后压碎/撕小；Meal Combo 默认保留软蛋白备选。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions:
- sablefish
```

### recipe: pan-seared-salmon | 煎三文鱼

```yaml
id: pan-seared-salmon
type: recipe
status: candidate
name_zh: 煎三文鱼
name_en: Pan-Seared Salmon
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Teriyaki Salmon and Miso Butter Salmon; variations under one pan-seared salmon record
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: fish
main_protein_ingredient_ids:
- salmon
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- potato
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: objective-yes-current-preference-low
child_texture: 鱼肉本身可做得柔软，但孩子目前总体不爱吃鱼。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: salmon
  role: main-protein
  availability: required
- pantry_core: simple OR teriyaki OR miso-butter finish; one recipe with variations
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 salmon；准备 simple OR teriyaki OR miso-butter finish; one recipe with variations。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 成人彻底去刺后压碎/撕小；Meal Combo 默认保留软蛋白备选。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions:
- simple finish
- teriyaki finish
- miso-butter finish
```

## 5.6 Shellfish (9)

### recipe: shrimp-scrambled-eggs | 滑蛋虾仁

```yaml
id: shrimp-scrambled-eggs
type: recipe
status: candidate
name_zh: 滑蛋虾仁
name_en: Shrimp with Soft Scrambled Eggs
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau / The Woks of Life — Shrimp and Eggs
notes: Main category remains shellfish; egg is supporting protein.
primary_role: protein
main_protein_category: shellfish
main_protein_ingredient_ids:
- peeled-shrimp
supporting_protein_ingredient_ids:
- eggs
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: peeled-shrimp
  role: main-protein
  availability: required
- ingredient_id: eggs
  role: supporting-protein
  availability: required
- pantry_core: light salt / scallion / soft egg technique
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 peeled-shrimp；蔬菜为 无固定蔬菜。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：light salt / scallion / soft egg technique；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: shrimp-broccoli-stir-fry | 西兰花虾仁

```yaml
id: shrimp-broccoli-stir-fry
type: recipe
status: candidate
name_zh: 西兰花虾仁
name_en: Shrimp and Broccoli Stir-fry
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Shrimp & Broccoli
notes: Child shrimp acceptance is not confirmed; meal-planning support remains prudent.
primary_role: mixed
main_protein_category: shellfish
main_protein_ingredient_ids:
- peeled-shrimp
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- broccoli
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: peeled-shrimp
  role: main-protein
  availability: required
- ingredient_id: broccoli
  role: vegetable
  availability: required
- pantry_core: garlic / light oyster-soy style sauce
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 peeled-shrimp；蔬菜为 broccoli。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：garlic / light oyster-soy style sauce；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: simple-pan-seared-shrimp | 简单煎虾仁

```yaml
id: simple-pan-seared-shrimp
type: recipe
status: candidate
name_zh: 简单煎虾仁
name_en: Simple Pan-Seared Shrimp
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Standard pan-seared shrimp technique; household finishes are variations
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: shellfish
main_protein_ingredient_ids:
- peeled-shrimp
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- bread
active_minutes: 8–15
meal_window_minutes: 10–20
elapsed_minutes: 10–25
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: peeled-shrimp
  role: main-protein
  availability: required
- pantry_core: simple salt-light base; garlic, honey-soy, or butter are finishes
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 peeled-shrimp；准备 simple salt-light base; garlic, honey-soy, or butter are finishes。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions:
- garlic finish
- honey-soy finish
- butter finish
```

### recipe: cantonese-poached-shrimp | 白灼虾

```yaml
id: cantonese-poached-shrimp
type: recipe
status: candidate
name_zh: 白灼虾
name_en: Cantonese Poached Shrimp
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-30
- child-support-protein
- poached
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Cantonese 白灼虾 / poached shrimp references
notes: Adult peels shell completely before any child portion.
primary_role: protein
main_protein_category: shellfish
main_protein_ingredient_ids:
- shell-on-shrimp
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 8–15
meal_window_minutes: 10–20
elapsed_minutes: 10–25
advance_start_required: false
equipment:
- medium burner
- pot
burner_plan: Medium burner for a short poach; high-output wok burner remains free.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: shell-on-shrimp
  role: main-protein
  availability: required
- pantry_core: plain poaching water with ginger/scallion optional; dipping sauce separate
  role: seasoning
  availability: assumed
steps:
- 清洗 shell-on shrimp；蘸汁单独准备，基础虾不做重口调味。
- 水烧到适合白灼的状态后下虾，短时间煮至完全变色并达到合适熟度，立即捞出，避免久煮变韧。
- 成人份可蘸酱；孩子若食用，由成人完全剥壳、去除硬壳碎片并剪小。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: pan-seared-scallops | 香煎扇贝

```yaml
id: pan-seared-scallops
type: recipe
status: candidate
name_zh: 香煎扇贝
name_en: Pan-Seared Scallops
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Serious Eats — pan-seared scallop technique
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: shellfish
main_protein_ingredient_ids:
- scallops
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- bread
active_minutes: 8–15
meal_window_minutes: 10–20
elapsed_minutes: 10–25
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: scallops
  role: main-protein
  availability: required
- pantry_core: salt-light sear / optional butter-lemon adult finish
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 scallops；准备 salt-light sear / optional butter-lemon adult finish。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: squid-chinese-greens-stir-fry | 青菜炒鱿鱼

```yaml
id: squid-chinese-greens-stir-fry
type: recipe
status: candidate
name_zh: 青菜炒鱿鱼
name_en: Squid with Chinese Greens
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Omnivore’s Cookbook — Squid & Bok Choy Stir Fry
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: shellfish
main_protein_ingredient_ids:
- squid
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- chinese-greens
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: conditional
child_texture: 鱿鱼天然较有嚼劲，不适合作为稳定的孩子软蛋白来源。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: squid
  role: main-protein
  availability: required
- ingredient_id: chinese-greens
  role: vegetable
  availability: required
- pantry_core: ginger / garlic / light oyster-soy style sauce
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 squid；蔬菜为 chinese-greens。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：ginger / garlic / light oyster-soy style sauce；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 如给孩子仅取非常小、嫩的部分；另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: japanese-shrimp-broccoli-pasta | 日式虾仁西兰花意面

```yaml
id: japanese-shrimp-broccoli-pasta
type: recipe
status: candidate
name_zh: 日式虾仁西兰花意面
name_en: Japanese-Style Shrimp Broccoli Pasta
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-45
- child-support-protein
fit:
  hard_rules: pass
  score: 3
  strengths: []
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Japanese shrimp/broccolini pasta
notes: Medium priority; pasta/noodles carried in recipe.
primary_role: mixed
main_protein_category: shellfish
main_protein_ingredient_ids:
- peeled-shrimp
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- broccoli
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 1
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids:
- noodles
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- pot
- wok/nonstick pan if stir-fried
burner_plan: Pot on medium burner; use high-output wok only if the recipe is a stir-fried noodle.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: peeled-shrimp
  role: main-protein
  availability: required
- ingredient_id: broccoli
  role: vegetable
  availability: required
- ingredient_id: noodles
  role: integral-staple
  availability: required
- pantry_core: Japanese soy/butter or olive-oil style light sauce
  role: seasoning
  availability: assumed
steps:
- 处理 peeled-shrimp 与 broccoli；准备 Japanese soy/butter or olive-oil style light sauce。
- 面条按种类煮至合适熟度并沥水；汤面则保留单独汤底。
- 炒面在高输出灶口快速合炒；汤面则把主料/蔬菜在汤中依次煮熟。
- 最后合并并调整清淡盐度；成人辣味另加。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: squid-bell-pepper-onion-stir-fry | 甜椒洋葱炒鱿鱼

```yaml
id: squid-bell-pepper-onion-stir-fry
type: recipe
status: candidate
name_zh: 甜椒洋葱炒鱿鱼
name_en: Squid with Bell Pepper and Onion
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- child-support-protein
- two-vegetable-ready
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - Epicurious — Squid and Bell Pepper Stir-Fry; onion is a household-compatible aromatic/vegetable addition
notes: Direct bell-pepper squid stir-fry is source-backed; onion is a compatible household addition.
primary_role: mixed
main_protein_category: shellfish
main_protein_ingredient_ids:
- squid
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- bell-pepper
- onion
meal_contribution:
  protein: 1
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: conditional
child_texture: 鱿鱼天然较有嚼劲，不适合作为稳定的孩子软蛋白来源。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: squid
  role: main-protein
  availability: required
- ingredient_id: bell-pepper
  role: vegetable
  availability: required
- ingredient_id: onion
  role: vegetable
  availability: required
- pantry_core: ginger / garlic / light soy-oyster style sauce
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 squid；蔬菜为 bell-pepper, onion。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：ginger / garlic / light soy-oyster style sauce；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 如给孩子仅取非常小、嫩的部分；另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: panko-baked-oysters | 烤面包糠生蚝

```yaml
id: panko-baked-oysters
type: recipe
status: candidate
name_zh: 烤面包糠生蚝
name_en: Panko-Baked Oysters
tags:
- light-seasoning
- non-spicy-base
- roasted
- oven
- child-support-protein
fit:
  hard_rules: pass
  score: 2
  strengths:
  - 主烹调设备可释放灶口。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 已在 brainstorm 中标为低优先度/低频。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Taste of Home / Mediterranean Dish — oven-baked breadcrumb oysters
notes: Low priority.
primary_role: protein
main_protein_category: shellfish
main_protein_ingredient_ids:
- oysters
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 1
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- bread
- rice
active_minutes: 15–25
meal_window_minutes: 15–25
elapsed_minutes: 45–75
advance_start_required: false
equipment:
- gas oven
- sheet pan / baking dish
burner_plan: Oven carries the main cooking load and frees both stovetop burners.
child_suitable: conditional
child_texture: 主菜质地、风味或当前接受度不足以稳定承担孩子的软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: oysters
  role: main-protein
  availability: required
- pantry_core: panko / garlic / herb or lemon finish; baked, not fried
  role: seasoning
  availability: assumed
steps:
- 处理 oysters，准备 panko / garlic / herb or lemon finish; baked, not fried；需要腌制的菜提前完成。
- 烤箱预热；食材单层放置，使用少量油或烘焙纸/烤架降低粘连。
- 按引用来源的厚度与熟度逻辑烤制；家庭实际切法不同则以熟度为准。
- 出炉后静置/拆骨/切小；成人酱汁或辣味在孩子份盛出后再加。
child_serving: 可少量尝试；Meal Combo 默认另配蒸蛋/嫩豆腐等软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

## 5.7 Egg / Tofu (14)

### recipe: tomato-scrambled-eggs | 番茄炒蛋

```yaml
id: tomato-scrambled-eggs
type: recipe
status: candidate
name_zh: 番茄炒蛋
name_en: Tomato and Scrambled Eggs
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau / The Woks of Life — Tomato and Eggs
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: egg
main_protein_ingredient_ids:
- eggs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- tomato
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: eggs
  role: main-protein
  availability: required
- ingredient_id: tomato
  role: vegetable
  availability: required
- pantry_core: tomato / egg / light salt / small sugar optional
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 eggs；蔬菜为 tomato。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：tomato / egg / light salt / small sugar optional；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: steamed-egg-custard | 蒸蛋

```yaml
id: steamed-egg-custard
type: recipe
status: candidate
name_zh: 蒸蛋
name_en: Chinese Steamed Egg Custard
tags:
- light-seasoning
- non-spicy-base
- steamed
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau — Chinese Steamed Eggs
notes: 鸡蛋豆腐蒸蛋 stays a variation/substitution unless later testing shows a distinct workflow.
primary_role: protein
main_protein_category: egg
main_protein_ingredient_ids:
- eggs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0.5
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 8–15
meal_window_minutes: 10–20
elapsed_minutes: 10–25
advance_start_required: false
equipment:
- medium burner
- covered steamer / heatproof plate
burner_plan: Medium burner for covered steaming; high-output burner remains available.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: eggs
  role: main-protein
  availability: required
- pantry_core: egg + warm water/stock + light soy at finish
  role: seasoning
  availability: assumed
steps:
- 处理 eggs；搭配 无固定蔬菜；按来源用 egg + warm water/stock + light soy at finish 做短腌或铺料。
- 水开后上锅蒸；厚度/骨量变化时以实际熟度为准，不把来源分钟机械套用到不同切法。
- 出锅后按需要加入葱姜等清淡收尾；避免额外淋大量热油。
- 孩子份先去骨/剪小/确认没有硬壳或筋膜，再加成人后味。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: tomato-egg-drop-soup | 番茄蛋花汤

```yaml
id: tomato-egg-drop-soup
type: recipe
status: candidate
name_zh: 番茄蛋花汤
name_en: Tomato Egg Drop Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Tomato Egg Drop Soup
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: egg
main_protein_ingredient_ids:
- eggs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- tomato
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- noodles
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: eggs
  role: main-protein
  availability: required
- ingredient_id: tomato
  role: vegetable
  availability: required
- pantry_core: tomato / egg ribbons / light broth
  role: seasoning
  availability: assumed
steps:
- 处理 eggs；蔬菜/主食配料为 tomato。骨肉汤按来源需要先焯洗。
- 加水与 tomato / egg ribbons / light broth 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: tomato-egg-noodles | 番茄鸡蛋面

```yaml
id: tomato-egg-noodles
type: recipe
status: candidate
name_zh: 番茄鸡蛋面
name_en: Tomato Egg Noodles
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-45
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Tomato Egg Drop Noodle Soup
notes: Noodles carried in recipe.
primary_role: mixed
main_protein_category: egg
main_protein_ingredient_ids:
- eggs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- tomato
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 1
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids:
- noodles
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- pot
- wok/nonstick pan if stir-fried
burner_plan: Pot on medium burner; use high-output wok only if the recipe is a stir-fried noodle.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: eggs
  role: main-protein
  availability: required
- ingredient_id: tomato
  role: vegetable
  availability: required
- ingredient_id: noodles
  role: integral-staple
  availability: required
- pantry_core: tomato-egg topping / light broth or sauce
  role: seasoning
  availability: assumed
steps:
- 处理 eggs 与 tomato；准备 tomato-egg topping / light broth or sauce。
- 面条按种类煮至合适熟度并沥水；汤面则保留单独汤底。
- 炒面在高输出灶口快速合炒；汤面则把主料/蔬菜在汤中依次煮熟。
- 最后合并并调整清淡盐度；成人辣味另加。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: basic-egg-drop-soup | 基础蛋花汤

```yaml
id: basic-egg-drop-soup
type: recipe
status: candidate
name_zh: 基础蛋花汤
name_en: Basic Egg Drop Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau — Egg Drop Soup
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: egg
main_protein_ingredient_ids:
- eggs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0.5
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
- noodles
active_minutes: 8–15
meal_window_minutes: 10–20
elapsed_minutes: 10–25
advance_start_required: false
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: eggs
  role: main-protein
  availability: required
- pantry_core: light broth / egg ribbons / scallion optional
  role: seasoning
  availability: assumed
steps:
- 处理 eggs；蔬菜/主食配料为 无固定蔬菜。骨肉汤按来源需要先焯洗。
- 加水与 light broth / egg ribbons / scallion optional 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: tomato-soft-tofu | 番茄豆腐

```yaml
id: tomato-soft-tofu
type: recipe
status: candidate
name_zh: 番茄豆腐
name_en: Tomato Soft Tofu
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life / Made With Lau — tomato tofu recipes
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: tofu
main_protein_ingredient_ids:
- soft-tofu
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- tomato
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: soft-tofu
  role: main-protein
  availability: required
- ingredient_id: tomato
  role: vegetable
  availability: required
- pantry_core: tomato / light soy or broth / scallion
  role: seasoning
  availability: assumed
steps:
- 处理 soft-tofu；按来源决定是否需要焯水或轻煎。
- 加入 tomato / light soy or broth / scallion 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: tofu-scrambled-eggs | 豆腐炒蛋

```yaml
id: tofu-scrambled-eggs
type: recipe
status: candidate
name_zh: 豆腐炒蛋
name_en: Tofu and Eggs
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Chinese Tofu and Eggs
notes: Main category is tofu; egg supporting.
primary_role: protein
main_protein_category: tofu
main_protein_ingredient_ids:
- soft-tofu
supporting_protein_ingredient_ids:
- eggs
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0.5
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: soft-tofu
  role: main-protein
  availability: required
- ingredient_id: eggs
  role: supporting-protein
  availability: required
- pantry_core: soft tofu + egg + light soy/scallion
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 soft-tofu；准备 soft tofu + egg + light soy/scallion。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: steamed-soft-tofu-ginger-scallion | 葱姜清蒸嫩豆腐

```yaml
id: steamed-soft-tofu-ginger-scallion
type: recipe
status: candidate
name_zh: 葱姜清蒸嫩豆腐
name_en: Steamed Soft Tofu with Ginger and Scallion
tags:
- light-seasoning
- non-spicy-base
- steamed
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Cantonese Steamed Tofu with Ginger and Scallions
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: tofu
main_protein_ingredient_ids:
- soft-tofu
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0.5
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 8–15
meal_window_minutes: 10–20
elapsed_minutes: 10–25
advance_start_required: false
equipment:
- medium burner
- covered steamer / heatproof plate
burner_plan: Medium burner for covered steaming; high-output burner remains available.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: soft-tofu
  role: main-protein
  availability: required
- pantry_core: ginger / scallion / light soy; avoid heavy hot-oil pour
  role: seasoning
  availability: assumed
steps:
- 处理 soft-tofu；搭配 无固定蔬菜；按来源用 ginger / scallion / light soy; avoid heavy hot-oil pour 做短腌或铺料。
- 水开后上锅蒸；厚度/骨量变化时以实际熟度为准，不把来源分钟机械套用到不同切法。
- 出锅后按需要加入葱姜等清淡收尾；避免额外淋大量热油。
- 孩子份先去骨/剪小/确认没有硬壳或筋膜，再加成人后味。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: soft-tofu-soup | 嫩豆腐汤

```yaml
id: soft-tofu-soup
type: recipe
status: candidate
name_zh: 嫩豆腐汤
name_en: Soft Tofu Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau — tofu soup patterns; household soft-tofu soup simplified
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: tofu
main_protein_ingredient_ids:
- soft-tofu
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- chinese-greens
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- soup pot
burner_plan: Medium burner for simmering; can be started earlier and leave the wok burner free.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: soft-tofu
  role: main-protein
  availability: required
- ingredient_id: chinese-greens
  role: vegetable
  availability: required
- pantry_core: clear light broth / soft tofu / leafy green optional
  role: seasoning
  availability: assumed
steps:
- 处理 soft-tofu；蔬菜/主食配料为 chinese-greens。骨肉汤按来源需要先焯洗。
- 加水与 clear light broth / soft tofu / leafy green optional 中的基础香料，先把肉类煮/炖至接近软嫩。
- 按食材耐煮程度加入蔬菜或主食类块根；避免全部从一开始同煮导致过烂。
- 最后用轻盐调味；孩子份取软肉、软菜并去骨。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: simple-pan-seared-firm-tofu | 简单煎豆腐

```yaml
id: simple-pan-seared-firm-tofu
type: recipe
status: candidate
name_zh: 简单煎豆腐
name_en: Simple Pan-Seared Firm Tofu
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — pan-fried tofu technique
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: protein
main_protein_category: tofu
main_protein_ingredient_ids:
- firm-tofu
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0.5
  vegetable: 0
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: objective-possible-currently-unlikely
child_texture: firm tofu 可烹至较嫩，但孩子目前不吃 firm tofu。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: firm-tofu
  role: main-protein
  availability: required
- pantry_core: light soy or salt-light finish
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 firm-tofu；准备 light soy or salt-light finish。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 可少量提供；Meal Combo 另配孩子已接受的嫩豆腐/鸡蛋。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: mushroom-sauce-tofu | 蘑菇浇汁豆腐

```yaml
id: mushroom-sauce-tofu
type: recipe
status: candidate
name_zh: 蘑菇浇汁豆腐
name_en: Tofu with Mushroom Sauce
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-45
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Tofu Steak with Mushroom Ankake
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: mixed
main_protein_category: tofu
main_protein_ingredient_ids:
- firm-tofu
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- button-cremini-mushrooms
meal_contribution:
  protein: 0.5
  vegetable: 0.5
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: objective-possible-currently-unlikely
child_texture: firm tofu 可烹至较嫩，但孩子目前不吃 firm tofu。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: firm-tofu
  role: main-protein
  availability: required
- ingredient_id: button-cremini-mushrooms
  role: vegetable
  availability: required
- pantry_core: mushroom savory sauce / light soy or dashi-style ankake
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 firm-tofu；准备 mushroom savory sauce / light soy or dashi-style ankake。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 可少量提供；Meal Combo 另配孩子已接受的嫩豆腐/鸡蛋。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: homestyle-tofu-family | 家常豆腐家庭版

```yaml
id: homestyle-tofu-family
type: recipe
status: candidate
name_zh: 家常豆腐家庭版
name_en: Homestyle Tofu — Family Version
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- child-support-protein
- adult-finish-separate
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - The Woks of Life — Home Style Tofu; household family version removes chili-heavy base and lowers oil
notes: Family adaptation preserves home-style tofu stir-fry structure but not a chili-heavy or deep-fried route.
primary_role: mixed
main_protein_category: tofu
main_protein_ingredient_ids:
- firm-tofu
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- bell-pepper
meal_contribution:
  protein: 0.5
  vegetable: 0.5
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: objective-possible-currently-unlikely
child_texture: firm tofu 可烹至较嫩，但孩子目前不吃 firm tofu。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: firm-tofu
  role: main-protein
  availability: required
- ingredient_id: bell-pepper
  role: vegetable
  availability: required
- pantry_core: soy / garlic / mild savory sauce; chili removed from base and oil reduced
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 firm-tofu；蔬菜为 bell-pepper。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：soy / garlic / mild savory sauce; chili removed from base and oil reduced；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 可少量提供；Meal Combo 另配孩子已接受的嫩豆腐/鸡蛋。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: steamed-egg-tofu | 清蒸鸡蛋豆腐

```yaml
id: steamed-egg-tofu
type: recipe
status: candidate
name_zh: 清蒸鸡蛋豆腐
name_en: Steamed Egg Tofu
tags:
- light-seasoning
- non-spicy-base
- steamed
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - Just One Cookbook — Egg Tofu (Tamago Tofu); household uses purchased egg tofu rather than making it from scratch
  - 'Household-confirmed egg-tofu use: child eats egg tofu and texture is soft'
notes: Household uses purchased egg tofu; child eats it.
primary_role: protein
main_protein_category: tofu
main_protein_ingredient_ids:
- egg-tofu
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0.5
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 8–15
meal_window_minutes: 10–20
elapsed_minutes: 10–25
advance_start_required: false
equipment:
- medium burner
- covered steamer / heatproof plate
burner_plan: Medium burner for covered steaming; high-output burner remains available.
child_suitable: yes-user-confirmed
child_texture: egg tofu 质地软，且孩子会吃。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: egg-tofu
  role: main-protein
  availability: required
- pantry_core: purchased egg tofu + light soy/scallion/ginger
  role: seasoning
  availability: assumed
steps:
- 处理 egg-tofu；搭配 无固定蔬菜；按来源用 purchased egg tofu + light soy/scallion/ginger 做短腌或铺料。
- 水开后上锅蒸；厚度/骨量变化时以实际熟度为准，不把来源分钟机械套用到不同切法。
- 出锅后按需要加入葱姜等清淡收尾；避免额外淋大量热油。
- 孩子份先去骨/剪小/确认没有硬壳或筋膜，再加成人后味。
child_serving: 切成易入口的小块，保留清淡软嫩部分。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: simple-pan-seared-egg-tofu | 简单煎鸡蛋豆腐

```yaml
id: simple-pan-seared-egg-tofu
type: recipe
status: candidate
name_zh: 简单煎鸡蛋豆腐
name_en: Simple Pan-Seared Egg Tofu
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - Just One Cookbook — Egg Tofu (Tamago Tofu); household uses purchased egg tofu rather than making it from scratch
  - 'Household-confirmed egg-tofu use: child eats egg tofu and texture is soft'
notes: Use gentle pan-sear so the center stays soft; child eats egg tofu.
primary_role: protein
main_protein_category: tofu
main_protein_ingredient_ids:
- egg-tofu
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0.5
  vegetable: 0
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 8–15
meal_window_minutes: 10–20
elapsed_minutes: 10–25
advance_start_required: false
equipment:
- medium burner
- nonstick pan or iron pan as appropriate
burner_plan: Medium burner by default; use the iron pan/high-output burner only when a hard sear is the point of the dish.
child_suitable: yes-user-confirmed
child_texture: egg tofu 质地软，且孩子会吃。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: egg-tofu
  role: main-protein
  availability: required
- pantry_core: purchased egg tofu + thin oil + light soy finish
  role: seasoning
  availability: assumed
steps:
- 擦干并按菜式处理 egg-tofu；准备 purchased egg tofu + thin oil + light soy finish。
- 锅中只用薄层油，分批煎/煎封，避免锅温因一次装太满而明显下降。
- 主料达到合适熟度后离火或转小火；需要酱汁时在最后短时间挂汁。
- 静置或稍降温后再为孩子剪小；不要把成人后加辣味放进基础锅。
child_serving: 切成易入口的小块，保留清淡软嫩部分。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

## 5.8 Staple-centered (13)

### recipe: egg-fried-rice | 蛋炒饭

```yaml
id: egg-fried-rice
type: recipe
status: candidate
name_zh: 蛋炒饭
name_en: Egg Fried Rice
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Made With Lau — Egg Fried Rice
notes: Rice carried in recipe; fresh or leftover rice may be used according to source route.
primary_role: mixed
main_protein_category: egg
main_protein_ingredient_ids:
- eggs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0.5
  vegetable: 0
  staple: 1
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids:
- rice
recommended_staple_ingredient_ids: []
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: eggs
  role: main-protein
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- pantry_core: egg / rice / scallion / light soy optional
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 eggs；蔬菜为 无固定蔬菜。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：egg / rice / scallion / light soy optional；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: corn-rice | 玉米饭

```yaml
id: corn-rice
type: recipe
status: candidate
name_zh: 玉米饭
name_en: Corn Rice
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-45
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Corn Rice
notes: Corn and rice together carry staple role.
primary_role: staple
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0
  vegetable: 0
  staple: 1
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids:
- corn
- rice
recommended_staple_ingredient_ids: []
active_minutes: 10–20
meal_window_minutes: 10–20
elapsed_minutes: 30–50
advance_start_required: false
equipment:
- medium burner
- covered pot
burner_plan: Covered pot on medium burner; no second burner required for the recipe itself.
child_suitable: n/a
child_texture: 本 Recipe 不承担 main protein；儿童适配主要取决于主食/蔬菜质地。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: corn
  role: integral-staple
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- pantry_core: rice + corn + light salt/butter optional
  role: seasoning
  availability: assumed
steps:
- 洗米并处理 corn 及配料；准备 rice + corn + light salt/butter optional。
- 需要先煸香/轻煎的配料用少量油处理，然后与米同锅。
- 按引用来源的锅具路线把米饭焖熟；家庭版若改变米量/锅具，不写死未经测试的水比。
- 关火后按需要焖放，再轻轻拌匀上桌。
child_serving: 作为主食/配菜使用，Meal Combo 必须另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: sweet-potato-rice | 红薯饭

```yaml
id: sweet-potato-rice
type: recipe
status: candidate
name_zh: 红薯饭
name_en: Sweet Potato Rice
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-45
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Japanese Sweet Potato Rice
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: staple
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0
  vegetable: 0
  staple: 1
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids:
- sweet-potato
- rice
recommended_staple_ingredient_ids: []
active_minutes: 10–20
meal_window_minutes: 10–20
elapsed_minutes: 30–50
advance_start_required: false
equipment:
- medium burner
- covered pot
burner_plan: Covered pot on medium burner; no second burner required for the recipe itself.
child_suitable: n/a
child_texture: 本 Recipe 不承担 main protein；儿童适配主要取决于主食/蔬菜质地。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: sweet-potato
  role: integral-staple
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- pantry_core: rice + sweet potato + light seasoning
  role: seasoning
  availability: assumed
steps:
- 洗米并处理 sweet-potato 及配料；准备 rice + sweet potato + light seasoning。
- 需要先煸香/轻煎的配料用少量油处理，然后与米同锅。
- 按引用来源的锅具路线把米饭焖熟；家庭版若改变米量/锅具，不写死未经测试的水比。
- 关火后按需要焖放，再轻轻拌匀上桌。
child_serving: 作为主食/配菜使用，Meal Combo 必须另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: yaki-udon | 炒乌冬

```yaml
id: yaki-udon
type: recipe
status: candidate
name_zh: 炒乌冬
name_en: Yaki Udon
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-45
- child-support-protein
- two-vegetable-ready
- stir-fried
- stovetop-wok
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Yaki Udon
notes: Staple-centered base version; main protein is added later by Meal Combo if desired.
primary_role: mixed
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- green-cabbage
- onion
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 1
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids:
- noodles
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- medium burner
- pot
- wok/nonstick pan if stir-fried
burner_plan: Pot on medium burner; use high-output wok only if the recipe is a stir-fried noodle.
child_suitable: n/a
child_texture: 本 Recipe 不承担 main protein；儿童适配主要取决于主食/蔬菜质地。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: green-cabbage
  role: vegetable
  availability: required
- ingredient_id: onion
  role: vegetable
  availability: required
- ingredient_id: noodles
  role: integral-staple
  availability: required
- pantry_core: soy-based yaki-udon sauce; household base non-spicy and light
  role: seasoning
  availability: assumed
steps:
- 处理 核心主食/蛋白 与 green-cabbage, onion；准备 soy-based yaki-udon sauce; household base non-spicy and light。
- 面条按种类煮至合适熟度并沥水；汤面则保留单独汤底。
- 炒面在高输出灶口快速合炒；汤面则把主料/蔬菜在汤中依次煮熟。
- 最后合并并调整清淡盐度；成人辣味另加。
child_serving: 作为主食/配菜使用，Meal Combo 必须另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: scallion-oil-noodles | 葱油拌面

```yaml
id: scallion-oil-noodles
type: recipe
status: candidate
name_zh: 葱油拌面
name_en: Scallion Oil Noodles
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: user-confirmed
  checked_on: '2026-08-11'
  scope: Household use/preference or retained household pattern confirmed; external source may additionally support technique
    where listed.
  sources:
  - The Woks of Life — Shanghai Scallion Oil Noodles; household uses ready-made canned scallion oil
notes: Household has ready-made canned scallion oil; do not model frying scallions from scratch.
primary_role: staple
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0
  vegetable: 0
  staple: 1
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids:
- noodles
recommended_staple_ingredient_ids: []
active_minutes: 8–15
meal_window_minutes: 10–20
elapsed_minutes: 10–25
advance_start_required: false
equipment:
- medium burner
- pot
- wok/nonstick pan if stir-fried
burner_plan: Pot on medium burner; use high-output wok only if the recipe is a stir-fried noodle.
child_suitable: n/a
child_texture: 本 Recipe 不承担 main protein；儿童适配主要取决于主食/蔬菜质地。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: noodles
  role: integral-staple
  availability: required
- pantry_core: ready-made canned scallion oil + light soy/sugar balance
  role: seasoning
  availability: assumed
steps:
- 处理 核心主食/蛋白 与 无固定蔬菜；准备 ready-made canned scallion oil + light soy/sugar balance。
- 面条按种类煮至合适熟度并沥水；汤面则保留单独汤底。
- 炒面在高输出灶口快速合炒；汤面则把主料/蔬菜在汤中依次煮熟。
- 最后合并并调整清淡盐度；成人辣味另加。
child_serving: 作为主食/配菜使用，Meal Combo 必须另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: scallion-oil-taro | 葱油芋头

```yaml
id: scallion-oil-taro
type: recipe
status: candidate
name_zh: 葱油芋头
name_en: Scallion Oil Taro
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Scallion Oil Taro
notes: Taro is the staple carried in recipe.
primary_role: staple
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0
  vegetable: 0
  staple: 1
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids:
- taro
recommended_staple_ingredient_ids: []
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: n/a
child_texture: 本 Recipe 不承担 main protein；儿童适配主要取决于主食/蔬菜质地。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: taro
  role: integral-staple
  availability: required
- pantry_core: scallion oil / light soy or salt
  role: seasoning
  availability: assumed
steps:
- 处理 核心主食/蛋白；按来源决定是否需要焯水或轻煎。
- 加入 scallion oil / light soy or salt 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 作为主食/配菜使用，Meal Combo 必须另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: lotus-root-fresh-wood-ear-stir-fry | 荷塘小炒 / 莲藕新鲜黑木耳

```yaml
id: lotus-root-fresh-wood-ear-stir-fry
type: recipe
status: candidate
name_zh: 荷塘小炒 / 莲藕新鲜黑木耳
name_en: Lotus Root Stir-fry with Fresh Wood Ear
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- child-support-protein
- two-vegetable-ready
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 临近上桌流程相对集中，便于与另一灶口并行。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Lotus Root Stir-fry; source explicitly includes wood ear mushrooms and bell pepper
notes: Source explicitly includes wood ear and bell pepper; household uses fresh wood ear, eliminating soaking.
primary_role: mixed
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- fresh-wood-ear-mushrooms
- bell-pepper
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 1
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids:
- lotus-root
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 30–45
elapsed_minutes: 35–60
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner for the wok; keep the medium burner free for a side/soup when possible.
child_suitable: n/a
child_texture: 本 Recipe 不承担 main protein；儿童适配主要取决于主食/蔬菜质地。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: lotus-root
  role: integral-staple
  availability: required
- ingredient_id: fresh-wood-ear-mushrooms
  role: vegetable
  availability: required
- ingredient_id: bell-pepper
  role: vegetable
  availability: required
- pantry_core: ginger / garlic / oyster-sauce style light sauce
  role: seasoning
  availability: assumed
steps:
- 按菜式需要处理 核心主食/蛋白；蔬菜为 lotus-root, fresh-wood-ear-mushrooms, bell-pepper。肉类需要嫩化/短腌时按引用来源执行。
- 先把核心调味准备好：ginger / garlic / oyster-sauce style light sauce；家庭版基底不放辣并降低盐油。
- 热锅少油，先把主要蛋白炒至接近熟并视需要盛出；再处理蔬菜/香料。
- 合回主料，加入调味快速翻匀，达到合适熟度即停火，避免为追求焦色延长烹调。
child_serving: 作为主食/配菜使用，Meal Combo 必须另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: japanese-simmered-kabocha | 日式煮南瓜

```yaml
id: japanese-simmered-kabocha
type: recipe
status: candidate
name_zh: 日式煮南瓜
name_en: Japanese Simmered Kabocha
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Japanese Simmered Kabocha
notes: Kabocha is staple in this project, not a vegetable slot.
primary_role: staple
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0
  vegetable: 0
  staple: 1
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids:
- kabocha-squash
recommended_staple_ingredient_ids: []
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner
- covered pot / braiser
burner_plan: Medium burner for covered braise; long passive phase does not occupy the high-output wok burner.
child_suitable: n/a
child_texture: 本 Recipe 不承担 main protein；儿童适配主要取决于主食/蔬菜质地。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: kabocha-squash
  role: integral-staple
  availability: required
- pantry_core: dashi / soy / small sugar
  role: seasoning
  availability: assumed
steps:
- 处理 核心主食/蛋白；按来源决定是否需要焯水或轻煎。
- 加入 dashi / soy / small sugar 和足以完成焖煮的液体；家庭版轻盐、不放辣。
- 盖锅低火焖至主料达到该菜式要求的软嫩程度；大块肉以质地而不是死守分钟数判断。
- 临近上桌再调整浓度与盐度；需要收汁时只收至能挂住食材，不做过咸浓缩。
child_serving: 作为主食/配菜使用，Meal Combo 必须另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: kabocha-rice-congee | 南瓜粥

```yaml
id: kabocha-rice-congee
type: recipe
status: candidate
name_zh: 南瓜粥
name_en: Kabocha Rice Congee
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Food & Wine — Kabocha Squash Congee (congee roundup)
notes: Candidate household route; exact seasoning quantities are intentionally left for first-cook calibration rather than
  invented.
primary_role: staple
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0
  vegetable: 0
  staple: 1
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids:
- kabocha-squash
- rice
recommended_staple_ingredient_ids: []
active_minutes: 10–20
meal_window_minutes: 10–20
elapsed_minutes: 40–75
advance_start_required: false
equipment:
- medium burner or 9-quart Instant Pot
- pot
burner_plan: Use medium burner or Instant Pot; keep seasoning/egg finishing near service.
child_suitable: n/a
child_texture: 本 Recipe 不承担 main protein；儿童适配主要取决于主食/蔬菜质地。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: kabocha-squash
  role: integral-staple
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- pantry_core: rice + kabocha + water; very light seasoning
  role: seasoning
  availability: assumed
steps:
- 洗米/准备燕麦与 kabocha-squash；准备 rice + kabocha + water; very light seasoning。
- 加水煮至粥体达到家庭喜欢的浓度；可用 Instant Pot 或普通锅，具体水比留给首次测试校准。
- 含鸡蛋的版本在后段加入并煮熟；南瓜等软主食在能煮软但不完全消失的时间点加入。
- 最后轻盐调味；成人后味另加。
child_serving: 作为主食/配菜使用，Meal Combo 必须另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: baked-sweet-potato | 烤红薯

```yaml
id: baked-sweet-potato
type: recipe
status: candidate
name_zh: 烤红薯
name_en: Baked Sweet Potato
tags:
- light-seasoning
- non-spicy-base
- roasted
- oven
- advance-start
- child-support-protein
- low-active-time
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 主烹调设备可释放灶口。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 需要提前启动或较长被动烹调时间。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Just One Cookbook — Baked Japanese Sweet Potatoes (Yaki Imo)
notes: Low-active-time staple; baking elapsed time is long but scheduling-flexible.
primary_role: staple
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0
  vegetable: 0
  staple: 1
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids:
- sweet-potato
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- gas oven
- sheet pan / baking dish
burner_plan: Oven carries the main cooking load and frees both stovetop burners.
child_suitable: n/a
child_texture: 本 Recipe 不承担 main protein；儿童适配主要取决于主食/蔬菜质地。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: sweet-potato
  role: integral-staple
  availability: required
- pantry_core: whole sweet potato; no added seasoning required
  role: seasoning
  availability: assumed
steps:
- 处理 核心主食/蛋白，准备 whole sweet potato; no added seasoning required；需要腌制的菜提前完成。
- 烤箱预热；食材单层放置，使用少量油或烘焙纸/烤架降低粘连。
- 按引用来源的厚度与熟度逻辑烤制；家庭实际切法不同则以熟度为准。
- 出炉后静置/拆骨/切小；成人酱汁或辣味在孩子份盛出后再加。
child_serving: 作为主食/配菜使用，Meal Combo 必须另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: savory-oat-egg-congee | 咸燕麦鸡蛋粥

```yaml
id: savory-oat-egg-congee
type: recipe
status: candidate
name_zh: 咸燕麦鸡蛋粥
name_en: Savory Oatmeal with Egg
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-30
- family-shared
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  - 可设计为全家共享基础口味。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - Epicurious / Simply Recipes — savory oatmeal with egg
notes: Oats carried as staple; egg is main protein per finalized rule.
primary_role: mixed
main_protein_category: egg
main_protein_ingredient_ids:
- eggs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0.5
  vegetable: 0
  staple: 1
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids:
- oats
recommended_staple_ingredient_ids: []
active_minutes: 15–25
meal_window_minutes: 20–35
elapsed_minutes: 20–40
advance_start_required: false
equipment:
- medium burner or 9-quart Instant Pot
- pot
burner_plan: Use medium burner or Instant Pot; keep seasoning/egg finishing near service.
child_suitable: 'yes'
child_texture: 可通过切薄、炖软、蒸嫩或剪小形成适合孩子的质地；当前无已知拒绝。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: eggs
  role: main-protein
  availability: required
- ingredient_id: oats
  role: integral-staple
  availability: required
- pantry_core: oats + egg + water/stock + light salt/scallion
  role: seasoning
  availability: assumed
steps:
- 洗米/准备燕麦与 无固定蔬菜；准备 oats + egg + water/stock + light salt/scallion。
- 加水煮至粥体达到家庭喜欢的浓度；可用 Instant Pot 或普通锅，具体水比留给首次测试校准。
- 含鸡蛋的版本在后段加入并煮熟；南瓜等软主食在能煮软但不完全消失的时间点加入。
- 最后轻盐调味；成人后味另加。
child_serving: 取较嫩、较淡的部分，必要时剪成小块。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: mantou | 馒头

```yaml
id: mantou
type: recipe
status: candidate
name_zh: 馒头
name_en: Mantou / Steamed Bun Staple
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-30
- child-support-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 与现有家庭食材/厨具兼容，重复使用价值较高。
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
evidence:
  level: reputable-general
  checked_on: '2026-08-11'
  scope: Dish identity and core technique verified; household-light/non-spicy adaptation is documented separately.
  sources:
  - The Woks of Life — Mantou / steamed bun references; household uses existing ready-made `steamed-buns` ingredient
notes: Keep simply as 馒头; do not expand into homemade dough production.
primary_role: staple
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids: []
meal_contribution:
  protein: 0
  vegetable: 0
  staple: 1
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids:
- steamed-buns
recommended_staple_ingredient_ids: []
active_minutes: 8–15
meal_window_minutes: 10–20
elapsed_minutes: 10–25
advance_start_required: false
equipment:
- steamer or microwave
burner_plan: Steam or microwave; no burner conflict if microwaved.
child_suitable: n/a
child_texture: 本 Recipe 不承担 main protein；儿童适配主要取决于主食/蔬菜质地。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: steamed-buns
  role: integral-staple
  availability: required
- pantry_core: existing ready-made steamed-buns ingredient
  role: seasoning
  availability: assumed
steps:
- 使用现有 `steamed-buns` 成品，不在本项目重复建“从面粉发酵做馒头”的复杂路线。
- 按包装允许方式蒸热；赶时间时可按家庭既有规则微波加热。
- 作为 staple 与主菜/蔬菜组合，不单独承担 main protein。
child_serving: 作为主食/配菜使用，Meal Combo 必须另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

### recipe: taro-rice | 芋头焖饭

```yaml
id: taro-rice
type: recipe
status: candidate
name_zh: 芋头焖饭
name_en: Taro Rice
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- advance-start
- child-support-protein
- two-vegetable-ready
fit:
  hard_rules: pass
  score: 3
  strengths: []
  tradeoffs:
  - Meal Combo 需要考虑额外软蛋白或儿童当前接受度。
  - 需要提前启动或较长被动烹调时间。
  - 已在 brainstorm 中标为第二优先度。
  - 家庭版包含明确的受控改编，需首次实做后再校准。
evidence:
  level: inferred
  checked_on: '2026-08-11'
  scope: Dish family/technique verified; this exact household adaptation is inferred and remains candidate until tested.
  sources:
  - The Woks of Life — Taro Rice (芋头焖饭); household adaptation uses fresh shiitake and lower-oil stovetop route
notes: Medium priority. Source uses dried shiitake and dried shrimp; household adaptation uses fresh shiitake, treats sausage
  as supporting flavor, and omits dried-shrimp dependency. Covered-pot route avoids inventing Instant Pot rice parameters.
primary_role: mixed
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids:
- chinese-sausage
vegetable_ingredient_ids:
- fresh-shiitake
- carrot
meal_contribution:
  protein: 0
  vegetable: 0.5
  staple: 1
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids:
- taro
- rice
recommended_staple_ingredient_ids: []
active_minutes: 20–35
meal_window_minutes: 20–35
elapsed_minutes: 90–180
advance_start_required: true
equipment:
- medium burner
- covered pot
burner_plan: Covered pot on medium burner; no second burner required for the recipe itself.
child_suitable: n/a
child_texture: 本 Recipe 不承担 main protein；儿童适配主要取决于主食/蔬菜质地。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: chinese-sausage
  role: supporting-protein
  availability: required
- ingredient_id: taro
  role: integral-staple
  availability: required
- ingredient_id: fresh-shiitake
  role: vegetable
  availability: required
- ingredient_id: carrot
  role: vegetable
  availability: required
- ingredient_id: rice
  role: integral-staple
  availability: required
- pantry_core: rice / taro / small amount Chinese sausage / fresh shiitake / carrot; lower-oil household route
  role: seasoning
  availability: assumed
steps:
- 洗米并处理 taro, fresh-shiitake, carrot 及配料；准备 rice / taro / small amount Chinese sausage / fresh shiitake / carrot; lower-oil
  household route。
- 需要先煸香/轻煎的配料用少量油处理，然后与米同锅。
- 按引用来源的锅具路线把米饭焖熟；家庭版若改变米量/锅具，不写死未经测试的水比。
- 关火后按需要焖放，再轻轻拌匀上桌。
child_serving: 作为主食/配菜使用，Meal Combo 必须另配软蛋白。
adult_finish: Optional chili/chili oil or stronger seasoning only after the child portion is removed; omit if the dish does
  not benefit from it.
substitutions: []
```

## 5.9 Vegetable-centered (23)

> Vegetable-centered library uses cooking-structure dedupe. `one_of` alternatives share one Recipe when the workflow is materially the same; seasoning-only differences such as “蒜蓉” vs “清炒” do not create duplicate stable IDs.

### recipe: simple-stir-fried-leafy-greens | 清炒叶菜

```yaml
id: simple-stir-fried-leafy-greens
type: recipe
status: candidate
name_zh: 清炒叶菜
name_en: Simple Stir-Fried Leafy Greens
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- low-prep
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V01 — Made With Lau — Choy Sum with Garlic; The Woks of Life — Bok Choy / Pea Tips stir-fry patterns
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- chinese-greens
- lettuce
- youmai-cai
- choy-sum
- pea-shoots
- amaranth-greens
- tong-hao
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: ingredient-dependent
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 10–20
meal_window_minutes: 10–25
elapsed_minutes: 10–30
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: conditional
child_texture: 茎叶厚度依实际 one_of Ingredient 而异；可切短、茎先下锅并煮至合适熟度。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - chinese-greens
  - lettuce
  - youmai-cai
  - choy-sum
  - pea-shoots
  - amaranth-greens
  - tong-hao
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions:
- 蒜蓉属于同一 cooking structure，不另建 Recipe。
```

### recipe: simple-stir-fried-broccoli | 清炒西兰花

```yaml
id: simple-stir-fried-broccoli
type: recipe
status: candidate
name_zh: 清炒西兰花
name_en: Simple Broccoli
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- soft-vegetable
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V02 — Made With Lau — Dad’s 10-Minute Weeknight Broccoli / Broccoli Stir Fry
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- broccoli
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 10–20
meal_window_minutes: 10–25
elapsed_minutes: 10–30
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: 'yes'
child_texture: 孩子份可将花梗剪小并比成人份多煮 1–2 分钟至更软；成熟来源明确给出幼儿/老人软化路线。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: broccoli
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: blanched-gai-lan-oyster-sauce | 白灼 / 蚝油芥兰

```yaml
id: blanched-gai-lan-oyster-sauce
type: recipe
status: candidate
name_zh: 白灼 / 蚝油芥兰
name_en: Blanched Gai Lan with Oyster Sauce
tags:
- light-seasoning
- non-spicy-base
- stovetop-wok
- lunch-30
- low-prep
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V03 — Made With Lau — Chinese Broccoli with Oyster Sauce
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- gai-lan
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 10–20
meal_window_minutes: 15–25
elapsed_minutes: 15–30
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: conditional
child_texture: 芥兰茎较粗，虽可煮软/切小，但未确认当前儿童接受度，暂不计 Child Vegetable coverage。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: gai-lan
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: fermented-bean-curd-water-spinach | 腐乳空心菜

```yaml
id: fermented-bean-curd-water-spinach
type: recipe
status: candidate
name_zh: 腐乳空心菜
name_en: Water Spinach with Fermented Bean Curd
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V04 — Made With Lau — Ong Choy with Fermented Bean Curd
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- water-spinach
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–30
elapsed_minutes: 20–35
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: conditional
child_texture: 空心菜茎可能较纤维，且腐乳味型较强；未确认孩子接受度，暂不计 coverage。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: water-spinach
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: sesame-spinach-gomaae | 芝麻拌菠菜

```yaml
id: sesame-spinach-gomaae
type: recipe
status: candidate
name_zh: 芝麻拌菠菜
name_en: Japanese Spinach Gomaae
tags:
- light-seasoning
- non-spicy-base
- lunch-30
- low-prep
- soft-vegetable
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V05 — Just One Cookbook — Japanese Spinach Salad with Sesame Dressing (Gomaae)
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- spinach
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 10–15
meal_window_minutes: 15–20
elapsed_minutes: 15–20
advance_start_required: false
equipment:
- medium burner
- pot / saucepan
burner_plan: Medium burner for blanching; no wok required.
child_suitable: 'yes'
child_texture: 菠菜先焯水并挤水、切短，符合家庭去草酸 workflow；孩子份可少酱、剪短。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: spinach
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 菠菜用足量水焯至合适熟度后捞出；该路线同时满足家庭菠菜去草酸处理要求。
- 冷却/挤去多余水分并切短。
- 拌入轻量芝麻酱汁；家庭版控制糖盐，孩子份可更淡。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: broth-simmered-napa-cabbage | 上汤 / 汤煮娃娃菜

```yaml
id: broth-simmered-napa-cabbage
type: recipe
status: candidate
name_zh: 上汤 / 汤煮娃娃菜
name_en: Napa Cabbage in Savory Broth
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- lunch-30
- soft-vegetable
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V06 — Chinese 上汤娃娃菜 / savory-broth baby napa cabbage household cooking references
notes: 保留“汤煮嫩白菜”结构；不强制火腿、皮蛋等较重上汤配料，家庭版可用清汤/水 + 轻调味。
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- baby-napa-cabbage
- napa-cabbage
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 10–15
meal_window_minutes: 20–30
elapsed_minutes: 20–35
advance_start_required: false
equipment:
- medium burner
- pot / deep pan
burner_plan: Medium burner for a shallow broth simmer; high-output burner remains free.
child_suitable: 'yes'
child_texture: 娃娃菜/白菜汤煮后可形成软质叶菜；孩子份用清淡汤底并剪小。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - baby-napa-cabbage
  - napa-cabbage
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: vinegar-napa-cabbage-family | 醋溜白菜家庭版

```yaml
id: vinegar-napa-cabbage-family
type: recipe
status: candidate
name_zh: 醋溜白菜家庭版
name_en: Vinegar Napa Cabbage, Family Style
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V07 — The Woks of Life — Hot & Sour Napa Cabbage Stir-fry; household version omits chili
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- napa-cabbage
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–20
meal_window_minutes: 15–25
elapsed_minutes: 15–30
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: 'yes'
child_texture: 白菜切片后可炒至较软；孩子份保持轻醋轻盐、无辣。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: napa-cabbage
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: spinach-scrambled-eggs | 菠菜炒蛋

```yaml
id: spinach-scrambled-eggs
type: recipe
status: candidate
name_zh: 菠菜炒蛋
name_en: Spinach and Scrambled Eggs
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- family-shared
- soft-protein
- soft-vegetable
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V08 — Omnivore’s Cookbook — Spinach and Egg Stir Fry
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: mixed
main_protein_category: egg
main_protein_ingredient_ids:
- eggs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- spinach
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 10–15
meal_window_minutes: 15–20
elapsed_minutes: 15–25
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: 'yes'
child_texture: 菠菜按家庭规则先焯水；鸡蛋保持嫩，菠菜切短。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: spinach
  role: vegetable
  availability: required
- ingredient_id: eggs
  role: main-protein
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: shepherds-purse-soft-tofu-soup | 荠菜豆腐羹

```yaml
id: shepherds-purse-soft-tofu-soup
type: recipe
status: candidate
name_zh: 荠菜豆腐羹
name_en: Shepherd’s Purse and Soft Tofu Soup
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- lunch-30
- family-shared
- soft-protein
- soft-vegetable
- low-prep
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V09 — Chinese 荠菜豆腐羹 household cooking pattern; soft-tofu soup structure verified elsewhere in KB
notes: 冷冻荠菜末可按家庭已确认习惯当场使用；不要求提前解冻。
primary_role: mixed
main_protein_category: tofu
main_protein_ingredient_ids:
- soft-tofu
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- frozen-shepherds-purse
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 10–15
meal_window_minutes: 15–25
elapsed_minutes: 15–30
advance_start_required: false
equipment:
- medium burner
- pot
burner_plan: Medium burner for short soup simmer; high-output burner remains free.
child_suitable: 'yes'
child_texture: 嫩豆腐与冷冻荠菜末均可形成软质羹/汤；孩子份保持清淡。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: frozen-shepherds-purse
  role: vegetable
  availability: required
- ingredient_id: soft-tofu
  role: main-protein
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: tomato-cauliflower-stir-fry | 番茄花菜

```yaml
id: tomato-cauliflower-stir-fry
type: recipe
status: candidate
name_zh: 番茄花菜
name_en: Tomato Cauliflower Stir-Fry
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V10 — Omnivore’s Cookbook — Stir-Fried Cauliflower with Tomato Sauce
notes: '虽然含两种 Vegetable Ingredient，整盘仍按一个 Vegetable side 记 `vegetable: 1`。'
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- cauliflower
- tomato
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–20
meal_window_minutes: 20–30
elapsed_minutes: 20–30
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: 'yes'
child_texture: 花菜可比成人份多焯/煮至更软，番茄形成湿润酱汁；剪成小朵。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: cauliflower
  role: vegetable
  availability: required
- ingredient_id: tomato
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: simple-stir-fried-green-cabbage | 清炒卷心菜

```yaml
id: simple-stir-fried-green-cabbage
type: recipe
status: candidate
name_zh: 清炒卷心菜
name_en: Simple Stir-Fried Green Cabbage
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- low-prep
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V11 — The Woks of Life — cabbage stir-fry collection / everyday cabbage cooking patterns
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- green-cabbage
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 10–15
meal_window_minutes: 15–20
elapsed_minutes: 15–25
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: 'yes'
child_texture: 切细并炒至柔软；孩子份避免保留过硬菜梗。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: green-cabbage
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: braised-winter-melon | 冬瓜焖 / 烧

```yaml
id: braised-winter-melon
type: recipe
status: candidate
name_zh: 冬瓜焖 / 烧
name_en: Braised Winter Melon
tags:
- light-seasoning
- non-spicy-base
- braised
- stovetop-wok
- lunch-45
- soft-vegetable
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V12 — The Woks of Life — Braised Winter Melon
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- winter-melon
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 30–40
elapsed_minutes: 30–45
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: 'yes'
child_texture: 冬瓜焖至半透明柔软，适合剪成小块。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: winter-melon
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: squash-scrambled-eggs | 瓜类炒蛋

```yaml
id: squash-scrambled-eggs
type: recipe
status: candidate
name_zh: 瓜类炒蛋
name_en: Squash and Scrambled Eggs
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- family-shared
- soft-protein
- soft-vegetable
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V13 — Chinese loofah + egg household pattern; Omnivore’s Cookbook zucchini stir-fry; common Chinese vegetable+egg
    structure
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: mixed
main_protein_category: egg
main_protein_ingredient_ids:
- eggs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- luffa
- zucchini
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–20
meal_window_minutes: 15–25
elapsed_minutes: 15–30
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: 'yes'
child_texture: 丝瓜/西葫芦都可炒至柔软；鸡蛋保持嫩。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - luffa
  - zucchini
  role: vegetable
  availability: required
- ingredient_id: eggs
  role: main-protein
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions:
- 丝瓜更易出水；西葫芦切片后水分管理不同，但属于同一瓜类炒蛋 structure。
```

### recipe: steamed-eggplant | 蒸茄子

```yaml
id: steamed-eggplant
type: recipe
status: candidate
name_zh: 蒸茄子
name_en: Steamed Eggplant
tags:
- light-seasoning
- non-spicy-base
- steamed
- stovetop-nonstick
- lunch-45
- soft-vegetable
- low-active-time
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V14 — Made With Lau — steamed eggplant technique within Eggplant with Garlic Sauce
notes: 采用蒸制主体以符合家庭低油规则；不复制来源中后续辣味/重酱鱼香步骤。
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- eggplant
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 25–40
elapsed_minutes: 25–45
advance_start_required: false
equipment:
- medium burner
- steamer / pot + rack
burner_plan: Medium burner for steaming; avoids oil-heavy wok eggplant route.
child_suitable: 'yes'
child_texture: 蒸至软嫩后非常容易剪小；孩子份使用清淡酱汁。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: eggplant
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: japanese-simmered-daikon | 日式煮白萝卜

```yaml
id: japanese-simmered-daikon
type: recipe
status: candidate
name_zh: 日式煮白萝卜
name_en: Japanese-Style Simmered Daikon
tags:
- light-seasoning
- non-spicy-base
- simmered
- stovetop-nonstick
- lunch-45
- soft-vegetable
- low-active-time
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V15 — Just One Cookbook — Japanese daikon simmering references (Buri Daikon / daikon soup patterns)
notes: 定义为清淡日式煮萝卜 household structure，不绑定鱼类或肉类。
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- daikon
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: true
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 10–15
meal_window_minutes: 30–50
elapsed_minutes: 30–60
advance_start_required: false
equipment:
- medium burner
- pot
burner_plan: Medium burner for gentle simmer; mostly unattended after prep.
child_suitable: 'yes'
child_texture: 白萝卜煮至可轻易穿透并切小；孩子份用淡汤汁。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: daikon
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: celtuce-fresh-wood-ear-stir-fry | 莴笋炒新鲜木耳

```yaml
id: celtuce-fresh-wood-ear-stir-fry
type: recipe
status: candidate
name_zh: 莴笋炒新鲜木耳
name_en: Celtuce with Fresh Wood Ear Mushrooms
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-45
- medium-prep
fit:
  hard_rules: pass
  score: 3
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V16 — The Woks of Life — Stir-Fried Celtuce with Wood Ear Mushrooms
notes: 使用家庭固定的 fresh-wood-ear-mushrooms，不含干木耳泡发；莴笋备菜本身仍有一定工作量。
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- celtuce
- fresh-wood-ear-mushrooms
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 20–30
meal_window_minutes: 25–40
elapsed_minutes: 30–45
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: conditional
child_texture: 莴笋偏脆、新鲜木耳有弹性；虽然可切小，但当前不计 Child Vegetable coverage。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: celtuce
  role: vegetable
  availability: required
- ingredient_id: fresh-wood-ear-mushrooms
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: simple-stir-fried-sugar-snap-peas | 清炒甜豆

```yaml
id: simple-stir-fried-sugar-snap-peas
type: recipe
status: candidate
name_zh: 清炒甜豆
name_en: Simple Stir-Fried Sugar Snap Peas
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- low-prep
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V17 — Standard stir-fried sugar snap pea side-dish references
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- sugar-snap-peas
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 10–15
meal_window_minutes: 10–20
elapsed_minutes: 10–25
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: conditional
child_texture: 甜豆通常保留脆度，可能有筋；未确认儿童接受度，暂不计 coverage。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: sugar-snap-peas
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: chive-scrambled-eggs | 韭菜类炒蛋

```yaml
id: chive-scrambled-eggs
type: recipe
status: candidate
name_zh: 韭菜类炒蛋
name_en: Chives and Scrambled Eggs
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- family-shared
- soft-protein
fit:
  hard_rules: pass
  score: 5
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V18 — Omnivore’s Cookbook — Chinese Chive and Egg / Yellow Chives and Eggs Stir Fry
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: mixed
main_protein_category: egg
main_protein_ingredient_ids:
- eggs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- yellow-chives
- garlic-chives
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 10–15
meal_window_minutes: 10–20
elapsed_minutes: 10–20
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: conditional
child_texture: 鸡蛋可保持嫩；韭菜/韭黄有纤维，未确认孩子可承担完整 Vegetable coverage。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - yellow-chives
  - garlic-chives
  role: vegetable
  availability: required
- ingredient_id: eggs
  role: main-protein
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions:
- yellow-chives 与 garlic-chives 共用炒蛋 structure，清洗/切段细节按实际 Ingredient 调整。
```

### recipe: celery-pressed-tofu-stir-fry | 西芹香干

```yaml
id: celery-pressed-tofu-stir-fry
type: recipe
status: candidate
name_zh: 西芹香干
name_en: Celery and Pressed Tofu Stir-Fry
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V19 — Omnivore’s Cookbook — Dried Tofu and Celery Stir Fry; vegetarian route omits optional pork
notes: pressed-tofu 继续保持 supporting protein，不升级为 tofu-main base；家庭版不加来源中的可选猪肉。
primary_role: mixed
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids:
- pressed-tofu
vegetable_ingredient_ids:
- celery
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–20
meal_window_minutes: 15–25
elapsed_minutes: 15–30
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: conditional
child_texture: 香干与西芹都偏有嚼劲；supporting tofu 不自动视为儿童软蛋白。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: celery
  role: vegetable
  availability: required
- ingredient_id: pressed-tofu
  role: supporting-protein
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: shiitake-chinese-greens-stir-fry | 香菇青菜

```yaml
id: shiitake-chinese-greens-stir-fry
type: recipe
status: candidate
name_zh: 香菇青菜
name_en: Shiitake Mushrooms with Chinese Greens
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V20 — The Woks of Life — Braised Chinese Mushrooms with Bok Choy / mushroom-greens pattern
notes: '香菇 + 青菜整体仍按 `vegetable: 1`；不因两个 Vegetable Ingredient 自动变成 V2。'
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- fresh-shiitake
- chinese-greens
- choy-sum
- gai-lan
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: ingredient-dependent
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 20–30
elapsed_minutes: 20–35
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: conditional
child_texture: 青菜端依实际 Ingredient；香菇可切薄，孩子可只取适合的青菜部分。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: fresh-shiitake
  role: vegetable
  availability: required
- one_of:
  - chinese-greens
  - choy-sum
  - gai-lan
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: pan-seared-mushrooms | 香煎菌菇

```yaml
id: pan-seared-mushrooms
type: recipe
status: candidate
name_zh: 香煎菌菇
name_en: Pan-Seared Mushrooms
tags:
- light-seasoning
- non-spicy-base
- pan-seared
- stovetop-nonstick
- lunch-30
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V21 — Omnivore’s Cookbook — King Oyster Mushroom / simple mushroom searing patterns
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- king-oyster-mushrooms
- button-cremini-mushrooms
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–25
meal_window_minutes: 15–30
elapsed_minutes: 15–35
advance_start_required: false
equipment:
- medium burner
- nonstick skillet
burner_plan: Medium burner with nonstick skillet; sear in a single layer when practical.
child_suitable: conditional
child_texture: 菌菇普遍有一定弹性/嚼劲；未确认当前儿童接受度，暂不计 coverage。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - king-oyster-mushrooms
  - button-cremini-mushrooms
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions:
- 杏鲍菇切厚片/条；口蘑切片或对半。出水速度不同，但共享煎出焦香后轻调味的 structure。
```

### recipe: japanese-steamed-braised-mushrooms | 日式菌菇蒸 / 焖

```yaml
id: japanese-steamed-braised-mushrooms
type: recipe
status: candidate
name_zh: 日式菌菇蒸 / 焖
name_en: Japanese-Style Steamed Mushrooms
tags:
- light-seasoning
- non-spicy-base
- stovetop-nonstick
- lunch-45
- low-active-time
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: reputable-general
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V22 — Just One Cookbook — Miso Butter Mushrooms in Foil
notes: 核心是 covered steam/braise mushroom structure；味噌黄油可作为 variation，家庭版保持轻盐。
primary_role: vegetable
main_protein_category: none
main_protein_ingredient_ids: []
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- fresh-shiitake
- oyster-mushrooms
- shimeji-mushrooms
- enoki-mushrooms
- maitake
meal_contribution:
  protein: 0
  vegetable: 1
  staple: 0
child_coverage:
  protein: false
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 10–15
meal_window_minutes: 25–35
elapsed_minutes: 25–40
advance_start_required: false
equipment:
- medium burner
- covered skillet / foil packet
burner_plan: Medium burner; covered steam/braise route is mostly unattended after packing.
child_suitable: conditional
child_texture: 不同菌菇质地差异大，尤其金针菇等不自动视为儿童 Vegetable coverage。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- one_of:
  - fresh-shiitake
  - oyster-mushrooms
  - shimeji-mushrooms
  - enoki-mushrooms
  - maitake
  role: vegetable
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```

### recipe: oyster-mushroom-scrambled-eggs | 平菇炒蛋

```yaml
id: oyster-mushroom-scrambled-eggs
type: recipe
status: candidate
name_zh: 平菇炒蛋
name_en: Oyster Mushrooms with Scrambled Eggs
tags:
- light-seasoning
- non-spicy-base
- stir-fried
- stovetop-wok
- lunch-30
- family-shared
- soft-protein
fit:
  hard_rules: pass
  score: 4
  strengths:
  - 补充 Vegetable-centered coverage，能直接参与动态 Meal Builder。
  - 与家庭现有轻盐、少油、无辣 base 和现有厨具兼容。
  tradeoffs: []
evidence:
  level: inferred
  checked_on: '2026-08-12'
  scope: Dish identity/core technique verified or conservatively inferred from cited mature household cooking patterns;
    timing is source-derived or workflow-derived range, not household stopwatch data.
  sources:
  - V23 — Omnivore’s Cookbook — Easy Oyster Mushroom Stir-Fry + established Chinese vegetable-and-egg stir-fry pattern
notes: Candidate Vegetable-centered route; exact household seasoning quantities remain for Cook View / first-cook
  calibration.
primary_role: mixed
main_protein_category: egg
main_protein_ingredient_ids:
- eggs
supporting_protein_ingredient_ids: []
vegetable_ingredient_ids:
- oyster-mushrooms
meal_contribution:
  protein: 0.5
  vegetable: 1
  staple: 0
child_coverage:
  protein: true
  vegetable: false
integral_staple_ingredient_ids: []
recommended_staple_ingredient_ids:
- rice
active_minutes: 15–20
meal_window_minutes: 15–25
elapsed_minutes: 15–30
advance_start_required: false
equipment:
- high-output burner
- wok / iron pan
burner_plan: High-output burner with wok / iron pan; keep the medium burner free when possible.
child_suitable: conditional
child_texture: 鸡蛋可保持嫩；平菇本身有一定嚼劲，因此儿童 Protein 可满足但 Vegetable coverage 暂不计。
spicy_in_base: false
deep_fried: false
salt_level: light
oil_level: light
servings: 3
detail_level: discoverable
ingredients:
- ingredient_id: oyster-mushrooms
  role: vegetable
  availability: required
- ingredient_id: eggs
  role: main-protein
  availability: required
- pantry_core: light salt / neutral oil / common aromatics and sauce components appropriate to the verified structure
  role: seasoning
  availability: assumed
steps:
- 按实际选中的 required / one_of Ingredient 清洗、修整并切成适合该 cooking structure 的大小。
- 按成熟菜式的核心 technique 处理；家庭版保持轻盐、少油、无辣 base。
- 根据蔬菜含水量与茎叶厚度控制顺序和火候，达到合适熟度即停火，避免为追求焦色而过度加热。
child_serving: 优先取较软、较淡、易剪小的部分；若该 record 的 Child coverage 为 ingredient-dependent/false/unknown，不因此自动计入 Meal completion。
adult_finish: Adult heat or stronger seasoning may be added only after the child portion is removed; omit if unnecessary.
substitutions: []
```


# 6. CANDIDATE MEAL COMBO PATTERN

## instant-pot-party-wings-rice-pot-in-pot

```yaml
id: instant-pot-party-wings-rice-pot-in-pot
type: meal-combo
status: candidate
recipe_ids:
  - instant-pot-thirteen-spice-soy-party-wings
main_protein_category: chicken
staple: rice
tags:
  - instant-pot
  - pot-in-pot
  - one-pot
  - low-active-time
  - family-shared
  - non-spicy-base
pattern:
  lower: Party Wings + sauce/liquid
  upper: elevated stainless-steel container with rice
pressure_segment_household_pattern: approximately 10–15 minutes
exact_release: recipe-specific / not fixed
exact_lower_liquid: recipe-specific / not fixed
exact_rice_water_ratio: recipe-specific / not fixed
notes: Household commonly uses this lower-meat / upper-rice pattern. Exact parameters are first-cook/test data, not a reason to block the underlying Recipe.
```

# 7. RESEARCH SOURCE REGISTRY

Checked dates: Pork legacy sources were originally checked 2026-08-08; non-Pork formalization sources and supplemental checks were reviewed 2026-08-11; Vegetable-centered sources V01–V23 were reviewed 2026-08-12. Scope is culinary identity/core technique, not retailer inventory or household preference unless explicitly stated.
- **P-S1** — The Woks of Life — Moo Shu Pork: The Authentic Chinese Recipe
- **P-S2** — Just One Cookbook — Ginger Pork (Shogayaki)
- **P-S3** — 豆果美食 / 下厨房 — 天津锅塌里脊 / 锅塌里脊
- **P-S4** — The Woks of Life — Lion’s Head Meatballs; 下厨房 — 清炖狮子头
- **P-S5** — Bon Appétit — Chinese Steamed Pork Patty
- **P-S6** — PBS Food / Made With Lau — Chinese Steamed Eggs with Minced Pork
- **P-S7** — The Woks of Life — Chinese Winter Melon Soup with Meatballs
- **P-S8** — The Woks of Life — Taiwanese Braised Minced Pork (肉燥饭)
- **P-S9** — 下厨房 — 少油版肉末茄子
- **P-S10** — The Woks of Life — Char Siu (Chinese BBQ Pork)
- **P-S11** — The Woks of Life — Shanghai-Style Braised Pork Belly (Hong Shao Rou)
- **P-S12** — Just One Cookbook — Kakuni (Braised Pork Belly)
- **P-S13** — Vietnamese Thịt Kho references — pork + eggs + coconut-water/fish-sauce caramel braise
- **P-S14** — Filipino Pork Adobo references — vinegar/soy/garlic braise
- **P-S15** — Just One Cookbook — Mille-Feuille Nabe
- **P-S16** — The Woks of Life — Shanghai Sweet and Sour Ribs
- **P-S17** — The Woks of Life — Dim Sum Steamed Spare Ribs with Black Beans
- **P-S18** — The Woks of Life — Winter Melon Soup with Pork Ribs
- **P-S19** — The Woks of Life — Lotus Root & Pork Soup
- **P-S20** — The Woks of Life — Braised Pork Chops, Shanghai-style
- **P-S21** — Omnivore’s Cookbook — Chinese Braised Pork Trotters
- **P-S22** — The Woks of Life — Cantonese Pork Knuckles with Ginger and Vinegar
- **P-M1** — User-confirmed household pattern — mushroom pork slices stir-fry
- **P-M2** — User-confirmed household pattern — 酱丁 (ground pork + pressed tofu)
- **P-M3** — User-confirmed household pattern — ground pork + Chinese greens
- **P-M4** — Made With Lau — Mapo Tofu with Pork; used only to verify ground-pork + soft-tofu structure, with chili/bean-sauce identity not carried into household 肉末豆腐
- **P-M5** — The Woks of Life — Chinese pork-bone soup / rib-soup patterns with tomato, potato and corn
- **P-M6** — Reputable Chinese home-cooking references — daikon pork rib soup
- **P-M7** — The Woks of Life — Cantonese pork soup with carrot / Chinese yam pattern
- **P-U1** — User-confirmed household recipe/preference — non-deep-fried 糖醋里脊
- **P-U2** — The Woks of Life — Shredded Pork Stir-Fry with Sweet Bean Sauce; plus user-confirmed household preference
- **P-U3** — The Woks of Life — Five Spice Tofu with Shredded Pork; plus user-confirmed household preference
- **P-U4** — 下厨房 — 韭黄香干肉丝; plus user-confirmed household preference
- **C01** — Just One Cookbook — Chicken Teriyaki
- **C02** — Just One Cookbook — Oyakodon (Chicken and Egg Bowl)
- **C03** — Made With Lau — Chicken & Broccoli Stir-fry
- **C04** — The Woks of Life — Moo Goo Gai Pan / Chicken with Chinese Broccoli & Mushrooms (chicken-mushroom stir-fry structure)
- **C05** — Just One Cookbook — Butter Shoyu Chicken
- **C06** — Made With Lau — Easy Pan-Fried Chicken Breast
- **C07** — Instant Pot official chicken-thigh pressure-cooking recipes; household soy route adaptation
- **C08** — Household-confirmed Instant Pot Party Wings pattern; current user update 2026-08-11
- **C09** — The Woks of Life — Oyster Sauce Chicken
- **C10** — RecipeTin Eats — Filipino Chicken Adobo
- **C11** — The Woks of Life — baked chicken wings
- **C12** — Just One Cookbook — Baked Chicken Katsu
- **C13** — Serious Eats — Air-Fryer Chicken Thighs (editors’ air-fryer recipe collection)
- **C14** — The Woks of Life / Made With Lau — steamed chicken with mushrooms; fresh wood-ear substitution per household handoff
- **C15** — Made With Lau — steamed chicken with mushroom and Chinese sausage
- **C16** — The Woks of Life — Chicken & Shiitake Udon Noodle Soup
- **C17** — The Woks of Life — Coca-Cola Chicken Wings
- **C18** — Christine’s Recipes / Hong Kong home-cooking references — Swiss Chicken Wings
- **C19** — Made With Lau — White Cut Chicken
- **C20** — Made With Lau — Soy Sauce Chicken
- **C21** — The Woks of Life — Hainan Chicken and Rice
- **B01** — The Woks of Life — Beef & Mushroom Stir-fry
- **B02** — The Woks of Life — Beef Tomato Stir-fry
- **B03** — The Woks of Life — Beef & Broccoli
- **B04** — The Woks of Life — Beef with Chinese Broccoli (Gai Lan)
- **B05** — The Woks of Life — Scallion Beef
- **B06** — The Woks of Life — Oyster Sauce Beef
- **B07** — Omnivore’s Cookbook — Cumin Beef; household adaptation omits chili from base
- **B08** — User-retained household pattern — ground beef + Chinese greens
- **B09** — Just One Cookbook — Gyudon
- **B10** — Just One Cookbook — Niku Udon
- **B11** — The Woks of Life — Tomato Hot Pot with Beef; used for tomato + thin-beef soup structure
- **B12** — Just One Cookbook — Sukiyaki Don
- **B13** — Just One Cookbook — Nikujaga
- **B14** — Made With Lau — Minced Beef with Rice / 窝蛋免治牛肉飯
- **B15** — Just One Cookbook — Hambagu / Wafu Hambagu
- **B16** — Common frozen beef patty burger household technique; candidate convenience pattern
- **B17** — The Woks of Life — Chinese Braised Beef with Daikon
- **B18** — Chinese home-style potato braised beef references; same braising family as red-braised beef
- **B19** — The Woks of Life — Red Braised Beef
- **B20** — The Woks of Life — Braised Beef Noodle Soup
- **B21** — The Woks of Life — Braised Beef Shank
- **B22** — Instant Pot official oxtail soup pressure-cooking references
- **B23** — Korean Bapsang — LA Galbi
- **B24** — Korean Bapsang — Galbijjim
- **B25** — Japanese soy/miso daikon + boneless short-rib braise references
- **B26** — Made With Lau beef collection / standard pan-seared steak technique
- **L01** — Omnivore’s Cookbook / The Woks of Life — Xinjiang Cumin Lamb; household adaptation omits chili from base
- **L02** — Chinese 葱爆羊肉 references; scallion-lamb is the classic structure
- **L03** — Omnivore’s Cookbook — Laghman / Xinjiang lamb noodles
- **L04** — The Woks of Life — Xinjiang Lamb Rice
- **L05** — Omnivore’s Cookbook — Red Braised Lamb
- **L06** — Ying Chen Blog — Cantonese Style Lamb and Daikon Stew in Chu Hou Paste
- **L07** — ChinaRecipes — Radish and Lamb Soup
- **L08** — RecipeTin Eats / RecipeTin Japan — pan-seared lamb-chop techniques
- **L09** — RecipeTin Eats — slow-cooked lamb shanks
- **L10** — Chinese goat + daikon soup home-cooking references
- **L11** — Inferred goat adaptation from verified Chinese red-braised lamb/goat cooking patterns
- **L12** — Chinese 羊蝎子 clear-soup references + standard slow lamb-bone soup technique
- **L13** — Western braised lamb-shank references
- **L14** — The Woks of Life — Hong Kong Style Lamb Casserole; source explicitly accepts lamb shoulder and goat substitutions
- **F01** — The Woks of Life — Cantonese Steamed Fish
- **F02** — The Woks of Life — Steamed Fish with Black Bean Sauce
- **F03** — RecipeTin Eats — Whole Baked Fish; supports sea-bass/branzino oven route
- **F04** — Just One Cookbook — Miso Black Cod / Miso Salmon; fish-specific marination times retained as source-dependent
- **F05** — Just One Cookbook — Teriyaki Salmon and Miso Butter Salmon; variations under one pan-seared salmon record
- **SH01** — Made With Lau / The Woks of Life — Shrimp and Eggs
- **SH02** — The Woks of Life — Shrimp & Broccoli
- **SH03** — Standard pan-seared shrimp technique; household finishes are variations
- **SH04** — Cantonese 白灼虾 / poached shrimp references
- **SH05** — Serious Eats — pan-seared scallop technique
- **SH06** — Omnivore’s Cookbook — Squid & Bok Choy Stir Fry
- **SH07** — Just One Cookbook — Japanese shrimp/broccolini pasta
- **SH08** — Epicurious — Squid and Bell Pepper Stir-Fry; onion is a household-compatible aromatic/vegetable addition
- **SH09** — Taste of Home / Mediterranean Dish — oven-baked breadcrumb oysters
- **E01** — Made With Lau / The Woks of Life — Tomato and Eggs
- **E02** — Made With Lau — Chinese Steamed Eggs
- **E03** — The Woks of Life — Tomato Egg Drop Soup
- **E04** — The Woks of Life — Tomato Egg Drop Noodle Soup
- **E05** — Made With Lau — Egg Drop Soup
- **E06** — The Woks of Life / Made With Lau — tomato tofu recipes
- **E07** — The Woks of Life — Chinese Tofu and Eggs
- **E08** — The Woks of Life — Cantonese Steamed Tofu with Ginger and Scallions
- **E09** — Made With Lau — tofu soup patterns; household soft-tofu soup simplified
- **E10** — Just One Cookbook — pan-fried tofu technique
- **E11** — Just One Cookbook — Tofu Steak with Mushroom Ankake
- **E12** — The Woks of Life — Home Style Tofu; household family version removes chili-heavy base and lowers oil
- **E13** — Just One Cookbook — Egg Tofu (Tamago Tofu); household uses purchased egg tofu rather than making it from scratch
- **E14** — Household-confirmed egg-tofu use: child eats egg tofu and texture is soft
- **ST01** — Made With Lau — Egg Fried Rice
- **ST02** — Just One Cookbook — Corn Rice
- **ST03** — Just One Cookbook — Japanese Sweet Potato Rice
- **ST04** — Just One Cookbook — Yaki Udon
- **ST05** — The Woks of Life — Shanghai Scallion Oil Noodles; household uses ready-made canned scallion oil
- **ST06** — The Woks of Life — Scallion Oil Taro
- **ST07** — The Woks of Life — Lotus Root Stir-fry; source explicitly includes wood ear mushrooms and bell pepper
- **ST08** — Just One Cookbook — Japanese Simmered Kabocha
- **ST09** — Food & Wine — Kabocha Squash Congee (congee roundup)
- **ST10** — Just One Cookbook — Baked Japanese Sweet Potatoes (Yaki Imo)
- **ST11** — Epicurious / Simply Recipes — savory oatmeal with egg
- **ST12** — The Woks of Life — Mantou / steamed bun references; household uses existing ready-made `steamed-buns` ingredient
- **ST13** — The Woks of Life — Taro Rice (芋头焖饭); household adaptation uses fresh shiitake and lower-oil stovetop route
- **V01** — Made With Lau — Choy Sum with Garlic; The Woks of Life — Bok Choy Stir-fry / Pea Tips Stir-fry; supports one shared quick leafy-green stir-fry structure.
- **V02** — Made With Lau — Dad’s 10-Minute Weeknight Broccoli / Broccoli Stir Fry.
- **V03** — Made With Lau — Chinese Broccoli with Oyster Sauce.
- **V04** — Made With Lau — Ong Choy with Fermented Bean Curd.
- **V05** — Just One Cookbook — Japanese Spinach Salad with Sesame Dressing (Gomaae).
- **V06** — Chinese 上汤娃娃菜 / baby napa cabbage in savory broth references; used only to verify the broth-simmered cabbage structure.
- **V07** — The Woks of Life — Hot & Sour Napa Cabbage Stir-fry; household family version removes chili while retaining vinegar-cabbage structure.
- **V08** — Omnivore’s Cookbook — Spinach and Egg Stir Fry.
- **V09** — Chinese 荠菜豆腐羹 household pattern + the KB’s already-verified soft-tofu soup structure.
- **V10** — Omnivore’s Cookbook — Stir-Fried Cauliflower with Tomato Sauce.
- **V11** — The Woks of Life — cabbage recipes / everyday cabbage stir-fry patterns.
- **V12** — The Woks of Life — Braised Winter Melon.
- **V13** — Chinese loofah-and-egg household pattern + Omnivore’s Cookbook zucchini/vegetable stir-fry references; used to support a shared squash-and-egg structure.
- **V14** — Made With Lau — steamed eggplant technique within Eggplant with Garlic Sauce; only the low-oil steaming structure is carried into the household Recipe.
- **V15** — Just One Cookbook — Japanese daikon simmering references (including Buri Daikon / daikon soup patterns); supports the plain household simmered-daikon structure.
- **V16** — The Woks of Life — Stir-Fried Celtuce with Wood Ear Mushrooms; household uses fresh wood ear only.
- **V17** — Standard stir-fried sugar snap pea side-dish references; household base removes optional chili.
- **V18** — Omnivore’s Cookbook — Chinese Chive and Egg; Chinese Yellow Chives and Eggs Stir Fry.
- **V19** — Omnivore’s Cookbook — Dried Tofu and Celery Stir Fry; vegetarian route supports omitting optional pork.
- **V20** — The Woks of Life — Braised Chinese Mushrooms with Bok Choy / mushroom-greens household structure.
- **V21** — Omnivore’s Cookbook — King Oyster Mushroom Stir Fry / simple seared mushroom patterns.
- **V22** — Just One Cookbook — Miso Butter Mushrooms in Foil; supports shared covered steam/braise structure across compatible mushrooms.
- **V23** — Omnivore’s Cookbook — Easy Oyster Mushroom Stir-Fry plus established Chinese vegetable-and-egg stir-fry structure.

# 8. VALIDATION

| Check | Result | Detail |
|---|---|---|
| Pool coverage | PASS | 162/162 |
| Pork | PASS | 35/35 |
| Chicken | PASS | 23/23 |
| Beef | PASS | 26/26 |
| Lamb / Goat | PASS | 14/14 |
| Fish | PASS | 5/5 |
| Shellfish | PASS | 9/9 |
| Egg / Tofu | PASS | 14/14 |
| Staple-centered | PASS | 13/13 |
| Vegetable-centered | PASS | 23/23 |
| Unique stable IDs | PASS | 162 unique; recipe headings and record IDs agree |
| Ingredient records | PASS | 132/132 retained Ingredient stable IDs migrated to formal Candidate records |
| Ingredient stable IDs | PASS | 132 unique; no retained candidate ID dropped or renamed |
| Starter visibility | PASS | 129 visible non-pantry Ingredients; 3 pantry aromatics hidden |
| Starter section integrity | PASS | every Ingredient resolves to one controlled section and has a unique positive order within that section |
| Recipe-required Starter reachability | PASS | every non-pantry Ingredient required by any Recipe / `one_of` is Starter-visible |
| All candidate | PASS | 162/162 remain `candidate`; no auto-approval |
| v1.5 required fields | PASS | `primary_role`, `meal_contribution`, `child_coverage`, staple split, `detail_level` present on 162/162; `meal_addons` present only where supported |
| Deprecated Recipe fields | PASS | `vegetable_count`, `staple_pairings`, `child_support_protein_needed` absent from 162/162 |
| Ingredient availability | PASS | every non-pantry recipe ingredient is `required`; pantry seasoning is `assumed` |
| Ingredient dependency audit | PASS | all Recipe Ingredient IDs and all `one_of` options resolve to the v1.4 Ingredient Library |
| Staple classification | PASS | project Staple IDs no longer remain in `vegetable_ingredient_ids`; integral vs recommended staple separated |
| Child coverage consistency | PASS | no child protein/vegetable coverage is true when the Recipe contributes zero of that slot |
| Contribution / primary role consistency | PASS | `primary_role` agrees with non-zero P/V/S contributions on 162/162 |
| Meal Builder behavior data | PASS | supports Protein target+tolerance and hard Child coverage behavior, including full-protein adult-only → half-protein child/mixed dishes ranking ahead of larger fallback proteins |
| No spicy base | PASS | adult heat separated |
| No deep-fry | PASS | baked/pan/steam/braise alternatives used |
| Fresh wood ear migration | PASS | fresh-only |
| Egg tofu child correction | PASS | child-eaten and protein coverage true |
| Variation dedupe | PASS | steak / fish alternatives represented without duplicate Recipe records; machine-readable `one_of` used where already accepted |
| Vegetable structure dedupe | PASS | 23 records cover merged leafy-greens, squash+egg, chives+egg and mushroom structures without seasoning-only duplicates |
| Finish-with-leafy add-on | PASS | exactly 7 supported main Recipes; Instant Pot soy chicken thighs explicitly absent; add-on contributes V1 without synthetic Recipe IDs |
| Finish-wilt capability | PASS | only 5 explicitly tagged Ingredients are eligible; leafy-vegetable section membership alone does not imply compatibility |
| Ingredient-dependent child coverage | PASS | Recipe schema accepts `ingredient-dependent`; unresolved Ingredient-level coverage remains `unknown` and does not satisfy hard Child coverage |
| Detail completeness | PASS | 162/162 honestly remain `discoverable`; no unverified exact Cook View quantities were invented |

No required validation item remains FAIL or BLOCKED. No manual-intervention question was required for the Vegetable Recipe / add-on formalization: cooking-structure identity, Ingredient mapping, slot contribution, and compatibility could be supported by retained household decisions plus culinary evidence. Unconfirmed child acceptance remains `unknown` rather than being invented.

# 9. DECISIONS

Long-term decisions added/confirmed in this formalization:

- The original retained 139-item Recipe pool remains fully represented; v1.5 adds 23 Vegetable-centered structures for 162 total Recipes, with no “core subset” reduction.
- All records remain `candidate`.
- Time is a flexible workload/planning signal rather than a strict daily hard limit; precise household timings are added when actually known.
- Manual intervention is reserved for unresolved issues that materially change safety, feasibility, Recipe identity, or household fit.
- Instant Pot PIP household pattern: meat below, elevated rice container above; about 10–15 min is a common pressure segment, while release/liquid/ratio remain recipe-specific.
- `fresh-wood-ear-mushrooms` replaces the old ambiguous wood-ear item.
- `egg-tofu` is soft and child-eaten.
- Homemade whole roast chicken remains excluded; ready-cooked supermarket roast/rotisserie chicken is preferred for that use case.
- Ready-made/canned scallion oil is available for scallion-oil noodles.
- Supporting tofu products remain supporting by default.
- `mixed` is not used merely because a dish contains two proteins.
- Final Family Hub direction is a dynamic Meal Builder rather than a pre-enumerated Meal Combo library: available Ingredients + meal targets → live Recipe candidates → selected dishes → Cook View.
- Child mode is a toggle and defaults ON. When ON, child protein coverage and child vegetable coverage are hard meal-completion requirements.
- Protein target uses an internal `+0.5` tolerance. The tolerance is not an invitation to keep adding irrelevant protein: once a candidate would exceed remaining tolerance without filling another unmet slot or Child coverage, it should be hidden.
- If adult Protein is already at target but Child Protein is still missing, a `protein: 0.5` Recipe that also fills Vegetable or another unmet slot ranks ahead of a pure `protein: 0.5` Recipe; a larger child-suitable Protein may remain as fallback even when it exceeds tolerance. Adult-only Protein that neither fits remaining tolerance nor fills another gap disappears.
- `meal_contribution` is a planning unit, not a nutrition claim. Mixed dishes may fill multiple slots; e.g. a meat-heavy vegetable dish can be `protein: 0.5` + `vegetable: 1`.
- Child coverage is separated from general `child_suitable`/texture notes. Known current household acceptance controls where available; otherwise conservative serving/texture inference is used instead of optimistic assumptions.
- Recipe availability is machine-readable through required Ingredient entries, `one_of` alternatives, and assumed pantry seasoning.
- Ingredient Starter represents **available ingredients**, not mandatory-use selections.
- Ingredient Starter sections are data-driven by `starter.section`; all visible sections are collapsible, and collapsing never clears selection.
- All retained non-pantry Ingredient candidates remain Starter-visible even when the current Recipe pool does not yet reference them; this preserves the Ingredient Library as the input domain for future Recipe expansion rather than hiding valid retained ingredients because of temporary Recipe coverage gaps.
- `ginger`, `scallion`, and `garlic` remain stable Ingredient records but are `starter.visible: false` because they are assumed pantry aromatics.
- `staple_pairings`, `vegetable_count`, and `child_support_protein_needed` are retired from Recipe v1.3 because they duplicated or conflated information now represented more precisely.
- Vegetable-centered Recipe identity is based on cooking structure, not seasoning label; “蒜蓉” and “清炒” variants are merged when workflow is materially the same.
- 23 Vegetable-centered Recipe structures are retained in v1.5; the library intentionally uses `one_of` to cover compatible greens, squash, chives and mushrooms without duplicate records.
- `finish-with-leafy-vegetable` is a Recipe add-on rather than a synthetic Recipe/Meal Combo. It is restricted to explicitly compatible main Recipes with a true final stovetop reduction/braising window.
- `Instant Pot 酱油鸡腿` does not support `finish-with-leafy-vegetable`; `照烧鸡腿` does. No separate 红烧鸡 Recipe is created because that seasoning direction does not justify a new cooking structure.
- Ingredient `finish-wilt-compatible` is an explicit capability tag. Initial compatible Ingredients are chinese-greens, lettuce, youmai-cai, choy-sum and baby-napa-cabbage.
- Child coverage may be `ingredient-dependent`; unknown Ingredient-level acceptance remains unknown and does not count toward hard Child completion.

# 10. CHANGELOG

## 2026-08-12 — v1.5

- Added 23 formal Candidate Vegetable-centered Recipe structures, raising the Recipe Library from 139 to 162 records without changing existing stable IDs.
- Merged seasoning-only duplicates into cooking structures and used `one_of` for compatible leafy greens, squash, chives and mushrooms.
- Added the controlled `finish-with-leafy-vegetable` add-on and explicit Ingredient capability tag `finish-wilt-compatible`.
- Enabled the add-on on exactly seven existing stovetop finishing Recipes: 红烧肉、糖醋排骨、照烧鸡腿、蚝油焖鸡腿/鸡小腿、可乐鸡翅、瑞士鸡翼、红烧牛肉；Instant Pot 酱油鸡腿 remains excluded.
- Added `ingredient-dependent` Recipe Child coverage plus optional Ingredient-level `child_coverage.vegetable`; unconfirmed values remain `unknown`.
- Added Vegetable research-source registry V01–V23 and completed full Recipe/Ingredient/reference/add-on regression validation with zero FAIL/BLOCKED items.

## 2026-08-12 — v1.4

- Migrated the 132-item Ingredient Candidate Index into formal Candidate Ingredient records without changing stable IDs or approval status.
- Added machine-readable `starter.visible`, `starter.section`, and `starter.order` plus a controlled Starter section registry.
- Kept all retained non-pantry candidates visible in Starter; hid only `ginger`, `scallion`, and `garlic` as assumed pantry aromatics.
- Preserved known household priority/supporting/child notes and encoded conservative Ingredient fit without adding retailer inventory, prices, package sizes, prep minutes, or unconfirmed child-acceptance claims.
- Verified 132/132 Ingredient records, unique section ordering, 139 Recipe references, all `one_of` alternatives, and Starter reachability for every Recipe-required non-pantry Ingredient.

## 2026-08-12 — v1.3

- Migrated all 139 Candidate Recipe records to the Meal Builder schema without changing stable IDs or approval status.
- Added `primary_role`, `meal_contribution`, `child_coverage`, `integral_staple_ingredient_ids`, `recommended_staple_ingredient_ids`, and `detail_level`.
- Normalized recipe Ingredient availability: required non-pantry ingredients, assumed pantry seasonings, and machine-readable `one_of` for accepted equivalent primary ingredients/cuts.
- Removed deprecated `vegetable_count`, `staple_pairings`, and `child_support_protein_needed`.
- Cleaned project Staple ingredients out of `vegetable_ingredient_ids`.
- Encoded Protein / Vegetable / Staple planning contributions, including half-protein mixed/support dishes used by the dynamic Builder.
- Encoded hard Child protein/vegetable coverage separately from objective texture suitability.
- Recorded the dynamic Meal Builder product direction and Protein `+0.5` tolerance behavior.
- Kept all 139 Recipe details at `discoverable`; no unverified precise Cook View quantities were invented.
- Completed parser, stable-ID, Ingredient-reference, schema, contribution, child-coverage, and staple-semantics audits with zero FAIL/BLOCKED items.

## 2026-08-11 — v1.2

- Moved project stage from Recipe Brainstorm to Recipe Library Formalization.
- Formalized all 139 retained recipes into complete Candidate Recipe records.
- Preserved Pork stable IDs from v1.1; added stable IDs for newly retained/non-Pork recipes.
- Added fit, evidence, main/support protein classification, Ingredient references, timing ranges, equipment/burner plans, child path, ingredient structure, steps and substitutions.
- Corrected wood ear to `fresh-wood-ear-mushrooms`.
- Corrected `egg-tofu` child status: soft and child-eaten.
- Updated timing policy and Instant Pot PIP policy per 2026-08-11 household guidance.
- Retained existing Party Wings + rice PIP pattern as a candidate Meal Combo pattern.
- Completed cross-library automated consistency audit.

## 2026-08-08 — v1.1

- Completed Ingredient / Pork Recipe brainstorm working state and source registry.
- Added real-recipe-first and cut-adaptation rules.

## 2026-08-04 — v1.0

- Established household constraints, stable IDs, evidence, fit and project library structure.
