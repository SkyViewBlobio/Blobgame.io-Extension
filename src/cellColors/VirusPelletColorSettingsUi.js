import {
  colorToRgba,
  readVirusPelletColorSettings,
  saveVirusPelletColorSettings,
} from './VirusPelletColorSettings.js';

const TARGETS = [
  { key: 'virus', label: 'Virus / Mothercell' },
  { key: 'pellets', label: 'Food-Pellets' },
];

const PREVIEW_VIRUSES = [
  { x: 132, y: 102, size: 92 },
  { x: 282, y: 116, size: 76 },
  { x: 210, y: 202, size: 112 },
  { x: 338, y: 224, size: 66 },
];

const PREVIEW_PELLETS = [
  [64, 68, 7], [92, 166, 5], [128, 232, 6], [164, 154, 4],
  [236, 76, 5], [260, 274, 7], [318, 64, 4], [364, 148, 6],
  [382, 286, 5], [46, 252, 4], [214, 42, 5], [96, 302, 6],
];

export class VirusPelletColorSettingsUi {
  constructor({
    document,
    storage,
    assets = {},
    logger = console,
    showTooltip = null,
    moveTooltip = null,
    hideTooltip = null,
    onOpen = null,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.assets = assets;
    this.logger = logger;
    this.showTooltip = showTooltip;
    this.moveTooltip = moveTooltip;
    this.hideTooltip = hideTooltip;
    this.onOpen = onOpen;
    this.settings = readVirusPelletColorSettings(storage, document);
    this.listeners = [];
    this.elements = null;
    this.previewImages = {
      background: null,
      virus: null,
    };
    this.previewImageUrls = {
      background: '',
      virus: '',
    };
    this.previewBuffer = null;
  }

  create() {
    this.settings = readVirusPelletColorSettings(this.storage, this.document);

    const group = this.document.createElement('div');
    group.classList.add('blobio-virus-pellet-setting-group');
    group.setAttribute('_ngcontent-c3', '');

    const row = this.createHeaderRow();
    const menu = this.createDropdownMenu();
    group.append(row, menu);

    this.elements = {
      group,
      row,
      menu,
      enabled: row.querySelector('#config-switch-virus-pellet-colors'),
      arrowButton: row.querySelector('.blobio-virus-pellet-dropdown-button'),
      disclosure: row.querySelector('.blobio-virus-pellet-dropdown-symbol'),
      previewCanvas: menu.querySelector('.blobio-virus-pellet-preview-canvas'),
      targetSections: Array.from(menu.querySelectorAll('.blobio-virus-pellet-target') || []),
      modeButtons: Array.from(menu.querySelectorAll('.blobio-virus-pellet-mode-button') || []),
      gradientSections: Array.from(menu.querySelectorAll('.blobio-virus-pellet-gradient-section') || []),
      colorInputs: Array.from(menu.querySelectorAll('.blobio-virus-pellet-color-input') || []),
      colorSwatches: Array.from(menu.querySelectorAll('.blobio-virus-pellet-color-swatch') || []),
      alphaInputs: Array.from(menu.querySelectorAll('.blobio-virus-pellet-alpha-input') || []),
      alphaValues: Array.from(menu.querySelectorAll('.blobio-virus-pellet-alpha-value') || []),
      angleInputs: Array.from(menu.querySelectorAll('.blobio-virus-pellet-angle-input') || []),
      angleValues: Array.from(menu.querySelectorAll('.blobio-virus-pellet-angle-value') || []),
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
    this.previewImages = { background: null, virus: null };
    this.previewImageUrls = { background: '', virus: '' };
    this.previewBuffer = null;
  }

  createHeaderRow() {
    const row = this.document.createElement('div');
    row.classList.add('grid-item', 'blobio-extension-setting-row', 'blobio-virus-pellet-setting-row');
    row.dataset.blobioTooltip = 'FPS-Impact: Low[5-20]\nLets you change the colors of viruses, mother-cells, and food pellets.';
    row.setAttribute('_ngcontent-c3', '');

    const switchLabel = this.document.createElement('label');
    switchLabel.classList.add('switch');
    switchLabel.setAttribute('_ngcontent-c3', '');

    const checkbox = this.document.createElement('input');
    checkbox.id = 'config-switch-virus-pellet-colors';
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
    textLabel.textContent = 'Virus | Pellets Colors';

    const arrowButton = this.document.createElement('button');
    arrowButton.type = 'button';
    arrowButton.classList.add('blobio-virus-pellet-dropdown-button');
    arrowButton.setAttribute('aria-label', 'Open virus and pellet color settings');
    arrowButton.setAttribute('aria-expanded', 'false');
    arrowButton.setAttribute('_ngcontent-c3', '');

    const disclosure = this.document.createElement('span');
    disclosure.classList.add('blobio-virus-pellet-dropdown-symbol');
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
    menu.classList.add('blobio-virus-pellet-button-menu');
    menu.hidden = true;
    menu.setAttribute('_ngcontent-c3', '');

    const preview = this.document.createElement('div');
    preview.classList.add('blobio-virus-pellet-preview');
    const canvas = this.document.createElement('canvas');
    canvas.classList.add('blobio-virus-pellet-preview-canvas');
    canvas.width = 420;
    canvas.height = 300;
    canvas.setAttribute('aria-label', 'Virus and pellet color preview');
    preview.appendChild(canvas);
    menu.appendChild(preview);

    const controls = this.document.createElement('div');
    controls.classList.add('blobio-virus-pellet-controls');
    for (const target of TARGETS) {
      controls.appendChild(this.createTargetControls(target));
    }
    menu.appendChild(controls);

    return menu;
  }

  createTargetControls(target) {
    const section = this.document.createElement('section');
    section.classList.add('blobio-virus-pellet-target');
    section.dataset.target = target.key;

    const header = this.document.createElement('div');
    header.classList.add('blobio-virus-pellet-target-header');

    const title = this.document.createElement('span');
    title.classList.add('blobio-virus-pellet-target-title');
    title.textContent = target.label;

    const modeButton = this.document.createElement('button');
    modeButton.type = 'button';
    modeButton.classList.add('blobio-virus-pellet-mode-button');
    modeButton.dataset.target = target.key;
    modeButton.setAttribute('aria-label', `${target.label} color mode`);
    modeButton.append(
      this.createModeText('Solid', 'solid'),
      this.createModeText('Gradient', 'gradient'),
    );
    header.append(title, modeButton);
    section.appendChild(header);

    const solidSection = this.document.createElement('div');
    solidSection.classList.add('blobio-virus-pellet-solid-section');
    solidSection.appendChild(this.createColorControl('Color', target.key, 'solid'));
    section.appendChild(solidSection);

    const gradientSection = this.document.createElement('div');
    gradientSection.classList.add('blobio-virus-pellet-gradient-section');
    gradientSection.dataset.target = target.key;
    gradientSection.append(
      this.createColorControl('From', target.key, 'gradient.from'),
      this.createColorControl('To', target.key, 'gradient.to'),
      this.createAngleControl(target.key),
    );
    section.appendChild(gradientSection);

    const alphaRow = this.document.createElement('label');
    alphaRow.classList.add('blobio-virus-pellet-alpha-row');
    alphaRow.dataset.target = target.key;

    const alphaTitle = this.document.createElement('span');
    alphaTitle.textContent = 'Alpha';

    const alphaInput = this.document.createElement('input');
    alphaInput.type = 'range';
    alphaInput.min = '0';
    alphaInput.max = '100';
    alphaInput.step = '1';
    alphaInput.classList.add('blobio-virus-pellet-alpha-input');
    alphaInput.dataset.target = target.key;

    const alphaValue = this.document.createElement('span');
    alphaValue.classList.add('blobio-virus-pellet-alpha-value');
    alphaValue.dataset.target = target.key;
    alphaRow.append(alphaTitle, alphaInput, alphaValue);
    section.appendChild(alphaRow);

    this.listen(modeButton, 'click', (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      const current = this.settings[target.key].mode;
      this.settings = this.saveTarget(target.key, {
        mode: current === 'gradient' ? 'solid' : 'gradient',
      });
      this.sync();
    });

    this.listen(alphaInput, 'input', () => {
      this.settings = this.saveTarget(target.key, { alpha: alphaInput.value });
      this.sync();
    });

    return section;
  }

  createModeText(text, mode) {
    const span = this.document.createElement('span');
    span.classList.add('blobio-virus-pellet-mode-text', `is-${mode}`);
    span.textContent = text;
    return span;
  }

  createColorControl(title, target, path) {
    const row = this.document.createElement('label');
    row.classList.add('blobio-virus-pellet-color-row');
    row.dataset.target = target;
    row.dataset.colorPath = path;

    const label = this.document.createElement('span');
    label.textContent = title;

    const colorWheel = this.document.createElement('span');
    colorWheel.classList.add('blobio-virus-pellet-color-wheel');
    const swatch = this.document.createElement('span');
    swatch.classList.add('blobio-virus-pellet-color-swatch');
    swatch.dataset.target = target;
    swatch.dataset.colorPath = path;

    const input = this.document.createElement('input');
    input.type = 'color';
    input.classList.add('blobio-virus-pellet-color-input');
    input.dataset.target = target;
    input.dataset.colorPath = path;
    input.setAttribute('aria-label', `${title} ${target} color`);
    colorWheel.append(swatch, input);
    row.append(label, colorWheel);

    this.listen(input, 'input', () => {
      this.settings = this.saveTarget(target, this.colorChange(target, path, input.value));
      this.sync();
    });

    return row;
  }

  createAngleControl(target) {
    const row = this.document.createElement('label');
    row.classList.add('blobio-virus-pellet-angle-row');
    row.dataset.target = target;

    const title = this.document.createElement('span');
    title.textContent = 'Angle';

    const input = this.document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '360';
    input.step = '1';
    input.classList.add('blobio-virus-pellet-angle-input');
    input.dataset.target = target;

    const value = this.document.createElement('span');
    value.classList.add('blobio-virus-pellet-angle-value');
    value.dataset.target = target;
    row.append(title, input, value);

    this.listen(input, 'input', () => {
      this.settings = this.saveTarget(target, {
        gradient: {
          ...this.settings[target].gradient,
          angle: input.value,
        },
      });
      this.sync();
    });

    return row;
  }

  colorChange(target, path, color) {
    if (path === 'solid') {
      return { solid: color };
    }

    const key = path === 'gradient.to' ? 'to' : 'from';
    return {
      gradient: {
        ...this.settings[target].gradient,
        [key]: color,
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
    return saveVirusPelletColorSettings(this.storage, {
      ...this.settings,
      ...changes,
    }, this.document);
  }

  saveTarget(target, changes) {
    return this.save({
      [target]: {
        ...this.settings[target],
        ...changes,
        gradient: {
          ...this.settings[target].gradient,
          ...(changes.gradient || {}),
        },
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
    this.setClass(this.elements.group, 'is-open', open);
    if (open) {
      this.renderPreview();
    }
  }

  sync() {
    if (!this.elements) {
      return;
    }

    this.elements.enabled.checked = this.settings.enabled;

    for (const target of TARGETS) {
      const targetSettings = this.settings[target.key];
      const isGradient = targetSettings.mode === 'gradient';

      for (const button of this.elements.modeButtons.filter((node) => node.dataset.target === target.key)) {
        this.setClass(button, 'is-gradient', isGradient);
        button.setAttribute('aria-pressed', String(isGradient));
      }

      for (const section of this.elements.gradientSections.filter((node) => node.dataset.target === target.key)) {
        section.hidden = !isGradient;
      }

      for (const input of this.elements.alphaInputs.filter((node) => node.dataset.target === target.key)) {
        input.value = String(targetSettings.alpha);
      }

      for (const value of this.elements.alphaValues.filter((node) => node.dataset.target === target.key)) {
        value.textContent = `${Math.round(targetSettings.alpha)}%`;
      }

      for (const input of this.elements.angleInputs.filter((node) => node.dataset.target === target.key)) {
        input.value = String(targetSettings.gradient.angle);
      }

      for (const value of this.elements.angleValues.filter((node) => node.dataset.target === target.key)) {
        value.textContent = `${targetSettings.gradient.angle}deg`;
      }
    }

    for (const input of this.elements.colorInputs) {
      input.value = this.colorValue(input.dataset.target, input.dataset.colorPath);
    }

    for (const swatch of this.elements.colorSwatches) {
      swatch.style.backgroundColor = this.colorValue(swatch.dataset.target, swatch.dataset.colorPath);
    }

    this.renderPreview();
  }

  colorValue(target, path) {
    const targetSettings = this.settings[target];
    if (path === 'solid') {
      return targetSettings.solid;
    }
    if (path === 'gradient.to') {
      return targetSettings.gradient.to;
    }
    return targetSettings.gradient.from;
  }

  renderPreview() {
    const canvas = this.elements?.previewCanvas;
    const context = canvas?.getContext?.('2d');
    if (!canvas || !context) {
      return;
    }

    this.ensurePreviewImage('background', this.assets.virusPelletPreview);
    this.ensurePreviewImage('virus', this.assets.originalVirusNoColor);
    this.drawPreview(context, canvas);
  }

  ensurePreviewImage(key, url) {
    if (!url || this.previewImages[key] && this.previewImageUrls[key] === url) {
      return;
    }

    const ImageCtor = this.document.defaultView?.Image || globalThis.Image;
    if (typeof ImageCtor !== 'function') {
      return;
    }

    const image = new ImageCtor();
    this.previewImages[key] = image;
    this.previewImageUrls[key] = url;
    image.onload = () => this.renderPreview();
    image.onerror = () => {
      this.logger.warn?.('[Blobio] Virus | Pellets Colors preview asset could not be loaded.');
    };
    image.src = url;
  }

  drawPreview(context, canvas) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const background = this.previewImages.background;
    if (background?.complete || background?.naturalWidth > 0 || background?.width > 0) {
      context.drawImage(background, 0, 0, canvas.width, canvas.height);
    } else {
      context.fillStyle = '#101010';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.globalAlpha = this.settings.enabled ? 1 : 0.5;
    this.drawPellets(context);
    this.drawViruses(context);
    context.globalAlpha = 1;
  }

  drawPellets(context) {
    const fill = this.createCanvasFill(context, this.settings.pellets, {
      x: 0,
      y: 0,
      width: 420,
      height: 300,
    });
    context.fillStyle = fill;
    for (const [x, y, radius] of PREVIEW_PELLETS) {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  drawViruses(context) {
    const image = this.previewImages.virus;
    if (!image || !(image.complete || image.naturalWidth > 0 || image.width > 0)) {
      return;
    }

    for (const virus of PREVIEW_VIRUSES) {
      this.drawTintedVirus(context, image, virus);
    }
  }

  drawTintedVirus(context, image, virus) {
    const buffer = this.getPreviewBuffer(virus.size, virus.size);
    const bufferContext = buffer?.getContext?.('2d');
    if (!buffer || !bufferContext) {
      return;
    }

    bufferContext.clearRect(0, 0, buffer.width, buffer.height);
    bufferContext.drawImage(image, 0, 0, buffer.width, buffer.height);
    bufferContext.globalCompositeOperation = 'source-in';
    bufferContext.fillStyle = this.createCanvasFill(bufferContext, this.settings.virus, {
      x: 0,
      y: 0,
      width: buffer.width,
      height: buffer.height,
    });
    bufferContext.fillRect(0, 0, buffer.width, buffer.height);
    bufferContext.globalCompositeOperation = 'source-over';

    const x = virus.x - virus.size / 2;
    const y = virus.y - virus.size / 2;
    context.drawImage(buffer, x, y, virus.size, virus.size);
  }

  getPreviewBuffer(width, height) {
    if (!this.previewBuffer) {
      this.previewBuffer = this.document.createElement('canvas');
    }
    this.previewBuffer.width = width;
    this.previewBuffer.height = height;
    return this.previewBuffer;
  }

  createCanvasFill(context, target, box) {
    const alpha = target.alpha;
    if (target.mode !== 'gradient') {
      return colorToRgba(target.solid, alpha);
    }

    const radians = (target.gradient.angle - 90) * Math.PI / 180;
    const half = Math.sqrt(box.width * box.width + box.height * box.height) / 2;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const dx = Math.cos(radians) * half;
    const dy = Math.sin(radians) * half;
    const gradient = context.createLinearGradient(centerX - dx, centerY - dy, centerX + dx, centerY + dy);
    gradient.addColorStop(0, colorToRgba(target.gradient.from, alpha));
    gradient.addColorStop(1, colorToRgba(target.gradient.to, alpha));
    return gradient;
  }

  setClass(node, className, enabled) {
    if (enabled) {
      node.classList?.add(className);
    } else {
      node.classList?.remove(className);
    }
  }

  listen(node, type, listener, options) {
    node.addEventListener?.(type, listener, options);
    this.listeners.push([node, type, listener, options]);
  }
}
