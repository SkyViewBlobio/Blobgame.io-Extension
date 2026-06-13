import { VIP_BADGE_CSS, VIP_BADGE_STYLE_ID } from '../css/RoleFeatureStyles.js';

const VIP_REFRESH_INTERVAL_MS = 30000;
const VIP_SIZE_MULTIPLIER = 2.625;
const UNLIMITED_TEXT = 'UNLIMITED';

export function formatVipRemainingTime(remainingMs) {
  const totalMinutes = Math.max(0, Math.ceil(Number(remainingMs) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export class VipBadgeFeature {
  constructor({
    document = globalThis.document,
    roleRegistry,
    uidDetector,
    badgeUrl,
    logger = console,
  } = {}) {
    this.document = document;
    this.roleRegistry = roleRegistry;
    this.uidDetector = uidDetector;
    this.badgeUrl = badgeUrl;
    this.logger = logger;
    this.styleNode = null;
    this.slot = null;
    this.icon = null;
    this.timeLabel = null;
    this.massBooster = null;
    this.observer = null;
    this.interval = null;
    this.viewportHandler = null;
    this.unsubscribeRoles = null;
    this.unsubscribeUid = null;
    this.pendingSync = null;
    this.pendingSyncType = '';
    this.started = false;
  }

  start() {
    if (this.started || !this.document?.documentElement) {
      return Boolean(this.started);
    }

    this.started = true;
    this.ensureStyle();
    this.unsubscribeRoles = this.roleRegistry?.subscribe?.(() => this.sync());
    this.unsubscribeUid = this.uidDetector?.subscribe?.(() => this.sync());
    this.installObserver();
    this.installViewportTracking();

    const win = this.document.defaultView || globalThis;
    this.interval = win.setInterval?.(() => this.sync(), VIP_REFRESH_INTERVAL_MS) ?? null;
    this.sync();
    return true;
  }

  ensureStyle() {
    const existing = this.document.getElementById?.(VIP_BADGE_STYLE_ID);
    if (existing) {
      this.styleNode = existing;
      return;
    }

    const style = this.document.createElement('style');
    style.id = VIP_BADGE_STYLE_ID;
    style.textContent = VIP_BADGE_CSS;
    (this.document.head || this.document.documentElement).appendChild(style);
    this.styleNode = style;
  }

  installObserver() {
    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      if (this.mutationsAffectMassBooster(mutations)) {
        this.scheduleSync();
      }
    });

    this.observer.observe(this.document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  }

  mutationsAffectMassBooster(mutations) {
    for (const mutation of mutations) {
      if (this.slot && (mutation.target === this.slot || this.slot.contains?.(mutation.target))) {
        continue;
      }

      if (mutation.type === 'attributes' && this.isMassBoosterImage(mutation.target)) {
        return true;
      }

      for (const node of mutation.addedNodes || []) {
        if (node === this.slot || this.slot?.contains?.(node)) {
          continue;
        }

        if (this.nodeContainsMassBooster(node)) {
          return true;
        }
      }

      for (const node of mutation.removedNodes || []) {
        if (node === this.slot || this.slot?.contains?.(node)) {
          continue;
        }

        if (node === this.massBooster || node?.contains?.(this.massBooster)) {
          return true;
        }
      }
    }

    return false;
  }

  nodeContainsMassBooster(node) {
    if (this.isMassBoosterImage(node)) {
      return true;
    }

    return Array.from(node?.querySelectorAll?.('img') || [])
      .some((image) => this.isMassBoosterImage(image));
  }

  installViewportTracking() {
    const win = this.document.defaultView;
    if (!win?.addEventListener) {
      return;
    }

    this.viewportHandler = () => this.scheduleSync();
    win.addEventListener('resize', this.viewportHandler);
    win.addEventListener('scroll', this.viewportHandler, true);
  }

  scheduleSync() {
    if (!this.started || this.pendingSync !== null) {
      return;
    }

    const win = this.document.defaultView || globalThis;
    const run = () => {
      this.pendingSync = null;
      this.pendingSyncType = '';
      this.sync();
    };

    if (typeof win.requestAnimationFrame === 'function') {
      this.pendingSyncType = 'frame';
      this.pendingSync = win.requestAnimationFrame(run);
      return;
    }

    this.pendingSyncType = 'timeout';
    this.pendingSync = win.setTimeout?.(run, 0) ?? null;
    if (this.pendingSync === null) {
      run();
    }
  }

  cancelScheduledSync() {
    if (this.pendingSync === null) {
      return;
    }

    const win = this.document.defaultView || globalThis;
    if (this.pendingSyncType === 'frame') {
      win.cancelAnimationFrame?.(this.pendingSync);
    } else {
      win.clearTimeout?.(this.pendingSync);
    }

    this.pendingSync = null;
    this.pendingSyncType = '';
  }

  sync() {
    const uid = this.uidDetector?.getUid?.() || '';
    const status = this.roleRegistry?.getVipStatus?.(uid) || { active: false };
    if (!status.active || !this.badgeUrl) {
      this.removeBadge();
      return;
    }

    const target = this.findMassBooster();
    if (!target || !this.document.body) {
      this.removeBadge();
      return;
    }

    this.massBooster = target;
    this.ensureBadge();

    const rect = target.getBoundingClientRect?.();
    const height = Number(rect?.height) || Number(target.clientHeight) || Number(target.height) || 0;
    if (height >= 18 && height <= 120) {
      this.setStyle(this.icon, '--blobio-vip-plus-size', `${Math.round(height * VIP_SIZE_MULTIPLIER)}px`);
    }

    const right = Number(rect?.right);
    const top = Number(rect?.top);
    if (Number.isFinite(right) && Number.isFinite(top) && height > 0) {
      this.setStyle(this.slot, '--blobio-vip-plus-left', `${Math.round(right + 10)}px`);
      this.setStyle(this.slot, '--blobio-vip-plus-top', `${Math.round(top + height / 2)}px`);
    }

    const nextText = status.unlimited ? UNLIMITED_TEXT : formatVipRemainingTime(status.remainingMs);
    this.updateTimeLabel(nextText, status.unlimited);
  }

  updateTimeLabel(text, unlimited) {
    if (!this.timeLabel) {
      return;
    }

    const currentText = this.timeLabel.dataset.blobioTimeText || '';
    const currentMode = this.timeLabel.dataset.blobioTimeMode || '';
    const nextMode = unlimited ? 'unlimited' : 'timed';
    if (currentText === text && currentMode === nextMode) {
      return;
    }

    this.timeLabel.dataset.blobioTimeText = text;
    this.timeLabel.dataset.blobioTimeMode = nextMode;
    this.clearTimeLabel();

    if (unlimited) {
      this.timeLabel.classList.add('is-unlimited');
      this.renderCurvedUnlimited(text);
      return;
    }

    this.timeLabel.classList.remove('is-unlimited');
    this.timeLabel.textContent = text;
  }

  clearTimeLabel() {
    for (const child of Array.from(this.timeLabel?.children || [])) {
      child.remove?.();
    }
    if (this.timeLabel) {
      this.timeLabel.textContent = '';
    }
  }

  renderCurvedUnlimited(text) {
    const center = (text.length - 1) / 2;

    for (let index = 0; index < text.length; index += 1) {
      const distance = index - center;
      const letter = this.document.createElement('span');
      letter.classList.add('blobio-vip-plus-time-letter');
      letter.textContent = text[index];
      this.setStyle(letter, '--blobio-vip-letter-y', `${Math.round(distance * distance * 0.45)}px`);
      this.setStyle(letter, '--blobio-vip-letter-rotate', `${(distance * 1.5).toFixed(1)}deg`);
      this.timeLabel.appendChild(letter);
    }
  }

  findMassBooster() {
    if (this.isConnected(this.massBooster) && this.isMassBoosterImage(this.massBooster)) {
      return this.massBooster;
    }

    return Array.from(this.document.querySelectorAll?.('img') || [])
      .find((image) => this.isMassBoosterImage(image)) || null;
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

  ensureBadge() {
    if (!this.slot) {
      this.slot = this.document.createElement('span');
      this.slot.classList.add('blobio-vip-plus-slot');
    }

    if (!this.icon) {
      this.icon = this.document.createElement('img');
      this.icon.classList.add('blobio-vip-plus-icon');
      this.icon.setAttribute('src', this.badgeUrl);
      this.icon.setAttribute('alt', 'VIP+');
      this.icon.setAttribute('title', 'VIP+');
      this.icon.setAttribute('draggable', 'false');
    }

    if (!this.timeLabel) {
      this.timeLabel = this.document.createElement('span');
      this.timeLabel.classList.add('blobio-vip-plus-time');
    }

    if (this.icon.parentNode !== this.slot) {
      this.slot.appendChild(this.icon);
    }
    if (this.timeLabel.parentNode !== this.slot) {
      this.slot.appendChild(this.timeLabel);
    }
    if (this.slot.parentNode !== this.document.body) {
      this.document.body.appendChild(this.slot);
    }
  }

  setStyle(node, property, value) {
    if (!node?.style) {
      return;
    }

    const currentValue = typeof node.style.getPropertyValue === 'function'
      ? node.style.getPropertyValue(property)
      : node.style[property];
    if (currentValue === value) {
      return;
    }

    if (typeof node.style.setProperty === 'function') {
      node.style.setProperty(property, value);
    } else {
      node.style[property] = value;
    }
  }

  isMassBoosterImage(image) {
    if (String(image?.tagName || '').toUpperCase() !== 'IMG') {
      return false;
    }

    const source = String(image.getAttribute?.('src') || image.src || '')
      .split('#')[0]
      .split('?')[0]
      .toLowerCase();
    return source.endsWith('/assets/images/mass_booster_web_trans.png')
      || source === 'assets/images/mass_booster_web_trans.png';
  }

  removeBadge() {
    this.slot?.remove();
    this.slot = null;
    this.icon = null;
    this.timeLabel = null;
  }

  destroy() {
    this.observer?.disconnect();
    this.observer = null;
    this.unsubscribeRoles?.();
    this.unsubscribeUid?.();
    this.unsubscribeRoles = null;
    this.unsubscribeUid = null;

    const win = this.document.defaultView || globalThis;
    if (this.interval !== null) {
      win.clearInterval?.(this.interval);
      this.interval = null;
    }
    if (this.viewportHandler) {
      win.removeEventListener?.('resize', this.viewportHandler);
      win.removeEventListener?.('scroll', this.viewportHandler, true);
      this.viewportHandler = null;
    }

    this.cancelScheduledSync();
    this.removeBadge();
    this.massBooster = null;
    this.styleNode?.remove();
    this.styleNode = null;
    this.started = false;
  }
}
