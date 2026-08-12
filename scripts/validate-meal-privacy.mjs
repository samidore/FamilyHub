import fs from 'node:fs';
const text=fs.readFileSync('FAMILY_MEAL_KB.md','utf8');
const forbidden=[/孩子出生于\s*\d{4}|2024\s*年\s*8\s*月/u,/\b(?:wife|husband|老婆|老公|妻子|丈夫)\b/iu,/\buser\s+(?:likes?|reports?)\b/iu,/C:\\\\Users|\/Users\/|codex[\\/](?:attachments|remote-attachments)/iu,/\b(?:memberId|groupNumber|insuranceId|phone|email|address|ssn)\b/iu];
const hits=forbidden.flatMap(re=>text.match(re)||[]);
if(hits.length){console.error('Meal KB privacy violations:',hits);process.exit(1)}
console.log('Meal KB privacy validation passed');
