import { readFile, writeFile } from 'node:fs/promises';

const file = 'src/data/library-events.json';
const events = JSON.parse(await readFile(file, 'utf8'));
events.sort((a, b) => a.dayOrder - b.dayOrder || a.timeOrder - b.timeOrder);
await writeFile(file, `${JSON.stringify(events, null, 2)}\n`);
