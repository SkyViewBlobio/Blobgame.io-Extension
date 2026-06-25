import { CHAT_SETTINGS_CSS, CHAT_SETTINGS_STYLE_ID } from '../css/ChatSettingsStyles.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';
import {
  ANIMATION_SPEED_LIMITS,
  ANIMATION_SPEED_MODE_INFO,
  ANIMATION_SPEED_MODES,
  getAnimationSpeedSetting,
  getChatFontSize,
  isChatFontSizeEnabled,
  setAnimationSpeedSetting,
  setChatFontSize,
  setChatFontSizeEnabled,
} from '../settings/RuntimeSettings.js';
import {
  HUD_INFO_BOOSTER_COLOR_MODES,
  HUD_INFO_DATA_MODES,
  HUD_INFO_LAYOUT_MODES,
  HUD_INFO_POSITION_MODES,
  HUD_INFO_STYLE_MODES,
  hudInfoModeLabel,
  nextHudInfoMode,
  normalizeHudInfoSettings,
  readHudInfoSettings,
  saveHudInfoSettings,
} from '../settings/HudInfoSettings.js';
import {
  CAPTCHA_LOGO_HIDDEN_KEY,
  CHAT_BACKGROUND_KEYS,
  CHAT_OUTLINE_KEYS,
  IN_GAME_UI_DEFAULTS,
  LEADERBOARD_BACKGROUND_KEYS,
  LEADERBOARD_OUTLINE_KEYS,
  SMOOTH_CHAT_KEY,
  getBooleanSetting,
  getColorSetting,
  getLeaderboardFontSetting,
  readInGameUiSettings,
  setBooleanSetting,
  setColorSetting,
  setLeaderboardFontSetting,
} from '../settings/InGameUiSettings.js';
import {
  createAnimationSpeedCategory,
  createCaptchaCategory,
  createCategoryButton,
  createChatCategory,
  createHotkeyCategory,
  createHudInfoCategory,
  createLeaderboardCategory,
  createMutedPlayersCategory,
} from './chatSettings/ChatSettingsCategoryViews.js';

const CHAT_GAP = 10;
const TOGGLE_WIDTH = 30;
const MAIN_PANEL_WIDTH = 250;
const CATEGORY_PANEL_WIDTH = 330;
const ENABLED_NOTICE = "To mute a person thats logged in, right click on their name in chat, or on their cells/LB name";
const HOTKEY_CLEAR_HOLD_MS = 3000;
const HUD_COLOR_COMMIT_DELAY_MS = 180;

export class ChatSettingsFeature {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    mutedPlayersStore = null,
    hotkeyStore = null,
    uiCustomization = null,
    logger = console,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.mutedPlayersStore = mutedPlayersStore;
    this.hotkeyStore = hotkeyStore;
    this.uiCustomization = uiCustomization;
    this.logger = logger;
    this.styleNode = null;
    this.root = null;
    this.notificationHost = null;
    this.chatWrapper = null;
    this.pageObserver = null;
    this.resizeObserver = null;
    this.viewportHandler = null;
    this.outsidePointerHandler = null;
    this.positionFrame = null;
    this.unsubscribeMutedPlayers = null;
    this.unsubscribeHotkeys = null;
    this.selectedMutedUids = new Set();
    this.editingUid = '';
    this.editingNameDraft = '';
    this.notificationTimer = null;
    this.notificationRemoveTimer = null;
    this.selectedHotkeyId = '';
    this.hotkeyCapture = null;
    this.hotkeyKeydownHandler = null;
    this.hotkeyKeyupHandler = null;
    this.hotkeyMousedownHandler = null;
    this.hotkeyContextMenuHandler = null;
    this.suppressHotkeyContextMenu = false;
    this.suppressHotkeyBindClickUntil = 0;
    this.keyboardShield = null;
    this.hudColorDraft = null;
    this.hudColorPreviewFrame = null;
    this.hudColorPreviewSettings = null;
    this.hudColorCommitTimer = null;
    this.started = false;
  }

  start() {
    if (this.started || !this.document?.documentElement) {
      return Boolean(this.started);
    }

    this.started = true;
    this.ensureStyle();
    this.ensureUi();
    this.unsubscribeMutedPlayers = this.mutedPlayersStore?.subscribe?.(() => this.syncMutedPlayersUi()) || null;
    this.unsubscribeHotkeys = this.hotkeyStore?.subscribe?.(() => this.syncHotkeyUi()) || null;
    this.applyChatFontSize();
    this.applyAnimationSpeed();
    this.applyHudInfo();
    this.watchPage();
    return true;
  }

  ensureStyle() {
    const existing = this.document.getElementById?.(CHAT_SETTINGS_STYLE_ID);
    if (existing) {
      this.styleNode = existing;
      return;
    }

    const style = this.document.createElement('style');
    style.id = CHAT_SETTINGS_STYLE_ID;
    style.textContent = CHAT_SETTINGS_CSS;
    (this.document.head || this.document.documentElement).appendChild(style);
    this.styleNode = style;
  }

  ensureUi() {
    if (this.root?.parentNode) {
      this.ensureHotkeyLauncher();
      this.ensureAnimationSpeedLauncher();
      this.ensureHudInfoLauncher();
      this.syncChatWrapper();
      this.positionUi();
      return;
    }

    const root = this.document.createElement('div');
    root.classList.add('blobio-chat-settings-root');

    const toggle = this.document.createElement('button');
    toggle.type = 'button';
    toggle.classList.add('blobio-chat-settings-toggle');
    toggle.setAttribute('aria-label', 'Open chat settings');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '+';

    const panel = this.document.createElement('div');
    panel.classList.add('blobio-chat-settings-panel');

    const chatButton = createCategoryButton(this.document, 'Chat-Settings', 'chat');
    const mutedButton = createCategoryButton(this.document, 'Muted-Players', 'muted');
    const hotkeyButton = createCategoryButton(this.document, 'HotKey', 'hotkey');
    const animationButton = createCategoryButton(this.document, 'Anim-Speed', 'animation');
    const hudButton = createCategoryButton(this.document, 'HUD-Info', 'hud-info');
    const captchaButton = createCategoryButton(this.document, 'Captcha-Logo', 'captcha');
    const leaderboardButton = createCategoryButton(this.document, 'Leaderboard-Settings', 'leaderboard');
    panel.append(chatButton, mutedButton, hotkeyButton, animationButton, hudButton, captchaButton, leaderboardButton);

    const chatCategory = createChatCategory(this.document);
    const mutedCategory = createMutedPlayersCategory(this.document);
    const hotkeyCategory = createHotkeyCategory(this.document);
    const animationCategory = createAnimationSpeedCategory(this.document);
    const hudCategory = createHudInfoCategory(this.document);
    const captchaCategory = createCaptchaCategory(this.document);
    const leaderboardCategory = createLeaderboardCategory(this.document);
    root.append(
      toggle,
      panel,
      chatCategory,
      mutedCategory,
      hotkeyCategory,
      animationCategory,
      hudCategory,
      captchaCategory,
      leaderboardCategory,
    );
    this.installKeyboardShield(root);
    (this.document.body || this.document.documentElement).appendChild(root);

    const notificationHost = this.document.createElement('div');
    notificationHost.classList.add('blobio-chat-notification-host');
    notificationHost.setAttribute('aria-live', 'polite');
    (this.document.body || this.document.documentElement).appendChild(notificationHost);

    toggle.addEventListener('click', () => {
      this.setOpen(!root.classList.contains('is-open'));
    });

    this.bindCategoryButton(chatButton);
    this.bindCategoryButton(mutedButton);
    this.bindCategoryButton(hotkeyButton);
    this.bindCategoryButton(animationButton);
    this.bindCategoryButton(hudButton);
    this.bindCategoryButton(captchaButton);
    this.bindCategoryButton(leaderboardButton);

    this.bindChatCategory(chatCategory);
    this.bindCaptchaCategory(captchaCategory);
    this.bindAnimationSpeedCategory(animationCategory);
    this.bindHudInfoCategory(hudCategory);
    this.bindLeaderboardCategory(leaderboardCategory);

    const muteToggle = mutedCategory.querySelector('.blobio-muted-players-toggle');
    const mutedList = mutedCategory.querySelector('.blobio-muted-players-list');
    const addNameButton = mutedCategory.querySelector('.blobio-muted-player-add-name');
    const unmuteButton = mutedCategory.querySelector('.blobio-muted-player-unmute');

    muteToggle.addEventListener('click', () => {
      const enabled = this.mutedPlayersStore?.setEnabled?.(!this.mutedPlayersStore.isEnabled());
      if (enabled) {
        this.showNotification(ENABLED_NOTICE, 'success');
      }
    });

    mutedList.addEventListener('click', (event) => {
      if (event.target?.closest?.('.blobio-muted-player-name-input')) {
        return;
      }

      const chip = event.target?.closest?.('.blobio-muted-player-chip');
      const uid = chip?.dataset?.uid;
      if (!uid) {
        return;
      }

      this.finishNameEdit();
      if (this.selectedMutedUids.has(uid)) {
        this.selectedMutedUids.delete(uid);
      } else {
        this.selectedMutedUids.add(uid);
      }
      this.syncMutedPlayersUi();
    });

    addNameButton.addEventListener('click', () => this.beginNameEdit());
    unmuteButton.addEventListener('click', () => {
      this.finishNameEdit();
      if (this.selectedMutedUids.size === 0) {
        return;
      }

      this.mutedPlayersStore?.remove?.(Array.from(this.selectedMutedUids));
      this.selectedMutedUids.clear();
      this.editingUid = '';
      this.editingNameDraft = '';
      this.syncMutedPlayersUi();
    });

    const hotkeyInput = hotkeyCategory.querySelector('.blobio-hotkey-text-input');
    const hotkeyApply = hotkeyCategory.querySelector('.blobio-hotkey-apply');
    const hotkeyList = hotkeyCategory.querySelector('.blobio-hotkey-list');
    const hotkeyRemove = hotkeyCategory.querySelector('.blobio-hotkey-remove');

    hotkeyInput.addEventListener('focus', () => {
      hotkeyInput.placeholder = '';
    });
    hotkeyInput.addEventListener('blur', () => {
      if (!hotkeyInput.value) {
        hotkeyInput.placeholder = 'Write command here...';
      }
    });
    hotkeyInput.addEventListener('input', () => this.syncHotkeyDraftUi());
    hotkeyInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.isComposing) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.applyHotkeyText();
    });
    hotkeyApply.addEventListener('click', () => this.applyHotkeyText());
    hotkeyList.addEventListener('click', (event) => {
      const bindButton = event.target?.closest?.('.blobio-hotkey-bind');
      if (bindButton && Date.now() <= this.suppressHotkeyBindClickUntil) {
        this.suppressHotkeyBindClickUntil = 0;
        event.preventDefault?.();
        event.stopPropagation?.();
        return;
      }

      if (bindButton?.dataset?.id && bindButton.dataset.kind) {
        this.beginHotkeyCapture(bindButton.dataset.id, bindButton.dataset.kind);
        return;
      }

      const load = event.target?.closest?.('.blobio-hotkey-load');
      const id = load?.dataset?.id;
      if (!id) {
        return;
      }

      this.cancelHotkeyCapture();
      this.selectedHotkeyId = this.selectedHotkeyId === id ? '' : id;
      this.syncHotkeyUi();
    });
    hotkeyRemove.addEventListener('click', () => {
      if (!this.selectedHotkeyId) {
        return;
      }

      this.cancelHotkeyCapture();
      this.hotkeyStore?.remove?.(this.selectedHotkeyId);
      this.selectedHotkeyId = '';
      this.syncHotkeyUi();
    });

    this.installHotkeyCaptureListeners();

    this.root = root;
    this.notificationHost = notificationHost;
    this.ensureHotkeyLauncher();
    this.ensureAnimationSpeedLauncher();
    this.syncControls();
    this.syncMutedPlayersUi();
    this.syncHotkeyUi();
    this.syncVisualSettingsUi();
    this.syncChatWrapper();
    this.positionUi();

    const win = this.document.defaultView || globalThis;
    this.viewportHandler = () => this.schedulePositionUi();
    win.addEventListener?.('resize', this.viewportHandler);
    win.addEventListener?.('scroll', this.viewportHandler, true);

    this.outsidePointerHandler = (event) => {
      if (!this.root?.classList.contains('is-open')) {
        return;
      }

      if (event.__blobioHotkeyCaptured || this.hotkeyCapture?.kind === 'mouse') {
        return;
      }

      const path = event.composedPath?.();
      const inside = Array.isArray(path)
        ? path.includes(this.root)
        : this.root.contains?.(event.target);

      if (!inside) {
        this.finishNameEdit();
        this.setOpen(false);
      }
    };
    this.document.addEventListener?.('pointerdown', this.outsidePointerHandler, true);
  }

  installKeyboardShield(root) {
    if (!root || this.keyboardShield) {
      return;
    }

    const shouldRelease = (event) => (
      !root.classList.contains('is-open')
      && !this.hotkeyCapture
      && !this.isProtectedTextInput(event.target)
    );
    const release = (event) => {
      if (event.key === 'Enter' || event.key === ' ' || event.code === 'Space') {
        event.preventDefault?.();
      }
      this.releaseFocusToGame();
    };
    const stop = (event) => {
      if (shouldRelease(event)) {
        release(event);
        return;
      }
      event.stopPropagation?.();
    };
    const keydown = (event) => {
      if (shouldRelease(event)) {
        release(event);
        return;
      }
      if (this.isProtectedTextInput(event.target) && (event.key === 'Backspace' || event.key === 'Delete')) {
        this.deleteTextAtSelection(event.target, event.key);
        event.preventDefault?.();
      }
      event.stopPropagation?.();
    };

    root.addEventListener('keydown', keydown);
    root.addEventListener('keypress', stop);
    root.addEventListener('keyup', stop);
    this.keyboardShield = { root, keydown, keypress: stop, keyup: stop };
  }

  isProtectedTextInput(element) {
    if (!element || element.disabled || element.readOnly) {
      return false;
    }

    return element.classList?.contains('blobio-hotkey-text-input')
      || element.classList?.contains('blobio-muted-player-name-input');
  }

  deleteTextAtSelection(input, key) {
    const value = String(input?.value ?? '');
    let start = Number.isInteger(input?.selectionStart) ? input.selectionStart : value.length;
    let end = Number.isInteger(input?.selectionEnd) ? input.selectionEnd : start;

    start = Math.max(0, Math.min(value.length, start));
    end = Math.max(start, Math.min(value.length, end));

    if (start === end) {
      if (key === 'Backspace' && start > 0) {
        start -= 1;
      } else if (key === 'Delete' && end < value.length) {
        end += 1;
      } else {
        return false;
      }
    }

    input.value = `${value.slice(0, start)}${value.slice(end)}`;
    input.setSelectionRange?.(start, start);

    const win = this.document.defaultView || globalThis;
    const EventCtor = win.Event || globalThis.Event;
    const event = EventCtor
      ? new EventCtor('input', { bubbles: true })
      : { type: 'input', bubbles: true };
    input.dispatchEvent?.(event);
    return true;
  }

  bindCategoryButton(button) {
    if (!button || button.dataset.blobioCategoryBound === '1') {
      return button;
    }

    button.dataset.blobioCategoryBound = '1';
    button.addEventListener('click', () => this.toggleCategory(button.dataset.category));
    return button;
  }

  ensureHotkeyLauncher() {
    const panel = this.root?.querySelector?.('.blobio-chat-settings-panel');
    if (!panel) {
      return null;
    }

    let button = Array.from(panel.querySelectorAll?.('.blobio-chat-settings-category-button') || [])
      .find((item) => item.dataset.category === 'hotkey');
    if (!button) {
      button = createCategoryButton(this.document, 'HotKey', 'hotkey');
      panel.appendChild(button);
    }

    this.bindCategoryButton(button);
    return button;
  }

  ensureAnimationSpeedLauncher() {
    const panel = this.root?.querySelector?.('.blobio-chat-settings-panel');
    if (!panel) {
      return null;
    }

    let button = Array.from(panel.querySelectorAll?.('.blobio-chat-settings-category-button') || [])
      .find((item) => item.dataset.category === 'animation');
    if (!button) {
      button = createCategoryButton(this.document, 'Anim-Speed', 'animation');
      const hotkey = panel.querySelector('.blobio-chat-settings-category-button[data-category="hotkey"]');
      panel.insertBefore(button, hotkey?.nextSibling || null);
    }

    this.bindCategoryButton(button);
    return button;
  }

  ensureHudInfoLauncher() {
    const panel = this.root?.querySelector?.('.blobio-chat-settings-panel');
    if (!panel) {
      return null;
    }

    let button = Array.from(panel.querySelectorAll?.('.blobio-chat-settings-category-button') || [])
      .find((item) => item.dataset.category === 'hud-info');
    if (!button) {
      button = createCategoryButton(this.document, 'HUD-Info', 'hud-info');
      const animation = panel.querySelector('.blobio-chat-settings-category-button[data-category="animation"]');
      panel.insertBefore(button, animation?.nextSibling || null);
    }

    this.bindCategoryButton(button);
    return button;
  }

  bindChatCategory(category) {
    const font = category.querySelector('[data-setting="chat"]');
    const fontToggle = font.querySelector('.blobio-setting-toggle');
    const range = font.querySelector('.blobio-chat-font-range');
    const number = font.querySelector('.blobio-chat-font-number');

    fontToggle.addEventListener('click', () => {
      setChatFontSizeEnabled(this.storage, !isChatFontSizeEnabled(this.storage));
      this.syncVisualSettingsUi();
      this.applyRuntimeUi();
    });

    const updateSize = (value) => {
      const size = setChatFontSize(this.storage, value);
      range.value = String(size);
      number.value = String(size);
      this.applyRuntimeUi();
    };
    range.addEventListener('input', () => updateSize(range.value));
    number.addEventListener('input', () => updateSize(number.value));
    number.addEventListener('change', () => updateSize(number.value));

    this.bindColorSetting(category, 'chat-background', CHAT_BACKGROUND_KEYS, IN_GAME_UI_DEFAULTS.chatBackground);
    this.bindColorSetting(category, 'chat-outline', CHAT_OUTLINE_KEYS, IN_GAME_UI_DEFAULTS.chatOutline);

    const smooth = category.querySelector('[data-setting="smooth-chat"] .blobio-setting-toggle');
    smooth.addEventListener('click', () => {
      setBooleanSetting(this.storage, SMOOTH_CHAT_KEY, !getBooleanSetting(this.storage, SMOOTH_CHAT_KEY, true));
      this.syncVisualSettingsUi();
      this.applyRuntimeUi();
    });
  }

  bindCaptchaCategory(category) {
    const toggle = category.querySelector('[data-setting="captcha-logo"] .blobio-setting-toggle');
    toggle.addEventListener('click', () => {
      setBooleanSetting(
        this.storage,
        CAPTCHA_LOGO_HIDDEN_KEY,
        !getBooleanSetting(this.storage, CAPTCHA_LOGO_HIDDEN_KEY, true),
      );
      this.syncVisualSettingsUi();
      this.applyRuntimeUi();
    });
  }

  bindLeaderboardCategory(category) {
    const font = category.querySelector('[data-setting="leaderboard"]');
    const fontToggle = font.querySelector('.blobio-setting-toggle');
    const range = font.querySelector('.blobio-chat-font-range');
    const number = font.querySelector('.blobio-chat-font-number');

    fontToggle.addEventListener('click', () => {
      const current = getLeaderboardFontSetting(this.storage);
      setLeaderboardFontSetting(this.storage, { enabled: !current.enabled });
      this.syncVisualSettingsUi();
      this.applyRuntimeUi();
    });

    const updateSize = (value) => {
      const setting = setLeaderboardFontSetting(this.storage, { value });
      range.value = String(setting.value);
      number.value = String(setting.value);
      this.applyRuntimeUi();
    };
    range.addEventListener('input', () => updateSize(range.value));
    number.addEventListener('input', () => updateSize(number.value));
    number.addEventListener('change', () => updateSize(number.value));

    this.bindColorSetting(
      category,
      'leaderboard-background',
      LEADERBOARD_BACKGROUND_KEYS,
      IN_GAME_UI_DEFAULTS.leaderboardBackground,
    );
    this.bindColorSetting(
      category,
      'leaderboard-outline',
      LEADERBOARD_OUTLINE_KEYS,
      IN_GAME_UI_DEFAULTS.leaderboardOutline,
    );
  }

  bindAnimationSpeedCategory(category) {
    const group = category.querySelector('[data-setting="animation-speed"]');
    const toggle = group.querySelector('.blobio-setting-toggle');
    const modeButton = group.querySelector('.blobio-animation-speed-mode');
    const slider = group.querySelector('.blobio-animation-speed-range');
    const reset = group.querySelector('.blobio-animation-speed-reset');

    toggle.addEventListener('click', () => {
      const current = getAnimationSpeedSetting(this.storage);
      setAnimationSpeedSetting(this.storage, { enabled: !current.enabled });
      this.syncVisualSettingsUi();
      this.applyAnimationSpeed();
    });

    modeButton.addEventListener('click', () => {
      const current = getAnimationSpeedSetting(this.storage);
      const mode = current.mode === ANIMATION_SPEED_MODES.friendly
        ? ANIMATION_SPEED_MODES.unsafe
        : ANIMATION_SPEED_MODES.friendly;
      setAnimationSpeedSetting(this.storage, { mode });
      this.syncVisualSettingsUi();
      this.applyAnimationSpeed();
    });

    slider.addEventListener('input', () => {
      setAnimationSpeedSetting(this.storage, { slider: slider.value });
      this.syncVisualSettingsUi();
      this.applyAnimationSpeed();
    });

    reset.addEventListener('click', () => {
      setAnimationSpeedSetting(this.storage, { slider: ANIMATION_SPEED_LIMITS.defaultValue });
      this.syncVisualSettingsUi();
      this.applyAnimationSpeed();
    });
  }

  bindHudInfoCategory(category) {
    const booleanBindings = [
      ['hud-info-enabled', 'enabled'],
      ['hud-info-fps', 'showFps'],
      ['hud-info-score', 'showScore'],
      ['hud-info-cells', 'showCells'],
      ['hud-info-ping', 'showPing'],
      ['hud-info-boosters', 'showBoosters'],
      ['hud-booster-last-sec-flash', 'boosterLastSecFlash'],
    ];

    for (const [settingName, key] of booleanBindings) {
      const toggle = category.querySelector(`[data-setting="${settingName}"] .blobio-setting-toggle`);
      toggle?.addEventListener('click', () => {
        this.commitHudColorDraft();
        const current = readHudInfoSettings(this.storage);
        saveHudInfoSettings(this.storage, { ...current, [key]: !current[key] });
        this.syncVisualSettingsUi();
        this.applyHudInfo();
      });
    }

    this.bindHudModeButton(category, 'hud-position', 'positionMode', HUD_INFO_POSITION_MODES);
    this.bindHudModeButton(category, 'hud-layout', 'layoutMode', HUD_INFO_LAYOUT_MODES);
    this.bindHudModeButton(category, 'hud-style', 'styleMode', HUD_INFO_STYLE_MODES);
    this.bindHudModeButton(category, 'hud-fps-mode', 'fpsMode', HUD_INFO_DATA_MODES);
    this.bindHudModeButton(category, 'hud-score-mode', 'scoreMode', HUD_INFO_DATA_MODES);
    this.bindHudModeButton(category, 'hud-ping-mode', 'pingMode', HUD_INFO_DATA_MODES);
    this.bindHudModeButton(category, 'hud-booster-name-mode', 'boosterNameMode', HUD_INFO_BOOSTER_COLOR_MODES);
    this.bindHudModeButton(category, 'hud-booster-duration-mode', 'boosterDurationMode', HUD_INFO_BOOSTER_COLOR_MODES);

    const sizeGroup = category.querySelector('[data-setting="hud-font-size"]');
    const range = sizeGroup.querySelector('.blobio-chat-font-range');
    const number = sizeGroup.querySelector('.blobio-chat-font-number');
    const updateSize = (value) => {
      this.commitHudColorDraft();
      const current = readHudInfoSettings(this.storage);
      const next = saveHudInfoSettings(this.storage, { ...current, fontSize: value });
      range.value = String(next.fontSize);
      number.value = String(next.fontSize);
      this.applyHudInfo();
    };
    range.addEventListener('input', () => updateSize(range.value));
    number.addEventListener('input', () => updateSize(number.value));
    number.addEventListener('change', () => updateSize(number.value));

    const colorGroup = category.querySelector('[data-setting="hud-color"]');
    const color = colorGroup.querySelector('.blobio-ui-color-input');
    const alpha = colorGroup.querySelector('.blobio-ui-alpha-range');
    color.addEventListener('input', () => {
      this.updateHudColorDraft({ color: color.value });
    });
    alpha.addEventListener('input', () => {
      this.updateHudColorDraft({ alpha: alpha.value });
    });
    color.addEventListener('change', () => this.commitHudColorDraft());
    alpha.addEventListener('change', () => this.commitHudColorDraft());
  }

  bindHudModeButton(category, settingName, key, options) {
    const button = category.querySelector(`[data-setting="${settingName}"] .blobio-hud-mode-button`);
    button?.addEventListener('click', () => {
      this.commitHudColorDraft();
      const current = readHudInfoSettings(this.storage);
      const value = nextHudInfoMode(current[key], options);
      saveHudInfoSettings(this.storage, { ...current, [key]: value });
      this.syncVisualSettingsUi();
      this.applyHudInfo();
    });
  }

  bindColorSetting(category, name, keys, defaults) {
    const group = category.querySelector(`[data-setting="${name}"]`);
    const toggle = group.querySelector('.blobio-setting-toggle');
    const color = group.querySelector('.blobio-ui-color-input');
    const alpha = group.querySelector('.blobio-ui-alpha-range');

    toggle.addEventListener('click', () => {
      const current = getColorSetting(this.storage, keys, defaults);
      setColorSetting(this.storage, keys, { enabled: !current.enabled }, defaults);
      this.syncVisualSettingsUi();
      this.applyRuntimeUi();
    });
    color.addEventListener('input', () => {
      setColorSetting(this.storage, keys, { color: color.value }, defaults);
      this.syncVisualSettingsUi();
      this.applyRuntimeUi();
    });
    alpha.addEventListener('input', () => {
      setColorSetting(this.storage, keys, { alpha: alpha.value }, defaults);
      this.syncVisualSettingsUi();
      this.applyRuntimeUi();
    });
  }

  applyRuntimeUi() {
    this.applyChatFontSize();
    this.applyAnimationSpeed();
    this.applyHudInfo();
    this.uiCustomization?.applyAll?.();
  }

  applyAnimationSpeed() {
    const win = this.document.defaultView || globalThis;
    const setting = getAnimationSpeedSetting(this.storage);
    win.__blobioAnimationSpeedRefresh?.({
      enabled: setting.enabled,
      speed: setting.enabled ? setting.speed : 1,
      mode: setting.mode,
    });
  }

  applyHudInfo(settings = readHudInfoSettings(this.storage)) {
    const win = this.document.defaultView || globalThis;
    win.__blobioHudInfoRefresh?.(settings);
  }

  updateHudColorDraft(changes) {
    this.hudColorDraft = normalizeHudInfoSettings({
      ...(this.hudColorDraft || readHudInfoSettings(this.storage)),
      ...changes,
    });
    this.syncHudColorControls(this.hudColorDraft);
    this.scheduleHudColorPreview(this.hudColorDraft);
    this.scheduleHudColorCommit();
  }

  scheduleHudColorPreview(settings) {
    const win = this.document.defaultView || globalThis;
    this.hudColorPreviewSettings = settings;
    if (this.hudColorPreviewFrame !== null) {
      return;
    }

    const run = () => {
      this.hudColorPreviewFrame = null;
      const next = this.hudColorPreviewSettings;
      this.hudColorPreviewSettings = null;
      if (next) {
        this.applyHudInfo(next);
      }
    };
    const raf = win.requestAnimationFrame || ((callback) => win.setTimeout?.(callback, 16));
    this.hudColorPreviewFrame = typeof raf === 'function' ? raf(run) : null;
    if (this.hudColorPreviewFrame === null || this.hudColorPreviewFrame === undefined) {
      run();
    }
  }

  scheduleHudColorCommit() {
    const win = this.document.defaultView || globalThis;
    if (this.hudColorCommitTimer !== null) {
      win.clearTimeout?.(this.hudColorCommitTimer);
      this.hudColorCommitTimer = null;
    }

    if (typeof win.setTimeout !== 'function') {
      this.commitHudColorDraft();
      return;
    }

    this.hudColorCommitTimer = win.setTimeout(() => {
      this.hudColorCommitTimer = null;
      this.commitHudColorDraft();
    }, HUD_COLOR_COMMIT_DELAY_MS);
  }

  commitHudColorDraft() {
    if (!this.hudColorDraft) {
      return null;
    }

    this.clearHudColorCommitTimer();
    const next = saveHudInfoSettings(this.storage, this.hudColorDraft);
    this.hudColorDraft = null;
    this.syncHudInfoSetting(next);
    this.applyHudInfo(next);
    return next;
  }

  clearHudColorCommitTimer() {
    if (this.hudColorCommitTimer === null) {
      return;
    }
    const win = this.document.defaultView || globalThis;
    win.clearTimeout?.(this.hudColorCommitTimer);
    this.hudColorCommitTimer = null;
  }

  clearHudColorPreviewFrame() {
    if (this.hudColorPreviewFrame === null) {
      return;
    }
    const win = this.document.defaultView || globalThis;
    win.cancelAnimationFrame?.(this.hudColorPreviewFrame);
    this.hudColorPreviewFrame = null;
    this.hudColorPreviewSettings = null;
  }

  setOpen(open) {
    if (!this.root) {
      return;
    }

    if (open) {
      this.ensureHotkeyLauncher();
      this.ensureAnimationSpeedLauncher();
      this.ensureHudInfoLauncher();
    }

    const toggle = this.root.querySelector('.blobio-chat-settings-toggle');
    if (open) {
      this.root.classList.add('is-open');
    } else {
      this.root.classList.remove('is-open');
      this.finishNameEdit();
      this.cancelHotkeyCapture();
      this.syncHotkeyUi();
      for (const category of this.root.querySelectorAll('.blobio-chat-settings-category')) {
        category.classList.remove('is-open');
      }
      for (const button of this.root.querySelectorAll('.blobio-chat-settings-category-button')) {
        button.setAttribute('aria-expanded', 'false');
      }
      this.releaseFocusToGame();
    }

    toggle.textContent = open ? '-' : '+';
    toggle.setAttribute('aria-label', open ? 'Close chat settings' : 'Open chat settings');
    toggle.setAttribute('aria-expanded', String(open));
    this.positionUi();
  }

  releaseFocusToGame() {
    const active = this.document.activeElement;
    if (active && this.root?.contains?.(active)) {
      active.blur?.();
    }

    if (this.document.activeElement && this.root?.contains?.(this.document.activeElement)) {
      return;
    }

    const canvas = this.document.querySelector?.('canvas');
    if (canvas && typeof canvas.focus === 'function') {
      if (!canvas.hasAttribute?.('tabindex')) {
        canvas.tabIndex = -1;
      }
      canvas.focus({ preventScroll: true });
      return;
    }

    (this.document.body || this.document.documentElement)?.focus?.({ preventScroll: true });
  }

  toggleCategory(categoryName) {
    if (!this.root) {
      return;
    }

    const category = this.root.querySelector(`.blobio-chat-settings-category[data-category="${categoryName}"]`);
    const shouldOpen = !category?.classList.contains('is-open');
    this.finishNameEdit();
    this.cancelHotkeyCapture();
    this.syncHotkeyUi();

    for (const item of this.root.querySelectorAll('.blobio-chat-settings-category')) {
      item.classList.toggle('is-open', shouldOpen && item === category);
    }
    for (const button of this.root.querySelectorAll('.blobio-chat-settings-category-button')) {
      button.setAttribute('aria-expanded', String(shouldOpen && button.dataset.category === categoryName));
    }
    this.positionUi();
  }

  syncControls() {
    this.syncVisualSettingsUi();
  }

  syncVisualSettingsUi() {
    if (!this.root) {
      return;
    }

    const settings = readInGameUiSettings(this.storage);
    this.syncFontSetting('chat', {
      enabled: isChatFontSizeEnabled(this.storage),
      value: getChatFontSize(this.storage),
    });
    this.syncFontSetting('leaderboard', settings.leaderboardFont);
    this.syncColorSetting('chat-background', settings.chatBackground);
    this.syncColorSetting('chat-outline', settings.chatOutline);
    this.syncColorSetting('leaderboard-background', settings.leaderboardBackground);
    this.syncColorSetting('leaderboard-outline', settings.leaderboardOutline);
    this.syncAnimationSpeedSetting(getAnimationSpeedSetting(this.storage));
    this.syncHudInfoSetting(readHudInfoSettings(this.storage));
    this.syncBooleanSetting('smooth-chat', settings.smoothChat);
    this.syncBooleanSetting('captcha-logo', settings.hideCaptchaLogo);

    const chatActive = isChatFontSizeEnabled(this.storage)
      || settings.chatBackground.enabled
      || settings.chatOutline.enabled
      || settings.smoothChat;
    const leaderboardActive = settings.leaderboardFont.enabled
      || settings.leaderboardBackground.enabled
      || settings.leaderboardOutline.enabled;

    this.root.querySelector('.blobio-chat-settings-category-button[data-category="chat"]')
      ?.classList.toggle('has-active-setting', chatActive);
    this.root.querySelector('.blobio-chat-settings-category-button[data-category="captcha"]')
      ?.classList.toggle('has-active-setting', settings.hideCaptchaLogo);
    this.root.querySelector('.blobio-chat-settings-category-button[data-category="leaderboard"]')
      ?.classList.toggle('has-active-setting', leaderboardActive);
    this.root.querySelector('.blobio-chat-settings-category-button[data-category="animation"]')
      ?.classList.toggle('has-active-setting', getAnimationSpeedSetting(this.storage).enabled);
    this.root.querySelector('.blobio-chat-settings-category-button[data-category="hud-info"]')
      ?.classList.toggle('has-active-setting', readHudInfoSettings(this.storage).enabled);
  }

  syncAnimationSpeedSetting(setting) {
    const group = this.root?.querySelector('[data-setting="animation-speed"]');
    if (!group) {
      return;
    }

    const toggle = group.querySelector('.blobio-setting-toggle');
    const modeButton = group.querySelector('.blobio-animation-speed-mode');
    const slider = group.querySelector('.blobio-animation-speed-range');
    const value = group.querySelector('.blobio-animation-speed-value');
    const modeInfo = ANIMATION_SPEED_MODE_INFO[setting.mode] || ANIMATION_SPEED_MODE_INFO[ANIMATION_SPEED_MODES.friendly];

    toggle.textContent = setting.enabled ? 'true' : 'false';
    toggle.classList.toggle('is-enabled', setting.enabled);
    modeButton.textContent = modeInfo.label;
    modeButton.title = modeInfo.description;
    modeButton.dataset.mode = setting.mode;
    slider.value = String(setting.slider);
    value.textContent = `${setting.speed.toFixed(1)}x`;
    group.classList.toggle('is-disabled', !setting.enabled);
  }

  syncHudInfoSetting(setting) {
    this.syncBooleanSetting('hud-info-enabled', setting.enabled);
    this.syncBooleanSetting('hud-info-fps', setting.showFps);
    this.syncBooleanSetting('hud-info-score', setting.showScore);
    this.syncBooleanSetting('hud-info-cells', setting.showCells);
    this.syncBooleanSetting('hud-info-ping', setting.showPing);
    this.syncBooleanSetting('hud-info-boosters', setting.showBoosters);
    this.syncBooleanSetting('hud-booster-last-sec-flash', setting.boosterLastSecFlash);
    this.syncHudModeSetting('hud-position', setting.positionMode, HUD_INFO_POSITION_MODES);
    this.syncHudModeSetting('hud-layout', setting.layoutMode, HUD_INFO_LAYOUT_MODES);
    this.syncHudModeSetting('hud-style', setting.styleMode, HUD_INFO_STYLE_MODES);
    this.syncHudModeSetting('hud-fps-mode', setting.fpsMode, HUD_INFO_DATA_MODES);
    this.syncHudModeSetting('hud-score-mode', setting.scoreMode, HUD_INFO_DATA_MODES);
    this.syncHudModeSetting('hud-ping-mode', setting.pingMode, HUD_INFO_DATA_MODES);
    this.syncHudModeSetting('hud-booster-name-mode', setting.boosterNameMode, HUD_INFO_BOOSTER_COLOR_MODES);
    this.syncHudModeSetting('hud-booster-duration-mode', setting.boosterDurationMode, HUD_INFO_BOOSTER_COLOR_MODES);

    const flashGroup = this.root?.querySelector('[data-setting="hud-booster-last-sec-flash"]');
    flashGroup?.classList.toggle('is-hidden', setting.boosterDurationMode !== 'simple');

    const sizeGroup = this.root?.querySelector('[data-setting="hud-font-size"]');
    const range = sizeGroup?.querySelector('.blobio-chat-font-range');
    const number = sizeGroup?.querySelector('.blobio-chat-font-number');
    if (range) {
      range.value = String(setting.fontSize);
    }
    if (number) {
      number.value = String(setting.fontSize);
    }

    this.syncHudColorControls(setting);

    const category = this.root?.querySelector('.blobio-chat-settings-category[data-category="hud-info"]');
    category?.classList.toggle('is-disabled', !setting.enabled);
  }

  syncHudColorControls(setting) {
    const colorGroup = this.root?.querySelector('[data-setting="hud-color"]');
    const color = colorGroup?.querySelector('.blobio-ui-color-input');
    const swatch = colorGroup?.querySelector('.blobio-ui-color-swatch');
    const alpha = colorGroup?.querySelector('.blobio-ui-alpha-range');
    const alphaValue = colorGroup?.querySelector('.blobio-ui-alpha-value');
    if (color) {
      color.value = setting.color;
    }
    if (swatch) {
      swatch.style.backgroundColor = setting.color;
    }
    if (alpha) {
      alpha.value = String(setting.alpha);
    }
    if (alphaValue) {
      alphaValue.textContent = `${Math.round(setting.alpha * 100)}%`;
    }
  }

  syncHudModeSetting(name, value, options) {
    const button = this.root?.querySelector(`[data-setting="${name}"] .blobio-hud-mode-button`);
    if (!button) {
      return;
    }
    button.textContent = hudInfoModeLabel(value, options);
    button.dataset.mode = value;
    button.classList.toggle('is-advanced', value === 'advanced');
    button.classList.toggle('is-dev', value === 'dev');
  }

  syncFontSetting(name, setting) {
    const group = this.root?.querySelector(`[data-setting="${name}"]`);
    if (!group) {
      return;
    }
    const toggle = group.querySelector('.blobio-setting-toggle');
    const range = group.querySelector('.blobio-chat-font-range');
    const number = group.querySelector('.blobio-chat-font-number');
    toggle.textContent = setting.enabled ? 'true' : 'false';
    toggle.classList.toggle('is-enabled', setting.enabled);
    range.value = String(setting.value);
    range.disabled = !setting.enabled;
    number.value = String(setting.value);
    number.disabled = !setting.enabled;
  }

  syncBooleanSetting(name, enabled) {
    const toggle = this.root?.querySelector(`[data-setting="${name}"] .blobio-setting-toggle`);
    if (!toggle) {
      return;
    }
    toggle.textContent = enabled ? 'true' : 'false';
    toggle.classList.toggle('is-enabled', enabled);
  }

  syncColorSetting(name, setting) {
    const group = this.root?.querySelector(`[data-setting="${name}"]`);
    if (!group) {
      return;
    }
    const toggle = group.querySelector('.blobio-setting-toggle');
    const color = group.querySelector('.blobio-ui-color-input');
    const swatch = group.querySelector('.blobio-ui-color-swatch');
    const alpha = group.querySelector('.blobio-ui-alpha-range');
    const alphaValue = group.querySelector('.blobio-ui-alpha-value');

    toggle.textContent = setting.enabled ? 'true' : 'false';
    toggle.classList.toggle('is-enabled', setting.enabled);
    color.value = setting.color;
    swatch.style.backgroundColor = setting.color;
    alpha.value = String(setting.alpha);
    alphaValue.textContent = `${Math.round(setting.alpha * 100)}%`;
    group.classList.toggle('is-disabled', !setting.enabled);
  }


  syncMutedPlayersUi() {
    if (!this.root || !this.mutedPlayersStore) {
      return;
    }

    const players = this.mutedPlayersStore.getPlayers();
    const availableUids = new Set(players.map((player) => player.uid));
    for (const uid of this.selectedMutedUids) {
      if (!availableUids.has(uid)) {
        this.selectedMutedUids.delete(uid);
      }
    }
    if (this.editingUid && !availableUids.has(this.editingUid)) {
      this.editingUid = '';
      this.editingNameDraft = '';
    }

    const enabled = this.mutedPlayersStore.isEnabled();
    const toggle = this.root.querySelector('.blobio-muted-players-toggle');
    const categoryButton = this.root.querySelector('.blobio-chat-settings-category-button[data-category="muted"]');
    const list = this.root.querySelector('.blobio-muted-players-list');
    const actions = this.root.querySelector('.blobio-muted-players-actions');
    const addName = this.root.querySelector('.blobio-muted-player-add-name');

    toggle.textContent = enabled ? 'true' : 'false';
    toggle.classList.toggle('is-enabled', enabled);
    categoryButton.classList.toggle('has-active-setting', enabled || players.length > 0);

    list.textContent = '';
    if (players.length === 0) {
      const empty = this.document.createElement('div');
      empty.classList.add('blobio-muted-players-empty');
      empty.textContent = 'No muted player UIDs.';
      list.appendChild(empty);
    } else {
      for (const player of players) {
        list.appendChild(this.createMutedPlayerChip(player));
      }
    }

    actions.classList.toggle('is-visible', this.selectedMutedUids.size > 0);
    addName.disabled = this.selectedMutedUids.size !== 1;
    addName.setAttribute('aria-disabled', String(addName.disabled));
  }

  createMutedPlayerChip(player) {
    const chip = this.document.createElement('div');
    chip.setAttribute('role', 'button');
    chip.tabIndex = 0;
    chip.classList.add('blobio-muted-player-chip');
    chip.dataset.uid = player.uid;
    chip.classList.toggle('is-selected', this.selectedMutedUids.has(player.uid));
    chip.addEventListener('keydown', (event) => {
      if (event.target?.closest?.('.blobio-muted-player-name-input')) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        chip.click();
      }
    });

    if (this.editingUid === player.uid) {
      const input = this.document.createElement('input');
      input.type = 'text';
      input.classList.add('blobio-muted-player-name-input');
      input.value = this.editingNameDraft;
      input.maxLength = 40;
      input.placeholder = 'Player name';
      input.setAttribute('aria-label', `Saved name for UID ${player.uid}`);
      input.addEventListener('input', () => {
        this.editingNameDraft = input.value;
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          this.finishNameEdit();
        }
      });
      input.addEventListener('blur', () => {
        const win = this.document.defaultView || globalThis;
        win.setTimeout?.(() => this.finishNameEdit(), 0);
      });
      chip.appendChild(input);
    } else if (player.name) {
      const name = this.document.createElement('span');
      name.classList.add('blobio-muted-player-name');
      name.textContent = player.name;
      chip.appendChild(name);
    }

    const uid = this.document.createElement('span');
    uid.classList.add('blobio-muted-player-uid');
    uid.textContent = `UID: ${player.uid}`;
    chip.appendChild(uid);
    return chip;
  }

  syncHotkeyDraftUi() {
    const input = this.root?.querySelector('.blobio-hotkey-text-input');
    const apply = this.root?.querySelector('.blobio-hotkey-apply');
    if (!input || !apply) {
      return;
    }

    apply.classList.toggle('is-visible', Boolean(String(input.value || '').trim()));
  }

  syncHotkeyUi() {
    if (!this.root || !this.hotkeyStore) {
      return;
    }

    const entries = this.hotkeyStore.getHotkeys();
    if (this.selectedHotkeyId && !entries.some((entry) => entry.id === this.selectedHotkeyId)) {
      this.selectedHotkeyId = '';
    }
    if (this.hotkeyCapture && !entries.some((entry) => entry.id === this.hotkeyCapture.id)) {
      this.cancelHotkeyCapture();
    }

    const list = this.root.querySelector('.blobio-hotkey-list');
    const remove = this.root.querySelector('.blobio-hotkey-remove');
    const categoryButton = this.root.querySelector('.blobio-chat-settings-category-button[data-category="hotkey"]');
    list.textContent = '';

    if (entries.length === 0) {
      const empty = this.document.createElement('div');
      empty.classList.add('blobio-hotkey-empty');
      empty.textContent = 'No hotkey loads saved.';
      list.appendChild(empty);
    } else {
      for (const entry of entries) {
        list.appendChild(this.createHotkeyRow(entry));
      }
    }

    remove.classList.toggle('is-visible', Boolean(this.selectedHotkeyId));
    categoryButton.classList.toggle('has-active-setting', entries.length > 0);
    this.syncHotkeyDraftUi();
  }

  createHotkeyRow(entry) {
    const row = this.document.createElement('div');
    row.classList.add('blobio-hotkey-row');
    row.dataset.id = entry.id;

    const load = this.document.createElement('button');
    load.type = 'button';
    load.classList.add('blobio-hotkey-load');
    load.dataset.id = entry.id;
    load.textContent = entry.text;
    load.title = entry.text;
    load.classList.toggle('is-selected', this.selectedHotkeyId === entry.id);

    const key = this.createHotkeyBindButton(entry, 'key', this.keyLabel(entry.keyCode));
    const mouse = this.createHotkeyBindButton(entry, 'mouse', this.mouseLabel(entry.mouseButton));
    row.append(load, key, mouse);
    return row;
  }

  createHotkeyBindButton(entry, kind, label) {
    const button = this.document.createElement('button');
    button.type = 'button';
    button.classList.add('blobio-hotkey-bind', `is-${kind}`);
    button.dataset.id = entry.id;
    button.dataset.kind = kind;

    const listening = this.hotkeyCapture?.id === entry.id && this.hotkeyCapture.kind === kind;
    button.classList.toggle('is-listening', listening);
    button.textContent = listening ? '...' : label;
    button.title = listening
      ? `Press a ${kind === 'key' ? 'key' : 'mouse button'}; hold Space for 3 seconds to clear`
      : kind === 'key'
        ? (entry.keyCode || 'Set keyboard hotkey')
        : (entry.mouseButton === null ? 'Set mouse hotkey' : this.mouseName(entry.mouseButton));
    return button;
  }

  applyHotkeyText() {
    const input = this.root?.querySelector('.blobio-hotkey-text-input');
    const entry = this.hotkeyStore?.add?.(input?.value);
    if (!entry || !input) {
      return;
    }

    input.value = '';
    this.selectedHotkeyId = '';
    this.syncHotkeyUi();
    input.focus?.();
  }

  beginHotkeyCapture(id, kind) {
    if (!this.hotkeyStore?.getById?.(id) || (kind !== 'key' && kind !== 'mouse')) {
      return;
    }

    this.cancelHotkeyCapture();
    if (kind === 'key') {
      this.hotkeyStore.setKey(id, '');
    } else {
      this.hotkeyStore.setMouse(id, null);
    }

    this.hotkeyCapture = {
      id,
      kind,
      spaceTimer: null,
      spaceDown: false,
      cleared: false,
    };
    this.syncHotkeyUi();
  }

  installHotkeyCaptureListeners() {
    if (this.hotkeyKeydownHandler) {
      return;
    }

    this.hotkeyKeydownHandler = (event) => this.handleHotkeyCaptureKeydown(event);
    this.hotkeyKeyupHandler = (event) => this.handleHotkeyCaptureKeyup(event);
    this.hotkeyMousedownHandler = (event) => this.handleHotkeyCaptureMousedown(event);
    this.hotkeyContextMenuHandler = (event) => {
      if (this.hotkeyCapture?.kind === 'mouse' || this.suppressHotkeyContextMenu) {
        event.preventDefault?.();
        event.stopPropagation?.();
        this.suppressHotkeyContextMenu = false;
      }
    };

    this.document.addEventListener?.('keydown', this.hotkeyKeydownHandler, true);
    this.document.addEventListener?.('keyup', this.hotkeyKeyupHandler, true);
    this.document.addEventListener?.('mousedown', this.hotkeyMousedownHandler, true);
    this.document.addEventListener?.('contextmenu', this.hotkeyContextMenuHandler, true);
  }

  handleHotkeyCaptureKeydown(event) {
    const capture = this.hotkeyCapture;
    if (!capture) {
      return;
    }

    event.preventDefault?.();
    event.stopPropagation?.();

    if (event.code === 'Space') {
      if (capture.spaceDown || event.repeat) {
        return;
      }

      capture.spaceDown = true;
      const win = this.document.defaultView || globalThis;
      capture.spaceTimer = win.setTimeout?.(() => {
        if (this.hotkeyCapture !== capture || !capture.spaceDown) {
          return;
        }

        capture.cleared = true;
        this.cancelHotkeyCapture();
        this.syncHotkeyUi();
      }, HOTKEY_CLEAR_HOLD_MS);
      return;
    }

    if (capture.kind === 'key' && event.code) {
      this.hotkeyStore.setKey(capture.id, event.code);
      this.cancelHotkeyCapture();
      this.syncHotkeyUi();
    }
  }

  handleHotkeyCaptureKeyup(event) {
    const capture = this.hotkeyCapture;
    if (!capture || event.code !== 'Space' || !capture.spaceDown) {
      return;
    }

    event.preventDefault?.();
    event.stopPropagation?.();
    this.clearHotkeySpaceTimer(capture);
    capture.spaceDown = false;

    if (capture.kind === 'key' && !capture.cleared) {
      this.hotkeyStore.setKey(capture.id, 'Space');
      this.cancelHotkeyCapture();
      this.syncHotkeyUi();
    }
  }

  handleHotkeyCaptureMousedown(event) {
    const capture = this.hotkeyCapture;
    if (!capture || capture.kind !== 'mouse') {
      return;
    }

    if (![0, 1, 2].includes(Number(event.button))) {
      return;
    }

    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    event.stopPropagation?.();
    event.__blobioHotkeyCaptured = true;
    if (event.target?.closest?.('.blobio-hotkey-bind')) {
      this.suppressHotkeyBindClickUntil = Date.now() + 300;
    }
    this.suppressHotkeyContextMenu = Number(event.button) === 2;
    this.hotkeyStore.setMouse(capture.id, Number(event.button));
    this.cancelHotkeyCapture();
    this.syncHotkeyUi();
  }

  clearHotkeySpaceTimer(capture = this.hotkeyCapture) {
    if (!capture?.spaceTimer) {
      return;
    }

    const win = this.document.defaultView || globalThis;
    win.clearTimeout?.(capture.spaceTimer);
    capture.spaceTimer = null;
  }

  cancelHotkeyCapture() {
    if (!this.hotkeyCapture) {
      return;
    }

    this.clearHotkeySpaceTimer(this.hotkeyCapture);
    this.hotkeyCapture = null;
  }

  keyLabel(code) {
    if (!code) return 'K';
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad\d$/.test(code)) return `N${code.slice(6)}`;

    const labels = {
      Space: 'SPC', Enter: 'ENT', Escape: 'ESC', Tab: 'TAB', Backspace: 'BSP',
      ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
      ShiftLeft: 'LS', ShiftRight: 'RS', ControlLeft: 'LC', ControlRight: 'RC',
      AltLeft: 'LA', AltRight: 'RA', CapsLock: 'CAP', Delete: 'DEL', Insert: 'INS',
      Home: 'HOM', End: 'END', PageUp: 'PG↑', PageDown: 'PG↓',
    };
    return labels[code] || code.replace(/^(Numpad|Intl)/, '').slice(0, 4).toUpperCase();
  }

  mouseLabel(button) {
    return button === 0 ? 'L' : button === 1 ? 'M' : button === 2 ? 'R' : 'M';
  }

  mouseName(button) {
    return button === 0 ? 'Left mouse button' : button === 1 ? 'Wheel press' : 'Right mouse button';
  }

  beginNameEdit() {
    if (this.selectedMutedUids.size !== 1) {
      return;
    }

    this.editingUid = this.selectedMutedUids.values().next().value;
    this.editingNameDraft = this.mutedPlayersStore.getPlayers()
      .find((player) => player.uid === this.editingUid)?.name || '';
    this.syncMutedPlayersUi();

    const win = this.document.defaultView || globalThis;
    win.setTimeout?.(() => {
      const input = this.root?.querySelector('.blobio-muted-player-name-input');
      input?.focus?.();
      input?.select?.();
    }, 0);
  }

  finishNameEdit() {
    if (!this.editingUid) {
      return;
    }

    const uid = this.editingUid;
    const input = this.root?.querySelector(`.blobio-muted-player-chip[data-uid="${uid}"] .blobio-muted-player-name-input`);
    const value = input?.value ?? this.editingNameDraft;
    this.editingUid = '';
    this.editingNameDraft = '';
    const saved = this.mutedPlayersStore?.setName?.(uid, value);
    if (!saved) {
      this.syncMutedPlayersUi();
    }
  }

  showNotification(message, type = 'success') {
    if (!this.notificationHost) {
      return;
    }

    this.clearNotificationTimers();
    this.notificationHost.textContent = '';

    const notification = this.document.createElement('div');
    notification.classList.add('blobio-chat-notification', `is-${type}`);
    notification.textContent = message;
    this.notificationHost.appendChild(notification);
    this.positionNotifications();

    const win = this.document.defaultView || globalThis;
    const visibleMs = type === 'error' ? 2200 : 5000;
    this.notificationTimer = win.setTimeout?.(() => {
      notification.classList.add('is-leaving');
      this.notificationRemoveTimer = win.setTimeout?.(() => notification.remove(), 450);
    }, visibleMs);
  }

  showMutedPlayerNotification(uid) {
    const safeUid = String(uid ?? '').trim();
    if (!safeUid) {
      return;
    }

    this.showNotification(`You muted ${safeUid}.`, 'success');
  }

  showProtectedMuteNotification() {
    this.showNotification('You cannot mute a ADMIN/MD.', 'error');
  }

  showMissingUidNotification() {
    this.showNotification("This player's UID could not be detected.", 'error');
  }

  clearNotificationTimers() {
    const win = this.document.defaultView || globalThis;
    if (this.notificationTimer !== null) {
      win.clearTimeout?.(this.notificationTimer);
      this.notificationTimer = null;
    }
    if (this.notificationRemoveTimer !== null) {
      win.clearTimeout?.(this.notificationRemoveTimer);
      this.notificationRemoveTimer = null;
    }
  }

  applyChatFontSize() {
    const chat = this.document.querySelector?.('#chat');
    if (!chat) {
      return;
    }

    const enabled = isChatFontSizeEnabled(this.storage);
    const size = getChatFontSize(this.storage);
    chat.classList.toggle('blobio-chat-font-size-enabled', enabled);
    if (typeof chat.style?.setProperty === 'function') {
      chat.style.setProperty('--blobio-chat-font-size', `${size}px`);
    } else if (chat.style) {
      chat.style['--blobio-chat-font-size'] = `${size}px`;
    }
  }

  syncChatWrapper() {
    const wrapper = this.document.querySelector?.('#chat-wrapper') || null;
    if (wrapper === this.chatWrapper) {
      return wrapper;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.chatWrapper = wrapper;

    const ResizeObserver = this.document.defaultView?.ResizeObserver || globalThis.ResizeObserver;
    if (wrapper && ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.schedulePositionUi());
      this.resizeObserver.observe(wrapper);
    }

    return wrapper;
  }

  positionUi() {
    if (!this.root) {
      return;
    }

    const wrapper = this.syncChatWrapper();
    const rect = wrapper?.getBoundingClientRect?.();
    if (!rect || !Number.isFinite(rect.top) || !Number.isFinite(rect.right)) {
      return;
    }

    const rootOpen = this.root.classList.contains('is-open');
    const activeCategory = this.root.querySelector('.blobio-chat-settings-category.is-open');
    const categoryOpen = Boolean(activeCategory);
    let totalWidth = TOGGLE_WIDTH;

    if (rootOpen) {
      totalWidth += CHAT_GAP + MAIN_PANEL_WIDTH;
      if (categoryOpen) {
        totalWidth += CHAT_GAP + CATEGORY_PANEL_WIDTH;
      }
    }

    const viewportWidth = this.document.defaultView?.innerWidth || 0;
    const preferredLeft = rect.right + CHAT_GAP;
    const left = viewportWidth > 0 && preferredLeft + totalWidth > viewportWidth - 4
      ? Math.max(4, rect.left - totalWidth - CHAT_GAP)
      : preferredLeft;

    const top = Math.max(4, Math.round(rect.top));
    const categoryTop = this.categoryViewportOffset(activeCategory, top);

    this.setStyle('--blobio-chat-settings-left', `${Math.round(left)}px`);
    this.setStyle('--blobio-chat-settings-top', `${top}px`);
    this.setStyle('--blobio-chat-settings-category-top', `${categoryTop}px`);
    this.setStyle('--blobio-chat-settings-bottom', 'auto');
    this.positionNotifications();
  }

  categoryViewportOffset(category, rootTop) {
    if (!category) {
      return 0;
    }

    const win = this.document.defaultView || globalThis;
    const viewportHeight = Number(win.innerHeight) || 0;
    const rect = category.getBoundingClientRect?.();
    const height = Number(rect?.height) || Number(category.offsetHeight) || 0;
    if (!viewportHeight || !height) {
      return 0;
    }

    const overflow = rootTop + height - (viewportHeight - 4);
    if (overflow <= 0) {
      return 0;
    }

    return -Math.round(Math.min(overflow, Math.max(0, rootTop - 4)));
  }

  positionNotifications() {
    const rect = this.chatWrapper?.getBoundingClientRect?.();
    if (!this.notificationHost || !rect || !Number.isFinite(rect.left) || !Number.isFinite(rect.top)) {
      return;
    }

    this.notificationHost.style.left = `${Math.round(rect.left)}px`;
    this.notificationHost.style.top = `${Math.max(4, Math.round(rect.top - 10))}px`;
    this.notificationHost.style.width = `${Math.max(180, Math.round(rect.width || 280))}px`;
  }

  schedulePositionUi() {
    if (this.positionFrame !== null) {
      return;
    }

    const win = this.document.defaultView || globalThis;
    if (typeof win.requestAnimationFrame !== 'function') {
      this.positionUi();
      return;
    }

    this.positionFrame = win.requestAnimationFrame(() => {
      this.positionFrame = null;
      this.positionUi();
    });
  }

  setStyle(name, value) {
    if (typeof this.root?.style?.setProperty === 'function') {
      this.root.style.setProperty(name, value);
    } else if (this.root?.style) {
      this.root.style[name] = value;
    }
  }

  watchPage() {
    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return;
    }

    this.pageObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes || []) {
          if (node === this.root || this.root?.contains?.(node) || node === this.notificationHost) {
            continue;
          }

          if (node?.id === 'chat'
            || node?.id === 'chat-wrapper'
            || node?.id === 'leader-board-wrapper'
            || node?.querySelector?.('#chat, #chat-wrapper, #leader-board-wrapper')) {
            this.applyRuntimeUi();
            this.syncChatWrapper();
            this.schedulePositionUi();
            return;
          }
        }
      }
    });

    this.pageObserver.observe(this.document.documentElement, { childList: true, subtree: true });
  }

  destroy() {
    this.pageObserver?.disconnect();
    this.pageObserver = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.chatWrapper = null;
    this.unsubscribeMutedPlayers?.();
    this.unsubscribeMutedPlayers = null;
    this.unsubscribeHotkeys?.();
    this.unsubscribeHotkeys = null;
    this.cancelHotkeyCapture();
    this.clearNotificationTimers();

    const win = this.document.defaultView || globalThis;
    if (this.viewportHandler) {
      win.removeEventListener?.('resize', this.viewportHandler);
      win.removeEventListener?.('scroll', this.viewportHandler, true);
      this.viewportHandler = null;
    }

    if (this.hotkeyKeydownHandler) {
      this.document.removeEventListener?.('keydown', this.hotkeyKeydownHandler, true);
      this.document.removeEventListener?.('keyup', this.hotkeyKeyupHandler, true);
      this.document.removeEventListener?.('mousedown', this.hotkeyMousedownHandler, true);
      this.document.removeEventListener?.('contextmenu', this.hotkeyContextMenuHandler, true);
      this.hotkeyKeydownHandler = null;
      this.hotkeyKeyupHandler = null;
      this.hotkeyMousedownHandler = null;
      this.hotkeyContextMenuHandler = null;
      this.suppressHotkeyContextMenu = false;
      this.suppressHotkeyBindClickUntil = 0;
    }

    if (this.outsidePointerHandler) {
      this.document.removeEventListener?.('pointerdown', this.outsidePointerHandler, true);
      this.outsidePointerHandler = null;
    }

    if (this.keyboardShield) {
      const { root, keydown, keypress, keyup } = this.keyboardShield;
      root.removeEventListener?.('keydown', keydown);
      root.removeEventListener?.('keypress', keypress);
      root.removeEventListener?.('keyup', keyup);
      this.keyboardShield = null;
    }

    if (this.positionFrame !== null) {
      win.cancelAnimationFrame?.(this.positionFrame);
      this.positionFrame = null;
    }
    this.clearHudColorCommitTimer();
    this.clearHudColorPreviewFrame();

    this.document.querySelector?.('#chat')?.classList?.remove('blobio-chat-font-size-enabled');
    win.__blobioAnimationSpeedRefresh?.({ enabled: false, speed: 1 });
    this.root?.remove();
    this.notificationHost?.remove();
    this.root = null;
    this.notificationHost = null;
    this.styleNode?.remove();
    this.styleNode = null;
    this.selectedMutedUids.clear();
    this.editingUid = '';
    this.editingNameDraft = '';
    this.selectedHotkeyId = '';
    this.started = false;
  }
}
