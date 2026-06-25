// ==UserScript==
// @name         Blobio Web Script Loader
// @namespace    https://github.com/SkyViewBlobio/Blobgame.io-Extension
// @version      0.2.01
// @description  Loads the Blobio extension bundle from GitHub.
// @match        *://blobgame.io/*
// @match        *://www.blobgame.io/*
// @match        *://custom.client.blobgame.io/*
// @match        https://www.google.com/recaptcha/api2/anchor*
// @match        https://www.google.com/recaptcha/enterprise/anchor*
// @match        https://www.recaptcha.net/recaptcha/api2/anchor*
// @match        https://www.recaptcha.net/recaptcha/enterprise/anchor*
// @run-at       document-start
// @sandbox      raw
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_addStyle
// @grant        GM_removeValueChangeListener
// @connect      cdn.jsdelivr.net
// @connect      raw.githubusercontent.com
// @downloadURL  https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Extension/cleanup/loader/blobio-loader.user.js
// @updateURL    https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Extension/cleanup/loader/blobio-loader.user.js
// ==/UserScript==

(() => {
  'use strict';

  const LOG_PREFIX = '[Blobio]';
  const VERSION = '0.2.01';
  const CUSTOM_CLIENT_HOST = 'custom.client.blobgame.io';
  const CAPTCHA_LOGO_HIDDEN_KEY = 'blobio.chat.hideCaptchaLogo';
  const RECAPTCHA_FRAME_HOSTS = new Set(['www.google.com', 'www.recaptcha.net']);
  const STORAGE_BRIDGE_SOURCE = 'BlobioExtensionStorageBridge';
  const FPS_UNCAP_STORAGE_KEY = 'blobio.settings.fpsUncap';
  const ANIMATION_SPEED_KEYS = {
    enabled: 'blobio.settings.animationSpeed.enabled',
    slider: 'blobio.settings.animationSpeed.slider',
    mode: 'blobio.settings.animationSpeed.mode',
  };
  const JELLY_SHADER_KEYS = {
    enabled: 'blobio.settings.jellyShader.enabled',
    skinCells: 'blobio.settings.jellyShader.skinCells',
    noSkinCells: 'blobio.settings.jellyShader.noSkinCells',
  };
  const HUD_INFO_KEYS = {
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
  const ANIMATION_SPEED_MODES = {
    friendly: 'friendly',
    unsafe: 'unsafe',
  };
  const GAME_BACKGROUND_KEYS = {
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
  const VIRUS_MOTHER_CELL_KEYS = {
    enabled: 'blobio.settings.virusMotherCell.enabled',
    maskId: 'blobio.settings.virusMotherCell.maskId',
    color: 'blobio.settings.virusMotherCell.color',
    alpha: 'blobio.settings.virusMotherCell.alpha',
    rotate: 'blobio.settings.virusMotherCell.rotate',
  };
  const VIRUS_MOTHER_CELL_SNAPSHOT_KEY = 'blobio.settings.virusMotherCell.snapshot';
  const VIRUS_MOTHER_CELL_COOKIE_NAME = 'blobioVirusMotherCell';
  const VIRUS_PELLET_COLOR_SNAPSHOT_KEY = 'blobio.settings.virusPelletColors.snapshot';
  const VIRUS_PELLET_COLOR_COOKIE_NAME = 'blobioVirusPelletColors';
  const CELL_MASS_SNAPSHOT_KEY = 'blobio.settings.cellMass.snapshot';
  const CELL_MASS_COOKIE_NAME = 'blobioCellMass';
  const FPS_SAVER_SNAPSHOT_KEY = 'blobio.settings.fpsSaver.snapshot';
  const FPS_SAVER_COOKIE_NAME = 'blobioFpsSaver';
  /* VIRUS_ASSETS_START */
  /* VIRUS_ASSETS_END */
  /* EMOTE_SKIN_ASSETS_START */
  /* EMOTE_SKIN_ASSETS_END */
  const EARLY_HOTKEY_BRIDGE_KEY = '__blobioEarlyHotkeyBridge';
  const INPUT_KEYBOARD_ISOLATION_KEY = '__blobioExtensionInputKeyboardIsolationInstalled';

  function isRecaptchaAnchorFrame() {
    return RECAPTCHA_FRAME_HOSTS.has(location.hostname)
      && /\/recaptcha\/(?:api2|enterprise)\/anchor(?:$|\/)/.test(location.pathname);
  }

  function installCaptchaLogoFrameStyle() {
    const readHidden = (value = undefined) => {
      try {
        const stored = value === undefined ? GM_getValue?.(CAPTCHA_LOGO_HIDDEN_KEY, '1') : value;
        return stored === true || stored === 1 || stored === '1'
          || String(stored).toLowerCase() === 'true';
      } catch {
        return true;
      }
    };

    const frameCss = `
      html.blobio-hide-captcha-logo .rc-anchor-logo-img,
      html.blobio-hide-captcha-logo .rc-anchor-logo-img-large,
      html.blobio-hide-captcha-logo .rc-anchor-logo-portrait,
      html.blobio-hide-captcha-logo .rc-anchor-logo-landscape,
      html.blobio-hide-captcha-logo .rc-anchor-normal-footer,
      html.blobio-hide-captcha-logo .rc-anchor-compact-footer,
      html.blobio-hide-captcha-logo .rc-anchor-logo-text,
      html.blobio-hide-captcha-logo .rc-anchor-invisible,
      html.blobio-hide-captcha-logo .rc-anchor-invisible-text,
      html.blobio-hide-captcha-logo .rc-anchor-invisible-hover,
      html.blobio-hide-captcha-logo .rc-anchor-pt {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        width: 0 !important;
        height: 0 !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        background: none !important;
        background-image: none !important;
        background-color: transparent !important;
        box-shadow: none !important;
      }
    `;

    const applyInlineState = (hidden) => {
      const targets = document.querySelectorAll?.(
        '.rc-anchor-logo-img, .rc-anchor-logo-img-large, '
        + '.rc-anchor-logo-portrait, .rc-anchor-logo-landscape, '
        + '.rc-anchor-normal-footer, .rc-anchor-compact-footer, '
        + '.rc-anchor-logo-text, .rc-anchor-invisible, '
        + '.rc-anchor-invisible-text, .rc-anchor-invisible-hover, .rc-anchor-pt',
      ) || [];

      for (const target of targets) {
        if (hidden) {
          target.style?.setProperty?.('display', 'none', 'important');
          target.style?.setProperty?.('visibility', 'hidden', 'important');
          target.style?.setProperty?.('background', 'none', 'important');
          target.style?.setProperty?.('background-image', 'none', 'important');
          target.style?.setProperty?.('background-color', 'transparent', 'important');
        } else {
          for (const property of [
            'display', 'visibility', 'background', 'background-image', 'background-color',
          ]) {
            target.style?.removeProperty?.(property);
          }
        }
      }
    };

    const applyState = (value = undefined) => {
      const hidden = readHidden(value);
      document.documentElement?.classList?.toggle('blobio-hide-captcha-logo', hidden);
      applyInlineState(hidden);
    };

    const ensureStyle = () => {
      const root = document.documentElement;
      if (!root) {
        setTimeout(ensureStyle, 0);
        return;
      }

      if (!globalThis.__blobioCaptchaLogoStyleInstalled) {
        if (typeof GM_addStyle === 'function') {
          GM_addStyle(frameCss);
        } else if (!document.getElementById('blobio-captcha-logo-frame-style')) {
          const style = document.createElement('style');
          style.id = 'blobio-captcha-logo-frame-style';
          style.textContent = frameCss;
          (document.head || root).appendChild(style);
        }
        globalThis.__blobioCaptchaLogoStyleInstalled = true;
      }

      applyState();

      const MutationObserverRef = globalThis.MutationObserver;
      if (MutationObserverRef && !globalThis.__blobioCaptchaLogoObserver) {
        const observer = new MutationObserverRef(() => applyState());
        observer.observe(root, { childList: true, subtree: true });
        globalThis.__blobioCaptchaLogoObserver = observer;
      }
    };

    ensureStyle();
    try {
      GM_addValueChangeListener?.(CAPTCHA_LOGO_HIDDEN_KEY, (_key, _oldValue, newValue) => {
        applyState(newValue);
      });
    } catch {}
  }

  if (isRecaptchaAnchorFrame()) {
    installCaptchaLogoFrameStyle();
    return;
  }

  globalThis.__blobioLoaderVersion = VERSION;

  const BUNDLE_URLS = [
    `https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Extension/cleanup/dist/blobio-extension.bundle.js?v=${VERSION}`,
    `https://cdn.jsdelivr.net/gh/SkyViewBlobio/Blobgame.io-Extension@cleanup/dist/blobio-extension.bundle.js?v=${VERSION}`,
  ];

  function logError(message, detail) {
    if (detail) {
      console.error(LOG_PREFIX, message, detail);
    } else {
      console.error(LOG_PREFIX, message);
    }
  }

  function getLocalValue(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function setLocalValue(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  }

  function removeLocalValue(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  function getSharedValue(key) {
    try {
      if (typeof GM_getValue === 'function') {
        const value = GM_getValue(key, undefined);
        if (value !== undefined && value !== null) {
          setLocalValue(key, value);
          return String(value);
        }
      }
    } catch {}

    return getLocalValue(key);
  }

  function setSharedValue(key, value) {
    try {
      GM_setValue?.(key, String(value));
    } catch {}
    setLocalValue(key, value);
  }

  function removeSharedValue(key) {
    try {
      GM_deleteValue?.(key);
    } catch {}
    removeLocalValue(key);
  }

  function readBooleanValue(value, fallback = false) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }

  function clampAnimationSpeedSlider(value) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) {
      return 10;
    }
    return Math.max(1, Math.min(180, number));
  }

  function normalizeAnimationSpeedMode(value) {
    return String(value || '').trim().toLowerCase() === ANIMATION_SPEED_MODES.unsafe
      ? ANIMATION_SPEED_MODES.unsafe
      : ANIMATION_SPEED_MODES.friendly;
  }

  function readAnimationSpeedRuntimeSettings() {
    const enabled = readBooleanValue(getSharedValue(ANIMATION_SPEED_KEYS.enabled), false);
    const slider = clampAnimationSpeedSlider(getSharedValue(ANIMATION_SPEED_KEYS.slider) || 10);
    return {
      enabled,
      slider,
      speed: enabled ? slider / 10 : 1,
      mode: normalizeAnimationSpeedMode(getSharedValue(ANIMATION_SPEED_KEYS.mode)),
    };
  }

  function readJellyShaderRuntimeSettings() {
    return {
      enabled: readBooleanValue(getSharedValue(JELLY_SHADER_KEYS.enabled), false),
      skinCells: readBooleanValue(getSharedValue(JELLY_SHADER_KEYS.skinCells), true),
      noSkinCells: readBooleanValue(getSharedValue(JELLY_SHADER_KEYS.noSkinCells), false),
      version: VERSION,
    };
  }

  function normalizeHudInfoRuntimeMode(value, allowed, fallback) {
    const mode = String(value || '').trim().toLowerCase();
    return allowed.includes(mode) ? mode : fallback;
  }

  function normalizeHudInfoRuntimeColor(value) {
    const color = String(value || '').trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(color) ? color : '#ffffff';
  }

  function normalizeHudInfoRuntimeNumber(value, min, max, fallback) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, number));
  }

  function readHudInfoRuntimeSettings() {
    return {
      enabled: readBooleanValue(getSharedValue(HUD_INFO_KEYS.enabled), true),
      showFps: readBooleanValue(getSharedValue(HUD_INFO_KEYS.showFps), true),
      showScore: readBooleanValue(getSharedValue(HUD_INFO_KEYS.showScore), true),
      showCells: readBooleanValue(getSharedValue(HUD_INFO_KEYS.showCells), true),
      showPing: readBooleanValue(getSharedValue(HUD_INFO_KEYS.showPing), true),
      showBoosters: readBooleanValue(getSharedValue(HUD_INFO_KEYS.showBoosters), true),
      positionMode: normalizeHudInfoRuntimeMode(
        getSharedValue(HUD_INFO_KEYS.positionMode),
        ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'],
        'top-left',
      ),
      layoutMode: normalizeHudInfoRuntimeMode(getSharedValue(HUD_INFO_KEYS.layoutMode), ['below', 'line'], 'below'),
      styleMode: normalizeHudInfoRuntimeMode(getSharedValue(HUD_INFO_KEYS.styleMode), ['simple', 'solid'], 'simple'),
      fpsMode: normalizeHudInfoRuntimeMode(getSharedValue(HUD_INFO_KEYS.fpsMode), ['default', 'advanced', 'dev'], 'default'),
      scoreMode: normalizeHudInfoRuntimeMode(getSharedValue(HUD_INFO_KEYS.scoreMode), ['default', 'advanced', 'dev'], 'default'),
      pingMode: normalizeHudInfoRuntimeMode(getSharedValue(HUD_INFO_KEYS.pingMode), ['default', 'advanced', 'dev'], 'default'),
      boosterNameMode: normalizeHudInfoRuntimeMode(getSharedValue(HUD_INFO_KEYS.boosterNameMode), ['simple', 'solid'], 'simple'),
      boosterDurationMode: normalizeHudInfoRuntimeMode(getSharedValue(HUD_INFO_KEYS.boosterDurationMode), ['simple', 'solid'], 'simple'),
      boosterLastSecFlash: readBooleanValue(getSharedValue(HUD_INFO_KEYS.boosterLastSecFlash), false),
      fontSize: Math.round(normalizeHudInfoRuntimeNumber(getSharedValue(HUD_INFO_KEYS.fontSize), 10, 32, 17)),
      color: normalizeHudInfoRuntimeColor(getSharedValue(HUD_INFO_KEYS.color)),
      alpha: normalizeHudInfoRuntimeNumber(getSharedValue(HUD_INFO_KEYS.alpha), 0, 1, 1),
    };
  }

  function normalizeHexColor(value, fallback) {
    const color = String(value || '').trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
  }

  function normalizePercentAlpha(value, fallback) {
    const alpha = Number(value);
    return Number.isFinite(alpha) ? Math.max(0, Math.min(100, Math.round(alpha))) : fallback;
  }

  function normalizeGradientAngle(value, fallback) {
    const angle = Math.round(Number(value));
    return Number.isFinite(angle) ? Math.max(0, Math.min(360, angle)) : fallback;
  }

  function readGameBackgroundRuntimeSettings() {
    return {
      enabled: readBooleanValue(getSharedValue(GAME_BACKGROUND_KEYS.enabled), false),
      mode: getSharedValue(GAME_BACKGROUND_KEYS.mode) === 'gradient' ? 'gradient' : 'solid',
      solid: {
        color: normalizeHexColor(getSharedValue(GAME_BACKGROUND_KEYS.solidColor), '#222222'),
        alpha: normalizePercentAlpha(getSharedValue(GAME_BACKGROUND_KEYS.solidAlpha), 100),
      },
      gradient: {
        from: {
          color: normalizeHexColor(getSharedValue(GAME_BACKGROUND_KEYS.gradientFromColor), '#141824'),
          alpha: normalizePercentAlpha(getSharedValue(GAME_BACKGROUND_KEYS.gradientFromAlpha), 100),
        },
        to: {
          color: normalizeHexColor(getSharedValue(GAME_BACKGROUND_KEYS.gradientToColor), '#007e69'),
          alpha: normalizePercentAlpha(getSharedValue(GAME_BACKGROUND_KEYS.gradientToAlpha), 100),
        },
        angle: normalizeGradientAngle(getSharedValue(GAME_BACKGROUND_KEYS.gradientAngle), 135),
      },
    };
  }

  function normalizeVirusMotherCellSnapshot(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const rawMaskId = String(value.maskId || 'halo').toLowerCase();
    const rawColor = String(value.color || '#ff0000').toLowerCase();
    const rawAlpha = Number(value.alpha);
    const updatedAt = Number(value.updatedAt);
    return {
      enabled: readBooleanValue(value.enabled),
      maskId: ['halo', 'rotate', 'ring'].includes(rawMaskId) ? rawMaskId : 'halo',
      color: /^#[0-9a-f]{6}$/.test(rawColor) ? rawColor : '#ff0000',
      alpha: Number.isFinite(rawAlpha) ? Math.max(0, Math.min(1, rawAlpha)) : 0.85,
      rotate: readBooleanValue(value.rotate),
      updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0,
    };
  }

  function parseVirusMotherCellSnapshot(value) {
    if (!value) {
      return null;
    }
    try {
      return normalizeVirusMotherCellSnapshot(typeof value === 'string' ? JSON.parse(value) : value);
    } catch {
      return null;
    }
  }

  function getCookieValue(name) {
    const prefix = `${name}=`;
    for (const part of String(document.cookie || '').split(';')) {
      const entry = part.trim();
      if (entry.startsWith(prefix)) {
        try {
          return decodeURIComponent(entry.slice(prefix.length));
        } catch {
          return '';
        }
      }
    }
    return '';
  }

  function readVirusMotherCellRuntimeSettings() {
    const sharedSnapshotRaw = getSharedValue(VIRUS_MOTHER_CELL_SNAPSHOT_KEY);
    const sharedSnapshot = parseVirusMotherCellSnapshot(sharedSnapshotRaw);
    const cookieSnapshotRaw = getCookieValue(VIRUS_MOTHER_CELL_COOKIE_NAME);
    const cookieSnapshot = parseVirusMotherCellSnapshot(cookieSnapshotRaw);
    const individualEnabled = getSharedValue(VIRUS_MOTHER_CELL_KEYS.enabled);
    const individual = normalizeVirusMotherCellSnapshot({
      enabled: readBooleanValue(individualEnabled),
      maskId: getSharedValue(VIRUS_MOTHER_CELL_KEYS.maskId),
      color: getSharedValue(VIRUS_MOTHER_CELL_KEYS.color),
      alpha: getSharedValue(VIRUS_MOTHER_CELL_KEYS.alpha),
      rotate: getSharedValue(VIRUS_MOTHER_CELL_KEYS.rotate),
      updatedAt: 0,
    });

    const candidates = [
      sharedSnapshot && { source: 'gm-snapshot', value: sharedSnapshot },
      cookieSnapshot && { source: 'domain-cookie', value: cookieSnapshot },
    ].filter(Boolean).sort((left, right) => right.value.updatedAt - left.value.updatedAt);
    const selected = candidates[0] || { source: 'individual-values', value: individual };

    if (selected.source === 'domain-cookie'
      && (!sharedSnapshot || cookieSnapshot.updatedAt > sharedSnapshot.updatedAt)) {
      setSharedValue(VIRUS_MOTHER_CELL_SNAPSHOT_KEY, JSON.stringify(cookieSnapshot));
    }

    return {
      ...selected.value,
      source: selected.source,
      diagnostics: {
        sharedSnapshotPresent: Boolean(sharedSnapshot),
        sharedSnapshotUpdatedAt: sharedSnapshot?.updatedAt || 0,
        cookieSnapshotPresent: Boolean(cookieSnapshot),
        cookieSnapshotUpdatedAt: cookieSnapshot?.updatedAt || 0,
        individualEnabled,
      },
    };
  }

  const DEFAULT_VIRUS_PELLET_COLOR_RUNTIME_SETTINGS = {
    enabled: false,
    virus: {
      mode: 'solid',
      alpha: 100,
      solid: '#00d25a',
      gradient: {
        from: '#00ff8c',
        to: '#0078ff',
        angle: 135,
      },
    },
    pellets: {
      mode: 'solid',
      alpha: 100,
      solid: '#ffb450',
      gradient: {
        from: '#ff50a0',
        to: '#46dcff',
        angle: 45,
      },
    },
  };

  function normalizeVirusPelletColorRuntimeSnapshot(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const updatedAt = Number(value.updatedAt);
    return {
      enabled: readBooleanValue(value.enabled),
      virus: normalizeVirusPelletColorRuntimeTarget(
        value.virus,
        DEFAULT_VIRUS_PELLET_COLOR_RUNTIME_SETTINGS.virus,
      ),
      pellets: normalizeVirusPelletColorRuntimeTarget(
        value.pellets,
        DEFAULT_VIRUS_PELLET_COLOR_RUNTIME_SETTINGS.pellets,
      ),
      updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0,
    };
  }

  function normalizeVirusPelletColorRuntimeTarget(value, fallback) {
    const source = value && typeof value === 'object' ? value : {};
    const gradient = source.gradient && typeof source.gradient === 'object' ? source.gradient : {};
    return {
      mode: source.mode === 'gradient' ? 'gradient' : 'solid',
      alpha: normalizePercentAlpha(source.alpha, fallback.alpha),
      solid: normalizeHexColor(source.solid, fallback.solid),
      gradient: {
        from: normalizeHexColor(gradient.from, fallback.gradient.from),
        to: normalizeHexColor(gradient.to, fallback.gradient.to),
        angle: normalizeGradientAngle(gradient.angle, fallback.gradient.angle),
      },
    };
  }

  function parseVirusPelletColorRuntimeSnapshot(value) {
    if (!value) {
      return null;
    }
    try {
      return normalizeVirusPelletColorRuntimeSnapshot(typeof value === 'string' ? JSON.parse(value) : value);
    } catch {
      return null;
    }
  }

  function readVirusPelletColorRuntimeSettings() {
    const sharedSnapshotRaw = getSharedValue(VIRUS_PELLET_COLOR_SNAPSHOT_KEY);
    const sharedSnapshot = parseVirusPelletColorRuntimeSnapshot(sharedSnapshotRaw);
    const cookieSnapshotRaw = getCookieValue(VIRUS_PELLET_COLOR_COOKIE_NAME);
    const cookieSnapshot = parseVirusPelletColorRuntimeSnapshot(cookieSnapshotRaw);
    const fallback = normalizeVirusPelletColorRuntimeSnapshot(DEFAULT_VIRUS_PELLET_COLOR_RUNTIME_SETTINGS);

    const candidates = [
      sharedSnapshot && { source: 'gm-snapshot', value: sharedSnapshot },
      cookieSnapshot && { source: 'domain-cookie', value: cookieSnapshot },
    ].filter(Boolean).sort((left, right) => right.value.updatedAt - left.value.updatedAt);
    const selected = candidates[0] || { source: 'defaults', value: fallback };

    if (selected.source === 'domain-cookie'
      && (!sharedSnapshot || cookieSnapshot.updatedAt > sharedSnapshot.updatedAt)) {
      setSharedValue(VIRUS_PELLET_COLOR_SNAPSHOT_KEY, JSON.stringify(cookieSnapshot));
    }

    return {
      ...selected.value,
      source: selected.source,
      diagnostics: {
        sharedSnapshotPresent: Boolean(sharedSnapshot),
        sharedSnapshotUpdatedAt: sharedSnapshot?.updatedAt || 0,
        cookieSnapshotPresent: Boolean(cookieSnapshot),
        cookieSnapshotUpdatedAt: cookieSnapshot?.updatedAt || 0,
      },
    };
  }

  const DEFAULT_CELL_MASS_RUNTIME_SETTINGS = {
    enabled: true,
    compact: true,
    smartRendering: true,
    emphasizeBiggest: true,
    mode: 'normal',
    textScale: 0.65,
    yOffset: 10,
    nameGap: 1.2,
    updateDelayMs: 3000,
  };

  function normalizeCellMassRuntimeSnapshot(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const updatedAt = Number(value.updatedAt);
    return {
      enabled: value.enabled === undefined ? DEFAULT_CELL_MASS_RUNTIME_SETTINGS.enabled : readBooleanValue(value.enabled),
      compact: value.compact === undefined ? DEFAULT_CELL_MASS_RUNTIME_SETTINGS.compact : readBooleanValue(value.compact),
      smartRendering: value.smartRendering === undefined ? DEFAULT_CELL_MASS_RUNTIME_SETTINGS.smartRendering : readBooleanValue(value.smartRendering),
      emphasizeBiggest: value.emphasizeBiggest === undefined ? DEFAULT_CELL_MASS_RUNTIME_SETTINGS.emphasizeBiggest : readBooleanValue(value.emphasizeBiggest),
      mode: ['normal', 'vip', 'custom'].includes(value.mode) ? value.mode : DEFAULT_CELL_MASS_RUNTIME_SETTINGS.mode,
      textScale: normalizeHudInfoRuntimeNumber(value.textScale, 0.35, 1.4, DEFAULT_CELL_MASS_RUNTIME_SETTINGS.textScale),
      yOffset: normalizeHudInfoRuntimeNumber(value.yOffset, -120, 120, DEFAULT_CELL_MASS_RUNTIME_SETTINGS.yOffset),
      nameGap: normalizeHudInfoRuntimeNumber(value.nameGap, 0.1, 3, DEFAULT_CELL_MASS_RUNTIME_SETTINGS.nameGap),
      updateDelayMs: Math.round(normalizeHudInfoRuntimeNumber(value.updateDelayMs, 0, 10000, DEFAULT_CELL_MASS_RUNTIME_SETTINGS.updateDelayMs)),
      updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0,
    };
  }

  function parseCellMassRuntimeSnapshot(value) {
    if (!value) {
      return null;
    }
    try {
      return normalizeCellMassRuntimeSnapshot(typeof value === 'string' ? JSON.parse(value) : value);
    } catch {
      return null;
    }
  }

  function readCellMassRuntimeSettings() {
    const sharedSnapshotRaw = getSharedValue(CELL_MASS_SNAPSHOT_KEY);
    const sharedSnapshot = parseCellMassRuntimeSnapshot(sharedSnapshotRaw);
    const cookieSnapshotRaw = getCookieValue(CELL_MASS_COOKIE_NAME);
    const cookieSnapshot = parseCellMassRuntimeSnapshot(cookieSnapshotRaw);
    const fallback = normalizeCellMassRuntimeSnapshot(DEFAULT_CELL_MASS_RUNTIME_SETTINGS);

    const candidates = [
      sharedSnapshot && { source: 'gm-snapshot', value: sharedSnapshot },
      cookieSnapshot && { source: 'domain-cookie', value: cookieSnapshot },
    ].filter(Boolean).sort((left, right) => right.value.updatedAt - left.value.updatedAt);
    const selected = candidates[0] || { source: 'defaults', value: fallback };

    if (selected.source === 'domain-cookie'
      && (!sharedSnapshot || cookieSnapshot.updatedAt > sharedSnapshot.updatedAt)) {
      setSharedValue(CELL_MASS_SNAPSHOT_KEY, JSON.stringify(cookieSnapshot));
    }

    return {
      ...selected.value,
      source: selected.source,
      diagnostics: {
        sharedSnapshotPresent: Boolean(sharedSnapshot),
        sharedSnapshotUpdatedAt: sharedSnapshot?.updatedAt || 0,
        cookieSnapshotPresent: Boolean(cookieSnapshot),
        cookieSnapshotUpdatedAt: cookieSnapshot?.updatedAt || 0,
      },
    };
  }

  const DEFAULT_FPS_SAVER_RUNTIME_SETTINGS = {
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
  };

  function normalizeFpsSaverRuntimeSnapshot(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const updatedAt = Number(value.updatedAt);
    return {
      liteMode: value.liteMode === undefined ? DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.liteMode : readBooleanValue(value.liteMode),
      noTransitions: value.noTransitions === undefined ? DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.noTransitions : readBooleanValue(value.noTransitions),
      hiddenTab: value.hiddenTab === undefined ? DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.hiddenTab : readBooleanValue(value.hiddenTab),
      hiddenFps: Math.round(normalizeHudInfoRuntimeNumber(value.hiddenFps, 1, 10, DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.hiddenFps)),
      gameOverlay: value.gameOverlay === undefined ? DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.gameOverlay : readBooleanValue(value.gameOverlay),
      toastModalAnim: value.toastModalAnim === undefined ? DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.toastModalAnim : readBooleanValue(value.toastModalAnim),
      chatGuard: value.chatGuard === undefined ? DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.chatGuard : readBooleanValue(value.chatGuard),
      maxChatRows: Math.round(normalizeHudInfoRuntimeNumber(value.maxChatRows, 20, 120, DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.maxChatRows)),
      objectRenderer: value.objectRenderer === undefined ? DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.objectRenderer : readBooleanValue(value.objectRenderer),
      foodCulling: value.foodCulling === undefined ? DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.foodCulling : readBooleanValue(value.foodCulling),
      foodLimit: Math.round(normalizeHudInfoRuntimeNumber(value.foodLimit, 0, 900, DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.foodLimit)),
      massCulling: value.massCulling === undefined ? DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.massCulling : readBooleanValue(value.massCulling),
      massLimit: Math.round(normalizeHudInfoRuntimeNumber(value.massLimit, 0, 900, DEFAULT_FPS_SAVER_RUNTIME_SETTINGS.massLimit)),
      updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0,
    };
  }

  function parseFpsSaverRuntimeSnapshot(value) {
    if (!value) {
      return null;
    }
    try {
      return normalizeFpsSaverRuntimeSnapshot(typeof value === 'string' ? JSON.parse(value) : value);
    } catch {
      return null;
    }
  }

  function readFpsSaverRuntimeSettings() {
    const sharedSnapshotRaw = getSharedValue(FPS_SAVER_SNAPSHOT_KEY);
    const sharedSnapshot = parseFpsSaverRuntimeSnapshot(sharedSnapshotRaw);
    const cookieSnapshotRaw = getCookieValue(FPS_SAVER_COOKIE_NAME);
    const cookieSnapshot = parseFpsSaverRuntimeSnapshot(cookieSnapshotRaw);
    const fallback = normalizeFpsSaverRuntimeSnapshot(DEFAULT_FPS_SAVER_RUNTIME_SETTINGS);

    const candidates = [
      sharedSnapshot && { source: 'gm-snapshot', value: sharedSnapshot },
      cookieSnapshot && { source: 'domain-cookie', value: cookieSnapshot },
    ].filter(Boolean).sort((left, right) => right.value.updatedAt - left.value.updatedAt);
    const selected = candidates[0] || { source: 'defaults', value: fallback };

    if (selected.source === 'domain-cookie'
      && (!sharedSnapshot || cookieSnapshot.updatedAt > sharedSnapshot.updatedAt)) {
      setSharedValue(FPS_SAVER_SNAPSHOT_KEY, JSON.stringify(cookieSnapshot));
    }

    return {
      ...selected.value,
      source: selected.source,
      diagnostics: {
        sharedSnapshotPresent: Boolean(sharedSnapshot),
        sharedSnapshotUpdatedAt: sharedSnapshot?.updatedAt || 0,
        cookieSnapshotPresent: Boolean(cookieSnapshot),
        cookieSnapshotUpdatedAt: cookieSnapshot?.updatedAt || 0,
      },
    };
  }

  function isSharedStorageKey(key) {
    const value = String(key || '');
    return value.startsWith('blobio.roles.')
      || value.startsWith('blobio.settings.')
      || value.startsWith('blobio.chat.');
  }

  function installExtensionInputKeyboardIsolation() {
    if (location.hostname !== CUSTOM_CLIENT_HOST || globalThis[INPUT_KEYBOARD_ISOLATION_KEY]) {
      return;
    }

    const prototype = globalThis.EventTarget?.prototype;
    if (!prototype?.addEventListener || !prototype?.removeEventListener) {
      return;
    }

    const nativeAddEventListener = prototype.addEventListener;
    const nativeRemoveEventListener = prototype.removeEventListener;
    const keyboardEvents = new Set(['keydown', 'keypress', 'keyup']);
    const listenerWrappers = new WeakMap();

    const isGlobalKeyboardTarget = (target) => target === window
      || target === document
      || target === document.body;

    const isExtensionInput = (target) => {
      const input = target?.closest?.('input, textarea, select, [contenteditable="true"]');
      return Boolean(input?.closest?.('.blobio-chat-settings-root'));
    };

    const captureKey = (options) => {
      if (typeof options === 'boolean') {
        return options ? 'capture' : 'bubble';
      }
      return options?.capture ? 'capture' : 'bubble';
    };

    const getListenerMap = (target, type, options, create) => {
      let targetMap = listenerWrappers.get(target);
      if (!targetMap && create) {
        targetMap = new Map();
        listenerWrappers.set(target, targetMap);
      }
      if (!targetMap) {
        return null;
      }

      const key = `${type}:${captureKey(options)}`;
      let listeners = targetMap.get(key);
      if (!listeners && create) {
        listeners = new WeakMap();
        targetMap.set(key, listeners);
      }
      return listeners || null;
    };

    prototype.addEventListener = function blobioInputSafeAddEventListener(type, listener, options) {
      const listenerType = typeof listener;
      if (!keyboardEvents.has(type)
        || (listenerType !== 'function' && listenerType !== 'object')
        || !isGlobalKeyboardTarget(this)) {
        return nativeAddEventListener.call(this, type, listener, options);
      }

      const listeners = getListenerMap(this, type, options, true);
      let wrapped = listeners.get(listener);
      if (!wrapped) {
        wrapped = function blobioInputSafeKeyboardListener(event) {
          if (isExtensionInput(event?.target)) {
            return undefined;
          }

          if (typeof listener === 'function') {
            return listener.call(this, event);
          }
          return listener.handleEvent?.call(listener, event);
        };
        listeners.set(listener, wrapped);
      }

      return nativeAddEventListener.call(this, type, wrapped, options);
    };

    prototype.removeEventListener = function blobioInputSafeRemoveEventListener(type, listener, options) {
      const listenerType = typeof listener;
      const wrapped = keyboardEvents.has(type)
        && (listenerType === 'function' || listenerType === 'object')
        && isGlobalKeyboardTarget(this)
        ? getListenerMap(this, type, options, false)?.get(listener)
        : null;
      return nativeRemoveEventListener.call(this, type, wrapped || listener, options);
    };

    globalThis[INPUT_KEYBOARD_ISOLATION_KEY] = true;
  }

  function installEarlyKeyboardRuntime() {
    if (!globalThis[EARLY_HOTKEY_BRIDGE_KEY]) {
      let handler = null;
      const listener = (event) => {
        try {
          handler?.(event);
        } catch (error) {
          logError('Early keyboard hotkey handler failed.', error);
        }
      };

      window.addEventListener?.('keydown', listener, true);
      globalThis[EARLY_HOTKEY_BRIDGE_KEY] = {
        setHandler(nextHandler) {
          handler = typeof nextHandler === 'function' ? nextHandler : null;
        },
        clearHandler(currentHandler) {
          if (!currentHandler || handler === currentHandler) {
            handler = null;
          }
        },
      };
    }

    if (!globalThis.__blobioExtensionKeyboardShieldInstalled) {
      const blockGameKeybindings = (event) => {
        const target = event.target;
        if (!target?.closest?.('.blobio-chat-settings-root')) {
          return;
        }

        event.stopImmediatePropagation?.();
        event.stopPropagation?.();
      };

      for (const eventName of ['keydown', 'keypress', 'keyup']) {
        document.addEventListener?.(eventName, blockGameKeybindings, false);
      }
      globalThis.__blobioExtensionKeyboardShieldInstalled = true;
    }
  }

  function installSharedStorageBridge() {
    if (globalThis.__blobioSharedStorageBridgeInstalled) {
      return;
    }

    globalThis.__blobioSharedStorageBridge = {
      getItem(key) {
        return isSharedStorageKey(key) ? getSharedValue(key) : getLocalValue(key);
      },
      setItem(key, value) {
        if (isSharedStorageKey(key)) {
          setSharedValue(key, value);
        } else {
          setLocalValue(key, value);
        }
      },
      removeItem(key) {
        if (isSharedStorageKey(key)) {
          removeSharedValue(key);
        } else {
          removeLocalValue(key);
        }
      },
    };

    window.addEventListener?.('message', (event) => {
      const message = event.data;
      if (!message || message.source !== STORAGE_BRIDGE_SOURCE || !isSharedStorageKey(message.key)) {
        return;
      }

      if (message.type === 'set') {
        setSharedValue(message.key, message.value ?? '');
      } else if (message.type === 'remove') {
        removeSharedValue(message.key);
      }
    });

    globalThis.__blobioSharedStorageBridgeInstalled = true;
  }

  function pageAnimationSpeedBootstrap(initialSettings, pageWindow) {
    'use strict';

    const win = pageWindow || globalThis;
    if (win.location?.hostname !== CUSTOM_CLIENT_HOST) {
      return false;
    }

    if (win.__blobioAnimationSpeedInstalled) {
      win.__blobioAnimationSpeedRefresh?.(initialSettings);
      return true;
    }

    const MODE_FRIENDLY = ANIMATION_SPEED_MODES.friendly;
    const MODE_UNSAFE = ANIMATION_SPEED_MODES.unsafe;
    const CACHE_SCRIPT_RE = /\/html\/[A-F0-9]{32}\.cache\.js(?:[?#].*)?$/i;
    const SCHEDULER_RE = /var a=([A-Za-z_$][A-Za-z0-9_$]*)\(\);b\.tc\(a\)/g;
    const DELTA_ASSIGN_RE = /a\.c=([^;]+);a\.i=b;a\.j\+=a\.c/g;
    const LEGACY_DELTA_ASSIGN_RE = /a\.b=([^;]+);a\.f=b;a\.g\+=a\.b/g;
    const GAME_TIME_RE = /([A-Za-z_$][A-Za-z0-9_$]*\.r=)\(([A-Za-z_$][A-Za-z0-9_$]*)\(\),([A-Za-z_$][A-Za-z0-9_$]*\([A-Za-z_$][A-Za-z0-9_$]*\(\)\))\);(?=(?:if\(q>0\)|[A-Za-z_$][A-Za-z0-9_$]*\.i=false))/g;
    const SHADER_CLOCK_RE = /a\.w\+=\$b\.c;c=null;([A-Za-z_$][A-Za-z0-9_$]*\([A-Za-z_$][A-Za-z0-9_$]*\))/g;
    const nativeNow = win.Date.now.__blobioAnimationNativeNow || win.Date.now.bind(win.Date);
    let realAnchor = nativeNow();
    let virtualAnchor = realAnchor;
    let settings = normalizeSettings(initialSettings);
    let shaderTimeActive = false;
    let shaderRealAnchor = 0;
    let shaderUniformAnchor = 0;
    const shaderLocations = typeof win.WeakSet === 'function' ? new win.WeakSet() : null;
    const shaderLocationList = [];
    const patchedWindows = typeof win.WeakSet === 'function' ? new win.WeakSet() : null;
    const state = {
      installed: true,
      enabled: settings.enabled,
      speed: settings.speed,
      mode: settings.mode,
      sourceHookInstalled: false,
      wrappedCallback: false,
      wrapReason: '',
      seenCacheScripts: 0,
      callbackCalls: 0,
      patchResults: [],
      lastPatchResult: null,
      frameCalls: 0,
      lastRealNow: 0,
      lastVirtualNow: 0,
      lastRealDelta: 0,
      lastVirtualDelta: 0,
      deltaCalls: 0,
      fpsDeltaCalls: 0,
      shaderDeltaCalls: 0,
      lastRawDelta: 0,
      lastScaledDelta: 0,
      lastFpsDelta: 0,
      lastShaderDelta: 0,
      gameTimeCalls: 0,
      lastGameRealDelta: 0,
      lastGameVirtualDelta: 0,
      lastGameRealNow: 0,
      lastGameVirtualNow: 0,
      patchedWindows: 0,
      patchedFrames: 0,
      frameHookInstalled: false,
      shaderUniforms: 0,
      shaderWrites: 0,
      errors: [],
      lastError: '',
    };
    win.__blobioAnimationSpeedState = state;

    function clampSpeed(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        return 1;
      }
      return Math.max(0.1, Math.min(18, number));
    }

    function normalizeMode(value) {
      return String(value || '').trim().toLowerCase() === MODE_UNSAFE ? MODE_UNSAFE : MODE_FRIENDLY;
    }

    function normalizeSettings(value) {
      const source = value && typeof value === 'object' ? value : { speed: value };
      const speed = clampSpeed(source.speed);
      return {
        enabled: source.enabled === undefined ? speed !== 1 : Boolean(source.enabled),
        speed,
        mode: normalizeMode(source.mode),
      };
    }

    function activeSpeed() {
      return settings.enabled ? settings.speed : 1;
    }

    function isFriendlyAnimationMode() {
      return settings.enabled && settings.mode === MODE_FRIENDLY;
    }

    function isUnsafeAnimationMode() {
      return settings.enabled && settings.mode === MODE_UNSAFE;
    }

    function virtualNow(realNow = nativeNow()) {
      if (!settings.enabled) {
        return realNow;
      }

      return virtualAnchor + Math.max(0, realNow - realAnchor) * activeSpeed();
    }

    function syncClockTo(now) {
      virtualAnchor = virtualNow(now);
      realAnchor = now;
    }

    function setSettings(value) {
      syncClockTo(nativeNow());
      settings = normalizeSettings(value);
      state.enabled = settings.enabled;
      state.speed = settings.speed;
      state.mode = settings.mode;
      state.lastError = '';
      return settings;
    }

    function normalizeDelta(rawDelta) {
      const input = Number(rawDelta);
      return Number.isFinite(input) && input > 0 ? input : 0;
    }

    function animationNow(realNow) {
      let input = Number(realNow);
      let output;

      if (!Number.isFinite(input)) {
        input = nativeNow();
      }

      output = isFriendlyAnimationMode() ? virtualNow(input) : input;
      state.frameCalls += 1;
      state.lastRealDelta = state.lastRealNow ? input - state.lastRealNow : 0;
      state.lastVirtualDelta = state.lastVirtualNow ? output - state.lastVirtualNow : 0;
      state.lastRealNow = input;
      state.lastVirtualNow = output;
      return Math.floor(output);
    }

    function gameNow(realNow) {
      let input = Number(realNow);
      let output;

      if (!Number.isFinite(input)) {
        input = nativeNow();
      }

      output = isFriendlyAnimationMode() ? virtualNow(input) : input;
      state.gameTimeCalls += 1;
      state.lastGameRealDelta = state.lastGameRealNow ? input - state.lastGameRealNow : 0;
      state.lastGameVirtualDelta = state.lastGameVirtualNow ? output - state.lastGameVirtualNow : 0;
      state.lastGameRealNow = input;
      state.lastGameVirtualNow = output;
      return Math.floor(output);
    }

    function scaleDelta(rawDelta) {
      const input = normalizeDelta(rawDelta);
      const scaled = isFriendlyAnimationMode() ? input * activeSpeed() : input;

      state.deltaCalls += 1;
      state.lastRawDelta = input;
      state.lastScaledDelta = scaled;
      return scaled;
    }

    function fpsDelta(rawDelta) {
      const input = normalizeDelta(rawDelta);
      state.fpsDeltaCalls += 1;
      state.lastFpsDelta = input;
      return input;
    }

    function shaderDelta(rawDelta) {
      const input = normalizeDelta(rawDelta);
      state.shaderDeltaCalls += 1;
      state.lastShaderDelta = input;
      return input;
    }

    function rememberError(source, error) {
      const message = error?.message || String(error);
      state.lastError = message;
      state.errors.push({ source, message, time: nativeNow() });
      state.errors = state.errors.slice(-10);
    }

    function patchCacheSource(source) {
      let patched = source;
      let schedulerHits = 0;
      let deltaHits = 0;
      let gameTimeHits = 0;
      let shaderHits = 0;

      if (typeof source !== 'string') {
        return { changed: false, schedulerHits, deltaHits, gameTimeHits, shaderHits, source };
      }

      if (patched.includes('requestAnimationFrame') && patched.includes('.tc(a)')) {
        patched = patched.replace(SCHEDULER_RE, (match, timeFunction) => {
          if (match.includes('__blobioAnimationNow')) {
            return match;
          }

          schedulerHits += 1;
          return `var a=$wnd.__blobioAnimationNow(${timeFunction}());b.tc(a)`;
        });
      }

      if (patched.includes('a.j+=a.c')) {
        patched = patched.replace(DELTA_ASSIGN_RE, (match, deltaExpression) => {
          if (match.includes('__blobioAnimationDelta')) {
            return match;
          }

          deltaHits += 1;
          return `a.c=${deltaExpression};a.i=b;a.j+=$wnd.__blobioAnimationFpsDelta(a.c);$wnd.__blobioAnimationDelta(a.c)`;
        });
      }

      if (patched.includes('a.g+=a.b')) {
        patched = patched.replace(LEGACY_DELTA_ASSIGN_RE, (match, deltaExpression) => {
          if (match.includes('__blobioAnimationDelta')) {
            return match;
          }

          deltaHits += 1;
          return `a.b=${deltaExpression};a.f=b;a.g+=$wnd.__blobioAnimationFpsDelta(a.b);$wnd.__blobioAnimationDelta(a.b)`;
        });
      }

      if (patched.includes('.r=')) {
        patched = patched.replace(GAME_TIME_RE, (match, assignment, namespaceName, timeExpression) => {
          if (match.includes('__blobioAnimationGameNow')) {
            return match;
          }

          gameTimeHits += 1;
          return `${assignment}(${namespaceName}(),$wnd.__blobioAnimationGameNow(${timeExpression}));`;
        });
      }

      if (patched.includes("'u_time'") && patched.includes('a.w+=$b.c')) {
        patched = patched.replace(SHADER_CLOCK_RE, (match, nextCall) => {
          if (match.includes('__blobioAnimationShaderDelta')) {
            return match;
          }

          shaderHits += 1;
          return `a.w+=$wnd.__blobioAnimationShaderDelta($b.c);c=null;${nextCall}`;
        });
      }

      return {
        changed: schedulerHits > 0 || deltaHits > 0 || gameTimeHits > 0 || shaderHits > 0,
        schedulerHits,
        deltaHits,
        gameTimeHits,
        shaderHits,
        source: patched,
      };
    }

    function rememberPatchResult(result) {
      const summary = {
        changed: Boolean(result.changed),
        schedulerHits: result.schedulerHits || 0,
        deltaHits: result.deltaHits || 0,
        gameTimeHits: result.gameTimeHits || 0,
        shaderHits: result.shaderHits || 0,
        time: nativeNow(),
      };

      state.lastPatchResult = summary;
      state.patchResults.push(summary);
      state.patchResults = state.patchResults.slice(-10);
    }

    function wrapHtmlCallback(reason) {
      const html = win.html;
      if (!html || typeof html.onScriptDownloaded !== 'function') {
        return false;
      }

      if (html.__blobioAnimationWrapped || html.onScriptDownloaded.__blobioAnimationWrapped) {
        state.wrappedCallback = true;
        return true;
      }

      const original = html.onScriptDownloaded;
      html.onScriptDownloaded = function blobioAnimationOnScriptDownloaded(chunks) {
        let source;
        let result;

        state.callbackCalls += 1;

        try {
          source = Array.isArray(chunks) ? chunks.join('') : String(chunks || '');
          result = patchCacheSource(source);
          rememberPatchResult(result);

          if (result.changed) {
            return original.call(this, [result.source]);
          }
        } catch (error) {
          rememberError('onScriptDownloaded', error);
        }

        return original.apply(this, arguments);
      };

      html.onScriptDownloaded.__blobioAnimationWrapped = true;
      html.onScriptDownloaded.__blobioAnimationOriginal = original;
      html.__blobioAnimationWrapped = true;
      state.wrappedCallback = true;
      state.wrapReason = reason || 'direct';
      return true;
    }

    function isCacheScript(node) {
      const src = node?.src || node?.getAttribute?.('src') || '';
      return node?.tagName === 'SCRIPT' && CACHE_SCRIPT_RE.test(src);
    }

    function handlePossibleCacheScript(node, reason) {
      if (!isCacheScript(node)) {
        return;
      }

      state.seenCacheScripts += 1;
      wrapHtmlCallback(reason);
      win.setTimeout?.(() => wrapHtmlCallback(`${reason}:retry`), 0);
    }

    function installSourceHooks() {
      const prototype = win.Node?.prototype;
      if (!prototype || prototype.__blobioAnimationSourceHooked) {
        return false;
      }

      const nativeAppendChild = prototype.appendChild;
      const nativeInsertBefore = prototype.insertBefore;

      if (typeof nativeAppendChild === 'function') {
        prototype.appendChild = function blobioAnimationAppendChild(node) {
          handlePossibleCacheScript(node, 'appendChild:before');
          return nativeAppendChild.apply(this, arguments);
        };
      }

      if (typeof nativeInsertBefore === 'function') {
        prototype.insertBefore = function blobioAnimationInsertBefore(node) {
          handlePossibleCacheScript(node, 'insertBefore:before');
          return nativeInsertBefore.apply(this, arguments);
        };
      }

      prototype.__blobioAnimationSourceHooked = true;
      state.sourceHookInstalled = true;
      return true;
    }

    function installCallbackPolling() {
      let attempts = 0;
      const timer = win.setInterval?.(() => {
        attempts += 1;

        if (wrapHtmlCallback('poll') || attempts > 400) {
          win.clearInterval?.(timer);
        }
      }, 25);
    }

    function rememberShaderTimeLocation(location) {
      if (!location) {
        return;
      }

      if (shaderLocations) {
        if (!shaderLocations.has(location)) {
          shaderLocations.add(location);
          state.shaderUniforms += 1;
        }
        return;
      }

      if (!shaderLocationList.includes(location)) {
        shaderLocationList.push(location);
        state.shaderUniforms += 1;
      }
    }

    function isShaderTimeLocation(location) {
      if (!location) {
        return false;
      }
      return shaderLocations ? shaderLocations.has(location) : shaderLocationList.includes(location);
    }

    function shaderTimeValue(incomingValue) {
      const now = nativeNow();
      const initialValue = Number(incomingValue);
      state.shaderWrites += 1;

      if (!shaderTimeActive) {
        shaderTimeActive = true;
        shaderRealAnchor = now;
        shaderUniformAnchor = Number.isFinite(initialValue) ? initialValue : 0;
        return incomingValue;
      }

      return shaderUniformAnchor + (now - shaderRealAnchor) / 500;
    }

    function patchWebGlConstructor(ContextCtor) {
      const prototype = ContextCtor?.prototype;
      if (!prototype || prototype.__blobioAnimationShaderHooked) {
        return false;
      }

      const nativeGetUniformLocation = prototype.getUniformLocation;
      const nativeUniform1f = prototype.uniform1f;
      if (typeof nativeGetUniformLocation !== 'function' || typeof nativeUniform1f !== 'function') {
        return false;
      }

      prototype.getUniformLocation = function blobAnimationGetUniformLocation(program, name) {
        const location = nativeGetUniformLocation.apply(this, arguments);
        if (name === 'u_time') {
          rememberShaderTimeLocation(location);
        }
        return location;
      };

      prototype.uniform1f = function blobAnimationUniform1f(location, value) {
        if (isShaderTimeLocation(location) && isUnsafeAnimationMode()) {
          return nativeUniform1f.call(this, location, shaderTimeValue(value));
        }
        return nativeUniform1f.apply(this, arguments);
      };

      prototype.__blobioAnimationShaderHooked = true;
      return true;
    }

    function patchWindow(targetWindow) {
      try {
        if (!targetWindow?.Date || targetWindow.Date.now?.__blobioAnimationPatched) {
          return true;
        }

        if (patchedWindows && patchedWindows.has(targetWindow)) {
          return true;
        }

        const patchedNow = function blobAnimationNow() {
          return Math.round(isUnsafeAnimationMode() ? virtualNow() : nativeNow());
        };
        patchedNow.__blobioAnimationPatched = true;
        patchedNow.__blobioAnimationNativeNow = nativeNow;
        targetWindow.Date.now = patchedNow;
        patchWebGlConstructor(targetWindow.WebGLRenderingContext);
        patchWebGlConstructor(targetWindow.WebGL2RenderingContext);
        patchedWindows?.add(targetWindow);
        state.patchedWindows += 1;
        return true;
      } catch (error) {
        state.lastError = error?.message || String(error);
        return false;
      }
    }

    function patchExistingFrames() {
      let count = 0;
      for (const frame of win.document?.querySelectorAll?.('iframe') || []) {
        if (patchFrame(frame)) {
          count += 1;
        }
      }
      return count;
    }

    function patchFrame(frame) {
      try {
        if (!frame?.contentWindow) {
          return false;
        }

        const patched = patchWindow(frame.contentWindow);
        if (patched) {
          state.patchedFrames += 1;
        }
        return patched;
      } catch (error) {
        state.lastError = error?.message || String(error);
        return false;
      }
    }

    function installAnimationSpeedFrameHooks() {
      const NodeCtor = win.Node;
      const prototype = NodeCtor?.prototype;
      if (!prototype || prototype.__blobioAnimationFrameHooksInstalled) {
        return false;
      }

      const nativeAppendChild = prototype.appendChild;
      const nativeInsertBefore = prototype.insertBefore;
      const patchSoon = (node) => {
        if (node?.tagName !== 'IFRAME') {
          return;
        }

        patchFrame(node);
        win.setTimeout?.(() => patchFrame(node), 0);
        win.setTimeout?.(() => patchFrame(node), 250);
      };

      if (typeof nativeAppendChild === 'function') {
        prototype.appendChild = function blobAnimationAppendChild(node) {
          const result = nativeAppendChild.apply(this, arguments);
          patchSoon(node);
          return result;
        };
      }

      if (typeof nativeInsertBefore === 'function') {
        prototype.insertBefore = function blobAnimationInsertBefore(node) {
          const result = nativeInsertBefore.apply(this, arguments);
          patchSoon(node);
          return result;
        };
      }

      if (win.document?.documentElement && typeof win.MutationObserver === 'function') {
        const observer = new win.MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes || []) {
              patchSoon(node);
            }
          }
        });
        observer.observe(win.document.documentElement, { childList: true, subtree: true });
      }

      prototype.__blobioAnimationFrameHooksInstalled = true;
      state.frameHookInstalled = true;
      return true;
    }

    win.__blobioAnimationNow = animationNow;
    win.__blobioAnimationDelta = scaleDelta;
    win.__blobioAnimationFpsDelta = fpsDelta;
    win.__blobioAnimationGameNow = gameNow;
    win.__blobioAnimationShaderDelta = shaderDelta;
    win.__blobioAnimationSpeedRefresh = setSettings;
    win.__blobioAnimationSpeedDebug = () => ({
      ...state,
      settings: { ...settings },
      realNow: nativeNow(),
      virtualNow: win.Date.now(),
    });
    win.blobSpeedDebug = win.__blobioAnimationSpeedDebug;
    win.blobSpeedSet = (nextSpeed) => {
      setSettings({ enabled: Number(nextSpeed) !== 1, speed: nextSpeed, mode: settings.mode });
      return win.__blobioAnimationSpeedDebug();
    };
    win.blobSpeedMode = (mode) => {
      setSettings({ ...settings, mode });
      return win.__blobioAnimationSpeedDebug();
    };

    installSourceHooks();
    installCallbackPolling();
    wrapHtmlCallback('direct');
    patchWindow(win);
    installAnimationSpeedFrameHooks();
    patchExistingFrames();
    win.setTimeout?.(patchExistingFrames, 0);
    win.setTimeout?.(patchExistingFrames, 250);
    win.__blobioAnimationSpeedInstalled = true;
    return true;
  }

  function pageGameBackgroundBootstrap(initialSettings, pageWindow) {
    'use strict';

    const win = pageWindow || globalThis;
    if (win.location?.hostname !== CUSTOM_CLIENT_HOST) {
      return false;
    }

    if (win.__blobioGameBackgroundInstalled) {
      win.__blobioGameBackgroundRefresh?.(initialSettings);
      return true;
    }

    const GAME_CANVAS_CLASS = 'blobio-background-game-canvas';
    const GAME_CANVAS_READY_CLASS = 'blobio-background-game-ready';
    let settings = normalizeSettings(initialSettings);
      const state = {
        installed: true,
        activeCanvases: 0,
        clearColorHits: 0,
        clearHits: 0,
        fillHits: 0,
        patchedWindows: 0,
        patchedFrames: 0,
        frameHookInstalled: false,
        lastError: '',
      };
    win.__blobioGameBackgroundState = state;

    function normalizeSettings(value = {}) {
      const source = value && typeof value === 'object' ? value : {};
      const gradient = source.gradient && typeof source.gradient === 'object' ? source.gradient : {};
      const solid = source.solid && typeof source.solid === 'object' ? source.solid : {};
      const from = gradient.from && typeof gradient.from === 'object' ? gradient.from : {};
      const to = gradient.to && typeof gradient.to === 'object' ? gradient.to : {};
      return {
        enabled: Boolean(source.enabled),
        mode: source.mode === 'gradient' ? 'gradient' : 'solid',
        solid: {
          color: normalizeColor(solid.color, '#222222'),
          alpha: normalizeAlpha(solid.alpha, 100),
        },
        gradient: {
          from: {
            color: normalizeColor(from.color, '#141824'),
            alpha: normalizeAlpha(from.alpha, 100),
          },
          to: {
            color: normalizeColor(to.color, '#007e69'),
            alpha: normalizeAlpha(to.alpha, 100),
          },
          angle: normalizeAngle(gradient.angle, 135),
        },
      };
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

    function refresh(nextSettings) {
      settings = normalizeSettings(nextSettings);
      updateKnownCanvases();
      return settings;
    }

    function patchCanvasGetContext(targetWindow = win) {
      const prototype = targetWindow.HTMLCanvasElement?.prototype;
      if (!prototype || prototype.__blobioBackgroundGetContextPatched) {
        return;
      }

      const nativeGetContext = prototype.getContext;
      prototype.getContext = function blobBackgroundGetContext(type, attributes) {
        let nextAttributes = attributes;
        const webGl = isWebGlContextType(type);
        if (webGl && settings.enabled && settings.mode === 'gradient') {
          nextAttributes = attributes && typeof attributes === 'object'
            ? { ...attributes, alpha: true }
            : { alpha: true };
        }

        const context = nativeGetContext.call(this, type, nextAttributes);
        if (context && webGl) {
          markPotentialGameCanvas(this);
        }
        return context;
      };
      prototype.__blobioBackgroundGetContextPatched = true;
    }

    function patchWebGlContext(ContextCtor) {
      const prototype = ContextCtor?.prototype;
      if (!prototype || prototype.__blobioBackgroundClearPatched) {
        return;
      }

      const nativeClear = prototype.clear;
      const nativeClearColor = prototype.clearColor;

      prototype.clearColor = function blobBackgroundClearColor(r, g, b, a) {
        if (shouldUseCustomWebGLBackground(this) && looksLikeThemeClearColor(r, g, b, a)) {
          const color = webGLClearColor();
          markActiveGameCanvas(this.canvas);
          state.clearColorHits += 1;
          return nativeClearColor.call(this, color.r, color.g, color.b, color.a);
        }

        return nativeClearColor.apply(this, arguments);
      };

      prototype.clear = function blobBackgroundClear(mask) {
        if (shouldUseCustomWebGLBackground(this) && clearsColorBuffer(this, mask) && isDefaultFramebuffer(this)) {
          const color = webGLClearColor();
          markActiveGameCanvas(this.canvas);
          state.clearHits += 1;
          nativeClearColor.call(this, color.r, color.g, color.b, color.a);
        }

        return nativeClear.apply(this, arguments);
      };

      prototype.__blobioBackgroundClearPatched = true;
    }

    function patchCanvas2d(targetWindow = win) {
      const prototype = targetWindow.CanvasRenderingContext2D?.prototype;
      if (!prototype || prototype.__blobioBackgroundFillPatched) {
        return;
      }

      const nativeFillRect = prototype.fillRect;
      prototype.fillRect = function blobBackgroundFillRect(x, y, width, height) {
        if (settings.enabled && isLikelyBackgroundFill(this, x, y, width, height)) {
          const previousFill = this.fillStyle;
          this.fillStyle = canvasFillStyle(this);
          state.fillHits += 1;
          try {
            return nativeFillRect.call(this, x, y, width, height);
          } finally {
            this.fillStyle = previousFill;
          }
        }

        return nativeFillRect.apply(this, arguments);
      };

      prototype.__blobioBackgroundFillPatched = true;
    }

    function isWebGlContextType(type) {
      const value = String(type || '').toLowerCase();
      return value === 'webgl'
        || value === 'webgl2'
        || value === 'experimental-webgl'
        || value === 'webkit-3d'
        || value === 'moz-webgl';
    }

    function shouldUseCustomWebGLBackground(gl) {
      return settings.enabled && gl && isLikelyGameCanvas(gl.canvas);
    }

    function clearsColorBuffer(gl, mask) {
      return typeof mask !== 'number' || (mask & gl.COLOR_BUFFER_BIT) !== 0;
    }

    function isDefaultFramebuffer(gl) {
      try {
        return typeof gl.getParameter !== 'function' || gl.getParameter(gl.FRAMEBUFFER_BINDING) === null;
      } catch {
        return true;
      }
    }

    function isLikelyGameCanvas(canvas) {
      if (!canvas || canvas.nodeType !== 1) {
        return false;
      }

      const width = canvas.width || canvas.clientWidth || 0;
      const height = canvas.height || canvas.clientHeight || 0;
      return width >= 300 && height >= 180;
    }

    function looksLikeThemeClearColor(r, g, b, a) {
      if (a < 0.98) {
        return false;
      }

      return nearlyEqualColor(r, g, b, 0, 0, 0)
        || nearlyEqualColor(r, g, b, 1, 1, 1)
        || nearlyEqualColor(r, g, b, 34 / 255, 34 / 255, 34 / 255);
    }

    function nearlyEqualColor(r, g, b, targetR, targetG, targetB) {
      const tolerance = 0.015;
      return Math.abs(r - targetR) <= tolerance
        && Math.abs(g - targetG) <= tolerance
        && Math.abs(b - targetB) <= tolerance;
    }

    function markPotentialGameCanvas(canvas) {
      if (!canvas?.classList || !isLikelyGameCanvas(canvas)) {
        return;
      }
      canvas.classList.add(GAME_CANVAS_CLASS);
    }

    function markActiveGameCanvas(canvas) {
      if (!canvas?.classList) {
        return;
      }

      markPotentialGameCanvas(canvas);
      canvas.classList.add(GAME_CANVAS_READY_CLASS);
      updateCanvasBackground(canvas);
    }

    function updateCanvasBackground(canvas) {
      if (!canvas?.classList) {
        return;
      }

      const active = settings.enabled && canvas.classList.contains(GAME_CANVAS_READY_CLASS);
      canvas.classList.toggle(GAME_CANVAS_CLASS, active);

      if (active && settings.mode === 'gradient') {
        canvas.style.setProperty('background', backgroundCss(), 'important');
      } else {
        canvas.style.removeProperty('background');
      }
    }

    function updateKnownCanvases() {
      let active = 0;
      for (const doc of getGameDocuments()) {
        for (const canvas of doc.querySelectorAll?.(`canvas.${GAME_CANVAS_CLASS}, canvas.${GAME_CANVAS_READY_CLASS}`) || []) {
          updateCanvasBackground(canvas);
          if (canvas.classList?.contains(GAME_CANVAS_READY_CLASS)) {
            active += 1;
          }
        }
      }
      state.activeCanvases = active;
    }

    function webGLClearColor() {
      if (settings.mode === 'gradient') {
        return { r: 0, g: 0, b: 0, a: 0 };
      }

      const color = hexToRgb(settings.solid.color);
      return {
        r: color.r / 255,
        g: color.g / 255,
        b: color.b / 255,
        a: settings.solid.alpha / 100,
      };
    }

    function isLikelyBackgroundFill(ctx, x, y, width, height) {
      const canvas = ctx?.canvas;
      return settings.enabled
        && canvas
        && looksLikeThemeFill(ctx.fillStyle)
        && (
          coversCanvas(x, y, width, height, canvas.width, canvas.height)
          || coversCanvas(x, y, width, height, canvas.clientWidth, canvas.clientHeight)
        );
    }

    function coversCanvas(x, y, width, height, canvasWidth, canvasHeight) {
      if (!canvasWidth || !canvasHeight) {
        return false;
      }
      return x <= 1 && y <= 1 && x + width >= canvasWidth - 1 && y + height >= canvasHeight - 1;
    }

    function looksLikeThemeFill(fillStyle) {
      const value = String(fillStyle || '').trim().toLowerCase().replace(/\s+/g, '');
      return value === 'black'
        || value === 'white'
        || value === '#000'
        || value === '#000000'
        || value === '#fff'
        || value === '#ffffff'
        || value === '#222'
        || value === '#222222'
        || value === 'rgb(0,0,0)'
        || value === 'rgb(255,255,255)'
        || value === 'rgb(34,34,34)'
        || value === 'rgba(0,0,0,1)'
        || value === 'rgba(255,255,255,1)'
        || value === 'rgba(34,34,34,1)';
    }

    function canvasFillStyle(ctx) {
      if (settings.mode !== 'gradient') {
        return rgbaCss(settings.solid.color, settings.solid.alpha);
      }

      const canvas = ctx.canvas;
      const angle = settings.gradient.angle * Math.PI / 180;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const length = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
      const offsetX = Math.cos(angle) * length / 2;
      const offsetY = Math.sin(angle) * length / 2;
      const gradient = ctx.createLinearGradient(
        centerX - offsetX,
        centerY - offsetY,
        centerX + offsetX,
        centerY + offsetY,
      );
      gradient.addColorStop(0, rgbaCss(settings.gradient.from.color, settings.gradient.from.alpha));
      gradient.addColorStop(1, rgbaCss(settings.gradient.to.color, settings.gradient.to.alpha));
      return gradient;
    }

    function backgroundCss() {
      if (settings.mode === 'gradient') {
        return `linear-gradient(${settings.gradient.angle}deg, ${rgbaCss(settings.gradient.from.color, settings.gradient.from.alpha)}, ${rgbaCss(settings.gradient.to.color, settings.gradient.to.alpha)})`;
      }
      return rgbaCss(settings.solid.color, settings.solid.alpha);
    }

    function rgbaCss(color, alpha) {
      const rgb = hexToRgb(color);
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha / 100})`;
    }

    function hexToRgb(color) {
      const value = normalizeColor(color, '#000000').slice(1);
      return {
        r: Number.parseInt(value.slice(0, 2), 16),
        g: Number.parseInt(value.slice(2, 4), 16),
        b: Number.parseInt(value.slice(4, 6), 16),
      };
    }

    win.__blobioGameBackgroundRefresh = refresh;
    win.__blobioGameBackgroundDebug = () => ({
      ...state,
      settings,
      canvases: getGameDocuments().flatMap((doc) => Array.from(doc.querySelectorAll?.('canvas') || []).map((canvas) => ({
        width: canvas.width || canvas.clientWidth || 0,
        height: canvas.height || canvas.clientHeight || 0,
        classes: String(canvas.className || ''),
        background: canvas.style?.background || '',
      }))),
    });

    function getGameDocuments() {
      const docs = [];
      if (win.document) {
        docs.push(win.document);
      }

      for (const frame of win.document?.querySelectorAll?.('iframe') || []) {
        try {
          if (frame.contentDocument) {
            docs.push(frame.contentDocument);
          }
        } catch {}
      }

      return docs;
    }

    function patchGameBackgroundWindow(targetWindow) {
      if (!targetWindow || targetWindow.__blobioGameBackgroundWindowPatched) {
        return false;
      }

      try {
        patchCanvasGetContext(targetWindow);
        patchWebGlContext(targetWindow.WebGLRenderingContext);
        patchWebGlContext(targetWindow.WebGL2RenderingContext);
        patchCanvas2d(targetWindow);
        targetWindow.__blobioGameBackgroundWindowPatched = true;
        state.patchedWindows += 1;
        return true;
      } catch (error) {
        state.lastError = error?.message || String(error);
        return false;
      }
    }

    function patchGameBackgroundFrame(frame) {
      try {
        if (!frame?.contentWindow) {
          return false;
        }

        const patched = patchGameBackgroundWindow(frame.contentWindow);
        if (patched) {
          state.patchedFrames += 1;
        }
        return patched;
      } catch (error) {
        state.lastError = error?.message || String(error);
        return false;
      }
    }

    function patchExistingGameBackgroundFrames() {
      let count = 0;
      for (const frame of win.document?.querySelectorAll?.('iframe') || []) {
        if (patchGameBackgroundFrame(frame)) {
          count += 1;
        }
      }
      return count;
    }

    function installGameBackgroundFrameHooks() {
      const NodeCtor = win.Node;
      const prototype = NodeCtor?.prototype;
      if (!prototype || prototype.__blobioBackgroundFrameHooksInstalled) {
        return false;
      }

      const nativeAppendChild = prototype.appendChild;
      const nativeInsertBefore = prototype.insertBefore;
      const patchSoon = (node) => {
        if (node?.tagName !== 'IFRAME') {
          return;
        }

        patchGameBackgroundFrame(node);
        win.setTimeout?.(() => patchGameBackgroundFrame(node), 0);
        win.setTimeout?.(() => patchGameBackgroundFrame(node), 250);
      };

      if (typeof nativeAppendChild === 'function') {
        prototype.appendChild = function blobBackgroundAppendChild(node) {
          const result = nativeAppendChild.apply(this, arguments);
          patchSoon(node);
          return result;
        };
      }

      if (typeof nativeInsertBefore === 'function') {
        prototype.insertBefore = function blobBackgroundInsertBefore(node) {
          const result = nativeInsertBefore.apply(this, arguments);
          patchSoon(node);
          return result;
        };
      }

      if (win.document?.documentElement && typeof win.MutationObserver === 'function') {
        const observer = new win.MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes || []) {
              patchSoon(node);
            }
          }
        });
        observer.observe(win.document.documentElement, { childList: true, subtree: true });
      }

      prototype.__blobioBackgroundFrameHooksInstalled = true;
      state.frameHookInstalled = true;
      return true;
    }

    try {
      patchGameBackgroundWindow(win);
      installGameBackgroundFrameHooks();
      patchExistingGameBackgroundFrames();
      win.setTimeout?.(patchExistingGameBackgroundFrames, 0);
      win.setTimeout?.(patchExistingGameBackgroundFrames, 250);
      win.__blobioGameBackgroundInstalled = true;
      return true;
    } catch (error) {
      state.lastError = error?.message || String(error);
      return false;
    }
  }

  function pageFpsUncapBootstrap(initialEnabled, pageWindow) {
    'use strict';

    const win = pageWindow || globalThis;
    const doc = win.document;

    if (win.__blobFpsUncapInstalled) {
      win.__blobioFpsUncapRefresh?.(initialEnabled);
      return;
    }

    const config = {
      enabled: Boolean(initialEnabled),
      mode: 'safe-uncapped',
      startupDelayMs: 5000,
      yieldEveryFrames: 120,
      preserveCameraZoom: true,
      cameraDeltaFloor: 0.003000000026077032,
      minCameraDeltaSeconds: 0.0001,
      keepVisible: true,
      log: false,
    };

    const state = {
      installed: false,
      callbacksScheduled: 0,
      callbacksRun: 0,
      nativeFramesScheduled: 0,
      pendingFrames: 0,
      uncappedFramesSinceYield: 0,
      currentFrameDeltaSeconds: 1 / 240,
      scheduler: 'message-channel',
      lastError: '',
    };

    win.__blobFpsUncap = config;
    win.__blobioFpsUncapState = state;

    function log(...args) {
      if (config.log && win.console) {
        win.console.info('[Blob FPS Uncap]', ...args);
      }
    }

    function now() {
      return win.performance?.now?.() ?? Date.now();
    }

    const native = {
      requestAnimationFrame: typeof win.requestAnimationFrame === 'function'
        ? win.requestAnimationFrame.bind(win)
        : (callback) => win.setTimeout(() => callback(now()), 16),
      cancelAnimationFrame: typeof win.cancelAnimationFrame === 'function'
        ? win.cancelAnimationFrame.bind(win)
        : win.clearTimeout.bind(win),
      setTimeout: win.setTimeout.bind(win),
      clearTimeout: win.clearTimeout.bind(win),
      addEventListener: win.EventTarget?.prototype?.addEventListener,
      mathMax: win.Math.max.bind(win.Math),
      mathAbs: win.Math.abs.bind(win.Math),
      hasFocus: typeof doc?.hasFocus === 'function' ? doc.hasFocus.bind(doc) : null,
    };

    const pendingFrames = new Map();
    const nativeFrames = new Set();
    const installedAt = now();
    let nextFrameId = 0x40000000;
    let uncappedFramesSinceYield = 0;
    let insideFrameCallback = false;
    let lastFrameTime = 0;
    let currentFrameDeltaSeconds = 1 / 240;
    let messageChannel = null;

    function isActive() {
      return config.enabled && config.mode !== 'native';
    }

    function beginFrame(timestamp) {
      const frameTime = typeof timestamp === 'number' ? timestamp : now();
      if (lastFrameTime > 0) {
        currentFrameDeltaSeconds = native.mathMax(
          (frameTime - lastFrameTime) / 1000,
          config.minCameraDeltaSeconds,
        );
      }
      lastFrameTime = frameTime;
      insideFrameCallback = true;
      state.currentFrameDeltaSeconds = currentFrameDeltaSeconds;
      return frameTime;
    }

    function endFrame() {
      insideFrameCallback = false;
    }

    function patchCameraDeltaFloor() {
      if (!config.preserveCameraZoom || win.Math.__blobFpsUncapMaxPatched) {
        return;
      }

      const originalMax = win.Math.max;
      const patchedMax = function blobFpsUncapMathMax(...values) {
        if (
          isActive()
          && insideFrameCallback
          && values.length === 2
          && typeof values[0] === 'number'
          && typeof values[1] === 'number'
          && values[0] >= 0
          && values[0] < config.cameraDeltaFloor
          && native.mathAbs(values[1] - config.cameraDeltaFloor) < 1e-12
        ) {
          return currentFrameDeltaSeconds;
        }

        return native.mathMax(...values);
      };

      patchedMax.__blobFpsUncapOriginal = originalMax;
      win.Math.max = patchedMax;
      win.Math.__blobFpsUncapMaxPatched = true;
    }

    function runFrame(id) {
      const frame = pendingFrames.get(id);
      if (!frame) {
        return;
      }

      pendingFrames.delete(id);
      state.pendingFrames = pendingFrames.size;

      if (!isActive()) {
        requestNativeFrame(frame.callback);
        return;
      }

      const timestamp = beginFrame(now());
      try {
        state.callbacksRun += 1;
        frame.callback(timestamp);
      } catch (error) {
        state.lastError = error?.message || String(error);
        throw error;
      } finally {
        endFrame();
      }
    }

    function requestUncappedFrame(callback) {
      const id = nextFrameId;
      nextFrameId = nextFrameId >= 0x7ffffffe ? 0x40000000 : nextFrameId + 1;
      const frame = { callback, timer: null };

      pendingFrames.set(id, frame);
      state.callbacksScheduled += 1;
      state.pendingFrames = pendingFrames.size;

      if (messageChannel) {
        messageChannel.port2.postMessage(id);
      } else {
        frame.timer = native.setTimeout(() => runFrame(id), 0);
      }

      return id;
    }

    function cancelUncappedFrame(id) {
      const frame = pendingFrames.get(id);
      if (!frame) {
        return false;
      }

      if (frame.timer !== null) {
        native.clearTimeout(frame.timer);
      }
      pendingFrames.delete(id);
      state.pendingFrames = pendingFrames.size;
      return true;
    }

    function requestNativeFrame(callback) {
      let id = 0;
      id = native.requestAnimationFrame((timestamp) => {
        nativeFrames.delete(id);
        uncappedFramesSinceYield = 0;
        state.uncappedFramesSinceYield = 0;

        const frameTime = beginFrame(timestamp);
        try {
          state.callbacksRun += 1;
          callback(frameTime);
        } catch (error) {
          state.lastError = error?.message || String(error);
          throw error;
        } finally {
          endFrame();
        }
      });
      nativeFrames.add(id);
      state.callbacksScheduled += 1;
      state.nativeFramesScheduled += 1;
      return id;
    }

    function shouldUseNativeFrame() {
      if (!isActive()) {
        return true;
      }
      if (config.mode !== 'safe-uncapped') {
        return false;
      }
      if (doc && doc.readyState !== 'complete') {
        return true;
      }
      if (now() - installedAt < config.startupDelayMs) {
        return true;
      }

      return config.yieldEveryFrames > 0
        && uncappedFramesSinceYield >= config.yieldEveryFrames;
    }

    function flushPendingFramesToNative() {
      if (pendingFrames.size === 0) {
        return;
      }

      const callbacks = [...pendingFrames.values()].map((frame) => frame.callback);
      for (const frame of pendingFrames.values()) {
        if (frame.timer !== null) {
          native.clearTimeout(frame.timer);
        }
      }
      pendingFrames.clear();
      state.pendingFrames = 0;

      for (const callback of callbacks) {
        requestNativeFrame(callback);
      }
    }

    function findDescriptor(target, key) {
      let current = target;
      while (current) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor) {
          return descriptor;
        }
        current = Object.getPrototypeOf(current);
      }
      return null;
    }

    function patchDocumentVisibility(key, visibleValue) {
      if (!doc) {
        return;
      }

      const descriptor = findDescriptor(doc, key);
      try {
        Object.defineProperty(doc, key, {
          configurable: true,
          enumerable: descriptor?.enumerable ?? true,
          get() {
            if (isActive() && config.keepVisible) {
              return visibleValue;
            }
            if (typeof descriptor?.get === 'function') {
              return descriptor.get.call(doc);
            }
            return descriptor?.value;
          },
        });
      } catch (error) {
        log('could not patch', key, error);
      }
    }

    function installVisibilityProtection() {
      if (!config.keepVisible || !doc) {
        return;
      }

      patchDocumentVisibility('hidden', false);
      patchDocumentVisibility('webkitHidden', false);
      patchDocumentVisibility('visibilityState', 'visible');
      patchDocumentVisibility('webkitVisibilityState', 'visible');

      if (native.hasFocus) {
        try {
          doc.hasFocus = function blobFpsUncapHasFocus() {
            return isActive() ? true : native.hasFocus();
          };
        } catch (error) {
          log('could not patch hasFocus', error);
        }
      }

      if (!native.addEventListener || !win.EventTarget) {
        return;
      }

      const blockedEvents = [
        'visibilitychange',
        'webkitvisibilitychange',
        'blur',
        'freeze',
      ];
      const stopPageThrottleEvent = (event) => {
        if (isActive()) {
          event.stopImmediatePropagation();
        }
      };

      for (const eventName of blockedEvents) {
        native.addEventListener.call(win, eventName, stopPageThrottleEvent, true);
        native.addEventListener.call(doc, eventName, stopPageThrottleEvent, true);
      }
    }

    patchCameraDeltaFloor();
    installVisibilityProtection();

    if (typeof win.MessageChannel === 'function') {
      messageChannel = new win.MessageChannel();
      messageChannel.port1.onmessage = (event) => runFrame(event.data);
      messageChannel.port1.start?.();
    } else {
      state.scheduler = 'timeout-fallback';
    }

    win.requestAnimationFrame = function blobFpsUncapRequestAnimationFrame(callback) {
      if (typeof callback !== 'function') {
        return 0;
      }

      if (shouldUseNativeFrame()) {
        return requestNativeFrame(callback);
      }

      uncappedFramesSinceYield += 1;
      state.uncappedFramesSinceYield = uncappedFramesSinceYield;
      return requestUncappedFrame(callback);
    };

    win.cancelAnimationFrame = function blobFpsUncapCancelAnimationFrame(id) {
      if (cancelUncappedFrame(id)) {
        return;
      }

      if (nativeFrames.delete(id)) {
        native.cancelAnimationFrame(id);
      }
    };

    win.webkitRequestAnimationFrame = win.requestAnimationFrame;
    win.mozRequestAnimationFrame = win.requestAnimationFrame;
    win.msRequestAnimationFrame = win.requestAnimationFrame;
    win.webkitCancelAnimationFrame = win.cancelAnimationFrame;
    win.mozCancelAnimationFrame = win.cancelAnimationFrame;
    win.msCancelAnimationFrame = win.cancelAnimationFrame;

    win.__blobFpsUncapInstalled = true;
    win.__blobioFpsUncapInstalled = true;
    state.installed = true;

    win.__blobioFpsUncapRefresh = (enabled) => {
      const nextEnabled = Boolean(enabled);
      if (config.enabled === nextEnabled) {
        return;
      }

      config.enabled = nextEnabled;
      state.lastError = '';

      if (!nextEnabled) {
        uncappedFramesSinceYield = 0;
        state.uncappedFramesSinceYield = 0;
        flushPendingFramesToNative();
      }
    };

    win.__blobioFpsUncapStatus = () => ({
      enabled: config.enabled,
      installed: state.installed,
      mode: config.mode,
      startupDelayMs: config.startupDelayMs,
      yieldEveryFrames: config.yieldEveryFrames,
      preserveCameraZoom: config.preserveCameraZoom,
      keepVisible: config.keepVisible,
      scheduler: state.scheduler,
      callbacksScheduled: state.callbacksScheduled,
      callbacksRun: state.callbacksRun,
      nativeFramesScheduled: state.nativeFramesScheduled,
      pendingFrames: state.pendingFrames,
      uncappedFramesSinceYield: state.uncappedFramesSinceYield,
      currentFrameDeltaSeconds: state.currentFrameDeltaSeconds,
      lastError: state.lastError,
    });

    log(
      'installed',
      `enabled=${config.enabled}`,
      `mode=${config.mode}`,
      `startupDelayMs=${config.startupDelayMs}`,
      `yieldEveryFrames=${config.yieldEveryFrames}`,
      `preserveCameraZoom=${config.preserveCameraZoom}`,
      `scheduler=${state.scheduler}`,
    );
  }

  /* VIRUS_RUNTIME_START */
  /* VIRUS_RUNTIME_END */

  /* VIRUS_PELLET_COLOR_RUNTIME_START */
  /* VIRUS_PELLET_COLOR_RUNTIME_END */

  /* JELLY_SHADER_RUNTIME_START */
  /* JELLY_SHADER_RUNTIME_END */

  /* HUD_INFO_RUNTIME_START */
  /* HUD_INFO_RUNTIME_END */

  /* EMOTE_SKIN_RUNTIME_START */
  /* EMOTE_SKIN_RUNTIME_END */

  /* CELL_MASS_RUNTIME_START */
  /* CELL_MASS_RUNTIME_END */

  /* FPS_SAVER_RUNTIME_START */
  /* FPS_SAVER_RUNTIME_END */

  function installFpsSaverRuntime() {
    const host = String(location.hostname || '').toLowerCase();
    if (host !== CUSTOM_CLIENT_HOST && host !== 'blobgame.io' && host !== 'www.blobgame.io') {
      return;
    }

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    try {
      pageFpsSaverBootstrap(readFpsSaverRuntimeSettings(), pageWindow);
    } catch (error) {
      logError('Failed to install FPS saver runtime.', error);
      return;
    }

    const refresh = () => {
      try {
        pageWindow.__blobioFpsSaverRefresh?.(readFpsSaverRuntimeSettings());
      } catch (error) {
        logError('Failed to refresh FPS saver runtime.', error);
      }
    };

    if (typeof GM_addValueChangeListener === 'function') {
      try {
        GM_addValueChangeListener(FPS_SAVER_SNAPSHOT_KEY, refresh);
      } catch {}
    }

    window.addEventListener?.('message', (event) => {
      const message = event.data;
      if (message?.source === STORAGE_BRIDGE_SOURCE && message.key === FPS_SAVER_SNAPSHOT_KEY) {
        refresh();
      }
    });
  }

  function getVirusResourceUrl(maskId) {
    const normalizedMaskId = Object.hasOwn(VIRUS_MOTHER_CELL_ASSET_URLS, maskId) ? maskId : 'halo';
    return VIRUS_MOTHER_CELL_ASSET_URLS[normalizedMaskId] || '';
  }

  function installEmoteSkinRuntime() {
    if (location.hostname !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    try {
      pageEmoteSkinBootstrap({
        assets: EMOTE_SKIN_ASSET_URLS,
        version: VERSION,
      }, pageWindow);
    } catch (error) {
      logError('Failed to install Emote Skin Display runtime.', error);
    }
  }

  function installVirusMotherCellRuntime() {
    if (location.hostname !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const pageWindow = typeof unsafeWindow === 'object' && unsafeWindow ? unsafeWindow : globalThis;
    const status = {
      version: VERSION,
      host: location.hostname,
      attempted: false,
      installed: false,
      enabled: false,
      enabledValue: null,
      maskId: null,
      reason: 'not-started',
      error: '',
    };
    pageWindow.__blobioVirusMotherCellLoaderStatus = status;

    const installDebugFallback = () => {
      if (typeof pageWindow.__blobVirusGlowDebug === 'function') {
        return;
      }
      pageWindow.__blobVirusGlowDebug = () => ({
        ...status,
        runtimeState: pageWindow.__blobVirusGlowState || null,
        runtimeSettings: pageWindow.__blobVirusGlowSettings || null,
      });
    };
    installDebugFallback();

    try {
      const runtimeSettings = readVirusMotherCellRuntimeSettings();
      status.enabledValue = runtimeSettings.enabled;
      status.enabled = runtimeSettings.enabled;
      status.storageSource = runtimeSettings.source;
      status.storageDiagnostics = runtimeSettings.diagnostics;
      if (!status.enabled) {
        status.reason = 'disabled';
        return;
      }

      const maskId = runtimeSettings.maskId;
      const color = runtimeSettings.color;
      const alpha = runtimeSettings.alpha;
      const maskUrl = getVirusResourceUrl(maskId);

      status.attempted = true;
      status.maskId = maskId;
      if (!maskUrl) {
        status.reason = 'mask-asset-missing';
        return;
      }

      status.installed = Boolean(pageVirusMotherCellBootstrap({
        enabled: true,
        maskId,
        maskUrl,
        color,
        alpha,
        rotate: runtimeSettings.rotate,
        version: VERSION,
      }, pageWindow));
      status.reason = status.installed ? 'installed' : 'bootstrap-returned-false';
    } catch (error) {
      status.reason = 'install-error';
      status.error = error?.message || String(error);
      logError('Failed to install Virus | Mother-cell runtime.', error);
    }
  }

  function installVirusPelletColorRuntime() {
    if (location.hostname !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const pageWindow = typeof unsafeWindow === 'object' && unsafeWindow ? unsafeWindow : globalThis;
    const status = {
      version: VERSION,
      host: location.hostname,
      attempted: false,
      installed: false,
      enabled: false,
      reason: 'not-started',
      error: '',
    };
    pageWindow.__blobioVirusPelletColorLoaderStatus = status;

    const installDebugFallback = () => {
      if (typeof pageWindow.blobCellColorsDebug === 'function') {
        return;
      }
      pageWindow.blobCellColorsDebug = () => ({
        ...status,
        runtimeState: pageWindow.__blobCellColorState || null,
      });
      pageWindow.__blobCellColorsDebug = pageWindow.blobCellColorsDebug;
    };
    installDebugFallback();

    try {
      const runtimeSettings = readVirusPelletColorRuntimeSettings();
      status.enabled = runtimeSettings.enabled;
      status.storageSource = runtimeSettings.source;
      status.storageDiagnostics = runtimeSettings.diagnostics;
      if (!status.enabled) {
        status.reason = 'disabled';
        return;
      }

      status.attempted = true;
      status.installed = Boolean(pageVirusPelletColorsBootstrap({
        enabled: true,
        virus: runtimeSettings.virus,
        pellets: runtimeSettings.pellets,
        version: VERSION,
      }, pageWindow));
      status.reason = status.installed ? 'installed' : 'bootstrap-returned-false';
    } catch (error) {
      status.reason = 'install-error';
      status.error = error?.message || String(error);
      logError('Failed to install Virus | Pellets Colors runtime.', error);
    }
  }

  function installAnimationSpeedRuntime() {
    if (location.hostname !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    try {
      pageAnimationSpeedBootstrap(readAnimationSpeedRuntimeSettings(), pageWindow);
    } catch (error) {
      logError('Failed to install animation speed runtime.', error);
      return;
    }

    const refresh = () => {
      try {
        pageWindow.__blobioAnimationSpeedRefresh?.(readAnimationSpeedRuntimeSettings());
      } catch (error) {
        logError('Failed to refresh animation speed runtime.', error);
      }
    };

    if (typeof GM_addValueChangeListener === 'function') {
      for (const key of Object.values(ANIMATION_SPEED_KEYS)) {
        try {
          GM_addValueChangeListener(key, refresh);
        } catch {}
      }
    }

    window.addEventListener?.('message', (event) => {
      const message = event.data;
      if (message?.source === STORAGE_BRIDGE_SOURCE && Object.values(ANIMATION_SPEED_KEYS).includes(message.key)) {
        refresh();
      }
    });
  }

  function installJellyShaderRuntime() {
    if (location.hostname !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const keys = Object.values(JELLY_SHADER_KEYS);

    try {
      pageJellyShaderBootstrap(readJellyShaderRuntimeSettings(), pageWindow);
    } catch (error) {
      logError('Failed to install Jelly-Physics Shader runtime.', error);
      return;
    }

    const refresh = () => {
      try {
        pageWindow.__blobioJellyShaderRefresh?.(readJellyShaderRuntimeSettings());
      } catch (error) {
        logError('Failed to refresh Jelly-Physics Shader runtime.', error);
      }
    };

    if (typeof GM_addValueChangeListener === 'function') {
      for (const key of keys) {
        try {
          GM_addValueChangeListener(key, refresh);
        } catch {}
      }
    }

    window.addEventListener?.('message', (event) => {
      const message = event.data;
      if (message?.source === STORAGE_BRIDGE_SOURCE && keys.includes(message.key)) {
        refresh();
      }
    });
  }

  function installHudInfoRuntime() {
    if (location.hostname !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const keys = Object.values(HUD_INFO_KEYS);

    try {
      pageHudInfoBootstrap(readHudInfoRuntimeSettings(), pageWindow);
    } catch (error) {
      logError('Failed to install HUD-Info runtime.', error);
      return;
    }

    const refresh = () => {
      try {
        pageWindow.__blobioHudInfoRefresh?.(readHudInfoRuntimeSettings());
      } catch (error) {
        logError('Failed to refresh HUD-Info runtime.', error);
      }
    };

    if (typeof GM_addValueChangeListener === 'function') {
      for (const key of keys) {
        try {
          GM_addValueChangeListener(key, refresh);
        } catch {}
      }
    }

    window.addEventListener?.('message', (event) => {
      const message = event.data;
      if (message?.source === STORAGE_BRIDGE_SOURCE && keys.includes(message.key)) {
        refresh();
      }
    });
  }

  function installCellMassRuntime() {
    if (location.hostname !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    try {
      pageCellMassBootstrap(readCellMassRuntimeSettings(), pageWindow);
    } catch (error) {
      logError('Failed to install Show mass runtime.', error);
      return;
    }

    const refresh = () => {
      try {
        pageWindow.__blobioCellMassRefresh?.(readCellMassRuntimeSettings());
      } catch (error) {
        logError('Failed to refresh Show mass runtime.', error);
      }
    };

    if (typeof GM_addValueChangeListener === 'function') {
      try {
        GM_addValueChangeListener(CELL_MASS_SNAPSHOT_KEY, refresh);
      } catch {}
    }

    window.addEventListener?.('message', (event) => {
      const message = event.data;
      if (message?.source === STORAGE_BRIDGE_SOURCE && message.key === CELL_MASS_SNAPSHOT_KEY) {
        refresh();
      }
    });
  }

  function installGameBackgroundRuntime() {
    if (location.hostname !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    try {
      pageGameBackgroundBootstrap(readGameBackgroundRuntimeSettings(), pageWindow);
    } catch (error) {
      logError('Failed to install game background runtime.', error);
      return;
    }

    const keys = Object.values(GAME_BACKGROUND_KEYS);
    const refresh = () => {
      try {
        pageWindow.__blobioGameBackgroundRefresh?.(readGameBackgroundRuntimeSettings());
      } catch (error) {
        logError('Failed to refresh game background runtime.', error);
      }
    };

    if (typeof GM_addValueChangeListener === 'function') {
      for (const key of keys) {
        try {
          GM_addValueChangeListener(key, refresh);
        } catch {}
      }
    }

    window.addEventListener?.('message', (event) => {
      const message = event.data;
      if (message?.source === STORAGE_BRIDGE_SOURCE && keys.includes(message.key)) {
        refresh();
      }
    });
  }

  function installFpsUncapRuntime() {
    if (location.hostname !== CUSTOM_CLIENT_HOST) {
      return;
    }

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const readEnabled = () => getSharedValue(FPS_UNCAP_STORAGE_KEY) === '1';

    try {
      pageFpsUncapBootstrap(readEnabled(), pageWindow);
    } catch (error) {
      logError('Failed to install FPS-uncap runtime.', error);
      return;
    }

    const refresh = () => {
      try {
        pageWindow.__blobioFpsUncapRefresh?.(readEnabled());
      } catch (error) {
        logError('Failed to refresh FPS-uncap state.', error);
      }
    };

    if (typeof GM_addValueChangeListener === 'function') {
      try {
        GM_addValueChangeListener(FPS_UNCAP_STORAGE_KEY, refresh);
      } catch {}
    }

    window.addEventListener?.('message', (event) => {
      const message = event.data;
      if (message?.source === STORAGE_BRIDGE_SOURCE && message.key === FPS_UNCAP_STORAGE_KEY) {
        refresh();
      }
    });
  }

  function runBundle(source) {
    try {
      const run = new Function(`${source}\n//# sourceURL=blobio-extension.bundle.js`);
      run();
    } catch (error) {
      logError('Failed to run extension bundle.', error);
    }
  }

  function fetchBundle(index = 0, failures = []) {
    if (typeof GM_xmlhttpRequest !== 'function') {
      logError('GM_xmlhttpRequest is unavailable. Check the userscript grants.');
      return;
    }

    const url = BUNDLE_URLS[index];
    if (!url) {
      logError('Failed to fetch extension bundle from all configured URLs.', failures);
      return;
    }

    GM_xmlhttpRequest({
      method: 'GET',
      url,
      timeout: 15000,
      onload(response) {
        if (response.status < 200 || response.status >= 300 || !response.responseText) {
          fetchBundle(index + 1, failures.concat(`Invalid response from ${url}`));
          return;
        }
        runBundle(response.responseText);
      },
      onerror(error) {
        fetchBundle(index + 1, failures.concat(error || `Network error from ${url}`));
      },
      ontimeout() {
        fetchBundle(index + 1, failures.concat(`Timed out while fetching ${url}`));
      },
    });
  }

  installExtensionInputKeyboardIsolation();
  installEarlyKeyboardRuntime();
  installSharedStorageBridge();
  installFpsSaverRuntime();
  installEmoteSkinRuntime();
  installVirusMotherCellRuntime();
  installVirusPelletColorRuntime();
  installJellyShaderRuntime();
  installHudInfoRuntime();
  installCellMassRuntime();
  installAnimationSpeedRuntime();
  installGameBackgroundRuntime();
  installFpsUncapRuntime();
  fetchBundle();
})();
