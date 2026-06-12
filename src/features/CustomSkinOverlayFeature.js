import { createBlobioStorage } from '../storage/BlobioStorage.js';

const CUSTOM_SKIN_ENABLED_KEY = 'blobio.customSkin.enabled';
const CUSTOM_SKIN_ACTIVE_KEY = 'blobio.customSkin.activeUrl';
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
    this.started = true;
    return true;
  }

  destroy() {
    this.scriptNode?.remove?.();
    this.scriptNode = null;
    this.started = false;
  }

  getBootstrapState() {
    let enabled = false;
    let activeUrl = '';
    let debug = false;

    try {
      enabled = this.storage?.getItem?.(CUSTOM_SKIN_ENABLED_KEY) === '1';
      activeUrl = this.storage?.getItem?.(CUSTOM_SKIN_ACTIVE_KEY) || '';
      debug = this.storage?.getItem?.('blobio.customSkin.debug') === '1';
    } catch {
      // Fall through to a disabled state.
    }

    if (!enabled || !isValidImgurSkinUrl(activeUrl)) {
      return {
        enabled: false,
        activeUrl: '',
        debug,
      };
    }

    return {
      enabled: true,
      activeUrl,
      debug,
    };
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
  const DIRECT_IMGUR_IMAGE_MATCH = /^https:\/\/i\.imgur\.com\/[a-z0-9]+\.(?:png|jpe?g|gif|webp)(?:\?.*)?$/i;
  const OWN_ID_LIMIT = 128;
  const NODE_LIMIT = 5000;
  const DEBUG_LIMIT = 700;

  if (window.__blobioCustomSkinOverlayV4) {
    window.__blobioCustomSkinOverlayV4.refresh?.(initialState);
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
    shortOwnFallbackUpdates: 0,
    updatePackets: 0,
    updateParseErrors: 0,
    opCounts: {},
    earlyPackets: [],
    ownNodeMissFrames: 0,
    frameScanCount: 0,
    lastPacketSummary: null,
    debugEvents: [],
    frameHooks: [],
    startedAt: new Date().toISOString(),
  };

  function refresh(nextState) {
    const activeUrl = readActiveUrl(nextState);
    const enabled = readEnabled(nextState) && DIRECT_IMGUR_IMAGE_MATCH.test(activeUrl);
    state.debug = Boolean(nextState && nextState.debug) || localStorage.getItem('blobio.customSkin.debug') === '1';
    state.enabled = enabled;
    state.activeUrl = enabled ? activeUrl : '';

    if (!state.enabled) {
      state.imageReady = false;
      state.imageUrl = '';
      log('overlay disabled', {}, 'state');
      return;
    }

    ensureImage();
    ensureOverlay();
    log('overlay state refreshed', { activeUrl: state.activeUrl }, 'state');
  }

  function readEnabled(nextState) {
    if (nextState && Object.prototype.hasOwnProperty.call(nextState, 'enabled')) {
      return Boolean(nextState.enabled);
    }

    try {
      return localStorage.getItem(CUSTOM_SKIN_ENABLED_KEY) === '1';
    } catch {
      return false;
    }
  }

  function readActiveUrl(nextState) {
    if (nextState && typeof nextState.activeUrl === 'string') {
      return nextState.activeUrl.trim();
    }

    try {
      return String(localStorage.getItem(CUSTOM_SKIN_ACTIVE_KEY) || '').trim();
    } catch {
      return '';
    }
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
    updateCameraFromOwnCells();

    if (!state.ownIds.size) {
      state.ownNodeMissFrames += 1;
    }

    let drawn = 0;
    for (const id of state.ownIds) {
      const node = state.nodes.get(id);
      if (!node || node.removed) continue;
      const screen = worldToScreen(node.x, node.y, rect);
      const radius = Math.max(4, Math.abs(node.size * state.camera.scale));
      if (!isFinite(screen.x) || !isFinite(screen.y) || !isFinite(radius)) continue;
      if (screen.x + radius < rect.left || screen.y + radius < rect.top || screen.x - radius > rect.left + rect.width || screen.y - radius > rect.top + rect.height) continue;

      drawSkinCircle(ctx, state.image, screen.x, screen.y, radius);
      drawn += 1;
    }

    state.drawn = drawn;
    state.frame += 1;

    if (state.debug && state.frame % 60 === 0) {
      log('overlay frame', {
        drawn,
        ownIds: state.ownIds.size,
        nodes: state.nodes.size,
        camera: state.camera,
      }, 'overlay-frame');
    }
  }

  function drawSkinCircle(ctx, image, x, y, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
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

  function worldToScreen(x, y, canvasRect) {
    return {
      x: canvasRect.left + canvasRect.width / 2 + (x - state.camera.x) * state.camera.scale,
      y: canvasRect.top + canvasRect.height / 2 + (y - state.camera.y) * state.camera.scale,
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
    if (!win || !win.WebSocket) return;

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
    // Blobgame short-packet mode uses opcode 0x31 to tell the client which cell IDs are local.
    // The uploaded debug log showed 49,1,0,0,0,227,5,... which is count=1 and local id=0x05e3.
    if (packet.length < 7) return;

    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    const count = view.getUint32(1, true);
    if (!Number.isFinite(count) || count <= 0 || count > OWN_ID_LIMIT) return;

    let offset = 5;
    let added = 0;

    for (let index = 0; index < count && offset + 2 <= packet.length; index += 1) {
      const id = view.getUint16(offset, true) >>> 0;
      offset += 2;
      if (id) {
        addOwnId(id, 'own-list-short', meta);
        added += 1;
      }
    }

    if (added > 0) {
      state.ownListPackets += 1;
      log('own node list parsed', { added, ownIds: Array.from(state.ownIds), meta }, 'packet');
    }
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

  function parseUpdateNodes(packet, meta) {
    const parsed = [parseUpdateNodesShort(packet), parseUpdateNodesProtocol6(packet), parseUpdateNodesProtocol5(packet), parseUpdateNodesProtocol4(packet)]
      .filter((item) => item && item.ok)
      .sort((a, b) => scoreParse(b) - scoreParse(a))[0];

    if (!parsed) {
      state.updateParseErrors += 1;
      if (state.debug) log('update packet parse failed', { length: packet.length, meta }, 'packet-error');
      return;
    }

    applyUpdateParse(parsed);
    const shortOwnUpdates = applyShortOwnRecordFallback(packet, meta);
    state.updatePackets += 1;
    state.lastPacketSummary = {
      protocol: parsed.protocol,
      records: parsed.records.length,
      removed: parsed.removed.length,
      ownRecords: parsed.records.filter((record) => state.ownIds.has(record.id)).length,
      shortOwnUpdates,
      length: packet.length,
    };
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
    for (const record of parsed.records) {
      if (!record.id) continue;
      state.nodes.set(record.id, {
        id: record.id,
        x: record.x,
        y: record.y,
        size: record.size,
        color: record.color || null,
        flags: record.flags || 0,
        updatedAt: performance.now(),
      });
    }

    for (const id of parsed.removed) {
      state.nodes.delete(id);
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

      if (flags & 0x02) {
        if (offset + 3 > packet.length) return null;
        color = { r: packet[offset], g: packet[offset + 1], b: packet[offset + 2] };
        offset += 3;
      }

      if (flags & 0x04) offset = skipUtf8Zero(packet, offset);
      if (flags & 0x08) offset = skipUtf8Zero(packet, offset);
      if (offset < 0) return null;

      records.push({ id, x, y, size, flags, color });
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
      for (let offset = 3; offset + 8 <= packet.length; offset += 1) {
        if ((view.getUint16(offset, true) >>> 0) !== id) {
          continue;
        }

        const x = view.getInt16(offset + 2, true);
        const y = view.getInt16(offset + 4, true);
        const size = view.getUint16(offset + 6, true);

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size)) {
          continue;
        }

        if (size <= 0 || size > 10000 || Math.abs(x) > 32768 || Math.abs(y) > 32768) {
          continue;
        }

        state.nodes.set(id, {
          id,
          x,
          y,
          size,
          color: null,
          flags: 0,
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
      if (flags & 0x04) offset = skipUtf8Zero(packet, offset);
      if (flags & 0x08) offset = skipUtf8Zero(packet, offset);
      if (offset < 0) return null;
      records.push({ id, x, y, size, flags, color });
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
      if (flags & 0x04) offset = skipUtf8Zero(packet, offset);
      offset = skipUtf16Zero(packet, offset);
      if (offset < 0) return null;
      records.push({ id, x, y, size, flags, color });
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
      offset = skipUtf16Zero(packet, offset);
      if (offset < 0) return null;
      records.push({ id, x, y, size, flags, color });
    }

    const removed = readRemoveRecords(packet, offset, 4);
    if (!removed) return null;
    return { ok: true, protocol: 4, records, removed: removed.ids, offset: removed.offset, length: packet.length };
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
        version: 'packet-overlay-v3',
        createdAt: new Date().toISOString(),
        href: location.href,
      },
      state: {
        enabled: state.enabled,
        activeUrl: state.activeUrl,
        imageReady: state.imageReady,
        ownIds: Array.from(state.ownIds),
        nodeCount: state.nodes.size,
        camera: state.camera,
        lastOwnCenter: state.lastOwnCenter,
        drawn: state.drawn,
        sockets: state.sockets,
        wsMessages: state.wsMessages,
        addNodePackets: state.addNodePackets,
        ownListPackets: state.ownListPackets,
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

  window.__blobioCustomSkinOverlayV4 = {
    state,
    refresh,
    dump: () => ({
      enabled: state.enabled,
      activeUrl: state.activeUrl,
      ownIds: Array.from(state.ownIds),
      nodes: state.nodes.size,
      drawn: state.drawn,
      ownListPackets: state.ownListPackets,
      shortOwnFallbackUpdates: state.shortOwnFallbackUpdates,
      opCounts: state.opCounts,
      earlyPackets: state.earlyPackets,
      camera: state.camera,
      lastPacketSummary: state.lastPacketSummary,
      events: state.debugEvents.slice(),
    }),
    downloadDebugDump,
  };

  window.addEventListener('keydown', (event) => {
    if (event.key === 'F9') {
      downloadDebugDump();
    }
  }, true);

  refresh(initialState);
  installSocketHooks();
  renderLoop();
}
