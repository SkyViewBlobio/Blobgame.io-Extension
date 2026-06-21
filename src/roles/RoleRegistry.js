import { createBlobioStorage } from '../storage/BlobioStorage.js';

const DEFAULT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_VIP_URL = 'https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Extension/cleanup/data/roles/vip.json';
const DEFAULT_ADMIN_URL = 'https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Extension/cleanup/data/roles/admins.json';
const VIP_CACHE_KEY = 'blobio.roles.vipCache';
const ADMIN_CACHE_KEY = 'blobio.roles.adminCache';

export function normalizeUid(value) {
  const uid = String(value ?? '').replace(/\D/g, '');
  return uid && uid !== '0' ? uid : '';
}

export function parseVipRoleFile(value) {
  const data = parseRoleJson(value, 'VIP');
  const members = new Map();

  for (const [rawUid, entry] of Object.entries(data.members)) {
    const uid = normalizeUid(rawUid);
    if (!uid || !entry || typeof entry !== 'object') {
      continue;
    }

    const rawExpiry = String(entry.expiresAt ?? '').trim();
    if (rawExpiry.toUpperCase() === 'UNLIMITED') {
      members.set(uid, { unlimited: true, expiresAt: null });
      continue;
    }

    const expiresAt = Date.parse(rawExpiry);
    if (Number.isFinite(expiresAt)) {
      members.set(uid, { unlimited: false, expiresAt });
    }
  }

  return {
    schemaVersion: data.schemaVersion,
    updatedAt: String(data.updatedAt || ''),
    members,
  };
}

export function parseAdminRoleFile(value) {
  const data = parseRoleJson(value, 'ADMIN');
  const members = new Set();

  for (const [rawUid, enabled] of Object.entries(data.members)) {
    const uid = normalizeUid(rawUid);
    if (uid && enabled === true) {
      members.add(uid);
    }
  }

  return {
    schemaVersion: data.schemaVersion,
    updatedAt: String(data.updatedAt || ''),
    members,
  };
}

function parseRoleJson(value, label) {
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  if (!data || typeof data !== 'object' || data.schemaVersion !== 1 || !data.members || typeof data.members !== 'object') {
    throw new Error(`${label} role file has an invalid schema.`);
  }

  return data;
}

function serializeVipData(data) {
  const members = {};
  for (const [uid, entry] of data.members) {
    members[uid] = {
      expiresAt: entry.unlimited ? 'UNLIMITED' : new Date(entry.expiresAt).toISOString(),
    };
  }

  return {
    schemaVersion: 1,
    updatedAt: data.updatedAt,
    members,
  };
}

function serializeAdminData(data) {
  const members = {};
  for (const uid of data.members) {
    members[uid] = true;
  }

  return {
    schemaVersion: 1,
    updatedAt: data.updatedAt,
    members,
  };
}

function readCache(storage, key, parser, now, maxAgeMs) {
  try {
    const cached = JSON.parse(storage.getItem(key) || 'null');
    if (!cached || !Number.isFinite(cached.fetchedAt) || now - cached.fetchedAt > maxAgeMs) {
      return null;
    }

    return parser(cached.data);
  } catch {
    return null;
  }
}

function writeCache(storage, key, data, fetchedAt) {
  storage.setItem(key, JSON.stringify({ fetchedAt, data }));
}

function getWindow(document) {
  return document?.defaultView || globalThis;
}

function requestText(document, url, timeout = 15000) {
  const win = getWindow(document);
  const gmRequest = win?.GM_xmlhttpRequest || globalThis.GM_xmlhttpRequest;

  if (typeof gmRequest === 'function') {
    return new Promise((resolve, reject) => {
      gmRequest({
        method: 'GET',
        url,
        timeout,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        onload(response) {
          if (response.status >= 200 && response.status < 300 && response.responseText) {
            resolve(response.responseText);
            return;
          }

          reject(new Error(`Role request failed with HTTP ${response.status}.`));
        },
        onerror(error) {
          reject(error instanceof Error ? error : new Error('Role request failed.'));
        },
        ontimeout() {
          reject(new Error('Role request timed out.'));
        },
      });
    });
  }

  if (typeof win?.fetch === 'function') {
    return win.fetch(url, { cache: 'no-store' }).then((response) => {
      if (!response.ok) {
        throw new Error(`Role request failed with HTTP ${response.status}.`);
      }
      return response.text();
    });
  }

  return Promise.reject(new Error('No supported request API is available.'));
}

export class RoleRegistry {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    logger = console,
    now = () => Date.now(),
    vipUrl = DEFAULT_VIP_URL,
    adminUrl = DEFAULT_ADMIN_URL,
    cacheMaxAgeMs = DEFAULT_CACHE_MAX_AGE_MS,
    request = (url) => requestText(document, url),
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.logger = logger;
    this.now = now;
    this.vipUrl = vipUrl;
    this.adminUrl = adminUrl;
    this.cacheMaxAgeMs = cacheMaxAgeMs;
    this.request = request;
    this.vipData = { schemaVersion: 1, updatedAt: '', members: new Map() };
    this.adminData = { schemaVersion: 1, updatedAt: '', members: new Set() };
    this.listeners = new Set();
    this.started = false;
    this.readyPromise = null;
  }

  start() {
    if (this.started) {
      return this.readyPromise;
    }

    this.started = true;
    const now = this.now();
    const cachedVip = readCache(this.storage, VIP_CACHE_KEY, parseVipRoleFile, now, this.cacheMaxAgeMs);
    const cachedAdmins = readCache(this.storage, ADMIN_CACHE_KEY, parseAdminRoleFile, now, this.cacheMaxAgeMs);

    if (cachedVip) {
      this.vipData = cachedVip;
    }
    if (cachedAdmins) {
      this.adminData = cachedAdmins;
    }
    if (cachedVip || cachedAdmins) {
      this.notify('cache');
    }

    this.readyPromise = Promise.allSettled([
      this.refreshVip(),
      this.refreshAdmins(),
    ]).then(() => this.getSnapshot());

    return this.readyPromise;
  }

  async refreshVip() {
    try {
      const fetchedAt = this.now();
      const text = await this.request(this.withCacheBuster(this.vipUrl, fetchedAt));
      const data = parseVipRoleFile(text);
      this.vipData = data;
      writeCache(this.storage, VIP_CACHE_KEY, serializeVipData(data), fetchedAt);
      this.notify('fresh');
      return true;
    } catch (error) {
      this.logger.warn?.('[Blobio] VIP role file could not be refreshed.', error);
      return false;
    }
  }

  async refreshAdmins() {
    try {
      const fetchedAt = this.now();
      const text = await this.request(this.withCacheBuster(this.adminUrl, fetchedAt));
      const data = parseAdminRoleFile(text);
      this.adminData = data;
      writeCache(this.storage, ADMIN_CACHE_KEY, serializeAdminData(data), fetchedAt);
      this.notify('fresh');
      return true;
    } catch (error) {
      this.logger.warn?.('[Blobio] ADMIN role file could not be refreshed.', error);
      return false;
    }
  }

  withCacheBuster(url, timestamp) {
    const separator = String(url).includes('?') ? '&' : '?';
    return `${url}${separator}blobioRoles=${timestamp}`;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    this.listeners.add(listener);
    listener(this.getSnapshot(), 'current');
    return () => this.listeners.delete(listener);
  }

  notify(source) {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot, source);
      } catch (error) {
        this.logger.warn?.('[Blobio] Role listener failed.', error);
      }
    }
  }

  getVipStatus(rawUid, at = this.now()) {
    const uid = normalizeUid(rawUid);
    const entry = uid ? this.vipData.members.get(uid) : null;
    if (!entry) {
      return { active: false, unlimited: false, expiresAt: null, remainingMs: 0 };
    }

    if (entry.unlimited) {
      return { active: true, unlimited: true, expiresAt: null, remainingMs: Infinity };
    }

    const remainingMs = entry.expiresAt - at;
    return {
      active: remainingMs > 0,
      unlimited: false,
      expiresAt: entry.expiresAt,
      remainingMs: Math.max(0, remainingMs),
    };
  }

  isAdmin(rawUid) {
    const uid = normalizeUid(rawUid);
    return Boolean(uid && this.adminData.members.has(uid));
  }

  getRoles(rawUid, at = this.now()) {
    const vip = this.getVipStatus(rawUid, at);
    return {
      uid: normalizeUid(rawUid),
      vip,
      admin: this.isAdmin(rawUid),
    };
  }

  getSnapshot() {
    return {
      vipCount: this.vipData.members.size,
      adminCount: this.adminData.members.size,
      vipUpdatedAt: this.vipData.updatedAt,
      adminUpdatedAt: this.adminData.updatedAt,
    };
  }

  destroy() {
    this.listeners.clear();
    this.started = false;
    this.readyPromise = null;
  }
}

export const ROLE_STORAGE_KEYS = {
  ownUid: 'blobio.roles.ownUid',
  vipCache: VIP_CACHE_KEY,
  adminCache: ADMIN_CACHE_KEY,
};

export const ROLE_DATABASE_URLS = {
  vip: DEFAULT_VIP_URL,
  admins: DEFAULT_ADMIN_URL,
};
