# Restaurants

## Purpose

Provide a mobile-first restaurant list that combines verified public restaurant facts with a private household overlay for ratings, comments, `想吃`, and scratch notes.

One physical restaurant location is one public record. Chain locations use separate records because services, ordering platforms, and links may differ.

## Route and ownership

- Route: `/restaurants/`
- Category: `food-home`
- Module privacy class: `public-reference`
- Public dataset: `src/data/restaurants.json`
- Public parser: `src/data/restaurantSchema.mjs` / `parseRestaurants`
- Public type: `src/data/restaurantTypes.ts` / `Restaurant`
- Card: `src/modules/restaurants/RestaurantCard.astro`
- Private household state: Firebase `households/{householdId}/restaurants`
- Private state/repository: `src/lib/restaurantInteractions.ts`
- Private UI: `src/lib/restaurantInteractionUi.ts`

The static build may contain only public restaurant facts. Household ratings, wants, comments, and Inbox tickets are loaded after authenticated household access and must never be committed to `restaurants.json` or server-rendered into the public page.

## Public record model

```ts
export interface RestaurantAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export type RestaurantOrderMode = 'delivery' | 'pickup';

export interface RestaurantOrderPlatform {
  name: string;
  url: string;
  modes: RestaurantOrderMode[];
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: RestaurantAddress;
  tags: [string] | [string, string];
  dineIn: boolean;
  orderPlatforms: RestaurantOrderPlatform[];
  officialUrl: string | null;
  googleMapsUrl: string | null;
  yelpUrl: string | null;
  verifiedDate: string;
}
```

### Description style

`description` is required public-reference content.

- Keep it to one short, casual line; target roughly 10–25 Chinese characters.
- Fragments are fine. Do not force formal complete grammar.
- State one useful impression about what the restaurant serves.
- No marketing filler such as `主打精品 / 匠心 / 正宗地道 / 适合……的时候` templates.
- It must still be factually supportable.
- Schema hard limit: 40 Unicode characters.

Example: `脆皮韩式炸鸡，鸡翅鸡块为主。`

## Public service semantics

Restaurant-level service has only two concepts:

- `堂食` — `dineIn: true`. Verified on-site seating; outdoor seating counts.
- `外卖` — `orderPlatforms` is non-empty.

`自取` is not a separate restaurant-level service. It is a fulfillment mode inside an ordering platform.

- `delivery` = platform delivery.
- `pickup` = order through that platform and collect at the restaurant.
- A platform may support one or both modes.

Every restaurant has exactly 1 or 2 short, reusable tags. Do not combine categories when separate reusable tags work better: Bloom Chicken uses `韩餐` + `炸鸡`, not `韩式炸鸡`.

## Public links

Every record has three fixed link slots, in this order:

1. official website
2. Google Maps
3. Yelp

Each may be `null` only when no usable public link can be found. The card always renders all three controls. Missing links remain visible as grey, non-focusable disabled controls labeled `暂无`.

Ordering-platform URLs are separate from these reference links.

## Private household state

```ts
interface RestaurantInteractionState {
  ratings: Record<restaurantId, Record<uid, {
    score: 1 | 2 | 3 | 4 | 5;
    authorName: string;
    updatedAt: number;
  }>>;

  wants: Record<restaurantId, Record<uid, {
    authorName: string;
    updatedAt: number;
  }>>;

  comments: Record<commentId, {
    id: string;
    restaurantId: string;
    body: string;
    authorName: string;
    createdAt: number;
    updatedAt?: number;
  }>;

  inbox: Record<ticketId, {
    id: string;
    text: string;
    createdAt: number;
    updatedAt: number;
  }>;
}
```

Firebase rules restrict the branch to verified Google household members. Ratings and wants are keyed by uid and snapshot the member display name. Public restaurant data remains independent of this state.

## Ratings

- Fixed household display rows: `猫猫` and `呜哇`.
- Each member has one independent integer score from 1–5.
- No half stars and no household average.
- Missing rating displays `—`.
- The signed-in member can change their own rating from their row.
- Use the shared household/notebook cat and dog avatars for identity.

## 想吃

- The action button contains text only: `想吃`.
- It toggles the signed-in member's own want state.
- Active status is shown beside the button with the user-supplied artwork in `src/lib/restaurantWantAssets.ts`:
  - `猫猫` → clasped-paws cat artwork.
  - `呜哇` → drooling dog artwork.
- Multiple active members display side by side.
- A restaurant may remain `想吃` even after it has ratings/comments; this is current appetite, not an unvisited wishlist.

Default result ordering is derived, not stored:

1. more household members marked `想吃`
2. restaurant name A–Z as the tie-breaker

With the current two named members this means both want > one wants > nobody wants.

## Comments

Restaurant comments reuse the shared household presentation helpers used by the notebook/day-trip family interactions:

- household member avatar + display name
- chronological comments
- first/middle/last collapsing behavior for longer threads
- authenticated add/edit/delete UI

Comments are private Firebase state and never part of the public restaurant record.

## Restaurants Inbox

The Restaurants page includes a small private `随手记` Inbox.

- Accept freeform one-line notes; no schema work is required while jotting something down.
- Tickets sync through the household Firebase branch.
- Individual tickets can be edited or deleted.
- `一次给 GPT` copies all tickets, oldest first, into one prompt that instructs ChatGPT to read the current repo and verify time-sensitive public restaurant facts before making changes.
- Copying does **not** delete tickets.
- `清空` requires explicit confirmation.

Typical notes may mix discovery and maintenance, e.g. `Fort Lee 那家拉面查一下` or `Bonchon 加炸鸡 tag`.

## Filters

Search covers name, description, full address, tags, and platform names.

Service filter:

- `全部`
- `堂食`
- `外卖`

Want filter:

- `全部`
- `有人想吃`
- `猫猫`
- `呜哇`
- `都想吃`

Tag filter is a Meal Builder-style multi-select chip set:

- Values are derived from `restaurants.json`; no tag enum is maintained separately.
- Default is **all tags selected**.
- Each chip toggles independently.
- `全选` and `全不选` use the same circle-check / circle-x bulk-action language as Meal Builder.
- UI shows `已选 X / Y`.
- Within Tag, matching is **OR**: a restaurant remains if any of its tags is selected.
- No tags selected means zero restaurants, not an implicit reset to all.

Ordering-platform filter remains a data-derived select.

Different dimensions combine with **AND**: search AND service AND want AND tag AND platform.

## Validation

`parseRestaurants` rejects:

- non-array datasets
- duplicate or empty ids
- missing/empty/overlong descriptions
- missing required address fields
- records with fewer than 1 or more than 2 tags
- duplicate tags
- non-boolean `dineIn`
- malformed or duplicate ordering platforms
- modes other than `delivery` / `pickup`
- duplicate modes
- non-HTTPS external URLs
- records with neither dine-in nor an ordering platform
- malformed `verifiedDate`
- unknown fields at the record, address, or platform level

Private interaction normalizers reject malformed ratings, wants, comments, and Inbox tickets; Firebase rules independently enforce household access and stored field shape.

## Current record

Bloom Chicken — 365 Essex St, Hackensack, NJ 07601.

- Tags: `韩餐`, `炸鸡`
- Description: `脆皮韩式炸鸡，鸡翅鸡块为主。`
- Public information verified: 2026-08-28

Future refreshes must recheck service modes and links rather than assuming they remain unchanged.

## Deliberately deferred

Do not add without a later requirement:

- third-party/public rating aggregates or review counts
- price levels
- opening hours / open-now state
- menu-item records or favorite dishes
- photos or third-party image embeds
- distance/drive estimates
- reservations
- order history
- platform fees, minimum order, delivery time, or promotions

## Acceptance

- Public restaurant facts stay in strictly validated `restaurants.json`; household state stays authenticated and private.
- Every public record has a short description, complete address, and exactly 1–2 reusable tags.
- Bloom Chicken uses `韩餐` + `炸鸡` and the approved short description.
- Tag chips default to all selected, support select-all/select-none, and OR-match selected tags.
- Cat and dog each have independent integer 1–5 ratings with no average.
- `想吃` uses a text-only button, displays the supplied member artwork, and moves wanted restaurants ahead of unwanteds.
- Comments use household identity/avatar conventions and remain private.
- Restaurants Inbox batches freeform notes for GPT without auto-clearing them.
- Full project verification, including Restaurants Firebase rules tests, passes before completion.
