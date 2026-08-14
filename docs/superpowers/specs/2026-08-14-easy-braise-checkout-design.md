# Easy-braise checkout

Easy-braise is a checkout-only pairing. A row is eligible only when the current meal snapshot contains the Ingredient, it has `easy-braise-addon`, it is not bound to a selected Recipe, and at least one selected Recipe has `iron-pan-braise`.

Normal checkout rows remain first. Eligible additions are shown once below a divider; counted rows begin at `0` and presence-only rows begin false. The first counted increment sets `1`, and later changes use half steps. They do not alter planning, contributions, child coverage, candidate ranking, or Cook View.

The shared checkout draft persists. Repositories receive static Recipes and the checkout transaction recomputes eligibility from the current state; any submitted non-eligible ID rejects the whole transaction. Legacy `selectedAddons` remains readable but is cleared by later reconciliation and cannot affect UI, totals, or checkout.
