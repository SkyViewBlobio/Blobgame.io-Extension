import { createBlobioStorage } from '../storage/BlobioStorage.js';
import { normalizeUid, ROLE_STORAGE_KEYS } from './RoleRegistry.js';

const PROFILE_MODAL_SELECTOR = '#profile-modal';
const PROFILE_UID_CLASS = 'profile-records-title-userid';
const ACCESS_TOKEN_KEY = 'access-token';
const TOKEN_CHECK_INTERVAL_MS = 1000;

export function parseProfileUid(value) {
  const match = String(value ?? '').match(/\bID\s*:\s*([\d\s]+)/i);
  return normalizeUid(match?.[1] || '');
}

export function parseAccessTokenUid(token, decodeBase64 = globalThis.atob) {
  const parts = String(token || '').split('.');
  if (parts.length < 2 || typeof decodeBase64 !== 'function') {
    return '';
  }

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(decodeBase64(padded));
    return normalizeUid(payload?.userId ?? payload?.user_id ?? '');
  } catch {
    return '';
  }
}

export class ProfileUidDetector {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    logger = console,
    tokenCheckIntervalMs = TOKEN_CHECK_INTERVAL_MS,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.logger = logger;
    this.tokenCheckIntervalMs = tokenCheckIntervalMs;
    this.uid = normalizeUid(storage.getItem(ROLE_STORAGE_KEYS.ownUid));
    this.uidSource = this.uid ? 'cache' : '';
    this.listeners = new Set();
    this.pageObserver = null;
    this.profileObserver = null;
    this.profileModal = null;
    this.clickHandler = null;
    this.storageHandler = null;
    this.tokenInterval = null;
    this.lastAccessToken = null;
    this.started = false;
  }

  start() {
    if (this.started) {
      return true;
    }

    this.started = true;
    this.syncFromAccessToken(true);
    this.attachProfileModal(this.document.querySelector?.(PROFILE_MODAL_SELECTOR));
    this.observeForProfileModal();
    this.installAccessTokenTracking();
    this.installSignOutHandler();
    return true;
  }

  getUid() {
    return this.uid;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    this.listeners.add(listener);
    listener(this.uid);
    return () => this.listeners.delete(listener);
  }

  captureFromProfile(root = this.profileModal || this.document) {
    const node = root?.classList?.contains?.(PROFILE_UID_CLASS)
      ? root
      : root?.querySelector?.(`.${PROFILE_UID_CLASS}`)
        || this.document.querySelector?.(`${PROFILE_MODAL_SELECTOR} .${PROFILE_UID_CLASS}`);
    const uid = parseProfileUid(node?.textContent);
    if (!uid) {
      return false;
    }

    return this.updateUid(uid, 'profile');
  }

  syncFromAccessToken(initial = false) {
    let token = '';
    try {
      token = String(this.storage?.getItem?.(ACCESS_TOKEN_KEY) || '').trim();
    } catch {
      return false;
    }

    if (!initial && token === this.lastAccessToken) {
      return false;
    }

    const previousToken = this.lastAccessToken;
    this.lastAccessToken = token;

    if (token) {
      const win = this.document.defaultView || globalThis;
      const uid = parseAccessTokenUid(token, win.atob || globalThis.atob);
      return uid ? this.updateUid(uid, 'token') : false;
    }

    if (initial && this.uidSource === 'cache') {
      return this.clearUid();
    }

    if (previousToken) {
      return this.clearUid();
    }

    return false;
  }

  installAccessTokenTracking() {
    const win = this.document.defaultView || globalThis;

    if (typeof win.setInterval === 'function') {
      this.tokenInterval = win.setInterval(
        () => this.syncFromAccessToken(),
        this.tokenCheckIntervalMs,
      );
    }

    if (typeof win.addEventListener === 'function') {
      this.storageHandler = (event) => {
        if (!event || event.key === ACCESS_TOKEN_KEY) {
          this.syncFromAccessToken();
        }
      };
      win.addEventListener('storage', this.storageHandler);
    }
  }

  updateUid(uid, source) {
    const normalized = normalizeUid(uid);
    if (!normalized) {
      return false;
    }

    const changed = normalized !== this.uid;
    this.uid = normalized;
    this.uidSource = source;
    this.storage.setItem(ROLE_STORAGE_KEYS.ownUid, normalized);

    if (changed) {
      this.notify();
    }

    return changed;
  }

  clearUid() {
    if (!this.uid && !this.uidSource) {
      return false;
    }

    const changed = Boolean(this.uid);
    this.uid = '';
    this.uidSource = '';
    this.storage.removeItem(ROLE_STORAGE_KEYS.ownUid);

    if (changed) {
      this.notify();
    }

    return changed;
  }

  observeForProfileModal() {
    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    const root = this.document.documentElement;
    if (!MutationObserver || !root) {
      return;
    }

    this.pageObserver = new MutationObserver((mutations) => {
      if (this.profileModal && this.isConnected(this.profileModal)) {
        return;
      }

      if (this.profileModal) {
        this.attachProfileModal(null);
      }

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes || []) {
          const modal = this.findProfileModal(node);
          if (modal) {
            this.attachProfileModal(modal);
            return;
          }
        }
      }
    });

    this.pageObserver.observe(root, { childList: true, subtree: true });
  }

  findProfileModal(node) {
    if (node?.id === 'profile-modal') {
      return node;
    }

    return node?.querySelector?.(PROFILE_MODAL_SELECTOR) || null;
  }

  attachProfileModal(modal) {
    if (modal === this.profileModal) {
      this.captureFromProfile(modal || this.document);
      return;
    }

    this.profileObserver?.disconnect();
    this.profileObserver = null;
    this.profileModal = modal || null;

    if (!this.profileModal) {
      return;
    }

    this.captureFromProfile(this.profileModal);

    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return;
    }

    this.profileObserver = new MutationObserver(() => this.captureFromProfile(this.profileModal));
    this.profileObserver.observe(this.profileModal, {
      childList: true,
      subtree: true,
      characterData: true,
    });
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

  installSignOutHandler() {
    this.clickHandler = (event) => {
      const target = event.target;
      if (!target?.classList?.contains?.('sign-out-link')) {
        return;
      }

      this.lastAccessToken = '';
      this.clearUid();
    };

    this.document.addEventListener?.('click', this.clickHandler);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.uid);
      } catch (error) {
        this.logger.warn?.('[Blobio] UID listener failed.', error);
      }
    }
  }

  destroy() {
    this.pageObserver?.disconnect();
    this.profileObserver?.disconnect();
    this.pageObserver = null;
    this.profileObserver = null;
    this.profileModal = null;

    const win = this.document.defaultView || globalThis;
    if (this.tokenInterval !== null) {
      win.clearInterval?.(this.tokenInterval);
      this.tokenInterval = null;
    }
    if (this.storageHandler) {
      win.removeEventListener?.('storage', this.storageHandler);
      this.storageHandler = null;
    }

    if (this.clickHandler) {
      this.document.removeEventListener?.('click', this.clickHandler);
      this.clickHandler = null;
    }

    this.listeners.clear();
    this.started = false;
  }
}
