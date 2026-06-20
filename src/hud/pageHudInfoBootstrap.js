const HUD_INFO_CUSTOM_HOST = 'custom.client.blobgame.io';
const HUD_INFO_SAMPLE_INTERVAL_MS = 250;
const HUD_INFO_PING_PROBE_INTERVAL_MS = 3000;
const HUD_INFO_PING_PROBE_TIMEOUT_MS = 2500;
const HUD_INFO_PING_STALE_MS = 9000;
const HUD_INFO_MAX_SAMPLES = 240;
const HUD_INFO_BOOSTER_GAME_STALE_MS = 1200;

const HUD_INFO_STYLE_MODES = new Set(['solid', 'simple']);
const HUD_INFO_DATA_MODES = new Set(['default', 'advanced', 'dev']);
const HUD_INFO_POSITION_MODES_SET = new Set(['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']);
const HUD_INFO_LAYOUT_MODES_SET = new Set(['line', 'below']);
const HUD_INFO_BOOSTER_COLOR_MODES = new Set(['solid', 'simple']);
const HUD_INFO_STYLE_CLASSES = [...HUD_INFO_STYLE_MODES].map((mode) => `is-${mode}`);
const HUD_INFO_POSITION_CLASSES = [...HUD_INFO_POSITION_MODES_SET].map((mode) => `position-${mode}`);
const HUD_INFO_ANCHOR_CLASSES = ['anchor-left', 'anchor-center', 'anchor-right'];
const HUD_INFO_LAYOUT_CLASSES = [...HUD_INFO_LAYOUT_MODES_SET].map((mode) => `is-layout-${mode}`);
const HUD_INFO_BOOSTER_TYPES = ['SPEED', 'MERGE', 'VIRUS'];
const HUD_INFO_BOOSTER_PATTERN = /\b(SPEED|MERGE|VIRUS)\s*:\s*(\d+(?:\.\d+)?)\s*s\b/gi;

const HUD_INFO_MASS_COLORS = {
  red: 'rgb(255, 74, 74)',
  yellow: 'rgb(255, 220, 74)',
  green: 'rgb(83, 255, 119)',
};

const HUD_INFO_BOOSTER_NAME_CLASSES = {
  SPEED: 'is-speed',
  MERGE: 'is-merge',
  VIRUS: 'is-virus',
};

const DEFAULT_HUD_INFO_RUNTIME_SETTINGS = Object.freeze({
  enabled: true,
  showScore: true,
  showFps: true,
  showPing: true,
  showCells: true,
  showBoosters: true,
  styleMode: 'simple',
  scoreMode: 'default',
  fpsMode: 'default',
  pingMode: 'default',
  boosterNameMode: 'simple',
  boosterDurationMode: 'simple',
  boosterLastSecFlash: false,
  positionMode: 'top-left',
  layoutMode: 'below',
  fontSize: 17,
  color: '#ffffff',
  alpha: 1,
});

const HUD_INFO_ROWS = [
  { key: 'score', label: 'Score', show: 'showScore', mode: 'scoreMode', format: hudInfoFormatScoreValue, color: (data) => hudInfoColorForMass(data.score) },
  { key: 'fps', label: 'FPS', show: 'showFps', mode: 'fpsMode', format: hudInfoFormatFpsValue, color: (data) => hudInfoColorForFps(data.fps) },
  { key: 'ping', label: 'Ping', show: 'showPing', mode: 'pingMode', format: hudInfoFormatPingValue, color: (data) => hudInfoColorForPing(data.ping) },
  { key: 'cells', label: 'Cells', show: 'showCells', format: hudInfoFormatCellsValue, color: () => HUD_INFO_MASS_COLORS.green },
  { key: 'boosters', label: '', show: 'showBoosters', booster: true },
];

export function pageHudInfoBootstrap(initialSettings, pageWindow = globalThis) {
  const win = pageWindow;
  const doc = win.document;
  const socketSendTimes = typeof win.WeakMap === 'function' ? new win.WeakMap() : null;

  if (!doc || win.location?.hostname !== HUD_INFO_CUSTOM_HOST) {
    return false;
  }

  if (win.__blobioHudInfoInstalled) {
    win.__blobioHudInfoRefresh?.(initialSettings);
    return true;
  }
  win.__blobioHudInfoInstalled = true;

  const state = {
    startedAt: Date.now(),
    patchApplied: false,
    dataUpdates: 0,
    lastSampleAt: 0,
    settings: normalizeHudInfoSettings(initialSettings),
    latest: {
      score: 0,
      fps: 0,
      averageScore: 0,
      averageFps: 0,
      frameTime: 0,
      ping: 0,
      averagePing: 0,
      peakPing: 0,
      pingUpdatedAt: 0,
      cells: 0,
      boosters: [],
      replayEnded: false,
    },
    boosterDurations: {},
    lastBoosterGameAt: 0,
    fpsSamples: [],
    pingSamples: [],
    renderFrame: null,
    positionFrame: null,
    root: null,
    rows: null,
    styleNode: null,
    pingProbeTimer: null,
    pingStaleTimer: null,
    pingProbeInFlight: false,
    nativeWebSocket: null,
    gameSocketUrl: '',
    gameSocketProtocols: undefined,
    patch: {
      seenChunks: 0,
      patchedChunks: 0,
      boosterPatched: 0,
      hudPatched: 0,
      cellsPatched: 0,
      socketPatched: 0,
      socketSendPatched: 0,
      wrappedCallback: false,
      lastResult: null,
      boosterCandidateChunks: 0,
      lastBoosterResult: null,
    },
    renderSettingsKey: '',
    renderDataKey: '',
    originalAppendChild: null,
    originalInsertBefore: null,
  };

  exposeApi();
  installWebSocketPingProbe();
  startPingProbeTimer();
  installScriptObserver();
  installGwtPatch();
  startPatchTimer();
  startUi();
  win.addEventListener?.('resize', schedulePosition, { passive: true });
  return true;

  function refresh(nextSettings) {
    state.settings = normalizeHudInfoSettings(nextSettings);
    renderHud();
    schedulePosition();
  }

  function exposeApi() {
    win.__BlobioHudInfoUpdate = updateFromGame;
    win.__BlobioHudInfoCells = updateCellsFromGame;
    win.__BlobioHudInfoBoosters = (boosters) => updateBoostersFromSource(boosters, 'game');
    win.__BlobioHudInfoSocketOpening = noteGameSocketOpening;
    win.__BlobioHudInfoSocketCreated = noteGameSocketCreated;
    win.__BlobioHudInfoSocketSend = noteGameSocketSend;
    win.__BlobioHudInfoSocketMessage = noteGameSocketMessage;
    win.__blobioHudInfoRefresh = refresh;
    win.__BlobioHudInfoDebug = debugReport;
    win.BlobioHudInfoDebug = debugReport;
  }

  function startUi() {
    const install = () => {
      ensureStyle();
      ensureHud();
      renderHud();
      positionHud();
    };

    if (doc.body) {
      install();
    } else {
      doc.addEventListener?.('DOMContentLoaded', install, { once: true });
      win.setTimeout?.(install, 0);
    }
  }

  function ensureHud() {
    if (state.root?.parentNode) {
      return;
    }

    const root = doc.createElement('div');
    root.classList.add('blobio-hud-info-root');

    const output = doc.createElement('div');
    output.classList.add('blobio-hud-info-output');

    const rows = {};
    for (const row of HUD_INFO_ROWS) {
      const parts = createHudRow(row.key);
      rows[row.key] = parts.row;
      rows[`${row.key}Label`] = parts.label;
      rows[`${row.key}Value`] = parts.value;
      rows[`${row.key}Separator`] = parts.separator;
      output.appendChild(parts.row);
    }

    root.appendChild(output);
    (doc.body || doc.documentElement).appendChild(root);
    state.root = root;
    state.rows = rows;
  }

  function createHudRow(name) {
    const row = doc.createElement('div');
    row.classList.add('blobio-hud-info-row');
    row.dataset.row = name;

    const label = doc.createElement('span');
    label.classList.add('blobio-hud-info-label');

    const value = doc.createElement('span');
    value.classList.add('blobio-hud-info-value');

    const separator = doc.createElement('span');
    separator.classList.add('blobio-hud-info-separator');
    separator.textContent = '|';

    row.append(label, value, separator);
    return { row, label, value, separator };
  }

  function scheduleRender() {
    if (state.renderFrame !== null) {
      return;
    }
    const raf = win.requestAnimationFrame || ((callback) => win.setTimeout(callback, 16));
    state.renderFrame = raf(() => {
      state.renderFrame = null;
      renderHud();
    });
  }

  function renderHud() {
    if (!state.rows || !state.root) {
      return;
    }

    expirePingIfStale(Date.now(), false);
    const settings = state.settings;
    const data = state.latest;
    const fontFamily = getChatFontFamily();
    const nextSettingsKey = hudInfoRenderSettingsKey(settings, fontFamily, data);
    const nextDataKey = hudInfoRenderDataKey(data, settings);
    const hasData = state.dataUpdates > 0;

    state.root.hidden = !settings.enabled;
    if (!settings.enabled) {
      return;
    }

    if (state.renderSettingsKey !== nextSettingsKey) {
      state.renderSettingsKey = nextSettingsKey;
      renderHudSettings(settings, fontFamily, data);
    }

    if (state.renderDataKey !== nextDataKey) {
      state.renderDataKey = nextDataKey;
      renderHudValues(data, settings);
    }

    hudInfoToggleClass(state.root, 'has-data', hasData);
  }

  function renderHudSettings(settings, fontFamily, data) {
    const separatorItems = [];
    const visibleRows = HUD_INFO_ROWS.map((row) => ({
      row,
      visible: hudInfoIsRowVisible(row, settings, data),
    }));
    const isEmpty = visibleRows.every((item) => !item.visible);
    state.root.classList.remove(
      ...HUD_INFO_STYLE_CLASSES,
      ...HUD_INFO_POSITION_CLASSES,
      ...HUD_INFO_ANCHOR_CLASSES,
      ...HUD_INFO_LAYOUT_CLASSES,
    );
    state.root.classList.add(
      `is-${settings.styleMode}`,
      `position-${settings.positionMode}`,
      `anchor-${hudInfoPositionAnchor(settings.positionMode)}`,
      `is-layout-${settings.layoutMode}`,
    );
    hudInfoToggleClass(state.root, 'has-readable-shadow', hudInfoShouldUseTextShadow(settings));
    hudInfoToggleClass(state.root, 'is-empty', isEmpty);
    state.root.style.setProperty('--blobio-hud-color-a', hudInfoRgbaFromSettings(settings));
    state.root.style.setProperty('--blobio-hud-font-size', `${settings.fontSize}px`);
    state.root.style.setProperty('--blobio-hud-font', fontFamily);

    for (const { row, visible } of visibleRows) {
      hudInfoSetRowVisible(state.rows[row.key], visible);
      hudInfoSetText(state.rows[`${row.key}Label`], hudInfoLabelTextFor(row.label, settings));
      separatorItems.push({ separator: state.rows[`${row.key}Separator`], visible });
    }
    hudInfoUpdateSeparators(separatorItems, settings);
    schedulePosition();
  }

  function renderHudValues(data, settings) {
    const useValueColors = settings.styleMode === 'simple';
    for (const row of HUD_INFO_ROWS) {
      const valueNode = state.rows[`${row.key}Value`];
      if (row.booster) {
        renderBoosterValue(valueNode, data.boosters, settings);
        continue;
      }
      hudInfoSetText(valueNode, row.format(data, settings[row.mode]));
      hudInfoSetStyleColor(valueNode, useValueColors ? row.color(data) : '');
    }
  }

  function renderBoosterValue(valueNode, boosters, settings) {
    if (!valueNode) {
      return;
    }

    valueNode.textContent = '';
    hudInfoSetStyleColor(valueNode, '');

    const active = hudInfoVisibleBoosters({ boosters });
    if (!active.length) {
      return;
    }

    appendBoosterText(valueNode, '[', 'blobio-hud-info-booster-punctuation');
    active.forEach((booster, index) => {
      if (index > 0) {
        appendBoosterText(valueNode, ', ', 'blobio-hud-info-booster-punctuation');
      }

      const name = appendBoosterText(valueNode, `${booster.type}:`, 'blobio-hud-info-booster-name');
      name.classList.add(settings.boosterNameMode === 'simple'
        ? HUD_INFO_BOOSTER_NAME_CLASSES[booster.type]
        : 'is-solid-color');

      const duration = appendBoosterText(valueNode, ` ${hudInfoNumberText(booster.seconds)}s`, 'blobio-hud-info-booster-duration');
      if (settings.boosterDurationMode === 'simple') {
        duration.classList.add(hudInfoBoosterDurationClass(booster));
        duration.classList.toggle('is-flashing', Boolean(settings.boosterLastSecFlash && booster.seconds <= 3));
      } else {
        duration.classList.add('is-solid-color');
      }
    });
    appendBoosterText(valueNode, ']', 'blobio-hud-info-booster-punctuation');
  }

  function appendBoosterText(parent, text, className) {
    const span = doc.createElement('span');
    span.classList.add(className);
    span.textContent = text;
    parent.appendChild(span);
    return span;
  }

  function debugReport() {
    const boosterRow = state.rows?.boosters || null;
    const boosterValue = state.rows?.boostersValue || null;
    return {
      installed: true,
      url: win.location?.href || '',
      uptimeMs: Date.now() - state.startedAt,
      settings: { ...state.settings },
      latest: {
        score: state.latest.score,
        fps: state.latest.fps,
        ping: state.latest.ping,
        cells: state.latest.cells,
        boosters: state.latest.boosters.map((booster) => ({ ...booster })),
      },
      dom: {
        rootExists: Boolean(state.root?.parentNode),
        rootHidden: Boolean(state.root?.hidden),
        rootClassName: state.root?.className || '',
        boosterRowExists: Boolean(boosterRow?.parentNode),
        boosterRowClassName: boosterRow?.className || '',
        boosterText: boosterValue?.textContent || '',
      },
      patch: {
        patchApplied: state.patchApplied,
        ...state.patch,
      },
      timers: {
        msSinceBoosterGame: state.lastBoosterGameAt ? Date.now() - state.lastBoosterGameAt : null,
      },
    };
  }

  function getChatFontFamily() {
    try {
      const chat = doc.querySelector?.('#chat');
      const style = chat ? win.getComputedStyle?.(chat) : null;
      if (style?.fontFamily) {
        return style.fontFamily;
      }
    } catch {}
    return 'Ubuntu, Arial, sans-serif';
  }

  function schedulePosition() {
    if (state.positionFrame !== null) {
      return;
    }
    const raf = win.requestAnimationFrame || ((callback) => win.setTimeout(callback, 16));
    state.positionFrame = raf(() => {
      state.positionFrame = null;
      positionHud();
    });
  }

  function positionHud() {
    if (!state.root?.parentNode) {
      return;
    }

    const mode = state.settings.positionMode;
    const anchor = hudInfoPositionAnchor(mode);
    const isBottom = hudInfoIsBottomPosition(mode);
    state.root.style.top = isBottom ? 'auto' : '12px';
    state.root.style.bottom = isBottom ? '12px' : 'auto';
    state.root.style.left = anchor === 'right' ? 'auto' : anchor === 'center' ? '50%' : '12px';
    state.root.style.right = anchor === 'right' ? '12px' : 'auto';
    state.root.style.transform = anchor === 'center' ? 'translateX(-50%)' : 'none';
  }

  function updateFromGame(score, fps, replayEnded) {
    const now = Date.now();
    const nextScore = Math.max(0, Math.round(Number(score) || 0));
    const nextFps = Math.max(0, Math.round(Number(fps) || 0));
    state.dataUpdates += 1;
    state.latest.score = nextScore;
    state.latest.fps = nextFps;
    state.latest.replayEnded = Boolean(replayEnded);
    state.latest.frameTime = nextFps > 0 ? 1000 / nextFps : 0;
    state.latest.averageScore = hudInfoAverageMass(nextScore, state.latest.cells);

    if (now - state.lastSampleAt >= HUD_INFO_SAMPLE_INTERVAL_MS) {
      state.lastSampleAt = now;
      hudInfoPushSample(state.fpsSamples, nextFps);
      state.latest.averageFps = hudInfoAverage(state.fpsSamples);
      sampleBoostersFromDom(now);
    }
    scheduleRender();
  }

  function updateCellsFromGame(cells) {
    const count = Math.max(0, Math.round(Number(cells) || 0));
    if (state.latest.cells === count) {
      return;
    }
    state.latest.cells = count;
    state.latest.averageScore = hudInfoAverageMass(state.latest.score, count);
    scheduleRender();
  }

  function updateBoostersFromSource(source, sourceName = 'game') {
    const now = Date.now();
    if (sourceName === 'game') {
      state.lastBoosterGameAt = now;
    }

    const boosters = hudInfoApplyBoosterDurations(hudInfoParseBoosters(source), state.boosterDurations, now);
    if (hudInfoBoostersDataKey(state.latest.boosters) === hudInfoBoostersDataKey(boosters)) {
      return;
    }
    state.latest.boosters = boosters;
    scheduleRender();
  }

  function sampleBoostersFromDom(now = Date.now()) {
    if (now - state.lastBoosterGameAt < HUD_INFO_BOOSTER_GAME_STALE_MS) {
      return;
    }

    const text = hudInfoFindBoosterTextInDom(doc);
    if (text || state.latest.boosters.length) {
      updateBoostersFromSource(text || [], 'dom');
    }
  }

  function updatePingFromSocket(ping, source = 'passive') {
    const number = Number(ping);
    if (!Number.isFinite(number) || number <= 0 || number > 5000) {
      return;
    }
    const value = Math.max(1, Math.round(number));
    if (source === 'passive') {
      expirePingIfStale(Date.now(), true);
      return;
    }
    state.latest.ping = value;
    state.latest.pingUpdatedAt = Date.now();
    hudInfoPushSample(state.pingSamples, value);
    state.latest.averagePing = hudInfoAverage(state.pingSamples);
    state.latest.peakPing = hudInfoMaxValue(state.pingSamples);
    schedulePingExpiry();
    scheduleRender();
  }

  function expirePingIfStale(now = Date.now(), shouldRender = true) {
    if (!state.latest.ping || !state.latest.pingUpdatedAt) {
      return false;
    }
    if (now - state.latest.pingUpdatedAt < HUD_INFO_PING_STALE_MS) {
      return false;
    }
    state.latest.ping = 0;
    state.latest.averagePing = 0;
    state.latest.peakPing = 0;
    state.latest.pingUpdatedAt = 0;
    state.pingSamples = [];
    if (shouldRender) {
      scheduleRender();
    }
    return true;
  }

  function schedulePingExpiry() {
    if (state.pingStaleTimer !== null) {
      win.clearTimeout?.(state.pingStaleTimer);
      state.pingStaleTimer = null;
    }
    state.pingStaleTimer = win.setTimeout?.(() => {
      state.pingStaleTimer = null;
      expirePingIfStale(Date.now(), true);
    }, HUD_INFO_PING_STALE_MS + 50) ?? null;
  }

  function expectedSocketTarget() {
    const search = String(win.location?.search || '');
    try {
      const SearchParams = win.URLSearchParams || URLSearchParams;
      const params = new SearchParams(search);
      return params.get('ip') || '';
    } catch {
      const match = search.match(/[?&]ip=([^&]+)/);
      return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : '';
    }
  }

  function isGameSocketUrl(url) {
    const text = String(url || '');
    const target = expectedSocketTarget();
    return target ? text.includes(target) : /^wss?:\/\//i.test(text);
  }

  function guessedSocketUrl() {
    const target = expectedSocketTarget();
    if (!target) {
      return '';
    }
    return `${win.location?.protocol === 'https:' ? 'wss' : 'ws'}://${target}`;
  }

  function probeSocketUrl() {
    return guessedSocketUrl() || state.gameSocketUrl || '';
  }

  function startPingProbeTimer() {
    if (state.pingProbeTimer !== null || typeof state.nativeWebSocket !== 'function') {
      return;
    }
    const runProbe = () => probeServerPing();
    state.pingProbeTimer = win.setInterval?.(runProbe, HUD_INFO_PING_PROBE_INTERVAL_MS) ?? null;
    runProbe();
  }

  function probeServerPing() {
    const url = probeSocketUrl();
    if (state.pingProbeInFlight || !url || typeof state.nativeWebSocket !== 'function') {
      return;
    }
    state.pingProbeInFlight = true;
    const startedAt = hudInfoNowMs();
    let socket = null;
    let finished = false;
    let timeout = null;
    const finish = (latency) => {
      if (finished) {
        return;
      }
      finished = true;
      win.clearTimeout?.(timeout);
      state.pingProbeInFlight = false;
      if (Number.isFinite(latency)) {
        updatePingFromSocket(latency, 'probe');
      } else {
        expirePingIfStale(Date.now(), true);
      }
      try {
        socket?.close?.(1000, 'blobio-hud-ping');
      } catch {}
    };

    try {
      socket = new state.nativeWebSocket(url);
    } catch {
      state.pingProbeInFlight = false;
      return;
    }

    timeout = win.setTimeout?.(() => finish(null), HUD_INFO_PING_PROBE_TIMEOUT_MS);
    socket.addEventListener?.('open', () => finish(hudInfoNowMs() - startedAt), { once: true });
    socket.addEventListener?.('error', () => finish(null), { once: true });
    socket.addEventListener?.('close', () => finish(null), { once: true });
  }

  function rememberGameSocket(url, protocols) {
    if (!isGameSocketUrl(url)) {
      return false;
    }
    state.gameSocketUrl = String(url);
    state.gameSocketProtocols = protocols;
    startPingProbeTimer();
    return true;
  }

  function installWebSocketPingProbe() {
    const NativeWebSocket = win.WebSocket;
    if (typeof NativeWebSocket !== 'function' || NativeWebSocket.__blobioHudInfoWrapped) {
      return;
    }
    state.nativeWebSocket = NativeWebSocket;

    function BlobioHudInfoWebSocket(url, protocols) {
      const socket = protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols);
      monitorSocket(socket, url, protocols);
      return socket;
    }

    try {
      Object.setPrototypeOf(BlobioHudInfoWebSocket, NativeWebSocket);
    } catch {}
    BlobioHudInfoWebSocket.prototype = NativeWebSocket.prototype;
    for (const key of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) {
      try {
        Object.defineProperty(BlobioHudInfoWebSocket, key, {
          configurable: true,
          enumerable: true,
          value: NativeWebSocket[key],
        });
      } catch {}
    }
    BlobioHudInfoWebSocket.__blobioHudInfoWrapped = true;
    win.WebSocket = BlobioHudInfoWebSocket;
  }

  function monitorSocket(socket, url, protocols) {
    if (!socket || socket.__blobioHudInfoMonitored || !isGameSocketUrl(url)) {
      return;
    }
    rememberGameSocket(url, protocols);
    socket.__blobioHudInfoMonitored = true;
  }

  function noteGameSocketOpening(url, protocols) {
    rememberGameSocket(url, protocols);
  }

  function noteGameSocketCreated(socket, url, protocols) {
    monitorSocket(socket, url, protocols);
  }

  function noteGameSocketSend(socket) {
    const sentAt = hudInfoNowMs();
    if (socketSendTimes && socket) {
      socketSendTimes.set(socket, sentAt);
      return;
    }
    try {
      socket.__blobioHudInfoLastSendAt = sentAt;
    } catch {}
  }

  function noteGameSocketMessage(socket) {
    let sentAt = 0;
    if (socketSendTimes && socket) {
      sentAt = socketSendTimes.get(socket) || 0;
      socketSendTimes.delete(socket);
    } else {
      sentAt = Number(socket?.__blobioHudInfoLastSendAt) || 0;
      try {
        socket.__blobioHudInfoLastSendAt = 0;
      } catch {}
    }
    if (sentAt) {
      updatePingFromSocket(hudInfoNowMs() - sentAt, 'passive');
    }
  }

  function patchGameCode(code) {
    if (typeof code !== 'string') {
      return { code, changed: false };
    }

    let patched = code;
    let changed = false;
    const result = {
      codeLength: code.length,
      boosterPatched: false,
      hudPatched: false,
      cellsPatched: false,
      socketPatched: false,
      socketSendPatched: false,
      boosterNeedlePresent: false,
      boosterDrawPresent: false,
      boosterPatchKind: '',
      boosterTextMethod: '',
    };
    const boosterNeedle = "function Tqe(a,b){var c,d;bt(a.a);for(c=0;c<b.length;c++){d=b[c];if(!d){break}Gm(a.c,a.a,d.LW(),$b.a.width*f0e,$b.a.height-10-c*20)}jt(a.a)}";
    const boosterDrawPattern = /[A-Za-z_$][\w$]*\(a\.c,a\.a,d\.([A-Za-z_$][\w$]*)\(\),\$b\.a\.width\*[A-Za-z_$][\w$]*,\$b\.a\.height-10-c\*20\)/;
    const boosterPattern = /function ([A-Za-z_$][\w$]*)\(a,b\)\{var c,d;bt\(a\.a\);for\(c=0;c<b\.length;c\+\+\)\{d=b\[c\];if\(!d\)\{break\}[A-Za-z_$][\w$]*\(a\.c,a\.a,d\.([A-Za-z_$][\w$]*)\(\),\$b\.a\.width\*[A-Za-z_$][\w$]*,\$b\.a\.height-10-c\*20\)\}jt\(a\.a\)\}/;
    const boosterReplacementFor = (name, textMethod) => `function ${name}(a,b){var c,d,e,f;f=[];bt(a.a);for(c=0;c<b.length;c++){d=b[c];if(!d){break}e=d.${textMethod}();f[f.length]=e}$wnd.__BlobioHudInfoBoosters&&$wnd.__BlobioHudInfoBoosters(f);jt(a.a)}`;

    result.boosterNeedlePresent = patched.includes(boosterNeedle);
    const boosterDrawMatch = patched.match(boosterDrawPattern);
    result.boosterDrawPresent = Boolean(boosterDrawMatch);
    result.boosterTextMethod = boosterDrawMatch?.[1] || '';
    if (result.boosterNeedlePresent || result.boosterDrawPresent) {
      state.patch.boosterCandidateChunks += 1;
    }
    if (!patched.includes('__BlobioHudInfoBoosters')) {
      if (result.boosterNeedlePresent) {
        patched = patched.replace(boosterNeedle, boosterReplacementFor('Tqe', 'LW'));
        changed = true;
        result.boosterPatched = true;
        result.boosterPatchKind = 'exact';
      } else {
        const boosterMatch = patched.match(boosterPattern);
        if (boosterMatch) {
          patched = patched.replace(boosterPattern, boosterReplacementFor(boosterMatch[1], boosterMatch[2]));
          changed = true;
          result.boosterPatched = true;
          result.boosterPatchKind = 'pattern';
          result.boosterTextMethod = boosterMatch[2];
        }
      }
    }

    const hudNeedle = "function Tqe(a){var b;bt(a.a);b=((Yse(),Qse)?'Replay: ':'Score: ')+((sxe(),qxe).g/100|0);if(Nye(qxe.f,(Ize(),zze))){Wqe(a);b=_Ee(b,' | '+y1d(a.d)+' fps')}qxe.I.d&&(b='Replay ended');Gm(a.c,a.a,b,10,$b.a.height-10);jt(a.a)}";
    const hudReplacement = "function Tqe(a){var b;bt(a.a);b=((sxe(),qxe).g/100|0);Wqe(a);$wnd.__BlobioHudInfoUpdate&&$wnd.__BlobioHudInfoUpdate(b,y1d(a.d),qxe.I.d?1:0);jt(a.a)}";
    if (patched.includes(hudNeedle) && !patched.includes('__BlobioHudInfoUpdate')) {
      patched = patched.replace(hudNeedle, hudReplacement);
      changed = true;
      result.hudPatched = true;
    }

    const cellsNeedle = "function zxe(a){var b,c,d,e,f,g,h;g=0;b=0;h=TIe(a.A.a);for(d=(f=(new JJe(a.A.a)).a.iX().Rd(),new PJe(f));d.a.Td();){c=(e=d.a.Ud(),e.WX());g+=c.w*c.w;b+=c.w}a.g=g;h>1&&(a.a=b/h|0)}";
    const cellsReplacement = "function zxe(a){var b,c,d,e,f,g,h;g=0;b=0;h=TIe(a.A.a);for(d=(f=(new JJe(a.A.a)).a.iX().Rd(),new PJe(f));d.a.Td();){c=(e=d.a.Ud(),e.WX());g+=c.w*c.w;b+=c.w}a.g=g;h>1&&(a.a=b/h|0);$wnd.__BlobioHudInfoCells&&$wnd.__BlobioHudInfoCells(h)}";
    if (patched.includes(cellsNeedle) && !patched.includes('__BlobioHudInfoCells')) {
      patched = patched.replace(cellsNeedle, cellsReplacement);
      changed = true;
      result.cellsPatched = true;
    }

    const socketNeedle = "function kxe(e,b,c){var d=e;d.ws&&d.ws.close(X0e);d.ws=new WebSocket(b,c);d.ws.onopen=function(){d.uW()};d.ws.binaryType=xsf;d.ws.onclose=function(a){d.qW(a.code,a.reason)};d.ws.onerror=function(a){d.rW(a.type,a.toString())};d.ws.onmessage=function(a){typeof a.data==USe?d.tW(a.data):d.sW(a.data)}}";
    const socketReplacement = "function kxe(e,b,c){var d=e;$wnd.__BlobioHudInfoSocketOpening&&$wnd.__BlobioHudInfoSocketOpening(b,c);d.ws&&d.ws.close(X0e);d.ws=new WebSocket(b,c);$wnd.__BlobioHudInfoSocketCreated&&$wnd.__BlobioHudInfoSocketCreated(d.ws,b,c);d.ws.onopen=function(){d.uW()};d.ws.binaryType=xsf;d.ws.onclose=function(a){d.qW(a.code,a.reason)};d.ws.onerror=function(a){d.rW(a.type,a.toString())};d.ws.onmessage=function(a){$wnd.__BlobioHudInfoSocketMessage&&$wnd.__BlobioHudInfoSocketMessage(d.ws);typeof a.data==USe?d.tW(a.data):d.sW(a.data)}}";
    if (patched.includes(socketNeedle) && !patched.includes('__BlobioHudInfoSocketCreated')) {
      patched = patched.replace(socketNeedle, socketReplacement);
      changed = true;
      result.socketPatched = true;
    }

    const socketSendNeedle = "_.pW=function BVd(b){var c,d,e;d=fme(b.length);c=new Int8Array(d);c.set(b,0);try{this.ws&&this.ws.send(d)}catch(a){a=Yke(a);if(q1d(a,36)){e=a;throw Zke(new fVd(e))}else throw Zke(a)}};";
    const socketSendReplacement = "_.pW=function BVd(b){var c,d,e;d=fme(b.length);c=new Int8Array(d);c.set(b,0);try{this.ws&&($wnd.__BlobioHudInfoSocketSend&&$wnd.__BlobioHudInfoSocketSend(this.ws),this.ws.send(d))}catch(a){a=Yke(a);if(q1d(a,36)){e=a;throw Zke(new fVd(e))}else throw Zke(a)}};";
    if (patched.includes(socketSendNeedle) && !patched.includes('__BlobioHudInfoSocketSend')) {
      patched = patched.replace(socketSendNeedle, socketSendReplacement);
      changed = true;
      result.socketSendPatched = true;
    }

    state.patch.lastResult = { ...result, changed };
    if (result.boosterNeedlePresent || result.boosterDrawPresent || result.boosterPatched) {
      state.patch.lastBoosterResult = state.patch.lastResult;
    }
    return { code: patched, changed };
  }

  function patchDownloadedChunk(chunk) {
    state.patch.seenChunks += 1;
    const result = patchGameCode(chunk);
    if (result.changed) {
      state.patchApplied = true;
      state.patch.patchedChunks += 1;
      if (state.patch.lastResult?.boosterPatched) state.patch.boosterPatched += 1;
      if (state.patch.lastResult?.hudPatched) state.patch.hudPatched += 1;
      if (state.patch.lastResult?.cellsPatched) state.patch.cellsPatched += 1;
      if (state.patch.lastResult?.socketPatched) state.patch.socketPatched += 1;
      if (state.patch.lastResult?.socketSendPatched) state.patch.socketSendPatched += 1;
    }
    return result.code;
  }

  function installGwtPatch() {
    const html = win.html;
    if (!html || html.__blobioHudInfoWrapped || typeof html.onScriptDownloaded !== 'function') {
      return false;
    }
    const original = html.onScriptDownloaded;
    html.onScriptDownloaded = function blobioHudInfoOnScriptDownloaded(chunks) {
      const patched = Array.isArray(chunks)
        ? chunks.map(patchDownloadedChunk)
        : patchDownloadedChunk(chunks);
      return original.call(this, patched);
    };
    html.__blobioHudInfoWrapped = true;
    state.patch.wrappedCallback = true;
    return true;
  }

  function installScriptObserver() {
    const NodeCtor = win.Node;
    if (!NodeCtor?.prototype || NodeCtor.prototype.__blobioHudInfoNodePatch) {
      return;
    }
    state.originalAppendChild = NodeCtor.prototype.appendChild;
    state.originalInsertBefore = NodeCtor.prototype.insertBefore;

    NodeCtor.prototype.appendChild = function blobioHudInfoAppendChild(node) {
      if (node?.tagName === 'SCRIPT') {
        installGwtPatch();
      }
      return state.originalAppendChild.call(this, node);
    };

    NodeCtor.prototype.insertBefore = function blobioHudInfoInsertBefore(node, child) {
      if (node?.tagName === 'SCRIPT') {
        installGwtPatch();
      }
      return state.originalInsertBefore.call(this, node, child);
    };
    NodeCtor.prototype.__blobioHudInfoNodePatch = true;
  }

  function startPatchTimer() {
    const timer = win.setInterval?.(() => {
      if (installGwtPatch() || Date.now() - state.startedAt > 30000) {
        win.clearInterval?.(timer);
      }
    }, 50);
  }

  function ensureStyle() {
    if (state.styleNode?.parentNode) {
      return;
    }
    const style = doc.createElement('style');
    style.id = 'blobio-hud-info-style';
    style.textContent = `
.blobio-hud-info-root {
  --blobio-hud-color-a: rgba(255, 255, 255, 1);
  --blobio-hud-font-size: 17px;
  --blobio-hud-font: Ubuntu, Arial, sans-serif;
  position: fixed;
  z-index: 79;
  pointer-events: none;
  font-family: var(--blobio-hud-font);
  font-size: var(--blobio-hud-font-size);
  line-height: 1.12;
}
.blobio-hud-info-output {
  min-width: 128px;
  display: flex;
  gap: 12px;
  font-weight: 600;
  letter-spacing: 0;
  text-align: right;
  white-space: nowrap;
}
.blobio-hud-info-root.is-layout-line .blobio-hud-info-output {
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: baseline;
  justify-content: flex-start;
}
.blobio-hud-info-root.is-layout-below .blobio-hud-info-output {
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}
.blobio-hud-info-root.anchor-left .blobio-hud-info-output {
  align-items: flex-start;
  text-align: left;
}
.blobio-hud-info-root.anchor-center .blobio-hud-info-output {
  align-items: center;
  text-align: center;
}
.blobio-hud-info-root.anchor-right .blobio-hud-info-output {
  align-items: flex-end;
  text-align: right;
}
.blobio-hud-info-row {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  align-items: baseline;
  gap: 5px;
}
.blobio-hud-info-root.anchor-left.is-layout-below .blobio-hud-info-row {
  justify-content: flex-start;
}
.blobio-hud-info-root.anchor-center.is-layout-below .blobio-hud-info-row {
  justify-content: center;
}
.blobio-hud-info-root.anchor-right.is-layout-below .blobio-hud-info-row {
  flex-direction: row-reverse;
  justify-content: flex-start;
}
.blobio-hud-info-row.is-hidden,
.blobio-hud-info-root.is-empty .blobio-hud-info-output {
  display: none;
}
.blobio-hud-info-root.is-solid .blobio-hud-info-row {
  color: var(--blobio-hud-color-a);
}
.blobio-hud-info-root.has-readable-shadow.is-solid .blobio-hud-info-row,
.blobio-hud-info-root.has-readable-shadow.is-simple .blobio-hud-info-label,
.blobio-hud-info-root.has-readable-shadow.is-simple .blobio-hud-info-value {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.95), 1px 0 1px rgba(0, 0, 0, 0.9), -1px 0 1px rgba(0, 0, 0, 0.9);
}
.blobio-hud-info-root.is-simple .blobio-hud-info-label {
  color: var(--blobio-hud-color-a);
}
.blobio-hud-info-separator {
  display: none;
  color: #fff;
  text-shadow: none;
}
.blobio-hud-info-separator.is-visible {
  display: inline;
}
.blobio-hud-info-row[data-row="boosters"] .blobio-hud-info-label {
  display: none;
}
.blobio-hud-info-booster-name {
  font-weight: 800;
}
.blobio-hud-info-booster-name.is-solid-color,
.blobio-hud-info-booster-duration.is-solid-color,
.blobio-hud-info-booster-punctuation {
  color: var(--blobio-hud-color-a);
}
.blobio-hud-info-booster-name.is-speed {
  color: rgb(103, 207, 255);
}
.blobio-hud-info-booster-name.is-merge {
  color: rgb(74, 126, 255);
}
.blobio-hud-info-booster-name.is-virus {
  color: rgb(255, 74, 74);
}
.blobio-hud-info-booster-duration.is-duration-green {
  color: rgb(83, 255, 119);
}
.blobio-hud-info-booster-duration.is-duration-yellow {
  color: rgb(255, 220, 74);
}
.blobio-hud-info-booster-duration.is-duration-red {
  color: rgb(255, 74, 74);
}
.blobio-hud-info-booster-duration.is-flashing {
  display: inline-block;
  transform-origin: center;
  will-change: transform, text-shadow;
  animation: blobio-hud-booster-flash 0.9s ease-out 1;
}
@keyframes blobio-hud-booster-flash {
  0%, 100% {
    transform: scale(1);
    text-shadow: 0 0 2px rgba(255, 74, 74, 0.35), 0 1px 2px rgba(0, 0, 0, 0.95);
  }
  35% {
    transform: scale(1.85);
    text-shadow: 0 0 12px rgba(255, 74, 74, 0.95), 0 0 20px rgba(255, 74, 74, 0.7), 0 0 32px rgba(255, 74, 74, 0.35), 0 1px 2px rgba(0, 0, 0, 0.95);
  }
}`;
    (doc.head || doc.documentElement).appendChild(style);
    state.styleNode = style;
  }
}

function normalizeHudInfoSettings(settings = {}) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return {
    enabled: source.enabled === undefined ? DEFAULT_HUD_INFO_RUNTIME_SETTINGS.enabled : Boolean(source.enabled),
    showScore: source.showScore === undefined ? DEFAULT_HUD_INFO_RUNTIME_SETTINGS.showScore : Boolean(source.showScore),
    showFps: source.showFps === undefined ? DEFAULT_HUD_INFO_RUNTIME_SETTINGS.showFps : Boolean(source.showFps),
    showPing: source.showPing === undefined ? DEFAULT_HUD_INFO_RUNTIME_SETTINGS.showPing : Boolean(source.showPing),
    showCells: source.showCells === undefined ? DEFAULT_HUD_INFO_RUNTIME_SETTINGS.showCells : Boolean(source.showCells),
    showBoosters: source.showBoosters === undefined ? DEFAULT_HUD_INFO_RUNTIME_SETTINGS.showBoosters : Boolean(source.showBoosters),
    styleMode: HUD_INFO_STYLE_MODES.has(source.styleMode) ? source.styleMode : DEFAULT_HUD_INFO_RUNTIME_SETTINGS.styleMode,
    scoreMode: HUD_INFO_DATA_MODES.has(source.scoreMode) ? source.scoreMode : DEFAULT_HUD_INFO_RUNTIME_SETTINGS.scoreMode,
    fpsMode: HUD_INFO_DATA_MODES.has(source.fpsMode) ? source.fpsMode : DEFAULT_HUD_INFO_RUNTIME_SETTINGS.fpsMode,
    pingMode: HUD_INFO_DATA_MODES.has(source.pingMode) ? source.pingMode : DEFAULT_HUD_INFO_RUNTIME_SETTINGS.pingMode,
    boosterNameMode: HUD_INFO_BOOSTER_COLOR_MODES.has(source.boosterNameMode)
      ? source.boosterNameMode
      : DEFAULT_HUD_INFO_RUNTIME_SETTINGS.boosterNameMode,
    boosterDurationMode: HUD_INFO_BOOSTER_COLOR_MODES.has(source.boosterDurationMode)
      ? source.boosterDurationMode
      : DEFAULT_HUD_INFO_RUNTIME_SETTINGS.boosterDurationMode,
    boosterLastSecFlash: source.boosterLastSecFlash === undefined
      ? DEFAULT_HUD_INFO_RUNTIME_SETTINGS.boosterLastSecFlash
      : Boolean(source.boosterLastSecFlash),
    positionMode: HUD_INFO_POSITION_MODES_SET.has(source.positionMode) ? source.positionMode : DEFAULT_HUD_INFO_RUNTIME_SETTINGS.positionMode,
    layoutMode: HUD_INFO_LAYOUT_MODES_SET.has(source.layoutMode) ? source.layoutMode : DEFAULT_HUD_INFO_RUNTIME_SETTINGS.layoutMode,
    fontSize: hudInfoClampNumber(source.fontSize, 10, 32, DEFAULT_HUD_INFO_RUNTIME_SETTINGS.fontSize),
    color: hudInfoNormalizeColor(source.color, DEFAULT_HUD_INFO_RUNTIME_SETTINGS.color),
    alpha: hudInfoClampNumber(source.alpha, 0, 1, DEFAULT_HUD_INFO_RUNTIME_SETTINGS.alpha),
  };
}

function hudInfoNormalizeColor(value, fallback) {
  const color = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

function hudInfoClampNumber(value, min, max, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, number));
}

function hudInfoRgbaFromSettings(settings) {
  const clean = hudInfoNormalizeColor(settings.color, DEFAULT_HUD_INFO_RUNTIME_SETTINGS.color).slice(1);
  const red = Number.parseInt(clean.slice(0, 2), 16) || 0;
  const green = Number.parseInt(clean.slice(2, 4), 16) || 0;
  const blue = Number.parseInt(clean.slice(4, 6), 16) || 0;
  return `rgba(${red}, ${green}, ${blue}, ${Math.round(settings.alpha * 1000) / 1000})`;
}

function hudInfoNumberText(value) {
  const number = Math.round(Number(value) || 0);
  return number.toLocaleString('en-US');
}

function hudInfoColorForMass(score) {
  const value = Number(score) || 0;
  if (value >= 40000) return HUD_INFO_MASS_COLORS.green;
  if (value >= 20000) return HUD_INFO_MASS_COLORS.yellow;
  return HUD_INFO_MASS_COLORS.red;
}

function hudInfoColorForFps(fps) {
  const value = Number(fps) || 0;
  if (value >= 50) return HUD_INFO_MASS_COLORS.green;
  if (value >= 30) return HUD_INFO_MASS_COLORS.yellow;
  return HUD_INFO_MASS_COLORS.red;
}

function hudInfoColorForPing(ping) {
  const value = Number(ping) || 0;
  if (value >= 70) return HUD_INFO_MASS_COLORS.red;
  if (value >= 20) return HUD_INFO_MASS_COLORS.yellow;
  return HUD_INFO_MASS_COLORS.green;
}

function hudInfoFormatScoreValue(data, mode) {
  const score = hudInfoNumberText(data.score);
  return mode === 'advanced' || mode === 'dev'
    ? `${score} [${hudInfoNumberText(data.averageScore)}]`
    : score;
}

function hudInfoFormatFpsValue(data, mode) {
  const fps = hudInfoNumberText(data.fps);
  if (mode === 'advanced') {
    return `${fps} [${hudInfoNumberText(data.averageFps)}]`;
  }
  if (mode === 'dev') {
    return `${fps} [${(Number(data.frameTime) || 0).toFixed(1)} ms]`;
  }
  return fps;
}

function hudInfoFormatPingValue(data, mode) {
  const hasPing = Number(data.ping) > 0;
  const ping = hasPing ? hudInfoNumberText(data.ping) : '--';
  const averagePing = hasPing ? hudInfoNumberText(data.averagePing) : '--';
  const peakPing = hasPing ? hudInfoNumberText(data.peakPing) : '--';
  if (mode === 'advanced') {
    return `${ping} [${averagePing}]`;
  }
  if (mode === 'dev') {
    return `${ping} [${averagePing}] + [${peakPing}]`;
  }
  return ping;
}

function hudInfoFormatCellsValue(data) {
  return hudInfoNumberText(data.cells);
}

function hudInfoParseBoosters(source) {
  const values = Array.isArray(source) ? source : [source];
  const byType = new Map();

  for (const value of values) {
    const text = hudInfoBoosterText(value);
    if (!text) {
      continue;
    }

    HUD_INFO_BOOSTER_PATTERN.lastIndex = 0;
    let match = HUD_INFO_BOOSTER_PATTERN.exec(text);
    while (match) {
      const type = String(match[1] || '').toUpperCase();
      const seconds = Math.max(0, Math.ceil(Number(match[2]) || 0));
      if (HUD_INFO_BOOSTER_TYPES.includes(type) && seconds > 0) {
        byType.set(type, { type, seconds });
      }
      match = HUD_INFO_BOOSTER_PATTERN.exec(text);
    }
  }

  return HUD_INFO_BOOSTER_TYPES
    .map((type) => byType.get(type))
    .filter(Boolean);
}

function hudInfoBoosterText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value.LW === 'function') {
    try {
      return String(value.LW() || '');
    } catch {
      return '';
    }
  }
  return String(value || '');
}

function hudInfoApplyBoosterDurations(boosters, durations, now) {
  const activeTypes = new Set(boosters.map((booster) => booster.type));
  for (const type of Object.keys(durations)) {
    if (!activeTypes.has(type)) {
      delete durations[type];
    }
  }

  return boosters.map((booster) => {
    const previous = durations[booster.type];
    const reset = !previous || booster.seconds > previous.seconds + 2;
    const totalSeconds = reset
      ? booster.seconds
      : Math.max(previous.totalSeconds || 0, booster.seconds);
    durations[booster.type] = {
      seconds: booster.seconds,
      totalSeconds,
      lastSeenAt: now,
    };
    return {
      ...booster,
      totalSeconds,
    };
  });
}

function hudInfoFindBoosterTextInDom(doc) {
  const text = String(doc?.body?.innerText || doc?.body?.textContent || '');
  HUD_INFO_BOOSTER_PATTERN.lastIndex = 0;
  return HUD_INFO_BOOSTER_PATTERN.test(text) ? text : '';
}

function hudInfoVisibleBoosters(data) {
  return (Array.isArray(data?.boosters) ? data.boosters : [])
    .filter((booster) => HUD_INFO_BOOSTER_TYPES.includes(booster.type) && Number(booster.seconds) > 0);
}

function hudInfoBoosterDurationClass(booster) {
  const seconds = Number(booster.seconds) || 0;
  const total = Math.max(seconds, Number(booster.totalSeconds) || 0);
  if (seconds <= 3) {
    return 'is-duration-red';
  }
  if (total > 0 && seconds <= total * 0.5) {
    return 'is-duration-yellow';
  }
  return 'is-duration-green';
}

function hudInfoAverageMass(score, cells) {
  const count = Math.max(0, Math.round(Number(cells) || 0));
  return count ? Math.max(0, Math.round((Number(score) || 0) / count)) : Math.max(0, Math.round(Number(score) || 0));
}

function hudInfoAverage(values) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function hudInfoMaxValue(values) {
  return values.length ? Math.max(...values) : 0;
}

function hudInfoPushSample(samples, value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return;
  }
  samples.push(number);
  if (samples.length > HUD_INFO_MAX_SAMPLES) {
    samples.splice(0, samples.length - HUD_INFO_MAX_SAMPLES);
  }
}

function hudInfoHasAnyEnabled(settings) {
  return Boolean(settings.showScore || settings.showFps || settings.showPing || settings.showCells || settings.showBoosters);
}

function hudInfoShouldUseTextShadow(settings) {
  return hudInfoHasAnyEnabled(settings) && (Number(settings.alpha) || 0) > 0;
}

function hudInfoPositionAnchor(positionMode) {
  if (String(positionMode).endsWith('right')) return 'right';
  if (String(positionMode).endsWith('center')) return 'center';
  return 'left';
}

function hudInfoIsBottomPosition(positionMode) {
  return String(positionMode).startsWith('bottom');
}

function hudInfoLabelTextFor(label, settings) {
  if (!label) {
    return '';
  }
  if (settings.layoutMode === 'below' && hudInfoPositionAnchor(settings.positionMode) === 'right') {
    return label;
  }
  return `${label}:`;
}

function hudInfoIsRowVisible(row, settings, data) {
  if (!settings[row.show]) {
    return false;
  }
  return !row.booster || hudInfoVisibleBoosters(data).length > 0;
}

function hudInfoRenderSettingsKey(settings, fontFamily = '', data = {}) {
  return [
    settings.enabled ? 1 : 0,
    ...HUD_INFO_ROWS.map((row) => (hudInfoIsRowVisible(row, settings, data) ? 1 : 0)),
    settings.styleMode,
    settings.positionMode,
    settings.layoutMode,
    settings.fontSize,
    settings.color,
    settings.alpha,
    fontFamily,
  ].join('|');
}

function hudInfoRenderDataKey(data, settings) {
  return [
    settings.styleMode,
    settings.scoreMode,
    settings.fpsMode,
    settings.pingMode,
    settings.boosterNameMode,
    settings.boosterDurationMode,
    settings.boosterLastSecFlash ? 1 : 0,
    data.score,
    data.averageScore,
    data.fps,
    data.averageFps,
    Math.round((Number(data.frameTime) || 0) * 10),
    data.ping,
    data.averagePing,
    data.peakPing,
    data.cells,
    hudInfoBoostersDataKey(data.boosters),
  ].join('|');
}

function hudInfoBoostersDataKey(boosters) {
  return hudInfoVisibleBoosters({ boosters })
    .map((booster) => `${booster.type}:${booster.seconds}:${booster.totalSeconds || booster.seconds}`)
    .join(',');
}

function hudInfoSetText(node, text) {
  if (node && node.textContent !== text) {
    node.textContent = text;
  }
}

function hudInfoSetStyleColor(node, color) {
  if (node && node.style.color !== color) {
    node.style.color = color;
  }
}

function hudInfoToggleClass(node, className, enabled) {
  if (node?.classList?.toggle) {
    node.classList.toggle(className, Boolean(enabled));
  } else if (enabled) {
    node?.classList?.add?.(className);
  } else {
    node?.classList?.remove?.(className);
  }
}

function hudInfoSetRowVisible(row, visible) {
  hudInfoToggleClass(row, 'is-hidden', !visible);
  row?.setAttribute?.('aria-hidden', String(!visible));
}

function hudInfoUpdateSeparators(items, settings) {
  let lastVisible = null;
  for (const item of items) {
    if (item.visible) {
      lastVisible = item;
    }
  }
  for (const item of items) {
    hudInfoToggleClass(item.separator, 'is-visible', settings.layoutMode === 'line' && item.visible && item !== lastVisible);
  }
}

function hudInfoNowMs() {
  const perf = globalThis.performance;
  return perf?.now ? perf.now() : Date.now();
}
