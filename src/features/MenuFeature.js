const DEFAULT_CLASS_NAME = 'blobio-menu-enabled';
const DEFAULT_STYLE_ID = 'blobio-menu-style';
const DEFAULT_TOOLBAR_CLASS = 'blobio-menu-toolbar';

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
    this.watchPage();

    this.documentClickHandler = (event) => {
      if (!this.toolbar || this.toolbar.contains(event.target)) {
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
    this.panelBodies.clear();

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
    return `
html.${this.className} .social {
  display: none !important;
}

html.${this.className} .aside.aside-2 {
  max-width: 260px !important;
  padding: 8px !important;
  font-size: 12px !important;
  line-height: 1.25 !important;
}

html.${this.className} .aside.aside-2 h1,
html.${this.className} .aside.aside-2 h2,
html.${this.className} .aside.aside-2 h3,
html.${this.className} .aside.aside-2 h4 {
  margin: 0 0 6px !important;
  font-size: 13px !important;
  line-height: 1.1 !important;
}

html.${this.className} .history-wrapper {
  max-height: 158px !important;
  overflow: auto !important;
  padding: 6px !important;
  border: 1px solid rgba(112, 255, 150, 0.24) !important;
  border-radius: 8px !important;
  background: rgba(0, 20, 12, 0.36) !important;
}

.${DEFAULT_TOOLBAR_CLASS} {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  vertical-align: middle;
  z-index: 2147482500;
}

.${DEFAULT_TOOLBAR_CLASS}.is-floating {
  position: fixed;
  left: 18px;
  bottom: 82px;
  margin-left: 0;
}

.blobio-menu-buttons {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.blobio-menu-button {
  width: 38px;
  height: 38px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(135, 255, 168, 0.46);
  border-radius: 8px;
  background: radial-gradient(circle at 50% 35%, rgba(74, 255, 137, 0.22), rgba(4, 22, 14, 0.9));
  box-shadow: 0 0 12px rgba(79, 255, 126, 0.26), inset 0 0 10px rgba(121, 255, 160, 0.16);
  cursor: pointer;
}

.blobio-menu-button:hover,
.blobio-menu-button.is-active {
  border-color: rgba(178, 255, 194, 0.82);
  box-shadow: 0 0 18px rgba(90, 255, 135, 0.44), inset 0 0 12px rgba(143, 255, 170, 0.24);
}

.blobio-menu-button img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  pointer-events: none;
}

.blobio-menu-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.blobio-menu-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: min(360px, calc(100vw - 32px));
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px) scaleY(0.96);
  transform-origin: top;
  transition: max-height 190ms ease, opacity 160ms ease, transform 190ms ease;
  border: 1px solid rgba(134, 255, 171, 0.5);
  border-radius: 10px;
  background: rgba(2, 18, 12, 0.94);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45), 0 0 20px rgba(77, 255, 127, 0.28);
  color: #eaffee;
}

.blobio-menu-panel.is-open {
  max-height: 430px;
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scaleY(1);
}

.blobio-panel-inner {
  padding: 10px;
}

.blobio-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.blobio-panel-title {
  margin: 0;
  font-size: 15px;
  line-height: 1.1;
}

.blobio-panel-close {
  width: 24px;
  height: 24px;
  border: 1px solid rgba(135, 255, 168, 0.46);
  border-radius: 6px;
  background: rgba(5, 38, 22, 0.86);
  color: #dcffe4;
  cursor: pointer;
}

.blobio-video-link {
  display: block;
  color: #eaffee;
  text-decoration: none;
}

.blobio-video-thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border: 1px solid rgba(142, 255, 174, 0.38);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
}

.blobio-video-title {
  margin: 7px 0 0;
  font-size: 13px;
  line-height: 1.25;
}

.blobio-update-list {
  max-height: 318px;
  overflow: auto;
  display: grid;
  gap: 7px;
}

.blobio-update-entry {
  display: grid;
  grid-template-columns: 58px 1fr;
  gap: 8px;
  padding-bottom: 7px;
  border-bottom: 1px solid rgba(126, 255, 161, 0.12);
}

.blobio-update-date {
  color: #96ffad;
  font-size: 12px;
  font-weight: 700;
}

.blobio-update-items {
  margin: 0;
  padding-left: 15px;
  font-size: 12px;
  line-height: 1.3;
}

.blobio-social-title {
  margin: 2px 0 12px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #dfffdf;
  text-shadow: 0 0 8px rgba(95, 255, 132, 0.8), 0 0 20px rgba(95, 255, 132, 0.34);
  animation: blobio-social-glow 1700ms ease-in-out infinite alternate;
}

.blobio-social-row {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.blobio-social-link {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(139, 255, 171, 0.42);
  border-radius: 8px;
  background: rgba(3, 30, 17, 0.8);
  box-shadow: inset 0 0 8px rgba(91, 255, 132, 0.16);
}

.blobio-social-link:hover {
  box-shadow: 0 0 16px rgba(92, 255, 132, 0.38), inset 0 0 8px rgba(91, 255, 132, 0.18);
}

.blobio-social-link img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

@keyframes blobio-social-glow {
  from {
    transform: scale(1);
    text-shadow: 0 0 8px rgba(95, 255, 132, 0.74), 0 0 18px rgba(95, 255, 132, 0.28);
  }

  to {
    transform: scale(1.03);
    text-shadow: 0 0 12px rgba(172, 255, 187, 0.94), 0 0 26px rgba(95, 255, 132, 0.48);
  }
}
`.trim();
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
    button.classList.add('blobio-menu-button');

    const image = this.document.createElement('img');
    image.setAttribute('alt', '');
    image.setAttribute('src', imageUrl || '');

    const hiddenLabel = this.document.createElement('span');
    hiddenLabel.classList.add('blobio-menu-label');
    hiddenLabel.textContent = label;

    button.append(image, hiddenLabel);
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
    const panel = this.createPanel('socials', 'Blobio Socials');
    this.renderSocialPanel();
    return panel;
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
    close.setAttribute('aria-label', `Close ${titleText}`);
    close.textContent = 'X';
    close.addEventListener('click', (event) => {
      event.stopPropagation?.();
      this.closePanels();
    });

    const body = this.document.createElement('div');
    body.classList.add('blobio-panel-body');

    header.append(title, close);
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

  togglePanel(panelName) {
    const panel = this.document.getElementById?.(`blobio-panel-${panelName}`);
    if (!panel) {
      return;
    }

    if (panelName === 'featured') {
      this.renderFeaturedPanel();
    } else if (panelName === 'socials') {
      this.renderSocialPanel();
    }

    const willOpen = !panel.classList.contains('is-open');
    this.closePanels();

    if (!willOpen) {
      return;
    }

    panel.classList.add('is-open');

    for (const button of this.toolbar?.querySelectorAll('button') || []) {
      if (button.dataset.panel === panelName) {
        button.classList.add('is-active');
      }
    }
  }

  closePanels() {
    for (const panel of this.toolbar?.querySelectorAll('.blobio-menu-panel') || []) {
      panel.classList.remove('is-open');
    }

    for (const button of this.toolbar?.querySelectorAll('button') || []) {
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
    const id =
      url.match(/[?&]v=([^&]+)/)?.[1] ||
      url.match(/youtu\.be\/([^?&]+)/)?.[1] ||
      url.match(/embed\/([^?&]+)/)?.[1] ||
      'GOlXDLWeGMo';

    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
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

  clearElement(element) {
    while (element.children.length > 0) {
      element.children[0].remove();
    }

    element.textContent = '';
  }
}
