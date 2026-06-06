const DEFAULT_CLASS_NAME = 'blobio-background-enabled';
const DEFAULT_STYLE_ID = 'blobio-background-style';

export class BackgroundFeature {
  constructor({
    document = globalThis.document,
    backgroundUrl,
    logger = console,
    className = DEFAULT_CLASS_NAME,
    styleId = DEFAULT_STYLE_ID,
  } = {}) {
    this.document = document;
    this.backgroundUrl = backgroundUrl;
    this.logger = logger;
    this.className = className;
    this.styleId = styleId;
    this.started = false;
    this.styleNode = null;
    this.observer = null;
    this.readyHandler = null;
  }

  start() {
    if (this.started) {
      return true;
    }

    if (!this.document?.documentElement || !this.backgroundUrl) {
      this.logger.warn('[Blobio] Background feature could not start: document or background image is missing.');
      return false;
    }

    this.ensureStyle();
    this.applyClasses();
    this.watchForBody();
    this.started = true;
    return true;
  }

  destroy() {
    this.disconnectObserver();

    if (this.readyHandler) {
      this.document.removeEventListener?.('DOMContentLoaded', this.readyHandler);
      this.readyHandler = null;
    }

    const style = this.styleNode || this.document.getElementById?.(this.styleId);
    style?.remove();
    this.styleNode = null;

    this.document.documentElement?.classList.remove(this.className);
    this.document.body?.classList.remove(this.className);
    this.started = false;
  }

  ensureStyle() {
    const existingStyle = this.document.getElementById?.(this.styleId);
    if (existingStyle) {
      this.styleNode = existingStyle;
      return;
    }

    const style = this.document.createElement('style');
    style.id = this.styleId;
    style.textContent = this.buildCss();

    const parent = this.document.head || this.document.documentElement;
    parent.appendChild(style);
    this.styleNode = style;
  }

  buildCss() {
    return `
html.${this.className},
body.${this.className} {
  min-height: 100%;
  background-color: #050607 !important;
  background-image: url("${this.backgroundUrl}") !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
  background-attachment: fixed !important;
}

html.${this.className} body {
  background-color: transparent !important;
}

html.${this.className} .wrapper,
body.${this.className} .wrapper {
  background-image: url("${this.backgroundUrl}") !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
}

html.${this.className} body::before {
  content: "";
  position: fixed;
  inset: 10px;
  z-index: 2147483000;
  pointer-events: none;
  border: 1px solid rgba(142, 255, 174, 0.42);
  border-radius: 10px;
  box-shadow: inset 0 0 22px rgba(76, 255, 128, 0.34), 0 0 18px rgba(76, 255, 128, 0.2);
}
`.trim();
  }

  applyClasses() {
    this.document.documentElement.classList.add(this.className);
    this.document.body?.classList.add(this.className);
  }

  watchForBody() {
    if (this.document.body) {
      return;
    }

    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (MutationObserver) {
      this.observer = new MutationObserver(() => {
        if (!this.document.body) {
          return;
        }

        this.document.body.classList.add(this.className);
        this.disconnectObserver();
      });

      this.observer.observe(this.document.documentElement, { childList: true });
      return;
    }

    this.readyHandler = () => this.applyClasses();
    this.document.addEventListener?.('DOMContentLoaded', this.readyHandler, { once: true });
  }

  disconnectObserver() {
    this.observer?.disconnect();
    this.observer = null;
  }
}
