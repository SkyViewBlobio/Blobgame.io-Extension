export const CHAT_SETTINGS_STYLE_ID = 'blobio-chat-settings-style';

export const CHAT_SETTINGS_CSS = `
.blobio-chat-settings-root {
  position: fixed;
  left: var(--blobio-chat-settings-left, 12px);
  top: var(--blobio-chat-settings-top, auto);
  bottom: var(--blobio-chat-settings-bottom, 12px);
  z-index: 80;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-family: Arial, sans-serif;
}

.blobio-chat-settings-toggle,
.blobio-chat-settings-category-button,
.blobio-chat-font-toggle {
  border: 1px solid rgba(130, 255, 166, 0.72);
  background: rgba(0, 0, 0, 0.74);
  color: #ecfff1;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.76), 0 0 12px rgba(77, 255, 126, 0.74);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 12px rgba(79, 255, 130, 0.26);
  cursor: pointer;
}

.blobio-chat-settings-toggle {
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 5px;
  font-size: 22px;
  font-weight: 900;
  line-height: 28px;
}

.blobio-chat-settings-panel {
  display: none;
  width: 250px;
  padding: 10px;
  border: 1px solid rgba(130, 255, 166, 0.62);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.78);
  box-shadow: inset 0 0 18px rgba(79, 255, 130, 0.11), 0 0 16px rgba(79, 255, 130, 0.24);
}

.blobio-chat-settings-root.is-open .blobio-chat-settings-panel {
  display: block;
}

.blobio-chat-settings-category-button {
  width: 100%;
  min-height: 34px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 800;
  text-align: left;
}

.blobio-chat-settings-category {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 10px;
  align-items: center;
  max-height: 0;
  margin-top: 0;
  opacity: 0;
  overflow: hidden;
  transform: translateY(-4px);
  transition: max-height 260ms ease, opacity 220ms ease, transform 260ms ease, margin-top 260ms ease;
}

.blobio-chat-settings-category.is-open {
  max-height: 150px;
  margin-top: 10px;
  opacity: 1;
  transform: translateY(0);
}

.blobio-chat-font-toggle {
  width: 52px;
  min-height: 28px;
  border-radius: 5px;
  color: #ffb0b0;
  font-size: 12px;
  font-weight: 900;
  text-shadow: 0 0 6px rgba(255, 48, 48, 0.54);
  transition: color 260ms ease, background-color 260ms ease, border-color 260ms ease, box-shadow 260ms ease, text-shadow 260ms ease;
}

.blobio-chat-font-toggle.is-enabled {
  color: #ecfff1;
  border-color: rgba(137, 255, 170, 0.9);
  background: rgba(11, 76, 35, 0.82);
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.84), 0 0 11px rgba(62, 255, 114, 0.9);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.2), 0 0 14px rgba(79, 255, 130, 0.42);
}

.blobio-chat-font-label {
  padding: 6px 8px;
  border: 1px solid rgba(130, 255, 166, 0.44);
  border-radius: 5px;
  background: rgba(3, 34, 18, 0.72);
  color: #ecfff1;
  font-size: 13px;
  font-weight: 800;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.7), 0 0 11px rgba(77, 255, 126, 0.7);
}

.blobio-chat-font-controls {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 58px;
  gap: 8px;
  align-items: center;
}

.blobio-chat-font-range {
  width: 100%;
  accent-color: rgb(74, 229, 111);
}

.blobio-chat-font-number {
  width: 58px;
  min-height: 28px;
  box-sizing: border-box;
  border: 1px solid rgba(130, 255, 166, 0.54);
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.76);
  color: #ecfff1;
  font-weight: 800;
  text-align: center;
  outline: none;
  box-shadow: inset 0 0 7px rgba(79, 255, 130, 0.12);
}

#chat.blobio-chat-font-size-enabled li,
#chat.blobio-chat-font-size-enabled li span {
  font-size: var(--blobio-chat-font-size, 16px) !important;
}

@media (prefers-reduced-motion: reduce) {
  .blobio-chat-settings-category,
  .blobio-chat-font-toggle {
    transition: none;
  }
}
`;
