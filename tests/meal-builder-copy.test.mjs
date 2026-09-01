import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Meal Builder visible copy does not expose implementation or disclaimer language', async () => {
  const files = [
    'src/pages/meal-builder.astro',
    'src/components/MealInventoryImport.astro',
    'src/components/MealBuilderCheckoutQueueEnhancements.astro',
  ];
  const source = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
  for (const text of ['KB v', '实时补齐组餐缺口', 'presence-only 只记录', '本顿可用食材是库存快照', '请先从当前库存开始本顿', '这里只显示本次选中的菜', '可靠的结构和基础步骤', '这是本设备的结算草稿', 'Meal Builder 是组餐参考', '冻结 ${units} 份主料', 'UID：${repositoryStatus.uid}']) assert.equal(source.includes(text), false, `visible copy must not contain ${text}`);
  assert.match(source, /仅结算 Queued；当前选择不变/);
  assert.match(source, /粘贴 ChatGPT 生成的入库 JSON。确认前可调整数量和日期。/);
  assert.match(source, /预留 \$\{units\} 份主料/);
});
