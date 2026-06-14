import { normalizeUid } from '../roles/RoleRegistry.js';

const MENU_SELECTOR = [
  '#mouse-menu',
  '#mouseMenu',
  '#context-menu',
  '#contextmenu',
  '.mouse-menu',
  '.mouseMenu',
  '.context-menu',
  '.contextmenu',
  '.player-menu',
  '.player-context-menu',
  'app-mouse-menu',
  'app-context-menu',
  'mouse-menu',
  'context-menu',
  '[data-player-menu]',
].join(',');

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
const CONTEXT_DELAYS = [0, 40, 140, 320];

function uidFromAttributes(element) {
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

  const ownUid = uidFromAttributes(element);
  if (ownUid) {
    return ownUid;
  }

  if (!includeDescendants) {
    return '';
  }

  const descendants = element.querySelectorAll?.('*') || [];
  for (const node of descendants) {
    const uid = uidFromAttributes(node);
    if (uid) {
      return uid;
    }
  }

  const text = String(element.textContent || '');
  const match = text.match(/(?:UID|User\s*ID|Player\s*ID)\s*[:#-]?\s*(\d{1,20})/i);
  return normalizeUid(match?.[1]);
}

export function hasProtectedRoleText(element) {
  const text = String(element?.textContent || '');
  if (/\[(?:ADMIN|MD)\]/i.test(text)) {
    return true;
  }

  const roleNode = element?.querySelector?.([
    '.blobio-chat-admin-tag',
    '.blobio-chat-admin-username',
    '[data-role="admin"]',
    '[data-role="md"]',
    '[data-admin="true"]',
    '[data-moderator="true"]',
  ].join(','));
  return Boolean(roleNode);
}

export class PlayerMuteFeature {
  constructor({
    document = globalThis.document,
    mutedPlayersStore,
    roleRegistry,
    notifications,
    logger = console,
  } = {}) {
    this.document = document;
    this.mutedPlayersStore = mutedPlayersStore;
    this.roleRegistry = roleRegistry;
    this.notifications = notifications;
    this.logger = logger;
    this.pageObserver = null;
    this.unsubscribeMutedPlayers = null;
    this.unsubscribeRoles = null;
    this.contextMenuHandler = null;
    this.pendingTarget = null;
    this.contextTimers = new Set();
    this.protectedUids = new Set();
    this.started = false;
  }

  start() {
    if (this.started || !this.document?.documentElement) {
      return Boolean(this.started);
    }

    this.contextMenuHandler = (event) => this.handleContextMenu(event);
    this.document.addEventListener?.('contextmenu', this.contextMenuHandler, true);
    this.unsubscribeMutedPlayers = this.mutedPlayersStore?.subscribe?.(() => this.syncInjectedButtons()) || null;
    this.unsubscribeRoles = this.roleRegistry?.subscribe?.(() => this.removeProtectedMutedPlayers()) || null;
    this.observeMenus();
    this.started = true;
    return true;
  }

  handleContextMenu(event) {
    const directTarget = this.readTargetFromEvent(event.target);
    this.pendingTarget = {
      ...directTarget,
      x: Number(event.clientX) || 0,
      y: Number(event.clientY) || 0,
      capturedAt: Date.now(),
    };

    this.rememberProtectedChatPlayers();
    if (!this.mutedPlayersStore?.isEnabled?.()) {
      return;
    }

    this.scheduleMenuChecks();
  }

  readTargetFromEvent(target) {
    let current = target;
    for (let depth = 0; current && depth < 8; depth += 1) {
      const uid = extractUidFromElement(current, false);
      if (uid) {
        return {
          uid,
          protected: hasProtectedRoleText(current),
          sourceElement: current,
        };
      }
      current = current.parentElement;
    }

    return { uid: '', protected: false, sourceElement: target || null };
  }

  scheduleMenuChecks() {
    const win = this.document.defaultView || globalThis;
    for (const delay of CONTEXT_DELAYS) {
      const timer = win.setTimeout?.(() => {
        this.contextTimers.delete(timer);
        const menu = this.findCurrentMenu();
        if (menu) {
          this.decorateMenu(menu);
        }
      }, delay);
      if (timer !== undefined) {
        this.contextTimers.add(timer);
      }
    }
  }

  observeMenus() {
    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return;
    }

    this.pageObserver = new MutationObserver((mutations) => {
      if (!this.mutedPlayersStore?.isEnabled?.()) {
        return;
      }

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes || []) {
          if (node?.nodeType !== 1) {
            continue;
          }

          if (node.matches?.(MENU_SELECTOR)) {
            this.decorateMenu(node);
          }
          for (const menu of node.querySelectorAll?.(MENU_SELECTOR) || []) {
            this.decorateMenu(menu);
          }
        }
      }
    });
    this.pageObserver.observe(this.document.documentElement, { childList: true, subtree: true });
  }

  findCurrentMenu() {
    const explicitMenus = Array.from(this.document.querySelectorAll?.(MENU_SELECTOR) || [])
      .filter((menu) => this.isVisible(menu));
    if (explicitMenus.length > 0) {
      return explicitMenus.sort((a, b) => this.menuScore(b) - this.menuScore(a))[0];
    }

    const knownActionMenu = this.findKnownActionMenu();
    if (knownActionMenu) {
      return knownActionMenu;
    }

    const pointElements = this.document.elementsFromPoint?.(
      this.pendingTarget?.x || 0,
      this.pendingTarget?.y || 0,
    ) || [];

    for (const element of pointElements) {
      let current = element;
      for (let depth = 0; current && depth < 6; depth += 1) {
        if (this.looksLikeActionMenu(current)) {
          return current;
        }
        current = current.parentElement;
      }
    }

    return null;
  }

  findKnownActionMenu() {
    const actions = this.document.querySelectorAll?.('button, a, li, [role="button"]') || [];
    for (const action of actions) {
      if (String(action.textContent || '').trim().toLowerCase() !== 'copy id' || !this.isVisible(action)) {
        continue;
      }

      let current = action.parentElement;
      for (let depth = 0; current && depth < 5; depth += 1) {
        if (this.looksLikeActionMenu(current)) {
          return current;
        }
        current = current.parentElement;
      }
    }

    return null;
  }

  looksLikeActionMenu(element) {
    if (!element || element === this.document.body || element === this.document.documentElement || !this.isVisible(element)) {
      return false;
    }

    const rect = element.getBoundingClientRect?.();
    if (!rect || rect.width > 520 || rect.height > 650) {
      return false;
    }

    const name = `${element.id || ''} ${element.className || ''} ${element.tagName || ''}`;
    const actions = element.querySelectorAll?.('button, [role="button"], a, li') || [];
    return actions.length > 0 && (/menu|context|mouse|player/i.test(name) || actions.length >= 2);
  }

  menuScore(menu) {
    const rect = menu.getBoundingClientRect?.();
    if (!rect) {
      return 0;
    }

    const x = this.pendingTarget?.x || rect.left;
    const y = this.pendingTarget?.y || rect.top;
    const distance = Math.abs(rect.left - x) + Math.abs(rect.top - y);
    return 10000 - distance - (rect.width * rect.height) / 1000;
  }

  isVisible(element) {
    const rect = element?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    const win = this.document.defaultView || globalThis;
    const style = win.getComputedStyle?.(element);
    return style?.display !== 'none' && style?.visibility !== 'hidden';
  }

  decorateMenu(menu) {
    if (!menu || !this.mutedPlayersStore?.isEnabled?.()) {
      return;
    }

    if (menu.querySelector?.('.blobio-mute-player-action')) {
      return;
    }

    const actionContainer = this.findActionContainer(menu);
    if (!actionContainer) {
      return;
    }

    const template = Array.from(actionContainer.children || [])
      .find((node) => node.matches?.('button, [role="button"], a, li, div')) || null;
    const action = this.createMenuAction(template);
    action.addEventListener('click', (event) => {
      if (String(action.tagName).toUpperCase() === 'A') {
        event.preventDefault();
      }
      this.muteCurrentTarget(menu);
    });
    actionContainer.appendChild(action);
  }

  findActionContainer(menu) {
    const ownActions = Array.from(menu.querySelectorAll?.('button, [role="button"], a, li') || [])
      .filter((node) => !node.classList?.contains('blobio-mute-player-action'));
    if (ownActions.length > 0) {
      return ownActions[0].parentElement || menu;
    }

    return menu;
  }

  createMenuAction(template) {
    const allowedTag = String(template?.tagName || '').toUpperCase();
    const tagName = ['BUTTON', 'LI', 'A', 'DIV'].includes(allowedTag)
      ? allowedTag.toLowerCase()
      : 'button';
    const action = this.document.createElement(tagName);

    if (tagName === 'button') {
      action.type = 'button';
    } else if (tagName === 'a') {
      action.href = '#';
    }

    if (template?.className && typeof template.className === 'string') {
      action.className = template.className;
    }
    action.classList.add('blobio-mute-player-action');
    action.setAttribute('role', 'button');
    action.tabIndex = 0;
    action.textContent = 'Mute-Player';
    action.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        action.click();
      }
    });
    return action;
  }

  muteCurrentTarget(menu) {
    this.rememberProtectedChatPlayers();
    const menuTarget = this.readTargetFromMenu(menu);
    const pending = this.pendingTarget && Date.now() - this.pendingTarget.capturedAt < 2500
      ? this.pendingTarget
      : null;
    const uid = menuTarget.uid || pending?.uid || '';
    const protectedTarget = menuTarget.protected || pending?.protected || false;

    if (!uid) {
      this.notifications?.showMissingUidNotification?.();
      this.logger.warn?.('[Blobio] Mute-Player could not determine the selected player UID.');
      return;
    }

    if (protectedTarget || this.isProtectedUid(uid, menu, pending?.sourceElement)) {
      this.notifications?.showProtectedMuteNotification?.();
      return;
    }

    this.mutedPlayersStore?.add?.(uid);
  }

  readTargetFromMenu(menu) {
    const uid = extractUidFromElement(menu);
    if (uid) {
      return { uid, protected: hasProtectedRoleText(menu) };
    }

    return this.readAngularTarget(menu);
  }

  readAngularTarget(menu) {
    const seeds = [];
    const nodes = [menu, ...Array.from(menu?.querySelectorAll?.('*') || []).slice(0, 80)];
    for (const node of nodes) {
      for (const key of Object.getOwnPropertyNames(node || {})) {
        if (/^__ng|player|target|selected/i.test(key)) {
          try {
            seeds.push(node[key]);
          } catch {}
        }
      }
    }

    const queue = seeds.map((value) => ({ value, depth: 0 }));
    const seen = new Set();
    let inspected = 0;

    while (queue.length > 0 && inspected < 300) {
      const { value, depth } = queue.shift();
      if (!value || (typeof value !== 'object' && !Array.isArray(value)) || seen.has(value)) {
        continue;
      }
      seen.add(value);
      inspected += 1;

      let uid = '';
      for (const key of UID_KEYS) {
        try {
          uid = normalizeUid(value[key]);
        } catch {}
        if (uid) {
          break;
        }
      }

      if (uid) {
        return { uid, protected: this.objectHasProtectedRole(value) };
      }

      if (depth >= 4) {
        continue;
      }

      let entries;
      try {
        entries = Array.isArray(value) ? value.entries() : Object.entries(value);
      } catch {
        continue;
      }

      for (const [key, child] of entries) {
        if (!child || typeof child !== 'object' || child.nodeType || child === this.document.defaultView) {
          continue;
        }
        if (Array.isArray(value) || /player|user|target|selected|data|context|component|menu/i.test(String(key))) {
          queue.push({ value: child, depth: depth + 1 });
        }
      }
    }

    return { uid: '', protected: false };
  }

  objectHasProtectedRole(value) {
    const booleanKeys = ['admin', 'isAdmin', 'moderator', 'isModerator', 'isMd', 'isMD', 'md'];
    for (const key of booleanKeys) {
      try {
        if (value[key] === true) {
          return true;
        }
      } catch {}
    }

    try {
      return /^(?:admin|md|moderator)$/i.test(String(value.role || value.tag || '').trim());
    } catch {
      return false;
    }
  }

  rememberProtectedChatPlayers() {
    const messages = this.document.querySelectorAll?.('#chat li[uid]') || [];
    for (const message of messages) {
      const uid = normalizeUid(message.getAttribute?.('uid'));
      if (uid && (hasProtectedRoleText(message) || this.roleRegistry?.isAdmin?.(uid))) {
        this.protectedUids.add(uid);
        if (this.mutedPlayersStore?.isMuted?.(uid)) {
          this.mutedPlayersStore.remove(uid);
        }
      }
    }
  }

  removeProtectedMutedPlayers() {
    const protectedPlayers = this.mutedPlayersStore?.getPlayers?.()
      .filter(({ uid }) => this.roleRegistry?.isAdmin?.(uid))
      .map(({ uid }) => uid) || [];
    if (protectedPlayers.length > 0) {
      this.mutedPlayersStore.remove(protectedPlayers);
    }
  }

  isProtectedUid(uid, ...elements) {
    if (this.roleRegistry?.isAdmin?.(uid) || this.protectedUids.has(uid)) {
      return true;
    }

    return elements.some((element) => hasProtectedRoleText(element));
  }

  syncInjectedButtons() {
    if (this.mutedPlayersStore?.isEnabled?.()) {
      return;
    }

    for (const button of this.document.querySelectorAll?.('.blobio-mute-player-action') || []) {
      button.remove();
    }
  }

  destroy() {
    this.pageObserver?.disconnect();
    this.pageObserver = null;
    this.unsubscribeMutedPlayers?.();
    this.unsubscribeRoles?.();
    this.unsubscribeMutedPlayers = null;
    this.unsubscribeRoles = null;

    if (this.contextMenuHandler) {
      this.document.removeEventListener?.('contextmenu', this.contextMenuHandler, true);
      this.contextMenuHandler = null;
    }

    const win = this.document.defaultView || globalThis;
    for (const timer of this.contextTimers) {
      win.clearTimeout?.(timer);
    }
    this.contextTimers.clear();

    for (const button of this.document.querySelectorAll?.('.blobio-mute-player-action') || []) {
      button.remove();
    }

    this.pendingTarget = null;
    this.protectedUids.clear();
    this.started = false;
  }
}
