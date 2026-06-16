export const FPS_UNCAP_STORAGE_KEY = 'blobio.settings.fpsUncap';
export const CHAT_FONT_SIZE_ENABLED_KEY = 'blobio.chat.fontSizeEnabled';
export const CHAT_FONT_SIZE_VALUE_KEY = 'blobio.chat.fontSizePx';
export const ANIMATION_SPEED_KEYS = {
  enabled: 'blobio.settings.animationSpeed.enabled',
  slider: 'blobio.settings.animationSpeed.slider',
};

const DEFAULT_CHAT_FONT_SIZE = 16;
const MIN_CHAT_FONT_SIZE = 8;
const MAX_CHAT_FONT_SIZE = 48;
const DEFAULT_ANIMATION_SPEED_SLIDER = 10;
const MIN_ANIMATION_SPEED_SLIDER = 1;
const MAX_ANIMATION_SPEED_SLIDER = 180;

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

function readAnimationSpeedEnabled(storage) {
  try {
    const value = storage?.getItem?.(ANIMATION_SPEED_KEYS.enabled);
    return value === '1' || String(value).toLowerCase() === 'true';
  } catch {
    return false;
  }
}

export function normalizeAnimationSpeedSlider(value) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) {
    return DEFAULT_ANIMATION_SPEED_SLIDER;
  }

  return Math.max(MIN_ANIMATION_SPEED_SLIDER, Math.min(MAX_ANIMATION_SPEED_SLIDER, number));
}

export function getAnimationSpeedSetting(storage) {
  let slider = DEFAULT_ANIMATION_SPEED_SLIDER;

  try {
    const value = storage?.getItem?.(ANIMATION_SPEED_KEYS.slider);
    if (value !== null && value !== undefined && value !== '') {
      slider = normalizeAnimationSpeedSlider(value);
    }
  } catch {}

  return {
    enabled: readAnimationSpeedEnabled(storage),
    slider,
    speed: slider / 10,
  };
}

export function setAnimationSpeedSetting(storage, changes = {}) {
  const current = getAnimationSpeedSetting(storage);
  const next = {
    enabled: changes.enabled === undefined ? current.enabled : Boolean(changes.enabled),
    slider: changes.slider === undefined ? current.slider : normalizeAnimationSpeedSlider(changes.slider),
  };

  try {
    storage?.setItem?.(ANIMATION_SPEED_KEYS.enabled, next.enabled ? '1' : '0');
    storage?.setItem?.(ANIMATION_SPEED_KEYS.slider, String(next.slider));
  } catch {}

  return {
    ...next,
    speed: next.slider / 10,
  };
}

export const CHAT_FONT_SIZE_LIMITS = {
  defaultValue: DEFAULT_CHAT_FONT_SIZE,
  min: MIN_CHAT_FONT_SIZE,
  max: MAX_CHAT_FONT_SIZE,
};

export const ANIMATION_SPEED_LIMITS = {
  defaultValue: DEFAULT_ANIMATION_SPEED_SLIDER,
  min: MIN_ANIMATION_SPEED_SLIDER,
  max: MAX_ANIMATION_SPEED_SLIDER,
};
