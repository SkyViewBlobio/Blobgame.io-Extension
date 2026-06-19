export function getTampermonkeyPageWindow(windowRef = globalThis) {
  if (windowRef?.unsafeWindow && typeof windowRef.unsafeWindow === 'object') {
    return windowRef.unsafeWindow;
  }

  if (globalThis.unsafeWindow && typeof globalThis.unsafeWindow === 'object') {
    return globalThis.unsafeWindow;
  }

  return windowRef || globalThis;
}
