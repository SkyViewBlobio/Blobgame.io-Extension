export function buildMenuCss({ className, hiddenClass, toolbarClass }) {
  return `
html.${className} .social {
  display: none !important;
}

html.${className} .${hiddenClass} {
  display: none !important;
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

.${toolbarClass} {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  vertical-align: middle;
  z-index: 2147482500;
}

.${toolbarClass}.is-floating {
  position: fixed;
  left: 18px;
  bottom: 82px;
  margin-left: 0;
}

.blobio-menu-buttons {
  display: inline-block;
  white-space: nowrap;
}

.blobio-menu-button {
  display: inline-block !important;
  width: 50px !important;
  height: 50px !important;
  padding: 1px 6px !important;
  border: 0 none transparent !important;
  background-color: transparent !important;
  background-size: cover !important;
  background-repeat: repeat !important;
  background-position: 0% 0% !important;
}

.blobio-menu-button + .blobio-menu-button {
  margin-left: 6px;
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
  top: calc(100% + 8px);
  left: 0;
  width: min(360px, calc(100vw - 32px));
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px) scaleY(0.96);
  transform-origin: top;
  transition: max-height 190ms ease, opacity 160ms ease, transform 190ms ease;
  border: 1px solid rgba(134, 255, 171, 0.5);
  border-radius: 10px;
  background: rgba(2, 18, 12, 0.94);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45), 0 0 20px rgba(77, 255, 127, 0.28);
  color: #eaffee;
}

.blobio-menu-panel.is-open {
  max-height: 430px;
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scaleY(1);
}

.blobio-panel-inner {
  padding: 10px;
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
}

.blobio-panel-close {
  width: 24px;
  height: 24px;
  border: 1px solid rgba(135, 255, 168, 0.46);
  border-radius: 6px;
  background: rgba(5, 38, 22, 0.86);
  color: #dcffe4;
  cursor: pointer;
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

.blobio-policy-dock {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  z-index: 2147482500;
}

.blobio-policy-dock .blobio-menu-panel {
  top: auto;
  right: auto;
  bottom: calc(100% + 9px);
  left: 50%;
  width: min(360px, calc(100vw - 28px));
  transform: translateX(-50%) translateY(8px) scaleY(0.96);
  transform-origin: bottom center;
}

.blobio-policy-dock .blobio-menu-panel.is-open {
  transform: translateX(-50%) translateY(0) scaleY(1);
}

.blobio-policy-button {
  padding: 4px 10px;
}

.blobio-policy-links {
  display: grid;
  gap: 7px;
}

.blobio-policy-link {
  color: #eaffee;
  text-decoration: none;
  font-size: 12px;
  line-height: 1.2;
}

.blobio-policy-link:hover {
  color: #a8ffba;
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
`.trim();
}
