export const HUD_INFO_KEYS = {
  enabled: 'blobio.chat.hudInfo.enabled',
  showFps: 'blobio.chat.hudInfo.showFps',
  showScore: 'blobio.chat.hudInfo.showScore',
  showCells: 'blobio.chat.hudInfo.showCells',
  showPing: 'blobio.chat.hudInfo.showPing',
  showBoosters: 'blobio.chat.hudInfo.showBoosters',
  positionMode: 'blobio.chat.hudInfo.positionMode',
  layoutMode: 'blobio.chat.hudInfo.layoutMode',
  styleMode: 'blobio.chat.hudInfo.styleMode',
  fpsMode: 'blobio.chat.hudInfo.fpsMode',
  scoreMode: 'blobio.chat.hudInfo.scoreMode',
  pingMode: 'blobio.chat.hudInfo.pingMode',
  boosterNameMode: 'blobio.chat.hudInfo.boosterNameMode',
  boosterDurationMode: 'blobio.chat.hudInfo.boosterDurationMode',
  boosterLastSecFlash: 'blobio.chat.hudInfo.boosterLastSecFlash',
  fontSize: 'blobio.chat.hudInfo.fontSize',
  color: 'blobio.chat.hudInfo.color',
  alpha: 'blobio.chat.hudInfo.alpha',
};

export const HUD_INFO_POSITION_MODES = [
  ['top-left', 'Top-Left'],
  ['top-center', 'Top-Center'],
  ['top-right', 'Top-Right'],
  ['bottom-left', 'Bottom-Left'],
  ['bottom-center', 'Bottom-Center'],
  ['bottom-right', 'Bottom-Right'],
];

export const HUD_INFO_LAYOUT_MODES = [
  ['below', 'Below'],
  ['line', 'Line'],
];

export const HUD_INFO_STYLE_MODES = [
  ['simple', 'Simple'],
  ['solid', 'Solid'],
];

export const HUD_INFO_BOOSTER_COLOR_MODES = [
  ['simple', 'Simple'],
  ['solid', 'Solid'],
];

export const HUD_INFO_DATA_MODES = [
  ['default', 'Default'],
  ['advanced', 'Advanced'],
  ['dev', 'DEV'],
];

export const HUD_INFO_FONT_LIMITS = {
  min: 10,
  max: 32,
  defaultValue: 17,
};

export const DEFAULT_HUD_INFO_SETTINGS = Object.freeze({
  enabled: true,
  showFps: true,
  showScore: true,
  showCells: true,
  showPing: true,
  showBoosters: true,
  positionMode: 'top-left',
  layoutMode: 'below',
  styleMode: 'simple',
  fpsMode: 'default',
  scoreMode: 'default',
  pingMode: 'default',
  boosterNameMode: 'simple',
  boosterDurationMode: 'simple',
  boosterLastSecFlash: false,
  fontSize: HUD_INFO_FONT_LIMITS.defaultValue,
  color: '#ffffff',
  alpha: 1,
});

function readBoolean(storage, key, fallback) {
  try {
    const value = storage?.getItem?.(key);
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return value === '1' || String(value).toLowerCase() === 'true';
  } catch {
    return fallback;
  }
}

function normalizeColor(value, fallback = DEFAULT_HUD_INFO_SETTINGS.color) {
  const color = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

function normalizeAlpha(value, fallback = DEFAULT_HUD_INFO_SETTINGS.alpha) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const alpha = Number(value);
  return Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : fallback;
}

function normalizeFontSize(value) {
  const size = Math.round(Number(value) || HUD_INFO_FONT_LIMITS.defaultValue);
  return Math.max(HUD_INFO_FONT_LIMITS.min, Math.min(HUD_INFO_FONT_LIMITS.max, size));
}

function normalizeMode(value, options, fallback) {
  const mode = String(value || '').trim().toLowerCase();
  return options.some(([key]) => key === mode) ? mode : fallback;
}

export function hudInfoModeLabel(value, options) {
  return options.find(([key]) => key === value)?.[1] || options[0]?.[1] || '';
}

export function nextHudInfoMode(value, options) {
  const index = Math.max(0, options.findIndex(([key]) => key === value));
  return options[(index + 1) % options.length]?.[0] || options[0]?.[0] || '';
}

export function normalizeHudInfoSettings(settings = {}) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return {
    enabled: source.enabled === undefined ? DEFAULT_HUD_INFO_SETTINGS.enabled : Boolean(source.enabled),
    showFps: source.showFps === undefined ? DEFAULT_HUD_INFO_SETTINGS.showFps : Boolean(source.showFps),
    showScore: source.showScore === undefined ? DEFAULT_HUD_INFO_SETTINGS.showScore : Boolean(source.showScore),
    showCells: source.showCells === undefined ? DEFAULT_HUD_INFO_SETTINGS.showCells : Boolean(source.showCells),
    showPing: source.showPing === undefined ? DEFAULT_HUD_INFO_SETTINGS.showPing : Boolean(source.showPing),
    showBoosters: source.showBoosters === undefined ? DEFAULT_HUD_INFO_SETTINGS.showBoosters : Boolean(source.showBoosters),
    positionMode: normalizeMode(source.positionMode, HUD_INFO_POSITION_MODES, DEFAULT_HUD_INFO_SETTINGS.positionMode),
    layoutMode: normalizeMode(source.layoutMode, HUD_INFO_LAYOUT_MODES, DEFAULT_HUD_INFO_SETTINGS.layoutMode),
    styleMode: normalizeMode(source.styleMode, HUD_INFO_STYLE_MODES, DEFAULT_HUD_INFO_SETTINGS.styleMode),
    fpsMode: normalizeMode(source.fpsMode, HUD_INFO_DATA_MODES, DEFAULT_HUD_INFO_SETTINGS.fpsMode),
    scoreMode: normalizeMode(source.scoreMode, HUD_INFO_DATA_MODES, DEFAULT_HUD_INFO_SETTINGS.scoreMode),
    pingMode: normalizeMode(source.pingMode, HUD_INFO_DATA_MODES, DEFAULT_HUD_INFO_SETTINGS.pingMode),
    boosterNameMode: normalizeMode(source.boosterNameMode, HUD_INFO_BOOSTER_COLOR_MODES, DEFAULT_HUD_INFO_SETTINGS.boosterNameMode),
    boosterDurationMode: normalizeMode(source.boosterDurationMode, HUD_INFO_BOOSTER_COLOR_MODES, DEFAULT_HUD_INFO_SETTINGS.boosterDurationMode),
    boosterLastSecFlash: source.boosterLastSecFlash === undefined
      ? DEFAULT_HUD_INFO_SETTINGS.boosterLastSecFlash
      : Boolean(source.boosterLastSecFlash),
    fontSize: normalizeFontSize(source.fontSize),
    color: normalizeColor(source.color),
    alpha: normalizeAlpha(source.alpha),
  };
}

export function readHudInfoSettings(storage) {
  return normalizeHudInfoSettings({
    enabled: readBoolean(storage, HUD_INFO_KEYS.enabled, DEFAULT_HUD_INFO_SETTINGS.enabled),
    showFps: readBoolean(storage, HUD_INFO_KEYS.showFps, DEFAULT_HUD_INFO_SETTINGS.showFps),
    showScore: readBoolean(storage, HUD_INFO_KEYS.showScore, DEFAULT_HUD_INFO_SETTINGS.showScore),
    showCells: readBoolean(storage, HUD_INFO_KEYS.showCells, DEFAULT_HUD_INFO_SETTINGS.showCells),
    showPing: readBoolean(storage, HUD_INFO_KEYS.showPing, DEFAULT_HUD_INFO_SETTINGS.showPing),
    showBoosters: readBoolean(storage, HUD_INFO_KEYS.showBoosters, DEFAULT_HUD_INFO_SETTINGS.showBoosters),
    positionMode: storage?.getItem?.(HUD_INFO_KEYS.positionMode),
    layoutMode: storage?.getItem?.(HUD_INFO_KEYS.layoutMode),
    styleMode: storage?.getItem?.(HUD_INFO_KEYS.styleMode),
    fpsMode: storage?.getItem?.(HUD_INFO_KEYS.fpsMode),
    scoreMode: storage?.getItem?.(HUD_INFO_KEYS.scoreMode),
    pingMode: storage?.getItem?.(HUD_INFO_KEYS.pingMode),
    boosterNameMode: storage?.getItem?.(HUD_INFO_KEYS.boosterNameMode),
    boosterDurationMode: storage?.getItem?.(HUD_INFO_KEYS.boosterDurationMode),
    boosterLastSecFlash: readBoolean(
      storage,
      HUD_INFO_KEYS.boosterLastSecFlash,
      DEFAULT_HUD_INFO_SETTINGS.boosterLastSecFlash,
    ),
    fontSize: storage?.getItem?.(HUD_INFO_KEYS.fontSize),
    color: storage?.getItem?.(HUD_INFO_KEYS.color),
    alpha: storage?.getItem?.(HUD_INFO_KEYS.alpha),
  });
}

export function saveHudInfoSettings(storage, settings) {
  const next = normalizeHudInfoSettings(settings);
  try {
    storage?.setItem?.(HUD_INFO_KEYS.enabled, next.enabled ? '1' : '0');
    storage?.setItem?.(HUD_INFO_KEYS.showFps, next.showFps ? '1' : '0');
    storage?.setItem?.(HUD_INFO_KEYS.showScore, next.showScore ? '1' : '0');
    storage?.setItem?.(HUD_INFO_KEYS.showCells, next.showCells ? '1' : '0');
    storage?.setItem?.(HUD_INFO_KEYS.showPing, next.showPing ? '1' : '0');
    storage?.setItem?.(HUD_INFO_KEYS.showBoosters, next.showBoosters ? '1' : '0');
    storage?.setItem?.(HUD_INFO_KEYS.positionMode, next.positionMode);
    storage?.setItem?.(HUD_INFO_KEYS.layoutMode, next.layoutMode);
    storage?.setItem?.(HUD_INFO_KEYS.styleMode, next.styleMode);
    storage?.setItem?.(HUD_INFO_KEYS.fpsMode, next.fpsMode);
    storage?.setItem?.(HUD_INFO_KEYS.scoreMode, next.scoreMode);
    storage?.setItem?.(HUD_INFO_KEYS.pingMode, next.pingMode);
    storage?.setItem?.(HUD_INFO_KEYS.boosterNameMode, next.boosterNameMode);
    storage?.setItem?.(HUD_INFO_KEYS.boosterDurationMode, next.boosterDurationMode);
    storage?.setItem?.(HUD_INFO_KEYS.boosterLastSecFlash, next.boosterLastSecFlash ? '1' : '0');
    storage?.setItem?.(HUD_INFO_KEYS.fontSize, String(next.fontSize));
    storage?.setItem?.(HUD_INFO_KEYS.color, next.color);
    storage?.setItem?.(HUD_INFO_KEYS.alpha, String(next.alpha));
  } catch {}
  return next;
}
