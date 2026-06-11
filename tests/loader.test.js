import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const loaderPath = resolve(__dirname, '../loader/blobio-loader.user.js');

test('Tampermonkey loader targets both Blobgame hosts and fetches the GitHub bundle with GM_xmlhttpRequest', () => {
  const loader = readFileSync(loaderPath, 'utf8');

  assert.match(loader, /\/\/ @match\s+\*:\/\/blobgame\.io\/\*/);
  assert.match(loader, /\/\/ @match\s+\*:\/\/custom\.client\.blobgame\.io\/\*/);
  assert.match(loader, /\/\/ @version\s+0\.1\.19/);
  assert.match(loader, /\/\/ @run-at\s+document-start/);
  assert.match(loader, /\/\/ @grant\s+GM_xmlhttpRequest/);
  assert.match(loader, /\/\/ @grant\s+GM_getValue/);
  assert.match(loader, /\/\/ @grant\s+GM_setValue/);
  assert.match(loader, /\/\/ @grant\s+GM_deleteValue/);
  assert.match(loader, /\/\/ @connect\s+cdn\.jsdelivr\.net/);
  assert.match(loader, /\/\/ @connect\s+raw\.githubusercontent\.com/);
  assert.match(loader, /\/\/ @downloadURL\s+https:\/\/raw\.githubusercontent\.com\/SkyViewBlobio\/Blobgame\.io-Web-Script\/main\/loader\/blobio-loader\.user\.js/);
  assert.match(loader, /\/\/ @updateURL\s+https:\/\/raw\.githubusercontent\.com\/SkyViewBlobio\/Blobgame\.io-Web-Script\/main\/loader\/blobio-loader\.user\.js/);
  const rawBundleUrlIndex = loader.indexOf('https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Web-Script/main/dist/blobio-extension.bundle.js?v=0.1.19');
  const cdnBundleUrlIndex = loader.indexOf('https://cdn.jsdelivr.net/gh/SkyViewBlobio/Blobgame.io-Web-Script@main/dist/blobio-extension.bundle.js?v=0.1.19');
  assert.notEqual(rawBundleUrlIndex, -1);
  assert.notEqual(cdnBundleUrlIndex, -1);
  assert.equal(rawBundleUrlIndex < cdnBundleUrlIndex, true);
  assert.match(loader, /GM_xmlhttpRequest/);
  assert.match(loader, /\[Blobio\]/);
});

test('Tampermonkey loader bootstraps the custom skin before fetching the bundle', async () => {
  const loader = readFileSync(loaderPath, 'utf8');
  const gmValues = new Map([
    ['blobio.customSkin.enabled', '1'],
    ['blobio.customSkin.activeUrl', 'https://i.imgur.com/OZz80VZ.jpeg'],
    ['blobio.customSkin.localName', 'BlobioCustomSkin_testuser'],
  ]);
  const localValues = new Map();
  const bundleRequests = [];
  const fetchCalls = [];

  class FakeXMLHttpRequest {
    constructor() {
      this.listeners = new Map();
      this.readyState = 0;
      this.responseText = 'd:assets:0:application/unknown\n';
      this.response = this.responseText;
    }

    open(method, url, async, user, password) {
      this.openArgs = [method, url, async, user, password];
    }

    send() {
      this.readyState = 4;
      for (const listener of this.listeners.get('readystatechange') || []) {
        listener.call(this);
      }
    }

    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) || [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    }
  }

  class FakeResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = init.headers || {};
    }

    text() {
      return Promise.resolve(this.body);
    }

    clone() {
      return new FakeResponse(this.body, this);
    }
  }

  const context = {
    console: { error() {}, warn() {}, log() {} },
    location: { host: 'custom.client.blobgame.io', href: 'http://custom.client.blobgame.io/' },
    localStorage: {
      getItem(key) {
        return localValues.has(key) ? localValues.get(key) : null;
      },
      setItem(key, value) {
        localValues.set(key, String(value));
      },
      removeItem(key) {
        localValues.delete(key);
      },
    },
    GM_getValue(key, fallbackValue) {
      return gmValues.has(key) ? gmValues.get(key) : fallbackValue;
    },
    GM_setValue(key, value) {
      gmValues.set(key, String(value));
    },
    GM_deleteValue(key) {
      gmValues.delete(key);
    },
    GM_xmlhttpRequest(request) {
      bundleRequests.push(request.url);
    },
    XMLHttpRequest: FakeXMLHttpRequest,
    HTMLImageElement: function FakeImage() {},
    Element: function FakeElement() {},
    fetch(url, init) {
      fetchCalls.push([url, init]);
      return Promise.resolve(new FakeResponse('d:assets:0:application/unknown\n'));
    },
    Response: FakeResponse,
  };
  context.globalThis = context;
  Object.defineProperty(context.HTMLImageElement.prototype, 'src', {
    configurable: true,
    get() {
      return this.currentSrc || '';
    },
    set(value) {
      this.currentSrc = value;
    },
  });
  context.HTMLImageElement.prototype.setAttribute = function setAttribute(name, value) {
    this[name] = value;
  };
  context.Element.prototype.setAttribute = function setAttribute(name, value) {
    this[name] = value;
  };

  vm.runInNewContext(loader, context);

  assert.equal(localValues.get('config-skin'), 'BlobioCustomSkin_testuser');
  assert.equal(localValues.get('config-skin-type'), 'free');
  assert.equal(bundleRequests.length, 1);

  const skinRequest = new context.XMLHttpRequest();
  skinRequest.open('GET', '/skins/free/BlobioCustomSkin_testuser.png', true);
  const otherSkinRequest = new context.XMLHttpRequest();
  otherSkinRequest.open('GET', '/skins/free/BlobioCustomSkin_otheruser.png', true);

  assert.equal(skinRequest.openArgs[1], 'https://i.imgur.com/OZz80VZ.jpeg');
  assert.equal(otherSkinRequest.openArgs[1], '/skins/free/BlobioCustomSkin_otheruser.png');

  const manifestRequest = new context.XMLHttpRequest();
  manifestRequest.open('GET', '/assets/assets.txt', true);
  manifestRequest.send();

  assert.match(manifestRequest.responseText, /i:skins\/free\/BlobioCustomSkin_testuser\.png:0:image\/png/);

  const response = await context.fetch('/assets/assets.txt');
  const text = await response.text();
  assert.match(text, /i:skins\/free\/BlobioCustomSkin_testuser\.png:0:image\/png/);

  await context.fetch('/skins/free/BlobioCustomSkin_testuser.png', { cache: 'reload' });
  await context.fetch('/skins/free/BlobioCustomSkin_otheruser.png');

  assert.deepEqual(fetchCalls.at(-2), ['https://i.imgur.com/OZz80VZ.jpeg', { cache: 'reload' }]);
  assert.deepEqual(fetchCalls.at(-1), ['/skins/free/BlobioCustomSkin_otheruser.png', undefined]);
});
