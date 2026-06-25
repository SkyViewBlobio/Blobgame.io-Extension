export const EXTENSION_DEFAULT_CATEGORY = 'fps';

export const EXTENSION_SETTING_CATEGORIES = [
  ['fps', 'FPS'],
  ['cell', 'Cell'],
  ['text', 'Text'],
  ['theme', 'Theme'],
  ['animation', 'Animation'],
  ['misc', 'Misc'],
];

export const EXTENSION_OPTION_TOOLTIPS = {
  watermark: 'FPS-Impact: Low[1-5]\nThis option will display the Extension name text, alongside its current version.',
  hideAdminMd: 'FPS-Impact: Low[0-2]\nHide the built-in [MD] tag from extension ADMIN users in chat. This is enabled by default.',
  friendHighlight: 'FPS-Impact: Low[1-5]\nLoad accepted friends from Blobgame and color their chat name and message green. Friend requests and declined users are ignored.',
  fpsUncap: 'FPS-Impact: Medium[0-80]\nUnlocks the in-game frame rate after startup for smoother rendering and camera movement, especially on high-refresh-rate monitors. Includes safety handling and applies instantly. On weaker devices, this may lower FPS instead if the extra render load is too high.',
  liteMode: 'FPS-Gain: Low[5-20]\nAdds CSS containment and offscreen rendering hints to heavy sections and third-party iframe surfaces without hiding videos or promos.',
  noTransitions: 'FPS-Gain: Medium[10-35]\nRemoves CSS transitions and animations from menus, panels, toasts, and modals. Expected save: low to medium smoothness gain.\n[WARNING: This is disabled by default because it will drastically reduce HUD-options.]',
  gameOverlay: 'FPS-Gain: Medium[10-40]\nGame client only. Isolates chat, leaderboard, score, lists, menu, and toast layout/paint from the rest of the page. Expected save: low to medium repaint gain.',
  toastModalAnim: 'FPS-Gain: Low[3-15]\nReduces animation work from popups and modals while keeping them visible. Most useful when many ads appear.',
  chatGuard: 'FPS-Gain: Medium[10-60]\nLimits old chat messages so the chat stays usable without building up too much DOM load. Helps most on busy servers.',
};
