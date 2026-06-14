import { normalizeUid } from '../roles/RoleRegistry.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';

export const MUTED_PLAYERS_ENABLED_KEY = 'blobio.chat.mutedPlayers.enabled';
export const MUTED_PLAYERS_LIST_KEY = 'blobio.chat.mutedPlayers.list';

const MAX_SAVED_NAME_LENGTH = 40;


function readEnabled(storage) {
  try {
    return storage?.getItem?.(MUTED_PLAYERS_ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

function readPlayers(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(MUTED_PLAYERS_LIST_KEY) || '[]');
    if (!Array.isArray(parsed)) {
      return new Map();
    }

    const players = new Map();
    for (const entry of parsed) {
      const uid = normalizeUid(entry?.uid);
      if (!uid || players.has(uid)) {
        continue;
      }

      players.set(uid, String(entry?.name || '').trim().slice(0, MAX_SAVED_NAME_LENGTH));
    }
    return players;
  } catch {
    return new Map();
  }
}

export class MutedPlayersStore {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    logger = console,
  } = {}) {
    this.storage = storage;
    this.logger = logger;
    this.enabled = readEnabled(storage);
    this.players = readPlayers(storage);
    this.listeners = new Set();
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled) {
    const nextEnabled = Boolean(enabled);
    if (nextEnabled === this.enabled) {
      return this.enabled;
    }

    this.enabled = nextEnabled;
    try {
      this.storage?.setItem?.(MUTED_PLAYERS_ENABLED_KEY, nextEnabled ? '1' : '0');
    } catch (error) {
      this.logger.warn?.('[Blobio] Muted-player setting could not be saved.', error);
    }
    this.notify('enabled');
    return this.enabled;
  }

  isMuted(rawUid) {
    const uid = normalizeUid(rawUid);
    return Boolean(uid && this.players.has(uid));
  }

  getPlayers() {
    return Array.from(this.players, ([uid, name]) => ({ uid, name }));
  }

  add(rawUid) {
    const uid = normalizeUid(rawUid);
    if (!uid || this.players.has(uid)) {
      return false;
    }

    this.players.set(uid, '');
    this.savePlayers();
    this.notify('players');
    return true;
  }

  remove(rawUids) {
    const uids = Array.isArray(rawUids) ? rawUids : [rawUids];
    let changed = false;

    for (const rawUid of uids) {
      const uid = normalizeUid(rawUid);
      if (uid && this.players.delete(uid)) {
        changed = true;
      }
    }

    if (changed) {
      this.savePlayers();
      this.notify('players');
    }
    return changed;
  }

  setName(rawUid, value) {
    const uid = normalizeUid(rawUid);
    if (!uid || !this.players.has(uid)) {
      return false;
    }

    const name = String(value || '').trim().slice(0, MAX_SAVED_NAME_LENGTH);
    if (this.players.get(uid) === name) {
      return true;
    }

    this.players.set(uid, name);
    this.savePlayers();
    this.notify('players');
    return true;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    this.listeners.add(listener);
    listener(this.getSnapshot(), 'current');
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return {
      enabled: this.enabled,
      players: this.getPlayers(),
    };
  }

  savePlayers() {
    try {
      this.storage?.setItem?.(MUTED_PLAYERS_LIST_KEY, JSON.stringify(this.getPlayers()));
    } catch (error) {
      this.logger.warn?.('[Blobio] Muted-player list could not be saved.', error);
    }
  }

  notify(source) {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot, source);
      } catch (error) {
        this.logger.warn?.('[Blobio] Muted-player listener failed.', error);
      }
    }
  }

  destroy() {
    this.listeners.clear();
  }
}
