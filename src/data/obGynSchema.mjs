const privateFieldNames = new Set([
  'childname', 'familyname', 'homeaddress', 'personalphone', 'personalemail', 'medicalrecord',
  'diagnosis', 'insuranceid', 'groupnumber', 'appointment', 'privateschedule', 'travelplan',
  'locationhistory', 'familyphoto', 'personalnote', 'privatenote', 'token', 'secret', 'password',
]);

const providerKeys = ['id', 'name', 'practice', 'location', 'scopes', 'placements', 'evidence', 'reviews', 'availability', 'strengths', 'checks', 'officialUrl', 'healthgradesUrl', 'verifiedDate'];
const placementRequired = ['section', 'rank', 'tier', 'familyScore'];
const placementOptional = ['hospitalRelation', 'deliveryModel'];
const sections = ['valley-ob', 'hackensack-ob', 'englewood-ob', 'gyn'];
const relations = ['confirmed-delivery', 'likely-delivery', 'affiliation-only', 'unclear'];

const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function exactObject(value, required, optional, path) {
  if (!isObject(value)) fail(path, 'expected an object');
  const allowed = new Set([...required, ...optional]);
  for (const key of required) if (!(key in value)) fail(path, `missing required field “${key}”`);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(path, `unknown field “${key}”`);
}

function text(value, path, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) fail(path, 'expected text');
}

function integer(value, path, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) fail(path, `expected integer ${min}–${max}`);
}

function strings(value, path, allowed = null) {
  if (!Array.isArray(value) || value.length === 0) fail(path, 'expected a non-empty text array');
  value.forEach((item, index) => {
    text(item, `${path}[${index}]`);
    if (allowed && !allowed.includes(item)) fail(`${path}[${index}]`, `expected one of ${allowed.join(', ')}`);
  });
}

function https(value, path, allowEmpty = false) {
  text(value, path, allowEmpty);
  if (!value && allowEmpty) return;
  let url;
  try { url = new URL(value); } catch { fail(path, 'expected a valid URL'); }
  if (url.protocol !== 'https:') fail(path, 'URL must use HTTPS');
}

function scanPrivacy(value, path) {
  if (Array.isArray(value)) return value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`));
  if (!isObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (privateFieldNames.has(key.toLowerCase())) fail(`${path}.${key}`, 'private-family field is not allowed in public data');
    scanPrivacy(item, `${path}.${key}`);
  }
}

export function parseObGynProviders(value) {
  if (!Array.isArray(value)) fail('ob-gyn', 'expected an array');
  const ids = new Set();
  const placementKeys = new Set();
  value.forEach((record, index) => {
    const path = `ob-gyn[${index}]`;
    exactObject(record, providerKeys, [], path);
    ['id', 'name', 'practice', 'location', 'evidence', 'reviews', 'availability'].forEach((key) => text(record[key], `${path}.${key}`));
    if (!/^[a-z0-9-]+$/.test(record.id)) fail(`${path}.id`, 'expected a stable kebab-case id');
    if (ids.has(record.id)) fail(`${path}.id`, 'duplicate provider id');
    ids.add(record.id);
    if (!/\b(?:MD|DO)\b/.test(record.name)) fail(`${path}.name`, 'expected an MD or DO credential');
    strings(record.scopes, `${path}.scopes`, ['ob', 'gyn']);
    if (new Set(record.scopes).size !== record.scopes.length) fail(`${path}.scopes`, 'duplicate scope');
    strings(record.strengths, `${path}.strengths`);
    strings(record.checks, `${path}.checks`);
    if (!Array.isArray(record.placements) || record.placements.length === 0) fail(`${path}.placements`, 'expected placements');
    record.placements.forEach((placement, placementIndex) => {
      const placementPath = `${path}.placements[${placementIndex}]`;
      exactObject(placement, placementRequired, placementOptional, placementPath);
      if (!sections.includes(placement.section)) fail(`${placementPath}.section`, 'unknown section');
      integer(placement.rank, `${placementPath}.rank`, 1, 10);
      integer(placement.tier, `${placementPath}.tier`, 1, 3);
      integer(placement.familyScore, `${placementPath}.familyScore`, 0, 100);
      const placementKey = `${placement.section}:${placement.rank}`;
      if (placementKeys.has(placementKey)) fail(placementPath, `duplicate section rank ${placementKey}`);
      placementKeys.add(placementKey);
      if (placement.section === 'gyn') {
        if (placement.hospitalRelation !== undefined || placement.deliveryModel !== undefined) fail(placementPath, 'GYN placement must not carry delivery fields');
        if (!record.scopes.includes('gyn')) fail(placementPath, 'GYN placement requires gyn scope');
      } else {
        if (!record.scopes.includes('ob')) fail(placementPath, 'OB placement requires ob scope');
        if (!relations.includes(placement.hospitalRelation)) fail(`${placementPath}.hospitalRelation`, 'invalid or missing hospital relation');
        text(placement.deliveryModel, `${placementPath}.deliveryModel`);
      }
    });
    https(record.officialUrl, `${path}.officialUrl`);
    https(record.healthgradesUrl, `${path}.healthgradesUrl`, true);
    text(record.verifiedDate, `${path}.verifiedDate`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.verifiedDate)) fail(`${path}.verifiedDate`, 'expected YYYY-MM-DD');
  });
  for (const section of sections) {
    const count = [...placementKeys].filter((key) => key.startsWith(`${section}:`)).length;
    if (count !== 10) fail('ob-gyn', `${section} must contain exactly 10 ranked placements; found ${count}`);
  }
  scanPrivacy(value, 'ob-gyn');
  return value;
}
