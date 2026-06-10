import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function extractObject(file, marker) {
  const src = readFileSync(file, 'utf8');
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`marker not found in ${file}`);
  const eq = src.indexOf('=', start);
  let i = src.indexOf('{', eq);
  let depth = 0;
  let inStr = false;
  let strCh = '';
  let escaped = false;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === strCh) inStr = false;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inStr = true;
      strCh = ch;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        const objSrc = src.slice(i, j + 1);
        return Function(`"use strict"; return (${objSrc});`)();
      }
    }
  }
  throw new Error('unbalanced braces');
}

const uiPages = join(__dirname, '../../ratai24-ui/src/pages');
const privacy = extractObject(join(uiPages, 'PrivacyPolicyPage.tsx'), 'const contentByLanguage');
const rental = extractObject(join(uiPages, 'RentalTermsPage.tsx'), 'const contentByLanguage');
const out = {
  'privacy-policy': privacy,
  'rental-terms': rental,
};
const json = JSON.stringify(out, null, 2);
const paths = [
  join(__dirname, '../prisma/data/legal-page-defaults.json'),
  join(__dirname, '../../ratai24-ui/src/data/legal-page-defaults.json'),
];
for (const outPath of paths) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, json);
  console.log('Wrote', outPath);
}
