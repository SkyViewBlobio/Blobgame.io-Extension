// ==UserScript==
// @name         Blobio Web Script Loader
// @namespace    https://github.com/SkyViewBlobio/Blobgame.io-Web-Script
// @version      0.1.24
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
  const CUSTOM_SKIN_BASE_KEY = 'blobio.customSkin.baseSkin';
  const STORAGE_BRIDGE_SOURCE = 'BlobioExtensionStorageBridge';
  const CUSTOM_SKIN_TYPE = 'free';
  const CUSTOM_SKIN_TYPES = ['free', 'premium'];
  const CUSTOM_SKIN_NAME = 'BlobioCustomSkin';
  const DIRECT_IMGUR_IMAGE_MATCH = /^https:\/\/i\.imgur\.com\/[a-z0-9]+\.(?:png|jpe?g|gif|webp)(?:\?.*)?$/i;
  const CUSTOM_CLIENT_HOST = 'custom.client.blobgame.io';
  const BUNDLE_URLS = [
    'https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Web-Script/main/dist/blobio-extension.bundle.js?v=0.1.24',
    'https://cdn.jsdelivr.net/gh/SkyViewBlobio/Blobgame.io-Web-Script@main/dist/blobio-extension.bundle.js?v=0.1.24',
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
      syncCustomClientSkinConfig();
      publishCustomSkinBridgeState();
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

  function removeSharedValue(key) {
    try {
      if (typeof GM_deleteValue === 'function') {
        GM_deleteValue(key);
      }
    } catch {
      // Keep local fallback even if GM storage fails.
    }

    removeLocalValue(key);
  }

  function isCustomSkinSharedKey(key) {
    return String(key || '').startsWith('blobio.customSkin.');
  }

  function installSharedStorageBridge() {
    if (globalThis.__blobioSharedStorageBridgeInstalled) {
      return;
    }

    globalThis.__blobioSharedStorageBridge = {
      getItem(key) {
        return isCustomSkinSharedKey(key) ? getSharedValue(key) : getLocalValue(key);
      },
      setItem(key, value) {
        if (isCustomSkinSharedKey(key)) {
          setSharedValue(key, value);
        } else {
          setLocalValue(key, value);
        }
      },
      removeItem(key) {
        if (isCustomSkinSharedKey(key)) {
          removeSharedValue(key);
        } else {
          removeLocalValue(key);
        }
      },
      snapshotCustomSkin() {
        const activeUrl = getSharedValue(CUSTOM_SKIN_ACTIVE_KEY) || '';
        return {
          enabled: getSharedValue(CUSTOM_SKIN_ENABLED_KEY) === '1' && isValidImgurSkinUrl(activeUrl),
          activeUrl: isValidImgurSkinUrl(activeUrl) ? activeUrl : '',
          debug: getSharedValue('blobio.customSkin.debug') === '1',
        };
      },
    };

    try {
      window.addEventListener('message', (event) => {
        const message = event.data;
        if (!message || message.source !== STORAGE_BRIDGE_SOURCE || !isCustomSkinSharedKey(message.key)) {
          return;
        }

        if (message.type === 'set') {
          setSharedValue(message.key, message.value ?? '');
        } else if (message.type === 'remove') {
          removeSharedValue(message.key);
        }

        if (location.host === CUSTOM_CLIENT_HOST) {
          syncCustomClientSkinConfig();
        }
      });
      globalThis.__blobioSharedStorageBridgeInstalled = true;
    } catch {
      // A missing bridge only disables cross-origin syncing. local page storage still works.
    }
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

  function getCustomSkinBaseSkin() {
    try {
      const raw = getSharedValue(CUSTOM_SKIN_BASE_KEY) || '';
      const parsed = raw ? JSON.parse(raw) : null;
      if (
        parsed &&
        typeof parsed.name === 'string' &&
        /^[a-z0-9_.-]+$/i.test(parsed.name) &&
        typeof parsed.type === 'string' &&
        CUSTOM_SKIN_TYPES.includes(parsed.type)
      ) {
        setLocalValue(CUSTOM_SKIN_BASE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    } catch {
      // Bad stored data disables the custom skin bootstrap.
    }

    return null;
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

  function getCustomSkinBootstrapState() {
    const state = getCustomSkinState();
    if (!state) {
      return null;
    }

    return {
      enabled: true,
      activeUrl: state.activeUrl,
      localName: state.localName,
      debug: getSharedValue('blobio.customSkin.debug') === '1',
    };
  }

  function getPageCustomSkinBootstrapSource(state) {
    return `(() => {
  'use strict';

  const LOG_PREFIX = '[Blobio]';
  const STATE = ${JSON.stringify(state)};
  const CUSTOM_SKIN_ENABLED_KEY = ${JSON.stringify(CUSTOM_SKIN_ENABLED_KEY)};
  const CUSTOM_SKIN_ACTIVE_KEY = ${JSON.stringify(CUSTOM_SKIN_ACTIVE_KEY)};
  const CUSTOM_SKIN_LOCAL_NAME_KEY = ${JSON.stringify(CUSTOM_SKIN_LOCAL_NAME_KEY)};
  const CUSTOM_SKIN_BASE_KEY = ${JSON.stringify(CUSTOM_SKIN_BASE_KEY)};
  const CUSTOM_SKIN_TYPE = ${JSON.stringify(CUSTOM_SKIN_TYPE)};
  const CUSTOM_SKIN_TYPES = ${JSON.stringify(CUSTOM_SKIN_TYPES)};
  const DIRECT_IMGUR_IMAGE_MATCH = /^https:\\/\\/i\\.imgur\\.com\\/[a-z0-9]+\\.(?:png|jpe?g|gif|webp)(?:\\?.*)?$/i;
  const GWT_PATCH_MARKER = '__blobioCustomSkinGwtPatch';
  const DEBUG_EVENT_LIMIT = 250;

  if (window.__blobioCustomSkinPageBootstrapInstalled) {
    return;
  }

  window.__blobioCustomSkinPageBootstrapInstalled = true;

  function getDebugEnabled() {
    return STATE.debug || getLocalValue('blobio.customSkin.debug') === '1';
  }

  function sanitizeForDebug(value, depth = 0) {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string' || value instanceof String) {
      return redactSensitive(value);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (depth >= 2) {
      return '[truncated]';
    }

    if (Array.isArray(value)) {
      return value.slice(0, 12).map((item) => sanitizeForDebug(item, depth + 1));
    }

    if (typeof value === 'object') {
      const result = {};
      for (const key of Object.keys(value).slice(0, 24)) {
        result[key] = /token|authorization|cookie/i.test(key)
          ? '<redacted>'
          : sanitizeForDebug(value[key], depth + 1);
      }
      return result;
    }

    return redactSensitive(value);
  }

  function recordDebug(stage, message, detail) {
    const events = window.__blobioCustomSkinDebugEvents || [];
    window.__blobioCustomSkinDebugEvents = events;

    const event = {
      time: new Date().toISOString(),
      stage,
      message,
      detail: sanitizeForDebug(detail),
    };
    events.push(event);
    while (events.length > DEBUG_EVENT_LIMIT) {
      events.shift();
    }

    if (getDebugEnabled()) {
      console.debug(LOG_PREFIX, message, event.detail ?? '');
    }

    return event;
  }

  window.__blobioCustomSkinDebugDump = function customSkinDebugDump() {
    return (window.__blobioCustomSkinDebugEvents || []).slice();
  };

  function debug(message, detail, stage = 'debug') {
    if (!STATE.debug && getLocalValue('blobio.customSkin.debug') !== '1') {
      recordDebug(stage, message, detail);
      return;
    }

    recordDebug(stage, message, detail);
  }

  function logError(message, detail) {
    const event = recordDebug('error', message, detail);
    console.error(LOG_PREFIX, message, event.detail || '');
  }

  function redactSensitive(value) {
    return String(value || '')
      .replace(/([?&]token=)[^&]+/gi, '$1<redacted>')
      .replace(/"token"\\s*:\\s*"[^"]+"/gi, '"token":"<redacted>"')
      .replace(/\\beyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\b/g, '<redacted-jwt>');
  }

  recordDebug('bootstrap', 'Custom skin page bootstrap installed.', {
    activeUrl: STATE.activeUrl,
    localName: STATE.localName,
    debug: STATE.debug,
  });

  function installNetworkDebugHooks() {
    const xhrPrototype = window.XMLHttpRequest?.prototype;
    if (xhrPrototype && !window.__blobioCustomSkinXhrDebugInstalled) {
      const originalOpen = xhrPrototype.open;
      if (typeof originalOpen === 'function') {
        xhrPrototype.open = function openBlobioDebugRequest(method, url, ...rest) {
          debug('XHR open', { method, url: redactSensitive(url) }, 'network');
          return originalOpen.call(this, method, url, ...rest);
        };
        window.__blobioCustomSkinXhrDebugInstalled = true;
      }
    }

    if (typeof window.fetch === 'function' && !window.__blobioCustomSkinFetchDebugInstalled) {
      const originalFetch = window.fetch;
      window.fetch = function fetchBlobioDebug(input, init) {
        const url = typeof input === 'string' || input instanceof String ? String(input) : input?.url;
        debug('fetch', { url: redactSensitive(url || '') }, 'network');
        return originalFetch.call(this, input, init);
      };
      window.__blobioCustomSkinFetchDebugInstalled = true;
    }

    if (typeof window.WebSocket === 'function' && !window.__blobioCustomSkinWebSocketDebugInstalled) {
      const NativeWebSocket = window.WebSocket;
      const WrappedWebSocket = function BlobioDebugWebSocket(url, protocols) {
        debug('WebSocket open', { url: redactSensitive(url), protocols }, 'network');
        const socket = new NativeWebSocket(url, protocols);
        const nativeSend = socket.send;

        if (typeof nativeSend === 'function') {
          socket.send = function sendBlobioDebugPacket(data) {
            const length = typeof data === 'string' ? data.length : data?.byteLength ?? data?.size ?? 0;
            debug('WebSocket send', { length }, 'network');
            return nativeSend.call(this, data);
          };
        }

        socket.addEventListener?.('message', (event) => {
          const data = event?.data;
          const length = typeof data === 'string' ? data.length : data?.byteLength ?? data?.size ?? 0;
          debug('WebSocket message', { length }, 'network');
        });

        return socket;
      };
      WrappedWebSocket.prototype = NativeWebSocket.prototype;
      window.WebSocket = WrappedWebSocket;
      window.__blobioCustomSkinWebSocketDebugInstalled = true;
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
      // Some browser modes can block localStorage.
    }
  }

  function getState() {
    const enabled = getLocalValue(CUSTOM_SKIN_ENABLED_KEY);
    const activeUrl = getLocalValue(CUSTOM_SKIN_ACTIVE_KEY) || STATE.activeUrl || '';
    const localName = getLocalValue(CUSTOM_SKIN_LOCAL_NAME_KEY) || STATE.localName || '';

    if (enabled !== null && enabled !== '1') {
      return null;
    }

    if (
      !STATE.enabled ||
      !DIRECT_IMGUR_IMAGE_MATCH.test(activeUrl) ||
      !/^BlobioCustomSkin_[a-z0-9]{8,}$/i.test(localName)
    ) {
      return null;
    }

    return { activeUrl, localName };
  }

  function decodeBase64UrlJson(value) {
    try {
      const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
      const decoded = typeof atob === 'function'
        ? atob(padded)
        : '';
      return decoded ? JSON.parse(decoded) : null;
    } catch {
      return null;
    }
  }

  function getAccessTokenUserId() {
    const token = getLocalValue('access-token') || '';
    const payload = decodeBase64UrlJson(token.split('.')[1] || '');
    const userId = payload?.userId ?? payload?.id ?? payload?.uid ?? '';
    return userId === null || userId === undefined ? '' : String(userId);
  }

  window.__blobioCustomSkinRuntimeState = function customSkinRuntimeState() {
    const state = getState();
    if (!state) {
      return null;
    }

    return {
      activeUrl: state.activeUrl,
      localName: state.localName,
      userId: getAccessTokenUserId(),
      playerName: getLocalValue('config-' + 'username') || '',
    };
  };

  window.__blobioCustomSkinIsLocalCell = function customSkinIsLocalCell(cell) {
    const state = window.__blobioCustomSkinRuntimeState?.();
    if (!state || !cell) {
      return false;
    }

    if (state.userId) {
      const candidates = [cell.J, cell.pID, cell.userId, cell.u].filter((value) => value !== undefined && value !== null);
      return candidates.some((value) => String(value) === state.userId);
    }

    const playerName = String(state.playerName || '').trim().toLowerCase();
    const cellName = String(cell.B || cell.name || '').trim().toLowerCase();
    return Boolean(playerName && cellName && playerName === cellName);
  };

  const inspectedCellShapes = new Set();

  function summarizeCell(cell) {
    if (!cell || typeof cell !== 'object') {
      return null;
    }

    const keys = Object.keys(cell).slice(0, 24);
    const numeric = {};
    for (const key of ['J', 'pID', 'userId', 'uid', 'u', 'B', 'name', 'screenX', 'x', 'X', 'C', 'R', 'H', 'screenY', 'y', 'Y', 'D', 'S', 'I', 'screenSize', 'size', 'radius', 'r', 'w', 'M', 'F', 'A', 'O']) {
      const value = cell[key];
      if (value !== undefined && value !== null && (typeof value === 'number' || typeof value === 'string')) {
        numeric[key] = value;
      }
    }

    return { keys, fields: numeric };
  }

  window.__blobioCustomSkinInspectCell = function customSkinInspectCell(cell) {
    const summary = summarizeCell(cell);
    if (!summary) {
      return;
    }

    const signature = summary.keys.join(',');
    if (inspectedCellShapes.has(signature)) {
      return;
    }

    inspectedCellShapes.add(signature);
    recordDebug('cell-shape', 'Observed GWT cell shape.', summary);
  };

  const overlayCells = new Set();

  window.__blobioCustomSkinRegisterCell = function customSkinRegisterCell(cell) {
    if (!window.__blobioCustomSkinIsLocalCell?.(cell)) {
      return false;
    }

    overlayCells.add(cell);
    debug('Registered local custom skin cell.', { count: overlayCells.size, cell: summarizeCell(cell) }, 'cell-register');
    return true;
  };

  window.__blobioCustomSkinDrawOverlay = function customSkinDrawOverlay(cell) {
    return window.__blobioCustomSkinRegisterCell?.(cell);
  };

  function installOverlayCanvas() {
    if (window.__blobioCustomSkinOverlayInstalled || typeof window.Image !== 'function') {
      return;
    }

    recordDebug('overlay', 'Installing custom skin overlay canvas.', { imageAvailable: true });

    const overlay = document.createElement('canvas');
    overlay.className = 'blobio-custom-skin-overlay-canvas';
    overlay.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147481000';

    const image = new window.Image();
    let loadedUrl = '';
    let lastLog = 0;

    function appendOverlay() {
      try {
        (document.body || document.documentElement)?.appendChild?.(overlay);
        recordDebug('overlay', 'Custom skin overlay canvas attached.', {
          parent: overlay.parentNode?.tagName || overlay.parentNode?.nodeName || 'unknown',
        });
      } catch {
        // Body may not exist at document-start.
      }
    }

    function getNumber(item, names) {
      for (const name of names) {
        const value = Number(item?.[name]);
        if (Number.isFinite(value)) {
          return value;
        }
      }

      return null;
    }

    function getCellRect(cell, canvas) {
      const x = getNumber(cell, ['screenX', 'x', 'X', 'C', 'R', 'H']);
      const y = getNumber(cell, ['screenY', 'y', 'Y', 'D', 'S', 'I']);
      const size = getNumber(cell, ['screenSize', 'size', 'radius', 'r', 'w', 'M', 'F', 'A', 'O']);
      if (x === null || y === null || size === null || size <= 0) {
        return null;
      }

      const radius = size > 220 ? size / 2 : size;
      if (x + radius < 0 || y + radius < 0 || x - radius > canvas.width || y - radius > canvas.height) {
        return null;
      }

      return { x: x - radius, y: y - radius, size: radius * 2 };
    }

    function draw() {
      const raf = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 16));
      raf(draw);

      const state = window.__blobioCustomSkinRuntimeState?.();
      const ctx = overlay.getContext?.('2d');
      if (!state || !ctx) {
        return;
      }

      if (!overlay.parentNode) {
        appendOverlay();
      }

      const width = window.innerWidth || document.documentElement?.clientWidth || 0;
      const height = window.innerHeight || document.documentElement?.clientHeight || 0;
      if (overlay.width !== width) {
        overlay.width = width;
      }
      if (overlay.height !== height) {
        overlay.height = height;
      }

      if (loadedUrl !== state.activeUrl) {
        loadedUrl = state.activeUrl;
        image.crossOrigin = 'anonymous';
        recordDebug('image', 'Custom skin image load started.', { url: loadedUrl });
        image.onload = () => debug('Custom skin image loaded.', { url: loadedUrl, width: image.naturalWidth, height: image.naturalHeight }, 'image');
        image.onerror = () => debug('Custom skin image failed to load.', { url: loadedUrl }, 'image');
        image.src = loadedUrl;
      }

      ctx.clearRect(0, 0, overlay.width, overlay.height);

      let drawn = 0;
      let validRects = 0;
      let invalidSample = null;
      for (const cell of overlayCells) {
        if (!window.__blobioCustomSkinIsLocalCell?.(cell)) {
          overlayCells.delete(cell);
          continue;
        }

        const rect = getCellRect(cell, overlay);
        if (!rect) {
          invalidSample ||= summarizeCell(cell);
          continue;
        }

        validRects += 1;
        if (!image.complete || image.naturalWidth === 0) {
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(rect.x + rect.size / 2, rect.y + rect.size / 2, rect.size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(image, rect.x, rect.y, rect.size, rect.size);
        ctx.restore();
        drawn += 1;
      }

      const now = Date.now();
      if (now - lastLog > 1000) {
        lastLog = now;
        debug('Custom skin overlay frame.', {
          cells: overlayCells.size,
          validRects,
          drawn,
          imageReady: Boolean(image.complete && image.naturalWidth > 0),
          invalidSample,
        }, 'overlay-frame');
      }
    }

    appendOverlay();
    draw();
    window.__blobioCustomSkinOverlayInstalled = true;
  }

  function syncConfig() {
    const state = getState();
    if (!state) {
      return;
    }

    setLocalValue(CUSTOM_SKIN_ENABLED_KEY, '1');
    setLocalValue(CUSTOM_SKIN_ACTIVE_KEY, state.activeUrl);
    setLocalValue(CUSTOM_SKIN_LOCAL_NAME_KEY, state.localName);
    debug('Custom skin overlay state synced before GWT startup.', {
      activeUrl: state.activeUrl,
      localName: state.localName,
    }, 'bootstrap');
  }

  function getUrlPath(url) {
    try {
      return new URL(String(url || ''), location.href).pathname;
    } catch {
      return String(url || '');
    }
  }

  function isAssetManifestUrl(url) {
    return /(?:^|\\/)assets\\/assets\\.txt$/i.test(getUrlPath(url));
  }

  function isGwtScriptUrl(url) {
    const path = getUrlPath(url);
    return (
      /(?:^|\\/)html\\/html\\.nocache\\.js$/i.test(path) ||
      /(?:^|\\/)html\\/[a-f0-9]{32}\\.cache\\.js$/i.test(path) ||
      /(?:^|\\/)html-\\d+\\.js$/i.test(path) ||
      /(?:^|\\/)html\\/html-\\d+\\.js$/i.test(path)
    );
  }

  function isPatchableGwtScriptUrl(url) {
    const path = getUrlPath(url);
    return (
      /(?:^|\\/)html\\/[a-f0-9]{32}\\.cache\\.js$/i.test(path) ||
      /(?:^|\\/)html-\\d+\\.js$/i.test(path) ||
      /(?:^|\\/)html\\/html-\\d+\\.js$/i.test(path)
    );
  }

  function resolveCustomSkinUrl(url) {
    return String(url || '');
  }

  function patchAssetManifestText(text) {
    return String(text || '');
  }

  function patchGwtCacheSource(source, sourceUrl = '') {
    const originalSource = String(source || '');
    const state = getState();
    if (!state) {
      recordDebug('gwt-patch', 'Skipped GWT patch because custom skin state is inactive.', { url: redactSensitive(sourceUrl) });
      return originalSource;
    }

    if (originalSource.includes(GWT_PATCH_MARKER)) {
      recordDebug('gwt-patch', 'Skipped GWT patch because source is already patched.', { url: redactSensitive(sourceUrl) });
      return originalSource;
    }

    let patched = originalSource;
    let changed = false;
    const constructorPattern = /function ([$A-Za-z_][0-9A-Za-z_$]*)\\(a,b,c,d,e,f,g,h,i,j\\)\\{var k,l,m,n,o,p;([\\s\\S]{0,3200}?h!=null&&\\(this\\.B=h\\);this\\.L=i;)/;
    const gamePattern = /(function [$A-Za-z_][0-9A-Za-z_$]*\\(\\)\\{Hb\\.call\\(this,'CONTEXT',0\\);)/;
    const constructorMatched = constructorPattern.test(patched);
    const gameMatched = gamePattern.test(patched);

    if (constructorMatched) {
      patched = patched.replace(
        constructorPattern,
        "function $1(a,b,c,d,e,f,g,h,i,j){var k,l,m,n,o,p;$2try{$wnd.__blobioCustomSkinInspectCell&&$wnd.__blobioCustomSkinInspectCell(this);if($wnd.__blobioCustomSkinIsLocalCell&&$wnd.__blobioCustomSkinIsLocalCell(this)){$wnd.__blobioCustomSkinRegisterCell&&$wnd.__blobioCustomSkinRegisterCell(this);$wnd.__blobioCustomSkinDrawOverlay&&$wnd.__blobioCustomSkinDrawOverlay(this)}}catch(_blobioError){}",
      );
      changed = true;
    }

    if (gameMatched) {
      patched = patched.replace(gamePattern, "$1try{$wnd.__blobioGwtGame=this}catch(e){}");
      changed = true;
    }

    recordDebug('gwt-patch', 'GWT patch summary.', {
      url: redactSensitive(sourceUrl),
      sourceLength: originalSource.length,
      constructorMatched,
      gameMatched,
      changed,
      localName: state.localName,
    });

    return changed ? '/*' + GWT_PATCH_MARKER + '*/\\n' + patched : originalSource;
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

  function installTextResponsePatch(xhr, patchText) {
    const textDescriptor = Object.getOwnPropertyDescriptor(xhr, 'responseText') || findPropertyDescriptor(Object.getPrototypeOf(xhr), 'responseText');
    const responseDescriptor = Object.getOwnPropertyDescriptor(xhr, 'response') || findPropertyDescriptor(Object.getPrototypeOf(xhr), 'response');

    if (textDescriptor) {
      try {
        Object.defineProperty(xhr, 'responseText', {
          configurable: true,
          get() {
            const raw = typeof textDescriptor.get === 'function' ? textDescriptor.get.call(this) : textDescriptor.value;
            return patchText(raw);
          },
        });
      } catch {
        // Browser XHR implementations can reject per-instance response overrides.
      }
    }

    if (responseDescriptor) {
      try {
        Object.defineProperty(xhr, 'response', {
          configurable: true,
          get() {
            const raw = typeof responseDescriptor.get === 'function' ? responseDescriptor.get.call(this) : responseDescriptor.value;
            return typeof raw === 'string' ? patchText(raw) : raw;
          },
        });
      } catch {
        // Browser XHR implementations can reject per-instance response overrides.
      }
    }
  }

  function patchImageLoading() {
    const imagePrototype = window.HTMLImageElement?.prototype;
    const srcDescriptor = imagePrototype && findPropertyDescriptor(imagePrototype, 'src');

    if (srcDescriptor?.get && srcDescriptor?.set && !imagePrototype.__blobioCustomSkinSrcPatched) {
      Object.defineProperty(imagePrototype, 'src', {
        configurable: true,
        enumerable: srcDescriptor.enumerable,
        get: srcDescriptor.get,
        set(value) {
          srcDescriptor.set.call(this, resolveCustomSkinUrl(value));
        },
      });
      imagePrototype.__blobioCustomSkinSrcPatched = true;
    }

    const originalSetAttribute = imagePrototype?.setAttribute || window.Element?.prototype?.setAttribute;
    if (imagePrototype && typeof originalSetAttribute === 'function' && !imagePrototype.__blobioCustomSkinSetAttributePatched) {
      imagePrototype.setAttribute = function setCustomSkinImageAttribute(name, value) {
        const nextValue = String(name).toLowerCase() === 'src' ? resolveCustomSkinUrl(value) : value;
        return originalSetAttribute.call(this, name, nextValue);
      };
      imagePrototype.__blobioCustomSkinSetAttributePatched = true;
    }
  }

  function patchNetworkLoading() {
    const xhrPrototype = window.XMLHttpRequest?.prototype;
    if (xhrPrototype && !xhrPrototype.__blobioCustomSkinOpenPatched) {
      const originalOpen = xhrPrototype.open;
      if (typeof originalOpen === 'function') {
        xhrPrototype.open = function openCustomSkinRequest(method, url, ...rest) {
          if (isAssetManifestUrl(url)) {
            installTextResponsePatch(this, patchAssetManifestText);
          } else if (isGwtScriptUrl(url)) {
            installTextResponsePatch(this, (text) => patchGwtCacheSource(text, url));
          }

          return originalOpen.call(this, method, resolveCustomSkinUrl(url), ...rest);
        };
        xhrPrototype.__blobioCustomSkinOpenPatched = true;
      }
    }

    if (typeof window.fetch === 'function' && !window.__blobioCustomSkinFetchPatched) {
      const originalFetch = window.fetch;
      window.fetch = function fetchCustomSkin(input, init) {
        const originalUrl = typeof input === 'string' || input instanceof String ? String(input) : input?.url;
        const resolvedUrl = originalUrl ? resolveCustomSkinUrl(originalUrl) : originalUrl;
        const nextInput = resolvedUrl && resolvedUrl !== originalUrl ? resolvedUrl : input;
        const responsePromise = originalFetch.call(this, nextInput, init);

        if (!originalUrl || typeof window.Response !== 'function' || (!isAssetManifestUrl(originalUrl) && !isGwtScriptUrl(originalUrl))) {
          return responsePromise;
        }

        const patchText = isGwtScriptUrl(originalUrl) ? (text) => patchGwtCacheSource(text, originalUrl) : patchAssetManifestText;
        return responsePromise.then((response) => response.clone().text().then((text) => {
          const patchedText = patchText(text);
          if (patchedText === text) {
            return response;
          }

          return new window.Response(patchedText, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }));
      };
      window.__blobioCustomSkinFetchPatched = true;
    }
  }

  function getScriptSource(node) {
    return node?.src || node?.getAttribute?.('src') || '';
  }

  function dispatchScriptEvent(node, type) {
    try {
      const event = typeof window.Event === 'function' ? new window.Event(type) : { type };
      node.dispatchEvent?.(event);
      const handler = node['on' + type];
      if (typeof handler === 'function') {
        handler.call(node, event);
      }
    } catch {
      // A failed synthetic load callback should not block the GWT script.
    }
  }

  function fetchTextSync(url) {
    const xhr = new window.XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    if (xhr.status && (xhr.status < 200 || xhr.status >= 300)) {
      throw new Error('HTTP ' + xhr.status + ' while loading ' + url);
    }

    return xhr.responseText || xhr.response || '';
  }

  function createPatchedScript(original, source, sourceUrl) {
    const replacement = document.createElement('script');
    replacement.__blobioCustomSkinPatchedScript = true;
    replacement.text = patchGwtCacheSource(source, sourceUrl);
    replacement.setAttribute?.('data-blobio-custom-skin-gwt', '1');

    if (original?.nonce) {
      replacement.nonce = original.nonce;
    }

    return replacement;
  }

  function tryAppendPatchedGwtScript(parent, node, beforeNode, originalAppendChild, originalInsertBefore) {
    const sourceUrl = getScriptSource(node);
    if (!node || node.__blobioCustomSkinPatchedScript) {
      return null;
    }

    if (sourceUrl) {
      recordDebug('script', 'Script node seen.', {
        url: redactSensitive(sourceUrl),
        gwtScript: isGwtScriptUrl(sourceUrl),
        patchable: isPatchableGwtScriptUrl(sourceUrl),
      });
    }

    if (!sourceUrl || !isPatchableGwtScriptUrl(sourceUrl)) {
      return null;
    }

    try {
      const source = fetchTextSync(sourceUrl);
      const replacement = createPatchedScript(node, source, sourceUrl);
      if (beforeNode && typeof originalInsertBefore === 'function') {
        originalInsertBefore.call(parent, replacement, beforeNode);
      } else {
        originalAppendChild.call(parent, replacement);
      }

      dispatchScriptEvent(node, 'load');
      debug('Loaded patched GWT script.', { url: redactSensitive(sourceUrl) }, 'script');
      return node;
    } catch (error) {
      logError('Failed to load patched GWT cache script. Falling back to the original script.', error);
      return null;
    }
  }

  function patchScriptLoading() {
    const nodePrototype = window.Node?.prototype;
    if (!nodePrototype || nodePrototype.__blobioCustomSkinScriptPatchInstalled) {
      return;
    }

    const originalAppendChild = nodePrototype.appendChild;
    const originalInsertBefore = nodePrototype.insertBefore;

    if (typeof originalAppendChild === 'function') {
      nodePrototype.appendChild = function appendCustomSkinPatchedScript(node) {
        const handled = tryAppendPatchedGwtScript(this, node, null, originalAppendChild, originalInsertBefore);
        return handled || originalAppendChild.call(this, node);
      };
    }

    if (typeof originalInsertBefore === 'function') {
      nodePrototype.insertBefore = function insertCustomSkinPatchedScript(node, beforeNode) {
        const handled = tryAppendPatchedGwtScript(this, node, beforeNode, originalAppendChild, originalInsertBefore);
        return handled || originalInsertBefore.call(this, node, beforeNode);
      };
    }

    nodePrototype.__blobioCustomSkinScriptPatchInstalled = true;
  }

  syncConfig();
  installNetworkDebugHooks();
  installOverlayCanvas();
  patchImageLoading();
  patchNetworkLoading();
  patchScriptLoading();

  window.__blobioCustomSkinPatchAssetManifest = patchAssetManifestText;
  window.__blobioCustomSkinPatchGwtCacheSource = patchGwtCacheSource;
  window.__blobioCustomSkinIsGwtScriptUrl = isGwtScriptUrl;
})();`;
  }

  function injectPageCustomSkinBootstrap() {
    if (location.host !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const state = getCustomSkinBootstrapState();
    if (!state) {
      return;
    }

    try {
      const script = document.createElement('script');
      script.textContent = getPageCustomSkinBootstrapSource(state);
      (document.documentElement || document.head).appendChild(script);
      script.remove();
    } catch (error) {
      logError('Failed to inject Custom Skin page bootstrap.', error);
    }
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
    const baseSkin = getCustomSkinBaseSkin();
    const state = getCustomSkinState();
    if (state) {
      setLocalValue(CUSTOM_SKIN_ENABLED_KEY, '1');
      setLocalValue(CUSTOM_SKIN_ACTIVE_KEY, state.activeUrl);
      setLocalValue(CUSTOM_SKIN_LOCAL_NAME_KEY, state.localName);
      removeLocalValue(CUSTOM_SKIN_BASE_KEY);
      removeLocalValue(CUSTOM_SKIN_PREVIOUS_KEY);
      return;
    }

    const currentSkin = getLocalValue('config-skin') || '';
    if ((localName && currentSkin === localName) || (baseSkin?.name && currentSkin === baseSkin.name)) {
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

  function publishCustomSkinBridgeState() {
    if (location.host !== CUSTOM_CLIENT_HOST) {
      return;
    }

    try {
      const activeUrl = getSharedValue(CUSTOM_SKIN_ACTIVE_KEY) || getSharedValue('blobio.customSkin.selectedUrl') || '';
      globalThis.__blobioCustomSkinBridgeState = {
        enabled: isValidImgurSkinUrl(activeUrl) && getSharedValue(CUSTOM_SKIN_ENABLED_KEY) !== '0',
        activeUrl: isValidImgurSkinUrl(activeUrl) ? activeUrl : '',
        selectedUrl: isValidImgurSkinUrl(activeUrl) ? activeUrl : '',
        debug: getSharedValue('blobio.customSkin.debug') === '1',
        updatedAt: Date.now(),
      };
    } catch {
      globalThis.__blobioCustomSkinBridgeState = { enabled: false, activeUrl: '', debug: false };
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
    return String(url || '');
  }

  function patchAssetManifestText(text) {
    return String(text || '');
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

  installSharedStorageBridge();
  syncCustomClientSkinConfig();
  // The custom skin runtime is now packet-overlay based and lives in the bundle.
  // Do not inject the old replacement/GWT bootstrap from the loader.
  installEarlyCustomSkinHooks();
  fetchBundle();
})();
