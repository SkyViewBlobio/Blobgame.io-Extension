import { CHAT_SETTINGS_CSS, CHAT_SETTINGS_STYLE_ID } from '../css/ChatSettingsStyles.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';
import {
  CHAT_FONT_SIZE_LIMITS,
  getChatFontSize,
  isChatFontSizeEnabled,
  setChatFontSize,
  setChatFontSizeEnabled,
} from '../settings/RuntimeSettings.js';

export class ChatSettingsFeature {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    logger = console,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.logger = logger;
    this.styleNode = null;
    this.root = null;
    this.pageObserver = null;
    this.viewportHandler = null;
    this.started = false;
  }

  start() {
    if (this.started || !this.document?.documentElement) {
      return Boolean(this.started);
    }

    this.started = true;
    this.ensureStyle();
    this.ensureUi();
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
      this.positionUi();
      return;
    }

    const root = this.document.createElement('div');
    root.classList.add('blobio-chat-settings-root');

    const toggle = this.document.createElement('button');
    toggle.type = 'button';
    toggle.classList.add('blobio-chat-settings-toggle');
    toggle.setAttribute('aria-label', 'Open chat settings');
    toggle.textContent = '+';

    const panel = this.document.createElement('div');
    panel.classList.add('blobio-chat-settings-panel');

    const categoryButton = this.document.createElement('button');
    categoryButton.type = 'button';
    categoryButton.classList.add('blobio-chat-settings-category-button');
    categoryButton.textContent = 'Chat-Settings';

    const category = this.document.createElement('div');
    category.classList.add('blobio-chat-settings-category');

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
    panel.append(categoryButton, category);
    root.append(toggle, panel);
    (this.document.body || this.document.documentElement).appendChild(root);

    toggle.addEventListener('click', () => {
      const open = !root.classList.contains('is-open');
      if (open) {
        root.classList.add('is-open');
      } else {
        root.classList.remove('is-open');
      }
      toggle.textContent = open ? '-' : '+';
      toggle.setAttribute('aria-label', open ? 'Close chat settings' : 'Open chat settings');
      this.positionUi();
    });

    categoryButton.addEventListener('click', () => {
      if (category.classList.contains('is-open')) {
        category.classList.remove('is-open');
      } else {
        category.classList.add('is-open');
      }
    });

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

    this.root = root;
    this.syncControls();
    this.positionUi();

    const win = this.document.defaultView || globalThis;
    this.viewportHandler = () => this.positionUi();
    win.addEventListener?.('resize', this.viewportHandler);
    win.addEventListener?.('scroll', this.viewportHandler, true);
  }

  syncControls() {
    if (!this.root) {
      return;
    }

    const enabled = isChatFontSizeEnabled(this.storage);
    const size = getChatFontSize(this.storage);
    const toggle = this.root.querySelector?.('.blobio-chat-font-toggle');
    const range = this.root.querySelector?.('.blobio-chat-font-range');
    const number = this.root.querySelector?.('.blobio-chat-font-number');

    if (toggle) {
      toggle.textContent = enabled ? 'true' : 'false';
      if (enabled) {
        toggle.classList.add('is-enabled');
      } else {
        toggle.classList.remove('is-enabled');
      }
    }
    if (range) {
      range.value = String(size);
      range.disabled = !enabled;
    }
    if (number) {
      number.value = String(size);
      number.disabled = !enabled;
    }
  }

  applyChatFontSize() {
    const chat = this.document.querySelector?.('#chat');
    if (!chat) {
      return;
    }

    const enabled = isChatFontSizeEnabled(this.storage);
    const size = getChatFontSize(this.storage);
    if (enabled) {
      chat.classList.add('blobio-chat-font-size-enabled');
    } else {
      chat.classList.remove('blobio-chat-font-size-enabled');
    }
    if (typeof chat.style?.setProperty === 'function') {
      chat.style.setProperty('--blobio-chat-font-size', `${size}px`);
    } else if (chat.style) {
      chat.style['--blobio-chat-font-size'] = `${size}px`;
    }
  }

  positionUi() {
    if (!this.root) {
      return;
    }

    const wrapper = this.document.querySelector?.('#chat-wrapper');
    const rect = wrapper?.getBoundingClientRect?.();
    if (!rect || !Number.isFinite(rect.top) || !Number.isFinite(rect.right)) {
      return;
    }

    const viewportWidth = this.document.defaultView?.innerWidth || 0;
    const preferredLeft = rect.right + 8;
    const panelWidth = this.root.classList.contains('is-open') ? 290 : 38;
    const left = viewportWidth > 0 && preferredLeft + panelWidth > viewportWidth
      ? Math.max(8, rect.left - panelWidth - 8)
      : preferredLeft;

    this.setStyle('--blobio-chat-settings-left', `${Math.round(left)}px`);
    this.setStyle('--blobio-chat-settings-top', `${Math.max(8, Math.round(rect.top))}px`);
    this.setStyle('--blobio-chat-settings-bottom', 'auto');
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
          if (node === this.root || this.root?.contains?.(node)) {
            continue;
          }

          if (node?.id === 'chat' || node?.id === 'chat-wrapper' || node?.querySelector?.('#chat, #chat-wrapper')) {
            this.applyChatFontSize();
            this.positionUi();
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

    const win = this.document.defaultView || globalThis;
    if (this.viewportHandler) {
      win.removeEventListener?.('resize', this.viewportHandler);
      win.removeEventListener?.('scroll', this.viewportHandler, true);
      this.viewportHandler = null;
    }

    this.document.querySelector?.('#chat')?.classList?.remove('blobio-chat-font-size-enabled');
    this.root?.remove();
    this.root = null;
    this.styleNode?.remove();
    this.styleNode = null;
    this.started = false;
  }
}
