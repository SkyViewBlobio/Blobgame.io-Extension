import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputFile = resolve(rootDir, 'dist/blobio-extension.bundle.js');
const loaderFile = resolve(rootDir, 'loader/blobio-loader.user.js');
const virusRuntimeFile = resolve(rootDir, 'src/virus/pageVirusMotherCellBootstrap.js');
const virusPelletColorRuntimeFile = resolve(rootDir, 'src/cellColors/pageVirusPelletColorsBootstrap.js');
const jellyShaderRuntimeFile = resolve(rootDir, 'src/jelly/pageJellyShaderBootstrap.js');
const hudInfoRuntimeFile = resolve(rootDir, 'src/hud/pageHudInfoBootstrap.js');
const emoteSkinRuntimeFile = resolve(rootDir, 'src/emotes/pageEmoteSkinBootstrap.js');
const virusAssetFiles = {
  halo: resolve(rootDir, 'assets/virus_glow_1 _mask.png'),
  rotate: resolve(rootDir, 'assets/viurs_glow_2_random_rotate_mask.png'),
  ring: resolve(rootDir, 'assets/virus_glow_3 _mask.png'),
};
const emoteSkinAssetFiles = {
  cool: resolve(rootDir, 'assets/emote_cool.png'),
  hi: resolve(rootDir, 'assets/emote_hi.png'),
  nice: resolve(rootDir, 'assets/emote_nice.png'),
  pop: resolve(rootDir, 'assets/emote_pop.png'),
  thx: resolve(rootDir, 'assets/emote_thx.png'),
  why: resolve(rootDir, 'assets/emote_why.png'),
  yo: resolve(rootDir, 'assets/emote_yo.png'),
};

await mkdir(dirname(outputFile), { recursive: true });

await build({
  entryPoints: [resolve(rootDir, 'src/main.js')],
  outfile: outputFile,
  bundle: true,
  format: 'iife',
  target: 'es2020',
  loader: {
    '.png': 'dataurl',
  },
  banner: {
    js: '/* Blobio extension bundle. Generated from src/. */',
  },
});

const [
  loaderSource,
  runtimeSource,
  virusPelletColorRuntimeSource,
  jellyShaderRuntimeSource,
  hudInfoRuntimeSource,
  emoteSkinRuntimeSource,
  virusHalo,
  virusRotate,
  virusRing,
  emoteCool,
  emoteHi,
  emoteNice,
  emotePop,
  emoteThx,
  emoteWhy,
  emoteYo,
] = await Promise.all([
  readFile(loaderFile, 'utf8'),
  readFile(virusRuntimeFile, 'utf8'),
  readFile(virusPelletColorRuntimeFile, 'utf8'),
  readFile(jellyShaderRuntimeFile, 'utf8'),
  readFile(hudInfoRuntimeFile, 'utf8'),
  readFile(emoteSkinRuntimeFile, 'utf8'),
  readFile(virusAssetFiles.halo),
  readFile(virusAssetFiles.rotate),
  readFile(virusAssetFiles.ring),
  readFile(emoteSkinAssetFiles.cool),
  readFile(emoteSkinAssetFiles.hi),
  readFile(emoteSkinAssetFiles.nice),
  readFile(emoteSkinAssetFiles.pop),
  readFile(emoteSkinAssetFiles.thx),
  readFile(emoteSkinAssetFiles.why),
  readFile(emoteSkinAssetFiles.yo),
]);

function embedRuntime(loader, startMarker, endMarker, source, exportName) {
  const startIndex = loader.indexOf(startMarker);
  const endIndex = loader.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`${exportName} runtime markers are missing from the loader.`);
  }

  const embedded = source
    .replace(new RegExp(`export\\s+function\\s+${exportName}`), `function ${exportName}`)
    .trim()
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

  return `${loader.slice(0, startIndex)}${startMarker}\n${embedded}\n${endMarker}${loader.slice(endIndex + endMarker.length)}`;
}

const runtimeStartMarker = '  /* VIRUS_RUNTIME_START */';
const runtimeEndMarker = '  /* VIRUS_RUNTIME_END */';
const runtimeStartIndex = loaderSource.indexOf(runtimeStartMarker);
const runtimeEndIndex = loaderSource.indexOf(runtimeEndMarker);
if (runtimeStartIndex === -1 || runtimeEndIndex === -1 || runtimeEndIndex < runtimeStartIndex) {
  throw new Error('Virus runtime markers are missing from the loader.');
}

const embeddedRuntime = runtimeSource
  .replace(/^export\s+function\s+pageVirusMotherCellBootstrap/, 'function pageVirusMotherCellBootstrap')
  .trim()
  .split('\n')
  .map((line) => `  ${line}`)
  .join('\n');

let nextLoader = `${loaderSource.slice(0, runtimeStartIndex)}${runtimeStartMarker}\n${embeddedRuntime}\n${runtimeEndMarker}${loaderSource.slice(runtimeEndIndex + runtimeEndMarker.length)}`;

const virusPelletColorRuntimeStartMarker = '  /* VIRUS_PELLET_COLOR_RUNTIME_START */';
const virusPelletColorRuntimeEndMarker = '  /* VIRUS_PELLET_COLOR_RUNTIME_END */';
const virusPelletColorRuntimeStartIndex = nextLoader.indexOf(virusPelletColorRuntimeStartMarker);
const virusPelletColorRuntimeEndIndex = nextLoader.indexOf(virusPelletColorRuntimeEndMarker);
if (
  virusPelletColorRuntimeStartIndex === -1
  || virusPelletColorRuntimeEndIndex === -1
  || virusPelletColorRuntimeEndIndex < virusPelletColorRuntimeStartIndex
) {
  throw new Error('Virus pellet color runtime markers are missing from the loader.');
}

const embeddedVirusPelletColorRuntime = virusPelletColorRuntimeSource
  .replace(/export\s+function\s+pageVirusPelletColorsBootstrap/, 'function pageVirusPelletColorsBootstrap')
  .trim()
  .split('\n')
  .map((line) => `  ${line}`)
  .join('\n');

nextLoader = `${nextLoader.slice(0, virusPelletColorRuntimeStartIndex)}${virusPelletColorRuntimeStartMarker}\n${embeddedVirusPelletColorRuntime}\n${virusPelletColorRuntimeEndMarker}${nextLoader.slice(virusPelletColorRuntimeEndIndex + virusPelletColorRuntimeEndMarker.length)}`;

nextLoader = embedRuntime(
  nextLoader,
  '  /* JELLY_SHADER_RUNTIME_START */',
  '  /* JELLY_SHADER_RUNTIME_END */',
  jellyShaderRuntimeSource,
  'pageJellyShaderBootstrap',
);

nextLoader = embedRuntime(
  nextLoader,
  '  /* HUD_INFO_RUNTIME_START */',
  '  /* HUD_INFO_RUNTIME_END */',
  hudInfoRuntimeSource,
  'pageHudInfoBootstrap',
);

nextLoader = embedRuntime(
  nextLoader,
  '  /* EMOTE_SKIN_RUNTIME_START */',
  '  /* EMOTE_SKIN_RUNTIME_END */',
  emoteSkinRuntimeSource,
  'pageEmoteSkinBootstrap',
);

const assetStartMarker = '  /* VIRUS_ASSETS_START */';
const assetEndMarker = '  /* VIRUS_ASSETS_END */';
const assetStartIndex = nextLoader.indexOf(assetStartMarker);
const assetEndIndex = nextLoader.indexOf(assetEndMarker);
if (assetStartIndex === -1 || assetEndIndex === -1 || assetEndIndex < assetStartIndex) {
  throw new Error('Virus asset markers are missing from the loader.');
}

const toDataUrl = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`;
const embeddedAssets = `${assetStartMarker}\n  const VIRUS_MOTHER_CELL_ASSET_URLS = {\n    halo: '${toDataUrl(virusHalo)}',\n    rotate: '${toDataUrl(virusRotate)}',\n    ring: '${toDataUrl(virusRing)}',\n  };\n  ${assetEndMarker}`;

nextLoader = `${nextLoader.slice(0, assetStartIndex)}${embeddedAssets}${nextLoader.slice(assetEndIndex + assetEndMarker.length)}`;

const emoteAssetStartMarker = '  /* EMOTE_SKIN_ASSETS_START */';
const emoteAssetEndMarker = '  /* EMOTE_SKIN_ASSETS_END */';
const emoteAssetStartIndex = nextLoader.indexOf(emoteAssetStartMarker);
const emoteAssetEndIndex = nextLoader.indexOf(emoteAssetEndMarker);
if (emoteAssetStartIndex === -1 || emoteAssetEndIndex === -1 || emoteAssetEndIndex < emoteAssetStartIndex) {
  throw new Error('Emote Skin asset markers are missing from the loader.');
}

const embeddedEmoteAssets = `${emoteAssetStartMarker}\n  const EMOTE_SKIN_ASSET_URLS = {\n    cool: '${toDataUrl(emoteCool)}',\n    hi: '${toDataUrl(emoteHi)}',\n    nice: '${toDataUrl(emoteNice)}',\n    pop: '${toDataUrl(emotePop)}',\n    thx: '${toDataUrl(emoteThx)}',\n    why: '${toDataUrl(emoteWhy)}',\n    yo: '${toDataUrl(emoteYo)}',\n  };\n  ${emoteAssetEndMarker}`;

nextLoader = `${nextLoader.slice(0, emoteAssetStartIndex)}${embeddedEmoteAssets}${nextLoader.slice(emoteAssetEndIndex + emoteAssetEndMarker.length)}`;
await writeFile(loaderFile, nextLoader);
