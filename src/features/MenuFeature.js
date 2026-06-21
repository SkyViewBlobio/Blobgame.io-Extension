import { buildMenuCss } from '../css/MenuFeatureStyles.js';
import { GameBackgroundSettingsUi } from '../background/GameBackgroundSettingsUi.js';
import { CellMassSettingsUi } from '../cellMass/CellMassSettingsUi.js';
import { VirusPelletColorSettingsUi } from '../cellColors/VirusPelletColorSettingsUi.js';
import { FpsSaverSettingsUi } from '../fpsSaver/FpsSaverSettingsUi.js';
import { readFpsSaverSettings, saveFpsSaverSettings } from '../fpsSaver/FpsSaverSettings.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';
import { JellyShaderSettingsUi } from '../jelly/JellyShaderSettingsUi.js';
import { isHideAdminMdEnabled, setHideAdminMdEnabled } from '../roles/RoleSettings.js';
import { isFpsUncapEnabled, setFpsUncapEnabled } from '../settings/RuntimeSettings.js';
import { VirusMotherCellSettingsUi } from '../virus/VirusMotherCellSettingsUi.js';

const DEFAULT_CLASS_NAME = 'blobio-menu-enabled';
const DEFAULT_STYLE_ID = 'blobio-menu-style';
const DEFAULT_TOOLBAR_CLASS = 'blobio-menu-toolbar';
const DEFAULT_EXTENSION_VERSION = '0.2.01';
const HIDDEN_CLASS = 'blobio-original-hidden';
const PARTNER_LINK_MATCH = /iogames\.space|iogames\.live|io-games\.zone|silvergames\.com|crazygames\.com/i;
const FAILED_VIRAL_FRAME_MATCH = /viral\.iogames\.space/i;
const OTHER_GAME_NAMES = ['Viper', 'Hexa'];
const WATERMARK_STORAGE_KEY = 'blobio.watermark.enabled';
const WATERMARK_RIGHT_NUDGE = 60;
const WATERMARK_EXTRA_WIDTH = 96;
const WATERMARK_INPUT_GAP = 6;
const MAIN_MENU_ALIGNMENT_CLASS = 'blobio-main-menu-align-target';
const MAIN_MENU_LAYERED_SELECT_CLASS = 'blobio-menu-layered-select';
const EXTENSION_DEFAULT_CATEGORY = 'fps';
const EXTENSION_SETTING_CATEGORIES = [
  ['fps', 'FPS'],
  ['cell', 'Cell'],
  ['text', 'Text'],
  ['theme', 'Theme'],
  ['animation', 'Animation'],
  ['misc', 'Misc'],
];

const EXTENSION_OPTION_TOOLTIPS = {
  watermark: 'FPS-Impact: Low[1-5]\nThis option will display the Extension name text, alongside its current version.',
  hideAdminMd: 'FPS-Impact: Low[0-2]\nHide the built-in [MD] tag from extension ADMIN users in chat. This is enabled by default.',
  friendHighlight: 'FPS-Impact: Low[5-15]\nLoad accepted friends from Blobgame and color their chat name and message green. Friend requests and declined users are ignored.',
  fpsUncap: 'FPS-Impact: Medium[0-80]\nUncap the in-game render loop after a safe startup delay, periodically yield to native frames, keep the game active when unfocused, and smooth camera zoom using the real frame delta. Off by default and applies immediately.',
  liteMode: 'FPS-Gain: Low[5-20]\nAdds CSS containment and offscreen rendering hints to heavy sections and third-party iframe surfaces without hiding videos or promos.',
  noTransitions: 'FPS-Gain: Medium[10-35]\nRemoves CSS transitions and animations from menus, panels, toasts, and modals. Expected save: low to medium smoothness gain.\n[WARNING: This is disabled by default because it will drastically reduce HUD-options.]',
  gameOverlay: 'FPS-Gain: Medium[10-40]\nGame client only. Isolates chat, leaderboard, score, lists, menu, and toast layout/paint from the rest of the page. Expected save: low to medium repaint gain.',
  toastModalAnim: 'FPS-Gain: Low[3-15]\nDisables toast and modal animation work while keeping the UI visible. Expected save: low gain, more noticeable during repeated popups.',
  chatGuard: 'FPS-Gain: Medium[10-60]\nKeeps chat usable but cut old chat rows in batches. Expected save: low normally, medium in full servers with many chatter.',
};

const DEFAULT_VIDEO = {
  title: 'Featured Blob.io Video',
  url: 'https://www.youtube.com/watch?v=GOlXDLWeGMo',
};

const UPDATE_NOTES = [
  {
    date: 'Jan 02',
    items: ['Fixed black screen for private servers in SA and ME regions.'],
  },
  {
    date: 'Dec 20',
    items: ['Added new skins.'],
  },
  {
    date: 'Nov 13',
    items: ['Added many new skins.'],
  },
  {
    date: 'Oct 25',
    items: ['Added user ID display in profile.', 'Added new skins.', 'Fixed empty profile screen display.'],
  },
  {
    date: 'May 31',
    items: ['Updated replay list layout.', 'Added replay ZIP downloads.', 'Highlighted currently playing replay.'],
  },
  {
    date: 'May 20',
    items: ['Added Middle East region.', 'Dynamically updated featured video.'],
  },
  {
    date: 'Apr 09',
    items: ['Restored Facebook login.'],
  },
  {
    date: 'Apr 06',
    items: ['Added official social links.', 'Added partners list.', 'Minor UI fixes.'],
  },
];

const SOCIALS = [
  {
    key: 'youtube',
    label: 'YouTube',
    match: /youtube\.com|youtu\.be/i,
    fallbackHref: 'https://www.youtube.com/watch?v=GOlXDLWeGMo',
    assetKey: 'youtubeIcon',
  },
  {
    key: 'discord',
    label: 'Discord',
    match: /discord|disc\.blobgame\.io/i,
    fallbackHref: 'https://disc.blobgame.io/',
    assetKey: 'discordIcon',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    match: /facebook\.com/i,
    fallbackHref: 'https://www.facebook.com/blobio',
    assetKey: 'facebookIcon',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    match: /instagram\.com/i,
    fallbackHref: 'https://www.instagram.com/blob.io_official',
    assetKey: 'instagramIcon',
  },
];

export class MenuFeature {
  constructor({
    document = globalThis.document,
    assets = {},
    logger = console,
    className = DEFAULT_CLASS_NAME,
    styleId = DEFAULT_STYLE_ID,
    storage = createBlobioStorage(document),
    roleRegistry = null,
    uidDetector = null,
    friendHighlightStore = null,
    version = DEFAULT_EXTENSION_VERSION,
    frontPageUi = true,
  } = {}) {
    this.document = document;
    this.assets = assets;
    this.logger = logger;
    this.className = className;
    this.styleId = styleId;
    this.storage = storage;
    this.roleRegistry = roleRegistry;
    this.uidDetector = uidDetector;
    this.friendHighlightStore = friendHighlightStore;
    this.version = version;
    this.frontPageUi = frontPageUi;
    this.started = false;
    this.styleNode = null;
    this.toolbar = null;
    this.footerModalHost = null;
    this.observer = null;
    this.refreshTimer = null;
    this.panelBodies = new Map();
    this.hiddenOriginalNodes = new Set();
    this.mainMenuAlignmentTargets = new Set();
    this.policyDock = null;
    this.settingsListeners = [];
    this.mainMenuLayeredSelectTargets = new Set();
    this.extensionTooltip = null;
    this.documentClickHandler = null;
    this.keydownHandler = null;
    this.unsubscribeAdminRoles = null;
    this.unsubscribeAdminUid = null;
    this.unsubscribeFriendHighlight = null;
    this.virusMotherCellSettingsUi = null;
    this.gameBackgroundSettingsUi = null;
    this.virusPelletColorSettingsUi = null;
    this.cellMassSettingsUi = null;
    this.jellyShaderSettingsUi = null;
    this.fpsSaverSettingsUi = null;
  }

  start() {
    if (this.started) {
      return true;
    }

    if (!this.document?.documentElement) {
      this.logger.warn('[Blobio] Menu feature could not start: document is not ready.');
      return false;
    }

    if (!this.frontPageUi) {
      this.started = true;
      return true;
    }

    this.ensureStyle();
    this.applyPageClass();
    this.syncMainMenuAlignment();
    this.installToolbar();
    this.hideOriginalSections();
    this.installPolicyDock();
    this.installExtensionSettings();
    this.installAdminSettingTracking();
    this.installFriendHighlightTracking();
    this.syncWatermark();
    this.syncUsernameAnimation();
    this.watchPage();

    this.documentClickHandler = (event) => {
      if (this.toolbar?.contains(event.target) || this.policyDock?.contains(event.target) || this.footerModalHost?.contains(event.target)) {
        return;
      }

      this.closePanels();
    };

    this.keydownHandler = (event) => {
      if (event.key === 'Escape') {
        this.closePanels();
      }
    };

    this.document.addEventListener?.('click', this.documentClickHandler);
    this.document.addEventListener?.('keydown', this.keydownHandler);

    this.started = true;
    return true;
  }

  destroy() {
    this.observer?.disconnect();
    this.observer = null;
    this.clearRefreshTimer();

    if (this.documentClickHandler) {
      this.document.removeEventListener?.('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }

    if (this.keydownHandler) {
      this.document.removeEventListener?.('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    this.toolbar?.remove();
    this.toolbar = null;
    this.policyDock?.remove();
    this.policyDock = null;
    this.footerModalHost?.remove();
    this.footerModalHost = null;
    this.panelBodies.clear();
    this.unsubscribeAdminRoles?.();
    this.unsubscribeAdminUid?.();
    this.unsubscribeFriendHighlight?.();
    this.unsubscribeAdminRoles = null;
    this.unsubscribeAdminUid = null;
    this.unsubscribeFriendHighlight = null;
    this.virusMotherCellSettingsUi?.destroy?.();
    this.virusMotherCellSettingsUi = null;
    this.gameBackgroundSettingsUi?.destroy?.();
    this.gameBackgroundSettingsUi = null;
    this.virusPelletColorSettingsUi?.destroy?.();
    this.virusPelletColorSettingsUi = null;
    this.cellMassSettingsUi?.destroy?.();
    this.cellMassSettingsUi = null;
    this.jellyShaderSettingsUi?.destroy?.();
    this.jellyShaderSettingsUi = null;
    this.fpsSaverSettingsUi?.destroy?.();
    this.fpsSaverSettingsUi = null;
    this.cleanupExtensionSettings();
    for (const node of this.hiddenOriginalNodes) {
      node.classList?.remove(HIDDEN_CLASS);
    }

    this.hiddenOriginalNodes.clear();
    this.clearMainMenuAlignment();

    const style = this.styleNode || this.document.getElementById?.(this.styleId);
    style?.remove();
    this.styleNode = null;

    this.document.documentElement?.classList.remove(this.className);
    this.document.body?.classList.remove(this.className);
    this.started = false;
  }

  ensureStyle() {
    const existingStyle = this.document.getElementById?.(this.styleId);
    if (existingStyle) {
      this.styleNode = existingStyle;
      return;
    }

    const style = this.document.createElement('style');
    style.id = this.styleId;
    style.textContent = this.buildCss();

    const parent = this.document.head || this.document.documentElement;
    parent.appendChild(style);
    this.styleNode = style;
  }

  buildCss() {
    return buildMenuCss({
      className: this.className,
      hiddenClass: HIDDEN_CLASS,
      toolbarClass: DEFAULT_TOOLBAR_CLASS,
    });
  }

  applyPageClass() {
    this.document.documentElement.classList.add(this.className);
    this.document.body?.classList.add(this.className);
  }

  syncMainMenuAlignment() {
    if (!this.frontPageUi) {
      return;
    }

    const selectors = [
      '.logo',
      '.main-logo',
      '.inputs-container',
      '#game-wrapper .custom-select',
      '#ip-container',
    ];
    const nextTargets = new Set();
    const nextLayeredSelects = new Set();

    for (const selector of selectors) {
      for (const node of this.document.querySelectorAll?.(selector) || []) {
        if (this.isInsideOwnUi(node)) {
          continue;
        }

        node.classList?.add(MAIN_MENU_ALIGNMENT_CLASS);
        nextTargets.add(node);
      }
    }

    const gameSelects = Array.from(this.document.querySelectorAll?.('#game-wrapper .custom-select') || [])
      .filter((node) => !this.isInsideOwnUi(node));
    for (const node of gameSelects.slice(0, 2)) {
      node.classList?.add(MAIN_MENU_LAYERED_SELECT_CLASS);
      nextLayeredSelects.add(node);
    }

    for (const node of this.mainMenuAlignmentTargets) {
      if (!nextTargets.has(node)) {
        node.classList?.remove(MAIN_MENU_ALIGNMENT_CLASS);
      }
    }

    this.mainMenuAlignmentTargets = nextTargets;

    for (const node of this.mainMenuLayeredSelectTargets) {
      if (!nextLayeredSelects.has(node)) {
        node.classList?.remove(MAIN_MENU_LAYERED_SELECT_CLASS);
      }
    }

    this.mainMenuLayeredSelectTargets = nextLayeredSelects;
  }

  clearMainMenuAlignment() {
    for (const node of this.mainMenuAlignmentTargets) {
      node.classList?.remove(MAIN_MENU_ALIGNMENT_CLASS);
    }

    this.mainMenuAlignmentTargets.clear();

    for (const node of this.mainMenuLayeredSelectTargets) {
      node.classList?.remove(MAIN_MENU_LAYERED_SELECT_CLASS);
    }

    this.mainMenuLayeredSelectTargets.clear();
  }

  watchPage() {
    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return;
    }

    this.observer = new MutationObserver((mutations = []) => {
      if (mutations.length > 0 && mutations.every((mutation) => this.isOwnMutation(mutation))) {
        return;
      }

      this.scheduleRefresh();
    });

    this.observer.observe(this.document.documentElement, { childList: true, subtree: true });
  }

  scheduleRefresh() {
    if (this.refreshTimer !== null) {
      return;
    }

    const setTimer = this.document.defaultView?.setTimeout || globalThis.setTimeout;
    this.refreshTimer = setTimer(() => {
      this.refreshTimer = null;
      if (!this.started) {
        return;
      }

      this.applyPageClass();
      this.syncMainMenuAlignment();
      this.installToolbar();
      this.hideOriginalSections();
      this.installPolicyDock();
      this.installExtensionSettings();
      this.syncWatermark();
      this.syncUsernameAnimation();
    }, 0);
  }

  clearRefreshTimer() {
    if (this.refreshTimer === null) {
      return;
    }

    const clearTimer = this.document.defaultView?.clearTimeout || globalThis.clearTimeout;
    clearTimer(this.refreshTimer);
    this.refreshTimer = null;
  }

  installToolbar() {
    if (!this.document.body) {
      return;
    }

    if (!this.toolbar) {
      this.toolbar = this.createToolbar();
    }

    const replayButton = this.findReplayButton();
    if (replayButton?.parentNode) {
      const parent = replayButton.parentNode;
      if (this.toolbar.parentNode === parent && replayButton.nextSibling === this.toolbar) {
        this.toolbar.classList.remove('is-floating');
        return;
      }

      const referenceNode = replayButton.nextSibling || null;
      parent.insertBefore(this.toolbar, referenceNode);
      this.toolbar.classList.remove('is-floating');
      return;
    }

    if (this.toolbar.parentNode !== this.document.body) {
      this.document.body.appendChild(this.toolbar);
    }

    this.toolbar.classList.add('is-floating');
  }

  createToolbar() {
    const toolbar = this.document.createElement('div');
    toolbar.classList.add(DEFAULT_TOOLBAR_CLASS);

    const buttons = this.document.createElement('div');
    buttons.classList.add('blobio-menu-buttons');
    buttons.append(
      this.createButton('Featured', this.assets.recommendedButton, 'featured'),
      this.createButton('Updates', this.assets.updatesButton, 'updates'),
      this.createButton('Socials', this.assets.socialsButton, 'socials'),
    );

    toolbar.appendChild(buttons);
    toolbar.append(this.createFeaturedPanel(), this.createUpdatesPanel(), this.createSocialsPanel());
    return toolbar;
  }

  createButton(label, imageUrl, panelName) {
    const button = this.document.createElement('button');
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('_ngcontent-c1', '');
    button.dataset.panel = panelName;
    button.classList.add('icon-button', 'blobio-menu-button');
    button.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : '';

    const hiddenLabel = this.document.createElement('span');
    hiddenLabel.classList.add('blobio-menu-label');
    hiddenLabel.textContent = label;

    button.appendChild(hiddenLabel);
    button.addEventListener('click', (event) => {
      event.stopPropagation?.();
      this.togglePanel(panelName);
    });

    return button;
  }

  createFeaturedPanel() {
    const panel = this.createPanel('featured', 'Featured Blob.io Video');
    this.renderFeaturedPanel();
    return panel;
  }

  createUpdatesPanel() {
    const panel = this.createPanel('updates', 'Update Notes');
    const body = this.panelBodies.get('updates');
    const list = this.document.createElement('div');
    list.classList.add('blobio-update-list');

    for (const note of UPDATE_NOTES) {
      const entry = this.document.createElement('div');
      entry.classList.add('blobio-update-entry');

      const date = this.document.createElement('div');
      date.classList.add('blobio-update-date');
      date.textContent = note.date;

      const items = this.document.createElement('ul');
      items.classList.add('blobio-update-items');

      for (const item of note.items) {
        const row = this.document.createElement('li');
        row.textContent = item;
        items.appendChild(row);
      }

      entry.append(date, items);
      list.appendChild(entry);
    }

    body.appendChild(list);
    return panel;
  }

  createSocialsPanel() {
    const panel = this.createPanel('socials', '');
    this.renderSocialPanel();
    return panel;
  }

  installPolicyDock() {
    const links = this.getPolicyPanelLinks();
    const games = this.getOtherProjectLinks();
    if (links.length === 0 && games.length === 0) {
      this.policyDock?.remove();
      this.policyDock = null;
      this.footerModalHost?.remove();
      this.footerModalHost = null;
      return;
    }

    if (!this.policyDock) {
      this.policyDock = this.createPolicyDock();
      this.document.body?.appendChild(this.policyDock);
    }

    if (!this.footerModalHost) {
      this.footerModalHost = this.createFooterModalHost();
      this.document.body?.appendChild(this.footerModalHost);
    }

    this.ensureDockPanel('policy-games', links.length > 0 || games.length > 0);
  }

  createPolicyDock() {
    const dock = this.document.createElement('div');
    dock.classList.add('blobio-footer-dock', 'blobio-policy-dock');

    const buttons = this.document.createElement('div');
    buttons.classList.add('blobio-dock-buttons');

    if (this.getPolicyPanelLinks().length > 0 || this.getOtherProjectLinks().length > 0) {
      buttons.appendChild(this.createDockButton('Policy/Other Games', 'policy-games', 'blobio-policy-games-button'));
    }

    dock.appendChild(buttons);
    return dock;
  }

  createFooterModalHost() {
    const host = this.document.createElement('div');
    host.classList.add('blobio-footer-modal-host');
    return host;
  }

  ensureDockPanel(panelName, shouldExist) {
    const existingPanel = this.document.getElementById?.(`blobio-panel-${panelName}`);

    if (!shouldExist) {
      existingPanel?.remove();
      this.panelBodies.delete(panelName);
      return;
    }

    if (!existingPanel && this.footerModalHost) {
      this.footerModalHost.appendChild(this.createPanel(panelName, ''));
    }
  }

  createDockButton(label, panelName, className) {
    const button = this.document.createElement('button');
    button.type = 'button';
    button.classList.add('blobio-dock-button', className);
    button.dataset.panel = panelName;
    button.textContent = label;
    button.addEventListener('click', (event) => {
      event.stopPropagation?.();
      this.togglePanel(panelName);
    });

    return button;
  }

  createPanel(name, titleText) {
    const panel = this.document.createElement('section');
    panel.id = `blobio-panel-${name}`;
    panel.classList.add('blobio-menu-panel');

    const inner = this.document.createElement('div');
    inner.classList.add('blobio-panel-inner');

    const header = this.document.createElement('div');
    header.classList.add('blobio-panel-header');

    const title = this.document.createElement('h3');
    title.classList.add('blobio-panel-title');
    title.textContent = titleText;

    const close = this.document.createElement('button');
    close.type = 'button';
    close.classList.add('blobio-panel-close');
    close.setAttribute('aria-label', titleText ? `Close ${titleText}` : 'Close panel');
    close.textContent = 'X';
    close.addEventListener('click', (event) => {
      event.stopPropagation?.();
      this.closePanels();
    });

    const body = this.document.createElement('div');
    body.classList.add('blobio-panel-body');

    if (titleText) {
      header.appendChild(title);
    }

    header.appendChild(close);
    inner.append(header, body);
    panel.appendChild(inner);
    this.panelBodies.set(name, body);
    return panel;
  }

  renderFeaturedPanel() {
    const body = this.panelBodies.get('featured');
    if (!body) {
      return;
    }

    this.clearElement(body);

    const video = this.getFeaturedVideo();
    const link = this.document.createElement('a');
    link.classList.add('blobio-video-link');
    link.setAttribute('href', video.url);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');

    const image = this.document.createElement('img');
    image.classList.add('blobio-video-thumb');
    image.setAttribute('alt', '');
    image.setAttribute('src', video.thumbnail);

    const title = this.document.createElement('p');
    title.classList.add('blobio-video-title');
    title.textContent = video.title;

    link.append(image, title);
    body.appendChild(link);
  }

  renderSocialPanel() {
    const body = this.panelBodies.get('socials');
    if (!body) {
      return;
    }

    this.clearElement(body);

    const title = this.document.createElement('div');
    title.classList.add('blobio-social-title');
    title.textContent = 'Blobio Socials';

    const row = this.document.createElement('div');
    row.classList.add('blobio-social-row');

    for (const social of this.getSocialLinks()) {
      const link = this.document.createElement('a');
      link.classList.add('blobio-social-link');
      link.setAttribute('href', social.href);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.setAttribute('title', social.label);

      const image = this.document.createElement('img');
      image.setAttribute('alt', social.label);
      image.setAttribute('src', this.assets[social.assetKey] || '');

      link.appendChild(image);
      row.appendChild(link);
    }

    body.append(title, row);
  }

  renderPolicyPanel() {
    const body = this.panelBodies.get('policy');
    if (!body) {
      return;
    }

    this.clearElement(body);

    const links = this.document.createElement('div');
    links.classList.add('blobio-policy-links');

    for (const original of this.getPolicyPanelLinks()) {
      const link = this.document.createElement('a');
      link.classList.add('blobio-policy-link');
      link.setAttribute('href', original.getAttribute('href'));
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.textContent = original.textContent.trim() || original.getAttribute('href');
      links.appendChild(link);
    }

    body.appendChild(links);
  }

  renderPolicyGamesPanel() {
    const body = this.panelBodies.get('policy-games');
    if (!body) {
      return;
    }

    this.clearElement(body);

    const policyLinks = this.getPolicyPanelLinks();
    if (policyLinks.length > 0) {
      const section = this.createPanelSection('Policy');
      const links = this.document.createElement('div');
      links.classList.add('blobio-policy-links');

      for (const original of policyLinks) {
        const link = this.document.createElement('a');
        link.classList.add('blobio-policy-link');
        link.setAttribute('href', original.getAttribute('href'));
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.textContent = original.textContent.trim() || original.getAttribute('href');
        links.appendChild(link);
      }

      section.appendChild(links);
      body.appendChild(section);
    }

    const gameLinks = this.getOtherProjectLinks();
    if (gameLinks.length > 0) {
      const section = this.createPanelSection('Other Games');
      section.appendChild(this.createGameLinks(gameLinks));
      body.appendChild(section);
    }
  }

  createPanelSection(titleText) {
    const section = this.document.createElement('section');
    section.classList.add('blobio-panel-section');

    const title = this.document.createElement('div');
    title.classList.add('blobio-panel-section-title');
    title.textContent = titleText;

    section.appendChild(title);
    return section;
  }

  renderGamesPanel() {
    const body = this.panelBodies.get('games');
    if (!body) {
      return;
    }

    this.clearElement(body);
    body.appendChild(this.createGameLinks(this.getOtherProjectLinks()));
  }

  createGameLinks(projectLinks) {
    const links = this.document.createElement('div');
    links.classList.add('blobio-game-links');

    for (const [index, original] of projectLinks.entries()) {
      const labelText = OTHER_GAME_NAMES[index] || original.getAttribute('aria-label') || original.getAttribute('title') || 'Other game';
      const href = original.getAttribute('href');
      const card = this.document.createElement('div');
      card.classList.add('blobio-game-card');

      const label = this.document.createElement('div');
      label.classList.add('blobio-game-label');
      label.textContent = labelText;

      const gameLink = this.document.createElement(href ? 'a' : 'button');
      gameLink.classList.add('blobio-game-link');
      gameLink.setAttribute('aria-label', labelText);
      gameLink.style.backgroundImage = original.style?.backgroundImage || this.extractBackgroundImage(original.getAttribute('style') || '');

      if (href) {
        gameLink.setAttribute('href', href);
        gameLink.setAttribute('target', original.getAttribute('target') || '_blank');
        gameLink.setAttribute('rel', 'noopener noreferrer');
      } else {
        gameLink.type = 'button';
        gameLink.addEventListener('click', (event) => {
          event.stopPropagation?.();
          original.click?.();
        });
      }

      card.append(label, gameLink);
      links.appendChild(card);
    }

    return links;
  }

  installExtensionSettings() {
    const settingsPanels = Array.from(this.document.querySelectorAll?.('app-settings') || []);

    for (const settings of settingsPanels) {
      if (this.isInsideOwnUi(settings)) {
        continue;
      }

      const left = settings.querySelector?.('.left');
      const tabs = left?.querySelector?.('ul');
      const right = settings.querySelector?.('.right');
      const content = right?.querySelector?.('.content-container');
      if (!tabs || !content) {
        continue;
      }

      let tab = settings.querySelector?.('.blobio-extension-settings-tab');
      let panel = settings.querySelector?.('.blobio-extension-settings-panel');

      if (!tab) {
        tab = this.createExtensionSettingsTab(settings);
        tabs.appendChild(tab);
      }

      if (panel && !panel.querySelector?.('.blobio-extension-category-tabs')) {
        panel.remove?.();
        panel = null;
      }

      if (!panel) {
        panel = this.createExtensionSettingsPanel();
        content.appendChild(panel);
      }

      this.activateExtensionCategory(panel, panel.dataset.activeCategory || EXTENSION_DEFAULT_CATEGORY);
      this.syncExtensionSettingsCheckboxes(panel);
      this.syncExtensionSettingsPanelHeight(settings);

      if (tab.dataset.blobioExtensionListener !== 'true') {
        tab.dataset.blobioExtensionListener = 'true';
        this.addSettingsListener(tab, 'click', (event) => {
          event.stopPropagation?.();
          this.activateExtensionSettings(settings);
        });
      }

      for (const item of tabs.children || []) {
        if (item === tab) {
          continue;
        }

        if (item.dataset.blobioExtensionCloseListener !== 'true') {
          item.dataset.blobioExtensionCloseListener = 'true';
          this.addSettingsListener(item, 'click', () => {
            this.deactivateExtensionSettings(settings);
          });
        }
      }
    }
  }

  createExtensionSettingsTab(settings) {
    const tab = this.document.createElement('li');
    tab.classList.add('blobio-extension-settings-tab');
    tab.setAttribute('_ngcontent-c3', '');
    tab.textContent = 'Extension';
    tab.dataset.settingsPanel = 'extension';
    return tab;
  }

  createExtensionSettingsPanel() {
    const panel = this.document.createElement('div');
    panel.classList.add('blobio-extension-settings-panel');
    panel.setAttribute('_ngcontent-c3', '');

    const tabs = this.document.createElement('div');
    tabs.classList.add('blobio-extension-category-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Extension setting categories');
    tabs.setAttribute('_ngcontent-c3', '');

    const categoryPanels = new Map();
    for (const [key, label] of EXTENSION_SETTING_CATEGORIES) {
      const button = this.document.createElement('button');
      button.type = 'button';
      button.classList.add('blobio-extension-category-button');
      button.dataset.category = key;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');
      button.setAttribute('_ngcontent-c3', '');
      button.textContent = label;
      this.addSettingsListener(button, 'click', (event) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        this.activateExtensionCategory(panel, key);
      });
      tabs.appendChild(button);

      const categoryPanel = this.document.createElement('div');
      categoryPanel.classList.add('grid-container', 'blobio-extension-category-panel');
      categoryPanel.dataset.category = key;
      categoryPanel.setAttribute('role', 'tabpanel');
      categoryPanel.setAttribute('aria-label', `${label} extension settings`);
      categoryPanel.setAttribute('_ngcontent-c3', '');
      categoryPanels.set(key, categoryPanel);
    }

    this.fpsSaverSettingsUi?.destroy?.();
    this.fpsSaverSettingsUi = new FpsSaverSettingsUi({
      document: this.document,
      storage: this.storage,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('fps').append(...this.fpsSaverSettingsUi.create());

    const fpsSaverSettings = readFpsSaverSettings(this.storage, this.document);
    categoryPanels.get('fps').append(
      this.createFpsSaverSwitchRow({
        id: 'config-switch-fps-saver-lite-mode',
        key: 'liteMode',
        label: 'Lite-Mode',
        description: EXTENSION_OPTION_TOOLTIPS.liteMode,
        checked: fpsSaverSettings.liteMode,
      }),
      this.createFpsSaverSwitchRow({
        id: 'config-switch-fps-saver-no-transitions',
        key: 'noTransitions',
        label: 'No-Transitions',
        description: EXTENSION_OPTION_TOOLTIPS.noTransitions,
        checked: fpsSaverSettings.noTransitions,
      }),
      this.createFpsSaverSwitchRow({
        id: 'config-switch-fps-saver-game-overlay',
        key: 'gameOverlay',
        label: 'Game-Overlay',
        description: EXTENSION_OPTION_TOOLTIPS.gameOverlay,
        checked: fpsSaverSettings.gameOverlay,
      }),
      this.createFpsSaverSwitchRow({
        id: 'config-switch-fps-saver-toast-modal-anim',
        key: 'toastModalAnim',
        label: 'Toast-Modal-Anim',
        description: EXTENSION_OPTION_TOOLTIPS.toastModalAnim,
        checked: fpsSaverSettings.toastModalAnim,
      }),
      this.createFpsSaverSwitchRow({
        id: 'config-switch-fps-saver-chat-guard',
        key: 'chatGuard',
        label: 'Chat-Guard',
        description: EXTENSION_OPTION_TOOLTIPS.chatGuard,
        checked: fpsSaverSettings.chatGuard,
      }),
      this.createExtensionSwitchRow({
        id: 'config-switch-fps-uncap',
        label: 'FPS-uncap',
        description: EXTENSION_OPTION_TOOLTIPS.fpsUncap,
        checked: isFpsUncapEnabled(this.storage),
        onChange: (enabled, checkbox) => {
          checkbox.checked = setFpsUncapEnabled(this.storage, enabled);
        },
      }),
    );

    this.cellMassSettingsUi?.destroy?.();
    this.cellMassSettingsUi = new CellMassSettingsUi({
      document: this.document,
      storage: this.storage,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('cell').appendChild(this.cellMassSettingsUi.create());

    this.virusMotherCellSettingsUi?.destroy?.();
    this.virusMotherCellSettingsUi = new VirusMotherCellSettingsUi({
      document: this.document,
      storage: this.storage,
      assets: this.assets,
      logger: this.logger,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('theme').appendChild(this.virusMotherCellSettingsUi.create());

    this.gameBackgroundSettingsUi?.destroy?.();
    this.gameBackgroundSettingsUi = new GameBackgroundSettingsUi({
      document: this.document,
      storage: this.storage,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('theme').appendChild(this.gameBackgroundSettingsUi.create());

    this.virusPelletColorSettingsUi?.destroy?.();
    this.virusPelletColorSettingsUi = new VirusPelletColorSettingsUi({
      document: this.document,
      storage: this.storage,
      assets: this.assets,
      logger: this.logger,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('theme').appendChild(this.virusPelletColorSettingsUi.create());

    this.jellyShaderSettingsUi?.destroy?.();
    this.jellyShaderSettingsUi = new JellyShaderSettingsUi({
      document: this.document,
      storage: this.storage,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('animation').appendChild(this.jellyShaderSettingsUi.create());

    categoryPanels.get('text').append(
      this.createExtensionSwitchRow({
        id: 'config-switch-watermark',
        label: 'WaterMark',
        description: EXTENSION_OPTION_TOOLTIPS.watermark,
        checked: this.isWatermarkEnabled(),
        onChange: (enabled) => {
          this.setWatermarkEnabled(enabled);
          this.syncWatermark();
        },
      }),
      this.createExtensionSwitchRow({
        id: 'config-switch-friend-highlight',
        label: 'Friends-highlight',
        description: EXTENSION_OPTION_TOOLTIPS.friendHighlight,
        checked: Boolean(this.friendHighlightStore?.isEnabled?.()),
        onChange: (enabled, checkbox) => {
          checkbox.checked = this.friendHighlightStore?.setEnabled?.(enabled) ?? false;
        },
      }),
      this.createExtensionSwitchRow({
        id: 'config-switch-hide-admin-md',
        label: 'Hide MD badge',
        description: EXTENSION_OPTION_TOOLTIPS.hideAdminMd,
        checked: isHideAdminMdEnabled(this.storage),
        rowClass: 'blobio-admin-only-setting-row',
        onChange: (enabled, checkbox) => {
          checkbox.checked = setHideAdminMdEnabled(this.storage, enabled);
        },
      }),
    );

    panel.appendChild(tabs);
    for (const [key] of EXTENSION_SETTING_CATEGORIES) {
      panel.appendChild(categoryPanels.get(key));
    }

    this.activateExtensionCategory(panel, EXTENSION_DEFAULT_CATEGORY);
    this.syncAdminSettingVisibility(panel);
    return panel;
  }

  closeExtensionSettingMenus(except = null) {
    for (const ui of [
      this.virusMotherCellSettingsUi,
      this.gameBackgroundSettingsUi,
      this.virusPelletColorSettingsUi,
      this.cellMassSettingsUi,
      this.jellyShaderSettingsUi,
      this.fpsSaverSettingsUi,
    ]) {
      if (ui && ui !== except) {
        ui.setOpen?.(false);
      }
    }
  }

  activateExtensionCategory(panel, category) {
    if (!panel) {
      return;
    }

    const validCategory = EXTENSION_SETTING_CATEGORIES.some(([key]) => key === category)
      ? category
      : EXTENSION_DEFAULT_CATEGORY;
    panel.dataset.activeCategory = validCategory;

    for (const button of panel.querySelectorAll?.('.blobio-extension-category-button') || []) {
      const active = button.dataset.category === validCategory;
      if (active) {
        button.classList.add('is-active');
      } else {
        button.classList.remove('is-active');
      }
      button.setAttribute('aria-selected', String(active));
    }

    for (const categoryPanel of panel.querySelectorAll?.('.blobio-extension-category-panel') || []) {
      const active = categoryPanel.dataset.category === validCategory;
      categoryPanel.hidden = !active;
      if (active) {
        categoryPanel.classList.add('is-active');
      } else {
        categoryPanel.classList.remove('is-active');
      }
    }
  }

  createExtensionSwitchRow({ id, label, description, checked, onChange, rowClass = '' }) {
    const row = this.document.createElement('div');
    row.classList.add('grid-item', 'blobio-extension-setting-row');
    if (rowClass) {
      row.classList.add(rowClass);
    }
    row.setAttribute('_ngcontent-c3', '');
    if (description) {
      row.dataset.blobioTooltip = description;
    }

    const switchLabel = this.document.createElement('label');
    switchLabel.classList.add('switch');
    switchLabel.setAttribute('_ngcontent-c3', '');

    const checkbox = this.document.createElement('input');
    checkbox.id = id;
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.classList.add('ng-untouched', 'ng-pristine', 'ng-valid');
    checkbox.setAttribute('_ngcontent-c3', '');
    checkbox.setAttribute('type', 'checkbox');

    const slider = this.document.createElement('span');
    slider.classList.add('slider');
    slider.setAttribute('_ngcontent-c3', '');

    const textLabel = this.document.createElement('label');
    textLabel.setAttribute('_ngcontent-c3', '');
    textLabel.setAttribute('for', checkbox.id);
    textLabel.textContent = label;

    const spacer = this.document.createElement('span');
    spacer.classList.add('blobio-extension-row-spacer');
    spacer.setAttribute('aria-hidden', 'true');

    switchLabel.append(checkbox, slider);
    row.append(switchLabel, textLabel, spacer);

    this.addSettingsListener(checkbox, 'change', () => {
      onChange(Boolean(checkbox.checked), checkbox);
    });

    if (description) {
      this.addSettingsListener(row, 'mouseenter', (event) => this.showExtensionTooltip(row, event));
      this.addSettingsListener(row, 'mousemove', (event) => this.moveExtensionTooltip(event));
      this.addSettingsListener(row, 'mouseleave', () => this.hideExtensionTooltip());
    }

    return row;
  }

  createFpsSaverSwitchRow({ id, key, label, description, checked }) {
    return this.createExtensionSwitchRow({
      id,
      label,
      description,
      checked,
      onChange: (enabled, checkbox) => {
        const settings = this.setFpsSaverSetting({ [key]: enabled });
        checkbox.checked = Boolean(settings[key]);
        this.fpsSaverSettingsUi?.sync?.();
      },
    });
  }

  setFpsSaverSetting(changes) {
    return saveFpsSaverSettings(this.storage, {
      ...readFpsSaverSettings(this.storage, this.document),
      ...changes,
    }, this.document);
  }

  activateExtensionSettings(settings) {
    const left = settings.querySelector?.('.left');
    const extensionTab = settings.querySelector?.('.blobio-extension-settings-tab');

    for (const item of left?.querySelector?.('ul')?.children || []) {
      item.classList?.remove('active');
    }

    const panel = settings.querySelector?.('.blobio-extension-settings-panel');
    this.activateExtensionCategory(panel, panel?.dataset?.activeCategory || EXTENSION_DEFAULT_CATEGORY);
    this.syncExtensionSettingsPanelHeight(settings);
    settings.classList.add('blobio-extension-settings-active');
    extensionTab?.classList.add('active');
  }

  deactivateExtensionSettings(settings) {
    settings.classList.remove('blobio-extension-settings-active');
    settings.querySelector?.('.blobio-extension-settings-tab')?.classList.remove('active');
  }

  syncExtensionSettingsPanelHeight(settings) {
    if (!settings) {
      return;
    }

    const right = settings.querySelector?.('.right');
    const inner = right?.querySelector?.(':scope > .inner-container')
      || settings.querySelector?.('.right > .inner-container')
      || settings.querySelector?.('.right .inner-container');
    if (!right || !inner) {
      return;
    }

    const rightRect = right.getBoundingClientRect?.() || {};
    const innerRect = inner.getBoundingClientRect?.() || {};
    const rightHeight = Math.max(
      Number(rightRect.height) || 0,
      Number(right.clientHeight) || 0,
      Number(right.offsetHeight) || 0,
    );
    const rightBottom = Number(rightRect.bottom) || ((Number(rightRect.top) || 0) + rightHeight);
    const innerTop = Number(innerRect.top) || Number(rightRect.top) || 0;
    const availableHeight = rightBottom > innerTop
      ? rightBottom - innerTop - 8
      : rightHeight - 8;
    const fallbackHeight = Math.max(
      Number(innerRect.height) || 0,
      Number(inner.clientHeight) || 0,
      Number(inner.offsetHeight) || 0,
    );
    const height = Math.max(availableHeight, fallbackHeight);

    if (height < 100) {
      return;
    }

    this.setStyleProperty(settings, '--blobio-extension-settings-panel-height', `${Math.floor(height)}px`);
  }

  syncExtensionSettingsCheckboxes(panel) {
    const watermark = panel.querySelector?.('#config-switch-watermark');
    if (watermark) {
      watermark.checked = this.isWatermarkEnabled();
    }

    const fpsUncap = panel.querySelector?.('#config-switch-fps-uncap');
    if (fpsUncap) {
      fpsUncap.checked = isFpsUncapEnabled(this.storage);
    }

    const fpsSaverSettings = readFpsSaverSettings(this.storage, this.document);
    const fpsSaverSwitches = {
      '#config-switch-fps-saver-lite-mode': 'liteMode',
      '#config-switch-fps-saver-no-transitions': 'noTransitions',
      '#config-switch-fps-saver-game-overlay': 'gameOverlay',
      '#config-switch-fps-saver-toast-modal-anim': 'toastModalAnim',
      '#config-switch-fps-saver-chat-guard': 'chatGuard',
    };
    for (const [selector, key] of Object.entries(fpsSaverSwitches)) {
      const checkbox = panel.querySelector?.(selector);
      if (checkbox) {
        checkbox.checked = Boolean(fpsSaverSettings[key]);
      }
    }

    const friendHighlight = panel.querySelector?.('#config-switch-friend-highlight');
    if (friendHighlight) {
      friendHighlight.checked = Boolean(this.friendHighlightStore?.isEnabled?.());
    }

    const hideAdminMd = panel.querySelector?.('#config-switch-hide-admin-md');
    if (hideAdminMd) {
      hideAdminMd.checked = isHideAdminMdEnabled(this.storage);
    }

    this.jellyShaderSettingsUi?.sync?.();
    this.cellMassSettingsUi?.sync?.();
    this.fpsSaverSettingsUi?.sync?.();
    this.syncAdminSettingVisibility(panel);
  }

  installFriendHighlightTracking() {
    if (!this.unsubscribeFriendHighlight) {
      this.unsubscribeFriendHighlight = this.friendHighlightStore?.subscribe?.(() => {
        for (const panel of this.document.querySelectorAll?.('.blobio-extension-settings-panel') || []) {
          const checkbox = panel.querySelector?.('#config-switch-friend-highlight');
          if (checkbox) {
            checkbox.checked = Boolean(this.friendHighlightStore?.isEnabled?.());
          }
        }
      }) || null;
    }
  }

  installAdminSettingTracking() {
    if (!this.unsubscribeAdminRoles) {
      this.unsubscribeAdminRoles = this.roleRegistry?.subscribe?.(() => this.syncAdminSettings()) || null;
    }
    if (!this.unsubscribeAdminUid) {
      this.unsubscribeAdminUid = this.uidDetector?.subscribe?.(() => this.syncAdminSettings()) || null;
    }
    this.syncAdminSettings();
  }

  syncAdminSettings() {
    for (const panel of this.document.querySelectorAll?.('.blobio-extension-settings-panel') || []) {
      this.syncExtensionSettingsCheckboxes(panel);
    }
  }

  syncAdminSettingVisibility(panel) {
    const row = panel?.querySelector?.('.blobio-admin-only-setting-row');
    if (!row) {
      return;
    }

    const visible = this.isCurrentUserAdmin();
    row.hidden = !visible;
    if (visible) {
      row.classList.remove('is-hidden');
    } else {
      row.classList.add('is-hidden');
    }
  }

  isCurrentUserAdmin() {
    const uid = this.uidDetector?.getUid?.() || '';
    return Boolean(uid && this.roleRegistry?.isAdmin?.(uid));
  }

  addSettingsListener(node, type, handler) {
    node.addEventListener?.(type, handler);
    this.settingsListeners.push({ node, type, handler });
  }

  cleanupExtensionSettings() {
    for (const { node, type, handler } of this.settingsListeners) {
      node.removeEventListener?.(type, handler);
    }

    this.settingsListeners = [];

    for (const settings of this.document.querySelectorAll?.('app-settings') || []) {
      settings.classList?.remove('blobio-extension-settings-active');
    }

    for (const node of this.document.querySelectorAll?.('.blobio-extension-settings-tab, .blobio-extension-settings-panel') || []) {
      node.remove();
    }

    this.hideExtensionTooltip();
    this.removeWatermarks();
  }

  showExtensionTooltip(row, event) {
    const text = row?.dataset?.blobioTooltip || '';
    if (!text) {
      return;
    }

    if (!this.extensionTooltip) {
      this.extensionTooltip = this.document.createElement('div');
      this.extensionTooltip.classList.add('blobio-extension-tooltip');
      this.document.body?.appendChild(this.extensionTooltip);
    }

    this.renderExtensionTooltip(text);
    this.moveExtensionTooltip(event);
  }

  renderExtensionTooltip(text) {
    if (!this.extensionTooltip) {
      return;
    }

    while (this.extensionTooltip.firstChild || this.extensionTooltip.children?.length) {
      this.extensionTooltip.removeChild(this.extensionTooltip.firstChild || this.extensionTooltip.children[0]);
    }

    const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim());
    for (const line of lines) {
      const metric = line.match(/^FPS-(Impact|Gain):\s*([A-Za-z]+)\[([^\]]+)\]$/);
      const warning = line.match(/^\[(WARNING:[^\]]+)\]$/);
      const item = this.document.createElement('div');
      item.classList.add('blobio-extension-tooltip-line');

      if (metric) {
        const metricKind = metric[1].toLowerCase();
        const levelKind = metric[2].toLowerCase();
        item.classList.add('blobio-extension-tooltip-metric', `is-${metricKind}`, `is-level-${levelKind}`);

        const label = this.document.createElement('span');
        label.classList.add('blobio-extension-tooltip-metric-label');
        label.textContent = `FPS-${metric[1]}: `;

        const level = this.document.createElement('span');
        level.classList.add('blobio-extension-tooltip-metric-level', `is-${levelKind}`);
        level.textContent = metric[2];

        const range = this.document.createElement('span');
        range.classList.add('blobio-extension-tooltip-metric-range');
        range.textContent = `[${metric[3]}]`;

        item.append(label, level, range);
      } else if (warning) {
        item.classList.add('blobio-extension-tooltip-warning');
        item.textContent = `[${warning[1]}]`;
      } else {
        item.textContent = line;
      }

      this.extensionTooltip.appendChild(item);
    }
  }

  moveExtensionTooltip(event) {
    if (!this.extensionTooltip || !event) {
      return;
    }

    this.extensionTooltip.style.left = `${Number(event.clientX || 0) + 14}px`;
    this.extensionTooltip.style.top = `${Number(event.clientY || 0) + 14}px`;
  }

  hideExtensionTooltip() {
    this.extensionTooltip?.remove();
    this.extensionTooltip = null;
  }

  isWatermarkEnabled() {
    try {
      const value = this.storage?.getItem?.(WATERMARK_STORAGE_KEY);
      return value === null ? true : value === '1';
    } catch (error) {
      this.logger.warn('[Blobio] Could not read WaterMark setting.', error);
      return true;
    }
  }

  setWatermarkEnabled(enabled) {
    try {
      this.storage?.setItem?.(WATERMARK_STORAGE_KEY, enabled ? '1' : '0');
    } catch (error) {
      this.logger.warn('[Blobio] Could not save WaterMark setting.', error);
    }
  }

  syncWatermark() {
    if (!this.isWatermarkEnabled()) {
      this.removeWatermarks();
      return;
    }

    const nameInput = this.findNameInput();
    if (!nameInput?.parentNode) {
      return;
    }

    let watermark = this.document.querySelector?.('.blobio-watermark');
    if (!watermark) {
      watermark = this.createWatermark();
    }

    const host = nameInput.parentNode;
    host.classList?.add('blobio-watermark-host');

    if (watermark.parentNode !== host) {
      host.appendChild(watermark);
    }

    this.positionWatermark(watermark, nameInput, host);
  }

  positionWatermark(watermark, nameInput, host) {
    const inputRect = this.getElementRect(nameInput);
    const hostRect = this.getElementRect(host);

    if (!inputRect || !hostRect) {
      this.setStyleProperty(watermark, '--blobio-watermark-left', '0px');
      this.setStyleProperty(watermark, '--blobio-watermark-top', '-6px');
      this.setStyleProperty(watermark, '--blobio-watermark-width', '100%');
      return;
    }

    const left = Math.round(inputRect.left - hostRect.left - WATERMARK_EXTRA_WIDTH / 2 + WATERMARK_RIGHT_NUDGE);
    const top = Math.round(inputRect.top - hostRect.top - WATERMARK_INPUT_GAP);
    const width = Math.round(inputRect.width + WATERMARK_EXTRA_WIDTH);

    this.setStyleProperty(watermark, '--blobio-watermark-left', `${left}px`);
    this.setStyleProperty(watermark, '--blobio-watermark-top', `${top}px`);
    this.setStyleProperty(watermark, '--blobio-watermark-width', `${width}px`);
  }

  getElementRect(node) {
    const rect = node?.getBoundingClientRect?.();
    if (!rect || !Number.isFinite(rect.left) || !Number.isFinite(rect.top) || !Number.isFinite(rect.width)) {
      return null;
    }

    return rect;
  }

  createWatermark() {
    const watermark = this.document.createElement('div');
    watermark.classList.add('blobio-watermark');

    const prefix = this.document.createElement('span');
    prefix.classList.add('blobio-watermark-prefix');
    prefix.textContent = 'Blob-';

    const extension = this.document.createElement('span');
    extension.classList.add('blobio-watermark-extension');
    extension.textContent = 'Extension';

    const version = this.document.createElement('span');
    version.classList.add('blobio-watermark-version');
    version.textContent = ` v${this.version}`;

    watermark.append(prefix, extension, version);
    return watermark;
  }

  removeWatermarks() {
    for (const watermark of this.document.querySelectorAll?.('.blobio-watermark') || []) {
      watermark.remove();
    }

    for (const host of this.document.querySelectorAll?.('.blobio-watermark-host') || []) {
      host.classList?.remove('blobio-watermark-host');
    }
  }

  findNameInput() {
    const containers = [
      this.document.querySelector?.('.inputs-container'),
      this.document.getElementById?.('game-wrapper'),
      this.document.body,
    ].filter(Boolean);

    for (const container of containers) {
      const inputs = Array.from(container.querySelectorAll?.('input') || []);
      const namedInput = inputs.find((input) => {
        const label = `${input.id || ''} ${input.getAttribute?.('name') || ''} ${input.getAttribute?.('placeholder') || ''}`;
        return /nick|name/i.test(label);
      });

      if (namedInput) {
        return namedInput;
      }

      const textInput = inputs.find((input) => {
        const type = input.getAttribute?.('type') || input.type || '';
        return (!type || type === 'text') && !input.readOnly && input.getAttribute?.('readonly') === null;
      });

      if (textInput) {
        return textInput;
      }
    }

    return null;
  }

  togglePanel(panelName) {
    const panel = this.document.getElementById?.(`blobio-panel-${panelName}`);
    if (!panel) {
      return;
    }

    if (panelName === 'featured') {
      this.renderFeaturedPanel();
    } else if (panelName === 'socials') {
      this.renderSocialPanel();
    } else if (panelName === 'policy') {
      this.renderPolicyPanel();
    } else if (panelName === 'games') {
      this.renderGamesPanel();
    } else if (panelName === 'policy-games') {
      this.renderPolicyGamesPanel();
    }

    const willOpen = !panel.classList.contains('is-open');
    this.closePanels();

    if (!willOpen) {
      return;
    }

    panel.classList.add('is-open');

    for (const button of this.getPanelButtons()) {
      if (button.dataset.panel === panelName) {
        button.classList.add('is-active');
      }
    }
  }

  closePanels() {
    for (const panel of this.getPanels()) {
      panel.classList.remove('is-open');
    }

    for (const button of this.getPanelButtons()) {
      button.classList.remove('is-active');
    }
  }

  findReplayButton() {
    const candidates = Array.from(this.document.querySelectorAll?.('button, a, [role="button"]') || []);
    return candidates.find((node) => {
      const label = [
        node.textContent,
        node.className,
        node.getAttribute?.('aria-label'),
        node.getAttribute?.('title'),
        node.getAttribute?.('href'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return label.includes('replay');
    });
  }

  getFeaturedVideo() {
    const iframe = this.document.getElementById?.('youtube-iframe') || this.document.querySelector?.('iframe[src]');
    const iframeUrl = iframe?.getAttribute?.('src') || '';
    const iframeId = this.getYoutubeId(iframeUrl);

    if (iframeId) {
      const title = this.getFeaturedTitle();
      return {
        title,
        url: `https://www.youtube.com/watch?v=${iframeId}`,
        thumbnail: this.getYoutubeThumbnail(iframeUrl),
      };
    }

    const links = Array.from(this.document.querySelectorAll?.('a[href]') || []);
    const youtubeLink = links.find((link) => /youtube\.com|youtu\.be/i.test(link.getAttribute('href') || ''));
    const url = youtubeLink?.getAttribute('href') || DEFAULT_VIDEO.url;
    const title = youtubeLink?.textContent?.trim() || DEFAULT_VIDEO.title;

    return {
      title,
      url,
      thumbnail: this.getYoutubeThumbnail(url),
    };
  }

  getYoutubeThumbnail(url) {
    const id = this.getYoutubeId(url) || 'GOlXDLWeGMo';

    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  getYoutubeId(url) {
    return (
      url.match(/[?&]v=([^&]+)/)?.[1] ||
      url.match(/youtu\.be\/([^?&]+)/)?.[1] ||
      url.match(/embed\/([^?&]+)/)?.[1] ||
      ''
    );
  }

  getFeaturedTitle() {
    const title = this.document.getElementById?.('youtube-title')?.textContent || '';
    const cleanTitle = title.replace(/^Featured\s+Video:\s*/i, '').replace(/\s+/g, ' ').trim();
    return cleanTitle || DEFAULT_VIDEO.title;
  }

  getSocialLinks() {
    const links = Array.from(this.document.querySelectorAll?.('.social a[href], a[href]') || []);

    return SOCIALS.map((social) => {
      const match = links.find((link) => social.match.test(link.getAttribute('href') || ''));
      return {
        ...social,
        href: match?.getAttribute('href') || social.fallbackHref,
      };
    });
  }

  getOriginalPolicyLinks() {
    const links = Array.from(this.document.querySelectorAll?.('a[href]') || []);
    return links.filter((link) => {
      if (this.isInsideOwnUi(link)) {
        return false;
      }

      const href = link.getAttribute('href') || '';
      if (!href || href === '#' || href.endsWith('/#') || this.isInsideConsentManager(link)) {
        return false;
      }

      const text = `${link.textContent || ''} ${link.getAttribute('href') || ''}`;
      return /policy|privacy|terms|conditions|cookie|gdpr/i.test(text);
    });
  }

  getPolicyPanelLinks() {
    const seen = new Set();
    const links = [];

    for (const link of [...this.getOriginalPolicyLinks(), ...this.getOriginalPartnerLinks()]) {
      const key = `${link.getAttribute('href') || ''}::${link.textContent || ''}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      links.push(link);
    }

    return links;
  }

  getOriginalPartnerLinks() {
    return this.getPartnerLinkContainers().flatMap((container) => {
      const links = Array.from(container.querySelectorAll?.('a[href]') || []);
      return links.filter((link) => PARTNER_LINK_MATCH.test(link.getAttribute('href') || ''));
    });
  }

  getPartnerLinkContainers() {
    const containers = new Set();

    for (const link of this.document.querySelectorAll?.('a[href]') || []) {
      if (this.isInsideOwnUi(link)) {
        continue;
      }

      if (PARTNER_LINK_MATCH.test(link.getAttribute('href') || '') && link.parentElement) {
        containers.add(link.parentElement);
      }
    }

    return [...containers].filter((container) => {
      if (this.isInsideOwnUi(container)) {
        return false;
      }

      const directPartnerLinks = Array.from(container.querySelectorAll?.('a[href]') || [])
        .filter((link) => link.parentElement === container && PARTNER_LINK_MATCH.test(link.getAttribute('href') || ''));

      return directPartnerLinks.length >= 2;
    });
  }

  getOtherProjectContainers() {
    const containers = Array.from(this.document.querySelectorAll?.('.partner') || []);
    return containers.filter((container) => {
      if (this.isInsideOwnUi(container)) {
        return false;
      }

      return /our\s+other\s+projects/i.test(container.textContent || '') && this.getOtherProjectLinksFrom(container).length > 0;
    });
  }

  getOtherProjectLinks() {
    return this.getOtherProjectContainers().flatMap((container) => this.getOtherProjectLinksFrom(container));
  }

  getOtherProjectLinksFrom(container) {
    const links = Array.from(container.querySelectorAll?.('a') || []);
    return links.filter((link) => {
      const className = link.className?.toString?.() || '';
      const image = link.style?.backgroundImage || link.getAttribute('style') || '';
      return className.includes('mus-conv') || image.includes('background-image');
    });
  }

  extractBackgroundImage(styleText) {
    return styleText.match(/background-image:\s*([^;]+)/i)?.[1]?.trim() || '';
  }

  getFailedViralFrames() {
    const frames = Array.from(this.document.querySelectorAll?.('iframe') || []);
    return frames.filter((frame) => FAILED_VIRAL_FRAME_MATCH.test(frame.getAttribute('src') || frame.src || ''));
  }

  isInsideConsentManager(node) {
    let current = node;

    while (current) {
      const className = current.className?.toString?.() || '';
      if (className.split(/\s+/).some((name) => name === 'fc' || name.startsWith('fc-') || name.includes('-fc-'))) {
        return true;
      }

      if (/^fc-|cookieWarning-/i.test(className)) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }

  hideOriginalSections() {
    const directSelectors = [
      '#youtube-title',
      '.youtube.hide-on-small-screen',
      'cued-overlay.ytmCuedOverlayHost',
      '.ytmCuedOverlayGradient',
      '.history-wrapper',
      '.social',
    ];

    for (const selector of directSelectors) {
      for (const node of this.document.querySelectorAll?.(selector) || []) {
        this.hideOriginalNode(node);

        const parent = node.parentElement;
        if (
          node.classList?.contains('history-wrapper') &&
          parent &&
          parent.tagName !== 'ASIDE' &&
          /updates?\s*notes?:/i.test(parent.textContent || '')
        ) {
          this.hideOriginalNode(parent);
        }
      }
    }

    for (const node of this.document.querySelectorAll?.('.aside.aside-2 h1, .aside.aside-2 h2, .aside.aside-2 h3, .aside.aside-2 h4') || []) {
      if (/updates?/i.test(node.textContent || '')) {
        this.hideOriginalNode(node);
      }
    }

    for (const node of this.document.querySelectorAll?.('aside div, aside span, aside p') || []) {
      if (/^\s*updates?\s*notes?:/i.test(node.textContent || '') && node.querySelector?.('.history-wrapper')) {
        this.hideOriginalNode(node);
      }
    }

    for (const node of this.getPartnerLinkContainers()) {
      this.hideOriginalNode(node);
    }

    for (const node of this.getOtherProjectContainers()) {
      this.hideOriginalNode(node);
    }

    for (const frame of this.getFailedViralFrames()) {
      this.hideOriginalNode(frame);

      const parent = frame.parentElement;
      if (parent && parent.children?.length === 1) {
        this.hideOriginalNode(parent);
      }
    }

    for (const link of this.getOriginalPolicyLinks()) {
      this.hideOriginalNode(link);
    }
  }

  hideOriginalNode(node) {
    if (this.isInsideOwnUi(node)) {
      return;
    }

    if (this.isInsideOriginalFooter(node)) {
      return;
    }

    node.classList?.add(HIDDEN_CLASS);
    this.hiddenOriginalNodes.add(node);
  }

  syncUsernameAnimation() {
    const usernames = Array.from(this.document.querySelectorAll?.('.fleft.username') || []);

    for (const username of usernames) {
      if (this.isInsideOwnUi(username)) {
        continue;
      }

      const text = this.getUsernameSourceText(username);
      const currentText = username.dataset.blobioUsernameText || '';
      let animated = this.getUsernameAnimatedNode(username);
      const existingLetters = animated?.querySelectorAll?.('.blobio-username-letter') || [];

      if (!text || (text === currentText && existingLetters.length === Array.from(text).length)) {
        continue;
      }

      if (!animated) {
        animated = this.document.createElement('span');
        animated.classList.add('blobio-username-animated');
        username.appendChild(animated);
      }

      this.clearElement(animated);
      username.dataset.blobioUsernameText = text;

      const letters = Array.from(text);
      const duration = letters.length * 160 + 5200;
      const glowDelay = Math.max(0, (letters.length - 1) * 160 + 1250);
      this.setStyleProperty(username, '--blobio-username-duration', `${duration}ms`);
      this.setStyleProperty(username, '--blobio-username-glow-delay', `${glowDelay}ms`);

      letters.forEach((letter, index) => {
        const span = this.document.createElement('span');
        span.classList.add('blobio-username-letter');
        span.textContent = letter;
        this.setStyleProperty(span, '--blobio-letter-delay', `${index * 160}ms`);
        animated.appendChild(span);
      });
    }
  }

  getUsernameAnimatedNode(username) {
    return Array.from(username.children || []).find((child) => child.classList?.contains('blobio-username-animated')) || null;
  }

  getUsernameSourceText(username) {
    const animated = this.getUsernameAnimatedNode(username);

    if (username.childNodes) {
      return Array.from(username.childNodes)
        .filter((node) => node !== animated)
        .map((node) => {
          if (node.nodeType === 3) {
            return node.textContent || '';
          }

          if (node.nodeType === 1 && !node.classList?.contains('blobio-username-animated')) {
            return node.textContent || '';
          }

          return '';
        })
        .join('')
        .trim();
    }

    const fullText = username.textContent || '';
    const animatedText = animated?.textContent || '';
    if (animatedText && fullText.endsWith(animatedText)) {
      return fullText.slice(0, -animatedText.length).trim();
    }

    return fullText.trim();
  }

  setStyleProperty(node, name, value) {
    if (typeof node.style?.setProperty === 'function') {
      node.style.setProperty(name, value);
      return;
    }

    if (node.style) {
      node.style[name] = value;
    }
  }

  isInsideOwnUi(node) {
    return Boolean(
      node &&
        (this.toolbar?.contains(node) ||
          this.policyDock?.contains(node) ||
          this.footerModalHost?.contains(node) ||
          this.isExtensionOwnedNode(node))
    );
  }

  isOwnMutation(mutation) {
    if (this.isInsideOwnUi(mutation.target)) {
      return true;
    }

    const touchedNodes = [
      ...Array.from(mutation.addedNodes || []),
      ...Array.from(mutation.removedNodes || []),
    ];

    return touchedNodes.length > 0 && touchedNodes.every((node) => this.isInsideOwnUi(node));
  }

  isExtensionOwnedNode(node) {
    let current = node?.classList ? node : node?.parentElement;

    while (current) {
      const classList = current.classList;
      if (
        classList?.contains(DEFAULT_TOOLBAR_CLASS) ||
        classList?.contains('blobio-menu-panel') ||
        classList?.contains('blobio-footer-dock') ||
        classList?.contains('blobio-footer-modal-host') ||
        classList?.contains('blobio-watermark') ||
        classList?.contains('blobio-extension-settings-tab') ||
        classList?.contains('blobio-extension-settings-panel') ||
        classList?.contains('blobio-vip-plus-slot') ||
        classList?.contains('blobio-vip-plus-icon')
      ) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }

  isInsideOriginalFooter(node) {
    let current = node;

    while (current) {
      if (current.tagName === 'FOOTER' && current.classList?.contains('footer')) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }

  getPanels() {
    return [
      ...Array.from(this.toolbar?.querySelectorAll('.blobio-menu-panel') || []),
      ...Array.from(this.footerModalHost?.querySelectorAll('.blobio-menu-panel') || []),
    ];
  }

  getPanelButtons() {
    return [
      ...Array.from(this.toolbar?.querySelectorAll('button') || []),
      ...Array.from(this.policyDock?.querySelectorAll('button') || []),
    ];
  }

  clearElement(element) {
    while (element.children.length > 0) {
      element.children[0].remove();
    }

    element.textContent = '';
  }
}
