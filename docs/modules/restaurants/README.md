# Restaurants

> Status: design draft only. The module is not implemented or registered yet.

## Purpose

Provide a small, mobile-first restaurant directory for choosing between dine-in, delivery, and pickup without duplicating the same restaurant into separate records.

The canonical item is one physical restaurant location. A chain with two locations is two records because address, service modes, and ordering platforms may differ.

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
- whether direct/self pickup is available
- zero or more ordering platforms
- required Google Maps link
- optional official website/menu link
- required `verifiedDate`

Tags are the main cuisine/style classification. Keep them short and useful for choosing a restaurant, for example `中餐`, `川菜`, `日料`, `披萨`, `早茶`, or `甜品`. Do not hard-code a closed tag enum in code; filters should derive their available values from the data. Validation should require 1–2 non-empty, unique tags.

Platform names should also remain data-driven rather than a closed enum so a new provider does not require a schema migration.

## Service semantics

Do not create separate dine-in, delivery, and pickup records for one restaurant.

- `dineIn: true` means the location supports eating there.
- `pickup: true` means the restaurant allows the customer to collect the order at the listed address, regardless of whether a platform is used to place that pickup order.
- Delivery is derived from ordering platforms: a restaurant has delivery only when at least one platform entry includes `delivery` in its modes.
- A platform may support `delivery`, `pickup`, or both.
- Every delivery option therefore always has an explicit platform and restaurant-specific HTTPS ordering link by construction.

This keeps the user's requirement “delivery must have a platform” enforceable without a redundant `delivery: boolean` that could disagree with the platform data.

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
  pickup: boolean;
  orderPlatforms: RestaurantOrderPlatform[];
  googleMapsUrl: string;
  officialUrl?: string | null;
  verifiedDate: string;
}
```

### Validation rules

- `id` is unique and stable.
- `name` is non-empty.
- Address is required for every record; `line1`, `city`, `state`, and `postalCode` are non-empty.
- `tags` contains exactly 1 or 2 unique non-empty strings.
- `orderPlatforms` may be empty for dine-in/pickup-only restaurants.
- Every platform has a non-empty name, an HTTPS URL, and 1–2 unique modes drawn only from `delivery` and `pickup`.
- Platform names must be unique within one restaurant record.
- A record must provide at least one usable service: `dineIn`, `pickup`, or a platform mode.
- `googleMapsUrl` is required and HTTPS.
- `officialUrl`, when present, is HTTPS.
- `verifiedDate` uses `YYYY-MM-DD` and is required when a record is added or refreshed.
- Unknown public facts remain unknown; do not infer service availability or platform support.

## Page design

### Header

Use the shared Family Hub header pattern.

- Eyebrow: `饮食与家庭 · 饭店`
- Title: `Restaurants`
- Description: `按堂食、外送、自取、类型和平台快速找饭店。`
- Summary count is derived from the dataset.
- Reuse the existing `berry` family and `meal` icon unless implementation reveals a clear reason to add a new icon.

### Primary controls

Keep the first screen compact and useful one-handed:

1. Search input
   - searches restaurant name, full address, tags, and platform names
2. Service filter
   - `全部`
   - `堂食`
   - `外送`
   - `自取`

Use a single service filter rather than several independent toggles in the first version. A restaurant can still display multiple service badges; the filter simply asks which capability must be present.

### Secondary filters

Place these in the shared collapsible filter area:

- `Tag` — values derived from all record tags
- `平台` — values derived from all ordering platform names

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

[堂食] [外送] [自取]

DoorDash   外送 / 自取   [打开]
Uber Eats  外送          [打开]

[Google Maps] [官网]
核实：2026-08-27
```

Card rules:

- Show the 1–2 tags at the top.
- Always show the full address.
- Show service badges only when supported.
- Derive the `外送` badge from platform modes rather than storing it independently.
- Show `自取` when `pickup` is true or at least one platform explicitly offers pickup.
- Show each ordering platform on its own row with its supported modes and one direct action.
- Hide the platform section entirely when there are no platform entries.
- `Google Maps` is always available.
- Show the official link only when present.
- Display `verifiedDate` because service/platform availability is time-sensitive.

No accordion/details section is needed in the initial version because the record intentionally contains very little secondary information.

## Empty and edge states

- No search/filter matches: explain that no restaurant matches and provide the shared clear-filter action.
- Restaurant has dine-in only: address + `堂食` + Maps; no platform section.
- Restaurant has pickup only: address + `自取` + Maps; no delivery badge unless a platform actually provides delivery.
- Restaurant has delivery but no dine-in: show `外送`, platform rows, and `自取` only if pickup is actually supported.
- A platform supporting both modes is one row, not duplicated.

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
- The model supports dine-in, delivery, and pickup without duplicating a restaurant.
- Every delivery capability is backed by at least one named ordering platform and HTTPS ordering link.
- A delivery platform can independently support delivery, pickup, or both.
- The page design exposes service filtering, tag filtering, platform filtering, search, address, Maps, and ordering actions on mobile.
- No arbitrary ratings, ranking numbers, hours, menu items, or private household state are required for v1.
- The future implementation remains a typed, strictly validated `public-reference` module and follows the shared Family Hub mobile/accessibility patterns.
