import {
  readJellyShaderSettings,
  saveJellyShaderSettings,
} from './JellyShaderSettings.js';

const DESCRIPTION = 'FPS-Impact: Low[1-20]\nAdds and replaces the default Jelly-Physics Shader with a lighter rewritten one.';
const VANILLA_JELLY_KEY = 'config-switch-jelly-physics';

export class JellyShaderSettingsUi {
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
    this.settings = readJellyShaderSettings(storage);
    this.listeners = [];
    this.elements = null;
  }

  create() {
    this.settings = readJellyShaderSettings(this.storage);

    const group = this.document.createElement('div');
    group.classList.add('blobio-jelly-setting-group');
    group.setAttribute('_ngcontent-c3', '');

    const row = this.createHeaderRow();
    const menu = this.createDropdownMenu();
    group.append(row, menu);

    this.elements = {
      group,
      row,
      menu,
      enabled: row.querySelector('#config-switch-jelly-shader'),
      arrowButton: row.querySelector('.blobio-jelly-dropdown-button'),
      disclosure: row.querySelector('.blobio-jelly-dropdown-symbol'),
      skinCells: menu.querySelector('[data-jelly-option="skinCells"]'),
      noSkinCells: menu.querySelector('[data-jelly-option="noSkinCells"]'),
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
    row.classList.add('grid-item', 'blobio-extension-setting-row', 'blobio-jelly-setting-row');
    row.dataset.blobioTooltip = DESCRIPTION;
    row.setAttribute('_ngcontent-c3', '');

    const switchLabel = this.document.createElement('label');
    switchLabel.classList.add('switch');
    switchLabel.setAttribute('_ngcontent-c3', '');

    const checkbox = this.document.createElement('input');
    checkbox.id = 'config-switch-jelly-shader';
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
    textLabel.textContent = 'Jelly-Physics Shader';

    const arrowButton = this.document.createElement('button');
    arrowButton.type = 'button';
    arrowButton.classList.add('blobio-jelly-dropdown-button');
    arrowButton.setAttribute('aria-label', 'Open Jelly-Physics Shader settings');
    arrowButton.setAttribute('aria-expanded', 'false');
    arrowButton.setAttribute('_ngcontent-c3', '');

    const disclosure = this.document.createElement('span');
    disclosure.classList.add('blobio-jelly-dropdown-symbol');
    disclosure.setAttribute('aria-hidden', 'true');
    disclosure.textContent = '+';
    arrowButton.appendChild(disclosure);

    row.append(switchLabel, textLabel, arrowButton);
    this.installTooltip(row, DESCRIPTION);

    this.listen(checkbox, 'change', () => {
      this.settings = this.save({ enabled: Boolean(checkbox.checked) });
      if (this.settings.enabled) {
        this.disableVanillaJellyPhysics({ notify: true });
      }
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
    menu.classList.add('blobio-jelly-button-menu');
    menu.hidden = true;
    menu.setAttribute('_ngcontent-c3', '');

    menu.append(
      this.createOption('skinCells', 'Skin-Cells'),
      this.createOption('noSkinCells', 'No-Skin-Cells'),
    );
    return menu;
  }

  createOption(key, labelText) {
    const row = this.document.createElement('label');
    row.classList.add('blobio-jelly-option-row');

    const input = this.document.createElement('input');
    input.type = 'checkbox';
    input.dataset.jellyOption = key;

    const label = this.document.createElement('span');
    label.textContent = labelText;

    row.append(input, label);
    this.listen(input, 'change', () => {
      this.settings = this.save({ [key]: Boolean(input.checked) });
      this.sync();
    });
    return row;
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
    return saveJellyShaderSettings(this.storage, {
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
  }

  sync() {
    if (!this.elements) {
      return;
    }
    this.elements.enabled.checked = this.settings.enabled;
    this.elements.skinCells.checked = this.settings.skinCells;
    this.elements.noSkinCells.checked = this.settings.noSkinCells;
    if (this.settings.enabled) {
      this.disableVanillaJellyPhysics({ notify: false });
    }
  }

  listen(node, type, listener, options) {
    node.addEventListener?.(type, listener, options);
    this.listeners.push([node, type, listener, options]);
  }

  disableVanillaJellyPhysics({ notify = false } = {}) {
    const win = this.document?.defaultView || globalThis;
    try {
      win.localStorage?.setItem?.(VANILLA_JELLY_KEY, 'false');
    } catch {}

    const checkbox = this.document?.getElementById?.(VANILLA_JELLY_KEY);
    if (!checkbox) {
      return;
    }

    const changed = Boolean(checkbox.checked);
    checkbox.checked = false;
    checkbox.setAttribute?.('aria-checked', 'false');
    if (!notify || !changed) {
      return;
    }

    const EventCtor = win.Event || globalThis.Event;
    for (const type of ['input', 'change']) {
      const event = EventCtor ? new EventCtor(type, { bubbles: true }) : { type, bubbles: true };
      checkbox.dispatchEvent?.(event);
    }
  }
}
