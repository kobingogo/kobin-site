/**
 * Generate product-like PNG textures for product-turntable demo (no paid API).
 * Run: node scripts/generate-product-turntable-assets.mjs
 */
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}
const CRC = crcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crcBuf = Buffer.concat([typeB, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeB, data, crc]);
}
function writeRgbPng(file, w, h, paint) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const { r, g, b } = paint(x, y, w, h);
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
}

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
function mix(a, b, t) {
  return a + (b - a) * t;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "demos", "product-turntable");
fs.mkdirSync(root, { recursive: true });

// Product A: cyan bottle label (wrap-friendly gradient + brand band)
writeRgbPng(path.join(root, "bottle.png"), 512, 512, (x, y, w, h) => {
  const u = x / w;
  const v = y / h;
  const band = v > 0.35 && v < 0.62;
  const stripe = Math.abs(((u * 8) % 1) - 0.5) < 0.08;
  let r = mix(14, 34, u);
  let g = mix(116, 180, v);
  let b = mix(144, 220, u);
  if (band) {
    r = mix(8, 20, u);
    g = mix(40, 60, u);
    b = mix(55, 80, u);
  }
  if (band && stripe) {
    r = 34;
    g = 211;
    b = 238;
  }
  // label text block (fake)
  if (v > 0.42 && v < 0.55 && u > 0.28 && u < 0.72) {
    r = 226;
    g = 232;
    b = 240;
  }
  // highlight
  const hl = Math.exp(-((u - 0.22) ** 2) / 0.01) * 40;
  return { r: clamp(r + hl), g: clamp(g + hl), b: clamp(b + hl) };
});

// Product B: matte speaker grille
writeRgbPng(path.join(root, "speaker.png"), 512, 512, (x, y, w, h) => {
  const u = x / w;
  const v = y / h;
  const cx = u - 0.5;
  const cy = v - 0.5;
  const dist = Math.sqrt(cx * cx + cy * cy);
  let r = 30;
  let g = 35;
  let b = 45;
  // grille dots
  const gx = Math.floor(x / 10);
  const gy = Math.floor(y / 10);
  if ((gx + gy) % 2 === 0 && dist < 0.42) {
    r = 12;
    g = 14;
    b = 18;
  }
  if (dist > 0.42 && dist < 0.48) {
    r = 55;
    g = 65;
    b = 80;
  }
  // brand ring accent
  if (dist > 0.18 && dist < 0.22) {
    r = 34;
    g = 211;
    b = 238;
  }
  const rim = Math.max(0, 1 - Math.abs(dist - 0.45) * 12) * 25;
  return { r: clamp(r + rim), g: clamp(g + rim), b: clamp(b + rim) };
});

// Product C: warm ceramic mug / cup pattern
writeRgbPng(path.join(root, "mug.png"), 512, 512, (x, y, w, h) => {
  const u = x / w;
  const v = y / h;
  let r = mix(244, 250, u);
  let g = mix(228, 214, v);
  let b = mix(210, 190, u);
  // glaze band
  if (v > 0.2 && v < 0.28) {
    r = 14;
    g = 116;
    b = 144;
  }
  // soft clay speckles
  const n = ((x * 73 + y * 149) % 97) / 97;
  if (n > 0.92) {
    r -= 18;
    g -= 22;
    b -= 20;
  }
  // logo square
  if (u > 0.38 && u < 0.62 && v > 0.4 && v < 0.62) {
    r = 8;
    g = 47;
    b = 73;
  }
  if (u > 0.42 && u < 0.58 && v > 0.46 && v < 0.56) {
    r = 103;
    g = 232;
    b = 249;
  }
  return { r: clamp(r), g: clamp(g), b: clamp(b) };
});

// Generic proxy/fallback texture (checker + label) — used when recon is unusable
writeRgbPng(path.join(root, "proxy-fallback.png"), 256, 256, (x, y, w, h) => {
  const u = x / w;
  const v = y / h;
  const cell = (Math.floor(x / 32) + Math.floor(y / 32)) % 2 === 0;
  let r = cell ? 30 : 45;
  let g = cell ? 41 : 55;
  let b = cell ? 59 : 72;
  if (v > 0.4 && v < 0.6 && u > 0.15 && u < 0.85) {
    r = 8;
    g = 51;
    b = 68;
  }
  if (v > 0.45 && v < 0.55 && u > 0.25 && u < 0.75) {
    r = 165;
    g = 243;
    b = 252;
  }
  return { r, g, b };
});

fs.writeFileSync(
  path.join(root, "README.txt"),
  [
    "KobinFlow product-turntable sample textures",
    "Generated locally — no paid API / no keys.",
    "bottle.png / speaker.png / mug.png — product image drivers for 3 samples",
    "proxy-fallback.png — generic box proxy when recon is unrecognizable",
    "Regen: node scripts/generate-product-turntable-assets.mjs",
    "",
  ].join("\n"),
);

console.log("Wrote textures to", root);
