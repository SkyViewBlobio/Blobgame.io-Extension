import { HOTKEY_TEXT_LIMIT } from '../../hotkeys/HotkeyStore.js';
import {
  ANIMATION_SPEED_LIMITS,
  CHAT_FONT_SIZE_LIMITS,
} from '../../settings/RuntimeSettings.js';
import { HUD_INFO_FONT_LIMITS } from '../../settings/HudInfoSettings.js';
import { UI_FONT_SIZE_LIMITS } from '../../settings/InGameUiSettings.js';

export function createCategoryButton(document, label, category) {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('blobio-chat-settings-category-button');
  button.dataset.category = category;
  button.setAttribute('aria-expanded', 'false');

  const text = document.createElement('span');
  text.textContent = label;
  button.appendChild(text);
  return button;
}

export function createChatCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-chat-appearance-category');
  category.dataset.category = 'chat';

  category.append(
    createFontSetting(document, 'chat', 'Font-Size', CHAT_FONT_SIZE_LIMITS),
    createColorSetting(document, 'chat-background', 'Chat-BG-Color'),
    createColorSetting(document, 'chat-outline', 'Chat-outline-Color'),
    createBooleanSetting(document, 'smooth-chat', 'Smooth-Chat'),
  );
  return category;
}

export function createCaptchaCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-captcha-category');
  category.dataset.category = 'captcha';
  category.appendChild(createBooleanSetting(document, 'captcha-logo', 'Hide Captcha-Logo'));
  return category;
}

export function createLeaderboardCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-leaderboard-category');
  category.dataset.category = 'leaderboard';
  category.append(
    createFontSetting(document, 'leaderboard', 'Font-Size', UI_FONT_SIZE_LIMITS),
    createColorSetting(document, 'leaderboard-background', 'Leaderboard-BG-Color'),
    createColorSetting(document, 'leaderboard-outline', 'Leaderboard-outline-Color'),
  );
  return category;
}

export function createMutedPlayersCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-muted-players-category');
  category.dataset.category = 'muted';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('blobio-chat-font-toggle', 'blobio-muted-players-toggle');

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label', 'blobio-muted-players-label');
  label.textContent = 'Ability to mute players with ID';

  const list = document.createElement('div');
  list.classList.add('blobio-muted-players-list');

  const empty = document.createElement('div');
  empty.classList.add('blobio-muted-players-empty');
  empty.textContent = 'No muted player UIDs.';
  list.appendChild(empty);

  const actions = document.createElement('div');
  actions.classList.add('blobio-muted-players-actions');

  const addName = document.createElement('button');
  addName.type = 'button';
  addName.classList.add('blobio-muted-player-action', 'blobio-muted-player-add-name');
  addName.textContent = 'Add name';

  const unmute = document.createElement('button');
  unmute.type = 'button';
  unmute.classList.add('blobio-muted-player-action', 'blobio-muted-player-unmute');
  unmute.textContent = 'Unmute';

  actions.append(addName, unmute);
  category.append(toggle, label, list, actions);
  return category;
}

export function createHotkeyCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-hotkey-category');
  category.dataset.category = 'hotkey';

  const input = document.createElement('input');
  input.type = 'text';
  input.classList.add('blobio-hotkey-text-input');
  input.maxLength = HOTKEY_TEXT_LIMIT;
  input.placeholder = 'Write command here...';
  input.setAttribute('aria-label', 'Hotkey command or message');

  const list = document.createElement('div');
  list.classList.add('blobio-hotkey-list');

  const apply = document.createElement('button');
  apply.type = 'button';
  apply.classList.add('blobio-hotkey-action', 'blobio-hotkey-apply');
  apply.textContent = 'Apply HK text';

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.classList.add('blobio-hotkey-action', 'blobio-hotkey-remove');
  remove.textContent = 'Remove';

  category.append(input, list, apply, remove);
  return category;
}

export function createAnimationSpeedCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-animation-speed-category');
  category.dataset.category = 'animation';

  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-animation-speed-setting');
  group.dataset.setting = 'animation-speed';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('blobio-chat-font-toggle', 'blobio-setting-toggle');

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = 'Animation Speed';

  const controls = document.createElement('div');
  controls.classList.add('blobio-animation-speed-controls');

  const modeButton = document.createElement('button');
  modeButton.type = 'button';
  modeButton.classList.add('blobio-animation-speed-mode');
  modeButton.setAttribute('aria-label', 'Animation speed mode');

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.classList.add('blobio-animation-speed-range', 'blobio-themed-range');
  slider.min = String(ANIMATION_SPEED_LIMITS.min);
  slider.max = String(ANIMATION_SPEED_LIMITS.max);
  slider.step = '1';
  slider.setAttribute('aria-label', 'Animation speed');

  const value = document.createElement('span');
  value.classList.add('blobio-animation-speed-value');

  const rangeLabel = document.createElement('span');
  rangeLabel.classList.add('blobio-animation-speed-range-label');
  rangeLabel.textContent = '0.1x - 18.0x';

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.classList.add('blobio-animation-speed-reset');
  reset.textContent = 'Reset to default';

  controls.append(modeButton, slider, value, rangeLabel, reset);
  group.append(toggle, label, controls);
  category.appendChild(group);
  return category;
}

export function createHudInfoCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-hud-info-category');
  category.dataset.category = 'hud-info';

  category.append(
    createBooleanSetting(document, 'hud-info-enabled', 'HUD-text on screen'),
    createBooleanSetting(document, 'hud-info-fps', 'FPS'),
    createBooleanSetting(document, 'hud-info-score', 'Score'),
    createBooleanSetting(document, 'hud-info-cells', 'Cells'),
    createBooleanSetting(document, 'hud-info-ping', 'Ping'),
    createBooleanSetting(document, 'hud-info-boosters', 'Booster-Info'),
    createHudModeSetting(document, 'hud-position', 'Position'),
    createHudModeSetting(document, 'hud-layout', 'Layout'),
    createHudModeSetting(document, 'hud-style', 'Style'),
    createHudModeSetting(document, 'hud-fps-mode', 'FPS mode'),
    createHudModeSetting(document, 'hud-score-mode', 'Score mode'),
    createHudModeSetting(document, 'hud-ping-mode', 'Ping mode'),
    createHudModeSetting(document, 'hud-booster-name-mode', 'Booster type color'),
    createHudModeSetting(document, 'hud-booster-duration-mode', 'Booster duration color'),
    createBooleanSetting(document, 'hud-booster-last-sec-flash', 'Last-Sec-Flash'),
    createHudSizeSetting(document),
    createHudColorSetting(document),
  );
  return category;
}

export function createFontSetting(document, name, labelText, limits) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-ui-font-setting');
  group.dataset.setting = name;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('blobio-chat-font-toggle', 'blobio-setting-toggle');

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = labelText;

  const controls = document.createElement('div');
  controls.classList.add('blobio-chat-font-controls');

  const range = document.createElement('input');
  range.type = 'range';
  range.classList.add('blobio-chat-font-range', 'blobio-themed-range');
  range.min = String(limits.min);
  range.max = String(limits.max);
  range.step = '1';

  const number = document.createElement('input');
  number.type = 'number';
  number.classList.add('blobio-chat-font-number');
  number.min = String(limits.min);
  number.max = String(limits.max);
  number.step = '1';
  number.setAttribute('aria-label', `${labelText} ${name}`);

  controls.append(range, number);
  group.append(toggle, label, controls);
  return group;
}

export function createBooleanSetting(document, name, labelText) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-ui-boolean-setting');
  group.dataset.setting = name;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('blobio-chat-font-toggle', 'blobio-setting-toggle');

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = labelText;

  group.append(toggle, label);
  return group;
}

export function createColorSetting(document, name, labelText) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-ui-color-setting');
  group.dataset.setting = name;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('blobio-chat-font-toggle', 'blobio-setting-toggle');

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = labelText;

  const controls = document.createElement('div');
  controls.classList.add('blobio-ui-color-controls');

  const wheel = document.createElement('label');
  wheel.classList.add('blobio-ui-color-wheel');
  const swatch = document.createElement('span');
  swatch.classList.add('blobio-ui-color-swatch');
  const color = document.createElement('input');
  color.type = 'color';
  color.classList.add('blobio-ui-color-input');
  color.setAttribute('aria-label', labelText);
  wheel.append(swatch, color);

  const alpha = document.createElement('input');
  alpha.type = 'range';
  alpha.min = '0';
  alpha.max = '1';
  alpha.step = '0.01';
  alpha.classList.add('blobio-ui-alpha-range', 'blobio-themed-range');
  alpha.setAttribute('aria-label', `${labelText} alpha`);

  const alphaValue = document.createElement('span');
  alphaValue.classList.add('blobio-ui-alpha-value');

  controls.append(wheel, alpha, alphaValue);
  group.append(toggle, label, controls);
  return group;
}

export function createHudModeSetting(document, name, labelText) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-hud-mode-setting');
  group.dataset.setting = name;

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = labelText;

  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('blobio-hud-mode-button');
  button.setAttribute('aria-label', labelText);

  group.append(label, button);
  return group;
}

export function createHudSizeSetting(document) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-hud-size-setting');
  group.dataset.setting = 'hud-font-size';

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = 'HUD Font-Size';

  const controls = document.createElement('div');
  controls.classList.add('blobio-chat-font-controls');

  const range = document.createElement('input');
  range.type = 'range';
  range.classList.add('blobio-chat-font-range', 'blobio-themed-range');
  range.min = String(HUD_INFO_FONT_LIMITS.min);
  range.max = String(HUD_INFO_FONT_LIMITS.max);
  range.step = '1';

  const number = document.createElement('input');
  number.type = 'number';
  number.classList.add('blobio-chat-font-number');
  number.min = String(HUD_INFO_FONT_LIMITS.min);
  number.max = String(HUD_INFO_FONT_LIMITS.max);
  number.step = '1';
  number.setAttribute('aria-label', 'HUD font size');

  controls.append(range, number);
  group.append(label, controls);
  return group;
}

export function createHudColorSetting(document) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-hud-color-setting');
  group.dataset.setting = 'hud-color';

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = 'HUD Text-Color';

  const controls = document.createElement('div');
  controls.classList.add('blobio-ui-color-controls');

  const wheel = document.createElement('label');
  wheel.classList.add('blobio-ui-color-wheel');
  const swatch = document.createElement('span');
  swatch.classList.add('blobio-ui-color-swatch');
  const color = document.createElement('input');
  color.type = 'color';
  color.classList.add('blobio-ui-color-input');
  color.setAttribute('aria-label', 'HUD text color');
  wheel.append(swatch, color);

  const alpha = document.createElement('input');
  alpha.type = 'range';
  alpha.min = '0';
  alpha.max = '1';
  alpha.step = '0.01';
  alpha.classList.add('blobio-ui-alpha-range', 'blobio-themed-range');
  alpha.setAttribute('aria-label', 'HUD text alpha');

  const alphaValue = document.createElement('span');
  alphaValue.classList.add('blobio-ui-alpha-value');

  controls.append(wheel, alpha, alphaValue);
  group.append(label, controls);
  return group;
}
