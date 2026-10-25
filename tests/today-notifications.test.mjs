import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('notification function, service worker, and install manifest remain syntactically valid', async () => {
  for (const path of ['functions/index.js', 'public/sw.js']) {
    const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${path}: ${result.stderr}`);
  }
  const manifest = JSON.parse(await readFile('public/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.start_url, './today/');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
});

test('notification endpoint storage remains scoped to the owning household member', async () => {
  const rules = JSON.parse(await readFile('database.rules.json', 'utf8'));
  const deviceRules = rules.rules.households.$householdId.notificationDevices.$uid.$deviceId;
  assert.match(deviceRules['.read'], /auth\.uid == \$uid/);
  assert.match(deviceRules['.write'], /auth\.uid == \$uid/);
  assert.match(deviceRules['.write'], /members/);
  assert.match(deviceRules['.validate'], /endpoint/);
  assert.match(deviceRules.endpoint['.validate'], /https/);
  assert.equal(deviceRules.$other['.validate'], false);
  assert.equal(rules.rules.households.$householdId.notificationDispatch, undefined);
});
