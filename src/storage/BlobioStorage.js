const SHARED_KEY_PREFIXES = ['blobio.roles.', 'blobio.settings.', 'blobio.chat.'];
const STORAGE_BRIDGE_SOURCE = 'BlobioExtensionStorageBridge';


function getWindow(document) {
  return document?.defaultView || globalThis;
}

function getLocalStorage(document) {
  try {
    return getWindow(document)?.localStorage || globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function getGmApi(document) {
  const win = getWindow(document);
  return {
    getValue: win?.GM_getValue || globalThis.GM_getValue,
    setValue: win?.GM_setValue || globalThis.GM_setValue,
    deleteValue: win?.GM_deleteValue || globalThis.GM_deleteValue,
  };
}

function getChromeStorage(document) {
  try {
    const win = getWindow(document);
    return win?.chrome?.storage?.local || globalThis.chrome?.storage?.local || null;
  } catch {
    return null;
  }
}

function getSharedBridge(document) {
  try {
    return getWindow(document)?.__blobioSharedStorageBridge || globalThis.__blobioSharedStorageBridge || null;
  } catch {
    return null;
  }
}

function isSharedKey(key) {
  const value = String(key || '');
  return SHARED_KEY_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function postSharedStorageMessage(document, type, key, value = '') {
  if (!isSharedKey(key)) {
    return;
  }

  try {
    const win = getWindow(document);
    win?.postMessage?.({
      source: STORAGE_BRIDGE_SOURCE,
      type,
      key: String(key),
      value: String(value),
    }, '*');
  } catch {
    // The page may block postMessage in unusual browser modes. localStorage still works.
  }
}

export function createBlobioStorage(document = globalThis.document) {
  const localStorage = getLocalStorage(document);
  const gmApi = getGmApi(document);
  const chromeStorage = getChromeStorage(document);
  const bridge = getSharedBridge(document);

  return {
    getItem(key) {
      if (isSharedKey(key) && typeof bridge?.getItem === 'function') {
        const value = bridge.getItem(key);
        if (value !== undefined && value !== null) {
          const nextValue = String(value);
          if (localStorage?.getItem?.(key) !== nextValue) {
            localStorage?.setItem?.(key, nextValue);
          }

          return nextValue;
        }
      }

      if (isSharedKey(key) && typeof gmApi.getValue === 'function') {
        const value = gmApi.getValue(key, undefined);
        if (value !== undefined && value !== null) {
          const nextValue = String(value);
          if (localStorage?.getItem?.(key) !== nextValue) {
            localStorage?.setItem?.(key, nextValue);
          }

          return nextValue;
        }
      }

      return localStorage?.getItem?.(key) ?? null;
    },

    setItem(key, value) {
      const nextValue = String(value);
      if (isSharedKey(key) && typeof bridge?.setItem === 'function') {
        bridge.setItem(key, nextValue);
      }

      if (isSharedKey(key) && typeof gmApi.setValue === 'function') {
        gmApi.setValue(key, nextValue);
      }

      if (isSharedKey(key) && typeof chromeStorage?.set === 'function') {
        try { chromeStorage.set({ [key]: nextValue }); } catch {}
      }

      localStorage?.setItem?.(key, nextValue);
      postSharedStorageMessage(document, 'set', key, nextValue);
    },

    removeItem(key) {
      if (isSharedKey(key) && typeof bridge?.removeItem === 'function') {
        bridge.removeItem(key);
      }

      if (isSharedKey(key) && typeof gmApi.deleteValue === 'function') {
        gmApi.deleteValue(key);
      }

      if (isSharedKey(key) && typeof chromeStorage?.remove === 'function') {
        try { chromeStorage.remove(key); } catch {}
      }

      localStorage?.removeItem?.(key);
      postSharedStorageMessage(document, 'remove', key);
    },
  };
}
