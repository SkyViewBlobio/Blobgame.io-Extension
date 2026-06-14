import { createBlobioStorage } from '../storage/BlobioStorage.js';

export const FRIEND_HIGHLIGHT_ENABLED_KEY = 'blobio.settings.friendHighlight';

const STORAGE_BRIDGE_SOURCE = 'BlobioExtensionStorageBridge';

export class FriendHighlightStore {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    logger = console,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.logger = logger;
    this.enabled = false;
    this.listeners = new Set();
    this.gmListenerId = null;
    this.storageHandler = null;
    this.messageHandler = null;
    this.started = false;
  }

  start() {
    if (this.started) {
      return true;
    }

    this.started = true;
    this.reload(false);
    this.installExternalListeners();
    return true;
  }

  installExternalListeners() {
    const win = this.document?.defaultView || globalThis;

    this.storageHandler = (event) => {
      if (event?.key === FRIEND_HIGHLIGHT_ENABLED_KEY) {
        this.reload();
      }
    };
    win.addEventListener?.('storage', this.storageHandler);

    this.messageHandler = (event) => {
      const message = event?.data;
      if (message?.source === STORAGE_BRIDGE_SOURCE && message.key === FRIEND_HIGHLIGHT_ENABLED_KEY) {
        this.reload();
      }
    };
    win.addEventListener?.('message', this.messageHandler);

    const addValueListener = win.GM_addValueChangeListener || globalThis.GM_addValueChangeListener;
    if (typeof addValueListener !== 'function') {
      return;
    }

    try {
      this.gmListenerId = addValueListener(FRIEND_HIGHLIGHT_ENABLED_KEY, () => this.reload());
    } catch (error) {
      this.logger.warn?.('[Blobio] Could not watch Friends-highlight setting.', error);
    }
  }

  reload(notify = true) {
    const enabled = this.readEnabled();
    const changed = enabled !== this.enabled;
    this.enabled = enabled;

    if (changed && notify) {
      this.notify('storage');
    }

    return changed;
  }

  readEnabled() {
    try {
      return this.storage?.getItem?.(FRIEND_HIGHLIGHT_ENABLED_KEY) === '1';
    } catch {
      return false;
    }
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled) {
    const nextEnabled = Boolean(enabled);
    if (nextEnabled === this.enabled) {
      return this.enabled;
    }

    try {
      this.storage?.setItem?.(FRIEND_HIGHLIGHT_ENABLED_KEY, nextEnabled ? '1' : '0');
      this.enabled = nextEnabled;
      this.notify('setting');
    } catch (error) {
      this.logger.warn?.('[Blobio] Could not save Friends-highlight setting.', error);
      this.reload(false);
    }

    return this.enabled;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    this.listeners.add(listener);
    listener({ enabled: this.enabled }, 'current');
    return () => this.listeners.delete(listener);
  }

  notify(source) {
    const snapshot = { enabled: this.enabled };
    for (const listener of this.listeners) {
      try {
        listener(snapshot, source);
      } catch (error) {
        this.logger.warn?.('[Blobio] Friends-highlight listener failed.', error);
      }
    }
  }

  destroy() {
    const win = this.document?.defaultView || globalThis;
    if (this.storageHandler) {
      win.removeEventListener?.('storage', this.storageHandler);
      this.storageHandler = null;
    }
    if (this.messageHandler) {
      win.removeEventListener?.('message', this.messageHandler);
      this.messageHandler = null;
    }

    const removeValueListener = win.GM_removeValueChangeListener || globalThis.GM_removeValueChangeListener;
    if (this.gmListenerId !== null && typeof removeValueListener === 'function') {
      try {
        removeValueListener(this.gmListenerId);
      } catch {}
    }

    this.gmListenerId = null;
    this.listeners.clear();
    this.started = false;
  }
}
