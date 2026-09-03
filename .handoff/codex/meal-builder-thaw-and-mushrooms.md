# Meal Builder: thaw workspace + 香煎菌菇 expansion

## Goal

Implement these two already-decided Meal Builder changes together on current `main`, then run one full verification pass:

1. move the action for starting a thaw from the Freezer tab into a complete Thawing workspace;
2. extend the existing canonical `pan-seared-mushrooms` Recipe so every active visible mushroom Ingredient can use it.

Do not redesign unrelated Meal Builder behavior.

Before editing:
1. `git pull --ff-only`
2. Read current `AGENTS.md` and `PROJECT.md`.
3. Follow `.agents/skills/manage-meal-data/SKILL.md` for the Recipe change.
4. Read `docs/modules/meal-builder/README.md`, then only the relevant current behavior/data-model docs.
5. Inspect current freezer/thaw implementation/tests and current mushroom Ingredient/Recipe data.

---

## Part A — Thawing becomes the place to start a thaw

### Confirmed UX

Top tabs remain conceptually:

`[ 库存 ] [ 冷冻 ] [ 化冻 N ]`

Responsibilities:

- **冷冻** = manage what is physically in the freezer and its quantity/presence.
- **化冻** = choose what stocked thaw-required item to take out, plus manage current thaw jobs.

No fifth main Meal Builder step.

### A1. Freezer tab

Keep the current grouped freezer inventory UI and bottom jump behavior.

Continue to show every Ingredient with explicit `freezer_behavior`:
- `direct` -> ordinary `inventory`, current presence/count controls;
- `thaw-required` -> `freezerInventory`, current counted controls.

**Remove `化冻` from thaw-required rows in the Freezer tab.**

Do not change:
- direct vs thaw-required storage targets;
- presence-only/count semantics;
- counted 0.5 increments;
- single-line mobile layout.

### A2. Thawing tab/workspace

Render two obvious product sections in this order.

#### 正在化冻

Show current thaw jobs with existing behavior:
- Ingredient name;
- remaining quantity;
- elapsed/remaining time and exact `readyAt` auto-entry time using the current minute-level convention;
- `进入库存`;
- `取消化冻`.

Preserve semantics exactly:
- manual `进入库存` transfers max 1 unit per tap, or remaining 0.5;
- `取消化冻` returns remaining quantity to `freezerInventory`;
- 36h auto promotion unchanged;
- FIFO completion-date semantics unchanged;
- current-meal snapshot semantics unchanged.

If no jobs are running, show only a compact empty state for this subsection. Do not hide the whole workspace because `可以化冻` may still have items.

#### 可以化冻

List only Ingredients satisfying both:
- canonical `freezer_behavior: thaw-required`;
- current `freezerInventory` quantity > 0.

Never show:
- zero-stock thaw-required Ingredients;
- `direct` Ingredients.

No ID/name/category/tag inference.

Each row shows:
- Ingredient name;
- current frozen quantity;
- one `化冻` button.

Starting thaw must reuse existing transaction/helper semantics:
- each tap moves 1 unit from freezer into one new thaw job;
- if only 0.5 remains, move 0.5;
- no confirm;
- atomic decrement + job creation;
- existing named 36h duration.

After action, update immediately. If frozen quantity reaches 0, remove the Ingredient from `可以化冻`.

### A3. Tab count

`化冻 N` continues to mean **number of active thaw jobs**, not number of eligible Ingredients.

### A4. Mobile

At 375px:
- no horizontal viewport overflow;
- controls remain usable;
- long Ingredient names do not push buttons off-screen;
- sections are clear without implementation explanations.

Visible UI must not expose `freezerInventory`, job IDs, transaction terminology, or other backend/model wording.

### A5. Thaw tests

Prove at minimum:
1. thaw-required qty 0 is absent from `可以化冻`;
2. thaw-required qty > 0 appears with one `化冻` button;
3. direct Ingredient never appears there;
4. Freezer rows no longer have `化冻`;
5. starting thaw moves max 1 (or remaining 0.5) atomically;
6. source row disappears when frozen qty becomes 0;
7. `正在化冻` still supports `进入库存` / `取消化冻`;
8. existing 36h auto-thaw, FIFO, current-meal snapshot, direct freezer, presence-only, counted toggle, grouping/jump behavior remains correct;
9. 375px has no horizontal overflow.

---

## Part B — Every active mushroom can use 香煎菌菇

### Current canonical scope

`src/data/meal-builder/ingredients/mushroom.yaml` currently contains these eight active visible mushroom Ingredients:

- `king-oyster-mushrooms` — 杏鲍菇
- `button-cremini-mushrooms` — 口蘑 / Cremini
- `fresh-shiitake` — 鲜香菇
- `oyster-mushrooms` — 平菇
- `shimeji-mushrooms` — 蟹味菇（Shimeji）
- `enoki-mushrooms` — 金针菇
- `maitake` — 舞茸
- `fresh-wood-ear-mushrooms` — 新鲜黑木耳

The existing canonical Recipe is `src/data/meal-builder/recipe/vegetable/pan-seared-mushrooms.yaml` (`香煎菌菇`). Do **not** create eight duplicate Recipes.

### B1. Composition

Extend this one Recipe to all eight Ingredients.

- Keep Recipe ID `pan-seared-mushrooms`.
- Keep name `香煎菌菇` unless a tiny clarity edit is genuinely needed.
- `ingredients` stays one hard `one_of`, containing all eight mushroom IDs.
- `vegetable_ingredient_ids` must consistently cover all supported identities under current conventions.
- Keep contribution Protein 0 / Vegetable 1 / Staple 0.
- Keep Child vegetable coverage `false` unless current canonical facts explicitly justify otherwise.
- Preserve existing light/non-spicy/pan-seared/vegetable-centered semantics.

### B2. Cookability

The single Recipe must be genuinely cookable for every selectable mushroom. Update prep/steps/substitutions/cook ingredients as needed so instructions account for materially different shape/texture:

- 杏鲍菇: thick slices/planks; brown faces.
- 口蘑/Cremini: halves/thick slices; evaporate released water before finish.
- 鲜香菇: trim tough stem ends as needed; caps halved/thick-sliced; soften and brown.
- 平菇: tear broad pieces/clusters; avoid overcrowding; drive off moisture.
- 蟹味菇/Shimeji: trim root base, separate clusters; cook until tender/lightly browned with no raw firmness.
- 金针菇: trim root base, split small bundles; thin layer/small bundles; cook through until limp/tender with browned edges, not like a thick mushroom steak.
- 舞茸: tear bite-size fronds/clusters; crisp/brown edges while centers cook through.
- 新鲜黑木耳: clean/trim, tear/cut bite-size; **thoroughly cook** until fully hot/tender and moisture has cooked off; a brief surface sear alone is not sufficient.

Use one practical light base seasoning profile consistent with the existing Recipe. Mushroom-specific prep/endpoints may live in steps/substitutions rather than separate Recipes.

Do not invent product/package-specific facts.

### B3. Data integrity

- no hard-coded runtime/UI logic;
- no duplicate generic pan-seared mushroom Recipe;
- update Meal Builder content metadata if current data-model rules require it;
- use the meal-data helper to inspect and verify the Recipe.

Run:

```bash
node .agents/skills/manage-meal-data/scripts/meal-data.mjs verify-item pan-seared-mushrooms
```

Acceptance:
1. all eight active mushroom Ingredients are valid hard options;
2. any one of the eight can make the Recipe feasible under existing one-of binding logic;
3. Recipe remains Vegetable 1 and gains no unsupported Child coverage;
4. Cook View is sensible for all eight, including enoki and fresh wood ear;
5. no duplicate pan-seared mushroom Recipes.

---

## Combined validation

Run focused checks while implementing, then one full project gate:

```bash
pnpm run verify
```

Fix all task-caused failures. If local Java/environment blocks only one validation stage, run all remaining checks and rely on GitHub Actions as final verification evidence.

## Completion

- Keep changes limited to these two requested areas plus necessary tests/docs/metadata.
- Commit and push implementation to `main` only after validation.
- Delete this handoff file in the final implementation commit.
- Also remove the superseded temporary handoffs `.handoff/codex/meal-builder-pan-seared-all-mushrooms.md` and `.handoff/codex/meal-builder-thaw-workspace.md` if they still exist on current `main`.
- Report final commit SHA plus PASS/BLOCKED validation result in the task result before cleanup if the Codex workflow requires it.
