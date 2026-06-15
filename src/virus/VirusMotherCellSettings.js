export const VIRUS_MOTHER_CELL_KEYS = {
  enabled: 'blobio.settings.virusMotherCell.enabled',
  maskId: 'blobio.settings.virusMotherCell.maskId',
  color: 'blobio.settings.virusMotherCell.color',
  alpha: 'blobio.settings.virusMotherCell.alpha',
  rotate: 'blobio.settings.virusMotherCell.rotate',
};

export const VIRUS_MOTHER_CELL_SNAPSHOT_KEY = 'blobio.settings.virusMotherCell.snapshot';
export const VIRUS_MOTHER_CELL_COOKIE_NAME = 'blobioVirusMotherCell';
export const VIRUS_MOTHER_CELL_MASKS = ['halo', 'rotate', 'ring'];

export const DEFAULT_VIRUS_MOTHER_CELL_SETTINGS = Object.freeze({
  enabled: false,
  maskId: 'halo',
  color: '#ff0000',
  alpha: 0.85,
  rotate: false,
});

export function readVirusMotherCellSettings(storage, document = globalThis.document) {
  const storedSnapshot = parseVirusMotherCellSnapshot(
    storage?.getItem?.(VIRUS_MOTHER_CELL_SNAPSHOT_KEY),
  );
  const cookieSnapshot = readVirusMotherCellCookie(document);
  const snapshot = chooseNewestSnapshot(storedSnapshot, cookieSnapshot);

  if (snapshot) {
    return normalizeVirusMotherCellSettings(snapshot);
  }

  return normalizeVirusMotherCellSettings({
    enabled: readBoolean(storage, VIRUS_MOTHER_CELL_KEYS.enabled, DEFAULT_VIRUS_MOTHER_CELL_SETTINGS.enabled),
    maskId: storage?.getItem?.(VIRUS_MOTHER_CELL_KEYS.maskId),
    color: storage?.getItem?.(VIRUS_MOTHER_CELL_KEYS.color),
    alpha: storage?.getItem?.(VIRUS_MOTHER_CELL_KEYS.alpha),
    rotate: readBoolean(storage, VIRUS_MOTHER_CELL_KEYS.rotate, DEFAULT_VIRUS_MOTHER_CELL_SETTINGS.rotate),
  });
}

export function saveVirusMotherCellSettings(storage, settings, document = globalThis.document) {
  const clean = normalizeVirusMotherCellSettings(settings);
  const snapshot = {
    ...clean,
    updatedAt: Date.now(),
  };

  storage?.setItem?.(VIRUS_MOTHER_CELL_SNAPSHOT_KEY, JSON.stringify(snapshot));
  storage?.setItem?.(VIRUS_MOTHER_CELL_KEYS.enabled, clean.enabled ? '1' : '0');
  storage?.setItem?.(VIRUS_MOTHER_CELL_KEYS.maskId, clean.maskId);
  storage?.setItem?.(VIRUS_MOTHER_CELL_KEYS.color, clean.color);
  storage?.setItem?.(VIRUS_MOTHER_CELL_KEYS.alpha, String(clean.alpha));
  storage?.setItem?.(VIRUS_MOTHER_CELL_KEYS.rotate, clean.rotate ? '1' : '0');
  writeVirusMotherCellCookie(document, snapshot);
  return clean;
}

export function parseVirusMotherCellSnapshot(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      ...normalizeVirusMotherCellSettings(parsed),
      updatedAt: normalizeUpdatedAt(parsed.updatedAt),
    };
  } catch {
    return null;
  }
}

export function readVirusMotherCellCookie(document = globalThis.document) {
  const cookie = String(document?.cookie || '');
  const prefix = `${VIRUS_MOTHER_CELL_COOKIE_NAME}=`;
  for (const part of cookie.split(';')) {
    const entry = part.trim();
    if (!entry.startsWith(prefix)) {
      continue;
    }

    try {
      return parseVirusMotherCellSnapshot(decodeURIComponent(entry.slice(prefix.length)));
    } catch {
      return null;
    }
  }
  return null;
}

export function normalizeVirusMaskId(value) {
  const maskId = String(value || '').trim().toLowerCase();
  return VIRUS_MOTHER_CELL_MASKS.includes(maskId)
    ? maskId
    : DEFAULT_VIRUS_MOTHER_CELL_SETTINGS.maskId;
}

export function normalizeVirusColor(value) {
  const color = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color)
    ? color
    : DEFAULT_VIRUS_MOTHER_CELL_SETTINGS.color;
}

export function normalizeVirusAlpha(value) {
  if (value === null || value === undefined || value === '') {
    return DEFAULT_VIRUS_MOTHER_CELL_SETTINGS.alpha;
  }
  const alpha = Number(value);
  if (!Number.isFinite(alpha)) {
    return DEFAULT_VIRUS_MOTHER_CELL_SETTINGS.alpha;
  }
  return Math.max(0, Math.min(1, Math.round(alpha * 100) / 100));
}

function normalizeVirusMotherCellSettings(settings) {
  return {
    enabled: Boolean(settings?.enabled),
    maskId: normalizeVirusMaskId(settings?.maskId),
    color: normalizeVirusColor(settings?.color),
    alpha: normalizeVirusAlpha(settings?.alpha),
    rotate: Boolean(settings?.rotate),
  };
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

function writeVirusMotherCellCookie(document, snapshot) {
  if (!document) {
    return;
  }

  try {
    const value = encodeURIComponent(JSON.stringify(snapshot));
    const hostname = String(document.defaultView?.location?.hostname || globalThis.location?.hostname || '');
    const domain = hostname === 'blobgame.io' || hostname.endsWith('.blobgame.io')
      ? '; Domain=.blobgame.io'
      : '';
    document.cookie = `${VIRUS_MOTHER_CELL_COOKIE_NAME}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${domain}`;
  } catch {
    // Shared userscript storage remains the primary persistence path.
  }
}

function readBoolean(storage, key, fallback) {
  const value = storage?.getItem?.(key);
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return value === '1' || value === 'true';
}
