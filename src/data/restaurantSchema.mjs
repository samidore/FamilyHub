const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function exactObject(value, required, optional, path) {
  if (!isObject(value)) fail(path, 'expected an object');
  const allowed = new Set([...required, ...optional]);
  for (const key of required) if (!(key in value)) fail(path, `missing required field “${key}”`);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(path, `unknown field “${key}”`);
}

function text(value, path) {
  if (typeof value !== 'string' || !value.trim()) fail(path, 'expected non-empty text');
}

function https(value, path) {
  text(value, path);
  let url;
  try { url = new URL(value); } catch { fail(path, 'expected a valid URL'); }
  if (url.protocol !== 'https:') fail(path, 'URL must use HTTPS');
}

function nullableHttps(value, path) {
  if (value !== null) https(value, path);
}

function uniqueTextArray(value, path, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(path, `expected ${min}–${max} text values`);
  value.forEach((item, index) => text(item, `${path}[${index}]`));
  const normalized = value.map((item) => item.trim().toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) fail(path, 'values must be unique');
}

export function parseRestaurants(value) {
  if (!Array.isArray(value)) fail('restaurants', 'expected an array');
  const ids = new Set();

  value.forEach((record, index) => {
    const path = `restaurants[${index}]`;
    exactObject(record, ['id', 'name', 'description', 'address', 'tags', 'dineIn', 'orderPlatforms', 'officialUrl', 'googleMapsUrl', 'yelpUrl', 'verifiedDate'], [], path);
    text(record.id, `${path}.id`);
    if (ids.has(record.id)) fail(`${path}.id`, 'must be unique');
    ids.add(record.id);
    text(record.name, `${path}.name`);
    text(record.description, `${path}.description`);
    if ([...record.description.trim()].length > 40) fail(`${path}.description`, 'keep restaurant descriptions short (40 characters max)');

    exactObject(record.address, ['line1', 'city', 'state', 'postalCode'], ['line2'], `${path}.address`);
    ['line1', 'city', 'state', 'postalCode'].forEach((key) => text(record.address[key], `${path}.address.${key}`));
    if (record.address.line2 !== undefined) text(record.address.line2, `${path}.address.line2`);

    uniqueTextArray(record.tags, `${path}.tags`, 1, 2);
    if (typeof record.dineIn !== 'boolean') fail(`${path}.dineIn`, 'expected a boolean');
    if (!Array.isArray(record.orderPlatforms)) fail(`${path}.orderPlatforms`, 'expected an array');

    const platformNames = new Set();
    record.orderPlatforms.forEach((platform, platformIndex) => {
      const platformPath = `${path}.orderPlatforms[${platformIndex}]`;
      exactObject(platform, ['name', 'url', 'modes'], [], platformPath);
      text(platform.name, `${platformPath}.name`);
      const normalizedName = platform.name.trim().toLocaleLowerCase();
      if (platformNames.has(normalizedName)) fail(`${platformPath}.name`, 'platform names must be unique within a restaurant');
      platformNames.add(normalizedName);
      https(platform.url, `${platformPath}.url`);
      uniqueTextArray(platform.modes, `${platformPath}.modes`, 1, 2);
      platform.modes.forEach((mode, modeIndex) => {
        if (!['delivery', 'pickup'].includes(mode)) fail(`${platformPath}.modes[${modeIndex}]`, 'expected delivery or pickup');
      });
    });

    if (!record.dineIn && record.orderPlatforms.length === 0) fail(path, 'restaurant must support dine-in or takeout ordering');
    nullableHttps(record.officialUrl, `${path}.officialUrl`);
    nullableHttps(record.googleMapsUrl, `${path}.googleMapsUrl`);
    nullableHttps(record.yelpUrl, `${path}.yelpUrl`);
    text(record.verifiedDate, `${path}.verifiedDate`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.verifiedDate)) fail(`${path}.verifiedDate`, 'expected YYYY-MM-DD');
  });

  return value;
}
