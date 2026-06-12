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
  assert.match(loader, /\/\/ @version\s+0\.1\.20/);
  assert.match(loader, /\/\/ @run-at\s+document-start/);
  assert.match(loader, /\/\/ @grant\s+GM_xmlhttpRequest/);
  assert.match(loader, /\/\/ @grant\s+GM_getValue/);
  assert.match(loader, /\/\/ @grant\s+GM_setValue/);
  assert.match(loader, /\/\/ @grant\s+GM_deleteValue/);
  assert.match(loader, /\/\/ @connect\s+cdn\.jsdelivr\.net/);
  assert.match(loader, /\/\/ @connect\s+raw\.githubusercontent\.com/);
  assert.match(loader, /\/\/ @downloadURL\s+https:\/\/raw\.githubusercontent\.com\/SkyViewBlobio\/Blobgame\.io-Web-Script\/main\/loader\/blobio-loader\.user\.js/);
  assert.match(loader, /\/\/ @updateURL\s+https:\/\/raw\.githubusercontent\.com\/SkyViewBlobio\/Blobgame\.io-Web-Script\/main\/loader\/blobio-loader\.user\.js/);
  const rawBundleUrlIndex = loader.indexOf('https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Web-Script/main/dist/blobio-extension.bundle.js?v=0.1.20');
  const cdnBundleUrlIndex = loader.indexOf('https://cdn.jsdelivr.net/gh/SkyViewBlobio/Blobgame.io-Web-Script@main/dist/blobio-extension.bundle.js?v=0.1.20');
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
  const injectedScripts = [];

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
    document: {
      documentElement: {
        appendChild(node) {
          injectedScripts.push(node.textContent || '');
          node.parentNode = this;
          return node;
        },
      },
      head: null,
      createElement(tagName) {
        return {
          tagName: String(tagName).toUpperCase(),
          textContent: '',
          remove() {
            this.removed = true;
          },
        };
      },
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
  assert.equal(injectedScripts.length, 1);
  assert.match(injectedScripts[0], /__blobioCustomSkinPageBootstrapInstalled/);
  assert.match(injectedScripts[0], /patchGwtCacheSource/);
  assert.doesNotMatch(injectedScripts[0], /config-username/);

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

test('Tampermonkey loader page bootstrap patches only the local custom skin in page context', async () => {
  const loader = readFileSync(loaderPath, 'utf8');
  const gmValues = new Map([
    ['blobio.customSkin.enabled', '1'],
    ['blobio.customSkin.activeUrl', 'https://i.imgur.com/OZz80VZ.jpeg'],
    ['blobio.customSkin.localName', 'BlobioCustomSkin_testuser'],
  ]);
  const localValues = new Map();
  const injectedScripts = [];

  const context = {
    console: { error() {}, warn() {}, log() {}, debug() {} },
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
    GM_xmlhttpRequest() {},
    document: {
      documentElement: {
        appendChild(node) {
          injectedScripts.push(node.textContent || '');
          return node;
        },
      },
      createElement() {
        return {
          textContent: '',
          remove() {},
        };
      },
    },
  };
  context.globalThis = context;

  vm.runInNewContext(loader, context);

  assert.equal(injectedScripts.length, 1);

  const pageFetchCalls = [];
  class PageResponse {
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
      return new PageResponse(this.body, this);
    }
  }

  class PageXMLHttpRequest {
    open(method, url, async, user, password) {
      this.openArgs = [method, url, async, user, password];
    }
  }

  const pageLocalValues = new Map();
  const pageContext = {
    console: { error() {}, warn() {}, log() {}, debug() {} },
    location: { host: 'custom.client.blobgame.io', href: 'http://custom.client.blobgame.io/' },
    localStorage: {
      getItem(key) {
        return pageLocalValues.has(key) ? pageLocalValues.get(key) : null;
      },
      setItem(key, value) {
        pageLocalValues.set(key, String(value));
      },
      removeItem(key) {
        pageLocalValues.delete(key);
      },
    },
    document: {
      createElement() {
        return {
          setAttribute(name, value) {
            this[name] = value;
          },
          getAttribute(name) {
            return this[name] || '';
          },
          addEventListener() {},
          remove() {},
        };
      },
      head: {
        appendChild(node) {
          return node;
        },
      },
      documentElement: {
        appendChild(node) {
          return node;
        },
      },
    },
    XMLHttpRequest: PageXMLHttpRequest,
    HTMLImageElement: function PageImage() {},
    Element: function PageElement() {},
    fetch(url, init) {
      pageFetchCalls.push([url, init]);
      return Promise.resolve(new PageResponse(String(url).endsWith('.cache.js') ? 'function keep(){}' : 'd:assets:0:application/unknown\n'));
    },
    Response: PageResponse,
    URL,
  };
  pageContext.window = pageContext;
  pageContext.globalThis = pageContext;
  pageContext.Node = function PageNode() {};
  pageContext.Node.prototype = {
    appendChild(node) {
      return node;
    },
    insertBefore(node) {
      return node;
    },
  };
  Object.defineProperty(pageContext.HTMLImageElement.prototype, 'src', {
    configurable: true,
    get() {
      return this.currentSrc || '';
    },
    set(value) {
      this.currentSrc = value;
    },
  });
  pageContext.HTMLImageElement.prototype.setAttribute = function setAttribute(name, value) {
    this[name] = value;
  };
  pageContext.Element.prototype.setAttribute = function setAttribute(name, value) {
    this[name] = value;
  };

  vm.runInNewContext(injectedScripts[0], pageContext);

  assert.equal(pageLocalValues.get('config-skin'), 'BlobioCustomSkin_testuser');
  assert.equal(pageLocalValues.get('config-skin-type'), 'free');
  assert.equal(pageLocalValues.get('config-username'), undefined);

  const matchingRequest = new pageContext.XMLHttpRequest();
  matchingRequest.open('GET', '/skins/free/BlobioCustomSkin_testuser.png', true);
  const otherRequest = new pageContext.XMLHttpRequest();
  otherRequest.open('GET', '/skins/free/BlobioCustomSkin_otheruser.png', true);
  assert.equal(matchingRequest.openArgs[1], 'https://i.imgur.com/OZz80VZ.jpeg');
  assert.equal(otherRequest.openArgs[1], '/skins/free/BlobioCustomSkin_otheruser.png');

  await pageContext.fetch('/skins/free/BlobioCustomSkin_testuser.png');
  await pageContext.fetch('/skins/free/BlobioCustomSkin_otheruser.png');
  assert.deepEqual(pageFetchCalls.at(-2), ['https://i.imgur.com/OZz80VZ.jpeg', undefined]);
  assert.deepEqual(pageFetchCalls.at(-1), ['/skins/free/BlobioCustomSkin_otheruser.png', undefined]);

  const gwtSource = "function fwe(a,b,c,d){var e,f;f=bv(a.a,c);if(!f){e=NIe(a.b,c);if(e){e.ZV(b)}else{e=new _Pe;e.ZV(b);QIe(a.b,c,e);ewe(c,d,new nwe(a,c))}}fye(b,f,c);return f} function Rwe(a,b,c,d){var e,f,g;if(OIe(a.d,c)){g=NIe(a.d,c);e=Wvf}else if($re(a.b,c)){f=b==($Ae(),XAe)?'premium':'free';g='/skins/'+f+'/'+oFe(c,' ','')+'.png';e='image/png'}else{return}if(l8b(a.a.G.e,g)){qwe(d,Md(Xb,g));return}Og(a.c,g,e,'Anonymous',new Uwe(a,c,g,d))} function Kxe(){Hb.call(this,'CONTEXT',0);Zxe=this}";
  const patched = pageContext.__blobioCustomSkinPatchGwtCacheSource(gwtSource);
  const patchedAgain = pageContext.__blobioCustomSkinPatchGwtCacheSource(patched);

  assert.match(patched, /\|\|c==="BlobioCustomSkin_testuser"/);
  assert.match(patched, /__blobioCustomSkinRuntimeState/);
  assert.match(patched, /c=_blobio\.localName/);
  assert.match(patched, /b\.p\|\|_re\(Zxe\.A,b\)/);
  assert.match(patched, /__blobioGwtGame=this/);
  assert.equal(patchedAgain, patched);
});

test('Tampermonkey loader does not inject custom client page bootstrap on the front page host', () => {
  const loader = readFileSync(loaderPath, 'utf8');
  const injectedScripts = [];
  const context = {
    console: { error() {}, warn() {}, log() {} },
    location: { host: 'blobgame.io', href: 'https://blobgame.io/' },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    },
    GM_getValue(_key, fallbackValue) {
      return fallbackValue;
    },
    GM_setValue() {},
    GM_deleteValue() {},
    GM_xmlhttpRequest() {},
    document: {
      documentElement: {
        appendChild(node) {
          injectedScripts.push(node.textContent || '');
          return node;
        },
      },
      createElement() {
        return {
          textContent: '',
          remove() {},
        };
      },
    },
    XMLHttpRequest: function FakeXMLHttpRequest() {},
    HTMLImageElement: function FakeImage() {},
    Element: function FakeElement() {},
  };
  context.globalThis = context;

  vm.runInNewContext(loader, context);

  assert.equal(injectedScripts.length, 0);
});
