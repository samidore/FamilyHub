import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseBreastSurgeons } from '../src/data/breastSurgeonSchema.mjs';

const data = JSON.parse(await readFile(new URL('../src/data/breast-surgeons.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(data);

test('Breast Surgeon dataset is a typed, deterministic shortlist with no unverified Tier 1', () => {
  const physicians = parseBreastSurgeons(data);
  assert.equal(physicians.length, 10);
  assert.deepEqual(physicians.map((item) => item.rank), Array.from({ length: physicians.length }, (_, i) => i + 1));
  assert(physicians.every((item) => item.tier !== 1));
  assert(physicians.every((item) => item.licenseStatus === 'requires-confirmation'));
  assert(physicians.every((item) => item.disciplineStatus === 'requires-confirmation'));
  assert(physicians.every((item) => item.verifiedDate && item.evidenceGaps.length && item.verificationQuestions.length));
  assert(physicians.some((item) => item.clinicalSummary.includes('abnormal breast biopsies')));
  assert(physicians.some((item) => item.clinicalSummary.includes('benign and pre-cancerous')));
});

test('Only identity-matched Healthgrades individual physician profile links are accepted', () => {
  const sample = clone();
  const m = sample[0].reviewEvidence.find((review) => review.source === 'Healthgrades');
  assert(m);
  m.url = 'https://www.healthgrades.com/physician/dr-other-doctor-3vxrw';
  assert.throws(() => parseBreastSurgeons(sample), /Healthgrades must match/);
  m.url = 'https://www.healthgrades.com/usearch?what=Jennifer+Marti';
  assert.throws(() => parseBreastSurgeons(sample), /Healthgrades must match/);
  m.url = 'https://www.healthgrades.com/physician/dr-jennifer-marti-3vxrw';
  assert.doesNotThrow(() => parseBreastSurgeons(sample));
});

test('State safety gaps cannot be promoted to Tier 1 or clean findings by implication', () => {
  const sample = clone();
  sample[0].tier = 1;
  assert.throws(() => parseBreastSurgeons(sample), /Tier 1 requires/);
  sample[0].licenseStatus = 'verified';
  assert.throws(() => parseBreastSurgeons(sample), /Tier 1 requires/);
});

test('Provenance and review scope must remain physician-level, with corrected NY office', () => {
  const sample = clone();
  const ny = sample.find((item) => item.id === 'adriana-suarez-ligon');
  assert(ny);
  assert.match(ny.address, /West Nyack, NY/);
  assert(!ny.address.includes('Westwood'));
  const missing = sample.find((item) => item.id === 'erika-brinkmann');
  assert(missing);
  assert(!missing.reviewEvidence.some((review) => review.source === 'Healthgrades'));
  sample[0].reviewEvidence[0].scope = 'office';
  assert.throws(() => parseBreastSurgeons(sample), /expected one of/);
});

test('No private household medical or insurance identity data can enter public records', () => {
  const sample = clone();
  sample[0].medicalRecord = 'private';
  assert.throws(() => parseBreastSurgeons(sample), /invalid or missing keys/);
});
