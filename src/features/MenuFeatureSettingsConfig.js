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
  friendHighlight: 'FPS-Impact: Low[5-15]\nLoad accepted friends from Blobgame and color their chat name and message green. Friend requests and declined users are ignored.',
  fpsUncap: 'FPS-Impact: Medium[0-80]\nUncap the in-game render loop after a safe startup delay, periodically yield to native frames, keep the game active when unfocused, and smooth camera zoom using the real frame delta. Off by default and applies immediately.',
  liteMode: 'FPS-Gain: Low[5-20]\nAdds CSS containment and offscreen rendering hints to heavy sections and third-party iframe surfaces without hiding videos or promos.',
  noTransitions: 'FPS-Gain: Medium[10-35]\nRemoves CSS transitions and animations from menus, panels, toasts, and modals. Expected save: low to medium smoothness gain.\n[WARNING: This is disabled by default because it will drastically reduce HUD-options.]',
  gameOverlay: 'FPS-Gain: Medium[10-40]\nGame client only. Isolates chat, leaderboard, score, lists, menu, and toast layout/paint from the rest of the page. Expected save: low to medium repaint gain.',
  toastModalAnim: 'FPS-Gain: Low[3-15]\nDisables toast and modal animation work while keeping the UI visible. Expected save: low gain, more noticeable during repeated popups.',
  chatGuard: 'FPS-Gain: Medium[10-60]\nKeeps chat usable but cut old chat rows in batches. Expected save: low normally, medium in full servers with many chatter.',
};
