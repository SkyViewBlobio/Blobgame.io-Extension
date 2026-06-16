import {
  gameBackgroundCss,
  readGameBackgroundSettings,
  saveGameBackgroundSettings,
} from '../settings/GameBackgroundSettings.js';

export class GameBackgroundSettingsUi {
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
    this.settings = readGameBackgroundSettings(storage);
    this.listeners = [];
    this.elements = null;
  }

  create() {
    this.settings = readGameBackgroundSettings(this.storage);

    const group = this.document.createElement('div');
    group.classList.add('blobio-background-setting-group');
    group.setAttribute('_ngcontent-c3', '');

    const row = this.createHeaderRow();
    const menu = this.createDropdownMenu();
    group.append(row, menu);

    this.elements = {
      group,
      row,
      menu,
      enabled: row.querySelector('#config-switch-background-color'),
      arrowButton: row.querySelector('.blobio-background-dropdown-button'),
      disclosure: row.querySelector('.blobio-background-dropdown-symbol'),
      preview: menu.querySelector('.blobio-background-preview'),
      modeButton: menu.querySelector('.blobio-background-mode-button'),
      gradientSection: menu.querySelector('.blobio-background-gradient-section'),
      angleInput: menu.querySelector('.blobio-background-angle-input'),
      angleValue: menu.querySelector('.blobio-background-angle-value'),
      colorInputs: Array.from(menu.querySelectorAll('.blobio-background-color-input') || []),
      colorSwatches: Array.from(menu.querySelectorAll('.blobio-background-color-swatch') || []),
      alphaInputs: Array.from(menu.querySelectorAll('.blobio-background-alpha-input') || []),
      alphaValues: Array.from(menu.querySelectorAll('.blobio-background-alpha-value') || []),
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
    row.classList.add('grid-item', 'blobio-extension-setting-row', 'blobio-background-setting-row');
    row.dataset.blobioTooltip = 'Allows you to customise the background color in-game.';
    row.setAttribute('_ngcontent-c3', '');

    const switchLabel = this.document.createElement('label');
    switchLabel.classList.add('switch');
    switchLabel.setAttribute('_ngcontent-c3', '');

    const checkbox = this.document.createElement('input');
    checkbox.id = 'config-switch-background-color';
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
    textLabel.textContent = 'Background Color';

    const arrowButton = this.document.createElement('button');
    arrowButton.type = 'button';
    arrowButton.classList.add('blobio-background-dropdown-button');
    arrowButton.setAttribute('aria-label', 'Open background color settings');
    arrowButton.setAttribute('aria-expanded', 'false');
    arrowButton.setAttribute('_ngcontent-c3', '');

    const disclosure = this.document.createElement('span');
    disclosure.classList.add('blobio-background-dropdown-symbol');
    disclosure.setAttribute('aria-hidden', 'true');
    disclosure.textContent = '+';
    arrowButton.appendChild(disclosure);

    row.append(switchLabel, textLabel, arrowButton);
    this.installTooltip(row, row.dataset.blobioTooltip);

    this.listen(checkbox, 'change', () => {
      this.settings = this.save({ enabled: Boolean(checkbox.checked) });
      this.sync();
    });

    this.listen(arrowButton, 'click', (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      if (this.elements?.menu?.hidden !== false) {
        this.onOpen?.(this);
      }
      this.setOpen(this.elements?.menu?.hidden !== false);
    });

    return row;
  }

  createDropdownMenu() {
    const menu = this.document.createElement('div');
    menu.classList.add('blobio-background-button-menu');
    menu.hidden = true;
    menu.setAttribute('_ngcontent-c3', '');

    const preview = this.document.createElement('div');
    preview.classList.add('blobio-background-preview');
    menu.appendChild(preview);

    const modeRow = this.document.createElement('div');
    modeRow.classList.add('blobio-background-mode-row');
    const modeLabel = this.document.createElement('span');
    modeLabel.textContent = 'Mode';
    const modeButton = this.document.createElement('button');
    modeButton.type = 'button';
    modeButton.classList.add('blobio-background-mode-button');
    modeButton.setAttribute('aria-label', 'Toggle background color mode');
    modeButton.append(
      this.createModeText('Solid', 'solid'),
      this.createModeText('Gradient', 'gradient'),
    );
    modeRow.append(modeLabel, modeButton);
    menu.appendChild(modeRow);

    const solidSection = this.document.createElement('div');
    solidSection.classList.add('blobio-background-solid-section');
    solidSection.appendChild(this.createColorControl('Solid Color', 'solid', this.settings.solid));
    menu.appendChild(solidSection);

    const gradientSection = this.document.createElement('div');
    gradientSection.classList.add('blobio-background-gradient-section');

    const gradientTitle = this.document.createElement('div');
    gradientTitle.classList.add('blobio-background-section-title');
    gradientTitle.textContent = 'Gradient Colors';
    gradientSection.append(
      gradientTitle,
      this.createColorControl('From', 'gradient.from', this.settings.gradient.from),
      this.createColorControl('To', 'gradient.to', this.settings.gradient.to),
      this.createAngleControl(),
    );
    menu.appendChild(gradientSection);

    this.listen(modeButton, 'click', (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      this.settings = this.save({
        mode: this.settings.mode === 'gradient' ? 'solid' : 'gradient',
      });
      this.sync();
    });

    return menu;
  }

  createModeText(text, mode) {
    const span = this.document.createElement('span');
    span.classList.add('blobio-background-mode-text', `is-${mode}`);
    span.textContent = text;
    return span;
  }

  createColorControl(title, path, colorSetting) {
    const row = this.document.createElement('div');
    row.classList.add('blobio-background-color-row');
    row.dataset.colorPath = path;

    const colorControl = this.document.createElement('label');
    colorControl.classList.add('blobio-background-control', 'blobio-background-color-control');
    const colorTitle = this.document.createElement('span');
    colorTitle.textContent = title;
    const colorWheel = this.document.createElement('span');
    colorWheel.classList.add('blobio-background-color-wheel');
    const swatch = this.document.createElement('span');
    swatch.classList.add('blobio-background-color-swatch');
    const colorInput = this.document.createElement('input');
    colorInput.type = 'color';
    colorInput.classList.add('blobio-background-color-input');
    colorInput.dataset.colorPath = path;
    colorInput.setAttribute('aria-label', `${title} color`);
    colorInput.value = colorSetting.color;
    colorWheel.append(swatch, colorInput);
    colorControl.append(colorTitle, colorWheel);

    const alphaControl = this.document.createElement('label');
    alphaControl.classList.add('blobio-background-control', 'blobio-background-alpha-control');
    const alphaTitle = this.document.createElement('span');
    alphaTitle.textContent = 'Alpha';
    const alphaInput = this.document.createElement('input');
    alphaInput.type = 'range';
    alphaInput.min = '0';
    alphaInput.max = '1';
    alphaInput.step = '0.01';
    alphaInput.classList.add('blobio-background-alpha-input');
    alphaInput.dataset.colorPath = path;
    alphaInput.setAttribute('aria-label', `${title} alpha`);
    alphaInput.value = String(colorSetting.alpha);
    const alphaValue = this.document.createElement('span');
    alphaValue.classList.add('blobio-background-alpha-value');
    alphaControl.append(alphaTitle, alphaInput, alphaValue);

    row.append(colorControl, alphaControl);

    this.listen(colorInput, 'input', () => {
      this.settings = this.save(this.colorChange(path, { color: colorInput.value }));
      this.sync();
    });
    this.listen(alphaInput, 'input', () => {
      this.settings = this.save(this.colorChange(path, { alpha: alphaInput.value }));
      this.sync();
    });

    return row;
  }

  createAngleControl() {
    const row = this.document.createElement('label');
    row.classList.add('blobio-background-angle-row');

    const title = this.document.createElement('span');
    title.textContent = 'Angle';

    const input = this.document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '360';
    input.step = '1';
    input.classList.add('blobio-background-angle-input', 'blobio-background-alpha-input');

    const value = this.document.createElement('span');
    value.classList.add('blobio-background-angle-value');
    row.append(title, input, value);

    this.listen(input, 'input', () => {
      this.settings = this.save({
        gradient: {
          ...this.settings.gradient,
          angle: input.value,
        },
      });
      this.sync();
    });

    return row;
  }

  colorChange(path, changes) {
    if (path === 'solid') {
      return {
        solid: {
          ...this.settings.solid,
          ...changes,
        },
      };
    }

    const key = path === 'gradient.to' ? 'to' : 'from';
    return {
      gradient: {
        ...this.settings.gradient,
        [key]: {
          ...this.settings.gradient[key],
          ...changes,
        },
      },
    };
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
    return saveGameBackgroundSettings(this.storage, {
      ...this.settings,
      ...changes,
      gradient: {
        ...this.settings.gradient,
        ...(changes.gradient || {}),
      },
      solid: {
        ...this.settings.solid,
        ...(changes.solid || {}),
      },
    });
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

    const isGradient = this.settings.mode === 'gradient';
    this.elements.enabled.checked = this.settings.enabled;
    this.elements.modeButton.classList.toggle('is-gradient', isGradient);
    this.elements.modeButton.setAttribute('aria-pressed', String(isGradient));
    this.elements.gradientSection.hidden = !isGradient;
    this.elements.preview.style.background = gameBackgroundCss(this.settings);
    this.elements.preview.style.opacity = this.settings.enabled ? '1' : '0.48';
    this.elements.angleInput.value = String(this.settings.gradient.angle);
    this.elements.angleValue.textContent = `${this.settings.gradient.angle}deg`;

    for (const input of this.elements.colorInputs) {
      const setting = this.colorSetting(input.dataset.colorPath);
      input.value = setting.color;
    }

    for (const swatch of this.elements.colorSwatches) {
      const path = swatch.closest?.('.blobio-background-color-row')?.dataset?.colorPath;
      swatch.style.backgroundColor = this.colorSetting(path).color;
    }

    for (const input of this.elements.alphaInputs) {
      const setting = this.colorSetting(input.dataset.colorPath);
      input.value = String(setting.alpha);
    }

    for (const value of this.elements.alphaValues) {
      const path = value.closest?.('.blobio-background-color-row')?.dataset?.colorPath;
      value.textContent = `${Math.round(this.colorSetting(path).alpha * 100)}%`;
    }
  }

  colorSetting(path) {
    if (path === 'solid') {
      return this.settings.solid;
    }
    if (path === 'gradient.to') {
      return this.settings.gradient.to;
    }
    return this.settings.gradient.from;
  }

  listen(node, type, listener, options) {
    node.addEventListener?.(type, listener, options);
    this.listeners.push([node, type, listener, options]);
  }
}
