import assert from 'node:assert/strict';
import test from 'node:test';

import { MenuFeature } from '../src/features/MenuFeature.js';
import { createFakeDocument } from './helpers/fake-dom.js';

const assets = {
  recommendedButton: 'data:image/png;base64,yt-button',
  updatesButton: 'data:image/png;base64,updates-button',
  socialsButton: 'data:image/png;base64,social-button',
  youtubeIcon: 'data:image/png;base64,youtube-icon',
  discordIcon: 'data:image/png;base64,discord-icon',
  facebookIcon: 'data:image/png;base64,facebook-icon',
  instagramIcon: 'data:image/png;base64,instagram-icon',
};

function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function addReplayButton(document) {
  const header = document.createElement('div');
  header.classList.add('header');
  header.setAttribute('_ngcontent-c1', '');

  const controls = document.createElement('div');
  controls.classList.add('right');
  controls.setAttribute('_ngcontent-c1', '');

  const replayButton = document.createElement('button');
  replayButton.classList.add('replays', 'icon-button');
  replayButton.setAttribute('_ngcontent-c1', '');
  replayButton.textContent = 'Replay';

  controls.appendChild(replayButton);
  header.appendChild(controls);
  document.body.appendChild(header);

  return { controls, replayButton };
}

function addNameInput(document) {
  const inputs = document.createElement('div');
  inputs.classList.add('inputs-container');

  const input = document.createElement('input');
  input.id = 'nick';
  input.setAttribute('type', 'text');

  inputs.appendChild(input);
  document.body.appendChild(inputs);
  return input;
}

function setWatermarkRects(input) {
  input.parentNode.getBoundingClientRect = () => ({ left: 20, top: 100, width: 300, height: 80 });
  input.getBoundingClientRect = () => ({ left: 50, top: 118, width: 150, height: 36 });
}

function toHtmlCollectionLike(children) {
  const collection = {};
  children.forEach((child, index) => {
    collection[index] = child;
  });
  collection.length = children.length;
  collection.item = (index) => collection[index] || null;
  collection[Symbol.iterator] = function* iterate() {
    for (let index = 0; index < children.length; index += 1) {
      yield children[index];
    }
  };
  return collection;
}

function addSettingsModal(document) {
  const settings = document.createElement('app-settings');

  const left = document.createElement('div');
  left.classList.add('left');
  const tabs = document.createElement('ul');

  for (const label of ['Options', 'Keybindings', 'Theme']) {
    const tab = document.createElement('li');
    tab.textContent = label;
    if (label === 'Keybindings') {
      tab.classList.add('active');
    }
    tabs.appendChild(tab);
  }

  const right = document.createElement('div');
  right.classList.add('right');
  const inner = document.createElement('div');
  inner.classList.add('inner-container');
  const content = document.createElement('div');
  content.classList.add('content-container', 'scroll');
  const grid = document.createElement('div');
  grid.classList.add('grid-container');
  const title = document.createElement('div');
  title.classList.add('title');
  title.textContent = 'Select entry and press any key to bind';

  grid.appendChild(title);
  content.appendChild(grid);
  inner.appendChild(content);
  right.appendChild(inner);
  left.appendChild(tabs);
  settings.append(left, right);
  document.body.appendChild(settings);
  return settings;
}

function addSkinModal(document) {
  const skins = document.createElement('app-skins');

  const modalHeader = document.createElement('app-modal-header');
  const header = document.createElement('div');
  header.classList.add('header');
  const label = document.createElement('div');
  label.classList.add('label');
  const heading = document.createElement('h3');
  heading.textContent = 'Skins';
  label.appendChild(heading);
  header.appendChild(label);
  modalHeader.appendChild(header);

  const body = document.createElement('div');
  body.classList.add('body');

  const left = document.createElement('div');
  left.classList.add('left');
  const tabs = document.createElement('ul');

  for (const label of ['Free', 'Premium', 'YouTube']) {
    const tab = document.createElement('li');
    tab.textContent = label;
    if (label === 'Free') {
      tab.classList.add('active');
    }
    tabs.appendChild(tab);
  }

  const right = document.createElement('div');
  right.classList.add('right');
  const inner = document.createElement('div');
  inner.classList.add('inner-container');
  const originalContainer = document.createElement('div');
  originalContainer.classList.add('skins-container', 'scroll');

  const skin = document.createElement('div');
  skin.classList.add('skin');
  const image = document.createElement('img');
  image.setAttribute('src', 'https://client.blobgame.io/skins/free/alien_.png');
  const title = document.createElement('div');
  title.classList.add('title');
  title.textContent = 'Alien';
  skin.append(image, title);
  originalContainer.appendChild(skin);

  inner.appendChild(originalContainer);
  right.appendChild(inner);
  left.appendChild(tabs);
  body.append(left, right);
  skins.append(modalHeader, body);
  document.body.appendChild(skins);

  return { skins, tabs, originalContainer };
}

function addChooseSkinButton(document) {
  const inputs = document.querySelector('.inputs-container') || document.createElement('div');
  inputs.classList.add('inputs-container');

  if (!inputs.parentNode) {
    document.body.appendChild(inputs);
  }

  const button = document.createElement('button');
  button.classList.add('choose-skin-btn');

  const image = document.createElement('img');
  image.classList.add('skin-img');
  image.setAttribute('src', 'https://client.blobgame.io/skins/free/1cat.png');

  button.appendChild(image);
  inputs.appendChild(button);
  return { button, image };
}

function addUsername(document, text = 'SkyView') {
  const username = document.createElement('div');
  username.classList.add('fleft', 'username');
  username.textContent = text;
  document.body.appendChild(username);
  return username;
}

function addOriginalSocialLinks(document) {
  const social = document.createElement('div');
  social.classList.add('social');

  const links = [
    ['https://youtube.com/@blobio', 'YouTube'],
    ['https://disc.blobgame.io/', 'Discord'],
    ['https://facebook.com/blobio', 'Facebook'],
    ['https://instagram.com/blob.io_official', 'Instagram'],
  ];

  for (const [href, label] of links) {
    const link = document.createElement('a');
    link.setAttribute('href', href);
    link.textContent = label;
    social.appendChild(link);
  }

  document.body.appendChild(social);
  return social;
}

function addOriginalFeaturedVideo(document) {
  const title = document.createElement('div');
  title.id = 'youtube-title';
  title.textContent = 'Featured Video: KING OF CRAZY 2 - BLOB.IO YT RANK SPECIAL';

  const youtube = document.createElement('div');
  youtube.classList.add('youtube', 'hide-on-small-screen');

  const iframe = document.createElement('iframe');
  iframe.id = 'youtube-iframe';
  iframe.setAttribute('src', 'https://www.youtube.com/embed/EY-XCBj5Tjs');

  youtube.appendChild(iframe);
  document.body.append(title, youtube);
}

function addOriginalUpdateNotes(document) {
  const aside = document.createElement('div');
  aside.classList.add('aside', 'aside-2');

  const heading = document.createElement('h3');
  heading.textContent = 'Updates';

  const history = document.createElement('div');
  history.classList.add('history-wrapper');
  history.textContent = 'Old update history';

  aside.append(heading, history);
  document.body.appendChild(aside);
}

function addLiveOriginalUpdateNotes(document) {
  const aside = document.createElement('aside');
  aside.classList.add('aside', 'aside-1', 'hide-on-small-screen');

  const wrapper = document.createElement('div');
  wrapper.textContent = 'Updates notes:';

  const history = document.createElement('div');
  history.classList.add('history-wrapper');
  history.textContent = 'Apr 25: Added servers list';

  wrapper.appendChild(history);
  aside.appendChild(wrapper);
  document.body.appendChild(aside);

  return wrapper;
}

function addCuedOverlay(document) {
  const overlay = document.createElement('cued-overlay');
  overlay.classList.add('ytmCuedOverlayHost');

  const gradient = document.createElement('div');
  gradient.classList.add('ytmCuedOverlayGradient');

  overlay.appendChild(gradient);
  document.body.appendChild(overlay);
}

function addOriginalPolicyLinks(document) {
  const policy = document.createElement('div');
  policy.classList.add('policy');

  const heading = document.createElement('h3');
  heading.textContent = 'Policy';

  const privacy = document.createElement('a');
  privacy.setAttribute('href', 'https://blob-devour.blogspot.com/2017/08/privacy-policy-this-policy-will-explain.html');
  privacy.textContent = 'Privacy Policy';

  const terms = document.createElement('a');
  terms.setAttribute('href', 'https://blob-terms-and-conditions.blogspot.com/2018/12/blob-io-terms-and-conditions.html');
  terms.textContent = 'Terms and Conditions';

  policy.append(heading, privacy, terms);
  document.body.appendChild(policy);
}

function addConsentManagerPolicyLinks(document) {
  const consent = document.createElement('div');
  consent.classList.add('fc-consent-root');

  for (let index = 0; index < 4; index += 1) {
    const link = document.createElement('a');
    link.classList.add('fc-vendor-policy-link');
    link.setAttribute('href', '#');
    link.textContent = 'Privacy policy';
    consent.appendChild(link);
  }

  document.body.appendChild(consent);
}

function addPartnerLinks(document) {
  const wrapper = document.createElement('div');
  const links = [
    ['https://iogames.space', 'io-games.space | '],
    ['https://iogames.live', 'io-games.live | '],
    ['http://io-games.zone/', 'io-games.zone | '],
    ['https://www.silvergames.com/en/iogames', 'silvergames.com | '],
    ['https://www.crazygames.com/c/io/', 'crazygames.com'],
  ];

  for (const [href, label] of links) {
    const link = document.createElement('a');
    link.setAttribute('href', href);
    link.textContent = label;
    wrapper.appendChild(link);
  }

  document.body.appendChild(wrapper);
  return wrapper;
}

function addOtherProjectLinks(document) {
  const footer = document.createElement('footer');
  footer.classList.add('footer');

  const partner = document.createElement('div');
  partner.classList.add('partner');

  const title = document.createElement('p');
  title.textContent = 'Our other projects:';

  const row = document.createElement('div');
  const clicks = [];

  for (const [label, image] of [['Game One', 'url("game-one.png")'], ['Game Two', 'url("game-two.png")']]) {
    const link = document.createElement('a');
    link.classList.add('mus-conv', 'icon-button', 'pulse');
    link.setAttribute('aria-label', label);
    link.style.backgroundImage = image;
    link.addEventListener('click', () => clicks.push(label));
    row.appendChild(link);
  }

  partner.append(title, row);
  footer.appendChild(partner);
  document.body.appendChild(footer);

  return { footer, partner, clicks };
}

function addFailedViralFrame(document) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('hide-on-small-screen');

  const frame = document.createElement('iframe');
  frame.id = 'blob-io';
  frame.setAttribute('src', 'https://viral.iogames.space/');
  frame.setAttribute('width', '220');
  frame.setAttribute('height', '140');

  wrapper.appendChild(frame);
  document.body.appendChild(wrapper);

  return { wrapper, frame };
}

test('MenuFeature injects toolbar buttons next to the Replay button and hides original socials', () => {
  const document = createFakeDocument();
  const { controls, replayButton } = addReplayButton(document);
  const originalSocial = addOriginalSocialLinks(document);

  const feature = new MenuFeature({ document, assets });

  assert.equal(feature.start(), true);

  const style = document.getElementById('blobio-menu-style');
  assert.notEqual(style, null);
  assert.match(style.textContent, /\.social\s*\{/);

  const toolbar = document.querySelector('.blobio-menu-toolbar');
  assert.notEqual(toolbar, null);
  assert.equal(toolbar.parentNode, controls);
  assert.equal(controls.children.indexOf(toolbar), controls.children.indexOf(replayButton) + 1);
  const buttons = toolbar.querySelector('.blobio-menu-buttons').querySelectorAll('button');
  assert.equal(buttons.length, 3);
  assert.equal(buttons[0].classList.contains('icon-button'), true);
  assert.equal(buttons[0].hasAttribute('_ngcontent-c1'), true);
  assert.equal(buttons[0].style.backgroundImage, 'url("data:image/png;base64,yt-button")');
  assert.equal(buttons[0].style.width, undefined);
  assert.equal(buttons[0].style.height, undefined);
  assert.equal(buttons[0].style.backgroundSize, undefined);
  assert.equal(buttons[0].style.backgroundRepeat, undefined);
  assert.equal(buttons[0].style.backgroundPosition, undefined);
  assert.equal(buttons[0].style.display, undefined);
  assert.equal(buttons[0].style.padding, undefined);
  assert.equal(buttons[0].style.border, undefined);
  assert.equal(buttons[0].style.backgroundColor, undefined);
  const toolbarCss = style.textContent.match(/\.blobio-menu-toolbar\s*{[^}]*}/)?.[0] || '';
  assert.match(style.textContent, /\.blobio-menu-button\s*{[\s\S]*background-size: 96% 96% !important;/);
  assert.match(style.textContent, /\.blobio-menu-buttons\s*{[\s\S]*top: 0;/);
  assert.match(style.textContent, /\.blobio-menu-panel\s*{[\s\S]*z-index: 2147482500;/);
  assert.doesNotMatch(toolbarCss, /z-index: 2147482500;/);
  assert.match(toolbar.textContent, /Featured/);
  assert.match(toolbar.textContent, /Updates/);
  assert.match(toolbar.textContent, /Socials/);
  assert.doesNotMatch(style.textContent, /radial-gradient/);
  assert.doesNotMatch(style.textContent, /\.blobio-menu-button:hover/);
  assert.equal(originalSocial.classList.contains('blobio-original-hidden'), true);

  feature.destroy();

  assert.equal(document.getElementById('blobio-menu-style'), null);
  assert.equal(document.querySelector('.blobio-menu-toolbar'), null);
  assert.equal(originalSocial.classList.contains('blobio-original-hidden'), false);
});

test('MenuFeature hides original featured video, update history, and cued overlay blocks', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  addOriginalFeaturedVideo(document);
  addOriginalUpdateNotes(document);
  addCuedOverlay(document);
  const { wrapper: viralFrameWrapper, frame: viralFrame } = addFailedViralFrame(document);

  const feature = new MenuFeature({ document, assets });
  feature.start();

  assert.equal(document.getElementById('youtube-title').classList.contains('blobio-original-hidden'), true);
  assert.equal(document.querySelector('.youtube').classList.contains('blobio-original-hidden'), true);
  assert.equal(document.querySelector('.history-wrapper').classList.contains('blobio-original-hidden'), true);
  assert.equal(document.querySelector('.aside.aside-2 h3').classList.contains('blobio-original-hidden'), true);
  assert.equal(document.querySelector('cued-overlay.ytmCuedOverlayHost').classList.contains('blobio-original-hidden'), true);
  assert.equal(document.querySelector('.ytmCuedOverlayGradient').classList.contains('blobio-original-hidden'), true);
  assert.equal(viralFrame.classList.contains('blobio-original-hidden'), true);
  assert.equal(viralFrameWrapper.classList.contains('blobio-original-hidden'), true);

  feature.destroy();

  assert.equal(document.getElementById('youtube-title').classList.contains('blobio-original-hidden'), false);
  assert.equal(viralFrame.classList.contains('blobio-original-hidden'), false);
  assert.equal(viralFrameWrapper.classList.contains('blobio-original-hidden'), false);
});

test('MenuFeature hides the live Updates notes wrapper from aside-1', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  const updateWrapper = addLiveOriginalUpdateNotes(document);

  const feature = new MenuFeature({ document, assets });
  feature.start();

  assert.equal(updateWrapper.classList.contains('blobio-original-hidden'), true);
  assert.equal(document.querySelector('.history-wrapper').classList.contains('blobio-original-hidden'), true);

  feature.destroy();
});

test('MenuFeature opens one animated panel and closes it on Escape or outside click', () => {
  const document = createFakeDocument();
  addReplayButton(document);

  const feature = new MenuFeature({ document, assets });
  feature.start();

  const toolbar = document.querySelector('.blobio-menu-toolbar');
  const [featuredButton, updatesButton] = toolbar.querySelectorAll('button');

  featuredButton.click();

  const featuredPanel = document.getElementById('blobio-panel-featured');
  assert.equal(featuredPanel.classList.contains('is-open'), true);
  assert.match(featuredPanel.textContent, /Featured Blob\.io Video/);

  updatesButton.click();

  const updatesPanel = document.getElementById('blobio-panel-updates');
  assert.equal(featuredPanel.classList.contains('is-open'), false);
  assert.equal(updatesPanel.classList.contains('is-open'), true);
  assert.match(updatesPanel.textContent, /Update Notes/);

  document.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.equal(updatesPanel.classList.contains('is-open'), false);

  featuredButton.click();
  document.dispatchEvent({ type: 'click', target: document.body });
  assert.equal(featuredPanel.classList.contains('is-open'), false);

  feature.destroy();
});

test('MenuFeature uses the current Blobgame featured video title and thumbnail', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  addOriginalFeaturedVideo(document);

  const feature = new MenuFeature({ document, assets });
  feature.start();

  const toolbar = document.querySelector('.blobio-menu-toolbar');
  const featuredButton = toolbar.querySelectorAll('button')[0];
  featuredButton.click();

  const panel = document.getElementById('blobio-panel-featured');
  let videoLink = panel.querySelector('a[href]');
  let thumbnail = panel.querySelector('img');

  assert.equal(videoLink.getAttribute('href'), 'https://www.youtube.com/watch?v=EY-XCBj5Tjs');
  assert.equal(thumbnail.getAttribute('src'), 'https://img.youtube.com/vi/EY-XCBj5Tjs/hqdefault.jpg');
  assert.match(panel.textContent, /KING OF CRAZY 2 - BLOB\.IO YT RANK SPECIAL/);

  document.getElementById('youtube-title').textContent = 'Featured Video: NEW BLOB.IO CLIP';
  document.getElementById('youtube-iframe').setAttribute('src', 'https://www.youtube.com/embed/XL316v1Ww6k');

  featuredButton.click();
  featuredButton.click();

  videoLink = panel.querySelector('a[href]');
  thumbnail = panel.querySelector('img');

  assert.equal(videoLink.getAttribute('href'), 'https://www.youtube.com/watch?v=XL316v1Ww6k');
  assert.equal(thumbnail.getAttribute('src'), 'https://img.youtube.com/vi/XL316v1Ww6k/hqdefault.jpg');
  assert.match(panel.textContent, /NEW BLOB\.IO CLIP/);

  feature.destroy();
});

test('MenuFeature rebuilds social links with local icons and existing hrefs', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  addOriginalSocialLinks(document);

  const feature = new MenuFeature({ document, assets });
  feature.start();

  const toolbar = document.querySelector('.blobio-menu-toolbar');
  const socialButton = toolbar.querySelectorAll('button')[2];
  socialButton.click();

  const panel = document.getElementById('blobio-panel-socials');
  const links = panel.querySelectorAll('a[href]');

  assert.equal(panel.classList.contains('is-open'), true);
  assert.match(panel.textContent, /Blobio Socials/);
  assert.equal(panel.textContent.match(/Blobio Socials/g)?.length, 1);
  assert.equal(links.length, 4);
  assert.equal(links[0].getAttribute('href'), 'https://youtube.com/@blobio');
  assert.equal(links[1].getAttribute('href'), 'https://disc.blobgame.io/');
  assert.equal(links[2].getAttribute('href'), 'https://facebook.com/blobio');
  assert.equal(links[3].getAttribute('href'), 'https://instagram.com/blob.io_official');
  assert.equal(links[0].querySelector('img').getAttribute('src'), assets.youtubeIcon);

  feature.destroy();
});

test('MenuFeature combines policy links and other games into one bottom menu', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  addOriginalPolicyLinks(document);
  const partnerLinks = addPartnerLinks(document);
  const { footer, partner, clicks } = addOtherProjectLinks(document);

  const feature = new MenuFeature({ document, assets });
  feature.start();

  const style = document.getElementById('blobio-menu-style');
  const originalLinks = document.querySelectorAll('.policy a[href]');
  const policyDock = document.querySelector('.blobio-policy-dock');
  const modalHost = document.querySelector('.blobio-footer-modal-host');
  const policyPanel = document.getElementById('blobio-panel-policy-games');
  const dockButtons = policyDock.querySelectorAll('button');

  assert.equal(originalLinks.length, 2);
  assert.equal(originalLinks[0].classList.contains('blobio-original-hidden'), true);
  assert.equal(partnerLinks.classList.contains('blobio-original-hidden'), true);
  assert.equal(footer.classList.contains('blobio-original-hidden'), false);
  assert.equal(partner.classList.contains('blobio-original-hidden'), false);
  assert.notEqual(policyDock, null);
  assert.notEqual(modalHost, null);
  assert.equal(policyPanel.parentNode, modalHost);
  assert.equal(policyPanel.classList.contains('is-open'), false);
  assert.equal(policyPanel.querySelectorAll('a[href]').length, 0);
  assert.equal(document.getElementById('blobio-panel-policy'), null);
  assert.equal(document.getElementById('blobio-panel-games'), null);
  assert.equal(dockButtons.length, 1);
  assert.equal(dockButtons[0].textContent, 'Policy/Other Games');
  assert.equal(dockButtons[0].dataset.panel, 'policy-games');
  const footerDockCss = style.textContent.match(/\.blobio-footer-dock\s*{[^}]*}/)?.[0] || '';
  assert.match(style.textContent, /\.blobio-footer-dock\s*{[\s\S]*left: 50%;/);
  assert.match(style.textContent, /\.blobio-footer-dock\s*{[\s\S]*bottom: 10px;/);
  assert.match(style.textContent, /\.blobio-footer-dock\s*{[\s\S]*transform: translateX\(-50%\);/);
  assert.match(style.textContent, /\.blobio-footer-dock\s*{[\s\S]*z-index: 20;/);
  assert.doesNotMatch(footerDockCss, /z-index: 2147482500;/);
  assert.match(style.textContent, /\.blobio-dock-buttons\s*{[\s\S]*display: flex;/);
  assert.doesNotMatch(style.textContent, /\.blobio-footer-dock\.is-focusing/);
  assert.doesNotMatch(style.textContent, /\.blobio-policy-button\s*{[\s\S]*transform:/);
  assert.match(style.textContent, /\.blobio-footer-modal-host\s*{[\s\S]*z-index: 2147482500;/);
  assert.match(style.textContent, /\.blobio-dock-button\s*{[\s\S]*background: rgba\(3, 44, 23, 0\.46\)/);
  assert.match(style.textContent, /\.blobio-dock-button\s*{[\s\S]*border: 1px solid rgba\(142, 255, 174, 0\.68\)/);
  assert.match(style.textContent, /\.blobio-footer-modal-host \.blobio-menu-panel\s*{[\s\S]*top: 50%;/);
  assert.match(style.textContent, /\.blobio-footer-modal-host \.blobio-menu-panel\s*{[\s\S]*left: 50%;/);
  assert.match(style.textContent, /\.blobio-footer-modal-host \.blobio-menu-panel\s*{[\s\S]*transform: translate\(-50%, -48%\) scale\(0\.96\);/);
  assert.match(style.textContent, /\.blobio-policy-links\s*{[\s\S]*display: flex;/);
  assert.match(style.textContent, /\.blobio-policy-link\s*{[\s\S]*border: 1px solid rgba\(142, 255, 174, 0\.46\)/);
  assert.match(style.textContent, /\.blobio-panel-section\s*{[\s\S]*background: linear-gradient/);
  assert.match(style.textContent, /\.blobio-panel-section-title\s*{[\s\S]*color: #dfffe6;/);
  assert.match(style.textContent, /\.blobio-game-links/);
  assert.match(style.textContent, /\.blobio-game-links\s*{[\s\S]*gap: 24px;/);
  assert.match(style.textContent, /\.blobio-game-label\s*{[\s\S]*color: #dfffe6;/);
  assert.doesNotMatch(style.textContent, /\.blobio-policy-dock \.blobio-menu-panel\s*{[\s\S]*bottom: calc\(100%/);

  policyDock.querySelector('button').click();

  const foldedLinks = policyPanel.querySelectorAll('a[href]');
  const gameCards = policyPanel.querySelectorAll('.blobio-game-card');
  const gameButtons = policyPanel.querySelectorAll('.blobio-game-card button');
  assert.equal(policyPanel.classList.contains('is-open'), true);
  assert.equal(policyDock.classList.contains('is-focusing-policy'), false);
  assert.equal(policyDock.classList.contains('is-focusing-games'), false);
  assert.equal(foldedLinks.length, 7);
  assert.match(policyPanel.textContent, /Policy/);
  assert.match(policyPanel.textContent, /Other Games/);
  assert.equal(foldedLinks[0].getAttribute('href'), originalLinks[0].getAttribute('href'));
  assert.equal(foldedLinks[2].getAttribute('href'), 'https://iogames.space');
  assert.match(policyPanel.textContent, /Privacy Policy/);
  assert.match(policyPanel.textContent, /Terms and Conditions/);
  assert.match(policyPanel.textContent, /io-games\.space/);
  assert.match(policyPanel.textContent, /crazygames\.com/);
  assert.equal(gameCards.length, 2);
  assert.equal(gameButtons.length, 2);
  assert.match(gameCards[0].textContent, /Viper/);
  assert.match(gameCards[1].textContent, /Hexa/);
  assert.equal(gameButtons[0].style.backgroundImage, 'url("game-one.png")');

  gameButtons[0].click();
  assert.deepEqual(clicks, ['Game One']);

  document.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.equal(policyPanel.classList.contains('is-open'), false);
  assert.equal(policyDock.classList.contains('is-focusing-policy'), false);

  feature.destroy();

  assert.equal(document.querySelector('.blobio-policy-dock'), null);
  assert.equal(document.querySelector('.blobio-footer-modal-host'), null);
  assert.equal(originalLinks[0].classList.contains('blobio-original-hidden'), false);
  assert.equal(partnerLinks.classList.contains('blobio-original-hidden'), false);
});

test('MenuFeature keeps folded policy links visible after a page refresh pass', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  addOriginalPolicyLinks(document);
  addPartnerLinks(document);

  const feature = new MenuFeature({ document, assets });
  feature.start();

  const policyDock = document.querySelector('.blobio-policy-dock');
  const policyPanel = document.getElementById('blobio-panel-policy-games');
  policyDock.querySelector('button').click();

  feature.hideOriginalSections();

  assert.equal(policyPanel.querySelector('.blobio-policy-links').classList.contains('blobio-original-hidden'), false);
  assert.equal(policyPanel.querySelectorAll('a[href]').length, 7);

  feature.destroy();
});

test('MenuFeature CSS hides the inputs image and frames main menu fields with green glow', () => {
  const document = createFakeDocument();
  addReplayButton(document);

  const feature = new MenuFeature({ document, assets });
  feature.start();

  const style = document.getElementById('blobio-menu-style').textContent;

  assert.match(style, /img\.inputs-background-img\s*{[\s\S]*display: none !important;/);
  assert.match(style, /\.inputs-container input\s*,[\s\S]*\.choose-skin-btn\s*,[\s\S]*#game-wrapper \.custom-select/);
  assert.match(style, /\.progress-bar\s*{[\s\S]*box-shadow:/);
  assert.match(style, /#ip-container table\s*{[\s\S]*background: rgba\(3, 44, 23, 0\.48\)/);
  assert.match(style, /#custom-host-input\s*{[\s\S]*font-weight: 700/);
  assert.match(style, /#custom-host-input\s*{[\s\S]*background: rgba\(0, 0, 0, 0\.62\)/);
  assert.match(style, /\.inputs-container input\s*,[\s\S]*\.inputs-container button\s*,[\s\S]*#game-wrapper \.custom-select-display\s*,[\s\S]*#game-wrapper \.custom-select-option\s*,[\s\S]*\.progress-bar\s*,[\s\S]*\.progress-bar-title\s*{[\s\S]*color: #dfffe6 !important;/);
  assert.match(style, /#game-wrapper \.custom-select-display\s*{[\s\S]*background: rgba\(3, 28, 17, 0\.46\) !important;/);
  assert.match(style, /#game-wrapper \.custom-select-option\s*{[\s\S]*background: rgba\(3, 44, 23, 0\.78\) !important;/);
  assert.match(style, /\.progress-bar\s*{[\s\S]*background-color: rgba\(3, 44, 23, 0\.46\) !important;/);
  const progressBarCss = style.match(/\.progress-bar\s*{[^}]*}/)?.[0] || '';
  assert.doesNotMatch(progressBarCss, /background: rgba\(3, 44, 23, 0\.46\) !important;/);
  assert.match(style, /footer\.footer\s*{[\s\S]*visibility: hidden !important;/);
  const footerCss = style.match(/footer\.footer\s*{[^}]*}/)?.[0] || '';
  assert.doesNotMatch(footerCss, /display: none !important;/);
  assert.doesNotMatch(footerCss, /display: flex !important;/);
  assert.match(footerCss, /display: block !important;/);
  assert.match(footerCss, /min-height: 150px !important;/);
  assert.match(style, /footer\.footer \*\s*{[\s\S]*visibility: hidden !important;/);
  const footerDescendantCss = style.match(/footer\.footer \*\s*{[^}]*}/)?.[0] || '';
  assert.doesNotMatch(footerDescendantCss, /display: none !important;/);
  assert.match(style, /\.blobio-panel-close\s*{[\s\S]*display: inline-flex;/);
  assert.match(style, /\.blobio-panel-close\s*{[\s\S]*background: rgba\(102, 10, 16, 0\.92\);/);
  assert.match(style, /\.blobio-panel-close\s*{[\s\S]*color: #fff;/);
  assert.match(style, /\.fleft\.username\s*{[\s\S]*position: relative !important;/);
  assert.match(style, /\.fleft\.username\s*{[\s\S]*color: transparent !important;/);
  assert.match(style, /\.blobio-username-animated\s*{[\s\S]*position: absolute;/);
  assert.match(style, /\.blobio-username-animated\s*{[\s\S]*color: #dfffe6;/);
  assert.match(style, /\.blobio-username-letter\s*{[\s\S]*animation-name: blobio-username-letter-wave, blobio-username-all-glow;/);
  assert.doesNotMatch(style, /\.blobio-username-letter:last-child/);
  assert.match(style, /@keyframes blobio-username-letter-wave/);
  assert.match(style, /@keyframes blobio-username-all-glow/);

  feature.destroy();
});

test('MenuFeature splits logged-in username into staggered animated letters', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  const username = addUsername(document, 'Sky');

  const feature = new MenuFeature({ document, assets });
  feature.start();

  let animated = username.querySelector('.blobio-username-animated');
  let letters = username.querySelectorAll('.blobio-username-letter');
  assert.notEqual(animated, null);
  assert.equal(username.dataset.blobioUsernameText, 'Sky');
  assert.equal(letters.length, 3);
  assert.deepEqual(letters.map((letter) => letter.textContent), ['S', 'k', 'y']);
  assert.equal(username.textContent, 'SkySky');
  assert.equal(username.style['--blobio-username-glow-delay'], '1570ms');
  assert.equal(letters[0].style['--blobio-letter-delay'], '0ms');
  assert.equal(letters[1].style['--blobio-letter-delay'], '160ms');
  assert.equal(letters[2].style['--blobio-letter-delay'], '320ms');

  username.textContent = 'Blob';
  feature.syncUsernameAnimation();

  animated = username.querySelector('.blobio-username-animated');
  letters = username.querySelectorAll('.blobio-username-letter');
  assert.equal(username.dataset.blobioUsernameText, 'Blob');
  assert.notEqual(animated, null);
  assert.equal(letters.length, 4);
  assert.deepEqual(letters.map((letter) => letter.textContent), ['B', 'l', 'o', 'b']);
  assert.equal(username.textContent, 'BlobBlob');
  assert.equal(username.style['--blobio-username-glow-delay'], '1730ms');

  username.textContent = 'Guest';
  feature.syncUsernameAnimation();

  letters = username.querySelectorAll('.blobio-username-letter');
  assert.equal(username.dataset.blobioUsernameText, 'Guest');
  assert.equal(letters.length, 5);
  assert.deepEqual(letters.map((letter) => letter.textContent), ['G', 'u', 'e', 's', 't']);

  feature.destroy();
});

test('MenuFeature adds Extension settings with default WaterMark and Custom Imgur Skin options', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  const settings = addSettingsModal(document);
  const nameInput = addNameInput(document);
  setWatermarkRects(nameInput);
  const storage = createMemoryStorage();

  const feature = new MenuFeature({ document, assets, storage, version: '0.1.18' });
  feature.start();

  const style = document.getElementById('blobio-menu-style').textContent;
  const tab = settings.querySelector('.blobio-extension-settings-tab');
  const panel = settings.querySelector('.blobio-extension-settings-panel');
  const watermarkCheckbox = document.getElementById('config-switch-watermark');
  const customSkinCheckbox = document.getElementById('config-switch-custom-imgur-skin');
  const watermark = document.querySelector('.blobio-watermark');

  assert.notEqual(tab, null);
  assert.equal(tab.textContent, 'Extension');
  assert.notEqual(panel, null);
  assert.notEqual(watermarkCheckbox, null);
  assert.notEqual(customSkinCheckbox, null);
  assert.equal(watermarkCheckbox.checked, true);
  assert.equal(customSkinCheckbox.checked, false);
  assert.equal(panel.classList.contains('blobio-extension-settings-panel'), true);
  assert.equal(watermark.textContent, 'Blob-Extension v0.1.18');
  assert.equal(watermark.parentNode, nameInput.parentNode);
  assert.equal(watermark.parentNode.children.indexOf(watermark) > watermark.parentNode.children.indexOf(nameInput), true);
  assert.equal(watermark.parentNode.classList.contains('blobio-watermark-host'), true);
  assert.equal(watermark.style['--blobio-watermark-left'], '42px');
  assert.equal(watermark.style['--blobio-watermark-top'], '12px');
  assert.equal(watermark.style['--blobio-watermark-width'], '246px');
  assert.match(style, /\.blobio-extension-settings-tab\s*{[\s\S]*color: #dfffe6;/);
  assert.match(style, /\.blobio-extension-setting-row\s*{[\s\S]*background: rgba\(2, 18, 12, 0\.72\);/);
  assert.match(style, /\.blobio-extension-setting-row\s*{[\s\S]*border: 1px solid rgba\(142, 255, 174, 0\.34\);/);
  assert.match(style, /\.blobio-watermark\s*{[\s\S]*position: absolute;/);
  assert.match(style, /\.blobio-watermark\s*{[\s\S]*font-size: 18px;/);
  assert.match(style, /\.blobio-watermark-prefix\s*{[\s\S]*text-shadow:/);
  assert.match(style, /\.blobio-watermark-extension\s*{[\s\S]*linear-gradient\(100deg, #baffc8 0%, #ffffff 38%, #dfffe6 58%, #64ff8b 100%\)/);
  assert.match(style, /\.blobio-watermark-extension\s*{[\s\S]*background-size: 160% 100%;/);
  assert.match(style, /\.blobio-watermark-extension::after\s*{[\s\S]*animation: blobio-watermark-underline 5000ms ease-in-out infinite;/);

  tab.click();

  assert.equal(settings.classList.contains('blobio-extension-settings-active'), true);
  assert.equal(tab.classList.contains('active'), true);
  assert.match(panel.textContent, /WaterMark/);
  assert.match(panel.textContent, /Custom Imgur Skin/);

  settings.querySelector('.left li').click();

  assert.equal(settings.classList.contains('blobio-extension-settings-active'), false);
  assert.equal(tab.classList.contains('active'), false);

  feature.destroy();

  assert.equal(document.querySelector('.blobio-extension-settings-tab'), null);
  assert.equal(document.querySelector('.blobio-extension-settings-panel'), null);
  assert.equal(document.querySelector('.blobio-watermark'), null);
});

test('MenuFeature persists the WaterMark toggle and removes the badge when disabled', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  addSettingsModal(document);
  const nameInput = addNameInput(document);
  setWatermarkRects(nameInput);
  const storage = createMemoryStorage();

  const feature = new MenuFeature({ document, assets, storage, version: '0.1.18' });
  feature.start();

  const checkbox = document.getElementById('config-switch-watermark');
  assert.equal(checkbox.checked, true);
  assert.equal(document.querySelector('.blobio-watermark').textContent, 'Blob-Extension v0.1.18');

  checkbox.checked = false;
  checkbox.dispatchEvent({ type: 'change', target: checkbox });

  assert.equal(storage.getItem('blobio.watermark.enabled'), '0');
  assert.equal(document.querySelector('.blobio-watermark'), null);

  checkbox.checked = true;
  checkbox.dispatchEvent({ type: 'change', target: checkbox });

  assert.equal(storage.getItem('blobio.watermark.enabled'), '1');
  assert.equal(document.querySelector('.blobio-watermark').textContent, 'Blob-Extension v0.1.18');

  feature.syncWatermark();
  feature.syncWatermark();

  assert.equal(document.querySelectorAll('.blobio-watermark').length, 1);

  const children = Array.from(nameInput.parentNode.children);
  nameInput.parentNode.children = toHtmlCollectionLike(children);

  assert.doesNotThrow(() => feature.syncWatermark());
  nameInput.parentNode.children = children;

  feature.destroy();
});

test('MenuFeature adds a Custom Skin tab under YouTube when Custom Imgur Skin is enabled', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  const { skins, tabs, originalContainer } = addSkinModal(document);
  const storage = createMemoryStorage({ 'blobio.customSkin.enabled': '1' });

  const feature = new MenuFeature({ document, assets, storage });
  feature.start();

  const style = document.getElementById('blobio-menu-style').textContent;
  const tabItems = Array.from(tabs.children);
  const youtubeTab = tabItems.find((tab) => tab.textContent === 'YouTube');
  const customTab = skins.querySelector('.blobio-custom-skin-tab');
  const panel = skins.querySelector('.blobio-custom-skin-panel');
  const customPanelCss = style.match(/app-skins \.blobio-custom-skin-panel\s*{[^}]*}/)?.[0] || '';

  assert.notEqual(customTab, null);
  assert.notEqual(panel, null);
  assert.equal(tabs.children.indexOf(customTab), tabs.children.indexOf(youtubeTab) + 1);
  assert.equal(customTab.textContent, 'Custom Skin');
  assert.equal(panel.querySelector('input').getAttribute('placeholder'), 'Paste Skin URL here...');
  assert.equal(panel.querySelector('.blobio-custom-skin img').getAttribute('src'), 'https://i.imgur.com/OZz80VZ.jpeg');
  assert.equal(originalContainer.classList.contains('blobio-custom-skin-panel'), false);
  assert.match(style, /app-skins \.blobio-custom-skin-tab\s*{[\s\S]*color: #dfffe6;/);
  assert.match(style, /\.blobio-custom-skin-grid\s*{[\s\S]*grid-template-columns: repeat\(6, minmax\(0, 1fr\)\);/);
  assert.match(style, /\.blobio-custom-skin\.is-selected\s*{[\s\S]*box-shadow: 0 0 18px rgba\(99, 255, 142, 0\.5\)/);
  assert.match(style, /\.blobio-custom-skin\.is-selected\s*{[\s\S]*transform: translateY\(-2px\) scale\(1\.04\);/);
  assert.match(style, /\.blobio-custom-skin-actions\s*{[\s\S]*justify-content: center;/);
  assert.match(customPanelCss, /background: transparent !important;/);
  assert.doesNotMatch(customPanelCss, /rgba\(2, 18, 12, 0\.36\)/);
  assert.match(style, /\.blobio-custom-skin-actions button\s*{[\s\S]*transition: transform 150ms ease, box-shadow 150ms ease;/);
  assert.match(style, /\.blobio-custom-skin-actions button:hover\s*{[\s\S]*transform: scale\(1\.04\);/);
  assert.match(style, /\.blobio-custom-skin-action-remove\s*{[\s\S]*background: rgba\(102, 10, 16, 0\.92\)/);
  assert.match(style, /\.blobio-custom-skin-notice\.is-success\s*{[\s\S]*color: #dfffe6;/);
  assert.match(style, /\.blobio-custom-skin-notice\.is-error\s*{[\s\S]*color: #ffaaa8;/);

  customTab.click();

  assert.equal(skins.classList.contains('blobio-custom-skin-active'), true);
  assert.equal(customTab.classList.contains('active'), true);

  tabs.children[0].click();

  assert.equal(skins.classList.contains('blobio-custom-skin-active'), false);
  assert.equal(customTab.classList.contains('active'), false);

  feature.destroy();
});

test('MenuFeature accepts only direct Imgur images and can use or remove a custom skin', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  addNameInput(document);
  addChooseSkinButton(document);
  const { skins } = addSkinModal(document);
  const storage = createMemoryStorage({
    'blobio.customSkin.enabled': '1',
    'config-skin': 'alien_',
    'config-skin-type': 'free',
  });

  const feature = new MenuFeature({ document, assets, storage });
  feature.start();

  skins.querySelector('.blobio-custom-skin-tab').click();
  const panel = skins.querySelector('.blobio-custom-skin-panel');
  const input = panel.querySelector('input');

  input.value = 'https://imgur.com/gallery/not-direct';
  input.dispatchEvent({ type: 'change', target: input });

  assert.match(panel.textContent, /Only direct i\.imgur\.com image links are accepted/);
  assert.equal(panel.querySelectorAll('.blobio-custom-skin').length, 1);

  const customUrl = 'https://i.imgur.com/AbCd123.png';
  input.value = customUrl;
  input.dispatchEvent({
    type: 'keydown',
    key: 'Enter',
    target: input,
    preventDefault() {},
  });

  const storedGallery = JSON.parse(storage.getItem('blobio.customSkin.gallery'));
  const cards = panel.querySelectorAll('.blobio-custom-skin');
  const customCard = cards.find((card) => card.querySelector('img').getAttribute('src') === customUrl);

  assert.deepEqual(storedGallery, ['https://i.imgur.com/OZz80VZ.jpeg', customUrl]);
  assert.notEqual(customCard, undefined);
  assert.equal(input.value, '');

  customCard.click();

  const actions = panel.querySelector('.blobio-custom-skin-actions');
  const actionButtons = actions.querySelectorAll('button');
  const useButton = actionButtons.find((button) => button.textContent === 'Use');
  const removeButton = actionButtons.find((button) => button.textContent === 'Remove');

  assert.equal(customCard.classList.contains('is-selected'), true);
  assert.equal(actions.classList.contains('is-visible'), true);
  assert.equal(useButton.classList.contains('blobio-custom-skin-action-use'), true);
  assert.equal(removeButton.classList.contains('blobio-custom-skin-action-remove'), true);

  useButton.click();

  const localSkinName = storage.getItem('blobio.customSkin.localName');
  let notice = skins.querySelector('.blobio-custom-skin-notice');

  assert.equal(storage.getItem('blobio.customSkin.activeUrl'), customUrl);
  assert.match(localSkinName, /^BlobioCustomSkin_[a-z0-9]{8,}$/i);
  assert.equal(storage.getItem('config-skin'), localSkinName);
  assert.equal(storage.getItem('config-skin-type'), 'free');
  assert.equal(JSON.parse(storage.getItem('blobio.customSkin.previousSkin')).name, 'alien_');
  assert.equal(document.querySelector('.choose-skin-btn img').getAttribute('src'), customUrl);
  assert.notEqual(notice, null);
  assert.equal(notice.parentNode, skins.querySelector('.label'));
  assert.equal(notice.textContent, 'Skin is now applied');
  assert.equal(notice.classList.contains('is-success'), true);

  removeButton.click();
  notice = skins.querySelector('.blobio-custom-skin-notice');

  assert.equal(storage.getItem('blobio.customSkin.activeUrl'), null);
  assert.equal(storage.getItem('config-skin'), 'alien_');
  assert.equal(storage.getItem('config-skin-type'), 'free');
  assert.deepEqual(JSON.parse(storage.getItem('blobio.customSkin.gallery')), ['https://i.imgur.com/OZz80VZ.jpeg']);
  assert.equal(panel.querySelectorAll('.blobio-custom-skin').length, 1);
  assert.notEqual(notice, null);
  assert.equal(notice.textContent, 'Skin was removed');
  assert.equal(notice.classList.contains('is-error'), true);

  feature.destroy();
});

test('MenuFeature resolves the fake local custom skin path to the active Imgur skin', () => {
  const document = createFakeDocument();
  const storage = createMemoryStorage({
    'blobio.customSkin.enabled': '1',
    'blobio.customSkin.activeUrl': 'https://i.imgur.com/OZz80VZ.jpeg',
    'blobio.customSkin.localName': 'BlobioCustomSkin_testuser',
  });
  const feature = new MenuFeature({ document, storage });

  assert.equal(
    feature.resolveCustomSkinImageUrl('https://client.blobgame.io/skins/free/BlobioCustomSkin_testuser.png'),
    'https://i.imgur.com/OZz80VZ.jpeg',
  );
  assert.equal(
    feature.resolveCustomSkinImageUrl('/skins/free/BlobioCustomSkin_testuser.png'),
    'https://i.imgur.com/OZz80VZ.jpeg',
  );
  assert.equal(
    feature.resolveCustomSkinImageUrl('https://client.blobgame.io/skins/free/BlobioCustomSkin_someoneelse.png'),
    'https://client.blobgame.io/skins/free/BlobioCustomSkin_someoneelse.png',
  );
  assert.equal(
    feature.resolveCustomSkinImageUrl('https://client.blobgame.io/skins/free/alien_.png'),
    'https://client.blobgame.io/skins/free/alien_.png',
  );

  storage.setItem('blobio.customSkin.enabled', '0');

  assert.equal(
    feature.resolveCustomSkinImageUrl('https://client.blobgame.io/skins/free/BlobioCustomSkin_testuser.png'),
    'https://client.blobgame.io/skins/free/BlobioCustomSkin_testuser.png',
  );
});

test('MenuFeature runtime hook rewrites only local custom skin XHR requests', () => {
  const document = createFakeDocument();
  const storage = createMemoryStorage({
    'blobio.customSkin.enabled': '1',
    'blobio.customSkin.activeUrl': 'https://i.imgur.com/OZz80VZ.jpeg',
    'blobio.customSkin.localName': 'BlobioCustomSkin_testuser',
  });

  function FakeImage() {}
  Object.defineProperty(FakeImage.prototype, 'src', {
    configurable: true,
    get() {
      return this.currentSrc || '';
    },
    set(value) {
      this.currentSrc = value;
    },
  });
  FakeImage.prototype.setAttribute = function setAttribute(name, value) {
    this[name] = value;
  };

  function FakeElement() {}
  FakeElement.prototype.setAttribute = function setAttribute(name, value) {
    this[name] = value;
  };

  function FakeXMLHttpRequest() {}
  FakeXMLHttpRequest.prototype.open = function open(method, url, async, user, password) {
    this.openArgs = [method, url, async, user, password];
  };

  document.defaultView = {
    HTMLImageElement: FakeImage,
    Element: FakeElement,
    XMLHttpRequest: FakeXMLHttpRequest,
    location: { href: 'http://custom.client.blobgame.io/' },
  };

  const feature = new MenuFeature({ document, assets, storage, frontPageUi: false });
  feature.start();

  const matching = new document.defaultView.XMLHttpRequest();
  matching.open('GET', '/skins/free/BlobioCustomSkin_testuser.png', true);
  const otherUser = new document.defaultView.XMLHttpRequest();
  otherUser.open('GET', '/skins/free/BlobioCustomSkin_otheruser.png', true);

  assert.equal(document.querySelector('.blobio-menu-toolbar'), null);
  assert.equal(document.getElementById('blobio-menu-style'), null);
  assert.equal(document.documentElement.classList.contains('blobio-menu-enabled'), false);
  assert.equal(matching.openArgs[1], 'https://i.imgur.com/OZz80VZ.jpeg');
  assert.equal(otherUser.openArgs[1], '/skins/free/BlobioCustomSkin_otheruser.png');
});

test('MenuFeature restores the previous skin when Custom Imgur Skin is disabled', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  const storage = createMemoryStorage({
    'blobio.customSkin.enabled': '1',
    'blobio.customSkin.activeUrl': 'https://i.imgur.com/OZz80VZ.jpeg',
    'blobio.customSkin.localName': 'BlobioCustomSkin_testuser',
    'blobio.customSkin.previousSkin': JSON.stringify({ name: 'alien_', type: 'free' }),
    'config-skin': 'BlobioCustomSkin_testuser',
    'config-skin-type': 'free',
  });
  const feature = new MenuFeature({ document, storage });

  feature.setCustomSkinEnabled(false);

  assert.equal(storage.getItem('blobio.customSkin.enabled'), '0');
  assert.equal(storage.getItem('blobio.customSkin.activeUrl'), null);
  assert.equal(storage.getItem('config-skin'), 'alien_');
  assert.equal(storage.getItem('config-skin-type'), 'free');
});

test('MenuFeature ignores mutations from extension-owned watermark and settings nodes', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  const settings = addSettingsModal(document);
  const nameInput = addNameInput(document);
  setWatermarkRects(nameInput);
  const storage = createMemoryStorage({ 'blobio.watermark.enabled': '1' });

  const feature = new MenuFeature({ document, assets, storage, version: '0.1.18' });
  feature.start();

  const watermark = document.querySelector('.blobio-watermark');
  const tab = settings.querySelector('.blobio-extension-settings-tab');
  const panel = settings.querySelector('.blobio-extension-settings-panel');
  const unrelated = document.createElement('div');

  assert.equal(feature.isOwnMutation({ target: nameInput.parentNode, addedNodes: [watermark], removedNodes: [] }), true);
  assert.equal(feature.isOwnMutation({ target: settings, addedNodes: [tab, panel], removedNodes: [] }), true);
  assert.equal(feature.isOwnMutation({ target: document.body, addedNodes: [unrelated], removedNodes: [] }), false);

  feature.destroy();
});

test('MenuFeature ignores consent-manager vendor policy links', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  addOriginalPolicyLinks(document);
  addConsentManagerPolicyLinks(document);

  const feature = new MenuFeature({ document, assets });
  feature.start();

  const policyDock = document.querySelector('.blobio-policy-dock');
  policyDock.querySelector('button').click();

  const foldedLinks = document.getElementById('blobio-panel-policy-games').querySelectorAll('a[href]');
  assert.equal(foldedLinks.length, 2);
  assert.equal(foldedLinks[0].getAttribute('href'), 'https://blob-devour.blogspot.com/2017/08/privacy-policy-this-policy-will-explain.html');
  assert.equal(foldedLinks[1].getAttribute('href'), 'https://blob-terms-and-conditions.blogspot.com/2018/12/blob-io-terms-and-conditions.html');

  feature.destroy();
});
