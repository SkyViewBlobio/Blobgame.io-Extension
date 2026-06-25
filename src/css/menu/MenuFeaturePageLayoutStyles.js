export function buildMenuPageLayoutCss({ className, hiddenClass, toolbarClass }) {
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

html.${className} app-settings .blobio-menu-layered-select,
html.${className} app-skins .blobio-menu-layered-select,
html.${className} app-profile .blobio-menu-layered-select,
html.${className} app-shop .blobio-menu-layered-select {
  z-index: auto !important;
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
html.${className} app-shop,
html.${className} .modal,
html.${className} .popup,
html.${className} .dialog,
html.${className} .cdk-overlay-container {
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

`;
}
