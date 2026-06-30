export function buildMenuCss({ className, hiddenClass }) {
  return `
html.${className} .social {
  display: none !important;
}

html.${className} .${hiddenClass} {
  display: none !important;
}

html.${className} body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 2147482200;
  pointer-events: none;
  border: 3px solid rgba(145, 255, 170, 0.68);
  border-radius: 0;
  box-shadow:
    inset 0 0 22px rgba(84, 255, 136, 0.36),
    inset 0 0 80px rgba(61, 196, 118, 0.18),
    0 0 22px rgba(84, 255, 136, 0.24);
  background:
    linear-gradient(90deg, rgba(93, 255, 137, 0.08), rgba(93, 255, 137, 0) 13%, rgba(93, 255, 137, 0) 87%, rgba(93, 255, 137, 0.08)),
    linear-gradient(180deg, rgba(93, 255, 137, 0.1), rgba(93, 255, 137, 0) 15%, rgba(93, 255, 137, 0) 85%, rgba(93, 255, 137, 0.12));
}

html.${className}.blobio-macos body::before,
body.${className}.blobio-macos::before {
  inset: 0 0 3px;
  border-radius: 0 0 24px 24px;
}

html.${className} footer.footer {
  display: block !important;
  min-height: 96px !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

html.${className} footer.footer * {
  visibility: hidden !important;
  pointer-events: none !important;
}

html.${className} .progress-bar {
  height: 29px !important;
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

html.${className} #game-wrapper .custom-select-option.selected,
html.${className} #game-wrapper .custom-select-option:hover {
  background: rgba(10, 69, 35, 0.7) !important;
}

html.${className} #ip-container {
  position: relative !important;
  z-index: 5 !important;
}

html.${className} .blobio-center-align {
  transform: translateX(-22px) !important;
}

html.${className} app-settings,
html.${className} app-skins,
html.${className} app-shop {
  position: relative !important;
  z-index: 900 !important;
}

html.${className} app-settings *,
html.${className} app-skins *,
html.${className} app-profile *,
html.${className} app-shop * {
  isolation: auto;
}

html.${className} app-settings .custom-select-options,
html.${className} app-skins .custom-select-options,
html.${className} app-profile .custom-select-options,
html.${className} app-shop .custom-select-options {
  z-index: 901 !important;
}

html.${className} #profile-modal {
  z-index: 900 !important;
  box-sizing: border-box !important;
  overflow: visible !important;
  border: 2px solid rgba(142, 255, 174, 0.64) !important;
  outline: 1px solid rgba(213, 255, 224, 0.36) !important;
  outline-offset: 2px !important;
  border-radius: 12px !important;
  background: linear-gradient(145deg, rgba(3, 31, 19, 0.94), rgba(1, 10, 7, 0.94)) !important;
  box-shadow: inset 0 0 24px rgba(79, 255, 130, 0.14), 0 0 25px rgba(79, 255, 130, 0.36), 0 0 7px rgba(194, 255, 210, 0.42) !important;
}

html.${className} #profile-modal app-profile {
  display: flex !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: min(700px, calc(100vw - 32px)) !important;
  border: 0 !important;
  outline: 0 !important;
  border-radius: inherit !important;
  background: transparent !important;
  box-shadow: none !important;
}

html.${className} #profile-modal .profile-records {
  flex: 1 1 390px !important;
  min-width: 390px !important;
  box-sizing: border-box !important;
}

html.${className} #profile-modal .profile-records-title,
html.${className} #profile-modal .profile-records-list,
html.${className} #profile-modal .profile-records-list table {
  width: 100% !important;
  box-sizing: border-box !important;
}

html.${className} #profile-modal .profile-records-title-userid,
html.${className} #profile-modal .profile-records-title-text,
html.${className} #profile-modal .profile-records-list th,
html.${className} #profile-modal .profile-records-list td {
  white-space: nowrap !important;
}

html.${className} #profile-modal .profile-records-list table {
  table-layout: auto !important;
  border-collapse: collapse !important;
}

html.${className} #profile-modal .profile-records-list th:first-child,
html.${className} #profile-modal .profile-records-list td:first-child {
  width: 48% !important;
  text-align: left !important;
}

html.${className} #profile-modal .profile-records-list .rtd {
  min-width: 92px !important;
  text-align: right !important;
}

@media (max-width: 740px) {
  html.${className} #profile-modal app-profile {
    min-width: calc(100vw - 20px) !important;
  }

  html.${className} #profile-modal .profile-records {
    min-width: 0 !important;
  }
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

.blobio-menu-panel {
  position: absolute;
  z-index: 2147482500;
  top: calc(100% + 10px);
  right: 0;
  left: auto;
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
  position: relative;
  z-index: 2;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
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
  pointer-events: auto;
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

.blobio-featured-dock {
  position: fixed;
  left: 18px;
  bottom: 96px;
  z-index: 0;
  width: min(292px, calc(100vw - 36px));
  visibility: visible !important;
  pointer-events: auto !important;
}

.blobio-featured-link {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 10px;
  align-items: center;
  padding: 9px;
  border: 1px solid rgba(142, 255, 174, 0.3);
  border-radius: 12px;
  background: rgba(4, 22, 13, 0.72);
  color: #eaffee;
  text-decoration: none;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.28), inset 0 0 14px rgba(91, 255, 132, 0.08);
  backdrop-filter: blur(5px);
}

.blobio-featured-link:hover {
  border-color: rgba(166, 255, 190, 0.48);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.3), 0 0 18px rgba(92, 255, 132, 0.22), inset 0 0 14px rgba(91, 255, 132, 0.1);
}

.blobio-featured-thumb {
  width: 96px;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border: 1px solid rgba(142, 255, 174, 0.3);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
}

.blobio-featured-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.blobio-featured-eyebrow {
  color: #96ffad;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.blobio-featured-title {
  overflow: hidden;
  color: #eaffee;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.blobio-footer-dock {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  visibility: visible !important;
  pointer-events: auto !important;
  padding: 14px 42px 16px;
  border-top: 1px solid rgba(142, 255, 174, 0.12);
  background: rgba(4, 22, 13, 0.76);
  box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(180, 255, 198, 0.06);
  backdrop-filter: blur(6px);
}

.blobio-dock-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  width: 100%;
}

.blobio-footer-links,
.blobio-footer-socials {
  display: flex;
  align-items: center;
  gap: 12px;
}

.blobio-dock-button {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #dfffe6;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.1;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.42);
  box-shadow: none;
  cursor: pointer;
  opacity: 0.72;
  transition: color 150ms ease, opacity 150ms ease;
}

.blobio-dock-button:hover,
.blobio-dock-button.is-active {
  background: transparent;
  color: #ffffff;
  opacity: 1;
  box-shadow: none;
}

.blobio-footer-social-link {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(139, 255, 171, 0.28);
  border-radius: 8px;
  background: rgba(3, 30, 17, 0.52);
  box-shadow: inset 0 0 8px rgba(91, 255, 132, 0.1);
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}

.blobio-footer-social-link:hover {
  border-color: rgba(166, 255, 190, 0.5);
  box-shadow: 0 0 14px rgba(92, 255, 132, 0.24), inset 0 0 8px rgba(91, 255, 132, 0.14);
  transform: translateY(-1px);
}

.blobio-footer-social-link img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.blobio-footer-version {
  white-space: nowrap;
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

@media (max-width: 760px) {
  .blobio-featured-dock {
    right: 12px;
    bottom: 82px;
    left: 12px;
    width: auto;
  }

  .blobio-featured-link {
    grid-template-columns: 82px 1fr;
  }

  .blobio-featured-thumb {
    width: 82px;
  }

  .blobio-footer-dock {
    padding: 10px 14px 12px;
  }

  .blobio-dock-buttons {
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px 14px;
  }

  .blobio-footer-links {
    order: 1;
  }

  .blobio-footer-socials {
    order: 3;
  }

  .blobio-footer-version {
    order: 2;
  }
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

html.${className} app-settings .inner-container.zero-top-left-border,
html.${className} app-settings .right > .inner-container {
  box-sizing: border-box !important;
  border: 2px solid rgba(142, 255, 174, 0.54) !important;
  outline: 1px solid rgba(213, 255, 224, 0.26) !important;
  outline-offset: 1px !important;
  border-radius: 10px !important;
  box-shadow: inset 0 0 22px rgba(79, 255, 130, 0.12), 0 0 20px rgba(79, 255, 130, 0.24), 0 0 4px rgba(194, 255, 210, 0.28) !important;
}

html.${className} app-settings.blobio-extension-settings-active .body {
  align-items: stretch !important;
}

html.${className} app-settings.blobio-extension-settings-active .right {
  display: flex !important;
  flex: 1 1 auto !important;
  flex-direction: column !important;
  align-self: stretch !important;
  min-height: 0 !important;
}

html.${className} app-settings.blobio-extension-settings-active .right > .inner-container,
html.${className} app-settings.blobio-extension-settings-active .inner-container.zero-top-left-border {
  display: flex !important;
  flex: 0 0 auto !important;
  flex-direction: column !important;
  align-self: stretch !important;
  min-height: 0 !important;
  height: var(--blobio-extension-settings-panel-height, auto) !important;
  max-height: var(--blobio-extension-settings-panel-height, 100%) !important;
  margin-bottom: 6px !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

html.${className} app-settings.blobio-extension-settings-active .content-container {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: auto !important;
  max-height: 100% !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  box-sizing: border-box !important;
}

html.${className} app-settings.blobio-extension-settings-active .content-container > :not(.blobio-extension-settings-panel) {
  display: none !important;
}

html.${className} app-settings.blobio-extension-settings-active .inner-container {
  background: rgba(2, 32, 18, 0.9) !important;
  box-shadow: inset 0 0 24px rgba(79, 255, 130, 0.14), 0 0 22px rgba(79, 255, 130, 0.26), 0 0 5px rgba(194, 255, 210, 0.3) !important;
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
  display: flex;
  flex-direction: column;
  min-height: 100%;
  box-sizing: border-box;
}

html.${className} app-settings .blobio-extension-category-tabs {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
  flex: 0 0 auto;
  padding: 8px 8px 5px;
  border-bottom: 1px solid rgba(142, 255, 174, 0.28);
  background: rgba(1, 24, 13, 0.74);
  box-sizing: border-box;
}

html.${className} app-settings .blobio-extension-category-button {
  min-width: 0;
  padding: 7px 4px;
  border: 1px solid rgba(142, 255, 174, 0.34);
  border-radius: 7px;
  outline: none;
  background: rgba(3, 39, 21, 0.78);
  color: #bcefc8;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  text-align: center;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.5);
  box-shadow: inset 0 0 8px rgba(79, 255, 130, 0.08);
  cursor: pointer;
}

html.${className} app-settings .blobio-extension-category-button:hover,
html.${className} app-settings .blobio-extension-category-button:focus-visible {
  border-color: rgba(196, 255, 211, 0.72);
  color: #effff2;
  box-shadow: 0 0 11px rgba(79, 255, 130, 0.22), inset 0 0 8px rgba(79, 255, 130, 0.12);
}

html.${className} app-settings .blobio-extension-category-button.is-active {
  border-color: rgba(210, 255, 220, 0.88);
  background: rgba(11, 74, 38, 0.9);
  color: #ffffff;
  text-shadow: 0 0 9px rgba(196, 255, 210, 0.92);
  box-shadow: 0 0 13px rgba(79, 255, 130, 0.34), inset 0 0 10px rgba(79, 255, 130, 0.14);
}

html.${className} app-settings .blobio-extension-category-panel {
  display: none;
  align-content: start;
  flex: 1 1 auto;
  min-height: 0;
  padding: 7px 8px 10px;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
}

html.${className} app-settings .blobio-extension-category-panel.is-active {
  display: grid;
}

html.${className} app-settings .blobio-extension-category-panel[hidden] {
  display: none !important;
}

html.${className} app-settings .blobio-extension-setting-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 34px;
  align-items: center;
  gap: 10px;
  grid-column: 1 / -1;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(142, 255, 174, 0.34);
  border-radius: 8px;
  background: rgba(4, 42, 23, 0.82);
  color: #dfffe6;
  font-weight: 700;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.62);
  box-shadow: 0 0 14px rgba(79, 255, 130, 0.18), inset 0 0 10px rgba(79, 255, 130, 0.1);
  box-sizing: border-box;
}

html.${className} app-settings .blobio-extension-row-spacer {
  display: block;
  width: 32px;
  height: 32px;
}

html.${className} app-settings .blobio-admin-only-setting-row.is-hidden {
  display: none !important;
}

html.${className} app-settings .blobio-jelly-setting-group {
  display: grid;
  grid-column: 1 / -1;
  gap: 8px;
  min-width: 0;
}

html.${className} app-settings .blobio-jelly-setting-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 34px;
  width: 100%;
  box-sizing: border-box;
}

html.${className} app-settings .blobio-jelly-dropdown-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(130, 255, 166, 0.72);
  border-radius: 5px;
  outline: none;
  background: rgba(0, 0, 0, 0.74);
  color: #ecfff1;
  text-align: center;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.76), 0 0 12px rgba(77, 255, 126, 0.74);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 12px rgba(79, 255, 130, 0.26);
  cursor: pointer;
}

html.${className} app-settings .blobio-jelly-dropdown-button:hover,
html.${className} app-settings .blobio-jelly-dropdown-button:focus-visible {
  border-color: rgba(151, 255, 181, 0.96);
  box-shadow: inset 0 0 11px rgba(79, 255, 130, 0.18), 0 0 15px rgba(79, 255, 130, 0.42);
}

html.${className} app-settings .blobio-jelly-dropdown-symbol {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 1px;
  color: inherit;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-shadow: inherit;
  pointer-events: none;
}

html.${className} app-settings .blobio-jelly-button-menu {
  display: grid;
  gap: 9px;
  width: 100%;
  min-width: 0;
  padding: 11px;
  border: 1px solid rgba(142, 255, 174, 0.38);
  border-radius: 9px;
  background: linear-gradient(145deg, rgba(3, 31, 19, 0.94), rgba(1, 10, 7, 0.94));
  box-shadow: inset 0 0 18px rgba(79, 255, 130, 0.12), 0 0 14px rgba(79, 255, 130, 0.16);
  box-sizing: border-box;
}

html.${className} app-settings .blobio-jelly-button-menu[hidden] {
  display: none !important;
}

html.${className} app-settings .blobio-jelly-option-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
  text-shadow: 0 0 7px rgba(77, 255, 126, 0.5);
  cursor: pointer;
}

html.${className} app-settings .blobio-jelly-option-row input {
  width: 16px !important;
  height: 16px !important;
  margin: 0 !important;
  accent-color: rgb(74, 229, 111);
}

html.${className} app-settings .blobio-cell-mass-setting-group {
  display: grid;
  grid-column: 1 / -1;
  gap: 8px;
  min-width: 0;
}

html.${className} app-settings .blobio-cell-mass-setting-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 34px;
  width: 100%;
  box-sizing: border-box;
}

html.${className} app-settings .blobio-cell-mass-dropdown-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(130, 255, 166, 0.72);
  border-radius: 5px;
  outline: none;
  background: rgba(0, 0, 0, 0.74);
  color: #ecfff1;
  text-align: center;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.76), 0 0 12px rgba(77, 255, 126, 0.74);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 12px rgba(79, 255, 130, 0.26);
  cursor: pointer;
}

html.${className} app-settings .blobio-cell-mass-dropdown-button:hover,
html.${className} app-settings .blobio-cell-mass-dropdown-button:focus-visible {
  border-color: rgba(151, 255, 181, 0.96);
  box-shadow: inset 0 0 11px rgba(79, 255, 130, 0.18), 0 0 15px rgba(79, 255, 130, 0.42);
}

html.${className} app-settings .blobio-cell-mass-dropdown-symbol {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 1px;
  color: inherit;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-shadow: inherit;
  pointer-events: none;
}

html.${className} app-settings .blobio-cell-mass-button-menu {
  display: grid;
  gap: 9px;
  width: 100%;
  min-width: 0;
  max-height: 520px;
  padding: 11px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid rgba(142, 255, 174, 0.38);
  border-radius: 9px;
  background: linear-gradient(145deg, rgba(3, 31, 19, 0.94), rgba(1, 10, 7, 0.94));
  box-shadow: inset 0 0 18px rgba(79, 255, 130, 0.12), 0 0 14px rgba(79, 255, 130, 0.16);
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 232, 133, 0.88) rgba(0, 18, 10, 0.72);
}

html.${className} app-settings .blobio-cell-mass-button-menu[hidden] {
  display: none !important;
}

html.${className} app-settings .blobio-cell-mass-section-title {
  display: grid;
  grid-template-columns: minmax(16px, 1fr) auto minmax(16px, 1fr);
  align-items: center;
  gap: 8px;
  margin-top: 5px;
  padding: 4px 0;
  color: #c8ffd4;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.2;
  text-align: center;
  text-shadow: 0 0 7px rgba(77, 255, 126, 0.5);
}

html.${className} app-settings .blobio-cell-mass-section-title::before,
html.${className} app-settings .blobio-cell-mass-section-title::after {
  content: "";
  height: 1px;
  background: linear-gradient(90deg, rgba(112, 255, 153, 0), rgba(112, 255, 153, 0.68));
  box-shadow: 0 0 7px rgba(79, 255, 130, 0.26);
}

html.${className} app-settings .blobio-cell-mass-section-title::after {
  background: linear-gradient(90deg, rgba(112, 255, 153, 0.68), rgba(112, 255, 153, 0));
}

html.${className} app-settings .blobio-cell-mass-checkbox-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

html.${className} app-settings .blobio-cell-mass-checkbox-row input {
  width: 16px !important;
  height: 16px !important;
  margin: 0 !important;
  accent-color: rgb(74, 229, 111);
}

html.${className} app-settings .blobio-cell-mass-mode-row,
html.${className} app-settings .blobio-cell-mass-slider-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(110px, 1.2fr) 54px;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
}

html.${className} app-settings .blobio-cell-mass-mode-row {
  grid-template-columns: minmax(0, 1fr) 156px;
}

html.${className} app-settings .blobio-cell-mass-preset-mode-button {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  height: 30px;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(147, 255, 177, 0.58);
  border-radius: 999px;
  background: rgba(0, 18, 10, 0.82);
  color: #ecfff1;
  font: inherit;
  cursor: pointer;
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 9px rgba(79, 255, 130, 0.2);
}

html.${className} app-settings .blobio-cell-mass-preset-mode-button::before {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / 3);
  content: "";
  border-radius: 999px;
  background: linear-gradient(145deg, rgba(184, 255, 202, 0.96), rgba(47, 198, 94, 0.92));
  box-shadow: 0 0 9px rgba(79, 255, 130, 0.5), inset 0 0 7px rgba(255, 255, 255, 0.28);
  transform: translateX(0);
  transition: transform 180ms ease;
}

html.${className} app-settings .blobio-cell-mass-preset-mode-button.is-vip::before {
  transform: translateX(100%);
}

html.${className} app-settings .blobio-cell-mass-preset-mode-button.is-custom::before {
  transform: translateX(200%);
}

html.${className} app-settings .blobio-cell-mass-preset-mode-text {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 100%;
  padding: 0 6px;
  color: rgba(236, 255, 241, 0.74);
  font-size: 11px;
  line-height: 1;
  text-align: center;
  transition: color 180ms ease, text-shadow 180ms ease;
  pointer-events: none;
}

html.${className} app-settings .blobio-cell-mass-preset-mode-button.is-normal .blobio-cell-mass-preset-mode-text.is-normal,
html.${className} app-settings .blobio-cell-mass-preset-mode-button.is-vip .blobio-cell-mass-preset-mode-text.is-vip,
html.${className} app-settings .blobio-cell-mass-preset-mode-button.is-custom .blobio-cell-mass-preset-mode-text.is-custom {
  color: #06210f;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.38);
}

html.${className} app-settings .blobio-cell-mass-slider-input {
  width: 100%;
  min-width: 0;
  height: 18px;
  margin: 0;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
}

html.${className} app-settings .blobio-cell-mass-slider-input::-webkit-slider-runnable-track {
  height: 6px;
  border: 1px solid rgba(147, 255, 177, 0.62);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(13, 76, 34, 0.94), rgba(91, 238, 124, 0.94));
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.58), 0 0 8px rgba(79, 255, 130, 0.28);
}

html.${className} app-settings .blobio-cell-mass-slider-input::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border: 1px solid rgba(225, 255, 233, 0.96);
  border-radius: 50%;
  appearance: none;
  -webkit-appearance: none;
  background: linear-gradient(145deg, #c5ffd2, #37cb69);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.72), inset 0 0 5px rgba(255, 255, 255, 0.42);
}

html.${className} app-settings .blobio-cell-mass-slider-input::-moz-range-track {
  height: 6px;
  border: 1px solid rgba(147, 255, 177, 0.62);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(13, 76, 34, 0.94), rgba(91, 238, 124, 0.94));
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.58), 0 0 8px rgba(79, 255, 130, 0.28);
}

html.${className} app-settings .blobio-cell-mass-slider-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 1px solid rgba(225, 255, 233, 0.96);
  border-radius: 50%;
  background: linear-gradient(145deg, #c5ffd2, #37cb69);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.72), inset 0 0 5px rgba(255, 255, 255, 0.42);
}

html.${className} app-settings .blobio-cell-mass-slider-value {
  color: #c8ffd4;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

html.${className} app-settings .blobio-fps-saver-setting-group {
  display: grid;
  grid-column: 1 / -1;
  gap: 8px;
  min-width: 0;
}

html.${className} app-settings .blobio-fps-saver-setting-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 34px;
  width: 100%;
  box-sizing: border-box;
}

html.${className} app-settings .blobio-fps-saver-dropdown-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(130, 255, 166, 0.72);
  border-radius: 5px;
  outline: none;
  background: rgba(0, 0, 0, 0.74);
  color: #ecfff1;
  text-align: center;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.76), 0 0 12px rgba(77, 255, 126, 0.74);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 12px rgba(79, 255, 130, 0.26);
  cursor: pointer;
}

html.${className} app-settings .blobio-fps-saver-dropdown-button:hover,
html.${className} app-settings .blobio-fps-saver-dropdown-button:focus-visible {
  border-color: rgba(151, 255, 181, 0.96);
  box-shadow: inset 0 0 11px rgba(79, 255, 130, 0.18), 0 0 15px rgba(79, 255, 130, 0.42);
}

html.${className} app-settings .blobio-fps-saver-dropdown-symbol {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 1px;
  color: inherit;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-shadow: inherit;
  pointer-events: none;
}

html.${className} app-settings .blobio-fps-saver-button-menu {
  display: grid;
  gap: 9px;
  width: 100%;
  min-width: 0;
  max-height: 520px;
  padding: 11px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid rgba(142, 255, 174, 0.38);
  border-radius: 9px;
  background: linear-gradient(145deg, rgba(3, 31, 19, 0.94), rgba(1, 10, 7, 0.94));
  box-shadow: inset 0 0 18px rgba(79, 255, 130, 0.12), 0 0 14px rgba(79, 255, 130, 0.16);
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 232, 133, 0.88) rgba(0, 18, 10, 0.72);
}

html.${className} app-settings .blobio-fps-saver-button-menu[hidden] {
  display: none !important;
}

html.${className} app-settings .blobio-fps-saver-section-title {
  display: grid;
  grid-template-columns: minmax(16px, 1fr) auto minmax(16px, 1fr);
  align-items: center;
  gap: 8px;
  margin-top: 5px;
  padding: 4px 0;
  color: #c8ffd4;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.2;
  text-align: center;
  text-shadow: 0 0 7px rgba(77, 255, 126, 0.5);
}

html.${className} app-settings .blobio-fps-saver-section-title::before,
html.${className} app-settings .blobio-fps-saver-section-title::after {
  content: "";
  height: 1px;
  background: linear-gradient(90deg, rgba(112, 255, 153, 0), rgba(112, 255, 153, 0.68));
  box-shadow: 0 0 7px rgba(79, 255, 130, 0.26);
}

html.${className} app-settings .blobio-fps-saver-section-title::after {
  background: linear-gradient(90deg, rgba(112, 255, 153, 0.68), rgba(112, 255, 153, 0));
}

html.${className} app-settings .blobio-fps-saver-checkbox-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

html.${className} app-settings .blobio-fps-saver-checkbox-row input {
  width: 16px !important;
  height: 16px !important;
  margin: 0 !important;
  accent-color: rgb(74, 229, 111);
}

html.${className} app-settings .blobio-fps-saver-slider-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(110px, 1.2fr) 54px;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
}

html.${className} app-settings .blobio-fps-saver-slider-input {
  width: 100%;
  min-width: 0;
  height: 18px;
  margin: 0;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
}

html.${className} app-settings .blobio-fps-saver-slider-input::-webkit-slider-runnable-track {
  height: 6px;
  border: 1px solid rgba(147, 255, 177, 0.62);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(13, 76, 34, 0.94), rgba(91, 238, 124, 0.94));
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.58), 0 0 8px rgba(79, 255, 130, 0.28);
}

html.${className} app-settings .blobio-fps-saver-slider-input::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border: 1px solid rgba(225, 255, 233, 0.96);
  border-radius: 50%;
  appearance: none;
  -webkit-appearance: none;
  background: linear-gradient(145deg, #c5ffd2, #37cb69);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.72), inset 0 0 5px rgba(255, 255, 255, 0.42);
}

html.${className} app-settings .blobio-fps-saver-slider-input::-moz-range-track {
  height: 6px;
  border: 1px solid rgba(147, 255, 177, 0.62);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(13, 76, 34, 0.94), rgba(91, 238, 124, 0.94));
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.58), 0 0 8px rgba(79, 255, 130, 0.28);
}

html.${className} app-settings .blobio-fps-saver-slider-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 1px solid rgba(225, 255, 233, 0.96);
  border-radius: 50%;
  background: linear-gradient(145deg, #c5ffd2, #37cb69);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.72), inset 0 0 5px rgba(255, 255, 255, 0.42);
}

html.${className} app-settings .blobio-fps-saver-slider-value {
  color: #c8ffd4;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

html.${className} app-settings .blobio-virus-setting-group {
  display: grid;
  grid-column: 1 / -1;
  gap: 8px;
  min-width: 0;
}

html.${className} app-settings .blobio-virus-setting-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 34px;
  width: 100%;
  box-sizing: border-box;
}

html.${className} app-settings .blobio-virus-dropdown-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(130, 255, 166, 0.72);
  border-radius: 5px;
  outline: none;
  background: rgba(0, 0, 0, 0.74);
  color: #ecfff1;
  text-align: center;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.76), 0 0 12px rgba(77, 255, 126, 0.74);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 12px rgba(79, 255, 130, 0.26);
  cursor: pointer;
}

html.${className} app-settings .blobio-virus-dropdown-button:hover,
html.${className} app-settings .blobio-virus-dropdown-button:focus-visible {
  border-color: rgba(151, 255, 181, 0.96);
  box-shadow: inset 0 0 11px rgba(79, 255, 130, 0.18), 0 0 15px rgba(79, 255, 130, 0.42);
}

html.${className} app-settings .blobio-virus-dropdown-symbol {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 1px;
  color: inherit;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-shadow: inherit;
  pointer-events: none;
}

html.${className} app-settings .blobio-virus-mothercell-button-menu {
  display: grid;
  gap: 11px;
  width: 100%;
  min-width: 0;
  padding: 11px;
  border: 1px solid rgba(142, 255, 174, 0.38);
  border-radius: 9px;
  background: linear-gradient(145deg, rgba(3, 31, 19, 0.94), rgba(1, 10, 7, 0.94));
  box-shadow: inset 0 0 18px rgba(79, 255, 130, 0.12), 0 0 14px rgba(79, 255, 130, 0.16);
  box-sizing: border-box;
  max-height: 380px;
  overflow-y: scroll;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 232, 133, 0.88) rgba(0, 18, 10, 0.72);
}

html.${className} app-settings .content-container.scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 232, 133, 0.88) rgba(0, 18, 10, 0.72);
}

html.${className} app-settings .blobio-virus-mothercell-button-menu::-webkit-scrollbar,
html.${className} app-settings .content-container.scroll::-webkit-scrollbar {
  width: 8px;
  background: rgba(0, 18, 10, 0.72) !important;
}

html.${className} app-settings .blobio-virus-mothercell-button-menu::-webkit-scrollbar-track,
html.${className} app-settings .content-container.scroll::-webkit-scrollbar-track {
  border-radius: 8px;
  background: rgba(0, 18, 10, 0.72) !important;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.55);
}

html.${className} app-settings .blobio-virus-mothercell-button-menu::-webkit-scrollbar-thumb,
html.${className} app-settings .content-container.scroll::-webkit-scrollbar-thumb {
  border: 1px solid rgba(200, 255, 214, 0.52);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(111, 244, 145, 0.94), rgba(42, 150, 78, 0.94)) !important;
  box-shadow: 0 0 7px rgba(79, 255, 130, 0.38);
}

html.${className} app-settings .blobio-virus-mothercell-button-menu::-webkit-scrollbar-thumb:hover,
html.${className} app-settings .content-container.scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(151, 255, 177, 0.98), rgba(57, 182, 94, 0.98)) !important;
}

html.${className} app-settings .blobio-virus-mothercell-button-menu::-webkit-scrollbar-corner,
html.${className} app-settings .content-container.scroll::-webkit-scrollbar-corner {
  background: rgba(0, 18, 10, 0.9) !important;
}

html.${className} app-settings .blobio-virus-mothercell-button-menu[hidden] {
  display: none !important;
}

html.${className} app-settings .blobio-virus-preview {
  position: relative;
  width: 100%;
  min-height: 188px;
  overflow: hidden;
  border: 1px solid rgba(190, 255, 206, 0.38);
  border-radius: 8px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.48), 0 0 10px rgba(79, 255, 130, 0.14);
}

html.${className} app-settings .blobio-virus-preview-canvas {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 156px;
  height: 156px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

html.${className} app-settings .blobio-virus-controls {
  display: grid;
  grid-template-columns: minmax(84px, 0.7fr) minmax(150px, 1.3fr);
  gap: 10px;
}

html.${className} app-settings .blobio-virus-control {
  display: grid;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
}

html.${className} app-settings .blobio-virus-color-control {
  grid-template-columns: auto 42px;
}

html.${className} app-settings .blobio-virus-color-wheel {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  overflow: hidden;
  border: 1px solid rgba(232, 255, 238, 0.7);
  border-radius: 50%;
  background: conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.24);
}

html.${className} app-settings .blobio-virus-color-swatch {
  width: 17px;
  height: 17px;
  border: 2px solid rgba(0, 0, 0, 0.78);
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.62);
  pointer-events: none;
}

html.${className} app-settings .blobio-virus-color-input {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  border: 0 !important;
  opacity: 0;
  cursor: pointer;
}

html.${className} app-settings .blobio-virus-alpha-control {
  grid-template-columns: auto minmax(70px, 1fr) 36px;
}

html.${className} app-settings .blobio-virus-alpha-input {
  width: 100%;
  min-width: 0;
  height: 18px;
  margin: 0;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
}

html.${className} app-settings .blobio-virus-alpha-input::-webkit-slider-runnable-track {
  height: 6px;
  border: 1px solid rgba(147, 255, 177, 0.62);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(13, 76, 34, 0.94), rgba(91, 238, 124, 0.94));
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.58), 0 0 8px rgba(79, 255, 130, 0.28);
}

html.${className} app-settings .blobio-virus-alpha-input::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border: 1px solid rgba(225, 255, 233, 0.96);
  border-radius: 50%;
  appearance: none;
  -webkit-appearance: none;
  background: linear-gradient(145deg, #c5ffd2, #37cb69);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.72), inset 0 0 5px rgba(255, 255, 255, 0.42);
}

html.${className} app-settings .blobio-virus-alpha-input::-moz-range-track {
  height: 6px;
  border: 1px solid rgba(147, 255, 177, 0.62);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(13, 76, 34, 0.94), rgba(91, 238, 124, 0.94));
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.58), 0 0 8px rgba(79, 255, 130, 0.28);
}

html.${className} app-settings .blobio-virus-alpha-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 1px solid rgba(225, 255, 233, 0.96);
  border-radius: 50%;
  background: linear-gradient(145deg, #c5ffd2, #37cb69);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.72), inset 0 0 5px rgba(255, 255, 255, 0.42);
}

html.${className} app-settings .blobio-virus-alpha-value {
  color: #c8ffd4;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

html.${className} app-settings .blobio-virus-mask-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

html.${className} app-settings .blobio-virus-mask-button {
  display: grid;
  place-items: center;
  min-width: 0;
  height: 66px;
  padding: 5px;
  border: 1px solid rgba(142, 255, 174, 0.32);
  border-radius: 8px;
  outline: none;
  background: rgba(0, 18, 10, 0.72);
  box-shadow: inset 0 0 10px rgba(79, 255, 130, 0.08);
  cursor: pointer;
}

html.${className} app-settings .blobio-virus-mask-button:hover,
html.${className} app-settings .blobio-virus-mask-button:focus-visible {
  border-color: rgba(196, 255, 211, 0.72);
}

html.${className} app-settings .blobio-virus-mask-button.is-selected {
  border-color: rgba(215, 255, 224, 0.94);
  background: rgba(11, 74, 38, 0.88);
  box-shadow: 0 0 13px rgba(79, 255, 130, 0.36), inset 0 0 11px rgba(79, 255, 130, 0.16);
}

html.${className} app-settings .blobio-virus-mask-button img {
  display: block;
  width: 54px;
  height: 54px;
  max-width: 100%;
  object-fit: contain;
  pointer-events: none;
}

html.${className} app-settings .blobio-virus-rotate-row {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 8px;
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

html.${className} app-settings .blobio-virus-rotate-row[hidden] {
  display: none !important;
}

html.${className} app-settings .blobio-virus-rotate-input {
  width: 16px !important;
  height: 16px !important;
  accent-color: #62e77d;
}

html.${className} app-settings .blobio-background-setting-group {
  display: grid;
  grid-column: 1 / -1;
  gap: 8px;
  min-width: 0;
}

html.${className} app-settings .blobio-background-setting-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 34px;
  width: 100%;
  box-sizing: border-box;
}

html.${className} app-settings .blobio-background-dropdown-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(130, 255, 166, 0.72);
  border-radius: 5px;
  outline: none;
  background: rgba(0, 0, 0, 0.74);
  color: #ecfff1;
  text-align: center;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.76), 0 0 12px rgba(77, 255, 126, 0.74);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 12px rgba(79, 255, 130, 0.26);
  cursor: pointer;
}

html.${className} app-settings .blobio-background-dropdown-button:hover,
html.${className} app-settings .blobio-background-dropdown-button:focus-visible {
  border-color: rgba(151, 255, 181, 0.96);
  box-shadow: inset 0 0 11px rgba(79, 255, 130, 0.18), 0 0 15px rgba(79, 255, 130, 0.42);
}

html.${className} app-settings .blobio-background-dropdown-symbol {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 1px;
  color: inherit;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-shadow: inherit;
  pointer-events: none;
}

html.${className} app-settings .blobio-background-button-menu {
  display: grid;
  gap: 11px;
  width: 100%;
  min-width: 0;
  max-height: 390px;
  padding: 11px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid rgba(142, 255, 174, 0.38);
  border-radius: 9px;
  background: linear-gradient(145deg, rgba(3, 31, 19, 0.94), rgba(1, 10, 7, 0.94));
  box-shadow: inset 0 0 18px rgba(79, 255, 130, 0.12), 0 0 14px rgba(79, 255, 130, 0.16);
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 232, 133, 0.88) rgba(0, 18, 10, 0.72);
}

html.${className} app-settings .blobio-background-button-menu[hidden] {
  display: none !important;
}

html.${className} app-settings .blobio-background-preview {
  min-height: 54px;
  border: 1px solid rgba(190, 255, 206, 0.38);
  border-radius: 8px;
  background: rgba(34, 34, 34, 1);
  box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.48), 0 0 10px rgba(79, 255, 130, 0.14);
}

html.${className} app-settings .blobio-background-mode-row {
  display: grid;
  grid-template-columns: auto 112px;
  align-items: center;
  gap: 10px;
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
}

html.${className} app-settings .blobio-background-mode-button {
  position: relative;
  height: 30px;
  overflow: hidden;
  border: 1px solid rgba(147, 255, 177, 0.58);
  border-radius: 999px;
  background: rgba(0, 18, 10, 0.82);
  color: #ecfff1;
  font: inherit;
  cursor: pointer;
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 9px rgba(79, 255, 130, 0.2);
}

html.${className} app-settings .blobio-background-mode-button::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 4px;
  width: 50px;
  height: 22px;
  border-radius: 999px;
  background: linear-gradient(145deg, #baffca, #35c968);
  box-shadow: 0 0 9px rgba(79, 255, 130, 0.56);
  transition: transform 180ms ease;
}

html.${className} app-settings .blobio-background-mode-button.is-gradient::before {
  transform: translateX(52px);
}

html.${className} app-settings .blobio-background-mode-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 180ms ease, opacity 180ms ease;
  pointer-events: none;
}

html.${className} app-settings .blobio-background-mode-text.is-solid {
  transform: translateX(0);
  opacity: 1;
}

html.${className} app-settings .blobio-background-mode-text.is-gradient {
  transform: translateX(-100%);
  opacity: 0;
}

html.${className} app-settings .blobio-background-mode-button.is-gradient .blobio-background-mode-text.is-solid {
  transform: translateX(100%);
  opacity: 0;
}

html.${className} app-settings .blobio-background-mode-button.is-gradient .blobio-background-mode-text.is-gradient {
  transform: translateX(0);
  opacity: 1;
}

html.${className} app-settings .blobio-background-solid-section,
html.${className} app-settings .blobio-background-gradient-section {
  display: grid;
  gap: 10px;
}

html.${className} app-settings .blobio-background-gradient-section[hidden] {
  display: none !important;
}

html.${className} app-settings .blobio-background-section-title {
  color: #c8ffd4;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0;
}

html.${className} app-settings .blobio-background-color-row {
  display: grid;
  grid-template-columns: minmax(90px, 0.8fr) minmax(150px, 1.2fr);
  gap: 10px;
  min-width: 0;
}

html.${className} app-settings .blobio-background-control {
  display: grid;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
}

html.${className} app-settings .blobio-background-color-control {
  grid-template-columns: auto 42px;
}

html.${className} app-settings .blobio-background-color-wheel {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  overflow: hidden;
  border: 1px solid rgba(232, 255, 238, 0.7);
  border-radius: 50%;
  background: conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.24);
}

html.${className} app-settings .blobio-background-color-swatch {
  width: 17px;
  height: 17px;
  border: 2px solid rgba(0, 0, 0, 0.78);
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.62);
  pointer-events: none;
}

html.${className} app-settings .blobio-background-color-input {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  border: 0 !important;
  opacity: 0;
  cursor: pointer;
}

html.${className} app-settings .blobio-background-alpha-control,
html.${className} app-settings .blobio-background-angle-row {
  grid-template-columns: auto minmax(70px, 1fr) 42px;
}

html.${className} app-settings .blobio-background-angle-row {
  display: grid;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
}

html.${className} app-settings .blobio-background-alpha-input,
html.${className} app-settings .blobio-background-angle-input {
  width: 100%;
  min-width: 0;
  height: 18px;
  margin: 0;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
}

html.${className} app-settings .blobio-background-alpha-input::-webkit-slider-runnable-track,
html.${className} app-settings .blobio-background-angle-input::-webkit-slider-runnable-track {
  height: 6px;
  border: 1px solid rgba(147, 255, 177, 0.62);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(13, 76, 34, 0.94), rgba(91, 238, 124, 0.94));
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.58), 0 0 8px rgba(79, 255, 130, 0.28);
}

html.${className} app-settings .blobio-background-alpha-input::-webkit-slider-thumb,
html.${className} app-settings .blobio-background-angle-input::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border: 1px solid rgba(225, 255, 233, 0.96);
  border-radius: 50%;
  appearance: none;
  -webkit-appearance: none;
  background: linear-gradient(145deg, #c5ffd2, #37cb69);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.72), inset 0 0 5px rgba(255, 255, 255, 0.42);
}

html.${className} app-settings .blobio-background-alpha-input::-moz-range-track,
html.${className} app-settings .blobio-background-angle-input::-moz-range-track {
  height: 6px;
  border: 1px solid rgba(147, 255, 177, 0.62);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(13, 76, 34, 0.94), rgba(91, 238, 124, 0.94));
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.58), 0 0 8px rgba(79, 255, 130, 0.28);
}

html.${className} app-settings .blobio-background-alpha-input::-moz-range-thumb,
html.${className} app-settings .blobio-background-angle-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 1px solid rgba(225, 255, 233, 0.96);
  border-radius: 50%;
  background: linear-gradient(145deg, #c5ffd2, #37cb69);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.72), inset 0 0 5px rgba(255, 255, 255, 0.42);
}

html.${className} app-settings .blobio-background-alpha-value,
html.${className} app-settings .blobio-background-angle-value {
  color: #c8ffd4;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

html.${className} app-settings .blobio-virus-pellet-setting-group {
  display: grid;
  grid-column: 1 / -1;
  gap: 8px;
  min-width: 0;
}

html.${className} app-settings .blobio-virus-pellet-setting-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 34px;
  width: 100%;
  box-sizing: border-box;
}

html.${className} app-settings .blobio-virus-pellet-setting-row label[for="config-switch-virus-pellet-colors"] {
  color: #dfffe6;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.62);
}

html.${className} app-settings .blobio-virus-pellet-dropdown-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(130, 255, 166, 0.72);
  border-radius: 5px;
  outline: none;
  background: rgba(0, 0, 0, 0.74);
  color: #ecfff1;
  text-align: center;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.76), 0 0 12px rgba(77, 255, 126, 0.74);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 12px rgba(79, 255, 130, 0.26);
  cursor: pointer;
}

html.${className} app-settings .blobio-virus-pellet-dropdown-button:hover,
html.${className} app-settings .blobio-virus-pellet-dropdown-button:focus-visible {
  border-color: rgba(151, 255, 181, 0.96);
  box-shadow: inset 0 0 11px rgba(79, 255, 130, 0.18), 0 0 15px rgba(79, 255, 130, 0.42);
}

html.${className} app-settings .blobio-virus-pellet-dropdown-symbol {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 1px;
  color: inherit;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  text-shadow: inherit;
  pointer-events: none;
}

html.${className} app-settings .blobio-virus-pellet-button-menu {
  display: grid;
  gap: 11px;
  width: 100%;
  min-width: 0;
  max-height: 520px;
  padding: 11px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid rgba(142, 255, 174, 0.38);
  border-radius: 9px;
  background: linear-gradient(145deg, rgba(3, 31, 19, 0.94), rgba(1, 10, 7, 0.94));
  box-shadow: inset 0 0 18px rgba(79, 255, 130, 0.12), 0 0 14px rgba(79, 255, 130, 0.16);
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 232, 133, 0.88) rgba(0, 18, 10, 0.72);
}

html.${className} app-settings .blobio-virus-pellet-button-menu[hidden] {
  display: none !important;
}

html.${className} app-settings .blobio-virus-pellet-preview {
  display: grid;
  place-items: center;
  width: 100%;
  overflow: hidden;
  border: 1px solid rgba(190, 255, 206, 0.38);
  border-radius: 8px;
  background: #101010;
  box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.48), 0 0 10px rgba(79, 255, 130, 0.14);
}

html.${className} app-settings .blobio-virus-pellet-preview-canvas {
  display: block;
  width: 100%;
  height: auto;
  max-height: 280px;
  aspect-ratio: 7 / 5;
}

html.${className} app-settings .blobio-virus-pellet-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  min-width: 0;
}

html.${className} app-settings .blobio-virus-pellet-target {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 9px;
  border: 1px solid rgba(142, 255, 174, 0.28);
  border-radius: 8px;
  background: rgba(0, 18, 10, 0.56);
  box-sizing: border-box;
}

html.${className} app-settings .blobio-virus-pellet-target-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

html.${className} app-settings .blobio-virus-pellet-target-title {
  min-width: 0;
  color: #c8ffd4;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.2;
}

html.${className} app-settings .blobio-virus-pellet-mode-button {
  position: relative;
  height: 30px;
  overflow: hidden;
  border: 1px solid rgba(147, 255, 177, 0.58);
  border-radius: 999px;
  background: rgba(0, 18, 10, 0.82);
  color: #ecfff1;
  font: inherit;
  cursor: pointer;
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 9px rgba(79, 255, 130, 0.2);
}

html.${className} app-settings .blobio-virus-pellet-mode-button::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 4px;
  width: 50px;
  height: 22px;
  border-radius: 999px;
  background: linear-gradient(145deg, #baffca, #35c968);
  box-shadow: 0 0 9px rgba(79, 255, 130, 0.56);
  transition: transform 180ms ease;
}

html.${className} app-settings .blobio-virus-pellet-mode-button.is-gradient::before {
  transform: translateX(52px);
}

html.${className} app-settings .blobio-virus-pellet-mode-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 180ms ease, opacity 180ms ease;
  pointer-events: none;
}

html.${className} app-settings .blobio-virus-pellet-mode-text.is-solid {
  transform: translateX(0);
  opacity: 1;
}

html.${className} app-settings .blobio-virus-pellet-mode-text.is-gradient {
  transform: translateX(-100%);
  opacity: 0;
}

html.${className} app-settings .blobio-virus-pellet-mode-button.is-gradient .blobio-virus-pellet-mode-text.is-solid {
  transform: translateX(100%);
  opacity: 0;
}

html.${className} app-settings .blobio-virus-pellet-mode-button.is-gradient .blobio-virus-pellet-mode-text.is-gradient {
  transform: translateX(0);
  opacity: 1;
}

html.${className} app-settings .blobio-virus-pellet-solid-section,
html.${className} app-settings .blobio-virus-pellet-gradient-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  min-width: 0;
}

html.${className} app-settings .blobio-virus-pellet-solid-section {
  grid-template-columns: minmax(0, 1fr);
}

html.${className} app-settings .blobio-virus-pellet-gradient-section[hidden] {
  display: none !important;
}

html.${className} app-settings .blobio-virus-pellet-color-row,
html.${className} app-settings .blobio-virus-pellet-alpha-row,
html.${className} app-settings .blobio-virus-pellet-angle-row {
  display: grid;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
}

html.${className} app-settings .blobio-virus-pellet-color-row {
  grid-template-columns: minmax(0, 1fr) 42px;
}

html.${className} app-settings .blobio-virus-pellet-alpha-row,
html.${className} app-settings .blobio-virus-pellet-angle-row {
  grid-column: 1 / -1;
  grid-template-columns: auto minmax(70px, 1fr) 42px;
}

html.${className} app-settings .blobio-virus-pellet-color-wheel {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  overflow: hidden;
  border: 1px solid rgba(232, 255, 238, 0.7);
  border-radius: 50%;
  background: conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.24);
}

html.${className} app-settings .blobio-virus-pellet-color-swatch {
  width: 17px;
  height: 17px;
  border: 2px solid rgba(0, 0, 0, 0.78);
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.62);
  pointer-events: none;
}

html.${className} app-settings .blobio-virus-pellet-color-input {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  border: 0 !important;
  opacity: 0;
  cursor: pointer;
}

html.${className} app-settings .blobio-virus-pellet-alpha-input,
html.${className} app-settings .blobio-virus-pellet-angle-input {
  width: 100%;
  min-width: 0;
  height: 18px;
  margin: 0;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
}

html.${className} app-settings .blobio-virus-pellet-alpha-input::-webkit-slider-runnable-track,
html.${className} app-settings .blobio-virus-pellet-angle-input::-webkit-slider-runnable-track {
  height: 6px;
  border: 1px solid rgba(147, 255, 177, 0.62);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(13, 76, 34, 0.94), rgba(91, 238, 124, 0.94));
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.58), 0 0 8px rgba(79, 255, 130, 0.28);
}

html.${className} app-settings .blobio-virus-pellet-alpha-input::-webkit-slider-thumb,
html.${className} app-settings .blobio-virus-pellet-angle-input::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border: 1px solid rgba(225, 255, 233, 0.96);
  border-radius: 50%;
  appearance: none;
  -webkit-appearance: none;
  background: linear-gradient(145deg, #c5ffd2, #37cb69);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.72), inset 0 0 5px rgba(255, 255, 255, 0.42);
}

html.${className} app-settings .blobio-virus-pellet-alpha-input::-moz-range-track,
html.${className} app-settings .blobio-virus-pellet-angle-input::-moz-range-track {
  height: 6px;
  border: 1px solid rgba(147, 255, 177, 0.62);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(13, 76, 34, 0.94), rgba(91, 238, 124, 0.94));
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.58), 0 0 8px rgba(79, 255, 130, 0.28);
}

html.${className} app-settings .blobio-virus-pellet-alpha-input::-moz-range-thumb,
html.${className} app-settings .blobio-virus-pellet-angle-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 1px solid rgba(225, 255, 233, 0.96);
  border-radius: 50%;
  background: linear-gradient(145deg, #c5ffd2, #37cb69);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.72), inset 0 0 5px rgba(255, 255, 255, 0.42);
}

html.${className} app-settings .blobio-virus-pellet-alpha-value,
html.${className} app-settings .blobio-virus-pellet-angle-value {
  color: #c8ffd4;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

@media (max-width: 700px) {
  html.${className} app-settings .blobio-virus-pellet-controls {
    grid-template-columns: minmax(0, 1fr);
  }
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
  max-width: 364px;
  padding: 11px 13px;
  border: 1px solid rgba(142, 255, 174, 0.5);
  border-radius: 10px;
  background: rgba(2, 28, 16, 0.96);
  color: #eaffee;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.46);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.38), 0 0 16px rgba(79, 255, 130, 0.24);
  pointer-events: none;
}

.blobio-extension-tooltip-line + .blobio-extension-tooltip-line {
  margin-top: 5px;
}

.blobio-extension-tooltip-metric {
  font-weight: 900;
}

.blobio-extension-tooltip-metric.is-gain .blobio-extension-tooltip-metric-label {
  color: #7dff9c;
  text-shadow: 0 0 6px rgba(109, 255, 143, 0.78), 0 0 12px rgba(34, 205, 87, 0.5);
}

.blobio-extension-tooltip-metric.is-impact .blobio-extension-tooltip-metric-label {
  color: #ff6969;
  text-shadow: 0 0 6px rgba(255, 85, 85, 0.78), 0 0 12px rgba(214, 38, 38, 0.46);
}

.blobio-extension-tooltip-metric-level {
  font-weight: 900;
}

.blobio-extension-tooltip-metric-level.is-low {
  color: #8effa9;
  text-shadow: 0 0 6px rgba(109, 255, 143, 0.7), 0 0 12px rgba(34, 205, 87, 0.42);
}

.blobio-extension-tooltip-metric-level.is-medium {
  color: #ffe16b;
  text-shadow: 0 0 6px rgba(255, 225, 107, 0.72), 0 0 12px rgba(216, 166, 34, 0.42);
}

.blobio-extension-tooltip-metric-level.is-high {
  color: #ff6969;
  text-shadow: 0 0 6px rgba(255, 85, 85, 0.76), 0 0 12px rgba(214, 38, 38, 0.46);
}

.blobio-extension-tooltip-metric-range {
  margin-left: 2px;
  color: #e9ffee;
}

.blobio-extension-tooltip-warning {
  color: #ff6b6b;
  font-weight: 900;
  text-shadow: 0 0 8px rgba(255, 56, 56, 0.58);
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
  flex: 1 1 auto !important;
  align-self: stretch !important;
  padding: 0 !important;
  margin-top: 4px !important;
  min-height: var(--blobio-custom-skin-panel-height, 455px) !important;
  height: 100% !important;
  max-height: none !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  border: 2px solid rgba(142, 255, 174, 0.56) !important;
  outline: 1px solid rgba(213, 255, 224, 0.28) !important;
  outline-offset: 1px !important;
  border-radius: 10px !important;
  background: linear-gradient(145deg, rgba(3, 31, 19, 0.94), rgba(1, 10, 7, 0.94)) !important;
  color: #dfffe6 !important;
  box-shadow: inset 0 0 24px rgba(79, 255, 130, 0.15), 0 0 22px rgba(79, 255, 130, 0.26), 0 0 5px rgba(194, 255, 210, 0.3) !important;
}

html.${className} app-skins .blobio-custom-skin-content {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  padding: 18px 12px 14px !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  box-sizing: border-box !important;
  scrollbar-width: thin;
  scrollbar-color: rgba(174, 255, 195, 0.46) rgba(5, 34, 19, 0.16);
}

html.${className} app-skins .blobio-custom-skin-content::-webkit-scrollbar {
  width: 10px;
}

html.${className} app-skins .blobio-custom-skin-content::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(5, 34, 19, 0.22);
  box-shadow: inset 0 0 8px rgba(79, 255, 130, 0.1);
}

html.${className} app-skins .blobio-custom-skin-content::-webkit-scrollbar-thumb {
  border: 2px solid rgba(3, 31, 19, 0.58);
  border-radius: 999px;
  background: rgba(174, 255, 195, 0.42);
  box-shadow: 0 0 10px rgba(174, 255, 195, 0.68), inset 0 0 6px rgba(255, 255, 255, 0.22);
  outline: 1px solid rgba(210, 255, 220, 0.32);
}

html.${className} app-skins .blobio-custom-skin-content::-webkit-scrollbar-thumb:hover {
  background: rgba(190, 255, 204, 0.74);
  box-shadow: 0 0 12px rgba(155, 255, 181, 0.78), inset 0 0 7px rgba(255, 255, 255, 0.24);
}

html.${className} app-skins.blobio-custom-skin-active .skins-container:not(.blobio-custom-skin-panel) {
  display: none !important;
}

html.${className} app-skins.blobio-custom-skin-active .body {
  align-items: stretch !important;
}

html.${className} app-skins.blobio-custom-skin-active .right {
  display: flex !important;
  flex-direction: column !important;
  align-self: stretch !important;
  min-height: 0 !important;
}

html.${className} app-skins.blobio-custom-skin-active .blobio-custom-skin-panel {
  display: flex !important;
  flex-direction: column !important;
}

html.${className} app-skins.blobio-custom-skin-active .right > .inner-container,
html.${className} app-skins.blobio-custom-skin-active .inner-container.zero-top-left-border {
  display: flex !important;
  flex: 1 1 auto !important;
  flex-direction: column !important;
  min-height: var(--blobio-custom-skin-panel-height, 525px) !important;
  height: 100% !important;
  border: 2px solid rgba(142, 255, 174, 0.5) !important;
  outline: 1px solid rgba(213, 255, 224, 0.24) !important;
  outline-offset: 1px !important;
  border-radius: 10px !important;
  background: linear-gradient(145deg, rgba(3, 31, 19, 0.92), rgba(1, 10, 7, 0.92)) !important;
  box-shadow: inset 0 0 24px rgba(79, 255, 130, 0.14), 0 0 22px rgba(79, 255, 130, 0.24), 0 0 4px rgba(194, 255, 210, 0.26) !important;
}

html.${className} .blobio-custom-skin-controls {
  display: grid;
  gap: 5px;
  margin: 0 0 8px;
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

html.${className} .blobio-custom-skin-diagnostics {
  margin: -3px auto 8px !important;
  max-width: 96% !important;
  padding: 5px 8px !important;
  border: 1px solid rgba(142, 255, 174, 0.28) !important;
  border-radius: 8px !important;
  background: rgba(0, 22, 12, 0.36) !important;
  color: rgba(226, 255, 232, 0.88) !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  line-height: 1.25 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  text-align: center !important;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.48) !important;
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
  flex: 0 0 auto;
  justify-content: center;
  gap: 10px;
  margin-top: auto;
  padding: 10px 12px 12px;
  border-top: 2px solid rgba(142, 255, 174, 0.34);
  background: linear-gradient(180deg, rgba(3, 35, 20, 0.94), rgba(1, 16, 10, 0.98));
  box-shadow: 0 -8px 18px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(213, 255, 224, 0.12);
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
