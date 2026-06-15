import { createBlobioStorage } from '../storage/BlobioStorage.js';
import {
  LEADERBOARD_SIZE_LIMITS,
  readInGameUiSettings,
  setLeaderboardSizeSetting,
} from '../settings/InGameUiSettings.js';

const CHAT_NEAR_BOTTOM_PX = 36;
const MESSAGE_ANIMATION_MS = 560;
const CHAT_SHIFT_ANIMATION_MS = 620;
const CHAT_SHIFT_DECAY_MS = CHAT_SHIFT_ANIMATION_MS / Math.log(100);
const CHAT_SHIFT_SETTLE_PX = 0.5;
const CHAT_MESSAGE_FALLBACK_HEIGHT = 24;

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

function isRecaptchaAnchorFrame(frame) {
  return /\/recaptcha\/(?:api2|enterprise)\/anchor(?:[/?#]|$)/.test(String(frame?.src || ''));
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
    this.chatShiftFrame = null;
    this.chatShiftOffset = 0;
    this.chatShiftLastFrameAt = null;
    this.lastChatMessageHeight = 0;
    this.chatMutationFrame = null;
    this.pendingChatMessages = [];
    this.pendingChatShift = 0;
    this.pendingChatWasNearBottom = null;
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
      continuedShiftAnimations: 0,
      mutationFlushes: 0,
      lastShiftPx: 0,
      lastMeasuredAddedHeight: 0,
      lastBottomDistance: 0,
      zeroShiftFlushes: 0,
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
    const hiddenState = Boolean(hidden);
    const applyInDocument = (documentRef) => {
      let changed = false;
      for (const logo of documentRef?.querySelectorAll?.('.rc-anchor-logo-img, .rc-anchor-logo-img-large') || []) {
        logo.classList.toggle('blobio-captcha-logo-hidden', hiddenState);
        logo.closest?.('.rc-anchor-logo-portrait, .rc-anchor-logo-landscape')
          ?.classList?.toggle('blobio-captcha-logo-block-hidden', hiddenState);
        changed = true;
      }
      return changed;
    };

    let changed = applyInDocument(this.document);
    for (const frame of this.document.querySelectorAll?.('iframe[src*="recaptcha"]') || []) {
      if (isRecaptchaAnchorFrame(frame)) {
        frame.classList?.toggle('blobio-captcha-anchor-hidden', hiddenState);
        frame.closest?.('.grecaptcha-badge')
          ?.classList?.toggle('blobio-captcha-anchor-hidden', hiddenState);
        changed = true;
      }

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
    const wasNearBottom = this.wasNearChatBottomBeforeMutation(previousHeight);
    const addedMessages = [];

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes || []) {
        if (node?.nodeType === 1 && String(node.tagName || '').toLowerCase() === 'li') {
          addedMessages.push(node);
        }
      }
    }

    if (addedMessages.length === 0) {
      return;
    }

    this.stats.addedMessages += addedMessages.length;
    this.stats.lastMutationAt = Date.now();

    const currentHeight = Number(this.chatElement?.scrollHeight) || previousHeight;
    const measuredAddedHeight = this.measureChatMessages(addedMessages);
    const shift = Math.max(0, currentHeight - previousHeight, measuredAddedHeight);

    if (this.pendingChatWasNearBottom === null) {
      this.pendingChatWasNearBottom = wasNearBottom;
    }
    this.pendingChatMessages.push(...addedMessages);
    this.pendingChatShift += shift;

    this.lastChatScrollHeight = currentHeight;
    this.lastChatScrollTop = Number(this.chatElement?.scrollTop) || 0;
    this.nearChatBottom = this.isNearChatBottom();
    this.scheduleChatMutationFlush();
  }

  measureChatMessages(messages) {
    let total = 0;

    for (const message of messages) {
      const rectHeight = Number(message?.getBoundingClientRect?.().height) || 0;
      const elementHeight = Math.max(
        Number(message?.offsetHeight) || 0,
        Number(message?.scrollHeight) || 0,
      );

      let contentHeight = 0;
      let contentTop = Infinity;
      let contentBottom = -Infinity;
      for (const child of message?.children || []) {
        const rect = child?.getBoundingClientRect?.();
        const top = Number(rect?.top);
        const bottom = Number(rect?.bottom);
        if (Number.isFinite(top) && Number.isFinite(bottom) && bottom > top) {
          contentTop = Math.min(contentTop, top);
          contentBottom = Math.max(contentBottom, bottom);
        }
      }
      if (Number.isFinite(contentTop) && Number.isFinite(contentBottom)) {
        contentHeight = contentBottom - contentTop;
      }

      const win = this.document.defaultView || globalThis;
      let style = null;
      try {
        style = win.getComputedStyle?.(message) || null;
      } catch {
        style = null;
      }

      const marginHeight = Math.max(0, Number.parseFloat(style?.marginTop) || 0)
        + Math.max(0, Number.parseFloat(style?.marginBottom) || 0);
      const fontSize = Number.parseFloat(style?.fontSize) || 0;
      const lineHeight = Number.parseFloat(style?.lineHeight) || (fontSize > 0 ? fontSize * 1.2 : 0);
      const measuredHeight = Math.max(rectHeight, elementHeight, contentHeight, lineHeight);

      if (measuredHeight >= 1) {
        this.lastChatMessageHeight = measuredHeight + marginHeight;
      }
      total += measuredHeight >= 1
        ? measuredHeight + marginHeight
        : this.lastChatMessageHeight || CHAT_MESSAGE_FALLBACK_HEIGHT;
    }

    return total;
  }

  scheduleChatMutationFlush() {
    if (this.chatMutationFrame !== null) {
      return;
    }

    const win = this.document.defaultView || globalThis;
    const flush = () => {
      this.chatMutationFrame = null;
      this.flushChatMutations();
    };

    if (typeof win.requestAnimationFrame === 'function') {
      this.chatMutationFrame = win.requestAnimationFrame(flush);
    } else {
      flush();
    }
  }

  flushChatMutations() {
    const messages = [...new Set(this.pendingChatMessages)];
    const pendingShift = this.pendingChatShift;
    const wasNearBottom = this.pendingChatWasNearBottom !== false;

    this.pendingChatMessages = [];
    this.pendingChatShift = 0;
    this.pendingChatWasNearBottom = null;

    if (messages.length === 0) {
      return;
    }

    this.stats.mutationFlushes += 1;

    if (wasNearBottom) {
      const measuredAddedHeight = this.measureChatMessages(messages);
      const bottomDistance = this.getChatBottomDistance();
      const shift = Math.max(pendingShift, measuredAddedHeight, bottomDistance);

      this.stats.lastMeasuredAddedHeight = Math.round(measuredAddedHeight);
      this.stats.lastBottomDistance = Math.round(bottomDistance);
      if (shift < 1) {
        this.stats.zeroShiftFlushes += 1;
      }

      this.scrollChatToBottom();
      this.animateChatShift(shift, messages);
    } else {
      for (const message of messages) {
        this.animateMessage(message);
      }
    }

    this.lastChatScrollHeight = Number(this.chatElement?.scrollHeight) || this.lastChatScrollHeight;
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

    const distance = Math.max(0, Number(shift) || 0);
    if (distance < 1) {
      return;
    }

    const win = this.document.defaultView || globalThis;
    const isContinuing = this.chatShiftFrame !== null || this.chatShiftOffset >= CHAT_SHIFT_SETTLE_PX;
    if (isContinuing) {
      this.stats.continuedShiftAnimations += 1;
    }

    this.chatShiftOffset += distance;
    this.stats.shiftAnimations += 1;
    this.stats.lastShiftPx = Math.round(this.chatShiftOffset);

    setCssVariable(list, '--blobio-chat-shift-offset', `${this.chatShiftOffset}px`);
    list.classList?.add('blobio-chat-list-shifting');

    if (this.chatShiftFrame !== null) {
      return;
    }
    if (typeof win.requestAnimationFrame !== 'function') {
      this.finishChatShiftAnimation();
      return;
    }

    const run = (timestamp) => {
      this.chatShiftFrame = null;
      if (!this.chatList || this.chatList !== list) {
        this.finishChatShiftAnimation();
        return;
      }

      const frameTime = Number(timestamp) || 0;
      if (this.chatShiftLastFrameAt === null) {
        this.chatShiftLastFrameAt = frameTime;
      } else {
        const elapsed = Math.max(0, frameTime - this.chatShiftLastFrameAt);
        this.chatShiftLastFrameAt = frameTime;
        this.chatShiftOffset *= Math.exp(-elapsed / CHAT_SHIFT_DECAY_MS);
      }

      if (this.chatShiftOffset < CHAT_SHIFT_SETTLE_PX) {
        this.finishChatShiftAnimation();
        return;
      }

      setCssVariable(list, '--blobio-chat-shift-offset', `${this.chatShiftOffset}px`);
      this.chatShiftFrame = win.requestAnimationFrame(run);
    };

    this.chatShiftFrame = win.requestAnimationFrame(run);
  }

  cancelChatShiftAnimation() {
    const win = this.document.defaultView || globalThis;
    if (this.chatShiftFrame !== null) {
      win.cancelAnimationFrame?.(this.chatShiftFrame);
      this.chatShiftFrame = null;
    }
    this.finishChatShiftAnimation();
  }

  finishChatShiftAnimation() {
    this.chatShiftOffset = 0;
    this.chatShiftLastFrameAt = null;
    this.chatList?.classList?.remove('blobio-chat-list-shifting');
    removeCssVariable(this.chatList, '--blobio-chat-shift-offset');
  }

  getChatBottomDistance() {
    const chat = this.chatElement;
    if (!chat) {
      return 0;
    }

    const target = Math.max(
      0,
      (Number(chat.scrollHeight) || 0) - (Number(chat.clientHeight) || 0),
    );
    return Math.max(0, target - (Number(chat.scrollTop) || 0));
  }

  scrollChatToBottom() {
    const chat = this.chatElement;
    if (!chat) {
      return;
    }

    this.stats.smoothScrollCalls += 1;
    const target = Math.max(
      0,
      (Number(chat.scrollHeight) || 0) - (Number(chat.clientHeight) || 0),
    );

    const style = chat.style;
    const previousBehavior = style?.getPropertyValue?.('scroll-behavior') || '';
    const previousPriority = style?.getPropertyPriority?.('scroll-behavior') || '';
    style?.setProperty?.('scroll-behavior', 'auto', 'important');
    chat.scrollTop = target;

    if (previousBehavior) {
      style?.setProperty?.('scroll-behavior', previousBehavior, previousPriority);
    } else {
      style?.removeProperty?.('scroll-behavior');
    }
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

  wasNearChatBottomBeforeMutation(previousHeight) {
    const chat = this.chatElement;
    if (!chat) {
      return true;
    }

    const height = Number(previousHeight);
    const scrollTop = Number(this.lastChatScrollTop);
    const clientHeight = Number(chat.clientHeight);
    if (!Number.isFinite(height) || !Number.isFinite(scrollTop) || !Number.isFinite(clientHeight)) {
      return this.nearChatBottom;
    }

    return this.nearChatBottom || height - scrollTop - clientHeight <= CHAT_NEAR_BOTTOM_PX;
  }

  disconnectSmoothChat() {
    this.chatObserver?.disconnect();
    this.chatObserver = null;

    const win = this.document.defaultView || globalThis;
    if (this.chatMutationFrame !== null) {
      win.cancelAnimationFrame?.(this.chatMutationFrame);
      this.chatMutationFrame = null;
    }
    this.pendingChatMessages = [];
    this.pendingChatShift = 0;
    this.pendingChatWasNearBottom = null;
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
    this.lastChatMessageHeight = 0;
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
            || (String(node?.tagName || '').toLowerCase() === 'ul' && node?.parentElement?.id === 'chat')
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
      shiftActive: this.chatShiftFrame !== null || this.chatShiftOffset >= CHAT_SHIFT_SETTLE_PX,
      reducedMotion: Boolean(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
      currentShiftPx: Math.round(this.chatShiftOffset),
      pendingMessages: this.pendingChatMessages.length,
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
