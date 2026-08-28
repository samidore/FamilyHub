const privateFieldNames = new Set([
  'childname', 'familyname', 'homeaddress', 'personalphone', 'personalemail', 'medicalrecord',
  'diagnosis', 'insuranceid', 'appointment', 'privateschedule', 'travelplan', 'locationhistory',
  'familyphoto', 'personalnote', 'privatenote', 'token', 'secret', 'password',
]);

const destinationRequired = [
  'id', 'name', 'city', 'state', 'driveMinutes', 'note', 'locations',
  'googleMapsUrl', 'officialUrl', 'verifiedDate',
];
const destinationOptional = ['aliases', 'notice'];
const locationKeys = ['name', 'environment', 'tags', 'notFor', 'stroller', 'hours'];
const activityTags = ['woody-walk', 'playground', 'indoor-visit', 'animals', 'water-play', 'aquarium', 'pick-your-own'];
const weatherExclusions = ['rain', 'heat', 'post-rain'];
const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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

function strings(value, path) {
  if (!Array.isArray(value)) fail(path, 'expected a text array');
  value.forEach((item, index) => text(item, `${path}[${index}]`));
}

function enumValue(value, allowed, path) {
  if (!allowed.includes(value)) fail(path, `expected one of ${allowed.join(', ')}`);
}

function https(value, path) {
  text(value, path);
  let url;
  try { url = new URL(value); } catch { fail(path, 'expected a valid URL'); }
  if (url.protocol !== 'https:') fail(path, 'URL must use HTTPS');
  return url;
}

function googleMaps(value, path) {
  const url = https(value, path);
  if (!['google.com', 'www.google.com'].includes(url.hostname)) fail(path, 'expected a Google Maps URL');
  const isSearch = url.pathname.startsWith('/maps/search');
  const isPlace = url.pathname.startsWith('/maps/place/');
  if (!isSearch && !isPlace) fail(path, 'expected a Google Maps place/search URL');
  if (!isSearch) return;

  const query = url.searchParams.get('query')?.trim();
  if (!query) fail(path, 'Google Maps search URL needs a query');
  if (/^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(query)) {
    fail(path, 'coordinate-only Google Maps links are not allowed');
  }
}

function verifiedDate(value, path) {
  text(value, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(path, 'expected YYYY-MM-DD');
}

function unique(values, path) {
  if (new Set(values).size !== values.length) fail(path, 'duplicate values are not allowed');
}

function time(value, path) {
  text(value, path);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) fail(path, 'expected HH:MM');
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function hours(value, path) {
  if (value === 'always' || value === 'unknown') return;
  exactObject(value, weekdays, [], path);
  for (const weekday of weekdays) {
    const intervals = value[weekday];
    if (!Array.isArray(intervals)) fail(`${path}.${weekday}`, 'expected an interval array');
    let previousEnd = -1;
    intervals.forEach((interval, index) => {
      const intervalPath = `${path}.${weekday}[${index}]`;
      if (!Array.isArray(interval) || interval.length !== 2) fail(intervalPath, 'expected [open, close]');
      const start = time(interval[0], `${intervalPath}[0]`);
      const end = time(interval[1], `${intervalPath}[1]`);
      if (start >= end) fail(intervalPath, 'opening time must precede closing time');
      if (start < previousEnd) fail(intervalPath, 'intervals must not overlap');
      previousEnd = end;
    });
  }
}

function scanPrivacy(value, path) {
  if (Array.isArray(value)) return value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`));
  if (!isObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (privateFieldNames.has(key.toLowerCase())) fail(`${path}.${key}`, 'private-family field is not allowed in public data');
    scanPrivacy(item, `${path}.${key}`);
  }
}

export function parseDayTrips(value) {
  if (!Array.isArray(value)) fail('day-trips', 'expected an array');
  const ids = new Set();

  value.forEach((record, index) => {
    const path = `day-trips[${index}]`;
    exactObject(record, destinationRequired, destinationOptional, path);

    text(record.id, `${path}.id`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id)) fail(`${path}.id`, 'expected a stable kebab-case id');
    if (ids.has(record.id)) fail(`${path}.id`, 'duplicate id');
    ids.add(record.id);

    ['name', 'city', 'state', 'note'].forEach((key) => text(record[key], `${path}.${key}`));
    if (!/^[A-Z]{2}$/.test(record.state)) fail(`${path}.state`, 'expected a two-letter state code');
    if (!Number.isInteger(record.driveMinutes) || record.driveMinutes < 0 || record.driveMinutes > 300) {
      fail(`${path}.driveMinutes`, 'expected an integer from 0 to 300');
    }

    if (record.aliases !== undefined) {
      strings(record.aliases, `${path}.aliases`);
      unique(record.aliases, `${path}.aliases`);
    }
    if (record.notice !== undefined) text(record.notice, `${path}.notice`);

    if (!Array.isArray(record.locations) || record.locations.length < 1) {
      fail(`${path}.locations`, 'expected one or more coarse locations');
    }

    record.locations.forEach((location, locationIndex) => {
      const locationPath = `${path}.locations[${locationIndex}]`;
      exactObject(location, locationKeys, [], locationPath);
      text(location.name, `${locationPath}.name`);
      enumValue(location.environment, ['indoor', 'outdoor'], `${locationPath}.environment`);

      strings(location.tags, `${locationPath}.tags`);
      unique(location.tags, `${locationPath}.tags`);
      location.tags.forEach((tag, tagIndex) => enumValue(tag, activityTags, `${locationPath}.tags[${tagIndex}]`));

      strings(location.notFor, `${locationPath}.notFor`);
      unique(location.notFor, `${locationPath}.notFor`);
      location.notFor.forEach((weather, weatherIndex) => enumValue(weather, weatherExclusions, `${locationPath}.notFor[${weatherIndex}]`));

      if (typeof location.stroller !== 'boolean') fail(`${locationPath}.stroller`, 'expected a boolean');
      hours(location.hours, `${locationPath}.hours`);
    });

    googleMaps(record.googleMapsUrl, `${path}.googleMapsUrl`);
    https(record.officialUrl, `${path}.officialUrl`);
    verifiedDate(record.verifiedDate, `${path}.verifiedDate`);
  });

  scanPrivacy(value, 'day-trips');
  return value;
}
