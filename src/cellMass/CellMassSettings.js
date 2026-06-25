export const CELL_MASS_SNAPSHOT_KEY = 'blobio.settings.cellMass.snapshot';
export const CELL_MASS_COOKIE_NAME = 'blobioCellMass';

export const CELL_MASS_MODE_PRESETS = Object.freeze({
  normal: Object.freeze({ textScale: 0.65, yOffset: 10, nameGap: 1.2 }),
  vip: Object.freeze({ textScale: 0.65, yOffset: -80, nameGap: 0.3 }),
  custom: Object.freeze({ textScale: 0.65, yOffset: 11, nameGap: 1.1 }),
});

export const CELL_MASS_MODES = Object.freeze(['normal', 'vip', 'custom']);

export const DEFAULT_CELL_MASS_SETTINGS = Object.freeze({
  enabled: true,
  compact: true,
  smartRendering: true,
  emphasizeBiggest: true,
  mode: 'normal',
  textScale: 0.65,
  yOffset: 10,
  nameGap: 1.2,
  updateDelayMs: 3000,
});

export function readCellMassSettings(storage, document = globalThis.document) {
  const storedSnapshot = parseCellMassSnapshot(storage?.getItem?.(CELL_MASS_SNAPSHOT_KEY));
  const cookieSnapshot = readCellMassCookie(document);
  const snapshot = chooseNewestSnapshot(storedSnapshot, cookieSnapshot);
  return normalizeCellMassSettings(snapshot || DEFAULT_CELL_MASS_SETTINGS);
}

export function saveCellMassSettings(storage, settings, document = globalThis.document) {
  const clean = normalizeCellMassSettings(settings);
  const snapshot = {
    ...clean,
    updatedAt: Date.now(),
  };

  storage?.setItem?.(CELL_MASS_SNAPSHOT_KEY, JSON.stringify(snapshot));
  writeCellMassCookie(document, snapshot);
  return clean;
}

export function parseCellMassSnapshot(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      ...normalizeCellMassSettings(parsed),
      updatedAt: normalizeUpdatedAt(parsed.updatedAt),
    };
  } catch {
    return null;
  }
}

export function readCellMassCookie(document = globalThis.document) {
  const cookie = String(document?.cookie || '');
  const prefix = `${CELL_MASS_COOKIE_NAME}=`;

  for (const part of cookie.split(';')) {
    const entry = part.trim();
    if (!entry.startsWith(prefix)) {
      continue;
    }

    try {
      return parseCellMassSnapshot(decodeURIComponent(entry.slice(prefix.length)));
    } catch {
      return null;
    }
  }
  return null;
}

export function normalizeCellMassSettings(settings = {}) {
  const source = settings && typeof settings === 'object' ? settings : {};
  const mode = normalizeMode(source.mode);
  const preset = CELL_MASS_MODE_PRESETS[mode];

  return {
    enabled: source.enabled === undefined ? DEFAULT_CELL_MASS_SETTINGS.enabled : Boolean(source.enabled),
    compact: source.compact === undefined ? DEFAULT_CELL_MASS_SETTINGS.compact : Boolean(source.compact),
    smartRendering: source.smartRendering === undefined
      ? DEFAULT_CELL_MASS_SETTINGS.smartRendering
      : Boolean(source.smartRendering),
    emphasizeBiggest: source.emphasizeBiggest === undefined
      ? DEFAULT_CELL_MASS_SETTINGS.emphasizeBiggest
      : Boolean(source.emphasizeBiggest),
    mode,
    textScale: clampNumber(source.textScale, 0.35, 1.4, preset.textScale),
    yOffset: clampNumber(source.yOffset, -120, 120, preset.yOffset),
    nameGap: clampNumber(source.nameGap, 0.1, 3, preset.nameGap),
    updateDelayMs: Math.round(clampNumber(source.updateDelayMs, 0, 10000, DEFAULT_CELL_MASS_SETTINGS.updateDelayMs)),
  };
}

function normalizeMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  return CELL_MASS_MODES.includes(mode) ? mode : DEFAULT_CELL_MASS_SETTINGS.mode;
}

function clampNumber(value, min, max, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const number = Number(value);
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

function writeCellMassCookie(document, snapshot) {
  if (!document) {
    return;
  }

  try {
    const value = encodeURIComponent(JSON.stringify(snapshot));
    const hostname = String(document.defaultView?.location?.hostname || globalThis.location?.hostname || '');
    const domain = hostname === 'blobgame.io' || hostname.endsWith('.blobgame.io')
      ? '; Domain=.blobgame.io'
      : '';
    document.cookie = `${CELL_MASS_COOKIE_NAME}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${domain}`;
  } catch {
  }
}
