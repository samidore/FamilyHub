import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const page = await readFile('src/pages/sami-notebook.astro', 'utf8');
const presetUi = await readFile('src/lib/notebookPresetUi.ts', 'utf8');
const presetCss = await readFile('src/styles/notebookPresets.css', 'utf8');

test('preset strip sits between top controls and boards', () => {
  const toolbar = page.indexOf('class="notebook-toolbar"');
  const presets = page.indexOf('id="notebook-presets"');
  const boards = page.indexOf('id="notebook-boards"');
  assert.ok(toolbar >= 0 && presets > toolbar && boards > presets);
});

test('preset editor uses task fields without recurrence or media fields', () => {
  const start = page.indexOf('id="notebook-preset-dialog"');
  const end = page.indexOf('id="notebook-item-dialog"');
  assert.ok(start >= 0 && end > start);
  const presetDialog = page.slice(start, end);
  assert.match(presetDialog, /name="title"/);
  assert.match(presetDialog, /name="details"/);
  assert.match(presetDialog, /name="priority"/);
  assert.match(presetDialog, /name="dueDate"/);
  assert.match(presetDialog, /name="dueTime"/);
  assert.doesNotMatch(presetDialog, /recurrenceKind|scheduledUnit|afterCompletionDays|imdbRating|myRating|platform/);
  assert.match(presetUi, /board\.kind === 'task'/);
});

test('preset buttons expose active visual state and separate edit control', () => {
  assert.match(presetUi, /notebook-preset-chip\$\{active \? ' is-active' : ''\}/);
  assert.match(presetUi, /data-preset-edit/);
  assert.match(presetUi, /data-preset-new/);
  assert.match(presetCss, /\.notebook-preset-chip\.is-active/);
});
