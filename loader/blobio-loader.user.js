// ==UserScript==
// @name         Blobio Web Script Loader
// @namespace    https://github.com/SkyViewBlobio/Blobgame.io-Extension
// @version      0.1.64
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
// @grant        GM_removeValueChangeListener
// @connect      cdn.jsdelivr.net
// @connect      raw.githubusercontent.com
// @downloadURL  https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Extension/main/loader/blobio-loader.user.js
// @updateURL    https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Extension/main/loader/blobio-loader.user.js
// ==/UserScript==

(() => {
  'use strict';

  const LOG_PREFIX = '[Blobio]';
  const VERSION = '0.1.64';
  const CUSTOM_CLIENT_HOST = 'custom.client.blobgame.io';
  const STORAGE_BRIDGE_SOURCE = 'BlobioExtensionStorageBridge';
  const CUSTOM_SKIN_ENABLED_KEY = 'blobio.customSkin.enabled';
  const CUSTOM_SKIN_ACTIVE_KEY = 'blobio.customSkin.activeUrl';
  const CUSTOM_SKIN_CARRIER_ASSET_KEY = 'blobio.customSkin.carrierAsset';
  const FPS_UNCAP_STORAGE_KEY = 'blobio.settings.fpsUncap';
  const DIRECT_IMGUR_IMAGE_MATCH = /^https:\/\/i\.imgur\.com\/[a-z0-9]+\.(?:png|jpe?g|webp)(?:\?.*)?$/i;

  globalThis.__blobioLoaderVersion = VERSION;

  const BUNDLE_URLS = [
    `https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Extension/main/dist/blobio-extension.bundle.js?v=${VERSION}`,
    `https://cdn.jsdelivr.net/gh/SkyViewBlobio/Blobgame.io-Extension@main/dist/blobio-extension.bundle.js?v=${VERSION}`,
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

    const win = pageWindow || globalThis;
    const doc = win.document;

    if (win.__blobFpsUncapInstalled) {
      win.__blobioFpsUncapRefresh?.(initialEnabled);
      return;
    }

    const config = {
      enabled: Boolean(initialEnabled),
      mode: 'safe-uncapped',
      startupDelayMs: 5000,
      yieldEveryFrames: 120,
      preserveCameraZoom: true,
      cameraDeltaFloor: 0.003000000026077032,
      minCameraDeltaSeconds: 0.0001,
      keepVisible: true,
      log: false,
    };

    const state = {
      installed: false,
      callbacksScheduled: 0,
      callbacksRun: 0,
      nativeFramesScheduled: 0,
      pendingFrames: 0,
      uncappedFramesSinceYield: 0,
      currentFrameDeltaSeconds: 1 / 240,
      scheduler: 'message-channel',
      lastError: '',
    };

    win.__blobFpsUncap = config;
    win.__blobioFpsUncapState = state;

    function log(...args) {
      if (config.log && win.console) {
        win.console.info('[Blob FPS Uncap]', ...args);
      }
    }

    function now() {
      return win.performance?.now?.() ?? Date.now();
    }

    const native = {
      requestAnimationFrame: typeof win.requestAnimationFrame === 'function'
        ? win.requestAnimationFrame.bind(win)
        : (callback) => win.setTimeout(() => callback(now()), 16),
      cancelAnimationFrame: typeof win.cancelAnimationFrame === 'function'
        ? win.cancelAnimationFrame.bind(win)
        : win.clearTimeout.bind(win),
      setTimeout: win.setTimeout.bind(win),
      clearTimeout: win.clearTimeout.bind(win),
      addEventListener: win.EventTarget?.prototype?.addEventListener,
      mathMax: win.Math.max.bind(win.Math),
      mathAbs: win.Math.abs.bind(win.Math),
      hasFocus: typeof doc?.hasFocus === 'function' ? doc.hasFocus.bind(doc) : null,
    };

    const pendingFrames = new Map();
    const nativeFrames = new Set();
    const installedAt = now();
    let nextFrameId = 0x40000000;
    let uncappedFramesSinceYield = 0;
    let insideFrameCallback = false;
    let lastFrameTime = 0;
    let currentFrameDeltaSeconds = 1 / 240;
    let messageChannel = null;

    function isActive() {
      return config.enabled && config.mode !== 'native';
    }

    function beginFrame(timestamp) {
      const frameTime = typeof timestamp === 'number' ? timestamp : now();
      if (lastFrameTime > 0) {
        currentFrameDeltaSeconds = native.mathMax(
          (frameTime - lastFrameTime) / 1000,
          config.minCameraDeltaSeconds,
        );
      }
      lastFrameTime = frameTime;
      insideFrameCallback = true;
      state.currentFrameDeltaSeconds = currentFrameDeltaSeconds;
      return frameTime;
    }

    function endFrame() {
      insideFrameCallback = false;
    }

    function patchCameraDeltaFloor() {
      if (!config.preserveCameraZoom || win.Math.__blobFpsUncapMaxPatched) {
        return;
      }

      const originalMax = win.Math.max;
      const patchedMax = function blobFpsUncapMathMax(...values) {
        if (
          isActive()
          && insideFrameCallback
          && values.length === 2
          && typeof values[0] === 'number'
          && typeof values[1] === 'number'
          && values[0] >= 0
          && values[0] < config.cameraDeltaFloor
          && native.mathAbs(values[1] - config.cameraDeltaFloor) < 1e-12
        ) {
          return currentFrameDeltaSeconds;
        }

        return native.mathMax(...values);
      };

      patchedMax.__blobFpsUncapOriginal = originalMax;
      win.Math.max = patchedMax;
      win.Math.__blobFpsUncapMaxPatched = true;
    }

    function runFrame(id) {
      const frame = pendingFrames.get(id);
      if (!frame) {
        return;
      }

      pendingFrames.delete(id);
      state.pendingFrames = pendingFrames.size;

      if (!isActive()) {
        requestNativeFrame(frame.callback);
        return;
      }

      const timestamp = beginFrame(now());
      try {
        state.callbacksRun += 1;
        frame.callback(timestamp);
      } catch (error) {
        state.lastError = error?.message || String(error);
        throw error;
      } finally {
        endFrame();
      }
    }

    function requestUncappedFrame(callback) {
      const id = nextFrameId;
      nextFrameId = nextFrameId >= 0x7ffffffe ? 0x40000000 : nextFrameId + 1;
      const frame = { callback, timer: null };

      pendingFrames.set(id, frame);
      state.callbacksScheduled += 1;
      state.pendingFrames = pendingFrames.size;

      if (messageChannel) {
        messageChannel.port2.postMessage(id);
      } else {
        frame.timer = native.setTimeout(() => runFrame(id), 0);
      }

      return id;
    }

    function cancelUncappedFrame(id) {
      const frame = pendingFrames.get(id);
      if (!frame) {
        return false;
      }

      if (frame.timer !== null) {
        native.clearTimeout(frame.timer);
      }
      pendingFrames.delete(id);
      state.pendingFrames = pendingFrames.size;
      return true;
    }

    function requestNativeFrame(callback) {
      let id = 0;
      id = native.requestAnimationFrame((timestamp) => {
        nativeFrames.delete(id);
        uncappedFramesSinceYield = 0;
        state.uncappedFramesSinceYield = 0;

        const frameTime = beginFrame(timestamp);
        try {
          state.callbacksRun += 1;
          callback(frameTime);
        } catch (error) {
          state.lastError = error?.message || String(error);
          throw error;
        } finally {
          endFrame();
        }
      });
      nativeFrames.add(id);
      state.callbacksScheduled += 1;
      state.nativeFramesScheduled += 1;
      return id;
    }

    function shouldUseNativeFrame() {
      if (!isActive()) {
        return true;
      }
      if (config.mode !== 'safe-uncapped') {
        return false;
      }
      if (doc && doc.readyState !== 'complete') {
        return true;
      }
      if (now() - installedAt < config.startupDelayMs) {
        return true;
      }

      return config.yieldEveryFrames > 0
        && uncappedFramesSinceYield >= config.yieldEveryFrames;
    }

    function flushPendingFramesToNative() {
      if (pendingFrames.size === 0) {
        return;
      }

      const callbacks = [...pendingFrames.values()].map((frame) => frame.callback);
      for (const frame of pendingFrames.values()) {
        if (frame.timer !== null) {
          native.clearTimeout(frame.timer);
        }
      }
      pendingFrames.clear();
      state.pendingFrames = 0;

      for (const callback of callbacks) {
        requestNativeFrame(callback);
      }
    }

    function findDescriptor(target, key) {
      let current = target;
      while (current) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor) {
          return descriptor;
        }
        current = Object.getPrototypeOf(current);
      }
      return null;
    }

    function patchDocumentVisibility(key, visibleValue) {
      if (!doc) {
        return;
      }

      const descriptor = findDescriptor(doc, key);
      try {
        Object.defineProperty(doc, key, {
          configurable: true,
          enumerable: descriptor?.enumerable ?? true,
          get() {
            if (isActive() && config.keepVisible) {
              return visibleValue;
            }
            if (typeof descriptor?.get === 'function') {
              return descriptor.get.call(doc);
            }
            return descriptor?.value;
          },
        });
      } catch (error) {
        log('could not patch', key, error);
      }
    }

    function installVisibilityProtection() {
      if (!config.keepVisible || !doc) {
        return;
      }

      patchDocumentVisibility('hidden', false);
      patchDocumentVisibility('webkitHidden', false);
      patchDocumentVisibility('visibilityState', 'visible');
      patchDocumentVisibility('webkitVisibilityState', 'visible');

      if (native.hasFocus) {
        try {
          doc.hasFocus = function blobFpsUncapHasFocus() {
            return isActive() ? true : native.hasFocus();
          };
        } catch (error) {
          log('could not patch hasFocus', error);
        }
      }

      if (!native.addEventListener || !win.EventTarget) {
        return;
      }

      const blockedEvents = [
        'visibilitychange',
        'webkitvisibilitychange',
        'blur',
        'freeze',
      ];
      const stopPageThrottleEvent = (event) => {
        if (isActive()) {
          event.stopImmediatePropagation();
        }
      };

      for (const eventName of blockedEvents) {
        native.addEventListener.call(win, eventName, stopPageThrottleEvent, true);
        native.addEventListener.call(doc, eventName, stopPageThrottleEvent, true);
      }
    }

    patchCameraDeltaFloor();
    installVisibilityProtection();

    if (typeof win.MessageChannel === 'function') {
      messageChannel = new win.MessageChannel();
      messageChannel.port1.onmessage = (event) => runFrame(event.data);
      messageChannel.port1.start?.();
    } else {
      state.scheduler = 'timeout-fallback';
    }

    win.requestAnimationFrame = function blobFpsUncapRequestAnimationFrame(callback) {
      if (typeof callback !== 'function') {
        return 0;
      }

      if (shouldUseNativeFrame()) {
        return requestNativeFrame(callback);
      }

      uncappedFramesSinceYield += 1;
      state.uncappedFramesSinceYield = uncappedFramesSinceYield;
      return requestUncappedFrame(callback);
    };

    win.cancelAnimationFrame = function blobFpsUncapCancelAnimationFrame(id) {
      if (cancelUncappedFrame(id)) {
        return;
      }

      if (nativeFrames.delete(id)) {
        native.cancelAnimationFrame(id);
      }
    };

    win.webkitRequestAnimationFrame = win.requestAnimationFrame;
    win.mozRequestAnimationFrame = win.requestAnimationFrame;
    win.msRequestAnimationFrame = win.requestAnimationFrame;
    win.webkitCancelAnimationFrame = win.cancelAnimationFrame;
    win.mozCancelAnimationFrame = win.cancelAnimationFrame;
    win.msCancelAnimationFrame = win.cancelAnimationFrame;

    win.__blobFpsUncapInstalled = true;
    win.__blobioFpsUncapInstalled = true;
    state.installed = true;

    win.__blobioFpsUncapRefresh = (enabled) => {
      const nextEnabled = Boolean(enabled);
      if (config.enabled === nextEnabled) {
        return;
      }

      config.enabled = nextEnabled;
      state.lastError = '';

      if (!nextEnabled) {
        uncappedFramesSinceYield = 0;
        state.uncappedFramesSinceYield = 0;
        flushPendingFramesToNative();
      }
    };

    win.__blobioFpsUncapStatus = () => ({
      enabled: config.enabled,
      installed: state.installed,
      mode: config.mode,
      startupDelayMs: config.startupDelayMs,
      yieldEveryFrames: config.yieldEveryFrames,
      preserveCameraZoom: config.preserveCameraZoom,
      keepVisible: config.keepVisible,
      scheduler: state.scheduler,
      callbacksScheduled: state.callbacksScheduled,
      callbacksRun: state.callbacksRun,
      nativeFramesScheduled: state.nativeFramesScheduled,
      pendingFrames: state.pendingFrames,
      uncappedFramesSinceYield: state.uncappedFramesSinceYield,
      currentFrameDeltaSeconds: state.currentFrameDeltaSeconds,
      lastError: state.lastError,
    });

    log(
      'installed',
      `enabled=${config.enabled}`,
      `mode=${config.mode}`,
      `startupDelayMs=${config.startupDelayMs}`,
      `yieldEveryFrames=${config.yieldEveryFrames}`,
      `preserveCameraZoom=${config.preserveCameraZoom}`,
      `scheduler=${state.scheduler}`,
    );
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
