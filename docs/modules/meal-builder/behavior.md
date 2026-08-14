# Meal Builder behavior

## Household intent and constraints

The tool supports multiple adults and a young child without storing birthdays or identity details. The household prefers mild, low-oil, non-spicy shared food; adult heat is added after the child's portion is removed. Prefer one shared family dish over a separate child meal. Supported methods are braise, simmer, steam, roast, pan-sear, stir-fry, oven, air fryer, and Instant Pot; deep-frying is not used. Common equipment is a 9-quart Instant Pot, stovetop nonstick pan, strong-burner wok/iron pan, oven, and small air fryer.

Time is a workload signal, not an automatic hard filter. Account for opening, washing, peeling, trimming, cutting, marinating, preheating, pan changes, and cleaning—not only heat time. `active_minutes`, `meal_window_minutes`, `elapsed_minutes`, and `advance_start_required` remain source/workflow ranges until the household measures them. Instant Pot meat pressure is commonly about 10–15 minutes, but release, liquid, rice ratio, and cut thickness stay recipe-specific.

## Shared four-step flow

1. **Inventory** — connected household users adjust categorized ingredient inventory. Counted items use half-unit quantities; presence-only staples/pantry items use a boolean presence value.
2. **Recipes** — users set Protein and Vegetable planning targets, optional Staple, time preference, and Child mode; select available ingredients; review ranked candidates; bind `one_of` choices; select or remove controlled add-ons.
3. **Cook** — selected recipes and their child-serving/adult-finish notes render in Cook View. The household can return to Recipes while preserving the current meal.
4. **Checkout** — mark consumed quantities or “used up,” review the draft, confirm, and commit atomically. A stale meal or invalid quantity does not partially mutate inventory.

`activeStep`, current meal status, selected recipes, ingredient bindings, add-ons, and checkout draft are household state shared across connected devices. The page observes remote changes and reconciles unknown/archived IDs safely.

## Targets, completion, and ranking

- Protein, Vegetable, and Staple are family planning slots, not nutrition servings or grams. A recipe may contribute multiple slots; for example, a meat-and-vegetable dish may contribute `protein: 0.5` and `vegetable: 1`.
- Protein uses an internal `+0.5` tolerance. Once the target is met, candidates that exceed remaining tolerance without filling another unmet slot or child coverage disappear. A half-protein dish that also fills Vegetable ranks above a pure half-protein fallback when Child Protein is still missing; a larger child-suitable protein may remain as a hard-coverage fallback.
- Child mode defaults **on**. With it enabled, both child protein and child vegetable coverage are hard meal-completion requirements. This is dynamic state aggregation, not a simple recipe-category filter.
- `child_coverage` may be `true`, `false`, or `ingredient-dependent`. An ingredient-dependent recipe reads the selected ingredient's `child_coverage`; `unknown` never satisfies a hard child requirement. General `child_suitable`, `child_texture`, and `child_serving` notes remain separate facts.
- Recipe availability is evaluated from each `ingredients[]` identity and any matching `one_of` option. Pantry items are display-only Cook View text and never participate in availability or inventory. A Starter ingredient is available for this meal; it is not mandatory to consume.
- The UI sections are data-driven by `starter.section`; every visible section can collapse, and collapsing never clears selections. `starter.order` is stable and not alphabetic.

## Vegetable structures and add-on

Vegetable Recipes represent a real cooking structure, not every seasoning label. Compatible alternatives use `one_of` rather than duplicate stable IDs. `finish-with-leafy-vegetable` is a Recipe add-on, never a synthetic Recipe or Meal Combo: it is offered only for explicitly supported main Recipes with a final stovetop reduction/braising window and only for Ingredients tagged `finish-wilt-compatible`.

The initial compatible ingredients are `chinese-greens`, `lettuce`, `youmai-cai`, `choy-sum`, and `baby-napa-cabbage`. The same ingredient may still be chosen for a standalone Vegetable Recipe. The add-on contributes `vegetable: 1` and participates in child coverage without changing the main Recipe ID. It is enabled on exactly seven existing stovetop structures; `Instant Pot 酱油鸡腿` remains excluded while `照烧鸡腿` remains supported.

## Reset, errors, and privacy

Resetting recipe selection keeps the shared inventory unchanged. Clearing shared inventory requires explicit confirmation and does not change current-meal availability. Firebase/auth errors are shown; there is no local-data fallback. The page never stores names, birthdays, addresses, schedules, diagnoses, Gmail addresses, UIDs, tokens, or private notes.
