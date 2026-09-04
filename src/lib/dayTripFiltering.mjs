export function filterDayTripLocations(locations, { weather = 'sunny', environment = '', stroller = false, openNow = false, bicycleFree = false, isOpen = () => true } = {}) {
  return locations
    .filter((location) => weather === 'sunny' || !location.notFor.includes(weather))
    .filter((location) => !environment || location.environment === environment)
    .filter((location) => !stroller || location.stroller === true)
    .filter((location) => !openNow || isOpen(location.hours))
    .filter((location) => !bicycleFree || location.bikeExposure === 'low');
}

export function matchesDayTripActivities(locations, selectedActivities, constraints = {}) {
  if (constraints.noPlayground && locations.some((location) => location.tags.includes('playground'))) return false;
  const surviving = filterDayTripLocations(locations, constraints);
  if (!surviving.length) return false;
  const available = new Set(surviving.flatMap((location) => location.tags));
  return [...selectedActivities].some((activity) => available.has(activity));
}
