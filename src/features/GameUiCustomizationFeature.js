import { createBlobioStorage } from '../storage/BlobioStorage.js';
import {
  LEADERBOARD_SIZE_LIMITS,
  readInGameUiSettings,
  setLeaderboardSizeSetting,
} from '../settings/InGameUiSettings.js';

const CHAT_NEAR_BOTTOM_PX = 36;
const MESSAGE_ANIMATION_MS = 560;
const CHAT_SHIFT_ANIMATION_MS = 620;

function hexToRgba(color, alpha) {
  const value = String(color || '#000000').replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16) || 0;
  const green = Number.parseInt(value.slice(2, 4), 16) || 0;
  const blue = Number.parseInt(value.slice(4, 6), 16) || 0;
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, Number(alpha) || 0))})`;
}

function setCssVariable(element, name, value) {
  if (typeof element?.style?.setProperty === 'function') {
    element.style.setProperty(name, value);
  } else if (element?.style) {
    element.style[name] = value;
  }
}

function removeCssVariable(element, name) {
  if (typeof element?.style?.removeProperty === 'function') {
    element.style.removeProperty(name);
  } else if (element?.style) {
    delete element.style[name];
  }
}

export class GameUiCustomizationFeature {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    logger = console,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.logger = logger;
    this.pageObserver = null;
    this.chatObserver = null;
    this.chatElement = null;
    this.chatList = null;
    this.chatOutlineTarget = null;
    this.chatScrollHandler = null;
    this.nearChatBottom = true;
    this.lastChatScrollHeight = 0;
    this.lastChatScrollTop = 0;
    this.chatShiftAnimation = null;
    this.chatShiftFrame = null;
    this.chatShiftTimer = null;
    this.messageTimers = new Set();
    this.leaderboardWrapper = null;
    this.leaderboardResizeHandle = null;
    this.leaderboardResizeState = null;
    this.leaderboardPointerMoveHandler = null;
    this.leaderboardPointerUpHandler = null;
    this.stats = {
      addedMessages: 0,
      smoothScrollCalls: 0,
      shiftAnimations: 0,
      lastShiftPx: 0,
      lastMutationAt: 0,
    };
    this.started = false;
  }

  start() {
    if (this.started || !this.document?.documentElement) {
      return Boolean(this.started);
    }

    this.started = true;
    this.applyAll();
    this.watchPage();
    this.installDebug();
    return true;
  }

  applyAll() {
    const settings = readInGameUiSettings(this.storage);
    this.applyChatAppearance(settings);
    this.applyLeaderboardAppearance(settings);
    this.applyCaptchaLogo(settings.hideCaptchaLogo);
    this.syncSmoothChat(settings.smoothChat);
    return settings;
  }

  applyChatAppearance(settings) {
    const chat = this.document.querySelector?.('#chat');
    if (!chat) {
      return false;
    }

    const outlineTarget = this.document.querySelector?.('#chat-wrapper') || chat;
    if (this.chatOutlineTarget && this.chatOutlineTarget !== outlineTarget) {
      this.chatOutlineTarget.classList?.remove('blobio-chat-outline-enabled');
      removeCssVariable(this.chatOutlineTarget, '--blobio-chat-outline');
    }
    this.chatOutlineTarget = outlineTarget;

    chat.classList.toggle('blobio-chat-background-enabled', settings.chatBackground.enabled);
    outlineTarget.classList.toggle('blobio-chat-outline-enabled', settings.chatOutline.enabled);

    if (settings.chatBackground.enabled) {
      setCssVariable(chat, '--blobio-chat-background', hexToRgba(
        settings.chatBackground.color,
        settings.chatBackground.alpha,
      ));
    } else {
      removeCssVariable(chat, '--blobio-chat-background');
    }

    if (settings.chatOutline.enabled) {
      setCssVariable(outlineTarget, '--blobio-chat-outline', hexToRgba(
        settings.chatOutline.color,
        settings.chatOutline.alpha,
      ));
    } else {
      removeCssVariable(outlineTarget, '--blobio-chat-outline');
    }

    return true;
  }

  applyLeaderboardAppearance(settings) {
    const wrapper = this.document.querySelector?.('#leader-board-wrapper');
    if (!wrapper) {
      return false;
    }

    this.ensureLeaderboardResizeHandle(wrapper);

    wrapper.classList.toggle(
      'blobio-leaderboard-background-enabled',
      settings.leaderboardBackground.enabled,
    );
    wrapper.classList.toggle(
      'blobio-leaderboard-outline-enabled',
      settings.leaderboardOutline.enabled,
    );
    wrapper.classList.toggle(
      'blobio-leaderboard-font-size-enabled',
      settings.leaderboardFont.enabled,
    );

    if (settings.leaderboardBackground.enabled) {
      setCssVariable(wrapper, '--blobio-leaderboard-background', hexToRgba(
        settings.leaderboardBackground.color,
        settings.leaderboardBackground.alpha,
      ));
    } else {
      removeCssVariable(wrapper, '--blobio-leaderboard-background');
    }

    if (settings.leaderboardOutline.enabled) {
      setCssVariable(wrapper, '--blobio-leaderboard-outline', hexToRgba(
        settings.leaderboardOutline.color,
        settings.leaderboardOutline.alpha,
      ));
    } else {
      removeCssVariable(wrapper, '--blobio-leaderboard-outline');
    }

    setCssVariable(wrapper, '--blobio-leaderboard-font-size', `${settings.leaderboardFont.value}px`);
    this.applyLeaderboardSize(wrapper, settings.leaderboardSize);
    return true;
  }

  applyLeaderboardSize(wrapper, size = {}) {
    const width = size.width === null || size.width === undefined ? null : Number(size.width);
    const height = size.height === null || size.height === undefined ? null : Number(size.height);

    if (width !== null && Number.isFinite(width)) {
      wrapper.style.width = `${width}px`;
    }
    if (height !== null && Number.isFinite(height)) {
      wrapper.style.height = `${height}px`;
    }

    wrapper.classList?.toggle(
      'blobio-leaderboard-custom-size',
      (width !== null && Number.isFinite(width)) || (height !== null && Number.isFinite(height)),
    );
  }

  ensureLeaderboardResizeHandle(wrapper) {
    if (!wrapper) {
      return null;
    }

    if (this.leaderboardWrapper && this.leaderboardWrapper !== wrapper) {
      this.leaderboardResizeHandle?.remove?.();
      this.leaderboardResizeHandle = null;
      this.leaderboardResizeState = null;
    }

    this.leaderboardWrapper = wrapper;
    wrapper.classList?.add('blobio-leaderboard-resizable');

    let handle = wrapper.querySelector?.('.blobio-leaderboard-resize-handle') || null;
    if (!handle) {
      handle = this.document.createElement?.('button');
      if (!handle) {
        return null;
      }

      handle.type = 'button';
      handle.classList.add('blobio-leaderboard-resize-handle');
      handle.setAttribute('aria-label', 'Resize leaderboard');

      const grip = this.document.createElement?.('span');
      if (grip) {
        grip.classList.add('blobio-leaderboard-resize-grip');
        grip.setAttribute('aria-hidden', 'true');
        handle.appendChild(grip);
      }

      wrapper.appendChild?.(handle);
    }

    if (handle.dataset?.blobioResizeBound !== '1') {
      handle.dataset.blobioResizeBound = '1';
      handle.addEventListener?.('pointerdown', (event) => this.beginLeaderboardResize(event));
    }

    this.leaderboardResizeHandle = handle;
    const position = (this.document.defaultView || globalThis)
      .getComputedStyle?.(wrapper)?.position;
    wrapper.classList?.toggle('blobio-leaderboard-relative', !position || position === 'static');
    this.installLeaderboardResizeListeners();
    return handle;
  }

  installLeaderboardResizeListeners() {
    if (this.leaderboardPointerMoveHandler) {
      return;
    }

    this.leaderboardPointerMoveHandler = (event) => this.handleLeaderboardResizeMove(event);
    this.leaderboardPointerUpHandler = (event) => this.finishLeaderboardResize(event);
    this.document.addEventListener?.('pointermove', this.leaderboardPointerMoveHandler, true);
    this.document.addEventListener?.('pointerup', this.leaderboardPointerUpHandler, true);
    this.document.addEventListener?.('pointercancel', this.leaderboardPointerUpHandler, true);
  }

  beginLeaderboardResize(event) {
    const wrapper = this.leaderboardWrapper;
    const handle = this.leaderboardResizeHandle;
    const rect = wrapper?.getBoundingClientRect?.();
    if (!wrapper || !handle || !rect) {
      return;
    }

    event.preventDefault?.();
    event.stopPropagation?.();
    handle.setPointerCapture?.(event.pointerId);
    wrapper.classList?.add('blobio-leaderboard-is-resizing');
    this.leaderboardResizeState = {
      pointerId: event.pointerId,
      startX: Number(event.clientX) || 0,
      startY: Number(event.clientY) || 0,
      startWidth: Math.max(LEADERBOARD_SIZE_LIMITS.minWidth, Number(rect.width) || 0),
      startHeight: Math.max(LEADERBOARD_SIZE_LIMITS.minHeight, Number(rect.height) || 0),
      top: Number(rect.top) || 0,
      width: Number(rect.width) || LEADERBOARD_SIZE_LIMITS.minWidth,
      height: Number(rect.height) || LEADERBOARD_SIZE_LIMITS.minHeight,
    };
  }

  handleLeaderboardResizeMove(event) {
    const state = this.leaderboardResizeState;
    const wrapper = this.leaderboardWrapper;
    if (!state || !wrapper || (state.pointerId !== undefined && event.pointerId !== state.pointerId)) {
      return;
    }

    event.preventDefault?.();
    const deltaX = (Number(event.clientX) || 0) - state.startX;
    const deltaY = (Number(event.clientY) || 0) - state.startY;
    const win = this.document.defaultView || globalThis;
    const viewportWidth = Number(win.innerWidth) || LEADERBOARD_SIZE_LIMITS.maxWidth;
    const viewportHeight = Number(win.innerHeight) || LEADERBOARD_SIZE_LIMITS.maxHeight;
    const maxWidth = Math.max(
      LEADERBOARD_SIZE_LIMITS.minWidth,
      Math.min(LEADERBOARD_SIZE_LIMITS.maxWidth, viewportWidth - 12),
    );
    const maxHeight = Math.max(
      LEADERBOARD_SIZE_LIMITS.minHeight,
      Math.min(LEADERBOARD_SIZE_LIMITS.maxHeight, viewportHeight - state.top - 8),
    );

    state.width = Math.round(Math.max(
      LEADERBOARD_SIZE_LIMITS.minWidth,
      Math.min(maxWidth, state.startWidth - deltaX),
    ));
    state.height = Math.round(Math.max(
      LEADERBOARD_SIZE_LIMITS.minHeight,
      Math.min(maxHeight, state.startHeight + deltaY),
    ));

    wrapper.style.width = `${state.width}px`;
    wrapper.style.height = `${state.height}px`;
    wrapper.classList?.add('blobio-leaderboard-custom-size');
  }

  finishLeaderboardResize(event) {
    const state = this.leaderboardResizeState;
    if (!state || (state.pointerId !== undefined && event?.pointerId !== state.pointerId)) {
      return;
    }

    this.leaderboardResizeHandle?.releasePointerCapture?.(state.pointerId);
    this.leaderboardWrapper?.classList?.remove('blobio-leaderboard-is-resizing');
    setLeaderboardSizeSetting(this.storage, {
      width: state.width,
      height: state.height,
    });
    this.leaderboardResizeState = null;
  }

  applyCaptchaLogo(hidden) {
    const applyInDocument = (documentRef) => {
      let changed = false;
      for (const logo of documentRef?.querySelectorAll?.('.rc-anchor-logo-img, .rc-anchor-logo-img-large') || []) {
        logo.classList.toggle('blobio-captcha-logo-hidden', Boolean(hidden));
        changed = true;
      }
      return changed;
    };

    let changed = applyInDocument(this.document);
    for (const frame of this.document.querySelectorAll?.('iframe[src*="recaptcha"]') || []) {
      try {
        changed = applyInDocument(frame.contentDocument) || changed;
      } catch {
        // Cross-origin reCAPTCHA frames are handled by the loader's frame-only branch.
      }
    }
    return changed;
  }

  syncSmoothChat(enabled) {
    const chat = this.document.querySelector?.('#chat') || null;
    const list = chat?.querySelector?.('ul') || null;

    if (!enabled || !chat || !list) {
      this.disconnectSmoothChat();
      chat?.classList?.remove('blobio-smooth-chat');
      return false;
    }

    chat.classList.add('blobio-smooth-chat');
    if (chat === this.chatElement && list === this.chatList && this.chatObserver) {
      return true;
    }

    this.disconnectSmoothChat();
    this.chatElement = chat;
    this.chatList = list;
    this.nearChatBottom = this.isNearChatBottom();
    this.lastChatScrollHeight = Number(chat.scrollHeight) || 0;
    this.lastChatScrollTop = Number(chat.scrollTop) || 0;
    this.chatScrollHandler = () => {
      this.nearChatBottom = this.isNearChatBottom();
      this.lastChatScrollTop = Number(chat.scrollTop) || 0;
    };
    chat.addEventListener?.('scroll', this.chatScrollHandler, { passive: true });

    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return true;
    }

    this.chatObserver = new MutationObserver((mutations) => this.handleChatMutations(mutations));
    this.chatObserver.observe(list, { childList: true });
    return true;
  }

  handleChatMutations(mutations) {
    const previousHeight = this.lastChatScrollHeight;
    const wasNearBottom = this.nearChatBottom;
    const addedMessages = [];
    let addedCount = 0;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes || []) {
        if (node?.nodeType !== 1 || String(node.tagName || '').toLowerCase() !== 'li') {
          continue;
        }
        addedCount += 1;
        addedMessages.push(node);
      }
    }

    if (addedCount === 0) {
      return;
    }

    this.stats.addedMessages += addedCount;
    this.stats.lastMutationAt = Date.now();
    const currentHeight = Number(this.chatElement?.scrollHeight) || previousHeight;
    const measuredAddedHeight = addedMessages.reduce((total, message) => {
      const rectHeight = Number(message.getBoundingClientRect?.().height) || 0;
      const elementHeight = Number(message.offsetHeight) || Number(message.scrollHeight) || 0;
      return total + Math.max(rectHeight, elementHeight);
    }, 0);
    const shift = Math.max(0, currentHeight - previousHeight, measuredAddedHeight);

    if (wasNearBottom) {
      this.scrollChatToBottom();
      this.animateChatShift(shift, addedMessages);
    } else {
      for (const message of addedMessages) {
        this.animateMessage(message);
      }
    }

    this.lastChatScrollHeight = currentHeight;
    this.lastChatScrollTop = Number(this.chatElement?.scrollTop) || 0;
    this.nearChatBottom = this.isNearChatBottom();
  }

  animateMessage(message) {
    message.classList?.add('blobio-chat-message-enter');
    const win = this.document.defaultView || globalThis;
    const timer = win.setTimeout?.(() => {
      this.messageTimers.delete(timer);
      message.classList?.remove('blobio-chat-message-enter');
    }, MESSAGE_ANIMATION_MS);
    if (timer !== undefined && timer !== null) {
      this.messageTimers.add(timer);
    }
  }

  animateChatShift(shift, addedMessages) {
    const list = this.chatList;
    if (!list) {
      return;
    }

    for (const message of addedMessages) {
      this.animateMessage(message);
    }

    const distance = Math.max(0, Math.min(
      Number(shift) || 0,
      Number(this.chatElement?.clientHeight) || Number(shift) || 0,
    ));
    if (distance < 1) {
      return;
    }

    this.cancelChatShiftAnimation();
    this.stats.shiftAnimations += 1;
    this.stats.lastShiftPx = Math.round(distance);

    if (typeof list.animate === 'function') {
      const animation = list.animate(
        [
          { transform: `translateY(${distance}px)` },
          { transform: 'translateY(0)' },
        ],
        {
          duration: CHAT_SHIFT_ANIMATION_MS,
          easing: 'cubic-bezier(0.2, 0.72, 0.22, 1)',
        },
      );
      this.chatShiftAnimation = animation;
      animation.onfinish = () => {
        if (this.chatShiftAnimation === animation) {
          this.chatShiftAnimation = null;
        }
      };
      animation.oncancel = animation.onfinish;
      return;
    }

    setCssVariable(list, '--blobio-chat-shift-distance', `${distance}px`);
    list.classList?.add('blobio-chat-list-shift-start');
    void list.offsetHeight;

    const win = this.document.defaultView || globalThis;
    const run = () => {
      this.chatShiftFrame = null;
      list.classList?.add('blobio-chat-list-shift-running');
      this.chatShiftTimer = win.setTimeout?.(() => {
        this.chatShiftTimer = null;
        list.classList?.remove('blobio-chat-list-shift-start', 'blobio-chat-list-shift-running');
        removeCssVariable(list, '--blobio-chat-shift-distance');
      }, CHAT_SHIFT_ANIMATION_MS + 40);
    };

    if (typeof win.requestAnimationFrame === 'function') {
      this.chatShiftFrame = win.requestAnimationFrame(run);
    } else {
      run();
    }
  }

  cancelChatShiftAnimation() {
    this.chatShiftAnimation?.cancel?.();
    this.chatShiftAnimation = null;

    const win = this.document.defaultView || globalThis;
    if (this.chatShiftFrame !== null) {
      win.cancelAnimationFrame?.(this.chatShiftFrame);
      this.chatShiftFrame = null;
    }
    if (this.chatShiftTimer !== null) {
      win.clearTimeout?.(this.chatShiftTimer);
      this.chatShiftTimer = null;
    }

    this.chatList?.classList?.remove('blobio-chat-list-shift-start', 'blobio-chat-list-shift-running');
    removeCssVariable(this.chatList, '--blobio-chat-shift-distance');
  }

  scrollChatToBottom() {
    const chat = this.chatElement;
    if (!chat) {
      return;
    }

    this.stats.smoothScrollCalls += 1;
    chat.scrollTop = Math.max(0, Number(chat.scrollHeight) || 0);
  }

  isNearChatBottom() {
    const chat = this.chatElement;
    if (!chat) {
      return true;
    }

    const remaining = (Number(chat.scrollHeight) || 0)
      - (Number(chat.scrollTop) || 0)
      - (Number(chat.clientHeight) || 0);
    return remaining <= CHAT_NEAR_BOTTOM_PX;
  }

  disconnectSmoothChat() {
    this.chatObserver?.disconnect();
    this.chatObserver = null;
    this.cancelChatShiftAnimation();
    if (this.chatElement && this.chatScrollHandler) {
      this.chatElement.removeEventListener?.('scroll', this.chatScrollHandler);
    }
    this.chatElement?.classList?.remove('blobio-smooth-chat');
    this.chatElement = null;
    this.chatList = null;
    this.chatScrollHandler = null;
    this.lastChatScrollHeight = 0;
    this.lastChatScrollTop = 0;
  }

  watchPage() {
    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return;
    }

    this.pageObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes || []) {
          if (node?.id === 'chat'
            || node?.id === 'chat-wrapper'
            || node?.id === 'leader-board-wrapper'
            || node?.matches?.('.rc-anchor-logo-img, .rc-anchor-logo-img-large')
            || node?.querySelector?.('#chat, #chat-wrapper, #leader-board-wrapper, .rc-anchor-logo-img, .rc-anchor-logo-img-large')) {
            this.applyAll();
            return;
          }
        }
      }
    });
    this.pageObserver.observe(this.document.documentElement, { childList: true, subtree: true });
  }

  installDebug() {
    const win = this.document.defaultView || globalThis;
    win.__blobioSmoothChatDebug = () => ({
      enabled: readInGameUiSettings(this.storage).smoothChat,
      chatFound: Boolean(this.document.querySelector?.('#chat')),
      listFound: Boolean(this.chatList),
      observerActive: Boolean(this.chatObserver),
      nearBottom: this.nearChatBottom,
      scrollHeight: Number(this.chatElement?.scrollHeight) || 0,
      scrollTop: Number(this.chatElement?.scrollTop) || 0,
      ...this.stats,
    });
  }

  destroy() {
    this.pageObserver?.disconnect();
    this.pageObserver = null;
    this.disconnectSmoothChat();

    const win = this.document.defaultView || globalThis;
    for (const timer of this.messageTimers) {
      win.clearTimeout?.(timer);
    }
    this.messageTimers.clear();

    const chat = this.document.querySelector?.('#chat');
    chat?.classList?.remove('blobio-chat-background-enabled', 'blobio-chat-outline-enabled');
    removeCssVariable(chat, '--blobio-chat-background');
    removeCssVariable(chat, '--blobio-chat-outline');
    this.chatOutlineTarget?.classList?.remove('blobio-chat-outline-enabled');
    removeCssVariable(this.chatOutlineTarget, '--blobio-chat-outline');
    this.chatOutlineTarget = null;

    const leaderboard = this.document.querySelector?.('#leader-board-wrapper');
    leaderboard?.classList?.remove(
      'blobio-leaderboard-background-enabled',
      'blobio-leaderboard-outline-enabled',
      'blobio-leaderboard-font-size-enabled',
    );
    removeCssVariable(leaderboard, '--blobio-leaderboard-background');
    removeCssVariable(leaderboard, '--blobio-leaderboard-outline');
    removeCssVariable(leaderboard, '--blobio-leaderboard-font-size');
    leaderboard?.classList?.remove(
      'blobio-leaderboard-resizable',
      'blobio-leaderboard-relative',
      'blobio-leaderboard-custom-size',
      'blobio-leaderboard-is-resizing',
    );
    this.leaderboardResizeHandle?.remove?.();
    this.leaderboardResizeHandle = null;
    this.leaderboardWrapper = null;
    this.leaderboardResizeState = null;

    if (this.leaderboardPointerMoveHandler) {
      this.document.removeEventListener?.('pointermove', this.leaderboardPointerMoveHandler, true);
      this.document.removeEventListener?.('pointerup', this.leaderboardPointerUpHandler, true);
      this.document.removeEventListener?.('pointercancel', this.leaderboardPointerUpHandler, true);
      this.leaderboardPointerMoveHandler = null;
      this.leaderboardPointerUpHandler = null;
    }

    this.applyCaptchaLogo(false);
    try { delete win.__blobioSmoothChatDebug; } catch {}
    this.started = false;
  }
}
