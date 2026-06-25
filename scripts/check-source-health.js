import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkedRoots = [
  'loader/blobio-loader.template.js',
  'scripts/build.js',
  'src/features/MenuFeature.js',
  'src/features/MenuFeatureContent.js',
  'src/features/MenuFeatureDiscovery.js',
  'src/features/MenuFeatureSettingsConfig.js',
  'src/features/ChatSettingsFeature.js',
  'src/features/chatSettings',
  'src/css/MenuFeatureStyles.js',
  'src/css/menu',
];
const ignoredSegments = new Set(['dist', 'node_modules', 'outputs']);
const controlKeywords = new Set(['if', 'for', 'while', 'switch', 'catch', 'with']);
const fileSizeLimits = new Map([
  ['loader/blobio-loader.template.js', 120],
  ['src/features/MenuFeature.js', 80],
  ['src/features/ChatSettingsFeature.js', 80],
  ['src/css/MenuFeatureStyles.js', 12],
  ['scripts/build.js', 24],
]);

const limits = {
  maxLines: 900,
  maxLinesPerFunction: 180,
  maxDepth: 7,
  complexity: 35,
};

let warnings = 0;

for (const file of await collectFiles()) {
  const source = await readFile(file, 'utf8');
  const rel = normalize(relative(rootDir, file));
  await checkFileSize(file, rel);
  checkLineCount(source, rel);
  checkFunctions(source, rel);
}

if (warnings === 0) {
  console.log('[source-health] no warnings');
}

async function collectFiles() {
  const files = [];

  for (const entry of checkedRoots) {
    const absolute = resolve(rootDir, entry);
    const info = await stat(absolute);

    if (info.isDirectory()) {
      files.push(...await collectDirectory(absolute));
    } else if (isCheckedFile(absolute)) {
      files.push(absolute);
    }
  }

  return files.sort();
}

async function collectDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    const relSegments = normalize(relative(rootDir, absolute)).split('/');
    if (relSegments.some((segment) => ignoredSegments.has(segment))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...await collectDirectory(absolute));
    } else if (isCheckedFile(absolute)) {
      files.push(absolute);
    }
  }

  return files;
}

function isCheckedFile(file) {
  return extname(file) === '.js' && !normalize(relative(rootDir, file)).startsWith('loader/blobio-loader.user.js');
}

async function checkFileSize(file, rel) {
  const limitKb = fileSizeLimits.get(rel);
  if (!limitKb) {
    return;
  }

  const { size } = await stat(file);
  const sizeKb = size / 1024;
  if (sizeKb > limitKb) {
    warn(`${rel} is ${sizeKb.toFixed(1)} KB; warning limit is ${limitKb} KB.`);
  }
}

function checkLineCount(source, rel) {
  const lines = source.split(/\r?\n/).length;
  if (lines > limits.maxLines) {
    warn(`${rel} has ${lines} lines; warning limit is ${limits.maxLines}.`);
  }
}

function checkFunctions(source, rel) {
  const functionMatches = findFunctionStarts(source);

  for (const match of functionMatches) {
    const block = readBlock(source, match.braceIndex);
    if (!block) {
      continue;
    }

    const line = lineNumberAt(source, match.index);
    const label = `${rel}:${line} ${match.name}`;
    const lines = block.text.split(/\r?\n/).length;
    const depth = maxBraceDepth(block.text);
    const complexity = estimateComplexity(block.text);

    if (lines > limits.maxLinesPerFunction) {
      warn(`${label} has ${lines} lines; warning limit is ${limits.maxLinesPerFunction}.`);
    }

    if (depth > limits.maxDepth) {
      warn(`${label} nesting depth is ${depth}; warning limit is ${limits.maxDepth}.`);
    }

    if (complexity > limits.complexity) {
      warn(`${label} complexity estimate is ${complexity}; warning limit is ${limits.complexity}.`);
    }

    if (hasMixedReturnStyles(block.text)) {
      warn(`${label} mixes value returns and bare returns.`);
    }
  }
}

function findFunctionStarts(source) {
  const matches = [];
  const patterns = [
    /\b(?:async\s+)?function\s+([A-Za-z0-9_$]*)\s*\([^)]*\)\s*\{/g,
    /^\s*(?:async\s+)?([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/gm,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source))) {
      const braceIndex = source.indexOf('{', match.index);
      const name = match[1] || '<anonymous>';
      if (braceIndex !== -1 && !controlKeywords.has(name)) {
        matches.push({ index: match.index, braceIndex, name });
      }
    }
  }

  return matches.sort((a, b) => a.index - b.index);
}

function readBlock(source, braceIndex) {
  let depth = 0;

  for (let index = braceIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { text: source.slice(braceIndex, index + 1), endIndex: index };
      }
    }
  }

  return null;
}

function maxBraceDepth(source) {
  let depth = 0;
  let maxDepth = 0;

  for (const char of source) {
    if (char === '{') {
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
    } else if (char === '}') {
      depth = Math.max(0, depth - 1);
    }
  }

  return maxDepth;
}

function estimateComplexity(source) {
  const tokens = source.match(/\b(if|for|while|case|catch|\?\s|&&|\|\|)\b/g) || [];
  return 1 + tokens.length;
}

function hasMixedReturnStyles(source) {
  const returns = [...source.matchAll(/\breturn(?:\s+([^;\n]+))?/g)];
  const hasBare = returns.some((match) => !match[1] || match[1].trim() === '');
  const hasValue = returns.some((match) => match[1] && match[1].trim() !== '');
  return hasBare && hasValue;
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function warn(message) {
  warnings += 1;
  console.warn(`[source-health] ${message}`);
}

function normalize(path) {
  return path.split(sep).join('/');
}
