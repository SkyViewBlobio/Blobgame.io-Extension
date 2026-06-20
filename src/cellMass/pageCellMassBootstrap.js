export function pageCellMassBootstrap(initialSettings = {}, pageWindow = globalThis) {
  const win = pageWindow || globalThis;
  const host = String(win.location?.hostname || '').toLowerCase();
  if (host && host !== 'custom.client.blobgame.io' && host !== 'blobgame.io') {
    return false;
  }

  if (win.__blobioCellMassInstalled) {
    win.__blobioCellMassRefresh?.(initialSettings);
    return true;
  }

  const SCRIPT_VERSION = '0.1.1';
  const CACHE_SCRIPT_RE = /\/html\/[a-f0-9]{32}\.cache\.js(?:[?#].*)?$/i;
  const DRAW_HOOK_NAME = 'BlobioCellMassDraw';
  const PATCH_MARKER = 'BlobioCellMassDraw';
  const MIN_RENDER_SIZE = 13;
  const MAX_LABEL_WIDTH = 0.9;
  const MAX_LABEL_HEIGHT = 0.32;
  const PRIMARY_MAX_LABEL_HEIGHT = 0.42;

  let settings = normalizeSettings(initialSettings);
  let lastCacheSweep = 0;

  const labelCache = new Map();
  const state = {
    installed: true,
    version: SCRIPT_VERSION,
    startedAt: Date.now(),
    settings,
    seenCacheScripts: 0,
    wrappedCallback: false,
    patchedChunks: 0,
    lastPatchResult: null,
    counters: {
      drawHookCalls: 0,
      labelsDrawn: 0,
      labelUpdates: 0,
      cacheHits: 0,
      hiddenBySetting: 0,
      hiddenByThreshold: 0,
      hiddenBySmartLimit: 0,
      primaryLabels: 0,
    },
    samples: [],
    lastLabel: null,
    lastDrawCapture: null,
    errors: [],
  };

  win.__blobioCellMassInstalled = true;
  win.__blobioCellMassState = state;
  win[DRAW_HOOK_NAME] = drawCellMassLabel;
  win.__blobioCellMassRefresh = refreshSettings;
  win.__BlobioCellMassDebug = debugReport;
  win.BlobioCellMassDebug = debugReport;
  win.BlobioShowMassDebug = debugReport;
  win.blobioCellMassDebug = debugReport;
  win.__blobioCellMassCaptureDraw = captureDrawState;

  if (win.__BLOBIO_CELL_MASS_TEST__) {
    win.__BlobioCellMassTestApi = {
      captureDrawState,
      drawCellMassLabel,
      formatMass,
      getFitScale,
      normalizeSettings,
      patchGameBundle,
      refreshSettings,
    };
  }

  installGameScriptPatch();
  return true;

  function refreshSettings(nextSettings = {}) {
    const previous = settings;
    settings = normalizeSettings({
      ...settings,
      ...(nextSettings || {}),
      solid: {
        ...settings.solid,
        ...(nextSettings?.solid || {}),
      },
    });
    state.settings = settings;

    if (
      previous.compact !== settings.compact
      || previous.updateDelayMs !== settings.updateDelayMs
    ) {
      labelCache.clear();
    }

    return settings;
  }

  function drawCellMassLabel(cellId, mass, rawSize, renderSize, cellSize, name, nameDrawn, nameScale, explicitFitScale, totalMass) {
    state.counters.drawHookCalls += 1;

    if (!settings.enabled) {
      state.counters.hiddenBySetting += 1;
      return null;
    }

    const safeMass = Math.max(0, Number(mass) || 0);
    const safeRawSize = Number(rawSize) || 0;
    const safeRenderSize = Number(renderSize) || safeRawSize;
    if (safeMass <= 0 || Math.max(safeRawSize, safeRenderSize) < MIN_RENDER_SIZE) {
      state.counters.hiddenByThreshold += 1;
      return null;
    }

    const autoMinMass = settings.smartRendering ? getAutoMinMass(totalMass) : 0;
    if (autoMinMass > 0 && safeMass <= autoMinMass) {
      state.counters.hiddenBySmartLimit += 1;
      return null;
    }

    const now = Date.now();
    sweepLabelCache(now);
    const textEntry = readMassText(cellId, safeMass, now);
    if (!textEntry.text) {
      return null;
    }

    const fitScale = Number(explicitFitScale) > 0
      ? Number(explicitFitScale)
      : getFitScale(textEntry.text, name, nameScale, safeRenderSize);
    const primary = isPrimaryLabel(safeMass, safeRawSize, safeRenderSize, totalMass);
    let scale = clampNumber(fitScale * settings.textScale, 0.001, 1.4, settings.textScale);

    if (primary) {
      scale = Math.max(scale, readableScaleFloor(safeRawSize, safeRenderSize));
      state.counters.primaryLabels += 1;
    }

    const result = {
      text: textEntry.text,
      scale,
      offset: settings.yOffset,
      lineGap: settings.nameGap,
      maxWidth: MAX_LABEL_WIDTH,
      maxHeight: primary ? PRIMARY_MAX_LABEL_HEIGHT : MAX_LABEL_HEIGHT,
      color: getLabelColor(safeMass, totalMass),
      cached: textEntry.cached,
      primary,
    };

    state.counters.labelsDrawn += 1;
    state.lastLabel = cloneLabelResult(cellId, safeMass, result);
    rememberSample(cellId, safeMass, safeRawSize, safeRenderSize, cellSize, name, Boolean(nameDrawn), result);
    return result;
  }

  function readMassText(cellId, mass, now) {
    const key = String(cellId ?? `mass-${mass}`);
    const cached = labelCache.get(key);
    if (cached && settings.updateDelayMs > 0 && now - cached.updatedAt < settings.updateDelayMs) {
      cached.lastSeen = now;
      state.counters.cacheHits += 1;
      return { text: cached.text, cached: true };
    }

    const text = formatMass(mass);
    labelCache.set(key, {
      text,
      updatedAt: now,
      lastSeen: now,
    });
    state.counters.labelUpdates += 1;
    return { text, cached: false };
  }

  function formatMass(value) {
    const mass = Math.max(0, Number(value) || 0);
    if (!settings.compact) {
      return String(Math.round(mass));
    }

    if (mass >= 1000000) {
      return `${trimNumber(mass / 1000000)}m`;
    }

    if (mass >= 1000) {
      return `${trimNumber(mass / 1000)}k`;
    }

    return String(Math.round(mass));
  }

  function trimNumber(value) {
    const rounded = Math.round(value * 10) / 10;
    return rounded % 1 === 0 ? String(rounded | 0) : rounded.toFixed(1);
  }

  function getAutoMinMass(totalMass) {
    const total = Number(totalMass) || 0;
    if (total > 15000) {
      return 500;
    }
    if (total >= 8000) {
      return 200;
    }
    if (total > 2000) {
      return 40;
    }
    return 0;
  }

  function getFitScale(text, name, nameScale, renderSize) {
    const textLength = Math.max(String(text || '').length, 3);
    const nameLength = Math.max(String(name || '').length, 3);
    const widestLength = Math.max(textLength, nameLength);
    const scale = Number(nameScale);

    if (Number.isFinite(scale) && scale > 0) {
      return scale * (nameLength / widestLength);
    }

    return Math.max(0.001, Number(renderSize) / (widestLength * 80));
  }

  function isPrimaryLabel(mass, rawSize, renderSize, totalMass) {
    if (!settings.emphasizeBiggest) {
      return false;
    }

    const total = Number(totalMass) || 0;
    const share = total > 0 ? mass / total : 0;
    return share >= 0.18 || Math.max(Number(rawSize) || 0, Number(renderSize) || 0) >= 80;
  }

  function readableScaleFloor(rawSize, renderSize) {
    const size = Math.max(Number(rawSize) || 0, Number(renderSize) || 0);
    if (size >= 150) {
      return 0.26;
    }
    if (size >= 95) {
      return 0.2;
    }
    return 0.18;
  }

  function getLabelColor(mass, totalMass) {
    return colorToObject(settings.solid.color, settings.alpha);
  }

  function cloneLabelResult(cellId, mass, result) {
    return {
      at: Date.now(),
      cellId: String(cellId ?? ''),
      mass: Math.round(mass * 10) / 10,
      text: result.text,
      scale: roundNumber(result.scale),
      offset: roundNumber(result.offset),
      primary: Boolean(result.primary),
      cached: Boolean(result.cached),
      color: cloneColor(result.color),
    };
  }

  function captureDrawState(cellId, label, nativeColor) {
    state.lastDrawCapture = {
      at: Date.now(),
      cellId: String(cellId ?? ''),
      text: typeof label?.text === 'string' ? label.text : '',
      scale: roundNumber(label?.scale),
      appliedColor: cloneColor(label?.color),
      nativeColor: cloneColor(nativeColor),
    };
    return state.lastDrawCapture;
  }

  function colorToObject(color, alpha = 100) {
    const rgb = hexToRgb(color, '#ffffff');
    return {
      d: rgb.red / 255,
      c: rgb.green / 255,
      b: rgb.blue / 255,
      a: normalizeAlpha(alpha, 100) / 100,
    };
  }

  function hexToRgb(value, fallback) {
    const clean = normalizeColor(value, fallback).slice(1);
    return {
      red: Number.parseInt(clean.slice(0, 2), 16),
      green: Number.parseInt(clean.slice(2, 4), 16),
      blue: Number.parseInt(clean.slice(4, 6), 16),
    };
  }

  function sweepLabelCache(now) {
    if (now - lastCacheSweep < 5000 || labelCache.size < 64) {
      return;
    }

    lastCacheSweep = now;
    for (const [cellId, entry] of labelCache) {
      if (now - entry.lastSeen > 30000) {
        labelCache.delete(cellId);
      }
    }
  }

  function installGameScriptPatch() {
    const NodeCtor = win.Node || globalThis.Node;
    if (!NodeCtor?.prototype || NodeCtor.prototype.__blobioCellMassScriptPatchInstalled) {
      return;
    }

    const originalAppendChild = NodeCtor.prototype.appendChild;
    const originalInsertBefore = NodeCtor.prototype.insertBefore;

    NodeCtor.prototype.appendChild = function blobioCellMassAppendChild(node) {
      if (shouldWatchScript(node)) {
        node.dataset.blobioCellMassScriptPatch = 'seen';
        state.seenCacheScripts += 1;
        installGwtCallbackPatch();
      }
      return originalAppendChild.call(this, node);
    };

    NodeCtor.prototype.insertBefore = function blobioCellMassInsertBefore(node, child) {
      if (shouldWatchScript(node)) {
        node.dataset.blobioCellMassScriptPatch = 'seen';
        state.seenCacheScripts += 1;
        installGwtCallbackPatch();
      }
      return originalInsertBefore.call(this, node, child);
    };

    NodeCtor.prototype.__blobioCellMassScriptPatchInstalled = true;
    installGwtCallbackPatch();

    const timer = win.setInterval?.(() => {
      if (installGwtCallbackPatch()) {
        win.clearInterval?.(timer);
      }
    }, 10);
    win.setTimeout?.(() => win.clearInterval?.(timer), 30000);
  }

  function shouldWatchScript(node) {
    return node
      && node.tagName === 'SCRIPT'
      && node.src
      && node.dataset
      && !node.dataset.blobioCellMassScriptPatch
      && CACHE_SCRIPT_RE.test(node.src);
  }

  function installGwtCallbackPatch() {
    const html = win.html;
    if (!html || html.__blobioCellMassCallbackWrapped || typeof html.onScriptDownloaded !== 'function') {
      return false;
    }

    const original = html.onScriptDownloaded;
    html.onScriptDownloaded = function blobioCellMassOnScriptDownloaded(chunks) {
      let patchedChunks = chunks;
      try {
        patchedChunks = Array.isArray(chunks)
          ? chunks.map((chunk) => patchDownloadedChunk(chunk))
          : patchDownloadedChunk(chunks);
      } catch (error) {
        rememberError(`GWT patch failed: ${getErrorMessage(error)}`);
      }

      return original.call(this, patchedChunks);
    };

    html.__blobioCellMassCallbackWrapped = true;
    state.wrappedCallback = true;
    return true;
  }

  function patchDownloadedChunk(chunk) {
    if (typeof chunk !== 'string') {
      return chunk;
    }

    const result = patchGameBundle(chunk);
    if (result.changed || !state.lastPatchResult) {
      state.lastPatchResult = compactPatchResult(result);
    }

    if (!result.changed) {
      return chunk;
    }

    state.patchedChunks += 1;
    return result.source;
  }

  function patchGameBundle(source) {
    if (typeof source !== 'string') {
      return { source, changed: false, reason: 'not-a-string' };
    }

    if (source.includes(`${PATCH_MARKER}(g.n,g.w*g.w/100`)) {
      return { source, changed: false, reason: 'already-patched' };
    }

    const nameBlockStart = 'Mm(a.i,g.u?a.b:g.r?a.a:a.B);if(Nye(qxe.f,(Ize(),Gze))&&g.B!=null){';
    const nameDrawEnd = 'Gm(a.i,a.c,g.B,b,c)}}}}';

    if (!source.includes(nameBlockStart) || !source.includes(nameDrawEnd)) {
      return { source, changed: false, reason: 'renderer-block-not-found' };
    }

    let patched = source.replace(
      nameBlockStart,
      'Mm(a.i,g.u?a.b:g.r?a.a:a.B);d=false;if(Nye(qxe.f,(Ize(),Gze))&&g.B!=null){',
    );

    const drawPatch = [
      'Gm(a.i,a.c,g.B,b,c);d=true}}',
      'if(g.p&&$wnd.BlobioCellMassDraw){',
      'h=$wnd.BlobioCellMassDraw(g.n,g.w*g.w/100,g.w,g.M,g.N,g.B,d,d?f:0,0,qxe.g/100);',
      'if(h&&h.text){',
      'f=d?a.o.b:0;',
      '$wnd.__blobioCellMassCaptureDraw&&$wnd.__blobioCellMassCaptureDraw(g.n,h,a.B);',
      'Mm(a.i,h.color);',
      'Nn(a.i.b,h.scale);',
      'xp(a.o,a.i,h.text);',
      'if(a.o.d>g.N*h.maxWidth){h.scale*=g.N*h.maxWidth/a.o.d;Nn(a.i.b,h.scale);xp(a.o,a.i,h.text)}',
      'if(a.o.b>g.N*h.maxHeight){h.scale*=g.N*h.maxHeight/a.o.b;Nn(a.i.b,h.scale);xp(a.o,a.i,h.text)}',
      'b=g.R-a.o.d/2;',
      'c=g.S-a.o.b/2;',
      'd&&(c+=f*h.lineGap+a.o.b*0.55);',
      'c+=h.offset;',
      'c=$wnd.Math.max(g.S-g.M,c);',
      'c=$wnd.Math.min(g.S+g.M-a.o.b,c);',
      'Gm(a.i,a.c,h.text,b,c);',
      'Nn(a.i.b,1);',
      'Mm(a.i,a.B)',
      '}}}}',
    ].join('');

    patched = patched.replace(nameDrawEnd, drawPatch);
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

  function rememberSample(cellId, mass, rawSize, renderSize, cellSize, name, nameDrawn, result) {
    if (state.counters.labelsDrawn % 30 !== 1) {
      return;
    }

    state.samples.push({
      cellId,
      mass: Math.round(mass * 10) / 10,
      rawSize,
      renderSize,
      cellSize,
      name: typeof name === 'string' ? name.slice(0, 32) : '',
      nameDrawn,
      text: result.text,
      scale: Math.round(result.scale * 1000) / 1000,
      primary: result.primary,
      cached: result.cached,
      color: cloneColor(result.color),
    });

    if (state.samples.length > 12) {
      state.samples.shift();
    }
  }

  function debugReport() {
    const report = {
      installed: true,
      version: SCRIPT_VERSION,
      url: win.location?.href || '',
      uptimeMs: Date.now() - state.startedAt,
      settings: { ...settings, solid: { ...settings.solid } },
      counters: { ...state.counters, cachedCells: labelCache.size },
      patch: {
        seenCacheScripts: state.seenCacheScripts,
        wrappedCallback: state.wrappedCallback,
        patchedChunks: state.patchedChunks,
        lastPatchResult: state.lastPatchResult,
      },
      samples: state.samples.slice(),
      lastLabel: state.lastLabel,
      lastDrawCapture: state.lastDrawCapture,
      commands: [
        'BlobioCellMassDebug()',
        'BlobioShowMassDebug()',
        'blobioCellMassDebug()',
      ],
      errors: state.errors.slice(-8),
    };

    try {
      win.console?.log?.('[Blobio Cell Mass] debug', report);
      win.console?.log?.('[Blobio Cell Mass] JSON:', JSON.stringify(report));
    } catch {}
    return report;
  }

  function normalizeSettings(value = {}) {
    const source = value && typeof value === 'object' ? value : {};
    const defaults = {
      enabled: true,
      compact: true,
      smartRendering: true,
      emphasizeBiggest: true,
      mode: 'normal',
      textScale: 0.65,
      yOffset: 10,
      nameGap: 1.2,
      updateDelayMs: 3000,
      solid: { color: '#ffffff' },
      alpha: 100,
    };
    const solid = source.solid && typeof source.solid === 'object' ? source.solid : {};

    return {
      enabled: source.enabled === undefined ? defaults.enabled : Boolean(source.enabled),
      compact: source.compact === undefined ? defaults.compact : Boolean(source.compact),
      smartRendering: source.smartRendering === undefined ? defaults.smartRendering : Boolean(source.smartRendering),
      emphasizeBiggest: source.emphasizeBiggest === undefined ? defaults.emphasizeBiggest : Boolean(source.emphasizeBiggest),
      mode: ['normal', 'vip', 'custom'].includes(source.mode) ? source.mode : defaults.mode,
      textScale: clampNumber(source.textScale, 0.35, 1.4, defaults.textScale),
      yOffset: clampNumber(source.yOffset, -120, 120, defaults.yOffset),
      nameGap: clampNumber(source.nameGap, 0.1, 3, defaults.nameGap),
      updateDelayMs: Math.round(clampNumber(source.updateDelayMs, 0, 10000, defaults.updateDelayMs)),
      solid: {
        color: normalizeColor(solid.color, defaults.solid.color),
      },
      alpha: normalizeAlpha(source.alpha, defaults.alpha),
    };
  }

  function normalizeColor(value, fallback) {
    const color = String(value || '').trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
  }

  function normalizeAlpha(value, fallback) {
    const alpha = Number(value);
    if (!Number.isFinite(alpha)) {
      return fallback;
    }
    if (alpha > 0 && alpha <= 1) {
      return Math.round(alpha * 100);
    }
    return Math.max(0, Math.min(100, Math.round(alpha)));
  }

  function clampNumber(value, min, max, fallback) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function rememberError(message) {
    state.errors.push({
      at: Date.now(),
      message,
    });
    if (state.errors.length > 20) {
      state.errors.shift();
    }
  }

  function cloneColor(color) {
    if (!color || typeof color !== 'object') {
      return null;
    }
    return {
      d: roundNumber(color.d),
      c: roundNumber(color.c),
      b: roundNumber(color.b),
      a: roundNumber(color.a),
    };
  }

  function roundNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 10000) / 10000 : 0;
  }

  function getErrorMessage(error) {
    return error?.message || String(error);
  }
}
