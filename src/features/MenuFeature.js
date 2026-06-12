import { buildMenuCss } from '../css/MenuFeatureStyles.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';

const DEFAULT_CLASS_NAME = 'blobio-menu-enabled';
const DEFAULT_STYLE_ID = 'blobio-menu-style';
const DEFAULT_TOOLBAR_CLASS = 'blobio-menu-toolbar';
const DEFAULT_EXTENSION_VERSION = '0.1.20';
const HIDDEN_CLASS = 'blobio-original-hidden';
const PARTNER_LINK_MATCH = /iogames\.space|iogames\.live|io-games\.zone|silvergames\.com|crazygames\.com/i;
const FAILED_VIRAL_FRAME_MATCH = /viral\.iogames\.space/i;
const OTHER_GAME_NAMES = ['Viper', 'Hexa'];
const WATERMARK_STORAGE_KEY = 'blobio.watermark.enabled';
const WATERMARK_RIGHT_NUDGE = 60;
const WATERMARK_EXTRA_WIDTH = 96;
const WATERMARK_INPUT_GAP = 6;
const CUSTOM_SKIN_ENABLED_KEY = 'blobio.customSkin.enabled';
const CUSTOM_SKIN_GALLERY_KEY = 'blobio.customSkin.gallery';
const CUSTOM_SKIN_ACTIVE_KEY = 'blobio.customSkin.activeUrl';
const CUSTOM_SKIN_PREVIOUS_KEY = 'blobio.customSkin.previousSkin';
const CUSTOM_SKIN_LOCAL_NAME_KEY = 'blobio.customSkin.localName';
const CUSTOM_SKIN_DEFAULT_URL = 'https://i.imgur.com/OZz80VZ.jpeg';
const CUSTOM_SKIN_NAME = 'BlobioCustomSkin';
const CUSTOM_SKIN_TYPE = 'free';
const DIRECT_IMGUR_IMAGE_MATCH = /^https:\/\/i\.imgur\.com\/[a-z0-9]+\.(?:png|jpe?g|gif|webp)(?:\?.*)?$/i;
const CUSTOM_SKIN_NOTICE_DURATION = 2200;

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
    version = DEFAULT_EXTENSION_VERSION,
    frontPageUi = true,
  } = {}) {
    this.document = document;
    this.assets = assets;
    this.logger = logger;
    this.className = className;
    this.styleId = styleId;
    this.storage = storage;
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
    this.policyDock = null;
    this.settingsListeners = [];
    this.customSkinListeners = [];
    this.customSkinSelectedUrl = null;
    this.customSkinNoticeTimer = null;
    this.documentClickHandler = null;
    this.keydownHandler = null;
  }

  start() {
    if (this.started) {
      return true;
    }

    if (!this.document?.documentElement) {
      this.logger.warn('[Blobio] Menu feature could not start: document is not ready.');
      return false;
    }

    this.syncCustomSkinRuntimeConfig();
    this.installCustomSkinRuntimeHook();
    if (!this.frontPageUi) {
      this.started = true;
      return true;
    }

    this.ensureStyle();
    this.applyPageClass();
    this.installToolbar();
    this.hideOriginalSections();
    this.installPolicyDock();
    this.installExtensionSettings();
    this.installCustomSkinUi();
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
    this.clearCustomSkinNoticeTimer();
    this.cleanupExtensionSettings();
    this.cleanupCustomSkinUi();

    for (const node of this.hiddenOriginalNodes) {
      node.classList?.remove(HIDDEN_CLASS);
    }

    this.hiddenOriginalNodes.clear();

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
      this.installToolbar();
      this.hideOriginalSections();
      this.installPolicyDock();
      this.installExtensionSettings();
      this.installCustomSkinUi();
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

      if (!panel) {
        panel = this.createExtensionSettingsPanel();
        content.appendChild(panel);
      }

      this.syncExtensionSettingsCheckboxes(panel);

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
    panel.classList.add('grid-container', 'blobio-extension-settings-panel');
    panel.setAttribute('_ngcontent-c3', '');

    panel.append(
      this.createExtensionSwitchRow({
        id: 'config-switch-watermark',
        label: 'WaterMark',
        checked: this.isWatermarkEnabled(),
        onChange: (enabled) => {
          this.setWatermarkEnabled(enabled);
          this.syncWatermark();
        },
      }),
      this.createExtensionSwitchRow({
        id: 'config-switch-custom-imgur-skin',
        label: 'Custom Imgur Skin',
        checked: this.isCustomSkinEnabled(),
        onChange: (enabled) => {
          this.setCustomSkinEnabled(enabled);
          this.installCustomSkinUi();
        },
      }),
    );

    return panel;
  }

  createExtensionSwitchRow({ id, label, checked, onChange }) {
    const row = this.document.createElement('div');
    row.classList.add('grid-item', 'blobio-extension-setting-row');
    row.setAttribute('_ngcontent-c3', '');

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

    switchLabel.append(checkbox, slider);
    row.append(switchLabel, textLabel);

    this.addSettingsListener(checkbox, 'change', () => {
      onChange(Boolean(checkbox.checked));
    });

    return row;
  }

  activateExtensionSettings(settings) {
    const left = settings.querySelector?.('.left');
    const extensionTab = settings.querySelector?.('.blobio-extension-settings-tab');

    for (const item of left?.querySelector?.('ul')?.children || []) {
      item.classList?.remove('active');
    }

    settings.classList.add('blobio-extension-settings-active');
    extensionTab?.classList.add('active');
  }

  deactivateExtensionSettings(settings) {
    settings.classList.remove('blobio-extension-settings-active');
    settings.querySelector?.('.blobio-extension-settings-tab')?.classList.remove('active');
  }

  syncExtensionSettingsCheckboxes(panel) {
    const watermark = panel.querySelector?.('#config-switch-watermark');
    if (watermark) {
      watermark.checked = this.isWatermarkEnabled();
    }

    const customSkin = panel.querySelector?.('#config-switch-custom-imgur-skin');
    if (customSkin) {
      customSkin.checked = this.isCustomSkinEnabled();
    }
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

    this.removeWatermarks();
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

  isCustomSkinEnabled() {
    try {
      return this.storage?.getItem?.(CUSTOM_SKIN_ENABLED_KEY) === '1';
    } catch (error) {
      this.logger.warn('[Blobio] Could not read Custom Imgur Skin setting.', error);
      return false;
    }
  }

  setCustomSkinEnabled(enabled) {
    try {
      this.storage?.setItem?.(CUSTOM_SKIN_ENABLED_KEY, enabled ? '1' : '0');
      if (!enabled) {
        this.clearCustomSkinUse();
      }
    } catch (error) {
      this.logger.warn('[Blobio] Could not save Custom Imgur Skin setting.', error);
    }
  }

  getCustomSkinGallery() {
    try {
      const raw = this.storage?.getItem?.(CUSTOM_SKIN_GALLERY_KEY);
      if (raw === null) {
        return [CUSTOM_SKIN_DEFAULT_URL];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [CUSTOM_SKIN_DEFAULT_URL];
      }

      return this.uniqueValidImgurUrls(parsed);
    } catch (error) {
      this.logger.warn('[Blobio] Could not read Custom Imgur Skin gallery.', error);
      return [CUSTOM_SKIN_DEFAULT_URL];
    }
  }

  saveCustomSkinGallery(urls) {
    try {
      this.storage?.setItem?.(CUSTOM_SKIN_GALLERY_KEY, JSON.stringify(this.uniqueValidImgurUrls(urls)));
    } catch (error) {
      this.logger.warn('[Blobio] Could not save Custom Imgur Skin gallery.', error);
    }
  }

  addCustomSkinUrl(url) {
    const cleanUrl = String(url || '').trim();
    if (!this.isValidImgurSkinUrl(cleanUrl)) {
      return false;
    }

    const gallery = this.getCustomSkinGallery();
    if (!gallery.includes(cleanUrl)) {
      gallery.push(cleanUrl);
      this.saveCustomSkinGallery(gallery);
    }

    return true;
  }

  removeCustomSkinUrl(url) {
    const gallery = this.getCustomSkinGallery().filter((item) => item !== url);
    this.saveCustomSkinGallery(gallery);

    if (this.getActiveCustomSkinUrl() === url) {
      this.clearCustomSkinUse();
    }
  }

  uniqueValidImgurUrls(urls) {
    const seen = new Set();
    const valid = [];

    for (const url of urls) {
      const cleanUrl = String(url || '').trim();
      if (!this.isValidImgurSkinUrl(cleanUrl) || seen.has(cleanUrl)) {
        continue;
      }

      seen.add(cleanUrl);
      valid.push(cleanUrl);
    }

    return valid;
  }

  isValidImgurSkinUrl(url) {
    return DIRECT_IMGUR_IMAGE_MATCH.test(String(url || '').trim());
  }

  getActiveCustomSkinUrl() {
    try {
      const url = this.storage?.getItem?.(CUSTOM_SKIN_ACTIVE_KEY) || '';
      return this.isValidImgurSkinUrl(url) ? url : '';
    } catch (error) {
      this.logger.warn('[Blobio] Could not read active Custom Imgur Skin.', error);
      return '';
    }
  }

  getStoredCustomSkinLocalName() {
    try {
      const existing = this.storage?.getItem?.(CUSTOM_SKIN_LOCAL_NAME_KEY) || '';
      return /^BlobioCustomSkin_[a-z0-9]{8,}$/i.test(existing) ? existing : '';
    } catch {
      return '';
    }
  }

  getCustomSkinLocalName() {
    try {
      const existing = this.storage?.getItem?.(CUSTOM_SKIN_LOCAL_NAME_KEY) || '';
      if (/^BlobioCustomSkin_[a-z0-9]{8,}$/i.test(existing)) {
        return existing;
      }

      const random = Math.random().toString(36).slice(2, 10);
      const localName = `${CUSTOM_SKIN_NAME}_${random || Date.now().toString(36)}`;
      this.storage?.setItem?.(CUSTOM_SKIN_LOCAL_NAME_KEY, localName);
      return localName;
    } catch (error) {
      this.logger.warn('[Blobio] Could not create local Custom Imgur Skin name.', error);
      return `${CUSTOM_SKIN_NAME}_localonly`;
    }
  }

  syncCustomSkinRuntimeConfig() {
    const host = this.document.defaultView?.location?.host || '';
    if (host !== 'custom.client.blobgame.io') {
      return;
    }

    try {
      const activeUrl = this.getActiveCustomSkinUrl();
      const localSkinName = activeUrl && this.isCustomSkinEnabled() ? this.getCustomSkinLocalName() : this.getStoredCustomSkinLocalName();

      if (activeUrl && localSkinName && this.isCustomSkinEnabled()) {
        this.storage?.setItem?.('config-skin', localSkinName);
        this.storage?.setItem?.('config-skin-type', CUSTOM_SKIN_TYPE);
        return;
      }

      if (localSkinName && this.storage?.getItem?.('config-skin') === localSkinName) {
        const previous = this.getPreviousSkinConfig();
        if (previous?.name) {
          this.storage?.setItem?.('config-skin', previous.name);
          this.storage?.setItem?.('config-skin-type', previous.type || CUSTOM_SKIN_TYPE);
        } else {
          this.storage?.removeItem?.('config-skin');
          this.storage?.removeItem?.('config-skin-type');
        }
      }
    } catch (error) {
      this.logger.warn('[Blobio] Could not sync Custom Imgur Skin for the game client.', error);
    }
  }

  useCustomSkinUrl(url) {
    if (!this.isValidImgurSkinUrl(url)) {
      return false;
    }

    try {
      const localSkinName = this.getCustomSkinLocalName();
      const currentSkin = this.storage?.getItem?.('config-skin') || '';
      const currentType = this.storage?.getItem?.('config-skin-type') || '';

      if (currentSkin !== localSkinName) {
        this.storage?.setItem?.(CUSTOM_SKIN_PREVIOUS_KEY, JSON.stringify({ name: currentSkin, type: currentType || CUSTOM_SKIN_TYPE }));
      }

      this.storage?.setItem?.(CUSTOM_SKIN_ENABLED_KEY, '1');
      this.storage?.setItem?.(CUSTOM_SKIN_ACTIVE_KEY, url);
      this.storage?.setItem?.('config-skin', localSkinName);
      this.storage?.setItem?.('config-skin-type', CUSTOM_SKIN_TYPE);
      this.updateChooseSkinPreview(url);
      return true;
    } catch (error) {
      this.logger.warn('[Blobio] Could not apply Custom Imgur Skin.', error);
      return false;
    }
  }

  clearCustomSkinUse() {
    try {
      const localSkinName = this.getCustomSkinLocalName();
      const currentSkin = this.storage?.getItem?.('config-skin') || '';
      const previous = this.getPreviousSkinConfig();
      this.storage?.removeItem?.(CUSTOM_SKIN_ACTIVE_KEY);

      if (currentSkin === localSkinName) {
        if (previous?.name) {
          this.storage?.setItem?.('config-skin', previous.name);
          this.storage?.setItem?.('config-skin-type', previous.type || CUSTOM_SKIN_TYPE);
          this.updateChooseSkinPreview(`https://client.blobgame.io/skins/${previous.type || CUSTOM_SKIN_TYPE}/${previous.name}.png`);
        } else {
          this.storage?.removeItem?.('config-skin');
          this.storage?.removeItem?.('config-skin-type');
        }
      }
    } catch (error) {
      this.logger.warn('[Blobio] Could not clear Custom Imgur Skin.', error);
    }
  }

  getPreviousSkinConfig() {
    try {
      const raw = this.storage?.getItem?.(CUSTOM_SKIN_PREVIOUS_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.name !== 'string') {
        return null;
      }

      return {
        name: parsed.name,
        type: typeof parsed.type === 'string' && parsed.type ? parsed.type : CUSTOM_SKIN_TYPE,
      };
    } catch {
      return null;
    }
  }

  updateChooseSkinPreview(url) {
    const button = this.document.querySelector?.('.choose-skin-btn');
    const image = button?.querySelector?.('img');
    if (image) {
      image.setAttribute('src', url);
    }
  }

  installCustomSkinUi() {
    if (!this.isCustomSkinEnabled()) {
      this.cleanupCustomSkinUi();
      return;
    }

    for (const skins of this.document.querySelectorAll?.('app-skins') || []) {
      if (this.isInsideOwnUi(skins)) {
        continue;
      }

      this.installCustomSkinTab(skins);
    }
  }

  installCustomSkinTab(skins) {
    const left = skins.querySelector?.('.left');
    const tabs = left?.querySelector?.('ul');
    const right = skins.querySelector?.('.right');
    const host = right?.querySelector?.('.inner-container') || right;
    if (!tabs || !host) {
      return;
    }

    let tab = skins.querySelector?.('.blobio-custom-skin-tab');
    if (!tab) {
      tab = this.document.createElement('li');
      tab.classList.add('blobio-custom-skin-tab');
      tab.setAttribute('_ngcontent-c2', '');
      tab.textContent = 'Custom Skin';

      const youtubeTab = Array.from(tabs.children || []).find((item) => /youtube/i.test(item.textContent || ''));
      const referenceNode = youtubeTab ? tabs.children[Array.from(tabs.children || []).indexOf(youtubeTab) + 1] || null : null;
      tabs.insertBefore(tab, referenceNode);
    }

    let panel = skins.querySelector?.('.blobio-custom-skin-panel');
    if (!panel) {
      panel = this.createCustomSkinPanel();
      host.appendChild(panel);
    }

    this.renderCustomSkinGallery(panel);

    if (tab.dataset.blobioCustomSkinListener !== 'true') {
      tab.dataset.blobioCustomSkinListener = 'true';
      this.addCustomSkinListener(tab, 'click', (event) => {
        event.stopPropagation?.();
        this.activateCustomSkinPanel(skins);
      });
    }

    for (const item of tabs.children || []) {
      if (item === tab) {
        continue;
      }

      if (item.dataset.blobioCustomSkinCloseListener !== 'true') {
        item.dataset.blobioCustomSkinCloseListener = 'true';
        this.addCustomSkinListener(item, 'click', () => {
          this.deactivateCustomSkinPanel(skins);
        });
      }
    }
  }

  createCustomSkinPanel() {
    const panel = this.document.createElement('div');
    panel.classList.add('skins-container', 'scroll', 'blobio-custom-skin-panel');
    panel.setAttribute('_ngcontent-c2', '');

    const controls = this.document.createElement('div');
    controls.classList.add('blobio-custom-skin-controls');

    const input = this.document.createElement('input');
    input.classList.add('blobio-custom-skin-input');
    input.type = 'url';
    input.setAttribute('placeholder', 'Paste Skin URL here...');
    input.setAttribute('aria-label', 'Custom Imgur skin URL');

    const error = this.document.createElement('div');
    error.classList.add('blobio-custom-skin-error');

    const grid = this.document.createElement('div');
    grid.classList.add('blobio-custom-skin-grid');

    const actions = this.document.createElement('div');
    actions.classList.add('blobio-custom-skin-actions');

    const useButton = this.document.createElement('button');
    useButton.type = 'button';
    useButton.classList.add('blobio-custom-skin-action-use');
    useButton.textContent = 'Use';

    const removeButton = this.document.createElement('button');
    removeButton.type = 'button';
    removeButton.classList.add('blobio-custom-skin-action-remove');
    removeButton.textContent = 'Remove';

    controls.append(input, error);
    actions.append(useButton, removeButton);
    panel.append(controls, grid, actions);

    this.addCustomSkinListener(input, 'keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault?.();
      this.tryAddCustomSkinFromInput(panel, input, error);
    });

    this.addCustomSkinListener(input, 'change', () => {
      this.tryAddCustomSkinFromInput(panel, input, error);
    });

    this.addCustomSkinListener(input, 'paste', () => {
      const setTimer = this.document.defaultView?.setTimeout || globalThis.setTimeout;
      setTimer(() => this.tryAddCustomSkinFromInput(panel, input, error), 0);
    });

    this.addCustomSkinListener(useButton, 'click', (event) => {
      event.stopPropagation?.();
      const url = panel.dataset.selectedSkinUrl || '';
      if (this.useCustomSkinUrl(url)) {
        this.renderCustomSkinGallery(panel);
        this.showCustomSkinNotice(panel, 'Skin is now applied', 'success');
      }
    });

    this.addCustomSkinListener(removeButton, 'click', (event) => {
      event.stopPropagation?.();
      const url = panel.dataset.selectedSkinUrl || '';
      if (!url) {
        return;
      }

      this.removeCustomSkinUrl(url);
      this.customSkinSelectedUrl = null;
      panel.dataset.selectedSkinUrl = '';
      this.renderCustomSkinGallery(panel);
      this.showCustomSkinNotice(panel, 'Skin was removed', 'error');
    });

    return panel;
  }

  tryAddCustomSkinFromInput(panel, input, error) {
    const url = String(input.value || '').trim();
    if (!url) {
      error.textContent = '';
      return;
    }

    if (!this.isValidImgurSkinUrl(url)) {
      error.textContent = 'Only direct i.imgur.com image links are accepted.';
      return;
    }

    this.addCustomSkinUrl(url);
    this.customSkinSelectedUrl = url;
    input.value = '';
    error.textContent = '';
    this.renderCustomSkinGallery(panel);
  }

  renderCustomSkinGallery(panel) {
    const grid = panel.querySelector?.('.blobio-custom-skin-grid');
    const actions = panel.querySelector?.('.blobio-custom-skin-actions');
    if (!grid || !actions) {
      return;
    }

    const gallery = this.getCustomSkinGallery();
    const selectedUrl = gallery.includes(this.customSkinSelectedUrl)
      ? this.customSkinSelectedUrl
      : gallery.includes(this.getActiveCustomSkinUrl())
        ? this.getActiveCustomSkinUrl()
        : '';

    this.clearElement(grid);

    gallery.forEach((url, index) => {
      const card = this.document.createElement('div');
      card.classList.add('skin', 'blobio-custom-skin');
      card.dataset.skinUrl = url;
      card.setAttribute('_ngcontent-c2', '');

      const image = this.document.createElement('img');
      image.setAttribute('_ngcontent-c2', '');
      image.setAttribute('src', url);
      image.setAttribute('alt', '');

      const title = this.document.createElement('div');
      title.classList.add('title');
      title.setAttribute('_ngcontent-c2', '');
      title.textContent = index === 0 && url === CUSTOM_SKIN_DEFAULT_URL ? 'Default Custom' : `Custom ${index + 1}`;

      card.append(image, title);
      card.addEventListener?.('click', () => {
        this.selectCustomSkinCard(panel, url);
      });

      grid.appendChild(card);
    });

    this.selectCustomSkinCard(panel, selectedUrl);
  }

  selectCustomSkinCard(panel, url) {
    const selectedUrl = this.isValidImgurSkinUrl(url) ? url : '';
    this.customSkinSelectedUrl = selectedUrl || null;
    panel.dataset.selectedSkinUrl = selectedUrl;

    for (const card of panel.querySelectorAll?.('.blobio-custom-skin') || []) {
      if (card.dataset.skinUrl === selectedUrl) {
        card.classList?.add('is-selected');
      } else {
        card.classList?.remove('is-selected');
      }
    }

    const actions = panel.querySelector?.('.blobio-custom-skin-actions');
    if (actions) {
      if (selectedUrl) {
        actions.classList.add('is-visible');
      } else {
        actions.classList.remove('is-visible');
      }
    }
  }

  showCustomSkinNotice(panel, message, type) {
    const skins = this.findAncestor(panel, 'APP-SKINS');
    const label = skins?.querySelector?.('.label');
    if (!label) {
      return;
    }

    this.clearCustomSkinNoticeTimer();

    let notice = label.querySelector?.('.blobio-custom-skin-notice');
    if (!notice) {
      notice = this.document.createElement('div');
      notice.classList.add('blobio-custom-skin-notice');
      label.appendChild(notice);
    }

    label.classList?.add('blobio-custom-skin-notice-host');
    notice.classList.remove('is-success', 'is-error');
    notice.classList.add(type === 'error' ? 'is-error' : 'is-success');
    notice.textContent = message;

    const setTimer = this.document.defaultView?.setTimeout || globalThis.setTimeout;
    this.customSkinNoticeTimer = setTimer(() => {
      notice.remove();
      label.classList?.remove('blobio-custom-skin-notice-host');
      this.customSkinNoticeTimer = null;
    }, CUSTOM_SKIN_NOTICE_DURATION);
  }

  clearCustomSkinNoticeTimer() {
    if (this.customSkinNoticeTimer === null) {
      return;
    }

    const clearTimer = this.document.defaultView?.clearTimeout || globalThis.clearTimeout;
    clearTimer(this.customSkinNoticeTimer);
    this.customSkinNoticeTimer = null;
  }

  findAncestor(node, tagName) {
    let current = node;

    while (current) {
      if (current.tagName === tagName) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  activateCustomSkinPanel(skins) {
    const tabs = skins.querySelector?.('.left')?.querySelector?.('ul');
    const customTab = skins.querySelector?.('.blobio-custom-skin-tab');

    for (const item of tabs?.children || []) {
      item.classList?.remove('active');
    }

    skins.classList.add('blobio-custom-skin-active');
    customTab?.classList.add('active');
  }

  deactivateCustomSkinPanel(skins) {
    skins.classList.remove('blobio-custom-skin-active');
    skins.querySelector?.('.blobio-custom-skin-tab')?.classList.remove('active');
  }

  addCustomSkinListener(node, type, handler) {
    node.addEventListener?.(type, handler);
    this.customSkinListeners.push({ node, type, handler });
  }

  cleanupCustomSkinUi() {
    this.clearCustomSkinNoticeTimer();

    for (const { node, type, handler } of this.customSkinListeners) {
      node.removeEventListener?.(type, handler);
    }

    this.customSkinListeners = [];
    this.customSkinSelectedUrl = null;

    for (const skins of this.document.querySelectorAll?.('app-skins') || []) {
      skins.classList?.remove('blobio-custom-skin-active');
    }

    for (const node of this.document.querySelectorAll?.('.blobio-custom-skin-tab, .blobio-custom-skin-panel') || []) {
      node.remove();
    }

    for (const notice of this.document.querySelectorAll?.('.blobio-custom-skin-notice') || []) {
      notice.remove();
    }

    for (const host of this.document.querySelectorAll?.('.blobio-custom-skin-notice-host') || []) {
      host.classList?.remove('blobio-custom-skin-notice-host');
    }
  }

  installCustomSkinRuntimeHook() {
    const win = this.document.defaultView || globalThis;
    const imagePrototype = win.HTMLImageElement?.prototype;
    if (!imagePrototype) {
      return;
    }

    win.__blobioCustomSkinResolve = (url) => this.resolveCustomSkinImageUrl(url);
    win.__blobioCustomSkinIsManifestUrl = (url) => this.isCustomSkinAssetManifestUrl(url);
    win.__blobioCustomSkinPatchManifest = (text) => this.patchCustomSkinAssetManifest(text);
    win.__blobioCustomSkinPatchManifestResponse = (xhr) => this.installCustomSkinManifestResponsePatch(xhr);
    if (win.__blobioCustomSkinHookInstalled) {
      return;
    }

    const srcDescriptor = this.findPropertyDescriptor(imagePrototype, 'src');
    if (srcDescriptor?.get && srcDescriptor?.set) {
      Object.defineProperty(imagePrototype, 'src', {
        configurable: true,
        enumerable: srcDescriptor.enumerable,
        get: srcDescriptor.get,
        set(value) {
          const resolve = win.__blobioCustomSkinResolve;
          srcDescriptor.set.call(this, typeof resolve === 'function' ? resolve(value) : value);
        },
      });
    }

    const originalSetAttribute = imagePrototype.setAttribute || win.Element?.prototype?.setAttribute;
    if (typeof originalSetAttribute === 'function') {
      imagePrototype.setAttribute = function setCustomSkinAttribute(name, value) {
        const resolve = win.__blobioCustomSkinResolve;
        const nextValue = String(name).toLowerCase() === 'src' && typeof resolve === 'function' ? resolve(value) : value;
        return originalSetAttribute.call(this, name, nextValue);
      };
    }

    const xhrPrototype = win.XMLHttpRequest?.prototype;
    if (xhrPrototype && !win.__blobioCustomSkinXhrHookInstalled) {
      const originalOpen = xhrPrototype.open;
      if (typeof originalOpen === 'function') {
        xhrPrototype.open = function openCustomSkinRequest(method, url, ...rest) {
          const resolve = win.__blobioCustomSkinResolve;
          if (this && typeof win.__blobioCustomSkinPatchManifestResponse === 'function' && win.__blobioCustomSkinIsManifestUrl?.(url)) {
            win.__blobioCustomSkinPatchManifestResponse(this);
          }

          const nextUrl = typeof resolve === 'function' ? resolve(url) : url;
          return originalOpen.call(this, method, nextUrl, ...rest);
        };
        win.__blobioCustomSkinXhrHookInstalled = true;
      }
    }

    if (typeof win.fetch === 'function' && !win.__blobioCustomSkinFetchHookInstalled) {
      const originalFetch = win.fetch;
      win.fetch = function fetchCustomSkin(input, init) {
        const originalUrl = typeof input === 'string' || input instanceof String ? String(input) : input?.url;
        const resolve = win.__blobioCustomSkinResolve;
        const nextUrl = originalUrl && typeof resolve === 'function' ? resolve(originalUrl) : originalUrl;
        const nextInput = nextUrl && nextUrl !== originalUrl ? nextUrl : input;
        const responsePromise = originalFetch.call(this, nextInput, init);

        if (!originalUrl || !win.__blobioCustomSkinIsManifestUrl?.(originalUrl) || typeof win.Response !== 'function') {
          return responsePromise;
        }

        return responsePromise.then((response) => response.clone().text().then((text) => {
          const patchManifest = win.__blobioCustomSkinPatchManifest;
          const patchedText = typeof patchManifest === 'function' ? patchManifest(text) : text;
          if (patchedText === text) {
            return response;
          }

          return new win.Response(patchedText, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }));
      };
      win.__blobioCustomSkinFetchHookInstalled = true;
    }

    win.__blobioCustomSkinHookInstalled = true;
  }

  installCustomSkinManifestResponsePatch(xhr) {
    const textDescriptor = Object.getOwnPropertyDescriptor(xhr, 'responseText') || this.findPropertyDescriptor(Object.getPrototypeOf(xhr), 'responseText');
    const responseDescriptor = Object.getOwnPropertyDescriptor(xhr, 'response') || this.findPropertyDescriptor(Object.getPrototypeOf(xhr), 'response');

    if (textDescriptor) {
      try {
        Object.defineProperty(xhr, 'responseText', {
          configurable: true,
          get: () => {
            const raw = typeof textDescriptor.get === 'function' ? textDescriptor.get.call(xhr) : textDescriptor.value;
            return this.patchCustomSkinAssetManifest(raw);
          },
        });
      } catch {
        // Browser XHR implementations can reject per-instance response overrides.
      }
    }

    if (responseDescriptor) {
      try {
        Object.defineProperty(xhr, 'response', {
          configurable: true,
          get: () => {
            const raw = typeof responseDescriptor.get === 'function' ? responseDescriptor.get.call(xhr) : responseDescriptor.value;
            return typeof raw === 'string' ? this.patchCustomSkinAssetManifest(raw) : raw;
          },
        });
      } catch {
        // Browser XHR implementations can reject per-instance response overrides.
      }
    }
  }

  findPropertyDescriptor(prototype, propertyName) {
    let current = prototype;

    while (current) {
      const descriptor = Object.getOwnPropertyDescriptor(current, propertyName);
      if (descriptor) {
        return descriptor;
      }

      current = Object.getPrototypeOf(current);
    }

    return null;
  }

  resolveCustomSkinImageUrl(url) {
    const originalUrl = String(url || '');
    if (!this.isCustomSkinEnabled()) {
      return originalUrl;
    }

    const activeUrl = this.getActiveCustomSkinUrl();
    if (!activeUrl) {
      return originalUrl;
    }

    const localSkinName = this.getCustomSkinLocalName();
    const escapedName = localSkinName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const customSkinPath = new RegExp(`/skins/${CUSTOM_SKIN_TYPE}/${escapedName}\\.png$`, 'i');

    if (customSkinPath.test(this.getUrlPath(originalUrl))) {
      return activeUrl;
    }

    return originalUrl;
  }

  patchCustomSkinAssetManifest(text) {
    const manifest = String(text || '');
    if (!this.isCustomSkinEnabled()) {
      return manifest;
    }

    const activeUrl = this.getActiveCustomSkinUrl();
    if (!activeUrl) {
      return manifest;
    }

    const localSkinName = this.getCustomSkinLocalName();
    const skinPath = `skins/${CUSTOM_SKIN_TYPE}/${localSkinName}.png`;
    if (manifest.includes(skinPath)) {
      return manifest;
    }

    const separator = manifest.endsWith('\n') || manifest.length === 0 ? '' : '\n';
    return `${manifest}${separator}i:${skinPath}:0:image/png\n`;
  }

  isCustomSkinAssetManifestUrl(url) {
    return /(?:^|\/)assets\/assets\.txt$/i.test(this.getUrlPath(url));
  }

  getUrlPath(url) {
    try {
      const baseUrl = this.document.defaultView?.location?.href || 'https://client.blobgame.io/';
      return new URL(url, baseUrl).pathname;
    } catch {
      return String(url || '');
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
        classList?.contains('blobio-custom-skin-tab') ||
        classList?.contains('blobio-custom-skin-panel') ||
        classList?.contains('blobio-custom-skin')
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
