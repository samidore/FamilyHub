# Restaurants

## Purpose

Provide a mobile-first public restaurant directory for choosing between on-site dining and takeout ordering without duplicating one physical location into separate records.

One physical restaurant location is one record. A chain with multiple addresses uses one record per address because services, ordering platforms, and links may differ.

## Route and data

- Route: `/restaurants/`
- Category: `food-home`
- Privacy class: `public-reference`
- Dataset: `src/data/restaurants.json`
- Parser: `src/data/restaurantSchema.mjs` / `parseRestaurants`
- Type: `src/data/restaurantTypes.ts` / `Restaurant`
- Card: `src/modules/restaurants/RestaurantCard.astro`

Only public restaurant facts belong here. Do not store household favorites, order history, visit history, personal notes, or other private household state in this module.

## Record model

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

## Semantics

Restaurant-level service has only two concepts:

- `堂食` — `dineIn: true`. This means the location has verified on-site seating; outdoor seating counts as on-site dining.
- `外卖` — `orderPlatforms` is non-empty.

`自取` is not a separate restaurant-level service. It is a fulfillment mode inside an ordering platform.

- `delivery` = platform delivery.
- `pickup` = order through that platform and collect at the restaurant address.
- A platform may support one or both modes.
- Do not add top-level `delivery` or `pickup` booleans.

Every record has exactly 1 or 2 short tags. Tag and platform filter values are derived from the data rather than hard-coded enums.

## Link rules

Every record has three fixed link fields in this order:

1. official website
2. Google Maps
3. Yelp

Each may be `null` only when no usable public link can be found. The card always renders all three buttons. A null link is a non-focusable grey disabled control labeled with `暂无`; it is not hidden and is not a broken anchor.

Ordering-platform URLs are separate from those three fixed reference links.

## Validation

`parseRestaurants` rejects:

- non-array datasets
- duplicate or empty ids
- missing required address fields
- any record with fewer than 1 or more than 2 tags
- duplicate tags
- non-boolean `dineIn`
- malformed platform records
- duplicate platform names within one restaurant
- platform modes other than `delivery` or `pickup`
- duplicate platform modes
- non-HTTPS external URLs
- records with neither dine-in nor any ordering platform
- missing or malformed `verifiedDate`
- unknown fields at the record, address, or platform level

The shared validation script loads and parses the restaurant dataset.

## Page behavior

The page is server-rendered and uses the shared Family Hub header, filter shell, record-grid, result count, clear action, empty state, and mobile-first accessibility patterns.

Primary controls:

- text search across name, address, tags, and platform names
- service filter: `全部 / 堂食 / 外卖`

Secondary filters:

- Tag
- ordering platform

Default ordering is deterministic restaurant-name order. No recommendation score is used.

Each card shows:

- 1–2 tags
- restaurant name
- full address
- `堂食` and/or `外卖` badges
- each ordering platform, its `配送 / 自取` modes, and direct ordering action
- fixed `官网 / Google Maps / Yelp` buttons
- `verifiedDate`

## Current records

The initial record is Bloom Chicken at 365 Essex St, Hackensack, NJ 07601. Its public information was refreshed on 2026-08-28. The dataset records its verified ordering platforms and the three standard external links; future refreshes should recheck service modes and links rather than assuming they remain unchanged.

## Deliberately deferred

Do not add these without a later requirement:

- ratings or review counts
- price levels
- opening hours / open-now state
- menu-item records or favorite dishes
- photos or third-party image embeds
- distance/drive estimates
- reservation platforms
- order history, favorites, or household-specific notes
- platform fees, minimum order, delivery time, or promotions

## Acceptance

- One physical location maps to one record.
- Every record has a complete address and exactly 1–2 tags.
- Restaurant-level service is only `堂食` and `外卖`.
- `自取` exists only inside platform modes.
- Every ordering option has a named platform and HTTPS URL.
- Every record has fixed official / Maps / Yelp link slots and unavailable links stay visibly disabled.
- The page supports search plus service, Tag, and platform filtering.
- The module is registered as typed, strictly validated `public-reference` data.
