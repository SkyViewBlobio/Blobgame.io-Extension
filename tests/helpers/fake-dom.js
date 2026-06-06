class FakeClassList {
  constructor(owner = null) {
    this.owner = owner;
    this.names = new Set();
  }

  add(...names) {
    for (const name of names) {
      this.names.add(name);
    }
  }

  remove(...names) {
    for (const name of names) {
      this.names.delete(name);
    }
  }

  contains(name) {
    return this.names.has(name);
  }

  toString() {
    return [...this.names].join(' ');
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.classList = new FakeClassList(this);
    this.parentNode = null;
    this._textContent = '';
    this.id = '';
    this.attributes = new Map();
    this.dataset = {};
    this.eventListeners = new Map();
    this.style = {};
  }

  get parentElement() {
    return this.parentNode;
  }

  get className() {
    return this.classList.toString();
  }

  set className(value) {
    this.classList.names = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  appendChild(child) {
    child.parentNode?.removeChild?.(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child, referenceNode) {
    child.parentNode?.removeChild?.(child);
    child.parentNode = this;

    const index = this.children.indexOf(referenceNode);
    if (index === -1) {
      this.children.push(child);
      return child;
    }

    this.children.splice(index, 0, child);
    return child;
  }

  append(...children) {
    for (const child of children) {
      this.appendChild(child);
    }
  }

  remove() {
    if (!this.parentNode) {
      return;
    }

    this.parentNode.removeChild(this);
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parentNode = null;
    }

    return child;
  }

  setAttribute(name, value) {
    const normalizedValue = String(value);
    this.attributes.set(name, normalizedValue);

    if (name === 'id') {
      this.id = normalizedValue;
    } else if (name === 'class') {
      this.className = normalizedValue;
    } else {
      this[name] = normalizedValue;
    }
  }

  getAttribute(name) {
    if (name === 'id') {
      return this.id || null;
    }

    if (name === 'class') {
      return this.className || null;
    }

    return this.attributes.get(name) || null;
  }

  hasAttribute(name) {
    if (name === 'id') {
      return Boolean(this.id);
    }

    if (name === 'class') {
      return this.classList.names.size > 0;
    }

    return this.attributes.has(name);
  }

  addEventListener(type, handler) {
    const listeners = this.eventListeners.get(type) || new Set();
    listeners.add(handler);
    this.eventListeners.set(type, listeners);
  }

  removeEventListener(type, handler) {
    this.eventListeners.get(type)?.delete(handler);
  }

  dispatchEvent(event) {
    event.target ||= this;
    event.currentTarget = this;

    for (const handler of this.eventListeners.get(event.type) || []) {
      handler(event);
    }

    return true;
  }

  click() {
    this.dispatchEvent({
      type: 'click',
      target: this,
      stopPropagation() {},
      preventDefault() {},
    });
  }

  contains(node) {
    if (node === this) {
      return true;
    }

    return this.children.some((child) => child.contains(node));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    collectMatches(this, selector, matches);
    return matches;
  }
}

function findById(node, id) {
  if (node.id === id) {
    return node;
  }

  for (const child of node.children) {
    const match = findById(child, id);
    if (match) {
      return match;
    }
  }

  return null;
}

function collectMatches(node, selector, matches) {
  for (const child of node.children) {
    if (matchesSelector(child, selector)) {
      matches.push(child);
    }

    collectMatches(child, selector, matches);
  }
}

function matchesSelector(node, selector) {
  return selector
    .split(',')
    .map((part) => part.trim())
    .some((part) => matchesSelectorPart(node, part));
}

function matchesSelectorPart(node, selector) {
  if (selector.includes(' ')) {
    const [ancestorSelector, childSelector] = selector.split(/\s+/, 2);
    return matchesSelectorPart(node, childSelector) && hasAncestor(node, ancestorSelector);
  }

  if (selector.startsWith('#')) {
    return node.id === selector.slice(1);
  }

  if (selector.startsWith('.')) {
    return selector
      .slice(1)
      .split('.')
      .every((name) => node.classList.contains(name));
  }

  if (selector === '[role="button"]') {
    return node.getAttribute('role') === 'button';
  }

  const attributeMatch = selector.match(/^([a-z0-9-]+)\[([a-z0-9-]+)\]$/i);
  if (attributeMatch) {
    return node.tagName.toLowerCase() === attributeMatch[1] && node.hasAttribute(attributeMatch[2]);
  }

  const tagClassMatch = selector.match(/^([a-z0-9-]+)\.([a-z0-9-]+(?:\.[a-z0-9-]+)*)$/i);
  if (tagClassMatch) {
    return (
      node.tagName.toLowerCase() === tagClassMatch[1] &&
      tagClassMatch[2].split('.').every((name) => node.classList.contains(name))
    );
  }

  return node.tagName.toLowerCase() === selector.toLowerCase();
}

function hasAncestor(node, selector) {
  let parent = node.parentNode;

  while (parent) {
    if (matchesSelectorPart(parent, selector)) {
      return true;
    }

    parent = parent.parentNode;
  }

  return false;
}

export function createFakeDocument() {
  const documentElement = new FakeElement('html');
  const head = new FakeElement('head');
  const body = new FakeElement('body');
  const eventListeners = new Map();

  documentElement.appendChild(head);
  documentElement.appendChild(body);

  return {
    body,
    documentElement,
    head,
    defaultView: {},
    addEventListener(type, handler) {
      const listeners = eventListeners.get(type) || new Set();
      listeners.add(handler);
      eventListeners.set(type, listeners);
    },
    removeEventListener(type, handler) {
      eventListeners.get(type)?.delete(handler);
    },
    dispatchEvent(event) {
      event.target ||= this;

      for (const handler of eventListeners.get(event.type) || []) {
        handler(event);
      }

      return true;
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    getElementById(id) {
      return findById(documentElement, id);
    },
    querySelector(selector) {
      return documentElement.querySelector(selector);
    },
    querySelectorAll(selector) {
      return documentElement.querySelectorAll(selector);
    },
  };
}
