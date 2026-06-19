import { EMOTE_SKIN_CSS, EMOTE_SKIN_STYLE_ID } from '../css/EmoteSkinStyles.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';
import {
  EMOTE_SKIN_EMOJIS,
  EMOTE_SKIN_TRIGGERS,
  findEmoteTrigger,
  isEmoteSkinEnabled,
  setEmoteSkinEnabled,
} from './EmoteSkinSettings.js';

const LOCAL_SUPPRESSION_MS = 1800;
const INPUT_SELECTOR = '#message';

export class EmoteSkinFeature {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    assets = {},
    logger = console,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.assets = assets;
    this.logger = logger;
    this.styleNode = null;
    this.button = null;
    this.panel = null;
    this.input = null;
    this.pageObserver = null;
    this.chatObserver = null;
    this.chatList = null;
    this.positionFrame = null;
    this.visibilityTimer = null;
    this.inputKeydownHandler = null;
    this.sendingTrigger = false;
    this.localTriggers = [];
    this.randomEmoji = EMOTE_SKIN_EMOJIS[Math.floor(Math.random() * EMOTE_SKIN_EMOJIS.length)] || '😀';
    this.started = false;
  }

  start() {
    if (this.started || !this.document?.documentElement) {
      return Boolean(this.started);
    }

    this.started = true;
    this.ensureStyle();
    this.ensureUi();
    this.syncInput();
    this.attachChatObserver();
    this.watchPage();
    this.visibilityTimer = (this.document.defaultView || globalThis).setInterval?.(() => {
      this.syncInput();
      this.positionUi();
    }, 350) ?? null;
    return true;
  }

  ensureStyle() {
    const existing = this.document.getElementById?.(EMOTE_SKIN_STYLE_ID);
    if (existing) {
      this.styleNode = existing;
      return;
    }

    const style = this.document.createElement('style');
    style.id = EMOTE_SKIN_STYLE_ID;
    style.textContent = EMOTE_SKIN_CSS;
    (this.document.head || this.document.documentElement).appendChild(style);
    this.styleNode = style;
  }

  ensureUi() {
    if (this.button?.parentNode && this.panel?.parentNode) {
      return;
    }

    const button = this.document.createElement('button');
    button.type = 'button';
    button.classList.add('blobio-emote-skin-button');
    button.textContent = this.randomEmoji;
    button.setAttribute('aria-label', 'Open emotes');
    button.addEventListener('click', (event) => {
      event.preventDefault?.();
      this.setPanelOpen(!this.panel?.classList?.contains('is-open'));
    });

    const panel = this.document.createElement('div');
    panel.classList.add('blobio-emote-skin-panel');
    panel.append(
      this.createSkinToggle(),
      this.createAssetBar(),
      this.createEmojiBar(),
    );

    (this.document.body || this.document.documentElement).append(button, panel);
    this.button = button;
    this.panel = panel;
    this.syncToggle();
  }

  createSkinToggle() {
    const label = this.document.createElement('label');
    label.classList.add('blobio-emote-skin-toggle');

    const text = this.document.createElement('span');
    text.textContent = 'Skin-Emote';

    const checkbox = this.document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('blobio-emote-skin-checkbox');
    checkbox.addEventListener('change', () => {
      setEmoteSkinEnabled(this.storage, checkbox.checked);
      this.syncToggle();
    });

    label.append(text, checkbox);
    return label;
  }

  createAssetBar() {
    const bar = this.document.createElement('div');
    bar.classList.add('blobio-emote-skin-assets');

    for (const trigger of EMOTE_SKIN_TRIGGERS) {
      const url = this.assets[trigger.assetKey];
      if (!url) {
        continue;
      }

      const button = this.document.createElement('button');
      button.type = 'button';
      button.classList.add('blobio-emote-skin-asset');
      button.title = `${trigger.label} ${trigger.emoji}`;
      button.dataset.emoteId = trigger.id;

      const image = this.document.createElement('img');
      image.src = url;
      image.alt = trigger.emoji;
      button.appendChild(image);

      button.addEventListener('click', (event) => {
        event.preventDefault?.();
        this.sendEmoteTrigger(trigger);
      });
      bar.appendChild(button);
    }

    return bar;
  }

  createEmojiBar() {
    const bar = this.document.createElement('div');
    bar.classList.add('blobio-emote-skin-emojis');

    for (const emoji of EMOTE_SKIN_EMOJIS) {
      const button = this.document.createElement('button');
      button.type = 'button';
      button.classList.add('blobio-emote-skin-emoji');
      button.textContent = emoji;
      button.title = emoji;
      button.addEventListener('click', (event) => {
        event.preventDefault?.();
        this.insertEmoji(emoji);
      });
      bar.appendChild(button);
    }

    return bar;
  }

  syncInput() {
    const input = this.document.querySelector?.(INPUT_SELECTOR);
    if (input !== this.input) {
      this.detachInput();
      this.input = input || null;
      if (this.input) {
        this.inputKeydownHandler = (event) => this.handleInputKeydown(event);
        this.input.addEventListener?.('keydown', this.inputKeydownHandler, true);
      }
    }

    const visible = this.input && this.isVisible(this.input);
    this.button?.classList.toggle('is-visible', Boolean(visible));
    if (!visible) {
      this.setPanelOpen(false);
    } else {
      this.schedulePosition();
    }
  }

  detachInput() {
    if (this.input && this.inputKeydownHandler) {
      this.input.removeEventListener?.('keydown', this.inputKeydownHandler, true);
    }
    this.inputKeydownHandler = null;
    this.input = null;
  }

  isVisible(element) {
    const rect = element?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    const style = (this.document.defaultView || globalThis).getComputedStyle?.(element);
    return style?.display !== 'none' && style?.visibility !== 'hidden';
  }

  schedulePosition() {
    if (this.positionFrame !== null) {
      return;
    }

    const win = this.document.defaultView || globalThis;
    const raf = win.requestAnimationFrame || ((callback) => win.setTimeout?.(callback, 16));
    this.positionFrame = typeof raf === 'function' ? raf(() => {
      this.positionFrame = null;
      this.positionUi();
    }) : null;
    if (this.positionFrame === null || this.positionFrame === undefined) {
      this.positionUi();
    }
  }

  positionUi() {
    if (!this.input || !this.button || !this.panel || !this.isVisible(this.input)) {
      return;
    }

    const win = this.document.defaultView || globalThis;
    const rect = this.input.getBoundingClientRect();
    const buttonSize = 26;
    const buttonLeft = Math.max(4, rect.right - buttonSize - 4);
    const buttonTop = rect.top + Math.max(0, (rect.height - buttonSize) / 2);
    this.button.style.left = `${Math.round(buttonLeft)}px`;
    this.button.style.top = `${Math.round(buttonTop)}px`;

    const viewportWidth = Number(win.innerWidth) || 1280;
    const viewportHeight = Number(win.innerHeight) || 720;
    const panelWidth = Math.min(330, Math.max(220, viewportWidth - 24));
    const panelHeight = Math.min(
      Number(this.panel.getBoundingClientRect?.().height) || 260,
      viewportHeight - 32,
    );
    const panelLeft = Math.min(Math.max(12, rect.right - panelWidth), viewportWidth - panelWidth - 12);
    const preferredTop = rect.top - panelHeight - 8;
    const panelTop = preferredTop >= 12 ? preferredTop : Math.min(rect.bottom + 8, viewportHeight - panelHeight - 12);

    this.panel.style.width = `${Math.round(panelWidth)}px`;
    this.panel.style.left = `${Math.round(panelLeft)}px`;
    this.panel.style.top = `${Math.round(Math.max(12, panelTop))}px`;
  }

  setPanelOpen(open) {
    this.panel?.classList.toggle('is-open', Boolean(open));
    this.button?.classList.toggle('is-open', Boolean(open));
    this.button?.setAttribute('aria-expanded', String(Boolean(open)));
    if (open) {
      this.syncToggle();
      this.positionUi();
    }
  }

  syncToggle() {
    const checkbox = this.panel?.querySelector?.('.blobio-emote-skin-checkbox');
    if (checkbox) {
      checkbox.checked = isEmoteSkinEnabled(this.storage);
    }
  }

  insertEmoji(emoji) {
    const input = this.input || this.document.querySelector?.(INPUT_SELECTOR);
    if (!input) {
      return false;
    }

    input.focus?.();
    const value = String(input.value || '');
    const start = Number.isFinite(input.selectionStart) ? input.selectionStart : value.length;
    const end = Number.isFinite(input.selectionEnd) ? input.selectionEnd : start;
    const next = this.limitInputValue(`${value.slice(0, start)}${emoji}${value.slice(end)}`, input.maxLength);
    this.setInputValue(input, next);
    const nextCursor = Math.min(next.length, start + emoji.length);
    input.setSelectionRange?.(nextCursor, nextCursor);
    this.dispatchInput(input, emoji);
    return true;
  }

  async sendEmoteTrigger(trigger) {
    const input = this.input || this.document.querySelector?.(INPUT_SELECTOR);
    if (!input) {
      return false;
    }

    this.insertEmoji(trigger.emoji);
    const text = String(input.value || '');
    this.rememberLocalTrigger(trigger, text);
    if (isEmoteSkinEnabled(this.storage)) {
      this.triggerOwnEmote(trigger);
    }

    this.dispatchChange(input);
    await this.nextFrame();
    this.sendingTrigger = true;
    try {
      this.dispatchEnter(input);
    } finally {
      this.sendingTrigger = false;
    }
    this.setPanelOpen(false);
    return true;
  }

  handleInputKeydown(event) {
    if (this.sendingTrigger) {
      return;
    }

    if (event?.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const text = String(this.input?.value || '');
    const trigger = findEmoteTrigger(text);
    if (!trigger) {
      return;
    }

    this.rememberLocalTrigger(trigger, text);
    if (isEmoteSkinEnabled(this.storage)) {
      this.triggerOwnEmote(trigger);
    }
  }

  rememberLocalTrigger(trigger, text) {
    const now = Date.now();
    this.localTriggers = this.localTriggers
      .filter((item) => now - item.at < LOCAL_SUPPRESSION_MS)
      .concat({ emoteId: trigger.id, emoji: trigger.emoji, text: String(text || ''), at: now });
  }

  shouldSuppressLocalTrigger(trigger, text) {
    const now = Date.now();
    this.localTriggers = this.localTriggers.filter((item) => now - item.at < LOCAL_SUPPRESSION_MS);
    return this.localTriggers.some((item) => (
      item.emoteId === trigger.id && (!item.text || String(text || '').includes(item.emoji))
    ));
  }

  triggerOwnEmote(trigger) {
    const win = this.document.defaultView || globalThis;
    win.__BlobioSkinEmoteTrigger?.({
      emoteId: trigger.id,
      emoji: trigger.emoji,
      own: true,
      durationMs: 5000,
    });
  }

  attachChatObserver() {
    const chatList = this.document.querySelector?.('#chat > ul') || this.document.querySelector?.('#chat ul');
    if (!chatList || chatList === this.chatList) {
      return;
    }

    this.chatObserver?.disconnect();
    this.chatList = chatList;
    this.processChatMessages(chatList.querySelectorAll?.('li') || []);

    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return;
    }

    this.chatObserver = new MutationObserver((mutations) => {
      const messages = new Set();
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes || []) {
          if (String(node?.tagName || '').toUpperCase() === 'LI') {
            messages.add(node);
          }
          for (const item of node?.querySelectorAll?.('li') || []) {
            messages.add(item);
          }
        }
      }
      this.processChatMessages(messages);
    });
    this.chatObserver.observe(chatList, { childList: true, subtree: true });
  }

  processChatMessages(messages) {
    for (const message of messages) {
      this.processChatMessage(message);
    }
  }

  processChatMessage(message) {
    const parsed = this.parseChatMessage(message);
    if (!parsed.text || !parsed.name) {
      return;
    }

    const trigger = findEmoteTrigger(parsed.text);
    if (!trigger) {
      return;
    }

    const signature = `${parsed.uid}:${parsed.name}:${parsed.text}:${trigger.id}`;
    if (message.dataset?.blobioEmoteSignature === signature) {
      return;
    }
    if (message.dataset) {
      message.dataset.blobioEmoteSignature = signature;
    }

    if (this.shouldSuppressLocalTrigger(trigger, parsed.text)) {
      return;
    }

    const win = this.document.defaultView || globalThis;
    win.__BlobioSkinEmoteTrigger?.({
      emoteId: trigger.id,
      emoji: trigger.emoji,
      uid: parsed.uid,
      name: parsed.name,
      durationMs: 5000,
    });
  }

  parseChatMessage(message) {
    const spans = Array.from(message?.children || [])
      .filter((child) => String(child.tagName || '').toUpperCase() === 'SPAN');
    const uid = String(message?.getAttribute?.('uid') || '').trim();

    if (spans.length >= 2) {
      const name = this.cleanName(spans[0].textContent);
      const messageSpan = spans.slice(1).find((span) => /^\s*:/.test(span.textContent || '')) || spans.at(-1);
      return {
        uid,
        name,
        text: this.cleanMessageText(messageSpan?.textContent),
      };
    }

    const raw = String(message?.textContent || '');
    const split = raw.indexOf(':');
    return {
      uid,
      name: split > 0 ? this.cleanName(raw.slice(0, split)) : '',
      text: split >= 0 ? this.cleanMessageText(raw.slice(split)) : raw,
    };
  }

  cleanName(value) {
    return String(value || '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
  }

  cleanMessageText(value) {
    return String(value || '').replace(/^\s*:\s*/, '').trim();
  }

  limitInputValue(value, maxLength) {
    const limit = Math.max(1, Number(maxLength) || 50);
    const chars = Array.from(String(value || ''));
    return chars.length > limit ? chars.slice(0, limit).join('') : chars.join('');
  }

  setInputValue(input, value) {
    const win = this.document.defaultView || globalThis;
    const prototype = win.HTMLInputElement?.prototype || globalThis.HTMLInputElement?.prototype;
    const setter = prototype && Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }
  }

  dispatchInput(input, text) {
    const win = this.document.defaultView || globalThis;
    let event;
    try {
      event = new win.InputEvent('input', {
        bubbles: true,
        cancelable: false,
        data: text,
        inputType: 'insertText',
      });
    } catch {
      const EventCtor = win.Event || globalThis.Event;
      event = EventCtor ? new EventCtor('input', { bubbles: true }) : { type: 'input', bubbles: true };
    }
    input.dispatchEvent?.(event);
  }

  dispatchChange(input) {
    const win = this.document.defaultView || globalThis;
    const EventCtor = win.Event || globalThis.Event;
    const event = EventCtor ? new EventCtor('change', { bubbles: true }) : { type: 'change', bubbles: true };
    input.dispatchEvent?.(event);
  }

  dispatchEnter(target) {
    for (const type of ['keydown', 'keypress', 'keyup']) {
      target.dispatchEvent?.(this.createKeyboardEvent(type));
    }
  }

  createKeyboardEvent(type) {
    const win = this.document.defaultView || globalThis;
    let event;
    try {
      event = new win.KeyboardEvent(type, {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
      });
    } catch {
      event = { type, key: 'Enter', code: 'Enter', bubbles: true, cancelable: true };
    }

    try {
      Object.defineProperties(event, {
        keyCode: { configurable: true, get: () => 13 },
        which: { configurable: true, get: () => 13 },
      });
    } catch {}
    return event;
  }

  nextFrame() {
    const win = this.document.defaultView || globalThis;
    return new Promise((resolve) => {
      if (typeof win.requestAnimationFrame === 'function') {
        win.requestAnimationFrame(() => resolve());
      } else {
        win.setTimeout?.(resolve, 0) ?? resolve();
      }
    });
  }

  watchPage() {
    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return;
    }

    this.pageObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes || []) {
          if (node?.id === 'message' || node?.id === 'chat' || node?.querySelector?.('#message, #chat')) {
            this.syncInput();
            this.attachChatObserver();
            return;
          }
        }
      }
    });
    this.pageObserver.observe(this.document.documentElement, { childList: true, subtree: true });
  }

  destroy() {
    const win = this.document.defaultView || globalThis;
    this.pageObserver?.disconnect();
    this.chatObserver?.disconnect();
    this.pageObserver = null;
    this.chatObserver = null;
    this.chatList = null;
    this.detachInput();
    if (this.visibilityTimer !== null) {
      win.clearInterval?.(this.visibilityTimer);
      this.visibilityTimer = null;
    }
    if (this.positionFrame !== null) {
      win.cancelAnimationFrame?.(this.positionFrame);
      this.positionFrame = null;
    }
    this.button?.remove();
    this.panel?.remove();
    this.styleNode?.remove();
    this.button = null;
    this.panel = null;
    this.styleNode = null;
    this.localTriggers = [];
    this.started = false;
  }
}
