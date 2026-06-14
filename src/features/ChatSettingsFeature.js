import { CHAT_SETTINGS_CSS, CHAT_SETTINGS_STYLE_ID } from '../css/ChatSettingsStyles.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';
import {
  CHAT_FONT_SIZE_LIMITS,
  getChatFontSize,
  isChatFontSizeEnabled,
  setChatFontSize,
  setChatFontSizeEnabled,
} from '../settings/RuntimeSettings.js';

const CHAT_GAP = 10;
const TOGGLE_WIDTH = 30;
const MAIN_PANEL_WIDTH = 250;
const CATEGORY_PANEL_WIDTH = 330;
const ENABLED_NOTICE = "To mute a person thats logged in, right click on their name in chat, or on their cells/LB name";

export class ChatSettingsFeature {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    mutedPlayersStore = null,
    logger = console,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.mutedPlayersStore = mutedPlayersStore;
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
    this.selectedMutedUids = new Set();
    this.editingUid = '';
    this.editingNameDraft = '';
    this.notificationTimer = null;
    this.notificationRemoveTimer = null;
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
    this.applyChatFontSize();
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

    const chatButton = this.createCategoryButton('Chat-Settings', 'chat');
    const mutedButton = this.createCategoryButton('Muted-Players', 'muted');
    panel.append(chatButton, mutedButton);

    const chatCategory = this.createChatCategory();
    const mutedCategory = this.createMutedPlayersCategory();
    root.append(toggle, panel, chatCategory, mutedCategory);
    (this.document.body || this.document.documentElement).appendChild(root);

    const notificationHost = this.document.createElement('div');
    notificationHost.classList.add('blobio-chat-notification-host');
    notificationHost.setAttribute('aria-live', 'polite');
    (this.document.body || this.document.documentElement).appendChild(notificationHost);

    toggle.addEventListener('click', () => {
      this.setOpen(!root.classList.contains('is-open'));
    });

    chatButton.addEventListener('click', () => this.toggleCategory('chat'));
    mutedButton.addEventListener('click', () => this.toggleCategory('muted'));

    const enabledButton = chatCategory.querySelector('.blobio-chat-font-toggle');
    const range = chatCategory.querySelector('.blobio-chat-font-range');
    const number = chatCategory.querySelector('.blobio-chat-font-number');

    enabledButton.addEventListener('click', () => {
      setChatFontSizeEnabled(this.storage, !isChatFontSizeEnabled(this.storage));
      this.syncControls();
      this.applyChatFontSize();
    });

    const updateSize = (value) => {
      const size = setChatFontSize(this.storage, value);
      range.value = String(size);
      number.value = String(size);
      this.applyChatFontSize();
    };

    range.addEventListener('input', () => updateSize(range.value));
    number.addEventListener('input', () => updateSize(number.value));
    number.addEventListener('change', () => updateSize(number.value));

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

    this.root = root;
    this.notificationHost = notificationHost;
    this.syncControls();
    this.syncMutedPlayersUi();
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

  createCategoryButton(label, category) {
    const button = this.document.createElement('button');
    button.type = 'button';
    button.classList.add('blobio-chat-settings-category-button');
    button.dataset.category = category;
    button.setAttribute('aria-expanded', 'false');

    const text = this.document.createElement('span');
    text.textContent = label;
    button.appendChild(text);
    return button;
  }

  createChatCategory() {
    const category = this.document.createElement('div');
    category.classList.add('blobio-chat-settings-category');
    category.dataset.category = 'chat';

    const enabledButton = this.document.createElement('button');
    enabledButton.type = 'button';
    enabledButton.classList.add('blobio-chat-font-toggle');

    const label = this.document.createElement('div');
    label.classList.add('blobio-chat-font-label');
    label.textContent = 'Font-Size';

    const controls = this.document.createElement('div');
    controls.classList.add('blobio-chat-font-controls');

    const range = this.document.createElement('input');
    range.type = 'range';
    range.classList.add('blobio-chat-font-range');
    range.min = String(CHAT_FONT_SIZE_LIMITS.min);
    range.max = String(CHAT_FONT_SIZE_LIMITS.max);
    range.step = '1';

    const number = this.document.createElement('input');
    number.type = 'number';
    number.classList.add('blobio-chat-font-number');
    number.min = String(CHAT_FONT_SIZE_LIMITS.min);
    number.max = String(CHAT_FONT_SIZE_LIMITS.max);
    number.step = '1';
    number.setAttribute('aria-label', 'Chat font size');

    controls.append(range, number);
    category.append(enabledButton, label, controls);
    return category;
  }

  createMutedPlayersCategory() {
    const category = this.document.createElement('div');
    category.classList.add('blobio-chat-settings-category', 'blobio-muted-players-category');
    category.dataset.category = 'muted';

    const toggle = this.document.createElement('button');
    toggle.type = 'button';
    toggle.classList.add('blobio-chat-font-toggle', 'blobio-muted-players-toggle');

    const label = this.document.createElement('div');
    label.classList.add('blobio-chat-font-label', 'blobio-muted-players-label');
    label.textContent = 'Ability to mute players with ID';

    const list = this.document.createElement('div');
    list.classList.add('blobio-muted-players-list');

    const empty = this.document.createElement('div');
    empty.classList.add('blobio-muted-players-empty');
    empty.textContent = 'No muted player UIDs.';
    list.appendChild(empty);

    const actions = this.document.createElement('div');
    actions.classList.add('blobio-muted-players-actions');

    const addName = this.document.createElement('button');
    addName.type = 'button';
    addName.classList.add('blobio-muted-player-action', 'blobio-muted-player-add-name');
    addName.textContent = 'Add name';

    const unmute = this.document.createElement('button');
    unmute.type = 'button';
    unmute.classList.add('blobio-muted-player-action', 'blobio-muted-player-unmute');
    unmute.textContent = 'Unmute';

    actions.append(addName, unmute);
    category.append(toggle, label, list, actions);
    return category;
  }

  setOpen(open) {
    if (!this.root) {
      return;
    }

    const toggle = this.root.querySelector('.blobio-chat-settings-toggle');
    if (open) {
      this.root.classList.add('is-open');
    } else {
      this.root.classList.remove('is-open');
      this.finishNameEdit();
      for (const category of this.root.querySelectorAll('.blobio-chat-settings-category')) {
        category.classList.remove('is-open');
      }
      for (const button of this.root.querySelectorAll('.blobio-chat-settings-category-button')) {
        button.setAttribute('aria-expanded', 'false');
      }
    }

    toggle.textContent = open ? '-' : '+';
    toggle.setAttribute('aria-label', open ? 'Close chat settings' : 'Open chat settings');
    toggle.setAttribute('aria-expanded', String(open));
    this.positionUi();
  }

  toggleCategory(categoryName) {
    if (!this.root) {
      return;
    }

    const category = this.root.querySelector(`.blobio-chat-settings-category[data-category="${categoryName}"]`);
    const shouldOpen = !category?.classList.contains('is-open');
    this.finishNameEdit();

    for (const item of this.root.querySelectorAll('.blobio-chat-settings-category')) {
      item.classList.toggle('is-open', shouldOpen && item === category);
    }
    for (const button of this.root.querySelectorAll('.blobio-chat-settings-category-button')) {
      button.setAttribute('aria-expanded', String(shouldOpen && button.dataset.category === categoryName));
    }
    this.positionUi();
  }

  syncControls() {
    if (!this.root) {
      return;
    }

    const enabled = isChatFontSizeEnabled(this.storage);
    const size = getChatFontSize(this.storage);
    const toggle = this.root.querySelector('.blobio-chat-font-toggle:not(.blobio-muted-players-toggle)');
    const categoryButton = this.root.querySelector('.blobio-chat-settings-category-button[data-category="chat"]');
    const range = this.root.querySelector('.blobio-chat-font-range');
    const number = this.root.querySelector('.blobio-chat-font-number');

    toggle.textContent = enabled ? 'true' : 'false';
    toggle.classList.toggle('is-enabled', enabled);
    categoryButton.classList.toggle('has-active-setting', enabled);
    range.value = String(size);
    range.disabled = !enabled;
    number.value = String(size);
    number.disabled = !enabled;
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
    const categoryOpen = Boolean(this.root.querySelector('.blobio-chat-settings-category.is-open'));
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

    this.setStyle('--blobio-chat-settings-left', `${Math.round(left)}px`);
    this.setStyle('--blobio-chat-settings-top', `${Math.max(4, Math.round(rect.top))}px`);
    this.setStyle('--blobio-chat-settings-bottom', 'auto');
    this.positionNotifications();
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

          if (node?.id === 'chat' || node?.id === 'chat-wrapper' || node?.querySelector?.('#chat, #chat-wrapper')) {
            this.applyChatFontSize();
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
    this.clearNotificationTimers();

    const win = this.document.defaultView || globalThis;
    if (this.viewportHandler) {
      win.removeEventListener?.('resize', this.viewportHandler);
      win.removeEventListener?.('scroll', this.viewportHandler, true);
      this.viewportHandler = null;
    }

    if (this.outsidePointerHandler) {
      this.document.removeEventListener?.('pointerdown', this.outsidePointerHandler, true);
      this.outsidePointerHandler = null;
    }

    if (this.positionFrame !== null) {
      win.cancelAnimationFrame?.(this.positionFrame);
      this.positionFrame = null;
    }

    this.document.querySelector?.('#chat')?.classList?.remove('blobio-chat-font-size-enabled');
    this.root?.remove();
    this.notificationHost?.remove();
    this.root = null;
    this.notificationHost = null;
    this.styleNode?.remove();
    this.styleNode = null;
    this.selectedMutedUids.clear();
    this.editingUid = '';
    this.editingNameDraft = '';
    this.started = false;
  }
}
