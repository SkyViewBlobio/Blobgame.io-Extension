export const CAPTCHA_LOGO_HIDDEN_KEY = 'blobio.chat.hideCaptchaLogo';
export const SMOOTH_CHAT_KEY = 'blobio.chat.smoothChat';
export const KEY_SHORTCUTS_HIDDEN_KEY = 'blobio.chat.hideKeyShortcuts';

export const CHAT_BACKGROUND_KEYS = {
  enabled: 'blobio.chat.background.enabled',
  color: 'blobio.chat.background.color',
  alpha: 'blobio.chat.background.alpha',
};

export const CHAT_OUTLINE_KEYS = {
  enabled: 'blobio.chat.outline.enabled',
  color: 'blobio.chat.outline.color',
  alpha: 'blobio.chat.outline.alpha',
};

export const LEADERBOARD_BACKGROUND_KEYS = {
  enabled: 'blobio.chat.leaderboard.background.enabled',
  color: 'blobio.chat.leaderboard.background.color',
  alpha: 'blobio.chat.leaderboard.background.alpha',
};

export const LEADERBOARD_OUTLINE_KEYS = {
  enabled: 'blobio.chat.leaderboard.outline.enabled',
  color: 'blobio.chat.leaderboard.outline.color',
  alpha: 'blobio.chat.leaderboard.outline.alpha',
};

export const LEADERBOARD_FONT_KEYS = {
  enabled: 'blobio.chat.leaderboard.fontSizeEnabled',
  value: 'blobio.chat.leaderboard.fontSizePx',
};

export const LEADERBOARD_SIZE_KEYS = {
  width: 'blobio.chat.leaderboard.widthPx',
  height: 'blobio.chat.leaderboard.heightPx',
};

export const LEADERBOARD_SIZE_LIMITS = {
  minWidth: 180,
  minHeight: 90,
  maxWidth: 720,
  maxHeight: 720,
};

export const UI_FONT_SIZE_LIMITS = {
  min: 8,
  max: 48,
  defaultValue: 16,
};

const DEFAULT_COLORS = {
  chatBackground: { enabled: false, color: '#000000', alpha: 0.72 },
  chatOutline: { enabled: false, color: '#53ff82', alpha: 0.72 },
  leaderboardBackground: { enabled: false, color: '#000000', alpha: 0.72 },
  leaderboardOutline: { enabled: false, color: '#53ff82', alpha: 0.72 },
};

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

function writeBoolean(storage, key, enabled) {
  try {
    storage?.setItem?.(key, enabled ? '1' : '0');
  } catch {}
  return Boolean(enabled);
}

function normalizeColor(value, fallback) {
  const color = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

function normalizeAlpha(value, fallback) {
  const alpha = Number(value);
  return Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : fallback;
}

function normalizeFontSize(value) {
  const size = Math.round(Number(value) || UI_FONT_SIZE_LIMITS.defaultValue);
  return Math.max(UI_FONT_SIZE_LIMITS.min, Math.min(UI_FONT_SIZE_LIMITS.max, size));
}

function normalizeOptionalSize(value, min, max) {
  const size = Math.round(Number(value));
  return Number.isFinite(size) && size >= min
    ? Math.min(max, size)
    : null;
}

export function getBooleanSetting(storage, key, fallback = false) {
  return readBoolean(storage, key, fallback);
}

export function setBooleanSetting(storage, key, enabled) {
  return writeBoolean(storage, key, enabled);
}

export function getColorSetting(storage, keys, defaults) {
  const fallback = defaults || DEFAULT_COLORS.chatBackground;
  let color = fallback.color;
  let alpha = fallback.alpha;

  try {
    color = normalizeColor(storage?.getItem?.(keys.color), fallback.color);
    alpha = normalizeAlpha(storage?.getItem?.(keys.alpha), fallback.alpha);
  } catch {}

  return {
    enabled: readBoolean(storage, keys.enabled, fallback.enabled),
    color,
    alpha,
  };
}

export function setColorSetting(storage, keys, changes, defaults) {
  const current = getColorSetting(storage, keys, defaults);
  const next = {
    enabled: changes.enabled === undefined ? current.enabled : Boolean(changes.enabled),
    color: normalizeColor(changes.color ?? current.color, current.color),
    alpha: normalizeAlpha(changes.alpha ?? current.alpha, current.alpha),
  };

  try {
    storage?.setItem?.(keys.enabled, next.enabled ? '1' : '0');
    storage?.setItem?.(keys.color, next.color);
    storage?.setItem?.(keys.alpha, String(next.alpha));
  } catch {}

  return next;
}

export function getLeaderboardFontSetting(storage) {
  let value = UI_FONT_SIZE_LIMITS.defaultValue;
  try {
    value = normalizeFontSize(storage?.getItem?.(LEADERBOARD_FONT_KEYS.value));
  } catch {}

  return {
    enabled: readBoolean(storage, LEADERBOARD_FONT_KEYS.enabled, false),
    value,
  };
}

export function setLeaderboardFontSetting(storage, changes) {
  const current = getLeaderboardFontSetting(storage);
  const next = {
    enabled: changes.enabled === undefined ? current.enabled : Boolean(changes.enabled),
    value: changes.value === undefined ? current.value : normalizeFontSize(changes.value),
  };

  try {
    storage?.setItem?.(LEADERBOARD_FONT_KEYS.enabled, next.enabled ? '1' : '0');
    storage?.setItem?.(LEADERBOARD_FONT_KEYS.value, String(next.value));
  } catch {}

  return next;
}

export function getLeaderboardSizeSetting(storage) {
  let width = null;
  let height = null;

  try {
    width = normalizeOptionalSize(
      storage?.getItem?.(LEADERBOARD_SIZE_KEYS.width),
      LEADERBOARD_SIZE_LIMITS.minWidth,
      LEADERBOARD_SIZE_LIMITS.maxWidth,
    );
    height = normalizeOptionalSize(
      storage?.getItem?.(LEADERBOARD_SIZE_KEYS.height),
      LEADERBOARD_SIZE_LIMITS.minHeight,
      LEADERBOARD_SIZE_LIMITS.maxHeight,
    );
  } catch {}

  return { width, height };
}

export function setLeaderboardSizeSetting(storage, changes = {}) {
  const current = getLeaderboardSizeSetting(storage);
  const next = {
    width: changes.width === undefined
      ? current.width
      : normalizeOptionalSize(
        changes.width,
        LEADERBOARD_SIZE_LIMITS.minWidth,
        LEADERBOARD_SIZE_LIMITS.maxWidth,
      ),
    height: changes.height === undefined
      ? current.height
      : normalizeOptionalSize(
        changes.height,
        LEADERBOARD_SIZE_LIMITS.minHeight,
        LEADERBOARD_SIZE_LIMITS.maxHeight,
      ),
  };

  try {
    if (next.width === null) {
      storage?.removeItem?.(LEADERBOARD_SIZE_KEYS.width);
    } else {
      storage?.setItem?.(LEADERBOARD_SIZE_KEYS.width, String(next.width));
    }

    if (next.height === null) {
      storage?.removeItem?.(LEADERBOARD_SIZE_KEYS.height);
    } else {
      storage?.setItem?.(LEADERBOARD_SIZE_KEYS.height, String(next.height));
    }
  } catch {}

  return next;
}

export function readInGameUiSettings(storage) {
  return {
    hideCaptchaLogo: readBoolean(storage, CAPTCHA_LOGO_HIDDEN_KEY, true),
    hideKeyShortcuts: readBoolean(storage, KEY_SHORTCUTS_HIDDEN_KEY, true),
    smoothChat: readBoolean(storage, SMOOTH_CHAT_KEY, true),
    chatBackground: getColorSetting(storage, CHAT_BACKGROUND_KEYS, DEFAULT_COLORS.chatBackground),
    chatOutline: getColorSetting(storage, CHAT_OUTLINE_KEYS, DEFAULT_COLORS.chatOutline),
    leaderboardBackground: getColorSetting(
      storage,
      LEADERBOARD_BACKGROUND_KEYS,
      DEFAULT_COLORS.leaderboardBackground,
    ),
    leaderboardOutline: getColorSetting(
      storage,
      LEADERBOARD_OUTLINE_KEYS,
      DEFAULT_COLORS.leaderboardOutline,
    ),
    leaderboardFont: getLeaderboardFontSetting(storage),
    leaderboardSize: getLeaderboardSizeSetting(storage),
  };
}

export const IN_GAME_UI_DEFAULTS = DEFAULT_COLORS;
