export const VIP_BADGE_STYLE_ID = 'blobio-vip-role-style';
export const CHAT_ROLE_STYLE_ID = 'blobio-chat-role-style';

export const VIP_BADGE_CSS = `
.blobio-vip-plus-slot {
  position: fixed !important;
  left: var(--blobio-vip-plus-left, -9999px) !important;
  top: var(--blobio-vip-plus-top, -9999px) !important;
  z-index: 4 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: max-content !important;
  height: max-content !important;
  margin: 0 !important;
  line-height: 0 !important;
  transform: translateY(-50%) !important;
  pointer-events: none !important;
  isolation: isolate;
}

.blobio-vip-plus-icon {
  display: block !important;
  width: auto !important;
  height: var(--blobio-vip-plus-size, 106px) !important;
  max-width: 200px !important;
  margin: 0 !important;
  object-fit: contain !important;
  transform: rotate(-7deg) scale(1) !important;
  transform-origin: center;
  transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1), filter 680ms ease !important;
  filter: drop-shadow(0 0 10px rgba(255, 196, 55, 0.34));
  cursor: pointer;
  pointer-events: auto !important;
}

.blobio-vip-plus-icon:hover {
  transform: rotate(-7deg) scale(1.06) !important;
  filter: drop-shadow(0 0 19px rgba(255, 204, 72, 0.68));
}

.blobio-vip-plus-time {
  position: absolute;
  left: 52%;
  top: 69%;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  max-width: 96%;
  transform: translate(-50%, -50%) rotate(-7deg);
  color: #f4fff6;
  font-size: clamp(9px, calc(var(--blobio-vip-plus-size, 196px) * 0.09), 18px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.02em;
  text-align: center;
  white-space: nowrap;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 1px rgba(0, 0, 0, 0.95), 0 0 5px rgba(255, 255, 255, 0.9), 0 0 11px rgba(87, 255, 134, 0.88), 0 0 20px rgba(52, 255, 112, 0.55);
  pointer-events: none;
}

.blobio-vip-plus-time.is-unlimited {
  color: #fff7cf;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 1px rgba(0, 0, 0, 0.95), 0 0 5px rgba(255, 255, 255, 0.95), 0 0 11px rgba(255, 211, 73, 0.92), 0 0 23px rgba(255, 174, 30, 0.7);
  animation: blobio-vip-unlimited-pulse 2800ms ease-in-out infinite;
}

.blobio-vip-plus-time-letter {
  display: inline-block;
  transform: translateY(var(--blobio-vip-letter-y, 0px)) rotate(var(--blobio-vip-letter-rotate, 0deg));
  transform-origin: center bottom;
  text-shadow: inherit;
}

.blobio-vip-plus-time-letter.is-space {
  width: 0.35em;
}

@keyframes blobio-vip-unlimited-pulse {
  0%, 100% {
    opacity: 0.84;
    transform: translate(-50%, -50%) rotate(-7deg) scale(0.98);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(-7deg) scale(1.04);
  }
}

@media (prefers-reduced-motion: reduce) {
  .blobio-vip-plus-icon,
  .blobio-vip-plus-time.is-unlimited {
    transition: none !important;
    animation: none !important;
  }
}
`;

export const CHAT_ROLE_CSS = `
#chat .blobio-extension-chat-tag {
  font-weight: 800 !important;
}

#chat .blobio-chat-vip-plus-tag {
  color: #ffd34f !important;
  text-decoration: underline !important;
  text-decoration-color: #ffd34f !important;
  text-underline-offset: 2px;
  text-shadow: 0 0 6px rgba(255, 248, 204, 0.74), 0 0 11px rgba(255, 190, 47, 0.72);
}

#chat .blobio-chat-vip-plus-tag.is-admin-combined {
  text-decoration: none !important;
}

#chat .blobio-chat-admin-tag {
  color: rgb(0, 255, 0) !important;
  font-style: italic !important;
  text-decoration: none !important;
  text-shadow: 0 0 7px rgba(0, 255, 0, 0.72);
}

#chat .blobio-chat-admin-username {
  font-weight: 800 !important;
  font-style: italic !important;
  text-decoration: none !important;
}

#chat .blobio-chat-admin-message {
  color: rgb(0, 161, 0) !important;
  font-weight: 800 !important;
  text-decoration: underline !important;
  text-underline-offset: 2px;
}

#chat .blobio-chat-built-in-vip-hidden,
#chat .blobio-chat-built-in-md-hidden {
  display: none !important;
}
`;
