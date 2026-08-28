import { dayTripCommentsFor, type DayTripComment, type DayTripInteractionState, type DayTripReaction } from './dayTripInteractions.ts';

const DAY_TRIP_LEGACY_INTERACTION_IDS: Record<string, readonly string[]> = {
  'bergen-county-zoo': ['van-saun-harmony-playground'],
};

export function dayTripLegacyInteractionIds(destinationId: string): readonly string[] {
  return DAY_TRIP_LEGACY_INTERACTION_IDS[destinationId] ?? [];
}

export function dayTripReactionsForDestination(
  state: DayTripInteractionState,
  destinationId: string,
): Record<string, DayTripReaction> {
  const merged: Record<string, DayTripReaction> = {};
  for (const legacyId of dayTripLegacyInteractionIds(destinationId)) {
    Object.assign(merged, state.reactions[legacyId] ?? {});
  }
  Object.assign(merged, state.reactions[destinationId] ?? {});
  return merged;
}

export function dayTripCommentsForDestination(
  state: DayTripInteractionState,
  destinationId: string,
): DayTripComment[] {
  return [destinationId, ...dayTripLegacyInteractionIds(destinationId)]
    .flatMap((id) => dayTripCommentsFor(state, id))
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
