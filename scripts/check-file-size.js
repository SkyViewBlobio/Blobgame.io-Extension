import { stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const limits = [
  ['loader/blobio-loader.template.js', 120],
  ['src/features/MenuFeature.js', 80],
  ['src/features/ChatSettingsFeature.js', 80],
  ['src/css/MenuFeatureStyles.js', 80],
  ['scripts/build.js', 24],
];

let warnings = 0;

for (const [path, limitKb] of limits) {
  const file = resolve(rootDir, path);
  const { size } = await stat(file);
  const sizeKb = size / 1024;

  if (sizeKb > limitKb) {
    warnings += 1;
    console.warn(`[structure] ${path} is ${sizeKb.toFixed(1)} KB; warning limit is ${limitKb} KB.`);
  }
}

if (warnings === 0) {
  console.log('[structure] no file size warnings');
}
