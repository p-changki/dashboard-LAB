import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = path.join(ROOT, "build-resources");
const ICONSET_DIR = path.join(BUILD_DIR, "icon.iconset");
const ICNS_PATH = path.join(BUILD_DIR, "icon.icns");
const ICO_PATH = path.join(BUILD_DIR, "icon.ico");
const PNG_PATH = path.join(BUILD_DIR, "icon.png");

const ICON_SPECS = [
  { file: "icon_16x16.png", size: 16 },
  { file: "icon_16x16@2x.png", size: 32 },
  { file: "icon_32x32.png", size: 32 },
  { file: "icon_32x32@2x.png", size: 64 },
  { file: "icon_128x128.png", size: 128 },
  { file: "icon_128x128@2x.png", size: 256 },
  { file: "icon_256x256.png", size: 256 },
  { file: "icon_256x256@2x.png", size: 512 },
  { file: "icon_512x512.png", size: 512 },
  { file: "icon_512x512@2x.png", size: 1024 },
];

mkdirSync(BUILD_DIR, { recursive: true });
rmSync(ICONSET_DIR, { recursive: true, force: true });
mkdirSync(ICONSET_DIR, { recursive: true });

for (const spec of ICON_SPECS) {
  writeFileSync(path.join(ICONSET_DIR, spec.file), createPng(spec.size));
}

writeFileSync(PNG_PATH, createPng(1024));
writeFileSync(ICO_PATH, createIco(createPng(256), 256));

if (process.platform === "darwin") {
  const iconutil = spawnSync("iconutil", ["-c", "icns", ICONSET_DIR, "-o", ICNS_PATH], {
    stdio: "inherit",
  });

  if (iconutil.status !== 0) {
    process.exit(iconutil.status ?? 1);
  }
}

rmSync(ICONSET_DIR, { recursive: true, force: true });

console.log(`Generated ${PNG_PATH}`);
console.log(`Generated ${ICO_PATH}`);
if (process.platform === "darwin") {
  console.log(`Generated ${ICNS_PATH}`);
}

function createPng(size) {
  const raw = renderIcon(size);
  const stride = size * 4 + 1;
  const scanlines = Buffer.alloc(stride * size);

  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * stride;
    scanlines[rowOffset] = 0;
    raw.copy(scanlines, rowOffset + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", encodeIhdr(size, size)),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function renderIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = size * 0.23;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4;
      const background = backgroundColor(x, y, size);
      pixels[idx] = background.r;
      pixels[idx + 1] = background.g;
      pixels[idx + 2] = background.b;
      pixels[idx + 3] = 255;
    }
  }

  fillRoundedRect(pixels, size, size * 0.07, size * 0.07, size * 0.86, size * 0.86, radius, {
    r: 12,
    g: 18,
    b: 22,
    a: 255,
  });

  fillAura(pixels, size, size * 0.38, size * 0.34, size * 0.28, { r: 44, g: 197, b: 188 });
  fillAura(pixels, size, size * 0.7, size * 0.72, size * 0.22, { r: 105, g: 240, b: 174 });

  const white = { r: 248, g: 250, b: 252, a: 255 };
  const mint = { r: 137, g: 255, b: 214, a: 255 };
  const stroke = size * 0.08;
  const letterTop = size * 0.26;
  const letterBottom = size * 0.76;
  const dLeft = size * 0.23;
  const dRight = size * 0.51;
  const lLeft = size * 0.61;

  fillRoundedRect(pixels, size, dLeft, letterTop, stroke, letterBottom - letterTop, stroke * 0.45, white);
  fillRoundedRect(pixels, size, dLeft, letterTop, dRight - dLeft, stroke, stroke * 0.45, white);
  fillRoundedRect(pixels, size, dLeft, letterBottom - stroke, dRight - dLeft, stroke, stroke * 0.45, white);
  fillRoundedRect(pixels, size, dRight - stroke, letterTop + stroke, stroke, letterBottom - letterTop - stroke * 2, stroke * 0.45, white);

  fillRoundedRect(pixels, size, lLeft, letterTop, stroke, letterBottom - letterTop, stroke * 0.45, mint);
  fillRoundedRect(pixels, size, lLeft, letterBottom - stroke, size * 0.18, stroke, stroke * 0.45, mint);

  const shineWidth = size * 0.18;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.abs(y - x * 0.88);
      const intensity = clamp((shineWidth - distance) / shineWidth, 0, 1) * 0.08;
      if (intensity <= 0) {
        continue;
      }

      blendPixel(pixels, size, x, y, {
        r: 255,
        g: 255,
        b: 255,
        a: Math.round(255 * intensity),
      });
    }
  }

  return pixels;
}

function backgroundColor(x, y, size) {
  const nx = x / Math.max(size - 1, 1);
  const ny = y / Math.max(size - 1, 1);
  const mix = clamp(0.12 + nx * 0.18 + (1 - ny) * 0.2, 0, 1);
  return {
    r: Math.round(6 + mix * 14),
    g: Math.round(10 + mix * 18),
    b: Math.round(14 + mix * 26),
  };
}

function fillAura(pixels, size, cx, cy, radius, color) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(size - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(size - 1, Math.ceil(cy + radius));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const alpha = clamp(1 - distance / radius, 0, 1);
      if (alpha <= 0) {
        continue;
      }

      blendPixel(pixels, size, x, y, {
        r: color.r,
        g: color.g,
        b: color.b,
        a: Math.round(alpha * 150),
      });
    }
  }
}

function fillRoundedRect(pixels, size, x, y, width, height, radius, color) {
  const minX = Math.max(0, Math.floor(x));
  const maxX = Math.min(size - 1, Math.ceil(x + width));
  const minY = Math.max(0, Math.floor(y));
  const maxY = Math.min(size - 1, Math.ceil(y + height));

  for (let py = minY; py <= maxY; py += 1) {
    for (let px = minX; px <= maxX; px += 1) {
      const coverage = roundedRectCoverage(px + 0.5, py + 0.5, x, y, width, height, radius);
      if (coverage <= 0) {
        continue;
      }

      blendPixel(pixels, size, px, py, {
        r: color.r,
        g: color.g,
        b: color.b,
        a: Math.round((color.a ?? 255) * coverage),
      });
    }
  }
}

function roundedRectCoverage(px, py, x, y, width, height, radius) {
  const right = x + width;
  const bottom = y + height;
  const innerX = clamp(px, x + radius, right - radius);
  const innerY = clamp(py, y + radius, bottom - radius);
  const dx = px - innerX;
  const dy = py - innerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return clamp(radius - distance + 0.5, 0, 1);
}

function blendPixel(pixels, size, x, y, color) {
  const idx = (y * size + x) * 4;
  const alpha = (color.a ?? 255) / 255;
  const inverse = 1 - alpha;

  pixels[idx] = Math.round(color.r * alpha + pixels[idx] * inverse);
  pixels[idx + 1] = Math.round(color.g * alpha + pixels[idx + 1] * inverse);
  pixels[idx + 2] = Math.round(color.b * alpha + pixels[idx + 2] * inverse);
  pixels[idx + 3] = 255;
}

function encodeIhdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directory = Buffer.alloc(16);
  directory[0] = size >= 256 ? 0 : size;
  directory[1] = size >= 256 ? 0 : size;
  directory[2] = 0;
  directory[3] = 0;
  directory.writeUInt16LE(1, 4);
  directory.writeUInt16LE(32, 6);
  directory.writeUInt32LE(pngBuffer.length, 8);
  directory.writeUInt32LE(header.length + directory.length, 12);

  return Buffer.concat([header, directory, pngBuffer]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
