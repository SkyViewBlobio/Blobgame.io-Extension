export const EMOTE_SKIN_STYLE_ID = 'blobio-emote-skin-style';

export const EMOTE_SKIN_CSS = `
.blobio-emote-skin-button {
  position: fixed;
  z-index: 2147483000;
  display: none;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid rgba(175, 255, 198, 0.58);
  border-radius: 7px;
  background: rgba(1, 18, 10, 0.78);
  color: #f3fff5;
  font-size: 17px;
  line-height: 24px;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 0 12px rgba(73, 255, 130, 0.28), inset 0 0 9px rgba(73, 255, 130, 0.12);
}

.blobio-emote-skin-button.is-visible {
  display: block;
}

.blobio-emote-skin-button:hover,
.blobio-emote-skin-button.is-open {
  border-color: rgba(204, 255, 216, 0.9);
  box-shadow: 0 0 16px rgba(73, 255, 130, 0.42), inset 0 0 12px rgba(73, 255, 130, 0.18);
}

.blobio-emote-skin-panel {
  position: fixed;
  z-index: 2147483001;
  display: none;
  box-sizing: border-box;
  width: min(330px, calc(100vw - 24px));
  max-height: min(380px, calc(100vh - 32px));
  padding: 10px;
  border: 1px solid rgba(142, 255, 174, 0.62);
  border-radius: 8px;
  background: rgba(2, 20, 12, 0.94);
  color: #e9ffed;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  box-shadow: 0 0 20px rgba(73, 255, 130, 0.26), inset 0 0 20px rgba(73, 255, 130, 0.1);
}

.blobio-emote-skin-panel::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.blobio-emote-skin-panel.is-open {
  display: block;
}

.blobio-emote-skin-toggle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  margin-bottom: 8px;
  padding: 7px 42px 7px 12px;
  border: 1px solid rgba(182, 255, 201, 0.7);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(121, 255, 157, 0.24), rgba(17, 70, 32, 0.72)),
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.24), transparent 58%);
  color: #f4fff6;
  font: 800 18px/1.15 Ubuntu, Arial, sans-serif;
  text-align: center;
  cursor: pointer;
  text-shadow: 0 0 8px rgba(118, 255, 153, 0.62);
  box-shadow: 0 0 18px rgba(73, 255, 130, 0.32), inset 0 0 16px rgba(73, 255, 130, 0.18);
}

.blobio-emote-skin-toggle input {
  position: absolute;
  right: 12px;
  top: 50%;
  width: 18px;
  height: 18px;
  margin: 0;
  transform: translateY(-50%);
  accent-color: #6bff93;
}

.blobio-emote-skin-assets,
.blobio-emote-skin-emojis {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.blobio-emote-skin-assets {
  max-height: 0;
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: 1px solid transparent;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  transform: translateY(-6px);
  transition: max-height 240ms ease, margin-bottom 240ms ease, padding-bottom 240ms ease, opacity 180ms ease, transform 240ms ease, border-color 240ms ease;
}

.blobio-emote-skin-panel.is-skin-enabled .blobio-emote-skin-assets {
  max-height: 96px;
  margin-bottom: 9px;
  padding-bottom: 9px;
  border-bottom-color: rgba(142, 255, 174, 0.28);
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.blobio-emote-skin-emojis {
  padding: 8px 8px 10px;
  overflow: visible;
}

.blobio-emote-skin-asset,
.blobio-emote-skin-emoji {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid rgba(142, 255, 174, 0.28);
  border-radius: 7px;
  background: rgba(7, 35, 19, 0.7);
  color: #ffffff;
  cursor: pointer;
  line-height: 1;
  transform-origin: center;
  transition: transform 130ms ease, box-shadow 130ms ease, border-color 130ms ease, background-color 130ms ease;
}

.blobio-emote-skin-asset:hover {
  z-index: 3;
  border-color: rgba(224, 255, 232, 0.94);
  background: rgba(18, 70, 35, 0.92);
  box-shadow: 0 0 16px rgba(91, 255, 139, 0.48), inset 0 0 10px rgba(91, 255, 139, 0.2);
  transform: scale(1.85);
}

.blobio-emote-skin-asset img {
  display: block;
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.blobio-emote-skin-emoji {
  font-size: 20px;
}

.blobio-emote-skin-emoji:hover {
  z-index: 3;
  border-color: rgba(224, 255, 232, 0.94);
  background: rgba(18, 70, 35, 0.92);
  box-shadow: 0 0 16px rgba(91, 255, 139, 0.48), inset 0 0 10px rgba(91, 255, 139, 0.2);
  transform: scale(1.85);
}

.blobio-emote-skin-overlay {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 2147482600;
  pointer-events: none;
}
`;
