const SHARED_KEY_PREFIX = 'blobio.customSkin.';

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

function isSharedKey(key) {
  return String(key || '').startsWith(SHARED_KEY_PREFIX);
}

export function createBlobioStorage(document = globalThis.document) {
  const localStorage = getLocalStorage(document);
  const gmApi = getGmApi(document);

  return {
    getItem(key) {
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
      if (isSharedKey(key) && typeof gmApi.setValue === 'function') {
        gmApi.setValue(key, nextValue);
      }

      localStorage?.setItem?.(key, nextValue);
    },

    removeItem(key) {
      if (isSharedKey(key) && typeof gmApi.deleteValue === 'function') {
        gmApi.deleteValue(key);
      }

      localStorage?.removeItem?.(key);
    },
  };
}
