import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const imageAssets = [
  'background.png',
  'discord_icon.png',
  'facebook_icon.png',
  'instagram_icon.png',
  'socal_icon_n.png',
  'update_notes_n_.png',
  'youtube_icon.png',
  'yt_recommended_n.png',
];

const headerButtonAssets = [
  'socal_icon_n.png',
  'update_notes_n_.png',
  'yt_recommended_n.png',
];

test('PNG assets are kept in the assets directory', () => {
  for (const fileName of imageAssets) {
    assert.equal(existsSync(resolve(root, 'assets', fileName)), true, `${fileName} should be in assets/`);
    assert.equal(existsSync(resolve(root, fileName)), false, `${fileName} should not live at repo root`);
  }
});

test('header button PNGs fill the button canvas like Blobgame icons', () => {
  for (const fileName of headerButtonAssets) {
    const { width, height, alphaBox } = readPngAlphaBox(resolve(root, 'assets', fileName));

    assert.equal(alphaBox.width / width >= 0.96, true, `${fileName} has too much horizontal transparent padding`);
    assert.equal(alphaBox.height / height >= 0.96, true, `${fileName} has too much vertical transparent padding`);
  }
});

function readPngAlphaBox(filePath) {
  const bytes = readFileSync(filePath);
  const signature = bytes.subarray(0, 8).toString('hex');
  assert.equal(signature, '89504e470d0a1a0a', `${filePath} is not a PNG`);

  let offset = 8;
  let width = 0;
  let height = 0;
  const idatChunks = [];

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const data = bytes.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, `${filePath} should use 8-bit channels`);
      assert.equal(data[9], 6, `${filePath} should be RGBA`);
      assert.equal(data[12], 0, `${filePath} should not be interlaced`);
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idatChunks));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  let rawOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const current = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
    rawOffset += stride;
    unfilterLine(current, previous, filter, 4);
    current.copy(pixels, y * stride);
    previous = current;
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * stride) + (x * 4) + 3];
      if (alpha <= 10) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return {
    width,
    height,
    alphaBox: {
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}

function unfilterLine(line, previous, filter, bytesPerPixel) {
  for (let index = 0; index < line.length; index += 1) {
    const left = index >= bytesPerPixel ? line[index - bytesPerPixel] : 0;
    const up = previous[index] || 0;
    const upperLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] || 0 : 0;

    if (filter === 1) {
      line[index] = (line[index] + left) & 0xff;
    } else if (filter === 2) {
      line[index] = (line[index] + up) & 0xff;
    } else if (filter === 3) {
      line[index] = (line[index] + Math.floor((left + up) / 2)) & 0xff;
    } else if (filter === 4) {
      line[index] = (line[index] + paeth(left, up, upperLeft)) & 0xff;
    }
  }
}

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);

  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) {
    return left;
  }

  if (upDistance <= upperLeftDistance) {
    return up;
  }

  return upperLeft;
}
