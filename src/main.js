import backgroundUrl from '../assets/background.png';
import discordIconUrl from '../assets/discord_icon.png';
import facebookIconUrl from '../assets/facebook_icon.png';
import instagramIconUrl from '../assets/instagram_icon.png';
import socialsButtonUrl from '../assets/socal_icon_n.png';
import updatesButtonUrl from '../assets/update_notes_n_.png';
import youtubeIconUrl from '../assets/youtube_icon.png';
import recommendedButtonUrl from '../assets/yt_recommended_n.png';
import virusPreviewUrl from '../assets/virus_preview.png';
import virusHaloUrl from '../assets/virus_glow_1 _mask.png';
import virusRingUrl from '../assets/virus_glow_3 _mask.png';
import virusRotateUrl from '../assets/viurs_glow_2_random_rotate_mask.png';
import virusPelletPreviewUrl from '../assets/virus_pellet_preview.png';
import originalVirusNoColorUrl from '../assets/original_virus_no_color.png';
import emoteCoolUrl from '../assets/emote_cool.png';
import emoteHiUrl from '../assets/emote_hi.png';
import emoteNiceUrl from '../assets/emote_nice.png';
import emotePopUrl from '../assets/emote_pop.png';
import emoteThxUrl from '../assets/emote_thx.png';
import emoteWhyUrl from '../assets/emote_why.png';
import emoteYoUrl from '../assets/emote_yo.png';
import { readVirusPelletColorSettings } from './cellColors/VirusPelletColorSettings.js';
import { pageVirusPelletColorsBootstrap } from './cellColors/pageVirusPelletColorsBootstrap.js';
import { MutedPlayersStore } from './chat/MutedPlayersStore.js';
import { EmoteSkinFeature } from './emotes/EmoteSkinFeature.js';
import { pageEmoteSkinBootstrap } from './emotes/pageEmoteSkinBootstrap.js';
import { BackgroundFeature } from './features/BackgroundFeature.js';
import { ChatRoleFeature } from './features/ChatRoleFeature.js';
import { ChatSettingsFeature } from './features/ChatSettingsFeature.js';
import { FriendHighlightFeature } from './features/FriendHighlightFeature.js';
import { GameUiCustomizationFeature } from './features/GameUiCustomizationFeature.js';
import { HotkeyFeature } from './features/HotkeyFeature.js';
import { MenuFeature } from './features/MenuFeature.js';
import { FriendHighlightStore } from './friends/FriendHighlightStore.js';
import { FriendRelationService } from './friends/FriendRelationService.js';
import { HotkeyStore } from './hotkeys/HotkeyStore.js';
import { readHudInfoSettings } from './settings/HudInfoSettings.js';
import { pageHudInfoBootstrap } from './hud/pageHudInfoBootstrap.js';
import { readJellyShaderSettings } from './jelly/JellyShaderSettings.js';
import { pageJellyShaderBootstrap } from './jelly/pageJellyShaderBootstrap.js';
import { PlayerMuteFeature } from './features/PlayerMuteFeature.js';
import { VipBadgeFeature } from './features/VipBadgeFeature.js';
import { getBlobioHostMode } from './hostRules.js';
import { ProfileUidDetector } from './roles/ProfileUidDetector.js';
import { RoleRegistry } from './roles/RoleRegistry.js';
import { getTampermonkeyPageWindow } from './runtimePageWindow.js';
import { createBlobioStorage } from './storage/BlobioStorage.js';
import { readVirusMotherCellSettings } from './virus/VirusMotherCellSettings.js';
import { pageVirusMotherCellBootstrap } from './virus/pageVirusMotherCellBootstrap.js';

const INSTANCE_KEY = '__blobioExtension';
const EXTENSION_VERSION = '0.1.83';
const VIP_BADGE_URL = 'https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Extension/main/assets/VIP_icon_plus.png';
const EMOTE_SKIN_ASSETS = {
  cool: emoteCoolUrl,
  hi: emoteHiUrl,
  nice: emoteNiceUrl,
  pop: emotePopUrl,
  thx: emoteThxUrl,
  why: emoteWhyUrl,
  yo: emoteYoUrl,
};

class BlobioExtension {
  constructor(windowRef = globalThis) {
    this.window = windowRef;
    this.version = EXTENSION_VERSION;
    this.features = [];
    this.roleRegistry = null;
    this.mutedPlayersStore = null;
    this.friendHighlightStore = null;
    this.hotkeyStore = null;
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
    if (hostMode === 'runtime') {
      this.installEmoteSkinFallback(document, logger);
      this.installJellyShaderFallback(document, logger);
      this.installHudInfoFallback(document, logger);
      this.installVirusMotherCellFallback(document, logger);
      this.installVirusPelletColorsFallback(document, logger);
    }

    this.roleRegistry = new RoleRegistry({ document, logger });
    this.roleRegistry.start();
    this.friendHighlightStore = new FriendHighlightStore({ document, logger });
    this.friendHighlightStore.start();

    const menuAssets = {
      recommendedButton: recommendedButtonUrl,
      updatesButton: updatesButtonUrl,
      socialsButton: socialsButtonUrl,
      youtubeIcon: youtubeIconUrl,
      discordIcon: discordIconUrl,
      facebookIcon: facebookIconUrl,
      instagramIcon: instagramIconUrl,
      virusPreview: virusPreviewUrl,
      virusHalo: virusHaloUrl,
      virusRotate: virusRotateUrl,
      virusRing: virusRingUrl,
      virusPelletPreview: virusPelletPreviewUrl,
      originalVirusNoColor: originalVirusNoColorUrl,
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
          friendHighlightStore: this.friendHighlightStore,
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
      this.mutedPlayersStore = new MutedPlayersStore({ document, logger });
      this.hotkeyStore = new HotkeyStore({ document, logger });
      this.hotkeyStore.start();
      const friendRelationService = new FriendRelationService({
        document,
        logger,
        friendHighlightStore: this.friendHighlightStore,
      });
      const uiCustomization = new GameUiCustomizationFeature({ document, logger });
      const chatSettings = new ChatSettingsFeature({
        document,
        logger,
        mutedPlayersStore: this.mutedPlayersStore,
        hotkeyStore: this.hotkeyStore,
        uiCustomization,
      });

      this.features.push(
        friendRelationService,
        new ChatRoleFeature({
          document,
          logger,
          roleRegistry: this.roleRegistry,
          mutedPlayersStore: this.mutedPlayersStore,
        }),
        new FriendHighlightFeature({
          document,
          roleRegistry: this.roleRegistry,
          friendHighlightStore: this.friendHighlightStore,
          friendRelationService,
        }),
        new HotkeyFeature({
          document,
          logger,
          hotkeyStore: this.hotkeyStore,
        }),
        uiCustomization,
        chatSettings,
        new EmoteSkinFeature({
          document,
          logger,
          assets: EMOTE_SKIN_ASSETS,
        }),
        new PlayerMuteFeature({
          document,
          logger,
          roleRegistry: this.roleRegistry,
          mutedPlayersStore: this.mutedPlayersStore,
          notifications: chatSettings,
        }),
      );
    }

    for (const feature of this.features) {
      feature.start();
    }

    this.started = true;
    return true;
  }

  installVirusMotherCellFallback(document, logger) {
    const windowRef = this.window;
    if (windowRef.__blobioVirusMotherCellInstalled) {
      return true;
    }

    const storage = createBlobioStorage(document);
    const settings = readVirusMotherCellSettings(storage, document);
    const existingStatus = windowRef.__blobioVirusMotherCellLoaderStatus || {};
    const status = {
      ...existingStatus,
      version: EXTENSION_VERSION,
      enabled: settings.enabled,
      attemptedByBundle: false,
      installedByBundle: false,
      reason: settings.enabled ? 'loader-runtime-missing' : 'disabled',
    };
    windowRef.__blobioVirusMotherCellLoaderStatus = status;

    if (typeof windowRef.__blobVirusGlowDebug !== 'function') {
      windowRef.__blobVirusGlowDebug = () => ({
        ...status,
        runtimeState: windowRef.__blobVirusGlowState || null,
        runtimeSettings: windowRef.__blobVirusGlowSettings || null,
      });
    }

    if (!settings.enabled) {
      return false;
    }

    const maskUrls = {
      halo: virusHaloUrl,
      rotate: virusRotateUrl,
      ring: virusRingUrl,
    };
    status.attemptedByBundle = true;

    try {
      status.installedByBundle = Boolean(pageVirusMotherCellBootstrap({
        enabled: true,
        maskId: settings.maskId,
        maskUrl: maskUrls[settings.maskId] || maskUrls.halo,
        color: settings.color,
        alpha: settings.alpha,
        rotate: settings.rotate,
        version: EXTENSION_VERSION,
      }, windowRef));
      status.reason = status.installedByBundle ? 'installed-by-bundle-fallback' : 'bundle-bootstrap-returned-false';
      if (!status.installedByBundle) {
        logger.warn?.('[Blobio] Virus | Mother-cell runtime did not start. Update or reinstall the Tampermonkey loader, then reload the game tab.');
      }
      return status.installedByBundle;
    } catch (error) {
      status.reason = 'bundle-bootstrap-error';
      status.error = error?.message || String(error);
      logger.warn?.('[Blobio] Virus | Mother-cell fallback failed.', error);
      return false;
    }
  }

  installEmoteSkinFallback(_document, logger) {
    const windowRef = this.window;
    const pageWindow = getTampermonkeyPageWindow(windowRef);
    if (pageWindow.__blobioEmoteSkinInstalled) {
      return true;
    }

    try {
      return Boolean(pageEmoteSkinBootstrap({
        assets: EMOTE_SKIN_ASSETS,
        version: EXTENSION_VERSION,
      }, pageWindow));
    } catch (error) {
      logger.warn?.('[Blobio] Emote Skin Display fallback failed.', error);
      return false;
    }
  }

  installJellyShaderFallback(document, logger) {
    const windowRef = this.window;
    if (windowRef.__blobioJellyShaderInstalled) {
      return true;
    }

    const storage = createBlobioStorage(document);
    const settings = readJellyShaderSettings(storage);
    if (!settings.enabled) {
      return false;
    }

    try {
      return Boolean(pageJellyShaderBootstrap({
        ...settings,
        version: EXTENSION_VERSION,
      }, windowRef));
    } catch (error) {
      logger.warn?.('[Blobio] Jelly-Physics Shader fallback failed.', error);
      return false;
    }
  }

  installHudInfoFallback(document, logger) {
    const windowRef = this.window;
    if (windowRef.__blobioHudInfoInstalled) {
      return true;
    }

    const storage = createBlobioStorage(document);
    try {
      return Boolean(pageHudInfoBootstrap(readHudInfoSettings(storage), windowRef));
    } catch (error) {
      logger.warn?.('[Blobio] HUD-Info fallback failed.', error);
      return false;
    }
  }

  installVirusPelletColorsFallback(document, logger) {
    const windowRef = this.window;
    if (windowRef.__blobioVirusPelletColorInstalled) {
      return true;
    }

    const storage = createBlobioStorage(document);
    const settings = readVirusPelletColorSettings(storage, document);
    const existingStatus = windowRef.__blobioVirusPelletColorLoaderStatus || {};
    const status = {
      ...existingStatus,
      version: EXTENSION_VERSION,
      enabled: settings.enabled,
      attemptedByBundle: false,
      installedByBundle: false,
      reason: settings.enabled ? 'loader-runtime-missing' : 'disabled',
    };
    windowRef.__blobioVirusPelletColorLoaderStatus = status;

    if (!settings.enabled) {
      return false;
    }

    status.attemptedByBundle = true;
    try {
      status.installedByBundle = Boolean(pageVirusPelletColorsBootstrap({
        ...settings,
        version: EXTENSION_VERSION,
      }, windowRef));
      status.reason = status.installedByBundle ? 'installed-by-bundle-fallback' : 'bundle-bootstrap-returned-false';
      if (!status.installedByBundle) {
        logger.warn?.('[Blobio] Virus | Pellets Colors runtime did not start. Update or reinstall the Tampermonkey loader, then reload the game tab.');
      }
      return status.installedByBundle;
    } catch (error) {
      status.reason = 'bundle-bootstrap-error';
      status.error = error?.message || String(error);
      logger.warn?.('[Blobio] Virus | Pellets Colors fallback failed.', error);
      return false;
    }
  }

  destroy() {
    for (let index = this.features.length - 1; index >= 0; index -= 1) {
      this.features[index].destroy();
    }

    this.features = [];
    this.roleRegistry?.destroy();
    this.roleRegistry = null;
    this.mutedPlayersStore?.destroy();
    this.mutedPlayersStore = null;
    this.friendHighlightStore?.destroy();
    this.friendHighlightStore = null;
    this.hotkeyStore?.destroy();
    this.hotkeyStore = null;
    this.started = false;
  }
}

export function startBlobioExtension(windowRef = globalThis) {
  const existing = windowRef[INSTANCE_KEY];
  if (existing?.version === EXTENSION_VERSION) {
    return existing;
  }

  if (existing) {
    try {
      existing.destroy?.();
    } catch (error) {
      windowRef.console?.warn?.('[Blobio] Previous extension instance could not be cleaned up.', error);
    }
  }

  const extension = new BlobioExtension(windowRef);
  windowRef[INSTANCE_KEY] = extension;
  windowRef.__blobioExtensionVersion = EXTENSION_VERSION;

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
