import backgroundUrl from '../background.png';
import discordIconUrl from '../discord_icon.png';
import facebookIconUrl from '../facebook_icon.png';
import instagramIconUrl from '../instagram_icon.png';
import socialsButtonUrl from '../socal_icon_n.png';
import updatesButtonUrl from '../update_notes_n_.png';
import youtubeIconUrl from '../youtube_icon.png';
import recommendedButtonUrl from '../yt_recommended_n.png';
import { BackgroundFeature } from './features/BackgroundFeature.js';
import { MenuFeature } from './features/MenuFeature.js';

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
    if (!document?.documentElement) {
      this.window.console?.warn('[Blobio] Extension could not start: document is not ready.');
      return false;
    }

    this.features = [
      new BackgroundFeature({
        document,
        backgroundUrl,
        logger: this.window.console || console,
      }),
      new MenuFeature({
        document,
        logger: this.window.console || console,
        assets: {
          recommendedButton: recommendedButtonUrl,
          updatesButton: updatesButtonUrl,
          socialsButton: socialsButtonUrl,
          youtubeIcon: youtubeIconUrl,
          discordIcon: discordIconUrl,
          facebookIcon: facebookIconUrl,
          instagramIcon: instagramIconUrl,
        },
      }),
    ];

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
  extension.start();
  return extension;
}

startBlobioExtension(globalThis);
