const EMOTE_SKIN_HOST = 'custom.client.blobgame.io';
const EMOTE_SKIN_DURATION_MS = 5000;
const EMOTE_SKIN_CANVAS_CLASS = 'blobio-emote-skin-overlay';
const EMOTE_SKIN_PATCH_MARKER = '__BlobioSkinEmoteRenderCell';
const EMOTE_SKIN_CACHE_SCRIPT_RE = /\/html\/[a-f0-9]{32}\.cache\.js(?:[?#].*)?$/i;

export function pageEmoteSkinBootstrap(initialConfig = {}, pageWindow = globalThis) {
  const win = pageWindow;
  const doc = win.document;
  if (!doc || win.location?.hostname !== EMOTE_SKIN_HOST) {
    return false;
  }

  if (win.__blobioEmoteSkinInstalled) {
    win.__blobioEmoteSkinRefresh?.(initialConfig);
    return true;
  }
  win.__blobioEmoteSkinInstalled = true;

  const state = {
    assets: normalizeAssets(initialConfig.assets),
    images: new Map(),
    ownEmote: null,
    emotesByName: new Map(),
    overlay: null,
    context: null,
    targetCanvas: null,
    frameSeen: false,
    patchedChunks: 0,
    seenCacheScripts: 0,
    wrappedCallback: false,
    errors: [],
    lastPatchResult: null,
    counters: {
      triggerAttempts: 0,
      triggerAccepted: 0,
      beginFrames: 0,
      renderCalls: 0,
      renderDrawn: 0,
    },
    lastTrigger: null,
    lastRender: null,
  };

  exposeApi();
  installStyle();
  installGameScriptPatch();
  preloadImages();

  if (win.__BLOBIO_EMOTE_SKIN_TEST__) {
    win.__BlobioEmoteSkinTestApi = {
      patchGameBundle,
      triggerEmote,
      beginFrame,
      renderCell,
      state,
    };
  }

  return true;

  function normalizeAssets(assets) {
    const source = assets && typeof assets === 'object' ? assets : {};
    const normalized = {};
    for (const key of ['cool', 'nice', 'hi', 'yo', 'thx', 'why', 'pop']) {
      normalized[key] = String(source[key] || '');
    }
    return normalized;
  }

  function refresh(nextConfig = {}) {
    state.assets = normalizeAssets(nextConfig.assets || state.assets);
    preloadImages();
  }

  function exposeApi() {
    win.__blobioEmoteSkinRefresh = refresh;
    win.__BlobioSkinEmoteTrigger = triggerEmote;
    win.__BlobioSkinEmoteBeginFrame = beginFrame;
    win.__BlobioSkinEmoteRenderCell = renderCell;
    win.__BlobioSkinEmoteDebug = debugReport;
    win.BlobioEmoteSkinRuntimeDebug = debugReport;
  }

  function triggerEmote(event = {}) {
    state.counters.triggerAttempts += 1;
    const emoteId = normalizeEmoteId(event.emoteId);
    state.lastTrigger = {
      emoteId,
      own: Boolean(event.own),
      name: normalizeName(event.name),
      accepted: false,
      reason: '',
      at: Date.now(),
    };
    if (!emoteId || !state.assets[assetKeyForEmote(emoteId)]) {
      state.lastTrigger.reason = !emoteId ? 'unknown-emote-id' : 'missing-asset';
      return false;
    }

    const expiresAt = Date.now() + clampDuration(event.durationMs);
    if (event.own) {
      state.ownEmote = { emoteId, expiresAt };
      state.counters.triggerAccepted += 1;
      state.lastTrigger.accepted = true;
      state.lastTrigger.reason = 'own-emote';
      return true;
    }

    const name = normalizeName(event.name);
    if (!name) {
      state.lastTrigger.reason = 'missing-name';
      return false;
    }

    state.emotesByName.set(name, { emoteId, expiresAt });
    state.counters.triggerAccepted += 1;
    state.lastTrigger.accepted = true;
    state.lastTrigger.reason = 'remote-emote';
    return true;
  }

  function normalizeEmoteId(value) {
    const id = String(value || '').trim().toLowerCase();
    return ['cool', 'nice', 'hi', 'yo', 'thx', 'why', 'pop', 'wink-pop'].includes(id) ? id : '';
  }

  function assetKeyForEmote(emoteId) {
    return emoteId === 'wink-pop' ? 'pop' : emoteId;
  }

  function clampDuration(value) {
    const duration = Number(value);
    return Number.isFinite(duration) ? Math.max(500, Math.min(15000, duration)) : EMOTE_SKIN_DURATION_MS;
  }

  function normalizeName(value) {
    return String(value || '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function preloadImages() {
    for (const [key, url] of Object.entries(state.assets)) {
      if (!url || state.images.get(key)?.src === url) {
        continue;
      }

      const image = new win.Image();
      image.decoding = 'async';
      image.src = url;
      state.images.set(key, image);
    }
  }

  function beginFrame() {
    state.counters.beginFrames += 1;
    state.frameSeen = true;
    expireEmotes();
    if (!ensureOverlay()) {
      return;
    }

    const width = state.overlay.width;
    const height = state.overlay.height;
    if (width > 0 && height > 0) {
      state.context.clearRect(0, 0, width, height);
    }
  }

  function renderCell(cellId, rawName, centerX, centerY, cellSize, radius, isOwn) {
    state.counters.renderCalls += 1;
    const active = findActiveEmote(rawName, isOwn);
    if (!active || !ensureOverlay()) {
      state.lastRender = {
        cellId,
        isOwn: Boolean(isOwn),
        active: Boolean(active),
        drawn: false,
        reason: active ? 'overlay-unavailable' : 'no-active-emote',
        at: Date.now(),
      };
      return false;
    }

    const x = Number(centerX);
    const y = Number(centerY);
    const r = Math.max(0, Number(radius) || Number(cellSize) / 2 || 0);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !isPointNearViewport(x, y, r)) {
      state.lastRender = {
        cellId,
        isOwn: Boolean(isOwn),
        active: true,
        drawn: false,
        reason: 'outside-viewport',
        at: Date.now(),
      };
      return false;
    }

    const image = state.images.get(assetKeyForEmote(active.emoteId));
    if (!image || (!image.complete && !image.naturalWidth)) {
      state.lastRender = {
        cellId,
        isOwn: Boolean(isOwn),
        active: true,
        drawn: false,
        reason: 'image-not-ready',
        at: Date.now(),
      };
      return false;
    }

    const size = Math.max(24, Math.min(128, r * 1.16 || Number(cellSize) * 0.58 || 42));
    const drawX = x - size / 2;
    const drawY = y - size / 2;
    state.context.globalAlpha = fadeFor(active.expiresAt);
    state.context.drawImage(image, drawX, drawY, size, size);
    state.context.globalAlpha = 1;
    state.counters.renderDrawn += 1;
    state.lastRender = {
      cellId,
      isOwn: Boolean(isOwn),
      emoteId: active.emoteId,
      drawn: true,
      x,
      y,
      size,
      at: Date.now(),
    };
    return true;
  }

  function findActiveEmote(rawName, isOwn) {
    const now = Date.now();
    if (isOwn && state.ownEmote?.expiresAt > now) {
      return state.ownEmote;
    }

    const name = normalizeName(rawName);
    const remote = name ? state.emotesByName.get(name) : null;
    return remote?.expiresAt > now ? remote : null;
  }

  function expireEmotes() {
    const now = Date.now();
    if (state.ownEmote?.expiresAt <= now) {
      state.ownEmote = null;
    }

    for (const [name, emote] of state.emotesByName) {
      if (emote.expiresAt <= now) {
        state.emotesByName.delete(name);
      }
    }
  }

  function fadeFor(expiresAt) {
    const remaining = expiresAt - Date.now();
    if (remaining >= 450) {
      return 1;
    }
    return Math.max(0, Math.min(1, remaining / 450));
  }

  function isPointNearViewport(x, y, radius) {
    const margin = Math.max(80, Math.min(240, radius + 80));
    const width = Number(state.overlay?.width) || Number(win.innerWidth) || 0;
    const height = Number(state.overlay?.height) || Number(win.innerHeight) || 0;
    return x + margin >= 0 && y + margin >= 0 && x - margin <= width && y - margin <= height;
  }

  function ensureOverlay() {
    const canvas = findTargetCanvas();
    if (!canvas) {
      return false;
    }

    if (!state.overlay?.parentNode) {
      const overlay = doc.createElement('canvas');
      overlay.classList.add(EMOTE_SKIN_CANVAS_CLASS);
      overlay.setAttribute('aria-hidden', 'true');
      (doc.body || doc.documentElement).appendChild(overlay);
      state.overlay = overlay;
      state.context = overlay.getContext('2d');
    }

    if (!state.context) {
      return false;
    }

    alignOverlay(canvas);
    return true;
  }

  function findTargetCanvas() {
    const canvases = Array.from(doc.querySelectorAll?.('canvas') || []);
    let best = null;
    let bestArea = 0;

    for (const canvas of canvases) {
      if (canvas === state.overlay || canvas.classList?.contains?.(EMOTE_SKIN_CANVAS_CLASS)) {
        continue;
      }
      const rect = canvas.getBoundingClientRect?.();
      const area = Math.max(0, Number(rect?.width) || 0) * Math.max(0, Number(rect?.height) || 0);
      if (area > bestArea) {
        best = canvas;
        bestArea = area;
      }
    }

    state.targetCanvas = best;
    return best;
  }

  function alignOverlay(canvas) {
    const rect = canvas.getBoundingClientRect?.();
    if (!rect) {
      return;
    }

    const dpr = Math.max(1, Number(win.devicePixelRatio) || 1);
    const cssWidth = Math.max(1, Math.round(Number(rect.width) || Number(canvas.clientWidth) || 1));
    const cssHeight = Math.max(1, Math.round(Number(rect.height) || Number(canvas.clientHeight) || 1));
    const width = Math.round(cssWidth * dpr);
    const height = Math.round(cssHeight * dpr);

    if (state.overlay.width !== width || state.overlay.height !== height) {
      state.overlay.width = width;
      state.overlay.height = height;
      state.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    state.overlay.style.left = `${Math.round(rect.left)}px`;
    state.overlay.style.top = `${Math.round(rect.top)}px`;
    state.overlay.style.width = `${cssWidth}px`;
    state.overlay.style.height = `${cssHeight}px`;
  }

  function installStyle() {
    if (doc.getElementById?.('blobio-emote-skin-overlay-style')) {
      return;
    }

    const style = doc.createElement('style');
    style.id = 'blobio-emote-skin-overlay-style';
    style.textContent = `.${EMOTE_SKIN_CANVAS_CLASS}{position:fixed;left:0;top:0;z-index:2147482600;pointer-events:none}`;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function installGameScriptPatch() {
    wrapScriptDownloaded();
    patchExistingCacheScripts();

    const NodeCtor = win.Node;
    if (!NodeCtor?.prototype || NodeCtor.prototype.__blobioEmoteSkinNodePatch) {
      return;
    }

    const nativeAppendChild = NodeCtor.prototype.appendChild;
    const nativeInsertBefore = NodeCtor.prototype.insertBefore;
    NodeCtor.prototype.appendChild = function blobioEmoteSkinAppendChild(node) {
      patchScriptNode(node);
      return nativeAppendChild.call(this, node);
    };
    NodeCtor.prototype.insertBefore = function blobioEmoteSkinInsertBefore(node, child) {
      patchScriptNode(node);
      return nativeInsertBefore.call(this, node, child);
    };
    NodeCtor.prototype.__blobioEmoteSkinNodePatch = true;
  }

  function patchExistingCacheScripts() {
    for (const script of doc.querySelectorAll?.('script[src], script') || []) {
      patchScriptNode(script);
    }
  }

  function patchScriptNode(node) {
    if (!node || String(node.tagName || '').toLowerCase() !== 'script') {
      return;
    }

    const src = String(node.src || node.getAttribute?.('src') || '');
    if (src && !EMOTE_SKIN_CACHE_SCRIPT_RE.test(src)) {
      return;
    }
    if (src) {
      state.seenCacheScripts += 1;
    }

    if (typeof node.textContent === 'string' && node.textContent.includes('function ose(a)')) {
      const result = patchGameBundle(node.textContent);
      state.lastPatchResult = compactPatchResult(result);
      if (result.changed) {
        node.textContent = result.source;
        state.patchedChunks += 1;
      }
    }
  }

  function wrapScriptDownloaded() {
    const html = win.html;
    if (!html || html.__blobioEmoteSkinWrapped || typeof html.onScriptDownloaded !== 'function') {
      return false;
    }

    const native = html.onScriptDownloaded;
    html.onScriptDownloaded = function blobioEmoteSkinOnScriptDownloaded(chunks) {
      if (Array.isArray(chunks)) {
        for (let index = 0; index < chunks.length; index += 1) {
          if (typeof chunks[index] !== 'string') {
            continue;
          }
          const result = patchGameBundle(chunks[index]);
          state.lastPatchResult = compactPatchResult(result);
          if (result.changed) {
            chunks[index] = result.source;
            state.patchedChunks += 1;
          }
        }
      }
      return native.call(this, chunks);
    };
    html.__blobioEmoteSkinWrapped = true;
    state.wrappedCallback = true;
    return true;
  }

  function patchGameBundle(source) {
    if (typeof source !== 'string') {
      return { source, changed: false, reason: 'not-a-string' };
    }
    if (source.includes(EMOTE_SKIN_PATCH_MARKER)) {
      return { source, changed: false, reason: 'already-patched' };
    }

    let patched = source;
    const frameStart = 'function ose(a){var b,c,d,e,f,g,h;for(e=0;e<(sxe(),qxe).d.a.length;e++){';
    if (patched.includes(frameStart)) {
      patched = patched.replace(
        frameStart,
        'function ose(a){$wnd.__BlobioSkinEmoteBeginFrame&&$wnd.__BlobioSkinEmoteBeginFrame();var b,c,d,e,f,g,h;for(e=0;e<(sxe(),qxe).d.a.length;e++){',
      );
    }

    const renderNeedle = 'Mm(a.i,g.u?a.b:g.r?a.a:a.B);if(Nye(qxe.f,(Ize(),Gze))&&g.B!=null){';
    if (!patched.includes(renderNeedle)) {
      return { source, changed: false, reason: 'renderer-block-not-found' };
    }

    patched = patched.replace(
      renderNeedle,
      'if($wnd.__BlobioSkinEmoteRenderCell){$wnd.__BlobioSkinEmoteRenderCell(g.n,g.B,g.R,g.S,g.N,g.M,g.p,g.u||g.r)}'
        + renderNeedle,
    );

    if (patched === source) {
      return { source, changed: false, reason: 'replace-failed' };
    }
    return { source: patched, changed: true, reason: 'patched' };
  }

  function compactPatchResult(result) {
    return {
      changed: Boolean(result.changed),
      reason: result.reason || '',
      sourceLength: typeof result.source === 'string' ? result.source.length : 0,
    };
  }

  function debugReport() {
    return {
      installed: true,
      assetKeys: Object.fromEntries(Object.entries(state.assets).map(([key, value]) => [key, Boolean(value)])),
      images: Object.fromEntries(Array.from(state.images.entries()).map(([key, image]) => [
        key,
        {
          complete: Boolean(image.complete),
          naturalWidth: Number(image.naturalWidth) || 0,
        },
      ])),
      ownEmote: state.ownEmote ? {
        emoteId: state.ownEmote.emoteId,
        remainingMs: Math.max(0, state.ownEmote.expiresAt - Date.now()),
      } : null,
      remoteEmotes: state.emotesByName.size,
      overlay: state.overlay ? {
        connected: Boolean(state.overlay.parentNode),
        width: state.overlay.width,
        height: state.overlay.height,
      } : null,
      targetCanvas: state.targetCanvas ? {
        width: state.targetCanvas.width || 0,
        height: state.targetCanvas.height || 0,
      } : null,
      patch: {
        patchedChunks: state.patchedChunks,
        seenCacheScripts: state.seenCacheScripts,
        wrappedCallback: state.wrappedCallback,
        lastPatchResult: state.lastPatchResult,
      },
      counters: { ...state.counters },
      lastTrigger: state.lastTrigger,
      lastRender: state.lastRender,
      errors: state.errors.slice(-8),
    };
  }
}
