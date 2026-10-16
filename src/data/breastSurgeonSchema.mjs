const requiredKeys = [
  'id', 'name', 'system', 'practice', 'locationScope', 'address', 'phone', 'tier', 'rank',
  'clinicalFit', 'fitSignals', 'clinicalSummary', 'trainingSummary', 'centerSummary',
  'strengths', 'evidenceGaps', 'availability', 'licenseStatus', 'disciplineStatus',
  'negativeSummary', 'verificationQuestions', 'reviewEvidence', 'officialUrl',
  'centerUrl', 'verifiedDate',
];
const reviewKeys = ['source', 'scope', 'rating', 'reviewCount', 'writtenCount', 'url', 'summary'];
const privateFields = new Set([
  'childname', 'familyname', 'homeaddress', 'personalphone', 'personalemail',
  'medicalrecord', 'diagnosis', 'insuranceid', 'groupnumber', 'insurancecard',
  'appointment', 'privateschedule', 'patientname', 'patientage', 'birthdate',
  'pathologyreport', 'imagingreport', 'personalnote', 'token', 'secret', 'password',
]);
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const object = (item) => item !== null && typeof item === 'object' && !Array.isArray(item);
const checkKeys = (item, keys, path) => {
  if (!object(item)) fail(path, 'expected object');
  if (Object.keys(item).length !== keys.length || keys.some((key) => !(key in item)) ||
    Object.keys(item).some((key) => !keys.includes(key))) fail(path, 'invalid or missing keys');
};
const string = (item, path) => {
  if (typeof item !== 'string' || !item.trim()) fail(path, 'expected non-empty string');
};
const strings = (items, path, nonEmpty = true) => {
  if (!Array.isArray(items) || (nonEmpty && items.length === 0)) fail(path, 'expected text array');
  items.forEach((item, index) => string(item, `${path}[${index}]`));
};
const choice = (item, options, path) => {
  if (!options.includes(item)) fail(path, `expected one of ${options.join(', ')}`);
};
const https = (item, path) => {
  string(item, path);
  let url;
  try { url = new URL(item); } catch { fail(path, 'invalid url'); }
  if (url.protocol !== 'https:' || url.username || url.password) fail(path, 'expected public HTTPS URL');
  return url;
};
const privacy = (value, path) => {
  if (Array.isArray(value)) return value.forEach((item, index) => privacy(item, `${path}[${index}]`));
  if (!object(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (privateFields.has(key.toLowerCase())) fail(`${path}.${key}`, 'private patient data forbidden');
    privacy(item, `${path}.${key}`);
  }
};

export function parseBreastSurgeons(value) {
  if (!Array.isArray(value) || value.length === 0) fail('breast-surgeons', 'expected records');
  const ids = new Set();
  const ranks = new Set();
  value.forEach((item, i) => {
    const path = `breast-surgeons[${i}]`;
    checkKeys(item, requiredKeys, path);
    for (const key of [
      'id', 'name', 'system', 'practice', 'address', 'phone', 'clinicalSummary',
      'trainingSummary', 'centerSummary', 'negativeSummary', 'verifiedDate',
    ]) string(item[key], `${path}.${key}`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) fail(path, 'expected stable kebab-case id');
    if (ids.has(item.id)) fail(path, 'duplicate id');
    ids.add(item.id);
    if (!/\b(?:MD|DO)\b/.test(item.name)) fail(path, 'expected named physician with MD/DO');
    if (!/^[0-9]{3}-[0-9]{3}-[0-9]{4}$/.test(item.phone)) fail(path, 'invalid phone');
    choice(item.locationScope, ['bergen-nj', 'nearby-nj', 'ny-alternative'], `${path}.locationScope`);
    choice(item.clinicalFit, ['strong', 'adequate', 'oncology-focused'], `${path}.clinicalFit`);
    choice(item.availability, ['listed-accepting', 'needs-call'], `${path}.availability`);
    const statuses = ['requires-confirmation', 'verified', 'screened-clear', 'concern'];
    choice(item.licenseStatus, ['requires-confirmation', 'verified', 'concern'], `${path}.licenseStatus`);
    choice(item.disciplineStatus, statuses, `${path}.disciplineStatus`);
    if (!Number.isInteger(item.tier) || item.tier < 1 || item.tier > 3) fail(path, 'invalid tier');
    if (!Number.isInteger(item.rank) || item.rank < 1 || ranks.has(item.rank)) fail(path, 'invalid / duplicate rank');
    ranks.add(item.rank);
    if (item.tier === 1 && (item.licenseStatus !== 'verified' || item.disciplineStatus !== 'screened-clear'))
      fail(path, 'Tier 1 requires independent state license and discipline evidence');
    for (const key of ['fitSignals', 'strengths', 'evidenceGaps', 'verificationQuestions']) strings(item[key], `${path}.${key}`);
    if (!Array.isArray(item.reviewEvidence)) fail(path, 'expected reviewEvidence array');
    const reviewSources = new Set();
    item.reviewEvidence.forEach((review, j) => {
      const rp = `${path}.reviewEvidence[${j}]`;
      checkKeys(review, reviewKeys, rp);
      choice(review.source, ['Healthgrades', 'Health system', 'Zocdoc'], `${rp}.source`);
      choice(review.scope, ['physician'], `${rp}.scope`);
      if (reviewSources.has(review.source)) fail(rp, 'duplicate review platform');
      reviewSources.add(review.source);
      if (review.rating !== null &&
        (typeof review.rating !== 'number' || review.rating < 0 || review.rating > 5)) fail(rp, 'invalid rating');
      if (!Number.isInteger(review.reviewCount) || review.reviewCount < 0) fail(rp, 'invalid review count');
      if (review.writtenCount !== null &&
        (!Number.isInteger(review.writtenCount) || review.writtenCount < 0 ||
          review.writtenCount > review.reviewCount)) fail(rp, 'invalid written count');
      if ((review.rating === null) !== (review.reviewCount === 0)) fail(rp, 'unknown ratings must have zero count');
      string(review.summary, `${rp}.summary`);
      const url = https(review.url, `${rp}.url`);
      if (review.source === 'Healthgrades') {
        const slug = url.pathname.match(/^\/physician\/dr-([a-z0-9-]+)\/?$/)?.[1];
        if (url.hostname !== 'www.healthgrades.com' || url.search || !slug?.startsWith(`${item.id}-`))
          fail(rp, 'Healthgrades must match the named physician direct profile, never a search/directory page');
      }
    });
    https(item.officialUrl, `${path}.officialUrl`);
    https(item.centerUrl, `${path}.centerUrl`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.verifiedDate) ||
      Number.isNaN(Date.parse(item.verifiedDate))) fail(path, 'invalid verifiedDate');
    if (item.locationScope === 'ny-alternative' && !item.address.includes('NY ')) fail(path, 'NY location mismatch');
    if (item.locationScope !== 'ny-alternative' && !item.address.includes('NJ ')) fail(path, 'NJ location mismatch');
  });
  if (![...ranks].sort((a, b) => a - b).every((rank, i) => rank === i + 1))
    fail('breast-surgeons', 'ranks must be contiguous');
  privacy(value, 'breast-surgeons');
  return value;
}
