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
function solidPng(w, h, r, g, b) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function writeRgbPng(file, w, h, paint) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const { r, g, b } = paint(x, y, w, h);
      const i = row + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
}

const curated = [
  { id: "curated-chrome", label: "Chrome", color: "#c8d0dc", metalness: 1, roughness: 0.08 },
  { id: "curated-brushed", label: "Brushed Al", color: "#9aa3b2", metalness: 0.92, roughness: 0.38 },
  { id: "curated-gold", label: "Gold", color: "#d4a017", metalness: 1, roughness: 0.22 },
  { id: "curated-copper", label: "Copper", color: "#b87333", metalness: 0.95, roughness: 0.28 },
  { id: "curated-ceramic", label: "Ceramic", color: "#f4f0ea", metalness: 0.02, roughness: 0.55 },
  { id: "curated-rubber", label: "Rubber", color: "#1f2937", metalness: 0, roughness: 0.92 },
  { id: "curated-plastic", label: "Cyan Plastic", color: "#22d3ee", metalness: 0.05, roughness: 0.35 },
  { id: "curated-emissive", label: "Glow Glass", color: "#0e7490", metalness: 0.15, roughness: 0.12, emissive: "#22d3ee", emissiveIntensity: 0.45 },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "demos", "material-spheres");
const pack = path.join(root, "texture-pack");
fs.mkdirSync(path.join(pack, "swatches"), { recursive: true });

for (const m of curated) {
  const { r, g, b } = hexToRgb(m.color);
  fs.writeFileSync(path.join(pack, "swatches", `${m.id}.png`), solidPng(64, 64, r, g, b));
}

const manifest = {
  name: "material-spheres-curated-texture-pack",
  version: 1,
  source: "curated hand-tuned static wall",
  note: "Local export — no paid API. Color maps are solid swatches + PBR params JSON.",
  materials: curated.map((m) => ({
    ...m,
    colorMap: `swatches/${m.id}.png`,
  })),
};
fs.writeFileSync(path.join(pack, "materials.json"), JSON.stringify(manifest, null, 2));
fs.writeFileSync(
  path.join(pack, "README.md"),
  `# 贴图包 · material-spheres curated\n\n本地导出的精选手调静态墙色板 + PBR 参数（无付费 API）。\n\n- \`materials.json\` — 材质参数\n- \`swatches/*.png\` — 64×64 色板图\n\nDemo 页可点「导出贴图包」下载当前球墙的同结构 zip。\n首页预览图：[\`../homepage-ready.png\`](../homepage-ready.png)\n`,
);

// homepage-ready: dark studio-ish preview with 8 spheres as shaded circles
const W = 960, H = 540;
writeRgbPng(path.join(root, "homepage-ready.png"), W, H, (x, y, w, h) => {
  // radial vignette bg
  const cx = w / 2, cy = h / 2 + 10;
  const dx = (x - cx) / w, dy = (y - cy) / h;
  const v = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 1.6);
  let r = Math.round(2 + (14 - 2) * (1 - v));
  let g = Math.round(6 + (24 - 6) * (1 - v));
  let b = Math.round(23 + (40 - 23) * (1 - v));

  // wall panel
  const wallL = 120, wallR = w - 120, wallT = 70, wallB = h - 90;
  if (x >= wallL && x <= wallR && y >= wallT && y <= wallB) {
    r = 11; g = 18; b = 32;
    // grid
    const relX = x - wallL, relY = y - wallT;
    if (relX % 140 < 2 || relY % 110 < 2) {
      r = 22; g = 78; b = 99;
    }
  }

  // floor
  if (y > h - 90) {
    const t = (y - (h - 90)) / 90;
    r = Math.round(5 + t * 8);
    g = Math.round(10 + t * 6);
    b = Math.round(20 + t * 10);
  }

  const cols = 4, rows = 2;
  const gapX = 150, gapY = 150;
  const startX = cx - ((cols - 1) * gapX) / 2;
  const startY = cy - 40 - ((rows - 1) * gapY) / 2;
  const radius = 52;

  for (let i = 0; i < curated.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const sx = startX + col * gapX;
    const sy = startY + row * gapY;
    const ddx = x - sx, ddy = y - sy;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dist <= radius) {
      const { r: cr, g: cg, b: cb } = hexToRgb(curated[i].color);
      // simple sphere shading
      const nx = ddx / radius, ny = ddy / radius;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lx = -0.35, ly = -0.45, lz = 0.82;
      const ndot = Math.max(0, nx * lx + ny * ly + nz * lz);
      const ambient = 0.22;
      const metal = curated[i].metalness;
      const rough = curated[i].roughness;
      const spec = Math.pow(ndot, 12 + (1 - rough) * 40) * (0.35 + metal * 0.65);
      const shade = ambient + ndot * (0.75 - rough * 0.25);
      let rr = cr * shade + 255 * spec;
      let gg = cg * shade + 255 * spec;
      let bb = cb * shade + 255 * spec;
      if (curated[i].emissive) {
        const e = hexToRgb(curated[i].emissive);
        const ei = curated[i].emissiveIntensity || 0.4;
        rr += e.r * ei; gg += e.g * ei; bb += e.b * ei;
      }
      // rim
      const rim = Math.pow(1 - nz, 2) * 0.25;
      rr += 34 * rim; gg += 211 * rim; bb += 238 * rim;
      return {
        r: Math.max(0, Math.min(255, Math.round(rr))),
        g: Math.max(0, Math.min(255, Math.round(gg))),
        b: Math.max(0, Math.min(255, Math.round(bb))),
      };
    }
    // soft contact shadow
    if (ddy > radius * 0.55 && Math.abs(ddx) < radius * 1.1) {
      const sy2 = sy + radius * 0.85;
      const sdx = (x - sx) / (radius * 1.1);
      const sdy = (y - sy2) / 18;
      const sd = sdx * sdx + sdy * sdy;
      if (sd < 1) {
        const a = (1 - sd) * 0.35;
        r = Math.round(r * (1 - a));
        g = Math.round(g * (1 - a));
        b = Math.round(b * (1 - a));
      }
    }
  }

  // title bar hint pixels (cyan accent line)
  if (y >= 28 && y <= 32 && x >= 120 && x <= w - 120) {
    return { r: 34, g: 211, b: 238 };
  }

  return { r, g, b };
});

console.log("wrote homepage-ready + texture-pack");
