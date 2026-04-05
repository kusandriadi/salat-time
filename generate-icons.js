#!/usr/bin/env node
// Generates PWA icons programmatically using only Node.js built-ins
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 lookup table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcIn = Buffer.concat([t, data]);
  const crcOut = Buffer.alloc(4);
  crcOut.writeUInt32BE(crc32(crcIn));
  return Buffer.concat([len, t, data, crcOut]);
}

function generateIcon(size) {
  const pixels = Buffer.alloc(size * size * 4, 0);
  const cx = size / 2;
  const cy = size / 2;
  const cornerRadius = size * 0.22;
  const halfSize = size / 2;

  // Moon parameters
  const moonR = size * 0.32;
  const moonCx = cx - size * 0.02;
  const moonCy = cy;
  const innerR = moonR * 0.73;
  const innerOffX = moonR * 0.40;
  const innerOffY = -moonR * 0.08;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;

      // Rounded rectangle clipping
      const rx = Math.abs(dx) - (halfSize - cornerRadius);
      const ry = Math.abs(dy) - (halfSize - cornerRadius);
      const inBounds = rx <= 0 || ry <= 0 ||
        Math.sqrt(Math.max(0, rx) ** 2 + Math.max(0, ry) ** 2) <= cornerRadius;

      if (!inBounds) continue; // transparent pixel

      // Teal background #0f766e
      pixels[i]   = 15;
      pixels[i+1] = 118;
      pixels[i+2] = 110;
      pixels[i+3] = 255;

      // Crescent moon: inside outer circle but outside inner (offset) circle
      const mdx = x - moonCx;
      const mdy = y - moonCy;
      const moonDist = Math.sqrt(mdx * mdx + mdy * mdy);

      const icx = moonCx + innerOffX;
      const icy = moonCy + innerOffY;
      const idx2 = x - icx;
      const idy2 = y - icy;
      const innerDist = Math.sqrt(idx2 * idx2 + idy2 * idy2);

      if (moonDist <= moonR && innerDist > innerR) {
        pixels[i]   = 255;
        pixels[i+1] = 255;
        pixels[i+2] = 255;
        pixels[i+3] = 255;
      }
    }
  }

  // Build PNG binary
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  // compression, filter, interlace = 0 (already zero)
  const ihdr = pngChunk('IHDR', ihdrData);

  // Scanlines: each row prefixed with filter byte 0 (None)
  const rowStride = 1 + size * 4;
  const rawData = Buffer.alloc(size * rowStride);
  for (let y = 0; y < size; y++) {
    rawData[y * rowStride] = 0; // filter None
    pixels.copy(rawData, y * rowStride + 1, y * size * 4, (y + 1) * size * 4);
  }

  const idat = pngChunk('IDAT', zlib.deflateSync(rawData, { level: 6 }));
  const iend = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const iconsDir = path.join(__dirname, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

const sizes = [192, 512];
for (const size of sizes) {
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, generateIcon(size));
  console.log(`Generated: icons/icon-${size}.png`);
}

// Also generate apple-touch-icon (180x180)
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), generateIcon(180));
console.log('Generated: icons/apple-touch-icon.png');

console.log('All icons generated successfully!');
