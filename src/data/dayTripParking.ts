import type { DayTrip } from './types';

export type DayTripParkingPayment = 'cash-only' | 'automated-pay-station';

export interface DayTripParking {
  fee: string;
  schedule: string;
  payment?: DayTripParkingPayment;
  note?: string;
  sourceUrl: string;
  verifiedDate: string;
}

export interface DayTripWithParking extends DayTrip {
  parking?: DayTripParking;
}
