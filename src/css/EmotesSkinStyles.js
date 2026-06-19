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
  max-height: min(360px, calc(100vh - 32px));
  padding: 8px;
  border: 1px solid rgba(142, 255, 174, 0.54);
  border-radius: 8px;
  background: rgba(2, 20, 12, 0.94);
  color: #e9ffed;
  overflow: auto;
  box-shadow: 0 0 20px rgba(73, 255, 130, 0.26), inset 0 0 20px rgba(73, 255, 130, 0.1);
}

.blobio-emote-skin-panel.is-open {
  display: block;
}

.blobio-emote-skin-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
  margin-bottom: 7px;
  padding: 5px 7px;
  border: 1px solid rgba(142, 255, 174, 0.34);
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.26);
  font: 700 12px/1.2 Ubuntu, Arial, sans-serif;
}

.blobio-emote-skin-toggle input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #6bff93;
}

.blobio-emote-skin-assets,
.blobio-emote-skin-emojis {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.blobio-emote-skin-assets {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(142, 255, 174, 0.28);
}

.blobio-emote-skin-asset,
.blobio-emote-skin-emoji {
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
}

.blobio-emote-skin-asset:hover,
.blobio-emote-skin-emoji:hover {
  border-color: rgba(204, 255, 216, 0.82);
  background: rgba(18, 70, 35, 0.86);
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

.blobio-emote-skin-overlay {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 2147482600;
  pointer-events: none;
}
`;
