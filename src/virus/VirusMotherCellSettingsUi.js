import {
  readVirusMotherCellSettings,
  saveVirusMotherCellSettings,
} from './VirusMotherCellSettings.js';

const MASK_OPTIONS = [
  { id: 'halo', label: 'Halo', assetKey: 'virusHalo' },
  { id: 'rotate', label: 'Random angle', assetKey: 'virusRotate' },
  { id: 'ring', label: 'Ring', assetKey: 'virusRing' },
];

export class VirusMotherCellSettingsUi {
  constructor({
    document,
    storage,
    assets = {},
    logger = console,
    showTooltip = null,
    moveTooltip = null,
    hideTooltip = null,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.assets = assets;
    this.logger = logger;
    this.showTooltip = showTooltip;
    this.moveTooltip = moveTooltip;
    this.hideTooltip = hideTooltip;
    this.settings = readVirusMotherCellSettings(storage);
    this.listeners = [];
    this.maskImage = null;
    this.maskImageUrl = '';
    this.elements = null;
  }

  create() {
    this.settings = readVirusMotherCellSettings(this.storage);

    const group = this.document.createElement('div');
    group.classList.add('blobio-virus-setting-group');
    group.setAttribute('_ngcontent-c3', '');

    const row = this.createHeaderRow();
    const menu = this.createDropdownMenu();
    group.append(row, menu);

    this.elements = {
      group,
      row,
      menu,
      enabled: row.querySelector('#config-switch-virus-mother-cell'),
      arrowButton: row.querySelector('.blobio-virus-dropdown-button'),
      disclosure: row.querySelector('.blobio-virus-dropdown-symbol'),
      previewCanvas: menu.querySelector('.blobio-virus-preview-canvas'),
      colorInput: menu.querySelector('.blobio-virus-color-input'),
      colorSwatch: menu.querySelector('.blobio-virus-color-swatch'),
      alphaInput: menu.querySelector('.blobio-virus-alpha-input'),
      alphaValue: menu.querySelector('.blobio-virus-alpha-value'),
      rotateRow: menu.querySelector('.blobio-virus-rotate-row'),
      rotateInput: menu.querySelector('.blobio-virus-rotate-input'),
      maskButtons: Array.from(menu.querySelectorAll('.blobio-virus-mask-button') || []),
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
    this.maskImage = null;
    this.maskImageUrl = '';
  }

  createHeaderRow() {
    const row = this.document.createElement('div');
    row.classList.add('grid-item', 'blobio-extension-setting-row', 'blobio-virus-setting-row');
    row.dataset.blobioTooltip = 'Replace in-game virus and mother-cell rendering with a selected extension mask after reloading the game tab.';
    row.setAttribute('_ngcontent-c3', '');

    const switchLabel = this.document.createElement('label');
    switchLabel.classList.add('switch');
    switchLabel.setAttribute('_ngcontent-c3', '');

    const checkbox = this.document.createElement('input');
    checkbox.id = 'config-switch-virus-mother-cell';
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
    textLabel.textContent = 'Virus | Mother-cell';

    const arrowButton = this.document.createElement('button');
    arrowButton.type = 'button';
    arrowButton.classList.add('blobio-virus-dropdown-button');
    arrowButton.setAttribute('aria-label', 'Open virus and mother-cell settings');
    arrowButton.setAttribute('aria-expanded', 'false');
    arrowButton.setAttribute('_ngcontent-c3', '');

    const disclosure = this.document.createElement('span');
    disclosure.classList.add('blobio-virus-dropdown-symbol');
    disclosure.setAttribute('aria-hidden', 'true');
    disclosure.textContent = '+';
    arrowButton.appendChild(disclosure);

    row.append(switchLabel, textLabel, arrowButton);

    this.installTooltip(
      row,
      'Replace in-game virus and mother-cell rendering with a selected extension mask after reloading the game tab.',
    );

    this.listen(checkbox, 'change', () => {
      this.settings = this.save({ enabled: Boolean(checkbox.checked) });
      this.sync();
    });

    this.listen(arrowButton, 'click', (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      const open = this.elements?.menu?.hidden !== false;
      this.setOpen(open);
    });

    return row;
  }

  createDropdownMenu() {
    const menu = this.document.createElement('div');
    menu.classList.add('blobio-virus-mothercell-button-menu');
    menu.hidden = true;
    menu.setAttribute('_ngcontent-c3', '');

    const preview = this.document.createElement('div');
    preview.classList.add('blobio-virus-preview');
    preview.style.backgroundImage = this.assets.virusPreview
      ? `url("${this.assets.virusPreview}")`
      : '';

    const canvas = this.document.createElement('canvas');
    canvas.classList.add('blobio-virus-preview-canvas');
    canvas.width = 256;
    canvas.height = 256;
    canvas.setAttribute('aria-label', 'Selected virus preview');
    preview.appendChild(canvas);
    menu.appendChild(preview);

    const controls = this.document.createElement('div');
    controls.classList.add('blobio-virus-controls');

    const colorControl = this.document.createElement('label');
    colorControl.classList.add('blobio-virus-control', 'blobio-virus-color-control');
    const colorTitle = this.document.createElement('span');
    colorTitle.textContent = 'Color';
    const colorWheel = this.document.createElement('span');
    colorWheel.classList.add('blobio-virus-color-wheel');
    const colorSwatch = this.document.createElement('span');
    colorSwatch.classList.add('blobio-virus-color-swatch');
    const colorInput = this.document.createElement('input');
    colorInput.type = 'color';
    colorInput.classList.add('blobio-virus-color-input');
    colorInput.setAttribute('aria-label', 'Virus color');
    colorWheel.append(colorSwatch, colorInput);
    colorControl.append(colorTitle, colorWheel);

    const alphaControl = this.document.createElement('label');
    alphaControl.classList.add('blobio-virus-control', 'blobio-virus-alpha-control');
    const alphaTitle = this.document.createElement('span');
    alphaTitle.textContent = 'Alpha';
    const alphaInput = this.document.createElement('input');
    alphaInput.type = 'range';
    alphaInput.min = '0';
    alphaInput.max = '1';
    alphaInput.step = '0.01';
    alphaInput.classList.add('blobio-virus-alpha-input');
    const alphaValue = this.document.createElement('span');
    alphaValue.classList.add('blobio-virus-alpha-value');
    alphaControl.append(alphaTitle, alphaInput, alphaValue);

    controls.append(colorControl, alphaControl);
    menu.appendChild(controls);

    const maskList = this.document.createElement('div');
    maskList.classList.add('blobio-virus-mask-list');
    maskList.setAttribute('aria-label', 'Virus masks');

    for (const mask of MASK_OPTIONS) {
      const button = this.document.createElement('button');
      button.type = 'button';
      button.classList.add('blobio-virus-mask-button');
      button.dataset.maskId = mask.id;
      button.title = mask.label;
      button.setAttribute('aria-label', mask.label);

      const image = this.document.createElement('img');
      image.alt = mask.label;
      image.src = this.assets[mask.assetKey] || '';
      button.appendChild(image);
      maskList.appendChild(button);

      this.listen(button, 'click', (event) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        this.settings = this.save({ maskId: mask.id });
        this.sync();
      });
    }
    menu.appendChild(maskList);

    const rotateRow = this.document.createElement('label');
    rotateRow.classList.add('blobio-virus-rotate-row');
    const rotateInput = this.document.createElement('input');
    rotateInput.type = 'checkbox';
    rotateInput.classList.add('blobio-virus-rotate-input');
    const rotateText = this.document.createElement('span');
    rotateText.textContent = 'Rotate';
    rotateRow.append(rotateInput, rotateText);
    this.installTooltip(
      rotateRow,
      "Some Virus PNG's have the rotation option. When enabled, it will assign the PNG a randomized angle.",
    );
    menu.appendChild(rotateRow);

    this.listen(colorInput, 'input', () => {
      this.settings = this.save({ color: colorInput.value });
      this.sync();
    });

    this.listen(alphaInput, 'input', () => {
      this.settings = this.save({ alpha: alphaInput.value });
      this.sync();
    });

    this.listen(rotateInput, 'change', () => {
      this.settings = this.save({ rotate: Boolean(rotateInput.checked) });
      this.sync();
    });

    return menu;
  }


  installTooltip(node, text) {
    if (!node || !text) {
      return;
    }

    node.dataset.blobioTooltip = text;
    node.title = text;
    if (typeof this.showTooltip !== 'function') {
      return;
    }

    this.listen(node, 'mouseenter', (event) => this.showTooltip(node, event));
    this.listen(node, 'mousemove', (event) => this.moveTooltip?.(event));
    this.listen(node, 'mouseleave', () => this.hideTooltip?.());
  }

  save(changes) {
    return saveVirusMotherCellSettings(this.storage, {
      ...this.settings,
      ...changes,
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
    if (open) {
      this.renderPreview();
    }
  }

  sync() {
    if (!this.elements) {
      return;
    }

    this.elements.enabled.checked = this.settings.enabled;
    this.elements.colorInput.value = this.settings.color;
    this.elements.colorSwatch.style.backgroundColor = this.settings.color;
    this.elements.alphaInput.value = String(this.settings.alpha);
    this.elements.alphaValue.textContent = `${Math.round(this.settings.alpha * 100)}%`;
    this.elements.rotateInput.checked = this.settings.rotate;
    this.elements.rotateRow.hidden = this.settings.maskId !== 'rotate';

    for (const button of this.elements.maskButtons) {
      const selected = button.dataset.maskId === this.settings.maskId;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }

    this.renderPreview();
  }

  renderPreview() {
    const canvas = this.elements?.previewCanvas;
    const context = canvas?.getContext?.('2d');
    if (!canvas || !context) {
      return;
    }

    const option = MASK_OPTIONS.find((mask) => mask.id === this.settings.maskId) || MASK_OPTIONS[0];
    const url = this.assets[option.assetKey] || '';
    if (!url) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    if (!this.maskImage || this.maskImageUrl !== url) {
      const ImageCtor = this.document.defaultView?.Image || globalThis.Image;
      if (typeof ImageCtor !== 'function') {
        return;
      }
      const image = new ImageCtor();
      this.maskImage = image;
      this.maskImageUrl = url;
      image.onload = () => {
        if (this.maskImage === image) {
          this.drawPreview(context, canvas, image);
        }
      };
      image.onerror = () => {
        this.logger.warn?.('[Blobio] Virus preview image could not be loaded.');
      };
      image.src = url;
      if (!image.complete && !image.naturalWidth) {
        return;
      }
    }

    this.drawPreview(context, canvas, this.maskImage);
  }

  drawPreview(context, canvas, image) {
    const size = Math.min(canvas.width, canvas.height) * 0.62;
    const rotation = this.settings.maskId === 'rotate' && this.settings.rotate
      ? 27 * (Math.PI / 180)
      : 0;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(rotation);
    context.globalAlpha = this.settings.alpha;
    context.drawImage(image, -size / 2, -size / 2, size, size);
    context.restore();

    context.save();
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = this.settings.color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  listen(node, type, listener, options) {
    node.addEventListener?.(type, listener, options);
    this.listeners.push([node, type, listener, options]);
  }
}
