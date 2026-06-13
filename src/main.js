import backgroundUrl from '../assets/background.png';
import discordIconUrl from '../assets/discord_icon.png';
import facebookIconUrl from '../assets/facebook_icon.png';
import instagramIconUrl from '../assets/instagram_icon.png';
import socialsButtonUrl from '../assets/socal_icon_n.png';
import updatesButtonUrl from '../assets/update_notes_n_.png';
import youtubeIconUrl from '../assets/youtube_icon.png';
import recommendedButtonUrl from '../assets/yt_recommended_n.png';
import { BackgroundFeature } from './features/BackgroundFeature.js';
import { ChatRoleFeature } from './features/ChatRoleFeature.js';
import { ChatSettingsFeature } from './features/ChatSettingsFeature.js';
import { MenuFeature } from './features/MenuFeature.js';
import { VipBadgeFeature } from './features/VipBadgeFeature.js';
import { getBlobioHostMode } from './hostRules.js';
import { ProfileUidDetector } from './roles/ProfileUidDetector.js';
import { RoleRegistry } from './roles/RoleRegistry.js';

const INSTANCE_KEY = '__blobioExtension';
const VIP_BADGE_URL = 'https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Web-Script/main/assets/VIP_icon_plus.png';

class BlobioExtension {
  constructor(windowRef = globalThis) {
    this.window = windowRef;
    this.features = [];
    this.roleRegistry = null;
    this.started = false;
  }

  start() {
    if (this.started) {
      return true;
    }

    const document = this.window.document;
    if (!document) {
      this.window.console?.warn('[Blobio] Extension could not start: document is not ready.');
      return false;
    }

    if (!document.documentElement) {
      return false;
    }

    const hostMode = getBlobioHostMode(this.window.location);
    if (hostMode === 'off') {
      this.started = true;
      return true;
    }

    const logger = this.window.console || console;
    this.roleRegistry = new RoleRegistry({ document, logger });
    this.roleRegistry.start();

    const menuAssets = {
      recommendedButton: recommendedButtonUrl,
      updatesButton: updatesButtonUrl,
      socialsButton: socialsButtonUrl,
      youtubeIcon: youtubeIconUrl,
      discordIcon: discordIconUrl,
      facebookIcon: facebookIconUrl,
      instagramIcon: instagramIconUrl,
    };

    if (hostMode === 'frontpage') {
      const uidDetector = new ProfileUidDetector({ document, logger });

      this.features.push(
        new BackgroundFeature({ document, backgroundUrl, logger }),
        uidDetector,
        new MenuFeature({
          document,
          logger,
          assets: menuAssets,
          frontPageUi: true,
          roleRegistry: this.roleRegistry,
          uidDetector,
        }),
        new VipBadgeFeature({
          document,
          logger,
          roleRegistry: this.roleRegistry,
          uidDetector,
          badgeUrl: VIP_BADGE_URL,
        }),
      );
    } else if (hostMode === 'runtime') {
      this.features.push(
        new ChatRoleFeature({ document, logger, roleRegistry: this.roleRegistry }),
        new ChatSettingsFeature({ document, logger }),
      );
    }

    for (const feature of this.features) {
      feature.start();
    }

    this.started = true;
    return true;
  }

  destroy() {
    for (let index = this.features.length - 1; index >= 0; index -= 1) {
      this.features[index].destroy();
    }

    this.features = [];
    this.roleRegistry?.destroy();
    this.roleRegistry = null;
    this.started = false;
  }
}

export function startBlobioExtension(windowRef = globalThis) {
  if (windowRef[INSTANCE_KEY]) {
    return windowRef[INSTANCE_KEY];
  }

  const extension = new BlobioExtension(windowRef);
  windowRef[INSTANCE_KEY] = extension;

  if (!extension.start()) {
    const tryStart = () => {
      if (!extension.started) {
        extension.start();
      }
    };

    windowRef.document?.addEventListener?.('DOMContentLoaded', tryStart, { once: true });
    windowRef.setTimeout?.(tryStart, 0);
  }

  return extension;
}

startBlobioExtension(globalThis);
