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
}

test('MenuFeature injects toolbar buttons next to the Replay button and hides original socials', () => {
  const document = createFakeDocument();
  const { controls, replayButton } = addReplayButton(document);
  addOriginalSocialLinks(document);

  const feature = new MenuFeature({ document, assets });

  assert.equal(feature.start(), true);

  const style = document.getElementById('blobio-menu-style');
  assert.notEqual(style, null);
  assert.match(style.textContent, /\.social\s*\{/);

  const toolbar = document.querySelector('.blobio-menu-toolbar');
  assert.notEqual(toolbar, null);
  assert.equal(toolbar.parentNode, controls);
  assert.equal(controls.children.indexOf(toolbar), controls.children.indexOf(replayButton) + 1);
  assert.equal(toolbar.querySelector('.blobio-menu-buttons').querySelectorAll('button').length, 3);
  assert.match(toolbar.textContent, /Featured/);
  assert.match(toolbar.textContent, /Updates/);
  assert.match(toolbar.textContent, /Socials/);

  feature.destroy();

  assert.equal(document.getElementById('blobio-menu-style'), null);
  assert.equal(document.querySelector('.blobio-menu-toolbar'), null);
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
  assert.equal(links.length, 4);
  assert.equal(links[0].getAttribute('href'), 'https://youtube.com/@blobio');
  assert.equal(links[1].getAttribute('href'), 'https://disc.blobgame.io/');
  assert.equal(links[2].getAttribute('href'), 'https://facebook.com/blobio');
  assert.equal(links[3].getAttribute('href'), 'https://instagram.com/blob.io_official');
  assert.equal(links[0].querySelector('img').getAttribute('src'), assets.youtubeIcon);

  feature.destroy();
});
