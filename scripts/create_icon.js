const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height) {
  // RGBA buffer: 4 bytes per pixel + 1 filter byte per scanline
  const scanlineLength = 1 + width * 4;
  const raw = Buffer.alloc(height * scanlineLength);

  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.44;
  const rInner = width * 0.38;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    raw[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= rOuter) {
        // Cyber radial gradient from deep navy to cyan/blue
        const t = dist / rOuter;
        let red = Math.floor(6 + (14 - 6) * t);
        let green = Math.floor(182 * (1 - t * 0.7) + 14);
        let blue = Math.floor(212 * (1 - t * 0.4) + 60);
        let alpha = 255;

        // Anti-aliased outer edge
        if (dist > rOuter - 2) {
          alpha = Math.floor(255 * (rOuter - dist) / 2);
        }

        // Draw glowing inner radar ring
        if (Math.abs(dist - rInner * 0.7) < 3.5 || Math.abs(dist - rInner * 0.35) < 2.5) {
          red = 56;
          green = 189;
          blue = 248;
        }

        // Draw crosshair axes
        if ((Math.abs(dx) < 2 && Math.abs(dy) < rInner) || (Math.abs(dy) < 2 && Math.abs(dx) < rInner)) {
          red = 14;
          green = 165;
          blue = 233;
        }

        // Central glowing pulse core
        if (dist < 12) {
          red = 240;
          green = 249;
          blue = 255;
        }

        raw[pxOffset] = red;
        raw[pxOffset + 1] = green;
        raw[pxOffset + 2] = blue;
        raw[pxOffset + 3] = alpha;
      } else {
        // Transparent outside
        raw[pxOffset] = 0;
        raw[pxOffset + 1] = 0;
        raw[pxOffset + 2] = 0;
        raw[pxOffset + 3] = 0;
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idat = makeChunk('IDAT', compressed);

  // IEND
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.slice(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Standard CRC32
function crc32(buf) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function makeIcoFromPng(pngBuffer) {
  // Windows ICO containing 1 PNG image (256x256)
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // 1 Image

  const dirEntry = Buffer.alloc(16);
  dirEntry[0] = 0; // 256 width (0 = 256)
  dirEntry[1] = 0; // 256 height (0 = 256)
  dirEntry[2] = 0; // Color count
  dirEntry[3] = 0; // Reserved
  dirEntry.writeUInt16LE(1, 4); // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
  dirEntry.writeUInt32LE(22, 12); // Offset = 6 (header) + 16 (dirEntry) = 22

  return Buffer.concat([icoHeader, dirEntry, pngBuffer]);
}

// Generate files in build/ and public/
const buildDir = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

const png = createPng(256, 256);
const ico = makeIcoFromPng(png);

fs.writeFileSync(path.join(buildDir, 'icon.png'), png);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);
fs.writeFileSync(path.join(publicDir, 'icon.png'), png);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);

console.log('Successfully generated high-resolution cyber icons (icon.png & icon.ico)!');
