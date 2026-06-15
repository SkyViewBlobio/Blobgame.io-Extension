import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputFile = resolve(rootDir, 'dist/blobio-extension.bundle.js');
const loaderFile = resolve(rootDir, 'loader/blobio-loader.user.js');
const virusRuntimeFile = resolve(rootDir, 'src/virus/pageVirusMotherCellBootstrap.js');
const virusAssetFiles = {
  halo: resolve(rootDir, 'assets/virus_glow_1 _mask.png'),
  rotate: resolve(rootDir, 'assets/viurs_glow_2_random_rotate_mask.png'),
  ring: resolve(rootDir, 'assets/virus_glow_3 _mask.png'),
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

const [loaderSource, runtimeSource, virusHalo, virusRotate, virusRing] = await Promise.all([
  readFile(loaderFile, 'utf8'),
  readFile(virusRuntimeFile, 'utf8'),
  readFile(virusAssetFiles.halo),
  readFile(virusAssetFiles.rotate),
  readFile(virusAssetFiles.ring),
]);

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
await writeFile(loaderFile, nextLoader);
