export const GAME_BACKGROUND_KEYS = {
  enabled: 'blobio.settings.backgroundColor.enabled',
  mode: 'blobio.settings.backgroundColor.mode',
  solidColor: 'blobio.settings.backgroundColor.solid.color',
  solidAlpha: 'blobio.settings.backgroundColor.solid.alpha',
  gradientFromColor: 'blobio.settings.backgroundColor.gradient.from.color',
  gradientFromAlpha: 'blobio.settings.backgroundColor.gradient.from.alpha',
  gradientToColor: 'blobio.settings.backgroundColor.gradient.to.color',
  gradientToAlpha: 'blobio.settings.backgroundColor.gradient.to.alpha',
  gradientAngle: 'blobio.settings.backgroundColor.gradient.angle',
};

export const DEFAULT_GAME_BACKGROUND_SETTINGS = Object.freeze({
  enabled: false,
  mode: 'solid',
  solid: { color: '#222222', alpha: 100 },
  gradient: {
    from: { color: '#141824', alpha: 100 },
    to: { color: '#007e69', alpha: 100 },
    angle: 135,
  },
});

function readBoolean(value, fallback = false) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function normalizeColor(value, fallback) {
  const color = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

function normalizeAlpha(value, fallback) {
  const alpha = Number(value);
  return Number.isFinite(alpha) ? Math.max(0, Math.min(100, Math.round(alpha))) : fallback;
}

function normalizeAngle(value, fallback) {
  const angle = Math.round(Number(value));
  return Number.isFinite(angle) ? Math.max(0, Math.min(360, angle)) : fallback;
}

function normalizeMode(value) {
  return value === 'gradient' ? 'gradient' : 'solid';
}

export function normalizeGameBackgroundSettings(settings = {}) {
  const defaults = DEFAULT_GAME_BACKGROUND_SETTINGS;
  const source = settings && typeof settings === 'object' ? settings : {};
  const gradient = source.gradient && typeof source.gradient === 'object' ? source.gradient : {};
  const solid = source.solid && typeof source.solid === 'object' ? source.solid : {};
  const from = gradient.from && typeof gradient.from === 'object' ? gradient.from : {};
  const to = gradient.to && typeof gradient.to === 'object' ? gradient.to : {};

  return {
    enabled: Boolean(source.enabled),
    mode: normalizeMode(source.mode),
    solid: {
      color: normalizeColor(solid.color, defaults.solid.color),
      alpha: normalizeAlpha(solid.alpha, defaults.solid.alpha),
    },
    gradient: {
      from: {
        color: normalizeColor(from.color, defaults.gradient.from.color),
        alpha: normalizeAlpha(from.alpha, defaults.gradient.from.alpha),
      },
      to: {
        color: normalizeColor(to.color, defaults.gradient.to.color),
        alpha: normalizeAlpha(to.alpha, defaults.gradient.to.alpha),
      },
      angle: normalizeAngle(gradient.angle, defaults.gradient.angle),
    },
  };
}

export function readGameBackgroundSettings(storage) {
  try {
    return normalizeGameBackgroundSettings({
      enabled: readBoolean(storage?.getItem?.(GAME_BACKGROUND_KEYS.enabled), DEFAULT_GAME_BACKGROUND_SETTINGS.enabled),
      mode: storage?.getItem?.(GAME_BACKGROUND_KEYS.mode) || DEFAULT_GAME_BACKGROUND_SETTINGS.mode,
      solid: {
        color: storage?.getItem?.(GAME_BACKGROUND_KEYS.solidColor),
        alpha: storage?.getItem?.(GAME_BACKGROUND_KEYS.solidAlpha),
      },
      gradient: {
        from: {
          color: storage?.getItem?.(GAME_BACKGROUND_KEYS.gradientFromColor),
          alpha: storage?.getItem?.(GAME_BACKGROUND_KEYS.gradientFromAlpha),
        },
        to: {
          color: storage?.getItem?.(GAME_BACKGROUND_KEYS.gradientToColor),
          alpha: storage?.getItem?.(GAME_BACKGROUND_KEYS.gradientToAlpha),
        },
        angle: storage?.getItem?.(GAME_BACKGROUND_KEYS.gradientAngle),
      },
    });
  } catch {
    return normalizeGameBackgroundSettings(DEFAULT_GAME_BACKGROUND_SETTINGS);
  }
}

export function saveGameBackgroundSettings(storage, settings) {
  const clean = normalizeGameBackgroundSettings(settings);

  try {
    storage?.setItem?.(GAME_BACKGROUND_KEYS.enabled, clean.enabled ? '1' : '0');
    storage?.setItem?.(GAME_BACKGROUND_KEYS.mode, clean.mode);
    storage?.setItem?.(GAME_BACKGROUND_KEYS.solidColor, clean.solid.color);
    storage?.setItem?.(GAME_BACKGROUND_KEYS.solidAlpha, String(clean.solid.alpha));
    storage?.setItem?.(GAME_BACKGROUND_KEYS.gradientFromColor, clean.gradient.from.color);
    storage?.setItem?.(GAME_BACKGROUND_KEYS.gradientFromAlpha, String(clean.gradient.from.alpha));
    storage?.setItem?.(GAME_BACKGROUND_KEYS.gradientToColor, clean.gradient.to.color);
    storage?.setItem?.(GAME_BACKGROUND_KEYS.gradientToAlpha, String(clean.gradient.to.alpha));
    storage?.setItem?.(GAME_BACKGROUND_KEYS.gradientAngle, String(clean.gradient.angle));
  } catch {}

  return clean;
}

export function backgroundColorToRgba(color, alpha) {
  const normalized = normalizeColor(color, '#000000').slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${normalizeAlpha(alpha, 100) / 100})`;
}

export function gameBackgroundCss(settings) {
  const clean = normalizeGameBackgroundSettings(settings);
  if (clean.mode === 'gradient') {
    return `linear-gradient(${clean.gradient.angle}deg, ${backgroundColorToRgba(clean.gradient.from.color, clean.gradient.from.alpha)}, ${backgroundColorToRgba(clean.gradient.to.color, clean.gradient.to.alpha)})`;
  }

  return backgroundColorToRgba(clean.solid.color, clean.solid.alpha);
}
