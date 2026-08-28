# Restaurants

> Status: design draft only. The module is not implemented or registered yet.

## Purpose

Provide a small, mobile-first restaurant directory for choosing between dine-in and takeout ordering without duplicating the same restaurant into separate records.

The canonical item is one physical restaurant location. A chain with two locations is two records because address, service modes, ordering platforms, and links may differ.

## Planned route and data

- Route: `/restaurants/`
- Category: `food-home`
- Privacy class: `public-reference`
- Dataset: `src/data/restaurants.json`
- Planned type: `Restaurant`
- Planned parser: `parseRestaurants`
- Planned card: `src/modules/restaurants/RestaurantCard.astro`

Only public restaurant facts belong in this module. Do not store order history, household favorites, personal notes, or other private household state in the public dataset.

## Item model

Each restaurant record contains:

- stable `id`
- restaurant `name`
- required structured `address`
- exactly 1 or 2 short `tags`
- whether dine-in is available
- zero or more takeout ordering platforms
- three fixed external-link slots: official website, Google Maps, and Yelp
- required `verifiedDate`

Tags are the main cuisine/style classification. Keep them short and useful for choosing a restaurant, for example `中餐`, `川菜`, `日料`, `披萨`, `早茶`, or `甜品`. Do not hard-code a closed tag enum in code; filters should derive their available values from the data. Validation should require 1–2 non-empty, unique tags.

Platform names should also remain data-driven rather than a closed enum so a new provider does not require a schema migration.

## Service semantics

At the restaurant level there are only two service concepts:

- `堂食` — represented by `dineIn: true`.
- `外卖` — represented by one or more entries in `orderPlatforms`.

`自取` is not a separate restaurant-level service. It is one fulfillment mode inside the broader `外卖` ordering flow.

- A platform may support `delivery`, `pickup`, or both.
- `delivery` means the platform can deliver the order.
- `pickup` means the order can be placed through that platform and collected at the restaurant address.
- A restaurant is considered to support `外卖` whenever `orderPlatforms` is non-empty, whether the available platform mode is delivery, pickup, or both.
- Every external-order option therefore always has a named platform and restaurant-specific HTTPS ordering link.

Do not create separate dine-in, delivery, and pickup records for one restaurant. Do not add top-level `delivery` or `pickup` booleans; those would duplicate facts already expressed by `orderPlatforms` and could become inconsistent.

## Proposed schema

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

### Validation rules

- `id` is unique and stable.
- `name` is non-empty.
- Address is required for every record; `line1`, `city`, `state`, and `postalCode` are non-empty.
- `tags` contains exactly 1 or 2 unique non-empty strings.
- `orderPlatforms` may be empty for dine-in-only restaurants.
- Every platform has a non-empty name, an HTTPS URL, and 1–2 unique modes drawn only from `delivery` and `pickup`.
- Platform names must be unique within one restaurant record.
- A record must provide at least one usable service: `dineIn: true` or a non-empty `orderPlatforms` array.
- `officialUrl`, `googleMapsUrl`, and `yelpUrl` are always present as schema fields but may be `null` when no usable public link can be found.
- Any non-null external URL must use HTTPS.
- `verifiedDate` uses `YYYY-MM-DD` and is required when a record is added or refreshed.
- Unknown public facts remain unknown; do not invent a URL or infer service/platform support.

## Page design

### Header

Use the shared Family Hub header pattern.

- Eyebrow: `饮食与家庭 · 饭店`
- Title: `Restaurants`
- Description: `按堂食、外卖、类型和平台快速找饭店。`
- Summary count is derived from the dataset.
- Reuse the existing `berry` family and `meal` icon unless implementation reveals a clear reason to add a new icon.

### Primary controls

Keep the first screen compact and useful one-handed:

1. Search input
   - searches restaurant name, full address, tags, and platform names
2. Service filter
   - `全部`
   - `堂食`
   - `外卖`

The `外卖` filter matches any restaurant with at least one ordering-platform entry, regardless of whether that platform offers delivery, pickup, or both.

### Secondary filters

Place these in the shared collapsible filter area:

- `Tag` — values derived from all record tags
- `平台` — values derived from all ordering platform names

Do not add a separate `自取` restaurant filter in v1. The fulfillment modes remain visible on each platform row.

Do not add city, price, rating, hours, or distance filters until real use shows they are needed.

### Sorting

Default to deterministic restaurant-name order. Do not add a ranking score or arbitrary priority number in the first version.

If a sort control is later needed, add it only for a real decision dimension such as name or verified date; do not create a hidden recommendation score solely to control display order.

## Restaurant card

The collapsed card should answer the main decision without opening details:

```text
[中餐] [川菜]
Restaurant Name
123 Main St, Fair Lawn, NJ 07410

[堂食] [外卖]

DoorDash   配送 / 自取   [打开]
Uber Eats  配送          [打开]

[官网] [Google Maps] [Yelp]
核实：2026-08-27
```

Card rules:

- Show the 1–2 tags at the top.
- Always show the full address.
- Show `堂食` only when `dineIn` is true.
- Show `外卖` whenever `orderPlatforms` is non-empty.
- Do not show `自取` as a restaurant-level badge.
- Show each ordering platform on its own row with its actual fulfillment modes (`配送`, `自取`, or both) and one direct action.
- Hide the platform section entirely when there are no platform entries.
- Always render exactly three fixed link buttons in the same order: `官网`, `Google Maps`, `Yelp`.
- When a corresponding URL is non-null, render a normal external link.
- When a corresponding URL is `null`, keep the button visible but disabled/greyed out. It must not be focusable or behave like a broken link, and the disabled state must be conveyed by more than color alone.
- Display `verifiedDate` because platform availability and public links can change over time.

No accordion/details section is needed in the initial version because the record intentionally contains very little secondary information.

## Empty and edge states

- No search/filter matches: explain that no restaurant matches and provide the shared clear-filter action.
- Restaurant has dine-in only: address + `堂食`; no platform section; all three standard link buttons still render and unavailable ones are disabled.
- Restaurant has takeout only: show `外卖`, platform rows, and no `堂食` badge.
- Pickup-only platform: the restaurant still counts as `外卖`; its platform row says `自取`.
- Delivery-only platform: its platform row says `配送`.
- A platform supporting both modes is one row labeled `配送 / 自取`, not duplicated.
- Missing official website, Maps result, or Yelp page does not invalidate the restaurant record; store `null` and show the corresponding disabled button.

## Planned implementation surface

When this draft is approved, the smallest implementation should touch only:

- `docs/modules/restaurants/README.md`
- `src/config/modules.ts`
- `src/data/restaurants.json`
- `src/data/types.ts`
- `src/data/schemas.mjs`
- `src/data/catalog.ts`
- `src/modules/restaurants/RestaurantCard.astro`
- `src/pages/restaurants.astro`
- applicable validation/tests

The home page should discover the module through the existing module registry rather than receiving restaurant-specific hard-coded navigation.

## Deliberately deferred

Do not include these in v1 unless a later requirement calls for them:

- restaurant ratings or review counts
- price levels
- opening hours / open-now state
- menu-item records or favorite dishes
- photos or remote embeds
- distance/drive estimates
- reservation platforms
- order history, favorites, visit history, or household-specific notes
- per-platform fees, minimum order, delivery time, or promotions

These fields either add substantial maintenance burden, create private household state, or are highly time-sensitive relative to the current goal.

## Initial acceptance criteria

- One physical restaurant location maps to one record.
- Every record has an address.
- Every record has exactly 1 or 2 tags.
- Restaurant-level service is modeled only as `堂食` and `外卖`.
- `自取` exists only as an ordering-platform fulfillment mode, not a separate restaurant-level service or top-level boolean.
- Every external-order capability is backed by at least one named ordering platform and HTTPS ordering link.
- A platform can independently support delivery, pickup, or both.
- Every record has three fixed link fields: official website, Google Maps, and Yelp; each may be `null` if genuinely unavailable.
- The card always renders the three corresponding buttons and greys/disables unavailable links instead of hiding them.
- The page design exposes service filtering, tag filtering, platform filtering, search, address, platform ordering actions, and all three fixed link buttons on mobile.
- No arbitrary ratings, ranking numbers, hours, menu items, or private household state are required for v1.
- The future implementation remains a typed, strictly validated `public-reference` module and follows the shared Family Hub mobile/accessibility patterns.
