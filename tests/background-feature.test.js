import assert from 'node:assert/strict';
import test from 'node:test';

import { BackgroundFeature } from '../src/features/BackgroundFeature.js';
import { createFakeDocument } from './helpers/fake-dom.js';

test('BackgroundFeature injects background CSS and applies page classes', () => {
  const document = createFakeDocument();
  const feature = new BackgroundFeature({
    document,
    backgroundUrl: 'data:image/png;base64,test-image',
  });

  assert.equal(feature.start(), true);

  const style = document.getElementById('blobio-background-style');
  assert.notEqual(style, null);
  assert.match(style.textContent, /data:image\/png;base64,test-image/);
  assert.equal(document.documentElement.classList.contains('blobio-background-enabled'), true);
  assert.equal(document.body.classList.contains('blobio-background-enabled'), true);

  feature.destroy();

  assert.equal(document.getElementById('blobio-background-style'), null);
  assert.equal(document.documentElement.classList.contains('blobio-background-enabled'), false);
  assert.equal(document.body.classList.contains('blobio-background-enabled'), false);
});

test('BackgroundFeature does not create duplicate styles when started twice', () => {
  const document = createFakeDocument();
  const feature = new BackgroundFeature({
    document,
    backgroundUrl: 'data:image/png;base64,test-image',
  });

  feature.start();
  feature.start();

  assert.equal(document.querySelectorAll('#blobio-background-style').length, 1);

  feature.destroy();
});

test('BackgroundFeature targets the Blobgame wrapper background image', () => {
  const document = createFakeDocument();
  const feature = new BackgroundFeature({
    document,
    backgroundUrl: 'data:image/png;base64,test-image',
  });

  feature.start();

  const style = document.getElementById('blobio-background-style');
  const wrapperBackgroundRule = new RegExp(
    String.raw`\.wrapper[\s\S]*background-image: url\("data:image/png;base64,test-image"\) !important`,
  );
  assert.match(style.textContent, wrapperBackgroundRule);

  feature.destroy();
});

test('BackgroundFeature adds a faint green frame glow around the page background', () => {
  const document = createFakeDocument();
  const feature = new BackgroundFeature({
    document,
    backgroundUrl: 'data:image/png;base64,test-image',
  });

  feature.start();

  const style = document.getElementById('blobio-background-style');
  assert.match(style.textContent, /border: 1px solid rgba\(142, 255, 174, 0\.42\)/);
  assert.match(style.textContent, /box-shadow: inset 0 0 22px rgba\(76, 255, 128, 0\.34\)/);

  feature.destroy();
});
