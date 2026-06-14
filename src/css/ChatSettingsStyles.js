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
  gap: 10px;
  font-family: Arial, sans-serif;
}

.blobio-chat-settings-toggle,
.blobio-chat-settings-category-button,
.blobio-chat-font-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 1px solid rgba(130, 255, 166, 0.72);
  background: rgba(0, 0, 0, 0.74);
  color: #ecfff1;
  text-align: center;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.76), 0 0 12px rgba(77, 255, 126, 0.74);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 12px rgba(79, 255, 130, 0.26);
  cursor: pointer;
}

.blobio-chat-settings-toggle {
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 5px;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
}

.blobio-chat-settings-panel {
  display: none;
  width: 250px;
  box-sizing: border-box;
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
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  min-height: 34px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 800;
  transition: border-color 300ms ease, box-shadow 300ms ease, color 300ms ease;
}

.blobio-chat-settings-category-button::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(135deg, rgba(18, 104, 47, 0.9), rgba(47, 226, 101, 0.28) 58%, rgba(7, 43, 22, 0.82));
  opacity: 0;
  transition: opacity 340ms ease;
  pointer-events: none;
}

.blobio-chat-settings-category-button > span {
  position: relative;
  z-index: 1;
}

.blobio-chat-settings-category-button.has-active-setting {
  border-color: rgba(151, 255, 181, 0.96);
  box-shadow: inset 0 0 12px rgba(65, 255, 122, 0.2), 0 0 15px rgba(65, 255, 122, 0.42);
}

.blobio-chat-settings-category-button.has-active-setting::before {
  opacity: 1;
}

.blobio-chat-settings-category {
  position: absolute;
  left: calc(100% + 10px);
  top: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 10px;
  align-items: center;
  width: 330px;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid rgba(130, 255, 166, 0.62);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.82);
  box-shadow: inset 0 0 18px rgba(79, 255, 130, 0.11), 0 0 16px rgba(79, 255, 130, 0.24);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateX(-6px);
  transition: opacity 240ms ease, transform 280ms ease, visibility 0s linear 280ms;
}

.blobio-chat-settings-root.is-open .blobio-chat-settings-category.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateX(0);
  transition-delay: 0s;
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
  background: linear-gradient(135deg, rgba(13, 95, 41, 0.92), rgba(30, 157, 68, 0.76));
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.84), 0 0 11px rgba(62, 255, 114, 0.9);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.2), 0 0 14px rgba(79, 255, 130, 0.42);
}

.blobio-chat-font-label {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid rgba(130, 255, 166, 0.44);
  border-radius: 5px;
  background: rgba(3, 34, 18, 0.72);
  color: #ecfff1;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
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
  transition: opacity 220ms ease;
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
  transition: opacity 220ms ease, border-color 220ms ease;
}

.blobio-chat-font-range:disabled,
.blobio-chat-font-number:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

#chat.blobio-chat-font-size-enabled li,
#chat.blobio-chat-font-size-enabled li span {
  font-size: var(--blobio-chat-font-size, 16px) !important;
}


.blobio-chat-settings-category-button + .blobio-chat-settings-category-button {
  margin-top: 8px;
}

.blobio-muted-players-category {
  grid-template-columns: 52px 1fr;
}

.blobio-muted-players-label {
  justify-content: flex-start;
  text-align: left;
}

.blobio-muted-players-list {
  grid-column: 1 / -1;
  display: grid;
  gap: 7px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 3px;
}

.blobio-muted-players-empty {
  padding: 10px;
  border: 1px dashed rgba(130, 255, 166, 0.36);
  border-radius: 6px;
  color: rgba(236, 255, 241, 0.72);
  font-size: 12px;
  text-align: center;
}

.blobio-muted-player-chip {
  display: grid;
  gap: 2px;
  width: 100%;
  box-sizing: border-box;
  padding: 7px 9px;
  border: 1px solid rgba(130, 255, 166, 0.46);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #ecfff1;
  cursor: pointer;
  text-align: left;
  box-shadow: inset 0 0 8px rgba(79, 255, 130, 0.08);
  transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
}

.blobio-muted-player-chip:hover {
  border-color: rgba(151, 255, 181, 0.8);
}

.blobio-muted-player-chip.is-selected {
  border-color: rgba(111, 199, 255, 0.96);
  background: rgba(18, 73, 105, 0.78);
  box-shadow: inset 0 0 10px rgba(83, 188, 255, 0.18), 0 0 10px rgba(83, 188, 255, 0.3);
}

.blobio-muted-player-name {
  overflow: hidden;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blobio-muted-player-uid {
  color: rgba(213, 255, 225, 0.82);
  font-size: 12px;
  font-weight: 700;
}

.blobio-muted-player-name-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 5px 7px;
  border: 1px solid rgba(151, 255, 181, 0.88);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.82);
  color: #ffffff;
  font: inherit;
  outline: none;
}

.blobio-muted-players-actions {
  grid-column: 1 / -1;
  display: none;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.blobio-muted-players-actions.is-visible {
  display: grid;
}

.blobio-muted-player-action {
  min-height: 31px;
  border: 1px solid;
  border-radius: 5px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.blobio-muted-player-add-name {
  border-color: rgba(137, 255, 170, 0.9);
  background: linear-gradient(135deg, rgba(13, 95, 41, 0.95), rgba(30, 157, 68, 0.8));
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.25);
}

.blobio-muted-player-add-name:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.blobio-muted-player-unmute {
  border-color: rgba(255, 124, 124, 0.9);
  background: linear-gradient(135deg, rgba(112, 17, 17, 0.95), rgba(180, 43, 43, 0.82));
  box-shadow: 0 0 10px rgba(255, 67, 67, 0.22);
}

.blobio-chat-notification-host {
  position: fixed;
  z-index: 95;
  pointer-events: none;
  transform: translateY(-100%);
}

.blobio-chat-notification {
  box-sizing: border-box;
  width: 100%;
  padding: 9px 11px;
  border: 1px solid;
  border-radius: 7px;
  color: #ffffff;
  font: 700 12px/1.35 Arial, sans-serif;
  text-align: center;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 420ms ease, transform 420ms ease;
}

.blobio-chat-notification.is-success {
  border-color: rgba(137, 255, 170, 0.94);
  background: rgba(10, 91, 38, 0.94);
  box-shadow: 0 0 14px rgba(79, 255, 130, 0.4);
}

.blobio-chat-notification.is-error {
  border-color: rgba(255, 124, 124, 0.98);
  background: rgba(121, 13, 13, 0.96);
  box-shadow: 0 0 14px rgba(255, 54, 54, 0.48);
  animation: blobio-chat-error-flash 520ms ease-in-out 2;
}

.blobio-chat-notification.is-leaving {
  opacity: 0;
  transform: translateY(-6px);
}

.blobio-mute-player-action {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid rgba(137, 255, 170, 0.78);
  border-radius: 4px;
  background: rgba(11, 95, 39, 0.9);
  color: #ffffff;
  font: 800 12px Arial, sans-serif;
  cursor: pointer;
  text-align: center;
}

.blobio-mute-player-action:hover {
  background: rgba(24, 139, 61, 0.94);
}

@keyframes blobio-chat-error-flash {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.75); }
}

@media (prefers-reduced-motion: reduce) {
  .blobio-chat-settings-category,
  .blobio-chat-settings-category-button,
  .blobio-chat-settings-category-button::before,
  .blobio-chat-font-toggle,
  .blobio-chat-font-range,
  .blobio-chat-font-number,
  .blobio-muted-player-chip,
  .blobio-chat-notification {
    transition: none;
  }
}
`;
