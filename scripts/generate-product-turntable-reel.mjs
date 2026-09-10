/**
 * Generate a ≤20s portfolio-grade product-turntable reel (WebM).
 * Local textures only — no paid API. Looks like a spinning turntable showcase.
 *
 * Run: node scripts/generate-product-turntable-reel.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "demos", "product-turntable");
const framesDir = path.join(root, ".reel-frames");
const outWebm = path.join(root, "reel.webm");

const W = 720;
const H = 720;
const FPS = 24;
const DURATION_S = 12; // ≤20s portfolio reel
const TOTAL = FPS * DURATION_S;

const PRODUCTS = [
  { file: "bottle.png", label: "青釉水瓶", shape: "cylinder" },
  { file: "speaker.png", label: "桌面音箱", shape: "box" },
  { file: "mug.png", label: "陶制马克杯", shape: "cylinder" },
];

fs.mkdirSync(framesDir, { recursive: true });

function productForFrame(i) {
  const seg = Math.floor(TOTAL / PRODUCTS.length);
  const idx = Math.min(PRODUCTS.length - 1, Math.floor(i / seg));
  return PRODUCTS[idx];
}

/** Fake turntable: elliptical product body + texture slice that scrolls with angle */
async function renderFrame(i) {
  const product = productForFrame(i);
  const texPath = path.join(root, product.file);
  const angle = (i / TOTAL) * Math.PI * 2 * 2; // two full spins across reel
  const u = ((angle / (Math.PI * 2)) % 1 + 1) % 1;

  const tex = sharp(texPath).resize(512, 512, { fit: "cover" });
  const { data, info } = await tex.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // Sample a vertical strip of the texture (cylinder unwrap)
  const stripW = 180;
  const stripH = product.shape === "box" ? 200 : 280;
  const startX = Math.floor(u * (info.width - 1));
  const rgba = Buffer.alloc(stripW * stripH * 4);
  for (let y = 0; y < stripH; y++) {
    const sy = Math.floor((y / stripH) * (info.height - 1));
    for (let x = 0; x < stripW; x++) {
      // Perspective foreshortening: edges darker / narrower feel
      const nx = (x / (stripW - 1)) * 2 - 1;
      const edge = 1 - nx * nx * 0.55;
      const sx = (startX + Math.floor((x / stripW) * info.width * 0.35)) % info.width;
      const si = (sy * info.width + sx) * 4;
      const di = (y * stripW + x) * 4;
      rgba[di] = Math.min(255, data[si] * edge);
      rgba[di + 1] = Math.min(255, data[si + 1] * edge);
      rgba[di + 2] = Math.min(255, data[si + 2] * edge);
      rgba[di + 3] = 255;
    }
  }

  const body = await sharp(rgba, {
    raw: { width: stripW, height: stripH, channels: 4 },
  })
    .resize(
      product.shape === "box" ? 260 : 220,
      product.shape === "box" ? 260 : 340,
      { fit: "fill" },
    )
    .png()
    .toBuffer();

  // Dark radial backdrop + soft stand disc
  const bgSvg = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stop-color="#0e7490" stop-opacity="0.35"/>
          <stop offset="55%" stop-color="#020617" stop-opacity="1"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <ellipse cx="${W / 2}" cy="${H * 0.72}" rx="160" ry="28" fill="#0b1220" opacity="0.95"/>
      <ellipse cx="${W / 2}" cy="${H * 0.72}" rx="120" ry="18" fill="#111827" opacity="0.9"/>
      <text x="${W / 2}" y="48" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif"
        font-size="22" fill="#a5f3fc" opacity="0.9">KobinFlow · 产品转盘</text>
      <text x="${W / 2}" y="78" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif"
        font-size="16" fill="#94a3b8">${product.label} · turntable reel</text>
    </svg>
  `);

  const bodyMeta = await sharp(body).metadata();
  const left = Math.round((W - (bodyMeta.width || 220)) / 2);
  const top = Math.round(H * 0.22);

  const framePath = path.join(
    framesDir,
    `frame-${String(i).padStart(5, "0")}.png`,
  );

  await sharp(bgSvg)
    .composite([{ input: body, left, top }])
    .png()
    .toFile(framePath);

  return framePath;
}

console.log(`Rendering ${TOTAL} frames @ ${FPS}fps (${DURATION_S}s)…`);
for (let i = 0; i < TOTAL; i++) {
  await renderFrame(i);
  if (i % 24 === 0) console.log(`  frame ${i}/${TOTAL}`);
}

const pattern = path.join(framesDir, "frame-%05d.png");
const ff = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    pattern,
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "1.2M",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-t",
    String(DURATION_S),
    outWebm,
  ],
  { encoding: "utf8" },
);

if (ff.status !== 0) {
  console.error(ff.stderr || ff.stdout);
  process.exit(ff.status ?? 1);
}

const st = fs.statSync(outWebm);
console.log(`Wrote ${outWebm} (${(st.size / 1024).toFixed(1)} KiB, ${DURATION_S}s)`);

// cleanup frames
for (const f of fs.readdirSync(framesDir)) {
  fs.unlinkSync(path.join(framesDir, f));
}
fs.rmdirSync(framesDir);

// Refresh README.txt pointer
const readmePath = path.join(root, "README.txt");
fs.writeFileSync(
  readmePath,
  [
    "KobinFlow product-turntable sample textures + reel",
    "Generated locally — no paid API / no keys.",
    "bottle.png / speaker.png / mug.png — product image drivers for 3 samples",
    "proxy-fallback.png — generic box proxy when recon is unrecognizable",
    "reel.webm — formal ≤20s portfolio-grade turntable spin reel (12s)",
    "Regen textures: node scripts/generate-product-turntable-assets.mjs",
    "Regen reel: node scripts/generate-product-turntable-reel.mjs",
    "",
  ].join("\n"),
);
console.log("Updated README.txt");
