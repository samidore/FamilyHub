const privateFieldNames = new Set([
  'childname', 'familyname', 'homeaddress', 'personalphone', 'personalemail', 'medicalrecord',
  'diagnosis', 'insuranceid', 'appointment', 'privateschedule', 'travelplan', 'locationhistory',
  'familyphoto', 'personalnote', 'privatenote', 'token', 'secret', 'password',
]);

const dayTripKeys = ['name', 'shortName', 'location', 'category', 'driveMin', 'driveMax', 'status', 'ratings', 'tags', 'conditions', 'verifiedFacts', 'familyFit', 'risks', 'beforeYouGo', 'googleMapsUrl', 'officialUrl', 'verifiedDate', 'recommendationScore'];
const eventKeys = ['day', 'dayOrder', 'time', 'timeOrder', 'name', 'library', 'location', 'drive', 'age', 'ageGroup', 'description', 'registration', 'badges', 'googleMapsUrl', 'officialUrl', 'verifiedDate', 'dateRange'];
const dentistKeys = ['name', 'provider', 'tier', 'rank', 'location', 'driveMin', 'driveMax', 'rating', 'reviewCount', 'healthgradesRating', 'healthgradesReviewCount', 'healthgradesWrittenCount', 'healthgradesEvidence', 'healthgradesTags', 'healthgradesNegativeSummary', 'negativeClassification', 'acceptsNewPatients', 'trainingSummary', 'schoolContext', 'certificationsAwards', 'longTermFit', 'strengths', 'concernLevel', 'secondaryReviewSummary', 'reviewSources', 'healthgradesUrl', 'officialUrl', 'googleMapsUrl', 'verifiedDate'];
const ratingKeys = ['indoor', 'outdoor', 'stroller', 'weather', 'toddler', 'parent'];

const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function exactObject(value, required, optional, path) {
  if (!isObject(value)) fail(path, 'expected an object');
  const allowed = new Set([...required, ...optional]);
  for (const key of required) if (!(key in value)) fail(path, `missing required field “${key}”`);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(path, `unknown field “${key}”`);
}

function text(value, path, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) fail(path, 'expected non-empty text');
}

function number(value, path, min = 0, max = Number.POSITIVE_INFINITY) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(path, `expected a number from ${min} to ${max}`);
}

function integer(value, path, min = 0) {
  number(value, path, min);
  if (!Number.isInteger(value)) fail(path, 'expected an integer');
}

function nullableNumber(value, path, min = 0, max = Number.POSITIVE_INFINITY) {
  if (value !== null) number(value, path, min, max);
}

function strings(value, path) {
  if (!Array.isArray(value)) fail(path, 'expected a text array');
  value.forEach((item, index) => text(item, `${path}[${index}]`));
}

function https(value, path, host) {
  text(value, path);
  let url;
  try { url = new URL(value); } catch { fail(path, 'expected a valid URL'); }
  if (url.protocol !== 'https:') fail(path, 'URL must use HTTPS');
  if (host && url.hostname !== host) fail(path, `URL must use ${host}`);
}

function verifiedDate(value, path) {
  text(value, path, true);
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(path, 'expected YYYY-MM-DD or an empty value');
}

function distance(value, path) {
  if (value !== undefined) nullableNumber(value, path, 0, 500);
}

function scanPrivacy(value, path) {
  if (Array.isArray(value)) return value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`));
  if (!isObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (privateFieldNames.has(key.toLowerCase())) fail(`${path}.${key}`, 'private-family field is not allowed in public data');
    scanPrivacy(item, `${path}.${key}`);
  }
}

function parseList(value, label, parseRecord) {
  if (!Array.isArray(value)) fail(label, 'expected an array');
  value.forEach((record, index) => parseRecord(record, `${label}[${index}]`));
  scanPrivacy(value, label);
  return value;
}

export function parseDayTrips(value) {
  return parseList(value, 'day-trips', (record, path) => {
    exactObject(record, dayTripKeys, ['distanceMiles'], path);
    ['name', 'shortName', 'location', 'category', 'status', 'verifiedFacts', 'familyFit', 'risks', 'beforeYouGo'].forEach((key) => text(record[key], `${path}.${key}`));
    number(record.driveMin, `${path}.driveMin`, 0, 300); number(record.driveMax, `${path}.driveMax`, record.driveMin, 300); distance(record.distanceMiles, `${path}.distanceMiles`);
    exactObject(record.ratings, ratingKeys, [], `${path}.ratings`);
    ratingKeys.forEach((key) => nullableNumber(record.ratings[key], `${path}.ratings.${key}`, 0, 5));
    strings(record.tags, `${path}.tags`); strings(record.conditions, `${path}.conditions`);
    https(record.googleMapsUrl, `${path}.googleMapsUrl`); https(record.officialUrl, `${path}.officialUrl`);
    verifiedDate(record.verifiedDate, `${path}.verifiedDate`); number(record.recommendationScore, `${path}.recommendationScore`, 0, 5);
  });
}

export function parseLibraryEvents(value) {
  return parseList(value, 'library-events', (record, path) => {
    exactObject(record, eventKeys, ['distanceMiles'], path);
    ['day', 'time', 'name', 'library', 'location', 'drive', 'age', 'ageGroup', 'description', 'registration'].forEach((key) => text(record[key], `${path}.${key}`));
    integer(record.dayOrder, `${path}.dayOrder`, 0); integer(record.timeOrder, `${path}.timeOrder`, 0); distance(record.distanceMiles, `${path}.distanceMiles`);
    strings(record.badges, `${path}.badges`); https(record.googleMapsUrl, `${path}.googleMapsUrl`); https(record.officialUrl, `${path}.officialUrl`);
    verifiedDate(record.verifiedDate, `${path}.verifiedDate`); text(record.dateRange, `${path}.dateRange`, true);
  });
}

export function parsePediatricDentists(value) {
  return parseList(value, 'pediatric-dentists', (record, path) => {
    exactObject(record, dentistKeys, ['distanceMiles'], path);
    ['name', 'provider', 'location', 'healthgradesEvidence', 'healthgradesNegativeSummary', 'negativeClassification', 'acceptsNewPatients', 'trainingSummary', 'schoolContext', 'certificationsAwards', 'longTermFit', 'concernLevel', 'secondaryReviewSummary'].forEach((key) => text(record[key], `${path}.${key}`));
    integer(record.tier, `${path}.tier`, 1); if (record.tier > 3) fail(`${path}.tier`, 'expected tier 1–3');
    integer(record.rank, `${path}.rank`, 1); number(record.driveMin, `${path}.driveMin`, 0, 300); number(record.driveMax, `${path}.driveMax`, record.driveMin, 300); distance(record.distanceMiles, `${path}.distanceMiles`);
    number(record.rating, `${path}.rating`, 0, 5); integer(record.reviewCount, `${path}.reviewCount`, 0); nullableNumber(record.healthgradesRating, `${path}.healthgradesRating`, 0, 5);
    integer(record.healthgradesReviewCount, `${path}.healthgradesReviewCount`, 0); integer(record.healthgradesWrittenCount, `${path}.healthgradesWrittenCount`, 0);
    strings(record.healthgradesTags, `${path}.healthgradesTags`); strings(record.strengths, `${path}.strengths`); strings(record.reviewSources, `${path}.reviewSources`);
    https(record.healthgradesUrl, `${path}.healthgradesUrl`, 'www.healthgrades.com'); https(record.officialUrl, `${path}.officialUrl`); https(record.googleMapsUrl, `${path}.googleMapsUrl`);
    verifiedDate(record.verifiedDate, `${path}.verifiedDate`);
  });
}
