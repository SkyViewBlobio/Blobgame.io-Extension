import backgroundUrl from '../assets/background.png';
import discordIconUrl from '../assets/discord_icon.png';
import facebookIconUrl from '../assets/facebook_icon.png';
import instagramIconUrl from '../assets/instagram_icon.png';
import socialsButtonUrl from '../assets/socal_icon_n.png';
import updatesButtonUrl from '../assets/update_notes_n_.png';
import youtubeIconUrl from '../assets/youtube_icon.png';
import recommendedButtonUrl from '../assets/yt_recommended_n.png';
import { BackgroundFeature } from './features/BackgroundFeature.js';
import { MenuFeature } from './features/MenuFeature.js';
import { CustomSkinOverlayFeature } from './features/CustomSkinOverlayFeature.js';
import { getBlobioHostMode } from './hostRules.js';

const INSTANCE_KEY = '__blobioExtension';

class BlobioExtension {
  constructor(windowRef = globalThis) {
    this.window = windowRef;
    this.features = [];
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
      this.features.push(new BackgroundFeature({
        document,
        backgroundUrl,
        logger: this.window.console || console,
      }));
    }

    this.features.push(
      new MenuFeature({
        document,
        logger: this.window.console || console,
        assets: menuAssets,
        frontPageUi: hostMode === 'frontpage',
      }),
    );

    if (hostMode === 'runtime') {
      this.features.push(new CustomSkinOverlayFeature({
        document,
        logger: this.window.console || console,
      }));
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
