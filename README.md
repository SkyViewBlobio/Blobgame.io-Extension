# Blobgame.io Web Extension

Tampermonkey loader and modular extension code for `blobgame.io` and `custom.client.blobgame.io`.

The installed userscript is only a loader. It fetches the built extension bundle from GitHub, with jsDelivr as a fallback, so users can receive updates without reinstalling the full script.

## Install

This install URL only works for normal Tampermonkey users.

Install this loader in Tampermonkey:

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
