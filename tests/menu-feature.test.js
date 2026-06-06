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

function addReplayButton(document) {
  const controls = document.createElement('div');
  controls.classList.add('menu-actions');

  const replayButton = document.createElement('button');
  replayButton.textContent = 'Replay';

  controls.appendChild(replayButton);
  document.body.appendChild(controls);

  return { controls, replayButton };
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
  assert.equal(buttons[0].style.width, '50px');
  assert.equal(buttons[0].style.height, '50px');
  assert.equal(buttons[0].style.backgroundSize, 'cover');
  assert.equal(buttons[0].style.backgroundRepeat, 'repeat');
  assert.equal(buttons[0].style.backgroundPosition, '0% 0%');
  assert.equal(buttons[0].style.display, 'inline-block');
  assert.equal(buttons[0].style.padding, '1px 6px');
  assert.equal(buttons[0].style.border, '0px none');
  assert.equal(buttons[0].style.backgroundColor, 'transparent');
  assert.match(style.textContent, /\.blobio-menu-buttons\s*{[\s\S]*display: inline-block;/);
  assert.match(style.textContent, /\.blobio-menu-button\s*{[\s\S]*display: inline-block !important;/);
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

test('MenuFeature folds original policy links into a bottom policy menu', () => {
  const document = createFakeDocument();
  addReplayButton(document);
  addOriginalPolicyLinks(document);
  const partnerLinks = addPartnerLinks(document);

  const feature = new MenuFeature({ document, assets });
  feature.start();

  const style = document.getElementById('blobio-menu-style');
  const originalLinks = document.querySelectorAll('.policy a[href]');
  const policyDock = document.querySelector('.blobio-policy-dock');
  const policyPanel = document.getElementById('blobio-panel-policy');

  assert.equal(originalLinks.length, 2);
  assert.equal(originalLinks[0].classList.contains('blobio-original-hidden'), true);
  assert.equal(partnerLinks.classList.contains('blobio-original-hidden'), true);
  assert.notEqual(policyDock, null);
  assert.equal(policyPanel.classList.contains('is-open'), false);
  assert.equal(policyPanel.querySelectorAll('a[href]').length, 0);
  assert.match(style.textContent, /\.blobio-policy-dock\s*{[\s\S]*left: 50%;/);
  assert.match(style.textContent, /\.blobio-policy-dock\s*{[\s\S]*bottom: 26px;/);
  assert.match(style.textContent, /\.blobio-policy-dock\s*{[\s\S]*transform: translateX\(-50%\);/);

  policyDock.querySelector('button').click();

  const foldedLinks = policyPanel.querySelectorAll('a[href]');
  assert.equal(policyPanel.classList.contains('is-open'), true);
  assert.equal(foldedLinks.length, 7);
  assert.equal(foldedLinks[0].getAttribute('href'), originalLinks[0].getAttribute('href'));
  assert.equal(foldedLinks[2].getAttribute('href'), 'https://iogames.space');
  assert.match(policyPanel.textContent, /Privacy Policy/);
  assert.match(policyPanel.textContent, /Terms and Conditions/);
  assert.match(policyPanel.textContent, /io-games\.space/);
  assert.match(policyPanel.textContent, /crazygames\.com/);

  document.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.equal(policyPanel.classList.contains('is-open'), false);

  feature.destroy();

  assert.equal(document.querySelector('.blobio-policy-dock'), null);
  assert.equal(originalLinks[0].classList.contains('blobio-original-hidden'), false);
  assert.equal(partnerLinks.classList.contains('blobio-original-hidden'), false);
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

  const foldedLinks = document.getElementById('blobio-panel-policy').querySelectorAll('a[href]');
  assert.equal(foldedLinks.length, 2);
  assert.equal(foldedLinks[0].getAttribute('href'), 'https://blob-devour.blogspot.com/2017/08/privacy-policy-this-policy-will-explain.html');
  assert.equal(foldedLinks[1].getAttribute('href'), 'https://blob-terms-and-conditions.blogspot.com/2018/12/blob-io-terms-and-conditions.html');

  feature.destroy();
});
