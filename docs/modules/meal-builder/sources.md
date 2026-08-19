# Meal Builder sources and evidence

## Registry rule

Every Ingredient and Recipe keeps an `evidence` object with `level`, `checked_on`, `scope`, and `sources`. Existing evidence remains part of the record, but `sources` may be empty and does not determine whether a Recipe is cookable. Scope is normally culinary identity and core technique, not retailer inventory, price, package size, household preference, or child acceptance unless the record says so.

Current registry review dates are: legacy Pork sources originally checked 2026-08-08; non-Pork formalization and supplemental checks reviewed 2026-08-11; Vegetable-centered sources V01–V23 reviewed 2026-08-12; V24 reviewed 2026-08-19. A `checked_on` date must be changed only after the underlying source is checked again.

## Retained source families

The migrated YAML preserves the complete legacy registry IDs and titles in `evidence.sources`. The families below are an index for review; the record-level citation remains authoritative.

| IDs | Domain and source families |
| --- | --- |
| P-S1–P-S22 | Pork identity and technique: The Woks of Life, Just One Cookbook, Bon Appétit, PBS Food/Made With Lau, Omnivore’s Cookbook, and established Chinese/Vietnamese/Filipino braise and soup references. |
| P-M1–P-M7 | Household-confirmed pork patterns and reputable Chinese home-cooking references for mushroom pork, pressed tofu, Chinese greens, tofu, tomato/potato/corn, daikon, carrot/yam, and soup structures. |
| P-U1–P-U4 | User-confirmed household preferences and retained low-oil/non-deep-fried pork structures, paired with supporting public references where applicable. |
| C01–C21 | Chicken structures: Just One Cookbook, Made With Lau, The Woks of Life, RecipeTin Eats, Serious Eats, Instant Pot official guidance, Christine’s Recipes, and household-confirmed Party Wings/PIP patterns. |
| B01–B26 | Beef structures: The Woks of Life, Just One Cookbook, Omnivore’s Cookbook, Made With Lau, Korean Bapsang, Instant Pot official soup references, and retained household patterns. |
| L01–L14 | Lamb/goat structures: Omnivore’s Cookbook, The Woks of Life, RecipeTin Eats/Japan, Ying Chen Blog, ChinaRecipes, Chinese home-cooking references, and conservative goat adaptations. |
| F01–F05 | Fish structures: The Woks of Life, RecipeTin Eats, and Just One Cookbook for steamed, baked, miso, teriyaki, and pan-seared structures. |
| SH01–SH09 | Shellfish/seafood structures: Made With Lau, The Woks of Life, Serious Eats, Omnivore’s Cookbook, Just One Cookbook, Epicurious, Taste of Home, and Mediterranean Dish. |
| E01–E14 | Egg/tofu structures: Made With Lau, The Woks of Life, Just One Cookbook, household soft-tofu and egg-tofu patterns, and child-texture confirmation. |
| ST01–ST13 | Staple structures: Made With Lau, Just One Cookbook, The Woks of Life, Food & Wine, Epicurious, Simply Recipes, and ready-made staple decisions. |
| V01–V24 | Vegetable-centered structures: Made With Lau, The Woks of Life, Just One Cookbook, Omnivore’s Cookbook, Chinese household patterns, and standard low-oil vegetable techniques. |

The source titles retained by the migration include the specific dish/topic (for example, Chicken Teriyaki, Oyakodon, Moo Shu Pork, Chinese Steamed Fish, Egg Fried Rice, Choy Sum with Garlic, Spinach and Egg Stir Fry, Braised Chinese Mushrooms with Bok Choy, and Bean Sprout Stir Fry). Do not replace a record's specific source ID with a generic “internet” citation.

## Evidence and household decisions

- `official-current` is preferred for current product/equipment guidance and public factual claims; `retailer-current` is limited to a retailer fact actually checked.
- `reputable-general` supports culinary identity or technique. Adaptations must be recorded as adaptations rather than presented as source text.
- `user-confirmed` records a household-observed preference or workflow. It does not create a public medical or nutritional claim.
- `inferred` is conservative workflow/fit inference; `unverified` must remain visibly uncertain and cannot satisfy a hard rule.
- Recipe timing is a source-derived or workflow-derived range, not household stopwatch data unless explicitly measured. Do not auto-block a Recipe because a precise household minute count is unknown.
- Candidate recipes remain `discoverable` unless exact quantities and executable steps are supported. Never invent exact grams, sauce ratios, child acceptance, retailer packages, or safety temperatures.
- Evidence labels and URLs are optional for `cookable` and `household-tested` Recipes. Preserve existing provenance, and research only requested, missing, or doubtful facts.

## Decisions that sources must continue to support

- Real cooking structure takes priority over seasoning-only duplicates; compatible cuts/ingredients use `one_of`.
- Mild, low-oil, non-spicy bases are the household default; adult heat is separated after the child portion.
- Fresh wood ear is `fresh-wood-ear-mushrooms`; homemade whole roast chicken is excluded in favor of ready-cooked supermarket roast/rotisserie chicken; ready-made/canned scallion oil is available.
- Supporting tofu products remain supporting ingredients; `egg-tofu` is soft and child-eaten; `mixed` is not used merely because a dish contains two proteins.
- Child coverage is a separate fact from general texture suitability. Ingredient-dependent coverage reads the selected Ingredient and preserves `unknown`.
- The dynamic direction is available Ingredients → live candidate Recipes → selected dishes → Cook View, not a pre-enumerated Meal Combo library. The retained Instant Pot Party Wings + rice pot-in-pot pattern is a candidate workflow, not a new requirement for every Recipe.

## Source review checklist

When changing an evidence-backed record, identify the exact source scope, preserve the registry ID, record the date checked, distinguish source fact from household adaptation, and leave unsupported fields unknown. Run the YAML schema/reference/privacy audit and inspect the generated record before merging.
