import {
  readFpsSaverSettings,
  saveFpsSaverSettings,
} from './FpsSaverSettings.js';

const HIDDEN_TAB_DESCRIPTION = 'FPS-Gain: High[100-400]\nWhen the tab is hidden, callbacks run only at the hidden FPS interval. It does not touch WebSocket traffic. Expected save: high background CPU/GPU gain.';
const OBJECT_RENDERER_DESCRIPTION = 'FPS-Gain: High[40-250]\nHides and or lets you customise the amount of objects rendered.';

const SLIDERS = [
  {
    key: 'hiddenFps',
    label: 'Hidden-FPS',
    min: 1,
    max: 10,
    step: 1,
    tooltip: 'FPS-Gain: High[100-400]\nFrames per second used when this tab is hidden.',
  },
  {
    key: 'foodLimit',
    label: 'F/P render limit',
    min: 0,
    max: 900,
    step: 1,
    tooltip: 'FPS-Gain: High[40-200]\nMaximum food pellets rendered per frame when food culling is enabled. Lower numbers save more GPU work but hide more pellets.',
  },
  {
    key: 'massLimit',
    label: 'T/M render limit',
    min: 0,
    max: 900,
    step: 1,
    tooltip: 'FPS-Gain: Medium[20-120]\nMaximum thrown-mass pellets rendered per frame when thrown mass culling is enabled. Lower numbers save more GPU work but hide more thrown mass.',
  },
  {
    key: 'maxChatRows',
    label: 'Max-Chat-Rows',
    min: 20,
    max: 120,
    step: 1,
    tooltip: 'FPS-Gain: Medium[10-60]\nChat rows kept by the DOM pressure guard. Expected save: only matters when chat grows large.',
  },
];

export class FpsSaverSettingsUi {
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
    this.settings = readFpsSaverSettings(storage, document);
    this.listeners = [];
    this.elements = {
      groups: [],
      menus: [],
      checkboxes: [],
      sliders: [],
      sliderValues: [],
      disclosureButtons: [],
    };
  }

  create() {
    this.destroy();
    this.settings = readFpsSaverSettings(this.storage, this.document);
    this.elements = {
      groups: [],
      menus: [],
      checkboxes: [],
      sliders: [],
      sliderValues: [],
      disclosureButtons: [],
    };

    const groups = [
      this.createHiddenTabGroup(),
      this.createObjectRendererGroup(),
    ];
    this.elements.groups = groups;
    this.sync();
    return groups;
  }

  destroy() {
    for (const [node, type, listener, options] of this.listeners) {
      node.removeEventListener?.(type, listener, options);
    }
    this.listeners = [];
    for (const group of this.elements?.groups || []) {
      group.remove?.();
    }
    this.elements = {
      groups: [],
      menus: [],
      checkboxes: [],
      sliders: [],
      sliderValues: [],
      disclosureButtons: [],
    };
  }

  createHiddenTabGroup() {
    const group = this.createGroup();
    const row = this.createHeaderRow({
      key: 'hiddenTab',
      id: 'config-switch-fps-saver-hidden-tab',
      label: 'Hidden-Tab',
      description: HIDDEN_TAB_DESCRIPTION,
      menuLabel: 'Open Hidden-Tab settings',
    });

    const menu = this.createMenu();
    menu.append(this.createSliderRow(SLIDERS.find((slider) => slider.key === 'hiddenFps')));
    group.append(row, menu);
    this.registerMenu(row, menu);
    return group;
  }

  createObjectRendererGroup() {
    const group = this.createGroup();
    const row = this.createHeaderRow({
      key: 'objectRenderer',
      id: 'config-switch-fps-saver-object-renderer',
      label: 'Object Renderer',
      description: OBJECT_RENDERER_DESCRIPTION,
      menuLabel: 'Open Object Renderer settings',
    });

    const menu = this.createMenu();
    menu.append(
      this.createSectionTitle('Rainbow Food/Pellets'),
      this.createCheckboxRow({ key: 'foodCulling', label: 'F/P-Culling', tooltip: 'FPS-Gain: High[40-200]\nSkips food pellet render work after the per-frame food limit is reached.' }),
      this.createSliderRow(SLIDERS.find((slider) => slider.key === 'foodLimit')),
      this.createSectionTitle('Thrown Mass'),
      this.createCheckboxRow({ key: 'massCulling', label: 'T/M-Culling', tooltip: 'FPS-Gain: Medium[20-120]\nSkips thrown-mass render work after the per-frame thrown-mass limit is reached.' }),
      this.createSliderRow(SLIDERS.find((slider) => slider.key === 'massLimit')),
      this.createSectionTitle('Chat'),
      this.createSliderRow(SLIDERS.find((slider) => slider.key === 'maxChatRows')),
    );
    group.append(row, menu);
    this.registerMenu(row, menu);
    return group;
  }

  createGroup() {
    const group = this.document.createElement('div');
    group.classList.add('blobio-fps-saver-setting-group');
    group.setAttribute('_ngcontent-c3', '');
    return group;
  }

  createHeaderRow({ key, id, label, description, menuLabel }) {
    const row = this.document.createElement('div');
    row.classList.add('grid-item', 'blobio-extension-setting-row', 'blobio-fps-saver-setting-row');
    row.dataset.blobioTooltip = description;
    row.setAttribute('_ngcontent-c3', '');

    const switchLabel = this.document.createElement('label');
    switchLabel.classList.add('switch');
    switchLabel.setAttribute('_ngcontent-c3', '');

    const checkbox = this.document.createElement('input');
    checkbox.id = id;
    checkbox.type = 'checkbox';
    checkbox.classList.add('ng-untouched', 'ng-pristine', 'ng-valid');
    checkbox.dataset.fpsSaverCheckbox = key;
    checkbox.setAttribute('_ngcontent-c3', '');

    const slider = this.document.createElement('span');
    slider.classList.add('slider');
    slider.setAttribute('_ngcontent-c3', '');
    switchLabel.append(checkbox, slider);

    const textLabel = this.document.createElement('label');
    textLabel.setAttribute('for', checkbox.id);
    textLabel.setAttribute('_ngcontent-c3', '');
    textLabel.textContent = label;

    const arrowButton = this.document.createElement('button');
    arrowButton.type = 'button';
    arrowButton.classList.add('blobio-fps-saver-dropdown-button');
    arrowButton.setAttribute('aria-label', menuLabel);
    arrowButton.setAttribute('aria-expanded', 'false');
    arrowButton.setAttribute('_ngcontent-c3', '');

    const disclosure = this.document.createElement('span');
    disclosure.classList.add('blobio-fps-saver-dropdown-symbol');
    disclosure.setAttribute('aria-hidden', 'true');
    disclosure.textContent = '+';
    arrowButton.appendChild(disclosure);

    row.append(switchLabel, textLabel, arrowButton);
    this.installTooltip(row, description);

    this.listen(checkbox, 'change', () => {
      this.settings = this.save({ [key]: Boolean(checkbox.checked) });
      this.sync();
    });

    this.listen(arrowButton, 'click', (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      const menu = row.__blobioFpsSaverMenu || null;
      const open = menu?.hidden !== false;
      if (open) {
        this.onOpen?.(this);
        this.setOpen(false);
      }
      this.setMenuOpen(row, menu, open);
    });

    this.elements.checkboxes.push(checkbox);
    this.elements.disclosureButtons.push(arrowButton);
    return row;
  }

  createMenu() {
    const menu = this.document.createElement('div');
    menu.classList.add('blobio-fps-saver-button-menu');
    menu.hidden = true;
    menu.setAttribute('_ngcontent-c3', '');
    return menu;
  }

  createSectionTitle(text) {
    const title = this.document.createElement('div');
    title.classList.add('blobio-fps-saver-section-title');
    title.textContent = text;
    return title;
  }

  createCheckboxRow({ key, label, tooltip }) {
    const row = this.document.createElement('label');
    row.classList.add('blobio-fps-saver-checkbox-row');
    if (tooltip) {
      row.dataset.blobioTooltip = tooltip;
      this.installTooltip(row, tooltip);
    }

    const input = this.document.createElement('input');
    input.type = 'checkbox';
    input.classList.add('blobio-fps-saver-checkbox-input');
    input.dataset.fpsSaverCheckbox = key;

    const text = this.document.createElement('span');
    text.textContent = label;

    row.append(input, text);
    this.listen(input, 'change', () => {
      this.settings = this.save({ [key]: Boolean(input.checked) });
      this.sync();
    });
    this.elements.checkboxes.push(input);
    return row;
  }

  createSliderRow({ key, label, min, max, step, tooltip }) {
    const row = this.document.createElement('label');
    row.classList.add('blobio-fps-saver-slider-row');
    if (tooltip) {
      row.dataset.blobioTooltip = tooltip;
      this.installTooltip(row, tooltip);
    }

    const text = this.document.createElement('span');
    text.textContent = label;

    const input = this.document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.classList.add('blobio-fps-saver-slider-input');
    input.dataset.fpsSaverSlider = key;

    const value = this.document.createElement('span');
    value.classList.add('blobio-fps-saver-slider-value');
    value.dataset.fpsSaverSlider = key;

    row.append(text, input, value);
    this.listen(input, 'input', () => {
      this.settings = this.save({ [key]: Number(input.value) });
      this.sync();
    });
    this.elements.sliders.push(input);
    this.elements.sliderValues.push(value);
    return row;
  }

  registerMenu(row, menu) {
    row.__blobioFpsSaverMenu = menu;
    menu.__blobioFpsSaverRow = row;
    this.elements.menus.push(menu);
  }

  setOpen(open) {
    for (const menu of this.elements?.menus || []) {
      const row = menu.__blobioFpsSaverRow || menu.previousSibling;
      this.setMenuOpen(row, menu, Boolean(open));
    }
  }

  setMenuOpen(row, menu, open) {
    if (!row || !menu) {
      return;
    }
    menu.hidden = !open;
    const button = row.querySelector?.('.blobio-fps-saver-dropdown-button');
    const symbol = row.querySelector?.('.blobio-fps-saver-dropdown-symbol');
    button?.setAttribute('aria-expanded', String(open));
    if (symbol) {
      symbol.textContent = open ? '-' : '+';
    }
  }

  sync() {
    this.settings = {
      ...this.settings,
      ...readFpsSaverSettings(this.storage, this.document),
    };

    for (const input of this.elements?.checkboxes || []) {
      const key = input.dataset?.fpsSaverCheckbox;
      if (key && Object.prototype.hasOwnProperty.call(this.settings, key)) {
        input.checked = Boolean(this.settings[key]);
      }
    }

    for (const input of this.elements?.sliders || []) {
      const key = input.dataset?.fpsSaverSlider;
      if (key && Object.prototype.hasOwnProperty.call(this.settings, key)) {
        input.value = String(this.settings[key]);
      }
    }

    for (const value of this.elements?.sliderValues || []) {
      const key = value.dataset?.fpsSaverSlider;
      if (key && Object.prototype.hasOwnProperty.call(this.settings, key)) {
        value.textContent = String(this.settings[key]);
      }
    }
  }

  save(changes) {
    return saveFpsSaverSettings(this.storage, {
      ...this.settings,
      ...changes,
    }, this.document);
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

  listen(node, type, handler, options) {
    node.addEventListener?.(type, handler, options);
    this.listeners.push([node, type, handler, options]);
  }
}
