export function findNameInput(document) {
  const containers = [
    document.querySelector?.('.inputs-container'),
    document.getElementById?.('game-wrapper'),
    document.body,
  ].filter(Boolean);

  for (const container of containers) {
    const inputs = Array.from(container.querySelectorAll?.('input') || []);
    const namedInput = inputs.find((input) => {
      const label = `${input.id || ''} ${input.getAttribute?.('name') || ''} ${input.getAttribute?.('placeholder') || ''}`;
      return /nick|name/i.test(label);
    });

    if (namedInput) {
      return namedInput;
    }

    const textInput = inputs.find((input) => {
      const type = input.getAttribute?.('type') || input.type || '';
      return (!type || type === 'text') && !input.readOnly && input.getAttribute?.('readonly') === null;
    });

    if (textInput) {
      return textInput;
    }
  }

  return null;
}

export function syncUsernameAnimation({ document, isInsideOwnUi, clearElement, setStyleProperty }) {
  const usernames = Array.from(document.querySelectorAll?.('.fleft.username') || []);

  for (const username of usernames) {
    if (isInsideOwnUi(username)) {
      continue;
    }

    const text = getUsernameSourceText(username);
    const currentText = username.dataset.blobioUsernameText || '';
    let animated = getUsernameAnimatedNode(username);
    const existingLetters = animated?.querySelectorAll?.('.blobio-username-letter') || [];

    if (!text || (text === currentText && existingLetters.length === Array.from(text).length)) {
      continue;
    }

    if (!animated) {
      animated = document.createElement('span');
      animated.classList.add('blobio-username-animated');
      username.appendChild(animated);
    }

    clearElement(animated);
    username.dataset.blobioUsernameText = text;

    const letters = Array.from(text);
    const duration = letters.length * 160 + 5200;
    const glowDelay = Math.max(0, (letters.length - 1) * 160 + 1250);
    setStyleProperty(username, '--blobio-username-duration', `${duration}ms`);
    setStyleProperty(username, '--blobio-username-glow-delay', `${glowDelay}ms`);

    letters.forEach((letter, index) => {
      const span = document.createElement('span');
      span.classList.add('blobio-username-letter');
      span.textContent = letter;
      setStyleProperty(span, '--blobio-letter-delay', `${index * 160}ms`);
      animated.appendChild(span);
    });
  }
}

export function getUsernameAnimatedNode(username) {
  return Array.from(username.children || []).find((child) => child.classList?.contains('blobio-username-animated')) || null;
}

export function getUsernameSourceText(username) {
  const animated = getUsernameAnimatedNode(username);

  if (username.childNodes) {
    return Array.from(username.childNodes)
      .filter((node) => node !== animated)
      .map((node) => {
        if (node.nodeType === 3) {
          return node.textContent || '';
        }

        if (node.nodeType === 1 && !node.classList?.contains('blobio-username-animated')) {
          return node.textContent || '';
        }

        return '';
      })
      .join('')
      .trim();
  }

  const fullText = username.textContent || '';
  const animatedText = animated?.textContent || '';
  if (animatedText && fullText.endsWith(animatedText)) {
    return fullText.slice(0, -animatedText.length).trim();
  }

  return fullText.trim();
}
