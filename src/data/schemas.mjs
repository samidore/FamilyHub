const privateFieldNames = new Set([
  'childname', 'familyname', 'homeaddress', 'personalphone', 'personalemail', 'medicalrecord',
  'diagnosis', 'insuranceid', 'appointment', 'privateschedule', 'travelplan', 'locationhistory',
  'familyphoto', 'personalnote', 'privatenote', 'token', 'secret', 'password',
]);

const dayTripKeys = ['name', 'shortName', 'location', 'category', 'driveMinutes', 'status', 'ratings', 'tags', 'conditions', 'verifiedFacts', 'familyFit', 'risks', 'beforeYouGo', 'googleMapsUrl', 'officialUrl', 'verifiedDate', 'recommendationScore'];
const eventKeys = ['day', 'dayOrder', 'time', 'timeOrder', 'name', 'library', 'location', 'drive', 'age', 'ageGroup', 'description', 'registration', 'badges', 'googleMapsUrl', 'officialUrl', 'verifiedDate', 'dateRange'];
const dentistKeys = ['name', 'provider', 'eligibility', 'evidenceBands', 'tier', 'rank', 'location', 'driveMin', 'driveMax', 'rating', 'reviewCount', 'healthgradesRating', 'healthgradesReviewCount', 'healthgradesWrittenCount', 'reviewConfidence', 'healthgradesEvidence', 'healthgradesTags', 'healthgradesNegativeSummary', 'negativeClassification', 'acceptsNewPatients', 'trainingSummary', 'schoolContext', 'certificationsAwards', 'longTermFit', 'strengths', 'concernLevel', 'secondaryReviewSummary', 'negativeFindings', 'verificationQuestions', 'reviewSources', 'healthgradesUrl', 'officialUrl', 'googleMapsUrl', 'verifiedDate'];
const adultDermatologistKeys = ['name', 'provider', 'gender', 'practice', 'location', 'locationScope', 'driveMin', 'driveMax', 'tier', 'rank', 'eligibility', 'evidenceBands', 'capabilities', 'perianalDermatitisSummary', 'primaryReviewSource', 'primaryRating', 'primaryReviewCount', 'primaryWrittenCount', 'healthgradesRating', 'healthgradesReviewCount', 'healthgradesWrittenCount', 'reviewConfidence', 'reviewEvidence', 'acceptsNewPatients', 'availability', 'trainingSummary', 'schoolContext', 'certificationsAwards', 'safetyEvidence', 'strengths', 'concernLevel', 'negativeSummary', 'negativeClassification', 'negativeFindings', 'verificationQuestions', 'healthgradesUrl', 'officialUrl', 'googleMapsUrl', 'verifiedDate'];
const colonoscopyKeys = ['name', 'provider', 'system', 'facility', 'facilityClass', 'location', 'driveMin', 'driveMax', 'tier', 'rank', 'eligibility', 'evidenceBands', 'capabilities', 'clinicalFit', 'facilityEvidence', 'acceptsNewPatients', 'networkVerification', 'trainingSummary', 'schoolContext', 'certificationsAwards', 'primaryReviewSource', 'healthgradesRating', 'healthgradesReviewCount', 'healthgradesWrittenCount', 'reviewConfidence', 'healthgradesEvidence', 'healthgradesTags', 'healthgradesNegativeSummary', 'negativeClassification', 'safetyScreen', 'secondaryReviewSummary', 'negativeFindings', 'concernLevel', 'strengths', 'verificationQuestions', 'healthgradesUrl', 'officialUrl', 'facilityUrl', 'googleMapsUrl', 'nyProfileUrl', 'opmcUrl', 'verifiedDate'];
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

function enumValue(value, allowed, path) {
  if (!allowed.includes(value)) fail(path, `expected one of ${allowed.join(', ')}`);
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
    number(record.driveMinutes, `${path}.driveMinutes`, 0, 300); distance(record.distanceMiles, `${path}.distanceMiles`);
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
    ['name', 'provider', 'location', 'healthgradesEvidence', 'healthgradesNegativeSummary', 'negativeClassification', 'acceptsNewPatients', 'trainingSummary', 'schoolContext', 'certificationsAwards', 'longTermFit', 'concernLevel', 'secondaryReviewSummary', 'reviewConfidence'].forEach((key) => text(record[key], `${path}.${key}`));
    exactObject(record.eligibility, ['license', 'pediatricSpecialty', 'currentProvider', 'ageTwoAndNewPatients', 'discipline', 'decision'], [], `${path}.eligibility`);
    enumValue(record.eligibility.license, ['verified', 'screened', 'unknown', 'concern'], `${path}.eligibility.license`);
    enumValue(record.eligibility.pediatricSpecialty, ['verified', 'partial', 'unknown', 'concern'], `${path}.eligibility.pediatricSpecialty`);
    enumValue(record.eligibility.currentProvider, ['verified', 'unknown'], `${path}.eligibility.currentProvider`);
    enumValue(record.eligibility.ageTwoAndNewPatients, ['verified', 'partial', 'unknown'], `${path}.eligibility.ageTwoAndNewPatients`);
    enumValue(record.eligibility.discipline, ['screened-no-match', 'unknown', 'concern'], `${path}.eligibility.discipline`);
    enumValue(record.eligibility.decision, ['qualified', 'conditional', 'excluded'], `${path}.eligibility.decision`);
    exactObject(record.evidenceBands, ['clinicalFoundation', 'toddlerCare', 'continuity', 'patientExperience', 'practicalAccess'], [], `${path}.evidenceBands`);
    ['clinicalFoundation', 'toddlerCare', 'continuity', 'patientExperience', 'practicalAccess'].forEach((key) => enumValue(record.evidenceBands[key], ['strong', 'adequate', 'concern', 'unknown'], `${path}.evidenceBands.${key}`));
    enumValue(record.reviewConfidence, ['very-limited', 'limited', 'moderate', 'stronger', 'unavailable'], `${path}.reviewConfidence`);
    integer(record.tier, `${path}.tier`, 1); if (record.tier > 3) fail(`${path}.tier`, 'expected tier 1–3');
    integer(record.rank, `${path}.rank`, 1); number(record.driveMin, `${path}.driveMin`, 0, 300); number(record.driveMax, `${path}.driveMax`, record.driveMin, 300); distance(record.distanceMiles, `${path}.distanceMiles`);
    number(record.rating, `${path}.rating`, 0, 5); integer(record.reviewCount, `${path}.reviewCount`, 0); nullableNumber(record.healthgradesRating, `${path}.healthgradesRating`, 0, 5);
    integer(record.healthgradesReviewCount, `${path}.healthgradesReviewCount`, 0); integer(record.healthgradesWrittenCount, `${path}.healthgradesWrittenCount`, 0);
    strings(record.healthgradesTags, `${path}.healthgradesTags`); strings(record.strengths, `${path}.strengths`); strings(record.reviewSources, `${path}.reviewSources`); strings(record.verificationQuestions, `${path}.verificationQuestions`);
    if (!Array.isArray(record.negativeFindings)) fail(`${path}.negativeFindings`, 'expected an array');
    record.negativeFindings.forEach((finding, index) => {
      const findingPath = `${path}.negativeFindings[${index}]`;
      exactObject(finding, ['category', 'severity', 'pattern', 'scope', 'summary'], [], findingPath);
      enumValue(finding.category, ['child-interaction', 'consent-restraint', 'diagnosis-treatment', 'clinical-safety', 'billing-administration', 'access-waiting'], `${findingPath}.category`);
      enumValue(finding.severity, ['none', 'low', 'moderate', 'high', 'unexplained'], `${findingPath}.severity`);
      enumValue(finding.pattern, ['none', 'isolated', 'repeated', 'unexplained', 'not-available'], `${findingPath}.pattern`);
      enumValue(finding.scope, ['provider', 'associate', 'office', 'unknown'], `${findingPath}.scope`);
      text(finding.summary, `${findingPath}.summary`);
    });
    https(record.healthgradesUrl, `${path}.healthgradesUrl`, 'www.healthgrades.com'); https(record.officialUrl, `${path}.officialUrl`); https(record.googleMapsUrl, `${path}.googleMapsUrl`);
    verifiedDate(record.verifiedDate, `${path}.verifiedDate`);
  });
}

export function parseAdultDermatologists(value) {
  return parseList(value, 'adult-dermatologists', (record, path) => {
    exactObject(record, adultDermatologistKeys, ['distanceMiles'], path);
    ['name', 'provider', 'practice', 'location', 'perianalDermatitisSummary', 'acceptsNewPatients', 'trainingSummary', 'schoolContext', 'certificationsAwards', 'negativeSummary', 'negativeClassification'].forEach((key) => text(record[key], `${path}.${key}`));
    if (!/\b(?:MD|DO)\b/.test(record.provider)) fail(`${path}.provider`, 'expected an MD or DO credential');
    enumValue(record.gender, ['female'], `${path}.gender`);
    enumValue(record.locationScope, ['local', 'nyc'], `${path}.locationScope`);
    exactObject(record.eligibility, ['license', 'discipline', 'boardCertification', 'decision'], [], `${path}.eligibility`);
    enumValue(record.eligibility.license, ['verified', 'screened', 'unknown', 'concern'], `${path}.eligibility.license`);
    enumValue(record.eligibility.discipline, ['verified', 'screened-no-match', 'unknown', 'concern'], `${path}.eligibility.discipline`);
    enumValue(record.eligibility.boardCertification, ['verified', 'partial', 'unknown', 'concern'], `${path}.eligibility.boardCertification`);
    enumValue(record.eligibility.decision, ['qualified', 'conditional', 'excluded'], `${path}.eligibility.decision`);
    exactObject(record.evidenceBands, ['clinicalFoundation', 'perianalDermatitisFit', 'diagnosticBreadth', 'patientExperience', 'practicalAccess'], [], `${path}.evidenceBands`);
    ['clinicalFoundation', 'perianalDermatitisFit', 'diagnosticBreadth', 'patientExperience', 'practicalAccess'].forEach((key) => enumValue(record.evidenceBands[key], ['strong', 'adequate', 'concern', 'unknown'], `${path}.evidenceBands.${key}`));
    strings(record.capabilities, `${path}.capabilities`);
    record.capabilities.forEach((capability, index) => enumValue(capability, ['eczema-dermatitis', 'contact-dermatitis', 'patch-testing', 'anogenital-dermatology', 'infection-fungal-differential', 'psoriasis-lichen-differential', 'biopsy', 'multidisciplinary-referral'], `${path}.capabilities[${index}]`));
    enumValue(record.primaryReviewSource, ['Healthgrades', 'Health system', 'Official practice', 'Zocdoc'], `${path}.primaryReviewSource`);
    enumValue(record.reviewConfidence, ['very-limited', 'limited', 'moderate', 'strong', 'very-strong', 'unavailable'], `${path}.reviewConfidence`);
    enumValue(record.availability, ['verified', 'conditional', 'unknown'], `${path}.availability`);
    enumValue(record.concernLevel, ['none', 'low', 'moderate', 'high'], `${path}.concernLevel`);
    integer(record.tier, `${path}.tier`, 1); if (record.tier > 3) fail(`${path}.tier`, 'expected tier 1–3');
    integer(record.rank, `${path}.rank`, 1);
    if (record.driveMin !== null) number(record.driveMin, `${path}.driveMin`, 0, 300);
    if (record.driveMax !== null) number(record.driveMax, `${path}.driveMax`, record.driveMin ?? 0, 300);
    if ((record.driveMin === null) !== (record.driveMax === null)) fail(path, 'driveMin and driveMax must both be known or both be null');
    if (record.locationScope === 'nyc' && record.driveMax !== null) fail(path, 'NYC travel time must remain unknown rather than inferred');
    distance(record.distanceMiles, `${path}.distanceMiles`);
    nullableNumber(record.primaryRating, `${path}.primaryRating`, 0, 5); integer(record.primaryReviewCount, `${path}.primaryReviewCount`, 0); if (record.primaryWrittenCount !== null) integer(record.primaryWrittenCount, `${path}.primaryWrittenCount`, 0); nullableNumber(record.healthgradesRating, `${path}.healthgradesRating`, 0, 5);
    integer(record.healthgradesReviewCount, `${path}.healthgradesReviewCount`, 0); if (record.healthgradesWrittenCount !== null) integer(record.healthgradesWrittenCount, `${path}.healthgradesWrittenCount`, 0);
    strings(record.strengths, `${path}.strengths`); strings(record.verificationQuestions, `${path}.verificationQuestions`);
    if (!Array.isArray(record.reviewEvidence)) fail(`${path}.reviewEvidence`, 'expected an array');
    record.reviewEvidence.forEach((evidence, index) => {
      const evidencePath = `${path}.reviewEvidence[${index}]`;
      exactObject(evidence, ['source', 'scope', 'rating', 'reviewCount', 'writtenCount', 'confidence', 'summary', 'url'], [], evidencePath);
      enumValue(evidence.source, ['Healthgrades', 'Health system', 'Official practice', 'Zocdoc', 'Google Maps', 'Yelp'], `${evidencePath}.source`);
      enumValue(evidence.scope, ['provider', 'office'], `${evidencePath}.scope`);
      nullableNumber(evidence.rating, `${evidencePath}.rating`, 0, 5); integer(evidence.reviewCount, `${evidencePath}.reviewCount`, 0); if (evidence.writtenCount !== null) integer(evidence.writtenCount, `${evidencePath}.writtenCount`, 0);
      enumValue(evidence.confidence, ['very-limited', 'limited', 'moderate', 'strong', 'very-strong', 'unavailable'], `${evidencePath}.confidence`);
      text(evidence.summary, `${evidencePath}.summary`); https(evidence.url, `${evidencePath}.url`);
    });
    if (!Array.isArray(record.safetyEvidence) || !record.safetyEvidence.length) fail(`${path}.safetyEvidence`, 'expected at least one official safety source');
    record.safetyEvidence.forEach((evidence, index) => {
      const evidencePath = `${path}.safetyEvidence[${index}]`;
      exactObject(evidence, ['source', 'status', 'summary', 'url'], [], evidencePath);
      enumValue(evidence.source, ['NJ license', 'NY license', 'American Board of Dermatology', 'Health system'], `${evidencePath}.source`);
      enumValue(evidence.status, ['verified', 'no-public-match', 'requires-confirmation'], `${evidencePath}.status`);
      text(evidence.summary, `${evidencePath}.summary`); https(evidence.url, `${evidencePath}.url`);
    });
    if (!record.reviewEvidence.some((evidence) => evidence.source === record.primaryReviewSource && evidence.rating === record.primaryRating && evidence.reviewCount === record.primaryReviewCount && evidence.writtenCount === record.primaryWrittenCount)) fail(`${path}.reviewEvidence`, 'primary review fields must match one review-evidence record');
    const licenseEvidence = record.safetyEvidence.find((evidence) => evidence.source === 'NJ license' || evidence.source === 'NY license');
    if (!licenseEvidence) fail(`${path}.safetyEvidence`, 'expected an official state-license source');
    if (record.eligibility.license === 'verified' && licenseEvidence.status !== 'verified') fail(`${path}.safetyEvidence`, 'verified license status requires reproducible verified evidence');
    if (record.eligibility.license === 'screened' && licenseEvidence.status !== 'requires-confirmation') fail(`${path}.safetyEvidence`, 'screened license status must remain requires-confirmation');
    if (record.eligibility.decision === 'excluded') fail(path, 'excluded providers cannot be published');
    if (record.evidenceBands.clinicalFoundation === 'concern' || record.evidenceBands.clinicalFoundation === 'unknown') fail(path, 'clinical foundation must pass before publication');
    if (record.evidenceBands.perianalDermatitisFit === 'concern' || record.evidenceBands.perianalDermatitisFit === 'unknown') fail(path, 'perianal dermatitis fit must pass before publication');
    if (!['verified', 'screened-no-match'].includes(record.eligibility.discipline)) fail(path, 'disciplinary screening must pass before publication');
    if (!Array.isArray(record.negativeFindings)) fail(`${path}.negativeFindings`, 'expected an array');
    record.negativeFindings.forEach((finding, index) => {
      const findingPath = `${path}.negativeFindings[${index}]`;
      exactObject(finding, ['category', 'severity', 'pattern', 'scope', 'summary'], [], findingPath);
      enumValue(finding.category, ['communication', 'sensitive-exam-respect', 'diagnostic-evaluation', 'treatment', 'safety', 'access-waiting', 'billing-administration'], `${findingPath}.category`);
      enumValue(finding.severity, ['none', 'low', 'moderate', 'high', 'unexplained'], `${findingPath}.severity`);
      enumValue(finding.pattern, ['none', 'isolated', 'repeated', 'unexplained', 'not-available'], `${findingPath}.pattern`);
      enumValue(finding.scope, ['provider', 'office', 'unknown'], `${findingPath}.scope`);
      text(finding.summary, `${findingPath}.summary`);
    });
    https(record.healthgradesUrl, `${path}.healthgradesUrl`, 'www.healthgrades.com'); https(record.officialUrl, `${path}.officialUrl`); https(record.googleMapsUrl, `${path}.googleMapsUrl`);
    verifiedDate(record.verifiedDate, `${path}.verifiedDate`);
  });
}

export function parseColonoscopySpecialists(value) {
  return parseList(value, 'colonoscopy-specialists', (record, path) => {
    exactObject(record, colonoscopyKeys, ['distanceMiles'], path);
    ['name', 'provider', 'system', 'facility', 'location', 'clinicalFit', 'facilityEvidence', 'acceptsNewPatients', 'trainingSummary', 'schoolContext', 'certificationsAwards', 'healthgradesEvidence', 'healthgradesNegativeSummary', 'negativeClassification', 'safetyScreen', 'secondaryReviewSummary', 'reviewConfidence', 'concernLevel'].forEach((key) => text(record[key], `${path}.${key}`));
    exactObject(record.networkVerification, ['planLabel', 'facilityStatus', 'professionalStatus', 'summary', 'sourceUrls', 'verifiedDate'], [], `${path}.networkVerification`);
    text(record.networkVerification.planLabel, `${path}.networkVerification.planLabel`);
    enumValue(record.networkVerification.facilityStatus, ['publicly-supported', 'requires-confirmation'], `${path}.networkVerification.facilityStatus`);
    enumValue(record.networkVerification.professionalStatus, ['requires-confirmation'], `${path}.networkVerification.professionalStatus`);
    text(record.networkVerification.summary, `${path}.networkVerification.summary`);
    strings(record.networkVerification.sourceUrls, `${path}.networkVerification.sourceUrls`);
    record.networkVerification.sourceUrls.forEach((url, index) => https(url, `${path}.networkVerification.sourceUrls[${index}]`));
    verifiedDate(record.networkVerification.verifiedDate, `${path}.networkVerification.verifiedDate`);
    enumValue(record.facilityClass, ['academic-hospital', 'cancer-center'], `${path}.facilityClass`);
    enumValue(record.primaryReviewSource, ['Healthgrades'], `${path}.primaryReviewSource`);
    enumValue(record.reviewConfidence, ['very-limited', 'limited', 'moderate', 'strong', 'very-strong', 'unavailable'], `${path}.reviewConfidence`);
    enumValue(record.concernLevel, ['none', 'low', 'moderate', 'high'], `${path}.concernLevel`);
    exactObject(record.eligibility, ['license', 'boardCertification', 'advancedEndoscopy', 'currentProvider', 'discipline', 'decision'], [], `${path}.eligibility`);
    enumValue(record.eligibility.license, ['verified', 'screened', 'unknown', 'concern'], `${path}.eligibility.license`);
    enumValue(record.eligibility.boardCertification, ['verified', 'partial', 'unknown', 'concern'], `${path}.eligibility.boardCertification`);
    enumValue(record.eligibility.advancedEndoscopy, ['verified', 'partial', 'unknown', 'concern'], `${path}.eligibility.advancedEndoscopy`);
    enumValue(record.eligibility.currentProvider, ['verified', 'conditional', 'unknown'], `${path}.eligibility.currentProvider`);
    enumValue(record.eligibility.discipline, ['screened-no-match', 'unknown', 'concern'], `${path}.eligibility.discipline`);
    enumValue(record.eligibility.decision, ['qualified', 'conditional', 'excluded'], `${path}.eligibility.decision`);
    exactObject(record.evidenceBands, ['complexPolypFit', 'facilitySafety', 'patientExperience', 'practicalAccess'], [], `${path}.evidenceBands`);
    ['complexPolypFit', 'facilitySafety', 'patientExperience', 'practicalAccess'].forEach((key) => enumValue(record.evidenceBands[key], ['strong', 'adequate', 'concern', 'unknown'], `${path}.evidenceBands.${key}`));
    integer(record.tier, `${path}.tier`, 1); if (record.tier > 3) fail(`${path}.tier`, 'expected tier 1–3');
    integer(record.rank, `${path}.rank`, 1); number(record.driveMin, `${path}.driveMin`, 0, 300); number(record.driveMax, `${path}.driveMax`, record.driveMin, 300); distance(record.distanceMiles, `${path}.distanceMiles`);
    nullableNumber(record.healthgradesRating, `${path}.healthgradesRating`, 0, 5); integer(record.healthgradesReviewCount, `${path}.healthgradesReviewCount`, 0); integer(record.healthgradesWrittenCount, `${path}.healthgradesWrittenCount`, 0);
    strings(record.capabilities, `${path}.capabilities`); strings(record.healthgradesTags, `${path}.healthgradesTags`); strings(record.strengths, `${path}.strengths`); strings(record.verificationQuestions, `${path}.verificationQuestions`);
    if (!Array.isArray(record.negativeFindings)) fail(`${path}.negativeFindings`, 'expected an array');
    record.negativeFindings.forEach((finding, index) => {
      const findingPath = `${path}.negativeFindings[${index}]`;
      exactObject(finding, ['category', 'severity', 'pattern', 'scope', 'summary'], [], findingPath);
      enumValue(finding.category, ['clinical-safety', 'missed-lesion-resection', 'consent-sedation', 'communication-care', 'billing-administration', 'access-waiting', 'unverified-allegation'], `${findingPath}.category`);
      enumValue(finding.severity, ['none', 'low', 'moderate', 'high', 'unexplained'], `${findingPath}.severity`);
      enumValue(finding.pattern, ['none', 'isolated', 'repeated', 'unexplained', 'not-available'], `${findingPath}.pattern`);
      enumValue(finding.scope, ['provider', 'facility', 'office', 'unknown'], `${findingPath}.scope`);
      text(finding.summary, `${findingPath}.summary`);
    });
    https(record.healthgradesUrl, `${path}.healthgradesUrl`, 'www.healthgrades.com'); https(record.officialUrl, `${path}.officialUrl`); https(record.facilityUrl, `${path}.facilityUrl`); https(record.googleMapsUrl, `${path}.googleMapsUrl`); https(record.nyProfileUrl, `${path}.nyProfileUrl`); https(record.opmcUrl, `${path}.opmcUrl`);
    verifiedDate(record.verifiedDate, `${path}.verifiedDate`);
    if (record.eligibility.decision === 'excluded') fail(path, 'excluded providers cannot be published');
    if (record.tier === 1 && (record.evidenceBands.complexPolypFit === 'concern' || record.evidenceBands.complexPolypFit === 'unknown')) fail(path, 'Tier 1 complex-polyp fit must pass');
  });
}
