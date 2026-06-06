import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

test('menu CSS lives in the src/css folder instead of the feature class', () => {
  const stylesheetPath = resolve(rootDir, 'src/css/MenuFeatureStyles.js');
  const featurePath = resolve(rootDir, 'src/features/MenuFeature.js');
  const featureSource = readFileSync(featurePath, 'utf8');

  assert.equal(existsSync(stylesheetPath), true);
  assert.match(featureSource, /from '\.\.\/css\/MenuFeatureStyles\.js'/);
  assert.doesNotMatch(featureSource, /html\.\$\{this\.className\} \.social/);
});
