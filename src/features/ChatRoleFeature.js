import { CHAT_ROLE_CSS, CHAT_ROLE_STYLE_ID } from '../css/RoleFeatureStyles.js';
import { normalizeUid } from '../roles/RoleRegistry.js';
import { isHideAdminMdEnabled } from '../roles/RoleSettings.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';

const EXTENSION_TAG_CLASS = 'blobio-extension-chat-tag';
const MESSAGE_BODY_CLASS = 'blobio-chat-message-body';

export class ChatRoleFeature {
  constructor({
    document = globalThis.document,
    roleRegistry,
    mutedPlayersStore = null,
    storage = createBlobioStorage(document),
    logger = console,
  } = {}) {
    this.document = document;
    this.roleRegistry = roleRegistry;
    this.mutedPlayersStore = mutedPlayersStore;
    this.storage = storage;
    this.logger = logger;
    this.styleNode = null;
    this.pageObserver = null;
    this.chatObserver = null;
    this.chatList = null;
    this.unsubscribeRoles = null;
    this.unsubscribeMutedPlayers = null;
    this.started = false;
  }

  start() {
    if (this.started || !this.document?.documentElement) {
      return Boolean(this.started);
    }

    this.started = true;
    this.ensureStyle();
    this.unsubscribeRoles = this.roleRegistry?.subscribe?.(() => this.reprocessExistingMessages());
    this.unsubscribeMutedPlayers = this.mutedPlayersStore?.subscribe?.(() => this.reprocessExistingMessages());
    this.attachChatObserver();
    this.observeForChat();
    return true;
  }

  ensureStyle() {
    const existing = this.document.getElementById?.(CHAT_ROLE_STYLE_ID);
    if (existing) {
      this.styleNode = existing;
      return;
    }

    const style = this.document.createElement('style');
    style.id = CHAT_ROLE_STYLE_ID;
    style.textContent = CHAT_ROLE_CSS;
    (this.document.head || this.document.documentElement).appendChild(style);
    this.styleNode = style;
  }

  findChatList() {
    return this.document.querySelector?.('#chat > ul') || this.document.querySelector?.('#chat ul');
  }

  attachChatObserver() {
    const chatList = this.findChatList();
    if (!chatList || chatList === this.chatList) {
      return;
    }

    this.chatObserver?.disconnect();
    this.chatList = chatList;
    this.processMessages(chatList.querySelectorAll?.('li') || [], true);

    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return;
    }

    this.chatObserver = new MutationObserver((mutations) => {
      const messages = new Set();

      for (const mutation of mutations) {
        if (String(mutation.target?.tagName || '').toUpperCase() === 'LI') {
          messages.add(mutation.target);
        }

        for (const node of mutation.addedNodes || []) {
          if (String(node?.tagName || '').toUpperCase() === 'LI') {
            messages.add(node);
          }

          for (const message of node?.querySelectorAll?.('li') || []) {
            messages.add(message);
          }
        }
      }

      this.processMessages(messages);
    });
    this.chatObserver.observe(chatList, { childList: true, subtree: true });
  }

  observeForChat() {
    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return;
    }

    this.pageObserver = new MutationObserver((mutations) => {
      if (this.chatList && this.isConnected(this.chatList)) {
        return;
      }

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes || []) {
          if (this.nodeContainsChat(node)) {
            this.attachChatObserver();
            return;
          }
        }
      }
    });
    this.pageObserver.observe(this.document.documentElement, { childList: true, subtree: true });
  }

  nodeContainsChat(node) {
    if (node?.id === 'chat') {
      return true;
    }

    return Boolean(node?.querySelector?.('#chat'));
  }

  isConnected(node) {
    if (!node) {
      return false;
    }

    if (typeof node.isConnected === 'boolean') {
      return node.isConnected;
    }

    return Boolean(this.document.documentElement?.contains?.(node));
  }

  reprocessExistingMessages() {
    this.attachChatObserver();
    this.processMessages(this.chatList?.querySelectorAll?.('li') || [], true);
  }

  processMessages(messages, force = false) {
    for (const message of messages) {
      this.processMessage(message, force);
    }
  }

  processMessage(message, force = false) {
    const uid = normalizeUid(message?.getAttribute?.('uid'));
    if (!uid) {
      return;
    }

    const roles = this.roleRegistry?.getRoles?.(uid) || {
      vip: { active: false },
      admin: false,
    };
    const currentSpans = Array.from(message.children || [])
      .filter((child) => String(child.tagName).toUpperCase() === 'SPAN');
    const hasBuiltInMd = currentSpans.some((span) => (
      !span.classList?.contains?.(EXTENSION_TAG_CLASS)
      && String(span.textContent || '').trim() === '[MD]'
    ));
    const protectedPlayer = roles.admin || hasBuiltInMd;
    if (protectedPlayer && this.mutedPlayersStore?.isMuted?.(uid)) {
      this.mutedPlayersStore.remove(uid);
    }

    const hideAdminMd = isHideAdminMdEnabled(this.storage);
    const muted = !protectedPlayer && (this.mutedPlayersStore?.isMuted?.(uid) || false);
    const signature = `${uid}:${roles.admin ? 1 : 0}:${roles.vip.active ? 1 : 0}:${hideAdminMd ? 1 : 0}:${muted ? 1 : 0}`;
    if (!force && message.dataset.blobioRoleSignature === signature) {
      return;
    }

    this.toggleClass(message, 'blobio-chat-muted-message', muted);
    if (muted) {
      message.setAttribute?.('aria-hidden', 'true');
    } else {
      message.removeAttribute?.('aria-hidden');
    }
    message.dataset.blobioRoleSignature = signature;
    if (muted) {
      return;
    }

    this.removeExtensionTags(message);
    const spans = Array.from(message.children || [])
      .filter((child) => String(child.tagName).toUpperCase() === 'SPAN');
    if (spans.length < 2) {
      return;
    }

    const username = spans[0];
    const messageSpan = spans.slice(1).find((span) => /^\s*:/.test(span.textContent || '')) || spans.at(-1);
    const messageIndex = spans.indexOf(messageSpan);
    const builtInTags = messageIndex > 1 ? spans.slice(1, messageIndex) : [];

    for (const tag of builtInTags) {
      const text = String(tag.textContent || '').trim();
      if (text === '[VIP]') {
        this.toggleClass(tag, 'blobio-chat-built-in-vip-hidden', roles.vip.active);
      }
      if (text === '[MD]') {
        this.toggleClass(tag, 'blobio-chat-built-in-md-hidden', roles.admin && hideAdminMd);
      }
    }

    this.toggleClass(username, 'blobio-chat-admin-username', roles.admin);
    this.toggleClass(messageSpan, 'blobio-chat-admin-message', false);

    const messageBody = this.getMessageBody(messageSpan, roles.admin);
    if (messageBody) {
      this.toggleClass(messageBody, 'blobio-chat-admin-message', roles.admin);
    }

    if (roles.admin) {
      message.insertBefore(this.createTag(' [ADMIN]', 'blobio-chat-admin-tag'), messageSpan);
    }

    if (roles.vip.active) {
      const vipTag = this.createTag(' [VIP+]', 'blobio-chat-vip-plus-tag');
      if (roles.admin) {
        vipTag.classList.add('is-admin-combined');
      }
      message.insertBefore(vipTag, messageSpan);
    }

    message.dataset.blobioRoleSignature = signature;
  }

  getMessageBody(messageSpan, create) {
    if (!messageSpan) {
      return null;
    }

    const existing = Array.from(messageSpan.children || [])
      .find((child) => child.classList?.contains?.(MESSAGE_BODY_CLASS));
    if (existing || !create) {
      return existing || null;
    }

    const body = this.document.createElement('span');
    body.classList.add(MESSAGE_BODY_CLASS);

    const childNodes = Array.from(messageSpan.childNodes || []);
    for (let index = 0; index < childNodes.length; index += 1) {
      const node = childNodes[index];
      if (node?.nodeType !== 3) {
        continue;
      }

      const match = String(node.nodeValue || '').match(/^(\s*:\s*)([\s\S]*)$/);
      if (!match) {
        continue;
      }

      node.nodeValue = match[1];
      if (match[2]) {
        body.appendChild(this.document.createTextNode(match[2]));
      }

      for (const following of childNodes.slice(index + 1)) {
        body.appendChild(following);
      }
      messageSpan.appendChild(body);
      return body;
    }

    const match = String(messageSpan.textContent || '').match(/^(\s*:\s*)([\s\S]*)$/);
    if (!match) {
      return null;
    }

    messageSpan.textContent = match[1];
    body.textContent = match[2];
    messageSpan.appendChild(body);
    return body;
  }

  createTag(text, className) {
    const tag = this.document.createElement('span');
    tag.classList.add(EXTENSION_TAG_CLASS, className);
    tag.textContent = text;
    return tag;
  }

  removeExtensionTags(message) {
    for (const tag of message.querySelectorAll?.(`.${EXTENSION_TAG_CLASS}`) || []) {
      tag.remove();
    }
  }

  toggleClass(node, className, enabled) {
    if (enabled) {
      node.classList.add(className);
    } else {
      node.classList.remove(className);
    }
  }

  destroy() {
    this.pageObserver?.disconnect();
    this.chatObserver?.disconnect();
    this.pageObserver = null;
    this.chatObserver = null;
    this.chatList = null;
    this.unsubscribeRoles?.();
    this.unsubscribeMutedPlayers?.();
    this.unsubscribeRoles = null;
    this.unsubscribeMutedPlayers = null;
    for (const message of this.document.querySelectorAll?.('#chat li.blobio-chat-muted-message') || []) {
      message.classList.remove('blobio-chat-muted-message');
      message.removeAttribute?.('aria-hidden');
    }

    this.styleNode?.remove();
    this.styleNode = null;
    this.started = false;
  }
}
