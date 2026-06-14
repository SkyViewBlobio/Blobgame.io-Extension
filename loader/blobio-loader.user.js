// ==UserScript==
// @name         Blobio Web Script Loader
// @namespace    https://github.com/SkyViewBlobio/Blobgame.io-Web-Script
// @version      0.1.57
// @description  Loads the Blobio modular extension bundle from GitHub.
// @match        *://blobgame.io/*
// @match        *://custom.client.blobgame.io/*
// @run-at       document-start
// @sandbox      raw
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
  const VERSION = '0.1.57';
  const CUSTOM_CLIENT_HOST = 'custom.client.blobgame.io';
  const STORAGE_BRIDGE_SOURCE = 'BlobioExtensionStorageBridge';
  const CUSTOM_SKIN_ENABLED_KEY = 'blobio.customSkin.enabled';
  const CUSTOM_SKIN_ACTIVE_KEY = 'blobio.customSkin.activeUrl';
  const CUSTOM_SKIN_CARRIER_ASSET_KEY = 'blobio.customSkin.carrierAsset';
  const FPS_UNCAP_STORAGE_KEY = 'blobio.settings.fpsUncap';
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

  function isSharedStorageKey(key) {
    const value = String(key || '');
    return value.startsWith('blobio.customSkin.')
      || value.startsWith('blobio.roles.')
      || value.startsWith('blobio.settings.')
      || value.startsWith('blobio.chat.');
  }

  function installSharedStorageBridge() {
    if (globalThis.__blobioSharedStorageBridgeInstalled) {
      return;
    }

    globalThis.__blobioSharedStorageBridge = {
      getItem(key) {
        return isSharedStorageKey(key) ? getSharedValue(key) : getLocalValue(key);
      },
      setItem(key, value) {
        if (isSharedStorageKey(key)) {
          setSharedValue(key, value);
        } else {
          setLocalValue(key, value);
        }
      },
      removeItem(key) {
        if (isSharedStorageKey(key)) {
          removeSharedValue(key);
        } else {
          removeLocalValue(key);
        }
      },
    };

    window.addEventListener?.('message', (event) => {
      const message = event.data;
      if (!message || message.source !== STORAGE_BRIDGE_SOURCE || !isSharedStorageKey(message.key)) {
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

  function pageFpsUncapBootstrap(initialEnabled, pageWindow) {
    'use strict';

    const rootWindow = pageWindow || globalThis;
    const requestNames = [
      'requestAnimationFrame',
      'webkitRequestAnimationFrame',
      'mozRequestAnimationFrame',
      'msRequestAnimationFrame',
      'oRequestAnimationFrame',
    ];
    const cancelNames = [
      'cancelAnimationFrame',
      'webkitCancelAnimationFrame',
      'webkitCancelRequestAnimationFrame',
      'mozCancelAnimationFrame',
      'mozCancelRequestAnimationFrame',
      'msCancelAnimationFrame',
      'oCancelAnimationFrame',
    ];
    const state = rootWindow.__blobioFpsUncapState || {};

    Object.assign(state, {
      enabled: Boolean(initialEnabled),
      windowsInstalled: Number(state.windowsInstalled) || 0,
      callbacksScheduled: Number(state.callbacksScheduled) || 0,
      callbacksRun: Number(state.callbacksRun) || 0,
      aliasesPatched: Array.isArray(state.aliasesPatched) ? state.aliasesPatched : [],
      schedulers: Array.isArray(state.schedulers) ? state.schedulers : [],
      lastError: String(state.lastError || ''),
    });
    rootWindow.__blobioFpsUncapState = state;

    function now(win) {
      return win.performance?.now?.() ?? Date.now();
    }

    function replaceWindowFunction(win, name, value) {
      try {
        Object.defineProperty(win, name, {
          configurable: true,
          writable: true,
          value,
        });
        return win[name] === value;
      } catch {
        try {
          win[name] = value;
          return win[name] === value;
        } catch {
          return false;
        }
      }
    }

    function createUncappedScheduler(win) {
      const callbacks = new Map();
      let nextId = 0x40000000;
      let scheduleTask;
      let schedulerName;

      const runNext = () => {
        const next = callbacks.entries().next();
        if (next.done) {
          return;
        }

        const [id, callback] = next.value;
        callbacks.delete(id);
        state.callbacksRun += 1;
        callback.call(win, now(win));
      };

      if (typeof win.MessageChannel === 'function') {
        const channel = new win.MessageChannel();
        channel.port1.onmessage = runNext;
        scheduleTask = () => channel.port2.postMessage(0);
        schedulerName = 'MessageChannel';
      } else {
        scheduleTask = () => win.setTimeout(runNext, 0);
        schedulerName = 'setTimeout';
      }

      return {
        name: schedulerName,
        request(callback) {
          if (typeof callback !== 'function') {
            throw new TypeError('requestAnimationFrame callback must be a function');
          }

          const id = nextId;
          nextId = nextId >= 0x7ffffffe ? 0x40000000 : nextId + 1;
          callbacks.set(id, callback);
          state.callbacksScheduled += 1;
          scheduleTask();
          return id;
        },
        cancel(id) {
          return callbacks.delete(id);
        },
      };
    }

    function installIntoWindow(win) {
      if (!win || win.__blobioFpsUncapInstalled) {
        return;
      }

      const nativeRequests = new Map();
      const nativeCancels = new Map();
      const scheduler = createUncappedScheduler(win);
      const nativeRequestFallback = requestNames
        .map((name) => typeof win[name] === 'function' ? win[name].bind(win) : null)
        .find(Boolean)
        || ((callback) => win.setTimeout(() => callback(now(win)), 16));
      const nativeCancelFallback = cancelNames
        .map((name) => typeof win[name] === 'function' ? win[name].bind(win) : null)
        .find(Boolean)
        || win.clearTimeout.bind(win);

      for (const name of requestNames) {
        if (typeof win[name] === 'function') {
          nativeRequests.set(name, win[name].bind(win));
        }
      }
      for (const name of cancelNames) {
        if (typeof win[name] === 'function') {
          nativeCancels.set(name, win[name].bind(win));
        }
      }

      const patchedAliases = [];
      for (const name of requestNames) {
        if (name !== 'requestAnimationFrame' && !nativeRequests.has(name)) {
          continue;
        }

        const nativeRequest = nativeRequests.get(name) || nativeRequestFallback;
        const replacement = function blobioRequestAnimationFrame(callback, ...args) {
          if (!state.enabled) {
            return nativeRequest(callback, ...args);
          }
          return scheduler.request(callback);
        };

        if (replaceWindowFunction(win, name, replacement)) {
          patchedAliases.push(name);
        }
      }

      for (const name of cancelNames) {
        if (name !== 'cancelAnimationFrame' && !nativeCancels.has(name)) {
          continue;
        }

        const nativeCancel = nativeCancels.get(name) || nativeCancelFallback;
        const replacement = function blobioCancelAnimationFrame(id) {
          if (!scheduler.cancel(id)) {
            nativeCancel(id);
          }
        };
        replaceWindowFunction(win, name, replacement);
      }

      Object.defineProperty(win, '__blobioFpsUncapInstalled', {
        value: true,
        configurable: true,
      });

      state.windowsInstalled += 1;
      state.schedulers.push(scheduler.name);
      for (const name of patchedAliases) {
        if (!state.aliasesPatched.includes(name)) {
          state.aliasesPatched.push(name);
        }
      }
    }

    function installIntoFrame(frame) {
      try {
        installIntoWindow(frame?.contentWindow);
      } catch {
        // Cross-origin frames are unrelated to the game loop.
      }
    }

    function watchFrames(win) {
      const start = () => {
        const root = win.document?.documentElement || win.document?.body;
        if (!root || !win.MutationObserver) {
          return;
        }

        const observer = new win.MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes || []) {
              if (String(node?.tagName || '').toUpperCase() === 'IFRAME') {
                installIntoFrame(node);
              }
              node?.querySelectorAll?.('iframe')?.forEach(installIntoFrame);
            }
          }
        });
        observer.observe(root, { childList: true, subtree: true });
      };

      if (win.document?.documentElement || win.document?.body) {
        start();
      } else {
        win.document?.addEventListener?.('DOMContentLoaded', start, { once: true });
      }
    }

    rootWindow.__blobioFpsUncapRefresh = (enabled) => {
      state.enabled = Boolean(enabled);
    };
    rootWindow.__blobioFpsUncapStatus = () => ({
      enabled: state.enabled,
      installed: Boolean(rootWindow.__blobioFpsUncapInstalled),
      windowsInstalled: state.windowsInstalled,
      callbacksScheduled: state.callbacksScheduled,
      callbacksRun: state.callbacksRun,
      aliasesPatched: [...state.aliasesPatched],
      schedulers: [...state.schedulers],
      lastError: state.lastError,
    });

    try {
      installIntoWindow(rootWindow);
      rootWindow.document?.querySelectorAll?.('iframe')?.forEach(installIntoFrame);
      watchFrames(rootWindow);
    } catch (error) {
      state.lastError = error?.message || String(error);
      rootWindow.console?.error?.('[Blobio] Failed to patch the game frame scheduler.', error);
    }
  }

  function installFpsUncapRuntime() {
    if (location.hostname !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const readEnabled = () => getSharedValue(FPS_UNCAP_STORAGE_KEY) === '1';

    try {
      pageFpsUncapBootstrap(readEnabled(), pageWindow);
    } catch (error) {
      logError('Failed to install FPS-uncap runtime.', error);
      return;
    }

    const refresh = () => {
      try {
        pageWindow.__blobioFpsUncapRefresh?.(readEnabled());
      } catch (error) {
        logError('Failed to refresh FPS-uncap state.', error);
      }
    };

    if (typeof GM_addValueChangeListener === 'function') {
      try {
        GM_addValueChangeListener(FPS_UNCAP_STORAGE_KEY, refresh);
      } catch {}
    }

    window.addEventListener?.('message', (event) => {
      const message = event.data;
      if (message?.source === STORAGE_BRIDGE_SOURCE && message.key === FPS_UNCAP_STORAGE_KEY) {
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
  installFpsUncapRuntime();
  installCarrierSkinRuntime();
  fetchBundle();
})();
