import { createBlobioStorage } from '../storage/BlobioStorage.js';

const CUSTOM_SKIN_ENABLED_KEY = 'blobio.customSkin.enabled';
const CUSTOM_SKIN_ACTIVE_KEY = 'blobio.customSkin.activeUrl';
const CUSTOM_SKIN_SELECTED_KEY = 'blobio.customSkin.selectedUrl';
const CUSTOM_SKIN_RUNTIME_ACTIVE_KEY = 'blobio.customSkin.runtimeActiveUrl';
const CUSTOM_SKIN_PENDING_ACTIVE_KEY = 'blobio.customSkin.pendingActiveUrl';
const CUSTOM_SKIN_UI_SELECTED_KEY = 'blobio.customSkin.uiSelectedUrl';
const CUSTOM_SKIN_UI_APPLIED_KEY = 'blobio.customSkin.uiAppliedUrl';
const CUSTOM_SKIN_COOKIE_KEY = 'blobioCustomSkinUrl';
const CUSTOM_SKIN_ENABLED_COOKIE_KEY = 'blobioCustomSkinEnabled';
const CUSTOM_SKIN_URL_KEYS = [
  CUSTOM_SKIN_ACTIVE_KEY,
  CUSTOM_SKIN_SELECTED_KEY,
  CUSTOM_SKIN_RUNTIME_ACTIVE_KEY,
  CUSTOM_SKIN_PENDING_ACTIVE_KEY,
  CUSTOM_SKIN_UI_APPLIED_KEY,
  CUSTOM_SKIN_UI_SELECTED_KEY,
];
const DIRECT_IMGUR_IMAGE_MATCH = /^https:\/\/i\.imgur\.com\/[a-z0-9]+\.(?:png|jpe?g|gif|webp)(?:\?.*)?$/i;
const RUNTIME_HOST = 'custom.client.blobgame.io';

function isValidImgurSkinUrl(url) {
  return DIRECT_IMGUR_IMAGE_MATCH.test(String(url || '').trim());
}

export class CustomSkinOverlayFeature {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    logger = console,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.logger = logger;
    this.started = false;
    this.scriptNode = null;
  }

  start() {
    if (this.started) {
      return true;
    }

    const win = this.document?.defaultView || globalThis;
    if (String(win.location?.hostname || '').toLowerCase() !== RUNTIME_HOST) {
      this.started = true;
      return true;
    }

    if (!this.document?.documentElement) {
      this.logger.warn('[Blobio] Custom skin overlay could not start: document is not ready.');
      return false;
    }

    this.injectPageOverlay();
    this.refreshFromExtensionStorage();
    this.started = true;
    return true;
  }

  destroy() {
    this.scriptNode?.remove?.();
    this.scriptNode = null;
    this.started = false;
  }

  getBootstrapState() {
    const sources = this.collectSyncUrlSources();
    const active = this.pickValidUrlSource(sources);
    const enabledValue = this.readSyncEnabledFlag();
    const debugValue = this.readSyncDebugFlag();

    return {
      enabled: Boolean(active.url) && enabledValue !== '0',
      activeUrl: active.url || '',
      debug: debugValue === '1',
      urlSources: sources,
      chosenUrlSource: active.source || '',
    };
  }

  injectPageOverlayRefresh(nextState) {
    const script = this.document.createElement('script');
    script.dataset.blobioCustomSkinOverlayRefresh = 'true';
    script.textContent = `;(() => {\n  const state = ${JSON.stringify(nextState)};\n  window.__blobioCustomSkinOverlayV17?.refresh?.(state);\n})();`;
    (this.document.documentElement || this.document.head || this.document.body)?.appendChild?.(script);
    script.remove();
  }

  refreshFromExtensionStorage() {
    const win = this.document?.defaultView || globalThis;
    const chromeStorage = win?.chrome?.storage?.local || globalThis.chrome?.storage?.local;
    if (!chromeStorage || typeof chromeStorage.get !== 'function') {
      return;
    }

    const keys = [CUSTOM_SKIN_ENABLED_KEY, 'blobio.customSkin.debug', ...CUSTOM_SKIN_URL_KEYS];
    try {
      const maybePromise = chromeStorage.get(keys, (items) => {
        if (chromeStorage.runtime?.lastError) {
          return;
        }
        this.applyExtensionStorageSnapshot(items || {});
      });

      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then((items) => this.applyExtensionStorageSnapshot(items || {})).catch(() => {});
      }
    } catch {
      // Chrome storage is optional. Userscript installs rely on GM/local fallbacks instead.
    }
  }

  applyExtensionStorageSnapshot(items) {
    const sources = this.collectSyncUrlSources();
    for (const key of CUSTOM_SKIN_URL_KEYS) {
      const value = items?.[key];
      sources[`chrome.storage.local:${key}`] = typeof value === 'string' ? value : '';
    }

    const active = this.pickValidUrlSource(sources);
    const enabledRaw = String(items?.[CUSTOM_SKIN_ENABLED_KEY] ?? this.readSyncEnabledFlag() ?? '');
    const debugRaw = String(items?.['blobio.customSkin.debug'] ?? this.readSyncDebugFlag() ?? '');

    this.injectPageOverlayRefresh({
      enabled: Boolean(active.url) && enabledRaw !== '0',
      activeUrl: active.url || '',
      debug: debugRaw === '1',
      urlSources: sources,
      chosenUrlSource: active.source || '',
    });
  }

  decodeCookieValue(value) {
    try {
      return decodeURIComponent(String(value || ''));
    } catch {
      return String(value || '');
    }
  }

  getCookieValue(name) {
    try {
      const prefix = `${name}=`;
      const row = String(this.document?.cookie || '')
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix));
      return row ? this.decodeCookieValue(row.slice(prefix.length)) : '';
    } catch {
      return '';
    }
  }

  collectSyncUrlSources() {
    const win = this.document?.defaultView || globalThis;
    const sources = {};

    const put = (name, value) => {
      sources[name] = typeof value === 'string' ? value : '';
    };

    try {
      const bridge = win.__blobioSharedStorageBridge || globalThis.__blobioSharedStorageBridge;
      for (const key of CUSTOM_SKIN_URL_KEYS) {
        put(`bridge:${key}`, bridge?.getItem?.(key));
      }
    } catch {}

    try {
      put('bridgeState:activeUrl', win.__blobioCustomSkinBridgeState?.activeUrl || globalThis.__blobioCustomSkinBridgeState?.activeUrl);
      put('bridgeState:selectedUrl', win.__blobioCustomSkinBridgeState?.selectedUrl || globalThis.__blobioCustomSkinBridgeState?.selectedUrl);
    } catch {}

    try {
      for (const key of CUSTOM_SKIN_URL_KEYS) {
        put(`storage:${key}`, this.storage?.getItem?.(key));
      }
    } catch {}

    try {
      for (const key of CUSTOM_SKIN_URL_KEYS) {
        put(`localStorage:${key}`, win.localStorage?.getItem?.(key));
      }
    } catch {}

    try {
      put('cookie:blobioCustomSkinUrl', this.getCookieValue(CUSTOM_SKIN_COOKIE_KEY));
      put('cookie:blobioCustomSkinEnabled', this.getCookieValue(CUSTOM_SKIN_ENABLED_COOKIE_KEY));
    } catch {}

    try {
      put('dataset:blobioCustomSkinUrl', this.document.documentElement?.dataset?.blobioCustomSkinUrl);
    } catch {}

    try {
      const search = new URLSearchParams(String(win.location?.search || ''));
      put('query:blobioSkin', search.get('blobioSkin'));
      put('query:blobioCustomSkin', search.get('blobioCustomSkin'));
    } catch {}

    try {
      const hash = new URLSearchParams(String(win.location?.hash || '').replace(/^#/, ''));
      put('hash:blobioSkin', hash.get('blobioSkin'));
      put('hash:blobioCustomSkin', hash.get('blobioCustomSkin'));
    } catch {}

    return sources;
  }

  pickValidUrlSource(sources) {
    for (const [source, value] of Object.entries(sources || {})) {
      const clean = String(value || '').trim();
      if (isValidImgurSkinUrl(clean)) {
        return { source, url: clean };
      }
    }

    return { source: '', url: '' };
  }

  readSyncEnabledFlag() {
    try {
      return this.storage?.getItem?.(CUSTOM_SKIN_ENABLED_KEY) || '';
    } catch {
      return '';
    }
  }

  readSyncDebugFlag() {
    try {
      return this.storage?.getItem?.('blobio.customSkin.debug') || '';
    } catch {
      return '';
    }
  }

  injectPageOverlay() {
    const state = this.getBootstrapState();
    const script = this.document.createElement('script');
    script.dataset.blobioCustomSkinOverlay = 'true';
    script.textContent = `;(${pageOverlayMain.toString()})(${JSON.stringify(state)});`;
    (this.document.documentElement || this.document.head || this.document.body)?.appendChild?.(script);
    script.remove();
    this.scriptNode = script;
  }
}

function pageOverlayMain(initialState) {
  'use strict';

  const LOG_PREFIX = '[BlobioSkinOverlay]';
  const CUSTOM_SKIN_ENABLED_KEY = 'blobio.customSkin.enabled';
  const CUSTOM_SKIN_ACTIVE_KEY = 'blobio.customSkin.activeUrl';
  const CUSTOM_SKIN_SELECTED_KEY = 'blobio.customSkin.selectedUrl';
  const CUSTOM_SKIN_RUNTIME_ACTIVE_KEY = 'blobio.customSkin.runtimeActiveUrl';
  const CUSTOM_SKIN_PENDING_ACTIVE_KEY = 'blobio.customSkin.pendingActiveUrl';
  const CUSTOM_SKIN_UI_SELECTED_KEY = 'blobio.customSkin.uiSelectedUrl';
  const CUSTOM_SKIN_UI_APPLIED_KEY = 'blobio.customSkin.uiAppliedUrl';
  const CUSTOM_SKIN_COOKIE_KEY = 'blobioCustomSkinUrl';
  const CUSTOM_SKIN_ENABLED_COOKIE_KEY = 'blobioCustomSkinEnabled';
  const CUSTOM_SKIN_URL_KEYS = [
    CUSTOM_SKIN_ACTIVE_KEY,
    CUSTOM_SKIN_SELECTED_KEY,
    CUSTOM_SKIN_RUNTIME_ACTIVE_KEY,
    CUSTOM_SKIN_PENDING_ACTIVE_KEY,
    CUSTOM_SKIN_UI_APPLIED_KEY,
    CUSTOM_SKIN_UI_SELECTED_KEY,
  ];
  const DIRECT_IMGUR_IMAGE_MATCH = /^https:\/\/i\.imgur\.com\/[a-z0-9]+\.(?:png|jpe?g|gif|webp)(?:\?.*)?$/i;
  const OWN_ID_LIMIT = 128;
  const NODE_LIMIT = 5000;
  const DEBUG_LIMIT = 700;
  const SCREEN_CIRCLE_LIMIT = 300;
  const SCREEN_CIRCLE_MAX_AGE_MS = 180;
  const CELL_BORDER_OVERDRAW = 1.02;
  const MIN_CELL_SCREEN_RADIUS = 6;
  const OWN_CLUSTER_MAX_AGE_MS = 650;
  const OWN_CLUSTER_LIMIT = 32;
  const OWN_CLUSTER_MIN_SIZE = 12;
  const SIBLING_ID_WINDOW = 15;
  const SIBLING_MIN_OBSERVATIONS = 3;
  const SIBLING_MAX_AGE_MS = 1400;
  const SIBLING_MAX_DISTANCE_FACTOR = 34;
  const WEBGL_MATRIX_MAX_AGE_MS = 500;
  const WEBGL_MATRIX_LIMIT = 96;
  const SHORT_MODE_LOCK_THRESHOLD = 3;
  const RENDER_SMOOTHING_MS = 55;
  const RENDER_SNAP_DISTANCE = 1400;
  const ZOOM_FACTOR_STORAGE_KEY = 'blobio.customSkin.overlayZoomFactorV17';
  const ZOOM_FACTOR_MIN = 0.25;
  const ZOOM_FACTOR_MAX = 4;

  if (window.__blobioCustomSkinOverlayV17) {
    window.__blobioCustomSkinOverlayV17.refresh?.(initialState);
    return;
  }

  const state = {
    enabled: false,
    activeUrl: '',
    debug: Boolean(initialState && initialState.debug),
    image: null,
    imageUrl: '',
    imageReady: false,
    overlay: null,
    ctx: null,
    mainCanvas: null,
    nodes: new Map(),
    ownIds: new Set(),
    camera: { x: 0, y: 0, scale: 1, source: 'average' },
    lastOwnCenter: null,
    frame: 0,
    drawn: 0,
    sockets: 0,
    wsMessages: 0,
    addNodePackets: 0,
    ownListPackets: 0,
    ownListParsedPackets: 0,
    ownListPacketSamples: [],
    shortOwnFallbackUpdates: 0,
    updatePackets: 0,
    updateParseErrors: 0,
    updateNodeSamples: [],
    updateNodeParseSummaries: [],
    opCounts: {},
    earlyPackets: [],
    ownNodeMissFrames: 0,
    frameScanCount: 0,
    lastPacketSummary: null,
    debugEvents: [],
    frameHooks: [],
    startedAt: new Date().toISOString(),
    storageBridgeSeen: Boolean(window.__blobioSharedStorageBridge),
    urlSources: {},
    chosenUrlSource: '',
    recentScreenCircles: [],
    screenCircleMatches: [],
    screenCircleCandidates: 0,
    renderMode: 'world-transform',
    canvasHooked: false,
    inferredOwnIds: new Set(),
    ownRenderNodes: [],
    ownClusterCandidates: [],
    ownClusterMatches: [],
    scrambleId: null,
    scrambleCandidates: {},
    localPlayerName: '',
    packetNameMatches: [],
    rawOwnRecords: [],
    siblingCandidateScores: new Map(),
    siblingOwnIds: new Set(),
    zoomFactor: readStoredZoomFactor(),
    zoomEvents: [],
    lastViewport: null,
    lastCanvasRect: null,
    lastEffectiveScale: 1,
    webglMatrices: [],
    activeWebglTransform: null,
    webglMatrixMatches: [],
    webglHookCount: 0,
    siblingOwnCandidates: [],
    siblingOwnMatches: [],
    packetMode: 'auto',
    shortModeConfidence: 0,
    ignoredNonShortPackets: 0,
    rejectedUpdateRecords: 0,
    visualNodes: new Map(),
    };

  function refresh(nextState) {
    const sources = collectUrlSources(nextState);
    const picked = pickValidUrlSource(sources);
    const activeUrl = picked.url;
    const hasValidActiveUrl = DIRECT_IMGUR_IMAGE_MATCH.test(activeUrl);
    const enabled = hasValidActiveUrl && (readEnabled(nextState) || hasValidActiveUrl);

    state.debug = Boolean(nextState && nextState.debug) || localStorage.getItem('blobio.customSkin.debug') === '1';
    state.urlSources = sources;
    state.chosenUrlSource = picked.source;
    state.storageBridgeSeen = Boolean(window.__blobioSharedStorageBridge);
    state.enabled = enabled;
    state.activeUrl = enabled ? activeUrl : '';

    if (!state.enabled) {
      state.imageReady = false;
      state.imageUrl = '';
      log('overlay disabled', { urlSources: sources, chosenUrlSource: picked.source }, 'state');
      return;
    }

    ensureImage();
    ensureOverlay();
    log('overlay state refreshed', { activeUrl: state.activeUrl, chosenUrlSource: state.chosenUrlSource }, 'state');
  }

  function readEnabled(nextState) {
    if (nextState && Object.prototype.hasOwnProperty.call(nextState, 'enabled')) {
      return Boolean(nextState.enabled);
    }

    try {
      const bridgeValue = window.__blobioSharedStorageBridge?.getItem?.(CUSTOM_SKIN_ENABLED_KEY);
      if (bridgeValue !== undefined && bridgeValue !== null) {
        return String(bridgeValue) === '1';
      }

      return localStorage.getItem(CUSTOM_SKIN_ENABLED_KEY) !== '0';
    } catch {
      return false;
    }
  }

  function decodeCookieValue(value) {
    try {
      return decodeURIComponent(String(value || ''));
    } catch {
      return String(value || '');
    }
  }

  function getCookieValue(name) {
    try {
      const prefix = `${name}=`;
      const row = String(document.cookie || '')
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix));
      return row ? decodeCookieValue(row.slice(prefix.length)) : '';
    } catch {
      return '';
    }
  }

  function collectUrlSources(nextState) {
    const sources = {};
    const put = (name, value) => {
      sources[name] = typeof value === 'string' ? value : '';
    };

    if (nextState && typeof nextState.activeUrl === 'string') {
      put('initialState:activeUrl', nextState.activeUrl.trim());
    }

    if (nextState && nextState.urlSources && typeof nextState.urlSources === 'object') {
      for (const [key, value] of Object.entries(nextState.urlSources)) {
        put(`initialState:${key}`, value);
      }
    }

    try {
      for (const key of CUSTOM_SKIN_URL_KEYS) {
        put(`bridge:${key}`, window.__blobioSharedStorageBridge?.getItem?.(key));
      }
    } catch {}

    try {
      put('bridgeState:activeUrl', window.__blobioCustomSkinBridgeState?.activeUrl);
      put('bridgeState:selectedUrl', window.__blobioCustomSkinBridgeState?.selectedUrl);
      put('runtimeState:activeUrl', window.__blobioCustomSkinRuntimeState?.activeUrl);
    } catch {}

    try {
      for (const key of CUSTOM_SKIN_URL_KEYS) {
        put(`localStorage:${key}`, localStorage.getItem(key));
      }
    } catch {}

    try {
      put('cookie:blobioCustomSkinUrl', getCookieValue(CUSTOM_SKIN_COOKIE_KEY));
      put('cookie:blobioCustomSkinEnabled', getCookieValue(CUSTOM_SKIN_ENABLED_COOKIE_KEY));
    } catch {}

    try {
      put('dataset:blobioCustomSkinUrl', document.documentElement?.dataset?.blobioCustomSkinUrl);
    } catch {}

    try {
      const urlParams = new URLSearchParams(String(location.search || ''));
      put('query:blobioSkin', urlParams.get('blobioSkin'));
      put('query:blobioCustomSkin', urlParams.get('blobioCustomSkin'));
    } catch {}

    try {
      const hashParams = new URLSearchParams(String(location.hash || '').replace(/^#/, ''));
      put('hash:blobioSkin', hashParams.get('blobioSkin'));
      put('hash:blobioCustomSkin', hashParams.get('blobioCustomSkin'));
    } catch {}

    return sources;
  }

  function pickValidUrlSource(sources) {
    for (const [source, value] of Object.entries(sources || {})) {
      const clean = String(value || '').trim();
      if (DIRECT_IMGUR_IMAGE_MATCH.test(clean)) {
        return { source, url: clean };
      }
    }

    return { source: '', url: '' };
  }

  function readActiveUrl(nextState) {
    return pickValidUrlSource(collectUrlSources(nextState)).url;
  }

  function log(message, detail = {}, stage = 'debug') {
    const event = {
      time: new Date().toISOString(),
      stage,
      message,
      detail: sanitize(detail),
    };
    state.debugEvents.push(event);
    while (state.debugEvents.length > DEBUG_LIMIT) state.debugEvents.shift();

    if (state.debug) {
      console.debug(LOG_PREFIX, message, event.detail || '');
    }
  }

  function sanitize(value, depth = 0) {
    if (value == null) return value;
    if (typeof value === 'string') return value.replace(/([?&]token=)[^&]+/gi, '$1<redacted>').slice(0, 600);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (depth > 2) return '[truncated]';
    if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitize(item, depth + 1));
    if (typeof value === 'object') {
      const out = {};
      for (const key of Object.keys(value).slice(0, 40)) {
        out[key] = /token|authorization|cookie|session|jwt|access/i.test(key)
          ? '<redacted>'
          : sanitize(value[key], depth + 1);
      }
      return out;
    }
    return String(value);
  }

  function ensureImage() {
    if (!state.enabled || !state.activeUrl || state.imageUrl === state.activeUrl) {
      return;
    }

    const img = new Image();
    state.image = img;
    state.imageUrl = state.activeUrl;
    state.imageReady = false;

    img.onload = () => {
      state.imageReady = true;
      log('custom skin image loaded', {
        url: state.imageUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
      }, 'image');
    };

    img.onerror = () => {
      state.imageReady = false;
      log('custom skin image failed to load', { url: state.imageUrl }, 'image');
    };

    img.src = state.activeUrl;
    log('custom skin image load started', { url: state.activeUrl }, 'image');
  }

  function ensureOverlay() {
    if (state.overlay && state.overlay.isConnected) {
      return;
    }

    const overlay = document.createElement('canvas');
    overlay.id = 'blobio-custom-skin-overlay';
    overlay.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'width:100vw',
      'height:100vh',
      'pointer-events:none',
      'z-index:2147481200',
      'display:block',
    ].join(';');

    state.overlay = overlay;
    state.ctx = overlay.getContext('2d');
    (document.body || document.documentElement)?.appendChild?.(overlay);
    log('overlay canvas installed', {}, 'overlay');
  }

  function findMainCanvas() {
    const canvases = Array.from(document.querySelectorAll('canvas'));
    let best = null;
    let bestArea = 0;

    for (const canvas of canvases) {
      if (canvas === state.overlay) continue;
      const rect = canvas.getBoundingClientRect?.();
      const width = rect?.width || canvas.clientWidth || canvas.width || 0;
      const height = rect?.height || canvas.clientHeight || canvas.height || 0;
      const area = width * height;
      if (area > bestArea && width >= 240 && height >= 180) {
        best = canvas;
        bestArea = area;
      }
    }

    state.mainCanvas = best || state.mainCanvas;
    return state.mainCanvas;
  }

  function renderLoop() {
    const raf = window.requestAnimationFrame || ((callback) => setTimeout(callback, 16));
    raf(renderLoop);

    refresh();
    ensureImage();
    ensureOverlay();

    const overlay = state.overlay;
    const ctx = state.ctx;
    if (!overlay || !ctx) return;

    const cssWidth = window.innerWidth || document.documentElement?.clientWidth || 0;
    const cssHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    const pxWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pxHeight = Math.max(1, Math.round(cssHeight * dpr));

    if (overlay.width !== pxWidth) overlay.width = pxWidth;
    if (overlay.height !== pxHeight) overlay.height = pxHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (!state.enabled || !state.imageReady || !state.image) {
      state.drawn = 0;
      return;
    }

    const canvas = findMainCanvas();
    const rect = canvas?.getBoundingClientRect?.() || { left: 0, top: 0, width: cssWidth, height: cssHeight };
    state.lastViewport = { width: Math.round(cssWidth), height: Math.round(cssHeight), dpr, visualViewportScale: Number(window.visualViewport?.scale || 1) };
    state.lastCanvasRect = { left: Math.round(rect.left || 0), top: Math.round(rect.top || 0), width: Math.round(rect.width || 0), height: Math.round(rect.height || 0) };
    updateCameraFromOwnCells();

    if (!state.ownIds.size) {
      state.ownNodeMissFrames += 1;
    }

    const freshCircles = getFreshScreenCircles(rect);
    state.screenCircleCandidates = freshCircles.length;
    state.screenCircleMatches = [];

    let drawn = 0;
    const usedCircles = new Set();
    const ownNodes = buildOwnRenderNodes();
    updateCameraFromRenderNodes(ownNodes);
    const webglTransform = selectBestWebglTransform(ownNodes, rect);

    for (const node of ownNodes) {
      const matchedCircle = webglTransform
        ? null
        : pickBestScreenCircleForNode(node, freshCircles, usedCircles, rect, ownNodes);
      let screen;
      let radius;
      let mode;
      let drawRect = rect;

      if (webglTransform) {
        const projected = projectWithWebglTransform(node, webglTransform);
        screen = { x: projected.x, y: projected.y };
        radius = projected.radius;
        drawRect = webglTransform.rect;
        mode = 'webgl-matrix';
      } else if (matchedCircle) {
        usedCircles.add(matchedCircle.index);
        screen = { x: matchedCircle.x, y: matchedCircle.y };
        radius = matchedCircle.r;
        mode = 'screen-circle';
      } else {
        screen = worldToScreen(node.x, node.y, rect);
        radius = Math.max(4, Math.abs(node.size * getEffectiveCameraScale()));
        mode = 'world-transform';
      }

      const drawRadius = Math.max(MIN_CELL_SCREEN_RADIUS, radius * CELL_BORDER_OVERDRAW);
      if (!isFinite(screen.x) || !isFinite(screen.y) || !isFinite(drawRadius)) continue;
      if (screen.x + drawRadius < drawRect.left || screen.y + drawRadius < drawRect.top || screen.x - drawRadius > drawRect.left + drawRect.width || screen.y - drawRadius > drawRect.top + drawRect.height) continue;

      drawSkinCircle(ctx, state.image, screen.x, screen.y, drawRadius);
      state.screenCircleMatches.push({
        id: node.id,
        mode,
        x: Math.round(screen.x),
        y: Math.round(screen.y),
        r: Math.round(drawRadius),
        rawR: Math.round(radius),
        worldX: node.x,
        worldY: node.y,
        size: node.size,
        ownership: node.ownership || (state.ownIds.has(node.id) ? 'confirmed' : 'inferred'),
        inferScore: node.inferScore ?? null,
      });
      drawn += 1;
    }

    state.renderMode = state.screenCircleMatches.some((item) => item.mode === 'webgl-matrix')
      ? 'webgl-matrix'
      : (state.screenCircleMatches.some((item) => item.mode === 'screen-circle')
        ? 'screen-circle'
        : (state.inferredOwnIds.size ? 'sibling-id' : 'world-transform'));
    state.drawn = drawn;
    state.frame += 1;

    if (state.debug && state.frame % 60 === 0) {
      log('overlay frame', {
        drawn,
        ownIds: state.ownIds.size,
        nodes: state.nodes.size,
        camera: state.camera,
        renderMode: state.renderMode,
        screenCircleCandidates: state.screenCircleCandidates,
        screenCircleMatches: state.screenCircleMatches,
        ownRenderNodes: state.ownRenderNodes,
        ownClusterMatches: state.ownClusterMatches,
      }, 'overlay-frame');
    }
  }

  function drawSkinCircle(ctx, image, x, y, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    drawImageCover(ctx, image, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function drawImageCover(ctx, image, dx, dy, dWidth, dHeight) {
    const sourceWidth = image.naturalWidth || image.videoWidth || image.width || dWidth;
    const sourceHeight = image.naturalHeight || image.videoHeight || image.height || dHeight;
    if (!sourceWidth || !sourceHeight) {
      ctx.drawImage(image, dx, dy, dWidth, dHeight);
      return;
    }

    const sourceRatio = sourceWidth / sourceHeight;
    const destRatio = dWidth / dHeight;
    let sx = 0;
    let sy = 0;
    let sWidth = sourceWidth;
    let sHeight = sourceHeight;

    if (sourceRatio > destRatio) {
      sWidth = sourceHeight * destRatio;
      sx = (sourceWidth - sWidth) / 2;
    } else if (sourceRatio < destRatio) {
      sHeight = sourceWidth / destRatio;
      sy = (sourceHeight - sHeight) / 2;
    }

    ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  }

  function getFreshScreenCircles(canvasRect) {
    const now = performance.now();
    const maxR = Math.max(40, Math.min(canvasRect.width || window.innerWidth || 0, canvasRect.height || window.innerHeight || 0) * 0.42);
    const circles = [];

    for (let index = state.recentScreenCircles.length - 1; index >= 0; index -= 1) {
      const circle = state.recentScreenCircles[index];
      if (!circle || now - circle.t > SCREEN_CIRCLE_MAX_AGE_MS) continue;
      if (!Number.isFinite(circle.x) || !Number.isFinite(circle.y) || !Number.isFinite(circle.r)) continue;
      if (circle.r < MIN_CELL_SCREEN_RADIUS || circle.r > maxR) continue;
      if (circle.x + circle.r < canvasRect.left || circle.y + circle.r < canvasRect.top || circle.x - circle.r > canvasRect.left + canvasRect.width || circle.y - circle.r > canvasRect.top + canvasRect.height) continue;
      circles.push({ ...circle, index });
    }

    return dedupeCircles(circles).slice(0, 80);
  }

  function dedupeCircles(circles) {
    const result = [];
    for (const circle of circles.sort((a, b) => b.t - a.t)) {
      const duplicate = result.some((other) => {
        const dx = other.x - circle.x;
        const dy = other.y - circle.y;
        return Math.hypot(dx, dy) < Math.max(4, Math.min(other.r, circle.r) * 0.08) && Math.abs(other.r - circle.r) < Math.max(4, circle.r * 0.08);
      });
      if (!duplicate) result.push(circle);
      if (result.length >= 120) break;
    }
    return result;
  }

  function pickBestScreenCircleForNode(node, circles, usedCircles, rect, ownNodes) {
    if (!circles.length) return null;

    const predicted = worldToScreen(node.x, node.y, rect);
    const expectedRadius = Math.max(4, Math.abs(node.size * getEffectiveCameraScale()));
    const canvasCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    let best = null;
    let bestScore = Infinity;

    for (const circle of circles) {
      if (usedCircles.has(circle.index)) continue;

      const toPredicted = Math.hypot(circle.x - predicted.x, circle.y - predicted.y);
      const toCenter = Math.hypot(circle.x - canvasCenter.x, circle.y - canvasCenter.y);
      const radiusRatio = expectedRadius > 0 ? Math.abs(Math.log(Math.max(circle.r, 1) / Math.max(expectedRadius, 1))) : 0;
      const tooBigPenalty = circle.r > Math.min(rect.width, rect.height) * 0.35 ? 8 : 0;
      const centerWeight = ownNodes.length === 1 ? toCenter / Math.max(60, circle.r * 2.5) : 0;
      const predictedWeight = toPredicted / Math.max(30, circle.r * 2);
      const score = centerWeight + predictedWeight + radiusRatio * 0.8 + tooBigPenalty;

      if (score < bestScore) {
        bestScore = score;
        best = circle;
      }
    }

    return bestScore < 7 ? best : null;
  }

  function buildOwnRenderNodes() {
    const now = performance.now();
    const confirmed = Array.from(state.ownIds)
      .map((id) => state.nodes.get(id))
      .filter((node) => node && !node.removed && (!node.updatedAt || now - node.updatedAt <= OWN_CLUSTER_MAX_AGE_MS * 4));

    pruneSiblingCandidates(now);

    const confirmedIds = new Set(confirmed.map((node) => node.id));
    const siblings = Array.from(state.siblingOwnIds)
      .filter((id) => !confirmedIds.has(id))
      .map((id) => state.nodes.get(id))
      .filter((node) => node && !node.removed && (!node.updatedAt || now - node.updatedAt <= SIBLING_MAX_AGE_MS));

    state.inferredOwnIds.clear();
    for (const node of siblings) state.inferredOwnIds.add(node.id);

    const renderNodes = [
      ...confirmed.map((node) => ({ ...node, ownership: 'confirmed', inferScore: null })),
      ...siblings.map((node) => ({
        ...node,
        ownership: 'sibling-id',
        inferScore: state.siblingCandidateScores.get(node.id)?.score ?? null,
      })),
    ].sort((a, b) => (b.size || 0) - (a.size || 0)).slice(0, OWN_CLUSTER_LIMIT);

    state.ownClusterCandidates = state.siblingOwnCandidates.slice(-40);
    state.ownClusterMatches = siblings.map((node) => ({
      id: node.id,
      x: Math.round(node.x),
      y: Math.round(node.y),
      size: Math.round(node.size),
      score: state.siblingCandidateScores.get(node.id)?.score ?? null,
      observations: state.siblingCandidateScores.get(node.id)?.observations ?? null,
      ownership: 'sibling-id',
    }));
    state.siblingOwnMatches = state.ownClusterMatches;

    const smoothedNodes = renderNodes.map((node) => smoothRenderNode(node, now));

    state.ownRenderNodes = smoothedNodes.map((node) => ({
      id: node.id,
      rawId: node.rawId ?? null,
      ownership: node.ownership || 'confirmed',
      x: Math.round(node.x),
      y: Math.round(node.y),
      size: Math.round(node.size),
      targetX: Math.round(node.targetX ?? node.x),
      targetY: Math.round(node.targetY ?? node.y),
      targetSize: Math.round(node.targetSize ?? node.size),
      flags: node.flags || 0,
      extra: Number.isFinite(node.extra) ? node.extra : null,
      name: node.name || '',
      skin: node.skin || '',
      inferScore: node.inferScore ?? null,
    }));

    return smoothedNodes;
  }

  function updateSiblingOwnershipCandidates(records, protocol) {
    if (!records || !records.length || !state.ownIds.size) return;

    const now = performance.now();
    const confirmed = Array.from(state.ownIds)
      .map((id) => state.nodes.get(id))
      .filter((node) => node && !node.removed && Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.size));

    if (!confirmed.length) return;

    for (const record of records) {
      if (!record || !record.id || state.ownIds.has(record.id)) continue;
      if (!Number.isFinite(record.x) || !Number.isFinite(record.y) || !Number.isFinite(record.size)) continue;
      if (record.size < OWN_CLUSTER_MIN_SIZE || record.size > 2000) continue;

      let best = null;
      let bestScore = -Infinity;

      for (const own of confirmed) {
        const idDelta = (record.id >>> 0) - (own.id >>> 0);
        if (idDelta < 1 || idDelta > SIBLING_ID_WINDOW) continue;

        // Split cells are created after the primary owned node and keep the same
        // short-packet player signature. Viruses, pellets, boosters, coins and
        // other system cells use different flags and/or extra metadata.
        const recordFlags = record.flags || 0;
        const ownFlags = own.flags || 0;
        if ((recordFlags & 0x02) === 0 || (recordFlags & 0x21) !== 0) continue;
        if (recordFlags !== ownFlags) continue;
        if (Number.isFinite(record.extra) && Number.isFinite(own.extra) && record.extra !== own.extra) continue;

        const sizeRatio = record.size / Math.max(own.size || 1, 1);
        if (sizeRatio < 0.18 || sizeRatio > 1.45) continue;

        const distance = Math.hypot(record.x - own.x, record.y - own.y);
        const maxDistance = Math.max(260, (Math.max(own.size || 1, record.size || 1) + Math.min(own.size || 1, record.size || 1)) * SIBLING_MAX_DISTANCE_FACTOR);
        if (distance > maxDistance) continue;

        const score = (SIBLING_ID_WINDOW - idDelta) * 3
          + Math.max(0, 30 - (distance / Math.max(1, Math.max(own.size || 1, record.size || 1))))
          + Math.max(0, 20 - Math.abs(1 - sizeRatio) * 20);

        if (score > bestScore) {
          bestScore = score;
          best = {
            id: record.id,
            rawId: record.rawId ?? record.id,
            ownId: own.id,
            idDelta,
            distance: Math.round(distance),
            maxDistance: Math.round(maxDistance),
            size: Math.round(record.size),
            ownSize: Math.round(own.size),
            sizeRatio: Number(sizeRatio.toFixed(3)),
            flags: record.flags || 0,
            extra: Number.isFinite(record.extra) ? record.extra : null,
            ownFlags: own.flags || 0,
            ownExtra: Number.isFinite(own.extra) ? own.extra : null,
            score: Number(score.toFixed(2)),
            protocol,
          };
        }
      }

      if (!best) continue;

      const existing = state.siblingCandidateScores.get(record.id) || { score: 0, observations: 0, firstSeen: now };
      const next = {
        ...existing,
        score: Math.min(1000, existing.score + Math.max(1, best.score / 20)),
        observations: existing.observations + 1,
        lastSeen: now,
        detail: best,
      };
      state.siblingCandidateScores.set(record.id, next);

      const summary = { ...best, observations: next.observations, accumulatedScore: Number(next.score.toFixed(2)) };
      state.siblingOwnCandidates.push(summary);
      while (state.siblingOwnCandidates.length > 120) state.siblingOwnCandidates.shift();

      if (next.observations >= SIBLING_MIN_OBSERVATIONS && next.score >= 4) {
        state.siblingOwnIds.add(record.id);
      }
    }

    pruneSiblingCandidates(now);
  }

  function pruneSiblingCandidates(now = performance.now()) {
    for (const [id, candidate] of state.siblingCandidateScores.entries()) {
      if (!candidate || now - (candidate.lastSeen || candidate.firstSeen || 0) > SIBLING_MAX_AGE_MS) {
        state.siblingCandidateScores.delete(id);
        state.siblingOwnIds.delete(id);
      }
    }

    for (const id of Array.from(state.siblingOwnIds)) {
      if (!state.siblingCandidateScores.has(id) || !state.nodes.has(id)) {
        state.siblingOwnIds.delete(id);
      }
    }
  }

  function smoothRenderNode(node, now = performance.now()) {
    const targetX = Number(node.x);
    const targetY = Number(node.y);
    const targetSize = Number(node.size);
    let visual = state.visualNodes.get(node.id);

    if (!visual || !Number.isFinite(visual.x) || !Number.isFinite(visual.y) || !Number.isFinite(visual.size)) {
      visual = { x: targetX, y: targetY, size: targetSize, t: now };
      state.visualNodes.set(node.id, visual);
      return { ...node, targetX, targetY, targetSize };
    }

    const elapsed = now - visual.t;
    const dt = Math.max(0, Math.min(80, elapsed));
    const distance = Math.hypot(targetX - visual.x, targetY - visual.y);
    const snapDistance = Math.max(RENDER_SNAP_DISTANCE, targetSize * 18);

    if (distance > snapDistance || elapsed > 500) {
      visual.x = targetX;
      visual.y = targetY;
      visual.size = targetSize;
    } else {
      const alpha = 1 - Math.exp(-dt / RENDER_SMOOTHING_MS);
      visual.x += (targetX - visual.x) * alpha;
      visual.y += (targetY - visual.y) * alpha;
      visual.size += (targetSize - visual.size) * alpha;
    }

    visual.t = now;
    return {
      ...node,
      x: visual.x,
      y: visual.y,
      size: visual.size,
      targetX,
      targetY,
      targetSize,
    };
  }

  function weightedNodeCenter(nodes) {
    let totalWeight = 0;
    let x = 0;
    let y = 0;
    for (const node of nodes) {
      const weight = Math.max(1, (node.size || 1) * (node.size || 1));
      x += node.x * weight;
      y += node.y * weight;
      totalWeight += weight;
    }
    if (!totalWeight) return { x: 0, y: 0 };
    return { x: x / totalWeight, y: y / totalWeight };
  }

  function updateCameraFromRenderNodes(renderNodes) {
    if (!renderNodes || !renderNodes.length) {
      updateCameraFromOwnCells();
      return;
    }

    if (state.camera.source === 'server-position') return;

    const center = weightedNodeCenter(renderNodes);
    const totalSize = renderNodes.reduce((sum, node) => sum + Math.max(0, node.size || 0), 0);
    state.camera.x = center.x;
    state.camera.y = center.y;
    state.camera.source = state.inferredOwnIds.size ? 'packet-cluster-average' : 'own-cell-average';
    state.camera.scale = Math.max(0.18, Math.min(1.35, Math.pow(Math.min(64 / Math.max(totalSize, 1), 1), 0.38)));
    state.lastOwnCenter = { x: state.camera.x, y: state.camera.y, totalSize };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateCameraFromOwnCells() {
    const live = [];
    for (const id of state.ownIds) {
      const node = state.nodes.get(id);
      if (node && !node.removed) live.push(node);
    }

    if (!live.length) return;

    let totalWeight = 0;
    let x = 0;
    let y = 0;
    let totalSize = 0;

    for (const node of live) {
      const weight = Math.max(1, node.size * node.size);
      x += node.x * weight;
      y += node.y * weight;
      totalWeight += weight;
      totalSize += node.size;
    }

    if (totalWeight > 0 && state.camera.source !== 'server-position') {
      state.camera.x = x / totalWeight;
      state.camera.y = y / totalWeight;
      state.camera.source = 'own-cell-average';
    }

    if (!state.camera.scale || state.camera.scale <= 0 || state.camera.source !== 'server-position') {
      // Agar/MultiOgar-style clients use a scale close to 1 for small cells and zoom out as total size grows.
      // This is intentionally conservative; it is refined automatically if the server sends packet 0x11.
      state.camera.scale = Math.max(0.18, Math.min(1.35, Math.pow(Math.min(64 / Math.max(totalSize, 1), 1), 0.38)));
    }

    state.lastOwnCenter = { x: state.camera.x, y: state.camera.y, totalSize };
  }

  function getEffectiveCameraScale() {
    const baseScale = Number.isFinite(state.camera?.scale) && state.camera.scale > 0 ? state.camera.scale : 1;
    const zoomFactor = Number.isFinite(state.zoomFactor) && state.zoomFactor > 0 ? state.zoomFactor : 1;
    const effective = clamp(baseScale * zoomFactor, 0.04, 8);
    state.lastEffectiveScale = effective;
    return effective;
  }

  function readStoredZoomFactor() {
    try {
      const raw = localStorage.getItem(ZOOM_FACTOR_STORAGE_KEY);
      const value = Number.parseFloat(raw || '1');
      return Number.isFinite(value) && value > 0 ? clamp(value, ZOOM_FACTOR_MIN, ZOOM_FACTOR_MAX) : 1;
    } catch {
      return 1;
    }
  }

  function setZoomFactor(next, source = 'manual') {
    const value = clamp(Number.isFinite(next) ? next : 1, ZOOM_FACTOR_MIN, ZOOM_FACTOR_MAX);
    if (Math.abs(value - (state.zoomFactor || 1)) < 0.0001) return;
    state.zoomFactor = value;
    try { localStorage.setItem(ZOOM_FACTOR_STORAGE_KEY, String(Number(value.toFixed(5)))); } catch {}
    state.zoomEvents.push({ t: new Date().toISOString(), source, zoomFactor: Number(value.toFixed(5)) });
    while (state.zoomEvents.length > 40) state.zoomEvents.shift();
  }

  function worldToScreen(x, y, canvasRect) {
    const scale = getEffectiveCameraScale();
    return {
      x: canvasRect.left + canvasRect.width / 2 + (x - state.camera.x) * scale,
      y: canvasRect.top + canvasRect.height / 2 + (y - state.camera.y) * scale,
    };
  }


  function installWebglCameraTracker(win, label = 'window') {
    if (!win) return;

    for (const contextName of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
      const Context = win[contextName];
      const proto = Context?.prototype;
      if (!proto || proto.__blobioSkinWebglCameraTrackerV17) continue;

      const nativeUniformMatrix4fv = proto.uniformMatrix4fv;
      if (typeof nativeUniformMatrix4fv !== 'function') continue;

      proto.__blobioSkinWebglCameraTrackerV17 = true;
      proto.uniformMatrix4fv = function blobioTrackedUniformMatrix4fv(location, transpose, value, ...rest) {
        try {
          recordWebglMatrix(this, value, rest, label, contextName);
        } catch {}
        return nativeUniformMatrix4fv.call(this, location, transpose, value, ...rest);
      };

      state.webglHookCount += 1;
      recordFrameHook(label, `${contextName}.uniformMatrix4fv hooked`);
    }
  }

  function recordWebglMatrix(context, value, rest, label, contextName) {
    if (!value || typeof value.length !== 'number') return;

    const sourceOffset = Number.isInteger(rest?.[0]) ? rest[0] : 0;
    if (sourceOffset < 0 || sourceOffset + 16 > value.length) return;

    const matrix = Array.from({ length: 16 }, (_, index) => Number(value[sourceOffset + index]));
    if (!isLikelyOrthographicMatrix(matrix)) return;

    const canvas = context?.canvas;
    if (!canvas) return;

    const now = performance.now();
    const last = state.webglMatrices[state.webglMatrices.length - 1];
    if (last && last.canvas === canvas && matricesAlmostEqual(last.matrix, matrix)) {
      last.t = now;
      last.label = label;
      last.contextName = contextName;
      return;
    }

    state.webglMatrices.push({ canvas, matrix, t: now, label, contextName });
    if (state.webglMatrices.length > WEBGL_MATRIX_LIMIT) {
      state.webglMatrices.splice(0, state.webglMatrices.length - WEBGL_MATRIX_LIMIT);
    }
  }

  function isLikelyOrthographicMatrix(matrix) {
    if (!Array.isArray(matrix) || matrix.length !== 16 || matrix.some((value) => !Number.isFinite(value))) return false;
    if (Math.abs(matrix[15] - 1) > 0.02) return false;
    if (Math.abs(matrix[3]) > 0.0001 || Math.abs(matrix[7]) > 0.0001 || Math.abs(matrix[11]) > 0.0001) return false;

    const xScale = Math.hypot(matrix[0], matrix[1]);
    const yScale = Math.hypot(matrix[4], matrix[5]);
    if (xScale < 1e-7 || yScale < 1e-7 || xScale > 2 || yScale > 2) return false;

    return true;
  }

  function matricesAlmostEqual(a, b) {
    for (let index = 0; index < 16; index += 1) {
      if (Math.abs(a[index] - b[index]) > 1e-7) return false;
    }
    return true;
  }

  function selectBestWebglTransform(nodes, fallbackRect) {
    const now = performance.now();
    const fresh = state.webglMatrices.filter((item) => now - item.t <= WEBGL_MATRIX_MAX_AGE_MS);
    state.webglMatrices = fresh.slice(-WEBGL_MATRIX_LIMIT);
    state.webglMatrixMatches = [];

    if (!nodes?.length || !fresh.length) {
      state.activeWebglTransform = null;
      return null;
    }

    const weightedCenter = weightedNodeCenter(nodes);
    let best = null;

    for (const sample of fresh) {
      const rect = sample.canvas?.getBoundingClientRect?.();
      if (!rect || rect.width < 240 || rect.height < 180) continue;

      const transform = { ...sample, rect };
      const projectedCenter = projectPointWithMatrix(weightedCenter.x, weightedCenter.y, transform);
      const centerDistance = Math.hypot(
        projectedCenter.x - (rect.left + rect.width / 2),
        projectedCenter.y - (rect.top + rect.height / 2),
      );

      let inside = 0;
      let plausibleRadii = 0;
      for (const node of nodes) {
        const projected = projectWithWebglTransform(node, transform);
        const margin = Math.max(80, projected.radius * 3);
        if (
          projected.x >= rect.left - margin
          && projected.x <= rect.right + margin
          && projected.y >= rect.top - margin
          && projected.y <= rect.bottom + margin
        ) {
          inside += 1;
        }
        if (projected.radius >= 2 && projected.radius <= Math.min(rect.width, rect.height) * 0.48) {
          plausibleRadii += 1;
        }
      }

      const freshness = 1 - Math.min(1, (now - sample.t) / WEBGL_MATRIX_MAX_AGE_MS);
      const score = inside * 30
        + plausibleRadii * 8
        + freshness * 20
        - (centerDistance / Math.max(rect.width, rect.height)) * 90;

      const summary = {
        score: Number(score.toFixed(2)),
        inside,
        plausibleRadii,
        centerDistance: Math.round(centerDistance),
        ageMs: Math.round(now - sample.t),
        contextName: sample.contextName,
        label: sample.label,
        canvas: {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          top: Math.round(rect.top),
        },
        matrix: sample.matrix.map((value) => Number(value.toFixed(7))),
      };
      state.webglMatrixMatches.push(summary);

      if (!best || score > best.score) {
        best = { ...transform, score };
      }
    }

    state.webglMatrixMatches.sort((a, b) => b.score - a.score);
    state.webglMatrixMatches = state.webglMatrixMatches.slice(0, 12);

    if (!best || best.score < nodes.length * 18) {
      state.activeWebglTransform = null;
      return null;
    }

    const radiusScale = getWebglRadiusScale(best);
    state.lastEffectiveScale = radiusScale;
    state.activeWebglTransform = {
      score: Number(best.score.toFixed(2)),
      ageMs: Math.round(now - best.t),
      contextName: best.contextName,
      label: best.label,
      radiusScale: Number(radiusScale.toFixed(6)),
      canvas: {
        width: Math.round(best.rect.width),
        height: Math.round(best.rect.height),
        left: Math.round(best.rect.left),
        top: Math.round(best.rect.top),
      },
      matrix: best.matrix.map((value) => Number(value.toFixed(7))),
    };

    return best;
  }

  function projectWithWebglTransform(node, transform) {
    const point = projectPointWithMatrix(node.x, node.y, transform);
    return {
      x: point.x,
      y: point.y,
      radius: Math.abs(node.size * getWebglRadiusScale(transform)),
    };
  }

  function projectPointWithMatrix(x, y, transform) {
    const matrix = transform.matrix;
    const rect = transform.rect;
    const clipX = matrix[0] * x + matrix[4] * y + matrix[12];
    const clipY = matrix[1] * x + matrix[5] * y + matrix[13];

    return {
      x: rect.left + (clipX + 1) * rect.width / 2,
      y: rect.top + (1 - clipY) * rect.height / 2,
    };
  }

  function getWebglRadiusScale(transform) {
    const matrix = transform.matrix;
    const rect = transform.rect;
    const xScale = Math.hypot(matrix[0], matrix[1]) * rect.width / 2;
    const yScale = Math.hypot(matrix[4], matrix[5]) * rect.height / 2;
    return (Math.abs(xScale) + Math.abs(yScale)) / 2;
  }

  function installCanvasCircleTracker() {
    if (state.canvasHooked) return;
    const proto = window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype;
    if (!proto || proto.__blobioSkinCircleTrackerV17) return;
    proto.__blobioSkinCircleTrackerV17 = true;
    state.canvasHooked = true;

    const originalArc = proto.arc;
    const originalFill = proto.fill;
    const originalStroke = proto.stroke;

    proto.arc = function blobioTrackedArc(x, y, radius, startAngle, endAngle, anticlockwise) {
      try {
        if (isLikelyCellArc(this, x, y, radius, startAngle, endAngle)) {
          this.__blobioLastCellArc = normalizeArcToViewport(this.canvas, x, y, radius);
        }
      } catch {}
      return originalArc.call(this, x, y, radius, startAngle, endAngle, anticlockwise);
    };

    function recordAndCall(ctx, original, args) {
      try {
        const circle = ctx.__blobioLastCellArc;
        if (circle) {
          circle.t = performance.now();
          state.recentScreenCircles.push(circle);
          if (state.recentScreenCircles.length > SCREEN_CIRCLE_LIMIT) {
            state.recentScreenCircles.splice(0, state.recentScreenCircles.length - SCREEN_CIRCLE_LIMIT);
          }
          ctx.__blobioLastCellArc = null;
        }
      } catch {}
      return original.apply(ctx, args);
    }

    proto.fill = function blobioTrackedFill(...args) {
      return recordAndCall(this, originalFill, args);
    };

    proto.stroke = function blobioTrackedStroke(...args) {
      return recordAndCall(this, originalStroke, args);
    };

    log('canvas circle tracker installed', {}, 'canvas');
  }

  function isLikelyCellArc(ctx, x, y, radius, startAngle, endAngle) {
    if (!ctx || !ctx.canvas) return false;
    if (ctx.canvas === state.overlay) return false;
    const canvas = ctx.canvas;
    const rect = canvas.getBoundingClientRect?.();
    const width = rect?.width || canvas.clientWidth || canvas.width || 0;
    const height = rect?.height || canvas.clientHeight || canvas.height || 0;
    if (width < 240 || height < 180) return false;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) return false;
    if (radius < MIN_CELL_SCREEN_RADIUS) return false;
    const span = Math.abs((endAngle || 0) - (startAngle || 0));
    if (span < Math.PI * 1.6) return false;
    return true;
  }

  function normalizeArcToViewport(canvas, x, y, radius) {
    const rect = canvas.getBoundingClientRect?.() || { left: 0, top: 0, width: canvas.width || 0, height: canvas.height || 0 };
    const scaleX = rect.width && canvas.width ? rect.width / canvas.width : 1;
    const scaleY = rect.height && canvas.height ? rect.height / canvas.height : 1;
    return {
      x: rect.left + x * scaleX,
      y: rect.top + y * scaleY,
      r: Math.abs(radius) * ((Math.abs(scaleX) + Math.abs(scaleY)) / 2 || 1),
      canvasWidth: Math.round(rect.width || 0),
      canvasHeight: Math.round(rect.height || 0),
    };
  }

  function installSocketHooks() {
    hookWindow(window, 'top');
    installFrameWatchers(window);

    const scan = () => {
      state.frameScanCount += 1;
      scanFrames(window, 'scan', 0);
    };

    scan();

    for (const delay of [0, 1, 2, 5, 10, 20, 35, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000]) {
      setTimeout(scan, delay);
    }

    const fastScanStarted = Date.now();
    const fastScan = setInterval(() => {
      scan();
      if (Date.now() - fastScanStarted > 20000) {
        clearInterval(fastScan);
      }
    }, 10);

    setInterval(scan, 250);
  }

  function hookWindow(win, label) {
    if (!win) return;
    installWebglCameraTracker(win, label);
    if (!win.WebSocket) return;

    const NativeWebSocket = win.WebSocket;
    if (!NativeWebSocket.__blobioSkinOverlayConstructorHooked) {
      function WrappedWebSocket(url, protocols) {
        const socket = protocols !== undefined ? new NativeWebSocket(url, protocols) : new NativeWebSocket(url);
        hookSocket(socket, label, String(url || ''));
        return socket;
      }

      try {
        WrappedWebSocket.prototype = NativeWebSocket.prototype;
        Object.setPrototypeOf(WrappedWebSocket, NativeWebSocket);
        for (const key of Object.getOwnPropertyNames(NativeWebSocket)) {
          if (!(key in WrappedWebSocket)) {
            Object.defineProperty(WrappedWebSocket, key, Object.getOwnPropertyDescriptor(NativeWebSocket, key));
          }
        }
        WrappedWebSocket.__blobioSkinOverlayConstructorHooked = true;
        win.WebSocket = WrappedWebSocket;
        recordFrameHook(label, 'WebSocket constructor hooked');
      } catch (error) {
        recordFrameHook(label, `WebSocket constructor hook failed: ${String(error)}`);
      }
    }

    const proto = NativeWebSocket.prototype;

    if (proto && !proto.__blobioSkinOverlaySendHooked) {
      proto.__blobioSkinOverlaySendHooked = true;
      const nativeSend = proto.send;
      proto.send = function overlaySend(data) {
        hookSocket(this, label, safeSocketUrl(this));
        return nativeSend.call(this, data);
      };
      recordFrameHook(label, 'WebSocket.prototype.send hooked');
    }

    if (proto && !proto.__blobioSkinOverlayAddListenerHooked) {
      proto.__blobioSkinOverlayAddListenerHooked = true;
      const nativeAddEventListener = proto.addEventListener;
      proto.addEventListener = function overlayAddEventListener(type, listener, options) {
        hookSocket(this, label, safeSocketUrl(this));
        return nativeAddEventListener.call(this, type, listener, options);
      };
      recordFrameHook(label, 'WebSocket.prototype.addEventListener hooked');
    }
  }

  function hookSocket(socket, label, url) {
    if (!socket || socket.__blobioSkinOverlaySocket) return;
    socket.__blobioSkinOverlaySocket = true;
    state.sockets += 1;

    try { socket.binaryType = 'arraybuffer'; } catch {}

    const onMessage = (event) => {
      state.wsMessages += 1;
      handleSocketMessage(event.data, { label, url: safeSocketUrl(socket) || url });
    };

    try {
      socket.addEventListener?.('message', onMessage, true);
    } catch {}

    log('WebSocket observed', { label, url: redact(url), sockets: state.sockets }, 'network');
  }

  function safeSocketUrl(socket) {
    try { return String(socket.url || ''); } catch { return ''; }
  }

  function installFrameWatchers(win) {
    if (!win?.document || win.document.__blobioSkinOverlayFrameWatchers) return;
    win.document.__blobioSkinOverlayFrameWatchers = true;

    try {
      const observer = new win.MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes || []) {
            watchInsertedFrame(node, 'mutation');
          }
        }
        scanFrames(window, 'mutation', 0);
      });
      observer.observe(win.document.documentElement || win.document, { childList: true, subtree: true });
      recordFrameHook('observer', 'MutationObserver installed');
    } catch {}

    try {
      const nativeCreateElement = win.Document?.prototype?.createElement;
      if (nativeCreateElement && !win.Document.prototype.__blobioSkinOverlayCreateHooked) {
        win.Document.prototype.__blobioSkinOverlayCreateHooked = true;
        win.Document.prototype.createElement = function createElementOverlayHook(tagName, options) {
          const node = nativeCreateElement.call(this, tagName, options);
          if (/^(iframe|frame)$/i.test(String(tagName || ''))) {
            watchFrameElement(node, 'createElement');
            for (const delay of [0, 1, 5, 10, 20, 50, 100]) {
              setTimeout(() => scanFrames(window, 'createElement', 0), delay);
            }
          }
          return node;
        };
        recordFrameHook('document', 'createElement hook installed');
      }
    } catch {}

    try {
      const proto = win.Node?.prototype;
      if (proto && !proto.__blobioSkinOverlayInsertHooked) {
        proto.__blobioSkinOverlayInsertHooked = true;
        const nativeAppendChild = proto.appendChild;
        const nativeInsertBefore = proto.insertBefore;
        if (typeof nativeAppendChild === 'function') {
          proto.appendChild = function appendChildOverlayHook(node) {
            const result = nativeAppendChild.call(this, node);
            watchInsertedFrame(node, 'appendChild');
            return result;
          };
        }
        if (typeof nativeInsertBefore === 'function') {
          proto.insertBefore = function insertBeforeOverlayHook(node, before) {
            const result = nativeInsertBefore.call(this, node, before);
            watchInsertedFrame(node, 'insertBefore');
            return result;
          };
        }
        recordFrameHook('node', 'frame insertion hooks installed');
      }
    } catch {}
  }

  function watchInsertedFrame(node, reason) {
    if (!node || node.nodeType !== 1) return;
    try {
      if (/^(IFRAME|FRAME)$/i.test(node.tagName || '')) {
        watchFrameElement(node, reason);
      }
      for (const frame of node.querySelectorAll?.('iframe,frame') || []) {
        watchFrameElement(frame, `${reason}.descendant`);
      }
    } catch {}
  }

  function watchFrameElement(frame, reason) {
    if (!frame || frame.__blobioSkinOverlayWatched) return;
    frame.__blobioSkinOverlayWatched = true;

    const hookFrame = () => {
      try {
        if (frame.contentWindow) {
          hookWindow(frame.contentWindow, `frame:${reason}`);
          installFrameWatchers(frame.contentWindow);
          scanFrames(frame.contentWindow, `frame:${reason}`, 0);
        }
      } catch {}
    };

    hookFrame();
    try {
      frame.addEventListener?.('load', hookFrame, true);
    } catch {}

    for (const delay of [0, 1, 2, 5, 10, 20, 50, 100, 250, 500]) {
      setTimeout(hookFrame, delay);
    }
    recordFrameHook('frame', `watching ${reason}`);
  }

  function scanFrames(rootWin, label, depth) {
    if (!rootWin || depth > 4) return;
    try {
      hookWindow(rootWin, label);
      installFrameWatchers(rootWin);
    } catch {}

    try {
      for (let i = 0; i < rootWin.frames.length; i += 1) {
        const frameWin = rootWin.frames[i];
        hookWindow(frameWin, `${label}.frames[${i}]`);
        installFrameWatchers(frameWin);
        scanFrames(frameWin, `${label}.frames[${i}]`, depth + 1);
      }
    } catch {}

    try {
      for (const frame of rootWin.document?.querySelectorAll?.('iframe,frame') || []) {
        watchFrameElement(frame, `${label}.dom`);
        if (frame.contentWindow) {
          hookWindow(frame.contentWindow, `${label}.iframe`);
          scanFrames(frame.contentWindow, `${label}.iframe`, depth + 1);
        }
      }
    } catch {}
  }

  function recordFrameHook(label, note) {
    state.frameHooks.push({ time: new Date().toISOString(), label, note });
    while (state.frameHooks.length > 120) state.frameHooks.shift();
  }

  function handleSocketMessage(data, meta) {
    const packet = toUint8Array(data);
    if (!packet || packet.length === 0) return;

    const opcode = packet[0];
    state.opCounts[opcode] = (state.opCounts[opcode] || 0) + 1;
    if (state.earlyPackets.length < 160) {
      state.earlyPackets.push({
        time: new Date().toISOString(),
        opcode,
        length: packet.length,
        first8: Array.from(packet.slice(0, Math.min(8, packet.length))),
        meta: sanitize(meta),
      });
    }
    if (opcode === 0x20) {
      parseAddNode(packet, meta);
      return;
    }

    if (opcode === 0x31) {
      parseOwnNodeList(packet, meta);
      return;
    }

    if (opcode === 0x10) {
      parseUpdateNodes(packet, meta);
      return;
    }

    if (opcode === 0x11) {
      parseUpdatePosition(packet);
      return;
    }

    if (opcode === 0x12 || opcode === 0x14) {
      state.nodes.clear();
      state.ownIds.clear();
      state.inferredOwnIds.clear();
      state.siblingCandidateScores.clear();
      state.siblingOwnIds.clear();
      state.siblingOwnCandidates = [];
      state.siblingOwnMatches = [];
      state.camera.source = 'average';
      log('clear nodes packet', { opcode }, 'packet');
    }
  }

  function toUint8Array(data) {
    try {
      const tag = Object.prototype.toString.call(data);
      if (data instanceof ArrayBuffer || tag === '[object ArrayBuffer]') {
        return new Uint8Array(data);
      }
      if (ArrayBuffer.isView(data) || /\[object (?:Uint8|Int8|Uint16|Int16|Uint32|Int32|Float32|Float64|BigInt64|BigUint64|DataView|Uint8Clamped)Array\]/.test(tag) || tag === '[object DataView]') {
        return new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength || 0);
      }
    } catch {}

    return null;
  }

  function parseAddNode(packet, meta) {
    if (packet.length < 5) return;
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    const id = view.getUint32(1, true) >>> 0;
    if (!id) return;

    addOwnId(id, 'add-node', meta);
    state.addNodePackets += 1;
  }

  function parseOwnNodeList(packet, meta) {
    // Blobgame short-packet mode uses opcode 0x31 (decimal 49).
    // v12 deliberately records the full packet sample because recent logs show
    // opcode 49 packets with extra trailing bytes that may contain more owned-cell state.
    state.ownListPackets += 1;
    const sample = buildOwnListPacketSample(packet, meta);
    state.ownListPacketSamples.push(sample);
    while (state.ownListPacketSamples.length > 40) state.ownListPacketSamples.shift();

    if (packet.length < 7) {
      log('own node list packet too short', sample, 'packet-own-list');
      return;
    }

    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    const count32 = view.getUint32(1, true);
    const count16 = view.getUint16(1, true);
    const count8 = view.getUint8(1);
    const count = count32 > 0 && count32 <= OWN_ID_LIMIT ? count32 : (count16 > 0 && count16 <= OWN_ID_LIMIT ? count16 : count8);
    if (!Number.isFinite(count) || count <= 0 || count > OWN_ID_LIMIT) {
      log('own node list count rejected', { sample, count8, count16, count32 }, 'packet-own-list');
      return;
    }

    let offset = count === count32 ? 5 : (count === count16 ? 3 : 2);
    let added = 0;
    const ids = [];

    for (let index = 0; index < count && offset < packet.length; index += 1) {
      let id = 0;
      if (offset + 4 <= packet.length) {
        id = view.getUint32(offset, true) >>> 0;
        offset += 4;
      } else if (offset + 2 <= packet.length) {
        id = view.getUint16(offset, true) >>> 0;
        offset += 2;
      } else {
        break;
      }

      if (id) {
        addOwnId(id, 'own-list', meta);
        ids.push(id);
        added += 1;
      }
    }

    if (added > 0) {
      state.ownListParsedPackets += 1;
      log('own node list parsed', {
        added,
        ids,
        ownIds: Array.from(state.ownIds),
        parseLayout: { count, count8, count16, count32, nextOffset: offset, trailingBytes: Math.max(0, packet.length - offset) },
        sample,
        meta,
      }, 'packet');
    }
  }

  function buildOwnListPacketSample(packet, meta) {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    const bytes = Array.from(packet.slice(0, Math.min(packet.length, 128)));
    const first64 = Array.from(packet.slice(0, Math.min(packet.length, 64)));
    const hex = first64.map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
    const byteCount = packet.length;

    const safeUint8 = (offset) => offset < byteCount ? view.getUint8(offset) : null;
    const safeUint16 = (offset) => offset + 2 <= byteCount ? view.getUint16(offset, true) >>> 0 : null;
    const safeUint32 = (offset) => offset + 4 <= byteCount ? view.getUint32(offset, true) >>> 0 : null;

    const parseIds = (offset, width, count) => {
      const ids = [];
      const maxCount = Math.min(count || 12, 16);
      for (let index = 0; index < maxCount; index += 1) {
        const at = offset + index * width;
        const id = width === 4 ? safeUint32(at) : safeUint16(at);
        if (id === null || id === undefined) break;
        ids.push(id >>> 0);
      }
      return ids;
    };

    const offsetGuesses = [];
    for (let offset = 1; offset <= Math.min(16, Math.max(1, byteCount - 2)); offset += 1) {
      const le16 = parseIds(offset, 2, 8).filter((id) => id > 0);
      const le32 = parseIds(offset, 4, 8).filter((id) => id > 0);
      const nearbyOwn16 = le16.filter((id) => isNearKnownOwnId(id));
      const nearbyOwn32 = le32.filter((id) => isNearKnownOwnId(id));
      if (le16.length || le32.length) {
        offsetGuesses.push({
          offset,
          u8: safeUint8(offset),
          u16: safeUint16(offset),
          u32: safeUint32(offset),
          le16,
          le32,
          nearbyOwn16,
          nearbyOwn32,
        });
      }
    }

    const count8 = safeUint8(1);
    const count16 = safeUint16(1);
    const count32 = safeUint32(1);
    const standardLayouts = {
      count8At1IdsU16At2: count8 && count8 <= OWN_ID_LIMIT ? parseIds(2, 2, count8) : [],
      count8At1IdsU32At2: count8 && count8 <= OWN_ID_LIMIT ? parseIds(2, 4, count8) : [],
      count16At1IdsU16At3: count16 && count16 <= OWN_ID_LIMIT ? parseIds(3, 2, count16) : [],
      count16At1IdsU32At3: count16 && count16 <= OWN_ID_LIMIT ? parseIds(3, 4, count16) : [],
      count32At1IdsU16At5: count32 && count32 <= OWN_ID_LIMIT ? parseIds(5, 2, count32) : [],
      count32At1IdsU32At5: count32 && count32 <= OWN_ID_LIMIT ? parseIds(5, 4, count32) : [],
    };

    const matchedKnownOwnIds = [];
    for (const [layout, ids] of Object.entries(standardLayouts)) {
      for (const id of ids) {
        if (state.ownIds.has(id)) matchedKnownOwnIds.push({ layout, id });
      }
    }

    return sanitize({
      t: new Date().toISOString(),
      opcode: packet[0],
      length: byteCount,
      bytes,
      bytesTruncated: byteCount > bytes.length,
      first64,
      hexFirst64: hex,
      meta,
      countCandidates: { count8, count16, count32 },
      standardLayouts,
      matchedKnownOwnIds,
      offsetGuesses,
      knownOwnIds: Array.from(state.ownIds),
    });
  }

  function isNearKnownOwnId(id) {
    if (!id || !state.ownIds.size) return false;
    for (const ownId of state.ownIds) {
      if (Math.abs((id >>> 0) - (ownId >>> 0)) <= 64) return true;
    }
    return false;
  }

  function addOwnId(id, source, meta) {
    if (!id) return;

    state.ownIds.add(id >>> 0);
    while (state.ownIds.size > OWN_ID_LIMIT) {
      state.ownIds.delete(state.ownIds.values().next().value);
    }

    log('own node added', { id, source, ownIds: state.ownIds.size, meta }, 'packet');
  }

  function parseUpdatePosition(packet) {
    if (packet.length < 13) return;
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    const x = view.getFloat32(1, true);
    const y = view.getFloat32(5, true);
    const scale = view.getFloat32(9, true);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(scale) && scale > 0 && scale < 10) {
      state.camera = { x, y, scale, source: 'server-position' };
    }
  }

  function getLocalPlayerName() {
    const candidates = [];
    try { candidates.push(localStorage.getItem('config-username')); } catch {}
    try { candidates.push(localStorage.getItem('blobio.username')); } catch {}
    try { candidates.push(localStorage.getItem('blobio.name')); } catch {}
    try { candidates.push(window.__blobioSharedStorageBridge?.getItem?.('config-username')); } catch {}
    try { candidates.push(readCookie('config-username')); } catch {}

    for (const value of candidates) {
      const normalized = normalizePlayerName(value);
      if (normalized) return normalized;
    }

    return state.localPlayerName || '';
  }

  function normalizePlayerName(value) {
    if (value === undefined || value === null) return '';
    let text = String(value);
    try { text = decodeURIComponent(text); } catch {}
    text = text.replace(/[\u0000<>]/g, '').trim();
    return text.slice(0, 32);
  }

  function rememberPacketName(name, recordId, source) {
    const normalized = normalizePlayerName(name);
    if (!normalized) return;

    if (!state.localPlayerName && state.ownIds.has(recordId)) {
      state.localPlayerName = normalized;
      log('local player name learned from owned packet record', { name: normalized, recordId, source }, 'identity');
    }
  }

  function isOwnName(name) {
    const normalized = normalizePlayerName(name);
    if (!normalized) return false;
    const configured = getLocalPlayerName();
    if (!configured) return false;
    return normalized === configured;
  }

  function decodeNodeId(rawId) {
    const raw = rawId >>> 0;
    if (state.scrambleId === null || state.scrambleId === undefined) return raw;
    return (raw ^ state.scrambleId) >>> 0;
  }

  function learnScrambleIdFromParsedRecords(records) {
    if (!state.ownIds.size || !records || !records.length) return;

    for (const record of records) {
      const rawId = record.rawId >>> 0;
      if (!rawId) continue;
      if (!Number.isFinite(record.x) || !Number.isFinite(record.y) || !Number.isFinite(record.size)) continue;
      if (Math.abs(record.x) > 100000 || Math.abs(record.y) > 100000 || record.size <= 0 || record.size > 10000) continue;

      for (const ownId of state.ownIds) {
        const candidate = (rawId ^ (ownId >>> 0)) >>> 0;
        // MultiOgarBlob scrambles IDs with XOR. In Blobgame short mode the low 16 bits commonly stay aligned.
        // Repeated evidence from the same candidate is safer than one-off matching.
        const plausible = ((rawId & 0xffff) === ((ownId >>> 0) & 0xffff)) || candidate === 0 || (candidate & 0xffff) === 0;
        if (!plausible) continue;

        const key = String(candidate >>> 0);
        state.scrambleCandidates[key] = (state.scrambleCandidates[key] || 0) + 1;
        if (state.scrambleCandidates[key] >= 2 || state.scrambleId === null) {
          state.scrambleId = candidate >>> 0;
        }
      }
    }
  }

  function applyDecodedIds(records) {
    for (const record of records) {
      record.id = decodeNodeId(record.rawId >>> 0);
    }
  }

  function parseUpdateNodes(packet, meta) {
    const candidates = [
      parseUpdateNodesProtocol6(packet),
      parseUpdateNodesProtocol5(packet),
      parseUpdateNodesProtocol4(packet),
      parseUpdateNodesShort(packet),
    ].filter((item) => item && item.ok);

    const shortCandidate = candidates.find((candidate) => candidate.protocol === 'short') || null;
    const shortOwnRecords = shortCandidate
      ? shortCandidate.records.filter((record) => state.ownIds.has((record.rawId ?? record.id) >>> 0))
      : [];

    if (shortCandidate) {
      state.shortModeConfidence = Math.min(
        20,
        state.shortModeConfidence + (shortOwnRecords.length ? 2 : 1),
      );
      if (state.shortModeConfidence >= SHORT_MODE_LOCK_THRESHOLD) {
        state.packetMode = 'short';
        state.scrambleId = 0;
      }
    }

    let parsed = null;

    if (state.packetMode === 'short') {
      parsed = shortCandidate;
    } else if (shortOwnRecords.length) {
      parsed = shortCandidate;
      state.packetMode = 'short';
      state.shortModeConfidence = SHORT_MODE_LOCK_THRESHOLD;
      state.scrambleId = 0;
    } else {
      parsed = candidates.sort((a, b) => scoreParse(b) - scoreParse(a))[0] || null;
      if (parsed && parsed.protocol !== 'short') {
        learnScrambleIdFromParsedRecords(parsed.records);
        applyDecodedIds(parsed.records);
      }
    }

    if (parsed?.protocol === 'short') {
      for (const record of parsed.records) {
        record.id = (record.rawId ?? record.id) >>> 0;
      }
    }

    const sample = buildUpdateNodeSample(packet, meta, candidates, parsed);
    rememberUpdateNodeSample(sample);

    if (!parsed) {
      if (state.packetMode === 'short' && candidates.length) {
        state.ignoredNonShortPackets += 1;
        state.lastPacketSummary = {
          protocol: 'ignored-non-short',
          records: 0,
          removed: 0,
          ownRecords: 0,
          shortOwnUpdates: 0,
          length: packet.length,
        };
        if (sample) {
          sample.ignored = {
            reason: 'short-mode-locked',
            candidateProtocols: candidates.map((candidate) => candidate.protocol),
          };
        }
        return;
      }

      state.updateParseErrors += 1;
      if (sample) sample.failed = true;
      if (state.debug) log('update packet parse failed', { length: packet.length, meta, sample }, 'packet-error');
      return;
    }

    applyUpdateParse(parsed);
    const shortOwnUpdates = parsed.protocol === 'short' ? 0 : applyShortOwnRecordFallback(packet, meta);
    state.updatePackets += 1;
    state.lastPacketSummary = {
      protocol: parsed.protocol,
      packetMode: state.packetMode,
      records: parsed.records.length,
      removed: parsed.removed.length,
      ownRecords: parsed.records.filter((record) => state.ownIds.has(record.id)).length,
      shortOwnUpdates,
      length: packet.length,
    };

    if (sample) {
      sample.applied = {
        shortOwnUpdates,
        packetMode: state.packetMode,
        ownIdsAfter: Array.from(state.ownIds),
        siblingOwnIdsAfter: Array.from(state.siblingOwnIds),
        ownRenderNodeIdsAfter: state.ownRenderNodes.map((node) => node.id),
        lastPacketSummary: state.lastPacketSummary,
      };
    }
  }

  function buildUpdateNodeSample(packet, meta, candidates, parsed) {
    if (!packet || packet.length < 1) return null;

    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    const bytes = Array.from(packet.slice(0, Math.min(packet.length, 192)));
    const first64 = Array.from(packet.slice(0, Math.min(packet.length, 64)));
    const hexFirst64 = first64.map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
    const knownOwnIds = Array.from(state.ownIds).map((id) => id >>> 0);
    const knownSiblingIds = Array.from(state.siblingOwnIds).map((id) => id >>> 0);
    const ownNodes = knownOwnIds.map((id) => state.nodes.get(id)).filter(Boolean);

    const safeUint16 = (offset) => offset + 2 <= packet.length ? view.getUint16(offset, true) >>> 0 : null;
    const safeUint32 = (offset) => offset + 4 <= packet.length ? view.getUint32(offset, true) >>> 0 : null;

    const idOffsetHits = [];
    for (let offset = 1; offset < packet.length - 1; offset += 1) {
      const u16 = safeUint16(offset);
      const u32 = safeUint32(offset);
      const hit = { offset };
      let matched = false;
      if (knownOwnIds.includes(u16)) {
        hit.u16 = u16;
        hit.match = 'own-u16';
        matched = true;
      }
      if (knownOwnIds.includes(u32)) {
        hit.u32 = u32;
        hit.match = hit.match ? `${hit.match}+own-u32` : 'own-u32';
        matched = true;
      }
      if (knownSiblingIds.includes(u16)) {
        hit.u16 = u16;
        hit.match = hit.match ? `${hit.match}+sibling-u16` : 'sibling-u16';
        matched = true;
      }
      if (knownSiblingIds.includes(u32)) {
        hit.u32 = u32;
        hit.match = hit.match ? `${hit.match}+sibling-u32` : 'sibling-u32';
        matched = true;
      }
      if (matched) idOffsetHits.push(hit);
      if (idOffsetHits.length >= 80) break;
    }

    const compactCandidates = candidates.map((candidate) => compactUpdateCandidate(candidate, knownOwnIds, ownNodes));
    const chosen = parsed ? compactUpdateCandidate(parsed, knownOwnIds, ownNodes) : null;
    const chosenNearOwn = chosen ? chosen.interestingRecords : [];
    const rawShortCandidate = candidates.find((candidate) => candidate.protocol === 'short');

    return {
      t: new Date().toISOString(),
      opcode: 0x10,
      length: packet.length,
      bytes,
      bytesTruncated: packet.length > bytes.length,
      first64,
      hexFirst64,
      meta: sanitize(meta),
      knownOwnIds,
      knownSiblingIds,
      selectedProtocol: parsed ? parsed.protocol : null,
      selectedScore: parsed ? scoreParse(parsed) : 0,
      idOffsetHits,
      candidates: compactCandidates,
      chosen,
      chosenNearOwn,
      shortCandidateInterestingRecords: rawShortCandidate ? compactUpdateCandidate(rawShortCandidate, knownOwnIds, ownNodes).interestingRecords : [],
    };
  }

  function rememberUpdateNodeSample(sample) {
    if (!sample) return;
    const hasOwnSignal = Boolean(
      sample.idOffsetHits.length ||
      sample.chosenNearOwn.length ||
      sample.shortCandidateInterestingRecords.length ||
      (sample.chosen && sample.chosen.ownRecords > 0)
    );
    const shouldKeep = hasOwnSignal || state.updateNodeSamples.length < 12 || sample.length > 120;
    if (!shouldKeep) return;

    state.updateNodeSamples.push(sample);
    while (state.updateNodeSamples.length > 80) state.updateNodeSamples.shift();

    state.updateNodeParseSummaries.push({
      t: sample.t,
      length: sample.length,
      selectedProtocol: sample.selectedProtocol,
      selectedScore: sample.selectedScore,
      knownOwnIds: sample.knownOwnIds,
      knownSiblingIds: sample.knownSiblingIds,
      idOffsetHitCount: sample.idOffsetHits.length,
      chosenNearOwnCount: sample.chosenNearOwn.length,
      shortInterestingCount: sample.shortCandidateInterestingRecords.length,
      candidateSummaries: sample.candidates.map((candidate) => ({
        protocol: candidate.protocol,
        score: candidate.score,
        records: candidate.records,
        removed: candidate.removed,
        ownRecords: candidate.ownRecords,
        siblingRecords: candidate.siblingRecords,
        interestingRecords: candidate.interestingRecords.length,
      })),
    });
    while (state.updateNodeParseSummaries.length > 120) state.updateNodeParseSummaries.shift();
  }

  function compactUpdateCandidate(candidate, knownOwnIds, ownNodes) {
    const records = Array.isArray(candidate.records) ? candidate.records : [];
    const removed = Array.isArray(candidate.removed) ? candidate.removed : [];
    const ownSet = new Set(knownOwnIds || []);
    const siblingSet = state.siblingOwnIds || new Set();
    const localName = getLocalPlayerName();
    const interestingRecords = [];

    for (const record of records) {
      const id = record.id >>> 0;
      const rawId = (record.rawId ?? record.id) >>> 0;
      const normalizedName = normalizePlayerName(record.name || '');
      const isOwn = ownSet.has(id) || ownSet.has(rawId);
      const isSibling = siblingSet.has(id) || siblingSet.has(rawId);
      const idDelta = nearestIdDelta(id, knownOwnIds);
      const lowDelta = nearestIdDelta(id & 0xffff, (knownOwnIds || []).map((ownId) => ownId & 0xffff));
      const nearbyOwn = nearestOwnNodeDistance(record, ownNodes || []);
      const similarSize = (nearbyOwn && nearbyOwn.sizeRatio >= 0.45 && nearbyOwn.sizeRatio <= 2.25) || false;
      const nameMatch = Boolean(localName && normalizedName && normalizedName === localName);
      const interesting = isOwn || isSibling || nameMatch || idDelta <= 32 || lowDelta <= 32 || (nearbyOwn && nearbyOwn.distance <= Math.max(2200, (nearbyOwn.ownSize + record.size) * 18) && similarSize);
      if (!interesting) continue;

      interestingRecords.push({
        id,
        rawId,
        x: record.x,
        y: record.y,
        size: record.size,
        flags: record.flags || 0,
        name: record.name || '',
        skin: record.skin || '',
        ownership: isOwn ? 'known-own' : (isSibling ? 'known-sibling' : (nameMatch ? 'name-match' : 'candidate')),
        idDelta: Number.isFinite(idDelta) ? idDelta : null,
        lowDelta: Number.isFinite(lowDelta) ? lowDelta : null,
        distanceToNearestOwn: nearbyOwn ? Math.round(nearbyOwn.distance) : null,
        nearestOwnId: nearbyOwn ? nearbyOwn.ownId : null,
        ownSize: nearbyOwn ? nearbyOwn.ownSize : null,
        sizeRatio: nearbyOwn ? Number(nearbyOwn.sizeRatio.toFixed(3)) : null,
      });
      if (interestingRecords.length >= 80) break;
    }

    return {
      protocol: candidate.protocol,
      score: scoreParse(candidate),
      records: records.length,
      removed: removed.length,
      offset: candidate.offset,
      length: candidate.length,
      exactLength: candidate.offset === candidate.length,
      ownRecords: records.filter((record) => ownSet.has(record.id >>> 0)).length,
      siblingRecords: records.filter((record) => siblingSet.has(record.id >>> 0)).length,
      nameMatches: records.filter((record) => localName && normalizePlayerName(record.name || '') === localName).length,
      removedNearOwn: removed.filter((id) => nearestIdDelta(id >>> 0, knownOwnIds) <= 32).slice(0, 40),
      interestingRecords,
      sampleRecords: records.slice(0, 14).map((record) => ({
        id: record.id >>> 0,
        rawId: (record.rawId ?? record.id) >>> 0,
        x: record.x,
        y: record.y,
        size: record.size,
        flags: record.flags || 0,
        name: record.name || '',
        skin: record.skin || '',
      })),
    };
  }

  function nearestIdDelta(id, ids) {
    if (!ids || !ids.length) return Infinity;
    let best = Infinity;
    for (const item of ids) {
      const delta = Math.abs((id >>> 0) - (item >>> 0));
      if (delta < best) best = delta;
    }
    return best;
  }

  function nearestOwnNodeDistance(record, ownNodes) {
    if (!record || !ownNodes || !ownNodes.length) return null;
    let best = null;
    for (const node of ownNodes) {
      if (!node || !Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
      const dx = (record.x || 0) - node.x;
      const dy = (record.y || 0) - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const ownSize = Number(node.size) || 0;
      const size = Number(record.size) || 0;
      const sizeRatio = ownSize > 0 && size > 0 ? size / ownSize : 0;
      if (!best || distance < best.distance) {
        best = { distance, ownId: node.id, ownSize, sizeRatio };
      }
    }
    return best;
  }

  function scoreParse(parsed) {
    let score = parsed.records.length * 2 + parsed.removed.length;
    for (const record of parsed.records) {
      if (state.ownIds.has(record.id)) score += 100;
      if (Math.abs(record.x) < 100000 && Math.abs(record.y) < 100000 && record.size > 0 && record.size < 10000) score += 1;
    }
    if (parsed.protocol === 'short') score += 6;
    if (parsed.offset === parsed.length) score += 4;
    return score;
  }

  function applyUpdateParse(parsed) {
    const now = performance.now();
    const configuredName = getLocalPlayerName();

    if (state.packetMode === 'short' && parsed.protocol !== 'short') {
      state.ignoredNonShortPackets += 1;
      return;
    }

    for (const record of parsed.records) {
      if (!record.id) continue;
      if (!Number.isFinite(record.x) || !Number.isFinite(record.y) || !Number.isFinite(record.size)) {
        state.rejectedUpdateRecords += 1;
        continue;
      }
      if (Math.abs(record.x) > 100000 || Math.abs(record.y) > 100000 || record.size <= 0 || record.size > 10000) {
        state.rejectedUpdateRecords += 1;
        continue;
      }

      const previousNode = state.nodes.get(record.id);
      if (state.ownIds.has(record.id) && previousNode) {
        const jump = Math.hypot(record.x - previousNode.x, record.y - previousNode.y);
        const maxJump = Math.max(2200, (previousNode.size || record.size || 1) * 45);
        const sizeRatio = record.size / Math.max(previousNode.size || 1, 1);
        if (jump > maxJump || sizeRatio < 0.04 || sizeRatio > 24) {
          state.rejectedUpdateRecords += 1;
          continue;
        }
      }

      rememberPacketName(record.name, record.id, parsed.protocol);

      if (record.name && isOwnName(record.name)) {
        addOwnId(record.id, 'packet-name-match', { protocol: parsed.protocol, name: record.name });
        state.packetNameMatches.push({
          t: new Date().toISOString(),
          id: record.id,
          rawId: record.rawId ?? null,
          name: record.name,
          protocol: parsed.protocol,
        });
        while (state.packetNameMatches.length > 80) state.packetNameMatches.shift();
      }

      if (state.ownIds.has(record.id)) {
        state.rawOwnRecords.push({
          t: new Date().toISOString(),
          id: record.id,
          rawId: record.rawId ?? null,
          name: record.name || '',
          x: record.x,
          y: record.y,
          size: record.size,
          protocol: parsed.protocol,
        });
        while (state.rawOwnRecords.length > 80) state.rawOwnRecords.shift();
      }

      const previous = state.nodes.get(record.id);
      state.nodes.set(record.id, {
        ...previous,
        id: record.id,
        rawId: record.rawId ?? record.id,
        x: record.x,
        y: record.y,
        size: record.size,
        color: record.color || null,
        flags: record.flags || 0,
        extra: Number.isFinite(record.extra) ? record.extra : null,
        skin: record.skin || '',
        name: record.name || '',
        updatedAt: now,
      });
    }

    updateSiblingOwnershipCandidates(parsed.records, parsed.protocol);

    const removed = parsed.removed.map((id) => decodeNodeId(id));
    for (const id of removed) {
      state.nodes.delete(id);
      state.visualNodes.delete(id);
      state.ownIds.delete(id);
    }

    while (state.nodes.size > NODE_LIMIT) {
      state.nodes.delete(state.nodes.keys().next().value);
    }
  }

  function parseUpdateNodesShort(packet) {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    let offset = 1;
    if (packet.length < 12) return null;

    const eatCount = view.getUint16(offset, true);
    offset += 2 + eatCount * 4;
    if (offset >= packet.length) return null;

    const records = [];
    let guard = 0;

    while (offset + 9 <= packet.length && guard < 4096) {
      guard += 1;
      const id = view.getUint16(offset, true) >>> 0;
      offset += 2;
      if (id === 0) break;

      const x = view.getInt16(offset, true); offset += 2;
      const y = view.getInt16(offset, true); offset += 2;
      const size = view.getUint16(offset, true); offset += 2;
      const flags = view.getUint8(offset); offset += 1;
      let color = null;
      let extra = 0;

      // Blobgame shortPackets/shortNamesPackets does not use the normal Agar flag layout here.
      // The v13 logs showed every live-cell record as 13 bytes:
      //   u16 id, i16 x, i16 y, u16 size, u8 flags, u32 extra
      // Example after split: e3 05 86 17 af fe 45 00 02 f0 0f 00 00 fa 05 ...
      // The previous parser treated flags bit 0x02 as RGB and became misaligned, so it never
      // parsed sibling cells like 0x05fa/0x05fb/0x05fc as real records.
      if (offset + 4 > packet.length) return null;
      extra = view.getUint32(offset, true) >>> 0;
      offset += 4;

      records.push({ rawId: id, id, x, y, size, flags, color, name: '', skin: '', extra });
    }

    const removed = readRemoveRecordsShort(packet, offset);
    if (!removed) return null;

    return { ok: true, protocol: 'short', records, removed: removed.ids, offset: removed.offset, length: packet.length };
  }

  function readRemoveRecordsShort(packet, offset) {
    if (offset < 0 || offset >= packet.length) return { ids: [], offset };
    if (offset + 2 > packet.length) return { ids: [], offset };

    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    const count = view.getUint16(offset, true);
    offset += 2;
    if (count > 10000 || offset + count * 2 > packet.length) return null;

    const ids = [];
    for (let index = 0; index < count; index += 1) {
      ids.push(view.getUint16(offset, true) >>> 0);
      offset += 2;
    }

    return { ids, offset };
  }

  function applyShortOwnRecordFallback(packet, meta) {
    if (!state.ownIds.size || packet.length < 12) {
      return 0;
    }

    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    let updates = 0;
    const now = performance.now();

    for (const id of state.ownIds) {
      for (let offset = 3; offset + 13 <= packet.length; offset += 1) {
        if ((view.getUint16(offset, true) >>> 0) !== id) {
          continue;
        }

        const x = view.getInt16(offset + 2, true);
        const y = view.getInt16(offset + 4, true);
        const size = view.getUint16(offset + 6, true);
        const flags = view.getUint8(offset + 8);
        const extra = view.getUint32(offset + 9, true) >>> 0;

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size)) {
          continue;
        }

        if (size <= 0 || size > 10000 || Math.abs(x) > 32768 || Math.abs(y) > 32768) {
          continue;
        }
        if ((flags & 0x02) === 0 || (flags & 0x21) !== 0) {
          continue;
        }

        const previous = state.nodes.get(id);
        state.nodes.set(id, {
          ...previous,
          id,
          rawId: id,
          x,
          y,
          size,
          color: null,
          flags,
          extra,
          name: '',
          skin: '',
          updatedAt: now,
          source: 'short-own-fallback',
        });
        updates += 1;
        break;
      }
    }

    if (updates > 0) {
      state.shortOwnFallbackUpdates += updates;
      log('short own cell records updated', { updates, ownIds: Array.from(state.ownIds), meta }, 'packet');
    }

    return updates;
  }

  function parseUpdateNodesProtocol6(packet) {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    let offset = 1;
    if (packet.length < 7) return null;
    const eatCount = view.getUint16(offset, true); offset += 2 + eatCount * 8;
    if (offset >= packet.length) return null;

    const records = [];
    let guard = 0;
    while (offset + 4 <= packet.length && guard < 4096) {
      guard += 1;
      const id = view.getUint32(offset, true); offset += 4;
      if (id === 0) break;
      if (offset + 11 > packet.length) return null;
      const x = view.getInt32(offset, true); offset += 4;
      const y = view.getInt32(offset, true); offset += 4;
      const size = view.getUint16(offset, true); offset += 2;
      const flags = view.getUint8(offset); offset += 1;
      let color = null;
      if (flags & 0x02) {
        if (offset + 3 > packet.length) return null;
        color = { r: packet[offset], g: packet[offset + 1], b: packet[offset + 2] };
        offset += 3;
      }
      let skin = '';
      let name = '';
      if (flags & 0x04) {
        const result = readUtf8Zero(packet, offset);
        if (!result) return null;
        skin = result.value;
        offset = result.offset;
      }
      if (flags & 0x08) {
        const result = readUtf8Zero(packet, offset);
        if (!result) return null;
        name = result.value;
        offset = result.offset;
      }
      if (offset < 0) return null;
      records.push({ rawId: id, id, x, y, size, flags, color, name, skin });
    }

    const removed = readRemoveRecords(packet, offset, 6);
    if (!removed) return null;
    return { ok: true, protocol: 6, records, removed: removed.ids, offset: removed.offset, length: packet.length };
  }

  function parseUpdateNodesProtocol5(packet) {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    let offset = 1;
    if (packet.length < 7) return null;
    const eatCount = view.getUint16(offset, true); offset += 2 + eatCount * 8;
    if (offset >= packet.length) return null;

    const records = [];
    let guard = 0;
    while (offset + 4 <= packet.length && guard < 4096) {
      guard += 1;
      const id = view.getUint32(offset, true); offset += 4;
      if (id === 0) break;
      if (offset + 14 > packet.length) return null;
      const x = view.getInt32(offset, true); offset += 4;
      const y = view.getInt32(offset, true); offset += 4;
      const size = view.getUint16(offset, true); offset += 2;
      const color = { r: packet[offset], g: packet[offset + 1], b: packet[offset + 2] }; offset += 3;
      const flags = view.getUint8(offset); offset += 1;
      let skin = '';
      if (flags & 0x04) {
        const result = readUtf8Zero(packet, offset);
        if (!result) return null;
        skin = result.value;
        offset = result.offset;
      }
      const nameResult = readUtf16Zero(packet, offset);
      if (!nameResult) return null;
      const name = nameResult.value;
      offset = nameResult.offset;
      if (offset < 0) return null;
      records.push({ rawId: id, id, x, y, size, flags, color, name, skin });
    }

    const removed = readRemoveRecords(packet, offset, 5);
    if (!removed) return null;
    return { ok: true, protocol: 5, records, removed: removed.ids, offset: removed.offset, length: packet.length };
  }

  function parseUpdateNodesProtocol4(packet) {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    let offset = 1;
    if (packet.length < 7) return null;
    const eatCount = view.getUint16(offset, true); offset += 2 + eatCount * 8;
    if (offset >= packet.length) return null;

    const records = [];
    let guard = 0;
    while (offset + 4 <= packet.length && guard < 4096) {
      guard += 1;
      const id = view.getUint32(offset, true); offset += 4;
      if (id === 0) break;
      if (offset + 10 > packet.length) return null;
      const x = view.getInt16(offset, true); offset += 2;
      const y = view.getInt16(offset, true); offset += 2;
      const size = view.getUint16(offset, true); offset += 2;
      const color = { r: packet[offset], g: packet[offset + 1], b: packet[offset + 2] }; offset += 3;
      const flags = view.getUint8(offset); offset += 1;
      const nameResult = readUtf16Zero(packet, offset);
      if (!nameResult) return null;
      const name = nameResult.value;
      offset = nameResult.offset;
      if (offset < 0) return null;
      records.push({ rawId: id, id, x, y, size, flags, color, name, skin: '' });
    }

    const removed = readRemoveRecords(packet, offset, 4);
    if (!removed) return null;
    return { ok: true, protocol: 4, records, removed: removed.ids, offset: removed.offset, length: packet.length };
  }

  function readUtf8Zero(packet, offset) {
    const start = offset;
    while (offset < packet.length) {
      if (packet[offset] === 0) {
        try {
          const bytes = packet.slice(start, offset);
          const value = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          return { value, offset: offset + 1 };
        } catch {
          return { value: '', offset: offset + 1 };
        }
      }
      offset += 1;
    }
    return null;
  }

  function readUtf16Zero(packet, offset) {
    const start = offset;
    while (offset + 1 < packet.length) {
      if (packet[offset] === 0 && packet[offset + 1] === 0) {
        try {
          const bytes = packet.slice(start, offset);
          const value = new TextDecoder('utf-16le', { fatal: false }).decode(bytes);
          return { value, offset: offset + 2 };
        } catch {
          return { value: '', offset: offset + 2 };
        }
      }
      offset += 2;
    }
    return null;
  }

  function skipUtf8Zero(packet, offset) {
    while (offset < packet.length) {
      if (packet[offset] === 0) return offset + 1;
      offset += 1;
    }
    return -1;
  }

  function skipUtf16Zero(packet, offset) {
    while (offset + 1 < packet.length) {
      if (packet[offset] === 0 && packet[offset + 1] === 0) return offset + 2;
      offset += 2;
    }
    return -1;
  }

  function readRemoveRecords(packet, offset, protocol) {
    if (offset < 0 || offset >= packet.length) return { ids: [], offset };
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    const countBytes = protocol >= 6 ? 2 : 4;
    if (offset + countBytes > packet.length) return { ids: [], offset };
    const count = protocol >= 6 ? view.getUint16(offset, true) : view.getUint32(offset, true);
    offset += countBytes;
    if (count > 10000 || offset + count * 4 > packet.length) return null;
    const ids = [];
    for (let i = 0; i < count; i += 1) {
      ids.push(view.getUint32(offset, true) >>> 0);
      offset += 4;
    }
    return { ids, offset };
  }

  function redact(value) {
    return String(value || '')
      .replace(/([?&]token=)[^&]+/gi, '$1<redacted>')
      .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '<redacted-jwt>');
  }

  function downloadDebugDump() {
    const dump = {
      meta: {
        version: 'packet-overlay-v17',
        createdAt: new Date().toISOString(),
        href: location.href,
      },
      state: {
        enabled: state.enabled,
        activeUrl: state.activeUrl,
        storageBridgeSeen: state.storageBridgeSeen,
        urlSources: state.urlSources,
        chosenUrlSource: state.chosenUrlSource,
        imageReady: state.imageReady,
        ownIds: Array.from(state.ownIds),
        nodeCount: state.nodes.size,
        camera: state.camera,
        lastOwnCenter: state.lastOwnCenter,
        zoomFactor: state.zoomFactor,
        effectiveCameraScale: state.lastEffectiveScale,
        zoomEvents: state.zoomEvents.slice(-20),
        viewport: state.lastViewport,
        canvasRect: state.lastCanvasRect,
        webglHookCount: state.webglHookCount,
        packetMode: state.packetMode,
        shortModeConfidence: state.shortModeConfidence,
        ignoredNonShortPackets: state.ignoredNonShortPackets,
        rejectedUpdateRecords: state.rejectedUpdateRecords,
        renderSmoothingMs: RENDER_SMOOTHING_MS,
        activeWebglTransform: state.activeWebglTransform,
        webglMatrixMatches: state.webglMatrixMatches,
        drawn: state.drawn,
        renderMode: state.renderMode,
        screenCircleCandidates: state.screenCircleCandidates,
        screenCircleMatches: state.screenCircleMatches,
        ownRenderNodes: state.ownRenderNodes,
        inferredOwnIds: Array.from(state.inferredOwnIds),
        ownClusterCandidates: state.ownClusterCandidates,
        ownClusterMatches: state.ownClusterMatches,
        siblingOwnIds: Array.from(state.siblingOwnIds),
        siblingOwnCandidates: state.siblingOwnCandidates.slice(-80),
        siblingOwnMatches: state.siblingOwnMatches,
        siblingCandidateScores: Array.from(state.siblingCandidateScores.entries()).slice(-80).map(([id, item]) => ({ id, score: item.score, observations: item.observations, detail: item.detail })),
        scrambleId: state.scrambleId,
        scrambleCandidates: state.scrambleCandidates,
        localPlayerName: state.localPlayerName || getLocalPlayerName(),
        packetNameMatches: state.packetNameMatches.slice(-40),
        rawOwnRecords: state.rawOwnRecords.slice(-40),
        recentScreenCircles: state.recentScreenCircles.slice(-30),
        sockets: state.sockets,
        wsMessages: state.wsMessages,
        addNodePackets: state.addNodePackets,
        ownListPackets: state.ownListPackets,
        ownListParsedPackets: state.ownListParsedPackets,
        ownListPacketSamples: state.ownListPacketSamples.slice(-20),
        updateNodeSamples: state.updateNodeSamples.slice(-30),
        updateNodeParseSummaries: state.updateNodeParseSummaries.slice(-80),
        shortOwnFallbackUpdates: state.shortOwnFallbackUpdates,
        updatePackets: state.updatePackets,
        updateParseErrors: state.updateParseErrors,
        opCounts: state.opCounts,
        earlyPackets: state.earlyPackets,
        ownNodeMissFrames: state.ownNodeMissFrames,
        frameScanCount: state.frameScanCount,
        lastPacketSummary: state.lastPacketSummary,
        frameHooks: state.frameHooks,
      },
      ownNodes: Array.from(state.ownIds).map((id) => state.nodes.get(id)).filter(Boolean),
      recentEvents: state.debugEvents,
    };

    const json = JSON.stringify(dump, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blobio-custom-skin-overlay-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.style.display = 'none';
    document.documentElement.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1000);
  }

  window.__blobioCustomSkinOverlayV17 = {
    state,
    refresh,
    dump: () => ({
      enabled: state.enabled,
      activeUrl: state.activeUrl,
      urlSources: state.urlSources,
      chosenUrlSource: state.chosenUrlSource,
      ownIds: Array.from(state.ownIds),
      nodes: state.nodes.size,
      drawn: state.drawn,
      renderMode: state.renderMode,
      screenCircleCandidates: state.screenCircleCandidates,
      screenCircleMatches: state.screenCircleMatches,
      ownRenderNodes: state.ownRenderNodes,
      inferredOwnIds: Array.from(state.inferredOwnIds),
      ownClusterCandidates: state.ownClusterCandidates,
      ownClusterMatches: state.ownClusterMatches,
      siblingOwnIds: Array.from(state.siblingOwnIds),
      siblingOwnCandidates: state.siblingOwnCandidates.slice(-40),
      siblingOwnMatches: state.siblingOwnMatches,
      scrambleId: state.scrambleId,
      localPlayerName: state.localPlayerName || getLocalPlayerName(),
      packetNameMatches: state.packetNameMatches.slice(-20),
      rawOwnRecords: state.rawOwnRecords.slice(-20),
      ownListPackets: state.ownListPackets,
      ownListParsedPackets: state.ownListParsedPackets,
      ownListPacketSamples: state.ownListPacketSamples.slice(-10),
      updateNodeSamples: state.updateNodeSamples.slice(-10),
      updateNodeParseSummaries: state.updateNodeParseSummaries.slice(-20),
      shortOwnFallbackUpdates: state.shortOwnFallbackUpdates,
      opCounts: state.opCounts,
      earlyPackets: state.earlyPackets,
      camera: state.camera,
      zoomFactor: state.zoomFactor,
      effectiveCameraScale: state.lastEffectiveScale,
      zoomEvents: state.zoomEvents.slice(-20),
      viewport: state.lastViewport,
      canvasRect: state.lastCanvasRect,
      webglHookCount: state.webglHookCount,
      packetMode: state.packetMode,
      shortModeConfidence: state.shortModeConfidence,
      ignoredNonShortPackets: state.ignoredNonShortPackets,
      rejectedUpdateRecords: state.rejectedUpdateRecords,
      renderSmoothingMs: RENDER_SMOOTHING_MS,
      activeWebglTransform: state.activeWebglTransform,
      webglMatrixMatches: state.webglMatrixMatches,
      lastPacketSummary: state.lastPacketSummary,
      events: state.debugEvents.slice(),
    }),
    downloadDebugDump,
  };


  function installZoomTracker() {
    // The game applies smoothing, limits and automatic mass-based zoom after wheel input.
    // Mirroring raw wheel deltas cannot stay synchronized, so v16 reads the WebGL
    // projection matrix instead. F7/F8 remain as fallback calibration only.
  }

  function nudgeZoomFactor(multiplier, source) {
    setZoomFactor((state.zoomFactor || 1) * multiplier, source);
    log('overlay zoom factor changed', { zoomFactor: state.zoomFactor, source }, 'zoom');
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'F9') {
      downloadDebugDump();
      return;
    }
    if (event.key === 'F7') {
      nudgeZoomFactor(0.94, 'F7');
      return;
    }
    if (event.key === 'F8') {
      nudgeZoomFactor(1.064, 'F8');
      return;
    }
    if (event.key === 'F10') {
      setZoomFactor(1, 'F10-reset');
    }
  }, true);

  window.addEventListener?.('blobio-custom-skin-state', (event) => {
    refresh(event.detail || null);
  }, false);
  window.addEventListener?.('message', (event) => {
    const message = event.data;
    if (!message || message.source !== 'BlobioExtensionStorageBridge' || !message.key) return;
    if (String(message.key).startsWith('blobio.customSkin.')) refresh();
  }, false);

  refresh(initialState);
  installWebglCameraTracker(window, 'top');
  installCanvasCircleTracker();
  installZoomTracker();
  installSocketHooks();
  renderLoop();
}
