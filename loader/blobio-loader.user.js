// ==UserScript==
// @name         Blobio Web Script Loader
// @namespace    https://github.com/SkyViewBlobio/Blobgame.io-Extension
// @version      0.1.76
// @description  Loads the Blobio modular extension bundle from GitHub.
// @match        *://blobgame.io/*
// @match        *://www.blobgame.io/*
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
  const VERSION = '0.1.76';
  const CUSTOM_CLIENT_HOST = 'custom.client.blobgame.io';
  const STORAGE_BRIDGE_SOURCE = 'BlobioExtensionStorageBridge';
  const CUSTOM_SKIN_ENABLED_KEY = 'blobio.customSkin.enabled';
  const CUSTOM_SKIN_ACTIVE_KEY = 'blobio.customSkin.activeUrl';
  const CUSTOM_SKIN_CARRIER_ASSET_KEY = 'blobio.customSkin.carrierAsset';
  const FPS_UNCAP_STORAGE_KEY = 'blobio.settings.fpsUncap';
  const VIRUS_MOTHER_CELL_KEYS = {
    enabled: 'blobio.settings.virusMotherCell.enabled',
    maskId: 'blobio.settings.virusMotherCell.maskId',
    color: 'blobio.settings.virusMotherCell.color',
    alpha: 'blobio.settings.virusMotherCell.alpha',
    rotate: 'blobio.settings.virusMotherCell.rotate',
  };
  /* VIRUS_ASSETS_START */
  const VIRUS_MOTHER_CELL_ASSET_URLS = {
    halo: 'data:image/png;base64,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',
    rotate: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAAVFBMVEVHcEz///////////////////////////////////////////////////////////////////////////////////////////////////////////+DS+nTAAAAHHRSTlMAAgEFCBIcFw4LIi06KDNCVUv+YGypv3iVhuvWWOxHVQAAFVBJREFUeNrsXGl32koMbZqy1BgvscEG/v//fLOPNNIsJDYhfQw9pwXSD/fq6koz1uTXr9d6rdd6rdd6rdd6rdd6rdd6rdd6rdd6rdd6rdd6rddac/1OrP8x9H+dht93r/81+H+JhN9fXP8u+je0/kUOSnDT9c9w8AnsSRZ+Ovq3u9cP5uDr4GMk/ET4b19cP42CEvTv0VXCwc+Bfxf0DA0/g4Ik/Pc718+jIAX//VPrZ1EQhx8F+MetQg6emIEo/CRuunIcPCsFEfh3YU+wEKHgZ8H/c+f6QRSw8L+GPsPBUzHAhj+H/i+7chw8JQU5+GXQUzTwFDwLAxn134k9wkJGBE8b/iz6vV/lHDyTCBj8PPwobrLiHDAUfDcDhfBLsfMsFFLwZPhZ9Pu7FsvBUzFA8DPhT6Lf4JXiICGCb2OgIPwR9B4yerE8JCggIngS/AQ+BY8AQw3Yz1kOCAXfykBU/gn4FiNeux3lISAhpCCaBt+PPw7fI7PA9Usu+++QhDwF38VAIf4IegAdrYAFzMFTMRDBH4fvhQ+hb9Sf7da+ATQADjIUfAcDAX4+/Ah+AB5Gf7s1DMBvPAkJCgIRPI6BNH4cfpzzBL2CX0EG/I84HQAOnoKBEvwk+goTCrx8qVVV+m/1EVYC4ACL4DsZ4PFH4G84+Ba5wX88VvD9bhv4YtggcRQ8kIFy/Db6YeA1Sp4A+zlOCDYPvomBYvxe/D74W7IqkQCHg0gCJALFAyoVloPvZyCL34Z/HxY9iWqHoCv41fFwOFaVeYulAB0RW0GWgW/Az4Ufu32AXdqfJKBpJAH2I0DDzhsC6A2oCB7IQCl+G/5N6PgOpVvHQ10rCZi11T8A0gHb4f47GcAGkMVPox+AF/CPmoBjBTgwQiBlwfVGJA0QAyvaACcAkv6u8m2CmlcF4AV8SUDTto34q0IUVIEjBDUxwsDaEijDHwm/TXmLXL+EACQB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',
    ring: 'data:image/png;base64,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',
  };
    /* VIRUS_ASSETS_END */
  const EARLY_HOTKEY_BRIDGE_KEY = '__blobioEarlyHotkeyBridge';
  const INPUT_KEYBOARD_ISOLATION_KEY = '__blobioExtensionInputKeyboardIsolationInstalled';
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

  function installExtensionInputKeyboardIsolation() {
    if (location.hostname !== CUSTOM_CLIENT_HOST || globalThis[INPUT_KEYBOARD_ISOLATION_KEY]) {
      return;
    }

    const prototype = globalThis.EventTarget?.prototype;
    if (!prototype?.addEventListener || !prototype?.removeEventListener) {
      return;
    }

    const nativeAddEventListener = prototype.addEventListener;
    const nativeRemoveEventListener = prototype.removeEventListener;
    const keyboardEvents = new Set(['keydown', 'keypress', 'keyup']);
    const listenerWrappers = new WeakMap();

    const isGlobalKeyboardTarget = (target) => target === window
      || target === document
      || target === document.body;

    const isExtensionInput = (target) => {
      const input = target?.closest?.('input, textarea, select, [contenteditable="true"]');
      return Boolean(input?.closest?.('.blobio-chat-settings-root'));
    };

    const captureKey = (options) => {
      if (typeof options === 'boolean') {
        return options ? 'capture' : 'bubble';
      }
      return options?.capture ? 'capture' : 'bubble';
    };

    const getListenerMap = (target, type, options, create) => {
      let targetMap = listenerWrappers.get(target);
      if (!targetMap && create) {
        targetMap = new Map();
        listenerWrappers.set(target, targetMap);
      }
      if (!targetMap) {
        return null;
      }

      const key = `${type}:${captureKey(options)}`;
      let listeners = targetMap.get(key);
      if (!listeners && create) {
        listeners = new WeakMap();
        targetMap.set(key, listeners);
      }
      return listeners || null;
    };

    prototype.addEventListener = function blobioInputSafeAddEventListener(type, listener, options) {
      const listenerType = typeof listener;
      if (!keyboardEvents.has(type)
        || (listenerType !== 'function' && listenerType !== 'object')
        || !isGlobalKeyboardTarget(this)) {
        return nativeAddEventListener.call(this, type, listener, options);
      }

      const listeners = getListenerMap(this, type, options, true);
      let wrapped = listeners.get(listener);
      if (!wrapped) {
        wrapped = function blobioInputSafeKeyboardListener(event) {
          if (isExtensionInput(event?.target)) {
            return undefined;
          }

          if (typeof listener === 'function') {
            return listener.call(this, event);
          }
          return listener.handleEvent?.call(listener, event);
        };
        listeners.set(listener, wrapped);
      }

      return nativeAddEventListener.call(this, type, wrapped, options);
    };

    prototype.removeEventListener = function blobioInputSafeRemoveEventListener(type, listener, options) {
      const listenerType = typeof listener;
      const wrapped = keyboardEvents.has(type)
        && (listenerType === 'function' || listenerType === 'object')
        && isGlobalKeyboardTarget(this)
        ? getListenerMap(this, type, options, false)?.get(listener)
        : null;
      return nativeRemoveEventListener.call(this, type, wrapped || listener, options);
    };

    globalThis[INPUT_KEYBOARD_ISOLATION_KEY] = true;
  }

  function installEarlyKeyboardRuntime() {
    if (!globalThis[EARLY_HOTKEY_BRIDGE_KEY]) {
      let handler = null;
      const listener = (event) => {
        try {
          handler?.(event);
        } catch (error) {
          logError('Early keyboard hotkey handler failed.', error);
        }
      };

      window.addEventListener?.('keydown', listener, true);
      globalThis[EARLY_HOTKEY_BRIDGE_KEY] = {
        setHandler(nextHandler) {
          handler = typeof nextHandler === 'function' ? nextHandler : null;
        },
        clearHandler(currentHandler) {
          if (!currentHandler || handler === currentHandler) {
            handler = null;
          }
        },
      };
    }

    if (!globalThis.__blobioExtensionKeyboardShieldInstalled) {
      const blockGameKeybindings = (event) => {
        const target = event.target;
        if (!target?.closest?.('.blobio-chat-settings-root')) {
          return;
        }

        event.stopImmediatePropagation?.();
        event.stopPropagation?.();
      };

      for (const eventName of ['keydown', 'keypress', 'keyup']) {
        document.addEventListener?.(eventName, blockGameKeybindings, false);
      }
      globalThis.__blobioExtensionKeyboardShieldInstalled = true;
    }
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

  /* VIRUS_RUNTIME_START */
  function pageVirusMotherCellBootstrap(initialConfig, pageWindow) {
    'use strict';

    const win = pageWindow || globalThis;
    const doc = win.document;
    const config = normalizeConfig(initialConfig);
    const loaderStatus = win.__blobioVirusMotherCellLoaderStatus || {};
    loaderStatus.bootstrapEntered = true;
    loaderStatus.bootstrapHost = win.location?.hostname || '';
    loaderStatus.bootstrapEnabled = config.enabled;
    win.__blobioVirusMotherCellLoaderStatus = loaderStatus;

    if (!config.enabled || win.location?.hostname !== 'custom.client.blobgame.io') {
      loaderStatus.bootstrapResult = 'skipped';
      return false;
    }

    const INSTALL_KEY = '__blobioVirusMotherCellInstalled';
    if (win[INSTALL_KEY]) {
      return true;
    }
    win[INSTALL_KEY] = true;

    const CACHE_SCRIPT_RE = /\/html\/[a-f0-9]{32}\.cache\.js(?:[?#].*)?$/i;
    const GLOW_MASK_RE = /(?:^|\/)(?:assets\/)?skins\/system\/_glow_mask\.png(?:[?#].*)?$/i;
    const RENDER_LOOP_RE = /var b,c,d,e,f,g,h;for\(e=0;e<\(([$A-Za-z_][$\w]*)\(\),([$A-Za-z_][$\w]*)\)\.d\.a\.length;e\+\+\)\{/;
    const RENDER_CELL_RE = /g=[$A-Za-z_][$\w]*\([$A-Za-z_][$\w]*\.d,e\);if\(!a\.c\|\|!g\|\|!g\.K\|\|!g\.c\)\{continue\}[$A-Za-z_][$\w]*\(g\);/;
    const VIRUS_BRANCH_RE = /case 4:case 3:if\(g\.q\)\{if\(g\.P\)\{h=g\.P;([$A-Za-z_][$\w]*)\(\);([$A-Za-z_][$\w]*)\(a\.c,g\.K\);([$A-Za-z_][$\w]*)\(a\.c,h,g\.R-g\.M,g\.S-g\.M,g\.N,g\.N\)\}\}else\{\1\(\);\2\(a\.c,g\.K\);\3\(a\.c,(a\.[$A-Za-z_][$\w]*),g\.R-g\.M,g\.S-g\.M,g\.N,g\.N\)\}break;/;
    const FALLBACK_RENDER_RE = /function ([$A-Za-z_][$\w]*)\(a,b\)\{var c;if\(b\.q\)\{c=b\.P;([$A-Za-z_][$\w]*)\(\);([$A-Za-z_][$\w]*)\(a\.c,b\.K\);([$A-Za-z_][$\w]*)\(a\.c,c,b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)\}else if\(b\.P\)\{\3\(a\.c,b\.K\);\4\(a\.c,b\.P,b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)\}else\{b\.K\.a=0\.75;\3\(a\.c,b\.K\);\4\(a\.c,([$A-Za-z_][$\w]*),b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)\}\}/;
    const ROTATED_DRAW_RE = /function ([$A-Za-z_][$\w]*)\(a,b,c,d,e,f,g,h,i,j,k\)\{var [^;]+;if\(!a\.j\)throw [^;]+;[$A-Za-z_][$\w]*=a\.C;[$A-Za-z_][$\w]*=b\.v;[^{}]*?=c\+e;[^{}]*?=d\+f;[^{}]*?=-e;[^{}]*?=-f;/;

    const settings = {
      maskId: config.maskId,
      maskUrl: config.maskUrl,
      rotate: config.maskId === 'rotate' && config.rotate,
      color: config.color,
      alpha: config.alpha,
      r: parseInt(config.color.slice(1, 3), 16) / 255,
      g: parseInt(config.color.slice(3, 5), 16) / 255,
      b: parseInt(config.color.slice(5, 7), 16) / 255,
    };
    win.__blobVirusGlowSettings = settings;

    const state = win.__blobVirusGlowState || {
      callbackCalls: 0,
      version: config.version || '',
      glowMaskAssetHits: 0,
      glowMaskTextureUploads: 0,
      customMaskReady: false,
      customMaskErrors: 0,
      rotationDraws: 0,
      rotationStateChecks: 0,
      rotationHighDetailDraws: 0,
      rotationFallbackDraws: 0,
      rotationTextureDraws: 0,
      rotationGlowTextureDraws: 0,
      highDetailGlowDraws: 0,
      fallbackGlowDraws: 0,
      nonRotatedHighDetailDraws: 0,
      nonRotatedFallbackDraws: 0,
      rotateChecks: 0,
      rotateMaskActive: settings.rotate,
      lastRotateMaskId: settings.maskId,
      glowTextureDraws: 0,
      frame: 0,
      viruses: [],
      cellTypes: {},
      fallbackVirusHits: 0,
      highDetailVirusHits: 0,
      skippedVirusTextureDraws: 0,
      textureVirusHits: 0,
      virusTextureDraws: 0,
      patchedChunks: 0,
      seenCacheScripts: 0,
      wrappedCallback: false,
      errors: [],
      lastPatchResult: null,
      lastPatchRotateSelected: false,
      rotatedDrawName: null,
      lastUpdate: 0,
    };
    state.version = config.version || state.version;
    state.cellTypes ||= {};
    state.rotateMaskActive = settings.rotate;
    state.lastRotateMaskId = settings.maskId;
    win.__blobVirusGlowState = state;
    state.patchBundle = patchBundle;
    loaderStatus.bootstrapResult = 'installing';

    let customGlowMaskImage = null;
    let customGlowMaskUrl = '';

    preloadCustomGlowMask();
    installGlowMaskTexturePatch();
    installGlowMaskAssetPatch();
    installRotationHelpers();
    installDebugSnapshot();

    const NodeCtor = win.Node;
    if (!NodeCtor?.prototype) {
      return false;
    }

    const nativeAppendChild = NodeCtor.prototype.appendChild;
    const nativeInsertBefore = NodeCtor.prototype.insertBefore;

    function normalizeConfig(value) {
      const color = typeof value?.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color)
        ? value.color.toLowerCase()
        : '#ff0000';
      const rawAlpha = Number(value?.alpha);
      return {
        enabled: Boolean(value?.enabled),
        maskId: ['halo', 'rotate', 'ring'].includes(value?.maskId) ? value.maskId : 'halo',
        maskUrl: String(value?.maskUrl || ''),
        color,
        alpha: Number.isFinite(rawAlpha) ? Math.max(0, Math.min(1, rawAlpha)) : 0.85,
        rotate: Boolean(value?.rotate),
        version: String(value?.version || ''),
      };
    }

    function preloadCustomGlowMask() {
      getCustomGlowMaskImage();
    }

    function getCustomGlowMaskImage() {
      if (customGlowMaskImage && customGlowMaskUrl === settings.maskUrl) {
        return customGlowMaskImage;
      }

      const ImageCtor = win.Image || win.HTMLImageElement;
      if (typeof ImageCtor !== 'function' || !settings.maskUrl) {
        return null;
      }

      const image = new ImageCtor();
      if (!settings.maskUrl.startsWith('data:') && !settings.maskUrl.startsWith('blob:')) {
        image.crossOrigin = 'anonymous';
      }
      customGlowMaskImage = image;
      customGlowMaskUrl = settings.maskUrl;
      state.customMaskReady = false;
      image.onload = () => {
        state.customMaskReady = true;
      };
      image.onerror = () => {
        state.customMaskErrors = (state.customMaskErrors + 1) || 1;
      };
      image.src = settings.maskUrl;

      if (image.complete || image.naturalWidth > 0 || image.width > 0) {
        state.customMaskReady = true;
      }
      return image;
    }

    function installGlowMaskTexturePatch() {
      patchWebGLTextureUpload(win.WebGLRenderingContext);
      patchWebGLTextureUpload(win.WebGL2RenderingContext);
    }

    function patchWebGLTextureUpload(ContextCtor) {
      if (!ContextCtor?.prototype || ContextCtor.prototype.__blobVirusGlowTexImagePatched) {
        return;
      }
      const nativeTexImage2D = ContextCtor.prototype.texImage2D;
      if (typeof nativeTexImage2D !== 'function') {
        return;
      }

      ContextCtor.prototype.texImage2D = function patchedTexImage2D(...args) {
        const sourceIndex = findTextureSourceIndex(args);
        if (sourceIndex !== -1 && isGlowMaskSource(args[sourceIndex])) {
          const replacement = getCustomGlowMaskImage();
          if (replacement) {
            state.glowMaskTextureUploads = (state.glowMaskTextureUploads + 1) || 1;
            state.lastGlowMaskUploadSource = getTextureSourceUrl(args[sourceIndex]);
            args[sourceIndex] = replacement;
          }
        }
        return nativeTexImage2D.apply(this, args);
      };
      ContextCtor.prototype.__blobVirusGlowTexImagePatched = true;
    }

    function findTextureSourceIndex(args) {
      for (let index = args.length - 1; index >= 0; index -= 1) {
        if (isTextureSource(args[index])) {
          return index;
        }
      }
      return -1;
    }

    function isTextureSource(value) {
      return Boolean(value && typeof value === 'object'
        && ('src' in value || 'currentSrc' in value || 'tagName' in value || 'naturalWidth' in value));
    }

    function isGlowMaskSource(source) {
      return GLOW_MASK_RE.test(getTextureSourceUrl(source));
    }

    function getTextureSourceUrl(source) {
      if (!source) {
        return '';
      }
      return String(source.currentSrc || source.src || source.getAttribute?.('src') || '');
    }

    function installGlowMaskAssetPatch() {
      const ImageCtor = win.HTMLImageElement;
      if (!ImageCtor?.prototype) {
        return;
      }

      const imageProto = ImageCtor.prototype;
      const srcDescriptor = findPropertyDescriptor(imageProto, 'src');
      if (srcDescriptor?.set && !imageProto.__blobVirusGlowSrcPatched) {
        Object.defineProperty(imageProto, 'src', {
          get: srcDescriptor.get,
          set(value) {
            const nextValue = rewriteGlowMaskUrl(value);
            if (nextValue !== value && !nextValue.startsWith('data:') && !nextValue.startsWith('blob:')) {
              this.crossOrigin = 'anonymous';
            }
            return srcDescriptor.set.call(this, nextValue);
          },
          configurable: true,
          enumerable: srcDescriptor.enumerable,
        });
        imageProto.__blobVirusGlowSrcPatched = true;
      }

      const ElementCtor = win.Element;
      if (!ElementCtor?.prototype || ElementCtor.prototype.__blobVirusGlowSetAttributePatched) {
        return;
      }
      const nativeSetAttribute = ElementCtor.prototype.setAttribute;
      ElementCtor.prototype.setAttribute = function patchedSetAttribute(name, value) {
        const isImage = this instanceof ImageCtor || String(this.tagName).toUpperCase() === 'IMG';
        if (String(name).toLowerCase() === 'src' && isImage) {
          const nextValue = rewriteGlowMaskUrl(value);
          if (nextValue !== value && !nextValue.startsWith('data:') && !nextValue.startsWith('blob:')) {
            this.crossOrigin = 'anonymous';
          }
          return nativeSetAttribute.call(this, name, nextValue);
        }
        return nativeSetAttribute.call(this, name, value);
      };
      ElementCtor.prototype.__blobVirusGlowSetAttributePatched = true;
    }

    function rewriteGlowMaskUrl(value) {
      if (typeof value !== 'string' || !GLOW_MASK_RE.test(value)) {
        return value;
      }
      state.glowMaskAssetHits = (state.glowMaskAssetHits + 1) || 1;
      return settings.maskUrl;
    }

    function findPropertyDescriptor(proto, property) {
      let current = proto;
      while (current) {
        const descriptor = Object.getOwnPropertyDescriptor(current, property);
        if (descriptor) {
          return descriptor;
        }
        current = Object.getPrototypeOf(current);
      }
      return null;
    }

    function installRotationHelpers() {
      const rotations = new Map();
      win.__blobVirusGlowShouldRotate = function shouldRotate() {
        state.rotateChecks = (state.rotateChecks + 1) || 1;
        return settings.rotate;
      };
      win.__blobVirusGlowGetRotation = function getRotation(id, x, y) {
        const hasId = id !== null && id !== undefined && id !== '';
        const key = hasId ? String(id) : `${Math.round(Number(x) || 0)}:${Math.round(Number(y) || 0)}`;
        if (rotations.has(key)) {
          return rotations.get(key);
        }
        let hash = 2166136261;
        for (let index = 0; index < key.length; index += 1) {
          hash ^= key.charCodeAt(index);
          hash = Math.imul(hash, 16777619);
        }
        const rotation = Math.abs(hash % 360);
        rotations.set(key, rotation);
        return rotation;
      };
      win.__blobVirusGlowGetDrawRotation = function getDrawRotation(id, x, y, sourceName) {
        const source = sourceName === 'fallback' ? 'fallback' : 'high-detail';
        state.rotationStateChecks = (state.rotationStateChecks + 1) || 1;
        if (!settings.rotate) {
          state.lastRotationSkippedSource = source;
          return 0;
        }
        const rotation = win.__blobVirusGlowGetRotation(id, x, y);
        state.rotationDraws = (state.rotationDraws + 1) || 1;
        if (source === 'fallback') {
          state.rotationFallbackDraws = (state.rotationFallbackDraws + 1) || 1;
        } else {
          state.rotationHighDetailDraws = (state.rotationHighDetailDraws + 1) || 1;
        }
        state.lastRotation = rotation;
        state.lastRotationSource = source;
        state.lastRotationMaskId = settings.maskId;
        return rotation;
      };
    }

    function installDebugSnapshot() {
      win.__blobVirusGlowDebug = function debugSnapshot() {
        return {
          version: state.version,
          enabled: true,
          maskId: settings.maskId,
          shouldRotate: settings.rotate,
          loaderStatus: { ...loaderStatus },
          callbackCalls: state.callbackCalls,
          patchedChunks: state.patchedChunks,
          seenCacheScripts: state.seenCacheScripts,
          wrappedCallback: state.wrappedCallback,
          lastPatchResult: state.lastPatchResult,
          lastPatchRotateSelected: state.lastPatchRotateSelected,
          rotatedDrawName: state.rotatedDrawName,
          customMaskReady: state.customMaskReady,
          customMaskErrors: state.customMaskErrors,
          glowMaskAssetHits: state.glowMaskAssetHits,
          glowMaskTextureUploads: state.glowMaskTextureUploads,
          highDetailVirusHits: state.highDetailVirusHits,
          highDetailGlowDraws: state.highDetailGlowDraws,
          rotationHighDetailDraws: state.rotationHighDetailDraws,
          fallbackVirusHits: state.fallbackVirusHits,
          fallbackGlowDraws: state.fallbackGlowDraws,
          rotationFallbackDraws: state.rotationFallbackDraws,
          textureVirusHits: state.textureVirusHits,
          glowTextureDraws: state.glowTextureDraws,
          rotationGlowTextureDraws: state.rotationGlowTextureDraws,
          rotationDraws: state.rotationDraws,
          rotationStateChecks: state.rotationStateChecks,
          rotateChecks: state.rotateChecks,
          rotateMaskActive: state.rotateMaskActive,
          lastGlowDrawSource: state.lastGlowDrawSource,
          lastRotationSource: state.lastRotationSource,
          lastRotationSkippedSource: state.lastRotationSkippedSource,
          lastRotation: state.lastRotation,
          lastHighDetailCell: state.lastHighDetailCell,
          lastFallbackCell: state.lastFallbackCell,
          lastGlowTextureCell: state.lastGlowTextureCell,
          errors: [...state.errors],
        };
      };
    }

    function patchBundle(source) {
      let code = source;
      const branchMatch = code.match(VIRUS_BRANCH_RE);
      const drawRegionName = branchMatch ? branchMatch[3] : null;
      const rotatedDrawName = rememberRotatedDrawFunction(code) || state.rotatedDrawName;
      const glowTexture = findGlowTextureFromAsset(code) || 'a.n';
      const virusTexture = branchMatch ? branchMatch[4] : 'a.A';
      let renderLoopPatched = false;
      let renderCellPatched = false;
      let virusBranchPatched = false;
      let fallbackRenderPatched = false;
      let textureDrawPatched = false;

      if (RENDER_LOOP_RE.test(code)) {
        code = code.replace(RENDER_LOOP_RE, (match) => match.replace(
          ';for(',
          `;if($wnd.__blobVirusGlowState){$wnd.__blobVirusGlowState.frame=($wnd.__blobVirusGlowState.frame+1)||1;$wnd.__blobVirusGlowState.viruses.length=0;$wnd.__blobVirusGlowState.currentCell=null;$wnd.__blobVirusGlowState.virusTexture=${virusTexture};$wnd.__blobVirusGlowState.glowTexture=${glowTexture};}for(`,
        ));
        renderLoopPatched = true;
      }

      if (RENDER_CELL_RE.test(code)) {
        code = code.replace(RENDER_CELL_RE, (match) => match
          + 'h=$wnd.__blobVirusGlowState;'
          + 'if(h){h.currentCell=g;h.cellTypes||(h.cellTypes={});h.cellTypes[g.c.M]=(h.cellTypes[g.c.M]+1)||1}');
        renderCellPatched = true;
      }

      if (VIRUS_BRANCH_RE.test(code)) {
        code = code.replace(VIRUS_BRANCH_RE, (match, initDrawState, setColor, drawRegion, branchVirusTexture, offset, fullCode) => {
          const branchGlowTexture = findGlowTextureFromAsset(fullCode) || findGlowTexture(fullCode, offset + match.length, drawRegion);
          const drawGlow = buildGlowDrawCall(rotatedDrawName, drawRegion, 'g', 'a.c', branchGlowTexture, 'high-detail');
          return 'case 4:case 3:'
            + 'h=$wnd.__blobVirusGlowState;'
            + 'if(h){h.viruses.push({id:g.n,x:g.R,y:g.S,r:g.M,size:g.N,mode:1,type:g.c.M});h.highDetailVirusHits=(h.highDetailVirusHits+1)||1;h.lastUpdate=(new Date).getTime()}'
            + 'h=$wnd.__blobVirusGlowSettings;f=g.K.d;d=g.K.c;b=g.K.b;c=g.K.a;'
            + 'g.K.d=h&&h.r!=null?h.r:1;g.K.c=h&&h.g!=null?h.g:0;g.K.b=h&&h.b!=null?h.b:0;g.K.a=h&&h.alpha!=null?h.alpha:0.85;'
            + `${initDrawState}();${setColor}(a.c,g.K);${drawGlow};`
            + 'g.K.d=f;g.K.c=d;g.K.b=b;g.K.a=c;break;';
        });
        virusBranchPatched = true;
      }

      if (FALLBACK_RENDER_RE.test(code)) {
        code = code.replace(FALLBACK_RENDER_RE, (match, fallbackName, initDrawState, setColor, drawRegion, defaultTexture, offset, fullCode) => {
          const fallbackGlowTexture = findGlowTextureFromAsset(fullCode) || 'a.n';
          const drawGlow = buildGlowDrawCall(rotatedDrawName, drawRegion, 'b', 'a.c', fallbackGlowTexture, 'fallback');
          return `function ${fallbackName}(a,b){var c,d,e,f,g;if(b.c&&(b.c.M==4||b.c.M==3)){`
            + 'c=$wnd.__blobVirusGlowState;'
            + 'if(c){c.viruses.push({id:b.n,x:b.R,y:b.S,r:b.M,size:b.N,mode:0,type:b.c.M});c.fallbackVirusHits=(c.fallbackVirusHits+1)||1;c.lastUpdate=(new Date).getTime()}'
            + 'c=$wnd.__blobVirusGlowSettings;d=b.K.d;e=b.K.c;f=b.K.b;g=b.K.a;'
            + 'b.K.d=c&&c.r!=null?c.r:1;b.K.c=c&&c.g!=null?c.g:0;b.K.b=c&&c.b!=null?c.b:0;b.K.a=c&&c.alpha!=null?c.alpha:0.85;'
            + `${initDrawState}();${setColor}(a.c,b.K);${drawGlow};`
            + 'b.K.d=d;b.K.c=e;b.K.b=f;b.K.a=g;return}'
            + `if(b.q){c=b.P;${initDrawState}();${setColor}(a.c,b.K);${drawRegion}(a.c,c,b.R-b.M,b.S-b.M,b.N,b.N)}`
            + `else if(b.P){${setColor}(a.c,b.K);${drawRegion}(a.c,b.P,b.R-b.M,b.S-b.M,b.N,b.N)}`
            + `else{b.K.a=0.75;${setColor}(a.c,b.K);${drawRegion}(a.c,${defaultTexture},b.R-b.M,b.S-b.M,b.N,b.N)}}`;
        });
        fallbackRenderPatched = true;
      }

      if (drawRegionName) {
        const patchedDrawRegion = patchDrawRegionFunction(code, drawRegionName, rotatedDrawName);
        code = patchedDrawRegion.code;
        textureDrawPatched = patchedDrawRegion.changed;
      }

      const result = {
        code,
        changed: renderLoopPatched || renderCellPatched || virusBranchPatched || fallbackRenderPatched || textureDrawPatched,
        renderLoopPatched,
        renderCellPatched,
        virusBranchPatched,
        fallbackRenderPatched,
        textureDrawPatched,
        rotatedDrawPatched: Boolean(rotatedDrawName),
      };
      state.lastPatchResult = { ...result, code: undefined };
      return result;
    }

    function buildGlowDrawCall(rotatedDrawName, drawRegion, cellName, batchName, textureName, sourceName) {
      const normalDraw = `${drawRegion}(${batchName},${textureName},${cellName}.R-${cellName}.M*2,${cellName}.S-${cellName}.M*2,${cellName}.N*2,${cellName}.N*2)`;
      const isFallback = sourceName === 'fallback';
      const drawCounter = isFallback ? 'fallbackGlowDraws' : 'highDetailGlowDraws';
      const nonRotatedCounter = isFallback ? 'nonRotatedFallbackDraws' : 'nonRotatedHighDetailDraws';
      const lastCell = isFallback ? 'lastFallbackCell' : 'lastHighDetailCell';
      const markDraw = `if($wnd.__blobVirusGlowState){$wnd.__blobVirusGlowState.${drawCounter}=($wnd.__blobVirusGlowState.${drawCounter}+1)||1;$wnd.__blobVirusGlowState.lastGlowDrawSource='${sourceName}';$wnd.__blobVirusGlowState.${lastCell}={id:${cellName}.n,x:${cellName}.R,y:${cellName}.S,r:${cellName}.M,size:${cellName}.N,type:${cellName}.c?${cellName}.c.M:null,hasName:!!${cellName}.B,u:!!${cellName}.u,rflag:!!${cellName}.r,t:!!${cellName}.t,q:!!${cellName}.q}}`;
      if (!rotatedDrawName) {
        return `${markDraw}if($wnd.__blobVirusGlowState){$wnd.__blobVirusGlowState.${nonRotatedCounter}=($wnd.__blobVirusGlowState.${nonRotatedCounter}+1)||1}${normalDraw}`;
      }
      return `${markDraw}${rotatedDrawName}(${batchName},${textureName},${cellName}.R-${cellName}.M*2,${cellName}.S-${cellName}.M*2,${cellName}.N,${cellName}.N,${cellName}.N*2,${cellName}.N*2,1,1,$wnd.__blobVirusGlowGetDrawRotation?$wnd.__blobVirusGlowGetDrawRotation(${cellName}.n,${cellName}.R,${cellName}.S,'${sourceName}'):0)`;
    }

    function patchDrawRegionFunction(code, drawRegionName, rotatedDrawName) {
      const escapedName = escapeRegExp(drawRegionName);
      const drawFunction = new RegExp(`function ${escapedName}\\(a,b,c,d,e,f\\)\\{var g,h,i,j,k,l,m,n,o,p;`);
      if (!drawFunction.test(code)) {
        return { code, changed: false };
      }

      return {
        code: code.replace(drawFunction, (match) => match
          + 'g=$wnd.__blobVirusGlowState;'
          + (rotatedDrawName
            ? `if(g&&g.glowTexture&&b&&(b===g.glowTexture||b.v===g.glowTexture.v&&b.w===g.glowTexture.w&&b.C===g.glowTexture.C&&b.A===g.glowTexture.A&&b.B===g.glowTexture.B)){h=g.currentCell;g.glowTextureDraws=(g.glowTextureDraws+1)||1;if(h&&h.c&&(h.c.M==4||h.c.M==3||h.c.M==10)&&!h.B&&!h.u&&!h.r&&$wnd.__blobVirusGlowShouldRotate&&$wnd.__blobVirusGlowShouldRotate()){i=$wnd.__blobVirusGlowGetRotation(h.n,h.R,h.S);g.rotationDraws=(g.rotationDraws+1)||1;g.rotationGlowTextureDraws=(g.rotationGlowTextureDraws+1)||1;g.lastRotation=i;${rotatedDrawName}(a,b,c,d,e/2,f/2,e,f,1,1,i);return}}`
            : '')
          + 'if(g&&g.virusTexture&&(b===g.virusTexture||b.v===g.virusTexture.v&&b.w===g.virusTexture.w&&b.C===g.virusTexture.C&&b.A===g.virusTexture.A&&b.B===g.virusTexture.B)){'
          + 'h=g.currentCell;g.virusTextureDraws=(g.virusTextureDraws+1)||1;'
          + 'if(h&&g.glowTexture&&h.c&&(h.c.M==4||h.c.M==3)&&!h.B&&!h.u&&!h.r){'
          + 'g.viruses.push({id:h.n,x:h.R,y:h.S,r:h.M,size:h.N,mode:2,type:h.c.M});g.textureVirusHits=(g.textureVirusHits+1)||1;g.lastUpdate=(new Date).getTime();'
          + (rotatedDrawName
            ? `if($wnd.__blobVirusGlowShouldRotate&&$wnd.__blobVirusGlowShouldRotate()){i=$wnd.__blobVirusGlowGetRotation(h.n,h.R,h.S);g.rotationDraws=(g.rotationDraws+1)||1;g.rotationTextureDraws=(g.rotationTextureDraws+1)||1;g.lastRotation=i;${rotatedDrawName}(a,g.glowTexture,c-e/2,d-f/2,e,f,e*2,f*2,1,1,i);return}`
            : '')
          + 'b=g.glowTexture;c-=e/2;d-=f/2;e*=2;f*=2}else{g.skippedVirusTextureDraws=(g.skippedVirusTextureDraws+1)||1}}}'),
        changed: true,
      };
    }

    function findGlowTextureFromAsset(code) {
      const match = code.match(/[$A-Za-z_][$\w]*\.([$A-Za-z_][$\w]*)=[$A-Za-z_][$\w]*\([^;]*'_glow_mask'\)/);
      return match ? `a.${match[1]}` : null;
    }

    function findGlowTexture(code, startIndex, drawRegion) {
      const nextCase = code.slice(startIndex, startIndex + 700);
      const escapedDrawRegion = escapeRegExp(drawRegion);
      const glowCall = new RegExp(`${escapedDrawRegion}\\(a\\.c,(a\\.[$A-Za-z_][$\\w]*),g\\.R-g\\.M\\*2,g\\.S-g\\.M\\*2,g\\.N\\*2,g\\.N\\*2\\)`);
      return nextCase.match(glowCall)?.[1] || 'a.n';
    }

    function findRotatedDrawFunction(code) {
      return code.match(ROTATED_DRAW_RE)?.[1] || null;
    }

    function rememberRotatedDrawFunction(source) {
      if (typeof source !== 'string') {
        return null;
      }
      const name = findRotatedDrawFunction(source);
      if (name) {
        state.rotatedDrawName = name;
      }
      return name;
    }

    function escapeRegExp(value) {
      return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function shouldPatchScript(node) {
      return Boolean(node
        && node.tagName === 'SCRIPT'
        && node.src
        && !node.dataset.blobVirusGlowPatched
        && CACHE_SCRIPT_RE.test(node.src));
    }

    function rememberError(error) {
      const message = error?.message || String(error);
      state.errors.push(message);
      state.errors = state.errors.slice(-5);
      win.console?.warn?.('[Blobio Virus | Mother-cell]', message);
    }

    function patchDownloadedChunk(chunk) {
      if (typeof chunk !== 'string') {
        return chunk;
      }
      const patched = patchBundle(chunk);
      if (patched.changed) {
        state.patchedChunks += 1;
        return patched.code;
      }
      return chunk;
    }

    function patchDownloadedChunks(chunks) {
      if (Array.isArray(chunks)) {
        chunks.forEach(rememberRotatedDrawFunction);
        return chunks.map(patchDownloadedChunk);
      }
      return patchDownloadedChunk(chunks);
    }

    function installGwtCallbackPatch() {
      const html = win.html;
      if (!html || html.__blobVirusGlowWrapped || typeof html.onScriptDownloaded !== 'function') {
        return false;
      }
      const originalOnScriptDownloaded = html.onScriptDownloaded;
      html.onScriptDownloaded = function blobVirusGlowOnScriptDownloaded(chunks) {
        state.callbackCalls += 1;
        let patchedChunks = chunks;
        try {
          patchedChunks = patchDownloadedChunks(chunks);
        } catch (error) {
          rememberError(error);
        }
        return originalOnScriptDownloaded.call(this, patchedChunks);
      };
      html.__blobVirusGlowWrapped = true;
      state.wrappedCallback = true;
      return true;
    }

    NodeCtor.prototype.appendChild = function patchedAppendChild(node) {
      if (shouldPatchScript(node)) {
        state.seenCacheScripts += 1;
        installGwtCallbackPatch();
      }
      return nativeAppendChild.call(this, node);
    };

    NodeCtor.prototype.insertBefore = function patchedInsertBefore(node, beforeNode) {
      if (shouldPatchScript(node)) {
        state.seenCacheScripts += 1;
        installGwtCallbackPatch();
      }
      return nativeInsertBefore.call(this, node, beforeNode);
    };

    const callbackPatchTimer = win.setInterval(() => {
      if (installGwtCallbackPatch()) {
        win.clearInterval(callbackPatchTimer);
      }
    }, 10);
    win.setTimeout(() => win.clearInterval(callbackPatchTimer), 30000);
    loaderStatus.bootstrapResult = 'installed';
    loaderStatus.installed = true;
    return true;
  }
  /* VIRUS_RUNTIME_END */

  function getVirusResourceUrl(maskId) {
    const normalizedMaskId = Object.hasOwn(VIRUS_MOTHER_CELL_ASSET_URLS, maskId) ? maskId : 'halo';
    return VIRUS_MOTHER_CELL_ASSET_URLS[normalizedMaskId] || '';
  }

  function installVirusMotherCellRuntime() {
    if (location.hostname !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const pageWindow = typeof unsafeWindow === 'object' && unsafeWindow ? unsafeWindow : globalThis;
    const status = {
      version: VERSION,
      host: location.hostname,
      attempted: false,
      installed: false,
      enabled: false,
      enabledValue: null,
      maskId: null,
      reason: 'not-started',
      error: '',
    };
    pageWindow.__blobioVirusMotherCellLoaderStatus = status;

    const installDebugFallback = () => {
      if (typeof pageWindow.__blobVirusGlowDebug === 'function') {
        return;
      }
      pageWindow.__blobVirusGlowDebug = () => ({
        ...status,
        runtimeState: pageWindow.__blobVirusGlowState || null,
        runtimeSettings: pageWindow.__blobVirusGlowSettings || null,
      });
    };
    installDebugFallback();

    try {
      const enabledValue = getSharedValue(VIRUS_MOTHER_CELL_KEYS.enabled);
      status.enabledValue = enabledValue;
      status.enabled = enabledValue === '1' || String(enabledValue).toLowerCase() === 'true';
      if (!status.enabled) {
        status.reason = 'disabled';
        return;
      }

      const rawMaskId = String(getSharedValue(VIRUS_MOTHER_CELL_KEYS.maskId) || 'halo').toLowerCase();
      const maskId = ['halo', 'rotate', 'ring'].includes(rawMaskId) ? rawMaskId : 'halo';
      const rawColor = String(getSharedValue(VIRUS_MOTHER_CELL_KEYS.color) || '#ff0000').toLowerCase();
      const color = /^#[0-9a-f]{6}$/.test(rawColor) ? rawColor : '#ff0000';
      const rawAlpha = Number(getSharedValue(VIRUS_MOTHER_CELL_KEYS.alpha));
      const alpha = Number.isFinite(rawAlpha) ? Math.max(0, Math.min(1, rawAlpha)) : 0.85;
      const maskUrl = getVirusResourceUrl(maskId);

      status.attempted = true;
      status.maskId = maskId;
      if (!maskUrl) {
        status.reason = 'mask-asset-missing';
        return;
      }

      status.installed = Boolean(pageVirusMotherCellBootstrap({
        enabled: true,
        maskId,
        maskUrl,
        color,
        alpha,
        rotate: getSharedValue(VIRUS_MOTHER_CELL_KEYS.rotate) === '1',
        version: VERSION,
      }, pageWindow));
      status.reason = status.installed ? 'installed' : 'bootstrap-returned-false';
    } catch (error) {
      status.reason = 'install-error';
      status.error = error?.message || String(error);
      logError('Failed to install Virus | Mother-cell runtime.', error);
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

  installExtensionInputKeyboardIsolation();
  installEarlyKeyboardRuntime();
  installSharedStorageBridge();
  installVirusMotherCellRuntime();
  installFpsUncapRuntime();
  installCarrierSkinRuntime();
  fetchBundle();
})();
