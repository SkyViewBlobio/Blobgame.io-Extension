export const FPS_UNCAP_STORAGE_KEY = 'blobio.settings.fpsUncap';
export const CHAT_FONT_SIZE_ENABLED_KEY = 'blobio.chat.fontSizeEnabled';
export const CHAT_FONT_SIZE_VALUE_KEY = 'blobio.chat.fontSizePx';

const DEFAULT_CHAT_FONT_SIZE = 16;
const MIN_CHAT_FONT_SIZE = 8;
const MAX_CHAT_FONT_SIZE = 48;

export function isFpsUncapEnabled(storage) {
  try {
    return storage?.getItem?.(FPS_UNCAP_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setFpsUncapEnabled(storage, enabled) {
  try {
    storage?.setItem?.(FPS_UNCAP_STORAGE_KEY, enabled ? '1' : '0');
    return Boolean(enabled);
  } catch {
    return isFpsUncapEnabled(storage);
  }
}

export function isChatFontSizeEnabled(storage) {
  try {
    return storage?.getItem?.(CHAT_FONT_SIZE_ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setChatFontSizeEnabled(storage, enabled) {
  try {
    storage?.setItem?.(CHAT_FONT_SIZE_ENABLED_KEY, enabled ? '1' : '0');
    return Boolean(enabled);
  } catch {
    return isChatFontSizeEnabled(storage);
  }
}

export function getChatFontSize(storage) {
  try {
    const rawValue = storage?.getItem?.(CHAT_FONT_SIZE_VALUE_KEY);
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return DEFAULT_CHAT_FONT_SIZE;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      return DEFAULT_CHAT_FONT_SIZE;
    }

    return Math.min(MAX_CHAT_FONT_SIZE, Math.max(MIN_CHAT_FONT_SIZE, Math.round(value)));
  } catch {
    return DEFAULT_CHAT_FONT_SIZE;
  }
}

export function setChatFontSize(storage, value) {
  const normalized = Math.min(
    MAX_CHAT_FONT_SIZE,
    Math.max(MIN_CHAT_FONT_SIZE, Math.round(Number(value) || DEFAULT_CHAT_FONT_SIZE)),
  );

  try {
    storage?.setItem?.(CHAT_FONT_SIZE_VALUE_KEY, String(normalized));
  } catch {}

  return normalized;
}

export const CHAT_FONT_SIZE_LIMITS = {
  defaultValue: DEFAULT_CHAT_FONT_SIZE,
  min: MIN_CHAT_FONT_SIZE,
  max: MAX_CHAT_FONT_SIZE,
};
