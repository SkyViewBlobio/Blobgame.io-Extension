export const EMOTE_SKIN_ENABLED_KEY = 'blobio.emoteSkin.enabled';

export const EMOTE_SKIN_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '☺️', '😊', '😇', '🙂',
  '🙃', '😉', '😌', '😍', '😘', '😝',
  '🤑', '🤗', '🤓', '😎', '🤡', '🤠', '😏', '😒', '😣', '😭', '😱', '😴',
  '😡', '🥶', '💀', '👽', '👾', '🤖', '🎃', '😺', '😹', '👍', '👎', '🔥',
  '💙', '⚽️',
];

export const EMOTE_SKIN_TRIGGERS = [
  { id: 'cool', emoji: '😎', aliases: ['😎'], assetKey: 'cool', label: 'Cool' },
  { id: 'nice', emoji: '☺️', aliases: ['☺️', '☺'], assetKey: 'nice', label: 'Nice' },
  { id: 'hi', emoji: '🙂', aliases: ['🙂'], assetKey: 'hi', label: 'Hi' },
  { id: 'yo', emoji: '👽', aliases: ['👽'], assetKey: 'yo', label: 'Yo' },
  { id: 'thx', emoji: '👍', aliases: ['👍'], assetKey: 'thx', label: 'Thanks' },
  { id: 'why', emoji: '😣', aliases: ['😣'], assetKey: 'why', label: 'Why' },
  { id: 'pop', emoji: '⚽️', aliases: ['⚽️', '⚽'], assetKey: 'pop', label: 'Pop' },
  { id: 'wink-pop', emoji: '😉', aliases: ['😉'], assetKey: 'pop', label: 'Wink pop' },
];

export function isEmoteSkinEnabled(storage) {
  try {
    const value = storage?.getItem?.(EMOTE_SKIN_ENABLED_KEY);
    return value === '1' || value === true || String(value).toLowerCase() === 'true';
  } catch {
    return false;
  }
}

export function setEmoteSkinEnabled(storage, enabled) {
  try {
    storage?.setItem?.(EMOTE_SKIN_ENABLED_KEY, enabled ? '1' : '0');
  } catch {}
  return Boolean(enabled);
}

export function findEmoteTrigger(text) {
  const value = String(text || '');
  return EMOTE_SKIN_TRIGGERS.find((trigger) => (
    trigger.aliases.some((emoji) => value.includes(emoji))
  )) || null;
}
