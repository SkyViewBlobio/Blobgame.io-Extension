export const FPS_SAVER_SNAPSHOT_KEY = 'blobio.settings.fpsSaver.snapshot';
export const FPS_SAVER_COOKIE_NAME = 'blobioFpsSaver';

export const DEFAULT_FPS_SAVER_SETTINGS = Object.freeze({
  liteMode: true,
  noTransitions: false,
  hiddenTab: true,
  hiddenFps: 2,
  gameOverlay: true,
  toastModalAnim: true,
  chatGuard: true,
  maxChatRows: 40,
  objectRenderer: true,
  foodCulling: true,
  foodLimit: 90,
  massCulling: true,
  massLimit: 30,
});

export function readFpsSaverSettings(storage, document = globalThis.document) {
  const storedSnapshot = parseFpsSaverSnapshot(storage?.getItem?.(FPS_SAVER_SNAPSHOT_KEY));
  const cookieSnapshot = readFpsSaverCookie(document);
  const snapshot = chooseNewestSnapshot(storedSnapshot, cookieSnapshot);
  return normalizeFpsSaverSettings(snapshot || DEFAULT_FPS_SAVER_SETTINGS);
}

export function saveFpsSaverSettings(storage, settings, document = globalThis.document) {
  const clean = normalizeFpsSaverSettings(settings);
  const snapshot = {
    ...clean,
    updatedAt: Date.now(),
  };

  storage?.setItem?.(FPS_SAVER_SNAPSHOT_KEY, JSON.stringify(snapshot));
  writeFpsSaverCookie(document, snapshot);
  return clean;
}

export function parseFpsSaverSnapshot(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      ...normalizeFpsSaverSettings(parsed),
      updatedAt: normalizeUpdatedAt(parsed.updatedAt),
    };
  } catch {
    return null;
  }
}

export function readFpsSaverCookie(document = globalThis.document) {
  const cookie = String(document?.cookie || '');
  const prefix = `${FPS_SAVER_COOKIE_NAME}=`;

  for (const part of cookie.split(';')) {
    const entry = part.trim();
    if (!entry.startsWith(prefix)) {
      continue;
    }

    try {
      return parseFpsSaverSnapshot(decodeURIComponent(entry.slice(prefix.length)));
    } catch {
      return null;
    }
  }
  return null;
}

export function normalizeFpsSaverSettings(settings = {}) {
  const source = settings && typeof settings === 'object' ? settings : {};

  return {
    liteMode: boolSetting(source.liteMode, DEFAULT_FPS_SAVER_SETTINGS.liteMode),
    noTransitions: boolSetting(source.noTransitions, DEFAULT_FPS_SAVER_SETTINGS.noTransitions),
    hiddenTab: boolSetting(source.hiddenTab, DEFAULT_FPS_SAVER_SETTINGS.hiddenTab),
    hiddenFps: clampInteger(source.hiddenFps, 1, 10, DEFAULT_FPS_SAVER_SETTINGS.hiddenFps),
    gameOverlay: boolSetting(source.gameOverlay, DEFAULT_FPS_SAVER_SETTINGS.gameOverlay),
    toastModalAnim: boolSetting(source.toastModalAnim, DEFAULT_FPS_SAVER_SETTINGS.toastModalAnim),
    chatGuard: boolSetting(source.chatGuard, DEFAULT_FPS_SAVER_SETTINGS.chatGuard),
    maxChatRows: clampInteger(source.maxChatRows, 20, 120, DEFAULT_FPS_SAVER_SETTINGS.maxChatRows),
    objectRenderer: boolSetting(source.objectRenderer, DEFAULT_FPS_SAVER_SETTINGS.objectRenderer),
    foodCulling: boolSetting(source.foodCulling, DEFAULT_FPS_SAVER_SETTINGS.foodCulling),
    foodLimit: clampInteger(source.foodLimit, 0, 900, DEFAULT_FPS_SAVER_SETTINGS.foodLimit),
    massCulling: boolSetting(source.massCulling, DEFAULT_FPS_SAVER_SETTINGS.massCulling),
    massLimit: clampInteger(source.massLimit, 0, 900, DEFAULT_FPS_SAVER_SETTINGS.massLimit),
  };
}

function boolSetting(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function clampInteger(value, min, max, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function chooseNewestSnapshot(...snapshots) {
  return snapshots
    .filter(Boolean)
    .sort((left, right) => normalizeUpdatedAt(right.updatedAt) - normalizeUpdatedAt(left.updatedAt))[0] || null;
}

function normalizeUpdatedAt(value) {
  const updatedAt = Number(value);
  return Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0;
}

function writeFpsSaverCookie(document, snapshot) {
  if (!document) {
    return;
  }

  try {
    const value = encodeURIComponent(JSON.stringify(snapshot));
    const hostname = String(document.defaultView?.location?.hostname || globalThis.location?.hostname || '');
    const domain = hostname === 'blobgame.io' || hostname.endsWith('.blobgame.io')
      ? '; Domain=.blobgame.io'
      : '';
    document.cookie = `${FPS_SAVER_COOKIE_NAME}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${domain}`;
  } catch {
    // The shared settings snapshot remains the primary storage path.
  }
}
