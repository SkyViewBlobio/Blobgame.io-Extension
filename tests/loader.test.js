import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const loaderPath = resolve(__dirname, '../loader/blobio-loader.user.js');

test('Tampermonkey loader targets both Blobgame hosts and fetches the GitHub bundle with GM_xmlhttpRequest', () => {
  const loader = readFileSync(loaderPath, 'utf8');

  assert.match(loader, /\/\/ @match\s+\*:\/\/blobgame\.io\/\*/);
  assert.match(loader, /\/\/ @match\s+\*:\/\/custom\.client\.blobgame\.io\/\*/);
  assert.match(loader, /\/\/ @version\s+0\.1\.6/);
  assert.match(loader, /\/\/ @run-at\s+document-start/);
  assert.match(loader, /\/\/ @grant\s+GM_xmlhttpRequest/);
  assert.match(loader, /\/\/ @connect\s+cdn\.jsdelivr\.net/);
  assert.match(loader, /\/\/ @connect\s+raw\.githubusercontent\.com/);
  assert.match(loader, /\/\/ @downloadURL\s+https:\/\/raw\.githubusercontent\.com\/SkyViewBlobio\/Blobgame\.io-Web-Script\/main\/loader\/blobio-loader\.user\.js/);
  assert.match(loader, /\/\/ @updateURL\s+https:\/\/raw\.githubusercontent\.com\/SkyViewBlobio\/Blobgame\.io-Web-Script\/main\/loader\/blobio-loader\.user\.js/);
  const rawBundleUrlIndex = loader.indexOf('https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Web-Script/main/dist/blobio-extension.bundle.js?v=0.1.6');
  const cdnBundleUrlIndex = loader.indexOf('https://cdn.jsdelivr.net/gh/SkyViewBlobio/Blobgame.io-Web-Script@main/dist/blobio-extension.bundle.js?v=0.1.6');
  assert.notEqual(rawBundleUrlIndex, -1);
  assert.notEqual(cdnBundleUrlIndex, -1);
  assert.equal(rawBundleUrlIndex < cdnBundleUrlIndex, true);
  assert.match(loader, /GM_xmlhttpRequest/);
  assert.match(loader, /\[Blobio\]/);
});
