# Blobgame.io Web Script

Tampermonkey loader and modular extension code for `blobgame.io` and `custom.client.blobgame.io`.

The installed userscript is only a small loader. It fetches the built extension bundle from GitHub, with jsDelivr as a fallback, so users can receive updates without reinstalling the full script.

## Install

This install URL only works for normal Tampermonkey users.

Install this loader in Tampermonkey:

```text
https://raw.githubusercontent.com/SkyViewBlobio/Blobgame.io-Web-Script/main/loader/blobio-loader.user.js
```

Existing installs before `0.1.6` should use Tampermonkey's update check or be reinstalled once.

The loader fetches:

```text
https://cdn.jsdelivr.net/gh/SkyViewBlobio/Blobgame.io-Web-Script@main/dist/blobio-extension.bundle.js
```

## Development

Use Node.js 20 or newer.

```bash
npm install
npm test
npm run build
```

Source files live in `src/`. The generated file in `dist/` is the runtime loaded by Tampermonkey.

## Current Feature

The first feature applies `assets/background.png` as a menu/page background using injected CSS. It does not try to alter the in-game canvas background.
