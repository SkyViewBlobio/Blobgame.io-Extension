export function buildMenuToolbarCss({ className, hiddenClass, toolbarClass }) {
  return `
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

`;
}
