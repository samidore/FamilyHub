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
