// ==UserScript==
// @name         Blobio Web Script Loader
// @namespace    https://github.com/SkyViewBlobio/Blobgame.io-Web-Script
// @version      0.1.44
// @description  Loads the Blobio modular extension bundle from GitHub.
// @match        *://blobgame.io/*
// @match        *://custom.client.blobgame.io/*
// @run-at       document-start
// @sandbox      JavaScript
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @connect      cdn.jsdelivr.net
// @connect      raw.githubusercontent.com
// @downloadURL  https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Web-Script/main/loader/blobio-loader.user.js
// @updateURL    https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Web-Script/main/loader/blobio-loader.user.js
// ==/UserScript==

(() => {
  'use strict';

  const LOG_PREFIX = '[Blobio]';
  const VERSION = '0.1.44';
  const CUSTOM_CLIENT_HOST = 'custom.client.blobgame.io';
  const STORAGE_BRIDGE_SOURCE = 'BlobioExtensionStorageBridge';
  const CUSTOM_SKIN_ENABLED_KEY = 'blobio.customSkin.enabled';
  const CUSTOM_SKIN_ACTIVE_KEY = 'blobio.customSkin.activeUrl';
  const CUSTOM_SKIN_CARRIER_ASSET_KEY = 'blobio.customSkin.carrierAsset';
  const DIRECT_IMGUR_IMAGE_MATCH = /^https:\/\/i\.imgur\.com\/[a-z0-9]+\.(?:png|jpe?g|webp)(?:\?.*)?$/i;

  globalThis.__blobioLoaderVersion = VERSION;

  const BUNDLE_URLS = [
    `https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Web-Script/main/dist/blobio-extension.bundle.js?v=${VERSION}`,
    `https://cdn.jsdelivr.net/gh/SkyViewBlobio/Blobgame.io-Web-Script@main/dist/blobio-extension.bundle.js?v=${VERSION}`,
  ];

  function logError(message, detail) {
    if (detail) {
      console.error(LOG_PREFIX, message, detail);
    } else {
      console.error(LOG_PREFIX, message);
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
      localStorage.setItem(key, String(value));
    } catch {}
  }

  function removeLocalValue(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
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
    } catch {}

    return getLocalValue(key);
  }

  function setSharedValue(key, value) {
    try {
      GM_setValue?.(key, String(value));
    } catch {}
    setLocalValue(key, value);
  }

  function removeSharedValue(key) {
    try {
      GM_deleteValue?.(key);
    } catch {}
    removeLocalValue(key);
  }

  function isCustomSkinStorageKey(key) {
    return String(key || '').startsWith('blobio.customSkin.');
  }

  function installSharedStorageBridge() {
    if (globalThis.__blobioSharedStorageBridgeInstalled) {
      return;
    }

    globalThis.__blobioSharedStorageBridge = {
      getItem(key) {
        return isCustomSkinStorageKey(key) ? getSharedValue(key) : getLocalValue(key);
      },
      setItem(key, value) {
        if (isCustomSkinStorageKey(key)) {
          setSharedValue(key, value);
        } else {
          setLocalValue(key, value);
        }
      },
      removeItem(key) {
        if (isCustomSkinStorageKey(key)) {
          removeSharedValue(key);
        } else {
          removeLocalValue(key);
        }
      },
    };

    window.addEventListener?.('message', (event) => {
      const message = event.data;
      if (!message || message.source !== STORAGE_BRIDGE_SOURCE || !isCustomSkinStorageKey(message.key)) {
        return;
      }

      if (message.type === 'set') {
        setSharedValue(message.key, message.value ?? '');
      } else if (message.type === 'remove') {
        removeSharedValue(message.key);
      }
    });

    globalThis.__blobioSharedStorageBridgeInstalled = true;
  }

  function normalizeCarrierAsset(rawUrl) {
    try {
      const url = new URL(String(rawUrl || ''), location.href);
      return /\/skins\/[^/]+\/[^/]+\.png$/i.test(url.pathname) ? url.toString() : '';
    } catch {
      return '';
    }
  }

  function getCustomSkinState() {
    const activeUrl = String(getSharedValue(CUSTOM_SKIN_ACTIVE_KEY) || '').trim();
    const carrierAsset = normalizeCarrierAsset(getSharedValue(CUSTOM_SKIN_CARRIER_ASSET_KEY));
    const enabled = getSharedValue(CUSTOM_SKIN_ENABLED_KEY) === '1'
      && DIRECT_IMGUR_IMAGE_MATCH.test(activeUrl)
      && Boolean(carrierAsset);

    return {
      enabled,
      activeUrl: enabled ? activeUrl : '',
      carrierAsset: enabled ? carrierAsset : '',
    };
  }

  function pageCarrierSkinBootstrap(initialState, pageWindow) {
    'use strict';

    const rootWindow = pageWindow || globalThis;
    const installFlag = '__blobioCarrierSkinReplacerInstalled';
    const frameHookFlag = '__blobioCarrierSkinFrameHookInstalled';
    const state = rootWindow.__blobioCarrierSkinState || {
      enabled: false,
      activeUrl: '',
      carrierAsset: '',
    };
    const status = rootWindow.__blobioCarrierSkinStatusData || {
      windowsInstalled: 0,
      imageRequests: 0,
      fetchRequests: 0,
      xhrRequests: 0,
      replacements: 0,
      lastCarrierRequest: '',
      lastError: '',
    };

    Object.assign(state, initialState || {});
    rootWindow.__blobioCarrierSkinState = state;
    rootWindow.__blobioCarrierSkinStatusData = status;

    function parseUrl(value, win) {
      try {
        return new URL(String(value || ''), win.location.href);
      } catch {
        return null;
      }
    }

    function filenameFromPath(pathname) {
      const filename = String(pathname || '').slice(String(pathname || '').lastIndexOf('/') + 1);
      try {
        return decodeURIComponent(filename).toLowerCase();
      } catch {
        return filename.toLowerCase();
      }
    }

    function isCarrierUrl(value, win) {
      if (!state.enabled || !state.activeUrl || !state.carrierAsset || typeof value !== 'string') {
        return false;
      }

      const candidate = parseUrl(value.trim(), win);
      const carrier = parseUrl(state.carrierAsset, win);
      if (!candidate || !carrier) {
        return false;
      }

      if (candidate.pathname === carrier.pathname) {
        return true;
      }

      return /\/skins\//i.test(candidate.pathname)
        && filenameFromPath(candidate.pathname) === filenameFromPath(carrier.pathname);
    }

    function rewriteSkinUrl(value, win) {
      if (!isCarrierUrl(value, win)) {
        return value;
      }

      status.replacements += 1;
      status.lastCarrierRequest = String(value);
      return state.activeUrl;
    }

    function findDescriptor(prototype, propertyName) {
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

    function installImageSrcHook(win) {
      if (!win.HTMLImageElement) {
        return;
      }

      const descriptor = findDescriptor(win.HTMLImageElement.prototype, 'src');
      if (!descriptor?.get || !descriptor?.set) {
        return;
      }

      Object.defineProperty(win.HTMLImageElement.prototype, 'src', {
        configurable: true,
        enumerable: descriptor.enumerable,
        get() {
          return descriptor.get.call(this);
        },
        set(value) {
          const nextUrl = rewriteSkinUrl(value, win);
          if (nextUrl !== value) {
            status.imageRequests += 1;
            this.crossOrigin = 'anonymous';
          }
          descriptor.set.call(this, nextUrl);
        },
      });
    }

    function installSetAttributeHook(win) {
      if (!win.Element || typeof win.Element.prototype.setAttribute !== 'function') {
        return;
      }

      const originalSetAttribute = win.Element.prototype.setAttribute;
      win.Element.prototype.setAttribute = function setBlobioCarrierAttribute(name, value) {
        const isImageSource = this instanceof win.HTMLImageElement
          && typeof name === 'string'
          && name.toLowerCase() === 'src';

        if (!isImageSource) {
          return originalSetAttribute.call(this, name, value);
        }

        const nextUrl = rewriteSkinUrl(value, win);
        if (nextUrl !== value) {
          status.imageRequests += 1;
          this.crossOrigin = 'anonymous';
        }
        return originalSetAttribute.call(this, name, nextUrl);
      };
    }

    function installXhrHook(win) {
      if (!win.XMLHttpRequest || typeof win.XMLHttpRequest.prototype.open !== 'function') {
        return;
      }

      const originalOpen = win.XMLHttpRequest.prototype.open;
      win.XMLHttpRequest.prototype.open = function openBlobioCarrier(method, url, ...args) {
        const nextUrl = rewriteSkinUrl(url, win);
        if (nextUrl !== url) {
          status.xhrRequests += 1;
        }
        return originalOpen.call(this, method, nextUrl, ...args);
      };
    }

    function rewriteRequestInput(input, win) {
      if (typeof input === 'string') {
        return rewriteSkinUrl(input, win);
      }

      if (!input || typeof input.url !== 'string') {
        return input;
      }

      const nextUrl = rewriteSkinUrl(input.url, win);
      if (nextUrl === input.url || typeof win.Request !== 'function') {
        return input;
      }

      return new win.Request(nextUrl, input);
    }

    function installFetchHook(win) {
      if (typeof win.fetch !== 'function') {
        return;
      }

      const originalFetch = win.fetch;
      win.fetch = function fetchBlobioCarrier(input, init) {
        const nextInput = rewriteRequestInput(input, win);
        if (nextInput !== input) {
          status.fetchRequests += 1;
        }
        return originalFetch.call(this, nextInput, init);
      };
    }

    function installIntoFrame(frame) {
      if (!frame?.contentWindow) {
        return;
      }

      try {
        installIntoWindow(frame.contentWindow);
      } catch {
        // Ad and analytics frames may be cross-origin.
      }
    }

    function installFrameHooks(win) {
      if (!win.Node || win.Node.prototype[frameHookFlag]) {
        return;
      }

      Object.defineProperty(win.Node.prototype, frameHookFlag, { value: true });
      const originalAppendChild = win.Node.prototype.appendChild;
      const originalInsertBefore = win.Node.prototype.insertBefore;

      if (typeof originalAppendChild === 'function') {
        win.Node.prototype.appendChild = function appendBlobioNode(child) {
          const result = originalAppendChild.call(this, child);
          installIntoFrame(child);
          return result;
        };
      }

      if (typeof originalInsertBefore === 'function') {
        win.Node.prototype.insertBefore = function insertBlobioNode(child, referenceNode) {
          const result = originalInsertBefore.call(this, child, referenceNode);
          installIntoFrame(child);
          return result;
        };
      }
    }

    function observeFrames(win) {
      if (!win.MutationObserver || !win.document) {
        return;
      }

      const start = () => {
        const root = win.document.documentElement || win.document.body;
        if (!root) {
          return;
        }

        const observer = new win.MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              installIntoFrame(node);
              node.querySelectorAll?.('iframe')?.forEach(installIntoFrame);
            }
          }
        });

        observer.observe(root, { childList: true, subtree: true });
        win.addEventListener?.('load', () => {
          win.setTimeout?.(() => observer.disconnect(), 5000);
        }, { once: true });
      };

      if (win.document.documentElement || win.document.body) {
        start();
      } else {
        win.document.addEventListener?.('DOMContentLoaded', start, { once: true });
      }
    }

    function installIntoWindow(win) {
      if (!win || win[installFlag]) {
        return;
      }

      try {
        Object.defineProperty(win, installFlag, { value: true, configurable: true });
        installImageSrcHook(win);
        installSetAttributeHook(win);
        installXhrHook(win);
        installFetchHook(win);
        installFrameHooks(win);
        win.document?.querySelectorAll?.('iframe')?.forEach(installIntoFrame);
        observeFrames(win);
        status.windowsInstalled += 1;
      } catch (error) {
        status.lastError = error?.message || String(error);
      }
    }

    rootWindow.__blobioCarrierSkinRefresh = (nextState) => {
      Object.assign(state, {
        enabled: false,
        activeUrl: '',
        carrierAsset: '',
        ...(nextState || {}),
      });
    };
    rootWindow.__blobioCarrierSkinStatus = () => ({
      ...status,
      enabled: state.enabled,
      activeUrl: state.activeUrl,
      carrierAsset: state.carrierAsset,
      carrierFilename: filenameFromPath(parseUrl(state.carrierAsset, rootWindow)?.pathname || ''),
    });

    installIntoWindow(rootWindow);
  }

  function installCarrierSkinRuntime() {
    if (location.hostname !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    try {
      pageCarrierSkinBootstrap(getCustomSkinState(), pageWindow);
    } catch (error) {
      logError('Failed to install the owned-skin asset replacement.', error);
      return;
    }

    const refresh = () => {
      try {
        pageWindow.__blobioCarrierSkinRefresh?.(getCustomSkinState());
      } catch (error) {
        logError('Failed to refresh Custom Skin state.', error);
      }
    };

    if (typeof GM_addValueChangeListener === 'function') {
      for (const key of [
        CUSTOM_SKIN_ENABLED_KEY,
        CUSTOM_SKIN_ACTIVE_KEY,
        CUSTOM_SKIN_CARRIER_ASSET_KEY,
      ]) {
        try {
          GM_addValueChangeListener(key, refresh);
        } catch {}
      }
    }

    window.addEventListener?.('message', (event) => {
      const message = event.data;
      if (message?.source === STORAGE_BRIDGE_SOURCE && [
        CUSTOM_SKIN_ENABLED_KEY,
        CUSTOM_SKIN_ACTIVE_KEY,
        CUSTOM_SKIN_CARRIER_ASSET_KEY,
      ].includes(message.key)) {
        refresh();
      }
    });
  }

  function runBundle(source) {
    try {
      const run = new Function(`${source}\n//# sourceURL=blobio-extension.bundle.js`);
      run();
    } catch (error) {
      logError('Failed to run extension bundle.', error);
    }
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
        if (response.status < 200 || response.status >= 300 || !response.responseText) {
          fetchBundle(index + 1, failures.concat(`Invalid response from ${url}`));
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

  installSharedStorageBridge();
  installCarrierSkinRuntime();
  fetchBundle();
})();
