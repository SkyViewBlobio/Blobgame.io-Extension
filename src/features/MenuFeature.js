import { buildMenuCss } from '../css/MenuFeatureStyles.js';

const DEFAULT_CLASS_NAME = 'blobio-menu-enabled';
const DEFAULT_STYLE_ID = 'blobio-menu-style';
const DEFAULT_TOOLBAR_CLASS = 'blobio-menu-toolbar';
const HIDDEN_CLASS = 'blobio-original-hidden';
const PARTNER_LINK_MATCH = /iogames\.space|iogames\.live|io-games\.zone|silvergames\.com|crazygames\.com/i;
const FAILED_VIRAL_FRAME_MATCH = /viral\.iogames\.space/i;

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
  } = {}) {
    this.document = document;
    this.assets = assets;
    this.logger = logger;
    this.className = className;
    this.styleId = styleId;
    this.started = false;
    this.styleNode = null;
    this.toolbar = null;
    this.observer = null;
    this.panelBodies = new Map();
    this.hiddenOriginalNodes = new Set();
    this.policyDock = null;
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

    this.ensureStyle();
    this.applyPageClass();
    this.installToolbar();
    this.hideOriginalSections();
    this.installPolicyDock();
    this.watchPage();

    this.documentClickHandler = (event) => {
      if (this.toolbar?.contains(event.target) || this.policyDock?.contains(event.target)) {
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
    this.panelBodies.clear();

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

    this.observer = new MutationObserver(() => {
      this.applyPageClass();
      this.installToolbar();
      this.hideOriginalSections();
      this.installPolicyDock();
    });

    this.observer.observe(this.document.documentElement, { childList: true, subtree: true });
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
    button.dataset.panel = panelName;
    button.classList.add('icon-button', 'blobio-menu-button');
    button.style.display = 'inline-block';
    button.style.width = '50px';
    button.style.height = '50px';
    button.style.padding = '1px 6px';
    button.style.border = '0px none';
    button.style.backgroundColor = 'transparent';
    button.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : '';
    button.style.backgroundSize = 'cover';
    button.style.backgroundRepeat = 'repeat';
    button.style.backgroundPosition = '0% 0%';

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
    if (links.length === 0) {
      this.policyDock?.remove();
      this.policyDock = null;
      return;
    }

    if (!this.policyDock) {
      this.policyDock = this.createPolicyDock();
      this.document.body?.appendChild(this.policyDock);
    }
  }

  createPolicyDock() {
    const dock = this.document.createElement('div');
    dock.classList.add('blobio-policy-dock');

    const button = this.document.createElement('button');
    button.type = 'button';
    button.classList.add('button', 'blobio-policy-button');
    button.textContent = 'Policy';
    button.addEventListener('click', (event) => {
      event.stopPropagation?.();
      this.togglePanel('policy');
    });

    dock.append(button, this.createPanel('policy', 'Policy'));
    return dock;
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
      if (this.policyDock?.contains(link)) {
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
      if (PARTNER_LINK_MATCH.test(link.getAttribute('href') || '') && link.parentElement) {
        containers.add(link.parentElement);
      }
    }

    return [...containers].filter((container) => {
      const directPartnerLinks = Array.from(container.querySelectorAll?.('a[href]') || [])
        .filter((link) => link.parentElement === container && PARTNER_LINK_MATCH.test(link.getAttribute('href') || ''));

      return directPartnerLinks.length >= 2;
    });
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
    node.classList?.add(HIDDEN_CLASS);
    this.hiddenOriginalNodes.add(node);
  }

  getPanels() {
    return [
      ...Array.from(this.toolbar?.querySelectorAll('.blobio-menu-panel') || []),
      ...Array.from(this.policyDock?.querySelectorAll('.blobio-menu-panel') || []),
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
