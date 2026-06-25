import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputFile = resolve(rootDir, 'dist/blobio-extension.bundle.js');
const loaderTemplateFile = resolve(rootDir, 'loader/blobio-loader.template.js');
const loaderFile = resolve(rootDir, 'loader/blobio-loader.user.js');

const runtimeSpecs = [
  {
    startMarker: '  /* VIRUS_RUNTIME_START */',
    endMarker: '  /* VIRUS_RUNTIME_END */',
    file: resolve(rootDir, 'src/virus/pageVirusMotherCellBootstrap.js'),
    exportName: 'pageVirusMotherCellBootstrap',
  },
  {
    startMarker: '  /* VIRUS_PELLET_COLOR_RUNTIME_START */',
    endMarker: '  /* VIRUS_PELLET_COLOR_RUNTIME_END */',
    file: resolve(rootDir, 'src/cellColors/pageVirusPelletColorsBootstrap.js'),
    exportName: 'pageVirusPelletColorsBootstrap',
  },
  {
    startMarker: '  /* JELLY_SHADER_RUNTIME_START */',
    endMarker: '  /* JELLY_SHADER_RUNTIME_END */',
    file: resolve(rootDir, 'src/jelly/pageJellyShaderBootstrap.js'),
    exportName: 'pageJellyShaderBootstrap',
  },
  {
    startMarker: '  /* HUD_INFO_RUNTIME_START */',
    endMarker: '  /* HUD_INFO_RUNTIME_END */',
    file: resolve(rootDir, 'src/hud/pageHudInfoBootstrap.js'),
    exportName: 'pageHudInfoBootstrap',
  },
  {
    startMarker: '  /* EMOTE_SKIN_RUNTIME_START */',
    endMarker: '  /* EMOTE_SKIN_RUNTIME_END */',
    file: resolve(rootDir, 'src/emotes/pageEmoteSkinBootstrap.js'),
    exportName: 'pageEmoteSkinBootstrap',
  },
  {
    startMarker: '  /* CELL_MASS_RUNTIME_START */',
    endMarker: '  /* CELL_MASS_RUNTIME_END */',
    file: resolve(rootDir, 'src/cellMass/pageCellMassBootstrap.js'),
    exportName: 'pageCellMassBootstrap',
  },
  {
    startMarker: '  /* FPS_SAVER_RUNTIME_START */',
    endMarker: '  /* FPS_SAVER_RUNTIME_END */',
    file: resolve(rootDir, 'src/fpsSaver/pageFpsSaverBootstrap.js'),
    exportName: 'pageFpsSaverBootstrap',
  },
];

const assetSpecs = [
  {
    startMarker: '  /* VIRUS_ASSETS_START */',
    endMarker: '  /* VIRUS_ASSETS_END */',
    constName: 'VIRUS_MOTHER_CELL_ASSET_URLS',
    files: {
      halo: resolve(rootDir, 'assets/virus_glow_1 _mask.png'),
      rotate: resolve(rootDir, 'assets/viurs_glow_2_random_rotate_mask.png'),
      ring: resolve(rootDir, 'assets/virus_glow_3 _mask.png'),
    },
  },
  {
    startMarker: '  /* EMOTE_SKIN_ASSETS_START */',
    endMarker: '  /* EMOTE_SKIN_ASSETS_END */',
    constName: 'EMOTE_SKIN_ASSET_URLS',
    files: {
      cool: resolve(rootDir, 'assets/emote_cool.png'),
      hi: resolve(rootDir, 'assets/emote_hi.png'),
      nice: resolve(rootDir, 'assets/emote_nice.png'),
      pop: resolve(rootDir, 'assets/emote_pop.png'),
      thx: resolve(rootDir, 'assets/emote_thx.png'),
      why: resolve(rootDir, 'assets/emote_why.png'),
      yo: resolve(rootDir, 'assets/emote_yo.png'),
    },
  },
];

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
});

const bundleWithoutGeneratedMarkers = (await readFile(outputFile, 'utf8'))
  .replace(/^\s*\/\/ (?:assets|data|dist|loader|node_modules|src)\/[^\r\n]*(?:\r?\n|$)/gm, '');
await writeFile(outputFile, bundleWithoutGeneratedMarkers);

function replaceBetweenMarkers(source, startMarker, endMarker, body, label) {
  const startIndex = source.indexOf(startMarker);
  const endIndex = source.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`${label} markers are missing from the loader template.`);
  }

  return `${source.slice(0, startIndex)}${startMarker}\n${body}\n${endMarker}${source.slice(endIndex + endMarker.length)}`;
}

function embedRuntime(loader, { startMarker, endMarker, source, exportName }) {
  const exportPattern = new RegExp(`export\\s+function\\s+${exportName}`);
  if (!exportPattern.test(source)) {
    throw new Error(`${exportName} export was not found.`);
  }

  const embedded = source
    .replace(/\r\n/g, '\n')
    .replace(exportPattern, `function ${exportName}`)
    .trim()
    .split('\n')
    .map((line) => (line.length > 0 ? `  ${line}` : ''))
    .join('\n');

  return replaceBetweenMarkers(loader, startMarker, endMarker, embedded, `${exportName} runtime`);
}

const toDataUrl = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`;

function embedAssetMap(loader, { startMarker, endMarker, constName, entries }) {
  const lines = entries
    .map(([key, buffer]) => `    ${key}: '${toDataUrl(buffer)}',`)
    .join('\n');
  const body = `  const ${constName} = {\n${lines}\n  };`;

  return replaceBetweenMarkers(loader, startMarker, endMarker, body, constName);
}

let nextLoader = await readFile(loaderTemplateFile, 'utf8');

for (const spec of runtimeSpecs) {
  const source = await readFile(spec.file, 'utf8');
  nextLoader = embedRuntime(nextLoader, { ...spec, source });
}

for (const spec of assetSpecs) {
  const entries = await Promise.all(
    Object.entries(spec.files).map(async ([key, file]) => [key, await readFile(file)]),
  );
  nextLoader = embedAssetMap(nextLoader, { ...spec, entries });
}

await writeFile(loaderFile, nextLoader);
