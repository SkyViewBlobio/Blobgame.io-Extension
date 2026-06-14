import { normalizeUid } from '../roles/RoleRegistry.js';

const RELATION_ENDPOINT = 'https://api.blobgame.io:988/api/users/checkRelation';
const ACCESS_TOKEN_KEY = 'access-token';
const PLATFORM = '3';
const API_VERSION = '4.7';
const MAX_CONCURRENT_REQUESTS = 3;

export function isAcceptedFriendRelation(payload, rawTargetUid) {
  const targetUid = normalizeUid(rawTargetUid);
  const relations = Array.isArray(payload?.result) ? payload.result : [];

  if (!targetUid) {
    return false;
  }

  return relations.some((relation) => {
    if (Number(relation?.status) !== 1) {
      return false;
    }

    const firstUid = normalizeUid(relation?.user_id1);
    const secondUid = normalizeUid(relation?.user_id2);
    return firstUid === targetUid || secondUid === targetUid;
  });
}

export class FriendRelationService {
  constructor({
    document = globalThis.document,
    friendHighlightStore,
    fetchFn,
    logger = console,
  } = {}) {
    this.document = document;
    this.friendHighlightStore = friendHighlightStore;
    this.fetchFn = fetchFn || document?.defaultView?.fetch?.bind(document.defaultView) || globalThis.fetch?.bind(globalThis);
    this.logger = logger;
    this.states = new Map();
    this.queue = [];
    this.activeRequests = 0;
    this.listeners = new Set();
    this.unsubscribeSetting = null;
    this.started = false;
  }

  start() {
    if (this.started) {
      return true;
    }

    this.started = true;
    this.unsubscribeSetting = this.friendHighlightStore?.subscribe?.((_snapshot, source) => {
      if (source !== 'current') {
        this.notify('', 'setting');
      }
    });
    return true;
  }

  isFriend(rawUid) {
    const uid = normalizeUid(rawUid);
    return Boolean(uid && this.states.get(uid) === 'friend');
  }

  ensureChecked(rawUid) {
    const uid = normalizeUid(rawUid);
    if (!uid || !this.friendHighlightStore?.isEnabled?.()) {
      return false;
    }

    if (this.states.has(uid)) {
      return false;
    }

    const token = this.readAccessToken();
    if (!token) {
      return false;
    }

    this.states.set(uid, 'pending');
    this.queue.push({ uid, token });
    this.processQueue();
    return true;
  }

  readAccessToken() {
    try {
      return String(this.document?.defaultView?.localStorage?.getItem?.(ACCESS_TOKEN_KEY) || '').trim();
    } catch {
      return '';
    }
  }

  processQueue() {
    while (this.activeRequests < MAX_CONCURRENT_REQUESTS && this.queue.length > 0) {
      const request = this.queue.shift();
      this.activeRequests += 1;
      this.checkRelation(request)
        .catch((error) => {
          this.states.set(request.uid, 'error');
          this.logger.warn?.(`[Blobio] Could not check friend relation for UID ${request.uid}.`, error);
        })
        .finally(() => {
          this.activeRequests -= 1;
          this.processQueue();
        });
    }
  }

  async checkRelation({ uid, token }) {
    if (typeof this.fetchFn !== 'function') {
      throw new Error('fetch is unavailable');
    }

    const url = new URL(RELATION_ENDPOINT);
    url.searchParams.set('target_id', uid);
    url.searchParams.set('pl', PLATFORM);
    url.searchParams.set('api_ver', API_VERSION);
    url.searchParams.set('token', token);

    const response = await this.fetchFn(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
    });

    if (!response?.ok) {
      throw new Error(`relation request failed with HTTP ${response?.status || 0}`);
    }

    const payload = await response.json();
    const isFriend = isAcceptedFriendRelation(payload, uid);
    this.states.set(uid, isFriend ? 'friend' : 'not-friend');
    this.notify(uid, isFriend ? 'friend' : 'not-friend');
    return isFriend;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(uid, source) {
    for (const listener of this.listeners) {
      try {
        listener({ uid, friend: uid ? this.isFriend(uid) : false }, source);
      } catch (error) {
        this.logger.warn?.('[Blobio] Friend relation listener failed.', error);
      }
    }
  }

  destroy() {
    this.unsubscribeSetting?.();
    this.unsubscribeSetting = null;
    this.queue.length = 0;
    this.states.clear();
    this.listeners.clear();
    this.started = false;
  }
}
