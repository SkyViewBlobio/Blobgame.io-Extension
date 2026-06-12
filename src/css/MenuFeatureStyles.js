export function buildMenuCss({ className, hiddenClass, toolbarClass }) {
  return `
html.${className} .social {
  display: none !important;
}

html.${className} .${hiddenClass} {
  display: none !important;
}

html.${className} footer.footer {
  display: block !important;
  min-height: 150px !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

html.${className} footer.footer * {
  visibility: hidden !important;
  pointer-events: none !important;
}

html.${className} .blobio-main-menu-align-target {
  transform: translateX(-40px) !important;
  transition: transform 160ms ease;
}

html.${className} .aside.aside-2 {
  max-width: 260px !important;
  padding: 8px !important;
  font-size: 12px !important;
  line-height: 1.25 !important;
}

html.${className} .aside.aside-2 h1,
html.${className} .aside.aside-2 h2,
html.${className} .aside.aside-2 h3,
html.${className} .aside.aside-2 h4 {
  margin: 0 0 6px !important;
  font-size: 13px !important;
  line-height: 1.1 !important;
}

html.${className} .history-wrapper {
  max-height: 158px !important;
  overflow: auto !important;
  padding: 6px !important;
  border: 1px solid rgba(112, 255, 150, 0.24) !important;
  border-radius: 8px !important;
  background: rgba(0, 20, 12, 0.36) !important;
}

html.${className} img.inputs-background-img {
  display: none !important;
}

html.${className} .inputs-container input,
html.${className} .inputs-container .choose-skin-btn,
html.${className} .inputs-container button,
html.${className} #game-wrapper .custom-select,
html.${className} .progress-bar,
html.${className} .progress-bar-title {
  border: 1px solid rgba(142, 255, 174, 0.42) !important;
  border-radius: 8px !important;
  background-color: rgba(3, 28, 17, 0.46) !important;
  box-shadow: 0 0 13px rgba(79, 255, 130, 0.24), inset 0 0 10px rgba(79, 255, 130, 0.12) !important;
}

html.${className} .inputs-container input,
html.${className} .inputs-container .choose-skin-btn,
html.${className} .inputs-container button,
html.${className} #game-wrapper .custom-select-display,
html.${className} #game-wrapper .custom-select-option,
html.${className} .progress-bar,
html.${className} .progress-bar-title {
  color: #dfffe6 !important;
  fill: currentColor !important;
  font-weight: 700 !important;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.62) !important;
}

html.${className} #game-wrapper .custom-select-display {
  background: rgba(3, 28, 17, 0.46) !important;
}

html.${className} #game-wrapper .custom-select {
  position: relative !important;
}

html.${className} #game-wrapper .blobio-menu-layered-select {
  z-index: 6 !important;
}

html.${className} #game-wrapper .custom-select-option {
  background: rgba(3, 44, 23, 0.78) !important;
}

html.${className} .progress-bar {
  border: 1px solid rgba(142, 255, 174, 0.38) !important;
  background-color: rgba(3, 44, 23, 0.46) !important;
  box-shadow: 0 0 14px rgba(79, 255, 130, 0.24), inset 0 0 10px rgba(79, 255, 130, 0.12) !important;
}

html.${className} .progress-bar-title {
  background: transparent !important;
}

html.${className} #game-wrapper .custom-select-options {
  position: absolute !important;
  border: 1px solid rgba(142, 255, 174, 0.42) !important;
  border-radius: 8px !important;
  background: rgba(3, 44, 23, 0.92) !important;
  box-shadow: 0 0 13px rgba(79, 255, 130, 0.24), inset 0 0 10px rgba(79, 255, 130, 0.12) !important;
}

html.${className} #game-wrapper .blobio-menu-layered-select .custom-select-options {
  z-index: 7 !important;
}

html.${className} #game-wrapper .custom-select-option.selected,
html.${className} #game-wrapper .custom-select-option:hover {
  background: rgba(10, 69, 35, 0.7) !important;
}

html.${className} #ip-container {
  position: relative !important;
  z-index: 5 !important;
}

html.${className} app-settings,
html.${className} app-skins,
html.${className} app-profile,
html.${className} app-shop,
html.${className} .modal,
html.${className} .popup,
html.${className} .dialog,
html.${className} .cdk-overlay-container {
  position: relative !important;
  z-index: 40 !important;
}

html.${className} app-settings *,
html.${className} app-skins *,
html.${className} app-profile *,
html.${className} app-shop * {
  isolation: auto;
}

html.${className} #ip-container table {
  padding: 2px 8px !important;
  border: 1px solid rgba(142, 255, 174, 0.58) !important;
  border-radius: 9px !important;
  background: rgba(3, 44, 23, 0.48) !important;
  box-shadow: 0 0 16px rgba(79, 255, 130, 0.26), inset 0 0 10px rgba(79, 255, 130, 0.12) !important;
}

html.${className} #ip-container td {
  color: #dfffe6 !important;
  font-weight: 700 !important;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.58) !important;
}

html.${className} #custom-host-input {
  height: 24px !important;
  border: 1px solid rgba(142, 255, 174, 0.48) !important;
  border-radius: 6px !important;
  background: rgba(0, 0, 0, 0.62) !important;
  color: #effff1 !important;
  font-weight: 700 !important;
  text-align: center !important;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.72) !important;
  box-shadow: inset 0 0 8px rgba(79, 255, 130, 0.18) !important;
}

html.${className} .fleft.username {
  position: relative !important;
  color: transparent !important;
  text-shadow: none !important;
  white-space: nowrap !important;
}

html.${className} .fleft.username .blobio-username-animated {
  position: absolute;
  top: 0;
  left: 0;
  display: inline-flex;
  color: #dfffe6;
  line-height: inherit;
  white-space: nowrap;
  pointer-events: none;
  text-shadow: 0 0 7px rgba(118, 255, 154, 0.72);
}

html.${className} .fleft.username .blobio-username-animated .blobio-username-letter {
  display: inline-block;
  color: #dfffe6;
  transform-origin: center bottom;
  text-shadow: 0 0 7px rgba(118, 255, 154, 0.72);
  animation-name: blobio-username-letter-wave, blobio-username-all-glow;
  animation-duration: var(--blobio-username-duration, 5200ms), var(--blobio-username-duration, 5200ms);
  animation-timing-function: ease-in-out, ease-in-out;
  animation-iteration-count: infinite, infinite;
  animation-delay: var(--blobio-letter-delay, 0ms), var(--blobio-username-glow-delay, 0ms);
  will-change: transform, text-shadow, color;
}

.${toolbarClass} {
  position: relative;
  display: inline-block;
  margin-left: 0;
  vertical-align: top;
}

.${toolbarClass}.is-floating {
  position: fixed;
  left: 18px;
  bottom: 82px;
  margin-left: 0;
}

.blobio-menu-buttons {
  display: inline-block;
  position: relative;
  top: 0;
  white-space: nowrap;
}

.blobio-menu-button {
  background-size: 96% 96% !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
}

.blobio-menu-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.blobio-menu-panel {
  position: absolute;
  z-index: 2147482500;
  top: calc(100% + 8px);
  left: 0;
  width: min(380px, calc(100vw - 32px));
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px) scaleY(0.96);
  transform-origin: top;
  transition: max-height 190ms ease, opacity 160ms ease, transform 190ms ease;
  border: 1px solid rgba(134, 255, 171, 0.5);
  border-radius: 10px;
  background: linear-gradient(145deg, rgba(3, 31, 19, 0.96), rgba(1, 10, 7, 0.96));
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.48), 0 0 22px rgba(77, 255, 127, 0.3), inset 0 0 22px rgba(84, 255, 134, 0.08);
  color: #eaffee;
  backdrop-filter: blur(5px);
}

.blobio-menu-panel.is-open {
  max-height: 430px;
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scaleY(1);
}

.blobio-panel-inner {
  padding: 12px;
  border-radius: 9px;
  background: linear-gradient(180deg, rgba(95, 255, 132, 0.08), rgba(0, 0, 0, 0));
}

.blobio-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.blobio-panel-title {
  margin: 0;
  font-size: 15px;
  line-height: 1.1;
  color: #dfffe6;
  text-shadow: 0 0 8px rgba(118, 255, 154, 0.68);
}

.blobio-panel-close {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(255, 116, 116, 0.72);
  border-radius: 6px;
  background: rgba(102, 10, 16, 0.92);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 0 6px rgba(60, 0, 0, 0.95), 0 0 10px rgba(255, 42, 42, 0.55);
  box-shadow: 0 0 12px rgba(255, 49, 49, 0.26), inset 0 0 8px rgba(255, 89, 89, 0.18);
  cursor: pointer;
}

.blobio-panel-body {
  display: grid;
  gap: 10px;
}

.blobio-panel-section {
  padding: 10px;
  border: 1px solid rgba(142, 255, 174, 0.3);
  border-radius: 9px;
  background: linear-gradient(180deg, rgba(4, 45, 25, 0.52), rgba(0, 10, 7, 0.5));
  box-shadow: inset 0 0 14px rgba(79, 255, 130, 0.1);
}

.blobio-panel-section-title {
  margin: 0 0 9px;
  color: #dfffe6;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.1;
  text-align: center;
  text-shadow: 0 0 7px rgba(118, 255, 154, 0.66);
}

.blobio-video-link {
  display: block;
  color: #eaffee;
  text-decoration: none;
}

.blobio-video-thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border: 1px solid rgba(142, 255, 174, 0.38);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
}

.blobio-video-title {
  margin: 7px 0 0;
  font-size: 13px;
  line-height: 1.25;
}

.blobio-update-list {
  max-height: 318px;
  overflow: auto;
  display: grid;
  gap: 7px;
}

.blobio-update-entry {
  display: grid;
  grid-template-columns: 58px 1fr;
  gap: 8px;
  padding-bottom: 7px;
  border-bottom: 1px solid rgba(126, 255, 161, 0.12);
}

.blobio-update-date {
  color: #96ffad;
  font-size: 12px;
  font-weight: 700;
}

.blobio-update-items {
  margin: 0;
  padding-left: 15px;
  font-size: 12px;
  line-height: 1.3;
}

.blobio-social-title {
  margin: 2px 0 12px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #dfffdf;
  text-shadow: 0 0 8px rgba(95, 255, 132, 0.8), 0 0 20px rgba(95, 255, 132, 0.34);
  animation: blobio-social-glow 1700ms ease-in-out infinite alternate;
}

.blobio-social-row {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.blobio-social-link {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(139, 255, 171, 0.42);
  border-radius: 8px;
  background: rgba(3, 30, 17, 0.8);
  box-shadow: inset 0 0 8px rgba(91, 255, 132, 0.16);
}

.blobio-social-link:hover {
  box-shadow: 0 0 16px rgba(92, 255, 132, 0.38), inset 0 0 8px rgba(91, 255, 132, 0.18);
}

.blobio-social-link img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.blobio-footer-dock {
  position: fixed;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  z-index: 20;
  visibility: visible !important;
  pointer-events: auto !important;
}

.blobio-dock-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.blobio-dock-button {
  padding: 5px 11px;
  border: 1px solid rgba(142, 255, 174, 0.68);
  border-radius: 8px;
  background: rgba(3, 44, 23, 0.46);
  color: #dfffe6;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.1;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.7);
  box-shadow: 0 0 12px rgba(79, 255, 130, 0.22), inset 0 0 8px rgba(79, 255, 130, 0.13);
  cursor: pointer;
  transition: background 150ms ease, box-shadow 150ms ease;
}

.blobio-dock-button:hover,
.blobio-dock-button.is-active {
  background: rgba(10, 69, 35, 0.64);
  box-shadow: 0 0 16px rgba(99, 255, 142, 0.34), inset 0 0 10px rgba(99, 255, 142, 0.18);
}

.blobio-footer-modal-host {
  position: fixed;
  inset: 0;
  z-index: 2147482500;
  visibility: visible !important;
  pointer-events: none;
}

.blobio-footer-modal-host .blobio-menu-panel {
  position: fixed;
  top: 50%;
  right: auto;
  bottom: auto;
  left: 50%;
  width: min(520px, calc(100vw - 32px));
  max-height: 0;
  overflow: hidden;
  transform: translate(-50%, -48%) scale(0.96);
  transform-origin: center;
}

.blobio-footer-modal-host .blobio-menu-panel.is-open {
  max-height: min(520px, calc(100vh - 72px));
  overflow: auto;
  transform: translate(-50%, -50%) scale(1);
}

.blobio-policy-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.blobio-policy-link {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border: 1px solid rgba(142, 255, 174, 0.46);
  border-radius: 8px;
  background: rgba(3, 44, 23, 0.42);
  color: #eaffee;
  text-decoration: none;
  font-size: 12px;
  line-height: 1.2;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.52);
  box-shadow: inset 0 0 8px rgba(91, 255, 132, 0.14);
}

.blobio-policy-link:hover {
  color: #a8ffba;
}

.blobio-game-links {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.blobio-game-card {
  display: grid;
  justify-items: center;
  gap: 7px;
}

.blobio-game-label {
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 0 7px rgba(118, 255, 154, 0.72), 0 0 14px rgba(79, 255, 130, 0.32);
}

.blobio-game-link {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(142, 255, 174, 0.5);
  border-radius: 9px;
  background-color: rgba(3, 30, 17, 0.72);
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  box-shadow: inset 0 0 8px rgba(91, 255, 132, 0.16);
  cursor: pointer;
}

.blobio-game-link:hover {
  box-shadow: 0 0 16px rgba(92, 255, 132, 0.38), inset 0 0 8px rgba(91, 255, 132, 0.18);
}

html.${className} app-settings .blobio-extension-settings-tab {
  color: #dfffe6;
  font-weight: 800;
  text-shadow: 0 0 7px rgba(118, 255, 154, 0.72), 0 0 16px rgba(79, 255, 130, 0.28);
}

html.${className} app-settings .blobio-extension-settings-tab.active {
  color: #ffffff;
  text-shadow: 0 0 10px rgba(190, 255, 204, 0.94), 0 0 22px rgba(99, 255, 142, 0.48);
}

html.${className} app-settings .blobio-extension-settings-panel {
  display: none;
}

html.${className} app-settings.blobio-extension-settings-active .content-container > :not(.blobio-extension-settings-panel) {
  display: none !important;
}

html.${className} app-settings.blobio-extension-settings-active .inner-container {
  background: rgba(2, 32, 18, 0.9) !important;
  box-shadow: inset 0 0 22px rgba(79, 255, 130, 0.12), 0 0 18px rgba(79, 255, 130, 0.16) !important;
}

html.${className} app-settings.blobio-extension-settings-active .content-container {
  background: transparent !important;
}

html.${className} app-settings.blobio-extension-settings-active .right,
html.${className} app-settings.blobio-extension-settings-active .grid-container,
html.${className} app-settings.blobio-extension-settings-active .grid-item {
  background: rgba(2, 32, 18, 0.86) !important;
  color: #dfffe6 !important;
}

html.${className} app-settings.blobio-extension-settings-active .title,
html.${className} app-settings.blobio-extension-settings-active label {
  color: #dfffe6 !important;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.62) !important;
}

html.${className} app-settings.blobio-extension-settings-active input,
html.${className} app-settings.blobio-extension-settings-active select,
html.${className} app-settings.blobio-extension-settings-active textarea {
  border: 1px solid rgba(142, 255, 174, 0.4) !important;
  background: rgba(0, 0, 0, 0.58) !important;
  color: #dfffe6 !important;
  box-shadow: inset 0 0 8px rgba(91, 255, 132, 0.14) !important;
}

html.${className} app-settings.blobio-extension-settings-active .blobio-extension-settings-panel {
  display: grid;
}

html.${className} app-settings .blobio-extension-setting-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(142, 255, 174, 0.34);
  border-radius: 8px;
  background: rgba(4, 42, 23, 0.82);
  color: #dfffe6;
  font-weight: 700;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.62);
  box-shadow: 0 0 14px rgba(79, 255, 130, 0.18), inset 0 0 10px rgba(79, 255, 130, 0.1);
}

html.${className} app-settings .blobio-extension-setting-row .slider {
  border: 1px solid rgba(214, 255, 224, 0.72);
  background-color: rgba(23, 96, 48, 0.86);
  box-shadow: 0 0 12px rgba(118, 255, 154, 0.32), inset 0 0 7px rgba(255, 255, 255, 0.08);
}

html.${className} app-settings .blobio-extension-setting-row input:checked + .slider {
  background-color: rgba(92, 204, 112, 0.92);
  box-shadow: 0 0 16px rgba(118, 255, 154, 0.48), inset 0 0 8px rgba(255, 255, 255, 0.12);
}

html.${className} app-settings .blobio-extension-setting-row label[for="config-switch-watermark"] {
  color: #dfffe6;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.62);
}

html.${className} app-settings .blobio-extension-setting-row label[for="config-switch-custom-imgur-skin"] {
  color: #dfffe6;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.62);
}

.blobio-extension-tooltip {
  position: fixed;
  z-index: 2147483600;
  max-width: 280px;
  padding: 8px 10px;
  border: 1px solid rgba(142, 255, 174, 0.5);
  border-radius: 8px;
  background: rgba(2, 28, 16, 0.96);
  color: #eaffee;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.46);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.38), 0 0 16px rgba(79, 255, 130, 0.24);
  pointer-events: none;
}

html.${className} app-skins .blobio-custom-skin-tab {
  color: #dfffe6;
  font-weight: 800;
  text-shadow: 0 0 7px rgba(118, 255, 154, 0.72), 0 0 16px rgba(79, 255, 130, 0.28);
}

html.${className} app-skins .blobio-custom-skin-tab.active {
  color: #ffffff;
  text-shadow: 0 0 10px rgba(190, 255, 204, 0.94), 0 0 22px rgba(99, 255, 142, 0.48);
}

html.${className} app-skins .blobio-custom-skin-panel {
  display: none !important;
  padding: 10px 12px 12px !important;
  margin-top: -10px !important;
  min-height: 455px !important;
  height: calc(100% + 72px) !important;
  max-height: 560px !important;
  overflow-y: auto !important;
  box-sizing: border-box !important;
  border: 1px solid rgba(142, 255, 174, 0.42) !important;
  border-radius: 10px !important;
  background: linear-gradient(145deg, rgba(3, 31, 19, 0.94), rgba(1, 10, 7, 0.94)) !important;
  color: #dfffe6 !important;
  box-shadow: inset 0 0 22px rgba(79, 255, 130, 0.14), 0 0 18px rgba(79, 255, 130, 0.18) !important;
  scrollbar-width: thin;
  scrollbar-color: rgba(174, 255, 195, 0.46) rgba(5, 34, 19, 0.16);
}

html.${className} app-skins .blobio-custom-skin-panel::-webkit-scrollbar {
  width: 10px;
}

html.${className} app-skins .blobio-custom-skin-panel::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(5, 34, 19, 0.22);
  box-shadow: inset 0 0 8px rgba(79, 255, 130, 0.1);
}

html.${className} app-skins .blobio-custom-skin-panel::-webkit-scrollbar-thumb {
  border: 2px solid rgba(3, 31, 19, 0.58);
  border-radius: 999px;
  background: rgba(174, 255, 195, 0.42);
  box-shadow: 0 0 10px rgba(174, 255, 195, 0.68), inset 0 0 6px rgba(255, 255, 255, 0.22);
  outline: 1px solid rgba(210, 255, 220, 0.32);
}

html.${className} app-skins .blobio-custom-skin-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(190, 255, 204, 0.74);
  box-shadow: 0 0 12px rgba(155, 255, 181, 0.78), inset 0 0 7px rgba(255, 255, 255, 0.24);
}

html.${className} app-skins.blobio-custom-skin-active .skins-container:not(.blobio-custom-skin-panel) {
  display: none !important;
}

html.${className} app-skins.blobio-custom-skin-active .blobio-custom-skin-panel {
  display: block !important;
}

html.${className} app-skins.blobio-custom-skin-active .right > .inner-container,
html.${className} app-skins.blobio-custom-skin-active .inner-container.zero-top-left-border {
  min-height: 525px !important;
  height: auto !important;
  border: 1px solid rgba(142, 255, 174, 0.36) !important;
  border-radius: 10px !important;
  background: linear-gradient(145deg, rgba(3, 31, 19, 0.92), rgba(1, 10, 7, 0.92)) !important;
  box-shadow: inset 0 0 22px rgba(79, 255, 130, 0.12), 0 0 18px rgba(79, 255, 130, 0.14) !important;
}

html.${className} .blobio-custom-skin-controls {
  display: grid;
  gap: 5px;
  margin: -8px 0 8px;
}

html.${className} .blobio-custom-skin-input {
  width: min(440px, 100%);
  min-height: 30px;
  margin: 0 auto;
  padding: 5px 10px;
  border: 1px solid rgba(142, 255, 174, 0.46);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.58);
  color: #dfffe6;
  font-weight: 700;
  text-align: center;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.62);
  box-shadow: inset 0 0 8px rgba(91, 255, 132, 0.14);
}

html.${className} .blobio-custom-skin-input::placeholder {
  color: rgba(223, 255, 230, 0.72);
}

html.${className} .blobio-custom-skin-error {
  min-height: 14px;
  color: #ffaaa8;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  text-shadow: 0 0 6px rgba(148, 18, 18, 0.72);
}

html.${className} .blobio-custom-skin-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

html.${className} .blobio-custom-skin {
  cursor: pointer;
  border: 1px solid rgba(142, 255, 174, 0.24);
  border-radius: 8px;
  background: rgba(4, 42, 23, 0.82);
  color: #dfffe6;
  box-shadow: 0 0 14px rgba(79, 255, 130, 0.12), inset 0 0 10px rgba(79, 255, 130, 0.08);
  transition: box-shadow 160ms ease, transform 160ms ease;
}

html.${className} .blobio-custom-skin.is-selected {
  box-shadow: 0 0 18px rgba(99, 255, 142, 0.5), inset 0 0 10px rgba(99, 255, 142, 0.2);
  transform: translateY(-2px) scale(1.04);
}

html.${className} .blobio-custom-skin .title {
  color: #f2fff5 !important;
  font-weight: 800 !important;
  text-shadow: 0 0 7px rgba(118, 255, 154, 0.76), 0 0 16px rgba(79, 255, 130, 0.32) !important;
}

html.${className} .blobio-custom-skin.is-selected .title {
  color: #ffffff !important;
  text-shadow: 0 0 10px rgba(190, 255, 204, 0.96), 0 0 22px rgba(99, 255, 142, 0.52) !important;
}

html.${className} .blobio-custom-skin-actions {
  display: none;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
}

html.${className} .blobio-custom-skin-actions.is-visible {
  display: flex;
}

html.${className} .blobio-custom-skin-actions button {
  min-width: 84px;
  min-height: 30px;
  border: 1px solid rgba(142, 255, 174, 0.48);
  border-radius: 8px;
  background: rgba(3, 44, 23, 0.58);
  color: #dfffe6;
  font-weight: 800;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.62);
  box-shadow: 0 0 12px rgba(79, 255, 130, 0.2), inset 0 0 8px rgba(79, 255, 130, 0.12);
  transition: transform 150ms ease, box-shadow 150ms ease;
}

html.${className} .blobio-custom-skin-actions button:hover {
  transform: scale(1.04);
  box-shadow: 0 0 18px rgba(99, 255, 142, 0.38), inset 0 0 10px rgba(99, 255, 142, 0.18);
}

html.${className} .blobio-custom-skin-actions .blobio-custom-skin-action-remove {
  border-color: rgba(255, 116, 116, 0.72);
  background: rgba(102, 10, 16, 0.92);
  color: #fff;
  text-shadow: 0 0 6px rgba(60, 0, 0, 0.95), 0 0 10px rgba(255, 42, 42, 0.55);
  box-shadow: 0 0 13px rgba(255, 49, 49, 0.28), inset 0 0 8px rgba(255, 89, 89, 0.18);
}

html.${className} .blobio-custom-skin-actions .blobio-custom-skin-action-remove:hover {
  box-shadow: 0 0 20px rgba(255, 62, 62, 0.42), inset 0 0 10px rgba(255, 89, 89, 0.22);
}

html.${className} app-skins .blobio-custom-skin-notice-host {
  position: relative;
}

html.${className} .blobio-custom-skin-notice {
  position: fixed;
  left: 50%;
  top: 78px;
  transform: translateX(-50%);
  z-index: 2147483601;
  width: max-content;
  max-width: 90%;
  padding: 4px 11px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.2;
  pointer-events: none;
  text-align: center;
  white-space: nowrap;
}

html.${className} .blobio-custom-skin-notice.is-success {
  color: #dfffe6;
  border: 1px solid rgba(142, 255, 174, 0.62);
  background: rgba(3, 44, 23, 0.86);
  text-shadow: 0 0 8px rgba(118, 255, 154, 0.76), 0 0 18px rgba(79, 255, 130, 0.34);
  box-shadow: 0 0 16px rgba(79, 255, 130, 0.26), inset 0 0 10px rgba(79, 255, 130, 0.12);
}

html.${className} .blobio-custom-skin-notice.is-error {
  color: #ffaaa8;
  border: 1px solid rgba(255, 116, 116, 0.72);
  background: rgba(102, 10, 16, 0.9);
  text-shadow: 0 0 8px rgba(148, 18, 18, 0.78), 0 0 18px rgba(255, 42, 42, 0.38);
  box-shadow: 0 0 16px rgba(255, 49, 49, 0.3), inset 0 0 9px rgba(255, 89, 89, 0.18);
}

html.${className} .blobio-watermark-host {
  position: relative;
}

html.${className} .blobio-watermark {
  position: absolute;
  left: var(--blobio-watermark-left, 0px);
  top: var(--blobio-watermark-top, -6px);
  width: var(--blobio-watermark-width, 100%);
  margin: 0;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: 0;
  pointer-events: none;
  white-space: nowrap;
  z-index: 3;
  transform: translateY(-100%);
}

html.${className} .blobio-watermark-prefix {
  color: #dfffe6;
  text-shadow: 0 0 7px rgba(118, 255, 154, 0.72), 0 0 18px rgba(79, 255, 130, 0.28);
}

html.${className} .blobio-watermark-version {
  color: #dfffe6;
  text-shadow: 0 0 7px rgba(118, 255, 154, 0.72), 0 0 18px rgba(79, 255, 130, 0.28);
}

html.${className} .blobio-watermark-extension {
  position: relative;
  display: inline-block;
  color: transparent;
  background: linear-gradient(100deg, #baffc8 0%, #ffffff 38%, #dfffe6 58%, #64ff8b 100%);
  background-size: 160% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  text-shadow: 0 0 8px rgba(118, 255, 154, 0.34);
}

html.${className} .blobio-watermark-extension::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(196, 255, 209, 0), rgba(255, 255, 255, 0.95), rgba(99, 255, 139, 0.86), rgba(196, 255, 209, 0));
  transform-origin: left center;
  animation: blobio-watermark-underline 5000ms ease-in-out infinite;
}

@keyframes blobio-social-glow {
  from {
    transform: scale(1);
    text-shadow: 0 0 8px rgba(95, 255, 132, 0.74), 0 0 18px rgba(95, 255, 132, 0.28);
  }

  to {
    transform: scale(1.03);
    text-shadow: 0 0 12px rgba(172, 255, 187, 0.94), 0 0 26px rgba(95, 255, 132, 0.48);
  }
}

@keyframes blobio-watermark-underline {
  0% {
    opacity: 0;
    transform: scaleX(0);
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.9));
  }

  12% {
    opacity: 1;
    transform: scaleX(1);
    filter: drop-shadow(0 0 7px rgba(180, 255, 199, 0.95));
  }

  28% {
    opacity: 0;
    transform: scaleX(1);
    filter: drop-shadow(0 0 1px rgba(99, 255, 139, 0.2));
  }

  100% {
    opacity: 0;
    transform: scaleX(1);
    filter: drop-shadow(0 0 1px rgba(99, 255, 139, 0.2));
  }
}

@keyframes blobio-username-letter-wave {
  0%,
  4%,
  22%,
  100% {
    transform: translateY(0) scale(1);
    color: #dfffe6;
    text-shadow: 0 0 7px rgba(118, 255, 154, 0.72);
  }

  10% {
    transform: translateY(-2px) scale(1.22);
    color: #ffffff;
    text-shadow: 0 0 10px rgba(190, 255, 204, 0.94), 0 0 18px rgba(99, 255, 142, 0.54);
  }
}

@keyframes blobio-username-all-glow {
  0%,
  5%,
  18%,
  100% {
    text-shadow: 0 0 7px rgba(118, 255, 154, 0.72);
  }

  10% {
    text-shadow: 0 0 12px rgba(220, 255, 228, 1), 0 0 28px rgba(99, 255, 142, 0.82);
  }
}
`.trim();
}
