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
import {
  OTHER_GAME_NAMES,
  UPDATE_NOTES,
} from './MenuFeatureContent.js';
import {
  extractBackgroundImage,
  findReplayButton,
  getFailedViralFrames,
  getFeaturedVideo,
  getOriginalPolicyLinks,
  getOtherProjectContainers,
  getOtherProjectLinks,
  getPartnerLinkContainers,
  getPolicyPanelLinks,
  getSocialLinks,
} from './MenuFeatureDiscovery.js';
import {
  EXTENSION_DEFAULT_CATEGORY,
  EXTENSION_OPTION_TOOLTIPS,
  EXTENSION_SETTING_CATEGORIES,
} from './MenuFeatureSettingsConfig.js';
import { renderExtensionTooltip } from './MenuFeatureTooltip.js';
import {
  findNameInput,
  syncUsernameAnimation,
} from './MenuFeatureVisualSync.js';

const DEFAULT_CLASS_NAME = 'blobio-menu-enabled';
const DEFAULT_STYLE_ID = 'blobio-menu-style';
const DEFAULT_TOOLBAR_CLASS = 'blobio-menu-toolbar';
const DEFAULT_EXTENSION_VERSION = '0.2.04';
const HIDDEN_CLASS = 'blobio-original-hidden';
const WATERMARK_STORAGE_KEY = 'blobio.watermark.enabled';
const WATERMARK_RIGHT_NUDGE = 60;
const WATERMARK_EXTRA_WIDTH = 96;
const WATERMARK_INPUT_GAP = 6;
const MAIN_MENU_ALIGNMENT_CLASS = 'blobio-main-menu-align-target';
const MAIN_MENU_LAYERED_SELECT_CLASS = 'blobio-menu-layered-select';

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

    const replayButton = findReplayButton(this.document);
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
    const links = getPolicyPanelLinks(this.document, (node) => this.isInsideOwnUi(node));
    const games = getOtherProjectLinks(this.document, (node) => this.isInsideOwnUi(node));
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

    if (
      getPolicyPanelLinks(this.document, (node) => this.isInsideOwnUi(node)).length > 0 ||
      getOtherProjectLinks(this.document, (node) => this.isInsideOwnUi(node)).length > 0
    ) {
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

    const video = getFeaturedVideo(this.document);
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

    for (const social of getSocialLinks(this.document)) {
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

    for (const original of getPolicyPanelLinks(this.document, (node) => this.isInsideOwnUi(node))) {
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

    const policyLinks = getPolicyPanelLinks(this.document, (node) => this.isInsideOwnUi(node));
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

    const gameLinks = getOtherProjectLinks(this.document, (node) => this.isInsideOwnUi(node));
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
    body.appendChild(this.createGameLinks(getOtherProjectLinks(this.document, (node) => this.isInsideOwnUi(node))));
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
      gameLink.style.backgroundImage = original.style?.backgroundImage || extractBackgroundImage(original.getAttribute('style') || '');

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
      this.bindExtensionSettingsWheel(settings);

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

  bindExtensionSettingsWheel(settings) {
    if (settings.dataset.blobioExtensionWheelListener === 'true') {
      return;
    }

    settings.dataset.blobioExtensionWheelListener = 'true';
    this.addSettingsListener(
      settings,
      'wheel',
      (event) => this.handleExtensionSettingsWheel(settings, event),
      { passive: false },
    );
  }

  handleExtensionSettingsWheel(settings, event) {
    if (!settings?.classList?.contains('blobio-extension-settings-active') || !settings.contains?.(event.target)) {
      return;
    }

    const deltaY = Number(event.deltaY) || 0;
    if (!deltaY) {
      return;
    }

    const scroller = this.getExtensionWheelScroller(settings, event.target, deltaY);
    if (!scroller) {
      return;
    }

    const maxTop = Math.max(0, (Number(scroller.scrollHeight) || 0) - (Number(scroller.clientHeight) || 0));
    const currentTop = Math.min(maxTop, Math.max(0, Number(scroller.scrollTop) || 0));
    const nextTop = Math.min(maxTop, Math.max(0, currentTop + deltaY));
    if (nextTop === currentTop) {
      return;
    }

    scroller.scrollTop = nextTop;
    event.preventDefault?.();
    event.stopPropagation?.();
  }

  getExtensionWheelScroller(settings, target, deltaY) {
    const panel = settings.querySelector?.('.blobio-extension-category-panel.is-active');
    if (panel?.contains?.(target)) {
      let node = target?.classList ? target : target?.parentElement;
      while (node && node !== panel) {
        if (this.canScrollByWheel(node, deltaY)) {
          return node;
        }
        node = node.parentElement;
      }
    }

    if (this.canScrollByWheel(panel, deltaY)) {
      return panel;
    }

    const content = settings.querySelector?.('.content-container.scroll')
      || settings.querySelector?.('.content-container');
    return this.canScrollByWheel(content, deltaY) ? content : null;
  }

  canScrollByWheel(node, deltaY) {
    const maxTop = Math.max(0, (Number(node?.scrollHeight) || 0) - (Number(node?.clientHeight) || 0));
    if (maxTop <= 0) {
      return false;
    }

    const currentTop = Math.min(maxTop, Math.max(0, Number(node?.scrollTop) || 0));
    return deltaY < 0 ? currentTop > 0 : currentTop < maxTop;
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

  addSettingsListener(node, type, handler, options) {
    node.addEventListener?.(type, handler, options);
    this.settingsListeners.push({ node, type, handler, options });
  }

  cleanupExtensionSettings() {
    for (const { node, type, handler, options } of this.settingsListeners) {
      node.removeEventListener?.(type, handler, options);
    }

    this.settingsListeners = [];

    for (const settings of this.document.querySelectorAll?.('app-settings') || []) {
      settings.classList?.remove('blobio-extension-settings-active');
      delete settings.dataset.blobioExtensionWheelListener;
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
    return renderExtensionTooltip(this.document, this.extensionTooltip, text);
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

    const nameInput = findNameInput(this.document);
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

    for (const node of getPartnerLinkContainers(this.document, (item) => this.isInsideOwnUi(item))) {
      this.hideOriginalNode(node);
    }

    for (const node of getOtherProjectContainers(this.document, (item) => this.isInsideOwnUi(item))) {
      this.hideOriginalNode(node);
    }

    for (const frame of getFailedViralFrames(this.document)) {
      this.hideOriginalNode(frame);

      const parent = frame.parentElement;
      if (parent && parent.children?.length === 1) {
        this.hideOriginalNode(parent);
      }
    }

    for (const link of getOriginalPolicyLinks(this.document, (item) => this.isInsideOwnUi(item))) {
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
    syncUsernameAnimation({
      document: this.document,
      isInsideOwnUi: (node) => this.isInsideOwnUi(node),
      clearElement: (node) => this.clearElement(node),
      setStyleProperty: (node, name, value) => this.setStyleProperty(node, name, value),
    });
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
