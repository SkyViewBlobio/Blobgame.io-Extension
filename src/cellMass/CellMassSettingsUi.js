import {
  CELL_MASS_MODE_PRESETS,
  readCellMassSettings,
  saveCellMassSettings,
} from './CellMassSettings.js';

const DESCRIPTION = 'FPS-Impact: Low[1-10]\nShows mass numbers on your cells.';
const MODE_ORDER = ['normal', 'vip', 'custom'];
const MODE_LABELS = {
  normal: 'Normal',
  vip: 'VIP/YT',
  custom: 'Custom',
};

const CHECKBOXES = [
  { key: 'compact', label: 'Compact numbers' },
  { key: 'smartRendering', label: 'Smart-Rendering' },
  { key: 'emphasizeBiggest', label: 'Emphasize biggest cells' },
];

const SLIDERS = [
  { key: 'textScale', label: 'Text-Scale', min: 0.35, max: 1.4, step: 0.01 },
  { key: 'yOffset', label: 'Y-Offset', min: -120, max: 120, step: 1 },
  { key: 'nameGap', label: 'Name-Gap', min: 0.1, max: 3, step: 0.1 },
];

export class CellMassSettingsUi {
  constructor({
    document,
    storage,
    showTooltip = null,
    moveTooltip = null,
    hideTooltip = null,
    onOpen = null,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.showTooltip = showTooltip;
    this.moveTooltip = moveTooltip;
    this.hideTooltip = hideTooltip;
    this.onOpen = onOpen;
    this.settings = readCellMassSettings(storage, document);
    this.listeners = [];
    this.elements = null;
  }

  create() {
    this.settings = readCellMassSettings(this.storage, this.document);

    const group = this.document.createElement('div');
    group.classList.add('blobio-cell-mass-setting-group');
    group.setAttribute('_ngcontent-c3', '');

    const row = this.createHeaderRow();
    const menu = this.createDropdownMenu();
    group.append(row, menu);

    this.elements = {
      group,
      row,
      menu,
      enabled: row.querySelector('#config-switch-cell-mass'),
      arrowButton: row.querySelector('.blobio-cell-mass-dropdown-button'),
      disclosure: row.querySelector('.blobio-cell-mass-dropdown-symbol'),
      modeButton: menu.querySelector('.blobio-cell-mass-preset-mode-button'),
      checkboxes: Array.from(menu.querySelectorAll('.blobio-cell-mass-checkbox-input') || []),
      sliders: Array.from(menu.querySelectorAll('.blobio-cell-mass-slider-input') || []),
      sliderValues: Array.from(menu.querySelectorAll('.blobio-cell-mass-slider-value') || []),
    };

    this.sync();
    return group;
  }

  destroy() {
    for (const [node, type, listener, options] of this.listeners) {
      node.removeEventListener?.(type, listener, options);
    }
    this.listeners = [];
    this.elements?.group?.remove?.();
    this.elements = null;
  }

  createHeaderRow() {
    const row = this.document.createElement('div');
    row.classList.add('grid-item', 'blobio-extension-setting-row', 'blobio-cell-mass-setting-row');
    row.dataset.blobioTooltip = DESCRIPTION;
    row.setAttribute('_ngcontent-c3', '');

    const switchLabel = this.document.createElement('label');
    switchLabel.classList.add('switch');
    switchLabel.setAttribute('_ngcontent-c3', '');

    const checkbox = this.document.createElement('input');
    checkbox.id = 'config-switch-cell-mass';
    checkbox.type = 'checkbox';
    checkbox.classList.add('ng-untouched', 'ng-pristine', 'ng-valid');
    checkbox.setAttribute('_ngcontent-c3', '');

    const slider = this.document.createElement('span');
    slider.classList.add('slider');
    slider.setAttribute('_ngcontent-c3', '');
    switchLabel.append(checkbox, slider);

    const textLabel = this.document.createElement('label');
    textLabel.setAttribute('for', checkbox.id);
    textLabel.setAttribute('_ngcontent-c3', '');
    textLabel.textContent = 'Show mass';

    const arrowButton = this.document.createElement('button');
    arrowButton.type = 'button';
    arrowButton.classList.add('blobio-cell-mass-dropdown-button');
    arrowButton.setAttribute('aria-label', 'Open Show mass settings');
    arrowButton.setAttribute('aria-expanded', 'false');
    arrowButton.setAttribute('_ngcontent-c3', '');

    const disclosure = this.document.createElement('span');
    disclosure.classList.add('blobio-cell-mass-dropdown-symbol');
    disclosure.setAttribute('aria-hidden', 'true');
    disclosure.textContent = '+';
    arrowButton.appendChild(disclosure);

    row.append(switchLabel, textLabel, arrowButton);
    this.installTooltip(row, DESCRIPTION);

    this.listen(checkbox, 'change', () => {
      this.settings = this.save({ enabled: Boolean(checkbox.checked) });
      this.sync();
    });

    this.listen(arrowButton, 'click', (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      const open = this.elements?.menu?.hidden !== false;
      if (open) {
        this.onOpen?.(this);
      }
      this.setOpen(open);
    });

    return row;
  }

  createDropdownMenu() {
    const menu = this.document.createElement('div');
    menu.classList.add('blobio-cell-mass-button-menu');
    menu.hidden = true;
    menu.setAttribute('_ngcontent-c3', '');

    menu.append(
      this.createSectionTitle('Show mass settings'),
      ...CHECKBOXES.map((option) => this.createCheckboxRow(option)),
      this.createSectionTitle('Offset/Scale'),
      this.createModeRow(),
      ...SLIDERS.map((slider) => this.createSliderRow(slider)),
      this.createSectionTitle('Update'),
      this.createUpdateDelayRow(),
    );

    return menu;
  }

  createSectionTitle(text) {
    const title = this.document.createElement('div');
    title.classList.add('blobio-cell-mass-section-title');
    title.textContent = text;
    return title;
  }

  createCheckboxRow({ key, label }) {
    const row = this.document.createElement('label');
    row.classList.add('blobio-cell-mass-checkbox-row');

    const input = this.document.createElement('input');
    input.type = 'checkbox';
    input.classList.add('blobio-cell-mass-checkbox-input');
    input.dataset.cellMassCheckbox = key;

    const text = this.document.createElement('span');
    text.textContent = label;

    row.append(input, text);
    this.listen(input, 'change', () => {
      this.settings = this.save({ [key]: Boolean(input.checked) });
      this.sync();
    });
    return row;
  }

  createModeRow() {
    const row = this.document.createElement('div');
    row.classList.add('blobio-cell-mass-mode-row');

    const label = this.document.createElement('span');
    label.textContent = 'Mode';

    const button = this.document.createElement('button');
    button.type = 'button';
    button.classList.add('blobio-cell-mass-preset-mode-button');
    button.setAttribute('aria-label', 'Show mass offset and scale mode');

    for (const mode of MODE_ORDER) {
      const text = this.document.createElement('span');
      text.classList.add('blobio-cell-mass-preset-mode-text', `is-${mode}`);
      text.textContent = MODE_LABELS[mode];
      button.appendChild(text);
    }

    row.append(label, button);
    this.listen(button, 'click', (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      const nextMode = MODE_ORDER[(MODE_ORDER.indexOf(this.settings.mode) + 1) % MODE_ORDER.length];
      this.settings = this.save({
        mode: nextMode,
        ...CELL_MASS_MODE_PRESETS[nextMode],
      });
      this.sync();
    });

    return row;
  }

  createSliderRow({ key, label, min, max, step }) {
    const row = this.document.createElement('label');
    row.classList.add('blobio-cell-mass-slider-row');

    const text = this.document.createElement('span');
    text.textContent = label;

    const input = this.document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.classList.add('blobio-cell-mass-slider-input');
    input.dataset.cellMassSlider = key;

    const value = this.document.createElement('span');
    value.classList.add('blobio-cell-mass-slider-value');
    value.dataset.cellMassSlider = key;

    row.append(text, input, value);
    this.listen(input, 'input', () => {
      this.settings = this.save({ [key]: Number(input.value) });
      this.sync();
    });
    return row;
  }

  createUpdateDelayRow() {
    return this.createSliderRow({
      key: 'updateDelayMs',
      label: 'Update-delay',
      min: 0,
      max: 10000,
      step: 100,
    });
  }

  installTooltip(node, text) {
    if (!node || !text) {
      return;
    }
    node.dataset.blobioTooltip = text;
    node.removeAttribute?.('title');
    if (typeof this.showTooltip !== 'function') {
      return;
    }
    this.listen(node, 'mouseenter', (event) => this.showTooltip(node, event));
    this.listen(node, 'mousemove', (event) => this.moveTooltip?.(event));
    this.listen(node, 'mouseleave', () => this.hideTooltip?.());
  }

  save(changes) {
    return saveCellMassSettings(this.storage, {
      ...this.settings,
      ...changes,
    }, this.document);
  }

  setOpen(open) {
    if (!this.elements) {
      return;
    }

    this.elements.menu.hidden = !open;
    this.elements.arrowButton.setAttribute('aria-expanded', String(open));
    this.elements.disclosure.textContent = open ? '-' : '+';
    this.elements.group.classList.toggle('is-open', open);
  }

  sync() {
    if (!this.elements) {
      return;
    }

    this.elements.enabled.checked = this.settings.enabled;
    this.syncPresetModeButton();

    for (const input of this.elements.checkboxes) {
      input.checked = Boolean(this.settings[input.dataset.cellMassCheckbox]);
    }

    for (const input of this.elements.sliders) {
      const key = input.dataset.cellMassSlider;
      input.value = String(this.settings[key]);
    }

    for (const value of this.elements.sliderValues) {
      const key = value.dataset.cellMassSlider;
      value.textContent = key === 'updateDelayMs'
        ? `${this.settings[key]}ms`
        : String(this.settings[key]);
    }
  }

  syncPresetModeButton() {
    const modeButton = this.elements.modeButton;
    modeButton.classList.toggle('is-normal', this.settings.mode === 'normal');
    modeButton.classList.toggle('is-vip', this.settings.mode === 'vip');
    modeButton.classList.toggle('is-custom', this.settings.mode === 'custom');
  }

  listen(node, type, listener, options) {
    node.addEventListener?.(type, listener, options);
    this.listeners.push([node, type, listener, options]);
  }
}
