import { normalizeUid } from './RoleRegistry.js';

const UID_ATTRIBUTES = [
  'uid',
  'data-uid',
  'user-id',
  'data-user-id',
  'userid',
  'data-userid',
  'player-uid',
  'data-player-uid',
  'player-id',
  'data-player-id',
];

const UID_KEYS = ['uid', 'userId', 'userID', 'user_id', 'playerUid', 'playerUID', 'playerId', 'playerID'];
const NAME_KEYS = [
  'name',
  'username',
  'userName',
  'user_name',
  'displayName',
  'display_name',
  'playerName',
  'player_name',
  'nickname',
  'nickName',
  'nick',
];

function normalizeName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function readUidAttribute(element) {
  for (const attribute of UID_ATTRIBUTES) {
    const uid = normalizeUid(element?.getAttribute?.(attribute));
    if (uid) {
      return uid;
    }
  }

  for (const attribute of Array.from(element?.attributes || [])) {
    if (!/(?:uid|user.*id|player.*id)/i.test(attribute?.name || '')) {
      continue;
    }

    const uid = normalizeUid(attribute.value);
    if (uid) {
      return uid;
    }
  }

  return '';
}

export function extractUidFromElement(element, includeDescendants = true) {
  if (!element) {
    return '';
  }

  const ownUid = readUidAttribute(element);
  if (ownUid) {
    return ownUid;
  }

  if (!includeDescendants) {
    return '';
  }

  for (const node of element.querySelectorAll?.('*') || []) {
    const uid = readUidAttribute(node);
    if (uid) {
      return uid;
    }
  }

  const text = String(element.textContent || '');
  const match = text.match(/(?:UID|User\s*ID|Player\s*ID)\s*[:#-]?\s*(\d{1,20})/i);
  return normalizeUid(match?.[1]);
}

function objectNameMatches(value, preferredName) {
  if (!preferredName) {
    return false;
  }

  for (const key of NAME_KEYS) {
    try {
      if (normalizeName(value[key]) === preferredName) {
        return true;
      }
    } catch {}
  }

  return false;
}

function getUidCandidate(value, preferredName) {
  for (const key of UID_KEYS) {
    try {
      const uid = normalizeUid(value[key]);
      if (uid) {
        return { uid, key, nameMatch: objectNameMatches(value, preferredName) };
      }
    } catch {}
  }

  if (preferredName && objectNameMatches(value, preferredName)) {
    try {
      const uid = normalizeUid(value.id);
      if (uid) {
        return { uid, key: 'id', nameMatch: true };
      }
    } catch {}
  }

  return null;
}

export function findAngularUid(element, {
  preferredName = '',
  maxDepth = 6,
  maxObjects = 600,
  maxDescendants = 80,
} = {}) {
  if (!element) {
    return { uid: '', value: null };
  }

  const normalizedPreferredName = normalizeName(preferredName);
  const nodes = [element, ...Array.from(element.querySelectorAll?.('*') || []).slice(0, maxDescendants)];
  const queue = [];

  for (const node of nodes) {
    for (const key of Object.getOwnPropertyNames(node || {})) {
      if (!/^__ng|player|target|selected|friend|profile|user/i.test(key)) {
        continue;
      }

      try {
        queue.push({ value: node[key], depth: 0, pathScore: /friend|profile|user|player/i.test(key) ? 8 : 0 });
      } catch {}
    }
  }

  const seen = new Set();
  let inspected = 0;
  let best = null;

  while (queue.length > 0 && inspected < maxObjects) {
    const { value, depth, pathScore } = queue.shift();
    if (!value || (typeof value !== 'object' && !Array.isArray(value)) || seen.has(value)) {
      continue;
    }

    seen.add(value);
    inspected += 1;

    const candidate = getUidCandidate(value, normalizedPreferredName);
    if (candidate) {
      const score = 100 - depth * 4 + pathScore + (candidate.nameMatch ? 50 : 0) + (candidate.key === 'id' ? -20 : 0);
      if (!best || score > best.score) {
        best = { uid: candidate.uid, value, score };
      }

      if (!normalizedPreferredName || candidate.nameMatch) {
        return { uid: candidate.uid, value };
      }
    }

    if (depth >= maxDepth) {
      continue;
    }

    let entries;
    try {
      entries = Array.isArray(value) ? value.entries() : Object.entries(value);
    } catch {
      continue;
    }

    for (const [key, child] of entries) {
      if (!child || typeof child !== 'object' || child.nodeType || child === element.ownerDocument?.defaultView) {
        continue;
      }

      const keyText = String(key);
      const isRowContext = /^\$implicit$/i.test(keyText);
      const isRelevantPath = /friend|profile|user|player|target|selected|data|context|component|item|row|model|entry|implicit/i.test(keyText);
      const nextPathScore = pathScore + (isRowContext ? 16 : isRelevantPath ? 4 : 0);

      if (Array.isArray(value) || isRelevantPath || depth < 1) {
        const next = { value: child, depth: depth + 1, pathScore: nextPathScore };
        if (isRowContext) {
          queue.unshift(next);
        } else {
          queue.push(next);
        }
      }
    }
  }

  return best ? { uid: best.uid, value: best.value } : { uid: '', value: null };
}
