# 猪肉末炒青菜与白米饭调整设计

## 目标

将 `ground-pork-chinese-greens-stir-fry` 调整为一整份 Protein，并把白米饭纳入菜谱本身。

## 数据调整

- `meal_contribution.protein` 从 `0.5` 改为 `1`。
- `meal_contribution.staple` 从 `0` 改为 `1`。
- 将 `rice` 从 `recommended_staple_ingredient_ids` 移至 `integral_staple_ingredient_ids`。
- 在 `ingredients` 中加入必需的 `rice`，角色为 `integral-staple`。
- 在设备、灶口安排和步骤中说明米饭需提前或另行煮好。

## 边界

保留现有蔬菜贡献、儿童覆盖、份数、调味与其他菜谱不变。不新增食材记录或程序逻辑。

## 验收

- Meal Builder 将该菜显示为 `Protein 1 · Vegetable 1 · Staple ✓`。
- 选择该菜可独立满足一份 Protein 和一份 Staple。
- `rice` 是菜谱必需食材，不再只是推荐搭配。
- 数据验证、Astro 检查、生产构建和审计通过。
