// ==UserScript==
// @name         Blobio Web Script Loader
// @namespace    https://github.com/SkyViewBlobio/Blobgame.io-Web-Script
// @version      0.1.19
// @description  Loads the Blobio modular extension bundle from GitHub.
// @match        *://blobgame.io/*
// @match        *://custom.client.blobgame.io/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @connect      cdn.jsdelivr.net
// @connect      raw.githubusercontent.com
// @downloadURL  https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Web-Script/main/loader/blobio-loader.user.js
// @updateURL    https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Web-Script/main/loader/blobio-loader.user.js
// ==/UserScript==

(() => {
  'use strict';

  const LOG_PREFIX = '[Blobio]';
  const CUSTOM_SKIN_ENABLED_KEY = 'blobio.customSkin.enabled';
  const CUSTOM_SKIN_ACTIVE_KEY = 'blobio.customSkin.activeUrl';
  const CUSTOM_SKIN_PREVIOUS_KEY = 'blobio.customSkin.previousSkin';
  const CUSTOM_SKIN_LOCAL_NAME_KEY = 'blobio.customSkin.localName';
  const CUSTOM_SKIN_TYPE = 'free';
  const CUSTOM_SKIN_NAME = 'BlobioCustomSkin';
  const DIRECT_IMGUR_IMAGE_MATCH = /^https:\/\/i\.imgur\.com\/[a-z0-9]+\.(?:png|jpe?g|gif|webp)(?:\?.*)?$/i;
  const CUSTOM_CLIENT_HOST = 'custom.client.blobgame.io';
  const BUNDLE_URLS = [
    'https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Web-Script/main/dist/blobio-extension.bundle.js?v=0.1.19',
    'https://cdn.jsdelivr.net/gh/SkyViewBlobio/Blobgame.io-Web-Script@main/dist/blobio-extension.bundle.js?v=0.1.19',
  ];

  function logError(message, detail) {
    if (detail) {
      console.error(LOG_PREFIX, message, detail);
      return;
    }

    console.error(LOG_PREFIX, message);
  }

  function runBundle(source) {
    try {
      const run = new Function(`${source}\n//# sourceURL=blobio-extension.bundle.js`);
      run();
    } catch (error) {
      logError('Failed to run extension bundle.', error);
    }
  }

  function getLocalValue(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function setLocalValue(key, value) {
    try {
      if (localStorage.getItem(key) !== String(value)) {
        localStorage.setItem(key, String(value));
      }
    } catch {
      // localStorage can be blocked in some browser modes.
    }
  }

  function removeLocalValue(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // localStorage can be blocked in some browser modes.
    }
  }

  function getSharedValue(key) {
    try {
      if (typeof GM_getValue === 'function') {
        const value = GM_getValue(key, undefined);
        if (value !== undefined && value !== null) {
          setLocalValue(key, value);
          return String(value);
        }
      }
    } catch {
      // Fall through to localStorage.
    }

    return getLocalValue(key);
  }

  function setSharedValue(key, value) {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(key, String(value));
      }
    } catch {
      // Keep local fallback even if GM storage fails.
    }

    setLocalValue(key, value);
  }

  function isValidImgurSkinUrl(url) {
    return DIRECT_IMGUR_IMAGE_MATCH.test(String(url || '').trim());
  }

  function createLocalSkinName() {
    const existing = getSharedValue(CUSTOM_SKIN_LOCAL_NAME_KEY) || '';
    if (/^BlobioCustomSkin_[a-z0-9]{8,}$/i.test(existing)) {
      return existing;
    }

    const random = Math.random().toString(36).slice(2, 10) || Date.now().toString(36);
    const localName = `${CUSTOM_SKIN_NAME}_${random}`;
    setSharedValue(CUSTOM_SKIN_LOCAL_NAME_KEY, localName);
    return localName;
  }

  function getCustomSkinState() {
    if (getSharedValue(CUSTOM_SKIN_ENABLED_KEY) !== '1') {
      return null;
    }

    const activeUrl = getSharedValue(CUSTOM_SKIN_ACTIVE_KEY) || '';
    if (!isValidImgurSkinUrl(activeUrl)) {
      return null;
    }

    return {
      activeUrl,
      localName: createLocalSkinName(),
    };
  }

  function getPreviousSkin() {
    try {
      const previous = JSON.parse(getSharedValue(CUSTOM_SKIN_PREVIOUS_KEY) || 'null');
      if (previous && typeof previous.name === 'string') {
        return previous;
      }
    } catch {
      // Bad stored data should not block game startup.
    }

    return null;
  }

  function syncCustomClientSkinConfig() {
    if (location.host !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const localName = getSharedValue(CUSTOM_SKIN_LOCAL_NAME_KEY) || '';
    const state = getCustomSkinState();
    if (state) {
      setLocalValue('config-skin', state.localName);
      setLocalValue('config-skin-type', CUSTOM_SKIN_TYPE);
      return;
    }

    if (localName && getLocalValue('config-skin') === localName) {
      const previous = getPreviousSkin();
      if (previous?.name) {
        setLocalValue('config-skin', previous.name);
        setLocalValue('config-skin-type', previous.type || CUSTOM_SKIN_TYPE);
      } else {
        removeLocalValue('config-skin');
        removeLocalValue('config-skin-type');
      }
    }
  }

  function getUrlPath(url) {
    try {
      return new URL(String(url || ''), location.href).pathname;
    } catch {
      return String(url || '');
    }
  }

  function isAssetManifestUrl(url) {
    return /(?:^|\/)assets\/assets\.txt$/i.test(getUrlPath(url));
  }

  function resolveCustomSkinUrl(url) {
    const originalUrl = String(url || '');
    const state = getCustomSkinState();
    if (!state) {
      return originalUrl;
    }

    const escapedName = state.localName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const skinPath = new RegExp(`/skins/${CUSTOM_SKIN_TYPE}/${escapedName}\\.png$`, 'i');
    return skinPath.test(getUrlPath(originalUrl)) ? state.activeUrl : originalUrl;
  }

  function patchAssetManifestText(text) {
    const originalText = String(text || '');
    const state = getCustomSkinState();
    if (!state) {
      return originalText;
    }

    const skinPath = `skins/${CUSTOM_SKIN_TYPE}/${state.localName}.png`;
    if (originalText.includes(skinPath)) {
      return originalText;
    }

    const separator = originalText.endsWith('\n') || originalText.length === 0 ? '' : '\n';
    return `${originalText}${separator}i:${skinPath}:0:image/png\n`;
  }

  function findPropertyDescriptor(prototype, propertyName) {
    let current = prototype;
    while (current) {
      const descriptor = Object.getOwnPropertyDescriptor(current, propertyName);
      if (descriptor) {
        return descriptor;
      }

      current = Object.getPrototypeOf(current);
    }

    return null;
  }

  function installManifestResponsePatch(xhr) {
    const ownTextDescriptor = Object.getOwnPropertyDescriptor(xhr, 'responseText');
    const ownResponseDescriptor = Object.getOwnPropertyDescriptor(xhr, 'response');
    const textDescriptor = ownTextDescriptor || findPropertyDescriptor(Object.getPrototypeOf(xhr), 'responseText');
    const responseDescriptor = ownResponseDescriptor || findPropertyDescriptor(Object.getPrototypeOf(xhr), 'response');

    if (textDescriptor) {
      try {
        Object.defineProperty(xhr, 'responseText', {
          configurable: true,
          get() {
            const raw = typeof textDescriptor.get === 'function' ? textDescriptor.get.call(this) : textDescriptor.value;
            return patchAssetManifestText(raw);
          },
        });
      } catch {
        // Some browser implementations do not allow shadowing XHR properties.
      }
    }

    if (responseDescriptor) {
      try {
        Object.defineProperty(xhr, 'response', {
          configurable: true,
          get() {
            const raw = typeof responseDescriptor.get === 'function' ? responseDescriptor.get.call(this) : responseDescriptor.value;
            return typeof raw === 'string' ? patchAssetManifestText(raw) : raw;
          },
        });
      } catch {
        // Some browser implementations do not allow shadowing XHR properties.
      }
    }
  }

  function installEarlyCustomSkinHooks() {
    if (globalThis.__blobioLoaderCustomSkinHookInstalled) {
      return;
    }

    const imagePrototype = globalThis.HTMLImageElement?.prototype;
    const srcDescriptor = imagePrototype && findPropertyDescriptor(imagePrototype, 'src');
    if (srcDescriptor?.get && srcDescriptor?.set) {
      Object.defineProperty(imagePrototype, 'src', {
        configurable: true,
        enumerable: srcDescriptor.enumerable,
        get: srcDescriptor.get,
        set(value) {
          srcDescriptor.set.call(this, resolveCustomSkinUrl(value));
        },
      });
    }

    const originalImageSetAttribute = imagePrototype?.setAttribute || globalThis.Element?.prototype?.setAttribute;
    if (imagePrototype && typeof originalImageSetAttribute === 'function') {
      imagePrototype.setAttribute = function setCustomSkinImageAttribute(name, value) {
        const nextValue = String(name).toLowerCase() === 'src' ? resolveCustomSkinUrl(value) : value;
        return originalImageSetAttribute.call(this, name, nextValue);
      };
    }

    const xhrPrototype = globalThis.XMLHttpRequest?.prototype;
    if (xhrPrototype) {
      const originalOpen = xhrPrototype.open;
      if (typeof originalOpen === 'function') {
        xhrPrototype.open = function openCustomSkinRequest(method, url, ...rest) {
          if (isAssetManifestUrl(url)) {
            installManifestResponsePatch(this);
          }

          return originalOpen.call(this, method, resolveCustomSkinUrl(url), ...rest);
        };
      }
    }

    const originalFetch = globalThis.fetch;
    if (typeof originalFetch === 'function') {
      globalThis.fetch = function fetchCustomSkin(input, init) {
        const originalUrl = typeof input === 'string' || input instanceof String ? String(input) : input?.url;
        const nextInput = originalUrl && resolveCustomSkinUrl(originalUrl) !== originalUrl ? resolveCustomSkinUrl(originalUrl) : input;
        const responsePromise = originalFetch.call(this, nextInput, init);

        if (!originalUrl || !isAssetManifestUrl(originalUrl) || typeof globalThis.Response !== 'function') {
          return responsePromise;
        }

        return responsePromise.then((response) => response.clone().text().then((text) => {
          const patchedText = patchAssetManifestText(text);
          if (patchedText === text) {
            return response;
          }

          return new Response(patchedText, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }));
      };
    }

    globalThis.__blobioLoaderCustomSkinHookInstalled = true;
  }

  function fetchBundle(index = 0, failures = []) {
    if (typeof GM_xmlhttpRequest !== 'function') {
      logError('GM_xmlhttpRequest is unavailable. Check the userscript grants.');
      return;
    }

    const url = BUNDLE_URLS[index];
    if (!url) {
      logError('Failed to fetch extension bundle from all configured URLs.', failures);
      return;
    }

    GM_xmlhttpRequest({
      method: 'GET',
      url,
      timeout: 15000,
      onload(response) {
        if (response.status < 200 || response.status >= 300) {
          fetchBundle(index + 1, failures.concat(`HTTP ${response.status} from ${url}`));
          return;
        }

        if (!response.responseText) {
          logError('Fetched extension bundle was empty.');
          return;
        }

        runBundle(response.responseText);
      },
      onerror(error) {
        fetchBundle(index + 1, failures.concat(error || `Network error from ${url}`));
      },
      ontimeout() {
        fetchBundle(index + 1, failures.concat(`Timed out while fetching ${url}`));
      },
    });
  }

  syncCustomClientSkinConfig();
  installEarlyCustomSkinHooks();
  fetchBundle();
})();
