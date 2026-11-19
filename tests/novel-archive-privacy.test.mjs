import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

// The novel KB lives only in the private Firebase mirror. These are the shapes its
// content takes (event IDs, source locators, Owner IDs); none may reach the public build.
const kbMarkers = [
  /\bE-\d{4}\b/,
  /\bC\d+#P\d+\b/,
  /\b(?:CH|GR|LOC|OBJ|CON|TP)-[㐀-鿿]/,
];

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (/\.(html|js|mjs|css|json|txt|xml|webmanifest)$/.test(entry.name)) yield path;
  }
}

test('the built site contains no novel KB content', { skip: !existsSync('dist') && 'run the build first' }, async () => {
  let scanned = 0;
  for await (const path of files('dist')) {
    const text = await readFile(path, 'utf8');
    scanned += 1;
    for (const marker of kbMarkers) assert.doesNotMatch(text, marker, `${path} contains ${marker}`);
  }
  assert.ok(scanned > 0, 'dist is empty');
});
