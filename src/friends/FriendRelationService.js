import { normalizeUid } from '../roles/RoleRegistry.js';

const API_HOST = 'api.blobgame.io';
const API_ROOT = 'https://api.blobgame.io:988/api';
const ACCESS_TOKEN_KEY = 'access-token';
const PLATFORM = '3';
const API_VERSION = '4.7';
const TOKEN_RETRY_DELAY_MS = 1000;
const MAX_TOKEN_RETRIES = 30;

function toUrl(value, baseUrl) {
  try {
    return new URL(String(value || ''), baseUrl);
  } catch {
    return null;
  }
}

function sameUidSet(left, right) {
  if (left.size !== right.size) {
    return false;
  }

  for (const uid of left) {
    if (!right.has(uid)) {
      return false;
    }
  }

  return true;
}

function parseRequestBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      try {
        return Object.fromEntries(new URLSearchParams(body).entries());
      } catch {
        return {};
      }
    }
  }

  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries());
  }

  return {};
}

function decodeUserId(token) {
  try {
    const payload = String(token || '').split('.')[1];
    if (!payload) {
      return '';
    }

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return normalizeUid(JSON.parse(atob(padded)).userId);
  } catch {
    return '';
  }
}

function directUidFromRecord(record) {
  if (!record || typeof record !== 'object') {
    return '';
  }

  for (const key of ['target_id', 'targetId', 'friend_id', 'friendId', 'uid', 'u_id', 'user_id', 'accountId', 'id']) {
    const uid = normalizeUid(record[key]);
    if (uid) {
      return uid;
    }
  }

  return '';
}

function acceptedListUidFromRecord(record, rawOwnUid = '') {
  if (!record || typeof record !== 'object') {
    return '';
  }

  const ownUid = normalizeUid(rawOwnUid);

  // getRelations?status=1 already limits the response to accepted friends.
  // A record-level status can describe the returned user rather than the relation.
  for (const key of ['id', 'uid', 'u_id', 'user_id', 'target_id', 'targetId', 'accountId']) {
    const uid = normalizeUid(record[key]);
    if (uid && uid !== ownUid) {
      return uid;
    }
  }

  for (const key of ['friend', 'target', 'otherUser', 'relatedUser', 'profile', 'user']) {
    const uid = directUidFromRecord(record[key]);
    if (uid && uid !== ownUid) {
      return uid;
    }
  }

  const firstUid = normalizeUid(record.user_id1);
  const secondUid = normalizeUid(record.user_id2);
  if (ownUid) {
    if (firstUid === ownUid && secondUid) {
      return secondUid;
    }
    if (secondUid === ownUid && firstUid) {
      return firstUid;
    }
  }

  const actionUid = normalizeUid(record.action_user_id);
  if (actionUid === firstUid && secondUid) {
    return secondUid;
  }
  if (actionUid === secondUid && firstUid) {
    return firstUid;
  }

  return '';
}

export function friendUidFromRecord(record, rawOwnUid = '') {
  if (!record || typeof record !== 'object') {
    return '';
  }

  if (record.status !== undefined && Number(record.status) !== 1) {
    return '';
  }

  const ownUid = normalizeUid(rawOwnUid);

  for (const key of ['friend', 'target', 'otherUser', 'relatedUser', 'profile', 'user']) {
    const nestedUid = directUidFromRecord(record[key]);
    if (nestedUid && nestedUid !== ownUid) {
      return nestedUid;
    }
  }

  const firstUid = normalizeUid(record.user_id1);
  const secondUid = normalizeUid(record.user_id2);
  if (firstUid || secondUid) {
    if (ownUid) {
      if (firstUid === ownUid && secondUid) {
        return secondUid;
      }
      if (secondUid === ownUid && firstUid) {
        return firstUid;
      }
    }

    const actionUid = normalizeUid(record.action_user_id);
    if (actionUid && actionUid === firstUid && secondUid) {
      return secondUid;
    }
    if (actionUid && actionUid === secondUid && firstUid) {
      return firstUid;
    }
  }

  const directUid = directUidFromRecord(record);
  return directUid !== ownUid ? directUid : '';
}

export function extractAcceptedFriendUids(payload, rawOwnUid = '') {
  const records = Array.isArray(payload?.result)
    ? payload.result
    : Array.isArray(payload)
      ? payload
      : [];
  const ownUid = normalizeUid(rawOwnUid);
  const uids = new Set();

  for (const record of records) {
    const uid = acceptedListUidFromRecord(record, ownUid);
    if (uid) {
      uids.add(uid);
    }
  }

  return uids;
}

export function isAcceptedFriendRelation(payload, rawTargetUid) {
  const targetUid = normalizeUid(rawTargetUid);
  const records = Array.isArray(payload?.result) ? payload.result : [];
  if (!targetUid) {
    return false;
  }

  return records.some((record) => {
    if (Number(record?.status) !== 1) {
      return false;
    }

    return normalizeUid(record.user_id1) === targetUid
      || normalizeUid(record.user_id2) === targetUid
      || friendUidFromRecord(record) === targetUid;
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
    this.window = document?.defaultView || globalThis;
    this.friendHighlightStore = friendHighlightStore;
    this.fetchFn = fetchFn || this.window.fetch?.bind(this.window) || globalThis.fetch?.bind(globalThis);
    this.logger = logger;
    this.friendUids = new Set();
    this.listeners = new Set();
    this.accessToken = '';
    this.ownUid = '';
    this.loadedToken = '';
    this.loadPromise = null;
    this.unsubscribeSetting = null;
    this.storageHandler = null;
    this.tokenRetryTimer = null;
    this.tokenRetryCount = 0;
    this.fetchWrapper = null;
    this.nativeFetch = null;
    this.xhrPrototype = null;
    this.nativeXhrOpen = null;
    this.nativeXhrSend = null;
    this.xhrOpenWrapper = null;
    this.xhrSendWrapper = null;
    this.started = false;
  }

  start() {
    if (this.started) {
      return true;
    }

    this.started = true;
    this.installFetchHook();
    this.installXhrHook();
    this.installTokenListener();
    this.unsubscribeSetting = this.friendHighlightStore?.subscribe?.((snapshot, source) => {
      if (snapshot.enabled) {
        this.refresh(source !== 'current');
      }
      this.notify('', 'setting');
    });

    if (!this.unsubscribeSetting && this.friendHighlightStore?.isEnabled?.()) {
      this.refresh(false);
    }

    return true;
  }

  isFriend(rawUid) {
    const uid = normalizeUid(rawUid);
    return Boolean(uid && this.friendUids.has(uid));
  }

  getFriendUids() {
    return [...this.friendUids];
  }

  readAccessToken() {
    try {
      const token = this.window.localStorage?.getItem?.(ACCESS_TOKEN_KEY);
      return token && token !== 'null' && token !== 'undefined' ? String(token).trim() : '';
    } catch {
      return '';
    }
  }

  refresh(force = false) {
    if (!this.friendHighlightStore?.isEnabled?.()) {
      return Promise.resolve(false);
    }

    const token = this.readAccessToken();
    if (!token) {
      this.setToken('');
      this.scheduleTokenRetry();
      return Promise.resolve(false);
    }

    this.clearTokenRetry();

    const tokenChanged = token !== this.accessToken;
    if (tokenChanged) {
      this.setToken(token);
    }

    if (!force && this.loadedToken === token) {
      return Promise.resolve(false);
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    if (typeof this.fetchFn !== 'function') {
      this.logger.warn?.('[Blobio] Friends-highlight could not load friends because fetch is unavailable.');
      return Promise.resolve(false);
    }

    const url = new URL(`${API_ROOT}/users/getRelations/`);
    url.searchParams.set('status', '1');
    url.searchParams.set('api_ver', API_VERSION);
    url.searchParams.set('pl', PLATFORM);
    url.searchParams.set('token', token);

    this.loadPromise = this.fetchFn(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
    })
      .then((response) => {
        if (!response?.ok) {
          throw new Error(`friends request failed with HTTP ${response?.status || 0}`);
        }
        return response.json();
      })
      .then((payload) => {
        if (token !== this.accessToken) {
          return false;
        }

        this.loadedToken = token;
        return this.replaceFriendList(payload, 'get-relations');
      })
      .catch((error) => {
        this.logger.warn?.('[Blobio] Could not load accepted friends.', error);
        return false;
      })
      .finally(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  setToken(token) {
    if (token === this.accessToken) {
      return;
    }

    this.accessToken = token;
    this.ownUid = decodeUserId(token);
    this.loadedToken = '';
    if (this.friendUids.size > 0) {
      this.friendUids = new Set();
      this.notify('', 'token');
    }
  }

  replaceFriendList(payload, source = 'friends') {
    const nextUids = extractAcceptedFriendUids(payload, this.ownUid);
    if (sameUidSet(nextUids, this.friendUids)) {
      return false;
    }

    this.friendUids = nextUids;
    this.notify('', source);
    return true;
  }

  addFriend(rawUid, source = 'friend-added') {
    const uid = normalizeUid(rawUid);
    if (!uid || uid === this.ownUid || this.friendUids.has(uid)) {
      return false;
    }

    this.friendUids.add(uid);
    this.notify(uid, source);
    return true;
  }

  removeFriend(rawUid, source = 'friend-removed') {
    const uid = normalizeUid(rawUid);
    if (!uid || !this.friendUids.delete(uid)) {
      return false;
    }

    this.notify(uid, source);
    return true;
  }

  handleApiData(urlText, requestBody, payload) {
    const url = toUrl(urlText, this.window.location?.href || 'https://blobgame.io/');
    if (!url || !payload) {
      return;
    }

    const token = String(url.searchParams.get('token') || '').trim();
    if (token && token !== this.accessToken) {
      this.setToken(token);
    }

    const path = url.pathname.toLowerCase().replace(/\/+$/, '');
    if (path.endsWith('/users/getrelations')) {
      if (url.searchParams.get('status') === '1') {
        this.replaceFriendList(payload, 'api-get-relations');
      }
      return;
    }

    if (path.endsWith('/users/checkrelation')) {
      const targetUid = normalizeUid(url.searchParams.get('target_id'));
      if (!targetUid) {
        return;
      }

      if (isAcceptedFriendRelation(payload, targetUid)) {
        this.addFriend(targetUid, 'api-check-relation');
      } else {
        this.removeFriend(targetUid, 'api-check-relation');
      }
      return;
    }

    if (path.endsWith('/users/setrelation')) {
      const body = parseRequestBody(requestBody);
      const targetUid = normalizeUid(body.target_id || body.targetId);
      if (!targetUid || payload.error || (payload.message && payload.message !== 'OK')) {
        return;
      }

      if (payload.accepted || String(body.status) === '1') {
        this.addFriend(targetUid, 'api-set-relation');
      } else {
        this.removeFriend(targetUid, 'api-set-relation');
      }
    }
  }


  scheduleTokenRetry() {
    if (
      this.tokenRetryTimer !== null
      || this.tokenRetryCount >= MAX_TOKEN_RETRIES
      || !this.friendHighlightStore?.isEnabled?.()
    ) {
      return;
    }

    this.tokenRetryCount += 1;
    this.tokenRetryTimer = this.window.setTimeout?.(() => {
      this.tokenRetryTimer = null;
      this.refresh(false);
    }, TOKEN_RETRY_DELAY_MS) ?? null;
  }

  clearTokenRetry() {
    if (this.tokenRetryTimer !== null) {
      this.window.clearTimeout?.(this.tokenRetryTimer);
      this.tokenRetryTimer = null;
    }
    this.tokenRetryCount = 0;
  }

  installFetchHook() {
    const nativeFetch = this.window.fetch;
    if (typeof nativeFetch !== 'function') {
      return;
    }

    this.nativeFetch = nativeFetch;
    const service = this;
    this.fetchWrapper = function blobioFriendFetch(input, init) {
      const url = typeof input === 'string' ? input : input?.url || String(input || '');
      const responsePromise = nativeFetch.apply(this, arguments);
      service.watchApiResponse(url, init?.body, responsePromise);
      return responsePromise;
    };

    this.window.fetch = this.fetchWrapper;
  }

  watchApiResponse(urlText, requestBody, responsePromise) {
    if (!this.isBlobUsersApiUrl(urlText)) {
      return;
    }

    Promise.resolve(responsePromise)
      .then((response) => {
        const clone = response?.clone?.();
        return clone?.json?.();
      })
      .then((payload) => this.handleApiData(urlText, requestBody, payload))
      .catch(() => {});
  }

  installXhrHook() {
    const prototype = this.window.XMLHttpRequest?.prototype;
    if (!prototype?.open || !prototype?.send) {
      return;
    }

    this.xhrPrototype = prototype;
    this.nativeXhrOpen = prototype.open;
    this.nativeXhrSend = prototype.send;
    const service = this;

    this.xhrOpenWrapper = function blobioFriendOpen(method, url) {
      this.__blobioFriendUrl = url;
      return service.nativeXhrOpen.apply(this, arguments);
    };

    this.xhrSendWrapper = function blobioFriendSend(body) {
      const xhr = this;
      const url = xhr.__blobioFriendUrl;
      if (service.isBlobUsersApiUrl(url)) {
        xhr.addEventListener('load', () => {
          const payload = service.readXhrJson(xhr);
          if (payload) {
            service.handleApiData(url, body, payload);
          }
        });
      }
      return service.nativeXhrSend.apply(this, arguments);
    };

    prototype.open = this.xhrOpenWrapper;
    prototype.send = this.xhrSendWrapper;
  }

  readXhrJson(xhr) {
    try {
      if (xhr.responseType === 'json') {
        return xhr.response;
      }
      if (xhr.responseType && xhr.responseType !== 'text') {
        return null;
      }
      return JSON.parse(xhr.responseText);
    } catch {
      return null;
    }
  }

  isBlobUsersApiUrl(urlText) {
    const url = toUrl(urlText, this.window.location?.href || 'https://blobgame.io/');
    return Boolean(
      url
      && url.hostname === API_HOST
      && url.pathname.toLowerCase().startsWith('/api/users/'),
    );
  }

  installTokenListener() {
    this.storageHandler = (event) => {
      if (event?.key === ACCESS_TOKEN_KEY) {
        this.setToken(this.readAccessToken());
        this.refresh(true);
      }
    };
    this.window.addEventListener?.('storage', this.storageHandler);
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(uid, source) {
    const snapshot = {
      uid: normalizeUid(uid),
      friends: this.getFriendUids(),
    };

    for (const listener of this.listeners) {
      try {
        listener(snapshot, source);
      } catch (error) {
        this.logger.warn?.('[Blobio] Friend relation listener failed.', error);
      }
    }
  }

  destroy() {
    this.unsubscribeSetting?.();
    this.unsubscribeSetting = null;

    if (this.storageHandler) {
      this.window.removeEventListener?.('storage', this.storageHandler);
      this.storageHandler = null;
    }

    if (this.fetchWrapper && this.window.fetch === this.fetchWrapper) {
      this.window.fetch = this.nativeFetch;
    }

    if (this.xhrPrototype) {
      if (this.xhrPrototype.open === this.xhrOpenWrapper) {
        this.xhrPrototype.open = this.nativeXhrOpen;
      }
      if (this.xhrPrototype.send === this.xhrSendWrapper) {
        this.xhrPrototype.send = this.nativeXhrSend;
      }
    }

    this.clearTokenRetry();
    this.friendUids.clear();
    this.listeners.clear();
    this.loadPromise = null;
    this.started = false;
  }
}
